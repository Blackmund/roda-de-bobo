import type { ComoEuPintoState, DrawStroke, PintoPlayMode, Player, TeamId } from '../types/game';

/** Palavras por rodada (programa: 3, em 2 minutos). */
export const PINTO_WORDS_PER_ROUND = 3;

/** Cores do lapis sobre folha branca (primeira e a padrao escura). */
export const PINTO_COLORS = [
  '#0A0B1E',
  '#525870',
  '#E6194B',
  '#FF6B00',
  '#FFC93C',
  '#10B981',
  '#17B8B8',
  '#2563EB',
  '#7C3AED',
  '#EC4899',
  '#8B4513',
  '#FFFFFF'
];

export const PINTO_PAPER_COLOR = '#FFFFFF';

export const PINTO_BRUSH_PRESETS = [
  { id: 'P', label: 'P', width: 0.005 },
  { id: 'M', label: 'M', width: 0.011 },
  { id: 'G', label: 'G', width: 0.022 }
] as const;

/** Limite de seguranca: um desenho enorme travaria a sincronizacao entre TV e celulares. */
export const MAX_STROKES = 400;
export const MAX_POINTS_PER_STROKE = 600;

/** Mantem so o que o canvas aceita: pontos normalizados 0..1, cor curta, espessura e opacidade validas. */
export function sanitizeStroke(stroke: DrawStroke): DrawStroke | null {
  if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) return null;
  const points = stroke.points
    .slice(0, MAX_POINTS_PER_STROKE)
    .filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map(([x, y]) => [Math.min(1, Math.max(0, Math.round(x * 1000) / 1000)), Math.min(1, Math.max(0, Math.round(y * 1000) / 1000))] as [number, number]);
  if (points.length === 0) return null;
  const color = typeof stroke.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(stroke.color) ? stroke.color : '#F5F2EB';
  const width = Number.isFinite(stroke.width) ? Math.min(0.05, Math.max(0.002, stroke.width)) : 0.008;
  const opacity =
    typeof stroke.opacity === 'number' && Number.isFinite(stroke.opacity)
      ? Math.min(1, Math.max(0.15, Math.round(stroke.opacity * 100) / 100))
      : undefined;
  return opacity !== undefined ? { points, color, width, opacity } : { points, color, width };
}

export interface BuildPintoInput {
  words: string[];
  drawTeam: TeamId;
  rivalTeam?: TeamId;
  drawerPlayerId: string;
  guesserPlayerId?: string;
  timerSeconds: number;
  inputMode?: PintoPlayMode;
  padConnected?: boolean;
}

export function buildComoEuPintoState(input: BuildPintoInput): ComoEuPintoState {
  return {
    phase: 'READY',
    inputMode: input.inputMode,
    tvRevealGate: false,
    padPassGate: input.inputMode === 'pad',
    padConnected: input.padConnected ?? false,
    liveStroke: null,
    words: input.words,
    currentIndex: 0,
    outcomes: input.words.map(() => 'pending' as const),
    drawTeam: input.drawTeam,
    rivalTeam: input.rivalTeam,
    drawerPlayerId: input.drawerPlayerId,
    guesserPlayerId: input.guesserPlayerId,
    timerSeconds: input.timerSeconds,
    timerActive: false,
    strokes: [],
    redoStrokes: [],
    drawings: input.words.map(() => []),
    wordHidden: input.inputMode === 'pad' || input.inputMode === 'tv'
  };
}

/** Quem desenha e quem adivinha: revezam dentro da equipe a cada vez que ela joga (mesma regra da Mimica). */
export function pickPintoPair(
  players: Pick<Player, 'id' | 'team'>[],
  drawTeam: TeamId,
  roundNumber: number,
  teamCount: number
): { drawerPlayerId: string; guesserPlayerId?: string } {
  const members = players.filter((p) => p.team === drawTeam);
  const pool = members.length > 0 ? members : players;
  const turns = Math.floor((Math.max(1, roundNumber) - 1) / Math.max(1, teamCount));
  const drawer = pool[turns % pool.length];
  if (!drawer) return { drawerPlayerId: '' };
  const guesser = pool.length > 1 ? pool[(turns + 1) % pool.length] : players.find((p) => p.id !== drawer.id);
  return { drawerPlayerId: drawer.id, guesserPlayerId: guesser?.id };
}

/** Acrescenta um traco ao desenho da palavra atual (so enquanto se desenha). */
export function addStroke(prev: ComoEuPintoState, stroke: DrawStroke): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  const clean = sanitizeStroke(stroke);
  if (!clean || prev.strokes.length >= MAX_STROKES) return prev;
  return {
    ...prev,
    strokes: [...prev.strokes, clean],
    redoStrokes: [],
    liveStroke: null
  };
}

/** Atualiza ou limpa o traco em andamento (espelho ao vivo antes de soltar o dedo). */
export function setLiveStroke(prev: ComoEuPintoState, stroke: DrawStroke | null): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  if (!stroke) return prev.liveStroke ? { ...prev, liveStroke: null } : prev;
  const clean = sanitizeStroke(stroke);
  if (!clean) return prev;
  return { ...prev, liveStroke: clean };
}

export function undoStroke(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'PLAYING' || prev.strokes.length === 0) return prev;
  const last = prev.strokes[prev.strokes.length - 1];
  return {
    ...prev,
    strokes: prev.strokes.slice(0, -1),
    redoStrokes: [...(prev.redoStrokes || []), last],
    liveStroke: null
  };
}

export function redoStroke(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  const stack = prev.redoStrokes || [];
  if (stack.length === 0) return prev;
  const restored = stack[stack.length - 1];
  return {
    ...prev,
    strokes: [...prev.strokes, restored],
    redoStrokes: stack.slice(0, -1),
    liveStroke: null
  };
}

export function clearDrawing(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'PLAYING' || (prev.strokes.length === 0 && !prev.liveStroke)) return prev;
  return { ...prev, strokes: [], redoStrokes: [], liveStroke: null };
}

/** Seleciona como sera a rodada no modo local ('pad' = 1 celular como prancheta, 'tv' = so pela TV). */
export function startPintoWithMode(
  prev: ComoEuPintoState,
  mode: PintoPlayMode,
  hasTimer: boolean,
  isLocalRoom: boolean
): ComoEuPintoState {
  if (mode === 'tv') {
    return {
      ...prev,
      phase: 'PLAYING',
      inputMode: 'tv',
      wordHidden: true,
      tvRevealGate: true,
      padPassGate: false,
      timerActive: false
    };
  }
  return {
    ...prev,
    phase: 'PLAYING',
    inputMode: 'pad',
    wordHidden: true,
    tvRevealGate: false,
    padPassGate: isLocalRoom,
    // No modo local com prancheta unica, o relogio comeca quando o desenhista destrava a palavra no celular.
    timerActive: isLocalRoom ? false : hasTimer
  };
}

/** No modo "So pela TV": apos o desenhista ver a palavra com olhos fechados, oculta e libera o cronometro. */
export function dismissTvWordReveal(prev: ComoEuPintoState, hasTimer: boolean): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  return {
    ...prev,
    tvRevealGate: false,
    wordHidden: true,
    timerActive: hasTimer
  };
}

/** No celular prancheta unica: desenhista confirma que pegou o celular e comeca a ver a palavra e desenhar. */
export function dismissPadPassGate(prev: ComoEuPintoState, hasTimer: boolean): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  return {
    ...prev,
    padPassGate: false,
    timerActive: hasTimer
  };
}

const pendingIndexes = (s: ComoEuPintoState) => s.outcomes.map((o, i) => (o === 'pending' ? i : -1)).filter((i) => i >= 0);
export const remainingWords = (s: ComoEuPintoState): number => pendingIndexes(s).length;

/** Guarda o desenho da palavra atual e passa para a proxima que ainda falta (ou fecha a rodada). */
function advance(prev: ComoEuPintoState, outcomes: ComoEuPintoState['outcomes']): ComoEuPintoState {
  const drawings = prev.drawings.map((d, i) => (i === prev.currentIndex ? prev.strokes : d));
  const n = outcomes.length;
  let next = -1;
  for (let step = 1; step <= n; step++) {
    const idx = (prev.currentIndex + step) % n;
    if (outcomes[idx] === 'pending') {
      next = idx;
      break;
    }
  }
  const base: ComoEuPintoState = {
    ...prev,
    outcomes,
    drawings,
    strokes: [] as DrawStroke[],
    redoStrokes: [],
    liveStroke: null
  };
  if (next < 0) {
    return { ...base, phase: 'SUMMARY', timerActive: false, tvRevealGate: false, padPassGate: false };
  }
  if (prev.inputMode === 'tv') {
    // No modo "So pela TV", protege a nova palavra pedindo olhos fechados antes de continuar desenhando.
    return {
      ...base,
      currentIndex: next,
      strokes: drawings[next] ?? [],
      wordHidden: true,
      tvRevealGate: true,
      timerActive: false
    };
  }
  return { ...base, currentIndex: next, strokes: drawings[next] ?? [] };
}

/** A dupla que desenha acertou a palavra atual (+1). */
export function markDrawn(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  const outcomes = [...prev.outcomes];
  outcomes[prev.currentIndex] = 'correct';
  return advance(prev, outcomes);
}

/** Passa para outra palavra sem acertar (a pulada pode voltar). */
export function skipWord(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  const pend = pendingIndexes(prev);
  if (pend.length <= 1) return prev;
  const drawings = prev.drawings.map((d, i) => (i === prev.currentIndex ? prev.strokes : d));
  const n = prev.outcomes.length;
  let next = prev.currentIndex;
  for (let step = 1; step <= n; step++) {
    const idx = (prev.currentIndex + step) % n;
    if (prev.outcomes[idx] === 'pending') {
      next = idx;
      break;
    }
  }
  if (prev.inputMode === 'tv') {
    return {
      ...prev,
      drawings,
      currentIndex: next,
      strokes: drawings[next] ?? [],
      redoStrokes: [],
      liveStroke: null,
      wordHidden: true,
      tvRevealGate: true,
      timerActive: false
    };
  }
  return {
    ...prev,
    drawings,
    currentIndex: next,
    strokes: drawings[next] ?? [],
    redoStrokes: [],
    liveStroke: null
  };
}

/** Fim do tempo ou do desenho: se faltam palavras e ha dupla rival, ela tenta roubar; senao, resumo. */
export function endDrawing(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'PLAYING') return prev;
  const drawings = prev.drawings.map((d, i) => (i === prev.currentIndex ? prev.strokes : d));
  const base = { ...prev, drawings, liveStroke: null, tvRevealGate: false, padPassGate: false, timerActive: false };
  if (remainingWords(prev) > 0 && prev.rivalTeam) return { ...base, phase: 'STEAL' };
  return { ...base, phase: 'SUMMARY' };
}

/** Passa um segundo no cronometro; ao zerar, encerra o desenho. */
export function tickPintoTimer(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'PLAYING' || !prev.timerActive) return prev;
  const next = prev.timerSeconds - 1;
  if (next <= 0) return endDrawing({ ...prev, timerSeconds: 0 });
  return { ...prev, timerSeconds: next };
}

/** A dupla rival adivinhou uma das palavras que faltavam (+1 para ela). */
export function stealWord(prev: ComoEuPintoState, index: number): ComoEuPintoState {
  if (prev.phase !== 'STEAL' || prev.outcomes[index] !== 'pending') return prev;
  const outcomes = [...prev.outcomes];
  outcomes[index] = 'stolen';
  const done = outcomes.every((o) => o !== 'pending');
  return { ...prev, outcomes, phase: done ? 'SUMMARY' : 'STEAL' };
}

export function finishSteal(prev: ComoEuPintoState): ComoEuPintoState {
  if (prev.phase !== 'STEAL') return prev;
  return { ...prev, phase: 'SUMMARY' };
}

/** Pontos da rodada: cada acerto da dupla que desenha e cada roubo da rival valem 1. */
export function pintoRoundPoints(s: ComoEuPintoState): { draw: number; rival: number } {
  return {
    draw: s.outcomes.filter((o) => o === 'correct').length,
    rival: s.outcomes.filter((o) => o === 'stolen').length
  };
}
