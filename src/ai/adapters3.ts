/**
 * IA - Fase 3: Mimica, Quem Sou Eu / Onde Estou, Como Eu Pinto e os modos Plano do Diabo e Fronteiras do Com Terra.
 * Aqui a IA tambem "atua": descreve a mimica em texto, desenha de verdade na prancheta (traco a traco) e, quando e ela
 * quem adivinha um desenho, manda a imagem para o Gemini olhar.
 */
import type { BotMove } from './adapters';
import { say } from './adapters';
import { ADAPTERS_PHASE2 } from './adapters2';
import type { ComTerraState, DrawStroke, GameRoom, Player } from '../types/game';
import { botParamsOf, between, chance, pickOne, isBot } from './bots';
import { botThink } from './botThink';
import { identitySibling, mimicaActsLocal, questionsFor, siblingWord } from './knowledge';
import { applyMimicaOutcome } from '../utils/mimicaEngine';
import { recordCorrectGuess, recordQuestion, recordWrongGuess } from '../utils/quemSouEuEngine';
import { addStroke, dismissPadPassGate, dismissTvWordReveal, markDrawn, pintoGuessMatches, setPintoOutcome, skipWord } from '../utils/comoEuPintoEngine';
import {
  allOrientations,
  boardFor,
  canPlaceAt,
  canSabotage,
  canTarget,
  discardPiece,
  hasAnyPlacement,
  pendingFor,
  pickPiece,
  placePiece,
  playerStage,
  previewPlacement,
  ranking,
  resolveAction,
  sabotage,
  shapeCells,
  skipAction
} from '../utils/comTerraEngine';

type Adapter = (room: GameRoom, bot: Player) => BotMove | null;
const thinkMs = (bot: Player, extra = 0) => Math.round(between(botParamsOf(bot).think) + extra);
/** janela de tempo: deixa a IA tentar de novo de tempos em tempos enquanto a sala muda (o relogio tica) */
const slot = (ms: number) => Math.floor(Date.now() / ms);

function pickByLevel<T>(sorted: T[], bot: Player): T | undefined {
  if (!sorted.length) return undefined;
  const acc = botParamsOf(bot).acc;
  if (acc >= 0.95) return sorted[0];
  if (acc >= 0.8) return sorted[Math.floor(Math.random() * Math.min(2, sorted.length))];
  if (acc >= 0.5) return sorted[Math.floor(Math.random() * Math.max(1, Math.ceil(sorted.length * 0.25)))];
  return sorted[Math.floor(Math.random() * sorted.length)];
}

// ---------------- MIMICA: a IA "faz a mimica" descrevendo gestos; ou adivinha ----------------
const mimica: Adapter = (room, bot) => {
  const m = room.mimica;
  if (!m || m.phase !== 'PLAYING') return null;
  const word = m.words[m.currentIndex];
  if (!word) return null;
  const pr = botParamsOf(bot);
  if (m.mimePlayerId === bot.id) {
    return {
      key: `mim|${word}|${m.currentIndex}|act|${bot.id}`,
      delay: thinkMs(bot, -800),
      think: () => botThink('mimica-acts', { word }),
      apply: (prev, data) => {
        const s = prev.mimica;
        if (!s || s.phase !== 'PLAYING' || s.currentIndex !== m.currentIndex) return prev;
        const fromAi = Array.isArray(data) ? (data as string[]) : [];
        const acts = fromAi.length ? fromAi : mimicaActsLocal(word);
        // os niveis baixos fazem menos gestos (mimica mais pobre)
        const n = Math.max(1, Math.round(acts.length * (0.4 + 0.6 * pr.acc)));
        return say(prev, bot, 'Mímica: ' + acts.slice(0, n).join(' · '));
      }
    };
  }
  if (m.guesserPlayerId === bot.id || (!m.guesserPlayerId && room.players.find((p) => p.team === m.mimeTeam && p.id === bot.id))) {
    // a IA nao ve a mimica humana: a cada tentativa tem uma chance pelo nivel
    const tick = slot(5500);
    const correct = chance(pr.acc * 0.45);
    return {
      key: `mim|${word}|${m.currentIndex}|guess|${tick}|${bot.id}`,
      delay: thinkMs(bot, -600),
      think: () => (correct ? Promise.resolve(null) : botThink('wrong', { question: `Qual palavra está sendo feita em mímica? (é do tipo de "${word.length > 6 ? 'palavra longa' : 'palavra curta'}")`, avoid: [word] })),
      apply: (prev, data) => {
        const s = prev.mimica;
        if (!s || s.phase !== 'PLAYING' || s.currentIndex !== m.currentIndex) return prev;
        if (correct) return say({ ...prev, mimica: applyMimicaOutcome(s, 'correct') }, bot, word);
        const g = (Array.isArray(data) ? (data as string[]) : [])[0] || siblingWord(word);
        return say(prev, bot, g);
      }
    };
  }
  return null;
};

// ---------------- QUEM SOU EU / ONDE ESTOU: perguntar (sim/nao) e chutar ----------------
const QUESTIONS = [
  'Eu sou uma pessoa de verdade?',
  'Eu sou brasileiro?',
  'Eu estou vivo?',
  'Eu sou famoso pelo esporte?',
  'Eu apareço na TV?',
  'Eu sou um personagem de ficção?',
  'Eu sou do mundo da música?',
  'Eu sou homem?',
  'Eu sou mais velho que 40 anos?',
  'Eu já ganhei algum título?',
  'É um lugar no Brasil?',
  'É um momento histórico?'
];
const quemSouEu: Adapter = (room, bot) => {
  const q = room.quemSouEu;
  if (!q || q.phase !== 'PLAYING' || q.turnPlayerId !== bot.id) return null;
  const me = q.entries.find((e) => e.playerId === bot.id);
  if (!me || me.status !== 'searching') return null;
  const pr = botParamsOf(bot);
  // chance de saber cresce com as perguntas feitas; o Impossivel deduz rapido
  const knows = chance(Math.min(0.98, pr.acc * Math.min(1, (me.questions + 1) / Math.max(3, q.maxQuestions * (pr.acc > 0.9 ? 0.25 : 0.55)))));
  const lastChance = me.questions >= q.maxQuestions - 1;
  return {
    key: `qse|${me.identity}|${me.questions}|${me.wrongGuesses}|${bot.id}`,
    delay: thinkMs(bot, 600),
    apply: (prev) => {
      const s = prev.quemSouEu;
      if (!s || s.phase !== 'PLAYING' || s.turnPlayerId !== bot.id) return prev;
      const entry = s.entries.find((e) => e.playerId === bot.id);
      if (!entry || entry.questions !== me.questions || entry.wrongGuesses !== me.wrongGuesses) return prev;
      if (knows) return say({ ...prev, quemSouEu: recordCorrectGuess(s) }, bot, `Eu sou ${entry.identity}!`);
      if (lastChance || (entry.questions >= 3 && chance(0.3))) {
        const other = identitySibling(entry.identity, entry.category, s.entries.map((e) => e.identity));
        return say({ ...prev, quemSouEu: recordWrongGuess(s) }, bot, `Eu sou ${other}?`);
      }
      const qs = questionsFor(entry.category);
      return say({ ...prev, quemSouEu: recordQuestion(s) }, bot, qs[entry.questions % qs.length] || QUESTIONS[entry.questions % QUESTIONS.length]);
    }
  };
};

// ---------------- COMO EU PINTO: desenhar de verdade, ou olhar o desenho e chutar ----------------
/** "x,y x,y ..." (0 a 100) -> traco normalizado */
function parseStroke(raw: string, wobble: number): DrawStroke | null {
  const pts = raw
    .split(/\s+/)
    .map((p) => p.split(',').map(Number))
    .filter((p) => p.length === 2 && p.every((n) => Number.isFinite(n)))
    .map(([x, y]) => [Math.min(1, Math.max(0, x / 100 + (Math.random() - 0.5) * wobble)), Math.min(1, Math.max(0, y / 100 + (Math.random() - 0.5) * wobble))] as [number, number]);
  if (pts.length < 2) return null;
  return { points: pts, color: '#111111', width: 0.008 };
}

/** Formas simples para desenhar sem o Gemini (tracos "x,y x,y"). */
const SKETCHES: Array<[RegExp, string[]]> = [
  [/casa|lar|predio/, ['30,80 30,45 70,45 70,80 30,80', '25,47 50,20 75,47', '45,80 45,62 55,62 55,80', '35,52 42,52 42,59 35,59 35,52']],
  [/sol|calor|verao/, ['50,30 58,34 62,42 58,50 50,54 42,50 38,42 42,34 50,30', '50,18 50,10', '50,66 50,74', '30,42 22,42', '70,42 78,42', '36,28 30,22', '64,28 70,22', '36,56 30,62', '64,56 70,62']],
  [/arvore|planta|floresta/, ['48,85 48,55 52,55 52,85', '50,20 30,40 38,40 25,58 75,58 62,40 70,40 50,20']],
  [/gato|gata/, ['40,70 40,45 60,45 60,70 40,70', '40,45 42,35 47,45', '53,45 58,35 60,45', '45,53 46,54', '55,53 56,54', '60,65 72,58 74,48']],
  [/cachorro|cao/, ['30,60 30,45 65,45 65,60 30,60', '65,45 72,38 80,42 78,50 65,50', '33,60 33,72', '45,60 45,72', '55,60 55,72', '62,60 62,72', '30,48 22,40']],
  [/carro|automovel|taxi/, ['20,65 25,50 40,45 65,45 75,55 82,58 82,65 20,65', '32,68 35,72 39,68 35,64 32,68', '66,68 69,72 73,68 69,64 66,68', '42,48 42,55 60,55 58,48']],
  [/bola|futebol|gol/, ['50,25 62,30 67,45 62,60 50,65 38,60 33,45 38,30 50,25', '45,38 55,38 58,48 50,54 42,48 45,38']],
  [/peixe|mar|oceano/, ['25,50 40,38 60,38 72,50 60,62 40,62 25,50', '72,50 82,40 82,60 72,50', '35,46 36,47']],
  [/coracao|amor|paixao/, ['50,70 30,48 30,35 38,28 50,36 62,28 70,35 70,48 50,70']],
  [/estrela|famoso/, ['50,20 56,40 77,40 60,52 66,72 50,60 34,72 40,52 23,40 44,40 50,20']],
  [/lua|noite/, ['55,20 45,25 40,40 45,55 55,60 48,52 46,40 48,28 55,20']],
  [/oculos/, ['25,45 35,40 45,45 35,52 25,45', '55,45 65,40 75,45 65,52 55,45', '45,45 55,45']],
  [/copo|bebida|suco/, ['38,30 42,75 58,75 62,30', '38,30 62,30', '40,45 60,45']],
  [/livro|escola|ler/, ['25,35 50,40 75,35 75,70 50,75 25,70 25,35', '50,40 50,75']]
];
function sketchFor(word: string): string[] {
  const n = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return SKETCHES.find(([re]) => re.test(n))?.[1] || [];
}

/** Desenho -> PNG pequeno (para o Gemini olhar). So no navegador. */
function renderStrokes(strokes: DrawStroke[]): string | null {
  if (typeof document === 'undefined') return null;
  const W = 320;
  const H = 180;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, H);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  strokes.forEach((s) => {
    g.strokeStyle = s.color;
    g.globalAlpha = s.opacity ?? 1;
    g.lineWidth = Math.max(1.5, s.width * W);
    g.beginPath();
    s.points.forEach(([x, y], i) => (i ? g.lineTo(x * W, y * H) : g.moveTo(x * W, y * H)));
    g.stroke();
  });
  return c.toDataURL('image/png');
}

const pinto: Adapter = (room, bot) => {
  const p = room.comoEuPinto;
  if (!p) return null;
  const pr = botParamsOf(bot);
  const hasTimer = room.timerConfig > 0;
  const word = p.words[p.currentIndex];
  if (p.phase === 'PLAYING' && p.drawerPlayerId === bot.id && word) {
    // a IA desenhista nao precisa de olhos fechados: so libera a vez
    if (p.tvRevealGate || p.padPassGate) {
      return {
        key: `pin|${word}|${p.currentIndex}|gate|${bot.id}`,
        delay: 900,
        apply: (prev) => {
          const s = prev.comoEuPinto;
          if (!s) return prev;
          const next = s.tvRevealGate ? dismissTvWordReveal(s, hasTimer) : dismissPadPassGate(s, hasTimer);
          return say({ ...prev, comoEuPinto: next }, bot, 'Vou desenhar. Valendo!');
        }
      };
    }
    const n = p.strokes.length;
    return {
      key: `pin|${word}|${p.currentIndex}|stroke${n}|${bot.id}`,
      delay: n === 0 ? thinkMs(bot, -600) : Math.round(between([650, 1100])),
      think: () => botThink('pinto-draw', { word }, 12000),
      apply: (prev, data) => {
        const s = prev.comoEuPinto;
        if (!s || s.phase !== 'PLAYING' || s.currentIndex !== p.currentIndex || s.strokes.length !== n) return prev;
        const fromAi = Array.isArray(data) ? (data as string[]) : [];
        const raw = fromAi.length ? fromAi : sketchFor(word);
        // o nivel muda a firmeza do traco e quanto do desenho sai
        const total = Math.max(1, Math.round(raw.length * (0.5 + 0.5 * pr.acc)));
        if (!raw.length) {
          if (n === 0) return say({ ...prev, comoEuPinto: skipWord(s) }, bot, 'Vou começar pela próxima, essa eu volto depois!');
          return prev;
        }
        if (n >= total) return prev;
        const stroke = parseStroke(raw[n], (1 - pr.acc) * 0.05);
        if (!stroke) return { ...prev, comoEuPinto: addStroke(s, { points: [[0.5, 0.5], [0.51, 0.51]], color: '#111111', width: 0.002 }) };
        return { ...prev, comoEuPinto: addStroke(s, stroke) };
      }
    };
  }
  // IA que adivinha: olha o desenho a cada 2 tracos novos
  const isGuesser = p.phase === 'PLAYING' && word && (p.guesserPlayerId === bot.id || (!p.guesserPlayerId && bot.team === p.drawTeam && p.drawerPlayerId !== bot.id));
  if (isGuesser && p.strokes.length >= 2 && !isBot(room.players.find((x) => x.id === p.drawerPlayerId))) {
    const n = p.strokes.length - (p.strokes.length % 2);
    const strokes = p.strokes;
    return {
      key: `pin|${word}|${p.currentIndex}|look${n}|${bot.id}`,
      delay: thinkMs(bot, -400),
      think: () => {
        const img = renderStrokes(strokes);
        return img ? botThink('pinto-guess', { image: img }, 12000) : Promise.resolve([]);
      },
      apply: (prev, data) => {
        const s = prev.comoEuPinto;
        if (!s || s.phase !== 'PLAYING' || s.currentIndex !== p.currentIndex) return prev;
        const guesses = Array.isArray(data) ? (data as string[]) : [];
        const hit = guesses.find((g) => pintoGuessMatches(g, word));
        // viu certo: o nivel decide se ele "fala" a tempo; sem Gemini, chance pelo tamanho do desenho
        const right = hit ? chance(Math.min(0.99, pr.acc + 0.2)) : !guesses.length && chance(pr.acc * Math.min(1, s.strokes.length / 10) * 0.6);
        if (right) return say({ ...prev, comoEuPinto: markDrawn(s) }, bot, word);
        return say(prev, bot, `É ${guesses[0] || siblingWord(word, [word])}?`);
      }
    };
  }
  // roubo: a dupla rival tenta as palavras que faltaram
  if (p.phase === 'STEAL' && p.rivalTeam === bot.team) {
    const idx = p.outcomes.findIndex((o) => o === 'pending');
    if (idx < 0) return null;
    return {
      key: `pin|steal|${idx}|${bot.id}`,
      delay: thinkMs(bot),
      apply: (prev) => {
        const s = prev.comoEuPinto;
        if (!s || s.phase !== 'STEAL' || s.outcomes[idx] !== 'pending') return prev;
        if (chance(pr.acc * 0.6)) return say({ ...prev, comoEuPinto: setPintoOutcome(s, idx, 'stolen') }, bot, `Roubei! É ${s.words[idx]}!`);
        return say(prev, bot, `É ${siblingWord(s.words[idx])}?`);
      }
    };
  }
  return null;
};

// ---------------- COM TERRA: Plano do Diabo e Fronteiras (o Arquiteto vem da Fase 2) ----------------
function ctWith(prev: GameRoom, fn: (s: ComTerraState) => ComTerraState): GameRoom {
  const ct = prev.comTerra as ComTerraState | undefined;
  if (!ct) return prev;
  const next = fn(ct);
  return next === ct ? prev : { ...prev, comTerra: next };
}
const pointsOf = (s: ComTerraState, pid: string) => ranking(s).find((r) => r.playerId === pid)?.points ?? 0;
const bestOther = (s: ComTerraState, pid: string) => Math.max(0, ...ranking(s).filter((r) => r.playerId !== pid).map((r) => r.points));

function ctTargets(s: ComTerraState, pid: string): Array<{ x: number; y: number }> {
  const b = boardFor(s, pid);
  const out: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (canTarget(s, pid, x, y)) out.push({ x, y });
  return out;
}

/** Plano do Diabo: valor de um encaixe = pontos agora + compacidade (abre caminho para quadrados) + acao ganha. */
function ctPlaceValue(s: ComTerraState, pid: string, m: number[][], x: number, y: number): number | null {
  const r = previewPlacement(s, pid, m, x, y);
  if (!r) return null;
  let v = r.delta + (r.pending.some((p) => p.playerId === pid) ? 1.5 : 0);
  if (s.mode === 'diabo' && !s.hand[pid]?.devil) {
    // lados encostados em blocos seus: pecas juntas viram quadrado depois
    const b = r.board;
    let glue = 0;
    for (const pc of shapeCells(m)) {
      const cx = x + pc.dx;
      const cy = y + pc.dy;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
        const c = b.cells[ny * b.w + nx];
        if (c.o === pid && !m[ny - y]?.[nx - x]) glue++;
      }
    }
    v += glue * 0.35;
  }
  return v + Math.random() * 0.01;
}

/** Diabinho da IA: ficha -1 colada no territorio de quem lidera (ou arvore, que atrapalha pecas solidas). */
function ctSabotageMove(s: ComTerraState, bot: Player): ComTerraState | null {
  const leader = ranking(s).find((r) => r.playerId !== bot.id)?.playerId;
  if (!leader) return null;
  const b = boardFor(s, bot.id);
  const near = ctTargets(s, bot.id).filter(({ x, y }) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ].some(([dx, dy]) => b.cells[(y + dy) * b.w + x + dx]?.o === leader && x + dx >= 0 && x + dx < b.w)
  );
  if (!near.length) return null;
  const t = near[Math.floor(Math.random() * near.length)];
  return sabotage(s, bot.id, chance(0.6) ? 'tok' : 'tree', t.x, t.y, -1);
}

const comTerraOther: Adapter = (room, bot) => {
  const ct = room.comTerra as ComTerraState | undefined;
  if (!ct || ct.mode === 'arquiteto' || ct.phase === 'SUMMARY') return null;
  const stage = playerStage(ct, bot.id);
  if (stage === 'wait' || stage === 'done') return null;
  const stamp = `${ct.round}|${ct.phase}|${ct.turnIdx}|${ct.seq}|${stage}`;
  return {
    key: `ctx|${stamp}|${bot.id}`,
    delay: thinkMs(bot, -500),
    apply: (prev) =>
      ctWith(prev, (s) => {
        const st = playerStage(s, bot.id);
        if (st === 'pick') {
          // diabinho: so de vez em quando, e mais quando esta perdendo
          if (canSabotage(s, bot.id) && botParamsOf(bot).acc >= 0.4) {
            const behind = bestOther(s, bot.id) - pointsOf(s, bot.id);
            if (chance(behind > 5 ? 0.45 : 0.2)) {
              const n = ctSabotageMove(s, bot);
              if (n && n !== s) return n;
            }
          }
          // peca maior costuma render mais area; a Peca do Diabo fica por ultimo; so pecas que cabem
          const fits = s.shop.filter((p) => s.mode !== 'diabo' || hasAnyPlacement(s, bot.id, p));
          const shop = [...(fits.length ? fits : s.shop)].sort(
            (a, b) => (b.devil ? -1 : b.shape.flat().filter(Boolean).length) - (a.devil ? -1 : a.shape.flat().filter(Boolean).length)
          );
          const choice = pickByLevel(shop, bot);
          return choice ? pickPiece(s, bot.id, choice.uid) : s;
        }
        if (st === 'place') {
          const piece = s.hand[bot.id];
          if (!piece) return s;
          const b = boardFor(s, bot.id);
          const opts: Array<{ m: number[][]; x: number; y: number; v: number }> = [];
          for (const m of allOrientations(piece.shape)) {
            for (let y = -m.length + 1; y < b.h; y++) {
              for (let x = -m[0].length + 1; x < b.w; x++) {
                if (!canPlaceAt(s, bot.id, m, x, y).ok) continue;
                const v = ctPlaceValue(s, bot.id, m, x, y);
                if (v !== null) opts.push({ m, x, y, v });
              }
            }
          }
          const choice = pickByLevel(opts.sort((a, c) => c.v - a.v), bot);
          return choice ? placePiece(s, bot.id, choice.m, choice.x, choice.y) : discardPiece(s, bot.id);
        }
        if (st === 'action') {
          const kind = pendingFor(s, bot.id);
          const targets = ctTargets(s, bot.id);
          const before = pointsOf(s, bot.id);
          const scored = targets
            .map((t) => {
              const n = resolveAction(s, bot.id, t.x, t.y, 1);
              return { t, v: n === s ? -99 : pointsOf(n, bot.id) - before };
            })
            .filter((o) => o.v > -99)
            .sort((a, c) => c.v - a.v);
          const choice = pickByLevel(scored, bot);
          return choice ? resolveAction(s, bot.id, choice.t.x, choice.t.y, 1) : kind ? skipAction(s, bot.id) : s;
        }
        return s;
      })
  };
};

const comTerra: Adapter = (room, bot) => {
  const ct = room.comTerra as ComTerraState | undefined;
  if (!ct) return null;
  return ct.mode === 'arquiteto' ? ADAPTERS_PHASE2['com-terra'](room, bot) : comTerraOther(room, bot);
};

export const ADAPTERS_PHASE3: Record<string, Adapter> = {
  mimica,
  'quem-sou-eu': quemSouEu,
  'onde-estou': quemSouEu,
  'como-eu-pinto': pinto,
  'com-terra': comTerra
};
