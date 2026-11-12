import type { Player } from '../../../types/game';
import { FULL_52_DECK } from './pvConstants';
import { themeBadge } from '../../../utils/themeUtils';
import React from 'react';
import { GameRoom, PerguntasEVerdadesGameState, PVDeckStyle } from '../../../types/game';
import { PlayingCardView } from '../../PlayingCardView';
import { SUIT_META, SUIT_ORDER, PVCard } from '../../../utils/perguntasEVerdadesEngine';
import { sounds } from '../../../utils/soundEffects';
import { CheckCircle2, Shuffle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PVDeckSetupViewProps {
  tvWrapperClass: "h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 text-xs select-none";
  matchRoundNumber: number;
  totalMatchRounds: number;
  currentSetupPlayer: Player;
  setupPlayerIndex: number;
  activePlayers: Player[];
  handleAutoDealAllHands: () => void;
  room: GameRoom;
  setupRuleError: string | null;
  filledCount: number;
  setupSlots: (PVCard | null)[];
  selectedSlotIdx: number;
  conflictingSlotIdx: number | null;
  pv: PerguntasEVerdadesGameState;
  draggedCard: { card: PVCard; fromSlotIndex?: number; } | null;
  attemptPlaceCardInSlot: (card: PVCard, targetIndex: number, sourceSlotIndex?: number) => void;
  setDraggedCard: React.Dispatch<React.SetStateAction<{ card: PVCard; fromSlotIndex?: number; } | null>>;
  setSelectedSlotIdx: React.Dispatch<React.SetStateAction<number>>;
  handleRemoveCardFromSlot: (slotIdx: number) => void;
  handleFillRandomValidHandForCurrentPlayer: () => void;
  setSetupSlots: React.Dispatch<React.SetStateAction<(PVCard | null)[]>>;
  setSetupRuleError: React.Dispatch<React.SetStateAction<string | null>>;
  setConflictingSlotIdx: React.Dispatch<React.SetStateAction<number | null>>;
  handleConfirmCurrentPlayerHand: () => void;
  cardsInCurrentSlots: Set<string>;
  cardsUsedByOtherPlayers: Set<string>;
}

export const PVDeckSetupView: React.FC<PVDeckSetupViewProps> = ({
  tvWrapperClass,
  matchRoundNumber,
  totalMatchRounds,
  currentSetupPlayer,
  setupPlayerIndex,
  activePlayers,
  handleAutoDealAllHands,
  room,
  setupRuleError,
  filledCount,
  setupSlots,
  selectedSlotIdx,
  conflictingSlotIdx,
  pv,
  draggedCard,
  attemptPlaceCardInSlot,
  setDraggedCard,
  setSelectedSlotIdx,
  handleRemoveCardFromSlot,
  handleFillRandomValidHandForCurrentPlayer,
  setSetupSlots,
  setSetupRuleError,
  setConflictingSlotIdx,
  handleConfirmCurrentPlayerHand,
  cardsInCurrentSlots,
  cardsUsedByOtherPlayers
}) => {
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
};
