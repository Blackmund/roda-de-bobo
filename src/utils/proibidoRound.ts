import type { GameRoom, Player, ProibidoGameState, TeamId } from '../types/game';
import { getActiveTeamIds, getNextTeamId } from './teamUtils';

export type ProibidoRole = 'SPEAKER' | 'GUESSER' | 'REFEREE' | 'SPECTATOR';

export function getProibidoPlayerRole(
  proibido: ProibidoGameState,
  player: { id: string; team?: TeamId },
  allPlayers: Player[]
): {
  role: ProibidoRole;
  isSpeaker: boolean;
  isGuesser: boolean;
  isReferee: boolean;
  speakerPlayer: Player | undefined;
  guesserPlayer: Player | undefined;
  refereePlayer: Player | undefined;
} {
  const is2Player = Boolean(proibido.is2PlayerMode || allPlayers.length === 2);
  const speakerPlayer = allPlayers.find((p) => p.id === proibido.speakerPlayerId) || allPlayers[0];
  const guesserPlayer =
    allPlayers.find((p) => p.id === proibido.guesserPlayerId) ||
    allPlayers.find((p) => p.id !== speakerPlayer?.id) ||
    allPlayers[1];
  const refereePlayer =
    allPlayers.find((p) => p.id === proibido.refereePlayerId) ||
    (!is2Player ? allPlayers.find((p) => p.team === proibido.refereeTeam) : undefined);

  const isSpeaker = player.id === speakerPlayer?.id;
  const isGuesser = !isSpeaker && player.id === guesserPlayer?.id;
  const isReferee = !isSpeaker && !isGuesser && (is2Player ? false : player.team === proibido.refereeTeam);

  let role: ProibidoRole = 'SPECTATOR';
  if (isSpeaker) role = 'SPEAKER';
  else if (isGuesser) role = 'GUESSER';
  else if (isReferee) role = 'REFEREE';

  return {
    role,
    isSpeaker,
    isGuesser,
    isReferee,
    speakerPlayer,
    guesserPlayer,
    refereePlayer
  };
}

export function getNextProibidoTurnInfo(room: GameRoom): {
  nextSpeakerName: string;
  nextSpeakerAvatar: string;
  nextGuesserName: string;
  nextTeamName: string;
  isGameOver: boolean;
} {
  const currentProibido = room.proibido;
  const nextRoundNum = room.roundNumber + 1;
  const isGameOver = nextRoundNum > (room.maxRounds || 3);
  const activeTeamIds = getActiveTeamIds(room);

  if (room.players.length === 2) {
    const currentSpeakerId = currentProibido?.speakerPlayerId;
    const p0 = room.players[0];
    const p1 = room.players[1];
    const nextSpeaker = currentSpeakerId === p0?.id ? p1 : p0;
    const nextGuesser = currentSpeakerId === p0?.id ? p0 : p1;
    return {
      nextSpeakerName: nextSpeaker?.name || 'Jogador 2',
      nextSpeakerAvatar: nextSpeaker?.avatar || '👤',
      nextGuesserName: nextGuesser?.name || 'Jogador 1',
      nextTeamName: 'Equipe Cooperativa',
      isGameOver
    };
  }

  const nextTeamId = getNextTeamId(currentProibido?.speakerTeam || 'A', activeTeamIds);
  const nextTeamPlayers = room.players.filter((p) => p.team === nextTeamId);
  const teamRoundTurn = Math.floor(nextRoundNum / activeTeamIds.length);
  const nextSpeaker =
    nextTeamPlayers.length > 0
      ? nextTeamPlayers[teamRoundTurn % nextTeamPlayers.length]
      : room.players[0];
  const otherPlayers = nextTeamPlayers.filter((p) => p.id !== nextSpeaker?.id);
  const nextGuesser =
    otherPlayers[0] || room.players.find((p) => p.id !== nextSpeaker?.id) || room.players[0];

  const teamName = room.teams[nextTeamId]?.name || `Equipe ${nextTeamId}`;
  return {
    nextSpeakerName: nextSpeaker?.name || 'Próximo Orador',
    nextSpeakerAvatar: nextSpeaker?.avatar || '👤',
    nextGuesserName: nextGuesser?.name || 'Adivinhador',
    nextTeamName: teamName,
    isGameOver
  };
}

export function applyProibidoCardOutcome(
  prev: ProibidoGameState,
  outcome: 'correct' | 'foul' | 'skipped'
): { nextState: ProibidoGameState; justFinishedAllCards: boolean } {
  if (prev.phase === 'SUMMARY') {
    return { nextState: prev, justFinishedAllCards: true };
  }
  const totalCards = prev.cards.length;
  if (totalCards === 0) {
    return { nextState: { ...prev, phase: 'SUMMARY', timerActive: false }, justFinishedAllCards: true };
  }

  const currentIdx = Math.min(Math.max(0, prev.currentCardIndex), totalCards - 1);
  const fallbackQueue = prev.cards
    .map((_, idx) => idx)
    .filter((idx) => prev.cardOutcomes[idx] !== 'correct' && prev.cardOutcomes[idx] !== 'foul');

  const rawQueue =
    Array.isArray(prev.pendingQueue) && prev.pendingQueue.length > 0
      ? prev.pendingQueue
      : fallbackQueue;

  // Deduplicate and keep only valid indices that haven't been resolved as correct or foul
  const activeQueue = Array.from(new Set(rawQueue)).filter(
    (idx) =>
      idx >= 0 &&
      idx < totalCards &&
      prev.cardOutcomes[idx] !== 'correct' &&
      prev.cardOutcomes[idx] !== 'foul'
  );

  const restOfQueue = activeQueue.filter((idx) => idx !== currentIdx);
  const updatedOutcomes = [...prev.cardOutcomes];
  updatedOutcomes[currentIdx] = outcome;

  if (outcome === 'skipped') {
    const nextQueue = [...restOfQueue, currentIdx];
    return {
      justFinishedAllCards: false,
      nextState: {
        ...prev,
        currentCardIndex: nextQueue[0] ?? currentIdx,
        pendingQueue: nextQueue,
        cardOutcomes: updatedOutcomes,
        phase: 'PLAYING'
      }
    };
  }

  const nextQueue = restOfQueue;
  const isFinished = nextQueue.length === 0;
  return {
    justFinishedAllCards: isFinished,
    nextState: {
      ...prev,
      roundScore: outcome === 'correct' ? prev.roundScore + 1 : prev.roundScore,
      lastFoulIndex: outcome === 'foul' ? currentIdx : prev.lastFoulIndex,
      currentCardIndex: isFinished ? currentIdx : nextQueue[0],
      pendingQueue: nextQueue,
      cardOutcomes: updatedOutcomes,
      phase: isFinished ? 'SUMMARY' : 'PLAYING',
      timerActive: isFinished ? false : prev.timerActive
    }
  };
}

/**
 * REG-06 / UX-10: contestar falta. No programa o diretor arbitra polemicas (ex.: 'encobrir' x 'cobertura'
 * nao e o mesmo radical). Se o juiz aceita a contestacao, a ultima falta e desfeita: a carta volta a ser a atual.
 */
export function contestProibidoFoul(prev: ProibidoGameState): ProibidoGameState {
  const idx = prev.lastFoulIndex;
  if (idx === undefined || prev.cardOutcomes[idx] !== 'foul') return prev;
  const outcomes = [...prev.cardOutcomes];
  outcomes[idx] = 'pending';
  const queue = [idx, ...(prev.pendingQueue ?? []).filter((i) => i !== idx)];
  return {
    ...prev,
    cardOutcomes: outcomes,
    pendingQueue: queue,
    currentCardIndex: idx,
    lastFoulIndex: undefined,
    phase: 'PLAYING',
    timerActive: prev.phase === 'SUMMARY' ? prev.timerSeconds > 0 : prev.timerActive
  };
}
