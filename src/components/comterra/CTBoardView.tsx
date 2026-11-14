import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
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

/** Bordas externas (luz/sombra), contorno fechado da peca e grade interna suave entre blocos. */
function edgePaths(cells: PCell[]): { light: string; dark: string; outer: string; inner: string } {
  const has = new Set(cells.map((c) => c.x + ',' + c.y));
  const i = 0.45;
  let light = '';
  let dark = '';
  let outer = '';
  let inner = '';
  cells.forEach((c) => {
    const x = c.x * U;
    const y = c.y * U;
    if (!has.has(c.x + ',' + (c.y - 1))) {
      light += `M${x + i} ${y + i}h${U - i * 2}`;
      outer += `M${x} ${y}h${U}`;
    }
    if (!has.has(c.x - 1 + ',' + c.y)) {
      light += `M${x + i} ${y + i}v${U - i * 2}`;
      outer += `M${x} ${y}v${U}`;
    }
    if (!has.has(c.x + ',' + (c.y + 1))) {
      dark += `M${x + i} ${y + U - i}h${U - i * 2}`;
      outer += `M${x} ${y + U}h${U}`;
    } else {
      inner += `M${x + 0.4} ${y + U}h${U - 0.8}`;
    }
    if (!has.has(c.x + 1 + ',' + c.y)) {
      dark += `M${x + U - i} ${y + i}v${U - i * 2}`;
      outer += `M${x + U} ${y}v${U}`;
    } else {
      inner += `M${x + U} ${y + 0.4}v${U - 0.8}`;
    }
  });
  return { light, dark, outer, inner };
}

const PieceShape: React.FC<{
  cells: PCell[];
  color: { top: string; side: string; ink?: string };
  lift?: number;
  outline?: string;
  showContour?: boolean;
  shadowId: string;
}> = ({ cells, color, lift = 0, outline, showContour = false, shadowId }) => {
  const d = facePath(cells);
  const edges = edgePaths(cells);
  return (
    <g>
      <path d={d} fillRule="evenodd" fill="#000" opacity={lift ? 0.4 : 0.34} transform={`translate(${0.9 + lift * 0.9} ${DEPTH + 0.9 + lift * 1.1})`} filter={`url(#${shadowId})`} />
      <g transform={`translate(0 ${-lift})`}>
        <path d={d} fillRule="evenodd" fill={color.side} transform={`translate(0 ${DEPTH})`} />
        <path d={d} fillRule="evenodd" fill={color.top} />
        {showContour && edges.inner && <path d={edges.inner} stroke={color.ink || '#0a0b1e'} strokeOpacity="0.16" strokeWidth="0.25" fill="none" />}
        <path
          d={edges.light}
          stroke="#ffffff"
          strokeOpacity={showContour ? 0.62 : 0.52}
          strokeWidth={showContour ? 0.55 : 0.5}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={edges.dark}
          stroke="#000000"
          strokeOpacity={showContour ? 0.38 : 0.28}
          strokeWidth={showContour ? 0.58 : 0.5}
          strokeLinecap="round"
          fill="none"
        />
        {showContour && <path d={edges.outer} stroke="#0a0b1e" strokeOpacity="0.88" strokeWidth="0.68" strokeLinecap="square" fill="none" />}
        {cells
          .filter((c) => c.k === 2)
          .map((c) => (
            <circle key={c.x + ',' + c.y} cx={c.x * U + U / 2} cy={c.y * U + U / 2} r={HOLE_R + 0.25} fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="0.5" />
          ))}
        {outline && <path d={edges.outer || d} fill="none" stroke={outline} strokeWidth="0.95" strokeLinejoin="round" />}
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
 * Reserva (Bärenpark brasileiro): ícones de obra desenhados diretamente sobre o terreno,
 * sem círculo gigante de figurinha, deixando espaço livre dentro de cada casa.
 */
export const BP_ICON_META: Record<string, { fill: string; ink: string; name: string; gives: string; label: string }> = {
  wheel: { fill: '#3fbf6f', ink: '#0a0b1e', name: 'Carriola', gives: 'Área Verde', label: 'Carriola: pega uma Área Verde' },
  cement: { fill: '#17b8b8', ink: '#0a0b1e', name: 'Betoneira', gives: 'Viveiro', label: 'Betoneira: pega um Viveiro (ou Área Verde)' },
  excavator: { fill: '#ff8a1e', ink: '#0a0b1e', name: 'Cavadeira', gives: 'Cercado', label: 'Cavadeira: pega um Cercado único (ou Viveiro, ou Área Verde)' },
  crew: { fill: '#e6194b', ink: '#f5f2eb', name: 'Equipe de Obra', gives: 'Área nova', label: 'Equipe de Obra: abre uma área nova na reserva' }
};

/**
 * Ícones no estilo do Bärenpark com pegada brasileira, em caixa 10×10.
 * `onGround = true` reduz a escala (~60%) para deixar margem folgada dentro de cada quadrado do mapa.
 */
export function bpGlyph(kind: string, onGround = false): React.ReactNode {
  const N = '#0a0b1e';
  const C = '#f5f2eb';
  const wrap = (node: React.ReactNode, groundScale = 0.76) =>
    onGround ? <g transform={`translate(5 5) scale(${groundScale}) translate(-5 -5)`}>{node}</g> : node;

  if (kind === 'pit') {
    return wrap(
      <g>
        <polygon points="3.6,1.6 6.4,1.6 8.4,3.6 8.4,6.4 6.4,8.4 3.6,8.4 1.6,6.4 1.6,3.6" fill="#705129" />
        <polygon points="3.95,2.45 6.05,2.45 7.55,3.95 7.55,6.05 6.05,7.55 3.95,7.55 2.45,6.05 2.45,3.95" fill="#1d130b" stroke="#3c2614" strokeWidth="0.3" />
        <polygon points="3.3,1.5 6.7,1.5 8.5,3.3 8.5,6.7 6.7,8.5 3.3,8.5 1.5,6.7 1.5,3.3" fill="none" stroke={C} strokeWidth="0.72" strokeLinejoin="round" />
        <polygon points="3.3,1.5 6.7,1.5 8.5,3.3 8.5,6.7 6.7,8.5 3.3,8.5 1.5,6.7 1.5,3.3" fill="none" stroke="#e6194b" strokeWidth="0.72" strokeDasharray="1.1 1.1" strokeLinejoin="round" />
        {[
          [3.3, 1.5], [6.7, 1.5], [8.5, 3.3], [8.5, 6.7],
          [6.7, 8.5], [3.3, 8.5], [1.5, 6.7], [1.5, 3.3]
        ].map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="0.34" fill="#2c1d10" stroke={C} strokeWidth="0.12" />
        ))}
      </g>,
      0.82
    );
  }

  if (kind === 'wheel') {
    return wrap(
      <g>
        <ellipse cx="5.2" cy="7.95" rx="3.4" ry="0.75" fill="#4f391c" opacity="0.32" />
        <path d="M1.3 5.15 L3.6 5.8 M1.7 5.75 L3.8 6.4 M3.7 6.1 L3.5 7.9" stroke="#3a2412" strokeWidth="0.58" strokeLinecap="round" />
        <circle cx="7.4" cy="7.0" r="1.15" fill="#1d222b" stroke={N} strokeWidth="0.32" />
        <circle cx="7.4" cy="7.0" r="0.46" fill={C} />
        <path d="M3.9 4.2 Q5.45 3.1 7.0 4.2 Z" fill="#7c4f24" />
        <path d="M5.45 4.0 V1.95" stroke="#462b12" strokeWidth="0.48" strokeLinecap="round" />
        <circle cx="4.7" cy="2.35" r="0.82" fill="#2ea44f" stroke="#0d3318" strokeWidth="0.22" />
        <circle cx="6.15" cy="2.25" r="0.82" fill="#3fbf6f" stroke="#0d3318" strokeWidth="0.22" />
        <circle cx="5.45" cy="1.5" r="0.92" fill="#288e46" stroke="#0d3318" strokeWidth="0.22" />
        <circle cx="5.9" cy="1.7" r="0.32" fill="#ffc93c" />
        <circle cx="4.8" cy="2.0" r="0.26" fill="#ffc93c" />
        <path d="M3.35 4.2 H7.75 L6.8 6.35 H3.95 Z" fill="#1e8a42" stroke="#0d3318" strokeWidth="0.4" strokeLinejoin="round" />
        <path d="M3.9 4.65 H7.1" stroke="#85ebaa" strokeWidth="0.32" strokeLinecap="round" />
      </g>
    );
  }

  if (kind === 'cement') {
    return wrap(
      <g>
        <ellipse cx="5.0" cy="7.9" rx="3.7" ry="0.72" fill="#4f391c" opacity="0.32" />
        <rect x="1.55" y="6.0" width="6.7" height="0.82" rx="0.22" fill="#2b3142" stroke={N} strokeWidth="0.28" />
        <path d="M1.55 6.0 V4.05 L2.45 3.05 H3.85 V6.0 Z" fill={C} stroke={N} strokeWidth="0.36" strokeLinejoin="round" />
        <path d="M1.88 4.25 L2.55 3.45 H3.5 V4.6 H1.88 Z" fill="#1a3454" />
        <rect x="1.78" y="5.05" width="1.8" height="0.52" fill="#17b8b8" />
        <g transform="rotate(-11 5.95 4.35)">
          <ellipse cx="5.95" cy="4.35" rx="2.18" ry="1.45" fill={C} stroke={N} strokeWidth="0.38" />
          <path d="M4.95 3.1 Q5.45 4.35 4.95 5.6" fill="none" stroke="#17b8b8" strokeWidth="0.62" />
          <path d="M6.35 2.98 Q6.78 4.35 6.35 5.72" fill="none" stroke="#ffc93c" strokeWidth="0.54" />
          <path d="M7.9 3.75 L8.6 4.45 L7.85 4.85" fill="#9ea6b5" stroke={N} strokeWidth="0.26" strokeLinejoin="round" />
        </g>
        {[2.45, 5.55, 7.15].map((wx) => (
          <g key={wx}>
            <circle cx={wx} cy="6.95" r="0.78" fill="#181c24" stroke={N} strokeWidth="0.2" />
            <circle cx={wx} cy="6.95" r="0.3" fill="#cfd6e2" />
          </g>
        ))}
      </g>
    );
  }

  if (kind === 'excavator') {
    return wrap(
      <g>
        <ellipse cx="4.85" cy="8.0" rx="3.5" ry="0.72" fill="#4f391c" opacity="0.32" />
        <rect x="1.6" y="6.2" width="4.4" height="1.38" rx="0.68" fill="#1e222b" stroke={N} strokeWidth="0.32" />
        {[2.35, 3.8, 5.25].map((rx) => (
          <circle key={rx} cx={rx} cy="6.88" r="0.34" fill="#9ca4b4" />
        ))}
        <rect x="1.95" y="4.05" width="3.45" height="2.15" rx="0.42" fill="#ff9f1c" stroke="#522b00" strokeWidth="0.36" />
        <rect x="3.3" y="4.38" width="1.45" height="1.1" rx="0.2" fill="#18233a" />
        <rect x="2.18" y="5.58" width="3.0" height="0.34" fill={N} opacity="0.3" />
        <path d="M4.85 4.75 L6.75 1.85 L8.1 4.45" fill="none" stroke="#ff9f1c" strokeWidth="0.88" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4.85 4.75 L6.75 1.85 L8.1 4.45" fill="none" stroke="#522b00" strokeWidth="0.24" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.45 4.35 H8.75 L8.38 5.85 L7.15 5.35 Z" fill="#3a4152" stroke={N} strokeWidth="0.3" strokeLinejoin="round" />
      </g>
    );
  }

  if (kind === 'crew') {
    return wrap(
      <g>
        <ellipse cx="5.0" cy="7.9" rx="3.6" ry="0.75" fill="#4f391c" opacity="0.32" />
        <circle cx="2.75" cy="3.6" r="0.66" fill="#f3cda4" stroke={N} strokeWidth="0.2" />
        <path d="M1.95 3.55 a0.8 0.68 0 0 1 1.6 0 Z" fill="#ffc93c" stroke={N} strokeWidth="0.24" />
        <path d="M2.0 6.85 L2.25 4.35 H3.25 L3.5 6.85 Z" fill="#17b8b8" stroke={N} strokeWidth="0.28" />
        <circle cx="5.1" cy="3.1" r="0.68" fill="#f3cda4" stroke={N} strokeWidth="0.2" />
        <path d="M4.28 3.05 a0.82 0.7 0 0 1 1.64 0 Z" fill="#ff8a1e" stroke={N} strokeWidth="0.24" />
        <path d="M4.35 6.45 L4.6 3.9 H5.6 L5.85 6.45 Z" fill="#23395d" stroke={N} strokeWidth="0.28" />
        <path d="M7.35 4.8 L6.65 7.1 M7.35 4.8 L8.05 7.1 M7.35 4.8 V7.15" stroke="#4a3824" strokeWidth="0.3" strokeLinecap="round" />
        <rect x="6.75" y="4.1" width="1.2" height="0.72" fill="#ffc93c" stroke={N} strokeWidth="0.24" />
        <path d="M3.9 5.55 L4.48 7.35 H3.32 Z" fill="#e6194b" stroke={N} strokeWidth="0.22" />
        <path d="M3.68 6.32 H4.12" stroke={C} strokeWidth="0.34" />
        <path d="M7.95 6.0 L8.4 7.45 H7.5 Z" fill="#e6194b" stroke={N} strokeWidth="0.22" />
        <path d="M7.78 6.62 H8.12" stroke={C} strokeWidth="0.28" />
      </g>
    );
  }
  return null;
}

/** O mesmo icone em tamanho cheio para legenda, previa das areas e estoque. */
export const BPIconSvg: React.FC<{ kind: string; size?: number | string; title?: string }> = ({ kind, size = '1.2em', title }) => (
  <svg viewBox="0 0 10 10" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    {bpGlyph(kind, false)}
  </svg>
);

export const BPIconBadge: React.FC<{ icon: string; size?: number | string; title?: string }> = ({ icon, size = '1.2em', title }) => (
  <BPIconSvg kind={icon} size={size} title={title} />
);

/**
 * Moeda dos pontos: escura e fina, apoiada por cima das pecas.
 * (cx, cy) e o centro da casa; r e o raio da face.
 */
export const BPCoin: React.FC<{ cx: number; cy: number; v: number; r?: number }> = ({ cx, cy, v, r = 3 }) => {
  // moeda escura e fina: uma moeda so, pouco erguida, com sombra curta (a dourada fica para o monumento)
  const depth = r * 0.12;
  const fy = cy - depth;
  return (
    <g pointerEvents="none">
      <ellipse cx={cx + r * 0.22} cy={cy + r * 0.38} rx={r * 1.02} ry={r * 0.6} fill="#05060f" opacity="0.32" />
      <circle cx={cx} cy={fy + depth} r={r} fill="#04050c" />
      <circle cx={cx} cy={fy} r={r} fill="#141a3a" stroke="#04050c" strokeWidth={r * 0.08} />
      <circle cx={cx} cy={fy} r={r * 0.78} fill="#0b1230" stroke="#2a3366" strokeWidth={r * 0.06} />
      <path
        d={`M${cx - r * 0.66} ${fy - r * 0.24}A${r * 0.7} ${r * 0.7} 0 0 1 ${cx - r * 0.16} ${fy - r * 0.68}`}
        stroke="#f5f2eb"
        strokeWidth={r * 0.09}
        strokeLinecap="round"
        fill="none"
        opacity="0.35"
      />
      <text x={cx} y={fy + r * 0.37} textAnchor="middle" fontSize={r * (String(v).length > 1 ? 0.98 : 1.1)} fontFamily="'Anton','Inter','Arial Black',sans-serif" fill="#ffc93c">
        {v}
      </text>
    </g>
  );
};

const OCT = (h: number, dy = 0) => {
  const k = h * 0.414;
  return [
    [5 - k, 5 - h], [5 + k, 5 - h], [5 + h, 5 - k], [5 + h, 5 + k],
    [5 + k, 5 + h], [5 - k, 5 + h], [5 - h, 5 + k], [5 - h, 5 - k]
  ]
    .map(([x, y]) => `${x},${y + dy}`)
    .join(' ');
};

/** Monumento (no Fosso de uma area completa) com a pontuacao: ficha octogonal 2.5D, erguida acima do tabuleiro. */
const BPMonument: React.FC<{ v: number }> = ({ v }) => {
  const lift = -1.1;
  const depth = 1.1;
  return (
    <g>
      <ellipse cx="5.9" cy="7" rx="4.3" ry="2.5" fill="#05060f" opacity="0.42" />
      {Array.from({ length: 6 }, (_, i) => (
        <polygon key={i} points={OCT(4.1, lift + (depth * (i + 1)) / 6)} fill="#6e4a00" />
      ))}
      <polygon points={OCT(4.1, lift + depth * 0.5)} fill="none" stroke="#a87408" strokeWidth="0.25" />
      <polygon points={OCT(4.1, lift)} fill="#ffc93c" stroke="#6e4a00" strokeWidth="0.3" strokeLinejoin="round" />
      <polygon points={OCT(3.3, lift)} fill="#ffd866" stroke="#d99e12" strokeWidth="0.25" strokeLinejoin="round" />
      <path d={`M2.4 ${3.7 + lift}L3.7 ${2.2 + lift}`} stroke="#fff6d6" strokeWidth="0.5" strokeLinecap="round" opacity="0.9" />
      <text x="5" y={6.25 + lift} textAnchor="middle" fontSize="3.5" fontFamily="'Anton','Inter','Arial Black',sans-serif" fill="#0a0b1e">
        {v}
      </text>
    </g>
  );
};

const BPIconMark: React.FC<{ x: number; y: number; kind: string; statue?: number }> = ({ x, y, kind, statue }) => (
  <g pointerEvents="none" transform={`translate(${x * U} ${y * U})`}>
    {kind === 'pit' && statue !== undefined ? <BPMonument v={statue} /> : bpGlyph(kind, true)}
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
  /** Arquiteto (Equipe de Obra): posicoes 4x4 livres clicaveis direto no mapa */
  bpExpansionSpots?: Array<{ ax: number; ay: number }>;
  onPickExpansionSpot?: (ax: number, ay: number) => void;
  /** Permite zoom in/out vetorial (100% a 300%) + arrastar camera no mapa */
  enableZoom?: boolean;
  zoom?: number;
  onZoomChange?: (z: number) => void;
  label: string;
  testid?: string;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const ZOOM_CYCLE = [1, 1.5, 2, 3];

let uidSeq = 0;

export const CTBoardView: React.FC<CTBoardViewProps> = ({
  board,
  order,
  ghost,
  canTarget,
  selected,
  onCell,
  bpExpansionSpots,
  onPickExpansionSpot,
  enableZoom = false,
  zoom: controlledZoom,
  onZoomChange,
  label,
  testid
}) => {
  const idRef = useRef<string>('');
  if (!idRef.current) idRef.current = 'ctb' + ++uidSeq;
  const shadowId = idRef.current + '-sh';
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  const lastCell = useRef('');
  const panDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  // dedos na tela (pinca) e estado do gesto
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [internalZoom, setInternalZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const isBP = board.id.startsWith('bp-');

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
    (bpExpansionSpots || []).forEach((sp) => {
      minX = Math.min(minX, sp.ax * 4);
      minY = Math.min(minY, sp.ay * 4);
      maxX = Math.max(maxX, sp.ax * 4 + 3);
      maxY = Math.max(maxY, sp.ay * 4 + 3);
    });
    if (maxX < 0) return { x: 0, y: 0, w: board.w, h: board.h };
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }, [board, bpExpansionSpots]);

  const pieces = useMemo(() => {
    const map = new Map<string, { owner: string; cells: PCell[]; ptsCell?: { x: number; y: number; pts: number } }>();
    board.cells.forEach((c, i) => {
      if (!c.o || !c.p) return;
      const x = i % board.w;
      const y = Math.floor(i / board.w);
      const e = map.get(c.p) || { owner: c.o, cells: [] };
      e.cells.push({ x, y, k: c.k === 2 ? 2 : 1 });
      if (c.tilePts !== undefined && c.tilePts > 0) e.ptsCell = { x, y, pts: c.tilePts };
      map.set(c.p, e);
    });
    return Array.from(map.entries());
  }, [board]);

  const areaFrames = useMemo(() => {
    const m = new Map<string, { id: string; x: number; y: number; x2: number; y2: number; entrance: boolean }>();
    board.cells.forEach((c, i) => {
      if (c.t === 0 || !c.z || !isBP) return;
      const x = i % board.w;
      const y = Math.floor(i / board.w);
      const f = m.get(c.z) || { id: c.z, x, y, x2: x, y2: y, entrance: Boolean(c.entrance) };
      f.x = Math.min(f.x, x);
      f.y = Math.min(f.y, y);
      f.x2 = Math.max(f.x2, x);
      f.y2 = Math.max(f.y2, y);
      if (c.entrance) f.entrance = true;
      m.set(c.z, f);
    });
    return Array.from(m.values()).map((f) => ({
      id: f.id,
      x: f.x,
      y: f.y,
      w: f.x2 - f.x + 1,
      h: f.y2 - f.y + 1,
      entrance: f.entrance
    }));
  }, [board, isBP]);

  const pad = 2.2;
  const extraBottom = isBP ? 4.8 : 3.4;
  const fullBox = useMemo(
    () => ({
      x: box.x * U - pad,
      y: box.y * U - pad - 1.6,
      w: box.w * U + pad * 2,
      h: box.h * U + pad * 2 + extraBottom
    }),
    [box.x, box.y, box.w, box.h, extraBottom]
  );

  const activeZoom = enableZoom ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, controlledZoom ?? internalZoom)) : 1;

  const clampPan = (px: number, py: number, z: number) => {
    if (z <= 1) return { x: 0, y: 0 };
    const vw = fullBox.w / z;
    const vh = fullBox.h / z;
    return {
      x: Math.min(Math.max(0, fullBox.w - vw), Math.max(0, px)),
      y: Math.min(Math.max(0, fullBox.h - vh), Math.max(0, py))
    };
  };

  const clampedPan = clampPan(pan.x, pan.y, activeZoom);
  const vw = fullBox.w / activeZoom;
  const vh = fullBox.h / activeZoom;
  const vb = `${fullBox.x + clampedPan.x} ${fullBox.y + clampedPan.y} ${vw} ${vh}`;

  const setZoom = (nextZ: number) => {
    const z = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZ)) * 100) / 100;
    if (onZoomChange) onZoomChange(z);
    else setInternalZoom(z);
    return z;
  };

  const applyZoom = (nextZ: number, worldFocal?: { x: number; y: number; nx: number; ny: number }) => {
    const prevZ = activeZoom;
    const z = setZoom(nextZ);
    if (z <= 1) {
      setPan({ x: 0, y: 0 });
      return;
    }
    const nextVw = fullBox.w / z;
    const nextVh = fullBox.h / z;
    if (worldFocal) {
      const nextPx = worldFocal.x - fullBox.x - worldFocal.nx * nextVw;
      const nextPy = worldFocal.y - fullBox.y - worldFocal.ny * nextVh;
      setPan(clampPan(nextPx, nextPy, z));
      return;
    }
    // Ao sair de 100% pelo botao +, foca no centro da peca fantasma se ela estiver no tabuleiro
    if (prevZ <= 1 && ghost) {
      const gw = ghost.m[0]?.length || 1;
      const gh = ghost.m.length || 1;
      const gcx = (ghost.x + gw / 2) * U;
      const gcy = (ghost.y + gh / 2) * U;
      setPan(clampPan(gcx - fullBox.x - nextVw / 2, gcy - fullBox.y - nextVh / 2, z));
      return;
    }
    const curVw = fullBox.w / prevZ;
    const curVh = fullBox.h / prevZ;
    const cx = clampedPan.x + curVw / 2;
    const cy = clampedPan.y + curVh / 2;
    setPan(clampPan(cx - nextVw / 2, cy - nextVh / 2, z));
  };

  // Mantem a peca fantasma visivel caso seja movida pelas setas ou teclado com zoom > 100%
  useEffect(() => {
    if (!enableZoom || activeZoom <= 1 || !ghost) return;
    const gw = (ghost.m[0]?.length || 1) * U;
    const gh = (ghost.m.length || 1) * U;
    const gx1 = ghost.x * U - U * 0.45;
    const gy1 = ghost.y * U - U * 0.45;
    const gx2 = ghost.x * U + gw + U * 0.45;
    const gy2 = ghost.y * U + gh + U * 0.45;
    setPan((cur) => {
      const c = clampPan(cur.x, cur.y, activeZoom);
      const minVx = fullBox.x + c.x;
      const minVy = fullBox.y + c.y;
      let dx = 0;
      let dy = 0;
      if (gx1 < minVx) dx = gx1 - minVx;
      else if (gx2 > minVx + vw) dx = gx2 - (minVx + vw);
      if (gy1 < minVy) dy = gy1 - minVy;
      else if (gy2 > minVy + vh) dy = gy2 - (minVy + vh);
      if (!dx && !dy) return cur;
      return clampPan(c.x + dx, c.y + dy, activeZoom);
    });
  }, [enableZoom, activeZoom, ghost?.x, ghost?.y, ghost?.m, fullBox, vw, vh]);

  /** Zoom ancorado num ponto da tela (cursor do mouse ou meio da pinca). */
  const zoomAtClient = (nextZ: number, clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return applyZoom(nextZ);
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const world = pt.matrixTransform(ctm.inverse());
    const nx = (world.x - (fullBox.x + clampedPan.x)) / vw;
    const ny = (world.y - (fullBox.y + clampedPan.y)) / vh;
    applyZoom(nextZ, { x: world.x, y: world.y, nx, ny });
  };

  // Zoom com Ctrl + roda do mouse (ou pinca no touchpad), ancorado sob o cursor
  useEffect(() => {
    const svg = svgRef.current;
    if (!enableZoom || !svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // rolagem normal continua rolando a pagina
      e.preventDefault();
      const k = e.deltaMode === 1 ? 0.05 : 0.0035;
      const nextZ = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, activeZoom * Math.exp(-e.deltaY * k))) * 100) / 100;
      if (nextZ === activeZoom) return;
      zoomAtClient(nextZ, e.clientX, e.clientY);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  });

  // Atalhos de teclado (+/= amplia ate 300%, - reduz, 0 ajusta 100%)
  useEffect(() => {
    if (!enableZoom) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        applyZoom(activeZoom + ZOOM_STEP);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        applyZoom(activeZoom - ZOOM_STEP);
      } else if (e.key === '0' && activeZoom > ZOOM_MIN) {
        e.preventDefault();
        applyZoom(ZOOM_MIN);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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

  const boardClass =
    'ct-board' +
    (onCell ? ' ct-board--live' : '') +
    (enableZoom && activeZoom > 1 ? ' ct-board--zoomed' : '') +
    (panning ? ' is-panning' : '');

  return (
    <>
      <svg
        ref={svgRef}
        className={boardClass}
        viewBox={vb}
        role="img"
        aria-label={label}
        data-testid={testid}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={(e) => {
          if (enableZoom && e.pointerType === 'touch') {
            touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (touches.current.size === 2) {
              const [a, b] = Array.from(touches.current.values());
              pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: activeZoom };
              panDrag.current = null;
              dragging.current = false;
              setPanning(false);
              return;
            }
          }
          if (pinch.current) return;
          if (enableZoom && activeZoom > 1) {
            panDrag.current = {
              pointerId: e.pointerId,
              startX: e.clientX,
              startY: e.clientY,
              panX: clampedPan.x,
              panY: clampedPan.y,
              moved: false
            };
            lastCell.current = '';
            return;
          }
          if (!onCell) return;
          dragging.current = true;
          lastCell.current = '';
          fire(e);
        }}
        onPointerMove={(e) => {
          if (touches.current.has(e.pointerId)) touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pinch.current && touches.current.size >= 2) {
            const [a, b] = Array.from(touches.current.values());
            const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
            const nextZ = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (pinch.current.zoom * dist) / pinch.current.dist)) * 100) / 100;
            if (nextZ !== activeZoom) zoomAtClient(nextZ, (a.x + b.x) / 2, (a.y + b.y) / 2);
            return;
          }
          if (enableZoom && activeZoom > 1 && panDrag.current) {
            const d = panDrag.current;
            const dxPx = e.clientX - d.startX;
            const dyPx = e.clientY - d.startY;
            if (!d.moved && Math.hypot(dxPx, dyPx) >= 5) {
              d.moved = true;
              setPanning(true);
              try {
                e.currentTarget.setPointerCapture?.(e.pointerId);
              } catch {}
            }
            if (d.moved && svgRef.current) {
              const ctm = svgRef.current.getScreenCTM();
              if (ctm && ctm.a > 0 && ctm.d > 0) {
                setPan(clampPan(d.panX - dxPx / ctm.a, d.panY - dyPx / ctm.d, activeZoom));
              }
            }
            return;
          }
          if (dragging.current && ghost) fire(e);
        }}
        onPointerUp={(e) => {
          touches.current.delete(e.pointerId);
          if (touches.current.size < 2 && pinch.current) {
            pinch.current = null;
            if (touches.current.size === 0) return;
          }
          if (touches.current.size > 0 && pinch.current === null && e.pointerType === 'touch' && !panDrag.current && !dragging.current) return;
          if (enableZoom && activeZoom > 1 && panDrag.current) {
            const wasMoved = panDrag.current.moved;
            panDrag.current = null;
            setPanning(false);
            try {
              if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
            if (!wasMoved && onCell) fire(e);
            return;
          }
          dragging.current = false;
        }}
        onPointerCancel={(e) => {
          touches.current.delete(e.pointerId);
          if (touches.current.size < 2) pinch.current = null;
          panDrag.current = null;
          setPanning(false);
          dragging.current = false;
        }}
        onPointerLeave={() => {
          if (!panDrag.current?.moved) {
            panDrag.current = null;
            setPanning(false);
          }
          dragging.current = false;
        }}
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
            data-cell={`${x},${y}`}
            data-bp-icon={c.bpi || undefined}
            x={x * U - 0.02}
            y={y * U - 0.02}
            width={U + 0.04}
            height={U + 0.04}
            fill={
              c.t === 2
                ? (x + y) % 2
                  ? '#2f93cf'
                  : '#3aa0d8'
                : isBP
                ? (x + y) % 2
                  ? '#e6d8a6'
                  : '#efe2b6'
                : (x + y) % 2
                ? '#7cae48'
                : '#86b950'
            }
          />
        ))}
        {cells
          .filter(({ c }) => c.t === 2)
          .map(({ x, y }) => (
            <path key={'w' + x + ',' + y} d={`M${x * U + 2} ${y * U + 4}q1.5 -1.4 3 0t3 0M${x * U + 2} ${y * U + 7}q1.5 -1.4 3 0t3 0`} stroke="#bfe6fb" strokeOpacity="0.55" strokeWidth="0.45" fill="none" />
          ))}
        {/* zonas do Fronteiras: a base de cada jogador ganha a cor dele */}
        {cells
          .filter(({ c }) => c.z && c.z !== 'ilha' && !isBP)
          .map(({ c, x, y }) => (
            <rect key={'z' + x + ',' + y} x={x * U} y={y * U} width={U} height={U} fill={ctColor(order, c.z).top} opacity="0.3" />
          ))}
        {cells.map(({ x, y }) => (
          <rect key={'l' + x + ',' + y} x={x * U} y={y * U} width={U} height={U} fill="none" stroke={isBP ? '#7a5d32' : '#0a0b1e'} strokeOpacity={isBP ? 0.22 : 0.16} strokeWidth="0.25" />
        ))}
      </g>

      {/* fichas e icones de acao ficam no chao (aparecem por dentro do furo) */}
      {cells.map(({ c, x, y }) => (c.tok !== undefined ? <Token key={'t' + x + ',' + y} x={x} y={y} v={c.tok} /> : null))}
      {cells.map(({ c, x, y }) => (c.act ? <ActionIcon key={'a' + x + ',' + y} x={x} y={y} kind={c.act} /> : null))}
      {cells.map(({ c, x, y }) => (c.bpi && !c.o && c.statue === undefined ? <BPIconMark key={'bp' + x + ',' + y} x={x} y={y} kind={c.bpi} /> : null))}
      {areaFrames.map((f) => (
        <g key={'af' + f.id} pointerEvents="none">
          <rect x={f.x * U} y={f.y * U} width={f.w * U} height={f.h * U} fill="none" stroke="#5a3d22" strokeOpacity="0.82" strokeWidth="0.72" />
          <rect
            x={f.x * U + 0.45}
            y={f.y * U + 0.45}
            width={f.w * U - 0.9}
            height={f.h * U - 0.9}
            fill="none"
            stroke="#8c683a"
            strokeOpacity="0.45"
            strokeWidth="0.28"
            strokeDasharray="1.8 1.2"
          />
        </g>
      ))}

      {/* slots 4x4 interativos para abrir nova area com Equipe de Obra */}
      {bpExpansionSpots &&
        bpExpansionSpots.map((sp) => {
          const sx = sp.ax * 4 * U;
          const sy = sp.ay * 4 * U;
          const sw = 4 * U;
          return (
            <g
              key={`exp-${sp.ax}-${sp.ay}`}
              className="bp-expand-slot"
              role={onPickExpansionSpot ? 'button' : undefined}
              tabIndex={onPickExpansionSpot ? 0 : undefined}
              aria-label={`Abrir nova área na posição ${sp.ax},${sp.ay}`}
              onClick={
                onPickExpansionSpot
                  ? (e) => {
                      e.stopPropagation();
                      onPickExpansionSpot(sp.ax, sp.ay);
                    }
                  : undefined
              }
              onKeyDown={
                onPickExpansionSpot
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPickExpansionSpot(sp.ax, sp.ay);
                      }
                    }
                  : undefined
              }
            >
              <rect
                x={sx + 0.45}
                y={sy + 0.45}
                width={sw - 0.9}
                height={sw - 0.9}
                rx="1"
                fill="#17b8b8"
                fillOpacity="0.18"
                stroke="#17b8b8"
                strokeWidth="0.75"
                strokeDasharray="2.4 1.3"
              />
              <rect x={sx + sw / 2 - 11.5} y={sy + sw / 2 - 3.6} width="23" height="7.2" rx="1.2" fill="#0a0b1e" stroke="#17b8b8" strokeWidth="0.55" />
              <text
                x={sx + sw / 2}
                y={sy + sw / 2 + 1.15}
                textAnchor="middle"
                fontSize="3.4"
                fontWeight="900"
                fontFamily="'Inter','Arial Black',sans-serif"
                fill="#17b8b8"
              >
                + NOVA ÁREA
              </text>
            </g>
          );
        })}

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
      {pieces.map(([uid, p]) => {
        const col = ctColor(order, p.owner);
        return (
          <g key={uid}>
            <PieceShape cells={p.cells} color={col} shadowId={shadowId} />
          </g>
        );
      })}

      {/* faixa da entrada: depois das pecas, para a lateral e a sombra delas nao passarem por cima */}
      {areaFrames
        .filter((f) => f.entrance)
        .map((f) => (
            <g key={'en' + f.id} pointerEvents="none">
              <rect x={f.x * U} y={(f.y + f.h) * U + 0.1} width={f.w * U} height="2.75" rx="0.35" fill="#f59e0b" stroke="#5a3d22" strokeWidth="0.35" />
              <text
                x={(f.x + f.w / 2) * U}
                y={(f.y + f.h) * U + 2.0}
                textAnchor="middle"
                fontSize="1.95"
                fontWeight="900"
                letterSpacing="0.16"
                fontFamily="'Anton','Inter','Arial Black',sans-serif"
                fill="#140c06"
              >
                ENTRADA DA RESERVA
              </text>
            </g>
        ))}

      {/* moedas e monumentos: por cima de todas as pecas */}
      {pieces.map(([uid, p]) => (p.ptsCell ? <BPCoin key={'coin' + uid} cx={p.ptsCell.x * U + U / 2} cy={p.ptsCell.y * U + U / 2} v={p.ptsCell.pts} /> : null))}
      {cells.map(({ c, x, y }) => (c.bpi === 'pit' && c.statue !== undefined && !c.o ? <BPIconMark key={'mon' + x + ',' + y} x={x} y={y} kind="pit" statue={c.statue} /> : null))}

      {/* arvores: mais altas que as pecas, passam por dentro do furo */}
      {cells.map(({ c, x, y }) => (c.tree ? <Tree key={'tr' + x + ',' + y} x={x} y={y} grounded={!c.o} /> : null))}

      {/* peca na mao, flutuando sobre o grid */}
      {ghost && (
        <g className={ghost.locked ? '' : 'ct-ghost'} opacity={ghost.locked ? 1 : 0.94} pointerEvents="none">
          <PieceShape cells={ghostCells} color={ctColor(order, ghost.playerId)} lift={ghost.locked ? 0.4 : 1.6} outline={ghost.ok ? '#35e06f' : '#ff3b3b'} shadowId={shadowId} />
        </g>
      )}
    </svg>
    {enableZoom && (
      <div
        className="ct-zoom-bar"
        data-testid="bp-zoom-bar"
        role="group"
        aria-label="Zoom do tabuleiro"
      >
        <button
          type="button"
          className="ct-zoom-btn"
          data-testid="bp-zoom-in"
          aria-label="Aumentar zoom"
          disabled={activeZoom >= ZOOM_MAX}
          onClick={() => applyZoom(activeZoom + ZOOM_STEP)}
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          className="ct-zoom-level"
          data-testid="bp-zoom-level"
          data-tip="Zoom: Ctrl + rolar, pinça ou + e −"
          aria-label={`Zoom atual ${Math.round(activeZoom * 100)}%. Clique para alternar`}
          onClick={() => {
            const next = ZOOM_CYCLE.find((step) => step > activeZoom + 0.01) ?? ZOOM_MIN;
            applyZoom(next);
          }}
        >
          {Math.round(activeZoom * 100)}%
        </button>
        <button
          type="button"
          className="ct-zoom-btn"
          data-testid="bp-zoom-out"
          aria-label="Diminuir zoom"
          disabled={activeZoom <= ZOOM_MIN}
          onClick={() => applyZoom(activeZoom - ZOOM_STEP)}
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          className="ct-zoom-btn ct-zoom-reset"
          data-testid="bp-zoom-reset"
          aria-label="Ver o parque inteiro"
          disabled={activeZoom <= ZOOM_MIN}
          onClick={() => applyZoom(ZOOM_MIN)}
        >
          <Maximize2 size={11} />
        </button>
      </div>
    )}
    </>
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
