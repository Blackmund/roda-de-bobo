import React from 'react';
import { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { EyeOff, Minus, CheckCircle2, Gavel } from 'lucide-react';
import { safeVibrate } from '../../../utils/hapticFeedback';
import { getActiveTeamIds, getNextTeamId } from '../../../utils/teamUtils';

interface DuvidoControllerProps {
  room: GameRoom;
  player: Player;
  customBid: number;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (...args: any[]) => any;
  renderMobileTurnSpotlightBanner: (...args: any[]) => any;
  renderMobileTimerBanner: (...args: any[]) => any;
  setCustomBid: React.Dispatch<React.SetStateAction<number>>;
}

export const DuvidoController: React.FC<DuvidoControllerProps> = ({
  room,
  player,
  customBid,
  onUpdateRoom,
  wrapIfMultiMode,
  renderMobileTurnSpotlightBanner,
  renderMobileTimerBanner,
  setCustomBid
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'duvido' && room.duvido)) return null;

    const duvido = room.duvido;
    const isBlindfolded =
      (player.team === 'A' && duvido.blindfoldedPlayers.A === player.id) ||
      (player.team === 'B' && duvido.blindfoldedPlayers.B === player.id);
    const isNegotiator = !isBlindfolded;
    const isMyTurn = duvido.activeTurnTeam === player.team;
    const isChallengedTeam = Boolean(duvido.challengedTeam && player.team === duvido.challengedTeam);
    const isDoubtingTeam = !isChallengedTeam;

    const handleRaiseBid = () => {
      const nextBid = duvido.currentBid + customBid;
      sounds.playSuccess();
      safeVibrate(50);
      onUpdateRoom((prev) => ({
        ...prev,
        duvido: prev.duvido
          ? {
              ...prev.duvido,
              currentBid: nextBid,
              currentBidTeam: player.team,
              activeTurnTeam: getNextTeamId(player.team, getActiveTeamIds(prev))
            }
          : undefined
      }));
    };

    const handleCallDuvido = () => {
      sounds.playAlarm();
      safeVibrate([100, 80, 120]);
      onUpdateRoom((prev) => ({
        ...prev,
        duvido: prev.duvido
          ? {
              ...prev.duvido,
              phase: 'EXECUTION',
              challengedTeam: prev.duvido.currentBidTeam || getNextTeamId(player.team, getActiveTeamIds(prev)),
              timerActive: prev.timerConfig > 0
            }
          : undefined
      }));
    };

    const handleAddValid = () => {
      sounds.playSuccess();
      safeVibrate([60, 40, 80]);
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
            resultReason: reached ? `META DE ${prev.duvido.currentBid} ITENS ALCANÇADA COM SUCESSO!` : ''
          }
        };
      });
    };

    const handleDecrementValid = () => {
      sounds.playTick();
      safeVibrate(60);
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
    };

    const handleCallInvalid = () => {
      sounds.playBuzzer();
      safeVibrate([150, 100, 150]);
      onUpdateRoom((prev) => {
        if (!prev.duvido) return prev;
        const winningTeam = prev.duvido.challengedTeam === 'A' ? 'B' : 'A';
        return {
          ...prev,
          duvido: {
            ...prev.duvido,
            phase: 'RESULT',
            timerActive: false,
            resultWinnerTeam: winningTeam,
            resultReason: 'ITEM INVÁLIDO OU DESISTÊNCIA! Ponto para a equipe que duvidou.'
          }
        };
      });
    };

    if (isBlindfolded && duvido.phase !== 'EXECUTION') {
      return wrapIfMultiMode(
        <div className="min-h-[60vh] bg-black p-6 flex flex-col items-center justify-center text-center space-y-6">
          <EyeOff size={80} className="text-amber-400 animate-pulse" />
          <h1 className="font-anton text-4xl text-white uppercase">
            VOCÊ ESTÁ VENDADO!
          </h1>
          <p className="text-sm text-slate-300 max-w-xs">
            Feche os olhos ou vire o celular para baixo. Ouça apenas a voz da sala até ouvir o alarme do "DUVIDO!".
          </p>
        </div>
      );
    }

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* Secret Category only for Negotiators */}
          <div className="border-2 border-rose-500 bg-rose-950/40 p-4 space-y-1">
            <span className="text-[10px] font-mono-code font-bold uppercase text-rose-300">
              CATEGORIA SECRETA DO LEILÃO:
            </span>
            <div className="font-anton text-xl text-white uppercase">
              "{duvido.roundData.categoria_secreta}"
            </div>
            <div className="text-xs text-cyan-300 font-mono-code">
              Lance Atual: {duvido.currentBid} itens
            </div>
          </div>

          {duvido.phase === 'AUCTION' && (
            <div className="border-2 border-cyan-400 bg-black p-4 space-y-4">
              <span className="text-xs font-anton text-cyan-300 uppercase tracking-wide block">
                {isMyTurn ? '👉 SUA VEZ DE DAR O LANCE NO LEILÃO!' : 'Aguardando lance do rival...'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCustomBid(Math.max(1, customBid - 1))}
                  className="w-12 h-12 bg-slate-800 text-white font-anton text-xl border border-slate-700"
                >
                  -
                </button>
                <div className="flex-1 text-center font-anton text-3xl text-white">
                  +{customBid}
                </div>
                <button
                  onClick={() => setCustomBid(customBid + 1)}
                  className="w-12 h-12 bg-slate-800 text-white font-anton text-xl border border-slate-700"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleRaiseBid}
                disabled={!isMyTurn}
                className="w-full py-3.5 border-2 border-cyan-300 bg-cyan-400 disabled:opacity-40 text-black font-anton text-base uppercase tracking-wider"
              >
                AUMENTAR APOSTA PARA {duvido.currentBid + customBid} ITENS
              </button>

              <button
                onClick={handleCallDuvido}
                disabled={!isMyTurn || duvido.currentBid <= 0}
                className="w-full py-4 border-2 border-rose-500 bg-rose-600 disabled:opacity-40 text-white font-anton text-xl uppercase tracking-widest shadow-neon-rose"
              >
                🚨 DUVIDO!
              </button>
            </div>
          )}

          {duvido.phase === 'EXECUTION' && (
            isChallengedTeam ? (
              /* Screen for the challenged team on the berlinda (no answers shown to prevent cheating) */
              <div className="border-2 border-amber-400 bg-amber-950/40 p-4 space-y-3 text-center rounded-lg shadow-lg">
                <div className="text-xs font-mono-code text-amber-300 font-bold uppercase tracking-wider">
                  🔥 SUA EQUIPE ESTÁ NA BERLINDA!
                </div>
                <div className="font-anton text-xl sm:text-2xl text-white uppercase leading-tight">
                  Cite em voz alta {duvido.currentBid} itens válidos!
                </div>
                <div className="border border-amber-400/50 bg-black/80 p-3 space-y-1">
                  <div className="text-[10px] font-mono-code text-slate-400 uppercase">
                    ACERTOS VALIDADOS PELA EQUIPE ADVERSÁRIA:
                  </div>
                  <div className="font-anton text-4xl sm:text-5xl text-cyan-300">
                    {duvido.validCount} / {duvido.currentBid}
                  </div>
                </div>
                <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                  A equipe adversária está com o gabarito oficial no celular e avaliando cada resposta dita em voz alta.
                </p>
              </div>
            ) : (
              /* Screen for the doubting / refereeing team with + / - scoring and complete gabarito */
              <div className="space-y-3">
                <div className="border-2 border-cyan-400 bg-cyan-950/40 p-3 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-mono-code font-bold uppercase text-cyan-300">
                    <Gavel size={14} />
                    <span>SUA EQUIPE ESTÁ DUVIDANDO & FISCALIZANDO</span>
                  </div>
                  <div className="font-anton text-sm sm:text-base text-white uppercase">
                    Equipe {duvido.challengedTeam} precisa citar {duvido.currentBid} itens válidos!
                  </div>
                </div>

                <div className="border-2 border-emerald-400 bg-black p-4 space-y-3 text-center shadow-lg">
                  <div className="text-xs font-mono-code uppercase font-bold text-emerald-400">
                    PLACAR DE RESPOSTAS VÁLIDAS:
                  </div>
                  <div
                    data-testid="duvido-mobile-valid-counter"
                    className="font-anton text-4xl sm:text-5xl text-white leading-none"
                  >
                    {duvido.validCount} / {duvido.currentBid}
                  </div>
                  <div className="text-[11px] font-mono-code text-slate-300">
                    Meta: faltam {Math.max(0, duvido.currentBid - duvido.validCount)} itens
                  </div>

                  {/* Direct +1 and -1 Scoring Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      data-testid="duvido-mobile-add-btn"
                      onClick={handleAddValid}
                      className="py-3.5 px-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-anton text-base sm:text-lg uppercase flex items-center justify-center gap-1.5 shadow-md transition-transform cursor-pointer"
                    >
                      <CheckCircle2 size={20} />
                      <span>+1 ACERTOU</span>
                    </button>

                    <button
                      type="button"
                      data-testid="duvido-mobile-dec-btn"
                      onClick={handleDecrementValid}
                      disabled={duvido.validCount <= 0}
                      className="py-3.5 px-2 border-2 border-rose-400 bg-rose-950/80 hover:bg-rose-900 active:scale-95 disabled:opacity-40 text-rose-200 font-anton text-base sm:text-lg uppercase flex items-center justify-center gap-1.5 transition-transform cursor-pointer"
                      title="Diminuir se o item não for correto ou clique acidental"
                    >
                      <Minus size={20} />
                      <span>-1 DIMINUIR</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="duvido-mobile-invalid-btn"
                    onClick={handleCallInvalid}
                    className="w-full py-2 border border-rose-500/50 bg-rose-950/30 hover:bg-rose-900/60 text-rose-300 font-mono-code text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    🚨 Item Inválido / Desistência (Fim da Rodada)
                  </button>
                </div>

                {/* Gabarito de Apoio com as Respostas Oficiais no Celular */}
                <div className="border border-white/20 bg-slate-950 p-3 space-y-2 text-left shadow-lg">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono-code font-bold uppercase text-amber-300">
                      <span>📋 GABARITO OFICIAL ({duvido.roundData.exemplos_validos?.length || 0} RESPOSTAS)</span>
                    </div>
                    <span className="text-[10px] font-mono-code text-cyan-300 font-semibold">
                      Toque para +1
                    </span>
                  </div>
                  <p className="text-[10px] font-mono-code text-slate-400 leading-tight">
                    Consulte as respostas válidas abaixo para avaliar se o oponente acertou. Toque em um item para pontuar (+1) ou use os botões acima:
                  </p>

                  <div
                    data-testid="duvido-mobile-gabarito-list"
                    className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1 bg-black/60 border border-white/10"
                  >
                    {duvido.roundData.exemplos_validos?.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={handleAddValid}
                        className="px-2.5 py-1 text-xs font-medium border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-500 hover:text-black text-cyan-200 transition-colors text-left cursor-pointer active:scale-95"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  };
