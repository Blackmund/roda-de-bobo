import { themeBadge } from '../../utils/themeUtils';
import React, { useEffect, useState } from 'react';
import {
  GameRoom,
  PerguntasEVerdadesGameState,
  PVQuestionLogEntry,
  PVDeckStyle
} from '../../types/game';
import { PlayingCardView } from '../PlayingCardView';
import {
  OFFICIAL_11_QUESTIONS,
  SUIT_META,
  SUIT_ORDER,
  PVSuit,
  PVCard,
  PVCardValue,
  createFull52Deck,
  formatCardValueLabel,
  formatOfficialQuestionText,
  computeOfficialQuestionAnswer,
  resolveTokenAuction,
  applyRoundEndTokenRecharge,
  verifyTruthDeclaration,
  dealValidRandomHand,
  validateCardPlacementInSlot,
  validateCardMoveOrSwapInSlots,
  validateSuitAscendingOrder,
  checkMatchSeriesWin
} from '../../utils/perguntasEVerdadesEngine';
import { sounds } from '../../utils/soundEffects';
import {
  Clock,
  Pause,
  Play,
  Trophy,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  Coins,
  Shuffle,
  Lock,
  Send,
  History,
  AlertCircle,
  ArrowRight,
  Crown,
  Sparkles,
  ArrowLeft,
  Infinity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PVPlayingView } from './pv/PVPlayingView';
import { PVIntroView } from './pv/PVIntroView';
import { PVDeckSetupView } from './pv/PVDeckSetupView';

interface ScreenPerguntasEVerdadesProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdatePVState: (
    updater: (prev: PerguntasEVerdadesGameState) => PerguntasEVerdadesGameState
  ) => void;
  onDeclareMatchWinner: (winnerPlayerId: string, reason: string) => void;
}

import { ALL_CARD_VALUES, FULL_52_DECK } from './pv/pvConstants';
import { PlayerMark } from '../rdb/PlayerMark';

export function getSavedTruthSlotsForTarget(
  pv: PerguntasEVerdadesGameState,
  targetPlayerId: string
): Array<PVCard | null> {
  const existing = pv.savedTruthSlotsByTarget?.[targetPlayerId];
  if (Array.isArray(existing) && existing.length === 8) {
    return existing.map((c) => (c ? ({ ...c } as PVCard) : null));
  }
  return new Array(8).fill(null);
}

export function placeCardInTruthRevelationSlot(
  currentSlots: Array<PVCard | null>,
  targetIndex: number,
  card: PVCard,
  sourceSlotIndex?: number
): Array<PVCard | null> {
  const working = Array.from({ length: 8 }, (_, idx) => currentSlots[idx] || null);
  if (targetIndex < 0 || targetIndex >= 8) return working;

  if (typeof sourceSlotIndex === 'number' && sourceSlotIndex >= 0 && sourceSlotIndex < 8) {
    const displaced = working[targetIndex];
    working[targetIndex] = card;
    if (sourceSlotIndex !== targetIndex) {
      working[sourceSlotIndex] = displaced;
    }
    return working;
  }

  const existingIdx = working.findIndex((c) => c?.id === card.id);
  if (existingIdx !== -1 && existingIdx !== targetIndex) {
    working[existingIdx] = null;
  }
  working[targetIndex] = card;
  return working;
}

export function evaluateTruthPalpiteAttempt(
  revelationSlots: Array<PVCard | null>,
  targetHand: PVCard[],
  askerName: string,
  targetName: string
): {
  status: 'INCOMPLETE' | 'CORRECT' | 'INCORRECT' | 'MANUAL_NEEDED';
  allCorrect: boolean;
  message: string;
} {
  const filledCards = revelationSlots.filter((c): c is PVCard => Boolean(c));
  if (filledCards.length < 8) {
    return {
      status: 'INCOMPLETE',
      allCorrect: false,
      message: `⚠️ Posicione todas as 8 cartas antes de palpitar! (${filledCards.length}/8 posicionadas)`
    };
  }

  if (!targetHand || targetHand.length !== 8) {
    return {
      status: 'MANUAL_NEEDED',
      allCorrect: false,
      message: ''
    };
  }

  const guessedValues = revelationSlots.map((c) => c?.value ?? 0);
  const verification = verifyTruthDeclaration(guessedValues, targetHand);
  if (verification.allCorrect) {
    return {
      status: 'CORRECT',
      allCorrect: true,
      message: `${askerName} declarou a Verdade e cravou todas as 8 cartas de ${targetName}!`
    };
  }

  // Never reveal how many positions matched or which position has the error!
  return {
    status: 'INCORRECT',
    allCorrect: false,
    message: `❌ PALPITE INCORRETO DE ${askerName.toUpperCase()}! A sequência não está correta — o jogo continua!`
  };
}

export const ScreenPerguntasEVerdades: React.FC<ScreenPerguntasEVerdadesProps> = ({
  room,
  isTvMode = true,
  onUpdatePVState,
  onDeclareMatchWinner
}) => {
  const pv = room.perguntasEVerdades;
  const [actionMode, setActionMode] = useState<'QUESTION' | 'TRUTH'>('QUESTION');
  const [showTruthModal, setShowTruthModal] = useState(false);
  const [showManualWinnerModal, setShowManualWinnerModal] = useState(false);
  const [oralAnswerInput, setOralAnswerInput] = useState('');
  const [revealedTokensMap, setRevealedTokensMap] = useState<Record<string, boolean>>({});
  const [lastAnsweredBanner, setLastAnsweredBanner] = useState<{
    question: string;
    answer: string;
    asker: string;
    target?: string;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBenchOpen, setIsBenchOpen] = useState(false);
  const [deductionNotes, setDeductionNotes] = useState<string[]>(new Array(8).fill(''));

  // Sequential Deck Setup local state
  const [setupSlots, setSetupSlots] = useState<Array<PVCard | null>>(new Array(8).fill(null));
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);
  const [draggedCard, setDraggedCard] = useState<{
    card: PVCard;
    fromSlotIndex?: number;
  } | null>(null);
  const [setupRuleError, setSetupRuleError] = useState<string | null>(null);
  const [conflictingSlotIdx, setConflictingSlotIdx] = useState<number | null>(null);

  // Revelation / Palpite Mode local selection & drag state (positions themselves persist in pv.savedTruthSlotsByTarget)
  const [truthSelectedSlotIdx, setTruthSelectedSlotIdx] = useState<number>(0);
  const [truthDraggedCard, setTruthDraggedCard] = useState<{
    card: PVCard;
    fromSlotIndex?: number;
  } | null>(null);
  const [truthFailedThisTurn, setTruthFailedThisTurn] = useState(false);

  const maxPlayers = Math.min(6, Math.max(2, room.customConfig?.pvMaxPlayers || 6));
  const activePlayers = room.players.slice(0, maxPlayers);

  const setupPlayerIndex = pv?.setupPlayerIndex ?? 0;
  const currentSetupPlayer = activePlayers[setupPlayerIndex] || activePlayers[0];

  // Reset local 8-slot builder whenever setup player or match round changes
  useEffect(() => {
    if (!pv || pv.phase !== 'DECK_SETUP' || !currentSetupPlayer) return;
    const existing = pv.playerHands?.[currentSetupPlayer.id] || [];
    if (existing.length === 8) {
      setSetupSlots(existing);
      setSelectedSlotIdx(0);
    } else {
      setSetupSlots(new Array(8).fill(null));
      setSelectedSlotIdx(0);
    }
    setSetupRuleError(null);
    setConflictingSlotIdx(null);
  }, [pv?.phase, setupPlayerIndex, currentSetupPlayer?.id, pv?.matchRoundNumber]);

  // Countdown timer effect (strictly guarded against Free Mode / 0 timerConfig)
  useEffect(() => {
    if (!pv || !pv.timerActive || pv.timerSeconds <= 0 || pv.phase === 'DECK_SETUP') return;
    if (
      (pv.phase === 'TOKEN_AUCTION' && pv.tokenTimerConfig === 0) ||
      (pv.phase !== 'TOKEN_AUCTION' && pv.turnTimerConfig === 0)
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      onUpdatePVState((prev) => {
        if (!prev.timerActive || prev.timerSeconds <= 0) return prev;
        const nextSec = prev.timerSeconds - 1;
        if (nextSec <= 5 && nextSec > 0) {
          sounds.playTick();
        } else if (nextSec === 0) {
          sounds.playBuzzer();
        }
        return {
          ...prev,
          timerSeconds: Math.max(0, nextSec),
          timerActive: nextSec > 0
        };
      });
    }, 1000);

    // `pv.timerSeconds` fica fora das dependências de propósito: o updater lê o valor atual via `prev`,
    // e recriar o intervalo a cada tick atrasava/congelava o cronômetro quando outro update de estado ocorria.
    return () => clearInterval(interval);
  }, [pv?.timerActive, pv?.phase, pv?.tokenTimerConfig, pv?.turnTimerConfig]);

  if (!pv) return null;

  const totalMatchRounds = pv.totalMatchRounds || room.maxRounds || 1;
  const matchRoundNumber = pv.matchRoundNumber || 1;
  const requiredWinsToWinMatch = Math.floor(Math.max(1, totalMatchRounds) / 2) + 1;
  const roundWinsByPlayer = pv.roundWinsByPlayer || {};

  const activeTurnPlayer =
    activePlayers.find((p) => p.id === pv.activeTurnPlayerId) || activePlayers[0];
  const targetOpponent =
    activePlayers.find((p) => p.id === pv.targetOpponentId) ||
    activePlayers.find((p) => p.id !== activeTurnPlayer?.id) ||
    activePlayers[0];

  const toggleTokenVisibility = (playerId: string) => {
    sounds.playTick();
    setRevealedTokensMap((prev) => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  const formatTimer = (sec: number) => {
    if (sec <= 0 && pv.turnTimerConfig === 0 && pv.phase !== 'TOKEN_AUCTION') {
      return (
        <span className="inline-flex items-center gap-1">
          <Infinity className="w-4 h-4 stroke-[2.25] shrink-0 aspect-square text-cyan-400" />
          <span>LIVRE</span>
        </span>
      );
    }
    if (sec <= 0 && pv.tokenTimerConfig === 0 && pv.phase === 'TOKEN_AUCTION') {
      return (
        <span className="inline-flex items-center gap-1">
          <Infinity className="w-4 h-4 stroke-[2.25] shrink-0 aspect-square text-cyan-400" />
          <span>LIVRE</span>
        </span>
      );
    }
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  // =========================================================================
  // DECK SETUP HANDLERS (Cada jogador monta em seu próprio baralho de 52 cartas)
  // =========================================================================
  const cardsUsedByOtherPlayers = new Set<string>();

  const cardsInCurrentSlots = new Set<string>(
    setupSlots.filter((c): c is PVCard => Boolean(c)).map((c) => c.id)
  );

  const attemptPlaceCardInSlot = (
    card: PVCard,
    targetIndex: number,
    sourceSlotIndex?: number
  ) => {
    const validation = validateCardMoveOrSwapInSlots(
      setupSlots,
      targetIndex,
      card,
      sourceSlotIndex
    );

    if (!validation.valid) {
      sounds.playBuzzer();
      setSetupRuleError(
        validation.errorMessage ||
          'Cartas do mesmo naipe devem estar em ordem crescente da esquerda para a direita!'
      );
      setConflictingSlotIdx(validation.conflictingSlotIndex ?? targetIndex);
      return;
    }

    const workingSlots = Array.from({ length: 8 }, (_, idx) => setupSlots[idx] || null);
    const displaced = workingSlots[targetIndex];
    const hasSourceSlot =
      typeof sourceSlotIndex === 'number' && sourceSlotIndex >= 0 && sourceSlotIndex < 8;

    if (hasSourceSlot) {
      if (sourceSlotIndex === targetIndex) return;
      workingSlots[sourceSlotIndex] = displaced;
    } else {
      const existingIdx = workingSlots.findIndex((c) => c?.id === card.id);
      if (existingIdx !== -1) {
        workingSlots[existingIdx] = null;
      }
    }

    sounds.playFlip();
    workingSlots[targetIndex] = card;
    setSetupSlots(workingSlots);
    setSetupRuleError(null);
    setConflictingSlotIdx(null);

    const nextEmptyAfter = workingSlots.findIndex((c, idx) => idx > targetIndex && c === null);
    if (nextEmptyAfter !== -1) {
      setSelectedSlotIdx(nextEmptyAfter);
    } else {
      const firstEmpty = workingSlots.findIndex((c) => c === null);
      if (firstEmpty !== -1) {
        setSelectedSlotIdx(firstEmpty);
      }
    }
  };

  const handleRemoveCardFromSlot = (slotIdx: number) => {
    sounds.playTick();
    const updated = [...setupSlots];
    updated[slotIdx] = null;
    setSetupSlots(updated);
    setSelectedSlotIdx(slotIdx);
    setSetupRuleError(null);
    setConflictingSlotIdx(null);
  };

  const handleFillRandomValidHandForCurrentPlayer = () => {
    sounds.playPowerup();
    const randomHand = dealValidRandomHand();
    setSetupSlots(randomHand);
    setSetupRuleError(null);
    setConflictingSlotIdx(null);
  };

  const handleConfirmCurrentPlayerHand = () => {
    if (!currentSetupPlayer) return;
    const filledCards = setupSlots.filter((c): c is PVCard => Boolean(c));
    if (filledCards.length !== 8) {
      sounds.playBuzzer();
      setSetupRuleError('Escolha todas as 8 cartas antes de confirmar sua mão!');
      return;
    }

    const check = validateSuitAscendingOrder(filledCards);
    if (!check.valid) {
      sounds.playBuzzer();
      setSetupRuleError(check.errorMessage || 'As cartas do mesmo naipe precisam estar em ordem crescente!');
      return;
    }

    sounds.playSuccess();
    const isLastPlayer = setupPlayerIndex >= activePlayers.length - 1;

    onUpdatePVState((prev) => {
      const nextHands = {
        ...prev.playerHands,
        [currentSetupPlayer.id]: filledCards
      };
      const nextReady = {
        ...prev.handReady,
        [currentSetupPlayer.id]: true
      };
      const nextRevealed = {
        ...prev.revealedCards,
        [currentSetupPlayer.id]: new Array(8).fill(false)
      };

      if (isLastPlayer) {
        return {
          ...prev,
          playerHands: nextHands,
          handReady: nextReady,
          revealedCards: nextRevealed,
          setupPlayerIndex: 0,
          bettingPlayerIndex: 0,
          phase: 'TOKEN_AUCTION',
          timerSeconds: prev.tokenTimerConfig,
          timerActive: prev.tokenTimerConfig > 0
        };
      }

      return {
        ...prev,
        playerHands: nextHands,
        handReady: nextReady,
        revealedCards: nextRevealed,
        setupPlayerIndex: setupPlayerIndex + 1
      };
    });
  };

  const handleAutoDealAllHands = () => {
    sounds.playPowerup();
    onUpdatePVState((prev) => {
      const hands = { ...prev.playerHands };
      const ready = { ...prev.handReady };
      const revealed = { ...prev.revealedCards };
      activePlayers.forEach((p) => {
        const dealt = dealValidRandomHand();
        hands[p.id] = dealt;
        ready[p.id] = true;
        revealed[p.id] = new Array(8).fill(false);
      });

      return {
        ...prev,
        playerHands: hands,
        handReady: ready,
        revealedCards: revealed,
        setupPlayerIndex: 0,
        bettingPlayerIndex: 0,
        phase: 'TOKEN_AUCTION',
        timerSeconds: prev.tokenTimerConfig,
        timerActive: prev.tokenTimerConfig > 0
      };
    });
  };

  // =========================================================================
  // GAMEPLAY HANDLERS
  // =========================================================================
  const handleSelectQuestion = (questionNumber: number) => {
    sounds.playFlip();
    onUpdatePVState((prev) => ({
      ...prev,
      selectedQuestionNumber: questionNumber,
      targetOpponentId:
        prev.targetOpponentId && prev.targetOpponentId !== prev.activeTurnPlayerId
          ? prev.targetOpponentId
          : activePlayers.find((p) => p.id !== prev.activeTurnPlayerId)?.id ||
            activePlayers[0]?.id ||
            null
    }));
  };

  const handleTogglePosForQ1 = (pos1Based: number) => {
    sounds.playTick();
    onUpdatePVState((prev) => {
      const current = [...(prev.selectedPositionsQ1 || [1, 3, 6])];
      let updated: number[];
      if (current.includes(pos1Based)) {
        if (current.length <= 1) return prev;
        updated = current.filter((p) => p !== pos1Based);
      } else {
        if (current.length >= 3) {
          updated = [...current.slice(1), pos1Based];
        } else {
          updated = [...current, pos1Based];
        }
      }
      updated.sort((a, b) => a - b);
      const padded: [number, number, number] = [
        updated[0] || 1,
        updated[1] || 2,
        updated[2] || 3
      ];
      return {
        ...prev,
        selectedPositionsQ1: padded
      };
    });
  };

  const handleSelectValueQ7 = (val: PVCardValue) => {
    sounds.playTick();
    onUpdatePVState((prev) => ({
      ...prev,
      selectedValueQ7: val
    }));
  };

  const handleSelectSuitQ8 = (suit: PVSuit) => {
    sounds.playTick();
    onUpdatePVState((prev) => ({
      ...prev,
      selectedSuitQ8: suit
    }));
  };

  const handleRecordQuestionInLog = () => {
    if (!pv.selectedQuestionNumber || !activeTurnPlayer || !targetOpponent) return;
    sounds.playSuccess();

    const formattedText = formatOfficialQuestionText(pv.selectedQuestionNumber, {
      positions1Based: pv.selectedPositionsQ1,
      targetValue: pv.selectedValueQ7,
      targetSuit: pv.selectedSuitQ8
    });

    const targetHand = pv.playerHands[targetOpponent.id] || [];
    let computedSummary = oralAnswerInput.trim();
    if (!computedSummary && targetHand.length === 8) {
      const autoAns = computeOfficialQuestionAnswer(pv.selectedQuestionNumber, targetHand, {
        positions1Based: pv.selectedPositionsQ1,
        targetValue: pv.selectedValueQ7,
        targetSuit: pv.selectedSuitQ8
      });
      computedSummary = autoAns.summaryText;
    }

    const finalAnswer = computedSummary || 'Respondido verbalmente na mesa';

    const entry: PVQuestionLogEntry = {
      id: `pv-q-${Date.now()}`,
      roundNumber: pv.auctionRound,
      askerPlayerId: activeTurnPlayer.id,
      askerName: activeTurnPlayer.name,
      targetPlayerId: targetOpponent.id,
      targetName: targetOpponent.name,
      questionNumber: pv.selectedQuestionNumber,
      formattedQuestion: formattedText,
      answerSummary: finalAnswer,
      timestamp: Date.now()
    };

    setLastAnsweredBanner({
      question: formattedText,
      answer: finalAnswer,
      asker: activeTurnPlayer.name,
      target: targetOpponent.name
    });

    onUpdatePVState((prev) => ({
      ...prev,
      questionHistory: [entry, ...(prev.questionHistory || [])]
    }));
    setOralAnswerInput('');
  };

  const handleToggleSingleCardReveal = (playerId: string, slotIndex: number) => {
    sounds.playFlip();
    onUpdatePVState((prev) => {
      const currentSlots = prev.revealedCards[playerId] || new Array(8).fill(false);
      const updatedSlots = [...currentSlots];
      updatedSlots[slotIndex] = !updatedSlots[slotIndex];
      return {
        ...prev,
        revealedCards: {
          ...prev.revealedCards,
          [playerId]: updatedSlots
        }
      };
    });
  };

  const handleRevealAllForPlayer = (playerId: string, reveal: boolean) => {
    sounds.playPowerup();
    onUpdatePVState((prev) => ({
      ...prev,
      revealedCards: {
        ...prev.revealedCards,
        [playerId]: new Array(8).fill(reveal)
      }
    }));
  };

  const handleSetQuickTokenBidOnTV = (playerId: string, amount: number) => {
    sounds.playTick();
    onUpdatePVState((prev) => {
      const maxAvailable = prev.tokens[playerId] ?? 10;
      const clamped = Math.min(maxAvailable, Math.max(0, amount));
      return {
        ...prev,
        currentBids: {
          ...prev.currentBids,
          [playerId]: clamped
        }
      };
    });
  };

  const handleConfirmSequentialBid = (playerId: string) => {
    sounds.playSuccess();
    onUpdatePVState((prev) => {
      const bidValue = prev.currentBids?.[playerId] ?? 0;
      const nextSubmitted = {
        ...prev.bidSubmitted,
        [playerId]: true
      };
      const currentIdx = prev.bettingPlayerIndex ?? 0;
      const nextIdx = Math.min(activePlayers.length - 1, currentIdx + 1);
      return {
        ...prev,
        currentBids: {
          ...prev.currentBids,
          [playerId]: bidValue
        },
        bidSubmitted: nextSubmitted,
        bettingPlayerIndex: nextIdx
      };
    });
  };

  const handleResolveAuctionOnTV = () => {
    onUpdatePVState((prev) => {
      const res = resolveTokenAuction(prev.tokens, prev.currentBids, prev.tokenAlertLight);
      if (res.status === 'TIE') {
        sounds.playPowerup();
        const tiedNames = res.tiedPlayerIds
          .map((id) => activePlayers.find((p) => p.id === id)?.name || id)
          .join(' & ');
        return {
          ...prev,
          tokens: res.updatedTokens,
          tokenAlertLight: res.updatedAlertLights,
          currentBids: {},
          bidSubmitted: {},
          bettingPlayerIndex: 0,
          auctionRevealPending: false,
          auctionOutcomeType: null,
          auctionWinnerId: null,
          auctionTieMessage: `Empate no maior LANCE (${res.highestBid} FICHAS) ENTRE ${tiedNames.toUpperCase()}! Eles recuperaram as fichas + GANHARAM +2 FICHAS DE BÔNUS para desempatar!`
        };
      }

      if (res.status === 'NO_BIDS') {
        sounds.playPowerup();
        const nextIdx =
          (activePlayers.findIndex((p) => p.id === prev.activeTurnPlayerId) + 1) %
          Math.max(1, activePlayers.length);
        const fallbackWinner = activePlayers[nextIdx]?.id || activePlayers[0]?.id || '';
        const defaultOpponent =
          activePlayers.find((p) => p.id !== fallbackWinner)?.id || activePlayers[0]?.id || null;
        return {
          ...prev,
          phase: 'TOKEN_AUCTION',
          auctionRevealPending: true,
          auctionOutcomeType: 'NO_BIDS',
          activeTurnPlayerId: fallbackWinner,
          targetOpponentId: defaultOpponent,
          auctionWinnerId: fallbackWinner,
          auctionWinningBid: 0,
          auctionTieMessage: null,
          timerActive: false
        };
      }

      sounds.playSuccess();
      const winnerId = res.winnerPlayerId || activePlayers[0]?.id || '';
      const defaultOpponent =
        activePlayers.find((p) => p.id !== winnerId)?.id || activePlayers[0]?.id || null;

      return {
        ...prev,
        tokens: res.updatedTokens,
        tokenAlertLight: res.updatedAlertLights,
        phase: 'TOKEN_AUCTION',
        auctionRevealPending: true,
        auctionOutcomeType: 'WIN',
        activeTurnPlayerId: winnerId,
        targetOpponentId: defaultOpponent,
        auctionWinnerId: winnerId,
        auctionWinningBid: res.highestBid,
        auctionTieMessage: null,
        timerActive: false
      };
    });
  };

  const handleStartWinnerTurnAfterReveal = () => {
    sounds.playSuccess();
    onUpdatePVState((prev) => ({
      ...prev,
      phase: 'PLAYER_ACTION',
      auctionRevealPending: false,
      auctionOutcomeType: null,
      timerSeconds: prev.turnTimerConfig,
      timerActive: prev.turnTimerConfig > 0
    }));
  };

  const handleAdvanceNextRoundWithRecharge = () => {
    sounds.playPowerup();
    setLastAnsweredBanner(null);
    setTruthFailedThisTurn(false);
    setActionMode('QUESTION');
    onUpdatePVState((prev) => {
      const recharged = applyRoundEndTokenRecharge(prev.tokens, prev.tokenAlertLight, 2);
      const currIdx = activePlayers.findIndex((p) => p.id === prev.activeTurnPlayerId);
      const nextIdx = (currIdx + 1) % Math.max(1, activePlayers.length);
      const nextPlayerId = activePlayers[nextIdx]?.id || activePlayers[0]?.id || null;
      const nextOpponentId =
        activePlayers.find((p) => p.id !== nextPlayerId)?.id || activePlayers[0]?.id || null;

      return {
        ...prev,
        auctionRound: prev.auctionRound + 1,
        tokens: recharged.updatedTokens,
        tokenAlertLight: recharged.updatedAlertLights,
        currentBids: {},
        bidSubmitted: {},
        bettingPlayerIndex: 0,
        auctionWinnerId: null,
        auctionWinningBid: 0,
        auctionRevealPending: false,
        auctionOutcomeType: null,
        auctionTieMessage: null,
        activeTurnPlayerId: nextPlayerId,
        targetOpponentId: nextOpponentId,
        phase: 'TOKEN_AUCTION',
        timerSeconds: prev.tokenTimerConfig,
        timerActive: prev.tokenTimerConfig > 0
      };
    });
  };

  const handleAwardRoundWinToPlayer = (winnerId: string, winDescription: string) => {
    const winPlayer = activePlayers.find((p) => p.id === winnerId);
    const updatedWins: Record<string, number> = {
      ...roundWinsByPlayer,
      [winnerId]: (roundWinsByPlayer[winnerId] || 0) + 1
    };

    const seriesCheck = checkMatchSeriesWin(
      updatedWins,
      totalMatchRounds,
      matchRoundNumber
    );

    if (seriesCheck.matchFinished) {
      const finalWinnerId = seriesCheck.matchWinnerPlayerId || winnerId;
      const finalWinner = activePlayers.find((p) => p.id === finalWinnerId) || winPlayer;
      const totalWinsForChampion = updatedWins[finalWinnerId] || 1;
      const seriesSummary =
        totalMatchRounds > 1
          ? `${finalWinner?.name || 'Jogador'} descobriu as 8 cartas ${totalWinsForChampion}x (Melhor de ${totalMatchRounds}) e venceu a partida!`
          : winDescription;

      onDeclareMatchWinner(finalWinnerId, seriesSummary);
      return;
    }

    sounds.playFanfare();
    onUpdatePVState((prev) => {
      const allRevealed: Record<string, boolean[]> = {};
      activePlayers.forEach((p) => {
        allRevealed[p.id] = new Array(8).fill(true);
      });
      return {
        ...prev,
        phase: 'VICTORY',
        revealedCards: allRevealed,
        roundWinsByPlayer: updatedWins,
        winnerPlayerId: winnerId,
        roundWinBannerMessage: `${
          winPlayer?.name || 'Jogador'
        } DESCOBRIU AS 8 CARTAS E VENCEU A RODADA ${matchRoundNumber} DE ${totalMatchRounds}! (${
          updatedWins[winnerId]
        }/${requiredWinsToWinMatch} vitórias)`
      };
    });
  };

  const handleStartNextMatchRound = () => {
    sounds.playPowerup();
    setLastAnsweredBanner(null);
    setTruthFailedThisTurn(false);
    setActionMode('QUESTION');
    onUpdatePVState((prev) => {
      const nextMatchRound = (prev.matchRoundNumber || 1) + 1;
      const resetHands: PerguntasEVerdadesGameState['playerHands'] = {};
      const resetReady: Record<string, boolean> = {};
      const resetRevealed: Record<string, boolean[]> = {};
      const resetTokens: Record<string, number> = {};
      const resetAlerts: Record<string, boolean> = {};

      activePlayers.forEach((p) => {
        resetHands[p.id] = [];
        resetReady[p.id] = prev.deckMode === 'physical';
        resetRevealed[p.id] = new Array(8).fill(false);
        resetTokens[p.id] = 10;
        resetAlerts[p.id] = false;
      });

      return {
        ...prev,
        phase: prev.deckMode === 'assisted' ? 'DECK_SETUP' : 'TOKEN_AUCTION',
        matchRoundNumber: nextMatchRound,
        setupPlayerIndex: 0,
        auctionRound: 1,
        playerHands: resetHands,
        handReady: resetReady,
        revealedCards: resetRevealed,
        tokens: resetTokens,
        tokenAlertLight: resetAlerts,
        currentBids: {},
        bidSubmitted: {},
        bettingPlayerIndex: 0,
        auctionWinnerId: null,
        auctionWinningBid: 0,
        auctionRevealPending: false,
        auctionOutcomeType: null,
        questionHistory: [],
        truthGuessValues: [0, 0, 0, 0, 0, 0, 0, 0],
        savedTruthSlotsByTarget: {},
        lastTruthAttemptMessage: null,
        winnerPlayerId: null,
        roundWinBannerMessage: null,
        auctionTieMessage: null
      };
    });
  };

  const currentTargetTruthSlots = getSavedTruthSlotsForTarget(pv, targetOpponent?.id || '');
  const truthFilledCount = currentTargetTruthSlots.filter(Boolean).length;
  const cardsInCurrentTruthSlots = new Map<string, number>();
  currentTargetTruthSlots.forEach((c, idx) => {
    if (c?.id) cardsInCurrentTruthSlots.set(c.id, idx);
  });

  // Places or moves a card in the Revelation board and saves the position without validating or spoiling
  const handlePlaceCardInTruthSlot = (
    card: PVCard,
    targetIndex: number,
    sourceSlotIndex?: number
  ) => {
    if (!targetOpponent) return;
    sounds.playFlip();
    const currentSlots = getSavedTruthSlotsForTarget(pv, targetOpponent.id);
    const updatedSlots = placeCardInTruthRevelationSlot(
      currentSlots,
      targetIndex,
      card,
      sourceSlotIndex
    );

    onUpdatePVState((prev) => ({
      ...prev,
      savedTruthSlotsByTarget: {
        ...(prev.savedTruthSlotsByTarget || {}),
        [targetOpponent.id]: updatedSlots
      },
      truthGuessValues: updatedSlots.map((c) => c?.value ?? 0),
      lastTruthAttemptMessage: null
    }));

    const nextEmpty = updatedSlots.findIndex((c, idx) => idx > targetIndex && c === null);
    if (nextEmpty !== -1) {
      setTruthSelectedSlotIdx(nextEmpty);
    } else {
      const firstEmpty = updatedSlots.findIndex((c) => c === null);
      if (firstEmpty !== -1) setTruthSelectedSlotIdx(firstEmpty);
    }
  };

  const handleRemoveCardFromTruthSlot = (slotIdx: number) => {
    if (!targetOpponent) return;
    sounds.playTick();
    const updatedSlots = getSavedTruthSlotsForTarget(pv, targetOpponent.id);
    updatedSlots[slotIdx] = null;

    onUpdatePVState((prev) => ({
      ...prev,
      savedTruthSlotsByTarget: {
        ...(prev.savedTruthSlotsByTarget || {}),
        [targetOpponent.id]: updatedSlots
      },
      truthGuessValues: updatedSlots.map((c) => c?.value ?? 0),
      lastTruthAttemptMessage: null
    }));
    setTruthSelectedSlotIdx(slotIdx);
  };

  const handleClearTruthSlotsForTarget = () => {
    if (!targetOpponent) return;
    sounds.playTick();
    const emptySlots = new Array(8).fill(null);
    onUpdatePVState((prev) => ({
      ...prev,
      savedTruthSlotsByTarget: {
        ...(prev.savedTruthSlotsByTarget || {}),
        [targetOpponent.id]: emptySlots
      },
      truthGuessValues: [0, 0, 0, 0, 0, 0, 0, 0],
      lastTruthAttemptMessage: null
    }));
    setTruthSelectedSlotIdx(0);
  };

  const handleConfirmTruthAttempt = () => {
    if (!activeTurnPlayer || !targetOpponent) return;
    const targetHand = pv.playerHands[targetOpponent.id] || [];
    const revelationSlots = getSavedTruthSlotsForTarget(pv, targetOpponent.id);

    const evaluation = evaluateTruthPalpiteAttempt(
      revelationSlots,
      targetHand,
      activeTurnPlayer.name,
      targetOpponent.name
    );

    if (evaluation.status === 'INCOMPLETE') {
      sounds.playBuzzer();
      onUpdatePVState((prev) => ({
        ...prev,
        lastTruthAttemptMessage: evaluation.message
      }));
      return;
    }

    if (evaluation.status === 'MANUAL_NEEDED') {
      setShowTruthModal(false);
      setShowManualWinnerModal(true);
      return;
    }

    if (evaluation.status === 'CORRECT') {
      setShowTruthModal(false);
      setTruthFailedThisTurn(false);
      onUpdatePVState((prev) => ({
        ...prev,
        lastTruthAttemptMessage: null
      }));
      handleAwardRoundWinToPlayer(activeTurnPlayer.id, evaluation.message);
    } else {
      sounds.playBuzzer();
      setTruthFailedThisTurn(true);
      onUpdatePVState((prev) => ({
        ...prev,
        lastTruthAttemptMessage: evaluation.message,
        auctionTieMessage: null
      }));
      setShowTruthModal(false);
    }
  };

  const activeQuestionObj = OFFICIAL_11_QUESTIONS.find(
    (q) => q.number === pv.selectedQuestionNumber
  );
  const formattedActiveQuestion = pv.selectedQuestionNumber
    ? formatOfficialQuestionText(pv.selectedQuestionNumber, {
        positions1Based: pv.selectedPositionsQ1,
        targetValue: pv.selectedValueQ7,
        targetSuit: pv.selectedSuitQ8
      })
    : '';

  // Container styling for MODO TV (Zero Scroll viewport fit)
  const tvWrapperClass = 'h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 text-xs select-none';

  // ===========================================================================
  // RENDER PLAYER ROSTER STRIP (INTELLIGENT: ACTIVE IN CYAN, INACTIVE IN PILL)
  // GOLDEN TOKEN RULE: NO TEXT/NUMBER when > 5 tokens! ONLY PULSING RED LED when <= 5 tokens!
  // ===========================================================================
  const renderPlayerRosterStrip = () => {
    const isPreRevealAuction = pv.phase === 'TOKEN_AUCTION' && !pv.auctionRevealPending;
    const allBidsDone =
      activePlayers.length > 0 && activePlayers.every((p) => Boolean(pv.bidSubmitted?.[p.id]));
    const currentBidderId = activePlayers[pv.bettingPlayerIndex ?? 0]?.id;

    return (
      <div className="rdb-pv-roster">
        {activePlayers.map((player) => {
          const isTurn = isPreRevealAuction
            ? !allBidsDone && player.id === currentBidderId
            : player.id === activeTurnPlayer?.id;
          const isTarget = !isPreRevealAuction && player.id === targetOpponent?.id && !isTurn;
          const tokenVal = pv.tokens[player.id] ?? 10;
          const alertLightOn = Boolean(pv.tokenAlertLight?.[player.id]) || tokenVal <= 5;
          const canSelectTarget = pv.phase !== 'TOKEN_AUCTION' && !isTurn;

          return (
            <div
              key={player.id}
              data-testid={`pv-player-card-${player.id}`}
              onClick={() => {
                if (!canSelectTarget) return;
                sounds.playTick();
                onUpdatePVState((prev) => ({ ...prev, targetOpponentId: player.id }));
              }}
              className={'rdb-pv-chip' + (isTurn ? ' is-turn' : isTarget ? ' is-target' : '')}
              data-tip={
                isPreRevealAuction
                  ? isTurn
                    ? 'Apostando agora'
                    : pv.bidSubmitted?.[player.id]
                    ? 'Aposta registrada'
                    : 'Aguardando vez de apostar'
                  : isTurn
                  ? 'Jogador da vez'
                  : isTarget
                  ? 'Alvo das perguntas'
                  : 'Clique para escolher como alvo'
              }
            >
              <PlayerMark p={player} />
              <span>{player.name}</span>
              {isTarget && <span className="rdb-pv-flag is-target">Alvo</span>}
              {totalMatchRounds > 1 && (
                <span
                  data-testid={`pv-player-series-wins-${player.id}`}
                  className="rdb-pv-flag is-wins"
                  data-tip={`Vitórias na série: ${roundWinsByPlayer[player.id] || 0} de ${requiredWinsToWinMatch}`}
                >
                  {roundWinsByPlayer[player.id] || 0}/{requiredWinsToWinMatch}
                </span>
              )}
              {alertLightOn && (
                <span
                  data-testid={`pv-token-alert-led-${player.id}`}
                  className="rdb-pv-flag is-low"
                  data-tip="Poucas fichas: 5 ou menos"
                >
                  ≤ 5
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ===========================================================================
  // FASE A: SETUP DO BARALHO (phase === 'DECK_SETUP')
  // ===========================================================================
  if (pv.phase === 'DECK_SETUP' && currentSetupPlayer) {
    const filledCount = setupSlots.filter(Boolean).length;

    return <PVDeckSetupView tvWrapperClass={tvWrapperClass} matchRoundNumber={matchRoundNumber} totalMatchRounds={totalMatchRounds} currentSetupPlayer={currentSetupPlayer} setupPlayerIndex={setupPlayerIndex} activePlayers={activePlayers} handleAutoDealAllHands={handleAutoDealAllHands} room={room} setupRuleError={setupRuleError} filledCount={filledCount} setupSlots={setupSlots} selectedSlotIdx={selectedSlotIdx} conflictingSlotIdx={conflictingSlotIdx} pv={pv} draggedCard={draggedCard} attemptPlaceCardInSlot={attemptPlaceCardInSlot} setDraggedCard={setDraggedCard} setSelectedSlotIdx={setSelectedSlotIdx} handleRemoveCardFromSlot={handleRemoveCardFromSlot} handleFillRandomValidHandForCurrentPlayer={handleFillRandomValidHandForCurrentPlayer} setSetupSlots={setSetupSlots} setSetupRuleError={setSetupRuleError} setConflictingSlotIdx={setConflictingSlotIdx} handleConfirmCurrentPlayerHand={handleConfirmCurrentPlayerHand} cardsInCurrentSlots={cardsInCurrentSlots} cardsUsedByOtherPlayers={cardsUsedByOtherPlayers} />;
  }

  // ===========================================================================
  // FASE B: FASE DE TOKENS / LEILÃO (phase === 'TOKEN_AUCTION')
  // ===========================================================================
  if (pv.phase === 'TOKEN_AUCTION') {
    const bettingIdx = pv.bettingPlayerIndex ?? 0;
    const currentBiddingPlayer = activePlayers[bettingIdx] || activePlayers[0];
    const allBidsSubmitted =
      activePlayers.length > 0 &&
      activePlayers.every((p) => Boolean(pv.bidSubmitted?.[p.id]));

    const currentSelectedBid = pv.currentBids?.[currentBiddingPlayer?.id] ?? 0;
    const maxTokensForBiddingPlayer = pv.tokens?.[currentBiddingPlayer?.id] ?? 10;

    return <PVIntroView tvWrapperClass={tvWrapperClass} totalMatchRounds={totalMatchRounds} matchRoundNumber={matchRoundNumber} pv={pv} formatTimer={formatTimer} renderPlayerRosterStrip={renderPlayerRosterStrip} maxTokensForBiddingPlayer={maxTokensForBiddingPlayer} room={room} onUpdatePVState={onUpdatePVState} allBidsSubmitted={allBidsSubmitted} bettingIdx={bettingIdx} activePlayers={activePlayers} currentBiddingPlayer={currentBiddingPlayer} currentSelectedBid={currentSelectedBid} handleSetQuickTokenBidOnTV={handleSetQuickTokenBidOnTV} handleConfirmSequentialBid={handleConfirmSequentialBid} handleResolveAuctionOnTV={handleResolveAuctionOnTV} handleStartWinnerTurnAfterReveal={handleStartWinnerTurnAfterReveal} />;
  }

  // ===========================================================================
  // FASE C & D: ESCOLHA DE AÇÃO, SPOTLIGHT DA PERGUNTA & DECLARAR A VERDADE
  // ===========================================================================
  return <PVPlayingView tvWrapperClass={tvWrapperClass} pv={pv} handleStartNextMatchRound={handleStartNextMatchRound} totalMatchRounds={totalMatchRounds} matchRoundNumber={matchRoundNumber} activeTurnPlayer={activeTurnPlayer} formatTimer={formatTimer} onUpdatePVState={onUpdatePVState} renderPlayerRosterStrip={renderPlayerRosterStrip} room={room} setActionMode={setActionMode} actionMode={actionMode} targetOpponent={targetOpponent} activeQuestionObj={activeQuestionObj} formattedActiveQuestion={formattedActiveQuestion} handleTogglePosForQ1={handleTogglePosForQ1} handleSelectValueQ7={handleSelectValueQ7} handleSelectSuitQ8={handleSelectSuitQ8} handleRecordQuestionInLog={handleRecordQuestionInLog} lastAnsweredBanner={lastAnsweredBanner} truthFailedThisTurn={truthFailedThisTurn} handleAdvanceNextRoundWithRecharge={handleAdvanceNextRoundWithRecharge} handleSelectQuestion={handleSelectQuestion} handleRevealAllForPlayer={handleRevealAllForPlayer} handleToggleSingleCardReveal={handleToggleSingleCardReveal} truthFilledCount={truthFilledCount} handleClearTruthSlotsForTarget={handleClearTruthSlotsForTarget} currentTargetTruthSlots={currentTargetTruthSlots} truthSelectedSlotIdx={truthSelectedSlotIdx} truthDraggedCard={truthDraggedCard} handlePlaceCardInTruthSlot={handlePlaceCardInTruthSlot} setTruthDraggedCard={setTruthDraggedCard} setTruthSelectedSlotIdx={setTruthSelectedSlotIdx} handleRemoveCardFromTruthSlot={handleRemoveCardFromTruthSlot} cardsInCurrentTruthSlots={cardsInCurrentTruthSlots} handleConfirmTruthAttempt={handleConfirmTruthAttempt} setIsHistoryOpen={setIsHistoryOpen} isHistoryOpen={isHistoryOpen} setIsBenchOpen={setIsBenchOpen} isBenchOpen={isBenchOpen} setShowManualWinnerModal={setShowManualWinnerModal} setDeductionNotes={setDeductionNotes} deductionNotes={deductionNotes} showManualWinnerModal={showManualWinnerModal} activePlayers={activePlayers} handleAwardRoundWinToPlayer={handleAwardRoundWinToPlayer} />;
};
