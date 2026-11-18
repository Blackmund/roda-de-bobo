import React, { useState } from 'react';
import type { ComTerraState, GameRoom } from '../../types/game';
import { currentPlayerId, finishNow, forceAdvance } from '../../utils/comTerraEngine';
import { squareBonus } from '../../utils/diaboMap';
import { isBot } from '../../ai/bots';
import { sounds } from '../../utils/soundEffects';
import { CTBoardView, CTPieceView } from './CTBoardView';
import { CTSeat } from './CTSeat';
import { CTPieceBadges, ContractList, DevilGlyph, DiaboRank, pieceTitle } from './CTDiaboBits';
import './comterra.css';

/**
 * Plano do Diabo na tela principal (TV 16:9, sem rolagem).
 * TV: o mapa ocupa a altura toda; ao lado ficam a vez, a loja, o placar, os contratos e o diretor.
 * Mesa: o lugar de quem esta na vez (se for IA, o de quem joga no aparelho, so assistindo).
 * Celular: a tela de um jogador dentro da moldura, para testar o fluxo num aparelho so.
 */

interface Props {
  room: GameRoom;
  state: ComTerraState;
  onUpdate: (updater: (prev: ComTerraState) => ComTerraState) => void;
}

export const DiaboHost: React.FC<Props> = ({ room, state: ct, onUpdate }) => {
  const players = room.players;
  const local = room.connectionMode === 'local';
  const [view, setView] = useState<string>(local ? 'mesa' : 'tv');
  const [askEnd, setAskEnd] = useState(false);
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name || 'Jogador';
  const turnId = currentPlayerId(ct);
  const humans = ct.order.filter((id) => !isBot(players.find((p) => p.id === id) || { id }));
  const [lastHuman, setLastHuman] = useState<string | null>(null);
  const turnIsHuman = !!turnId && humans.includes(turnId);
  if (turnIsHuman && lastHuman !== turnId) setLastHuman(turnId);
  const mesaId = turnIsHuman ? turnId : lastHuman || humans[0] || null;

  const views: Array<[string, string]> = [
    ['tv', 'TV'],
    ['mesa', 'Mesa']
  ];
  const effective = view === 'mesa' && !mesaId ? 'tv' : view;

  return (
    <div className="ct-host ct-host--diabo" data-testid="ct-screen" data-phase={ct.phase} data-mode={ct.mode}>
      <div className="ct-viewbar" data-testid="ct-viewbar">
        <span className="ct-viewbar-title">
          Plano do Diabo · Rodada {ct.round}/{ct.totalRounds}
        </span>
        <span className="ct-viewbar-label">Visão</span>
        <div className="ct-viewbar-opts">
          {views.map(([id, label]) => (
            <button key={id} type="button" className="rdb-seg" aria-pressed={effective === id} data-testid={'ct-view-' + id} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="ct-viewbar-label">Celular</span>
        <div className="ct-viewbar-opts">
          {ct.order.map((id) => (
            <button
              key={id}
              type="button"
              className="rdb-seg"
              aria-pressed={effective === 'p:' + id}
              data-testid={'ct-view-p:' + id}
              onClick={() => setView('p:' + id)}
            >
              {nameOf(id)}
            </button>
          ))}
        </div>
      </div>

      {effective === 'tv' ? (
        <div className="ct-host-body dbt">
          <div className="dbt-map">
            <CTBoardView board={ct.boards[0]} order={ct.order} label="Mapa da partida" testid="ct-tv-board-mapa" />
          </div>
          <aside className="dbt-side">
            <p className="dbt-legend">
              Quadrado da sua cor: {[2, 3, 4, 5].map((k) => `${k}×${k} +${squareBonus(k)}`).join(' · ')}
            </p>

            <section className="dbt-block dbt-block--shop">
              <h3 className="ct-panel-title">Loja</h3>
              <ul className="ct-shop dbt-shop" data-testid="ct-tv-shop" style={{ '--n': Math.max(4, (ct.shop || []).length) } as React.CSSProperties}>
                {(ct.shop || []).map((p) => (
                  <li key={p.uid} className="ct-shop-card ct-shop-card--static">
                    <span className="ct-shop-num">{p.devil ? <DevilGlyph title="Peça do Diabo" /> : p.size}</span>
                    <CTPieceView shape={p.shape} label={pieceTitle(p)} />
                    <span className="ct-shop-pts">
                      {p.pts} pts
                      <CTPieceBadges piece={p} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={'dbt-block' + (ct.contracts?.length ? '' : ' dbt-block--wide')}>
              <h3 className="ct-panel-title">Placar</h3>
              <DiaboRank state={ct} players={players} turnId={turnId} />
            </section>

            {ct.contracts?.length ? (
              <section className="dbt-block">
                <h3 className="ct-panel-title">Contratos</h3>
                <ContractList state={ct} nameOf={nameOf} />
              </section>
            ) : null}

            <ul className="ct-log dbt-log dbt-block--wide">
              {(ct.log || []).slice(0, 3).map((e) => (
                <li key={e.id}>
                  {e.playerId && <strong>{nameOf(e.playerId)}</strong>} {e.text}
                  {e.delta !== 0 && <span className={e.delta > 0 ? 'is-plus' : 'is-minus'}> {e.delta > 0 ? '+' + e.delta : e.delta}</span>}
                </li>
              ))}
            </ul>

            <div className="ct-tv-director">
              <button
                type="button"
                className="rdb-btn"
                data-testid="ct-skip-btn"
                onClick={() => {
                  sounds.playFlip();
                  onUpdate((prev) => forceAdvance(prev));
                }}
              >
                Pular a vez de {nameOf(turnId)}
              </button>
              {askEnd ? (
                <button
                  type="button"
                  className="rdb-btn rdb-setup-start"
                  data-testid="ct-end-confirm-btn"
                  onClick={() => {
                    setAskEnd(false);
                    onUpdate((prev) => finishNow(prev));
                  }}
                >
                  Confirmar: encerrar agora
                </button>
              ) : (
                <button type="button" className="rdb-btn" data-testid="ct-end-btn" onClick={() => setAskEnd(true)}>
                  Encerrar partida
                </button>
              )}
            </div>
          </aside>
        </div>
      ) : effective === 'mesa' && mesaId ? (
        <div className="ct-host-body ct-mesa">
          <div className="ct-box ct-mesa-seat">
            <CTSeat key={mesaId} state={ct} players={players} playerId={mesaId} onUpdate={onUpdate} />
          </div>
        </div>
      ) : (
        <div className="ct-host-body ct-host-body--center">
          <div className="ct-box ct-phone-frame" data-testid="ct-phone-frame">
            <CTSeat key={effective} state={ct} players={players} playerId={effective.slice(2)} onUpdate={onUpdate} />
          </div>
        </div>
      )}
    </div>
  );
};
