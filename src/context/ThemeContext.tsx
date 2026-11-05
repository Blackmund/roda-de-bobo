import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { VisualTheme } from '../types/game';
import { isVisualTheme, nextTheme } from '../utils/themeUtils';

export interface ThemeContextValue {
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
  cycleTheme: () => void;
  isNeon: boolean;
  isClean: boolean;
  isCazeTv: boolean;
  isOriginal: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'roda-de-bobo-visual-theme';

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: VisualTheme;
  onThemeChanged?: (theme: VisualTheme) => void;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme,
  onThemeChanged
}) => {
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(() => {
    if (initialTheme) return initialTheme;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (isVisualTheme(saved)) {
        return saved as VisualTheme;
      }
    }
    return 'cazetv'; // Default to CazéTV official experience or neon
  });

  // Keep DOM in sync with current visual theme
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', visualTheme);
      document.documentElement.classList.remove('theme-neon', 'theme-clean', 'theme-cazetv', 'theme-original');
      document.documentElement.classList.add(`theme-${visualTheme}`);
      if (visualTheme === 'original') document.documentElement.classList.add('theme-cazetv');
    }
  }, [visualTheme]);

  const setVisualTheme = useCallback(
    (theme: VisualTheme) => {
      setVisualThemeState(theme);
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
      onThemeChanged?.(theme);
    },
    [onThemeChanged]
  );

  const cycleTheme = useCallback(() => {
    setVisualThemeState((prev) => {
      const next: VisualTheme = nextTheme(prev);
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      }
      onThemeChanged?.(next);
      return next;
    });
  }, [onThemeChanged]);

  const value: ThemeContextValue = {
    visualTheme,
    setVisualTheme,
    cycleTheme,
    isNeon: visualTheme === 'neon',
    isClean: visualTheme === 'clean',
    isCazeTv: visualTheme === 'cazetv',
    isOriginal: visualTheme === 'original'
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
