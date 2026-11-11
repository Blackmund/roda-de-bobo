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

interface ScreenPerguntasEVerdadesProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdatePVState: (
    updater: (prev: PerguntasEVerdadesGameState) => PerguntasEVerdadesGameState
  ) => void;
  onDeclareMatchWinner: (winnerPlayerId: string, reason: string) => void;
}

const ALL_CARD_VALUES: PVCardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const FULL_52_DECK: PVCard[] = createFull52Deck();

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
  // DECK SETUP HANDLERS
  // =========================================================================
  const cardsUsedByOtherPlayers = new Set<string>();
  activePlayers.forEach((p, idx) => {
    if (idx !== setupPlayerIndex) {
      (pv.playerHands?.[p.id] || []).forEach((c) => {
        if (c?.id) cardsUsedByOtherPlayers.add(c.id);
      });
    }
  });

  const cardsInCurrentSlots = new Set<string>(
    setupSlots.filter((c): c is PVCard => Boolean(c)).map((c) => c.id)
  );

  const attemptPlaceCardInSlot = (
    card: PVCard,
    targetIndex: number,
    sourceSlotIndex?: number
  ) => {
    if (cardsUsedByOtherPlayers.has(card.id)) {
      sounds.playBuzzer();
      setSetupRuleError('Esta carta já foi escolhida por outro jogador nesta rodada.');
      return;
    }

    const workingSlots = [...setupSlots];
    if (typeof sourceSlotIndex === 'number' && sourceSlotIndex >= 0 && sourceSlotIndex < 8) {
      workingSlots[sourceSlotIndex] = null;
    } else {
      const existingIdx = workingSlots.findIndex((c) => c?.id === card.id);
      if (existingIdx !== -1) {
        workingSlots[existingIdx] = null;
      }
    }

    // Freeform placement: player can organize their 8 cards in any order or sequence
    sounds.playFlip();
    workingSlots[targetIndex] = card;
    setSetupSlots(workingSlots);
    setSetupRuleError(null);
    setConflictingSlotIdx(null);
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
    const randomHand = dealValidRandomHand(Array.from(cardsUsedByOtherPlayers));
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
      let usedIds: string[] = [];

      activePlayers.forEach((p) => {
        const dealt = dealValidRandomHand(usedIds);
        hands[p.id] = dealt;
        ready[p.id] = true;
        revealed[p.id] = new Array(8).fill(false);
        usedIds = [...usedIds, ...dealt.map((c) => c.id)];
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
      const nextSubmitted = {
        ...prev.bidSubmitted,
        [playerId]: true
      };
      const currentIdx = prev.bettingPlayerIndex ?? 0;
      const nextIdx = Math.min(activePlayers.length - 1, currentIdx + 1);
      return {
        ...prev,
        bidSubmitted: nextSubmitted,
        bettingPlayerIndex: nextIdx
      };
    });
  };

  const handleResolveAuctionOnTV = () => {
    sounds.playPowerup();
    onUpdatePVState((prev) => {
      const res = resolveTokenAuction(prev.tokens, prev.currentBids, prev.tokenAlertLight);
      if (res.status === 'TIE') {
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
          auctionTieMessage: `⚡ EMPATE NO MAIOR LANCE (${res.highestBid} FICHAS) ENTRE ${tiedNames.toUpperCase()}! Eles recuperaram as fichas + GANHARAM +2 FICHAS DE BÔNUS para desempatar!`
        };
      }

      if (res.status === 'NO_BIDS') {
        const nextIdx =
          (activePlayers.findIndex((p) => p.id === prev.activeTurnPlayerId) + 1) %
          Math.max(1, activePlayers.length);
        const fallbackWinner = activePlayers[nextIdx]?.id || activePlayers[0]?.id || '';
        const defaultOpponent =
          activePlayers.find((p) => p.id !== fallbackWinner)?.id || activePlayers[0]?.id || null;
        return {
          ...prev,
          phase: 'PLAYER_ACTION',
          activeTurnPlayerId: fallbackWinner,
          targetOpponentId: defaultOpponent,
          auctionWinnerId: fallbackWinner,
          auctionWinningBid: 0,
          auctionTieMessage: 'Nenhuma ficha apostada — vez da mesa.',
          timerSeconds: prev.turnTimerConfig,
          timerActive: prev.turnTimerConfig > 0
        };
      }

      const winnerId = res.winnerPlayerId || activePlayers[0]?.id || '';
      const defaultOpponent =
        activePlayers.find((p) => p.id !== winnerId)?.id || activePlayers[0]?.id || null;

      return {
        ...prev,
        tokens: res.updatedTokens,
        tokenAlertLight: res.updatedAlertLights,
        phase: 'PLAYER_ACTION',
        activeTurnPlayerId: winnerId,
        targetOpponentId: defaultOpponent,
        auctionWinnerId: winnerId,
        auctionWinningBid: res.highestBid,
        auctionTieMessage: null,
        timerSeconds: prev.turnTimerConfig,
        timerActive: prev.turnTimerConfig > 0
      };
    });
  };

  const handleAdvanceNextRoundWithRecharge = () => {
    sounds.playPowerup();
    setLastAnsweredBanner(null);
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
        roundWinBannerMessage: `🏆 ${
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
      onUpdatePVState((prev) => ({
        ...prev,
        lastTruthAttemptMessage: null
      }));
      handleAwardRoundWinToPlayer(activeTurnPlayer.id, evaluation.message);
    } else {
      sounds.playBuzzer();
      onUpdatePVState((prev) => ({
        ...prev,
        lastTruthAttemptMessage: evaluation.message,
        auctionTieMessage: evaluation.message
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
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 shrink-0">
        {activePlayers.map((player) => {
          const isTurn = player.id === activeTurnPlayer?.id;
          const isTarget = player.id === targetOpponent?.id && !isTurn;
          const tokenVal = pv.tokens[player.id] ?? 10;
          // Golden rule: <= 5 tokens triggers Pulsing Red LED
          const alertLightOn = Boolean(pv.tokenAlertLight?.[player.id]) || tokenVal <= 5;

          return (
            <div
              key={player.id}
              data-testid={`pv-player-card-${player.id}`}
              onClick={() => {
                sounds.playTick();
                if (!isTurn) {
                  onUpdatePVState((prev) => ({ ...prev, targetOpponentId: player.id }));
                }
              }}
              className={`px-2.5 py-1 border transition-all flex items-center gap-1.5 cursor-pointer rounded-sm ${
                isTurn
                  ? 'border-cyan-300 bg-cyan-950/90 text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-100 font-bold z-10'
                  : isTarget
                  ? 'border-rose-500/80 bg-rose-950/60 text-rose-200 scale-95 opacity-90'
                  : 'border-slate-800 bg-black/60 text-slate-300 opacity-60 hover:opacity-100 scale-95'
              }`}
            >
              <span className="text-base shrink-0">{player.avatar}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-anton text-xs uppercase truncate max-w-[90px]">
                  {player.name}
                </span>

                {isTurn && (
                  <span className="text-[8px] font-mono-code font-bold bg-cyan-400 text-black px-1 py-0.2 uppercase shrink-0">
                    SUA VEZ
                  </span>
                )}

                {isTarget && (
                  <span className="text-[8px] font-mono-code font-bold bg-rose-600 text-white px-1 py-0.2 uppercase shrink-0">
                    ALVO
                  </span>
                )}

                {/* Placar de Vitórias da Série (Melhor de X) */}
                {totalMatchRounds > 1 && (
                  <span
                    data-testid={`pv-player-series-wins-${player.id}`}
                    className="text-[8px] font-mono-code font-bold bg-amber-400 text-black px-1 py-0.2 uppercase shrink-0"
                    title={`Vitórias na série: ${roundWinsByPlayer[player.id] || 0} de ${requiredWinsToWinMatch} necessárias`}
                  >
                    🏆 {roundWinsByPlayer[player.id] || 0}/{requiredWinsToWinMatch}
                  </span>
                )}

                {/* GOLDEN TOKEN RULE: NO NUMBER WHEN > 5 FICHAS! ONLY PULSING RED LED WHEN <= 5 FICHAS */}
                {alertLightOn && (
                  <div
                    data-testid={`pv-token-alert-led-${player.id}`}
                    className="flex items-center gap-0.5 px-1 py-0.2 bg-[#FFE600] text-black font-anton text-[8px] uppercase tracking-wider animate-pulse shadow-[0_0_10px_#FFE600] shrink-0"
                    title="ALERTA OFICIAL: Jogador está com ≤ 5 fichas!"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span>⚡ ≤ 5</span>
                  </div>
                )}
              </div>
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

    return (
      <div data-testid="screen-perguntas-e-verdades" className={tvWrapperClass}>
        <div data-testid="pv-deck-setup-screen" className="border-2 border-cyan-400 bg-[#080b16] p-2.5 md:p-3 shadow-neon-cyan flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-cyan-400 text-black font-anton text-xs uppercase">
                FASE A: MONTAGEM DO BARALHO (R#{matchRoundNumber}{totalMatchRounds > 1 ? `/${totalMatchRounds}` : ''})
              </span>
              <h2 data-testid="pv-setup-current-player-banner" className="font-anton text-base md:text-lg text-white uppercase">
                {currentSetupPlayer.avatar} {currentSetupPlayer.name} ({setupPlayerIndex + 1}/{activePlayers.length})
              </h2>
            </div>

            <button
              type="button"
              data-testid="pv-auto-deal-all-btn"
              onClick={handleAutoDealAllHands}
              className="px-3 py-1 border border-amber-400/80 bg-amber-950/60 hover:bg-amber-400 hover:text-black text-amber-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
            >
              <Shuffle size={12} />
              <span>Sortear Mãos de Todos e Avançar</span>
            </button>
          </div>

          {/* Dynamic 1-line Action Guidance Banner ("O que eu faço agora?") */}
          <div className="shrink-0 px-3 py-1 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono-code">
            <div className="flex items-start sm:items-center gap-2 sm:truncate">
              <span className="w-2 h-2 rounded-full bg-[#17B8B8] animate-pulse shrink-0" />
              <span className="text-slate-300">
                🃏 🎤 <strong className="text-white">MONTAGEM DO BARALHO:</strong> Organize as 8 cartas de {currentSetupPlayer.name} em ordem crescente por naipe
              </span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline">
              {themeBadge(room.visualTheme)}
            </span>
          </div>

          {/* Rule Error Banner */}
          <AnimatePresence>
            {setupRuleError && (
              <motion.div
                data-testid="pv-setup-rule-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-2 border-2 border-rose-500 bg-rose-950/90 text-white flex items-center gap-2 text-xs font-mono-code font-bold shrink-0"
              >
                <AlertCircle size={16} className="text-rose-300 shrink-0" />
                <span>{setupRuleError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TOP 8 SLOTS */}
          <div className="space-y-1 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-mono-code font-bold">
              <span className="text-cyan-300 uppercase">SUA BANCADA DE 8 CARTAS SECRETAS:</span>
              <span className="text-amber-300">{filledCount} / 8 POSICIONADAS</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) => {
                const card = setupSlots[slotIdx];
                const isSelectedSlot = selectedSlotIdx === slotIdx;
                const isConflictSlot = conflictingSlotIdx === slotIdx;
                const deckStyle: PVDeckStyle = pv.deckStyle || room.customConfig?.pvDeckStyle || 'padrao';

                return (
                  <div
                    key={slotIdx}
                    data-testid={`pv-setup-slot-${slotIdx + 1}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedCard) {
                        attemptPlaceCardInSlot(draggedCard.card, slotIdx, draggedCard.fromSlotIndex);
                        setDraggedCard(null);
                      }
                    }}
                    draggable={Boolean(card)}
                    onDragStart={() => {
                      if (card) setDraggedCard({ card, fromSlotIndex: slotIdx });
                    }}
                  >
                    <PlayingCardView
                      card={card}
                      styleMode={deckStyle}
                      slotLabel={`${slotIdx + 1}ª POS`}
                      isSelected={isSelectedSlot}
                      isConflict={isConflictSlot}
                      onClick={() => setSelectedSlotIdx(slotIdx)}
                      onRemove={card ? () => handleRemoveCardFromSlot(slotIdx) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-cyan-500/30 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="pv-setup-random-hand-btn"
                onClick={handleFillRandomValidHandForCurrentPlayer}
                className="px-3 py-1 border-2 border-amber-400 bg-amber-400 hover:bg-amber-300 text-black font-anton text-xs uppercase flex items-center gap-1 cursor-pointer"
              >
                <Shuffle size={13} />
                <span>Sortear Mão Aleatória</span>
              </button>

              <button
                type="button"
                data-testid="pv-setup-clear-hand-btn"
                onClick={() => {
                  sounds.playTick();
                  setSetupSlots(new Array(8).fill(null));
                  setSelectedSlotIdx(0);
                  setSetupRuleError(null);
                  setConflictingSlotIdx(null);
                }}
                className="px-2.5 py-1 border border-slate-700 bg-black text-slate-300 font-mono-code text-[10px] font-bold uppercase cursor-pointer"
              >
                Limpar
              </button>
            </div>

            <button
              type="button"
              data-testid="pv-setup-confirm-hand-btn"
              onClick={handleConfirmCurrentPlayerHand}
              disabled={filledCount < 8}
              className={`px-4 py-1 border-2 font-anton text-xs uppercase flex items-center gap-1 cursor-pointer ${
                filledCount === 8
                  ? 'border-emerald-300 bg-emerald-400 hover:bg-emerald-300 text-black shadow-md'
                  : 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>
                {setupPlayerIndex < activePlayers.length - 1
                  ? `CONFIRMAR (${currentSetupPlayer.name}) ➔ PRÓXIMO`
                  : `CONFIRMAR E INICIAR PARTIDA!`}
              </span>
            </button>
          </div>

          {/* FULL 52-CARD DECK */}
          <div className="space-y-1 pt-1 border-t border-cyan-500/30 flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <div className="text-[10px] font-mono-code text-white font-bold uppercase">
              BARALHO (52 CARTAS) — CLIQUE PARA INSERIR NA{' '}
              <span className="text-cyan-300">{selectedSlotIdx + 1}ª POSIÇÃO</span>:
            </div>

            <div className="space-y-1">
              {SUIT_ORDER.map((suitKey) => {
                const suitMeta = SUIT_META[suitKey];
                const suitCards = FULL_52_DECK.filter((c) => c.suit === suitKey);
                const isRed = suitKey === 'hearts' || suitKey === 'diamonds';

                return (
                  <div key={suitKey} className="p-1 border border-slate-800 bg-black/80 flex items-center gap-1.5">
                    <span className={`w-16 font-anton text-[10px] uppercase flex items-center gap-1 shrink-0 ${isRed ? 'text-rose-400' : 'text-cyan-300'}`}>
                      <span>{suitMeta.symbol}</span>
                      <span>{suitMeta.name}</span>
                    </span>

                    <div className="grid grid-cols-13 gap-1 flex-1">
                      {suitCards.map((card) => {
                        const inCurrentHand = cardsInCurrentSlots.has(card.id);
                        const usedByOther = cardsUsedByOtherPlayers.has(card.id);
                        const isDisabled = inCurrentHand || usedByOther;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            data-testid={`pv-deck-card-${card.id}`}
                            disabled={isDisabled}
                            draggable={!isDisabled}
                            onDragStart={() => {
                              if (!isDisabled) setDraggedCard({ card });
                            }}
                            onClick={() => {
                              if (!isDisabled) attemptPlaceCardInSlot(card, selectedSlotIdx);
                            }}
                            className={`h-7 border font-anton text-[10px] flex items-center justify-center transition-all ${
                              isDisabled
                                ? 'border-slate-800 bg-slate-950/40 text-slate-700 opacity-40 cursor-not-allowed'
                                : isRed
                                ? 'border-rose-500/60 bg-[#1a0812] hover:bg-rose-500 hover:text-white text-rose-300 cursor-grab'
                                : 'border-cyan-500/60 bg-[#081524] hover:bg-cyan-400 hover:text-black text-cyan-200 cursor-grab'
                            }`}
                          >
                            <span>{card.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
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

    return (
      <div data-testid="screen-perguntas-e-verdades" className={tvWrapperClass}>
        {/* Compact Header */}
        <div data-testid="pv-auction-only-header" className="border-2 border-amber-400 bg-[#0c0d18] p-2 shadow-neon-amber flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span data-testid="pv-series-round-badge" className="px-2 py-0.5 bg-rose-600 border border-rose-300 text-white font-anton text-xs uppercase">
              {totalMatchRounds > 1 ? `R#${matchRoundNumber}/${totalMatchRounds} (MD${totalMatchRounds})` : `R#${matchRoundNumber}`}
            </span>
            <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-400 text-cyan-200 font-anton text-xs uppercase">
              LEILÃO #{pv.auctionRound}
            </span>
            <span data-testid="pv-game-status-indicator" className="px-2 py-0.5 border border-amber-400 bg-amber-950/80 text-amber-200 font-mono-code text-[11px] font-bold uppercase">
              🪙 FASE DE APOSTAS
            </span>
          </div>

          <div className="border border-amber-400 bg-black px-2.5 py-0.5 flex items-center gap-1">
            <Clock size={12} className="text-amber-400" />
            <span data-testid="pv-turn-timer-display" className="font-anton text-sm text-amber-300">
              {formatTimer(pv.timerSeconds)}
            </span>
          </div>
        </div>

        {/* Player Roster Strip with Pulsing LED */}
        {renderPlayerRosterStrip()}

        {/* Dynamic 1-line Action Guidance Banner ("O que eu faço agora?") */}
        <div className="shrink-0 px-3 py-1 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono-code">
          <div className="flex items-start sm:items-center gap-2 sm:truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-slate-300">
              🪙 🎤 <strong className="text-white">LEILÃO DE FICHAS:</strong> Aposte de 0 a {maxTokensForBiddingPlayer} fichas para disputar o direito de responder ou passar a pergunta
            </span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline">
            {themeBadge(room.visualTheme)}
          </span>
        </div>

        {/* Tie Alert Banner */}
        {pv.auctionTieMessage && (
          <div data-testid="pv-auction-tie-alert" className="p-2 border-2 border-amber-300 bg-amber-950/90 flex items-center justify-between gap-2 shrink-0">
            <div className="font-anton text-xs text-amber-200 uppercase truncate">
              {pv.auctionTieMessage}
            </div>
            <button
              type="button"
              data-testid="pv-restart-tie-auction-btn"
              onClick={() => {
                sounds.playTick();
                onUpdatePVState((prev) => ({
                  ...prev,
                  currentBids: {},
                  bidSubmitted: {},
                  bettingPlayerIndex: 0,
                  auctionTieMessage: null
                }));
              }}
              className="px-3 py-1 border border-amber-300 bg-amber-400 hover:bg-amber-300 text-black font-anton text-[10px] uppercase cursor-pointer shrink-0"
            >
              🔄 DESEMPATA
            </button>
          </div>
        )}

        {/* CENTER STAGE: SEQUENTIAL BIDDING OR REVELATION */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col justify-center">
          {!allBidsSubmitted ? (
            <div data-testid="pv-sequential-bidding-card" className="p-4 border-2 border-cyan-300 bg-gradient-to-r from-[#0b1528] via-[#0e1c36] to-black space-y-3 max-w-2xl mx-auto w-full shadow-2xl">
              <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono-code text-cyan-300 font-bold uppercase">
                    APOSTA SECRETA ({bettingIdx + 1} DE {activePlayers.length}):
                  </div>
                  <h2 data-testid="pv-giant-turn-indicator" className="font-anton text-2xl md:text-3xl text-white uppercase">
                    <span className="text-amber-300">{currentBiddingPlayer?.avatar} {currentBiddingPlayer?.name}</span>
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono-code text-slate-300 uppercase">Reserva:</span>
                  <div className="font-anton text-2xl text-amber-300">{maxTokensForBiddingPlayer} 🪙</div>
                </div>
              </div>

              {/* Token Pickers */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 pt-1">
                {Array.from({ length: maxTokensForBiddingPlayer + 1 }, (_, i) => i).map((amt) => {
                  const isSelected = currentSelectedBid === amt;
                  return (
                    <button
                      key={amt}
                      type="button"
                      data-testid={`pv-tv-bid-${currentBiddingPlayer?.id}-${amt}`}
                      onClick={() => handleSetQuickTokenBidOnTV(currentBiddingPlayer?.id, amt)}
                      className={`h-9 border font-anton text-sm flex items-center justify-center cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-300 bg-amber-400 text-black shadow-md scale-105'
                          : 'border-slate-800 bg-[#070b14] hover:border-amber-400 text-slate-200'
                      }`}
                    >
                      {amt}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-cyan-500/30">
                <span className="text-xs font-mono-code text-amber-300 font-bold">
                  APOSTA: {currentSelectedBid} FICHAS
                </span>
                <button
                  type="button"
                  data-testid={`pv-confirm-bid-btn-${currentBiddingPlayer?.id}`}
                  onClick={() => handleConfirmSequentialBid(currentBiddingPlayer?.id)}
                  className="px-5 py-2 border-2 border-emerald-300 bg-emerald-400 hover:bg-emerald-300 text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Lock size={14} />
                  <span>CONFIRMAR APOSTA DE {currentBiddingPlayer?.name.toUpperCase()}</span>
                </button>
              </div>
            </div>
          ) : (
            <div data-testid="pv-auction-reveal-ready-card" className="p-6 border-2 border-emerald-400 bg-gradient-to-r from-emerald-950/90 via-[#071711] to-black space-y-3 text-center max-w-xl mx-auto w-full shadow-2xl">
              <div className="text-xs font-mono-code text-emerald-300 font-bold uppercase tracking-widest">
                🔒 APOSTAS REGISTRADAS
              </div>
              <h2 className="font-anton text-2xl md:text-3xl text-white uppercase">
                REVELAR VENCEDOR DO TURNO?
              </h2>
              <button
                type="button"
                data-testid="pv-resolve-auction-btn"
                onClick={handleResolveAuctionOnTV}
                className="px-8 py-3 border-2 border-amber-300 bg-amber-400 hover:bg-amber-300 text-black font-anton text-base uppercase tracking-wider cursor-pointer shadow-neon-amber animate-pulse"
              >
                🪙 REVELAR RESULTADO DO LEILÃO
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // FASE C & D: ESCOLHA DE AÇÃO, SPOTLIGHT DA PERGUNTA & DECLARAR A VERDADE
  // ===========================================================================
  return (
    <div data-testid="screen-perguntas-e-verdades" className={tvWrapperClass}>
      {/* Round Victory Banner */}
      {pv.phase === 'VICTORY' && pv.roundWinBannerMessage && (
        <div data-testid="pv-round-victory-banner" className="border-2 border-amber-300 bg-gradient-to-r from-amber-950/90 via-[#1a1305] to-emerald-950/90 p-2.5 shadow-lg flex items-center justify-between gap-2 shrink-0">
          <h2 className="font-anton text-base md:text-lg text-white uppercase">
            {pv.roundWinBannerMessage}
          </h2>
          <button
            type="button"
            data-testid="pv-next-match-round-btn"
            onClick={handleStartNextMatchRound}
            className="px-4 py-1.5 border-2 border-cyan-300 bg-cyan-400 hover:bg-cyan-300 text-black font-anton text-xs uppercase cursor-pointer shrink-0 shadow-neon-cyan flex items-center gap-1.5"
          >
            <span>Confirmar e Avançar na Série ➔</span>
            <ArrowRight size={14} className="inline ml-1" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div data-testid="pv-zona-a-header" className="border-2 border-cyan-400 bg-[#080a14] p-1.5 md:p-2 shadow-neon-cyan flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span data-testid="pv-series-round-badge" className="px-2 py-0.5 bg-rose-600 text-white font-anton text-[11px] uppercase">
            {totalMatchRounds > 1 ? `R#${matchRoundNumber}/${totalMatchRounds} (MD${totalMatchRounds})` : `R#${matchRoundNumber}`}
          </span>
          <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-400 text-cyan-200 font-anton text-[11px] uppercase">
            TURNO #{pv.auctionRound}
          </span>
          <span data-testid="pv-game-status-indicator" className="text-[11px] font-mono-code text-cyan-300 font-bold uppercase">
            👑 VEZ DE: {activeTurnPlayer?.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="border border-cyan-400 bg-black px-2 py-0.5 flex items-center gap-1">
            <Clock size={12} className="text-cyan-400" />
            <span data-testid="pv-turn-timer-display" className="font-anton text-xs text-cyan-300">
              {formatTimer(pv.timerSeconds)}
            </span>
          </div>

          <button
            type="button"
            data-testid="pv-timer-pause-btn"
            onClick={() => {
              sounds.playTick();
              onUpdatePVState((prev) => ({ ...prev, timerActive: !prev.timerActive }));
            }}
            className="p-1 border border-cyan-400/60 bg-cyan-950/60 text-cyan-200 text-[10px] cursor-pointer"
          >
            {pv.timerActive ? <Pause size={10} /> : <Play size={10} />}
          </button>

          <button
            type="button"
            data-testid="pv-phase-auction-btn"
            onClick={() => {
              sounds.playTick();
              onUpdatePVState((prev) => ({
                ...prev,
                phase: 'TOKEN_AUCTION',
                timerSeconds: prev.tokenTimerConfig,
                timerActive: prev.tokenTimerConfig > 0
              }));
            }}
            className="px-2.5 py-1 border border-amber-300 bg-amber-400 hover:bg-amber-300 text-black font-anton text-[10px] uppercase cursor-pointer"
          >
            <Coins size={12} className="inline mr-1" />
            <span>NOVO LEILÃO (+2)</span>
          </button>
        </div>
      </div>

      {/* Intelligent Player Roster Strip (Active in Cyan vs Inactive Compact Pill) */}
      {renderPlayerRosterStrip()}

      {/* Dynamic 1-line Action Guidance Banner ("O que eu faço agora?") */}
      <div className="shrink-0 px-3 py-1 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono-code mb-1">
        <div className="flex items-start sm:items-center gap-2 sm:truncate">
          <span className="w-2 h-2 rounded-full bg-[#17B8B8] animate-pulse shrink-0" />
          <span className="text-slate-300">
            {pv.phase === 'VICTORY' ? (
              <>🏆 <strong className="text-white">FIM DO CONFRONTO:</strong> Confirme e avance para a próxima rodada da série</>
            ) : (
              <>🎤 <strong className="text-white">VEZ DE {activeTurnPlayer?.name}:</strong> Responda à pergunta sorteada ou arrisque a declaração da verdade!</>
            )}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline">
          {themeBadge(room.visualTheme)}
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-rose-500/30 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="pv-mode-question-tab"
            onClick={() => {
              sounds.playTick();
              setActionMode('QUESTION');
            }}
            className={`px-3 py-1 font-anton text-xs uppercase border cursor-pointer ${
              actionMode === 'QUESTION'
                ? 'border-cyan-300 bg-cyan-400 text-black font-bold'
                : 'border-slate-800 bg-black text-cyan-300'
            }`}
          >
            ❓ 11 Perguntas Oficiais
          </button>

          <button
            type="button"
            data-testid="pv-mode-truth-tab"
            onClick={() => {
              sounds.playTick();
              setActionMode('TRUTH');
            }}
            className={`px-3 py-1 font-anton text-xs uppercase border cursor-pointer ${
              actionMode === 'TRUTH'
                ? 'border-rose-300 bg-rose-600 text-white font-bold'
                : 'border-slate-800 bg-black text-rose-300'
            }`}
          >
            👁️ Declarar a Verdade / Ver Cartas
          </button>
        </div>

        <div className="text-[11px] font-mono-code text-slate-300">
          Alvo selecionado:{' '}
          <strong className="text-rose-400 font-anton">{targetOpponent?.name}</strong>
        </div>
      </div>

      {/* FASE C: 11 QUESTIONS GRID OR SPOTLIGHT MODE */}
      {actionMode === 'QUESTION' ? (
        <div data-testid="pv-zona-b-questions-panel" className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-y-auto scrollbar-none">
          {/* Spotlight Question Banner when selected */}
          {activeQuestionObj ? (
            <div data-testid="pv-highlighted-question-banner" className="border-2 border-cyan-300 bg-gradient-to-r from-cyan-950/90 via-[#0b1528] to-black p-2.5 space-y-1.5 shrink-0 shadow-lg">
              <div className="flex items-center justify-between text-[10px] font-mono-code text-cyan-300 font-bold uppercase">
                <span>SPOTLIGHT PERGUNTA #{activeQuestionObj.number} [{activeTurnPlayer?.name} ➔ {targetOpponent?.name}]:</span>
                <span className="text-amber-300 font-anton uppercase">{activeQuestionObj.category}</span>
              </div>

              <div data-testid="pv-highlighted-question-text" className="font-anton text-lg md:text-2xl text-white uppercase tracking-wide leading-tight">
                "{formattedActiveQuestion}"
              </div>

              {/* Question #1 Position Selector */}
              {activeQuestionObj.number === 1 && (
                <div data-testid="pv-q1-position-selector" className="flex items-center gap-2 pt-1 border-t border-cyan-500/30">
                  <span className="text-[10px] font-mono-code text-cyan-200">3 posições:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => {
                      const isSel = pv.selectedPositionsQ1.includes(pos);
                      return (
                        <button
                          key={pos}
                          type="button"
                          data-testid={`pv-q1-pos-btn-${pos}`}
                          onClick={() => handleTogglePosForQ1(pos)}
                          className={`px-2 py-0.5 font-anton text-xs border ${isSel ? 'bg-amber-400 text-black border-amber-300' : 'bg-black text-slate-300 border-slate-700'}`}
                        >
                          {pos}ª
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question #7 Value Selector */}
              {activeQuestionObj.number === 7 && (
                <div data-testid="pv-q7-value-selector" className="flex items-center gap-2 pt-1 border-t border-cyan-500/30">
                  <span className="text-[10px] font-mono-code text-cyan-200">Valor:</span>
                  <div className="flex gap-1 flex-wrap">
                    {ALL_CARD_VALUES.map((val) => {
                      const isSel = pv.selectedValueQ7 === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          data-testid={`pv-q7-val-btn-${val}`}
                          onClick={() => handleSelectValueQ7(val)}
                          className={`w-6 h-6 font-anton text-xs border ${isSel ? 'bg-amber-400 text-black border-amber-300' : 'bg-black text-white border-slate-700'}`}
                        >
                          {formatCardValueLabel(val)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question #8 Suit Selector */}
              {activeQuestionObj.number === 8 && (
                <div data-testid="pv-q8-suit-selector" className="flex items-center gap-2 pt-1 border-t border-cyan-500/30">
                  <span className="text-[10px] font-mono-code text-cyan-200">Naipe:</span>
                  <div className="flex gap-1">
                    {SUIT_ORDER.map((suitKey) => {
                      const meta = SUIT_META[suitKey];
                      const isSel = pv.selectedSuitQ8 === suitKey;
                      return (
                        <button
                          key={suitKey}
                          type="button"
                          data-testid={`pv-q8-suit-btn-${suitKey}`}
                          onClick={() => handleSelectSuitQ8(suitKey)}
                          className={`px-2 py-0.5 font-anton text-xs border flex items-center gap-1 ${isSel ? 'bg-amber-400 text-black border-amber-300' : 'bg-black text-white border-slate-700'}`}
                        >
                          <span>{meta.symbol}</span>
                          <span>{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-cyan-500/30">
                <button
                  type="button"
                  data-testid="pv-log-question-btn"
                  onClick={handleRecordQuestionInLog}
                  className="px-4 py-1 border-2 border-cyan-200 bg-cyan-400 hover:bg-cyan-300 text-black font-anton text-xs uppercase flex items-center gap-1 cursor-pointer ml-auto"
                >
                  <Send size={12} />
                  <span>REVELAR RESPOSTA OFICIAL</span>
                </button>
              </div>

              {lastAnsweredBanner && (
                <div data-testid="pv-instant-answer-callout" className="p-2 border-2 border-emerald-400 bg-emerald-950/90 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[9px] font-mono-code text-emerald-300 font-bold uppercase">
                      RESPOSTA DA PERGUNTA:
                    </div>
                    <div className="font-anton text-sm md:text-base text-white uppercase">
                      {lastAnsweredBanner.answer}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdvanceNextRoundWithRecharge}
                    className="px-3 py-1 border border-amber-300 bg-amber-400 hover:bg-amber-300 text-black font-anton text-xs uppercase cursor-pointer shrink-0"
                  >
                    ➡️ Concluir Turno (+2 Fichas)
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* 3x4 GRID OF 11 QUESTIONS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1">
            {OFFICIAL_11_QUESTIONS.map((q) => {
              const isSelected = pv.selectedQuestionNumber === q.number;
              return (
                <button
                  key={q.number}
                  type="button"
                  data-testid={`pv-question-card-${q.number}`}
                  onClick={() => handleSelectQuestion(q.number)}
                  className={`p-2 border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-cyan-300 bg-cyan-950 text-cyan-100 shadow-md font-bold'
                      : 'border-slate-800 bg-black/70 hover:border-cyan-500/60 text-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 shrink-0 font-anton text-xs flex items-center justify-center border ${isSelected ? 'bg-cyan-400 text-black' : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'}`}>
                    #{q.number}
                  </span>
                  <span className="font-anton text-xs uppercase truncate leading-tight">
                    {q.shortTitle.replace(/^#\d+\s*/, '')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* FASE D: MODO DE REVELAÇÃO & PALPITE SECRETO DAS 8 CARTAS */
        <div data-testid="pv-truth-declaration-panel" className="flex-1 min-h-0 border-2 border-rose-500 bg-[#0d0712] p-2.5 gap-2 flex flex-col justify-between overflow-y-auto scrollbar-none shadow-neon-rose">
          {/* Real Cards of Target Opponent (Secret Toggle) */}
          {targetOpponent && pv.playerHands[targetOpponent.id]?.length === 8 && (
            <div className="p-2 border border-rose-500/40 bg-black/70 rounded flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between text-[10px] font-mono-code">
                <div className="flex items-center gap-1.5 text-rose-300 font-bold uppercase">
                  <Eye size={12} className="text-rose-400" />
                  <span>MÃO OFICIAL DE {targetOpponent.name.toUpperCase()} (GABARITO SECRETO):</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTick();
                    const current = pv.revealedCards[targetOpponent.id] || new Array(8).fill(false);
                    const allOpen = current.every(Boolean);
                    handleRevealAllForPlayer(targetOpponent.id, !allOpen);
                  }}
                  className="px-2 py-0.5 border border-rose-400/60 bg-rose-950/70 hover:bg-rose-500 hover:text-white text-rose-200 text-[9px] font-mono-code font-bold uppercase cursor-pointer"
                >
                  {(pv.revealedCards[targetOpponent.id] || []).every(Boolean) ? 'Ocultar Todas' : 'Revelar Todas na TV'}
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 pt-1">
                {(pv.playerHands[targetOpponent.id] || []).map((realCard, sIdx) => {
                  const isCardOpen = Boolean(pv.revealedCards[targetOpponent.id]?.[sIdx]);
                  const deckStyle: PVDeckStyle = pv.deckStyle || room.customConfig?.pvDeckStyle || 'padrao';
                  return (
                    <div
                      key={sIdx}
                      onClick={() => handleToggleSingleCardReveal(targetOpponent.id, sIdx)}
                      className="cursor-pointer"
                      title={isCardOpen ? 'Clique para ocultar esta carta' : 'Clique para revelar esta carta'}
                    >
                      {isCardOpen ? (
                        <PlayingCardView
                          card={realCard}
                          styleMode={deckStyle}
                          slotLabel={`${sIdx + 1}ª`}
                        />
                      ) : (
                        <div className="h-20 sm:h-24 border-2 border-dashed border-slate-700 bg-slate-950/80 p-1 flex flex-col items-center justify-center text-center hover:border-rose-400 rounded">
                          <span className="text-[9px] font-mono-code text-slate-500 font-bold">{sIdx + 1}ª POS</span>
                          <span className="text-base my-auto opacity-40">🔒</span>
                          <span className="text-[8px] font-mono-code text-slate-500">OCULTA</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/40 pb-1 shrink-0">
            <div>
              <div className="text-[10px] font-mono-code text-rose-300 font-bold uppercase">
                👁️ MODO DE REVELAÇÃO — POSIÇÕES SALVAS AUTOMATICAMENTE
              </div>
              <h2 className="font-anton text-sm md:text-base text-white uppercase">
                Monte a sequência de <span className="text-rose-400">{targetOpponent?.name}</span> (1ª a 8ª Posição):
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 border border-amber-400/60 bg-black text-amber-300 font-mono-code text-[10px] font-bold">
                {truthFilledCount} / 8 POSICIONADAS
              </span>
              <button
                type="button"
                data-testid="pv-truth-clear-slots-btn"
                onClick={handleClearTruthSlotsForTarget}
                className="px-2.5 py-1 border border-slate-700 bg-black hover:border-rose-400 text-slate-300 font-mono-code text-[10px] font-bold uppercase cursor-pointer"
              >
                Limpar Posições
              </button>
            </div>
          </div>

          {/* Non-leaking Palpite Feedback Banner (only displayed when clicking Palpitar) */}
          <AnimatePresence>
            {pv.lastTruthAttemptMessage && (
              <motion.div
                data-testid="pv-truth-feedback-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-2 border-2 border-rose-500 bg-rose-950/90 text-white flex items-center justify-between gap-2 text-xs font-mono-code font-bold shrink-0"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-rose-300 shrink-0" />
                  <span>{pv.lastTruthAttemptMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePVState((prev) => ({
                      ...prev,
                      lastTruthAttemptMessage: null
                    }))
                  }
                  className="px-1.5 py-0.5 border border-rose-400/50 text-[10px] text-rose-200 cursor-pointer"
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 8 SAVED DEDUCTION / REVELATION SLOTS (NO VALIDATION OR SPOILERS ON PLACEMENT) */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 shrink-0">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) => {
              const card = currentTargetTruthSlots[slotIdx];
              const isSelectedSlot = truthSelectedSlotIdx === slotIdx;
              const deckStyle: PVDeckStyle = pv.deckStyle || room.customConfig?.pvDeckStyle || 'padrao';

              return (
                <div
                  key={slotIdx}
                  data-testid={`pv-card-slot-${targetOpponent?.id}-${slotIdx + 1}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (truthDraggedCard) {
                      handlePlaceCardInTruthSlot(
                        truthDraggedCard.card,
                        slotIdx,
                        truthDraggedCard.fromSlotIndex
                      );
                      setTruthDraggedCard(null);
                    }
                  }}
                  draggable={Boolean(card)}
                  onDragStart={() => {
                    if (card) setTruthDraggedCard({ card, fromSlotIndex: slotIdx });
                  }}
                >
                  <PlayingCardView
                    card={card}
                    styleMode={deckStyle}
                    slotLabel={`${slotIdx + 1}ª POS`}
                    isSelected={isSelectedSlot}
                    onClick={() => setTruthSelectedSlotIdx(slotIdx)}
                    onRemove={card ? () => handleRemoveCardFromTruthSlot(slotIdx) : undefined}
                  />
                </div>
              );
            })}
          </div>

          {/* FULL 52-CARD PICKER FOR REVELATION SLOTS */}
          <div className="space-y-1 pt-1 border-t border-rose-500/30 flex-1 min-h-0 overflow-y-auto scrollbar-none">
            <div className="flex items-center justify-between text-[10px] font-mono-code text-rose-200 font-bold uppercase">
              <span>
                ESCOLHA OU ARRASTE UMA CARTA PARA A{' '}
                <strong className="text-amber-300">{truthSelectedSlotIdx + 1}ª POSIÇÃO</strong>:
              </span>
              <span className="text-[9px] text-slate-400">
                As cartas ficam salvas na posição escolhida sem revelar acertos/erros
              </span>
            </div>

            <div className="space-y-1">
              {SUIT_ORDER.map((suitKey) => {
                const suitMeta = SUIT_META[suitKey];
                const suitCards = FULL_52_DECK.filter((c) => c.suit === suitKey);
                const isRed = suitKey === 'hearts' || suitKey === 'diamonds';

                return (
                  <div key={suitKey} className="p-1 border border-slate-800 bg-black/80 flex items-center gap-1.5">
                    <span className={`w-16 font-anton text-[10px] uppercase flex items-center gap-1 shrink-0 ${isRed ? 'text-rose-400' : 'text-cyan-300'}`}>
                      <span>{suitMeta.symbol}</span>
                      <span>{suitMeta.name}</span>
                    </span>

                    <div className="grid grid-cols-13 gap-1 flex-1">
                      {suitCards.map((card) => {
                        const placedSlotIdx = cardsInCurrentTruthSlots.get(card.id);
                        const isPlaced = placedSlotIdx !== undefined;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            data-testid={`pv-truth-deck-card-${card.id}`}
                            draggable
                            onDragStart={() => {
                              setTruthDraggedCard({
                                card,
                                fromSlotIndex: placedSlotIdx
                              });
                            }}
                            onClick={() => {
                              handlePlaceCardInTruthSlot(card, truthSelectedSlotIdx, placedSlotIdx);
                            }}
                            className={`h-7 border font-anton text-[10px] flex items-center justify-center relative transition-all cursor-pointer ${
                              isPlaced
                                ? 'border-amber-400 bg-amber-950/70 text-amber-200 shadow-sm'
                                : isRed
                                ? 'border-rose-500/60 bg-[#1a0812] hover:bg-rose-500 hover:text-white text-rose-300'
                                : 'border-cyan-500/60 bg-[#081524] hover:bg-cyan-400 hover:text-black text-cyan-200'
                            }`}
                          >
                            <span>{card.label}</span>
                            {isPlaced && (
                              <span className="absolute -top-1 -right-1 px-0.5 bg-amber-400 text-black font-mono-code text-[7px] font-bold leading-none">
                                {placedSlotIdx + 1}ª
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1 border-t border-rose-500/30 shrink-0">
            <button
              type="button"
              onClick={() => setActionMode('QUESTION')}
              className="px-3 py-1.5 border border-slate-700 bg-black text-slate-300 font-mono-code text-xs uppercase cursor-pointer"
            >
              ⬅️ Voltar às Perguntas
            </button>

            <button
              type="button"
              data-testid="pv-confirm-truth-declaration-btn"
              onClick={handleConfirmTruthAttempt}
              className="px-5 py-1.5 border-2 border-rose-400 bg-rose-600 hover:bg-rose-500 text-white font-anton text-xs uppercase tracking-wider cursor-pointer shadow-neon-rose"
            >
              🎯 PALPITAR ({truthFilledCount}/8)
            </button>
          </div>
        </div>
      )}

      {/* Collapsible History & Deduction Scratchpad Drawers */}
      <div className="pt-1 border-t border-slate-800/80 shrink-0 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-code">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sounds.playTick();
              setIsHistoryOpen(!isHistoryOpen);
            }}
            className="text-cyan-400 hover:text-cyan-200 cursor-pointer font-bold"
          >
            📜 {isHistoryOpen ? 'Ocultar' : 'Ver'} Histórico de Pistas ({pv.questionHistory.length})
          </button>

          <button
            type="button"
            data-testid="pv-deduction-scratchpad-btn"
            onClick={() => {
              sounds.playTick();
              setIsBenchOpen(!isBenchOpen);
            }}
            className={`px-2 py-0.5 border font-bold uppercase cursor-pointer transition-colors ${
              isBenchOpen
                ? 'border-cyan-400 bg-cyan-400 text-black'
                : 'border-cyan-500/60 bg-cyan-950/60 text-cyan-200 hover:border-cyan-300'
            }`}
          >
            📝 Bloco de Dedução (8 Cartas)
          </button>
        </div>

        <button
          type="button"
          data-testid="pv-manual-winner-btn"
          onClick={() => {
            sounds.playPowerup();
            setShowManualWinnerModal(true);
          }}
          className="px-2 py-0.5 border border-amber-400 bg-amber-950 text-amber-300 font-anton text-[10px] uppercase cursor-pointer"
        >
          🏆 Crowner
        </button>
      </div>

      {isBenchOpen && (
        <div
          data-testid="pv-deduction-scratchpad-panel"
          className="p-2 border border-cyan-400/70 bg-[#080f1d] space-y-1.5 text-[10px] font-mono-code shrink-0"
        >
          <div className="flex items-center justify-between text-cyan-300 font-bold uppercase">
            <span>📝 BLOCO DE DEDUÇÃO RÁPIDA (ANOTE CANDIDATOS PARA AS 8 CARTAS DE {targetOpponent?.name?.toUpperCase()}):</span>
            <button
              type="button"
              onClick={() => setDeductionNotes(new Array(8).fill(''))}
              className="text-[9px] text-rose-300 hover:underline cursor-pointer"
            >
              Limpar Notas
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) => (
              <div key={slotIdx} className="border border-cyan-500/40 bg-black/80 p-1 space-y-0.5">
                <div className="text-[9px] text-amber-300 font-bold">{slotIdx + 1}ª CARTA</div>
                <input
                  type="text"
                  data-testid={`pv-deduction-note-${slotIdx + 1}`}
                  value={deductionNotes[slotIdx] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDeductionNotes((prev) => {
                      const next = [...prev];
                      next[slotIdx] = val;
                      return next;
                    });
                  }}
                  placeholder="Ex: 3♠ ou 4♥"
                  className="w-full bg-transparent border-b border-slate-700 focus:border-cyan-400 text-[10px] text-white focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {isHistoryOpen && pv.questionHistory.length > 0 && (
        <div data-testid="pv-question-history-log" className="p-2 border border-slate-800 bg-black/80 max-h-24 overflow-y-auto space-y-1 text-[10px] font-mono-code shrink-0">
          {pv.questionHistory.map((item) => (
            <div key={item.id} className="p-1 border border-slate-800/60">
              <span className="text-amber-300">T#{item.roundNumber}</span> · {item.askerName} ➔ {item.targetName}: "{item.formattedQuestion}" ➔ <strong className="text-emerald-300">{item.answerSummary}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Manual Winner Modal */}
      {showManualWinnerModal && (
        <div data-testid="pv-manual-winner-modal" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full border-2 border-amber-400 bg-[#0b0d18] p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-amber-500/40 pb-2">
              <div className="font-anton text-base text-amber-300 uppercase flex items-center gap-2">
                <Trophy size={16} />
                <span>CONFIRMAR VENCEDOR DA RODADA</span>
              </div>
              <button
                type="button"
                onClick={() => setShowManualWinnerModal(false)}
                className="px-2 py-0.5 border border-slate-700 text-xs font-mono-code text-slate-300 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {activePlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`pv-crown-winner-${p.id}`}
                  onClick={() => {
                    setShowManualWinnerModal(false);
                    handleAwardRoundWinToPlayer(p.id, `${p.name} venceu a rodada!`);
                  }}
                  className="p-2.5 border border-amber-400/80 bg-amber-950/40 hover:bg-amber-400 hover:text-black text-white font-anton text-xs uppercase flex items-center gap-2 cursor-pointer"
                >
                  <span>{p.avatar}</span>
                  <span>🏆 {p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
