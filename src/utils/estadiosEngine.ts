import type { EstadiosGameState, Player } from '../types/game';
import { nextPlayerId } from './respostasEngine';

/** Pontos de quem acerta de primeira (programa: 5; de segunda 4, e assim por diante). */
export const ESTADIOS_MAX_POINTS = 5;
export const ESTADIOS_CLUES = 5;

export function buildEstadiosState(
  item: { nome: string; cidade: string; pais: string; pistas: readonly string[]; foto?: string },
  players: Pick<Player, 'id'>[],
  firstPlayerIndex = 0
): EstadiosGameState {
  const n = Math.max(1, players.length);
  return {
    phase: 'READY',
    nome: item.nome,
    cidade: item.cidade,
    pais: item.pais,
    pistas: [...item.pistas].slice(0, ESTADIOS_CLUES),
    foto: item.foto,
    turnPlayerId: players[((firstPlayerIndex % n) + n) % n]?.id ?? '',
    attempts: [],
    pointsAwarded: {},
    answerVisible: false
  };
}

export const wrongAttemptsEstadios = (s: EstadiosGameState): number => s.attempts.filter((a) => !a.correct).length;

/** Valor de acertar agora: 5 de primeira, 4 de segunda... (minimo 1). */
export function estadiosValue(s: EstadiosGameState): number {
  return Math.max(1, ESTADIOS_MAX_POINTS - wrongAttemptsEstadios(s));
}

/** Quantas pistas estao visiveis: 1 na primeira tentativa, mais 1 a cada erro (ate o total). */
export function estadiosCluesShown(s: EstadiosGameState): number {
  if (s.phase === 'SUMMARY') return s.pistas.length;
  return Math.min(s.pistas.length, wrongAttemptsEstadios(s) + 1);
}

/**
 * Julga o palpite do jogador da vez. Acertou: ganha o valor atual e a rodada termina. Errou: a vez passa para o proximo
 * jogador, que ve mais uma pista (e vale 1 ponto a menos). Depois de errar todas as pistas, termina sem pontos.
 */
export function judgeEstadio(prev: EstadiosGameState, correct: boolean, playerIds: string[]): EstadiosGameState {
  if (prev.phase !== 'PLAYING') return prev;
  const attempts = [...prev.attempts, { playerId: prev.turnPlayerId, correct }];
  const base: EstadiosGameState = { ...prev, attempts };
  if (correct) {
    return {
      ...base,
      phase: 'SUMMARY',
      winnerPlayerId: prev.turnPlayerId,
      pointsAwarded: { [prev.turnPlayerId]: estadiosValue(prev) },
      answerVisible: true
    };
  }
  if (wrongAttemptsEstadios(base) >= prev.pistas.length) {
    return { ...base, phase: 'SUMMARY', answerVisible: true };
  }
  return { ...base, turnPlayerId: nextPlayerId(playerIds, prev.turnPlayerId) };
}

export function giveUpEstadio(prev: EstadiosGameState): EstadiosGameState {
  if (prev.phase === 'SUMMARY') return prev;
  return { ...prev, phase: 'SUMMARY', answerVisible: true };
}
