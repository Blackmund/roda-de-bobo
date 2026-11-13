import { useEffect, useRef, useState } from 'react';
import type { AdedanhaState } from '../../types/game';
import { ADEDANHA_SPIN_MS, tickAdedanha } from '../../utils/adedanhaEngine';

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

const SPIN_POOL = 'ABCDEFGHIJLMNOPRSTUV';

/**
 * Letra girando: quando a rodada comeca (READY -> WRITING), a letra passa rapido e vai desacelerando ate parar na
 * sorteada. Roda no proprio aparelho (nao depende do relogio dos outros).
 */
export function useLetterSpin(state: AdedanhaState | undefined): { letter: string; spinning: boolean } {
  const phase = state?.phase;
  const letter = state?.letter || '?';
  const prevPhase = useRef(phase);
  const [spinUntil, setSpinUntil] = useState(0);
  const [shown, setShown] = useState(letter);

  useEffect(() => {
    const before = prevPhase.current;
    prevPhase.current = phase;
    const fresh = state?.startedAt ? Date.now() - state.startedAt < ADEDANHA_SPIN_MS + 2000 : before === 'READY';
    if (phase === 'WRITING' && (before === 'READY' || before === undefined) && fresh) setSpinUntil(Date.now() + ADEDANHA_SPIN_MS);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const spinning = phase === 'WRITING' && Date.now() < spinUntil;
  useEffect(() => {
    if (!spinning) {
      setShown(letter);
      return;
    }
    let alive = true;
    let delay = 55;
    const step = () => {
      if (!alive) return;
      if (Date.now() >= spinUntil) {
        setShown(letter);
        setSpinUntil(0);
        return;
      }
      setShown(SPIN_POOL[Math.floor(Math.random() * SPIN_POOL.length)]);
      delay = Math.min(260, delay * 1.12);
      window.setTimeout(step, delay);
    };
    step();
    return () => {
      alive = false;
    };
  }, [spinning, spinUntil, letter]);

  return { letter: spinning ? shown : letter, spinning };
}
