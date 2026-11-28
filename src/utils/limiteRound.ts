import type { LimiteGameState, LimitePowerCardType, Player } from '../types/game';

export const ALL_LIMITE_POWER_CARDS: LimitePowerCardType[] = ['ligacao', 'x2', 'menos1', 'troca'];

export const LIMITE_POWER_CARD_META: Record<
  LimitePowerCardType,
  {
    id: LimitePowerCardType;
    icon: string;
    title: string;
    shortBadge: string;
    description: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
  }
> = {
  ligacao: {
    id: 'ligacao',
    icon: '📞',
    title: 'Carta Ligação (30s)',
    shortBadge: '📞 LIGAÇÃO',
    description: 'Dispara um cronômetro de 30s na tela para consultar um amigo ou pesquisar!',
    borderClass: 'border-amber-400',
    bgClass: 'bg-amber-950/40',
    textClass: 'text-amber-300'
  },
  x2: {
    id: 'x2',
    icon: '✖️2',
    title: 'Carta Dobra (x2)',
    shortBadge: '✖️2 DOBRA',
    description: 'Se você vencer esta rodada, ganha o dobro de pontos (+2 pts ou +4 pts se cravar)!',
    borderClass: 'border-emerald-400',
    bgClass: 'bg-emerald-950/40',
    textClass: 'text-emerald-300'
  },
  menos1: {
    id: 'menos1',
    icon: '➖1',
    title: 'Carta Menos Um (-1)',
    shortBadge: '➖1 MENOS UM',
    description: 'O jogador com o palpite mais distante do valor exato perde 1 ponto!',
    borderClass: 'border-rose-400',
    bgClass: 'bg-rose-950/40',
    textClass: 'text-rose-300'
  },
  troca: {
    id: 'troca',
    icon: '🔄',
    title: 'Carta Troca Reversa',
    shortBadge: '🔄 TROCA',
    description: 'Troca o seu palpite com o de um adversário na hora da revelação!',
    borderClass: 'border-cyan-400',
    bgClass: 'bg-cyan-950/40',
    textClass: 'text-cyan-300'
  }
};

/**
 * Sorteia 1 poder especial por jogador para toda a partida do Jogo do Limite:
 * - Até 4 jogadores: sorteia sem repetição dentre os 4 poderes ('ligacao', 'x2', 'menos1', 'troca'). Com 4 jogadores, cada um recebe 1 poder diferente.
 * - Mais de 4 jogadores: garante os 4 poderes base e sorteia +1 poder aleatório para cada jogador extra (> 4), embaralhando a distribuição final.
 */
export function drawLimitePowerCardsForPlayers(players: Player[]): {
  assignedPowerCards: Record<string, LimitePowerCardType>;
  usedPowerCardsByPlayer: Record<string, boolean>;
  updatedPlayers: Player[];
} {
  const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const baseShuffled = shuffle(ALL_LIMITE_POWER_CARDS);
  const pool: LimitePowerCardType[] = [];

  if (players.length <= 4) {
    for (let i = 0; i < players.length; i++) {
      pool.push(baseShuffled[i]);
    }
  } else {
    pool.push(...baseShuffled);
    for (let i = 4; i < players.length; i++) {
      const extraRandom =
        ALL_LIMITE_POWER_CARDS[Math.floor(Math.random() * ALL_LIMITE_POWER_CARDS.length)];
      pool.push(extraRandom);
    }
  }

  const finalPool = players.length > 4 ? shuffle(pool) : pool;
  const assignedPowerCards: Record<string, LimitePowerCardType> = {};
  const usedPowerCardsByPlayer: Record<string, boolean> = {};

  const updatedPlayers = players.map((p, idx) => {
    const card = finalPool[idx] || ALL_LIMITE_POWER_CARDS[idx % ALL_LIMITE_POWER_CARDS.length];
    assignedPowerCards[p.id] = card;
    usedPowerCardsByPlayer[p.id] = false;
    return {
      ...p,
      assignedPowerCard: card,
      powerCardUsed: false,
      powerCards: {
        ligacao: card !== 'ligacao',
        troca: card !== 'troca',
        x2: card !== 'x2',
        menos1: card !== 'menos1'
      }
    };
  });

  return {
    assignedPowerCards,
    usedPowerCardsByPlayer,
    updatedPlayers
  };
}

/**
 * Checks whether a numeric guess matches the official exact value.
 */
export function isLimiteGuessExact(
  guess: number | undefined,
  exactValue: number | undefined
): boolean {
  if (typeof guess !== 'number' || Number.isNaN(guess)) return false;
  if (typeof exactValue !== 'number' || Number.isNaN(exactValue)) return false;
  return Math.abs(guess - exactValue) < 1e-9;
}

/**
 * Computes how many points a winning player receives in Jogo do Limite:
 * - Base points = 2 if the player guessed the exact value (or forceExact is true), otherwise 1.
 * - Multiplied by 2 if the player activated the 'x2' power card.
 */
export function computeLimiteWinnerPoints(
  prev: LimiteGameState,
  playerId: string,
  forceExact?: boolean
): number {
  const exact = prev.roundData?.valor_exato;
  const guess = prev.guesses?.[playerId];
  const isExact = forceExact !== undefined ? forceExact : isLimiteGuessExact(guess, exact);
  // REG-03: bônus por cravar vem da configuração (casa = 2; modo programa = 0, ou seja, vale 1 como os demais)
  const basePoints = isExact ? Math.max(1, prev.exactBonus ?? 2) : 1;
  const playedX2 = prev.powerCardsPlayed?.[playerId] === 'x2';
  return playedX2 ? basePoints * 2 : basePoints;
}

/**
 * Pure helper that evaluates all submitted guesses when revealing the official answer in Jogo do Limite.
 * - Winners who guessed the exact answer receive 2 base points instead of 1.
 * - Non-exact winners (highest <= exact, or closest bust if all busted) receive 1 base point.
 */
export function evaluateLimiteRoundReveal(prev: LimiteGameState): LimiteGameState {
  const exact = prev.roundData.valor_exato;
  const guesses = { ...prev.guesses };

  if (prev.swapTarget) {
    const { player1, player2 } = prev.swapTarget;
    const temp = guesses[player1];
    guesses[player1] = guesses[player2];
    guesses[player2] = temp;
  }

  const busted: string[] = [];
  const validGuesses: Array<{ playerId: string; guess: number; diff: number }> = [];
  const allDifferences: Array<{ playerId: string; guess: number; diff: number }> = [];

  Object.entries(guesses).forEach(([pid, val]) => {
    if (val > exact) {
      busted.push(pid);
    } else {
      validGuesses.push({ playerId: pid, guess: val, diff: exact - val });
    }
    allDifferences.push({ playerId: pid, guess: val, diff: Math.abs(val - exact) });
  });

  let winners: string[] = [];
  const pointsAwarded: Record<string, number> = {};
  let closestDifference = 0;

  if (validGuesses.length === 0 && allDifferences.length > 0) {
    allDifferences.sort((a, b) => a.diff - b.diff);
    const bestDiff = allDifferences[0].diff;
    closestDifference = bestDiff;
    winners = allDifferences.filter((x) => x.diff === bestDiff).map((x) => x.playerId);
  } else if (validGuesses.length > 0) {
    validGuesses.sort((a, b) => b.guess - a.guess);
    const bestGuess = validGuesses[0].guess;
    closestDifference = Math.abs(exact - bestGuess);
    winners = validGuesses.filter((x) => x.guess === bestGuess).map((x) => x.playerId);
  }

  const stateWithSwappedGuesses: LimiteGameState = {
    ...prev,
    guesses
  };

  winners.forEach((wId) => {
    const isExact = isLimiteGuessExact(guesses[wId], exact);
    pointsAwarded[wId] = computeLimiteWinnerPoints(stateWithSwappedGuesses, wId, isExact);
  });

  const hasMenos1 = Object.entries(prev.powerCardsPlayed || {}).find(
    ([, card]) => card === 'menos1'
  );
  if (hasMenos1 && allDifferences.length > 0) {
    allDifferences.sort((a, b) => b.diff - a.diff);
    const worstPlayerId = allDifferences[0].playerId;
    pointsAwarded[worstPlayerId] = (pointsAwarded[worstPlayerId] || 0) - 1;
  }

  return {
    ...prev,
    guesses,
    phase: 'SCORING',
    revealedOrder: true,
    winners,
    bustedPlayers: busted,
    closestDifference,
    pointsAwarded,
    revealCountdown: null
  };
}

/**
 * Pure helper to toggle a player's point in Jogo do Limite (multi-winner + reversible click).
 * - Multiple players can be awarded points simultaneously.
 * - If a player guessed the exact answer (or forceExact is true), they receive 2 base points instead of 1.
 * - Clicking an already-scored player with the same target points deactivates/removes their point.
 */
export function toggleLimiteWinnerPoint(
  prev: LimiteGameState,
  playerId: string,
  forceExact?: boolean
): LimiteGameState {
  if (!playerId) return prev;
  const currentWinners = Array.isArray(prev.winners) ? prev.winners : [];
  const currentPoints = { ...(prev.pointsAwarded || {}) };
  const existingPts = currentPoints[playerId] || 0;
  const isCurrentlyScored = currentWinners.includes(playerId) || existingPts > 0;
  const targetPts = computeLimiteWinnerPoints(prev, playerId, forceExact);

  if (isCurrentlyScored && (forceExact === undefined || existingPts === targetPts)) {
    const nextWinners = currentWinners.filter((id) => id !== playerId);
    delete currentPoints[playerId];
    return {
      ...prev,
      phase: 'SCORING',
      revealedOrder: true,
      winners: nextWinners,
      pointsAwarded: currentPoints
    };
  }

  const nextWinners = Array.from(new Set([...currentWinners, playerId]));
  currentPoints[playerId] = targetPts;

  return {
    ...prev,
    phase: 'SCORING',
    revealedOrder: true,
    winners: nextWinners,
    pointsAwarded: currentPoints
  };
}

/**
 * Formats the expected unit label for the prominent orange/cyan arcade badge:
 * "RESPONDA EM: [UNIDADE]" (expanding common abbreviations like "km" -> "QUILÔMETROS (KM)").
 */
export function formatLimiteExpectedUnitLabel(unidade: string): string {
  const clean = (unidade || '').trim();
  if (!clean) return 'RESPONDA EM: NÚMERO EXATO';
  const lower = clean.toLowerCase();
  if (lower === 'km') return 'RESPONDA EM: QUILÔMETROS (KM)';
  if (lower === 'kg') return 'RESPONDA EM: QUILOS (KG)';
  if (lower === 'cm') return 'RESPONDA EM: CENTÍMETROS (CM)';
  return `RESPONDA EM: ${clean.toUpperCase()}`;
}
