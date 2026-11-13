import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameRoom, LimiteGameState, LimitePowerCardType, Player } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import {
  generateRoundContent,
  generateThemeStrictFallbackRound,
  sanitizeCleanGameText
} from '../../utils/aiGameGenerator';
import confetti from 'canvas-confetti';
import {
  PhoneCall,
  ArrowRight,
  RotateCcw,
  Trophy,
  Zap,
  X,
  Clock,
  Infinity as InfinityIcon,
  Lock
} from 'lucide-react';
import { LimitePlayingView } from './limite/LimitePlayingView';

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

interface ScreenLimiteProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateLimiteState: (updater: (prev: LimiteGameState) => LimiteGameState) => void;
  onNextRound: () => void;
  onRerollQuestion?: () => void;
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

export const ScreenLimite: React.FC<ScreenLimiteProps> = ({
  room,
  isTvMode = false,
  onUpdateLimiteState,
  onNextRound,
  onRerollQuestion
}) => {
  const limite = room.limite;
  const [drumrolling, setDrumrolling] = useState(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const [selectedPowerPlayerId, setSelectedPowerPlayerId] = useState<string>(
    room.players[0]?.id || ''
  );
  const [tvDraftGuesses, setTvDraftGuesses] = useState<Record<string, string>>({});
  const [editingSecretPlayers, setEditingSecretPlayers] = useState<Record<string, boolean>>({});

  // Close Power Cards modal on Escape
  useEffect(() => {
    if (!isPowerModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPowerModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPowerModalOpen]);

  // Ensure each player has 1 drawn power card for the match if not yet initialized
  useEffect(() => {
    if (!limite || room.players.length === 0) return;
    const existingMap = limite.assignedPowerCards || {};
    const missingAny = room.players.some((p) => !existingMap[p.id] && !p.assignedPowerCard);
    if (missingAny) {
      const drawn = drawLimitePowerCardsForPlayers(room.players);
      onUpdateLimiteState((prev) => ({
        ...prev,
        assignedPowerCards: {
          ...drawn.assignedPowerCards,
          ...(prev.assignedPowerCards || {})
        },
        usedPowerCardsByPlayer: {
          ...drawn.usedPowerCardsByPlayer,
          ...(prev.usedPowerCardsByPlayer || {})
        }
      }));
    }
  }, [limite?.assignedPowerCards, room.players.length, onUpdateLimiteState]);

  // Auto-start round countdown timer so no manual play click is required
  useEffect(() => {
    if (!limite) return;
    if (
      limite.phase === 'SECRET_GUESS' &&
      room.timerConfig > 0 &&
      !limite.timerActive &&
      limite.timerSeconds === room.timerConfig &&
      Object.keys(limite.guesses || {}).length === 0
    ) {
      onUpdateLimiteState((prev) => ({
        ...prev,
        timerActive: true
      }));
    }
  }, [limite?.phase, limite?.timerActive, limite?.timerSeconds, room.timerConfig, onUpdateLimiteState]);

  // Synchronized automatic round countdown timer (linked between TV and Mobile Controllers)
  useEffect(() => {
    if (
      !limite ||
      limite.phase !== 'SECRET_GUESS' ||
      !limite.timerActive ||
      room.timerConfig <= 0 ||
      limite.timerSeconds <= 0
    ) {
      return;
    }
    const interval = setInterval(() => {
      onUpdateLimiteState((prev) => {
        if (prev.phase !== 'SECRET_GUESS' || !prev.timerActive || prev.timerSeconds <= 0) {
          return prev;
        }
        const nextSec = prev.timerSeconds - 1;
        if (nextSec <= 0) {
          sounds.playBuzzer();
          return {
            ...prev,
            timerSeconds: 0,
            timerActive: false,
            revealCountdown: 5
          };
        }
        if (nextSec <= 10) {
          sounds.playTick(nextSec);
        }
        return {
          ...prev,
          timerSeconds: nextSec
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [limite?.phase, limite?.timerActive, limite?.timerSeconds, room.timerConfig, onUpdateLimiteState]);

  // 5-Second Automatic Suspense Countdown to Reveal Official Answer (5, 4, 3, 2, 1 -> PÁ!)
  useEffect(() => {
    if (
      !limite ||
      limite.phase === 'SCORING' ||
      limite.revealCountdown === undefined ||
      limite.revealCountdown === null
    ) {
      return;
    }

    if (limite.revealCountdown > 0) {
      sounds.playTick(limite.revealCountdown);
      const timer = setTimeout(() => {
        onUpdateLimiteState((prev) => {
          if (
            prev.phase === 'SCORING' ||
            prev.revealCountdown === null ||
            prev.revealCountdown === undefined
          ) {
            return prev;
          }
          const nextCount = prev.revealCountdown - 1;
          if (nextCount <= 0) {
            sounds.playSuccess();
            confetti({
              particleCount: 90,
              spread: 80,
              origin: { y: 0.5 }
            });
            return evaluateLimiteRoundReveal({
              ...prev,
              timerActive: false,
              revealCountdown: null
            });
          }
          return {
            ...prev,
            revealCountdown: nextCount
          };
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [limite?.phase, limite?.revealCountdown, onUpdateLimiteState]);

  // Timer tick for call timeout
  useEffect(() => {
    if (!limite || limite.phase !== 'CALL_TIMEOUT') {
      return;
    }
    const interval = setInterval(() => {
      onUpdateLimiteState((prev) => {
        if (prev.phase !== 'CALL_TIMEOUT' || prev.callTimerRemaining <= 0) {
          return prev;
        }
        if (prev.callTimerRemaining <= 1) {
          sounds.playBuzzer();
          return {
            ...prev,
            phase: 'SECRET_GUESS',
            callTimerRemaining: 0
          };
        }
        const nextSec = prev.callTimerRemaining - 1;
        if (nextSec <= 10) {
          sounds.playTick(nextSec);
        }
        return {
          ...prev,
          callTimerRemaining: nextSec
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [limite?.phase, onUpdateLimiteState]);

  if (!limite) {
    return (
      <div className="p-8 text-center font-mono-code text-cyan-300">
        Carregando rodada do Jogo do Limite...
      </div>
    );
  }

  const defaultModeForConnection =
    room.connectionMode === 'host' || room.connectionMode === 'multi' ? 'digital' : 'mesa';
  const playMode = limite.playMode || room.customConfig?.limitePlayMode || defaultModeForConnection;
  const isTimeExpired =
    (room.timerConfig > 0 && (limite.timerSeconds ?? 0) <= 0) ||
    Boolean(limite.revealCountdown);

  const handleTogglePlayMode = (mode: 'mesa' | 'digital') => {
    sounds.playTick();
    onUpdateLimiteState((prev) => ({
      ...prev,
      playMode: mode
    }));
  };

  const handleRerollLimiteQuestion = async () => {
    sounds.playPowerup();
    setTvDraftGuesses({});
    setEditingSecretPlayers({});
    if (onRerollQuestion) {
      onRerollQuestion();
      return;
    }
    try {
      const generated = await generateRoundContent('limite', room.theme, room.customConfig, [
        limite.roundData.pergunta
      ]);
      const data = generated.data as any;
      if (data && data.pergunta) {
        onUpdateLimiteState((prev) => ({
          ...prev,
          phase: 'SECRET_GUESS',
          roundData: {
            ...data,
            pergunta: sanitizeCleanGameText(data.pergunta, 'limite')
          },
          guesses: {},
          submittedPlayers: [],
          winners: [],
          bustedPlayers: [],
          pointsAwarded: {},
          revealedOrder: false,
          timerSeconds: room.timerConfig,
          timerActive: room.timerConfig > 0,
          revealCountdown: null
        }));
        return;
      }
    } catch {
      // fallback below
    }
    onUpdateLimiteState((prev) => {
      const fb = generateThemeStrictFallbackRound(
        'limite',
        room.theme,
        room.theme,
        room.customConfig,
        [...(room.usedRoundSignatures || []), prev.roundData.pergunta]
      );
      const picked = (fb.data as any) || prev.roundData;
      return {
        ...prev,
        phase: 'SECRET_GUESS',
        roundData: picked,
        guesses: {},
        submittedPlayers: [],
        winners: [],
        bustedPlayers: [],
        pointsAwarded: {},
        revealedOrder: false,
        timerSeconds: room.timerConfig,
        timerActive: room.timerConfig > 0,
        revealCountdown: null
      };
    });
  };

  const parseDraftGuess = (rawVal: string): number | null => {
    const normalized = rawVal.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (rawVal.trim() === '' || isNaN(parsed)) return null;
    return parsed;
  };

  const mergeDraftGuesses = (prev: LimiteGameState, drafts: Record<string, string>): LimiteGameState => {
    let changed = false;
    const nextGuesses = { ...prev.guesses };
    for (const [playerId, rawVal] of Object.entries(drafts)) {
      const parsed = parseDraftGuess(rawVal ?? '');
      if (parsed !== null) {
        nextGuesses[playerId] = parsed;
        changed = true;
      }
    }
    if (!changed) return prev;
    return {
      ...prev,
      guesses: nextGuesses,
      submittedPlayers: Object.keys(nextGuesses)
    };
  };

  const handleSubmitSecretTvGuess = (playerId: string) => {
    if (isTimeExpired) return;
    const parsed = parseDraftGuess(tvDraftGuesses[playerId] ?? '');
    if (parsed === null) return;
    sounds.playSuccess();
    setTvDraftGuesses((prev) => ({ ...prev, [playerId]: '' }));
    setEditingSecretPlayers((prev) => ({ ...prev, [playerId]: false }));
    onUpdateLimiteState((prev) => {
      const nextGuesses = { ...prev.guesses, [playerId]: parsed };
      return {
        ...prev,
        guesses: nextGuesses,
        submittedPlayers: Object.keys(nextGuesses)
      };
    });
  };

  const handleAwardDirectMesaVictory = (winnerId: string, forceExact?: boolean) => {
    const existingPts = limite.pointsAwarded?.[winnerId] || 0;
    const isAlreadyScored =
      Boolean(limite.winners?.includes(winnerId)) || existingPts > 0;
    const targetPts = computeLimiteWinnerPoints(limite, winnerId, forceExact);
    const willRemove =
      isAlreadyScored && (forceExact === undefined || existingPts === targetPts);

    if (willRemove) {
      sounds.playTick();
    } else {
      sounds.playSuccess();
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
    }
    onUpdateLimiteState((prev) => toggleLimiteWinnerPoint(prev, winnerId, forceExact));
  };

  const handleActivatePowerCardOnTV = (
    playerId: string,
    card: LimitePowerCardType
  ) => {
    if (!playerId) return;
    if (limite.usedPowerCardsByPlayer?.[playerId]) {
      sounds.playBuzzer();
      return;
    }
    sounds.playPowerup();
    onUpdateLimiteState((prev) => {
      const nextCards = { ...prev.powerCardsPlayed, [playerId]: card };
      const nextUsed = { ...(prev.usedPowerCardsByPlayer || {}), [playerId]: true };
      const isCall = card === 'ligacao';
      return {
        ...prev,
        activePowerCard: card,
        powerCardsPlayed: nextCards,
        usedPowerCardsByPlayer: nextUsed,
        phase: isCall ? 'CALL_TIMEOUT' : prev.phase,
        callTimerRemaining: isCall
          ? room.customConfig?.limiteCallTimeoutSeconds || 30
          : prev.callTimerRemaining
      };
    });
    setIsPowerModalOpen(false);
  };

  const handleRedrawPowerCardsOnTV = () => {
    sounds.playPowerup();
    const drawn = drawLimitePowerCardsForPlayers(room.players);
    onUpdateLimiteState((prev) => ({
      ...prev,
      assignedPowerCards: drawn.assignedPowerCards,
      usedPowerCardsByPlayer: drawn.usedPowerCardsByPlayer,
      powerCardsPlayed: {}
    }));
  };

  const handleImmediateReveal = () => {
    const draftsSnapshot = tvDraftGuesses;
    setTvDraftGuesses({});
    setEditingSecretPlayers({});
    setDrumrolling(false);
    sounds.playSuccess();
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.5 }
    });
    onUpdateLimiteState((prev) =>
      evaluateLimiteRoundReveal({
        ...mergeDraftGuesses(prev, draftsSnapshot),
        timerActive: false,
        revealCountdown: null
      })
    );
  };

  // Handle Reveal suspense (starts 5s countdown with beeps or immediate reveal)
  const handleTriggerReveal = () => {
    if (
      limite.revealCountdown !== null &&
      limite.revealCountdown !== undefined &&
      limite.revealCountdown > 0
    ) {
      handleImmediateReveal();
      return;
    }
    const draftsSnapshot = tvDraftGuesses;
    setTvDraftGuesses({});
    setEditingSecretPlayers({});
    // Launch dramatic 3-second countdown with beeps
    onUpdateLimiteState((prev) => ({
      ...mergeDraftGuesses(prev, draftsSnapshot),
      timerActive: false,
      revealCountdown: 3
    }));
  };

  const selectedModalPlayer = room.players.find((p) => p.id === selectedPowerPlayerId) || room.players[0];
  const selectedPlayerAssignedCard: LimitePowerCardType =
    (selectedModalPlayer &&
      (limite.assignedPowerCards?.[selectedModalPlayer.id] || selectedModalPlayer.assignedPowerCard)) ||
    'x2';
  const selectedPlayerCardMeta = LIMITE_POWER_CARD_META[selectedPlayerAssignedCard];
  const isSelectedPlayerCardUsed = Boolean(
    selectedModalPlayer &&
      (limite.usedPowerCardsByPlayer?.[selectedModalPlayer.id] ||
        selectedModalPlayer.powerCardUsed)
  );

  return <LimitePlayingView limite={limite} room={room} isTimeExpired={isTimeExpired} handleTogglePlayMode={handleTogglePlayMode} playMode={playMode} selectedPowerPlayerId={selectedPowerPlayerId} setSelectedPowerPlayerId={setSelectedPowerPlayerId} setIsPowerModalOpen={setIsPowerModalOpen} handleRerollLimiteQuestion={handleRerollLimiteQuestion} handleImmediateReveal={handleImmediateReveal} drumrolling={drumrolling} handleTriggerReveal={handleTriggerReveal} handleAwardDirectMesaVictory={handleAwardDirectMesaVictory} editingSecretPlayers={editingSecretPlayers} setEditingSecretPlayers={setEditingSecretPlayers} setTvDraftGuesses={setTvDraftGuesses} tvDraftGuesses={tvDraftGuesses} handleSubmitSecretTvGuess={handleSubmitSecretTvGuess} onNextRound={onNextRound} isPowerModalOpen={isPowerModalOpen} handleRedrawPowerCardsOnTV={handleRedrawPowerCardsOnTV} selectedModalPlayer={selectedModalPlayer} selectedPlayerCardMeta={selectedPlayerCardMeta} isSelectedPlayerCardUsed={isSelectedPlayerCardUsed} handleActivatePowerCardOnTV={handleActivatePowerCardOnTV} selectedPlayerAssignedCard={selectedPlayerAssignedCard} />;
};

