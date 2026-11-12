import type { Player } from '../../../types/game';
import { themeBadge } from '../../../utils/themeUtils';
import React from 'react';
import { GameRoom, PerguntasEVerdadesGameState } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { Clock, Lock } from 'lucide-react';

interface PVIntroViewProps {
  tvWrapperClass: "h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 text-xs select-none";
  totalMatchRounds: number;
  matchRoundNumber: number;
  pv: PerguntasEVerdadesGameState;
  formatTimer: (sec: number) => string | React.JSX.Element;
  renderPlayerRosterStrip: () => React.JSX.Element;
  maxTokensForBiddingPlayer: number;
  room: GameRoom;
  onUpdatePVState: (updater: (prev: PerguntasEVerdadesGameState) => PerguntasEVerdadesGameState) => void;
  allBidsSubmitted: boolean;
  bettingIdx: number;
  activePlayers: Player[];
  currentBiddingPlayer: Player;
  currentSelectedBid: number;
  handleSetQuickTokenBidOnTV: (playerId: string, amount: number) => void;
  handleConfirmSequentialBid: (playerId: string) => void;
  handleResolveAuctionOnTV: () => void;
}

export const PVIntroView: React.FC<PVIntroViewProps> = ({
  tvWrapperClass,
  totalMatchRounds,
  matchRoundNumber,
  pv,
  formatTimer,
  renderPlayerRosterStrip,
  maxTokensForBiddingPlayer,
  room,
  onUpdatePVState,
  allBidsSubmitted,
  bettingIdx,
  activePlayers,
  currentBiddingPlayer,
  currentSelectedBid,
  handleSetQuickTokenBidOnTV,
  handleConfirmSequentialBid,
  handleResolveAuctionOnTV
}) => {
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
};
