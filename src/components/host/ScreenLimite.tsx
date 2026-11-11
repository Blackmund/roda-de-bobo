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

  const handleSubmitSecretTvGuess = (playerId: string) => {
    if (isTimeExpired) return;
    const rawVal = tvDraftGuesses[playerId] ?? '';
    const normalized = rawVal.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (rawVal.trim() === '' || isNaN(parsed)) return;
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
    setDrumrolling(false);
    sounds.playSuccess();
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.5 }
    });
    onUpdateLimiteState((prev) =>
      evaluateLimiteRoundReveal({
        ...prev,
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
    // Launch dramatic 5-second countdown with beeps
    onUpdateLimiteState((prev) => ({
      ...prev,
      timerActive: false,
      revealCountdown: 5
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

  return (
    <div className="h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5">
      {/* Main Stage Container */}
      <div
        data-testid="limite-main-stage-container"
        className={`relative shadow-2xl flex-1 min-h-0 flex flex-col justify-between overflow-hidden transition-all duration-500 ${
          limite.phase === 'SCORING'
            ? 'border-2 border-amber-400/80 bg-gradient-to-b from-[#181105] via-[#090b14] to-[#040508] shadow-[0_0_40px_rgba(251,191,36,0.3)]'
            : 'border border-white/10 bg-white/[0.03]'
        }`}
      >
        {/* Arcade Marquee Sub-Header (py-1.5 px-4 shrink-0) */}
        <div
          className={`py-1.5 px-4 flex flex-wrap items-center justify-between gap-2 border-b shrink-0 transition-colors ${
            limite.phase === 'SCORING'
              ? 'border-amber-400/30 bg-[#120e06]/95'
              : 'border-white/10 bg-[#07080d]/90'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{limite.phase === 'SCORING' ? '🌟' : '🕹️'}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-anton text-lg md:text-xl tracking-wider uppercase leading-none ${
                  limite.phase === 'SCORING'
                    ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'text-orange-400'
                }`}
              >
                {limite.phase === 'SCORING'
                  ? 'PALCO DE REVELAÇÃO: JOGO DO LIMITE'
                  : 'FLIPERAMA: JOGO DO LIMITE'}
              </span>
              <span className="hidden lg:inline text-[10px] font-mono-code text-slate-300 uppercase">
                {limite.phase === 'SCORING'
                  ? '• REVELAÇÃO OFICIAL DOS PALPITES E PONTUAÇÃO FINAL'
                  : `• QUEM CHEGAR MAIS PERTO DO NÚMERO EXATO SEM PASSAR!${(limite.exactBonus ?? 2) > 1 ? ` (CRAVOU EXATO = ${limite.exactBonus ?? 2} PTS)` : ''}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Synchronized Automatic Countdown Timer Badge on TV */}
            <div
              data-testid="limite-tv-timer-badge"
              className={`px-2.5 py-0.5 border font-mono-code text-xs font-bold flex items-center gap-1.5 ${
                room.timerConfig === 0
                  ? 'border-cyan-500/40 bg-[#07080d] text-cyan-300'
                  : isTimeExpired && limite.phase === 'SECRET_GUESS'
                  ? 'border-rose-500 bg-rose-950/80 text-rose-300 animate-pulse'
                  : limite.timerSeconds <= 5 && limite.phase === 'SECRET_GUESS'
                  ? 'border-rose-500 bg-rose-950/80 text-rose-300 animate-pulse'
                  : 'border-cyan-400/60 bg-cyan-950/30 text-cyan-200'
              }`}
            >
              <Clock size={12} />
              {room.timerConfig === 0 ? (
                <span className="flex items-center gap-1">
                  <InfinityIcon size={13} />
                  <span>LIVRE</span>
                </span>
              ) : (
                <span>
                  {limite.timerSeconds > 0 ? `${limite.timerSeconds}s` : '0s (ESGOTADO)'}
                </span>
              )}
            </div>

            {/* Hybrid Play Mode Toggle: Mesa/Voz vs Digital */}
            <div className="flex items-center border border-white/10 bg-[#07080d] p-0.5 text-[10px] font-mono-code font-bold uppercase">
              <button
                type="button"
                data-testid="limite-mode-mesa-btn"
                onClick={() => handleTogglePlayMode('mesa')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  playMode === 'mesa'
                    ? 'bg-amber-400 text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗣️ Mesa / Voz
              </button>
              <button
                type="button"
                data-testid="limite-mode-digital-btn"
                onClick={() => handleTogglePlayMode('digital')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  playMode === 'digital'
                    ? 'bg-[#17B8B8] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Digital
              </button>
            </div>

            {room.customConfig?.limiteEnablePowerCards !== false && (
              <button
                type="button"
                data-testid="limite-open-power-cards-btn"
                onClick={() => {
                  sounds.playTick();
                  if (!selectedPowerPlayerId && room.players[0]) {
                    setSelectedPowerPlayerId(room.players[0].id);
                  }
                  setIsPowerModalOpen(true);
                }}
                className="px-2.5 py-1 border border-amber-400/60 bg-amber-950/60 hover:bg-amber-400 text-amber-200 hover:text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Zap size={12} />
                <span>⚡ Cartas de Poder</span>
              </button>
            )}

            <button
              type="button"
              data-testid="limite-reroll-question-btn"
              onClick={handleRerollLimiteQuestion}
              className="px-2.5 py-1 border border-[#17B8B8]/60 bg-[#17B8B8]/10 hover:bg-[#17B8B8] text-cyan-200 hover:text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>🔄 Outra Pergunta</span>
            </button>

            <span className="text-xs font-mono-code text-[#17B8B8] font-bold bg-[#07080d] border border-white/10 px-2.5 py-0.5">
              R{room.roundNumber}/{room.maxRounds}
            </span>
          </div>
        </div>

        {/* Dynamic 1-Line Action Guidance Banner ("O que eu faço agora?") */}
        <div className="py-1 px-4 bg-black/70 border-b border-white/10 flex items-center justify-between text-xs font-mono-code font-bold uppercase tracking-wider shrink-0">
          <div className="flex items-start sm:items-center gap-2 text-cyan-300 sm:truncate">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="sm:truncate">
              {limite.phase === 'SCORING'
                ? '🌟 REVELAÇÃO: CLIQUE NOS JOGADORES PARA AJUSTAR PONTOS (TOGGLE) E CONFIRME ABAIXO'
                : limite.phase === 'CALL_TIMEOUT'
                ? '📞 PODER DE LIGAÇÃO ATIVADO: 30 SEGUNDOS DE AJUDA EXTERNA!'
                : isTimeExpired
                ? '⏱️ TEMPO ESGOTADO! REVELANDO A RESPOSTA EM INSTANTES...'
                : '🤫 DIGITE SEU PALPITE SECRETO NO CELULAR • MAIOR PALPITE SEM ESTOURAR VENCE!'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono-code hidden sm:block shrink-0">
            {limite.phase === 'SCORING' ? 'ETAPA 3/3 · REVELAÇÃO' : 'ETAPA 1/3 · PALPITES'}
          </div>
        </div>

        {/* Central Monitor (flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col justify-between p-2 sm:p-2.5 md:p-3) */}
        <div className="relative bg-[#07080d]/90 p-2 sm:p-2.5 md:p-3 overflow-y-auto scrollbar-none arcade-screen-lines flex-1 min-h-0 flex flex-col justify-between gap-1 sm:gap-1.5">
          {/* Question Box - Compact in SCORING phase, prominent during guessing */}
          <div className="text-center space-y-0.5 shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.2 border font-mono-code text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                limite.phase === 'SCORING'
                  ? 'border-amber-400/40 bg-amber-950/30 text-amber-300'
                  : 'border-orange-400/40 bg-orange-950/30 text-orange-300'
              }`}
            >
              <span>{limite.phase === 'SCORING' ? '🎯 PERGUNTA DA RODADA' : 'PERGUNTA OFICIAL'}</span>
              {limite.roundData.category && (
                <span className="text-[#17B8B8]">· {limite.roundData.category}</span>
              )}
            </div>
            <h2
              data-testid="limite-question-text"
              className={`${
                limite.phase === 'SCORING'
                  ? 'text-xs sm:text-sm font-bold text-slate-300 line-clamp-4 sm:line-clamp-2 max-w-2xl py-0.5'
                  : 'text-base md:text-xl lg:text-2xl font-black text-[#F5F2EB]'
              } uppercase leading-snug tracking-normal text-center mx-auto transition-all`}
            >
              {sanitizeCleanGameText(limite.roundData.pergunta, 'limite')}
            </h2>

            {limite.phase !== 'SCORING' && (
              /* Prominent Unit Calibration Badge below the Question */
              <div className="pt-0.5 flex justify-center">
                <div
                  data-testid="limite-unit-badge"
                  className="inline-flex items-center gap-2 px-3 py-0.5 border border-amber-400/70 bg-amber-950/60 text-amber-200 font-anton text-xs tracking-wider uppercase"
                >
                  <span className="text-amber-400">📏</span>
                  <span>{formatLimiteExpectedUnitLabel(limite.roundData.unidade)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Central Target Display (Big '?' vs Suspense Countdown vs Giant Official Value) */}
          <div className="my-auto flex flex-col items-center justify-center shrink-0 py-0.5">
            {limite.phase === 'SCORING' ? (
              <div className="text-center space-y-1 max-w-3xl mx-auto my-auto py-0.5">
                <div className="inline-block px-2.5 py-0.2 border border-amber-400/70 bg-amber-400/15 text-[10px] font-mono-code text-amber-300 uppercase font-black tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                  ✨ VALOR REAL OFICIAL ✨
                </div>
                <div
                  data-testid="limite-exact-value-display"
                  className="font-anton text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-amber-300 leading-tight drop-shadow-[0_0_25px_rgba(251,191,36,0.6)] tracking-wider"
                >
                  {limite.roundData.valor_exato.toLocaleString('pt-BR')}
                </div>
                <div className="flex justify-center">
                  <div
                    data-testid="limite-unit-badge"
                    className="inline-flex items-center gap-1 px-2.5 py-0.2 border border-amber-400/60 bg-amber-950/70 text-amber-200 font-anton text-xs tracking-wider uppercase"
                  >
                    <span>📏 {formatLimiteExpectedUnitLabel(limite.roundData.unidade)}</span>
                  </div>
                </div>
                {limite.roundData.curiosidade_explicacao && (
                  <div
                    data-testid="limite-curiosity-card"
                    className="px-3 py-1 border border-amber-400/30 bg-[#090b14]/90 text-[11px] sm:text-xs text-slate-200 max-w-2xl mx-auto font-medium space-y-0 shadow-md"
                  >
                    <div className="text-[9px] font-mono-code font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1">
                      <span>💡 CURIOSIDADE OFICIAL // FATOR UAU</span>
                    </div>
                    <p className="leading-snug text-white font-semibold text-[11px] sm:text-xs line-clamp-2">
                      {limite.roundData.curiosidade_explicacao}
                    </p>
                  </div>
                )}
              </div>
            ) : limite.revealCountdown !== null &&
              limite.revealCountdown !== undefined &&
              limite.revealCountdown > 0 ? (
              <div
                data-testid="limite-reveal-countdown-overlay"
                className="text-center space-y-1.5 bg-[#0d0902]/95 border-2 border-amber-400 p-3 sm:p-4 max-w-sm mx-auto shadow-[0_0_25px_rgba(251,191,36,0.5)] my-auto"
              >
                <div className="font-anton text-xs text-amber-300 uppercase tracking-widest animate-pulse">
                  ⏳ PREPAREM OS CORAÇÕES! REVELANDO EM...
                </div>
                <div
                  data-testid="limite-reveal-countdown-number"
                  className="font-anton text-5xl sm:text-6xl md:text-7xl text-amber-400 animate-bounce leading-none drop-shadow-[0_0_24px_rgba(251,191,36,0.7)]"
                >
                  {limite.revealCountdown}
                </div>
                <div className="text-[10px] font-mono-code text-slate-300">
                  🔔 Bips sonoros da revelação ativos
                </div>
                <button
                  type="button"
                  data-testid="limite-reveal-now-btn"
                  onClick={handleImmediateReveal}
                  className="px-3 py-1 border border-amber-400 bg-amber-400 hover:bg-amber-300 text-black font-anton text-[11px] uppercase tracking-wider cursor-pointer shadow-md transition-transform active:scale-95"
                >
                  ⚡ Revelar Agora (Pular)
                </button>
              </div>
            ) : drumrolling ? (
              <div className="text-center space-y-1.5">
                <div className="font-anton text-4xl md:text-5xl text-amber-400 animate-spin">
                  ⏳
                </div>
                <div className="font-anton text-lg text-amber-300 tracking-wider uppercase animate-pulse">
                  APURANDO PALPITES NA MESA...
                </div>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <div className="font-anton text-4xl md:text-5xl text-orange-400/90 leading-none">
                  ?
                </div>
                <div className="text-[11px] font-mono-code text-slate-300 uppercase">
                  {playMode === 'mesa'
                    ? 'Modo Mesa/Voz: Os jogadores falam seus palpites ou digitam direto abaixo e você revela a resposta!'
                    : 'Aguardando envio das lousas pelos celulares...'}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Call Timeout Overlay */}
          {limite.phase === 'CALL_TIMEOUT' && (
            <div className="my-1 border border-amber-400 bg-amber-950/80 p-2 text-center space-y-0.5 animate-pulse shrink-0">
              <div className="flex items-center justify-center gap-2 text-amber-300 font-anton text-sm uppercase">
                <PhoneCall size={16} />
                <span>CARTA LIGAÇÃO ATIVADA! PESQUISA DE 30S LIBERADA</span>
              </div>
              <div className="font-anton text-2xl text-amber-200">
                00:{String(limite.callTimerRemaining).padStart(2, '0')}
              </div>
            </div>
          )}

          {/* Guesses Board (Auto-Fit Grid for 2 to 8+ Players) */}
          <div className="pt-1 sm:pt-1.5 border-t border-white/10 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`font-anton text-[11px] sm:text-xs tracking-wider uppercase ${
                    limite.phase === 'SCORING' ? 'text-amber-300' : 'text-orange-300'
                  }`}
                >
                  {limite.phase === 'SCORING'
                    ? `🏆 BANCADA DE PALPITES REVELADOS (${Object.keys(limite.guesses).length} PALPITES)`
                    : `BANCADA DE JOGADORES (${Object.keys(limite.guesses).length} / ${room.players.length} PALPITES)`}
                </span>
                {limite.phase === 'SCORING' && (
                  <span
                    data-testid="limite-multi-winner-hint"
                    className="text-[9px] font-mono-code text-[#17B8B8] font-bold"
                  >
                    💡 Mais próximo ganha +1 pt{(limite.exactBonus ?? 2) > 1 ? ` • Cravou exato ganha +${limite.exactBonus ?? 2} pts` : ''} • Clique novamente para desmarcar
                  </span>
                )}
              </div>
              {limite.phase !== 'SCORING' && (
                <button
                  type="button"
                  data-testid="limite-reveal-answer-btn"
                  onClick={handleTriggerReveal}
                  className="px-3 py-1 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider shadow-neon-cyan transition-colors cursor-pointer"
                >
                  {limite.revealCountdown ? '⚡ REVELAR AGORA (PULAR CONTAGEM)' : '🎯 REVELAR RESPOSTA EXATA AGORA'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-1.5">
              {room.players.map((p) => {
                const guess = limite.guesses[p.id];
                const hasGuessed = guess !== undefined;
                const isExactGuess = isLimiteGuessExact(guess, limite.roundData.valor_exato);
                const isWinner =
                  Boolean(limite.winners?.includes(p.id)) ||
                  (limite.pointsAwarded?.[p.id] || 0) > 0;
                const isBusted = limite.bustedPlayers?.includes(p.id);
                const cardPlayed = limite.powerCardsPlayed?.[p.id];
                const liveDelta =
                  limite.phase === 'SCORING' ? limite.pointsAwarded?.[p.id] || 0 : 0;
                const totalPts = Math.max(0, (p.score || 0) + liveDelta);
                const pointValueIfAwarded = computeLimiteWinnerPoints(limite, p.id);
                const exactPointValueIfAwarded = computeLimiteWinnerPoints(limite, p.id, true);
                const isScoredAsExact = isWinner && liveDelta >= exactPointValueIfAwarded;

                return (
                  <div
                    key={p.id}
                    data-testid={`limite-player-card-${p.id}`}
                    aria-pressed={limite.phase === 'SCORING' ? isWinner : undefined}
                    onClick={() => {
                      if (limite.phase === 'SCORING') {
                        handleAwardDirectMesaVictory(p.id);
                      }
                    }}
                    className={`p-1 sm:p-1.5 border transition-all relative flex flex-col justify-between gap-0.5 sm:gap-1 ${
                      limite.phase === 'SCORING' ? 'cursor-pointer' : ''
                    } ${
                      limite.phase === 'SCORING'
                        ? isWinner
                          ? 'ring-2 ring-amber-400 bg-amber-950/30 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                          : isBusted
                          ? 'border-[#E6194B]/60 bg-[#E6194B]/10 opacity-85'
                          : hasGuessed
                          ? 'border-cyan-500/40 bg-cyan-950/20'
                          : 'border-white/10 bg-white/[0.02] opacity-60'
                        : isWinner
                        ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8]'
                        : isBusted
                        ? 'border-[#E6194B]/60 bg-[#E6194B]/10 opacity-90 hover:border-[#17B8B8]/60'
                        : hasGuessed
                        ? 'border-[#17B8B8]/50 bg-white/[0.03] hover:border-[#17B8B8]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/30'
                    }`}
                  >
                    {cardPlayed && (
                      <div className="px-1 py-0.2 text-[8px] font-mono-code font-bold uppercase bg-amber-400 text-black text-center">
                        {cardPlayed === 'ligacao' && '📞 LIGAÇÃO'}
                        {cardPlayed === 'troca' && '🔄 TROCA'}
                        {cardPlayed === 'x2' && '✖️2 DOBRA'}
                        {cardPlayed === 'menos1' && '➖1 MENOS UM'}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs sm:text-sm shrink-0">{p.avatar}</span>
                        <span className="font-bold text-[11px] sm:text-xs text-white truncate">
                          {p.name}
                        </span>
                      </div>
                      <span
                        data-testid={`limite-player-score-${p.id}`}
                        className="text-[9px] sm:text-[10px] font-mono-code text-amber-300 font-bold shrink-0"
                      >
                        {totalPts}pt
                        {liveDelta > 0 && (
                          <span className="text-[#17B8B8] ml-0.5">(+{liveDelta})</span>
                        )}
                      </span>
                    </div>

                    {limite.phase === 'SCORING' ? (
                      <div className="text-center space-y-0.5">
                        <div className="font-anton text-sm sm:text-base text-white leading-tight">
                          {hasGuessed ? guess.toLocaleString('pt-BR') : 'Na voz'}
                        </div>
                        {hasGuessed && (
                          <div className="text-[9px] font-mono-code font-bold">
                            {guess === limite.roundData.valor_exato ? (
                              <span className="text-amber-300">🎯 EXATO (DIF: 0)</span>
                            ) : guess < limite.roundData.valor_exato ? (
                              <span className="text-cyan-300">Faltou: -{(limite.roundData.valor_exato - guess).toLocaleString('pt-BR')}</span>
                            ) : (
                              <span className="text-rose-400">Passou: +{(guess - limite.roundData.valor_exato).toLocaleString('pt-BR')}</span>
                            )}
                          </div>
                        )}
                        {isExactGuess && (
                          <div
                            data-testid={`limite-exact-hit-badge-${p.id}`}
                            className="text-[8px] sm:text-[9px] font-mono-code font-black text-amber-300 uppercase leading-tight"
                          >
                            🎯 CRAVOU EXATO! (+{exactPointValueIfAwarded} PTS)
                          </div>
                        )}
                        {isWinner && !isExactGuess && (
                          <div className="text-[8px] sm:text-[9px] font-mono-code font-black text-emerald-400 uppercase leading-tight">
                            🏆 VENCEU (+{pointValueIfAwarded} PT)
                          </div>
                        )}
                        {isBusted && !isWinner && (
                          <div className="text-[8px] sm:text-[9px] font-mono-code font-black text-[#E6194B] uppercase leading-tight">
                            💥 PASSOU DO LIMITE (ESTOUROU)
                          </div>
                        )}
                        <div className="flex items-center gap-1 pt-0.5">
                          <button
                            type="button"
                            data-testid={`limite-award-point-${p.id}`}
                            aria-pressed={isWinner}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAwardDirectMesaVictory(p.id);
                            }}
                            className={`flex-1 py-0.5 px-1 border font-anton text-[9px] sm:text-[10px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              isWinner
                                ? 'border-[#17B8B8] bg-[#17B8B8] hover:bg-[#E6194B] hover:border-[#E6194B] hover:text-white text-black font-black'
                                : 'border-white/20 bg-black/50 hover:border-[#17B8B8] text-slate-200'
                            }`}
                          >
                            {isWinner ? (
                              <>
                                <Trophy size={9} />
                                <span>
                                  +{limite.pointsAwarded[p.id] || pointValueIfAwarded}{' '}
                                  {(limite.pointsAwarded[p.id] || pointValueIfAwarded) > 1
                                    ? 'PTS ✓'
                                    : 'PT ✓'}
                                </span>
                              </>
                            ) : (
                              <span>
                                +{pointValueIfAwarded}{' '}
                                {pointValueIfAwarded > 1 ? 'Pts' : 'Pt'}
                              </span>
                            )}
                          </button>

                          {!isExactGuess && (
                            <button
                              type="button"
                              data-testid={`limite-award-exact-${p.id}`}
                              aria-pressed={isScoredAsExact}
                              title={`Cravou a resposta exatamente (+${Math.max(1, limite.exactBonus ?? 2)} pontos)`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAwardDirectMesaVictory(p.id, true);
                              }}
                              className={`py-0.5 px-1 border font-anton text-[9px] sm:text-[10px] uppercase transition-all cursor-pointer shrink-0 ${
                                isScoredAsExact
                                  ? 'border-amber-400 bg-amber-400 text-black font-black'
                                  : 'border-amber-400/50 bg-amber-950/50 hover:bg-amber-400 hover:text-black text-amber-200'
                              }`}
                            >
                              🎯 +{exactPointValueIfAwarded}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : hasGuessed && !editingSecretPlayers[p.id] ? (
                      <div className="space-y-1 text-center">
                        <div
                          data-testid={`limite-secret-locked-${p.id}`}
                          className="py-1 px-1.5 bg-emerald-950/40 border border-emerald-400/50 text-emerald-300 font-mono-code text-[10px] font-bold uppercase flex items-center justify-center gap-1"
                        >
                          <Lock size={10} />
                          <span>PALPITE SECRETO</span>
                        </div>
                        {playMode === 'mesa' && !isTimeExpired && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSecretPlayers((prev) => ({ ...prev, [p.id]: true }));
                              setTvDraftGuesses((prev) => ({ ...prev, [p.id]: '' }));
                            }}
                            className="text-[9px] font-mono-code text-slate-400 hover:text-cyan-300 underline uppercase cursor-pointer"
                          >
                            ✏️ Alterar
                          </button>
                        )}
                        {playMode === 'mesa' && isTimeExpired && (
                          <div
                            data-testid={`limite-tv-expired-badge-${p.id}`}
                            className="text-[9px] font-mono-code text-rose-400 font-bold uppercase"
                          >
                            🔒 Bloqueado
                          </div>
                        )}
                      </div>
                    ) : playMode === 'mesa' ? (
                      isTimeExpired ? (
                        <div
                          data-testid={`limite-tv-expired-badge-${p.id}`}
                          className="font-mono-code text-[10px] text-rose-400 text-center py-1 font-bold uppercase"
                        >
                          ⏰ Tempo esgotado
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="password"
                            inputMode="numeric"
                            data-testid={`limite-tv-guess-input-${p.id}`}
                            value={tvDraftGuesses[p.id] ?? ''}
                            onChange={(e) =>
                              setTvDraftGuesses((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSubmitSecretTvGuess(p.id);
                              }
                            }}
                            placeholder="Secreto..."
                            className="w-full min-w-0 bg-[#07080d] border border-white/15 px-1.5 py-1 text-white font-anton text-xs text-center focus:outline-none focus:border-[#17B8B8]"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubmitSecretTvGuess(p.id);
                            }}
                            className="px-2 py-1 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-[10px] uppercase shrink-0 cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="font-mono-code text-[10px] text-slate-400 text-center py-1">
                        {isTimeExpired ? '⏰ Tempo esgotado' : '⏳ No celular...'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Arcade Console Bottom Controls / Explicit Commit CTA (shrink-0 h-10 sm:h-11 px-3) */}
        <div className="shrink-0 h-10 sm:h-11 px-3 flex items-center justify-between bg-slate-950 border-t border-slate-800 z-20 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full bg-[#E6194B] border border-white/40 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-mono-code text-slate-400 truncate">
              CONTROLE ARCADE RODA DE BOBO • TEMA: {room.theme}
            </span>
          </div>

          {limite.phase === 'SCORING' && (
            <button
              type="button"
              data-testid="limite-next-round-btn"
              onClick={onNextRound}
              className="px-4 py-1.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs md:text-sm uppercase tracking-wider shadow-neon-cyan transition-all flex items-center gap-1.5 cursor-pointer shrink-0 font-bold hover:scale-[1.02]"
            >
              <span>Confirmar Pontos e Avançar ➔</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Standardized z-[999] Power Cards Modal */}
      {isPowerModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="limite-power-cards-modal-backdrop"
            onClick={() => setIsPowerModalOpen(false)}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full max-h-[85dvh] overflow-y-auto bg-[#07080d] border border-white/15 p-6 relative shadow-2xl text-[#F5F2EB] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-amber-300 font-anton text-xl uppercase tracking-wider">
                  <Zap size={20} />
                  <span>PODER ESPECIAL SORTEADO (1 POR JOGADOR)</span>
                </div>
                <button
                  type="button"
                  data-testid="close-limite-power-modal-btn"
                  aria-label="Fechar modal de Cartas de Poder"
                  onClick={() => setIsPowerModalOpen(false)}
                  className="min-w-[44px] min-h-[44px] px-3 py-1 border border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X size={16} />
                  <span>FECHAR</span>
                </button>
              </div>

              <div className="p-2.5 bg-slate-900/80 border border-slate-700 text-[11px] font-mono-code text-slate-300 flex items-center justify-between gap-2">
                <span>
                  🎲 Cada jogador recebe 1 poder sorteado para usar 1 única vez durante todo o jogo.
                </span>
                <button
                  type="button"
                  onClick={handleRedrawPowerCardsOnTV}
                  className="px-2 py-1 border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-400 hover:text-black text-cyan-300 font-bold uppercase text-[10px] shrink-0 cursor-pointer"
                >
                  🔄 Ressortear
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono-code text-[#17B8B8] font-bold uppercase">
                  1. Escolha o jogador:
                </label>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
                  {room.players.map((p) => {
                    const pCard =
                      limite.assignedPowerCards?.[p.id] || p.assignedPowerCard || 'x2';
                    const pUsed = Boolean(
                      limite.usedPowerCardsByPlayer?.[p.id] || p.powerCardUsed
                    );
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPowerPlayerId(p.id)}
                        className={`p-2 border text-left font-anton text-xs uppercase flex items-center justify-between gap-2 cursor-pointer ${
                          selectedPowerPlayerId === p.id
                            ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8] text-cyan-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{p.avatar}</span>
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono-code px-1 ${
                            pUsed ? 'text-slate-500 line-through' : 'text-amber-300'
                          }`}
                        >
                          {LIMITE_POWER_CARD_META[pCard].icon}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedModalPlayer && (
                <div className="space-y-2">
                  <label className="block text-xs font-mono-code text-amber-300 font-bold uppercase">
                    2. Poder sorteado de {selectedModalPlayer.name}:
                  </label>
                  <div
                    className={`p-4 border-2 ${selectedPlayerCardMeta.borderClass} ${selectedPlayerCardMeta.bgClass} space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-anton text-lg uppercase ${selectedPlayerCardMeta.textClass}`}>
                        {selectedPlayerCardMeta.icon} {selectedPlayerCardMeta.title}
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                          isSelectedPlayerCardUsed
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-emerald-400 text-black'
                        }`}
                      >
                        {isSelectedPlayerCardUsed ? 'JÁ UTILIZADO (0/1)' : 'DISPONÍVEL (1/1)'}
                      </span>
                    </div>
                    <p className="text-xs font-mono-code text-slate-200">
                      {selectedPlayerCardMeta.description}
                    </p>
                    <button
                      type="button"
                      disabled={isSelectedPlayerCardUsed}
                      onClick={() =>
                        handleActivatePowerCardOnTV(
                          selectedModalPlayer.id,
                          selectedPlayerAssignedCard
                        )
                      }
                      className="w-full py-2.5 border border-amber-300 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
                    >
                      {isSelectedPlayerCardUsed
                        ? '✓ PODER JÁ UTILIZADO NESTA PARTIDA'
                        : `⚡ ATIVAR ${selectedPlayerCardMeta.title.toUpperCase()} AGORA`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

