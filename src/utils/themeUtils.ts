import type { VisualTheme } from '../types/game';

export const ALL_THEMES: VisualTheme[] = ['neon', 'clean', 'cazetv', 'original'];

/** Modo 2 (broadcast) e Modo 3 (Original) compartilham a base visual CazéTV. */
export const isCazeFamily = (theme?: VisualTheme | string | null): boolean =>
  theme === 'cazetv' || theme === 'original';

export const isOriginalTheme = (theme?: VisualTheme | string | null): boolean =>
  theme === 'original';

export const isVisualTheme = (value: unknown): value is VisualTheme =>
  value === 'neon' || value === 'clean' || value === 'cazetv' || value === 'original';

export const nextTheme = (theme?: VisualTheme | string | null): VisualTheme => {
  const idx = ALL_THEMES.indexOf((theme as VisualTheme) || 'neon');
  return ALL_THEMES[(idx + 1) % ALL_THEMES.length];
};

export const THEME_LABELS: Record<VisualTheme, string> = {
  neon: '⚡ NEON',
  clean: '✨ CLEAN',
  cazetv: '📺 BROAD',
  original: '🔴 CAZETV'
};

export const themeBadge = (theme?: VisualTheme | string | null): string =>
  THEME_LABELS[(theme as VisualTheme) || 'neon'] || THEME_LABELS.neon;

/** Caminho da ilustração gerada no estilo CazéTV (Modo 3) em PNG transparente. */
export const cazeArtSrc = (gameId: string): string => `/assets/cazetv/${gameId}.png`;
