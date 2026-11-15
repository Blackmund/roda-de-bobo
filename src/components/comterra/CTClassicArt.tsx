import React from 'react';
import type { BPTileType } from '../../types/game';

/** Mesma escala em unidades SVG usada por CTBoardView e CTPieceView (1 casa = 10x10). */
const U = 10;
const DEPTH = 1.25;

export interface ClassicCell {
  x: number;
  y: number;
  k: 1 | 2;
}

interface PieceMetrics {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
  cols: number;
  rows: number;
  set: Set<string>;
  neighbors: (x: number, y: number) => { l: boolean; r: boolean; t: boolean; b: boolean };
}

function getPieceMetrics(cells: ClassicCell[]): PieceMetrics {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const set = new Set<string>();
  cells.forEach((c) => {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
    set.add(`${c.x},${c.y}`);
  });
  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  return {
    minX,
    minY,
    maxX,
    maxY,
    w: cols * U,
    h: rows * U,
    cols,
    rows,
    set,
    neighbors: (x: number, y: number) => ({
      l: set.has(`${x - 1},${y}`),
      r: set.has(`${x + 1},${y}`),
      t: set.has(`${x},${y - 1}`),
      b: set.has(`${x},${y + 1}`)
    })
  };
}

/** 4 familias equilibradas de Cercados (3 modelos por especie/bioma = 12 pentominoes unicos). */
type ClassicBiome = 'koala' | 'gobi' | 'polar' | 'panda';

function enclosureBiome(tileType?: BPTileType): ClassicBiome {
  if (tileType === 'e-polar' || tileType === 'e-gobi' || tileType === 'e-arara') return 'koala';
  if (tileType === 'e-koala' || tileType === 'e-panda' || tileType === 'e-preguica') return 'gobi';
  if (tileType === 'e-tamandua' || tileType === 'e-lobo' || tileType === 'e-jabuti') return 'polar';
  return 'panda'; // e-mico (U), e-boto (Y), e-tucano (L)
}

/** Cor de base, espessura 2.5D lateral e moldura de pedra para cada peca na skin Classica. */
export function classicTileColors(tileType?: BPTileType, fallbackKind?: string): { top: string; side: string; rim: string } {
  if (tileType) {
    if (tileType === 'toilet' || tileType === 'playground' || tileType === 'food' || tileType === 'river') {
      return { top: '#61aa39', side: '#35661f', rim: '#5f675b' };
    }
    if (tileType === 'h-polar') return { top: '#43a5db', side: '#1f5e84', rim: '#616d70' };
    if (tileType === 'h-gobi') return { top: '#e7bc34', side: '#8a6614', rim: '#6d6958' };
    if (tileType === 'h-koala') return { top: '#3f7c2b', side: '#4b3117', rim: '#5b6154' };
    if (tileType === 'h-panda') return { top: '#4e8a39', side: '#3d4547', rim: '#626862' };
    const biome = enclosureBiome(tileType);
    if (biome === 'koala') return { top: '#31852a', side: '#174916', rim: '#596356' };
    if (biome === 'gobi') return { top: '#ecc02e', side: '#946711', rim: '#6c6858' };
    if (biome === 'polar') return { top: '#2b95cf', side: '#15547a', rim: '#627075' };
    return { top: '#aab2a7', side: '#555d57', rim: '#5b615a' };
  }
  if (fallbackKind === 'house') return { top: '#43a5db', side: '#1f5e84', rim: '#616d70' };
  if (fallbackKind === 'enclosure') return { top: '#31852a', side: '#174916', rim: '#596356' };
  return { top: '#61aa39', side: '#35661f', rim: '#5f675b' };
}

/** Hash deterministico por celula para variar arbustos, pedras e sombras sem ficar repetitivo. */
const cellHash = (x: number, y: number, salt = 0) => Math.abs((x * 37 + y * 91 + salt * 17) % 11);

/** Base organica de gramado Barenpark com variacao sutil e microfolhas. */
const LawnBase: React.FC<{ cells: ClassicCell[]; dark?: boolean }> = ({ cells, dark }) => (
  <g pointerEvents="none">
    {cells.map((c) => {
      const ox = c.x * U;
      const oy = c.y * U;
      const h = cellHash(c.x, c.y, 1);
      const base = dark ? (h % 2 ? '#2b6c22' : '#327827') : h % 2 ? '#5ca738' : '#67b43e';
      return (
        <g key={`lb-${c.x}-${c.y}`}>
          <rect x={ox - 0.1} y={oy - 0.1} width={U + 0.2} height={U + 0.2} fill={base} />
          <ellipse cx={ox + 2.4 + (h % 3) * 0.4} cy={oy + 3.0} rx="2.1" ry="1.4" fill={dark ? '#23591b' : '#4a912a'} opacity="0.45" />
          <ellipse cx={ox + 7.4} cy={oy + 7.2 - (h % 2) * 0.5} rx="2.0" ry="1.5" fill={dark ? '#3f8f31' : '#7ac74c'} opacity="0.4" />
          <path d={`M${ox + 2.1} ${oy + 7.6}l0.5-1.0 0.5 1.0 M${ox + 7.6} ${oy + 2.5}l0.4-0.9 0.4 0.9`} stroke={dark ? '#173e11' : '#326e1b'} strokeWidth="0.35" strokeLinecap="round" fill="none" opacity="0.6" />
        </g>
      );
    })}
  </g>
);

/** Moita organica vista de cima no estilo ilustrado de Michael Menzel (Barenpark). */
const Shrub: React.FC<{ cx: number; cy: number; r?: number; dark?: boolean }> = ({ cx, cy, r = 1.6, dark }) => (
  <g pointerEvents="none">
    <circle cx={cx + 0.35} cy={cy + 0.45} r={r * 1.05} fill="#0e240b" opacity="0.35" />
    <circle cx={cx} cy={cy} r={r} fill={dark ? '#1a4c16' : '#2e6f23'} />
    <circle cx={cx - r * 0.36} cy={cy - r * 0.15} r={r * 0.72} fill={dark ? '#266620' : '#418c30'} />
    <circle cx={cx + r * 0.32} cy={cy - r * 0.28} r={r * 0.62} fill={dark ? '#337d29' : '#53a33b'} />
    <circle cx={cx - r * 0.08} cy={cy - r * 0.42} r={r * 0.44} fill={dark ? '#4c9e3c' : '#73bf52'} />
  </g>
);

/** Sprites top-down dos 4 animais do Barenpark: Urso Polar, Urso de Gobi, Panda e Coala. */
const PolarBearSprite: React.FC<{ cx: number; cy: number; rot?: number; s?: number }> = ({ cx, cy, rot = 0, s = 1 }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`} pointerEvents="none">
    <ellipse cx="0.25" cy="0.35" rx="1.75" ry="0.95" fill="#0d3550" opacity="0.32" />
    <ellipse cx="-0.3" cy="0" rx="1.25" ry="0.82" fill="#f3f9fd" stroke="#4b6c82" strokeWidth="0.22" />
    <circle cx="-1.35" cy="0" r="0.24" fill="#d9ebf7" />
    <ellipse cx="1.05" cy="0" rx="0.62" ry="0.52" fill="#ffffff" stroke="#4b6c82" strokeWidth="0.2" />
    <circle cx="0.72" cy="-0.45" r="0.2" fill="#eef6fb" stroke="#4b6c82" strokeWidth="0.16" />
    <circle cx="0.72" cy="0.45" r="0.2" fill="#eef6fb" stroke="#4b6c82" strokeWidth="0.16" />
    <circle cx="1.56" cy="0" r="0.16" fill="#1e293b" />
  </g>
);

const GobiBearSprite: React.FC<{ cx: number; cy: number; rot?: number; s?: number }> = ({ cx, cy, rot = 0, s = 1 }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`} pointerEvents="none">
    <ellipse cx="0.3" cy="0.38" rx="1.65" ry="0.92" fill="#4f3308" opacity="0.38" />
    <ellipse cx="-0.25" cy="0" rx="1.18" ry="0.78" fill="#824d1b" stroke="#361c05" strokeWidth="0.22" />
    <ellipse cx="-0.25" cy="-0.15" rx="0.75" ry="0.38" fill="#a2682c" opacity="0.65" />
    <ellipse cx="0.95" cy="0" rx="0.58" ry="0.48" fill="#925822" stroke="#361c05" strokeWidth="0.2" />
    <circle cx="0.65" cy="-0.42" r="0.2" fill="#6b3d12" stroke="#361c05" strokeWidth="0.15" />
    <circle cx="0.65" cy="0.42" r="0.2" fill="#6b3d12" stroke="#361c05" strokeWidth="0.15" />
    <ellipse cx="1.36" cy="0" rx="0.24" ry="0.2" fill="#c79552" />
    <circle cx="1.54" cy="0" r="0.13" fill="#1c0d02" />
  </g>
);

const PandaSprite: React.FC<{ cx: number; cy: number; rot?: number; s?: number }> = ({ cx, cy, rot = 0, s = 1 }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`} pointerEvents="none">
    <ellipse cx="0.25" cy="0.38" rx="1.55" ry="0.95" fill="#232824" opacity="0.32" />
    <ellipse cx="-0.2" cy="0" rx="1.08" ry="0.8" fill="#f7f9fa" stroke="#222629" strokeWidth="0.22" />
    {/* faixa preta dos ombros/patas */}
    <ellipse cx="0.28" cy="-0.62" rx="0.42" ry="0.28" fill="#1c1f22" />
    <ellipse cx="0.28" cy="0.62" rx="0.42" ry="0.28" fill="#1c1f22" />
    <ellipse cx="-0.8" cy="-0.55" rx="0.34" ry="0.24" fill="#1c1f22" />
    <ellipse cx="-0.8" cy="0.55" rx="0.34" ry="0.24" fill="#1c1f22" />
    <circle cx="0.88" cy="0" r="0.58" fill="#ffffff" stroke="#1c1f22" strokeWidth="0.2" />
    <circle cx="0.72" cy="-0.56" r="0.25" fill="#181a1d" />
    <circle cx="0.72" cy="0.56" r="0.25" fill="#181a1d" />
    <circle cx="1.05" cy="-0.22" r="0.16" fill="#181a1d" />
    <circle cx="1.05" cy="0.22" r="0.16" fill="#181a1d" />
    <circle cx="1.38" cy="0" r="0.13" fill="#111" />
  </g>
);

const KoalaSprite: React.FC<{ cx: number; cy: number; rot?: number; s?: number }> = ({ cx, cy, rot = 0, s = 1 }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`} pointerEvents="none">
    <ellipse cx="0.2" cy="0.32" rx="1.25" ry="0.82" fill="#0d290c" opacity="0.36" />
    <ellipse cx="-0.15" cy="0" rx="0.88" ry="0.66" fill="#8f9aa1" stroke="#373f45" strokeWidth="0.2" />
    <circle cx="0.58" cy="-0.54" r="0.38" fill="#a2acb3" stroke="#373f45" strokeWidth="0.18" />
    <circle cx="0.58" cy="0.54" r="0.38" fill="#a2acb3" stroke="#373f45" strokeWidth="0.18" />
    <circle cx="0.62" cy="-0.54" r="0.18" fill="#cfd6db" />
    <circle cx="0.62" cy="0.54" r="0.18" fill="#cfd6db" />
    <circle cx="0.82" cy="0" r="0.5" fill="#9ea8ae" stroke="#373f45" strokeWidth="0.18" />
    <ellipse cx="1.18" cy="0" rx="0.18" ry="0.24" fill="#23282d" />
  </g>
);

/** Frondes de samambaia/palmeira e folhas de eucalipto para o bioma de Floresta dos Coalas. */
const FernFrond: React.FC<{ cx: number; cy: number; ang: number; len?: number }> = ({ cx, cy, ang, len = 3.2 }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${ang})`} pointerEvents="none">
    <path d={`M0 0 L${len} 0`} stroke="#143b13" strokeWidth="0.4" strokeLinecap="round" />
    {[-0.45, -0.25, 0, 0.25, 0.45].map((t, i) => {
      const px = len * (0.28 + i * 0.16);
      const leaf = (1.1 - i * 0.14) * (len / 3.2);
      return (
        <g key={i}>
          <ellipse cx={px} cy={-leaf * 0.65} rx="0.42" ry={leaf * 0.62} transform={`rotate(-18 ${px} ${-leaf * 0.65})`} fill={i % 2 ? '#4ca338' : '#358429'} stroke="#174415" strokeWidth="0.14" />
          <ellipse cx={px} cy={leaf * 0.65} rx="0.42" ry={leaf * 0.62} transform={`rotate(18 ${px} ${leaf * 0.65})`} fill={i % 2 ? '#5db844' : '#3f912f'} stroke="#174415" strokeWidth="0.14" />
        </g>
      );
    })}
  </g>
);

/** Moita de bambu verde denso com colmos segmentados (bioma Panda). */
const BambooClump: React.FC<{ cx: number; cy: number; rot?: number }> = ({ cx, cy, rot = 0 }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot})`} pointerEvents="none">
    <circle cx="0.2" cy="0.3" r="2.2" fill="#183d14" opacity="0.28" />
    <path d="M-1.5 1.1 L1.6 -1.4 M-1.1 -1.2 L1.4 1.3 M-0.2 -1.7 L0.2 1.7" stroke="#1f581b" strokeWidth="0.52" strokeLinecap="round" />
    <ellipse cx="-0.9" cy="-0.4" rx="0.95" ry="0.46" transform="rotate(-35 -0.9 -0.4)" fill="#4aa539" stroke="#184715" strokeWidth="0.18" />
    <ellipse cx="0.9" cy="-0.6" rx="0.9" ry="0.44" transform="rotate(28 0.9 -0.6)" fill="#5ec248" stroke="#184715" strokeWidth="0.18" />
    <ellipse cx="0.7" cy="0.8" rx="0.95" ry="0.44" transform="rotate(-22 0.7 0.8)" fill="#3b8e2e" stroke="#184715" strokeWidth="0.18" />
    <ellipse cx="-0.7" cy="0.9" rx="0.88" ry="0.4" transform="rotate(34 -0.7 0.9)" fill="#6ad152" stroke="#184715" strokeWidth="0.18" />
  </g>
);

/** Conector suave para rios e caminhos sem emenda entre celulas adjacentes. */
const ConnectedSpine: React.FC<{
  cells: ClassicCell[];
  width: number;
  color: string;
  stroke?: string;
  strokeWidth?: number;
  dashed?: boolean;
}> = ({ cells, width, color, stroke, strokeWidth = 0.5, dashed }) => {
  const m = getPieceMetrics(cells);
  return (
    <g pointerEvents="none">
      {cells.map((c) => {
        const cx = c.x * U + U / 2;
        const cy = c.y * U + U / 2;
        const nb = m.neighbors(c.x, c.y);
        return (
          <g key={`sp-${c.x}-${c.y}`}>
            {stroke && (
              <>
                {nb.l && <line x1={c.x * U} y1={cy} x2={cx} y2={cy} stroke={stroke} strokeWidth={width + strokeWidth * 2} strokeLinecap="round" />}
                {nb.r && <line x1={cx} y1={cy} x2={(c.x + 1) * U} y2={cy} stroke={stroke} strokeWidth={width + strokeWidth * 2} strokeLinecap="round" />}
                {nb.t && <line x1={cx} y1={c.y * U} x2={cx} y2={cy} stroke={stroke} strokeWidth={width + strokeWidth * 2} strokeLinecap="round" />}
                {nb.b && <line x1={cx} y1={cy} x2={cx} y2={(c.y + 1) * U} stroke={stroke} strokeWidth={width + strokeWidth * 2} strokeLinecap="round" />}
                <circle cx={cx} cy={cy} r={width / 2 + strokeWidth} fill={stroke} />
              </>
            )}
            {nb.l && <line x1={c.x * U} y1={cy} x2={cx} y2={cy} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.2 1.2' : undefined} />}
            {nb.r && <line x1={cx} y1={cy} x2={(c.x + 1) * U} y2={cy} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.2 1.2' : undefined} />}
            {nb.t && <line x1={cx} y1={c.y * U} x2={cx} y2={cy} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.2 1.2' : undefined} />}
            {nb.b && <line x1={cx} y1={cy} x2={cx} y2={(c.y + 1) * U} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.2 1.2' : undefined} />}
            <circle cx={cx} cy={cy} r={width / 2} fill={color} />
          </g>
        );
      })}
    </g>
  );
};

/** Ilustracao top-down fiel a cada uma das 20 pecas na skin Classica de Barenpark. */
const ClassicTileInterior: React.FC<{ cells: ClassicCell[]; tileType?: BPTileType; fallbackKind?: string }> = ({
  cells,
  tileType,
  fallbackKind
}) => {
  const m = getPieceMetrics(cells);
  const bx = m.minX * U;
  const by = m.minY * U;
  const c0 = cells[0];
  const horiz = m.w >= m.h;

  // ================================================================
  // 1. AREAS VERDES (CARRIOLA)
  // ================================================================
  if (tileType === 'toilet') {
    const ox = c0.x * U;
    const oy = c0.y * U;
    return (
      <g>
        <LawnBase cells={cells} />
        {/* calcadinha de pedra ate a cabine azul de banheiro (icone classico do Barenpark) */}
        <path d={`M${ox + 1.4} ${oy + 8.6} Q${ox + 4.4} ${oy + 7.5} ${ox + 5.6} ${oy + 6.4}`} stroke="#cfc8ad" strokeWidth="2.0" strokeLinecap="round" fill="none" />
        <Shrub cx={ox + 2.1} cy={oy + 2.4} r={1.35} />
        <Shrub cx={ox + 8.1} cy={oy + 7.6} r={1.2} />
        {/* sombra da cabine */}
        <rect x={ox + 3.4} y={oy + 3.2} width="4.4" height="4.2" rx="0.45" fill="#0d250c" opacity="0.34" />
        {/* cabine sanitaria azul turquesa */}
        <rect x={ox + 3.0} y={oy + 2.7} width="4.1" height="4.1" rx="0.4" fill="#1794cc" stroke="#0c3a54" strokeWidth="0.42" />
        <rect x={ox + 3.45} y={oy + 3.1} width="3.2" height="3.2" rx="0.25" fill="#4bc4f0" />
        {/* teto claro + placa de telhado inclinado */}
        <polygon points={`${ox + 2.85},${oy + 4.8} ${ox + 5.05},${oy + 2.6} ${ox + 7.25},${oy + 4.8}`} fill="#e8f7ff" stroke="#18597c" strokeWidth="0.32" />
        <rect x={ox + 4.25} y={oy + 5.0} width="1.6" height="1.8" rx="0.2" fill="#0e5b82" />
      </g>
    );
  }

  if (tileType === 'playground') {
    const cx = bx + m.w / 2;
    const cy = by + m.h / 2;
    return (
      <g>
        <LawnBase cells={cells} />
        <g transform={horiz ? '' : `rotate(90 ${cx} ${cy})`}>
          {/* areia arredondada no centro */}
          <ellipse cx={cx - 0.5} cy={cy + 0.2} rx="6.6" ry="3.2" fill="#ead493" stroke="#998249" strokeWidth="0.35" />
          {/* arvores nas bordas */}
          <Shrub cx={cx - 7.3} cy={cy - 2.3} r={1.85} />
          <Shrub cx={cx + 7.4} cy={cy + 2.2} r={1.75} />
          <Shrub cx={cx + 6.9} cy={cy - 2.7} r={1.2} />
          {/* escorregador prateado/azul com bordas vermelhas */}
          <path d={`M${cx - 5.2} ${cy - 0.7} Q${cx - 2.4} ${cy + 0.6} ${cx - 0.3} ${cy + 1.5}`} stroke="#3e4b59" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          <path d={`M${cx - 5.2} ${cy - 0.7} Q${cx - 2.4} ${cy + 0.6} ${cx - 0.3} ${cy + 1.5}`} stroke="#cfe5f5" strokeWidth="1.35" strokeLinecap="round" fill="none" />
          <circle cx={cx - 5.4} cy={cy - 0.8} r="1.05" fill="#e04736" stroke="#4d140c" strokeWidth="0.3" />
          {/* gangorra de madeira */}
          <line x1={cx + 1.2} y1={cy + 1.1} x2={cx + 5.3} y2={cy - 1.3} stroke="#633a12" strokeWidth="1.15" strokeLinecap="round" />
          <line x1={cx + 1.2} y1={cy + 1.1} x2={cx + 5.3} y2={cy - 1.3} stroke="#c88a42" strokeWidth="0.7" strokeLinecap="round" />
          <circle cx={cx + 1.2} cy={cy + 1.1} r="0.55" fill="#e23b2c" />
          <circle cx={cx + 5.3} cy={cy - 1.3} r="0.55" fill="#2c75d8" />
        </g>
      </g>
    );
  }

  if (tileType === 'food') {
    const corner = cells.find((c) => {
      const nb = m.neighbors(c.x, c.y);
      return Number(nb.l) + Number(nb.r) + Number(nb.t) + Number(nb.b) >= 2;
    }) || c0;
    const leaves = cells.filter((c) => c !== corner);
    return (
      <g>
        <LawnBase cells={cells} />
        <ConnectedSpine cells={cells} width={5.2} color="#dcd1ac" stroke="#968a62" strokeWidth={0.35} />
        {/* barraca listrada azul-e-branca estilo Barenpark */}
        <g>
          <rect x={corner.x * U + 2.2} y={corner.y * U + 2.3} width="5.8" height="5.4" rx="0.5" fill="#0f250d" opacity="0.25" />
          <rect x={corner.x * U + 2.0} y={corner.y * U + 2.0} width="5.8" height="5.4" rx="0.5" fill="#f7fafc" stroke="#1a3452" strokeWidth="0.45" />
          <path
            d={`M${corner.x * U + 3.0} ${corner.y * U + 2.1}V${corner.y * U + 7.3} M${corner.x * U + 4.9} ${corner.y * U + 2.1}V${corner.y * U + 7.3} M${corner.x * U + 6.8} ${corner.y * U + 2.1}V${corner.y * U + 7.3}`}
            stroke="#225ca8"
            strokeWidth="1.05"
          />
          <line x1={corner.x * U + 2.0} y1={corner.y * U + 4.7} x2={corner.x * U + 7.8} y2={corner.y * U + 4.7} stroke="#1a3452" strokeWidth="0.35" opacity="0.65" />
        </g>
        {/* trailer branco/vermelho de lanches */}
        {leaves[0] && (
          <g>
            <rect x={leaves[0].x * U + 2.0} y={leaves[0].y * U + 3.0} width="6.2" height="4.2" rx="0.8" fill="#1b2214" opacity="0.25" />
            <rect x={leaves[0].x * U + 1.8} y={leaves[0].y * U + 2.7} width="6.2" height="4.2" rx="0.8" fill="#fdf6ec" stroke="#592214" strokeWidth="0.4" />
            <rect x={leaves[0].x * U + 2.0} y={leaves[0].y * U + 4.1} width="5.8" height="1.35" fill="#df4230" />
            <circle cx={leaves[0].x * U + 8.3} cy={leaves[0].y * U + 2.5} r="0.65" fill="#3a862c" />
          </g>
        )}
        {/* barraquinha amarela/madeira + arbusto */}
        {leaves[1] && (
          <g>
            <Shrub cx={leaves[1].x * U + 7.6} cy={leaves[1].y * U + 7.5} r={1.25} />
            <rect x={leaves[1].x * U + 2.4} y={leaves[1].y * U + 2.5} width="4.8" height="4.5" rx="0.45" fill="#de9c42" stroke="#4f2d0a" strokeWidth="0.42" />
            <polygon points={`${leaves[1].x * U + 2.4},${leaves[1].y * U + 2.5} ${leaves[1].x * U + 7.2},${leaves[1].y * U + 2.5} ${leaves[1].x * U + 4.8},${leaves[1].y * U + 4.8}`} fill="#f2bd63" stroke="#4f2d0a" strokeWidth="0.3" />
          </g>
        )}
      </g>
    );
  }

  if (tileType === 'river') {
    const cx = bx + m.w / 2;
    const cy = by + m.h / 2;
    const len = Math.max(m.w, m.h);
    return (
      <g>
        <LawnBase cells={cells} />
        <g transform={horiz ? '' : `rotate(90 ${cx} ${cy})`}>
          {/* margem de pedrinhas e vegetacao */}
          <path
            d={`M${cx - len / 2 - 1} ${cy - 0.4} Q${cx - len * 0.22} ${cy - 3.0} ${cx} ${cy + 0.5} T${cx + len / 2 + 1} ${cy - 0.5}`}
            fill="none"
            stroke="#8e9485"
            strokeWidth="6.1"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - len / 2 - 1} ${cy - 0.4} Q${cx - len * 0.22} ${cy - 3.0} ${cx} ${cy + 0.5} T${cx + len / 2 + 1} ${cy - 0.5}`}
            fill="none"
            stroke="#1f7b96"
            strokeWidth="5.0"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - len / 2 - 1} ${cy - 0.4} Q${cx - len * 0.22} ${cy - 3.0} ${cx} ${cy + 0.5} T${cx + len / 2 + 1} ${cy - 0.5}`}
            fill="none"
            stroke="#3cb4cc"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* ondas fluidas suaves na correnteza (sem pontilhado de pista!) */}
          <path
            d={`M${cx - len * 0.38} ${cy - 1.2} q2.5 -0.9 5 0 M${cx + len * 0.08} ${cy + 0.8} q2.5 -0.8 4.8 0`}
            fill="none"
            stroke="#baf3fc"
            strokeWidth="0.65"
            strokeLinecap="round"
            opacity="0.82"
          />
          <Shrub cx={cx - len * 0.34} cy={cy + 3.2} r={1.45} dark />
          <Shrub cx={cx + len * 0.3} cy={cy - 3.1} r={1.4} dark />
          {/* pedrinha com castor/ursinho pequeno no riacho */}
          <ellipse cx={cx - 0.2} cy={cy + 0.3} rx="1.6" ry="1.05" fill="#9ea397" stroke="#52574d" strokeWidth="0.3" />
          <GobiBearSprite cx={cx - 0.2} cy={cy + 0.2} rot={-18} s={0.72} />
        </g>
      </g>
    );
  }

  // ================================================================
  // 2. VIVEIROS (4 CASAS DE ANIMAIS - BETONEIRA)
  // ================================================================
  if (tileType === 'h-polar') {
    return (
      <g>
        {/* agua artica azul + blocos de gelo irregulares */}
        <rect x={bx} y={by} width={m.w} height={m.h} fill="#2589c4" />
        <ellipse cx={bx + m.w * 0.32} cy={by + m.h * 0.56} rx={m.w * 0.35} ry={m.h * 0.32} fill="#44b1e6" opacity="0.7" />
        <ellipse cx={bx + m.w * 0.72} cy={by + m.h * 0.62} rx={m.w * 0.28} ry={m.h * 0.28} fill="#44b1e6" opacity="0.65" />
        {/* beiral de gelo/neve */}
        {cells.map((c, idx) => {
          const ox = c.x * U;
          const oy = c.y * U;
          const w = horiz;
          return (
            <g key={`hp-${c.x}-${c.y}`}>
              {/* faixa envidracada do viveiro (metade superior/esquerda) */}
              {w ? (
                <g>
                  <rect x={ox} y={oy} width={U} height="4.8" fill="#c7ebfc" stroke="#2d6485" strokeWidth="0.4" />
                  <polygon points={`${ox + 0.4},${oy + 0.4} ${ox + U - 0.4},${oy + 0.4} ${ox + U - 0.4},${oy + 2.3} ${ox + 0.4},${oy + 2.3}`} fill="#e8f8ff" />
                  <line x1={ox + U * 0.5} y1={oy} x2={ox + U * 0.5} y2={oy + 4.8} stroke="#2d6485" strokeWidth="0.4" />
                  <path d={`M${ox + 0.8} ${oy + 8.6} Q${ox + 3.8} ${oy + 6.7} ${ox + 6.8} ${oy + 8.3} T${ox + U - 0.6} ${oy + 8.5} V${oy + U} H${ox + 0.8} Z`} fill="#e9f7ff" stroke="#7ec7e8" strokeWidth="0.32" />
                </g>
              ) : (
                <g>
                  <rect x={ox} y={oy} width="4.8" height={U} fill="#c7ebfc" stroke="#2d6485" strokeWidth="0.4" />
                  <polygon points={`${ox + 0.4},${oy + 0.4} ${ox + 2.3},${oy + 0.4} ${ox + 2.3},${oy + U - 0.4} ${ox + 0.4},${oy + U - 0.4}`} fill="#e8f8ff" />
                  <line x1={ox} y1={oy + U * 0.5} x2={ox + 4.8} y2={oy + U * 0.5} stroke="#2d6485" strokeWidth="0.4" />
                  <path d={`M${ox + 8.5} ${oy + 0.8} Q${ox + 6.8} ${oy + 4.2} ${ox + 8.4} ${oy + 7.2} L${ox + U} ${oy + U - 0.6} V${oy + 0.8} Z`} fill="#e9f7ff" stroke="#7ec7e8" strokeWidth="0.32" />
                </g>
              )}
              {idx === 1 && <PolarBearSprite cx={ox + (w ? 6.6 : 6.9)} cy={oy + (w ? 6.9 : 5.2)} rot={w ? 15 : 85} s={0.95} />}
              {idx === cells.length - 1 && <PolarBearSprite cx={ox + (w ? 4.8 : 6.6)} cy={oy + (w ? 6.8 : 4.6)} rot={w ? -25 : 70} s={0.88} />}
            </g>
          );
        })}
      </g>
    );
  }

  if (tileType === 'h-gobi') {
    return (
      <g>
        <rect x={bx} y={by} width={m.w} height={m.h} fill="#efbf2d" />
        {/* dunas douradas */}
        <path d={`M${bx} ${by + m.h * 0.55} Q${bx + m.w * 0.35} ${by + m.h * 0.25} ${bx + m.w} ${by + m.h * 0.65} V${by + m.h} H${bx} Z`} fill="#e0ad1a" />
        {/* lagoa de areia + rochas de arenito */}
        <ellipse cx={bx + m.w * 0.66} cy={by + m.h * 0.64} rx={m.w * 0.26} ry={m.h * 0.21} fill="#2b9bc7" stroke="#18546e" strokeWidth="0.45" />
        <ellipse cx={bx + m.w * 0.62} cy={by + m.h * 0.6} rx={m.w * 0.14} ry={m.h * 0.11} fill="#76d8f2" opacity="0.55" />
        {/* abrigo rustico de madeira no canto */}
        <rect x={bx + 2.3} y={by + 2.3} width="8.6" height="6.8" rx="0.6" fill="#3b2007" opacity="0.3" />
        <rect x={bx + 1.9} y={by + 1.9} width="8.4" height="6.6" rx="0.5" fill="#9a5c22" stroke="#422408" strokeWidth="0.48" />
        <polygon points={`${bx + 1.9},${by + 1.9} ${bx + 10.3},${by + 1.9} ${bx + 6.1},${by + 5.2}`} fill="#c27a33" stroke="#422408" strokeWidth="0.32" />
        <line x1={bx + 1.9} y1={by + 5.2} x2={bx + 10.3} y2={by + 5.2} stroke="#522c0a" strokeWidth="0.55" />
        <Shrub cx={bx + m.w * 0.82} cy={by + m.h * 0.22} r={1.45} />
        <GobiBearSprite cx={bx + m.w * 0.3} cy={by + m.h * 0.72} rot={-22} s={1.08} />
        <GobiBearSprite cx={bx + m.w * 0.7} cy={by + m.h * 0.34} rot={145} s={0.95} />
      </g>
    );
  }

  if (tileType === 'h-koala') {
    return (
      <g>
        <LawnBase cells={cells} dark />
        {/* tufos de eucalipto pelas bordas */}
        {cells.map((c, idx) => (
          <Shrub key={`hks-${idx}`} cx={c.x * U + (idx % 2 ? 8.1 : 1.9)} cy={c.y * U + (idx % 2 ? 2.0 : 8.0)} r={1.5} dark />
        ))}
        {/* telhado rustico de madeira marrom com cumeeira inclinada estilo Barenpark */}
        <ConnectedSpine cells={cells} width={6.8} color="#45270b" stroke="#261304" strokeWidth={0.4} />
        <ConnectedSpine cells={cells} width={5.8} color="#966227" />
        <ConnectedSpine cells={cells} width={2.8} color="#b67d39" dashed />
        <ConnectedSpine cells={cells} width={0.65} color="#4a280a" />
        {cells.map((c, idx) =>
          idx === 0 || idx === cells.length - 1 ? (
            <KoalaSprite key={`hkc-${idx}`} cx={c.x * U + 5.0} cy={c.y * U + 5.0} rot={idx * 55} s={1.0} />
          ) : null
        )}
      </g>
    );
  }

  if (tileType === 'h-panda') {
    return (
      <g>
        <LawnBase cells={cells} dark />
        {/* bambuzais nas pontas */}
        {cells.map((c, idx) => (
          <BambooClump key={`hpb-${idx}`} cx={c.x * U + (idx % 2 ? 1.9 : 8.1)} cy={c.y * U + (idx % 2 ? 8.0 : 2.1)} rot={idx * 30} />
        ))}
        {/* tunel metalico corrugado cinza curvo (marca registrada do Panda House no Barenpark!) */}
        <ConnectedSpine cells={cells} width={7.2} color="#424947" stroke="#222625" strokeWidth={0.42} />
        <ConnectedSpine cells={cells} width={6.2} color="#7c8581" />
        <ConnectedSpine cells={cells} width={4.9} color="#adb5b1" dashed />
        <ConnectedSpine cells={cells} width={2.4} color="#cdd4d0" />
        {cells[0] && <PandaSprite cx={cells[0].x * U + 5.0} cy={cells[0].y * U + 5.0} rot={25} s={1.05} />}
        {cells[cells.length - 1] && <PandaSprite cx={cells[cells.length - 1].x * U + 5.0} cy={cells[cells.length - 1].y * U + 5.0} rot={-65} s={0.95} />}
      </g>
    );
  }

  // ================================================================
  // 3. 12 CERCADOS UNICOS (4 ESPECIES x 3 PECAS = 12 PENTOMINOES)
  // ================================================================
  if (tileType?.startsWith('e-') || fallbackKind === 'enclosure') {
    const biome = enclosureBiome(tileType);

    if (biome === 'gobi') {
      // Deserto de Gobi dourado com falesias de arenito diagonais e Ursos de Gobi
      const mid = cells[Math.floor(cells.length / 2)] || c0;
      const last = cells[cells.length - 1] || c0;
      return (
        <g>
          <rect x={bx} y={by} width={m.w} height={m.h} fill="#f2c42a" />
          {cells.map((c) => {
            const ox = c.x * U;
            const oy = c.y * U;
            const h = cellHash(c.x, c.y, 3);
            return (
              <g key={`eg-${c.x}-${c.y}`}>
                <rect x={ox - 0.05} y={oy - 0.05} width={U + 0.1} height={U + 0.1} fill={h % 2 ? '#ebb820' : '#f7ce3e'} opacity="0.65" />
                {/* ondulacao suave de areia */}
                <path d={`M${ox + 1.2} ${oy + 7.5} Q${ox + 5.0} ${oy + 5.8} ${ox + 8.8} ${oy + 7.4}`} stroke="#d19816" strokeWidth="0.6" fill="none" opacity="0.55" />
                {/* rochas facetadas de arenito */}
                {h % 3 !== 0 && (
                  <g>
                    <polygon points={`${ox + 1.6},${oy + 7.8} ${ox + 5.6},${oy + 2.3} ${ox + 8.4},${oy + 5.2} ${ox + 6.4},${oy + 8.1}`} fill="#f6da72" stroke="#7c4f10" strokeWidth="0.34" strokeLinejoin="round" />
                    <polygon points={`${ox + 5.6},${oy + 2.3} ${ox + 8.4},${oy + 5.2} ${ox + 6.4},${oy + 8.1} ${ox + 4.9},${oy + 5.6}`} fill="#c9851e" />
                  </g>
                )}
              </g>
            );
          })}
          <GobiBearSprite cx={c0.x * U + 4.8} cy={c0.y * U + 4.8} rot={-18} s={1.08} />
          <GobiBearSprite cx={mid.x * U + 5.2} cy={mid.y * U + 5.3} rot={35} s={1.02} />
          {last !== c0 && <GobiBearSprite cx={last.x * U + 5.0} cy={last.y * U + 5.0} rot={160} s={0.95} />}
        </g>
      );
    }

    if (biome === 'polar') {
      // Piscina Artica azul-cristal com gelo flutuante e Ursos Polares
      const mid = cells[Math.floor(cells.length / 2)] || c0;
      const last = cells[cells.length - 1] || c0;
      return (
        <g>
          <rect x={bx} y={by} width={m.w} height={m.h} fill="#258ec9" />
          <ConnectedSpine cells={cells} width={6.4} color="#3ca9e2" />
          {cells.map((c) => {
            const ox = c.x * U;
            const oy = c.y * U;
            const h = cellHash(c.x, c.y, 4);
            return (
              <g key={`epol-${c.x}-${c.y}`}>
                <path
                  d={`M${ox + 0.6} ${oy + 1.4} Q${ox + 3.2} ${oy + 0.6} ${ox + 5.4} ${oy + 2.5} L${ox + 2.6} ${oy + 4.8} L${ox + 0.6} ${oy + 3.4} Z`}
                  fill="#eaf7ff"
                  stroke="#79c5eb"
                  strokeWidth="0.3"
                />
                {h % 2 === 0 && (
                  <polygon
                    points={`${ox + 6.2},${oy + 6.5} ${ox + 9.2},${oy + 6.2} ${ox + 9.0},${oy + 9.1} ${ox + 5.8},${oy + 8.7}`}
                    fill="#f4fbff"
                    stroke="#84cbe9"
                    strokeWidth="0.28"
                  />
                )}
                <path d={`M${ox + 3.4} ${oy + 6.4} q1.8 -0.8 3.6 0`} stroke="#a9e6fc" strokeWidth="0.45" fill="none" strokeLinecap="round" />
              </g>
            );
          })}
          <PolarBearSprite cx={c0.x * U + 5.2} cy={c0.y * U + 4.8} rot={15} s={1.08} />
          <PolarBearSprite cx={mid.x * U + 5.0} cy={mid.y * U + 5.2} rot={-35} s={1.0} />
          {last !== c0 && <PolarBearSprite cx={last.x * U + 5.0} cy={last.y * U + 5.0} rot={140} s={0.95} />}
        </g>
      );
    }

    if (biome === 'panda') {
      // Patio de pedra cinza com bambuzais espessos e Pandas Gigantes (igual tile 7 canto inferior direito)
      const mid = cells[Math.floor(cells.length / 2)] || c0;
      const last = cells[cells.length - 1] || c0;
      return (
        <g>
          <rect x={bx} y={by} width={m.w} height={m.h} fill="#aeb6ab" />
          {cells.map((c) => {
            const ox = c.x * U;
            const oy = c.y * U;
            const h = cellHash(c.x, c.y, 5);
            return (
              <g key={`epd-${c.x}-${c.y}`}>
                <rect x={ox - 0.05} y={oy - 0.05} width={U + 0.1} height={U + 0.1} fill={h % 2 ? '#a2aba0' : '#bac2b6'} opacity="0.7" />
                <ellipse cx={ox + 4.8} cy={oy + 6.2} rx="2.8" ry="1.8" fill="#929c8f" opacity="0.45" />
                <BambooClump cx={ox + (h % 2 ? 2.2 : 7.8)} cy={oy + (h % 2 ? 2.2 : 7.6)} rot={h * 25} />
              </g>
            );
          })}
          <PandaSprite cx={c0.x * U + 5.0} cy={c0.y * U + 5.2} rot={-20} s={1.08} />
          <PandaSprite cx={mid.x * U + 5.0} cy={mid.y * U + 4.8} rot={40} s={1.02} />
          {last !== c0 && <PandaSprite cx={last.x * U + 5.0} cy={last.y * U + 5.0} rot={-125} s={0.95} />}
        </g>
      );
    }

    // Bioma Koala: Floresta exuberante de samambaias e eucalipto (igual tile 6 verde-escuro!)
    const mid = cells[Math.floor(cells.length / 2)] || c0;
    const last = cells[cells.length - 1] || c0;
    return (
      <g>
        <LawnBase cells={cells} dark />
        {cells.map((c) => {
          const ox = c.x * U;
          const oy = c.y * U;
          const h = cellHash(c.x, c.y, 2);
          return (
            <g key={`ekl-${c.x}-${c.y}`}>
              <FernFrond cx={ox + 2.4} cy={oy + 2.6} ang={35 + h * 18} len={3.4} />
              <FernFrond cx={ox + 7.8} cy={oy + 7.4} ang={215 + h * 15} len={3.3} />
              <Shrub cx={ox + 7.6} cy={oy + 2.3} r={1.35} dark />
            </g>
          );
        })}
        <KoalaSprite cx={c0.x * U + 5.0} cy={c0.y * U + 5.2} rot={-15} s={1.08} />
        <KoalaSprite cx={mid.x * U + 5.0} cy={mid.y * U + 4.9} rot={30} s={1.0} />
        {last !== c0 && <KoalaSprite cx={last.x * U + 5.0} cy={last.y * U + 5.0} rot={135} s={0.96} />}
      </g>
    );
  }

  return <LawnBase cells={cells} />;
};

/** Peca completa na skin Classica de Barenpark (com borda de pedra, vincos por casa, relevo 3D e arte top-down). */
export const ClassicPieceShape: React.FC<{
  cells: ClassicCell[];
  tileType?: BPTileType;
  fallbackKind?: string;
  faceD: string;
  edges: { light: string; dark: string; outer: string; inner: string };
  lift?: number;
  outline?: string;
  showContour?: boolean;
  shadowId: string;
  clipId: string;
  layer?: 'all' | 'under' | 'top';
}> = ({ cells, tileType, fallbackKind, faceD, edges, lift = 0, outline, showContour = false, shadowId, clipId, layer = 'all' }) => {
  const cols = classicTileColors(tileType, fallbackKind);
  const under = layer !== 'top';
  const top = layer !== 'under';
  return (
    <g>
      {top && (
        <defs>
          <clipPath id={clipId}>
            <path d={faceD} fillRule="evenodd" />
          </clipPath>
        </defs>
      )}
      {under && (
        <>
          <path
            d={faceD}
            fillRule="evenodd"
            fill="#000"
            opacity={lift ? 0.42 : 0.36}
            transform={`translate(${0.9 + lift * 0.9} ${DEPTH + 0.9 + lift * 1.1})`}
            filter={`url(#${shadowId})`}
          />
          <g transform={`translate(0 ${-lift})`}>
            <path d={faceD} fillRule="evenodd" fill={cols.side} transform={`translate(0 ${DEPTH})`} />
          </g>
        </>
      )}
      {top && (
        <g transform={`translate(0 ${-lift})`}>
          <path d={faceD} fillRule="evenodd" fill={cols.top} />
          <g clipPath={`url(#${clipId})`}>
            <ClassicTileInterior cells={cells} tileType={tileType} fallbackKind={fallbackKind} />
            {/* Vincos internos 10x10 por quadrado para contar todas as casas sem confusao */}
            {edges.inner && <path d={edges.inner} stroke="#141910" strokeOpacity="0.24" strokeWidth="0.32" fill="none" />}
            {/* Muro de pedras cinza caracteristico dos azulejos do Barenpark */}
            <path d={edges.outer} stroke="#5d6359" strokeOpacity="0.92" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            <path d={edges.outer} stroke="#aeb5aa" strokeOpacity="0.88" strokeWidth="0.92" strokeDasharray="1.4 0.85" fill="none" strokeLinejoin="round" />
          </g>
          <path d={edges.light} stroke="#ffffff" strokeOpacity={showContour ? 0.52 : 0.44} strokeWidth="0.48" strokeLinecap="round" fill="none" />
          <path d={edges.dark} stroke="#000000" strokeOpacity={showContour ? 0.44 : 0.34} strokeWidth="0.52" strokeLinecap="round" fill="none" />
          {showContour && <path d={edges.outer} stroke="#1a1610" strokeOpacity="0.9" strokeWidth="0.65" strokeLinecap="square" fill="none" />}
          {outline && <path d={edges.outer || faceD} fill="none" stroke={outline} strokeWidth="0.95" strokeLinejoin="round" />}
        </g>
      )}
    </g>
  );
};

/** Pentagono laranja de Cercado posicionado em coordenadas SVG (cx, cy). */
export const ClassicPentagonBadge: React.FC<{ cx: number; cy: number; pts: number }> = ({ cx, cy, pts }) => {
  const r = 3.55;
  const ptsAttr = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
  }).join(' ');
  const innerR = 2.85;
  const innerAttr = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `${(cx + Math.cos(a) * innerR).toFixed(2)},${(cy + Math.sin(a) * innerR).toFixed(2)}`;
  }).join(' ');
  return (
    <g pointerEvents="none">
      <polygon points={ptsAttr} fill="#d95f0e" stroke="#361804" strokeWidth="0.48" strokeLinejoin="round" />
      <polygon points={innerAttr} fill="#f7891f" stroke="#ffe1a8" strokeOpacity="0.85" strokeWidth="0.3" strokeLinejoin="round" />
      <text
        x={cx}
        y={cy + 1.35}
        textAnchor="middle"
        fontSize="3.55"
        fontWeight="900"
        fontFamily="'Anton','Inter','Arial Black',sans-serif"
        fill="#ffffff"
        stroke="#2d1302"
        strokeWidth="0.48"
        paintOrder="stroke"
      >
        {pts}
      </text>
    </g>
  );
};

/** Selo de pontuacao estilo Barenpark: losango branco para Viveiros, pentagono laranja para Cercados. */
export const ClassicPointBadge: React.FC<{ x: number; y: number; pts: number; kind: string }> = ({ x, y, pts, kind }) => {
  const cx = x * U + U / 2;
  const cy = y * U + U / 2;
  if (kind === 'enclosure') {
    return <ClassicPentagonBadge cx={cx} cy={cy} pts={pts} />;
  }
  return (
    <g pointerEvents="none">
      <polygon
        points={`${cx},${cy - 3.6} ${cx + 3.6},${cy} ${cx},${cy + 3.6} ${cx - 3.6},${cy}`}
        fill="#f8fafc"
        stroke="#274754"
        strokeWidth="0.52"
        strokeLinejoin="round"
      />
      <polygon
        points={`${cx},${cy - 2.85} ${cx + 2.85},${cy} ${cx},${cy + 2.85} ${cx - 2.85},${cy}`}
        fill="none"
        stroke="#6290a3"
        strokeWidth="0.28"
      />
      <text
        x={cx}
        y={cy + 1.2}
        textAnchor="middle"
        fontSize="3.3"
        fontWeight="900"
        fontFamily="'Anton','Inter','Arial Black',sans-serif"
        fill="#13252f"
      >
        {pts}
      </text>
    </g>
  );
};

/** Monumento estilo Barenpark: base circular de paralelepipedos + medalhao dourado com orelhas de urso. */
export const ClassicMonument: React.FC<{ v: number }> = ({ v }) => (
  <g>
    <circle cx="5" cy="5" r="4.25" fill="#7c8279" stroke="#3a3f38" strokeWidth="0.38" />
    <circle cx="5" cy="5" r="3.45" fill="#9ea39a" stroke="#535950" strokeWidth="0.28" strokeDasharray="0.9 0.7" />
    <circle cx="3.35" cy="2.1" r="0.88" fill="#d49a16" stroke="#422903" strokeWidth="0.32" />
    <circle cx="6.65" cy="2.1" r="0.88" fill="#d49a16" stroke="#422903" strokeWidth="0.32" />
    <polygon points="3.35,1.55 6.65,1.55 8.55,3.45 8.55,6.65 6.65,8.55 3.35,8.55 1.45,6.65 1.45,3.45" fill="#b37a0b" stroke="#362002" strokeWidth="0.38" />
    <polygon points="3.65,1.95 6.35,1.95 8.05,3.65 8.05,6.35 6.35,8.05 3.65,8.05 1.95,6.35 1.95,3.65" fill="#f7c83b" />
    <circle cx="5" cy="5" r="2.55" fill="#825405" fillOpacity="0.18" />
    <text x="5" y="6.15" textAnchor="middle" fontSize="3.45" fontWeight="900" fontFamily="'Anton','Inter','Arial Black',sans-serif" fill="#2c1702">
      {v}
    </text>
  </g>
);

/** Faixa classica da Entrada estilo Barenpark + calcada azulada das bilheterias. */
export const ClassicEntranceBar: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => (
  <g pointerEvents="none">
    <rect x={x * U} y={(y + h) * U + 0.08} width={w * U} height="2.45" rx="0.25" fill="#f59e0b" stroke="#5a3d22" strokeWidth="0.32" />
    <rect x={x * U + 0.4} y={(y + h) * U + 0.3} width={w * U - 0.8} height="0.7" fill="#ffd25e" opacity="0.55" />
    <circle cx={x * U + 2.7} cy={(y + h) * U + 1.3} r="0.82" fill="#9c5a08" stroke="#3c1e03" strokeWidth="0.22" />
    <circle cx={(x + w) * U - 2.7} cy={(y + h) * U + 1.3} r="0.82" fill="#9c5a08" stroke="#3c1e03" strokeWidth="0.22" />
    <text
      x={(x + w / 2) * U}
      y={(y + h) * U + 1.85}
      textAnchor="middle"
      fontSize="1.75"
      fontWeight="900"
      letterSpacing="0.14"
      fontFamily="'Anton','Inter','Arial Black',sans-serif"
      fill="#221003"
    >
      ENTRADA DA RESERVA
    </text>
    <rect x={x * U} y={(y + h) * U + 2.55} width={w * U} height="1.15" rx="0.15" fill="#46657c" stroke="#223342" strokeWidth="0.24" />
    <path
      d={`M${x * U + 3} ${(y + h) * U + 3.12}h3.5 M${(x + w) * U - 6.5} ${(y + h) * U + 3.12}h3.5`}
      stroke="#d7eefc"
      strokeWidth="0.36"
      strokeDasharray="0.9 0.7"
    />
  </g>
);

/** Moldura de calcada de pedra e portal laranja classico da Entrada na skin Classica. */
export const ClassicAreaFrame: React.FC<{ x: number; y: number; w: number; h: number; entrance?: boolean }> = ({
  x,
  y,
  w,
  h,
  entrance
}) => (
  <g pointerEvents="none">
    <rect x={x * U} y={y * U} width={w * U} height={h * U} fill="none" stroke="#6d7369" strokeOpacity="0.95" strokeWidth="0.9" />
    <rect
      x={x * U + 0.15}
      y={y * U + 0.15}
      width={w * U - 0.3}
      height={h * U - 0.3}
      fill="none"
      stroke="#b7bdb0"
      strokeOpacity="0.65"
      strokeWidth="0.35"
      strokeDasharray="1.3 0.9"
    />
    {entrance && <ClassicEntranceBar x={x} y={y} w={w} h={h} />}
  </g>
);
