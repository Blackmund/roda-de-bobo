import type { Player } from '../../../types/game';
import type { PVQuestionDefinition } from '../../../utils/perguntasEVerdadesEngine';
import { ALL_CARD_VALUES, FULL_52_DECK } from './pvConstants';
import { themeBadge } from '../../../utils/themeUtils';
import React from 'react';
import { GameRoom, PerguntasEVerdadesGameState, PVDeckStyle } from '../../../types/game';
import { PlayingCardView } from '../../PlayingCardView';
import { OFFICIAL_11_QUESTIONS, SUIT_META, SUIT_ORDER, PVSuit, PVCard, PVCardValue, formatCardValueLabel } from '../../../utils/perguntasEVerdadesEngine';
import { sounds } from '../../../utils/soundEffects';
import { Clock, Pause, Play, Trophy, Eye, EyeOff, Coins, Send, History, ArrowRight, ArrowLeft, Info, Lock, Eraser, Target, HelpCircle, NotebookPen, X as XIcon } from 'lucide-react';
import { PlayerMark } from '../../rdb/PlayerMark';

interface PVPlayingViewProps {
  tvWrapperClass: string;
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
  const deckStyle: PVDeckStyle = pv.deckStyle || room.customConfig?.pvDeckStyle || 'padrao';
  const targetHand = targetOpponent ? pv.playerHands[targetOpponent.id] || [] : [];
  const allOpen = targetOpponent ? (pv.revealedCards[targetOpponent.id] || []).every(Boolean) : false;

  return (
    <div data-testid="screen-perguntas-e-verdades" className="rdb-pro">
      {pv.phase === 'VICTORY' && pv.roundWinBannerMessage && (
        <div data-testid="pv-round-victory-banner" className="rdb-pv-banner is-ok">
          <span>{pv.roundWinBannerMessage.replace(/🏆\s*/g, '')}</span>
          <button
            type="button"
            data-testid="pv-next-match-round-btn"
            className="rdb-btn rdb-pro-hit"
            onClick={handleStartNextMatchRound}
          >
            Próxima rodada <ArrowRight />
          </button>
        </div>
      )}

      <header data-testid="pv-zona-a-header" className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Perguntas e Verdades
          <span data-testid="pv-series-round-badge" className="rdb-lim-round">
            {totalMatchRounds > 1 ? `Rodada ${matchRoundNumber}/${totalMatchRounds}` : `Rodada ${matchRoundNumber}`} · Turno {pv.auctionRound}
          </span>
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip="Escolha uma das 11 perguntas oficiais para o alvo, ou declare a verdade: monte as 8 cartas dele em ordem e palpite."
        >
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span className="rdb-lim-timer" data-tip="Tempo do turno">
            <Clock size={16} />
            <span data-testid="pv-turn-timer-display">{formatTimer(pv.timerSeconds)}</span>
          </span>
          <button
            type="button"
            data-testid="pv-timer-pause-btn"
            className="rdb-lim-icon"
            aria-label={pv.timerActive ? 'Pausar o tempo' : 'Retomar o tempo'}
            data-tip={pv.timerActive ? 'Pausar o tempo' : 'Retomar o tempo'}
            onClick={() => {
              sounds.playTick();
              onUpdatePVState((prev) => ({ ...prev, timerActive: !prev.timerActive }));
            }}
          >
            {pv.timerActive ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            data-testid="pv-phase-auction-btn"
            className="rdb-lim-icon"
            aria-label="Novo leilão de fichas"
            data-tip="Novo leilão de fichas (+2 para todos)"
            onClick={() => {
              sounds.playTick();
              onUpdatePVState((prev) => ({
                ...prev,
                phase: 'TOKEN_AUCTION',
                timerSeconds: prev.tokenTimerConfig,
                timerActive: prev.tokenTimerConfig > 0
              }));
            }}
          >
            <Coins size={16} />
          </button>
          <button
            type="button"
            className={'rdb-lim-icon' + (isHistoryOpen ? ' is-on' : '')}
            aria-pressed={isHistoryOpen}
            aria-label="Histórico de pistas"
            data-tip={`Histórico de pistas (${pv.questionHistory.length})`}
            onClick={() => {
              sounds.playTick();
              setIsHistoryOpen(!isHistoryOpen);
            }}
          >
            <History size={16} />
          </button>
          <button
            type="button"
            data-testid="pv-deduction-scratchpad-btn"
            className={'rdb-lim-icon' + (isBenchOpen ? ' is-on' : '')}
            aria-pressed={isBenchOpen}
            aria-label="Bloco de dedução"
            data-tip="Bloco de dedução: anote candidatas para as 8 cartas"
            onClick={() => {
              sounds.playTick();
              setIsBenchOpen(!isBenchOpen);
            }}
          >
            <NotebookPen size={16} />
          </button>
          <button
            type="button"
            data-testid="pv-manual-winner-btn"
            className="rdb-lim-icon"
            aria-label="Coroar vencedor da rodada"
            data-tip="Coroar o vencedor da rodada manualmente"
            onClick={() => {
              sounds.playPowerup();
              setShowManualWinnerModal(true);
            }}
          >
            <Trophy size={16} />
          </button>
        </div>
      </header>

      {renderPlayerRosterStrip()}

      <div className="rdb-pv-bar-modes" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
        <button
          type="button"
          data-testid="pv-mode-question-tab"
          className="rdb-btn"
          aria-pressed={actionMode === 'QUESTION'}
          onClick={() => {
            sounds.playTick();
            setActionMode('QUESTION');
          }}
        >
          <HelpCircle /> 11 perguntas
        </button>
        <button
          type="button"
          data-testid="pv-mode-truth-tab"
          className="rdb-btn rdb-btn--crimson"
          aria-pressed={actionMode === 'TRUTH'}
          onClick={() => {
            sounds.playTick();
            setActionMode('TRUTH');
          }}
        >
          <Eye /> Declarar a verdade
        </button>
        {actionMode === 'TRUTH' && targetOpponent && targetHand.length === 8 && (
          <button
            type="button"
            className={'rdb-lim-icon' + (allOpen ? ' is-on' : '')}
            aria-pressed={allOpen}
            aria-label={allOpen ? 'Ocultar a mão na TV' : 'Mostrar a mão na TV'}
            data-tip={allOpen ? 'Ocultar a mão de ' + targetOpponent.name + ' na TV' : 'Mostrar a mão de ' + targetOpponent.name + ' na TV'}
            onClick={() => {
              sounds.playTick();
              handleRevealAllForPlayer(targetOpponent.id, !allOpen);
            }}
          >
            {allOpen ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {actionMode === 'TRUTH' && (
          <>
            <span className="rdb-tag" data-tip="Cartas já postas no palpite">Palpite {truthFilledCount}/8</span>
            <button
              type="button"
              data-testid="pv-truth-clear-slots-btn"
              className="rdb-lim-icon"
              aria-label="Limpar as posições"
              data-tip="Limpar as posições"
              onClick={handleClearTruthSlotsForTarget}
            >
              <Eraser size={16} />
            </button>
          </>
        )}
        <span style={{ marginLeft: 'auto', fontWeight: 800, textTransform: 'uppercase' }}>
          {activeTurnPlayer?.name} <ArrowRight size={14} style={{ display: 'inline' }} /> {targetOpponent?.name}
        </span>
      </div>

      {actionMode === 'QUESTION' ? (
        <div data-testid="pv-zona-b-questions-panel" className="rdb-pv-body">
          {activeQuestionObj && (
            <div data-testid="pv-highlighted-question-banner" className="rdb-pv-spot">
              <div className="rdb-pv-spot-meta">
                <span>Pergunta {activeQuestionObj.number}</span>
                <span>{activeQuestionObj.category}</span>
              </div>
              <p data-testid="pv-highlighted-question-text" className="rdb-pv-spot-text">
                {formattedActiveQuestion}
              </p>

              {activeQuestionObj.number === 1 && (
                <div data-testid="pv-q1-position-selector" className="rdb-pv-pick">
                  3 posições:
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      data-testid={`pv-q1-pos-btn-${pos}`}
                      className={pv.selectedPositionsQ1.includes(pos) ? 'is-on' : ''}
                      onClick={() => handleTogglePosForQ1(pos)}
                    >
                      {pos}ª
                    </button>
                  ))}
                </div>
              )}

              {activeQuestionObj.number === 7 && (
                <div data-testid="pv-q7-value-selector" className="rdb-pv-pick">
                  Valor:
                  {ALL_CARD_VALUES.map((val) => (
                    <button
                      key={val}
                      type="button"
                      data-testid={`pv-q7-val-btn-${val}`}
                      className={pv.selectedValueQ7 === val ? 'is-on' : ''}
                      onClick={() => handleSelectValueQ7(val)}
                    >
                      {formatCardValueLabel(val)}
                    </button>
                  ))}
                </div>
              )}

              {activeQuestionObj.number === 8 && (
                <div data-testid="pv-q8-suit-selector" className="rdb-pv-pick">
                  Naipe:
                  {SUIT_ORDER.map((suitKey) => (
                    <button
                      key={suitKey}
                      type="button"
                      data-testid={`pv-q8-suit-btn-${suitKey}`}
                      className={pv.selectedSuitQ8 === suitKey ? 'is-on' : ''}
                      data-tip={SUIT_META[suitKey].label}
                      onClick={() => handleSelectSuitQ8(suitKey)}
                    >
                      {SUIT_META[suitKey].symbol}
                    </button>
                  ))}
                </div>
              )}

              {lastAnsweredBanner ? (
                <div data-testid="pv-instant-answer-callout" className="rdb-pv-banner is-ok">
                  <span>{lastAnsweredBanner.answer}</span>
                  <button type="button" className="rdb-btn rdb-pro-hit" onClick={handleAdvanceNextRoundWithRecharge}>
                    <ArrowRight /> Concluir turno (+2 fichas)
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="pv-log-question-btn"
                  className="rdb-btn rdb-pro-hit"
                  style={{ alignSelf: 'flex-end' }}
                  onClick={handleRecordQuestionInLog}
                >
                  <Send /> Revelar a resposta
                </button>
              )}
            </div>
          )}

          {!activeQuestionObj && (
            <div className="rdb-pv-qgrid">
              {OFFICIAL_11_QUESTIONS.map((q) => (
                <button
                  key={q.number}
                  type="button"
                  data-testid={`pv-question-card-${q.number}`}
                  className={'rdb-pv-q' + (pv.selectedQuestionNumber === q.number ? ' is-on' : '')}
                  onClick={() => handleSelectQuestion(q.number)}
                >
                  <span className="rdb-pv-q-n">{q.number}</span>
                  <span className="rdb-pv-q-t">{q.shortTitle.replace(/^#\d+\s*/, '')}</span>
                </button>
              ))}
            </div>
          )}

          {activeQuestionObj && (
            <div className="rdb-pv-qgrid" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gridAutoRows: 'minmax(0, 3rem)', flex: 'none' }}>
              {OFFICIAL_11_QUESTIONS.map((q) => (
                <button
                  key={q.number}
                  type="button"
                  data-testid={`pv-question-card-${q.number}`}
                  className={'rdb-pv-q' + (pv.selectedQuestionNumber === q.number ? ' is-on' : '')}
                  onClick={() => handleSelectQuestion(q.number)}
                  data-tip={q.shortTitle.replace(/^#\d+\s*/, '')}
                >
                  <span className="rdb-pv-q-n">{q.number}</span>
                  <span className="rdb-pv-q-t" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.shortTitle.replace(/^#\d+\s*/, '')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div data-testid="pv-truth-declaration-panel" className="rdb-pv-body">
          {targetOpponent && targetHand.length === 8 && (
            <>
              <div className="rdb-pv-hand">
                {targetHand.map((realCard, sIdx) => {
                  const open = Boolean(pv.revealedCards[targetOpponent.id]?.[sIdx]);
                  return (
                    <div key={sIdx} onClick={() => handleToggleSingleCardReveal(targetOpponent.id, sIdx)} style={{ cursor: 'pointer' }}>
                      {open ? (
                        <PlayingCardView card={realCard} styleMode={deckStyle} slotLabel={`${sIdx + 1}ª`} />
                      ) : (
                        <div className="rdb-pv-hidden" data-tip="Clique para revelar">
                          <Lock size={18} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {pv.lastTruthAttemptMessage && (
            <div data-testid="pv-truth-feedback-banner" className="rdb-pv-banner is-bad">
              <span>{pv.lastTruthAttemptMessage}</span>
              <button
                type="button"
                className="rdb-lim-icon"
                aria-label="Fechar"
                onClick={() => onUpdatePVState((prev) => ({ ...prev, lastTruthAttemptMessage: null }))}
              >
                <XIcon size={16} />
              </button>
            </div>
          )}

          <div className="rdb-pv-slots">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) => {
              const card = currentTargetTruthSlots[slotIdx];
              return (
                <div
                  key={slotIdx}
                  data-testid={`pv-card-slot-${targetOpponent?.id}-${slotIdx + 1}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (truthDraggedCard) {
                      handlePlaceCardInTruthSlot(truthDraggedCard.card, slotIdx, truthDraggedCard.fromSlotIndex);
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
                    isSelected={truthSelectedSlotIdx === slotIdx}
                    onClick={() => setTruthSelectedSlotIdx(slotIdx)}
                    onRemove={card ? () => handleRemoveCardFromTruthSlot(slotIdx) : undefined}
                  />
                </div>
              );
            })}
          </div>

          <div className="rdb-pv-deck rdb-pv-scroll">
            {SUIT_ORDER.map((suitKey) => {
              const suitMeta = SUIT_META[suitKey];
              const suitCards = FULL_52_DECK.filter((c) => c.suit === suitKey);
              const isRed = suitKey === 'hearts' || suitKey === 'diamonds';
              return (
                <div key={suitKey} className="rdb-pv-suit">
                  <span className={'rdb-pv-suit-name' + (isRed ? ' is-red' : '')} data-tip={suitMeta.name}>
                    {suitMeta.symbol}
                  </span>
                  <div className="rdb-pv-suit-cards">
                    {suitCards.map((card) => {
                      const placedSlotIdx = cardsInCurrentTruthSlots.get(card.id);
                      const isPlaced = placedSlotIdx !== undefined;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          data-testid={`pv-truth-deck-card-${card.id}`}
                          className={'rdb-pv-card' + (isRed ? ' is-red' : '') + (isPlaced ? ' is-placed' : '')}
                          draggable
                          onDragStart={() => setTruthDraggedCard({ card, fromSlotIndex: placedSlotIdx })}
                          onClick={() => handlePlaceCardInTruthSlot(card, truthSelectedSlotIdx, placedSlotIdx)}
                        >
                          {card.label}
                          {isPlaced && <sup>{placedSlotIdx + 1}</sup>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <footer className="rdb-pro-foot">
            <button type="button" className="rdb-btn" onClick={() => setActionMode('QUESTION')}>
              <ArrowLeft /> Perguntas
            </button>
            <div className="rdb-pro-foot-end">
              <button
                type="button"
                data-testid="pv-confirm-truth-declaration-btn"
                className="rdb-btn rdb-pro-hit"
                aria-disabled={truthFilledCount < 8}
                data-tip={truthFilledCount < 8 ? `Faltam ${8 - truthFilledCount} cartas para palpitar` : 'Confirmar o palpite'}
                style={truthFilledCount < 8 ? { opacity: 0.6 } : undefined}
                onClick={handleConfirmTruthAttempt}
              >
                <Target /> Palpitar ({truthFilledCount}/8)
              </button>
            </div>
          </footer>
        </div>
      )}

      {isBenchOpen && (
        <div data-testid="pv-deduction-scratchpad-panel" className="rdb-pv-notes">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) => (
            <input
              key={slotIdx}
              type="text"
              data-testid={`pv-deduction-note-${slotIdx + 1}`}
              aria-label={`Anotação da ${slotIdx + 1}ª carta`}
              value={deductionNotes[slotIdx] || ''}
              placeholder={`${slotIdx + 1}ª`}
              onChange={(e) => {
                const val = e.target.value;
                setDeductionNotes((prev) => {
                  const next = [...prev];
                  next[slotIdx] = val;
                  return next;
                });
              }}
            />
          ))}
        </div>
      )}

      {isHistoryOpen && pv.questionHistory.length > 0 && (
        <div data-testid="pv-question-history-log" className="rdb-pv-history">
          {pv.questionHistory.map((item) => (
            <div key={item.id}>
              T{item.roundNumber} · {item.askerName} → {item.targetName}: {item.formattedQuestion} → <strong>{item.answerSummary}</strong>
            </div>
          ))}
        </div>
      )}

      {showManualWinnerModal && (
        <div data-testid="pv-manual-winner-modal" className="rdb-pv-modal">
          <div className="rdb-pv-modal-box">
            <h3>Quem venceu a rodada?</h3>
            <div className="rdb-pv-modal-grid">
              {activePlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`pv-crown-winner-${p.id}`}
                  className="rdb-btn"
                  onClick={() => {
                    setShowManualWinnerModal(false);
                    handleAwardRoundWinToPlayer(p.id, `${p.name} venceu a rodada!`);
                  }}
                >
                  <PlayerMark p={p} /> {p.name}
                </button>
              ))}
            </div>
            <button type="button" className="rdb-btn" onClick={() => setShowManualWinnerModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
