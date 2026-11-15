import React, { createContext, useContext } from 'react';
import type { CTSkin } from '../../types/game';

/**
 * Skin das pecas do Com Terra (Reserva).
 * - clean: cores chapadas (padrao)
 * - classic: tabuleiro e pecas ilustradas estilo Barenpark via CTClassicArt.
 */
export const CTSkinContext = createContext<CTSkin>('clean');
export const useCTSkin = () => useContext(CTSkinContext);

export const CTSkinProvider: React.FC<{ skin?: CTSkin; children: React.ReactNode }> = ({ skin = 'clean', children }) => (
  <CTSkinContext.Provider value={skin}>{children}</CTSkinContext.Provider>
);
