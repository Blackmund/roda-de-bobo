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
  return {
    minX,
    minY,
    maxX,
    maxY,
    w: (maxX - minX + 1) * U,
    h: (maxY - minY + 1) * U,
    set,
    neighbors: (x: number, y: number) => ({
      l: set.has(`${x - 1},${y}`),
      r: set.has(`${x + 1},${y}`),
      t: set.has(`${x},${y - 1}`),
      b: set.has(`${x},${y + 1}`)
    })
  };
}

/** Cor de fundo e espessura lateral para o verso em relevo de cada peca na skin Classica. */
export function classicTileColors(tileType?: BPTileType, fallbackKind?: string): { top: string; side: string; rim: string } {
  if (tileType) {
    if (tileType === 'toilet' || tileType === 'playground' || tileType === 'food' || tileType === 'river') {
      return { top: '#68b03c', side: '#3d6e22', rim: '#2f521a' };
    }
    if (tileType === 'h-polar') return { top: '#79c6e8', side: '#2f6a8c', rim: '#1f4961' };
    if (tileType === 'h-gobi') return { top: '#e2bd52', side: '#8d6b24', rim: '#614815' };
    if (tileType === 'h-koala') return { top: '#3c7a2e', side: '#56391b', rim: '#3b240d' };
    if (tileType === 'h-panda') return { top: '#6f8072', side: '#444b52', rim: '#282d33' };
    if (tileType === 'e-koala' || tileType === 'e-panda' || tileType === 'e-preguica') {
      return { top: '#f0c83b', side: '#9b6b12', rim: '#6d4707' };
    }
    if (tileType === 'e-boto' || tileType === 'e-tucano') {
      return { top: '#b8c4b4', side: '#5d6b59', rim: '#3e483c' };
    }
    if (tileType === 'e-tamandua' || tileType === 'e-lobo' || tileType === 'e-jabuti') {
      return { top: '#5ab39f', side: '#22656f', rim: '#16454d' };
    }
    // Mata Atlantica / floresta densa
    return { top: '#3f9636', side: '#1f5a20', rim: '#133d15' };
  }
  if (fallbackKind === 'house') return { top: '#79c6e8', side: '#2f6a8c', rim: '#1f4961' };
  if (fallbackKind === 'enclosure') return { top: '#f0c83b', side: '#9b6b12', rim: '#6d4707' };
  return { top: '#68b03c', side: '#3d6e22', rim: '#2f521a' };
}

/** Pequenas folhagens e pedrinhas de grama para Areas Verdes. */
const GrassTufts: React.FC<{ cells: ClassicCell[]; dark?: boolean }> = ({ cells, dark }) => (
  <g pointerEvents="none">
    {cells.map((c) => {
      const ox = c.x * U;
      const oy = c.y * U;
      return (
        <g key={`gt-${c.x}-${c.y}`}>
          <rect x={ox} y={oy} width={U} height={U} fill={(c.x + c.y) % 2 ? (dark ? '#388530' : '#61a836') : dark ? '#429439' : '#70b742'} opacity="0.45" />
          <circle cx={ox + 1.8} cy={oy + 2.1} r="0.85" fill={dark ? '#235e1e' : '#4a8d28'} opacity="0.65" />
          <circle cx={ox + 8.3} cy={oy + 7.9} r="0.95" fill={dark ? '#235e1e' : '#4a8d28'} opacity="0.58" />
          <circle cx={ox + 7.9} cy={oy + 1.9} r="0.55" fill={dark ? '#79c958' : '#96d85a'} opacity="0.55" />
        </g>
      );
    })}
  </g>
);

/** Caminho de pedrinhas conectando celulas consecutivas em pecas multi-celula. */
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
            {nb.l && <line x1={c.x * U} y1={cy} x2={cx} y2={cy} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.1 1.1' : undefined} />}
            {nb.r && <line x1={cx} y1={cy} x2={(c.x + 1) * U} y2={cy} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.1 1.1' : undefined} />}
            {nb.t && <line x1={cx} y1={c.y * U} x2={cx} y2={cy} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.1 1.1' : undefined} />}
            {nb.b && <line x1={cx} y1={cy} x2={cx} y2={(c.y + 1) * U} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '1.1 1.1' : undefined} />}
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

  // --- AREAS VERDES ---
  if (tileType === 'toilet') {
    const ox = c0.x * U;
    const oy = c0.y * U;
    return (
      <g>
        <GrassTufts cells={cells} />
        {/* calcadinha + arbustos + quiosque de madeira estilo cabana Barenpark */}
        <ellipse cx={ox + 5.2} cy={oy + 7.5} rx="2.4" ry="1.2" fill="#c7bc91" opacity="0.8" />
        <ellipse cx={ox + 5.6} cy={oy + 5.6} rx="2.9" ry="2.2" fill="#183210" opacity="0.28" />
        <circle cx={ox + 2.2} cy={oy + 3.2} r="1.2" fill="#3a7d27" stroke="#1e4414" strokeWidth="0.3" />
        <circle cx={ox + 8.0} cy={oy + 6.9} r="1.1" fill="#468f2f" stroke="#1e4414" strokeWidth="0.3" />
        <rect x={ox + 2.7} y={oy + 2.6} width="4.6" height="4.4" rx="0.4" fill="#d99a4e" stroke="#47280b" strokeWidth="0.42" />
        <polygon points={`${ox + 2.4},${oy + 4.8} ${ox + 5.0},${oy + 2.2} ${ox + 7.6},${oy + 4.8}`} fill="#e8b26b" stroke="#47280b" strokeWidth="0.35" />
        <line x1={ox + 5.0} y1={oy + 2.2} x2={ox + 5.0} y2={oy + 7.0} stroke="#633811" strokeWidth="0.45" />
      </g>
    );
  }

  if (tileType === 'playground') {
    const cx = bx + m.w / 2;
    const cy = by + m.h / 2;
    return (
      <g>
        <GrassTufts cells={cells} />
        <ConnectedSpine cells={cells} width={3.6} color="#d6c690" stroke="#968553" strokeWidth={0.3} />
        {/* escorregador metalico + arvorezinha + gangorra */}
        <g transform={horiz ? '' : `rotate(90 ${cx} ${cy})`}>
          <circle cx={cx - 5.2} cy={cy - 1.8} r="1.8" fill="#2d7422" stroke="#163b11" strokeWidth="0.35" />
          <circle cx={cx + 5.2} cy={cy + 2.0} r="1.5" fill="#449933" stroke="#163b11" strokeWidth="0.35" />
          {/* caixa de areia + escorregador com degraus */}
          <rect x={cx - 4.4} y={cy - 1.8} width="4.4" height="3.6" rx="0.7" fill="#ebd28c" stroke="#785e28" strokeWidth="0.35" />
          <path d={`M${cx - 3.6} ${cy - 0.6} L${cx + 2.8} ${cy + 1.2}`} stroke="#4a5568" strokeWidth="1.9" strokeLinecap="round" />
          <path d={`M${cx - 3.6} ${cy - 0.6} L${cx + 2.8} ${cy + 1.2}`} stroke="#d8e3ed" strokeWidth="1.2" strokeLinecap="round" />
          <line x1={cx - 3.8} y1={cy - 1.25} x2={cx - 3.0} y2={cy - 0.15} stroke="#2d3748" strokeWidth="0.45" />
          <line x1={cx - 2.9} y1={cy - 0.95} x2={cx - 2.1} y2={cy + 0.15} stroke="#2d3748" strokeWidth="0.45" />
          <circle cx={cx + 3.8} cy={cy - 1.8} r="1.15" fill="#e6533c" stroke="#4f160d" strokeWidth="0.32" />
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
        <GrassTufts cells={cells} />
        <ConnectedSpine cells={cells} width={4.2} color="#dad0a8" stroke="#998d64" strokeWidth={0.25} />
        {/* barraca listrada azul e branca na esquina */}
        <g>
          <rect x={corner.x * U + 2.2} y={corner.y * U + 2.2} width="5.6" height="5.2" rx="0.5" fill="#f5f7fa" stroke="#1b3048" strokeWidth="0.45" />
          <path d={`M${corner.x * U + 3.3} ${corner.y * U + 2.3}V${corner.y * U + 7.3} M${corner.x * U + 5.0} ${corner.y * U + 2.3}V${corner.y * U + 7.3} M${corner.x * U + 6.7} ${corner.y * U + 2.3}V${corner.y * U + 7.3}`} stroke="#235fa8" strokeWidth="0.95" />
        </g>
        {/* trailer vermelho / toldo e arbustos nas pontas */}
        {leaves[0] && (
          <g>
            <rect x={leaves[0].x * U + 2.0} y={leaves[0].y * U + 2.9} width="6.0" height="4.0" rx="0.7" fill="#fdf6ec" stroke="#4e2313" strokeWidth="0.42" />
            <rect x={leaves[0].x * U + 2.0} y={leaves[0].y * U + 4.3} width="6.0" height="1.2" fill="#e04332" />
          </g>
        )}
        {leaves[1] && (
          <g>
            <rect x={leaves[1].x * U + 2.8} y={leaves[1].y * U + 2.6} width="4.4" height="4.4" rx="0.4" fill="#d99748" stroke="#4b2a09" strokeWidth="0.4" />
            <circle cx={leaves[1].x * U + 7.6} cy={leaves[1].y * U + 7.4} r="1.2" fill="#2e7422" stroke="#183f12" strokeWidth="0.3" />
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
        <GrassTufts cells={cells} />
        <g transform={horiz ? '' : `rotate(90 ${cx} ${cy})`}>
          {/* margem rochosa + corrego sinuoso azul-turquesa */}
          <path
            d={`M${cx - len / 2 - 1} ${cy - 0.5} Q${cx - len * 0.2} ${cy - 3.6} ${cx} ${cy + 0.4} T${cx + len / 2 + 1} ${cy - 0.6}`}
            fill="none"
            stroke="#316127"
            strokeWidth="5.8"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - len / 2 - 1} ${cy - 0.5} Q${cx - len * 0.2} ${cy - 3.6} ${cx} ${cy + 0.4} T${cx + len / 2 + 1} ${cy - 0.6}`}
            fill="none"
            stroke="#2a9cc2"
            strokeWidth="4.4"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - len / 2 - 1} ${cy - 0.5} Q${cx - len * 0.2} ${cy - 3.6} ${cx} ${cy + 0.4} T${cx + len / 2 + 1} ${cy - 0.6}`}
            fill="none"
            stroke="#7fe3f5"
            strokeWidth="1.25"
            strokeDasharray="2.4 2.0"
            strokeLinecap="round"
          />
        </g>
      </g>
    );
  }

  // --- VIVEIROS (4 CASAS DE ANIMAIS) ---
  if (tileType === 'h-polar') {
    // Galeria de vidro e agua cristalina estilo Barenpark (4x1 ou 1x4)
    return (
      <g>
        <rect x={bx} y={by} width={m.w} height={m.h} fill="#3aa6da" />
        {/* blocos de gelo/agua + teto envidracado */}
        {cells.map((c) => {
          const ox = c.x * U;
          const oy = c.y * U;
          return (
            <g key={`hp-${c.x}-${c.y}`}>
              <rect x={ox + 0.5} y={oy + 0.5} width={U - 1} height={U - 1} rx="0.6" fill="#bce8fc" stroke="#226891" strokeWidth="0.45" />
              <rect x={ox + 1.2} y={oy + 1.2} width={U - 2.4} height={U - 2.4} fill="#e1f5fe" stroke="#5caad1" strokeWidth="0.32" />
              <path d={`M${ox + 1.4} ${oy + U / 2} H${ox + U - 1.4} M${ox + U / 2} ${oy + 1.4} V${oy + U - 1.4}`} stroke="#6ab8de" strokeWidth="0.4" />
            </g>
          );
        })}
        <ConnectedSpine cells={cells} width={2.8} color="#9be0fa" />
      </g>
    );
  }

  if (tileType === 'h-gobi') {
    // Lago das Capivaras / Oasis dourado 2x2 com lagoa turquesa e pedras de areia
    return (
      <g>
        <rect x={bx} y={by} width={m.w} height={m.h} fill="#e8c354" />
        <ellipse cx={bx + m.w * 0.46} cy={by + m.h * 0.52} rx={m.w * 0.36} ry={m.h * 0.31} fill="#8a7432" opacity="0.35" />
        <ellipse cx={bx + m.w * 0.44} cy={by + m.h * 0.48} rx={m.w * 0.34} ry={m.h * 0.29} fill="#2a9ac4" stroke="#1e5e7a" strokeWidth="0.5" />
        <ellipse cx={bx + m.w * 0.41} cy={by + m.h * 0.44} rx={m.w * 0.22} ry={m.h * 0.16} fill="#6cd5f0" opacity="0.55" />
        <circle cx={bx + m.w * 0.8} cy={by + m.h * 0.22} r="1.7" fill="#c79e43" stroke="#75561c" strokeWidth="0.35" />
        <circle cx={bx + m.w * 0.18} cy={by + m.h * 0.8} r="1.6" fill="#529a3b" stroke="#234d17" strokeWidth="0.35" />
        <circle cx={bx + m.w * 0.82} cy={by + m.h * 0.78} r="1.4" fill="#63ab46" stroke="#234d17" strokeWidth="0.32" />
      </g>
    );
  }

  if (tileType === 'h-koala') {
    // Bosque dos Micos (T): cobertura escura de arvores com passarela/pergola rustica de madeira
    return (
      <g>
        <GrassTufts cells={cells} dark />
        {cells.map((c) => {
          const ox = c.x * U;
          const oy = c.y * U;
          return (
            <g key={`hk-${c.x}-${c.y}`}>
              <circle cx={ox + 2.2} cy={oy + 2.4} r="1.9" fill="#21541c" />
              <circle cx={ox + 7.9} cy={oy + 7.6} r="1.9" fill="#21541c" />
              <circle cx={ox + 7.8} cy={oy + 2.3} r="1.5" fill="#3b822d" />
              <circle cx={ox + 2.3} cy={oy + 7.7} r="1.5" fill="#3b822d" />
            </g>
          );
        })}
        <ConnectedSpine cells={cells} width={5.2} color="#9d6d30" stroke="#3c2208" strokeWidth={0.45} />
        <ConnectedSpine cells={cells} width={4.1} color="#bc873e" dashed />
        <ConnectedSpine cells={cells} width={0.65} color="#f1cf88" />
      </g>
    );
  }

  if (tileType === 'h-panda') {
    // Toca da Onca (L): tunel metalico/concreto estriado prateado + patios verdes nas pontas
    return (
      <g>
        <rect x={bx} y={by} width={m.w} height={m.h} fill="#4f6c47" />
        {cells.map((c) => {
          const ox = c.x * U;
          const oy = c.y * U;
          return (
            <g key={`hpnd-${c.x}-${c.y}`}>
              <rect x={ox + 0.6} y={oy + 0.6} width={U - 1.2} height={U - 1.2} fill="#3f7f2f" opacity="0.55" />
              <circle cx={ox + 1.8} cy={oy + 8.0} r="1.4" fill="#2c6320" />
              <circle cx={ox + 8.2} cy={oy + 2.0} r="1.3" fill="#59a23f" />
            </g>
          );
        })}
        <ConnectedSpine cells={cells} width={6.8} color="#9aa1a8" stroke="#2a2f36" strokeWidth={0.5} />
        <ConnectedSpine cells={cells} width={5.4} color="#c7cdd3" dashed />
        <ConnectedSpine cells={cells} width={2.2} color="#e5eaef" />
      </g>
    );
  }

  // --- 12 CERCADOS UNICOS ---
  const isCerrado = tileType === 'e-koala' || tileType === 'e-panda' || tileType === 'e-preguica';
  const isBamboo = tileType === 'e-boto' || tileType === 'e-tucano';
  const isRiverEnc = tileType === 'e-tamandua' || tileType === 'e-lobo' || tileType === 'e-jabuti';

  if (isCerrado) {
    return (
      <g>
        <rect x={bx} y={by} width={m.w} height={m.h} fill="#f2c938" />
        {cells.map((c, idx) => {
          const ox = c.x * U;
          const oy = c.y * U;
          return (
            <g key={`ec-${c.x}-${c.y}`}>
              <rect x={ox} y={oy} width={U} height={U} fill={idx % 2 ? '#e8b622' : '#f7d54e'} opacity="0.5" />
              {/* platô/pedra dourada + moita de cerrado */}
              {idx % 2 === 0 ? (
                <polygon points={`${ox + 1.5},${oy + 7.5} ${ox + 5.2},${oy + 2.4} ${ox + 8.5},${oy + 6.8}`} fill="#d79628" stroke="#80500c" strokeWidth="0.38" />
              ) : (
                <ellipse cx={ox + 5.2} cy={oy + 5.2} rx="2.7" ry="1.8" fill="#d9a126" stroke="#80500c" strokeWidth="0.35" />
              )}
              <circle cx={ox + 8.0} cy={oy + 2.2} r="1.15" fill="#78a63c" stroke="#3c5c19" strokeWidth="0.28" />
            </g>
          );
        })}
      </g>
    );
  }

  if (isBamboo) {
    return (
      <g>
        <rect x={bx} y={by} width={m.w} height={m.h} fill="#c0cbc0" />
        {cells.map((c, idx) => {
          const ox = c.x * U;
          const oy = c.y * U;
          return (
            <g key={`eb-${c.x}-${c.y}`}>
              <rect x={ox} y={oy} width={U} height={U} fill={idx % 2 ? '#aebca9' : '#ccd6c7'} opacity="0.55" />
              <ellipse cx={ox + 3.2} cy={oy + 7.2} rx="2.1" ry="1.3" fill="#889886" opacity="0.5" />
              <circle cx={ox + 7.2} cy={oy + 3.0} r="1.75" fill="#3a8631" stroke="#1b4817" strokeWidth="0.35" />
              <circle cx={ox + 2.5} cy={oy + 2.7} r="1.3" fill="#59a846" stroke="#1b4817" strokeWidth="0.3" />
            </g>
          );
        })}
      </g>
    );
  }

  if (isRiverEnc) {
    return (
      <g>
        <GrassTufts cells={cells} />
        <ConnectedSpine cells={cells} width={6.0} color="#2f9dc4" stroke="#1d5f78" strokeWidth={0.42} />
        <ConnectedSpine cells={cells} width={2.8} color="#7be0f5" dashed />
        {cells.map((c, idx) => (
          <circle
            key={`er-${c.x}-${c.y}`}
            cx={c.x * U + (idx % 2 ? 1.8 : 8.2)}
            cy={c.y * U + (idx % 2 ? 8.1 : 1.9)}
            r="1.3"
            fill="#2d7224"
            stroke="#163c12"
            strokeWidth="0.3"
          />
        ))}
      </g>
    );
  }

  // Mata Atlantica / Floresta densa (default para outros cercados)
  if (tileType?.startsWith('e-') || fallbackKind === 'enclosure') {
    return (
      <g>
        <GrassTufts cells={cells} dark />
        {cells.map((c) => {
          const ox = c.x * U;
          const oy = c.y * U;
          return (
            <g key={`ef-${c.x}-${c.y}`}>
              <circle cx={ox + 2.5} cy={oy + 2.8} r="2.2" fill="#21611e" stroke="#10380e" strokeWidth="0.3" />
              <circle cx={ox + 7.6} cy={oy + 7.3} r="2.1" fill="#266e22" stroke="#10380e" strokeWidth="0.3" />
              <circle cx={ox + 7.3} cy={oy + 2.5} r="1.65" fill="#469e38" />
              <circle cx={ox + 2.9} cy={oy + 7.5} r="1.45" fill="#52ad40" />
            </g>
          );
        })}
      </g>
    );
  }

  return <GrassTufts cells={cells} />;
};

/** Peca completa na skin Classica de Barenpark (com recorte exato do polimino, verso 3D e arte top-down). */
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
            {/* sutil moldura interna de azulejo de papelao Barenpark */}
            <path d={edges.outer} stroke={cols.rim} strokeOpacity="0.45" strokeWidth="1.05" fill="none" />
          </g>
          <path d={edges.light} stroke="#ffffff" strokeOpacity={showContour ? 0.56 : 0.48} strokeWidth={showContour ? 0.52 : 0.48} strokeLinecap="round" fill="none" />
          <path d={edges.dark} stroke="#000000" strokeOpacity={showContour ? 0.42 : 0.32} strokeWidth={showContour ? 0.55 : 0.48} strokeLinecap="round" fill="none" />
          {showContour && <path d={edges.outer} stroke="#1a1610" strokeOpacity="0.88" strokeWidth="0.65" strokeLinecap="square" fill="none" />}
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
  // Losango branco para Viveiros (Animal Houses)
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
    {/* orelhas e topo dourado da estatua de urso */}
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
    {/* Dois ursinhos dourados ladeando o titulo */}
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
