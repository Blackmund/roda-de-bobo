/**
 * IA - Fase 2: Estadios, Mega Resenha, Com Terra (Arquiteto) e Perguntas e Verdades.
 * Mesma ideia da Fase 1: a jogada e a mesma atualizacao de sala que o jogador faria; o nivel muda a qualidade.
 */
import type { BotMove } from './adapters';
import { say } from './adapters';
import type { BPState, ComTerraState, GameRoom, Player } from '../types/game';
import { botParamsOf, between, chance, pickOne } from './bots';
import { botThink } from './botThink';
import { estadiosCluesShown, judgeEstadio } from '../utils/estadiosEngine';
import { ESTADIOS } from '../data/estadiosBank';
import { addClue, applyMegaOutcome, validateClue } from '../utils/megaResenhaEngine';
import {
  BP_GRID_H,
  BP_GRID_W,
  areaSpots,
  bpCanPlace,
  bpCurrent,
  bpPass,
  bpPlace,
  bpPlaceArea,
  bpScore,
  bpTakeReward,
  bpCanPlaceAny,
  rewardOptions,
  rewardValue,
  tileShape
} from '../utils/bpEngine';
import { allOrientations, shapeCells } from '../utils/comTerraEngine';
import { computeOfficialQuestionAnswer, dealValidRandomHand, formatOfficialQuestionText } from '../utils/perguntasEVerdadesEngine';

type Adapter = (room: GameRoom, bot: Player) => BotMove | null;
const thinkMs = (bot: Player, extra = 0) => Math.round(between(botParamsOf(bot).think) + extra);
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Escolhe um item de uma lista ordenada (melhor primeiro) conforme o nivel. */
function pickByLevel<T>(sorted: T[], bot: Player): T | undefined {
  if (!sorted.length) return undefined;
  const acc = botParamsOf(bot).acc;
  if (acc >= 0.95) return sorted[0];
  if (acc >= 0.8) return sorted[Math.floor(Math.random() * Math.min(2, sorted.length))];
  if (acc >= 0.5) return sorted[Math.floor(Math.random() * Math.max(1, Math.ceil(sorted.length * 0.25)))];
  return sorted[Math.floor(Math.random() * sorted.length)];
}

// ---------------- ESTADIOS: chutar o estadio pelas pistas ----------------
const estadios: Adapter = (room, bot) => {
  const e = room.estadios;
  if (!e || e.phase !== 'PLAYING' || e.turnPlayerId !== bot.id) return null;
  const pr = botParamsOf(bot);
  const shown = estadiosCluesShown(e);
  // cada pista a mais deixa mais facil; o Impossivel sabe quase sempre ja na primeira
  const p = Math.min(0.99, pr.acc * (0.3 + 0.7 * (shown / Math.max(1, e.pistas.length))) + (pr.acc > 0.9 ? 0.3 : 0));
  const correct = chance(p);
  return {
    key: `est|${e.nome}|${e.attempts.length}|${bot.id}`,
    delay: thinkMs(bot, 600),
    apply: (prev) => {
      const s = prev.estadios;
      if (!s || s.phase !== 'PLAYING' || s.turnPlayerId !== bot.id || s.attempts.length !== e.attempts.length) return prev;
      const wrong = pickOne(ESTADIOS.filter((x) => norm(x.nome) !== norm(s.nome) && (x.pais === s.pais || chance(0.3))))?.nome || 'Não sei';
      const ids = prev.players.map((pl) => pl.id);
      return say({ ...prev, estadios: judgeEstadio(s, correct, ids) }, bot, correct ? s.nome : wrong);
    }
  };
};

// ---------------- MEGA RESENHA: dar dica de UMA palavra ou adivinhar ----------------
const mega: Adapter = (room, bot) => {
  const m = room.megaResenha;
  if (!m || m.phase !== 'PLAYING') return null;
  const word = m.words[m.currentIndex];
  if (!word) return null;
  const pr = botParamsOf(bot);
  const clues = m.clues[m.currentIndex] || [];
  const validClues = clues.filter((c) => c.valid || c.overruled).map((c) => c.text);
  if (m.giverPlayerId === bot.id) {
    // uma dica nova a cada tanto; espera o parceiro chutar entre uma e outra
    if (clues.length >= 6) return null;
    return {
      key: `mega|${word}|${m.currentIndex}|clue${clues.length}|${bot.id}`,
      delay: thinkMs(bot, clues.length ? 2500 : 0),
      think: () => botThink('mega-clues', { word }),
      apply: (prev, data) => {
        const s = prev.megaResenha;
        if (!s || s.phase !== 'PLAYING' || s.currentIndex !== m.currentIndex || (s.clues[s.currentIndex] || []).length !== clues.length) return prev;
        const used = new Set((s.clues[s.currentIndex] || []).map((c) => norm(c.text)));
        const options = (Array.isArray(data) ? (data as string[]) : [])
          .map((c) => c.split(/\s+/)[0])
          .filter((c) => c && !used.has(norm(c)) && validateClue(word, c).ok);
        // os niveis baixos pegam dicas mais fracas (do fim da lista)
        const clue = chance(pr.acc) ? options[0] : options[options.length - 1] || options[0];
        if (!clue) return say(prev, bot, 'Hmm... deixa eu pensar.');
        return say({ ...prev, megaResenha: addClue(s, clue) }, bot, clue);
      }
    };
  }
  if (m.guesserPlayerId === bot.id && validClues.length > 0) {
    // chance de acertar cresce com o numero de dicas validas
    const p = Math.min(0.97, pr.acc * (0.35 + 0.22 * validClues.length));
    const correct = chance(p);
    return {
      key: `mega|${word}|${m.currentIndex}|guess${validClues.length}|${bot.id}`,
      delay: thinkMs(bot, -300),
      think: () => (correct ? Promise.resolve(null) : botThink('mega-guess', { clues: validClues })),
      apply: (prev, data) => {
        const s = prev.megaResenha;
        if (!s || s.phase !== 'PLAYING' || s.currentIndex !== m.currentIndex) return prev;
        if (correct) return say({ ...prev, megaResenha: applyMegaOutcome(s, 'correct') }, bot, word);
        const guess = (Array.isArray(data) ? (data as string[]) : []).find((g) => norm(g) !== norm(word)) || 'Não sei...';
        return say(prev, bot, guess);
      }
    };
  }
  return null;
};

// ---------------- COM TERRA (Arquiteto / Barenpark): escolher peca, encaixe e recompensas ----------------
function withBPRoom(prev: GameRoom, fn: (bp: BPState) => BPState): GameRoom {
  const ct = prev.comTerra as ComTerraState | undefined;
  if (!ct?.bp) return prev;
  const bp = fn(ct.bp);
  if (bp === ct.bp) return prev;
  if (!bp.finished) return { ...prev, comTerra: { ...ct, bp } };
  const pointsAwarded: Record<string, number> = {};
  bp.order.forEach((id) => (pointsAwarded[id] = bpScore(bp, id)));
  return { ...prev, comTerra: { ...ct, bp, phase: 'SUMMARY', pointsAwarded } };
}

interface Placement {
  uid: string;
  m: number[][];
  x: number;
  y: number;
  value: number;
  label: string;
}

/** Todas as jogadas validas com uma nota (pontos ganhos, recompensas, tamanho da peca e encaixe justo). */
export function bpPlacements(bp: BPState, pid: string): Placement[] {
  const park = bp.parks[pid];
  if (!park) return [];
  const before = bpScore(bp, pid);
  const out: Placement[] = [];
  const seenType = new Set<string>();
  for (const tile of park.supply) {
    if (seenType.has(tile.type + '|' + tile.pts)) continue;
    seenType.add(tile.type + '|' + tile.pts);
    for (const m of allOrientations(tileShape(tile.type))) {
      for (let y = 0; y < BP_GRID_H * 4; y++) {
        for (let x = 0; x < BP_GRID_W * 4; x++) {
          if (!bpCanPlace(park, m, x, y).ok) continue;
          const next = bpPlace(bp, pid, tile.uid, m, x, y);
          if (next === bp) continue;
          const cells = shapeCells(m).map((c) => ({ x: x + c.dx, y: y + c.dy }));
          // vizinhos ja ocupados: encaixe justo deixa menos buracos
          let snug = 0;
          cells.forEach((c) =>
            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1]
            ].forEach(([dx, dy]) => {
              if (park.cells[`${c.x + dx},${c.y + dy}`]) snug++;
            })
          );
          const rewards = next.pending.filter((p) => p.playerId === pid).length;
          const value = (bpScore(next, pid) - before) * 1.2 + rewards * 2.6 + cells.length * 0.9 + snug * 0.25 + tile.pts * 0.5;
          out.push({ uid: tile.uid, m, x, y, value, label: tile.type });
        }
      }
    }
  }
  return out.sort((a, b) => b.value - a.value);
}

const comTerra: Adapter = (room, bot) => {
  const ct = room.comTerra as ComTerraState | undefined;
  const bp = ct?.bp;
  if (!ct || ct.mode !== 'arquiteto' || !bp || bp.finished) return null;
  const pending = bp.pending[0];
  const myTurn = bpCurrent(bp) === bot.id;
  if (!myTurn && pending?.playerId !== bot.id) return null;
  const stamp = `${bp.turnIdx}|${bp.pending.length}|${Object.keys(bp.parks[bot.id]?.cells || {}).length}`;
  // 1) recompensa pendente
  if (pending && pending.playerId === bot.id) {
    if (pending.kind === 'crew') {
      return {
        key: `ct|${stamp}|crew|${bot.id}`,
        delay: thinkMs(bot, -800),
        apply: (prev) =>
          withBPRoom(prev, (b) => {
            const spots = areaSpots(b.parks[bot.id]);
            const spot = pickOne(spots);
            if (!spot) return b;
            const pile: 0 | 1 = b.areaPiles[0].length >= b.areaPiles[1].length ? 0 : 1;
            return bpPlaceArea(b, bot.id, pile, spot.ax, spot.ay);
          })
      };
    }
    return {
      key: `ct|${stamp}|reward|${bot.id}`,
      delay: thinkMs(bot, -900),
      apply: (prev) =>
        withBPRoom(prev, (b) => {
          const opts = rewardOptions(b, b.pending[0]?.kind || pending.kind);
          // melhor = vale mais agora; desempata pela peca maior
          const sorted = [...opts].sort((a, c) => rewardValue(b, c) - rewardValue(b, a) || tileShape(c).flat().filter(Boolean).length - tileShape(a).flat().filter(Boolean).length);
          const choice = pickByLevel(sorted, bot);
          return choice ? bpTakeReward(b, bot.id, choice) : b;
        })
    };
  }
  if (!myTurn || bp.pending.length > 0) return null;
  // 2) colocar uma peca (ou passar)
  return {
    key: `ct|${stamp}|place|${bot.id}`,
    delay: thinkMs(bot, 400),
    apply: (prev) => {
      let label = '';
      const next = withBPRoom(prev, (b) => {
        if (bpCurrent(b) !== bot.id || b.pending.length > 0) return b;
        if (!bpCanPlaceAny(b.parks[bot.id])) {
          label = 'Passo a vez.';
          return bpPass(b, bot.id);
        }
        const choice = pickByLevel(bpPlacements(b, bot.id), bot);
        if (!choice) return b;
        label = 'Coloquei uma peça.';
        return bpPlace(b, bot.id, choice.uid, choice.m, choice.x, choice.y);
      });
      return next === prev ? prev : say(next, bot, label);
    }
  };
};

// ---------------- PERGUNTAS E VERDADES: mao, lances e perguntas ----------------
const pv: Adapter = (room, bot) => {
  const s = room.perguntasEVerdades;
  if (!s) return null;
  const pr = botParamsOf(bot);
  if (s.phase === 'DECK_SETUP' && !s.handReady?.[bot.id]) {
    return {
      key: `pv|${s.matchRoundNumber || 1}|hand|${bot.id}`,
      delay: thinkMs(bot, -1000),
      apply: (prev) => {
        const p = prev.perguntasEVerdades;
        if (!p || p.handReady?.[bot.id]) return prev;
        const used = Object.values(p.playerHands || {}).flat().map((c) => c.id);
        const hand = dealValidRandomHand(used);
        return say({ ...prev, perguntasEVerdades: { ...p, playerHands: { ...p.playerHands, [bot.id]: hand }, handReady: { ...p.handReady, [bot.id]: true } } }, bot, 'Minhas 8 cartas estão prontas.');
      }
    };
  }
  if (s.phase === 'TOKEN_AUCTION' && !s.auctionRevealPending && !s.bidSubmitted?.[bot.id]) {
    const tokens = s.tokens?.[bot.id] ?? 0;
    return {
      key: `pv|${s.matchRoundNumber || 1}|${s.auctionRound}|bid|${bot.id}`,
      delay: thinkMs(bot),
      apply: (prev) => {
        const p = prev.perguntasEVerdades;
        if (!p || p.phase !== 'TOKEN_AUCTION' || p.bidSubmitted?.[bot.id]) return prev;
        // lance secreto: guarda fichas no comeco, aperta quando sabe mais (os niveis altos dosam melhor)
        const asked = (p.questionHistory || []).filter((q) => q.askerPlayerId === bot.id).length;
        const urge = Math.min(1, 0.25 + asked * 0.1);
        const bid = Math.max(0, Math.min(tokens, Math.round(tokens * (chance(pr.acc) ? urge * pr.risk : Math.random() * 0.8))));
        return say(
          { ...prev, perguntasEVerdades: { ...p, currentBids: { ...p.currentBids, [bot.id]: bid }, bidSubmitted: { ...p.bidSubmitted, [bot.id]: true } } },
          bot,
          'Lance secreto dado.'
        );
      }
    };
  }
  if (s.phase === 'PLAYER_ACTION' && s.activeTurnPlayerId === bot.id) {
    const alreadyAsked = (s.questionHistory || []).some((q) => q.askerPlayerId === bot.id && q.roundNumber === s.auctionRound);
    if (alreadyAsked) return null;
    const opponents = room.players.filter((p) => p.id !== bot.id && (s.playerHands?.[p.id] || []).length === 8);
    const target = opponents.find((p) => p.id === s.targetOpponentId) || pickOne(opponents);
    if (!target) return null;
    return {
      key: `pv|${s.matchRoundNumber || 1}|${s.auctionRound}|ask|${bot.id}`,
      delay: thinkMs(bot, 1200),
      apply: (prev) => {
        const p = prev.perguntasEVerdades;
        if (!p || p.phase !== 'PLAYER_ACTION' || p.activeTurnPlayerId !== bot.id) return prev;
        const hand = p.playerHands?.[target.id] || [];
        const askedAbout = (p.questionHistory || []).filter((q) => q.askerPlayerId === bot.id && q.targetPlayerId === target.id).length;
        // ja sabe o bastante sobre o alvo? declara a verdade (o diretor confirma na tela)
        if (askedAbout >= 3 && chance(pr.acc * Math.min(1, askedAbout / 7))) {
          const slots = { ...(p.savedTruthSlotsByTarget || {}), [target.id]: hand.map((c) => ({ ...c })) };
          return say({ ...prev, perguntasEVerdades: { ...p, targetOpponentId: target.id, savedTruthSlotsByTarget: slots } }, bot, `Eu sei as 8 cartas de ${target.name}! Diretor, confirme a verdade.`);
        }
        // pergunta: os niveis altos variam as perguntas para cruzar informacao
        const done = new Set((p.questionHistory || []).filter((q) => q.askerPlayerId === bot.id && q.targetPlayerId === target.id).map((q) => q.questionNumber));
        const fresh = Array.from({ length: 11 }, (_, i) => i + 1).filter((n) => !done.has(n));
        const qn = chance(pr.acc) ? fresh[0] || 1 : pickOne(fresh.length ? fresh : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) || 1;
        const suits = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
        const params = {
          positions1Based: [1, 4, 7] as [number, number, number],
          targetValue: (hand[Math.floor(Math.random() * hand.length)]?.value as number) || 7,
          targetSuit: pickOne([...suits]) || 'hearts'
        };
        const question = formatOfficialQuestionText(qn, params);
        const answer = hand.length === 8 ? computeOfficialQuestionAnswer(qn, hand, params).summaryText : 'Respondido na mesa';
        const entry = {
          id: `pv-q-${Date.now()}`,
          roundNumber: p.auctionRound,
          askerPlayerId: bot.id,
          askerName: bot.name,
          targetPlayerId: target.id,
          targetName: target.name,
          questionNumber: qn,
          formattedQuestion: question,
          answerSummary: answer,
          timestamp: Date.now()
        };
        return say(
          {
            ...prev,
            perguntasEVerdades: {
              ...p,
              selectedQuestionNumber: qn,
              targetOpponentId: target.id,
              selectedPositionsQ1: params.positions1Based,
              selectedValueQ7: params.targetValue as never,
              selectedSuitQ8: params.targetSuit,
              questionHistory: [entry as never, ...(p.questionHistory || [])]
            }
          },
          bot,
          `${question} → ${answer}`
        );
      }
    };
  }
  return null;
};

export const ADAPTERS_PHASE2: Record<string, Adapter> = {
  estadios,
  'mega-resenha': mega,
  'com-terra': comTerra,
  'perguntas-e-verdades': pv
};
