import React, { useMemo, useRef } from 'react';
import type { CTBoard, CTCell } from '../../types/game';
import { shapeCells } from '../../utils/comTerraEngine';

/**
 * Tabuleiro e pecas do Com Terra em "2.5D": camera 100% de cima (grid sem distorcao), mas com volume:
 * a placa do tabuleiro e as pecas tem lateral aparente, brilho na borda de cima e sombra projetada.
 * O furo da peca e vazado de verdade (fill-rule evenodd): da para ver o chao, a ficha ou a arvore por dentro.
 */

const U = 10; // tamanho de uma casa no viewBox
const DEPTH = 1.3; // espessura aparente da peca
const HOLE_R = 3.1;

export const CT_PLAYER_COLORS: Array<{ top: string; side: string; ink: string }> = [
  { top: '#17b8b8', side: '#0b6d70', ink: '#04282a' },
  { top: '#e6194b', side: '#8a0c2b', ink: '#fff5f7' },
  { top: '#ffc93c', side: '#b08415', ink: '#3a2a00' },
  { top: '#f5f2eb', side: '#a39d8c', ink: '#22231f' }
];

/** Arquiteto (Barenpark): cor pela categoria da peca, igual a cor do icone que a da. */
export const BP_PALETTE: Record<string, { top: string; side: string; ink: string }> = {
  green: { top: '#3fbf6f', side: '#1d6e3e', ink: '#04210f' },
  house: { top: '#17b8b8', side: '#0b6d70', ink: '#04282a' },
  enclosure: { top: '#ff8a1e', side: '#9a4c0a', ink: '#2a1300' }
};

export function ctColor(order: string[], playerId: string | undefined | null) {
  if (playerId && BP_PALETTE[playerId]) return BP_PALETTE[playerId];
  const i = Math.max(0, order.indexOf(playerId || ''));
  return CT_PLAYER_COLORS[i % CT_PLAYER_COLORS.length];
}

interface PCell {
  x: number;
  y: number;
  k: 1 | 2;
}

/** Caminho da face da peca: um quadrado por bloco, com o circulo do furo recortado. */
function facePath(cells: PCell[]): string {
  const e = 0.04; // leve sobreposicao para nao aparecer fresta entre blocos vizinhos
  return cells
    .map((c) => {
      const x = c.x * U - e;
      const y = c.y * U - e;
      const s = U + e * 2;
      let d = `M${x} ${y}h${s}v${s}h${-s}Z`;
      if (c.k === 2) {
        const cx = c.x * U + U / 2;
        const cy = c.y * U + U / 2;
        d += `M${cx - HOLE_R} ${cy}a${HOLE_R} ${HOLE_R} 0 1 0 ${HOLE_R * 2} 0a${HOLE_R} ${HOLE_R} 0 1 0 ${-HOLE_R * 2} 0Z`;
      }
      return d;
    })
    .join('');
}

/** Bordas externas: claras em cima e a esquerda (luz), escuras embaixo e a direita. */
function edgePaths(cells: PCell[]): { light: string; dark: string } {
  const has = new Set(cells.map((c) => c.x + ',' + c.y));
  const i = 0.45;
  let light = '';
  let dark = '';
  cells.forEach((c) => {
    const x = c.x * U;
    const y = c.y * U;
    if (!has.has(c.x + ',' + (c.y - 1))) light += `M${x + i} ${y + i}h${U - i * 2}`;
    if (!has.has(c.x - 1 + ',' + c.y)) light += `M${x + i} ${y + i}v${U - i * 2}`;
    if (!has.has(c.x + ',' + (c.y + 1))) dark += `M${x + i} ${y + U - i}h${U - i * 2}`;
    if (!has.has(c.x + 1 + ',' + c.y)) dark += `M${x + U - i} ${y + i}v${U - i * 2}`;
  });
  return { light, dark };
}

const PieceShape: React.FC<{
  cells: PCell[];
  color: { top: string; side: string };
  lift?: number;
  outline?: string;
  shadowId: string;
}> = ({ cells, color, lift = 0, outline, shadowId }) => {
  const d = facePath(cells);
  const edges = edgePaths(cells);
  return (
    <g>
      <path d={d} fillRule="evenodd" fill="#000" opacity={lift ? 0.4 : 0.34} transform={`translate(${0.9 + lift * 0.9} ${DEPTH + 0.9 + lift * 1.1})`} filter={`url(#${shadowId})`} />
      <g transform={`translate(0 ${-lift})`}>
        <path d={d} fillRule="evenodd" fill={color.side} transform={`translate(0 ${DEPTH})`} />
        <path d={d} fillRule="evenodd" fill={color.top} />
        <path d={edges.light} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.5" strokeLinecap="round" fill="none" />
        <path d={edges.dark} stroke="#000" strokeOpacity="0.28" strokeWidth="0.5" strokeLinecap="round" fill="none" />
        {cells
          .filter((c) => c.k === 2)
          .map((c) => (
            <circle key={c.x + ',' + c.y} cx={c.x * U + U / 2} cy={c.y * U + U / 2} r={HOLE_R + 0.25} fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="0.5" />
          ))}
        {outline && <path d={d} fillRule="evenodd" fill="none" stroke={outline} strokeWidth="0.9" strokeLinejoin="round" />}
      </g>
    </g>
  );
};

const Tree: React.FC<{ x: number; y: number; grounded: boolean }> = ({ x, y, grounded }) => {
  const cx = x * U + U / 2;
  const cy = y * U + U / 2;
  return (
    <g pointerEvents="none">
      {grounded && <ellipse cx={cx + 0.9} cy={cy + 1.6} rx="2.9" ry="2.1" fill="#000" opacity="0.3" />}
      <circle cx={cx} cy={cy - 0.5} r="2.75" fill="#17512c" />
      <circle cx={cx - 0.25} cy={cy - 1} r="2.35" fill="#2a8a48" />
      <circle cx={cx - 0.85} cy={cy - 1.65} r="1.15" fill="#56bd6b" />
    </g>
  );
};

const Token: React.FC<{ x: number; y: number; v: number }> = ({ x, y, v }) => {
  const cx = x * U + U / 2;
  const cy = y * U + U / 2;
  const neg = v < 0;
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy + 0.45} r="2.7" fill="#2a2d33" />
      <circle cx={cx} cy={cy} r="2.7" fill="#6d737d" />
      <circle cx={cx} cy={cy} r="2.1" fill={neg ? '#7a1020' : v === 2 ? '#f6c12c' : '#e8dfc8'} stroke="#2a2d33" strokeWidth="0.3" />
      <text x={cx} y={cy + 1.05} textAnchor="middle" fontSize="2.9" fontWeight="900" fontFamily="'Inter','Arial Black',sans-serif" fill={neg ? '#fff' : '#22231f'}>
        {v > 0 ? '+' + v : v}
      </text>
    </g>
  );
};

const ActionIcon: React.FC<{ x: number; y: number; kind: 'tree' | 'tok' }> = ({ x, y, kind }) => {
  const cx = x * U + U / 2;
  const cy = y * U + U / 2;
  return (
    <g pointerEvents="none">
      <rect x={x * U + 1.3} y={y * U + 1.3} width={U - 2.6} height={U - 2.6} rx="1.2" fill="#0a0b1e" fillOpacity="0.5" stroke="#f5f2eb" strokeWidth="0.45" strokeDasharray="1.2 0.9" />
      {kind === 'tree' ? (
        <path d={`M${cx} ${cy - 2.3}l2.1 3.3h-4.2ZM${cx - 0.45} ${cy + 1}h0.9v1.4h-0.9Z`} fill="#f5f2eb" />
      ) : (
        <g>
          <circle cx={cx} cy={cy} r="2" fill="none" stroke="#f5f2eb" strokeWidth="0.6" />
          <path d={`M${cx - 1} ${cy}h2M${cx} ${cy - 1}v2`} stroke="#f5f2eb" strokeWidth="0.6" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

/**
 * Arquiteto: icones impressos nas areas, no tema do programa (estadio/estudio da Roda de Bobo).
 * Bola = Area Verde · Microfone = Casa · Camera = Cercado · Ingresso = area nova · Palco = onde vai a Taca.
 */
export const BP_ICON_META: Record<string, { fill: string; ink: string; name: string; gives: string; label: string }> = {
  wheel: { fill: '#3fbf6f', ink: '#0a0b1e', name: 'Bandeirinha', gives: 'Área Verde', label: 'Bandeirinha: pega uma Área Verde' },
  cement: { fill: '#17b8b8', ink: '#0a0b1e', name: 'Telão', gives: 'Casa', label: 'Telão: pega uma Casa (ou Área Verde)' },
  excavator: { fill: '#ff8a1e', ink: '#0a0b1e', name: 'Craque', gives: 'Cercado', label: 'Craque: pega um Cercado (ou Casa, ou Área Verde)' },
  crew: { fill: '#e6194b', ink: '#f5f2eb', name: 'Cone', gives: 'Área nova', label: 'Cone: abre uma área nova no parque' }
};

/**
 * Icones em estilo figurinha: borda creme, contorno navy, miolo na cor da peca que o icone da e um brilho.
 * Bandeirinha de escanteio (Area Verde), Telao (Casa), Craque/estrela (Cercado), Cone de obra (area nova),
 * Palco (fica livre e recebe a Taca). Caixa 10x10.
 */
export function bpGlyph(kind: string): React.ReactNode {
  if (kind === 'pit') {
    return (
      <g>
        <rect x="0.6" y="0.6" width="8.8" height="8.8" rx="1.2" fill="#0a0b1e" />
        <path d="M1.6 7.4h6.8v1.2H1.6Z" fill="#2a2f45" />
        <path d="M2.4 6.2h5.2v1.2H2.4Z" fill="#3a3f55" />
        <path d="M3.4 1.4L2 6.1M6.6 1.4L8 6.1" stroke="#ffc93c" strokeOpacity="0.35" strokeWidth="0.5" />
        <circle cx="5" cy="1.7" r="0.6" fill="#ffc93c" opacity="0.7" />
      </g>
    );
  }
  const m = BP_ICON_META[kind];
  if (!m) return null;
  const N = '#0a0b1e';
  const C = '#f5f2eb';
  let art: React.ReactNode = null;
  if (kind === 'wheel') {
    art = (
      <g>
        <path d="M3.6 2.6v5.2" stroke={N} strokeWidth="0.55" strokeLinecap="round" />
        <path d="M3.9 2.7l3.4 1.15-3.4 1.2Z" fill={C} stroke={N} strokeWidth="0.35" strokeLinejoin="round" />
        <path d="M3.9 3.85l1.7 0.6-1.7 0.58Z" fill={N} opacity="0.35" />
        <ellipse cx="3.6" cy="7.8" rx="1.3" ry="0.35" fill={N} opacity="0.35" />
      </g>
    );
  } else if (kind === 'cement') {
    art = (
      <g>
        <path d="M4 2.4l1 1 1-1" stroke={N} strokeWidth="0.4" fill="none" strokeLinecap="round" />
        <rect x="2.4" y="3.4" width="5.2" height="3.6" rx="0.6" fill={C} stroke={N} strokeWidth="0.45" />
        <path d="M4.5 4.4v1.6l1.4-0.8Z" fill={m.fill} />
        <path d="M3.4 7.6h3.2" stroke={N} strokeWidth="0.45" strokeLinecap="round" />
      </g>
    );
  } else if (kind === 'excavator') {
    art = (
      <g>
        <path
          d="M5 2.1l0.85 1.75 1.92 0.25-1.4 1.33 0.36 1.9L5 6.4l-1.73 0.93 0.36-1.9-1.4-1.33 1.92-0.25Z"
          fill={C}
          stroke={N}
          strokeWidth="0.42"
          strokeLinejoin="round"
        />
        <circle cx="4.5" cy="4.6" r="0.28" fill={N} />
        <circle cx="5.5" cy="4.6" r="0.28" fill={N} />
        <path d="M4.5 5.3q0.5 0.35 1 0" stroke={N} strokeWidth="0.25" fill="none" strokeLinecap="round" />
      </g>
    );
  } else if (kind === 'crew') {
    art = (
      <g>
        <path d="M5 2.2l1.9 5H3.1Z" fill="#ff8a1e" stroke={N} strokeWidth="0.4" strokeLinejoin="round" />
        <path d="M4.25 4.2h1.5l0.32 0.85H3.93Z" fill={C} />
        <path d="M3.65 5.8h2.7l0.25 0.65H3.4Z" fill={C} />
        <rect x="2.4" y="7.2" width="5.2" height="0.75" rx="0.25" fill={N} />
      </g>
    );
  }
  return (
    <g>
      <circle cx="5" cy="5" r="4.45" fill={N} />
      <circle cx="5" cy="5" r="4.05" fill={C} />
      <circle cx="5" cy="5" r="3.45" fill={m.fill} />
      <path d="M2.4 3.3a3 3 0 0 1 2.1-1.65" stroke={C} strokeOpacity="0.7" strokeWidth="0.45" fill="none" strokeLinecap="round" />
      {art}
    </g>
  );
}

/** O mesmo icone como figura solta (legenda, previa das areas). */
export const BPIconSvg: React.FC<{ kind: string; size?: number | string; title?: string }> = ({ kind, size = '1.2em', title }) => (
  <svg viewBox="0 0 10 10" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    {bpGlyph(kind)}
  </svg>
);

/** Taca (no Palco de uma area completa) com o valor. */
const BPTrophy: React.FC<{ v: number }> = ({ v }) => (
  <g>
    <path d="M3 1.6h4v1.4a2 2 0 0 1-4 0Z" fill="#ffc93c" stroke="#7a5a00" strokeWidth="0.3" />
    <path d="M3 2.1H2.1a1 1 0 0 0 1 1.3M7 2.1h0.9a1 1 0 0 1-1 1.3" fill="none" stroke="#ffc93c" strokeWidth="0.4" />
    <rect x="4.6" y="4.9" width="0.8" height="0.9" fill="#ffc93c" />
    <rect x="2.9" y="5.8" width="4.2" height="3" rx="0.4" fill="#ffc93c" stroke="#7a5a00" strokeWidth="0.3" />
    <text x="5" y="8.05" textAnchor="middle" fontSize="2.5" fontWeight="900" fontFamily="'Inter','Arial Black',sans-serif" fill="#0a0b1e">
      {v}
    </text>
  </g>
);

const BPIconMark: React.FC<{ x: number; y: number; kind: string; statue?: number }> = ({ x, y, kind, statue }) => (
  <g pointerEvents="none" transform={`translate(${x * U} ${y * U})`}>
    {kind === 'pit' && statue !== undefined ? (
      <g>
        <rect x="0.8" y="0.8" width="8.4" height="8.4" rx="1" fill="#0a0b1e" />
        <BPTrophy v={statue} />
      </g>
    ) : (
      bpGlyph(kind)
    )}
  </g>
);

export interface CTGhost {
  m: number[][];
  x: number;
  y: number;
  ok: boolean;
  playerId: string;
  locked?: boolean;
}

export interface CTBoardViewProps {
  board: CTBoard;
  order: string[];
  ghost?: CTGhost | null;
  /** casas que aceitam a acao em curso (plantar arvore / por ficha) */
  canTarget?: (x: number, y: number) => boolean;
  selected?: { x: number; y: number } | null;
  onCell?: (x: number, y: number) => void;
  label: string;
  testid?: string;
}

let uidSeq = 0;

export const CTBoardView: React.FC<CTBoardViewProps> = ({ board, order, ghost, canTarget, selected, onCell, label, testid }) => {
  const idRef = useRef<string>('');
  if (!idRef.current) idRef.current = 'ctb' + ++uidSeq;
  const shadowId = idRef.current + '-sh';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  const lastCell = useRef('');

  const box = useMemo(() => {
    let minX = board.w;
    let minY = board.h;
    let maxX = -1;
    let maxY = -1;
    board.cells.forEach((c, i) => {
      if (c.t === 0) return;
      const x = i % board.w;
      const y = Math.floor(i / board.w);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    if (maxX < 0) return { x: 0, y: 0, w: board.w, h: board.h };
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }, [board]);

  const pieces = useMemo(() => {
    const map = new Map<string, { owner: string; cells: PCell[] }>();
    board.cells.forEach((c, i) => {
      if (!c.o || !c.p) return;
      const x = i % board.w;
      const y = Math.floor(i / board.w);
      const e = map.get(c.p) || { owner: c.o, cells: [] };
      e.cells.push({ x, y, k: c.k === 2 ? 2 : 1 });
      map.set(c.p, e);
    });
    return Array.from(map.entries());
  }, [board]);

  const areaFrames = useMemo(() => {
    const m = new Map<string, { id: string; x: number; y: number; x2: number; y2: number }>();
    board.cells.forEach((c, i) => {
      if (c.t === 0 || !c.z || !board.id.startsWith('bp-')) return;
      const x = i % board.w;
      const y = Math.floor(i / board.w);
      const f = m.get(c.z) || { id: c.z, x, y, x2: x, y2: y };
      f.x = Math.min(f.x, x);
      f.y = Math.min(f.y, y);
      f.x2 = Math.max(f.x2, x);
      f.y2 = Math.max(f.y2, y);
      m.set(c.z, f);
    });
    return Array.from(m.values()).map((f) => ({ id: f.id, x: f.x, y: f.y, w: f.x2 - f.x + 1, h: f.y2 - f.y + 1 }));
  }, [board]);

  const pad = 2.2;
  const vb = `${box.x * U - pad} ${box.y * U - pad - 1.6} ${box.w * U + pad * 2} ${box.h * U + pad * 2 + 3.4}`;

  const cellFromEvent = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    const x = Math.floor(p.x / U);
    const y = Math.floor(p.y / U);
    if (x < 0 || y < 0 || x >= board.w || y >= board.h) return null;
    return { x, y };
  };
  const fire = (e: React.PointerEvent) => {
    if (!onCell) return;
    const c = cellFromEvent(e);
    if (!c) return;
    const key = c.x + ',' + c.y;
    if (key === lastCell.current) return;
    lastCell.current = key;
    onCell(c.x, c.y);
  };

  const cells: Array<{ c: CTCell; x: number; y: number }> = board.cells
    .map((c, i) => ({ c, x: i % board.w, y: Math.floor(i / board.w) }))
    .filter((e) => e.c.t !== 0);

  const ghostCells: PCell[] = ghost ? shapeCells(ghost.m).map((pc) => ({ x: ghost.x + pc.dx, y: ghost.y + pc.dy, k: pc.k })) : [];

  return (
    <svg
      ref={svgRef}
      className={'ct-board' + (onCell ? ' ct-board--live' : '')}
      viewBox={vb}
      role="img"
      aria-label={label}
      data-testid={testid}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={(e) => {
        if (!onCell) return;
        dragging.current = true;
        lastCell.current = '';
        fire(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current && ghost) fire(e);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      <defs>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      {/* placa do tabuleiro: sombra, lateral de terra e o gramado por cima */}
      <g>
        {cells.map(({ x, y }) => (
          <rect key={'s' + x + ',' + y} x={x * U - 0.4} y={y * U + 1.2} width={U + 0.8} height={U + 2.2} fill="#000" opacity="0.45" />
        ))}
        {cells.map(({ x, y }) => (
          <rect key={'e' + x + ',' + y} x={x * U - 0.6} y={y * U - 0.6} width={U + 1.2} height={U + 2.6} fill="#5a3d22" />
        ))}
        {cells.map(({ x, y }) => (
          <rect key={'r' + x + ',' + y} x={x * U - 0.6} y={y * U - 0.6} width={U + 1.2} height={U + 1.2} fill="#9c7a4d" />
        ))}
        {cells.map(({ c, x, y }) => (
          <rect
            key={'g' + x + ',' + y}
            x={x * U - 0.02}
            y={y * U - 0.02}
            width={U + 0.04}
            height={U + 0.04}
            fill={c.t === 2 ? ((x + y) % 2 ? '#2f93cf' : '#3aa0d8') : board.id.startsWith('bp-') ? ((x + y) % 2 ? '#ece3cc' : '#f4eedf') : (x + y) % 2 ? '#7cae48' : '#86b950'}
          />
        ))}
        {cells
          .filter(({ c }) => c.t === 2)
          .map(({ x, y }) => (
            <path key={'w' + x + ',' + y} d={`M${x * U + 2} ${y * U + 4}q1.5 -1.4 3 0t3 0M${x * U + 2} ${y * U + 7}q1.5 -1.4 3 0t3 0`} stroke="#bfe6fb" strokeOpacity="0.55" strokeWidth="0.45" fill="none" />
          ))}
        {/* zonas do Fronteiras: a base de cada jogador ganha a cor dele */}
        {cells
          .filter(({ c }) => c.z && c.z !== 'ilha' && !board.id.startsWith('bp-'))
          .map(({ c, x, y }) => (
            <rect key={'z' + x + ',' + y} x={x * U} y={y * U} width={U} height={U} fill={ctColor(order, c.z).top} opacity="0.3" />
          ))}
        {cells.map(({ x, y }) => (
          <rect key={'l' + x + ',' + y} x={x * U} y={y * U} width={U} height={U} fill="none" stroke="#0a0b1e" strokeOpacity="0.16" strokeWidth="0.25" />
        ))}
      </g>

      {/* fichas e icones de acao ficam no chao (aparecem por dentro do furo) */}
      {cells.map(({ c, x, y }) => (c.tok !== undefined ? <Token key={'t' + x + ',' + y} x={x} y={y} v={c.tok} /> : null))}
      {cells.map(({ c, x, y }) => (c.act ? <ActionIcon key={'a' + x + ',' + y} x={x} y={y} kind={c.act} /> : null))}
      {cells.map(({ c, x, y }) => (c.bpi && !c.o ? <BPIconMark key={'bp' + x + ',' + y} x={x} y={y} kind={c.bpi} statue={c.statue} /> : null))}
      {areaFrames.map((f) => (
        <rect key={'af' + f.id} x={f.x * U} y={f.y * U} width={f.w * U} height={f.h * U} fill="none" stroke="#0a0b1e" strokeOpacity="0.45" strokeWidth="0.5" pointerEvents="none" />
      ))}

      {/* casas que aceitam a acao em curso */}
      {canTarget &&
        cells
          .filter(({ x, y }) => canTarget(x, y))
          .map(({ x, y }) => (
            <rect key={'c' + x + ',' + y} className="ct-target" x={x * U + 0.7} y={y * U + 0.7} width={U - 1.4} height={U - 1.4} rx="1" fill="#f5f2eb" fillOpacity="0.16" stroke="#f5f2eb" strokeWidth="0.4" />
          ))}
      {selected && (
        <rect x={selected.x * U + 0.4} y={selected.y * U + 0.4} width={U - 0.8} height={U - 0.8} rx="1" fill="none" stroke="#ffc93c" strokeWidth="0.9" />
      )}

      {/* pecas ja encaixadas */}
      {pieces.map(([uid, p]) => (
        <PieceShape key={uid} cells={p.cells} color={ctColor(order, p.owner)} shadowId={shadowId} />
      ))}

      {/* arvores: mais altas que as pecas, passam por dentro do furo */}
      {cells.map(({ c, x, y }) => (c.tree ? <Tree key={'tr' + x + ',' + y} x={x} y={y} grounded={!c.o} /> : null))}

      {/* peca na mao, flutuando sobre o grid */}
      {ghost && (
        <g className={ghost.locked ? '' : 'ct-ghost'} opacity={ghost.locked ? 1 : 0.94} pointerEvents="none">
          <PieceShape cells={ghostCells} color={ctColor(order, ghost.playerId)} lift={ghost.locked ? 0.4 : 1.6} outline={ghost.ok ? '#35e06f' : '#ff3b3b'} shadowId={shadowId} />
        </g>
      )}
    </svg>
  );
};

/** Peca solta (vitrine da loja, mao do jogador): mesma linguagem do tabuleiro. */
export const CTPieceView: React.FC<{ shape: number[][]; color?: { top: string; side: string }; label: string; className?: string; minBox?: number }> = ({
  shape,
  color = { top: '#f5f2eb', side: '#a39d8c' },
  label,
  className,
  minBox = 5
}) => {
  const idRef = useRef<string>('');
  if (!idRef.current) idRef.current = 'ctp' + ++uidSeq;
  const cells: PCell[] = shapeCells(shape).map((c) => ({ x: c.dx, y: c.dy, k: c.k }));
  const w = shape[0].length;
  const h = shape.length;
  // caixa quadrada fixa: todas as pecas aparecem na mesma escala, para comparar tamanho no olho
  const side = Math.max(w, h, minBox) * U;
  const ox = (side - w * U) / 2;
  const oy = (side - h * U) / 2;
  return (
    <svg className={'ct-piece ' + (className || '')} viewBox={`-2 -2 ${side + 4} ${side + 5.5}`} role="img" aria-label={label}>
      <defs>
        <filter id={idRef.current} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>
      <g transform={`translate(${ox} ${oy})`}>
        <PieceShape cells={cells} color={color} shadowId={idRef.current} />
      </g>
    </svg>
  );
};
