/**
 * O que a IA faz em cada jogo. Cada adaptador olha a sala e, se for a vez de um jogador IA agir, devolve uma jogada:
 * uma chave unica (para nao repetir), quanto tempo "pensar", um passo opcional de conhecimento (Gemini) e a
 * atualizacao da sala (a mesma que o celular do jogador faria). O nivel controla acerto, precisao e risco.
 */
import type { GameRoom, Player, TeamId } from '../types/game';
import { botParamsOf, between, chance, gauss, pickOne, isBot } from './bots';
import { botThink } from './botThink';
import { adedanhaLocal, notaClueLocal, proibidoCluesLocal, repetenteLocal, respostasPlausibleWrong, temPlausibleWrong } from './knowledge';
import { resolveCurrentTurnSpotlight, getActiveTeamIds, getNextTeamId } from '../utils/teamUtils';
import { applyTemGuess, findTemMatch } from '../utils/temGuess';
import { submitRepetenteAnswer, repetenteWriters } from '../utils/repetenteEngine';
import { pickPosition, judgeGuess } from '../utils/respostasEngine';
import { submitAnswers, requestStop, castVote, startsWithLetter, voteKey, answerOf, playerCanStop } from '../utils/adedanhaEngine';

export interface BotMove {
  key: string;
  delay: number;
  think?: () => Promise<unknown>;
  apply: (prev: GameRoom, data: unknown) => GameRoom;
}

type Adapter = (room: GameRoom, bot: Player) => BotMove | null;

export const say = (prev: GameRoom, bot: Player, text: string): GameRoom => ({ ...prev, botSay: { playerId: bot.id, text, at: Date.now() } });
const thinkMs = (bot: Player, extra = 0) => Math.round(between(botParamsOf(bot).think) + extra);
const turnOf = (room: GameRoom) => resolveCurrentTurnSpotlight(room)?.activePlayer?.id;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ---------------- JOGO DO LIMITE: palpite numerico secreto (nao pode passar do valor) ----------------
const limite: Adapter = (room, bot) => {
  const l = room.limite;
  if (!l || l.phase !== 'SECRET_GUESS' || l.submittedPlayers.includes(bot.id) || l.revealCountdown) return null;
  if (room.timerConfig > 0 && (l.timerSeconds ?? 1) <= 0) return null;
  const v = Number(l.roundData.valor_exato) || 0;
  const pr = botParamsOf(bot);
  return {
    key: `limite|${l.roundData.pergunta}|${bot.id}`,
    delay: thinkMs(bot, 1500),
    apply: (prev) => {
      const pl = prev.limite;
      if (!pl || pl.phase !== 'SECRET_GUESS' || pl.submittedPlayers.includes(bot.id)) return prev;
      // fica abaixo do valor com um erro proporcional ao nivel; os niveis baixos as vezes estouram
      let g = v * (1 - Math.abs(gauss()) * pr.spread);
      if (chance((1 - pr.acc) * 0.35)) g = v * (1 + Math.abs(gauss()) * pr.spread * 0.6);
      if (pr.spread <= 0.01) g = v;
      const guess = Math.abs(v) >= 20 ? Math.round(g) : Math.round(g * 10) / 10;
      return say(
        { ...prev, limite: { ...pl, guesses: { ...pl.guesses, [bot.id]: guess }, submittedPlayers: Array.from(new Set([...pl.submittedPlayers, bot.id])) } },
        bot,
        'Palpite secreto enviado.'
      );
    }
  };
};

// ---------------- TEM OU NAO TEM: dizer uma resposta do painel ----------------
const tem: Adapter = (room, bot) => {
  const t = room.temOuNaoTem;
  if (!t || t.phase === 'ROUND_END' || t.activeTeam !== bot.team) return null;
  const who = t.activePlayerId || turnOf(room);
  if (who && who !== bot.id) return null;
  if (!who && room.players.find((p) => p.team === bot.team && !isBot(p))) return null;
  const pr = botParamsOf(bot);
  const step = t.turnStepIndex || 0;
  return {
    key: `tem|${t.roundData.pergunta}|${step}|${bot.id}`,
    delay: thinkMs(bot),
    think: () =>
      chance(pr.acc)
        ? Promise.resolve(null)
        : botThink('wrong', { question: t.roundData.pergunta, avoid: t.items.map((i) => i.texto) }),
    apply: (prev, data) => {
      const pt = prev.temOuNaoTem;
      if (!pt || pt.phase === 'ROUND_END' || pt.activeTeam !== bot.team || (pt.turnStepIndex || 0) !== step) return prev;
      const hidden = pt.items.map((it, i) => ({ it, i })).filter((x) => !x.it.revealed);
      let text: string;
      if (data === null && hidden.length) {
        // acertar: niveis altos vao nas mais votadas
        const sorted = [...hidden].sort((a, b) => b.it.votos - a.it.votos);
        // sorteio ponderado pelos votos (como uma pessoa: lembra mais das respostas populares); os altos vao no topo
        const total = sorted.reduce((a, x) => a + Math.max(1, x.it.votos), 0);
        let r = Math.random() * total;
        const weighted = sorted.find((x) => (r -= Math.max(1, x.it.votos)) <= 0) || sorted[0];
        const pick = pr.acc > 0.7 ? sorted[0] : weighted;
        text = pick.it.texto;
      } else {
        const wrong = (Array.isArray(data) ? (data as string[]) : []).filter((w) => findTemMatch(prev, w) === -1);
        text = wrong[0] || temPlausibleWrong(pt.roundData.pergunta, pt.items.map((i) => i.texto));
      }
      return say(applyTemGuess(prev, bot.team, text), bot, text);
    }
  };
};

// ---------------- REPETENTE: escrever a palavra mais provavel para o tema ----------------
const repetente: Adapter = (room, bot) => {
  const r = room.repetente;
  if (!r || r.phase !== 'WRITING' || !repetenteWriters(r).includes(bot.id) || (r.answers[bot.id] || '').trim()) return null;
  const pr = botParamsOf(bot);
  return {
    key: `rep|${r.theme}|${bot.id}`,
    delay: thinkMs(bot, 1200),
    think: () => botThink('repetente', { theme: r.theme, category: r.category }),
    apply: (prev, data) => {
      const pr2 = prev.repetente;
      if (!pr2 || pr2.phase !== 'WRITING' || (pr2.answers[bot.id] || '').trim()) return prev;
      const fromAi = Array.isArray(data) ? (data as string[]) : [];
      const list = fromAi.length ? fromAi : repetenteLocal(pr2.theme, pr2.category);
      // niveis altos escrevem a mais obvia (a que o parceiro humano tende a escrever)
      const idx = chance(pr.acc) ? 0 : Math.min(list.length - 1, 1 + Math.floor(Math.random() * 3));
      const word = (list[Math.max(0, idx)] || r.category || r.theme).split(/\s+/)[0];
      return say({ ...prev, repetente: submitRepetenteAnswer(pr2, bot.id, word) }, bot, 'Escrevi a minha palavra.');
    }
  };
};

// ---------------- RESPOSTAS SEM PERGUNTAS: escolher palavra e chutar a resposta ----------------
const respostas: Adapter = (room, bot) => {
  const r = room.respostasSemPerguntas;
  if (!r || r.phase !== 'PLAYING' || r.turnPlayerId !== bot.id) return null;
  const pr = botParamsOf(bot);
  const revealedCount = r.revealed.filter(Boolean).length;
  if (r.step === 'pick') {
    return {
      key: `rsp|${r.answer}|pick|${revealedCount}|${bot.id}`,
      delay: thinkMs(bot, -400),
      apply: (prev) => {
        const p = prev.respostasSemPerguntas;
        if (!p || p.turnPlayerId !== bot.id || p.step !== 'pick') return prev;
        const options = p.words.map((w, i) => ({ w, i })).filter((x) => !p.revealed[x.i]);
        // quem sabe jogar abre a palavra mais longa (mais informacao); o facil abre qualquer uma
        const weak = /^(o|a|os|as|um|uma|de|do|da|dos|das|em|no|na|e|que|qual|quem|com|por|para|se|ao|mais)$/i;
        const best = [...options].sort((a, b) => (weak.test(a.w) ? 1 : 0) - (weak.test(b.w) ? 1 : 0) || b.w.length - a.w.length)[0];
        const choice = chance(pr.acc) ? best : pickOne(options) || best;
        if (!choice) return prev;
        return say({ ...prev, respostasSemPerguntas: pickPosition(p, choice.i) }, bot, `Abre a palavra ${choice.i + 1}.`);
      }
    };
  }
  const frac = revealedCount / Math.max(1, r.words.length);
  const correct = chance(Math.min(0.99, pr.acc * (0.25 + 0.75 * frac) + (pr.acc > 0.9 ? 0.25 : 0)));
  const masked = r.words.map((w, i) => (r.revealed[i] ? w : '___')).join(' ');
  return {
    key: `rsp|${r.answer}|guess|${revealedCount}|${bot.id}`,
    delay: thinkMs(bot, 800),
    think: () => (correct ? Promise.resolve(null) : botThink('respostas', { category: r.category, masked })),
    apply: (prev, data) => {
      const p = prev.respostasSemPerguntas;
      if (!p || p.turnPlayerId !== bot.id || p.step !== 'guess') return prev;
      const chutes = (Array.isArray(data) ? (data as string[]) : []).filter((c) => norm(c) !== norm(p.answer));
      const text = correct ? p.answer : chutes[0] || respostasPlausibleWrong(p.category, p.answer);
      const ids = prev.players.map((pl) => pl.id);
      return say({ ...prev, respostasSemPerguntas: judgeGuess(p, correct, ids) }, bot, text);
    }
  };
};

// ---------------- ADEDANHA: preencher a folha, pedir STOP e votar ----------------
const adedanha: Adapter = (room, bot) => {
  const a = room.adedanha;
  if (!a || !a.playerIds.includes(bot.id)) return null;
  const pr = botParamsOf(bot);
  if ((a.phase === 'WRITING' || a.phase === 'STOPPING') && !a.submitted[bot.id]) {
    // escreve mais rapido quanto maior o nivel; no STOPPING entrega o que tiver
    const writeMs = a.phase === 'STOPPING' ? 600 : thinkMs(bot, a.categories.length * (pr.acc > 0.9 ? 900 : 2200));
    return {
      key: `ade|${a.letter}|${a.startedAt}|write|${a.phase}|${bot.id}`,
      delay: writeMs,
      think: () => botThink('adedanha', { letter: a.letter, categories: a.categories }),
      apply: (prev, data) => {
        const s = prev.adedanha;
        if (!s || s.submitted[bot.id] || (s.phase !== 'WRITING' && s.phase !== 'STOPPING')) return prev;
        const list = Array.isArray(data) ? (data as string[]) : [];
        const others = Object.entries(s.answers).filter(([pid]) => pid !== bot.id).flatMap(([, a]) => a);
        const local = adedanhaLocal(s.letter, s.categories, others);
        const answers = s.categories.map((_, i) => {
          const ai = list[i] || '';
          const w = ai && startsWithLetter(ai, s.letter) ? ai : local[i] || '';
          if (!w || !startsWithLetter(w, s.letter)) return '';
          return chance(pr.acc + 0.1) ? w : '';
        });
        let next = submitAnswers(s, bot.id, answers);
        const filled = answers.filter(Boolean).length;
        // completou tudo cedo: pede STOP (os niveis altos)
        if (next.phase === 'WRITING' && filled === s.categories.length && pr.acc > 0.7 && playerCanStop(next)) next = requestStop(next, bot.id);
        return say({ ...prev, adedanha: next }, bot, next.phase === 'STOPPING' && next.stopBy === bot.id ? 'STOP!' : 'Folha entregue.');
      }
    };
  }
  if (a.phase === 'VOTING') {
    const ci = a.voteIndex;
    const pending = a.playerIds.filter((pid) => pid !== bot.id && answerOf(a, ci, pid) && a.votes[voteKey(ci, pid)]?.[bot.id] === undefined);
    if (!pending.length) return null;
    return {
      key: `ade|${a.letter}|${a.startedAt}|vote|${ci}|${bot.id}`,
      delay: Math.round(between([700, 1600])),
      apply: (prev) => {
        let s = prev.adedanha;
        if (!s || s.phase !== 'VOTING' || s.voteIndex !== ci) return prev;
        for (const pid of pending) {
          const ans = answerOf(s, ci, pid);
          // a IA vota com honestidade: vale se comeca com a letra (os niveis baixos erram as vezes)
          const fair = startsWithLetter(ans, s.letter) && ans.trim().length > 1;
          s = castVote(s, ci, pid, bot.id, chance(pr.acc) ? fair : !fair);
        }
        return { ...prev, adedanha: s };
      }
    };
  }
  return null;
};

// ---------------- JOGO DA NOTA: dar dicas (se for o da vez) ou chutar a nota ----------------
const nota: Adapter = (room, bot) => {
  const n = room.nota;
  if (!n) return null;
  const pr = botParamsOf(bot);
  const min = n.scaleMin ?? 1;
  const max = n.scaleMax || 10;
  const q = n.roundData?.pergunta || '';
  if (n.speakerPlayerId === bot.id && (n.phase === 'STEP_2_CLUE_1' || n.phase === 'STEP_3_CLUE_2')) {
    // a IA da a dica de uma nota proxima (o facil se engana mais de numero)
    const off = chance(pr.acc) ? 0 : Math.round(gauss() * 2);
    const target = Math.min(max, Math.max(min, n.secretScore + off));
    const which = n.phase === 'STEP_2_CLUE_1' ? 0 : 1;
    return {
      key: `nota|${q}|${n.secretScore}|clue${which}|${bot.id}`,
      delay: thinkMs(bot),
      think: () => botThink('nota-clue', { score: target, min, max, question: q }),
      apply: (prev, data) => {
        if (prev.nota?.phase !== n.phase) return prev;
        const clues = Array.isArray(data) ? (data as string[]) : [];
        const local = notaClueLocal(target, min, max, q);
        return say(prev, bot, clues[which] || clues[0] || local[which] || local[0]);
      }
    };
  }
  if (n.speakerPlayerId !== bot.id && n.phase === 'STEP_3_CLUE_2' && n.votes?.[bot.id] === undefined) {
    return {
      key: `nota|${q}|${n.secretScore}|vote|${bot.id}`,
      delay: thinkMs(bot, 1500),
      apply: (prev) => {
        const pn = prev.nota;
        if (!pn || pn.phase !== 'STEP_3_CLUE_2' || pn.votes?.[bot.id] !== undefined) return prev;
        const guess = chance(pr.acc) ? pn.secretScore : Math.min(max, Math.max(min, pn.secretScore + (chance(0.5) ? 1 : -1) * Math.max(1, Math.round(Math.abs(gauss()) * 2.5))));
        return say({ ...prev, nota: { ...pn, votes: { ...(pn.votes || {}), [bot.id]: guess } } }, bot, `Eu chuto ${guess}.`);
      }
    };
  }
  if (n.phase === 'STEP_4_REVEAL' && n.revealSubState === 'SPINNING' && n.votes?.[bot.id] === n.secretScore && !(n.selectedCorrectPlayerIds || []).includes(bot.id)) {
    // acertou: marca a si mesmo como certo antes do piao parar (o diretor ainda pode desmarcar)
    return {
      key: `nota|${q}|${n.secretScore}|right|${bot.id}`,
      delay: 200,
      apply: (prev) => {
        const pn = prev.nota;
        if (!pn || pn.revealSubState !== 'SPINNING') return prev;
        return { ...prev, nota: { ...pn, selectedCorrectPlayerIds: Array.from(new Set([...(pn.selectedCorrectPlayerIds || []), bot.id])) } };
      }
    };
  }
  return null;
};

// ---------------- JOGO DO DUVIDO: leilao (subir ou duvidar) e execucao (listar itens) ----------------
const duvido: Adapter = (room, bot) => {
  const d = room.duvido;
  if (!d) return null;
  const pr = botParamsOf(bot);
  const total = Math.max(1, Number(d.roundData.total_itens_possiveis) || d.roundData.exemplos_validos.length || 5);
  const isNegotiator = Object.values(d.negotiators || {}).includes(bot.id) || !Object.values(d.blindfoldedPlayers || {}).includes(bot.id);
  // quanto a IA acha que consegue listar (os niveis altos conhecem bem a categoria)
  const known = Math.max(d.roundData.exemplos_validos.length, Math.round(total * (0.5 + 0.5 * pr.acc)));
  const capacity = Math.max(1, Math.min(total, Math.round(known * (0.55 + 0.45 * pr.acc))));
  if (d.phase === 'AUCTION' && d.activeTurnTeam === bot.team && isNegotiator) {
    const myTeamHasHuman = room.players.some((p) => p.team === bot.team && !isBot(p) && Object.values(d.negotiators || {}).includes(p.id));
    if (myTeamHasHuman) return null;
    return {
      key: `duv|${d.roundData.categoria_secreta}|bid|${d.currentBid}|${d.currentBidTeam}|${bot.id}`,
      delay: thinkMs(bot),
      apply: (prev) => {
        const pd = prev.duvido;
        if (!pd || pd.phase !== 'AUCTION' || pd.activeTurnTeam !== bot.team) return prev;
        const teams = getActiveTeamIds(prev);
        const canRaise = pd.currentBid + 1 <= capacity + (chance(pr.risk * 0.4) ? 1 : 0);
        if (pd.currentBidTeam && pd.currentBidTeam !== bot.team && !canRaise) {
          return say({ ...prev, duvido: { ...pd, phase: 'EXECUTION', challengedTeam: pd.currentBidTeam, timerActive: prev.timerConfig > 0 } }, bot, 'DUVIDO!');
        }
        const step = pd.currentBid < capacity - 2 && chance(pr.risk) ? 2 : 1;
        const bid = pd.currentBid + step;
        return say({ ...prev, duvido: { ...pd, currentBid: bid, currentBidTeam: bot.team as TeamId, activeTurnTeam: getNextTeamId(bot.team, teams) } }, bot, `Eu falo ${bid}!`);
      }
    };
  }
  if (d.phase === 'EXECUTION' && d.challengedTeam === bot.team) {
    const humanOnTeam = room.players.some((p) => p.team === bot.team && !isBot(p));
    if (humanOnTeam) return null;
    const i = d.validCount;
    return {
      key: `duv|${d.roundData.categoria_secreta}|exec|${i}|${bot.id}`,
      delay: Math.round(thinkMs(bot) * 0.6),
      think: () => botThink('list', { category: d.roundData.categoria_secreta, rule: d.roundData.dica_arbitro, count: Math.min(25, total) }),
      apply: (prev, data) => {
        const pd = prev.duvido;
        if (!pd || pd.phase !== 'EXECUTION' || pd.validCount !== i) return prev;
        const pool = Array.from(new Set([...(Array.isArray(data) ? (data as string[]) : []), ...pd.roundData.exemplos_validos]));
        const item = pool[i];
        // esgotou o que sabe (ou errou): desiste; o time que duvidou ganha
        if (!item || i >= capacity || !chance(Math.min(0.995, pr.acc + 0.15))) {
          const winningTeam = getNextTeamId(bot.team, getActiveTeamIds(prev));
          const blefe = temPlausibleWrong(pd.roundData.categoria_secreta, pool);
          return say({ ...prev, duvido: { ...pd, phase: 'RESULT', timerActive: false, resultWinnerTeam: winningTeam, resultReason: `"${blefe}" não vale! Ponto para quem duvidou.` } }, bot, blefe);
        }
        const next = pd.validCount + 1;
        const reached = next >= pd.currentBid;
        return say(
          {
            ...prev,
            duvido: { ...pd, validCount: next, phase: reached ? 'RESULT' : pd.phase, timerActive: reached ? false : pd.timerActive, resultWinnerTeam: reached ? pd.challengedTeam : null, resultReason: reached ? `META DE ${pd.currentBid} ITENS ALCANÇADA COM SUCESSO!` : '' }
          },
          bot,
          item
        );
      }
    };
  }
  return null;
};

// ---------------- JOGO DO PROIBIDO: a IA da as dicas da carta (quando e a vez dela de falar) ----------------
const proibido: Adapter = (room, bot) => {
  const p = room.proibido;
  if (!p || p.phase !== 'PLAYING' || p.speakerPlayerId !== bot.id) return null;
  const card = p.cards[p.currentCardIndex];
  if (!card) return null;
  return {
    key: `proi|${card.palavra_alvo}|${p.currentCardIndex}|${bot.id}`,
    delay: thinkMs(bot, -600),
    think: () => botThink('proibido-clues', { word: card.palavra_alvo, forbidden: card.palavras_proibidas }),
    apply: (prev, data) => {
      const pp = prev.proibido;
      if (!pp || pp.phase !== 'PLAYING' || pp.currentCardIndex !== p.currentCardIndex) return prev;
      const banned = [card.palavra_alvo, ...card.palavras_proibidas].map(norm);
      const clean = (Array.isArray(data) ? (data as string[]) : []).filter((c) => !banned.some((b) => b.length > 2 && norm(c).includes(b)));
      const pr = botParamsOf(bot);
      const n = Math.max(1, Math.round(clean.length * (0.4 + 0.6 * pr.acc)));
      const dicas = clean.length ? clean : proibidoCluesLocal(card.palavra_alvo, card.palavras_proibidas);
      return say(prev, bot, dicas.slice(0, Math.max(1, Math.min(dicas.length, n))).join(' · '));
    }
  };
};

export const ADAPTERS: Partial<Record<NonNullable<GameRoom['activeGame']>, Adapter>> = {
  limite,
  'tem-ou-nao-tem': tem,
  repetente,
  'respostas-sem-perguntas': respostas,
  adedanha,
  nota,
  duvido,
  proibido
};

