import type { Player } from '../../../types/game';
import React from 'react';
import { GameRoom, PerguntasEVerdadesGameState } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { Clock, Lock, Info, RefreshCw, Coins, ArrowRight } from 'lucide-react';
import { PlayerMark } from '../../rdb/PlayerMark';

interface PVIntroViewProps {
  tvWrapperClass: string;
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
  handleStartWinnerTurnAfterReveal: () => void;
}

export const PVIntroView: React.FC<PVIntroViewProps> = ({
  totalMatchRounds,
  matchRoundNumber,
  pv,
  formatTimer,
  renderPlayerRosterStrip,
  maxTokensForBiddingPlayer,
  onUpdatePVState,
  allBidsSubmitted,
  bettingIdx,
  activePlayers,
  currentBiddingPlayer,
  currentSelectedBid,
  handleSetQuickTokenBidOnTV,
  handleConfirmSequentialBid,
  handleResolveAuctionOnTV,
  handleStartWinnerTurnAfterReveal
}) => {
  const revealedWinner =
    activePlayers.find((p) => p.id === (pv.auctionWinnerId || pv.activeTurnPlayerId)) ||
    activePlayers[0];
  const revealedTarget =
    activePlayers.find((p) => p.id === pv.targetOpponentId && p.id !== revealedWinner?.id) ||
    activePlayers.find((p) => p.id !== revealedWinner?.id);
  return (
    <div data-testid="screen-perguntas-e-verdades" className="rdb-pro">
      <header data-testid="pv-auction-only-header" className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Perguntas e Verdades
          <span data-testid="pv-series-round-badge" className="rdb-lim-round">
            {totalMatchRounds > 1 ? `Rodada ${matchRoundNumber}/${totalMatchRounds}` : `Rodada ${matchRoundNumber}`}
          </span>
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip="Cada jogador aposta fichas em segredo. Quem apostar mais ganha a vez de perguntar. Empate: quem empatou recupera as fichas e ganha 2 de bônus."
        >
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="pv-game-status-indicator" className="rdb-tag" data-tip="Fase de apostas">
            <Coins size={14} /> Leilão {pv.auctionRound}
          </span>
          <span className="rdb-lim-timer" data-tip="Tempo da aposta">
            <Clock size={16} />
            <span data-testid="pv-turn-timer-display">{formatTimer(pv.timerSeconds)}</span>
          </span>
        </div>
      </header>

      {renderPlayerRosterStrip()}

      {pv.auctionTieMessage && (
        <div data-testid="pv-auction-tie-alert" className="rdb-pv-banner">
          <span>{pv.auctionTieMessage.replace(/[⚡]/g, '').trim()}</span>
          <button
            type="button"
            data-testid="pv-restart-tie-auction-btn"
            className="rdb-btn"
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
          >
            <RefreshCw /> Desempatar
          </button>
        </div>
      )}

      <div className="rdb-pv-bid-center">
        {pv.auctionRevealPending && revealedWinner ? (
          <div
            data-testid="pv-auction-winner-reveal"
            className="rdb-pv-bid-center"
            style={{ width: '100%' }}
          >
            <span className="rdb-pro-label" style={{ position: 'static' }}>
              {pv.auctionOutcomeType === 'NO_BIDS'
                ? 'Nenhuma ficha apostada · Vez definida'
                : `Venceu o leilão com ${pv.auctionWinningBid} ${
                    pv.auctionWinningBid === 1 ? 'ficha' : 'fichas'
                  }`}
            </span>
            <div className="rdb-pv-bid-who">
              <PlayerMark p={revealedWinner} />
              <span>{revealedWinner.name} ganhou a vez!</span>
            </div>
            {revealedTarget && (
              <p className="rdb-lim-rule-note" style={{ margin: 0 }}>
                Alvo da vez: <strong>{revealedTarget.name}</strong>
              </p>
            )}
            <button
              type="button"
              data-testid="pv-start-winner-turn-btn"
              className="rdb-btn rdb-setup-start"
              onClick={handleStartWinnerTurnAfterReveal}
            >
              Iniciar turno de {revealedWinner.name} <ArrowRight />
            </button>
          </div>
        ) : !allBidsSubmitted ? (
          <div data-testid="pv-sequential-bidding-card" className="rdb-pv-bid-center" style={{ width: '100%' }}>
            <span className="rdb-pro-label" style={{ position: 'static' }}>
              Aposta secreta {bettingIdx + 1} de {activePlayers.length} · reserva {maxTokensForBiddingPlayer} fichas
            </span>
            <h2 data-testid="pv-giant-turn-indicator" className="rdb-pv-bid-who">
              <PlayerMark p={currentBiddingPlayer} /> {currentBiddingPlayer?.name}
            </h2>
            <div className="rdb-pv-bid-grid">
              {Array.from({ length: maxTokensForBiddingPlayer + 1 }, (_, i) => i).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  data-testid={`pv-tv-bid-${currentBiddingPlayer?.id}-${amt}`}
                  className={currentSelectedBid === amt ? 'is-on' : ''}
                  onClick={() => handleSetQuickTokenBidOnTV(currentBiddingPlayer?.id, amt)}
                >
                  {amt}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-testid={`pv-confirm-bid-btn-${currentBiddingPlayer?.id}`}
              className="rdb-btn rdb-setup-start"
              onClick={() => handleConfirmSequentialBid(currentBiddingPlayer?.id)}
            >
              <Lock /> Confirmar {currentSelectedBid} {currentSelectedBid === 1 ? 'ficha' : 'fichas'}
            </button>
          </div>
        ) : (
          <div data-testid="pv-auction-reveal-ready-card" className="rdb-pv-bid-center" style={{ width: '100%' }}>
            <span className="rdb-pro-label" style={{ position: 'static' }}>Apostas registradas</span>
            <h2 className="rdb-pv-bid-who">Revelar o vencedor?</h2>
            <button
              type="button"
              data-testid="pv-resolve-auction-btn"
              className="rdb-btn rdb-setup-start"
              onClick={handleResolveAuctionOnTV}
            >
              <Coins /> Revelar resultado
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
