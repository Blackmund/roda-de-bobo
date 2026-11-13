/**
 * Adedanha (Stop) - motor puro, sem React.
 *
 * Rodada: sorteia uma letra -> cada jogador escreve, no celular, uma palavra com a letra para cada categoria ->
 * alguem aperta STOP (ou o tempo acaba) -> todos tem alguns segundos para mandar o que escreveram -> validacao,
 * uma categoria por vez: os outros votam se a resposta vale -> pontos.
 *
 * Pontos (como no Stop/stopots): resposta valida e unica = 10, valida repetida = 5, invalida ou vazia = 0.
 * Uma resposta e invalida se estiver vazia, nao comecar com a letra, ou se a maioria dos votos disser que nao vale.
 * O diretor pode forcar valida/invalida (override), que vence os votos.
 *
 * O tempo usa horario de termino (endsAt) em vez de contar segundo a segundo: menos mensagens entre TV e celulares.
 */
import type { AdedanhaState, AdedanhaStopRule, Player } from '../types/game';
import { ADEDANHA_LETRAS } from '../data/adedanhaCategorias';

export const ADEDANHA_STOP_GRACE_MS = 4000;
/** A letra gira por este tempo antes de parar; o relogio so comeca a contar depois. */
export const ADEDANHA_SPIN_MS = 1800;
export const ADEDANHA_POINTS_UNIQUE = 10;
export const ADEDANHA_POINTS_REPEATED = 5;

export const normalizeAnswer = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Sorteia uma letra pelos pesos, sem as excluidas e sem repetir as ja usadas (enquanto houver opcao). */
export function drawLetter(used: string[] = [], excluded: string[] = [], rng: () => number = Math.random): string {
  const ex = new Set(excluded.map((l) => l.toUpperCase()));
  const us = new Set(used.map((l) => l.toUpperCase()));
  let pool = Object.entries(ADEDANHA_LETRAS).filter(([l, w]) => w > 0 && !ex.has(l) && !us.has(l));
  if (pool.length === 0) pool = Object.entries(ADEDANHA_LETRAS).filter(([l, w]) => w > 0 && !ex.has(l));
  if (pool.length === 0) pool = Object.entries(ADEDANHA_LETRAS);
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [l, w] of pool) {
    r -= w;
    if (r <= 0) return l;
  }
  return pool[pool.length - 1][0];
}

export function buildAdedanhaState(
  players: Pick<Player, 'id'>[],
  categories: string[],
  letter: string,
  timerSeconds: number,
  stopRule: AdedanhaStopRule = 'first'
): AdedanhaState {
  return {
    stopRule,
    stopVotes: {},
    phase: 'READY',
    letter: letter.toUpperCase(),
    categories: [...categories],
    playerIds: players.map((p) => p.id),
    answers: {},
    submitted: {},
    timerSeconds,
    endsAt: null,
    stopBy: null,
    stopAt: null,
    voteIndex: 0,
    votes: {},
    overrides: {}
  };
}

export function startWriting(s: AdedanhaState, now = Date.now()): AdedanhaState {
  if (s.phase !== 'READY') return s;
  return { ...s, phase: 'WRITING', startedAt: now, endsAt: s.timerSeconds > 0 ? now + ADEDANHA_SPIN_MS + s.timerSeconds * 1000 : null };
}

/** Guarda as respostas do jogador (pode mandar de novo ate a validacao comecar). */
export function submitAnswers(s: AdedanhaState, playerId: string, answers: string[]): AdedanhaState {
  if (s.phase !== 'WRITING' && s.phase !== 'STOPPING') return s;
  const clean = s.categories.map((_, i) => String(answers[i] ?? '').trim().slice(0, 60));
  return {
    ...s,
    answers: { ...s.answers, [playerId]: clean },
    submitted: { ...s.submitted, [playerId]: true }
  };
}

/** STOP: so vale com todas as categorias preenchidas (regra do Stop). Abre a janela para os outros mandarem. */
export function callStop(s: AdedanhaState, playerId: string | null, now = Date.now()): AdedanhaState {
  if (s.phase !== 'WRITING') return s;
  return { ...s, phase: 'STOPPING', stopBy: playerId, stopAt: now };
}

/** Pelo celular, este jogador pode pedir STOP? (o diretor sempre pode, pela TV) */
export function playerCanStop(s: AdedanhaState): boolean {
  const rule = s.stopRule || 'first';
  return rule === 'first' || rule === 'majority';
}

/**
 * Pedido de STOP vindo do celular (so com tudo preenchido). Regra "primeiro": para na hora.
 * Regra "maioria": conta o pedido e so para quando mais da metade dos jogadores pediu.
 */
export function requestStop(s: AdedanhaState, playerId: string, now = Date.now()): AdedanhaState {
  if (s.phase !== 'WRITING' || !playerCanStop(s)) return s;
  if ((s.stopRule || 'first') === 'first') return callStop(s, playerId, now);
  const stopVotes = { ...(s.stopVotes || {}), [playerId]: true };
  const asked = s.playerIds.filter((id) => stopVotes[id]).length;
  if (asked * 2 > s.playerIds.length) return callStop({ ...s, stopVotes }, playerId, now);
  return { ...s, stopVotes };
}

export const stopVotesCount = (s: AdedanhaState): number => s.playerIds.filter((id) => s.stopVotes?.[id]).length;

export const allFilled = (s: AdedanhaState, answers: string[]): boolean =>
  s.categories.every((_, i) => String(answers[i] ?? '').trim().length > 0);

/** Comeca com a letra sorteada (ignorando acento, "o"/"a" na frente nao conta). */
export function startsWithLetter(answer: string, letter: string): boolean {
  const n = normalizeAnswer(answer);
  return n.length > 0 && n[0] === normalizeAnswer(letter)[0];
}

export const voteKey = (catIndex: number, playerId: string) => `${catIndex}|${playerId}`;

export function castVote(s: AdedanhaState, catIndex: number, targetId: string, voterId: string, valid: boolean): AdedanhaState {
  if (s.phase !== 'VOTING' || targetId === voterId) return s;
  const k = voteKey(catIndex, targetId);
  return { ...s, votes: { ...s.votes, [k]: { ...(s.votes[k] || {}), [voterId]: valid } } };
}

export function setOverride(s: AdedanhaState, catIndex: number, targetId: string, valid: boolean | null): AdedanhaState {
  const k = voteKey(catIndex, targetId);
  const next = { ...s.overrides };
  if (valid === null) delete next[k];
  else next[k] = valid;
  return { ...s, overrides: next };
}

export const answerOf = (s: AdedanhaState, catIndex: number, playerId: string): string =>
  String(s.answers[playerId]?.[catIndex] ?? '').trim();

export type AdedanhaVerdict = 'empty' | 'wrong-letter' | 'voted-out' | 'valid';

/** A resposta vale? Vazia ou com outra letra nunca vale; senao a maioria dos votos decide (empate = vale). */
export function verdictOf(s: AdedanhaState, catIndex: number, playerId: string): AdedanhaVerdict {
  const k = voteKey(catIndex, playerId);
  const a = answerOf(s, catIndex, playerId);
  if (k in s.overrides) return s.overrides[k] ? 'valid' : a ? 'voted-out' : 'empty';
  if (!a) return 'empty';
  if (!startsWithLetter(a, s.letter)) return 'wrong-letter';
  const vs = Object.values(s.votes[k] || {});
  const no = vs.filter((v) => !v).length;
  const yes = vs.length - no;
  return no > yes ? 'voted-out' : 'valid';
}

export interface AdedanhaCell {
  playerId: string;
  answer: string;
  verdict: AdedanhaVerdict;
  repeated: boolean;
  points: number;
}

/** Resultado de uma categoria: validas repetidas (mesma palavra normalizada) valem 5, unicas 10. */
export function categoryResult(s: AdedanhaState, catIndex: number): AdedanhaCell[] {
  const cells = s.playerIds.map((pid) => ({ playerId: pid, answer: answerOf(s, catIndex, pid), verdict: verdictOf(s, catIndex, pid) }));
  const counts = new Map<string, number>();
  cells.forEach((c) => {
    if (c.verdict === 'valid') counts.set(normalizeAnswer(c.answer), (counts.get(normalizeAnswer(c.answer)) || 0) + 1);
  });
  return cells.map((c) => {
    const repeated = c.verdict === 'valid' && (counts.get(normalizeAnswer(c.answer)) || 0) > 1;
    const points = c.verdict !== 'valid' ? 0 : repeated ? ADEDANHA_POINTS_REPEATED : ADEDANHA_POINTS_UNIQUE;
    return { ...c, repeated, points };
  });
}

export function roundPoints(s: AdedanhaState): Record<string, number> {
  const out: Record<string, number> = {};
  s.playerIds.forEach((pid) => (out[pid] = 0));
  s.categories.forEach((_, i) => categoryResult(s, i).forEach((c) => (out[c.playerId] = (out[c.playerId] || 0) + c.points)));
  return out;
}

export function nextCategory(s: AdedanhaState): AdedanhaState {
  if (s.phase !== 'VOTING') return s;
  if (s.voteIndex + 1 < s.categories.length) return { ...s, voteIndex: s.voteIndex + 1 };
  return { ...s, phase: 'SUMMARY', pointsAwarded: roundPoints(s) };
}

export function prevCategory(s: AdedanhaState): AdedanhaState {
  if (s.phase !== 'VOTING' || s.voteIndex === 0) return s;
  return { ...s, voteIndex: s.voteIndex - 1 };
}

/**
 * O "relogio" da rodada, rodado por um so aparelho (a TV, ou o celular do lider no modo so celulares):
 * tempo acabou -> STOP automatico; janela do STOP acabou -> validacao.
 */
export function tickAdedanha(s: AdedanhaState, now = Date.now()): AdedanhaState {
  if (s.phase === 'WRITING' && s.endsAt && now >= s.endsAt) return callStop(s, null, now);
  if (s.phase === 'STOPPING' && s.stopAt && now >= s.stopAt + ADEDANHA_STOP_GRACE_MS) {
    return { ...s, phase: 'VOTING', voteIndex: 0 };
  }
  return s;
}

/** Segundos que faltam (para mostrar); null = sem limite. */
export function secondsLeft(s: AdedanhaState, now = Date.now()): number | null {
  if (s.phase === 'STOPPING' && s.stopAt) return Math.max(0, Math.ceil((s.stopAt + ADEDANHA_STOP_GRACE_MS - now) / 1000));
  if (s.phase !== 'WRITING' || !s.endsAt) return null;
  return Math.max(0, Math.ceil((s.endsAt - now) / 1000));
}
