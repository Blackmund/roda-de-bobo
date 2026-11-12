import type { Player } from '../../../types/game';
import type { PVQuestionDefinition } from '../../../utils/perguntasEVerdadesEngine';
import { ALL_CARD_VALUES, FULL_52_DECK } from './pvConstants';
import { themeBadge } from '../../../utils/themeUtils';
import React from 'react';
import { GameRoom, PerguntasEVerdadesGameState, PVDeckStyle } from '../../../types/game';
import { PlayingCardView } from '../../PlayingCardView';
import { OFFICIAL_11_QUESTIONS, SUIT_META, SUIT_ORDER, PVSuit, PVCard, PVCardValue, formatCardValueLabel } from '../../../utils/perguntasEVerdadesEngine';
import { sounds } from '../../../utils/soundEffects';
import { Clock, Pause, Play, Trophy, Eye, Coins, Send, History, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PlayerMark } from '../../rdb/PlayerMark';

interface PVPlayingViewProps {
  tvWrapperClass: "h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 text-xs select-none";
  pv: PerguntasEVerdadesGameState;
  handleStartNextMatchRound: () => void;
  totalMatchRounds: number;
  matchRoundNumber: number;
  activeTurnPlayer: Player;
  formatTimer: (sec: number) => string | React.JSX.Element;
  onUpdatePVState: (updater: (prev: PerguntasEVerdadesGameState) => PerguntasEVerdadesGameState) => void;
  renderPlayerRosterStrip: () => React.JSX.Element;
  room: GameRoom;
  setActionMode: React.Dispatch<React.SetStateAction<"QUESTION" | "TRUTH">>;
  actionMode: "QUESTION" | "TRUTH";
  targetOpponent: Player;
  activeQuestionObj: PVQuestionDefinition | undefined;
  formattedActiveQuestion: string;
  handleTogglePosForQ1: (pos1Based: number) => void;
  handleSelectValueQ7: (val: PVCardValue) => void;
  handleSelectSuitQ8: (suit: PVSuit) => void;
  handleRecordQuestionInLog: () => void;
  lastAnsweredBanner: { question: string; answer: string; asker: string; target?: string; } | null;
  handleAdvanceNextRoundWithRecharge: () => void;
  handleSelectQuestion: (questionNumber: number) => void;
  handleRevealAllForPlayer: (playerId: string, reveal: boolean) => void;
  handleToggleSingleCardReveal: (playerId: string, slotIndex: number) => void;
  truthFilledCount: number;
  handleClearTruthSlotsForTarget: () => void;
  currentTargetTruthSlots: (PVCard | null)[];
  truthSelectedSlotIdx: number;
  truthDraggedCard: { card: PVCard; fromSlotIndex?: number; } | null;
  handlePlaceCardInTruthSlot: (card: PVCard, targetIndex: number, sourceSlotIndex?: number) => void;
  setTruthDraggedCard: React.Dispatch<React.SetStateAction<{ card: PVCard; fromSlotIndex?: number; } | null>>;
  setTruthSelectedSlotIdx: React.Dispatch<React.SetStateAction<number>>;
  handleRemoveCardFromTruthSlot: (slotIdx: number) => void;
  cardsInCurrentTruthSlots: Map<string, number>;
  handleConfirmTruthAttempt: () => void;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isHistoryOpen: boolean;
  setIsBenchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isBenchOpen: boolean;
  setShowManualWinnerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setDeductionNotes: React.Dispatch<React.SetStateAction<string[]>>;
  deductionNotes: string[];
  showManualWinnerModal: boolean;
  activePlayers: Player[];
  handleAwardRoundWinToPlayer: (winnerId: string, winDescription: string) => void;
}

export const PVPlayingView: React.FC<PVPlayingViewProps> = ({
  tvWrapperClass,
  pv,
  handleStartNextMatchRound,
  totalMatchRounds,
  matchRoundNumber,
  activeTurnPlayer,
  formatTimer,
  onUpdatePVState,
  renderPlayerRosterStrip,
  room,
  setActionMode,
  actionMode,
  targetOpponent,
  activeQuestionObj,
  formattedActiveQuestion,
  handleTogglePosForQ1,
  handleSelectValueQ7,
  handleSelectSuitQ8,
  handleRecordQuestionInLog,
  lastAnsweredBanner,
  handleAdvanceNextRoundWithRecharge,
  handleSelectQuestion,
  handleRevealAllForPlayer,
  handleToggleSingleCardReveal,
  truthFilledCount,
  handleClearTruthSlotsForTarget,
  currentTargetTruthSlots,
  truthSelectedSlotIdx,
  truthDraggedCard,
  handlePlaceCardInTruthSlot,
  setTruthDraggedCard,
  setTruthSelectedSlotIdx,
  handleRemoveCardFromTruthSlot,
  cardsInCurrentTruthSlots,
  handleConfirmTruthAttempt,
  setIsHistoryOpen,
  isHistoryOpen,
  setIsBenchOpen,
  isBenchOpen,
  setShowManualWinnerModal,
  setDeductionNotes,
  deductionNotes,
  showManualWinnerModal,
  activePlayers,
  handleAwardRoundWinToPlayer
}) => {
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
              aria-disabled={truthFilledCount < 8}
              title={truthFilledCount < 8 ? `Faltam ${8 - truthFilledCount} cartas para palpitar` : "Confirmar o palpite"}
              className={`active:scale-95 transition-transform ${truthFilledCount < 8 ? "opacity-70 " : ""}px-5 py-1.5 border-2 border-rose-400 bg-rose-600 hover:bg-rose-500 text-white font-anton text-xs uppercase tracking-wider cursor-pointer shadow-neon-rose`}
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
                  <span><PlayerMark p={p} /></span>
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
