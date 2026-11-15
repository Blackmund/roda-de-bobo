import { useEffect, useState } from 'react';

/**
 * Modo desenvolvedor: liga o simulador de controles e o selo de origem do conteudo (IA ou banco).
 * Fica desligado por padrao e e ligado/desligado no menu (guardado neste aparelho). `?dev` na URL tambem liga.
 */
const KEY = 'rdb-dev-mode';
const EVENT = 'rdb-dev-mode-change';

export function isDevModeOn(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('dev')) return true;
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setDevMode(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch {
    // sem localStorage: vale so ate recarregar
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function useDevMode(): boolean {
  const [on, setOn] = useState<boolean>(() => isDevModeOn());
  useEffect(() => {
    const sync = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setOn(typeof detail === 'boolean' ? detail || isDevModeOn() : isDevModeOn());
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return on;
}
