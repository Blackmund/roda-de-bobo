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

import { LIMITE_POWER_CARD_META, drawLimitePowerCardsForPlayers, computeLimiteWinnerPoints, evaluateLimiteRoundReveal, toggleLimiteWinnerPoint } from '../../utils/limiteRound';
export * from '../../utils/limiteRound';

interface ScreenLimiteProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateLimiteState: (updater: (prev: LimiteGameState) => LimiteGameState) => void;
  onNextRound: () => void;
  onRerollQuestion?: () => void;
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
  const [isRerolling, setIsRerolling] = useState(false);
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
    if (isRerolling) return;
    sounds.playPowerup();
    setTvDraftGuesses({});
    setEditingSecretPlayers({});
    if (onRerollQuestion) {
      onRerollQuestion();
      return;
    }
    setIsRerolling(true);
    const excluded = [...(room.usedRoundSignatures || []), limite.roundData.pergunta];
    try {
      let data: LimiteGameState['roundData'] | undefined;
      try {
        const generated = await generateRoundContent('limite', room.theme, room.customConfig, excluded);
        data = generated.data as LimiteGameState['roundData'];
      } catch {
        // Se a geração falhar, tente o banco local.
      }
      if (!data?.pergunta) {
        const fallback = generateThemeStrictFallbackRound('limite', room.theme, room.theme, room.customConfig, excluded);
        data = fallback.data as LimiteGameState['roundData'];
      }
      const roundData = { ...data, pergunta: sanitizeCleanGameText(data.pergunta, 'limite') };
      onUpdateLimiteState((prev) => {
        if (prev.phase !== limite.phase || prev.revealCountdown !== limite.revealCountdown) return prev;
        return {
          ...prev,
          phase: 'SECRET_GUESS',
          roundData,
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
    } catch {
      sounds.playBuzzer();
    } finally {
      setIsRerolling(false);
    }
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

  return <LimitePlayingView limite={limite} room={room} isTimeExpired={isTimeExpired} handleTogglePlayMode={handleTogglePlayMode} playMode={playMode} selectedPowerPlayerId={selectedPowerPlayerId} setSelectedPowerPlayerId={setSelectedPowerPlayerId} setIsPowerModalOpen={setIsPowerModalOpen} handleRerollLimiteQuestion={handleRerollLimiteQuestion} isRerolling={isRerolling} handleImmediateReveal={handleImmediateReveal} drumrolling={drumrolling} handleTriggerReveal={handleTriggerReveal} handleAwardDirectMesaVictory={handleAwardDirectMesaVictory} editingSecretPlayers={editingSecretPlayers} setEditingSecretPlayers={setEditingSecretPlayers} setTvDraftGuesses={setTvDraftGuesses} tvDraftGuesses={tvDraftGuesses} handleSubmitSecretTvGuess={handleSubmitSecretTvGuess} onNextRound={onNextRound} isPowerModalOpen={isPowerModalOpen} handleRedrawPowerCardsOnTV={handleRedrawPowerCardsOnTV} selectedModalPlayer={selectedModalPlayer} selectedPlayerCardMeta={selectedPlayerCardMeta} isSelectedPlayerCardUsed={isSelectedPlayerCardUsed} handleActivatePowerCardOnTV={handleActivatePowerCardOnTV} selectedPlayerAssignedCard={selectedPlayerAssignedCard} />;
};

