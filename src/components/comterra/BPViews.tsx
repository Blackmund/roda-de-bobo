import React, { useMemo, useState } from 'react';
import { Check, FlipHorizontal2, RotateCw, SkipForward } from 'lucide-react';
import type { BPState, BPTileType, ComTerraState, Player } from '../../types/game';
import { flipH, rotateCW } from '../../utils/comTerraEngine';
import {
  BP_COLOR_ORDER,
  BP_ENTRANCE,
  BP_GRID_H,
  BP_GRID_W,
  BP_TILE_META,
  areaSpots,
  bpBoard,
  bpCanPlace,
  bpCanPlaceAny,
  bpCurrent,
  bpPass,
  bpPlace,
  bpPlaceArea,
  bpRanking,
  bpScore,
  bpTakeReward,
  rewardOptions,
  rewardValue,
  tileKind,
  tileShape,
  topAreaIcons
} from '../../utils/bpEngine';
import { sounds } from '../../utils/soundEffects';
import { PlayerMark } from '../rdb/PlayerMark';
import { BPIconSvg, BP_ICON_META, BP_PALETTE, CTBoardView, CTPieceView } from './CTBoardView';

const KIND_COLOR = { green: BP_PALETTE.green, house: BP_PALETTE.house, enclosure: BP_PALETTE.enclosure };
const KIND_LABEL = { green: 'Área verde', house: 'Casa de animal', enclosure: 'Cercado' };
const REWARD_TITLE: Record<string, string> = {
  wheel: 'Bandeirinha: escolha uma Área Verde',
  cement: 'Telão: escolha uma Casa (ou Área Verde)',
  excavator: 'Craque: escolha um Cercado (ou Casa, ou Área Verde)',
  pass: 'Você passou a vez: escolha uma Área Verde',
  crew: 'Cone: abra uma área nova'
};

type Upd = (fn: (prev: ComTerraState) => ComTerraState) => void;

/** Aplica uma acao do Barenpark no estado do Com Terra e, quando acaba, grava os pontos e vai para o resumo. */
export function withBP(prev: ComTerraState, fn: (bp: BPState) => BPState): ComTerraState {
  if (!prev.bp) return prev;
  const bp = fn(prev.bp);
  if (bp === prev.bp) return prev;
  if (!bp.finished) return { ...prev, bp };
  const pointsAwarded: Record<string, number> = {};
  bp.order.forEach((id) => (pointsAwarded[id] = bpScore(bp, id)));
  return { ...prev, bp, phase: 'SUMMARY', pointsAwarded };
}

const TileChip: React.FC<{
  type: BPTileType;
  pts?: number;
  on?: boolean;
  onClick?: () => void;
  testid?: string;
  count?: number;
  countTip?: string;
}> = ({ type, pts, on, onClick, testid, count, countTip }) => {
  const kind = tileKind(type);
  return (
    <button type="button" className={`bp-tile is-${kind}` + (on ? ' is-on' : '')} onClick={onClick} data-testid={testid} data-tip={BP_TILE_META[type].label}>
      {count !== undefined && (
        <span className={'bp-tile-count' + (count === 0 ? ' is-zero' : '')} data-tip={countTip} aria-label={countTip}>
          ×{count}
        </span>
      )}
      <CTPieceView shape={tileShape(type)} color={KIND_COLOR[kind]} label={BP_TILE_META[type].label} className="bp-tile-art" minBox={2} />
      <span className="bp-tile-name">{BP_TILE_META[type].label.replace(/^(Casa|Cercado) d[oa] /, '')}</span>
      <span className="bp-tile-pts" data-tip="Pontos">
        {pts ?? 0}
        <small>pts</small>
      </span>
    </button>
  );
};

/** Legenda: icone grande -> o que ele da, na cor da peca. */
const LEGEND: { k: string; name: string; gives: string; color: string }[] = [
  { k: 'wheel', name: 'Bandeirinha', gives: 'Área Verde', color: BP_PALETTE.green.top },
  { k: 'cement', name: 'Telão', gives: 'Casa', color: BP_PALETTE.house.top },
  { k: 'excavator', name: 'Craque', gives: 'Cercado', color: BP_PALETTE.enclosure.top },
  { k: 'crew', name: 'Cone', gives: 'Área nova', color: '#e6194b' },
  { k: 'pit', name: 'Palco', gives: 'Taça', color: '#ffc93c' }
];
export const BPLegend: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <ul className={'bp-legend2' + (compact ? ' is-compact' : '')} aria-label="O que cada ícone dá">
    {LEGEND.map((l) => (
      <li key={l.k} data-tip={l.k === 'pit' ? 'Palco: não pode cobrir. Completou a área? Ganha a Taça do topo' : BP_ICON_META[l.k].label}>
        <BPIconSvg kind={l.k} size="100%" />
        <span>
          <small>{l.name}</small>
          <b style={{ ['--c' as string]: l.color } as React.CSSProperties}>{l.gives}</b>
        </span>
      </li>
    ))}
  </ul>
);

/** A vez de um jogador: o parque dele, o estoque, as recompensas e a area nova. */
export const BPSeat: React.FC<{ state: ComTerraState; players: Player[]; playerId: string; onUpdate: Upd }> = ({ state, players, playerId, onUpdate }) => {
  const bp = state.bp!;
  const park = bp.parks[playerId];
  const [sel, setSel] = useState<string | null>(null);
  const [m, setM] = useState<number[][] | null>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [pile, setPile] = useState<0 | 1>(0);
  const board = useMemo(() => bpBoard(bp, playerId), [bp, playerId]);
  if (!park) return null;

  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name || 'Jogador';
  const myTurn = bpCurrent(bp) === playerId;
  const pend = bp.pending[0] && bp.pending[0].playerId === playerId ? bp.pending[0] : null;
  const tile = park.supply.find((t) => t.uid === sel) || null;
  const shape = tile ? m || tileShape(tile) : null;
  const ghost =
    tile && shape && at
      ? (() => {
          const gx = at.x - Math.floor((shape[0]?.length || 1) / 2);
          const gy = at.y - Math.floor(shape.length / 2);
          return { m: shape, x: gx, y: gy, ok: bpCanPlace(park, shape, gx, gy).ok, playerId: tileKind(tile) };
        })()
      : null;
  const canPlaceAny = bpCanPlaceAny(park);
  const groups: { type: BPTileType; pts: number; uids: string[] }[] = [];
  park.supply.forEach((t) => {
    const g = groups.find((x) => x.type === t.type && x.pts === t.pts);
    if (g) g.uids.push(t.uid);
    else groups.push({ type: t.type, pts: t.pts, uids: [t.uid] });
  });

  const pick = (uid: string) => {
    sounds.playTick();
    setSel(uid === sel ? null : uid);
    setM(null);
    setAt(null);
  };
  const place = () => {
    if (!tile || !ghost?.ok) return;
    sounds.playSuccess();
    onUpdate((prev) => withBP(prev, (b) => bpPlace(b, playerId, tile.uid, ghost.m, ghost.x, ghost.y)));
    setSel(null);
    setM(null);
    setAt(null);
  };

  return (
    <div className="bp-seat" data-testid="bp-seat">
      <header className="bp-seat-head">
        <span className="bp-seat-who">
          {players.find((p) => p.id === playerId) && <PlayerMark p={players.find((p) => p.id === playerId)!} />} {nameOf(playerId)}
        </span>
        <span className="bp-seat-score" data-tip="Pontos no parque (peças + taças)">
          {bpScore(bp, playerId)} pts
        </span>
        <span className={'bp-seat-turn' + (myTurn ? ' is-me' : '')}>
          {bp.finished ? 'Fim de jogo' : myTurn ? 'Sua vez' : `Vez de ${nameOf(bpCurrent(bp))}`}
          {bp.turnsLeft !== null && !bp.finished ? ' · última volta' : ''}
        </span>
      </header>

      <div className="bp-seat-main">
        <div className="bp-seat-board">
          <CTBoardView
            board={board}
            order={BP_COLOR_ORDER}
            ghost={myTurn && !pend ? ghost : null}
            onCell={myTurn && !pend && tile ? (x, y) => setAt({ x, y }) : undefined}
            label={`Parque de ${nameOf(playerId)}`}
            testid="bp-board"
          />
          <BPLegend />
        </div>

        <aside className="bp-seat-side">
          {pend && pend.kind !== 'crew' && (
            <section className="bp-reward" data-testid="bp-reward">
              <h4>{REWARD_TITLE[pend.kind]}</h4>
              <div className="bp-tiles">
                {rewardOptions(bp, pend.kind).map((t) => (
                  <TileChip
                    key={t}
                    type={t}
                    pts={rewardValue(bp, t)}
                    testid={`bp-reward-${t}`}
                    count={tileKind(t) === 'green' ? bp.greens[t] : tileKind(t) === 'house' ? bp.houses[t].length : bp.enclosures[t].length}
                    countTip="Quantas sobram no estoque geral"
                    onClick={() => {
                      sounds.playPowerup();
                      onUpdate((prev) => withBP(prev, (b) => bpTakeReward(b, playerId, t)));
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {pend && pend.kind === 'crew' && (
            <section className="bp-reward" data-testid="bp-crew">
              <h4>{REWARD_TITLE.crew}</h4>
              <p className="bp-crew-step">1. Escolha a área</p>
              <div className="bp-area-options">
                {([0, 1] as const).map((i) => {
                  const icons = topAreaIcons(bp, i);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={'bp-area-option' + (pile === i ? ' is-on' : '')}
                      disabled={!icons}
                      data-testid={`bp-area-option-${i}`}
                      aria-pressed={pile === i}
                      onClick={() => {
                        sounds.playTick();
                        setPile(i);
                      }}
                    >
                      <span className="bp-area-mini">
                        {(icons || Array(16).fill(null)).map((ic, k) => (
                          <i key={k}>{ic ? <BPIconSvg kind={ic} size="100%" title={ic === 'pit' ? 'Palco' : BP_ICON_META[ic].name} /> : null}</i>
                        ))}
                      </span>
                      <small>{icons ? `Opção ${i + 1} · restam ${bp.areaPiles[i].length}` : 'Pilha vazia'}</small>
                    </button>
                  );
                })}
              </div>
              <p className="bp-crew-step">2. Escolha o lado onde ela encaixa</p>
              <div className="bp-spots" style={{ gridTemplateColumns: `repeat(${BP_GRID_W}, 1fr)` }}>
                {Array.from({ length: BP_GRID_W * BP_GRID_H }, (_, i) => {
                  const ax = i % BP_GRID_W;
                  const ay = Math.floor(i / BP_GRID_W);
                  const owned = park.areas.find((a) => a.ax === ax && a.ay === ay);
                  const spot = areaSpots(park).some((o) => o.ax === ax && o.ay === ay);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={'bp-spot' + (owned ? ' is-owned' : spot ? ' is-free' : '')}
                      disabled={!spot}
                      data-testid={spot ? `bp-spot-${ax}-${ay}` : undefined}
                      aria-label={spot ? 'Abrir área aqui' : owned ? (owned.entrance ? 'Entrada' : 'Área') : 'Indisponível'}
                      onClick={() => {
                        sounds.playPowerup();
                        onUpdate((prev) => withBP(prev, (b) => bpPlaceArea(b, playerId, pile, ax, ay)));
                      }}
                    >
                      {owned ? (owned.entrance ? 'E' : '■') : spot ? '+' : ''}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {!pend && (
            <section className="bp-supply" data-testid="bp-supply">
              <h4>Seu estoque <span className="bp-h4-n">{park.supply.length === 0 ? 'vazio' : `${park.supply.length} ${park.supply.length === 1 ? 'peça' : 'peças'}`}</span></h4>
              <div className="bp-tiles">
                {groups.map((g) => {
                  const on = g.uids.includes(sel || '');
                  return (
                    <TileChip
                      key={g.uids[0]}
                      type={g.type}
                      pts={g.pts}
                      on={on}
                      count={g.uids.length}
                      countTip={g.uids.length === 1 ? 'Você tem 1 dessa' : `Você tem ${g.uids.length} dessas`}
                      onClick={myTurn ? () => pick(on ? sel! : g.uids[0]) : undefined}
                      testid={`bp-supply-${g.type}`}
                    />
                  );
                })}
              </div>
              {myTurn && tile && (
                <div className="bp-actions">
                  <button type="button" className="rdb-lim-icon" aria-label="Girar" data-tip="Girar" onClick={() => setM(rotateCW(shape!))}>
                    <RotateCw size={16} />
                  </button>
                  <button type="button" className="rdb-lim-icon" aria-label="Espelhar" data-tip="Espelhar" onClick={() => setM(flipH(shape!))}>
                    <FlipHorizontal2 size={16} />
                  </button>
                  <button type="button" className="rdb-btn rdb-pro-hit" data-testid="bp-place" disabled={!ghost?.ok} onClick={place}>
                    <Check /> {ghost ? (ghost.ok ? 'Colocar aqui' : bpCanPlace(park, ghost.m, ghost.x, ghost.y).reason) : 'Toque no parque'}
                  </button>
                </div>
              )}
              {myTurn && !canPlaceAny && (
                <button
                  type="button"
                  className="rdb-btn"
                  data-testid="bp-pass"
                  onClick={() => {
                    sounds.playFlip();
                    onUpdate((prev) => withBP(prev, (b) => bpPass(b, playerId)));
                  }}
                >
                  <SkipForward /> Nenhuma peça cabe: passar e pegar uma Área Verde
                </button>
              )}
            </section>
          )}

        </aside>
      </div>
    </div>
  );
};

/** TV: todos os parques, o estoque geral e o placar. */
export const BPTable: React.FC<{ state: ComTerraState; players: Player[] }> = ({ state, players }) => {
  const bp = state.bp!;
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || 'Jogador';
  const cur = bpCurrent(bp);
  const rank = bpRanking(bp);
  return (
    <div className="bp-table" data-testid="bp-table">
      <div className="bp-parks" style={{ gridTemplateColumns: `repeat(${Math.min(bp.order.length, 2)}, minmax(0, 1fr))` }}>
        {bp.order.map((id) => (
          <div key={id} className={'bp-park' + (cur === id ? ' is-turn' : '')}>
            <div className="bp-park-head">
              <strong>{nameOf(id)}</strong>
              <span>{bpScore(bp, id)} pts</span>
              <span className="bp-park-sup" data-tip="Peças no estoque">
                {bp.parks[id].supply.length} no estoque
              </span>
            </div>
            <CTBoardView board={bpBoard(bp, id)} order={BP_COLOR_ORDER} label={`Parque de ${nameOf(id)}`} />
          </div>
        ))}
      </div>
      <aside className="bp-stock" aria-label="Estoque geral">
        <h4>Estoque geral</h4>
        {(['house', 'enclosure'] as const).map((kind) => {
          const piles = kind === 'house' ? bp.houses : bp.enclosures;
          return (
            <div key={kind} className={'bp-stock-group is-' + kind}>
              <span className="bp-stock-cap">{kind === 'house' ? 'Casas' : 'Cercados'}</span>
              <div className="bp-stock-pieces">
                {Object.entries(piles).map(([t, pile]) => (
                  <div key={t} className={'bp-stock-piece' + (pile.length ? '' : ' is-out')} data-tip={`${BP_TILE_META[t as BPTileType].label}: vale ${pile.length ? pile[pile.length - 1] : 0}, restam ${pile.length}`}>
                    <CTPieceView shape={tileShape(t as BPTileType)} color={KIND_COLOR[kind]} label={BP_TILE_META[t as BPTileType].label} className="bp-stock-art" minBox={3} />
                    <b>{pile.length ? pile[pile.length - 1] : '–'}</b>
                    <small>×{pile.length}</small>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="bp-stock-extra">
          <div data-tip="Próxima Taça: vai para quem completar uma área">
            <BPIconSvg kind="pit" size="1.9rem" />
            <b>{bp.statues[0] ?? '–'}</b>
            <small>Taça</small>
          </div>
          <div data-tip="Áreas novas nas duas pilhas">
            <BPIconSvg kind="crew" size="1.9rem" />
            <b>{bp.areaPiles[0].length + bp.areaPiles[1].length}</b>
            <small>Áreas</small>
          </div>
        </div>
        <BPLegend compact />
        <ol className="bp-rank">
          {rank.map((r) => (
            <li key={r.playerId}>
              {nameOf(r.playerId)} <b>{r.points}</b>
            </li>
          ))}
        </ol>
        <ul className="bp-log">
          {bp.log.slice(-4).reverse().map((l) => (
            <li key={l.id}>
              <b>{nameOf(l.playerId)}</b> {l.text}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};

export const BP_KIND_LABEL = KIND_LABEL;
export const BP_ENTRANCE_POS = BP_ENTRANCE;
