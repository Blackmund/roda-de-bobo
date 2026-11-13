import type { Player } from '../../../types/game';
import { FULL_52_DECK } from './pvConstants';
import React, { useEffect, useRef, useState } from 'react';
import { GameRoom, PerguntasEVerdadesGameState, PVDeckStyle } from '../../../types/game';
import { PlayingCardView, SuitPip, attachCardDragImage } from '../../PlayingCardView';
import {
  SUIT_META,
  SUIT_ORDER,
  PVCard,
  validateCardMoveOrSwapInSlots
} from '../../../utils/perguntasEVerdadesEngine';
import { sounds } from '../../../utils/soundEffects';
import { Check, Shuffle, Eraser, Info, FastForward } from 'lucide-react';
import { PlayerMark } from '../../rdb/PlayerMark';

interface PVDeckSetupViewProps {
  tvWrapperClass: string;
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
  draggedCard: { card: PVCard; fromSlotIndex?: number } | null;
  attemptPlaceCardInSlot: (card: PVCard, targetIndex: number, sourceSlotIndex?: number) => void;
  setDraggedCard: React.Dispatch<React.SetStateAction<{ card: PVCard; fromSlotIndex?: number } | null>>;
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
  cardsInCurrentSlots
}) => {
  const deckStyle: PVDeckStyle = pv.deckStyle || room.customConfig?.pvDeckStyle || 'padrao';
  const isLast = setupPlayerIndex >= activePlayers.length - 1;
  const [dragOverSlotIdx, setDragOverSlotIdx] = useState<number | null>(null);
  const [justPlacedSlotIdx, setJustPlacedSlotIdx] = useState<number | null>(null);
  const prevSlotIdsRef = useRef<string[]>(setupSlots.map((c) => c?.id || ''));

  useEffect(() => {
    const nextIds = setupSlots.map((c) => c?.id || '');
    const changedIdx = nextIds.findIndex(
      (id, idx) => Boolean(id) && id !== prevSlotIdsRef.current[idx]
    );
    prevSlotIdsRef.current = nextIds;
    if (changedIdx !== -1) {
      setJustPlacedSlotIdx(changedIdx);
      const timer = window.setTimeout(() => {
        setJustPlacedSlotIdx((cur) => (cur === changedIdx ? null : cur));
      }, 240);
      return () => window.clearTimeout(timer);
    }
  }, [setupSlots]);

  return (
    <div data-testid="screen-perguntas-e-verdades" className="rdb-pro">
      <div data-testid="pv-deck-setup-screen" className="rdb-pv-body">
        <header className="rdb-lim-bar">
          <span className="rdb-lim-title">
            Montar a mão
            <span className="rdb-lim-round">
              Rodada {matchRoundNumber}
              {totalMatchRounds > 1 ? `/${totalMatchRounds}` : ''}
            </span>
          </span>
          <span
            className="rdb-lim-rule"
            tabIndex={0}
            data-tip="Escolha 8 cartas do seu baralho. Cartas do mesmo naipe precisam ficar em ordem crescente da esquerda para a direita."
          >
            <Info size={16} />
          </span>
          <div className="rdb-lim-tools">
            <span data-testid="pv-setup-current-player-banner" className="rdb-tag">
              <PlayerMark p={currentSetupPlayer} /> {currentSetupPlayer.name} ({setupPlayerIndex + 1}/{activePlayers.length})
            </span>
            <button
              type="button"
              data-testid="pv-auto-deal-all-btn"
              className="rdb-lim-icon"
              aria-label="Sortear as mãos de todos e avançar"
              data-tip="Sortear as mãos de todos e avançar"
              onClick={handleAutoDealAllHands}
            >
              <FastForward size={16} />
            </button>
          </div>
        </header>

        {setupRuleError && (
          <div data-testid="pv-setup-rule-error" className="rdb-pv-banner is-bad">
            <span>{setupRuleError}</span>
          </div>
        )}

        <div className="rdb-pv-slots">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) => {
            const card = setupSlots[slotIdx];
            const isDraggingThis = Boolean(
              draggedCard && draggedCard.fromSlotIndex === slotIdx
            );
            const isOver = dragOverSlotIdx === slotIdx && Boolean(draggedCard);
            const canDropHere =
              isOver && draggedCard
                ? validateCardMoveOrSwapInSlots(
                    setupSlots,
                    slotIdx,
                    draggedCard.card,
                    draggedCard.fromSlotIndex
                  ).valid
                : false;

            const slotClass =
              'rdb-pv-slot-wrap' +
              (card ? ' has-card' : '') +
              (isDraggingThis ? ' is-dragging' : '') +
              (isOver ? (canDropHere ? ' is-drop-valid' : ' is-drop-invalid') : '') +
              (justPlacedSlotIdx === slotIdx ? ' is-just-placed' : '') +
              (conflictingSlotIdx === slotIdx ? ' is-conflict-wrap' : '');

            return (
              <div
                key={slotIdx}
                data-testid={`pv-setup-slot-${slotIdx + 1}`}
                className={slotClass}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (draggedCard) setDragOverSlotIdx(slotIdx);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedCard && e.dataTransfer) {
                    const valid = validateCardMoveOrSwapInSlots(
                      setupSlots,
                      slotIdx,
                      draggedCard.card,
                      draggedCard.fromSlotIndex
                    ).valid;
                    e.dataTransfer.dropEffect = valid ? 'move' : 'none';
                    if (dragOverSlotIdx !== slotIdx) setDragOverSlotIdx(slotIdx);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverSlotIdx((cur) => (cur === slotIdx ? null : cur));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSlotIdx(null);
                  if (draggedCard) {
                    attemptPlaceCardInSlot(draggedCard.card, slotIdx, draggedCard.fromSlotIndex);
                    setDraggedCard(null);
                  }
                }}
                draggable={Boolean(card)}
                onDragStart={(e) => {
                  if (!card) return;
                  attachCardDragImage(e, card);
                  setDraggedCard({ card, fromSlotIndex: slotIdx });
                }}
                onDragEnd={() => {
                  setDraggedCard(null);
                  setDragOverSlotIdx(null);
                }}
              >
                <PlayingCardView
                  card={card}
                  styleMode={deckStyle}
                  slotLabel={`${slotIdx + 1}ª POS`}
                  isSelected={selectedSlotIdx === slotIdx}
                  isConflict={conflictingSlotIdx === slotIdx}
                  onClick={() => setSelectedSlotIdx(slotIdx)}
                  onRemove={card ? () => handleRemoveCardFromSlot(slotIdx) : undefined}
                />
              </div>
            );
          })}
        </div>

        <div className="rdb-pv-deck rdb-pv-scroll">
          <div className="rdb-pro-label" style={{ position: 'static', alignSelf: 'flex-start' }}>
            Baralho · clique ou arraste para a {selectedSlotIdx + 1}ª posição · {filledCount}/8
          </div>
          {SUIT_ORDER.map((suitKey) => {
            const suitMeta = SUIT_META[suitKey];
            const suitCards = FULL_52_DECK.filter((c) => c.suit === suitKey);
            const isRed = suitKey === 'hearts' || suitKey === 'diamonds';
            return (
              <div key={suitKey} className="rdb-pv-suit">
                <span className={'rdb-pv-suit-name' + (isRed ? ' is-red' : '')} data-tip={suitMeta.name}>
                  <SuitPip suit={suitKey} className="rdb-pv-pip is-deck" />
                </span>
                <div className="rdb-pv-suit-cards">
                  {suitCards.map((card) => {
                    const alreadyUsed = cardsInCurrentSlots.has(card.id);
                    const validForSelected = alreadyUsed
                      ? true
                      : validateCardMoveOrSwapInSlots(setupSlots, selectedSlotIdx, card).valid;
                    const isDraggingThis = Boolean(
                      draggedCard && draggedCard.card.id === card.id && draggedCard.fromSlotIndex === undefined
                    );

                    return (
                      <button
                        key={card.id}
                        type="button"
                        data-testid={`pv-deck-card-${card.id}`}
                        className={
                          'rdb-pv-card' +
                          (isRed ? ' is-red' : '') +
                          (!alreadyUsed && !validForSelected ? ' is-blocked-for-slot' : '') +
                          (isDraggingThis ? ' is-dragging' : '')
                        }
                        disabled={alreadyUsed}
                        draggable={!alreadyUsed}
                        onDragStart={(e) => {
                          if (alreadyUsed) return;
                          attachCardDragImage(e, card);
                          setDraggedCard({ card });
                        }}
                        onDragEnd={() => {
                          setDraggedCard(null);
                          setDragOverSlotIdx(null);
                        }}
                        onClick={() => {
                          if (!alreadyUsed) attemptPlaceCardInSlot(card, selectedSlotIdx);
                        }}
                      >
                        {card.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="rdb-pro-foot">
          <button
            type="button"
            data-testid="pv-setup-random-hand-btn"
            className="rdb-btn"
            onClick={handleFillRandomValidHandForCurrentPlayer}
            data-tip="Sorteia uma mão válida para este jogador"
          >
            <Shuffle /> Sortear mão
          </button>
          <button
            type="button"
            data-testid="pv-setup-clear-hand-btn"
            className="rdb-btn"
            data-tip="Tira todas as cartas"
            onClick={() => {
              sounds.playTick();
              setSetupSlots(new Array(8).fill(null));
              setSelectedSlotIdx(0);
              setSetupRuleError(null);
              setConflictingSlotIdx(null);
            }}
          >
            <Eraser /> Limpar
          </button>
          <div className="rdb-pro-foot-end">
            <button
              type="button"
              data-testid="pv-setup-confirm-hand-btn"
              className="rdb-btn rdb-pro-hit"
              onClick={handleConfirmCurrentPlayerHand}
              disabled={filledCount < 8}
            >
              <Check /> {isLast ? 'Confirmar e iniciar' : `Confirmar · próximo`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
