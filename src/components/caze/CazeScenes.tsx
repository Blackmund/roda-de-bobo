import React from 'react';
import rawPieces from './cazePieces.json';

/**
 * Cenas animadas do lobby no estilo cartoon CazéTV (Roda de Bobo).
 *
 * Regras do padrão:
 * - Todo boneco é desenhado de corpo inteiro (cabeça + camiseta traçada + pernas/tênis vetoriais) e tem a
 *   MESMA altura (a camiseta sempre termina em HEM_Y e os pés sempre pisam em GROUND).
 * - Os bonecos nunca desmontam: no hover o corpo anima como um bloco só (pulo, tremor, balanço) e a "graça"
 *   fica nos objetos e efeitos (ponteiro, sirene, moeda, cartas, estrelas, confete...).
 * - Duas composições por jogo: 'compact' (cards quase quadrados, viewBox 1100x1000) e 'wide' (cards
 *   horizontais, viewBox 2000x1000). A troca é feita por container query em index.css (.rdb-art-box).
 * - Objetos podem flutuar em idle (.fl); o hover (.group:hover) liga as animações fortes.
 */

type Paths = { cream?: string; teal?: string; crimson?: string };
type Face = { w: number; h: number; cx: number; cy: number; top: number };
type Piece = { w: number; h: number; ox: number; oy: number; face?: Face; paths: Paths };
type PieceMap = Record<string, Piece>;

export type SceneLayout = 'compact' | 'wide' | 'icon';

const NAVY = '#0c1020';
const PANTS = '#1c2350';
const CREAM = '#F5F2EB';
const CRIMSON = '#E6194B';
const TEAL = '#17B8B8';
const ANTON = "Anton, Impact, 'Arial Narrow', sans-serif";

const H = 1000; // altura comum de todas as cenas
const HEM_Y = 725; // onde termina a camiseta de todo boneco
const GROUND = 930; // onde os pés pisam
const SCENE_W: Record<'compact' | 'wide', number> = { compact: 1100, wide: 2000 };

const PIECES: PieceMap = rawPieces as unknown as PieceMap;

/** Escala de cada boneco (a arte original tem proporções diferentes; aqui eles são equalizados). */
const CHAR_SCALE: Record<string, number> = {
  limite_char: 0.81,
  blefe_char: 0.81,
  cetico_char: 0.83,
  proibido_char: 1.0,
  nota_char: 0.9,
  pv_char: 0.94,
  tem_char: 0.81
};
/** Centro e largura da barra da camiseta (em coordenadas da peça) para encaixar as pernas. */
const HEM: Record<string, { cx: number; w: number }> = {
  limite_char: { cx: 208, w: 262 },
  blefe_char: { cx: 232, w: 225 },
  cetico_char: { cx: 194, w: 262 },
  proibido_char: { cx: 331, w: 262 },
  nota_char: { cx: 338, w: 235 },
  pv_char: { cx: 346, w: 245 },
  tem_char: { cx: 360, w: 252 }
};

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

/** Posiciona (translate/rotate/scale) num <g> externo e anima num <g> interno (a animação CSS não sobrescreve o posicionamento). */
const At: React.FC<{
  x?: number;
  y?: number;
  s?: number;
  r?: number;
  className?: string;
  delay?: number;
  dur?: number;
  children: React.ReactNode;
}> = ({ x = 0, y = 0, s = 1, r = 0, className, delay, dur, children }) => {
  const style: React.CSSProperties = {};
  if (delay !== undefined) style.animationDelay = `${delay}s`;
  if (dur !== undefined) style.animationDuration = `${dur}s`;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})${r ? ` rotate(${r})` : ''}${s !== 1 ? ` scale(${s.toFixed(4)})` : ''}`}>
      <g className={className} style={style}>
        {children}
      </g>
    </g>
  );
};

/** Flutuação leve em idle (sempre ligada) + camada interna para as animações de hover. */
const Float: React.FC<{
  x: number;
  y: number;
  s?: number;
  r?: number;
  idle?: number;
  hover?: string;
  hdelay?: number;
  fx?: boolean;
  children: React.ReactNode;
}> = ({ x, y, s = 1, r = 0, idle = 0, hover = '', hdelay, fx = false, children }) => (
  <At x={x} y={y} s={s} r={r}>
    <g className={`ax fl fl${idle % 4}`} style={{ animationDelay: `${-(idle * 0.9)}s` }}>
      <g className={`ax ${fx ? 'fx' : ''} ${hover}`} style={hdelay !== undefined ? { animationDelay: `${hdelay}s` } : undefined}>
        {children}
      </g>
    </g>
  </At>
);

interface CharPos {
  key: string;
  p: Piece;
  s: number;
  tx: number;
  ty: number;
  faceCx: number;
  faceTop: number;
  faceCy: number;
  faceW: number;
  hemX: number;
  hemW: number;
  left: number;
  right: number;
}

/** Posiciona o boneco: cabeça centrada em faceCx, camiseta terminando em HEM_Y. */
function placeChar(key: string, faceCx: number): CharPos {
  const p = PIECES[key];
  const f = p.face!;
  const s = CHAR_SCALE[key];
  const ty = HEM_Y - p.h * s;
  const tx = faceCx - f.cx * s;
  const h = HEM[key];
  return {
    key,
    p,
    s,
    tx,
    ty,
    faceCx,
    faceTop: ty + f.top * s,
    faceCy: ty + f.cy * s,
    faceW: f.w * s,
    hemX: tx + h.cx * s,
    hemW: h.w * s,
    left: tx,
    right: tx + p.w * s
  };
}

/** Posição no viewBox de uma peça que foi recortada da mesma arte do personagem (mantém a relação original). */
function relTo(c: CharPos, q: Piece, dx = 0, dy = 0) {
  return { x: c.tx + (q.ox - c.p.ox) * c.s + dx, y: c.ty + (q.oy - c.p.oy) * c.s + dy, s: c.s };
}

// ---------------------------------------------------------------------------
// Olhos / sobrancelhas cartunescos (padrão do jogo do Proibido) para Limite e Duvido
// ---------------------------------------------------------------------------
const Patch: React.FC<{ cx: number; cy: number; rx: number; ry: number }> = ({ cx, cy, rx, ry }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={CREAM} stroke={CREAM} strokeWidth={2} />
);
const Eye: React.FC<{ x: number; y: number; rx?: number; ry?: number; lx?: number; ly?: number }> = ({
  x,
  y,
  rx = 21,
  ry = 40,
  lx = 0,
  ly = 0
}) => (
  <g transform={`translate(${x + lx} ${y + ly})`}>
    <ellipse rx={rx} ry={ry} fill={NAVY} />
    <path d={`M${rx * 0.15} ${-ry * 0.55} l${rx * 0.55} ${-ry * 0.12} l${-rx * 0.1} ${ry * 0.3}Z`} fill={CREAM} />
  </g>
);
const Brow: React.FC<{ d: string; w?: number }> = ({ d, w = 17 }) => (
  <path d={d} fill="none" stroke={NAVY} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);
const Nose: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <path d={`M${x} ${y - 22} C${x - 4} ${y + 6} ${x - 24} ${y + 8} ${x - 14} ${y + 24} C${x - 8} ${y + 32} ${x + 8} ${y + 30} ${x + 14} ${y + 22}`} fill="none" stroke={NAVY} strokeWidth={9} strokeLinecap="round" />
);

/** Retoca o rosto traçado (olhos/sobrancelhas/nariz) para o olho cartunesco padrão. Coordenadas da peça. */
const FaceFix: React.FC<{ k: string }> = ({ k }) => {
  if (k === 'limite_char') {
    return (
      <>
        <Patch cx={236} cy={322} rx={42} ry={62} />
        <Patch cx={366} cy={312} rx={44} ry={62} />
        <Patch cx={238} cy={238} rx={64} ry={26} />
        <Patch cx={152} cy={282} rx={30} ry={42} />
        <Patch cx={312} cy={342} rx={30} ry={34} />
        {/* nervoso: olhos grandes olhando pro medidor, sobrancelhas de preocupação */}
        <Eye x={236} y={322} lx={10} ly={-2} />
        <Eye x={366} y={312} lx={10} ly={-2} />
        <Brow d="M186 272 Q226 252 268 232" />
        <Brow d="M330 232 Q372 250 408 272" />
        <Nose x={314} y={345} />
      </>
    );
  }
  if (k === 'blefe_char') {
    return (
      <>
        <Patch cx={216} cy={314} rx={56} ry={46} />
        <Patch cx={360} cy={314} rx={56} ry={46} />
        <Patch cx={214} cy={256} rx={66} ry={26} />
        <Patch cx={362} cy={234} rx={58} ry={30} />
        <Patch cx={314} cy={348} rx={26} ry={30} />
        {/* esperto: olhos meio fechados, uma sobrancelha arqueada */}
        <g>
          <Eye x={216} y={316} rx={21} ry={34} lx={-8} />
          <Eye x={360} y={316} rx={21} ry={34} lx={-8} />
          <path d="M184 276 H252 V303 H184Z" fill={CREAM} />
          <path d="M330 276 H398 V303 H330Z" fill={CREAM} />
          <path d="M188 303 H248" stroke={NAVY} strokeWidth={11} strokeLinecap="round" />
          <path d="M332 303 H392" stroke={NAVY} strokeWidth={11} strokeLinecap="round" />
        </g>
        <Brow d="M168 262 Q214 252 262 266" />
        <Brow d="M322 226 Q366 190 410 220" />
        <Nose x={316} y={350} />
      </>
    );
  }
  if (k === 'cetico_char') {
    return (
      <>
        <Patch cx={178} cy={292} rx={66} ry={52} />
        <Patch cx={338} cy={288} rx={66} ry={52} />
        <Patch cx={208} cy={226} rx={72} ry={28} />
        <Patch cx={356} cy={208} rx={58} ry={28} />
        <Patch cx={278} cy={236} rx={22} ry={28} />
        <Patch cx={300} cy={338} rx={28} ry={30} />
        {/* desconfiado: óculos redondos, olhar de lado e sobrancelha levantada */}
        <circle cx={178} cy={292} r={56} fill="#fff" stroke={NAVY} strokeWidth={11} />
        <circle cx={338} cy={288} r={56} fill="#fff" stroke={NAVY} strokeWidth={11} />
        <path d="M234 288 Q258 270 282 286" fill="none" stroke={NAVY} strokeWidth={10} strokeLinecap="round" />
        <path d="M122 280 L96 268" stroke={NAVY} strokeWidth={10} strokeLinecap="round" />
        <Eye x={178} y={296} rx={15} ry={27} lx={14} ly={-4} />
        <Eye x={338} y={292} rx={15} ry={27} lx={14} ly={-4} />
        <path d="M130 262 Q178 238 226 262" fill={CREAM} stroke={NAVY} strokeWidth={0} />
        <path d="M136 262 H222" stroke={NAVY} strokeWidth={10} strokeLinecap="round" />
        <path d="M296 258 H382" stroke={NAVY} strokeWidth={10} strokeLinecap="round" />
        <Brow d="M138 220 Q180 204 226 226" />
        <Brow d="M312 186 Q356 156 402 182" />
        <Nose x={300} y={340} />
      </>
    );
  }
  if (k === 'nota_char') {
    // tapa o buraco em forma de estrela que sobrou no feixe de luz (a estrela original foi recortada dali)
    return <polygon points="528,458 567,458 598,554 528,554" fill={CREAM} stroke={CREAM} strokeWidth={2} />;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Boneco de corpo inteiro
// ---------------------------------------------------------------------------
const Leg: React.FC<{ x: number; top: number; w: number; dir: 1 | -1 }> = ({ x, top, w, dir }) => {
  const ankle = GROUND - 66;
  const wb = w * 0.9;
  const shoe = `M${dir * -w * 0.42} 0 H${dir * w * 0.42} V${14} C${dir * w * 0.85} 22 ${dir * w * 1.35} 34 ${dir * w * 1.38} 66 H${dir * -w * 0.5}Z`;
  return (
    <g>
      <path d={`M${x - w / 2} ${top} H${x + w / 2} L${x + wb / 2} ${ankle + 6} H${x - wb / 2}Z`} fill={PANTS} />
      <path
        d={`M${x - w / 2} ${top} L${x - wb / 2} ${ankle + 6} H${x + wb / 2} L${x + w / 2} ${top}`}
        fill="none"
        stroke={CREAM}
        strokeWidth={8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <g transform={`translate(${x} ${ankle})`}>
        <path d={shoe} fill={CREAM} stroke={NAVY} strokeWidth={7} strokeLinejoin="round" />
        <path d={`M${dir * -w * 0.5} 52 H${dir * w * 1.36}`} stroke={TEAL} strokeWidth={12} strokeLinecap="round" />
        <path d={`M${dir * w * 0.2} 24 L${dir * w * 0.45} 38`} stroke={NAVY} strokeWidth={6} strokeLinecap="round" />
      </g>
    </g>
  );
};

const Legs: React.FC<{ c: CharPos }> = ({ c }) => {
  const lw = c.hemW * 0.4;
  const gap = c.hemW * 0.05;
  const off = (lw + gap) / 2;
  return (
    <>
      <Leg x={c.hemX - off} top={HEM_Y - 8} w={lw} dir={-1} />
      <Leg x={c.hemX + off} top={HEM_Y - 8} w={lw} dir={1} />
    </>
  );
};

/** Sombra no chão (anima separada do boneco para acompanhar pulos). */
const Shadow: React.FC<{ c: CharPos; className?: string }> = ({ c, className = '' }) => (
  <At x={c.hemX} y={GROUND + 6} className={`ax ${className}`}>
    <ellipse rx={c.hemW * 0.95} ry={20} fill="#000" opacity={0.38} />
  </At>
);

/** Boneco inteiro como um bloco único (pernas + camiseta/cabeça). */
/** Áreas (coordenadas da peça) a ocultar: sobras do recorte original que viram "retângulos" soltos. */
const CHAR_CUT: Record<string, { x: number; y: number; w: number; h: number }[]> = {
  proibido_char: [{ x: 436, y: -4, w: 44, h: 116 }]
};

const Figure: React.FC<{ c: CharPos; className: string; shadowClass?: string; children?: React.ReactNode }> = ({
  c,
  className,
  shadowClass,
  children
}) => {
  const uid = React.useId().replace(/:/g, '');
  const cuts = CHAR_CUT[c.key];
  return (
    <>
      <Shadow c={c} className={shadowClass ?? `${className}-sh`} />
      <At x={c.hemX} y={GROUND} className={`ax ob fig ${className}`}>
        <g className="ax ob breath" style={{ animationDelay: `${-(Math.abs(c.tx) % 5) * 0.6}s` }}>
        <g transform={`translate(${-c.hemX} ${-GROUND})`}>
          <Legs c={c} />
          <At x={c.tx} y={c.ty} s={c.s}>
            {cuts && (
              <clipPath id={`cut${uid}`} clipPathUnits="userSpaceOnUse">
                <path
                  clipRule="evenodd"
                  d={`M-2000 -2000 H4000 V4000 H-2000Z ${cuts.map((r) => `M${r.x} ${r.y} h${r.w} v${r.h} h${-r.w}Z`).join(' ')}`}
                />
              </clipPath>
            )}
            <g clipPath={cuts ? `url(#cut${uid})` : undefined}>
              <Shape p={c.p} />
            </g>
            <FaceFix k={c.key} />
            {children}
          </At>
        </g>
        </g>
      </At>
    </>
  );
};

const Floor: React.FC = () => (
  <g>
    <rect x={-3000} y={GROUND + 28} width={8000} height={1200} fill="#ffffff" opacity={0.045} />
    <rect x={-3000} y={GROUND + 26} width={8000} height={5} fill={CREAM} opacity={0.14} />
  </g>
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
const Check: React.FC<{ size?: number }> = ({ size = 60 }) => (
  <path d={`M${-size} 0 L${-size * 0.3} ${size * 0.7} L${size} ${-size * 0.8}`} fill="none" stroke={CREAM} strokeWidth={size * 0.34} strokeLinecap="round" strokeLinejoin="round" />
);
const Card: React.FC<{ q: string; ch?: string; back?: boolean }> = ({ q, ch = '?', back = false }) => (
  <g>
    <rect x={-80} y={-115} width={160} height={230} rx={18} fill={back ? TEAL : CREAM} stroke={NAVY} strokeWidth={10} />
    <rect x={-62} y={-97} width={124} height={194} rx={10} fill="none" stroke={back ? CREAM : TEAL} strokeWidth={6} />
    <Glyph ch={ch} color={q} size={130} />
  </g>
);
const Confetti: React.FC<{ color: string; kind: number }> = ({ color, kind }) =>
  kind % 3 === 0 ? (
    <rect x={-12} y={-6} width={24} height={12} rx={3} fill={color} stroke={NAVY} strokeWidth={4} />
  ) : kind % 3 === 1 ? (
    <circle r={10} fill={color} stroke={NAVY} strokeWidth={4} />
  ) : (
    <polygon points="0,-13 12,9 -12,9" fill={color} stroke={NAVY} strokeWidth={4} />
  );

/** Confete discreto de fundo (idle) para preencher o espaço sem competir com o boneco. */
const Deco: React.FC<{ pts: [number, number, number][] }> = ({ pts }) => (
  <>
    {pts.map(([x, y, k], i) => (
      <Float key={i} x={x} y={y} r={k * 17} idle={i + k}>
        {k % 3 === 0 ? (
          <path d="M-14 0 H14 M0 -14 V14" stroke={i % 2 ? TEAL : CRIMSON} strokeWidth={8} strokeLinecap="round" />
        ) : k % 3 === 1 ? (
          <circle r={11} fill="none" stroke={i % 2 ? CREAM : TEAL} strokeWidth={6} opacity={0.7} />
        ) : (
          <path d="M-14 8 L0 -10 L14 8" fill="none" stroke={i % 2 ? CRIMSON : CREAM} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        )}
      </Float>
    ))}
  </>
);

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [Math.sin(a) * r, -Math.cos(a) * r] as const;
};

// ---------------------------------------------------------------------------
// Objetos de cena
// ---------------------------------------------------------------------------

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
      <g className="ax lim-cap">
        <rect x={-48} y={-R - 64} width={96} height={80} rx={16} fill={CREAM} stroke={NAVY} strokeWidth={10} />
        <rect x={-76} y={-R - 100} width={152} height={50} rx={18} fill={TEAL} stroke={NAVY} strokeWidth={10} />
      </g>
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

/** Placa de alerta triangular. */
const WarnSign: React.FC = () => (
  <g>
    <path d="M0 -118 L112 70 H-112Z" fill={CRIMSON} stroke={NAVY} strokeWidth={12} strokeLinejoin="round" />
    <path d="M0 -92 L88 52 H-88Z" fill="none" stroke={CREAM} strokeWidth={9} strokeLinejoin="round" />
    <Glyph ch="!" color={CREAM} size={110} />
  </g>
);

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

/** Moeda "cara ou coroa" do blefe. */
const Coin: React.FC = () => (
  <g>
    <circle r={62} fill={CREAM} stroke={NAVY} strokeWidth={10} />
    <circle r={44} fill="none" stroke={TEAL} strokeWidth={7} />
    <text y={4} textAnchor="middle" dominantBaseline="central" fontFamily={ANTON} fontSize={74} fill={CRIMSON}>
      ?
    </text>
  </g>
);

/** Balão de fala censurado do Proibido. */
const BleepBubble: React.FC = () => (
  <g>
    <path
      d="M-110 -70 H110 Q150 -70 150 -30 V30 Q150 70 110 70 H70 L96 130 L10 70 H-110 Q-150 70 -150 30 V-30 Q-150 -70 -110 -70Z"
      fill={CREAM}
      stroke={NAVY}
      strokeWidth={9}
      strokeLinejoin="round"
    />
    <text y={6} textAnchor="middle" dominantBaseline="central" fontFamily={ANTON} fontSize={92} letterSpacing={4} fill={CRIMSON}>
      #@!%
    </text>
  </g>
);

/** Placa de "proibido" (círculo cortado). */
const NoSign: React.FC = () => (
  <g>
    <circle r={104} fill={CREAM} stroke={NAVY} strokeWidth={10} />
    <circle r={84} fill="none" stroke={CRIMSON} strokeWidth={26} />
    <path d="M-60 -60 L60 60" stroke={CRIMSON} strokeWidth={26} strokeLinecap="round" />
    <path d="M-34 -8 L-34 28 M0 -8 L0 28 M34 -8 L34 28" stroke={NAVY} strokeWidth={14} strokeLinecap="round" opacity={0.0} />
  </g>
);

/** Plaquinha de nota (círculo com cabo). */
const Paddle: React.FC<{ n: string; color: string }> = ({ n, color }) => (
  <g>
    <rect x={-9} y={50} width={18} height={110} rx={8} fill={CREAM} stroke={NAVY} strokeWidth={8} />
    <circle r={78} fill={color} stroke={CREAM} strokeWidth={10} />
    <circle r={60} fill="none" stroke={NAVY} strokeWidth={5} opacity={0.5} />
    <Glyph ch={n} color={CREAM} size={n.length > 1 ? 78 : 98} />
  </g>
);

/** Painel de pesquisa do Tem ou Não Tem em cavalete (origem no canto superior esquerdo). */
const SurveyBoard: React.FC<{ rows: number; width: number }> = ({ rows, width }) => {
  const pad = 32;
  const bh = 74;
  const gap = 18;
  const points = [38, 24, 17, 11, 7, 3, 2, 1];
  const total = pad * 2 + rows * (bh + gap) - gap;
  const bars = Array.from({ length: rows }, (_, i) => {
    const y = pad + i * (bh + gap);
    const bw = width - pad * 2;
    const last = i === rows - 1;
    const answer = (
      <>
        <rect x={pad} y={y} width={bw} height={bh} rx={12} fill={TEAL} stroke={CREAM} strokeWidth={7} />
        <rect x={pad + 24} y={y + bh / 2 - 9} width={bw * (0.6 - i * 0.05)} height={18} rx={9} fill={NAVY} />
        <rect x={pad + bw - 104} y={y + 11} width={84} height={bh - 22} rx={8} fill={NAVY} />
        <text x={pad + bw - 62} y={y + bh / 2 + 2} textAnchor="middle" dominantBaseline="central" fontFamily={ANTON} fontSize={40} fill={CREAM}>
          {points[i]}
        </text>
      </>
    );
    if (i === 0) return <g key={i}>{answer}</g>;
    const delay = 0.3 + (i - 1) * 0.5;
    return (
      <g key={i}>
        <g className="ax tem-flip" style={{ animationDelay: `${last ? 99 : delay}s` }}>
          <rect x={pad} y={y} width={bw} height={bh} rx={12} fill={CRIMSON} stroke={CREAM} strokeWidth={7} />
          <text x={pad + bw / 2} y={y + bh / 2 + 2} textAnchor="middle" dominantBaseline="central" fontFamily={ANTON} fontSize={40} fill={CREAM} opacity={0.85}>
            {i + 1}
          </text>
          {!last && (
            <g className="tem-reveal" style={{ animationDelay: `${delay}s` }}>
              {answer}
            </g>
          )}
        </g>
        {last && (
          <At x={pad + bw / 2} y={y + bh / 2} className="ax fx tem-strike" delay={0.3 + (rows - 2) * 0.5 + 0.5}>
            <XMark size={62} />
          </At>
        )}
      </g>
    );
  });
  return (
    <g>
      <rect x={0} y={0} width={width} height={total} rx={26} fill={NAVY} stroke={CREAM} strokeWidth={16} />
      {bars}
    </g>
  );
};
const boardHeight = (rows: number) => 32 * 2 + rows * (74 + 18) - 18;

const EaselLegs: React.FC<{ x: number; top: number; w: number }> = ({ x, top, w }) => (
  <g stroke={CREAM} strokeWidth={14} strokeLinecap="round">
    <path d={`M${x + w * 0.2} ${top} L${x + w * 0.1} ${GROUND + 2}`} />
    <path d={`M${x + w * 0.8} ${top} L${x + w * 0.9} ${GROUND + 2}`} />
  </g>
);

// ---------------------------------------------------------------------------
// Cenas
// ---------------------------------------------------------------------------
type SceneProps = { P: PieceMap; wide: boolean; W: number };

/* Poucos elementos por cena: boneco + 1 objeto principal + 1~2 de apoio. Nada de confete, raios ou X piscando. */
const SceneLimite: React.FC<SceneProps> = ({ wide }) => {
  const c = placeChar('limite_char', wide ? 760 : 330);
  const g = { x: wide ? 1320 : 790, y: 470, s: wide ? 0.86 : 0.7 };
  const fx = c.faceCx;
  const ft = c.faceTop;
  return (
    <>
      <Floor />
      {/* vapor subindo devagar do medidor */}
      {[0, 1].map((i) => (
        <At key={`p${i}`} x={g.x + (i ? 50 : -50) * g.s} y={g.y - 330 * g.s} s={0.9} className="ax fx lim-puff" delay={i * 1.7}>
          <Puff />
        </At>
      ))}
      <Float x={g.x} y={g.y} s={g.s} idle={0} hover="lim-gauge">
        <Gauge />
      </Float>
      <Figure c={c} className="lim-char" />
      {/* uma gota de suor, caindo devagar */}
      <At x={fx - c.faceW * 0.62} y={ft + 20} s={0.78} className="ax fx lim-drop" delay={0.2}>
        <Drop />
      </At>
    </>
  );
};

const SceneDuvido: React.FC<SceneProps> = ({ wide }) => {
  const b = placeChar('blefe_char', wide ? 640 : 290);
  const k = placeChar('cetico_char', wide ? 1380 : 800);
  const mid = (b.faceCx + k.faceCx) / 2;
  return (
    <>
      <Floor />
      <Figure c={b} className="duv-blefe" />
      <Figure c={k} className="duv-cetico" />
      {/* moeda no ar entre os dois */}
      <Float x={mid} y={wide ? 640 : 640} idle={1} hover="duv-coin">
        <Coin />
      </Float>
      <Float x={mid - 10} y={wide ? 230 : 130} s={wide ? 0.95 : 0.66} idle={2} hover="duv-bubble">
        <DoubtBubble />
      </Float>
    </>
  );
};

const SceneProibido: React.FC<SceneProps> = ({ P, wide }) => {
  const c = placeChar('proibido_char', wide ? 1000 : 520);
  const siren = { x: c.faceCx - (wide ? 640 : 400), y: wide ? 250 : 200, s: 0.85 };
  const dome = { x: siren.x + 139 * siren.s, y: siren.y + 125 * siren.s };
  return (
    <>
      <Floor />
      {/* luz suave girando atrás da sirene */}
      <At x={dome.x} y={dome.y} className="fx pro-rays-wrap">
        <g className="pro-rays">
          {Array.from({ length: 6 }, (_, i) => {
            const a = i * 60;
            const [x1, y1] = polar(a - 11, 330);
            const [x2, y2] = polar(a + 11, 330);
            return <polygon key={i} points={`0,0 ${x1},${y1} ${x2},${y2}`} fill={CRIMSON} opacity={0.22} />;
          })}
        </g>
      </At>
      <Figure c={c} className="pro-char" />
      <At x={siren.x} y={siren.y} s={siren.s}>
        <g className="ax ob pro-siren">
          <Shape p={P.proibido_siren} />
        </g>
      </At>
      <Float x={c.faceCx + (wide ? 460 : 400)} y={wide ? 250 : 190} s={wide ? 1 : 0.8} idle={1} hover="pro-bleep">
        <BleepBubble />
      </Float>
    </>
  );
};

const SceneNota: React.FC<SceneProps> = ({ P, wide }) => {
  const c = placeChar('nota_char', wide ? 1000 : 500);
  const spread = wide ? 1.9 : 1.2;
  return (
    <>
      <Floor />
      <At x={c.tx} y={c.ty} s={c.s}>
        <path d={`M2 ${c.p.h - 6} L${c.p.w - 2} ${c.p.h - 6} L${c.p.w + 110} ${(GROUND + 40 - c.ty) / c.s} L-110 ${(GROUND + 40 - c.ty) / c.s}Z`} fill={CREAM} />
      </At>
      <Figure c={c} className="nota-char" />
      {[0, 1, 2, 3, 4].map((i) => {
        const st = P[`nota_star${i}`];
        const base = relTo(c, st);
        const cx = base.x + (st.w * c.s) / 2;
        const nx = c.faceCx + (cx - c.faceCx) * spread - (st.w * c.s) / 2;
        const ny = base.y + (wide ? -10 : -20);
        return (
          <Float key={i} x={nx} y={ny} s={c.s * 1.15} idle={i} hover="nota-star" hdelay={i * 0.35}>
            <Shape p={st} />
          </Float>
        );
      })}
      {(wide
        ? [[c.faceCx - 640, 580, '9', TEAL, 0], [c.faceCx + 640, 540, '10', CRIMSON, 0.6]]
        : [[110, 640, '9', TEAL, 0], [980, 640, '10', CRIMSON, 0.6]]
      ).map(([x, y, n, col, d], i) => (
        <Float key={`p${i}`} x={x as number} y={y as number} s={wide ? 0.85 : 0.72} idle={i + 1} hover="nota-paddle" hdelay={d as number}>
          <Paddle n={n as string} color={col as string} />
        </Float>
      ))}
    </>
  );
};

const SceneTem: React.FC<SceneProps> = ({ wide }) => {
  const rows = 7;
  const bw = wide ? 540 : 400;
  const bx = wide ? 330 : 60;
  const by = 120;
  const bh = boardHeight(rows);
  const c = placeChar('tem_char', wide ? 1290 : 810);
  return (
    <>
      <Floor />
      <EaselLegs x={bx} top={by + bh} w={bw} />
      <At x={bx} y={by}>
        <SurveyBoard rows={rows} width={bw} />
      </At>
      <Figure c={c} className="tem-char" />
      <Float x={wide ? c.faceCx + 420 : bx + bw / 2} y={wide ? 250 : 58} s={wide ? 1 : 0.62} idle={1} hover="tem-tag" hdelay={0.4}>
        <g>
          <rect x={-130} y={-56} width={260} height={112} rx={24} fill={TEAL} stroke={NAVY} strokeWidth={10} />
          <text y={4} textAnchor="middle" dominantBaseline="central" fontFamily={ANTON} fontSize={74} fill={CREAM} stroke={NAVY} strokeWidth={5} paintOrder="stroke">
            TEM!
          </text>
        </g>
      </Float>
    </>
  );
};

const ScenePerguntas: React.FC<SceneProps> = ({ P, wide }) => {
  const c = placeChar('pv_char', wide ? 1000 : 540);
  const cards = { x: c.tx + (150 - c.p.ox) * c.s, y: c.ty + (430 - c.p.oy) * c.s };
  return (
    <>
      <Floor />
      {(wide
        ? [[c.faceCx - 600, 560, -10, TEAL, 0], [c.faceCx + 620, 540, 8, CRIMSON, 1.6]]
        : [[920, 560, 8, CRIMSON, 1.6], [120, 330, -8, TEAL, 0]]
      ).map(([x, y, r, col, d], i) => (
        <Float key={`c${i}`} x={x as number} y={y as number} r={r as number} s={wide ? 1 : 0.9} idle={i + 1}>
          <g className="ax pv-a" style={{ animationDelay: `${d}s` }}>
            <Card q={col as string} />
          </g>
          <g className="ax pv-b" style={{ animationDelay: `${d}s` }}>
            <Card q={CREAM} ch="!" back />
          </g>
        </Float>
      ))}
      <Figure c={c} className="pv-char">
        {[0, 1, 2, 3].map((i) => {
          const bell = P[`pv_bell${i}`];
          return (
            <At key={i} x={bell.ox - c.p.ox} y={bell.oy - c.p.oy} className="ax ot pv-bell" delay={i * 0.25}>
              <Shape p={bell} />
            </At>
          );
        })}
      </Figure>
      <At x={cards.x} y={cards.y - 70} className="ax fx pv-q">
        <Glyph ch="?" color={TEAL} size={110} />
      </At>
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

/**
 * Ícones da família Kazé (CazéTV e Original): um único objeto por jogo, sem rosto, com a mesma paleta
 * (creme / teal / carmim), contorno navy e tipografia Anton das ilustrações.
 */
const ICONS: Record<string, { box: string; el: React.ReactNode }> = {
  limite: {
    box: '-340 -410 680 720',
    el: (
      <g className="ax ic-pulse">
        <Gauge />
      </g>
    )
  },
  duvido: {
    box: '-175 -150 350 350',
    el: (
      <g className="ax ic-sway">
        <DoubtBubble />
      </g>
    )
  },
  proibido: {
    box: '-130 -130 260 260',
    el: (
      <g className="ax ic-pulse">
        <NoSign />
      </g>
    )
  },
  nota: {
    box: '-110 -125 240 300',
    el: (
      <>
        <g className="ax ic-sway">
          <Paddle n="10" color={TEAL} />
        </g>
        <At x={66} y={-72} className="ax ic-star">
          <Star color={CRIMSON} r={54} />
        </At>
      </>
    )
  },
  'tem-ou-nao-tem': {
    box: '-12 -12 384 438',
    el: <SurveyBoard rows={4} width={360} />
  },
  'perguntas-e-verdades': {
    box: '-175 -145 350 290',
    el: (
      <>
        <At x={55} y={12} r={12}>
          <Card q={CREAM} ch="!" back />
        </At>
        <At x={-45} y={0} r={-10} className="ax ic-sway">
          <Card q={CRIMSON} />
        </At>
      </>
    )
  }
};

export const CAZE_SCENE_IDS = Object.keys(SCENES);

export const CazeScene: React.FC<{ gameId: string; layout: SceneLayout; className?: string }> = ({
  gameId,
  layout,
  className = ''
}) => {
  const Scene = SCENES[gameId];
  if (!Scene) return null;
  if (layout === 'icon') {
    const icon = ICONS[gameId];
    return (
      <svg viewBox={icon.box} preserveAspectRatio="xMidYMid meet" className={`rdb-caze-svg ${className}`} aria-hidden="true" focusable="false">
        {icon.el}
      </svg>
    );
  }
  const W = SCENE_W[layout];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
      className={`rdb-caze-svg ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <Scene P={PIECES} wide={layout === 'wide'} W={W} />
    </svg>
  );
};
