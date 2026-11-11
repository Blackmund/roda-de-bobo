import type { Player, RespostasSemPerguntasState } from '../types/game';

/** Palavras da pergunta, sem o ponto de interrogacao final (o programa mostra "quantas palavras antes da interrogacao"). */
export function splitQuestion(question: string): string[] {
  return question
    .replace(/\?+\s*$/, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

export function buildRespostasState(
  item: { pergunta: string; resposta: string; categoria: string },
  players: Pick<Player, 'id'>[],
  firstPlayerIndex = 0
): RespostasSemPerguntasState {
  const words = splitQuestion(item.pergunta);
  const n = Math.max(1, players.length);
  return {
    phase: 'READY',
    category: item.categoria,
    words,
    answer: item.resposta,
    revealed: words.map(() => false),
    turnPlayerId: players[((firstPlayerIndex % n) + n) % n]?.id ?? '',
    step: 'pick',
    attempts: [],
    pointsAwarded: {},
    answerVisible: false
  };
}

export const wrongAttempts = (s: RespostasSemPerguntasState): number => s.attempts.filter((a) => !a.correct).length;

/**
 * Valor de acertar agora: tantos pontos quanto palavras tem a pergunta, menos 1 por erro ja cometido (minimo 1).
 * Exemplo do programa: pergunta de 11 palavras vale 11 na primeira tentativa e 10 na segunda.
 */
export function currentValue(s: RespostasSemPerguntasState): number {
  return Math.max(1, s.words.length - wrongAttempts(s));
}

/** Proximo jogador na ordem da sala (rodizio). */
export function nextPlayerId(playerIds: string[], fromId: string): string {
  if (playerIds.length === 0) return fromId;
  const i = playerIds.indexOf(fromId);
  return playerIds[(i + 1 + playerIds.length) % playerIds.length] ?? playerIds[0];
}

/** O jogador da vez escolhe UMA posicao para revelar (so na etapa de escolha, e posicao ainda oculta). */
export function pickPosition(prev: RespostasSemPerguntasState, position: number): RespostasSemPerguntasState {
  if (prev.phase !== 'PLAYING' || prev.step !== 'pick') return prev;
  if (position < 0 || position >= prev.words.length || prev.revealed[position]) return prev;
  const revealed = prev.revealed.map((r, i) => (i === position ? true : r));
  return { ...prev, revealed, step: 'guess', pendingPosition: position };
}

/**
 * Julga o palpite do jogador da vez. Acertou: ganha o valor atual e a rodada termina. Errou: perde a vez (o valor cai 1);
 * se todas as palavras ja foram reveladas e ninguem acertou, a rodada termina sem pontos.
 */
export function judgeGuess(
  prev: RespostasSemPerguntasState,
  correct: boolean,
  playerIds: string[]
): RespostasSemPerguntasState {
  if (prev.phase !== 'PLAYING' || prev.step !== 'guess') return prev;
  const position = prev.pendingPosition ?? prev.revealed.lastIndexOf(true);
  const attempts = [...prev.attempts, { playerId: prev.turnPlayerId, position, correct }];
  const base: RespostasSemPerguntasState = { ...prev, attempts, pendingPosition: undefined };

  if (correct) {
    const value = currentValue(prev);
    return {
      ...base,
      phase: 'SUMMARY',
      winnerPlayerId: prev.turnPlayerId,
      pointsAwarded: { [prev.turnPlayerId]: value },
      answerVisible: true
    };
  }
  if (base.revealed.every(Boolean)) {
    return { ...base, phase: 'SUMMARY', answerVisible: true };
  }
  return { ...base, turnPlayerId: nextPlayerId(playerIds, prev.turnPlayerId), step: 'pick' };
}

/** O diretor encerra a rodada sem vencedor. */
export function giveUpRound(prev: RespostasSemPerguntasState): RespostasSemPerguntasState {
  if (prev.phase === 'SUMMARY') return prev;
  return { ...prev, phase: 'SUMMARY', answerVisible: true };
}
