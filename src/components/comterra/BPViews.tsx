import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Eye,
  FlipHorizontal2,
  RotateCw,
  SkipForward
} from 'lucide-react';
import type { BPRewardKind, BPState, BPTileType, ComTerraState, Player } from '../../types/game';
import { flipH, rotateCW } from '../../utils/comTerraEngine';
import {
  BP_COLOR_ORDER,
  BP_ENCLOSURES,
  BP_ENTRANCE,
  BP_GREENS,
  BP_GRID_H,
  BP_GRID_W,
  BP_HOUSES,
  BP_ICON_LABEL,
  BP_TILE_META,
  areaSpots,
  bpBoard,
  bpCanPlace,
  bpCanPlaceAny,
  bpCurrent,
  bpHasPlacement,
  bpPass,
  bpPlace,
  bpPlaceArea,
  bpScore,
  bpTakeReward,
  findFirstValidPlacement,
  parkCellBounds,
  rewardOptions,
  rewardValue,
  rotateGhostKeepingCenter,
  snapPlacementToCell,
  tileKind,
  tileShape,
  topAreaIcons
} from '../../utils/bpEngine';
import { sounds } from '../../utils/soundEffects';
import { PlayerMark } from '../rdb/PlayerMark';
import { BPIconBadge, BPIconSvg, BP_ICON_META, BP_PALETTE, CTBoardView, CTPieceView } from './CTBoardView';

const KIND_COLOR = { green: BP_PALETTE.green, house: BP_PALETTE.house, enclosure: BP_PALETTE.enclosure };
const KIND_LABEL = { green: 'Área Verde', house: 'Viveiro', enclosure: 'Cercado' };

const REWARD_TITLE: Record<BPRewardKind, string> = {
  wheel: 'Carriola: escolha uma Área Verde',
  cement: 'Betoneira: escolha um Viveiro (ou Área Verde)',
  excavator: 'Cavadeira: escolha 1 dos 12 Cercados (ou inferior)',
  pass: 'Passou a vez: escolha uma Área Verde',
  crew: 'Equipe de Obra: abra uma nova área 4×4'
};

type Upd = (fn: (prev: ComTerraState) => ComTerraState) => void;

const shortTileName = (type: BPTileType): string => BP_TILE_META[type].label.replace(/^Cercado d[oa] /, '');
const stockShortName = (type: BPTileType): string => {
  const s = shortTileName(type);
  if (s === 'Viveiro das Araras') return 'Araras';
  if (s === 'Lago das Capivaras') return 'Capivaras';
  if (s === 'Bosque dos Micos') return 'Micos';
  if (s === 'Toca da Onça') return 'Onça';
  return s;
};

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
  compact?: boolean;
}> = ({ type, pts, on, onClick, testid, count, countTip, compact }) => {
  const kind = tileKind(type);
  const fullLabel = BP_TILE_META[type].label;
  return (
    <button
      type="button"
      className={`bp-tile is-${kind}` + (on ? ' is-on' : '') + (compact ? ' is-compact' : '')}
      onClick={onClick}
      data-testid={testid}
      data-tip={fullLabel}
    >
      {count !== undefined && (
        <span className={'bp-tile-count' + (count === 0 ? ' is-zero' : '')} data-tip={countTip} aria-label={countTip}>
          ×{count}
        </span>
      )}
      <CTPieceView shape={tileShape(type)} color={KIND_COLOR[kind]} label={fullLabel} className="bp-tile-art" minBox={compact ? 3 : 2} />
      <span className="bp-tile-name">{compact ? stockShortName(type) : shortTileName(type)}</span>
      <span className="bp-tile-pts" data-tip="Pontos">
        {pts ?? 0}
        <small>pts</small>
      </span>
    </button>
  );
};

/** Legenda compacta dos 5 icones estilo Barenpark. */
const LEGEND: { k: string; name: string; gives: string; color: string }[] = [
  { k: 'wheel', name: BP_ICON_LABEL.wheel, gives: 'Verde', color: BP_PALETTE.green.top },
  { k: 'cement', name: BP_ICON_LABEL.cement, gives: 'Viveiro', color: BP_PALETTE.house.top },
  { k: 'excavator', name: BP_ICON_LABEL.excavator, gives: 'Cercado', color: BP_PALETTE.enclosure.top },
  { k: 'crew', name: 'Equipe', gives: 'Área 4×4', color: '#e6194b' },
  { k: 'pit', name: BP_ICON_LABEL.pit, gives: 'Estátua', color: '#ffc93c' }
];

export const BPLegend: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <ul className={'bp-legend2' + (compact ? ' is-compact' : '')} aria-label="O que cada ícone dá">
    {LEGEND.map((l) => (
      <li
        key={l.k}
        data-tip={l.k === 'pit' ? 'Fosso: não pode cobrir. Área 4×4 completa ganha o Monumento do topo' : BP_ICON_META[l.k].label}
      >
        <BPIconSvg kind={l.k} size="100%" />
        <span>
          <small>{l.name}</small>
          <b style={{ ['--c' as string]: l.color } as React.CSSProperties}>{l.gives}</b>
        </span>
      </li>
    ))}
  </ul>
);

/** Estoque central da Reserva sempre visivel: Monumentos, Areas, Areas Verdes, Viveiros e os 12 Cercados unicos. */
export const BPReserveStock: React.FC<{
  bp: BPState;
  dense?: boolean;
  eligibleTypes?: Set<BPTileType>;
  onPickReward?: (type: BPTileType) => void;
}> = ({ bp, dense, eligibleTypes, onPickReward }) => {
  const areaCount = bp.areaPiles[0].length + bp.areaPiles[1].length;
  const renderPiece = (
    type: BPTileType,
    extraClass: string,
    shape: number[][],
    color: { top: string; side: string },
    shortName: string,
    tip: string,
    children: React.ReactNode
  ) => {
    const canPick = Boolean(onPickReward && eligibleTypes?.has(type));
    const out =
      tileKind(type) === 'green'
        ? !(bp.greens[type] || 0)
        : tileKind(type) === 'house'
        ? !(bp.houses[type]?.length || 0)
        : !(bp.enclosures[type]?.length || 0);
    const cls =
      'bp-stock-piece ' +
      extraClass +
      (out ? ' is-out' : '') +
      (canPick ? ' is-pickable' : eligibleTypes ? ' is-dimmed' : '');
    if (canPick) {
      return (
        <button
          key={type}
          type="button"
          className={cls}
          data-tip={tip}
          onClick={() => onPickReward!(type)}
          aria-label={`Pegar ${BP_TILE_META[type].label}`}
        >
          <CTPieceView shape={shape} color={color} label={BP_TILE_META[type].label} className="bp-stock-art" minBox={extraClass.includes('--enc') ? 5 : extraClass.includes('--row') ? 3 : 4} />
          <span className="bp-stock-label">{shortName}</span>
          {children}
        </button>
      );
    }
    return (
      <div key={type} className={cls} data-tip={tip}>
        <CTPieceView shape={shape} color={color} label={BP_TILE_META[type].label} className="bp-stock-art" minBox={extraClass.includes('--enc') ? 5 : extraClass.includes('--row') ? 3 : 4} />
        <span className="bp-stock-label">{shortName}</span>
        {children}
      </div>
    );
  };

  return (
    <section className={'bp-reserve' + (dense ? ' is-dense' : '')} aria-label="Estoque da Reserva" data-testid="bp-reserve-stock">
      <div className="bp-reserve-top">
        <h4>Estoque da Reserva</h4>
        <div className="bp-stock-extra">
          <div data-tip="Próximo Monumento: vai para o Fosso de quem completar uma área 4×4">
            <BPIconBadge icon="pit" size="1.55rem" />
            <div>
              <b>{bp.statues[0] ?? '–'}</b>
              <small>{bp.statues.length} un.</small>
            </div>
          </div>
          <div data-tip={`Áreas 4×4 restantes nas 2 pilhas (${bp.areaPiles[0].length} + ${bp.areaPiles[1].length})`}>
            <BPIconBadge icon="crew" size="1.55rem" />
            <div>
              <b>{areaCount}</b>
              <small>Áreas</small>
            </div>
          </div>
        </div>
      </div>

      <div className="bp-stock-group is-green">
        <div className="bp-stock-cap">
          <BPIconBadge icon="wheel" size="1.05rem" /> Carriola · Áreas Verdes (0 pts)
        </div>
        <div className="bp-stock-greens">
          {BP_GREENS.map((g) => {
            const count = bp.greens[g] || 0;
            return renderPiece(
              g,
              'bp-stock-piece--row',
              tileShape(g),
              KIND_COLOR.green,
              shortTileName(g),
              `${BP_TILE_META[g].label}: ${count} restantes`,
              <small>×{count}</small>
            );
          })}
        </div>
      </div>

      <div className="bp-stock-group is-house">
        <div className="bp-stock-cap">
          <BPIconBadge icon="cement" size="1.05rem" /> Betoneira · Viveiros
        </div>
        <div className="bp-stock-pieces bp-stock-pieces--4">
          {BP_HOUSES.map((h) => {
            const pile = bp.houses[h] || [];
            const top = pile[pile.length - 1];
            return renderPiece(
              h,
              '',
              tileShape(h),
              KIND_COLOR.house,
              stockShortName(h),
              `${BP_TILE_META[h].label}: vale ${top ?? 0} pts, restam ${pile.length}`,
              <div className="bp-stock-meta">
                <b>{top ?? '–'}</b>
                <small>×{pile.length}</small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bp-stock-group is-enclosure">
        <div className="bp-stock-cap">
          <BPIconBadge icon="excavator" size="1.05rem" /> Cavadeira · 12 Cercados Únicos
        </div>
        <div className="bp-stock-enclosures">
          {BP_ENCLOSURES.map((e) => {
            const pile = bp.enclosures[e] || [];
            const top = pile[pile.length - 1];
            return renderPiece(
              e,
              'bp-stock-piece--enc',
              tileShape(e),
              KIND_COLOR.enclosure,
              stockShortName(e),
              `${BP_TILE_META[e].label}: ${top ? `${top} pts (${pile.length} un.)` : 'esgotado'}`,
              <div className="bp-stock-meta">
                <b>{top ?? '–'}</b>
                <small>×{pile.length}</small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/** Painel lateral com miniaturas de todos os parques da partida (clicar para espiar). */
const BPPlayerRail: React.FC<{
  bp: BPState;
  players: Player[];
  focusedId: string;
  activeId: string | null;
  onSelect: (pid: string) => void;
}> = ({ bp, players, focusedId, activeId, onSelect }) => {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || 'Jogador';
  return (
    <aside className="bp-rail" aria-label="Parques dos jogadores" data-testid="bp-player-rail">
      <div className="bp-rail-head">
        <h4>Parques ({bp.order.length})</h4>
        {bp.turnsLeft !== null && !bp.finished && <span className="bp-last-lap">Última volta</span>}
      </div>
      <div className={'bp-rail-list' + (bp.order.length >= 4 ? ' is-many' : ' is-few')}>
        {bp.order.map((id) => {
          const p = players.find((x) => x.id === id);
          const pk = bp.parks[id];
          const isTurn = activeId === id;
          const isFocused = focusedId === id;
          return (
            <button
              key={id}
              type="button"
              className={'bp-mini-park' + (isTurn ? ' is-turn' : '') + (isFocused ? ' is-focused' : '')}
              onClick={() => {
                sounds.playTick();
                onSelect(id);
              }}
              data-testid={`bp-mini-park-${id}`}
            >
              <div className="bp-mini-head">
                <span className="bp-mini-who">
                  {p && <PlayerMark p={p} />}
                  <span>{nameOf(id)}</span>
                </span>
                {isTurn && <em className="bp-mini-badge">Vez</em>}
                <strong className="bp-mini-pts">{bpScore(bp, id)} pts</strong>
              </div>
              <div className="bp-mini-svg">
                <CTBoardView board={bpBoard(bp, id)} order={BP_COLOR_ORDER} label={`Miniatura de ${nameOf(id)}`} />
              </div>
              <div className="bp-mini-foot">
                <span>Áreas {pk.areas.length}/4</span>
                <span>Estoque {pk.supply.length}</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

/** Conteudo de recompensa ao cobrir um icone (Carriola, Betoneira, Cavadeira ou Equipe de Obra). */
const BPRewardPanel: React.FC<{
  bp: BPState;
  playerId: string;
  kind: BPRewardKind;
  pendingCount: number;
  pile: 0 | 1;
  onSetPile: (p: 0 | 1) => void;
  onUpdate: Upd;
}> = ({ bp, playerId, kind, pendingCount, pile, onSetPile, onUpdate }) => {
  const [showLower, setShowLower] = useState(false);
  const park = bp.parks[playerId];
  const allOptions = rewardOptions(bp, kind);

  const primaryKind = kind === 'excavator' ? 'enclosure' : kind === 'cement' ? 'house' : 'green';
  const primary = allOptions.filter((t) => tileKind(t) === primaryKind);
  const secondary = allOptions.filter((t) => tileKind(t) !== primaryKind);
  const visible = showLower || primary.length === 0 ? allOptions : primary;

  if (kind === 'crew') {
    const spots = areaSpots(park);
    return (
      <section className="bp-reward" data-testid="bp-crew">
        <div className="bp-reward-head">
          <BPIconBadge icon="crew" size="2rem" />
          <div>
            {pendingCount > 1 && <span className="bp-reward-queue">Recompensa 1 de {pendingCount}</span>}
            <h4>{REWARD_TITLE.crew}</h4>
          </div>
        </div>
        <p className="bp-crew-step">1. Escolha qual pilha abrir</p>
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
                  onSetPile(i);
                }}
              >
                <span className="bp-area-mini">
                  {(icons || Array(16).fill(null)).map((ic, k) => (
                    <i key={k}>{ic ? <BPIconSvg kind={ic} size="100%" title={ic === 'pit' ? 'Fosso' : BP_ICON_META[ic].name} /> : null}</i>
                  ))}
                </span>
                <small>{icons ? `Pilha ${i + 1} · restam ${bp.areaPiles[i].length}` : 'Pilha vazia'}</small>
              </button>
            );
          })}
        </div>
        <p className="bp-crew-step">2. Clique em "+ NOVA ÁREA" no mapa ao lado (ou abaixo)</p>
        <div className="bp-spots" style={{ gridTemplateColumns: `repeat(${BP_GRID_W}, 1fr)` }}>
          {Array.from({ length: BP_GRID_W * BP_GRID_H }, (_, i) => {
            const ax = i % BP_GRID_W;
            const ay = Math.floor(i / BP_GRID_W);
            const owned = park.areas.find((a) => a.ax === ax && a.ay === ay);
            const spot = spots.some((o) => o.ax === ax && o.ay === ay);
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
    );
  }

  const iconKey = kind === 'pass' ? 'wheel' : kind;
  return (
    <section className="bp-reward" data-testid="bp-reward">
      <div className="bp-reward-head">
        <BPIconBadge icon={iconKey} size="1.55rem" />
        <div className="bp-reward-title">
          {pendingCount > 1 && <span className="bp-reward-queue">Recompensa 1 de {pendingCount}</span>}
          <h4>{REWARD_TITLE[kind]}</h4>
        </div>
        {secondary.length > 0 && primary.length > 0 && (
          <button type="button" className="rdb-seg bp-lower-toggle" onClick={() => setShowLower((v) => !v)}>
            {showLower
              ? 'Só principal'
              : `+ ${kind === 'excavator' ? 'Inferiores' : 'Área Verde'} (${secondary.length})`}
          </button>
        )}
      </div>
      <div className={'bp-tiles bp-tiles--reward' + (kind === 'excavator' ? ' is-dense' : '')}>
        {visible.map((t) => (
          <TileChip
            key={t}
            type={t}
            pts={rewardValue(bp, t)}
            compact
            testid={`bp-reward-${t}`}
            count={tileKind(t) === 'green' ? bp.greens[t] : tileKind(t) === 'house' ? bp.houses[t].length : bp.enclosures[t].length}
            countTip="Unidades restantes na Reserva"
            onClick={() => {
              sounds.playPowerup();
              onUpdate((prev) => withBP(prev, (b) => bpTakeReward(b, playerId, t)));
            }}
          />
        ))}
      </div>
    </section>
  );
};

/** A vez de um jogador (Mesa ou Celular): parque em destaque + controles ageis + Estoque da Reserva + Parques da Roda. */
export const BPSeat: React.FC<{
  state: ComTerraState;
  players: Player[];
  playerId: string;
  onUpdate: Upd;
  readOnly?: boolean;
}> = ({ state, players, playerId, onUpdate, readOnly = false }) => {
  const bp = state.bp!;
  const park = bp.parks[playerId];
  const [sel, setSel] = useState<string | null>(null);
  const [m, setM] = useState<number[][] | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [pile, setPile] = useState<0 | 1>(0);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'park' | 'reserve' | 'rivals'>('park');

  const activePlayer = bpCurrent(bp);
  const myTurn = !readOnly && activePlayer === playerId;
  const pend = bp.pending[0] && bp.pending[0].playerId === playerId ? bp.pending[0] : null;
  const isInspecting = Boolean(inspectId && inspectId !== playerId && bp.parks[inspectId]);
  const displayId = isInspecting ? inspectId! : playerId;
  const displayPark = bp.parks[displayId] || park;

  // Ao iniciar a vez ou trocar de jogador, limpa espiada e pre-seleciona a 1a peca jogavel ja encaixada no mapa
  useEffect(() => {
    setInspectId(null);
    setMobileTab('park');
  }, [playerId, pend?.kind]);

  useEffect(() => {
    if (!park || !myTurn || pend || readOnly) return;
    if (sel && park.supply.some((t) => t.uid === sel)) return;
    const playable = park.supply.find((t) => bpHasPlacement(park, t.type)) || park.supply[0];
    if (!playable) {
      setSel(null);
      setM(null);
      setPos(null);
      return;
    }
    const auto = findFirstValidPlacement(park, playable.type);
    setSel(playable.uid);
    if (auto) {
      setM(auto.m);
      setPos({ x: auto.x, y: auto.y });
    } else {
      const sh = tileShape(playable.type);
      const b = parkCellBounds(park);
      setM(sh);
      setPos({
        x: Math.floor((b.minX + b.maxX + 1 - (sh[0]?.length || 1)) / 2),
        y: Math.floor((b.minY + b.maxY + 1 - sh.length) / 2)
      });
    }
  }, [park, myTurn, pend, readOnly, sel]);

  const board = useMemo(() => bpBoard(bp, displayId), [bp, displayId]);

  const tile = park?.supply.find((t) => t.uid === sel) || null;
  const shape = tile ? m || tileShape(tile) : null;
  const ghost =
    !isInspecting && myTurn && !pend && tile && shape && pos
      ? { m: shape, x: pos.x, y: pos.y, ok: bpCanPlace(park, shape, pos.x, pos.y).ok, playerId: tileKind(tile) }
      : null;

  const canPlaceAny = park ? bpCanPlaceAny(park) : false;

  const groups: { type: BPTileType; pts: number; uids: string[] }[] = [];
  (park?.supply || []).forEach((t) => {
    const g = groups.find((x) => x.type === t.type && x.pts === t.pts);
    if (g) g.uids.push(t.uid);
    else groups.push({ type: t.type, pts: t.pts, uids: [t.uid] });
  });

  const pick = (uid: string) => {
    sounds.playTick();
    if (uid === sel) {
      setSel(null);
      setM(null);
      setPos(null);
      return;
    }
    const nextTile = park?.supply.find((t) => t.uid === uid);
    setSel(uid);
    if (nextTile && park) {
      const auto = findFirstValidPlacement(park, nextTile.type);
      if (auto) {
        setM(auto.m);
        setPos({ x: auto.x, y: auto.y });
      } else {
        const sh = tileShape(nextTile.type);
        const b = parkCellBounds(park);
        setM(sh);
        setPos({
          x: Math.floor((b.minX + b.maxX + 1 - (sh[0]?.length || 1)) / 2),
          y: Math.floor((b.minY + b.maxY + 1 - sh.length) / 2)
        });
      }
    }
  };

  const rotatePiece = () => {
    if (!shape || !park) return;
    sounds.playTick();
    const nextM = rotateCW(shape);
    setM(nextM);
    setPos(rotateGhostKeepingCenter(park, shape, pos, nextM));
  };

  const flipPiece = () => {
    if (!shape || !park) return;
    sounds.playTick();
    const nextM = flipH(shape);
    setM(nextM);
    setPos(rotateGhostKeepingCenter(park, shape, pos, nextM));
  };

  const nudge = (dx: number, dy: number) => {
    if (!shape || !park) return;
    const b = parkCellBounds(park);
    const w = shape[0]?.length || 1;
    const h = shape.length || 1;
    const cur = pos || { x: b.minX, y: b.minY };
    const nx = Math.min(Math.max(b.minX, cur.x + dx), Math.max(b.minX, b.maxX - w + 1));
    const ny = Math.min(Math.max(b.minY, cur.y + dy), Math.max(b.minY, b.maxY - h + 1));
    setPos({ x: nx, y: ny });
  };

  const place = () => {
    if (!tile || !ghost?.ok || !myTurn) return;
    sounds.playSuccess();
    onUpdate((prev) => withBP(prev, (b) => bpPlace(b, playerId, tile.uid, ghost.m, ghost.x, ghost.y)));
    setSel(null);
    setM(null);
    setPos(null);
  };

  // Atalhos de teclado na Mesa / desktop: R gira, E/F espelha, setas movem, Enter confirma
  useEffect(() => {
    if (!myTurn || pend || isInspecting || !tile || !shape) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        rotatePiece();
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        flipPiece();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudge(-1, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudge(1, 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudge(0, -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudge(0, 1);
      } else if (e.key === 'Enter' && ghost?.ok) {
        e.preventDefault();
        place();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!park) return null;
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name || 'Jogador';
  const pendForMe = bp.pending.filter((p) => p.playerId === playerId).length;
  const expansionSpots = !isInspecting && myTurn && pend?.kind === 'crew' ? areaSpots(park) : undefined;

  return (
    <div className="bp-seat" data-testid="bp-seat">
      <div className="bp-mobile-tabs" role="tablist" aria-label="Visualização no celular">
        <button type="button" className="rdb-seg" role="tab" aria-selected={mobileTab === 'park'} aria-pressed={mobileTab === 'park'} onClick={() => setMobileTab('park')}>
          {pend ? 'Recompensa!' : 'Meu Parque'}
        </button>
        <button type="button" className="rdb-seg" role="tab" aria-selected={mobileTab === 'reserve'} aria-pressed={mobileTab === 'reserve'} onClick={() => setMobileTab('reserve')}>
          Reserva
        </button>
        <button type="button" className="rdb-seg" role="tab" aria-selected={mobileTab === 'rivals'} aria-pressed={mobileTab === 'rivals'} onClick={() => setMobileTab('rivals')}>
          Parques ({bp.order.length})
        </button>
      </div>

      <div className="bp-seat-main">
        {/* Coluna 1: Parque em grande destaque + barra de movimento da peca + legenda */}
        <div className={'bp-seat-board' + (mobileTab === 'park' ? ' is-mobile-on' : '')}>
          <header className="bp-seat-head">
            <span className="bp-seat-who">
              {players.find((p) => p.id === displayId) && <PlayerMark p={players.find((p) => p.id === displayId)!} />}
              {nameOf(displayId)}
            </span>
            <span className="bp-seat-score" data-tip="Pontos no parque (peças + monumentos)">
              {bpScore(bp, displayId)} pts
            </span>
            <span className="bp-seat-areas">
              Áreas {displayPark.areas.length}/4
            </span>
            <span className={'bp-seat-turn' + (myTurn && !isInspecting ? ' is-me' : '')}>
              {bp.finished
                ? 'Fim de jogo'
                : isInspecting
                ? `Espiando · vez de ${nameOf(activePlayer)}`
                : pend
                ? 'Recompensa'
                : myTurn
                ? 'Sua vez'
                : `Vez de ${nameOf(activePlayer)}`}
              {bp.turnsLeft !== null && !bp.finished ? ' · última volta' : ''}
            </span>
          </header>

          {isInspecting && (
            <div className="bp-inspect-bar">
              <span>
                <Eye size={15} /> Espiando o parque de <b>{nameOf(displayId)}</b>
              </span>
              <button type="button" className="rdb-seg" onClick={() => setInspectId(null)}>
                Voltar para {nameOf(playerId)}
              </button>
            </div>
          )}

          <div className="bp-board-canvas">
            <CTBoardView
              board={board}
              order={BP_COLOR_ORDER}
              ghost={ghost}
              bpExpansionSpots={expansionSpots}
              enableZoom
              onPickExpansionSpot={
                expansionSpots
                  ? (ax, ay) => {
                      sounds.playPowerup();
                      onUpdate((prev) => withBP(prev, (b) => bpPlaceArea(b, playerId, pile, ax, ay)));
                    }
                  : undefined
              }
              onCell={
                !isInspecting && myTurn && !pend && tile && shape
                  ? (cx, cy) => {
                      const snapped = snapPlacementToCell(park, shape, cx, cy);
                      setPos({ x: snapped.x, y: snapped.y });
                    }
                  : undefined
              }
              label={`Parque de ${nameOf(displayId)}`}
              testid="bp-board"
            />
          </div>

          {!isInspecting && myTurn && !pend && tile && (
            <div className="bp-controls-bar" data-testid="bp-controls">
              <div className="bp-controls-orient">
                <button type="button" className="rdb-seg bp-ctrl-btn" onClick={rotatePiece} aria-label="Girar peça" data-tip="Girar (tecla R)">
                  <RotateCw size={16} /> <span>Girar</span>
                </button>
                <button type="button" className="rdb-seg bp-ctrl-btn" onClick={flipPiece} aria-label="Espelhar peça" data-tip="Espelhar (tecla E)">
                  <FlipHorizontal2 size={16} /> <span>Espelhar</span>
                </button>
              </div>
              <div className="bp-nudge" role="group" aria-label="Mover peça 1 casa">
                <button type="button" className="rdb-seg" aria-label="Esquerda" onClick={() => nudge(-1, 0)}>
                  <ArrowLeft size={15} />
                </button>
                <button type="button" className="rdb-seg" aria-label="Cima" onClick={() => nudge(0, -1)}>
                  <ArrowUp size={15} />
                </button>
                <button type="button" className="rdb-seg" aria-label="Baixo" onClick={() => nudge(0, 1)}>
                  <ArrowDown size={15} />
                </button>
                <button type="button" className="rdb-seg" aria-label="Direita" onClick={() => nudge(1, 0)}>
                  <ArrowRight size={15} />
                </button>
              </div>
              <button
                type="button"
                className={'rdb-btn bp-place-cta ' + (ghost?.ok ? 'rdb-pro-hit' : 'is-invalid')}
                data-testid="bp-place"
                disabled={!ghost?.ok}
                onClick={place}
              >
                <Check size={18} />
                <span>
                  {ghost
                    ? ghost.ok
                      ? 'Colocar no parque'
                      : bpCanPlace(park, ghost.m, ghost.x, ghost.y).reason
                    : 'Toque no parque'}
                </span>
              </button>
            </div>
          )}

          {!isInspecting && myTurn && !pend && !canPlaceAny && (
            <button
              type="button"
              className="rdb-btn bp-pass-btn"
              data-testid="bp-pass"
              onClick={() => {
                sounds.playFlip();
                onUpdate((prev) => withBP(prev, (b) => bpPass(b, playerId)));
              }}
            >
              <SkipForward size={18} /> Nenhuma peça cabe: passar e pegar uma Área Verde
            </button>
          )}

          <BPLegend compact />
        </div>

        {/* Coluna 2: Acao atual (Seu Estoque ou Recompensa) + Estoque Geral da Reserva */}
        <aside className={'bp-seat-side' + (mobileTab === 'park' || mobileTab === 'reserve' ? ' is-mobile-on' : '')}>
          {mobileTab !== 'reserve' && pend && myTurn && (
            <BPRewardPanel
              bp={bp}
              playerId={playerId}
              kind={pend.kind}
              pendingCount={pendForMe}
              pile={pile}
              onSetPile={setPile}
              onUpdate={onUpdate}
            />
          )}

          {mobileTab !== 'reserve' && !pend && (
            <section className="bp-supply" data-testid="bp-supply">
              <div className="bp-supply-head">
                <h4>
                  Seu estoque{' '}
                  <span className="bp-h4-n">
                    {park.supply.length === 0 ? 'vazio' : `${park.supply.length} ${park.supply.length === 1 ? 'peça' : 'peças'}`}
                  </span>
                </h4>
                {myTurn && park.supply.length > 0 && <small className="bp-hint-line">Clique ou arraste no parque para encaixar</small>}
              </div>
              <div className="bp-tiles bp-tiles--bar">
                {groups.map((g) => {
                  const on = g.uids.includes(sel || '');
                  return (
                    <TileChip
                      key={g.uids[0]}
                      type={g.type}
                      pts={g.pts}
                      on={on}
                      compact
                      count={g.uids.length}
                      countTip={g.uids.length === 1 ? 'Você tem 1 dessa' : `Você tem ${g.uids.length} dessas`}
                      onClick={myTurn ? () => pick(on ? sel! : g.uids[0]) : undefined}
                      testid={`bp-supply-${g.type}`}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <div className={'bp-reserve-slot' + (mobileTab === 'reserve' ? ' is-mobile-force' : '')}>
            <BPReserveStock
              bp={bp}
              dense
              eligibleTypes={pend && myTurn && pend.kind !== 'crew' ? new Set(rewardOptions(bp, pend.kind)) : undefined}
              onPickReward={
                pend && myTurn && pend.kind !== 'crew'
                  ? (t) => {
                      sounds.playPowerup();
                      onUpdate((prev) => withBP(prev, (b) => bpTakeReward(b, playerId, t)));
                    }
                  : undefined
              }
            />
          </div>
        </aside>

        {/* Coluna 3: Miniaturas de todos os parques da roda */}
        <div className={'bp-rail-col' + (mobileTab === 'rivals' ? ' is-mobile-on' : '')}>
          <BPPlayerRail
            bp={bp}
            players={players}
            focusedId={displayId}
            activeId={activePlayer}
            onSelect={(id) => {
              setInspectId(id === playerId ? null : id);
              setMobileTab('park');
            }}
          />
        </div>
      </div>
    </div>
  );
};

/** TV (modo multi-celular ou visao geral): Parque da vez em grande destaque + Estoque da Reserva + Miniaturas dos jogadores. */
export const BPTable: React.FC<{ state: ComTerraState; players: Player[]; gridMode?: boolean }> = ({ state, players, gridMode = false }) => {
  const bp = state.bp!;
  const cur = bpCurrent(bp) || bp.order[0];
  const [inspectId, setInspectId] = useState<string | null>(null);

  useEffect(() => {
    setInspectId(null);
  }, [cur]);

  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name || 'Jogador';
  const focusId = inspectId && bp.parks[inspectId] ? inspectId : cur;
  const focusPark = bp.parks[focusId];
  const lastLog = bp.log[bp.log.length - 1];

  if (gridMode) {
    return (
      <div className="bp-table bp-table--grid" data-testid="bp-table">
        <div className="bp-parks" style={{ gridTemplateColumns: `repeat(${bp.order.length <= 2 ? 2 : bp.order.length <= 4 ? 2 : 3}, minmax(0, 1fr))` }}>
          {bp.order.map((id) => (
            <div key={id} className={'bp-park' + (cur === id ? ' is-turn' : '')}>
              <div className="bp-park-head">
                <strong>{nameOf(id)}</strong>
                <span>{bpScore(bp, id)} pts</span>
                <span className="bp-park-sup">
                  {bp.parks[id].areas.length}/4 áreas · {bp.parks[id].supply.length} peças
                </span>
              </div>
              <CTBoardView board={bpBoard(bp, id)} order={BP_COLOR_ORDER} label={`Parque de ${nameOf(id)}`} />
            </div>
          ))}
        </div>
        <aside className="bp-stock-col">
          <BPReserveStock bp={bp} dense />
        </aside>
      </div>
    );
  }

  return (
    <div className="bp-table bp-table--spotlight" data-testid="bp-table">
      <div className="bp-spotlight-stage">
        <header className="bp-seat-head">
          <span className="bp-seat-who">
            {players.find((p) => p.id === focusId) && <PlayerMark p={players.find((p) => p.id === focusId)!} />}
            {nameOf(focusId)}
          </span>
          <span className="bp-seat-score">{bpScore(bp, focusId)} pts</span>
          <span className="bp-seat-areas">Áreas {focusPark?.areas.length ?? 0}/4</span>
          <span className={'bp-seat-turn' + (focusId === cur ? ' is-me' : '')}>
            {focusId === cur ? 'Jogando no celular...' : `Espiando · vez de ${nameOf(cur)}`}
            {bp.turnsLeft !== null && !bp.finished ? ' · última volta' : ''}
          </span>
        </header>

        <div className="bp-board-canvas">
          <CTBoardView board={bpBoard(bp, focusId)} order={BP_COLOR_ORDER} enableZoom label={`Parque de ${nameOf(focusId)}`} testid="bp-tv-spotlight-board" />
        </div>

        <div className="bp-tv-foot">
          {lastLog && (
            <p className="bp-tv-lastlog">
              Última jogada: <b>{nameOf(lastLog.playerId)}</b> {lastLog.text}
            </p>
          )}
          <BPLegend compact />
        </div>
      </div>

      <div className="bp-stock-col">
        <BPReserveStock bp={bp} dense />
      </div>

      <BPPlayerRail
        bp={bp}
        players={players}
        focusedId={focusId}
        activeId={cur}
        onSelect={(id) => setInspectId(id === cur ? null : id)}
      />
    </div>
  );
};

export const BP_KIND_LABEL = KIND_LABEL;
export const BP_ENTRANCE_POS = BP_ENTRANCE;
