import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { ComTerraState, GameRoom } from '../../types/game';
import {
  CT_MODE_LABEL,
  actingPlayers,
  currentPlayerId,
  finishNow,
  forceAdvance,
  playerStage,
  ranking
} from '../../utils/comTerraEngine';
import { sounds } from '../../utils/soundEffects';
import { PlayerMark } from '../rdb/PlayerMark';
import { CTBoardView, CTPieceView, ctColor } from '../comterra/CTBoardView';
import { CTSeat } from '../comterra/CTSeat';
import { CTSummary } from '../comterra/CTSummary';
import { BPSeat, BPTable } from '../comterra/BPViews';
import { bpCurrent } from '../../utils/bpEngine';
import '../comterra/comterra.css';

interface ScreenComTerraProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateComTerraState: (updater: (prev: ComTerraState) => ComTerraState) => void;
  onNextRound: () => void;
}

const PHASE_LABEL: Record<ComTerraState['phase'], string> = {
  TURN: 'Turnos',
  PICK: 'Fase 1: escolha da peça',
  SABOTAGE: 'Fase 2: sabotagem',
  PLACE: 'Fase 3: colocação',
  SUMMARY: 'Resultado'
};

/**
 * Com Terra na tela principal.
 * A barra "Visao" troca entre a TV (so assiste), a Mesa (joga-se na propria tela, um por vez) e a tela de
 * celular de cada jogador, para testar o fluxo inteiro num aparelho so.
 */
export const ScreenComTerra: React.FC<ScreenComTerraProps> = ({ room, onUpdateComTerraState, onNextRound }) => {
  const ct = room.comTerra;
  const [view, setView] = useState<string>(room.connectionMode === 'local' ? 'mesa' : 'tv');
  const [seatPick, setSeatPick] = useState<string | null>(null);
  const [askEnd, setAskEnd] = useState(false);

  if (!ct) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Montando o tabuleiro...</div>;
  }

  const players = room.players;
  if (ct.bp && ct.phase !== 'SUMMARY') {
    const cur = bpCurrent(ct.bp) || ct.order[0];
    const local = room.connectionMode === 'local';
    return (
      <div className="ct-screen bp-screen" data-testid="screen-com-terra">
        <header className="rdb-lim-bar">
          <span className="rdb-lim-title">
            Com Terra <span className="rdb-lim-round">Arquiteto</span>
          </span>
          <span
            className="rdb-lim-rule"
            tabIndex={0}
            data-tip="Regras do Bärenpark: coloque uma peça do estoque por vez, encostada nas suas. Cada ícone coberto dá uma peça nova; o Ingresso abre uma área nova. Área completa = Taça no palco. Quem completar 4 áreas encerra."
          >
            <Info size={16} />
          </span>
          <div className="rdb-lim-tools">
            <button type="button" className="rdb-seg" aria-pressed={view === 'tv'} onClick={() => setView('tv')}>
              Todos os parques
            </button>
            <button type="button" className="rdb-seg" aria-pressed={view !== 'tv'} onClick={() => setView('mesa')}>
              Vez de quem joga
            </button>
          </div>
        </header>
        {view === 'tv' && !local ? (
          <BPTable state={ct} players={players} />
        ) : view === 'tv' ? (
          <BPTable state={ct} players={players} />
        ) : (
          <BPSeat key={cur} state={ct} players={players} playerId={cur} onUpdate={onUpdateComTerraState} />
        )}
      </div>
    );
  }
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name || 'Jogador';
  const acting = actingPlayers(ct);
  const turnId = currentPlayerId(ct);
  const seatId = seatPick && acting.includes(seatPick) ? seatPick : acting[0] || ct.order[0];
  const rank = ranking(ct);
  const done = ct.phase === 'SUMMARY';

  const views: Array<[string, string]> = [
    ['tv', 'TV'],
    ['mesa', 'Mesa'],
    ...ct.order.map((id): [string, string] => ['p:' + id, 'Celular: ' + nameOf(id)]),
    ['solo', 'Só celular']
  ];

  const skipLabel =
    ct.phase === 'PICK'
      ? 'Dar peça a quem falta'
      : ct.phase === 'SABOTAGE'
      ? 'Encerrar sabotagem'
      : `Pular a vez de ${nameOf(turnId)}`;

  const seatChips = (
    <div className="ct-chips" data-testid="ct-seat-chips">
      <span className="ct-chips-label">Jogando agora</span>
      {ct.order.map((id) => (
        <button
          key={id}
          type="button"
          className="rdb-seg"
          aria-pressed={seatId === id}
          disabled={!acting.includes(id)}
          data-testid={'ct-chip-' + id}
          onClick={() => setSeatPick(id)}
        >
          {nameOf(id)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="ct-host" data-testid="ct-screen" data-phase={ct.phase} data-mode={ct.mode}>
      <div className="ct-viewbar" data-testid="ct-viewbar">
        <span className="ct-viewbar-title">
          Com Terra · {CT_MODE_LABEL[ct.mode]} · Rodada {ct.round}/{ct.totalRounds}
        </span>
        <span className="ct-viewbar-label">Visão</span>
        <div className="ct-viewbar-opts">
          {views.map(([id, label]) => (
            <button key={id} type="button" className="rdb-seg" aria-pressed={view === id} data-testid={'ct-view-' + id} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {done ? (
        <div className="ct-host-body ct-host-body--center">
          <CTSummary state={ct} players={players} onFinish={onNextRound} />
        </div>
      ) : view === 'tv' ? (
        <div className="ct-host-body ct-tv">
          <div className={'ct-tv-boards ct-tv-boards--' + ct.boards.length}>
            {ct.boards.map((b) => (
              <figure key={b.id} className={'ct-tv-board' + (b.owner && b.owner === turnId ? ' is-turn' : '')}>
                {b.owner && (
                  <figcaption>
                    <span className="ct-swatch" style={{ background: ctColor(ct.order, b.owner).top }} aria-hidden="true" />
                    <PlayerMark p={players.find((p) => p.id === b.owner)} />
                    <span className="ct-rank-name">{nameOf(b.owner)}</span>
                    <span className="ct-rank-pts">{ct.pointsAwarded[b.owner] || 0} pts</span>
                  </figcaption>
                )}
                <div className="ct-tv-board-svg">
                  <CTBoardView board={b} order={ct.order} label={b.owner ? `Tabuleiro de ${nameOf(b.owner)}` : 'Mapa da partida'} testid={'ct-tv-board-' + b.id} />
                </div>
              </figure>
            ))}
          </div>

          <aside className="ct-tv-side">
            <div className="ct-tv-phase">
              <span className="rdb-tag">{PHASE_LABEL[ct.phase]}</span>
              <p data-testid="ct-tv-status">
                {ct.phase === 'PICK'
                  ? 'Todos escolhem uma peça na loja, sem testar.'
                  : ct.phase === 'SABOTAGE'
                  ? 'Cada um planta uma árvore ou põe uma ficha no mapa.'
                  : `Vez de ${nameOf(turnId)}`}
              </p>
            </div>

            <ol className="ct-rank" data-testid="ct-tv-queue">
              {(ct.phase === 'PLACE' || ct.phase === 'TURN' ? ct.queue : rank.map((r) => r.playerId)).map((id, i) => {
                const piece = (ct.hand || {})[id];
                const st = playerStage(ct, id);
                return (
                  <li key={id} className={id === turnId ? 'is-turn' : ''}>
                    <span className="ct-rank-pos">{i + 1}</span>
                    <span className="ct-swatch" style={{ background: ctColor(ct.order, id).top }} aria-hidden="true" />
                    <PlayerMark p={players.find((p) => p.id === id)} />
                    <span className="ct-rank-name">{nameOf(id)}</span>
                    <span className="ct-rank-piece">
                      {piece ? `peça ${piece.size}` : st === 'pick' ? 'escolhendo' : st === 'sabotage' ? 'sabotando' : ''}
                    </span>
                    <span className="ct-rank-pts">{ct.pointsAwarded[id] || 0}</span>
                  </li>
                );
              })}
            </ol>

            <div className="ct-tv-shop">
              <h3 className="ct-panel-title">Loja</h3>
              <ul className="ct-shop ct-shop--tv" data-testid="ct-tv-shop">
                {(ct.shop || []).map((p) => (
                  <li key={p.uid} className="ct-shop-card ct-shop-card--static">
                    <span className="ct-shop-num">{p.size}</span>
                    <CTPieceView shape={p.shape} label={`Peça ${p.size}`} />
                    <span className="ct-shop-pts">{p.pts} pts</span>
                  </li>
                ))}
              </ul>
            </div>

            <ul className="ct-log">
              {(ct.log || []).slice(0, 3).map((e) => (
                <li key={e.id}>
                  <strong>{nameOf(e.playerId)}</strong> {e.text}
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
                  onUpdateComTerraState((prev) => forceAdvance(prev));
                }}
              >
                {skipLabel}
              </button>
              {askEnd ? (
                <button
                  type="button"
                  className="rdb-btn rdb-setup-start"
                  data-testid="ct-end-confirm-btn"
                  onClick={() => {
                    setAskEnd(false);
                    onUpdateComTerraState((prev) => finishNow(prev));
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
      ) : view === 'mesa' ? (
        <div className="ct-host-body ct-mesa">
          {seatChips}
          <div className="ct-box ct-mesa-seat">
            <CTSeat key={seatId} state={ct} players={players} playerId={seatId} onUpdate={onUpdateComTerraState} />
          </div>
        </div>
      ) : (
        <div className="ct-host-body ct-host-body--center">
          {view === 'solo' && seatChips}
          <div className="ct-box ct-phone-frame" data-testid="ct-phone-frame">
            {view === 'solo' ? (
              <CTSeat key={'solo' + seatId} state={ct} players={players} playerId={seatId} onUpdate={onUpdateComTerraState} />
            ) : (
              <CTSeat key={view} state={ct} players={players} playerId={view.slice(2)} onUpdate={onUpdateComTerraState} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
