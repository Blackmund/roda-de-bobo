import React from 'react';
import rawPieces from './cazePieces.json';

/**
 * Cenas animadas do lobby no estilo cartoon CazéTV (Roda de Bobo).
 *
 * - Personagens e objetos são peças vetoriais independentes (cazePieces.json, carregado sob demanda).
 * - Todos os bonecos são normalizados pelo tamanho do rosto, então aparecem com a mesma escala em todos os cards.
 * - Cada personagem anima como um bloco único (nada de braço/dedo se soltando); a "graça" fica nos objetos
 *   e nos efeitos (suor, faíscas, guizos, barras virando...), que aparecem no hover do card (.group:hover).
 * - Duas composições: 'compact' (cards mais quadrados) e 'wide' (cards horizontais). A troca é feita por
 *   container query em index.css (.rdb-art-box).
 */

type Paths = { cream?: string; teal?: string; crimson?: string };
type Face = { w: number; h: number; cx: number; cy: number; top: number };
type Piece = { w: number; h: number; ox: number; oy: number; face?: Face; paths: Paths };
type PieceMap = Record<string, Piece>;

export type SceneLayout = 'compact' | 'wide' | 'icon';

const NAVY = '#0c1020';
const CREAM = '#F5F2EB';
const CRIMSON = '#E6194B';
const TEAL = '#17B8B8';
const ANTON = "Anton, Impact, 'Arial Narrow', sans-serif";

const H = 1000; // altura comum de todas as cenas
const FACE_W = 330; // largura padrão do rosto (unidades do viewBox)
const FACE_H = 285; // altura padrão do rosto
const FACE_TOP = 455; // linha do topo do rosto (alinha todos os bonecos)
const BLEED = 16; // corpo "sangra" na borda inferior

const SCENE_W: Record<'compact' | 'wide', number> = { compact: 1700, wide: 2600 };

const PIECES: PieceMap = rawPieces as unknown as PieceMap;

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------
const Shape: React.FC<{ p: Piece }> = ({ p }) => (
  <>
    {p.paths.cream && <path d={p.paths.cream} fill={CREAM} stroke={CREAM} strokeWidth={0.6} fillRule="evenodd" />}
    {p.paths.teal && <path d={p.paths.teal} fill={TEAL} stroke={TEAL} strokeWidth={0.6} fillRule="evenodd" />}
    {p.paths.crimson && <path d={p.paths.crimson} fill={CRIMSON} stroke={CRIMSON} strokeWidth={0.6} fillRule="evenodd" />}
  </>
);

/** Posiciona (translate/scale) e anima num <g> interno, para a animação CSS não sobrescrever o posicionamento. */
const At: React.FC<{
  x: number;
  y: number;
  s?: number;
  r?: number;
  className?: string;
  delay?: number;
  /** Vida em idle: camada interna que flutua de leve o tempo todo (o hover anima a camada externa). */
  idle?: number;
  children: React.ReactNode;
}> = ({ x, y, s = 1, r = 0, className, delay, idle, children }) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})${r ? ` rotate(${r})` : ''}${s !== 1 ? ` scale(${s.toFixed(4)})` : ''}`}>
    <g className={className} style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}>
      {idle !== undefined ? (
        <g className={`ax idle idle${idle % 3}`} style={{ animationDelay: `${-(idle * 1.7)}s` }}>
          {children}
        </g>
      ) : (
        children
      )}
    </g>
  </g>
);

interface CharPos {
  p: Piece;
  s: number;
  tx: number;
  ty: number;
  faceCx: number;
  faceTop: number;
  faceCy: number;
  faceW: number;
  left: number;
  right: number;
}

/** Normaliza o boneco pelo rosto e alinha o topo do rosto em FACE_TOP, garantindo que o corpo chegue à borda. */
function placeChar(p: Piece, faceCx: number): CharPos {
  const f = p.face ?? { w: p.w * 0.6, h: p.h * 0.4, cx: p.w / 2, cy: p.h * 0.4, top: p.h * 0.2 };
  const s = 0.5 * (FACE_W / f.w + FACE_H / f.h);
  let ty = FACE_TOP - f.top * s;
  const bottom = ty + p.h * s;
  if (bottom < H + BLEED) ty += H + BLEED - bottom;
  const tx = faceCx - f.cx * s;
  return {
    p,
    s,
    tx,
    ty,
    faceCx,
    faceTop: ty + f.top * s,
    faceCy: ty + f.cy * s,
    faceW: f.w * s,
    left: tx,
    right: tx + p.w * s
  };
}

/** Posição no viewBox de uma peça que foi recortada da mesma arte do personagem (mantém a relação original). */
function relTo(c: CharPos, q: Piece, dx = 0, dy = 0) {
  return { x: c.tx + (q.ox - c.p.ox) * c.s + dx, y: c.ty + (q.oy - c.p.oy) * c.s + dy, s: c.s };
}

const CharG: React.FC<{ c: CharPos; className: string; children?: React.ReactNode }> = ({ c, className, children }) => (
  <At x={c.tx} y={c.ty} s={c.s} className={`ax ob ${className}`}>
    {/* respiração em idle: o boneco infla de leve com o pé/base fixos */}
    <g className="ax ob breath" style={{ animationDelay: `${-((Math.abs(c.tx) % 7) * 0.7)}s` }}>
      <Shape p={c.p} />
      {children}
    </g>
  </At>
);

const PieceG: React.FC<{ p: Piece; x: number; y: number; s: number; className?: string; delay?: number; idle?: number }> = ({
  p,
  x,
  y,
  s,
  className = '',
  delay,
  idle
}) => (
  <At x={x} y={y} s={s} className={`ax ${className}`} delay={delay} idle={idle}>
    <Shape p={p} />
  </At>
);

// --- efeitos desenhados (mesma paleta / traço navy) ---
const Drop: React.FC = () => (
  <g>
    <path d="M0 -44 C16 -20 32 0 32 16 C32 34 18 46 0 46 C-18 46 -32 34 -32 16 C-32 0 -16 -20 0 -44Z" fill={TEAL} stroke={NAVY} strokeWidth={7} />
    <ellipse cx={-10} cy={14} rx={6} ry={11} fill={CREAM} />
  </g>
);
const Bolt: React.FC<{ color?: string }> = ({ color = CRIMSON }) => (
  <polygon points="-14,-62 24,-62 6,-14 32,-14 -20,62 -4,6 -28,6" fill={color} stroke={NAVY} strokeWidth={7} strokeLinejoin="round" />
);
const Puff: React.FC = () => (
  <g fill={CREAM} stroke={NAVY} strokeWidth={7}>
    <circle cx={-22} cy={6} r={24} />
    <circle cx={20} cy={8} r={22} />
    <circle cx={0} cy={-14} r={28} />
  </g>
);
function starPoints(r1: number, r2: number, n = 5) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}
const Star: React.FC<{ color: string; r?: number }> = ({ color, r = 46 }) => (
  <polygon points={starPoints(r, r * 0.46)} fill={color} stroke={NAVY} strokeWidth={7} strokeLinejoin="round" />
);
const Sparkle: React.FC<{ color?: string; r?: number }> = ({ color = CREAM, r = 34 }) => (
  <path
    d={`M0 ${-r} Q${r * 0.16} ${-r * 0.16} ${r} 0 Q${r * 0.16} ${r * 0.16} 0 ${r} Q${-r * 0.16} ${r * 0.16} ${-r} 0 Q${-r * 0.16} ${-r * 0.16} 0 ${-r}Z`}
    fill={color}
    stroke={NAVY}
    strokeWidth={5}
  />
);
const Glyph: React.FC<{ ch: string; color: string; size?: number }> = ({ ch, color, size = 120 }) => (
  <text
    textAnchor="middle"
    dominantBaseline="central"
    fontFamily={ANTON}
    fontSize={size}
    fill={color}
    stroke={NAVY}
    strokeWidth={size * 0.07}
    paintOrder="stroke"
  >
    {ch}
  </text>
);
const XMark: React.FC<{ size?: number }> = ({ size = 70 }) => (
  <g stroke={CREAM} strokeWidth={8} fill={CRIMSON}>
    <rect x={-size} y={-size * 0.22} width={size * 2} height={size * 0.44} rx={size * 0.14} transform="rotate(45)" />
    <rect x={-size} y={-size * 0.22} width={size * 2} height={size * 0.44} rx={size * 0.14} transform="rotate(-45)" />
  </g>
);
const Card: React.FC<{ q: string }> = ({ q }) => (
  <g>
    <rect x={-80} y={-115} width={160} height={230} rx={18} fill={CREAM} stroke={NAVY} strokeWidth={10} />
    <rect x={-62} y={-97} width={124} height={194} rx={10} fill="none" stroke={TEAL} strokeWidth={6} />
    <Glyph ch="?" color={q} size={130} />
  </g>
);

// ---------------------------------------------------------------------------
// Objetos de cena
// ---------------------------------------------------------------------------
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [Math.sin(a) * r, -Math.cos(a) * r] as const;
};

/** Medidor / manômetro do Jogo do Limite (centro em 0,0, raio 300). */
const Gauge: React.FC = () => {
  const R = 300;
  const [a1x, a1y] = polar(58, 236);
  const [a2x, a2y] = polar(122, 236);
  const [b2x, b2y] = polar(122, 176);
  const [b1x, b1y] = polar(58, 176);
  const danger = `M${a1x} ${a1y} A236 236 0 0 1 ${a2x} ${a2y} L${b2x} ${b2y} A176 176 0 0 0 ${b1x} ${b1y}Z`;
  const ticks = Array.from({ length: 13 }, (_, i) => {
    const a = -120 + i * 20;
    const major = i % 3 === 0;
    const [x1, y1] = polar(a, major ? 192 : 210);
    const [x2, y2] = polar(a, 238);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={NAVY} strokeWidth={major ? 15 : 9} strokeLinecap="round" />;
  });
  return (
    <g>
      {/* coroa / botões de cronômetro */}
      <rect x={-48} y={-R - 64} width={96} height={80} rx={16} fill={CREAM} stroke={NAVY} strokeWidth={10} />
      <rect x={-76} y={-R - 100} width={152} height={50} rx={18} fill={TEAL} stroke={NAVY} strokeWidth={10} />
      <g transform="rotate(42)">
        <rect x={-30} y={-R - 52} width={60} height={60} rx={12} fill={CRIMSON} stroke={NAVY} strokeWidth={10} />
      </g>
      <circle r={R} fill={TEAL} stroke={NAVY} strokeWidth={10} />
      <circle r={R - 40} fill={CREAM} stroke={NAVY} strokeWidth={12} />
      <g className="ax lim-danger">
        <path d={danger} fill={CRIMSON} />
      </g>
      {ticks}
      <text y={118} textAnchor="middle" fontFamily={ANTON} fontSize={58} letterSpacing={4} fill={NAVY}>
        LIMITE
      </text>
      <g className="lim-needle">
        <polygon points="-18,14 0,-222 18,14" fill={NAVY} />
        <polygon points="-6,0 0,-196 6,0" fill={CRIMSON} />
      </g>
      <circle r={38} fill={CRIMSON} stroke={NAVY} strokeWidth={10} />
      <circle r={12} fill={CREAM} />
    </g>
  );
};

/** Balão "?!" do Jogo do Duvido (centro em 0,0). Rabicho para baixo-direita. */
const DoubtBubble: React.FC = () => (
  <g>
    <path
      d="M-100 -125 H100 Q150 -125 150 -75 V45 Q150 95 100 95 H95 L135 175 L35 95 H-100 Q-150 95 -150 45 V-75 Q-150 -125 -100 -125Z"
      fill={CREAM}
      stroke={NAVY}
      strokeWidth={10}
      strokeLinejoin="round"
    />
    <text x={0} y={52} textAnchor="middle" fontFamily={ANTON} fontSize={185} fill={CRIMSON}>
      ?!
    </text>
  </g>
);

/** Painel de pesquisa do Tem ou Não Tem (origem no canto superior esquerdo). Sangra para baixo. */
const SurveyBoard: React.FC<{ rows: number; width: number }> = ({ rows, width }) => {
  const pad = 34;
  const bh = 72;
  const gap = 20;
  const points = [38, 24, 17, 11, 7, 3, 2, 1];
  const bars = Array.from({ length: rows }, (_, i) => {
    const y = pad + i * (bh + gap);
    const bw = width - pad * 2;
    const last = i === rows - 1;
    const answer = (
      <>
        <rect x={pad} y={y} width={bw} height={bh} rx={12} fill={TEAL} stroke={CREAM} strokeWidth={7} />
        <rect x={pad + 26} y={y + bh / 2 - 9} width={bw * (0.62 - i * 0.05)} height={18} rx={9} fill={NAVY} />
        <rect x={pad + bw - 104} y={y + 11} width={84} height={bh - 22} rx={8} fill={NAVY} />
        <text x={pad + bw - 62} y={y + bh / 2 + 2} textAnchor="middle" dominantBaseline="central" fontFamily={ANTON} fontSize={40} fill={CREAM}>
          {points[i]}
        </text>
      </>
    );
    if (i === 0) return <g key={i}>{answer}</g>;
    const delay = 0.25 + (i - 1) * 0.3;
    return (
      <g key={i}>
        <g className="ax tem-flip" style={{ animationDelay: `${last ? 99 : delay}s` }}>
          <rect x={pad} y={y} width={bw} height={bh} rx={12} fill={CRIMSON} stroke={CREAM} strokeWidth={7} />
          <text x={pad + bw / 2} y={y + bh / 2 + 2} textAnchor="middle" dominantBaseline="central" fontFamily={ANTON} fontSize={38} fill={CREAM} opacity={0.85}>
            {i + 1}
          </text>
          {!last && (
            <g className="tem-reveal" style={{ animationDelay: `${delay}s` }}>
              {answer}
            </g>
          )}
        </g>
        {last && (
          <At x={pad + bw / 2} y={y + bh / 2} className="ax fx tem-strike" delay={0.25 + (rows - 2) * 0.3 + 0.45}>
            <XMark size={62} />
          </At>
        )}
      </g>
    );
  });
  return (
    <g>
      <rect x={0} y={0} width={width} height={1200} rx={30} fill={NAVY} stroke={CREAM} strokeWidth={18} />
      {bars}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------
type SceneProps = { P: PieceMap; wide: boolean; W: number };

const SceneLimite: React.FC<SceneProps> = ({ P, wide }) => {
  const c = placeChar(P.limite_char, wide ? 1010 : 620);
  const g = { x: wide ? 1700 : 1190, y: 560, s: wide ? 1.02 : 0.94 };
  const fx = c.faceCx;
  const ft = c.faceTop;
  return (
    <>
      {/* fumaça saindo do medidor */}
      {[0, 1, 2].map((i) => (
        <At key={`p${i}`} x={g.x + (i - 1) * 60} y={g.y - 400 * g.s} s={0.9} className="ax fx lim-puff" delay={i * 0.7}>
          <Puff />
        </At>
      ))}
      <At x={g.x} y={g.y} s={g.s} className="ax lim-gauge" idle={0}>
        <Gauge />
      </At>
      {/* faíscas de "vai estourar" */}
      {[
        [g.x + 300 * g.s, g.y - 250 * g.s, 20],
        [g.x + 360 * g.s, g.y - 40 * g.s, -15],
        [g.x + 150 * g.s, g.y - 370 * g.s, 35],
        ...(wide ? [[g.x + 330 * g.s, g.y + 170 * g.s, -30]] : [])
      ].map(([x, y, r], i) => (
        <At key={`b${i}`} x={x} y={y} r={r} s={0.8} className="ax fx lim-bolt" delay={1.1 + i * 0.35}>
          <Bolt />
        </At>
      ))}
      <CharG c={c} className="lim-char" />
      {/* suor espirrando */}
      {[
        [fx - c.faceW * 0.62, ft + 40, 'l', 0.5],
        [fx - c.faceW * 0.45, ft - 60, 'l', 1.1],
        [fx + c.faceW * 0.55, ft - 30, 'r', 0.8]
      ].map(([x, y, d, delay], i) => (
        <At key={`d${i}`} x={x as number} y={y as number} s={0.75} className={`ax fx lim-drop-${d}`} delay={delay as number}>
          <Drop />
        </At>
      ))}
    </>
  );
};

const SceneDuvido: React.FC<SceneProps> = ({ P, wide }) => {
  const b = placeChar(P.blefe_char, wide ? 960 : 590);
  const k = placeChar(P.cetico_char, wide ? 1660 : 1130);
  const mid = (b.faceCx + k.faceCx) / 2;
  return (
    <>
      <CharG c={b} className="duv-blefe" />
      <CharG c={k} className="duv-cetico" />
      {/* tensão entre os dois */}
      {[
        [mid - 10, b.faceCy - 40, 10],
        [mid + 30, b.faceCy + 90, -20]
      ].map(([x, y, r], i) => (
        <At key={`t${i}`} x={x} y={y} r={r} s={0.62} className="ax fx duv-bolt" delay={0.9 + i * 0.4}>
          <Bolt />
        </At>
      ))}
      {/* suor do blefador */}
      {[
        [b.faceCx - b.faceW * 0.6, b.faceTop + 30, 0.4],
        [b.faceCx - b.faceW * 0.42, b.faceTop - 70, 1.2]
      ].map(([x, y, d], i) => (
        <At key={`d${i}`} x={x} y={y} s={0.7} className="ax fx lim-drop-l" delay={d}>
          <Drop />
        </At>
      ))}
      {wide &&
        [
          [b.left - 170, 380, TEAL, 0],
          [k.right + 170, 330, CRIMSON, 0.25]
        ].map(([x, y, col, d], i) => (
          <At key={`q${i}`} x={x as number} y={y as number} s={0.9} className="ax duv-float" delay={d as number} idle={i + 1}>
            <Glyph ch="?" color={col as string} size={150} />
          </At>
        ))}
      <At x={mid + 70} y={k.faceTop - 205} s={wide ? 0.95 : 0.88} className="ax duv-bubble" idle={2}>
        <DoubtBubble />
      </At>
    </>
  );
};

const SceneProibido: React.FC<SceneProps> = ({ P, wide }) => {
  const c = placeChar(P.proibido_char, wide ? 1180 : 760);
  const siren = relTo(c, P.proibido_siren, wide ? -150 : -10, wide ? 40 : 10);
  const sign = relTo(c, P.proibido_sign, wide ? 200 : 40, wide ? 30 : 30);
  const dome = { x: siren.x + 145 * siren.s, y: siren.y + 125 * siren.s };
  return (
    <>
      {/* giroflex: raios girando atrás da sirene */}
      <At x={dome.x} y={dome.y} className="fx pro-rays-wrap">
        <g className="pro-rays">
          {Array.from({ length: 8 }, (_, i) => {
            const a = i * 45;
            const [x1, y1] = polar(a - 9, 330);
            const [x2, y2] = polar(a + 9, 330);
            return <polygon key={i} points={`0,0 ${x1},${y1} ${x2},${y2}`} fill={CRIMSON} opacity={0.38} />;
          })}
        </g>
      </At>
      <CharG c={c} className="pro-char" />
      <PieceG p={P.proibido_siren} {...siren} className="ob pro-siren" idle={1} />
      <PieceG p={P.proibido_sign} {...sign} className="pro-sign" idle={2} />
      {wide &&
        [
          [c.left - 120, 700, -12],
          [sign.x + P.proibido_sign.w * sign.s + 120, 640, 14]
        ].map(([x, y, r], i) => (
          <At key={`b${i}`} x={x} y={y} r={r} s={0.8} className="ax fx lim-bolt" delay={0.2 + i * 0.2}>
            <Bolt />
          </At>
        ))}
    </>
  );
};

const SceneNota: React.FC<SceneProps> = ({ P, wide }) => {
  const c = placeChar(P.nota_char, wide ? 1300 : 850);
  const spread = wide ? 1.55 : 1.08;
  const paddle = { x: c.tx + (155 - c.p.ox) * c.s, y: c.ty + (290 - c.p.oy) * c.s };
  return (
    <>
      <CharG c={c} className="nota-char" />
      {[0, 1, 2, 3, 4].map((i) => {
        const st = P[`nota_star${i}`];
        const base = relTo(c, st);
        const cx = base.x + (st.w * c.s) / 2;
        const nx = c.faceCx + (cx - c.faceCx) * spread - (st.w * c.s) / 2;
        return <PieceG key={i} p={st} x={nx} y={base.y + (wide ? 30 : 0)} s={c.s} className="nota-star" delay={i * 0.3} idle={i} />;
      })}
      {wide &&
        [
          [c.faceCx - 900, 560, CRIMSON, 0.2],
          [c.faceCx + 900, 420, TEAL, 0.5]
        ].map(([x, y, col, d], i) => (
          <At key={`xs${i}`} x={x as number} y={y as number} s={1.1} className="ax nota-star" delay={d as number} idle={i + 2}>
            <Star color={col as string} />
          </At>
        ))}
      {/* brilhos em volta da plaquinha da nota */}
      {[
        [paddle.x - 150, paddle.y - 120, 0],
        [paddle.x + 150, paddle.y - 170, 0.25],
        [paddle.x - 120, paddle.y + 130, 0.5]
      ].map(([x, y, d], i) => (
        <At key={`s${i}`} x={x} y={y} className="ax fx nota-spark" delay={d * 2.4}>
          <Sparkle />
        </At>
      ))}
    </>
  );
};

const SceneTem: React.FC<SceneProps> = ({ P, wide }) => {
  const rows = 7;
  const bw = wide ? 470 : 430;
  const bx = wide ? 640 : 330;
  const by = 200;
  const c = placeChar(P.tem_char, bx + bw + (wide ? 420 : 360));
  return (
    <>
      <At x={bx} y={by}>
        <SurveyBoard rows={rows} width={bw} />
      </At>
      <CharG c={c} className="tem-char" />
    </>
  );
};

const ScenePerguntas: React.FC<SceneProps> = ({ P, wide }) => {
  const c = placeChar(P.pv_char, wide ? 1300 : 850);
  const cards = { x: c.tx + (150 - c.p.ox) * c.s, y: c.ty + (430 - c.p.oy) * c.s };
  return (
    <>
      {wide &&
        [
          [c.faceCx - 820, 600, -14, TEAL, 0],
          [c.faceCx + 820, 560, 12, CRIMSON, 0.3]
        ].map(([x, y, r, col, d], i) => (
          <At key={`c${i}`} x={x as number} y={y as number} r={r as number} s={1.05} className="ax pv-card" delay={(d as number) * 2} idle={i}>
            <Card q={col as string} />
          </At>
        ))}
      <CharG c={c} className="pv-char">
        {[0, 1, 2, 3].map((i) => {
          const bell = P[`pv_bell${i}`];
          return (
            <At key={i} x={bell.ox - c.p.ox} y={bell.oy - c.p.oy} className="ax ot pv-bell" delay={i * 0.16}>
              <Shape p={bell} />
            </At>
          );
        })}
      </CharG>
      {/* interrogações subindo das cartas */}
      {[
        [cards.x - 40, cards.y - 60, TEAL, 0],
        [cards.x + 70, cards.y - 120, CRIMSON, 0.9],
        [cards.x - 110, cards.y - 160, CREAM, 1.8]
      ].map(([x, y, col, d], i) => (
        <At key={`q${i}`} x={x as number} y={y as number} className="ax fx pv-q" delay={d as number}>
          <Glyph ch="?" color={col as string} size={110} />
        </At>
      ))}
    </>
  );
};

const SCENES: Record<string, React.FC<SceneProps>> = {
  limite: SceneLimite,
  duvido: SceneDuvido,
  proibido: SceneProibido,
  nota: SceneNota,
  'tem-ou-nao-tem': SceneTem,
  'perguntas-e-verdades': ScenePerguntas
};

/** Recorte do ícone (layout compacto de telas baixas): rosto do personagem principal. */
const ICON_FOCUS: Record<string, number> = {
  limite: 620,
  duvido: 860,
  proibido: 760,
  nota: 850,
  'tem-ou-nao-tem': 1120,
  'perguntas-e-verdades': 850
};

export const CAZE_SCENE_IDS = Object.keys(SCENES);

export const CazeScene: React.FC<{ gameId: string; layout: SceneLayout; className?: string }> = ({
  gameId,
  layout,
  className = ''
}) => {
  const Scene = SCENES[gameId];
  if (!Scene) return null;
  const isIcon = layout === 'icon';
  const W = SCENE_W[isIcon ? 'compact' : layout];
  const fx = ICON_FOCUS[gameId] ?? 850;
  const viewBox = isIcon
    ? gameId === 'duvido'
      ? `${fx - 560} 230 1120 800`
      : `${fx - 400} 230 800 800`
    : `0 0 ${W} ${H}`;
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio={isIcon ? 'xMidYMid meet' : 'xMidYMax meet'}
      className={`rdb-caze-svg ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <Scene P={PIECES} wide={layout === 'wide'} W={W} />
    </svg>
  );
};
