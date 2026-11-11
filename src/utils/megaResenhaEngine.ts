import type { MegaResenhaClue, MegaResenhaGameState, TeamId } from '../types/game';
import { normalizeMegaWord } from '../data/megaResenhaWords';

/** Palavras por rodada (programa: 5, em 1 minuto). */
export const MEGA_WORDS_PER_ROUND = 5;

export interface ClueVerdict {
  ok: boolean;
  reason?: string;
}

const tokens = (s: string) => normalizeMegaWord(s).split(/[\s\-–—_/]+/).filter(Boolean);

/** Prefixo comum de duas palavras (ja normalizadas). */
function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Heuristica de "mesmo radical": prefixo comum de 4+ letras, ou a mais curta inteira dentro da outra (3+ letras).
 * Nao substitui o juiz (existem falsos positivos e negativos), por isso o diretor pode contestar.
 */
export function sharesRadical(a: string, b: string): boolean {
  const x = normalizeMegaWord(a);
  const y = normalizeMegaWord(b);
  if (!x || !y) return false;
  const p = commonPrefix(x, y);
  const shorter = Math.min(x.length, y.length);
  return p >= 4 || (p === shorter && p >= 3);
}

/**
 * Regras da dica da Mega Resenha: UMA palavra so (sem frase nem nome composto), diferente da palavra-alvo e sem
 * o mesmo radical de nenhuma palavra dela.
 */
export function validateClue(target: string, clue: string): ClueVerdict {
  const parts = tokens(clue);
  if (parts.length === 0) return { ok: false, reason: 'dica vazia' };
  if (parts.length > 1) return { ok: false, reason: 'só vale UMA palavra (sem frase nem nome composto)' };
  const targetParts = tokens(target);
  const word = parts[0];
  if (targetParts.includes(word)) return { ok: false, reason: 'é a própria palavra' };
  const clash = targetParts.find((t) => sharesRadical(t, word));
  if (clash) return { ok: false, reason: `mesmo radical de "${clash}"` };
  return { ok: true };
}

export interface BuildMegaInput {
  words: string[];
  team: TeamId;
  giverPlayerId: string;
  guesserPlayerId?: string;
  timerSeconds: number;
}

export function buildMegaResenhaState(input: BuildMegaInput): MegaResenhaGameState {
  return {
    phase: 'READY',
    words: input.words,
    currentIndex: 0,
    outcomes: input.words.map(() => 'pending' as const),
    clues: input.words.map(() => [] as MegaResenhaClue[]),
    team: input.team,
    giverPlayerId: input.giverPlayerId,
    guesserPlayerId: input.guesserPlayerId,
    timerSeconds: input.timerSeconds,
    timerActive: false,
    roundScore: 0,
    wordsHidden: false
  };
}

/** Registra uma dica na palavra atual, ja com o veredito automatico. */
export function addClue(prev: MegaResenhaGameState, clue: string): MegaResenhaGameState {
  if (prev.phase !== 'PLAYING') return prev;
  const text = clue.trim();
  if (!text) return prev;
  const verdict = validateClue(prev.words[prev.currentIndex], text);
  const clues = prev.clues.map((list, i) =>
    i === prev.currentIndex ? [...list, { text, valid: verdict.ok, reason: verdict.reason }] : list
  );
  return {
    ...prev,
    clues,
    lastEvent: verdict.ok ? undefined : `Dica inválida: ${verdict.reason}`
  };
}

/** O juiz aceita uma dica marcada como invalida (contesta o veredito automatico). */
export function overruleClue(prev: MegaResenhaGameState, wordIndex: number, clueIndex: number): MegaResenhaGameState {
  const clues = prev.clues.map((list, i) =>
    i === wordIndex ? list.map((c, j) => (j === clueIndex ? { ...c, valid: true, overruled: true } : c)) : list
  );
  return { ...prev, clues, lastEvent: 'Juiz aceitou a dica.' };
}

function nextOpenIndex(outcomes: MegaResenhaGameState['outcomes'], from: number): number | null {
  const n = outcomes.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    if (outcomes[idx] !== 'correct') return idx;
  }
  return null;
}

/** Acertou (+1) ou pulou a palavra atual; a pulada pode voltar. */
export function applyMegaOutcome(prev: MegaResenhaGameState, outcome: 'correct' | 'skipped'): MegaResenhaGameState {
  if (prev.phase !== 'PLAYING') return prev;
  const outcomes = [...prev.outcomes];
  outcomes[prev.currentIndex] = outcome;
  const next = nextOpenIndex(outcomes, prev.currentIndex);
  if (outcome === 'correct') {
    const roundScore = prev.roundScore + 1;
    if (next === null) return { ...prev, outcomes, roundScore, phase: 'SUMMARY', timerActive: false, lastEvent: undefined };
    return { ...prev, outcomes, roundScore, currentIndex: next, lastEvent: undefined };
  }
  return { ...prev, outcomes, currentIndex: next ?? prev.currentIndex, lastEvent: undefined };
}

export function finishMegaRound(prev: MegaResenhaGameState): MegaResenhaGameState {
  if (prev.phase === 'SUMMARY') return prev;
  return { ...prev, phase: 'SUMMARY', timerActive: false };
}

export function tickMegaTimer(prev: MegaResenhaGameState): MegaResenhaGameState {
  if (prev.phase !== 'PLAYING' || !prev.timerActive) return prev;
  const next = prev.timerSeconds - 1;
  if (next <= 0) return { ...prev, timerSeconds: 0, phase: 'SUMMARY', timerActive: false };
  return { ...prev, timerSeconds: next };
}
