import React from 'react';
import type { BPTileType } from '../../types/game';
import { useCTSkin } from './CTSkin';
import { CTTilePainting } from './CTTilePainting';

/** Mesma escala em unidades SVG usada por CTBoardView e CTPieceView (1 casa = 10x10). */
const U = 10;
const DEPTH = 1.25;

export interface ClassicCell {
  x: number;
  y: number;
  k: 1 | 2 | 3;
}

/** Famílias de terreno para a lateral ilustrada dos 12 cercados. */
type ClassicBiome = 'koala' | 'gobi' | 'polar' | 'panda';

function enclosureBiome(tileType?: BPTileType): ClassicBiome {
  if (tileType === 'e-polar' || tileType === 'e-gobi' || tileType === 'e-arara') return 'koala';
  if (tileType === 'e-koala' || tileType === 'e-panda' || tileType === 'e-preguica') return 'gobi';
  if (tileType === 'e-tamandua' || tileType === 'e-lobo' || tileType === 'e-jabuti') return 'polar';
  return 'panda'; // e-mico (U), e-boto (Y), e-tucano (L)
}

/** Cores da face de fundo e da lateral na skin Clássica. */
function classicTileColors(tileType?: BPTileType, fallbackKind?: string): { top: string; side: string } {
  if (tileType) {
    if (tileType === 'toilet' || tileType === 'playground' || tileType === 'food' || tileType === 'river') {
      return { top: '#61aa39', side: '#35661f' };
    }
    if (tileType === 'h-polar') return { top: '#43a5db', side: '#1f5e84' };
    if (tileType === 'h-gobi') return { top: '#e7bc34', side: '#8a6614' };
    if (tileType === 'h-koala') return { top: '#3f7c2b', side: '#4b3117' };
    if (tileType === 'h-panda') return { top: '#4e8a39', side: '#3d4547' };
    const biome = enclosureBiome(tileType);
    if (biome === 'koala') return { top: '#31852a', side: '#174916' };
    if (biome === 'gobi') return { top: '#ecc02e', side: '#946711' };
    if (biome === 'polar') return { top: '#2b95cf', side: '#15547a' };
    return { top: '#aab2a7', side: '#555d57' };
  }
  if (fallbackKind === 'house') return { top: '#43a5db', side: '#1f5e84' };
  if (fallbackKind === 'enclosure') return { top: '#31852a', side: '#174916' };
  return { top: '#61aa39', side: '#35661f' };
}

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
            {tileType && <CTTilePainting type={tileType} cells={cells} unit={U} />}
            <path d={edges.outer} stroke="#252c20" strokeOpacity="0.72" strokeWidth="0.58" fill="none" />
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

const CLASSIC_BOARD_ART = `${import.meta.env.BASE_URL}assets/com-terra/board-classic`;
const paintedMarks = new Set(['wheel', 'cement', 'excavator', 'crew', 'pit']);

export function classicBoardGlyph(kind: string, onGround = false) {
  if (!paintedMarks.has(kind)) return null;
  const inset = onGround ? (kind === 'pit' ? .9 : 2.15) : .25;
  return <image href={`${CLASSIC_BOARD_ART}/${kind}.webp`} x={inset} y={inset}
    width={U - 2 * inset} height={U - 2 * inset} preserveAspectRatio="xMidYMid meet" />;
}

/** Portal de madeira e piso de pedra da reserva. */
export const ClassicEntranceBar: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => {
  const width = w * U;
  const skin = useCTSkin();
  if (skin === 'classic') {
    return (
      <g transform={`translate(${x * U} ${(y + h) * U})`} pointerEvents="none">
        <image href={`${CLASSIC_BOARD_ART}/entrance.webp`} x={width * .09} y=".16" width={width * .82} height="3.48" preserveAspectRatio="none" />
        <text x={width / 2} y="2.08" textAnchor="middle" fontSize="1.65" fontWeight="900" letterSpacing=".11"
          fontFamily="'Anton','Inter','Arial Black',sans-serif" fill="#fff0c7" paintOrder="stroke" stroke="#352417" strokeWidth=".2">
          ENTRADA DA RESERVA
        </text>
      </g>
    );
  }
  return (
    <g transform={`translate(${x * U} ${(y + h) * U})`} pointerEvents="none">
      <rect x=".12" y=".1" width={width - .24} height="3.67" fill="#a89b78" stroke="#514735" strokeWidth=".24" />
      <path d={`M.2 2.63H${width - .2}M.2 3.2H${width - .2}`} stroke="#dfcba0" strokeWidth=".14" />
      {Array.from({ length: Math.floor(width / 2) - 1 }, (_, i) => (
        <path key={i} d={`M${2 + i * 2} 2.63v.58m1 0v.52`} stroke="#71654d" strokeWidth=".13" />
      ))}
      <path d={`M1.1 .6H${width - 1.1}v1.98H1.1z`} fill="#67432d" stroke="#3c2b20" strokeWidth=".3" />
      <path d={`M1.4 .81H${width - 1.4}`} stroke="#b57b46" strokeWidth=".17" />
      {[1.2, width - 5.3].map(post => (
        <g key={post} transform={`translate(${post} 0)`}>
          <path d="M.35 2.61h3.5l-.34.55H.69z" fill="#82533b" stroke="#4a3825" strokeWidth=".18" />
          <path d="M2.08 2.65V.8M2.04 2.42C.75 2.24.7 1.18.54.89c.93.11 1.4.56 1.5 1.53zm.03-.26c.09-1.07.81-1.48 1.65-1.5-.23.95-.77 1.38-1.65 1.5z" fill="#739457" stroke="#304932" strokeWidth=".18" />
          <path d="M2.06 1.76C1.45 1.2 1.62.7 2.08.32c.55.52.59.94-.02 1.44z" fill="#aeb871" stroke="#304932" strokeWidth=".17" />
        </g>
      ))}
      <text x={width / 2} y="2.08" textAnchor="middle" fontSize="1.65" fontWeight="900" letterSpacing=".11" fontFamily="'Anton','Inter','Arial Black',sans-serif" fill="#fff0c7">
        ENTRADA DA RESERVA
      </text>
    </g>
  );
};

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
