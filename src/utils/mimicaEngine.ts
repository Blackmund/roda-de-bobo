import type { GameCustomConfig, MimicaGameState, Player, TeamId } from '../types/game';
import { isShowRuleset } from '../config/rulesets';

/** Quantas palavras por rodada (o programa usa 3). */
export const MIMICA_WORDS_PER_ROUND = 3;

/**
 * Valor de cada palavra acertada. No programa as rodadas valem cada vez mais (1, 2 e 3 por palavra);
 * nas regras da casa toda palavra vale 1.
 */
export function mimicaRoundValue(roundNumber: number, config?: Partial<GameCustomConfig> | null): number {
  if (!isShowRuleset(config)) return 1;
  return Math.min(3, Math.max(1, Math.floor(roundNumber) || 1));
}

/** Escolhe quem faz a mímica e quem adivinha: revezam dentro da equipe a cada vez que ela joga. */
export function pickMimicaPair(
  players: Pick<Player, 'id' | 'team'>[],
  mimeTeam: TeamId,
  roundNumber: number,
  teamCount: number
): { mimePlayerId: string; guesserPlayerId?: string } {
  const members = players.filter((p) => p.team === mimeTeam);
  const pool = members.length > 0 ? members : players;
  const turnsOfThisTeam = Math.floor((Math.max(1, roundNumber) - 1) / Math.max(1, teamCount));
  const mime = pool[turnsOfThisTeam % pool.length];
  if (!mime) return { mimePlayerId: '' };
  const guesser =
    pool.length > 1
      ? pool[(turnsOfThisTeam + 1) % pool.length]
      : players.find((p) => p.id !== mime.id);
  return { mimePlayerId: mime.id, guesserPlayerId: guesser?.id };
}

export interface BuildMimicaStateInput {
  words: string[];
  mimeTeam: TeamId;
  mimePlayerId: string;
  guesserPlayerId?: string;
  timerSeconds: number;
  roundNumber: number;
  config?: Partial<GameCustomConfig> | null;
}

export function buildMimicaState(input: BuildMimicaStateInput): MimicaGameState {
  return {
    phase: 'READY',
    words: input.words,
    currentIndex: 0,
    outcomes: input.words.map(() => 'pending' as const),
    mimeTeam: input.mimeTeam,
    mimePlayerId: input.mimePlayerId,
    guesserPlayerId: input.guesserPlayerId,
    timerSeconds: input.timerSeconds,
    timerActive: false,
    roundValue: mimicaRoundValue(input.roundNumber, input.config),
    roundScore: 0,
    wordsHidden: false
  };
}

/** Proxima palavra ainda nao acertada depois de `from` (circular); null se todas foram acertadas. */
function nextOpenIndex(outcomes: MimicaGameState['outcomes'], from: number): number | null {
  const n = outcomes.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    if (outcomes[idx] !== 'correct') return idx;
  }
  return null;
}

/**
 * Marca a palavra atual como acertada ou pulada.
 * - acertou: soma o valor da rodada; se era a ultima aberta, a rodada termina.
 * - pulou: segue para outra palavra; a pulada pode voltar depois (so deixa de valer se o tempo acabar).
 */
export function applyMimicaOutcome(prev: MimicaGameState, outcome: 'correct' | 'skipped'): MimicaGameState {
  if (prev.phase !== 'PLAYING') return prev;
  const outcomes = [...prev.outcomes];
  outcomes[prev.currentIndex] = outcome;

  if (outcome === 'correct') {
    const next = nextOpenIndex(outcomes, prev.currentIndex);
    const roundScore = prev.roundScore + prev.roundValue;
    if (next === null) {
      return { ...prev, outcomes, roundScore, phase: 'SUMMARY', timerActive: false };
    }
    return { ...prev, outcomes, roundScore, currentIndex: next };
  }

  const next = nextOpenIndex(outcomes, prev.currentIndex);
  return { ...prev, outcomes, currentIndex: next ?? prev.currentIndex };
}

/** Encerra a rodada (tempo esgotado ou o diretor encerrou). */
export function finishMimicaRound(prev: MimicaGameState): MimicaGameState {
  if (prev.phase === 'SUMMARY') return prev;
  return { ...prev, phase: 'SUMMARY', timerActive: false };
}

/** Desfaz o ultimo acerto (o diretor reverte): a palavra volta a ficar aberta e a atual. */
export function undoMimicaCorrect(prev: MimicaGameState, index: number): MimicaGameState {
  if (prev.outcomes[index] !== 'correct') return prev;
  const outcomes = [...prev.outcomes];
  outcomes[index] = 'pending';
  return {
    ...prev,
    outcomes,
    roundScore: Math.max(0, prev.roundScore - prev.roundValue),
    currentIndex: index,
    phase: prev.phase === 'SUMMARY' && prev.timerSeconds > 0 ? 'PLAYING' : prev.phase,
    timerActive: prev.phase === 'SUMMARY' ? prev.timerSeconds > 0 : prev.timerActive
  };
}

/** Passa um segundo no cronometro; ao zerar a rodada termina. */
export function tickMimicaTimer(prev: MimicaGameState): MimicaGameState {
  if (prev.phase !== 'PLAYING' || !prev.timerActive) return prev;
  const next = prev.timerSeconds - 1;
  if (next <= 0) return { ...prev, timerSeconds: 0, phase: 'SUMMARY', timerActive: false };
  return { ...prev, timerSeconds: next };
}
