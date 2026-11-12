import React from 'react';
import type { GameId } from '../../types/game';

/**
 * Arte dos cards do catalogo, na identidade do programa (navy, creme, teal e crimson, tudo chapado).
 * Os 14 jogos tem vinhetas em SVG no mesmo estilo: tipografia grossa e objetos, como as cartelas do programa
 * (MEGA RESENHA, Gartic, GeoGuessr). Os bonecos de 07/11, que ilustravam os 6 jogos classicos, estao guardados em
 * `_master/cazetv/` (PNG) e `public/assets/cazetv/` (WebP), e o codigo que os usava esta na tag `cards-bonecos-0711`.
 * O movimento fica em `styles/rdb.css` (classes `rdbv-*`): calmo em repouso, mais vivo com o card em foco.
 */

const CREAM = '#F5F2EB';
const TEAL = '#17B8B8';
const CRIMSON = '#E6194B';
const NAVY = '#0a0b1e';
const HEAVY = "'Inter', 'Arial Black', sans-serif";
const ANTON = "'Anton', 'Impact', sans-serif";

const Svg: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <svg className="rdbv-svg" viewBox="0 0 320 200" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
    {children}
  </svg>
);

const MegaResenha = () => (
  <Svg label="Mega Resenha">
    <g fontFamily={HEAVY} fontWeight={900} fontSize="60" letterSpacing="-1.5">
      <text x="44" y="82" fill={CREAM}>MEGA</text>
      <text x="44" y="170" fill={CREAM}>
        RE<tspan fill={TEAL}>$</tspan>ENHA
      </text>
    </g>
    {[TEAL, TEAL, CRIMSON, CRIMSON, TEAL].map((c, i) => (
      <circle key={i} className="rdbv-dot" style={{ animationDelay: `${i * 0.22}s` }} cx={52 + i * 22} cy="104" r="7" fill={c} />
    ))}
  </Svg>
);

const ComoEuPinto = () => (
  <Svg label="Como eu pinto">
    <rect x="46" y="34" width="228" height="150" rx="10" fill="none" stroke={CRIMSON} strokeWidth="3" />
    <g fontFamily={HEAVY} fontWeight={800} fontSize="10" textAnchor="middle">
      <rect x="92" y="22" width="136" height="24" rx="4" fill={NAVY} stroke={CREAM} strokeWidth="2" />
      <rect x="98" y="27" width="28" height="14" rx="2" fill={CREAM} />
      <text x="112" y="38" fill={NAVY}>DICA</text>
      <text x="160" y="38" fill={CREAM} letterSpacing="3">_ _ _ _ _</text>
      <rect x="192" y="27" width="32" height="14" rx="2" fill="none" stroke={CREAM} strokeWidth="1.5" />
      <text x="208" y="38" fill={CREAM}>PULAR</text>
    </g>
    <g className="rdbv-draw" fill="none" stroke={CRIMSON} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="118" cy="128" r="27" pathLength={1} />
      <circle cx="204" cy="128" r="27" pathLength={1} />
      <path d="M118 128 L148 86 L192 86 L204 128" pathLength={1} />
      <path d="M148 86 L164 128 L118 128 M164 128 L192 86" pathLength={1} />
      <path d="M140 80 H158 M192 86 L187 70 L202 68" pathLength={1} />
    </g>
    <rect x="62" y="168" width="196" height="7" rx="3.5" fill="none" stroke={CREAM} strokeWidth="2" />
    <rect className="rdbv-bar" x="64" y="170" width="192" height="3" rx="1.5" fill={TEAL} />
  </Svg>
);

const Estadios = () => (
  <Svg label="Estádios">
    <g fill="none" stroke={CRIMSON} strokeLinecap="round">
      {[
        [136, 62, 7],
        [122, 54, 6.4],
        [108, 46, 5.8],
        [94, 38, 5.2],
        [80, 30, 4.6]
      ].map(([rx, ry, w], i) => (
        <ellipse key={i} cx="160" cy="122" rx={rx} ry={ry} strokeWidth={w} strokeDasharray={`0.1 ${11 - i}`} />
      ))}
    </g>
    <ellipse cx="160" cy="122" rx="62" ry="21" fill={NAVY} stroke={TEAL} strokeWidth="3" />
    <path d="M160 101 V143" stroke={TEAL} strokeWidth="2.5" />
    <ellipse cx="160" cy="122" rx="11" ry="5" fill="none" stroke={TEAL} strokeWidth="2.5" />
    <ellipse className="rdbv-pin-shadow" cx="160" cy="122" rx="12" ry="4" fill={CREAM} />
    <g className="rdbv-pin">
      <path d="M160 120 C142 96 136 84 136 72 A24 24 0 0 1 184 72 C184 84 178 96 160 120 Z" fill={CREAM} stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="160" cy="72" r="9" fill={CRIMSON} />
    </g>
  </Svg>
);

const QuemSouEu = () => (
  <Svg label="Quem sou eu">
    <path d="M70 200 V150 C70 96 110 70 160 70 C210 70 250 96 250 150 V200 Z" fill={CREAM} stroke={NAVY} strokeWidth="5" />
    <path d="M62 112 H258" stroke={CRIMSON} strokeWidth="12" strokeLinecap="round" />
    <g className="rdbv-card">
      <rect x="112" y="28" width="96" height="84" rx="6" fill={CREAM} stroke={CRIMSON} strokeWidth="6" />
      <text x="160" y="96" textAnchor="middle" fontFamily={ANTON} fontSize="72" fill={CRIMSON}>?</text>
    </g>
    <g>
      <circle cx="124" cy="158" r="19" fill="#fff" stroke={NAVY} strokeWidth="5" />
      <circle cx="196" cy="158" r="19" fill="#fff" stroke={NAVY} strokeWidth="5" />
      <g className="rdbv-eyes" fill={NAVY}>
        <circle cx="124" cy="152" r="8" />
        <circle cx="196" cy="152" r="8" />
      </g>
    </g>
    <path d="M96 128 Q124 116 146 130 M174 130 Q196 116 224 128" fill="none" stroke={NAVY} strokeWidth="6" strokeLinecap="round" />
  </Svg>
);

const OndeEstou = () => (
  <Svg label="Onde estou">
    <path
      className="rdbv-route"
      d="M30 172 C74 172 70 124 112 124 S150 164 186 146 S204 120 214 112"
      fill="none"
      stroke={TEAL}
      strokeWidth="6"
      strokeLinecap="round"
      strokeDasharray="2 16"
    />
    <circle cx="30" cy="172" r="10" fill={NAVY} stroke={CREAM} strokeWidth="5" />
    <circle cx="112" cy="124" r="8" fill={CREAM} />
    <circle cx="186" cy="146" r="8" fill={CREAM} />
    <ellipse className="rdbv-pin-shadow" cx="218" cy="114" rx="16" ry="5" fill={CREAM} />
    <g className="rdbv-pin">
      <path d="M218 112 C192 78 182 62 182 44 A36 36 0 0 1 254 44 C254 62 244 78 218 112 Z" fill={CRIMSON} stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="218" cy="44" r="20" fill={CREAM} />
      <text x="218" y="57" textAnchor="middle" fontFamily={ANTON} fontSize="34" fill={NAVY}>?</text>
    </g>
  </Svg>
);

const Mimica = () => (
  <Svg label="Mímica">
    <path
      d="M52 34 H268 a14 14 0 0 1 14 14 V124 a14 14 0 0 1 -14 14 H150 L112 174 V138 H52 a14 14 0 0 1 -14 -14 V48 a14 14 0 0 1 14 -14 Z"
      fill={CREAM}
      stroke={NAVY}
      strokeWidth="5"
      strokeLinejoin="round"
    />
    <path d="M70 86 H250" stroke={NAVY} strokeWidth="14" strokeLinecap="round" strokeDasharray="1 17" />
    <path className="rdbv-zip-line" d="M70 86 H250" stroke={CRIMSON} strokeWidth="6" strokeLinecap="round" pathLength={1} />
    <g className="rdbv-zip">
      <rect x="58" y="70" width="26" height="32" rx="5" fill={CRIMSON} stroke={NAVY} strokeWidth="4" />
      <rect x="66" y="98" width="10" height="20" rx="4" fill={CRIMSON} stroke={NAVY} strokeWidth="4" />
    </g>
    <g className="rdbv-shh" fill="none" stroke={TEAL} strokeWidth="6" strokeLinecap="round">
      <path d="M230 160 q10 -10 20 0" />
      <path d="M214 178 q26 -26 52 0" />
    </g>
  </Svg>
);

const Board: React.FC<{ x: number; tilt: number }> = ({ x, tilt }) => (
  <g transform={`rotate(${tilt} ${x + 62} 100)`}>
    <rect x={x + 54} y="118" width="16" height="78" fill={CREAM} stroke={NAVY} strokeWidth="4" />
    <rect x={x} y="30" width="124" height="96" rx="6" fill={CREAM} stroke={CRIMSON} strokeWidth="6" />
    <g fontFamily={ANTON} fontSize="52" textAnchor="middle" fill={NAVY}>
      <text className="rdbv-word-a" x={x + 62} y="97">MAR</text>
      <text className="rdbv-word-b" x={x + 62} y="97">SOL</text>
    </g>
  </g>
);

const Repetente = () => (
  <Svg label="Repetente">
    <Board x={22} tilt={-4} />
    <Board x={174} tilt={4} />
    <g className="rdbv-equal" stroke={TEAL} strokeWidth="8" strokeLinecap="round">
      <path d="M148 14 l8 8 l16 -18" fill="none" strokeLinejoin="round" />
    </g>
  </Svg>
);

const Respostas = () => (
  <Svg label="Respostas sem perguntas">
    <rect x="56" y="24" width="208" height="84" rx="6" fill={CREAM} stroke={NAVY} strokeWidth="5" />
    <rect x="56" y="24" width="86" height="22" fill={CRIMSON} />
    <text x="64" y="40" fontFamily={HEAVY} fontWeight={900} fontSize="13" fill={CREAM}>RESPOSTA</text>
    <text x="160" y="96" textAnchor="middle" fontFamily={ANTON} fontSize="52" fill={NAVY}>1958</text>
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i} className="rdbv-tile" style={{ animationDelay: `${i * 0.5}s`, transformOrigin: `${82 + i * 39}px 152px` }}>
        <rect x={64 + i * 39} y="130" width="36" height="44" rx="4" fill={NAVY} stroke={TEAL} strokeWidth="4" />
        <text x={82 + i * 39} y="162" textAnchor="middle" fontFamily={ANTON} fontSize="28" fill={i === 2 ? CRIMSON : TEAL}>
          {i === 2 ? '?' : i + 1}
        </text>
      </g>
    ))}
  </Svg>
);

/* ---- Os 6 jogos classicos, redesenhados como vinhetas (os bonecos de 07/11 ficam guardados em _master/) ---- */

const Limite = () => (
  <Svg label="Jogo do Limite">
    <circle cx="160" cy="112" r="82" fill={CREAM} stroke={NAVY} strokeWidth="5" />
    <circle cx="160" cy="112" r="82" fill="none" stroke={TEAL} strokeWidth="6" strokeDasharray="3 13.1" transform="rotate(-90 160 112)" />
    {/* zona de estouro: passou daqui, perdeu */}
    <path d="M160 112 L160 30 A82 82 0 0 1 231 71 Z" fill={CRIMSON} />
    <path d="M160 30 V112" stroke={NAVY} strokeWidth="5" />
    <text x="196" y="68" textAnchor="middle" fontFamily={ANTON} fontSize="22" fill={CREAM} transform="rotate(30 196 62)">X</text>
    <g className="rdbv-needle" style={{ transformOrigin: '160px 112px' }}>
      <path d="M160 112 L154 104 L160 44 L166 104 Z" fill={NAVY} />
    </g>
    <circle cx="160" cy="112" r="10" fill={NAVY} />
    <circle cx="160" cy="112" r="4" fill={CREAM} />
    <rect x="148" y="12" width="24" height="16" rx="3" fill={TEAL} stroke={NAVY} strokeWidth="4" />
  </Svg>
);

const Duvido = () => (
  <Svg label="Jogo do Duvido">
    <path
      d="M24 40 H150 a12 12 0 0 1 12 12 V112 a12 12 0 0 1 -12 12 H84 L58 150 V124 H24 a12 12 0 0 1 -12 -12 V52 a12 12 0 0 1 12 -12 Z"
      fill={CREAM}
      stroke={NAVY}
      strokeWidth="5"
      strokeLinejoin="round"
    />
    <g fontFamily={ANTON} fontSize="64" textAnchor="middle" fill={NAVY}>
      <text className="rdbv-cyc-a" x="87" y="106">5</text>
      <text className="rdbv-cyc-b" x="87" y="106">6</text>
      <text className="rdbv-cyc-c" x="87" y="106">7!</text>
    </g>
    <g className="rdbv-shake" style={{ transformOrigin: '236px 120px' }}>
      <path
        d="M176 70 H296 a12 12 0 0 1 12 12 V150 a12 12 0 0 1 -12 12 H276 V188 L246 162 H176 a12 12 0 0 1 -12 -12 V82 a12 12 0 0 1 12 -12 Z"
        fill={CRIMSON}
        stroke={NAVY}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <text x="236" y="142" textAnchor="middle" fontFamily={ANTON} fontSize="66" fill={CREAM}>?!</text>
    </g>
  </Svg>
);

const Proibido = () => (
  <Svg label="Jogo do Proibido">
    <rect x="96" y="44" width="178" height="142" rx="8" fill={CREAM} stroke={NAVY} strokeWidth="5" />
    <rect x="96" y="44" width="178" height="38" fill={TEAL} stroke={NAVY} strokeWidth="5" />
    <rect x="116" y="56" width="92" height="14" rx="3" fill={NAVY} />
    {[100, 128, 156].map((y, i) => (
      <g key={y}>
        <rect x="116" y={y} width={i === 1 ? 118 : 96} height="14" rx="3" fill={NAVY} opacity="0.85" />
        <path className="rdbv-strike" style={{ animationDelay: `${i * 0.5}s` }} d={`M108 ${y + 7} H${i === 1 ? 242 : 220}`} stroke={CRIMSON} strokeWidth="6" strokeLinecap="round" pathLength={1} />
      </g>
    ))}
    {/* sirene */}
    <g>
      <g className="rdbv-flash" stroke={CRIMSON} strokeWidth="6" strokeLinecap="round">
        <path d="M58 28 V10 M26 44 L12 32 M90 44 L104 32" />
      </g>
      <path d="M30 96 V72 a28 28 0 0 1 56 0 V96 Z" fill={CRIMSON} stroke={NAVY} strokeWidth="5" strokeLinejoin="round" />
      <rect x="20" y="94" width="76" height="18" rx="4" fill={CREAM} stroke={NAVY} strokeWidth="5" />
      <path d="M46 78 a12 12 0 0 1 12 -12" fill="none" stroke={CREAM} strokeWidth="5" strokeLinecap="round" />
    </g>
  </Svg>
);

const Nota = () => (
  <Svg label="Jogo da Nota">
    <g className="rdbv-card" style={{ transformOrigin: '160px 190px' }}>
      <rect x="150" y="128" width="20" height="72" rx="6" fill={CREAM} stroke={NAVY} strokeWidth="5" />
      <circle cx="160" cy="84" r="66" fill={CREAM} stroke={NAVY} strokeWidth="5" />
      <circle cx="160" cy="84" r="52" fill="none" stroke={CRIMSON} strokeWidth="7" />
      <g fontFamily={ANTON} fontSize="76" textAnchor="middle" fill={NAVY}>
        <text className="rdbv-cyc-a" x="160" y="112">8</text>
        <text className="rdbv-cyc-b" x="160" y="112">3</text>
        <text className="rdbv-cyc-c" x="160" y="112">10</text>
      </g>
    </g>
    {[
      [48, 52, TEAL, 0],
      [70, 150, CRIMSON, 0.7],
      [268, 138, TEAL, 1.4],
      [250, 60, CRIMSON, 2.1]
    ].map(([x, y, c, d], i) => (
      <g key={i} transform={`translate(${x} ${y})`}>
        <path
          className="rdbv-dot"
          style={{ animationDelay: `${d}s` }}
          d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z"
          fill={c as string}
        />
      </g>
    ))}
  </Svg>
);

const TemOuNaoTem = () => (
  <Svg label="Tem ou Não Tem">
    <rect x="50" y="14" width="220" height="176" rx="8" fill={NAVY} stroke={CREAM} strokeWidth="5" />
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i}>
        <rect x="64" y={28 + i * 31} width="192" height="23" rx="3" fill={CRIMSON} />
        <g className="rdbv-reveal" style={{ animationDelay: `${i * 0.6}s` }}>
          <rect x="64" y={28 + i * 31} width="192" height="23" rx="3" fill={i === 0 ? TEAL : CREAM} />
          <rect x="96" y={35 + i * 31} width={110 - i * 14} height="9" rx="2" fill={NAVY} />
          <text x="244" y={46 + i * 31} textAnchor="end" fontFamily={ANTON} fontSize="18" fill={NAVY}>{[38, 24, 17, 11, 7][i]}</text>
        </g>
        <text x="80" y={46 + i * 31} textAnchor="middle" fontFamily={ANTON} fontSize="18" fill={NAVY}>{i + 1}</text>
      </g>
    ))}
  </Svg>
);

const PerguntasEVerdades = () => (
  <Svg label="Perguntas e Verdades">
    {[
      [-24, TEAL, '?'],
      [0, CRIMSON, '?'],
      [24, TEAL, '?']
    ].map(([ang, c, t], i) => (
      <g key={i} className="rdbv-fan" style={{ transformOrigin: '160px 210px', ['--rdbv-a' as string]: `${ang}deg` }}>
        <rect x="118" y="40" width="84" height="120" rx="8" fill={CREAM} stroke={NAVY} strokeWidth="5" />
        <text x="130" y="66" fontFamily={ANTON} fontSize="20" fill={c as string}>{['3', 'K', '7'][i]}</text>
        <text x="160" y="126" textAnchor="middle" fontFamily={ANTON} fontSize="62" fill={c as string}>{t}</text>
      </g>
    ))}
    {/* fichas do leilao */}
    {[0, 1, 2].map((i) => (
      <g key={i} className="rdbv-chip" style={{ animationDelay: `${i * 0.25}s` }}>
        <ellipse cx="268" cy={176 - i * 12} rx="26" ry="9" fill={i === 2 ? TEAL : CRIMSON} stroke={NAVY} strokeWidth="4" />
      </g>
    ))}
    <g className="rdbv-chip" style={{ animationDelay: '0.4s' }}>
      <ellipse cx="52" cy="176" rx="26" ry="9" fill={TEAL} stroke={NAVY} strokeWidth="4" />
    </g>
  </Svg>
);

const VIGNETTES: Partial<Record<GameId, React.FC>> = {
  limite: Limite,
  duvido: Duvido,
  proibido: Proibido,
  nota: Nota,
  'tem-ou-nao-tem': TemOuNaoTem,
  'perguntas-e-verdades': PerguntasEVerdades,
  'mega-resenha': MegaResenha,
  'como-eu-pinto': ComoEuPinto,
  estadios: Estadios,
  'quem-sou-eu': QuemSouEu,
  'onde-estou': OndeEstou,
  mimica: Mimica,
  repetente: Repetente,
  'respostas-sem-perguntas': Respostas
};

/** Dado do "Sortear jogo surpresa". */
export const SurpriseArt: React.FC = () => (
  <div className="rdbv rdbv--vignette">
    <Svg label="Sortear jogo surpresa">
      <g className="rdbv-dice">
        <rect x="100" y="40" width="120" height="120" rx="16" fill={CREAM} stroke={NAVY} strokeWidth="6" />
        {[
          [130, 70],
          [190, 70],
          [160, 100],
          [130, 130],
          [190, 130]
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="11" fill={i === 2 ? CRIMSON : NAVY} />
        ))}
      </g>
      <text x="60" y="78" fontFamily={ANTON} fontSize="44" fill={TEAL} className="rdbv-q1">?</text>
      <text x="246" y="150" fontFamily={ANTON} fontSize="44" fill={CRIMSON} className="rdbv-q2">?</text>
    </Svg>
  </div>
);

export const GameCardArt: React.FC<{ gameId: GameId }> = ({ gameId }) => {
  const Vignette = VIGNETTES[gameId];
  if (!Vignette) return null;
  return (
    <div className={`rdbv rdbv--vignette rdbv--${gameId}`}>
      <Vignette />
    </div>
  );
};
