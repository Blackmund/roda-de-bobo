import React, { createContext, useContext } from 'react';
import type { CTSkin } from '../../types/game';

/**
 * Skin das pecas do Com Terra (Reserva).
 * - clean: cores chapadas (padrao)
 * - classic: tabuleiro ilustrado, com desenho proprio: grama com flores, agua com ondas, chao de terra,
 *   cerca viva, borda de pedra e cerca de madeira. Nao usa arte de nenhum jogo existente.
 */
export const CTSkinContext = createContext<CTSkin>('clean');
export const useCTSkin = () => useContext(CTSkinContext);

/** prefixo dos ids dos padroes (sao globais no documento: qualquer svg da pagina pode usar url(#...)) */
export const CTC = 'ctc-';

const ClassicDefs: React.FC = () => (
  <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden focusable="false">
    <defs>
      {/* grama: base verde, tufos claros e escuros, florzinhas */}
      <pattern id={CTC + 'green'} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#5cb84a" />
        <g stroke="#3d8f33" strokeWidth="0.35" strokeLinecap="round" fill="none">
          <path d="M1.2 3.4l.5-1.3M1.9 3.4l-.1-1.4M2.5 3.4l-.4-1.1" />
          <path d="M6.4 8.6l.5-1.3M7.1 8.6l-.1-1.4M7.7 8.6l-.4-1.1" />
          <path d="M7.6 2.6l.4-1M8.2 2.6l-.1-1.1" />
        </g>
        <g stroke="#8ad86a" strokeWidth="0.3" strokeLinecap="round" fill="none">
          <path d="M3.6 7.4l.4-1M4.1 7.4l-.1-1.1" />
          <path d="M8.8 5.4l.3-.9" />
        </g>
        <circle cx="5.2" cy="2.4" r="0.42" fill="#fff4d6" />
        <circle cx="5.2" cy="2.4" r="0.17" fill="#f2b632" />
        <circle cx="1.6" cy="8.2" r="0.36" fill="#ffd34d" />
      </pattern>

      {/* agua: azul com ondas claras */}
      <pattern id={CTC + 'house'} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#3aa6d0" />
        <g stroke="#9fdcf1" strokeWidth="0.38" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M0.6 2.6q1.1-.9 2.2 0t2.2 0" />
          <path d="M5.4 7.4q1.1-.9 2.2 0t2.2 0" />
        </g>
        <g stroke="#ffffff" strokeWidth="0.3" strokeLinecap="round" fill="none" opacity="0.55">
          <path d="M6.6 1.8h1.4" />
          <path d="M1.4 6.6h1.2" />
        </g>
      </pattern>

      {/* chao de terra / areia: amarelado com pontinhos e pedrinhas */}
      <pattern id={CTC + 'enclosure'} patternUnits="userSpaceOnUse" width="10" height="10">
        <rect width="10" height="10" fill="#e9b45a" />
        <g fill="#b98232" opacity="0.65">
          <circle cx="1.4" cy="1.6" r="0.28" />
          <circle cx="3.8" cy="4.2" r="0.22" />
          <circle cx="8.2" cy="3.1" r="0.3" />
          <circle cx="6.1" cy="8.4" r="0.25" />
          <circle cx="2.7" cy="7.6" r="0.3" />
          <circle cx="9" cy="7.9" r="0.2" />
        </g>
        <ellipse cx="6.6" cy="5.6" rx="0.8" ry="0.5" fill="#a8977c" />
        <ellipse cx="6.4" cy="5.4" rx="0.55" ry="0.3" fill="#c9bba2" />
      </pattern>
    </defs>
  </svg>
);

export const CTSkinProvider: React.FC<{ skin?: CTSkin; children: React.ReactNode }> = ({ skin = 'clean', children }) => (
  <CTSkinContext.Provider value={skin}>
    {skin === 'classic' && <ClassicDefs />}
    {children}
  </CTSkinContext.Provider>
);

/** borda tematica desenhada por dentro da peca (o clip corta a metade de fora) */
export const CLASSIC_RIM: Record<string, Array<{ stroke: string; width: number; dash?: string; opacity?: number }>> = {
  // cerca viva
  green: [
    { stroke: '#2f7a2c', width: 2.2 },
    { stroke: '#3f9637', width: 1.1, dash: '0.9 0.6' }
  ],
  // borda de pedra
  house: [
    { stroke: '#e9e3d2', width: 2.2 },
    { stroke: '#b9b09a', width: 2.2, dash: '0.25 2.1', opacity: 0.9 }
  ],
  // cerca de madeira
  enclosure: [
    { stroke: '#8a5a2b', width: 1.9 },
    { stroke: '#b07a40', width: 0.9, dash: '1.6 0.5' }
  ]
};

/** cor da lateral (papelao grosso) na skin classica */
export const CLASSIC_SIDE: Record<string, string> = {
  green: '#2b5e24',
  house: '#1d5f7a',
  enclosure: '#7d4f22'
};
