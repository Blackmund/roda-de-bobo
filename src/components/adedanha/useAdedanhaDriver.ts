import { useEffect, useState } from 'react';
import type { AdedanhaState } from '../../types/game';
import { tickAdedanha } from '../../utils/adedanhaEngine';

/**
 * Relogio da Adedanha: roda em UM aparelho so (a TV, ou o celular do lider no modo so celulares).
 * Fim do tempo -> STOP automatico; fim da janela do STOP -> validacao. So escreve no estado quando a fase muda.
 */
export function useAdedanhaDriver(
  state: AdedanhaState | undefined,
  update: (updater: (prev: AdedanhaState) => AdedanhaState) => void,
  enabled: boolean
) {
  const phase = state?.phase;
  useEffect(() => {
    if (!enabled || (phase !== 'WRITING' && phase !== 'STOPPING')) return;
    const id = window.setInterval(() => {
      update((prev) => {
        const next = tickAdedanha(prev);
        return next.phase === prev.phase ? prev : next;
      });
    }, 400);
    return () => window.clearInterval(id);
  }, [enabled, phase, update]);
}

/** Hora atual que atualiza sozinha (para mostrar a contagem sem gravar nada no estado). */
export function useNow(active: boolean, everyMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [active, everyMs]);
  return now;
}
