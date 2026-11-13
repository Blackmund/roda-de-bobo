import React from 'react';
import { GameRoom, Player, GameId } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { Minus, CheckCircle2 } from 'lucide-react';
import { ensureStrictForbiddenWordsCount } from '../../../utils/proibidoGoldenDatabase';
import { applyProibidoCardOutcome } from '../../host/ScreenProibido';
import { getActiveTeamIds, getNextTeamId } from '../../../utils/teamUtils';

interface MasterRemoteControllerProps {
  room: GameRoom;
  setIsMasterRemoteMode: React.Dispatch<React.SetStateAction<boolean>>;
  renderMobileTurnSpotlightBanner: (...args: any[]) => any;
  renderMobileTimerBanner: (...args: any[]) => any;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  setHoldingSecret: React.Dispatch<React.SetStateAction<boolean>>;
  holdingSecret: boolean;
}

export const MasterRemoteController: React.FC<MasterRemoteControllerProps> = ({
  room,
  setIsMasterRemoteMode,
  renderMobileTurnSpotlightBanner,
  renderMobileTimerBanner,
  onUpdateRoom,
  setHoldingSecret,
  holdingSecret
}) => {

    return (
      <div
        data-testid="master-remote-controller"
        className="min-h-screen bg-[#07080d] p-3 md:p-4 flex flex-col justify-between max-w-md mx-auto space-y-4"
      >
        <div className="space-y-4">
          {/* Header with switch back to Individual Player */}
          <div className="border-2 border-amber-400 bg-gradient-to-r from-amber-950/70 via-[#120e04] to-black p-3.5 flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <div>
              <div className="text-[10px] font-mono-code text-amber-300 font-bold uppercase tracking-widest">
                MODO 2 // NETFLIX GAME CONTROLLER
              </div>
              <div className="font-anton text-lg text-white uppercase tracking-wide">
                CONTROLE MESTRE DA SALA ({room.roomId})
              </div>
            </div>
            <button
              type="button"
              data-testid="switch-to-individual-player-btn"
              onClick={() => {
                sounds.playTick();
                setIsMasterRemoteMode(false);
              }}
              className="px-2.5 py-1 border border-cyan-400 bg-cyan-950 text-cyan-200 font-mono-code text-[10px] font-bold uppercase cursor-pointer shrink-0"
            >
              Modo Individual
            </button>
          </div>

          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* 1. When TV is in Mode Select / Lobby / Game Setup / Rules */}
          {(room.screen === 'mode-select' || room.screen === 'lobby' || room.screen === 'game-setup' || room.screen === 'rules') && (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-4 space-y-3 shadow-neon-cyan">
              <div className="font-anton text-base text-cyan-300 uppercase tracking-wider">
                ESCOLHER JOGO NA TV:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'limite', name: 'JOGO DO LIMITE' },
                  { id: 'duvido', name: 'JOGO DO DUVIDO' },
                  { id: 'proibido', name: 'JOGO DO PROIBIDO' },
                  { id: 'nota', name: 'JOGO DA NOTA' },
                  { id: 'tem-ou-nao-tem', name: 'TEM OU NÃO TEM' },
                  { id: 'perguntas-e-verdades', name: 'PERGUNTAS E VERDADES' }
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    data-testid={`master-remote-game-${g.id}`}
                    onClick={() => {
                      sounds.playPowerup();
                      onUpdateRoom((prev) => ({
                        ...prev,
                        activeGame: g.id as GameId,
                        screen: 'game-setup',
                        roundNumber: 1
                      }));
                    }}
                    className={`p-3 border text-left font-anton text-sm uppercase tracking-wider cursor-pointer transition-all ${
                      room.activeGame === g.id
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-slate-700 bg-black/80 text-white hover:border-cyan-400'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              {room.screen !== 'lobby' && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playFlip();
                    onUpdateRoom((prev) => ({ ...prev, screen: 'lobby', activeGame: null }));
                  }}
                  className="w-full py-2.5 border border-rose-500 bg-rose-950/70 text-rose-200 font-anton text-xs uppercase cursor-pointer"
                >
                  VOLTAR TV PARA O LOBBY
                </button>
              )}
            </div>
          )}

          {/* 2. Master Remote for JOGO DO PROIBIDO */}
          {room.screen === 'playing' && room.activeGame === 'proibido' && room.proibido && (
            <div className="border-2 border-rose-500 bg-[#090b14] p-4 space-y-3 shadow-neon-rose">
              <div className="flex items-center justify-between text-xs font-mono-code text-rose-300 font-bold uppercase">
                <span>CARTA SECRETA DO PROIBIDO</span>
                <span>PONTOS: {room.proibido.roundScore}</span>
              </div>
              <div className="bg-rose-600 text-white p-3 text-center">
                <div className="text-[10px] font-mono-code uppercase">PALAVRA-ALVO</div>
                <div className="font-anton text-3xl uppercase">
                  {room.proibido.cards[room.proibido.currentCardIndex]?.palavra_alvo}
                </div>
              </div>
              <div className="border border-rose-500/40 bg-black p-3 space-y-1 text-center">
                <div className="text-[10px] font-mono-code text-rose-400 uppercase font-bold">
                  5 PALAVRAS PROIBIDAS:
                </div>
                {ensureStrictForbiddenWordsCount(
                  room.proibido.cards[room.proibido.currentCardIndex]?.palavra_alvo,
                  room.proibido.cards[room.proibido.currentCardIndex]?.palavras_proibidas,
                  5,
                  room.theme
                ).map(
                  (w, i) => (
                    <div key={i} className="font-anton text-lg text-rose-200 uppercase">
                      • {w}
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playSuccess();
                    onUpdateRoom((prev) =>
                      prev.proibido
                        ? { ...prev, proibido: applyProibidoCardOutcome(prev.proibido, 'correct').nextState }
                        : prev
                    );
                  }}
                  className="py-4 border-2 border-emerald-400 bg-emerald-600 text-white font-anton text-sm uppercase cursor-pointer"
                >
                  ACERTO (+1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBuzzer();
                    onUpdateRoom((prev) =>
                      prev.proibido
                        ? { ...prev, proibido: applyProibidoCardOutcome(prev.proibido, 'foul').nextState }
                        : prev
                    );
                  }}
                  className="py-4 border-2 border-rose-400 bg-rose-600 text-white font-anton text-sm uppercase cursor-pointer"
                >
                  FALTA (-1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playFlip();
                    onUpdateRoom((prev) =>
                      prev.proibido
                        ? { ...prev, proibido: applyProibidoCardOutcome(prev.proibido, 'skipped').nextState }
                        : prev
                    );
                  }}
                  className="py-4 border border-slate-600 bg-slate-800 text-slate-200 font-anton text-sm uppercase cursor-pointer"
                >
                  PULAR
                </button>
              </div>
            </div>
          )}

          {/* 3. Master Remote for TEM OU NÃO TEM */}
          {room.screen === 'playing' && room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem && (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-4 space-y-3 shadow-neon-cyan">
              <div className="text-xs font-mono-code text-cyan-300 font-bold uppercase">
                GABARITO DO APRESENTADOR (TOQUE PARA REVELAR NA TV):
              </div>
              <div className="space-y-2">
                {room.temOuNaoTem.items.map((it, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={it.revealed}
                    onClick={() => {
                      sounds.playSuccess();
                      onUpdateRoom((prev) => {
                        if (!prev.temOuNaoTem || prev.temOuNaoTem.items[idx]?.revealed) return prev;
                        const team = prev.temOuNaoTem.activeTeam;
                        const updated = [...prev.temOuNaoTem.items];
                        updated[idx] = { ...updated[idx], revealed: true, revealedByTeam: team };
                        const newRoundScore = {
                          ...prev.temOuNaoTem.roundScore,
                          [team]: (prev.temOuNaoTem.roundScore[team] || 0) + updated[idx].votos
                        };
                        const allRevealed = updated.every((x) => x.revealed);
                        const activeTeams = getActiveTeamIds(prev);
                        const nextTeam = prev.temOuNaoTem.freeDomainTeam
                          ? prev.temOuNaoTem.freeDomainTeam
                          : getNextTeamId(team, activeTeams, prev.temOuNaoTem.eliminatedTeams);
                        return {
                          ...prev,
                          temOuNaoTem: {
                            ...prev.temOuNaoTem,
                            items: updated,
                            roundScore: newRoundScore,
                            activeTeam: nextTeam,
                            turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
                            phase: allRevealed ? 'ROUND_END' : prev.temOuNaoTem.phase
                          }
                        };
                      });
                    }}
                    className={`w-full p-3 border text-left flex items-center justify-between font-anton uppercase cursor-pointer ${
                      it.revealed
                        ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300 opacity-60'
                        : 'border-cyan-400 bg-black text-white hover:bg-cyan-950'
                    }`}
                  >
                    <span>
                      #{idx + 1} — {it.texto}
                    </span>
                    <span className="text-amber-300">{it.votos} PTS</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playBuzzer();
                  onUpdateRoom((prev) => {
                    if (!prev.temOuNaoTem) return prev;
                    const activeTeams = getActiveTeamIds(prev);
                    const team = prev.temOuNaoTem.activeTeam;
                    const currentStrikes = (prev.temOuNaoTem.strikes[team] || 0) + 1;
                    const updatedStrikes = { ...prev.temOuNaoTem.strikes, [team]: currentStrikes };
                    const updatedEliminated = [...prev.temOuNaoTem.eliminatedTeams];
                    let freeDomain = prev.temOuNaoTem.freeDomainTeam;
                    let nextTeam = prev.temOuNaoTem.activeTeam;
                    const maxStrikes = prev.temOuNaoTem.maxStrikes || 2;
                    if (currentStrikes >= maxStrikes && !updatedEliminated.includes(team)) {
                      updatedEliminated.push(team);
                    }
                    const survivingTeams = activeTeams.filter((t) => !updatedEliminated.includes(t));
                    if (survivingTeams.length === 1) {
                      freeDomain = survivingTeams[0];
                      nextTeam = survivingTeams[0];
                    } else if (survivingTeams.length > 1) {
                      nextTeam = getNextTeamId(team, activeTeams, updatedEliminated);
                    }
                    return {
                      ...prev,
                      temOuNaoTem: {
                        ...prev.temOuNaoTem,
                        strikes: updatedStrikes,
                        eliminatedTeams: updatedEliminated,
                        freeDomainTeam: freeDomain,
                        activeTeam: nextTeam,
                        turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
                        phase: survivingTeams.length === 0 ? 'ROUND_END' : 'GUESSING'
                      }
                    };
                  });
                }}
                className="w-full py-4 border-2 border-rose-500 bg-rose-600 text-white font-anton text-lg uppercase tracking-wider shadow-neon-rose cursor-pointer"
              >
                MARCAR ERRO (STRIKE EQUIPE {room.temOuNaoTem.activeTeam})
              </button>
            </div>
          )}

          {/* 4. Master Remote for JOGO DO DUVIDO */}
          {room.screen === 'playing' && room.activeGame === 'duvido' && room.duvido && (
            <div className="border-2 border-rose-500 bg-[#090b14] p-4 space-y-3">
              <div className="text-xs font-mono-code text-rose-300 font-bold uppercase">
                CATEGORIA SECRETA (SÓ NO CONTROLE):
              </div>
              <div className="font-anton text-xl text-white uppercase">
                "{room.duvido.roundData.categoria_secreta}"
              </div>
              {room.duvido.roundData.dica_arbitro && (
                <div className="p-2 border border-amber-400/60 bg-amber-950/40 text-xs font-mono-code text-amber-200">
                  {room.duvido.roundData.dica_arbitro}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playSuccess();
                    onUpdateRoom((prev) =>
                      prev.duvido
                        ? {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              currentBid: prev.duvido.currentBid + 1,
                              currentBidTeam: prev.duvido.activeTurnTeam,
                              activeTurnTeam: prev.duvido.activeTurnTeam === 'A' ? 'B' : 'A'
                            }
                          }
                        : prev
                    );
                  }}
                  className="py-3.5 border border-cyan-400 bg-cyan-500 text-black font-anton text-sm uppercase cursor-pointer"
                >
                  +1 NO LANCE ({room.duvido.currentBid + 1})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playAlarm();
                    onUpdateRoom((prev) =>
                      prev.duvido
                        ? {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              phase: 'EXECUTION',
                              challengedTeam: prev.duvido.currentBidTeam || 'A',
                              timerActive: prev.timerConfig > 0
                            }
                          }
                        : prev
                    );
                  }}
                  className="py-3.5 border border-rose-500 bg-rose-600 text-white font-anton text-sm uppercase cursor-pointer"
                >
                  DUVIDO!
                </button>
              </div>
              {room.duvido.phase === 'EXECUTION' && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="font-anton text-base text-cyan-200 text-center">
                    EXECUÇÃO: {room.duvido.validCount} / {room.duvido.currentBid} ITENS VÁLIDOS
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playSuccess();
                        onUpdateRoom((prev) => {
                          if (!prev.duvido) return prev;
                          const next = prev.duvido.validCount + 1;
                          const reached = next >= prev.duvido.currentBid;
                          return {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              validCount: next,
                              phase: reached ? 'RESULT' : prev.duvido.phase,
                              timerActive: reached ? false : prev.duvido.timerActive,
                              resultWinnerTeam: reached ? prev.duvido.challengedTeam : null,
                              resultReason: reached ? 'META ATINGIDA!' : ''
                            }
                          };
                        });
                      }}
                      className="py-3 border-2 border-emerald-400 bg-emerald-600 text-white font-anton text-sm uppercase cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={16} />
                      <span>+1 ACERTO</span>
                    </button>
                    <button
                      type="button"
                      disabled={room.duvido.validCount <= 0}
                      onClick={() => {
                        sounds.playTick();
                        onUpdateRoom((prev) => {
                          if (!prev.duvido) return prev;
                          return {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              validCount: Math.max(0, prev.duvido.validCount - 1)
                            }
                          };
                        });
                      }}
                      className="py-3 border-2 border-rose-400 bg-rose-950/80 disabled:opacity-40 text-rose-200 font-anton text-sm uppercase cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Minus size={16} />
                      <span>-1 DIMINUIR</span>
                    </button>
                  </div>
                  {/* Gabarito on Master Remote */}
                  <div className="p-2 border border-white/10 bg-black/60 space-y-1">
                    <span className="text-[10px] font-mono-code text-amber-300 font-bold uppercase block">
                      Gabarito de Apoio ({room.duvido.roundData.exemplos_validos?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-300 max-h-32 overflow-y-auto">
                      {room.duvido.roundData.exemplos_validos?.map((ex, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Master Remote for JOGO DA NOTA & JOGO DO LIMITE */}
          {room.screen === 'playing' && room.activeGame === 'nota' && room.nota && (
            <div className="border-2 border-purple-500 bg-[#090b14] p-4 space-y-3 text-center">
              <div className="font-anton text-lg text-purple-300 uppercase">
                CONTROLE DO JOGO DA NOTA
              </div>
              <div
                onMouseDown={() => setHoldingSecret(true)}
                onMouseUp={() => setHoldingSecret(false)}
                onTouchStart={() => setHoldingSecret(true)}
                onTouchEnd={() => setHoldingSecret(false)}
                className="p-6 border-2 border-amber-400 bg-amber-950/40 cursor-pointer select-none"
              >
                {holdingSecret ? (
                  <span className="font-anton text-6xl text-amber-300">{room.nota.secretScore}</span>
                ) : (
                  <span className="font-mono-code text-xs text-amber-200 font-bold uppercase">
                    SEGURE AQUI PARA ESPIAR A NOTA SECRETA
                  </span>
                )}
              </div>
              {room.nota.revealSubState === 'REVEALED_LOCKED' && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPowerup();
                    onUpdateRoom((prev) =>
                      prev.nota
                        ? { ...prev, nota: { ...prev.nota, revealSubState: 'SCORING' } }
                        : prev
                    );
                  }}
                  className="w-full py-3 bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer shadow-md"
                >
                  CONTINUAR PARA A PONTUAÇÃO ➔
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
