import React from 'react';
import type { ComTerraState, Player } from '../../types/game';
import { bpRanking } from '../../utils/bpEngine';
import { ranking } from '../../utils/comTerraEngine';
import { PlayerMark } from '../rdb/PlayerMark';
import { ctColor } from './CTBoardView';
import './comterra.css';

/** Resultado da partida: classificacao final e o botao que leva os pontos ao placar da sala. */
export const CTSummary: React.FC<{
  state: ComTerraState;
  players: Player[];
  onFinish?: () => void;
}> = ({ state, players, onFinish }) => {
  const rank: Array<{ playerId: string; points: number; tie?: number }> = state.bp
    ? bpRanking(state.bp)
    : ranking(state);
  const top = rank[0]?.points ?? 0;
  const topTie = rank[0]?.tie ?? 0;
  const winners = rank.filter((r) => r.points === top && (r.tie ?? 0) === topTie);
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || 'Jogador';
  return (
    <div className="ct-summary" data-testid="ct-summary">
      <span className="rdb-tag">Fim da partida</span>
      <h2 className="ct-summary-title">
        {winners.length === 1 ? `${nameOf(winners[0].playerId)} venceu` : 'Empate no topo'}
      </h2>
      <ol className="ct-rank ct-rank--big">
        {rank.map((r) => {
          const p = players.find((x) => x.id === r.playerId);
          const isWin = r.points === top && (r.tie ?? 0) === topTie;
          return (
            <li key={r.playerId} className={isWin ? 'is-turn' : ''}>
              <span className="ct-swatch" style={{ background: ctColor(state.order, r.playerId).top }} aria-hidden="true" />
              <PlayerMark p={p} />
              <span className="ct-rank-name">{p?.name || 'Jogador'}</span>
              <span className="ct-rank-pts">
                {r.points} pts{state.bp && r.tie ? ` (+${r.tie} est.)` : ''}
              </span>
            </li>
          );
        })}
      </ol>
      {onFinish ? (
        <button type="button" className="rdb-btn rdb-setup-start" data-testid="ct-finish-btn" onClick={onFinish}>
          Confirmar pontos e encerrar
        </button>
      ) : (
        <p className="ct-hint">Aguarde: quem comanda a sala confirma os pontos.</p>
      )}
    </div>
  );
};
