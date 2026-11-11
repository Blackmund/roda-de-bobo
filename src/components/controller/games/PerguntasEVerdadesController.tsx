import React from 'react';
import { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { Coins, Shuffle, Calculator, Lock } from 'lucide-react';
import { createFull52Deck, validateSuitAscendingOrder, autoSortSameSuitCards, dealValidRandomHand, computeOfficialQuestionAnswer, formatOfficialQuestionText, formatCardValueLabel, SUIT_META, OFFICIAL_11_QUESTIONS, PVCard } from '../../../utils/perguntasEVerdadesEngine';

interface PerguntasEVerdadesControllerProps {
  room: GameRoom;
  player: Player;
  pvCalcQuestionNum: number;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  pvBidInput: number;
  wrapIfMultiMode: (...args: any[]) => any;
  setPvCalcQuestionNum: React.Dispatch<React.SetStateAction<number>>;
  setPvBidInput: React.Dispatch<React.SetStateAction<number>>;
}

export const PerguntasEVerdadesController: React.FC<PerguntasEVerdadesControllerProps> = ({
  room,
  player,
  pvCalcQuestionNum,
  onUpdateRoom,
  pvBidInput,
  wrapIfMultiMode,
  setPvCalcQuestionNum,
  setPvBidInput
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'perguntas-e-verdades' && room.perguntasEVerdades)) return null;

    const pv = room.perguntasEVerdades;
    const myTokens = pv.tokens[player.id] ?? 10;
    const myAlertLight = Boolean(pv.tokenAlertLight[player.id]);
    const myHand = pv.playerHands[player.id] || [];
    const isMyHandReady = Boolean(pv.handReady[player.id]);
    const myValidation = validateSuitAscendingOrder(myHand);
    const full52Deck = createFull52Deck();

    // Calculate answer automatically for whichever question is active on TV (or selected locally)
    const activeQNum = pv.selectedQuestionNumber || pvCalcQuestionNum;
    const autoCalcAnswer =
      myHand.length === 8
        ? computeOfficialQuestionAnswer(activeQNum, myHand, {
            positions1Based: pv.selectedPositionsQ1,
            targetValue: pv.selectedValueQ7,
            targetSuit: pv.selectedSuitQ8
          })
        : null;

    const handleToggleCardInHand = (card: PVCard) => {
      sounds.playTick();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        const current = prev.perguntasEVerdades.playerHands[player.id] || [];
        const exists = current.some((c) => c.id === card.id);
        let nextHand: PVCard[];
        if (exists) {
          nextHand = current.filter((c) => c.id !== card.id);
        } else {
          if (current.length >= 8) return prev;
          nextHand = [...current, card];
        }
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            playerHands: {
              ...prev.perguntasEVerdades.playerHands,
              [player.id]: nextHand
            },
            handReady: {
              ...prev.perguntasEVerdades.handReady,
              [player.id]: false
            }
          }
        };
      });
    };

    const handleAutoSortMyHand = () => {
      sounds.playSuccess();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        const current = prev.perguntasEVerdades.playerHands[player.id] || [];
        const sorted = autoSortSameSuitCards(current);
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            playerHands: {
              ...prev.perguntasEVerdades.playerHands,
              [player.id]: sorted
            }
          }
        };
      });
    };

    const handleDealRandomValidForMe = () => {
      sounds.playPowerup();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        const dealt = dealValidRandomHand();
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            playerHands: {
              ...prev.perguntasEVerdades.playerHands,
              [player.id]: dealt
            },
            handReady: {
              ...prev.perguntasEVerdades.handReady,
              [player.id]: true
            }
          }
        };
      });
    };

    const handleLockMyHand = () => {
      if (myHand.length !== 8 || !myValidation.valid) {
        sounds.playBuzzer();
        return;
      }
      sounds.playSuccess();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            handReady: {
              ...prev.perguntasEVerdades.handReady,
              [player.id]: true
            }
          }
        };
      });
    };

    const handleSubmitSecretTokenBid = () => {
      const clamped = Math.max(0, Math.min(myTokens, pvBidInput));
      sounds.playSuccess();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            currentBids: {
              ...prev.perguntasEVerdades.currentBids,
              [player.id]: clamped
            },
            bidSubmitted: {
              ...prev.perguntasEVerdades.bidSubmitted,
              [player.id]: true
            }
          }
        };
      });
    };

    return wrapIfMultiMode(
      <div
        data-testid="controller-perguntas-e-verdades"
        className="bg-[#07080d] p-3.5 flex flex-col justify-between max-w-md mx-auto space-y-4"
      >
        <div className="space-y-4">
          {/* 1. SECRET TOKEN WALLET & ALERT LIGHT STATUS */}
          <div className="border-2 border-amber-400 bg-gradient-to-r from-amber-950/60 via-black to-rose-950/50 p-3.5 flex items-center justify-between shadow-md">
            <div>
              <div className="text-[10px] font-mono-code text-amber-300 uppercase font-bold flex items-center gap-1">
                <Lock size={11} />
                <span>SEU SALDO SECRETO DE TOKENS</span>
              </div>
              <div
                data-testid="controller-pv-token-balance"
                className="font-anton text-3xl text-white tracking-wider"
              >
                🪙 {myTokens} TOKENS
              </div>
            </div>

            <div className="text-right">
              {myAlertLight ? (
                <div className="px-2.5 py-1 bg-rose-600 border border-rose-300 text-white font-mono-code text-[10px] font-bold uppercase animate-pulse">
                  🚨 ALERTA ≤ 5 LIGADO NA TV
                </div>
              ) : (
                <div className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono-code text-[10px] font-bold uppercase">
                  LED TV APAGADO (&gt;5)
                </div>
              )}
              <div className="text-[9px] font-mono-code text-slate-400 mt-1">
                +2 tokens no fim de cada rodada
              </div>
            </div>
          </div>

          {/* 2. DISCREET MATHEMATICAL AUTO-CALCULATOR ("COLA INTELIGENTE" P/ RESPONDER SEM ERRO) */}
          {myHand.length === 8 && autoCalcAnswer && (
            <div
              data-testid="controller-pv-math-calculator"
              className="border-2 border-emerald-400 bg-[#071512] p-3.5 space-y-2 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
            >
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-anton text-emerald-300 uppercase tracking-wider">
                  <Calculator size={14} />
                  <span>CALCULADORA AUTOMÁTICA DA SUA MÃO (SEM ERRO HUMANO)</span>
                </div>
                <span className="text-[9px] font-mono-code bg-emerald-500 text-black font-bold px-1.5 py-0.5">
                  PERGUNTA #{activeQNum}
                </span>
              </div>

              <div className="text-[11px] font-mono-code text-slate-300">
                {formatOfficialQuestionText(activeQNum, {
                  positions1Based: pv.selectedPositionsQ1,
                  targetValue: pv.selectedValueQ7,
                  targetSuit: pv.selectedSuitQ8
                })}
              </div>

              <div
                data-testid="controller-pv-auto-answer"
                className="p-2.5 bg-black/80 border border-emerald-400/60 font-anton text-lg text-emerald-300 tracking-wide"
              >
                👉 {autoCalcAnswer.summaryText}
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {OFFICIAL_11_QUESTIONS.map((q) => (
                  <button
                    key={q.number}
                    type="button"
                    onClick={() => setPvCalcQuestionNum(q.number)}
                    className={`px-2 py-0.5 text-[10px] font-mono-code font-bold border cursor-pointer ${
                      activeQNum === q.number
                        ? 'border-emerald-300 bg-emerald-400 text-black'
                        : 'border-slate-700 bg-black text-slate-300'
                    }`}
                  >
                    #{q.number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. SECRET TOKEN AUCTION BIDDER */}
          <div className="border-2 border-amber-400/80 bg-[#0b0d16] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-anton text-sm text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins size={15} />
                <span>LEILÃO SECRETO DE TOKENS (RODADA #{pv.auctionRound})</span>
              </span>
              {pv.bidSubmitted[player.id] && (
                <span className="text-[10px] font-mono-code text-emerald-400 font-bold">
                  ✓ Lance Secreto: {pv.currentBids[player.id]} 🪙
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={myTokens}
                value={pvBidInput}
                onChange={(e) => setPvBidInput(Math.max(0, Math.min(myTokens, Number(e.target.value))))}
                className="w-24 bg-black border-2 border-amber-400 p-2 text-center font-anton text-2xl text-white"
              />
              <button
                type="button"
                data-testid="controller-pv-submit-bid-btn"
                onClick={handleSubmitSecretTokenBid}
                className="flex-1 py-2.5 border-2 border-amber-300 bg-amber-400 hover:bg-amber-300 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
              >
                APOSTAR EM SEGREDO ({pvBidInput} 🪙)
              </button>
            </div>
          </div>

          {/* 4. 8 SECRET CARDS HAND BUILDER + ASCENDING SUIT VALIDATOR */}
          <div className="border-2 border-cyan-400 bg-[#090b14] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <span className="font-anton text-sm text-cyan-300 uppercase tracking-wider">
                🃏 SUAS 8 CARTAS SECRETAS ({myHand.length}/8)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="controller-pv-random-hand-btn"
                  onClick={handleDealRandomValidForMe}
                  className="px-2 py-1 border border-cyan-400 bg-cyan-950 text-cyan-200 text-[10px] font-mono-code font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Shuffle size={11} />
                  <span>Sortear 8</span>
                </button>
                {myHand.length > 1 && !myValidation.valid && (
                  <button
                    type="button"
                    data-testid="controller-pv-autosort-btn"
                    onClick={handleAutoSortMyHand}
                    className="px-2 py-1 border border-amber-400 bg-amber-400 text-black text-[10px] font-mono-code font-bold uppercase cursor-pointer"
                  >
                    ✨ Ordenar Naipes
                  </button>
                )}
              </div>
            </div>

            {/* Current 8 Slots */}
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const c = myHand[idx];
                const isViolation = myValidation.violatingIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => c && handleToggleCardInHand(c)}
                    className={`p-2 border text-center cursor-pointer ${
                      isViolation
                        ? 'border-rose-500 bg-rose-950/60 text-rose-200'
                        : c
                        ? 'border-cyan-400 bg-cyan-950/40 text-white'
                        : 'border-slate-800 bg-black/50 text-slate-500'
                    }`}
                  >
                    <div className="text-[9px] font-mono-code opacity-75">{idx + 1}ª POS</div>
                    <div className="font-anton text-base">
                      {c ? `${formatCardValueLabel(c.value)}${SUIT_META[c.suit].symbol}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>

            {!myValidation.valid && (
              <div
                data-testid="controller-pv-suit-order-error"
                className="p-2 border border-rose-500 bg-rose-950/50 text-[11px] font-mono-code text-rose-200"
              >
                ⚠️ {myValidation.errorMessage}
              </div>
            )}

            {myHand.length === 8 && myValidation.valid && !isMyHandReady && (
              <button
                type="button"
                data-testid="controller-pv-lock-hand-btn"
                onClick={handleLockMyHand}
                className="w-full py-2.5 border-2 border-emerald-400 bg-emerald-500 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
              >
                🔒 TRAVAR MINHAS 8 CARTAS SECRETAS
              </button>
            )}

            {/* Collapsible 52-card Deck Picker for Manual Card Registration */}
            <details className="border border-slate-800 bg-black/60 p-2">
              <summary className="text-[11px] font-mono-code text-cyan-300 cursor-pointer font-bold uppercase">
                Escolher / Editar cartas manualmente do baralho de 52 cartas
              </summary>
              <div className="grid grid-cols-4 gap-1 pt-2 max-h-48 overflow-y-auto">
                {full52Deck.map((card) => {
                  const selected = myHand.some((c) => c.id === card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleToggleCardInHand(card)}
                      className={`py-1 text-xs font-mono-code font-bold border cursor-pointer ${
                        selected
                          ? 'border-cyan-300 bg-cyan-400 text-black'
                          : 'border-slate-800 bg-[#0d101b] text-slate-300'
                      }`}
                    >
                      {formatCardValueLabel(card.value)}
                      {SUIT_META[card.suit].symbol}
                    </button>
                  );
                })}
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  };
