/**
 * Mobile Controller Timer Logic & Haptic Feedback (navigator.vibrate) Engine
 * Triggers tactile vibration patterns during the final 5 seconds of active game timers
 * while strictly respecting Free / Infinite timer mode (timerConfig === 0).
 */

import { GameId, GameRoom } from '../types/game';

export interface NavigatorVibrateLike {
  vibrate?: (pattern: number | number[]) => boolean;
}

export interface ActiveControllerTimerState {
  active: boolean;
  isInfinite: boolean;
  secondsRemaining: number | null;
  gameId: GameId | null;
  phaseLabel: string;
  isLastFiveSeconds: boolean;
}

/**
 * Safely invokes navigator.vibrate with a custom pattern if supported by the current device/browser.
 */
export function safeVibrate(
  pattern: number | number[],
  customNavigator?: NavigatorVibrateLike | null
): boolean {
  const nav: NavigatorVibrateLike | undefined =
    customNavigator !== undefined
      ? customNavigator || undefined
      : typeof navigator !== 'undefined'
      ? navigator
      : undefined;

  if (nav && typeof nav.vibrate === 'function') {
    try {
      return Boolean(nav.vibrate(pattern));
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Returns the vibration pattern for a given countdown second, or null if no vibration should occur.
 * - Strictly returns null when `isInfinite` is true (Free / Infinite Mode).
 * - Triggers haptic feedback on each of the last 5 seconds (5, 4, 3, 2, 1) when active.
 * - Escalates from a crisp 80ms pulse (5s, 4s, 3s) to a double pulse [100, 40, 100] (2s, 1s).
 * - Triggers a long double buzzer [220, 70, 220] when reaching 0s.
 */
export function getCountdownVibrationPattern(
  secondsRemaining: number | null | undefined,
  options: { isInfinite?: boolean; isActive?: boolean } = {}
): number | number[] | null {
  if (options.isInfinite) {
    return null;
  }

  if (secondsRemaining === null || secondsRemaining === undefined || Number.isNaN(secondsRemaining)) {
    return null;
  }

  const sec = Math.floor(secondsRemaining);

  if (sec === 0) {
    // Only vibrate on 0 if the timer just finished (caller controls transition) or isActive is not explicitly false
    if (options.isActive === false) return null;
    return [220, 70, 220];
  }

  if (sec >= 1 && sec <= 5) {
    if (options.isActive === false) {
      return null;
    }
    return sec <= 2 ? [100, 40, 100] : 80;
  }

  return null;
}

/**
 * Safely invokes `navigator.vibrate` when the countdown is within the last 5 seconds (or hits 0).
 */
export function triggerCountdownHaptic(
  secondsRemaining: number | null | undefined,
  options: { isInfinite?: boolean; isActive?: boolean } = {},
  customNavigator?: NavigatorVibrateLike | null
): { vibrated: boolean; pattern: number | number[] | null } {
  const pattern = getCountdownVibrationPattern(secondsRemaining, options);
  if (pattern === null) {
    return { vibrated: false, pattern: null };
  }

  const nav: NavigatorVibrateLike | undefined =
    customNavigator !== undefined
      ? customNavigator || undefined
      : typeof navigator !== 'undefined'
      ? navigator
      : undefined;

  if (nav && typeof nav.vibrate === 'function') {
    try {
      nav.vibrate(pattern);
      return { vibrated: true, pattern };
    } catch {
      return { vibrated: false, pattern };
    }
  }

  return { vibrated: false, pattern };
}

/**
 * Inspects the current GameRoom state and extracts the active timer for Mobile Controllers.
 */
export function resolveActiveControllerTimer(room: GameRoom): ActiveControllerTimerState {
  if (!room || room.screen !== 'playing' || !room.activeGame) {
    return {
      active: false,
      isInfinite: false,
      secondsRemaining: null,
      gameId: null,
      phaseLabel: '',
      isLastFiveSeconds: false
    };
  }

  const isGlobalInfinite = room.timerConfig === 0;

  // 1. JOGO DO LIMITE
  if (room.activeGame === 'limite' && room.limite) {
    const limite = room.limite;
    if (limite.phase === 'CALL_TIMEOUT') {
      const sec = Math.max(0, Math.floor(limite.callTimerRemaining ?? 0));
      return {
        active: sec > 0,
        isInfinite: false,
        secondsRemaining: sec,
        gameId: 'limite',
        phaseLabel: 'LIGAÇÃO DE AJUDA',
        isLastFiveSeconds: sec >= 1 && sec <= 5
      };
    }

    if (isGlobalInfinite) {
      return {
        active: false,
        isInfinite: true,
        secondsRemaining: null,
        gameId: 'limite',
        phaseLabel: 'LIVRE',
        isLastFiveSeconds: false
      };
    }

    if (limite.phase === 'SECRET_GUESS') {
      const sec = Math.max(0, Math.floor(limite.timerSeconds ?? room.timerConfig ?? 60));
      const active = Boolean(limite.timerActive && sec > 0);
      return {
        active,
        isInfinite: false,
        secondsRemaining: sec,
        gameId: 'limite',
        phaseLabel: 'TEMPO DE PALPITE',
        isLastFiveSeconds: active && sec >= 1 && sec <= 5
      };
    }
  }

  // 2. JOGO DO DUVIDO
  if (room.activeGame === 'duvido' && room.duvido) {
    const duvido = room.duvido;
    if (isGlobalInfinite) {
      return {
        active: false,
        isInfinite: true,
        secondsRemaining: null,
        gameId: 'duvido',
        phaseLabel: 'LIVRE',
        isLastFiveSeconds: false
      };
    }

    if (duvido.phase === 'EXECUTION') {
      const sec = Math.max(0, Math.floor(duvido.timerSeconds ?? room.timerConfig ?? 60));
      const active = Boolean(duvido.timerActive && sec > 0);
      return {
        active,
        isInfinite: false,
        secondsRemaining: sec,
        gameId: 'duvido',
        phaseLabel: 'EXECUÇÃO DO DUVIDO',
        isLastFiveSeconds: active && sec >= 1 && sec <= 5
      };
    }

    if (duvido.phase === 'RESULT' && duvido.timerSeconds === 0) {
      return {
        active: false,
        isInfinite: false,
        secondsRemaining: 0,
        gameId: 'duvido',
        phaseLabel: 'TEMPO ESGOTADO',
        isLastFiveSeconds: false
      };
    }
  }

  // 3. JOGO DO PROIBIDO
  if (room.activeGame === 'proibido' && room.proibido) {
    const proibido = room.proibido;
    if (isGlobalInfinite) {
      return {
        active: false,
        isInfinite: true,
        secondsRemaining: null,
        gameId: 'proibido',
        phaseLabel: 'LIVRE',
        isLastFiveSeconds: false
      };
    }

    if (proibido.phase === 'PLAYING' || proibido.phase === 'READY') {
      const sec = Math.max(0, Math.floor(proibido.timerSeconds ?? room.timerConfig ?? 60));
      const active = Boolean(proibido.phase === 'PLAYING' && proibido.timerActive && sec > 0);
      return {
        active,
        isInfinite: false,
        secondsRemaining: sec,
        gameId: 'proibido',
        phaseLabel: proibido.phase === 'PLAYING' ? 'CRONÔMETRO PROIBIDO' : 'PRONTO PARA INICIAR',
        isLastFiveSeconds: active && sec >= 1 && sec <= 5
      };
    }

    if (proibido.phase === 'SUMMARY' && proibido.timerSeconds === 0) {
      return {
        active: false,
        isInfinite: false,
        secondsRemaining: 0,
        gameId: 'proibido',
        phaseLabel: 'TEMPO ESGOTADO',
        isLastFiveSeconds: false
      };
    }
  }

  return {
    active: false,
    isInfinite: isGlobalInfinite,
    secondsRemaining: null,
    gameId: room.activeGame,
    phaseLabel: isGlobalInfinite ? 'LIVRE' : '',
    isLastFiveSeconds: false
  };
}

/**
 * Pure helper to advance active countdown timers by 1 second when driven by a mobile controller.
 * Strictly no-ops when `room.timerConfig === 0` (except for Limite's 30s Call Timeout card).
 */
export function advanceControllerTimerOneSecond(prev: GameRoom): {
  nextRoom: GameRoom;
  newSecondsRemaining: number | null;
} {
  if (!prev || prev.screen !== 'playing') {
    return { nextRoom: prev, newSecondsRemaining: null };
  }

  // 1. Limite Call Timeout or Round Timer
  if (prev.activeGame === 'limite' && prev.limite) {
    if (prev.limite.phase === 'CALL_TIMEOUT' && prev.limite.callTimerRemaining > 0) {
      const nextSec = prev.limite.callTimerRemaining - 1;
      return {
        newSecondsRemaining: nextSec,
        nextRoom: {
          ...prev,
          limite: {
            ...prev.limite,
            phase: nextSec <= 0 ? 'SECRET_GUESS' : 'CALL_TIMEOUT',
            callTimerRemaining: Math.max(0, nextSec)
          }
        }
      };
    }

    if (
      prev.timerConfig > 0 &&
      prev.limite.phase === 'SECRET_GUESS' &&
      prev.limite.timerActive &&
      prev.limite.timerSeconds > 0
    ) {
      const nextSec = prev.limite.timerSeconds - 1;
      return {
        newSecondsRemaining: nextSec,
        nextRoom: {
          ...prev,
          limite: {
            ...prev.limite,
            timerActive: nextSec > 0,
            timerSeconds: Math.max(0, nextSec)
          }
        }
      };
    }
  }

  // 2. Duvido Execution Timer
  if (
    prev.activeGame === 'duvido' &&
    prev.duvido &&
    prev.timerConfig > 0 &&
    prev.duvido.phase === 'EXECUTION' &&
    prev.duvido.timerActive &&
    prev.duvido.timerSeconds > 0
  ) {
    const nextSec = prev.duvido.timerSeconds - 1;
    if (nextSec <= 0) {
      const winningTeam = prev.duvido.challengedTeam === 'A' ? 'B' : 'A';
      return {
        newSecondsRemaining: 0,
        nextRoom: {
          ...prev,
          duvido: {
            ...prev.duvido,
            phase: 'RESULT',
            timerActive: false,
            timerSeconds: 0,
            resultWinnerTeam: winningTeam,
            resultReason: 'TEMPO ESGOTADO! Não conseguiu atingir a meta apostada.'
          }
        }
      };
    }
    return {
      newSecondsRemaining: nextSec,
      nextRoom: {
        ...prev,
        duvido: {
          ...prev.duvido,
          timerSeconds: nextSec
        }
      }
    };
  }

  // 3. Proibido Playing Timer
  if (
    prev.activeGame === 'proibido' &&
    prev.proibido &&
    prev.timerConfig > 0 &&
    prev.proibido.phase === 'PLAYING' &&
    prev.proibido.timerActive &&
    prev.proibido.timerSeconds > 0
  ) {
    const nextSec = prev.proibido.timerSeconds - 1;
    if (nextSec <= 0) {
      return {
        newSecondsRemaining: 0,
        nextRoom: {
          ...prev,
          proibido: {
            ...prev.proibido,
            phase: 'SUMMARY',
            timerActive: false,
            timerSeconds: 0
          }
        }
      };
    }
    return {
      newSecondsRemaining: nextSec,
      nextRoom: {
        ...prev,
        proibido: {
          ...prev.proibido,
          timerSeconds: nextSec
        }
      }
    };
  }

  return { nextRoom: prev, newSecondsRemaining: null };
}
