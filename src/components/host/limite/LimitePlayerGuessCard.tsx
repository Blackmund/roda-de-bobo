import React from 'react';
import { LimiteGameState, LimitePowerCardType, Player } from '../../../types/game';
import { Trophy, Lock } from 'lucide-react';

interface LimitePlayerGuessCardProps {
  p: Player;
  limite: LimiteGameState;
  isWinner: boolean;
  handleAwardDirectMesaVictory: (winnerId: string, forceExact?: boolean) => void;
  isBusted: boolean;
  hasGuessed: boolean;
  cardPlayed: LimitePowerCardType;
  totalPts: number;
  liveDelta: number;
  guess: number;
  isExactGuess: boolean;
  exactPointValueIfAwarded: number;
  pointValueIfAwarded: number;
  isScoredAsExact: boolean;
  editingSecretPlayers: Record<string, boolean>;
  playMode: "mesa" | "digital";
  isTimeExpired: boolean;
  setEditingSecretPlayers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTvDraftGuesses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  tvDraftGuesses: Record<string, string>;
  handleSubmitSecretTvGuess: (playerId: string) => void;
}

export const LimitePlayerGuessCard: React.FC<LimitePlayerGuessCardProps> = ({
  p,
  limite,
  isWinner,
  handleAwardDirectMesaVictory,
  isBusted,
  hasGuessed,
  cardPlayed,
  totalPts,
  liveDelta,
  guess,
  isExactGuess,
  exactPointValueIfAwarded,
  pointValueIfAwarded,
  isScoredAsExact,
  editingSecretPlayers,
  playMode,
  isTimeExpired,
  setEditingSecretPlayers,
  setTvDraftGuesses,
  tvDraftGuesses,
  handleSubmitSecretTvGuess
}) => {
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
                          🔒 Palpites encerrados
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
                        {isTimeExpired ? '🔒 Palpites encerrados' : '⏳ No celular...'}
                      </div>
                    )}
                  </div>
                );
};
