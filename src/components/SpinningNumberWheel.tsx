import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { sounds } from '../utils/soundEffects';
import { Sparkles } from 'lucide-react';

/**
 * Cryptographically strong random integer in [min, max] inclusive using CSPRNG
 * (`window.crypto.getRandomValues` / `globalThis.crypto.getRandomValues`).
 */
export function drawRandomScoreCSPRNG(min: number = 1, max: number = 10): number {
  const safeMin = Math.floor(Math.min(min, max));
  const safeMax = Math.floor(Math.max(min, max));
  const range = safeMax - safeMin + 1;
  if (range <= 1) return safeMin;

  const cryptoObj =
    typeof window !== 'undefined' && window.crypto
      ? window.crypto
      : typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : null;

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const maxUnbiased = Math.floor(0x100000000 / range) * range;
    const array = new Uint32Array(1);
    let rand = 0;
    do {
      cryptoObj.getRandomValues(array);
      rand = array[0];
    } while (rand >= maxUnbiased);
    return safeMin + (rand % range);
  }

  return safeMin + Math.floor(Math.random() * range);
}

/**
 * Pure helper to toggle a player ID in the selected winners list (reversible click).
 */
export function toggleNotaSelectedPlayer(
  currentSelected: readonly string[],
  playerId: string,
  speakerPlayerId: string = ''
): string[] {
  if (!playerId || (speakerPlayerId && playerId === speakerPlayerId)) return [...currentSelected];
  if (currentSelected.includes(playerId)) {
    return currentSelected.filter((id) => id !== playerId);
  }
  return [...currentSelected, playerId];
}

/**
 * Pure helper to compute real-time Jogo da Nota points from selected winners:
 * - Each selected player gets +1 pt
 * - Unselected players get 0 pts
 * - The Narrator (speakerPlayerId) automatically gets +X pts where X = number of selected players
 */
export function computeNotaRoundPoints(
  allPlayerIds: readonly string[],
  speakerPlayerId: string,
  selectedCorrectPlayerIds: readonly string[]
): {
  narratorPoints: number;
  pointsAwarded: Record<string, number>;
  correctVoters: string[];
} {
  const validWinners = selectedCorrectPlayerIds.filter(
    (id) => id !== speakerPlayerId && allPlayerIds.includes(id)
  );
  const uniqueWinners = Array.from(new Set(validWinners));
  const narratorPoints = uniqueWinners.length;

  const pointsAwarded: Record<string, number> = {};
  allPlayerIds.forEach((pid) => {
    if (pid === speakerPlayerId) {
      pointsAwarded[pid] = narratorPoints;
    } else if (uniqueWinners.includes(pid)) {
      pointsAwarded[pid] = 1;
    } else {
      pointsAwarded[pid] = 0;
    }
  });

  return {
    narratorPoints,
    pointsAwarded,
    correctVoters: uniqueWinners
  };
}

interface SpinningNumberWheelProps {
  targetNumber: number;
  minRange?: number;
  maxRange?: number;
  scaleMin?: number;
  scaleMax?: number;
  isSpinning?: boolean;
  durationMs?: number;
  autoStart?: boolean;
  label?: string;
  onComplete?: (landedNumber: number) => void;
}

/**
 * "Pião do Baú" 3D Prism / Wheel Number Spinner:
 * - Spins rapidly through numbers in [minRange..maxRange] with 3D rotateY & sound ticks
 * - Decelerates over the last ~2.5s using dramatic slow-motion easing (cubic-bezier(0.12, 0.8, 0.2, 1))
 *   passing number-by-number in suspense before locking onto `targetNumber` with neon glow!
 */
export const SpinningNumberWheel: React.FC<SpinningNumberWheelProps> = ({
  targetNumber,
  minRange,
  maxRange,
  scaleMin = 1,
  scaleMax = 10,
  isSpinning,
  durationMs = 3600,
  autoStart = true,
  label = 'PIÃO DO BAÚ // SORTEANDO NOTA',
  onComplete
}) => {
  const safeMin = Math.min(minRange ?? scaleMin, maxRange ?? scaleMax);
  const safeMax = Math.max(minRange ?? scaleMin, maxRange ?? scaleMax);
  const numbers: number[] = [];
  for (let n = safeMin; n <= safeMax; n++) {
    numbers.push(n);
  }

  const [displayNumber, setDisplayNumber] = useState<number>(safeMin);
  const [flipCount, setFlipCount] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(!autoStart);
  const [isSlowMoPhase, setIsSlowMoPhase] = useState<boolean>(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!autoStart) {
      setDisplayNumber(targetNumber);
      setIsLocked(true);
      return;
    }

    setIsLocked(false);
    setIsSlowMoPhase(false);

    // Build a deterministic sequence of numbers that cycles through the range multiple times
    // and lands strictly on `targetNumber` at the final step.
    const totalSteps = 26;
    const slowMoSteps = 9; // Last ~2.5s of dramatic slow-motion deceleration
    const targetIdxInRange = Math.max(0, numbers.indexOf(targetNumber));
    const rangeLen = Math.max(1, numbers.length);

    const sequence: number[] = [];
    for (let i = totalSteps - 1; i >= 0; i--) {
      const idx = (((targetIdxInRange - i) % rangeLen) + rangeLen) % rangeLen;
      sequence.push(numbers[idx]);
    }

    // Compute cumulative timestamps using cubic-bezier-like slow-motion deceleration
    // Fast phase: ~1.1s (17 fast ticks)
    // Slow-motion phase: ~2.5s (9 decelerating ticks: 120ms -> 160ms -> 210ms -> 270ms -> 340ms -> 420ms -> 520ms)
    const fastPhaseMs = Math.max(700, durationMs - 2500);
    const fastSteps = totalSteps - slowMoSteps;
    const timestamps: number[] = [];
    let accTime = 0;

    for (let step = 0; step < totalSteps; step++) {
      if (step < fastSteps) {
        const progress = step / Math.max(1, fastSteps);
        const stepDelay = 45 + Math.round(progress * 45);
        accTime += stepDelay;
      } else {
        const slowIdx = step - fastSteps; // 0 .. slowMoSteps - 1
        const t = (slowIdx + 1) / slowMoSteps;
        // Dramatic slow-motion easing curve
        const slowDelay = Math.round(115 + Math.pow(t, 2.15) * 440);
        accTime += slowDelay;
      }
      timestamps.push(accTime);
    }

    // Normalize timestamps to match requested durationMs if needed while preserving curve
    const scale = durationMs / Math.max(1, accTime);
    const timers: number[] = [];

    timestamps.forEach((rawTime, idx) => {
      const scheduledMs = Math.round(rawTime * scale);
      const timerId = window.setTimeout(() => {
        const num = sequence[idx];
        setDisplayNumber(num);
        setFlipCount((c) => c + 1);

        if (idx >= fastSteps) {
          setIsSlowMoPhase(true);
        }

        if (idx === totalSteps - 1) {
          // Final lock on targetNumber!
          setIsLocked(true);
          setIsSlowMoPhase(false);
          sounds.playFanfare();
          onCompleteRef.current?.(targetNumber);
        } else {
          sounds.playTick();
        }
      }, scheduledMs);
      timers.push(timerId);
    });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [targetNumber, safeMin, safeMax, durationMs, autoStart]);

  const prevNeighbor =
    numbers[(numbers.indexOf(displayNumber) - 1 + numbers.length) % numbers.length] ?? safeMin;
  const nextNeighbor =
    numbers[(numbers.indexOf(displayNumber) + 1) % numbers.length] ?? safeMax;

  return (
    <div
      data-testid="spinning-number-wheel"
      data-locked={isLocked ? 'true' : 'false'}
      className="flex flex-col items-center justify-center select-none py-1"
    >
      {/* Status Pill */}
      <div
        className={`mb-2 px-3 py-0.5 border font-mono-code text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all ${
          isLocked
            ? 'border-emerald-400 bg-emerald-950/90 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
            : isSlowMoPhase
            ? 'border-amber-300 bg-amber-950/90 text-amber-200 animate-pulse shadow-[0_0_16px_rgba(251,191,36,0.5)]'
            : 'border-cyan-400 bg-cyan-950/80 text-cyan-200'
        }`}
      >
        <Sparkles size={12} className={isLocked ? 'text-emerald-300' : 'text-amber-300 animate-spin'} />
        <span>
          {isLocked
            ? `NOTA CRAVADA (ESCALA ${safeMin} A ${safeMax})`
            : isSlowMoPhase
            ? 'CÂMERA LENTA... PARANDO O PIÃO!'
            : label}
        </span>
      </div>

      {/* 3D Pião do Baú Prism Stage */}
      <div
        className="relative flex items-center justify-center gap-3 md:gap-4"
        style={{ perspective: '1000px' }}
      >
        {/* Left Ghost Prism Facet */}
        <div
          className={`hidden sm:flex w-14 h-20 md:w-18 md:h-24 border border-slate-700/70 bg-[#080b14]/80 items-center justify-center font-anton text-2xl md:text-3xl text-slate-600 transition-all duration-200 ${
            isLocked ? 'opacity-30 scale-90' : 'opacity-60 -rotate-y-12 scale-95'
          }`}
        >
          {prevNeighbor}
        </div>

        {/* Center Main 3D Prism Facet */}
        <motion.div
          key={`${flipCount}-${ isLocked ? 'locked' : 'spin' }`}
          initial={
            isLocked
              ? { rotateY: -90, scale: 0.85, opacity: 0.7 }
              : { rotateY: -75, scale: 0.94, opacity: 0.85 }
          }
          animate={
            isLocked
              ? { rotateY: 0, scale: 1.06, opacity: 1 }
              : { rotateY: 0, scale: 1, opacity: 1 }
          }
          transition={{
            duration: isLocked ? 0.45 : isSlowMoPhase ? 0.28 : 0.08,
            ease: [0.12, 0.8, 0.2, 1]
          }}
          style={{ transformStyle: 'preserve-3d' }}
          className={`relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 border-4 flex flex-col items-center justify-center transition-colors ${
            isLocked
              ? 'border-[#FFE600] bg-gradient-to-b from-[#1f1a05] via-[#0c1624] to-[#060913] shadow-[0_0_50px_rgba(255,230,0,0.65),inset_0_0_25px_rgba(0,229,255,0.35)]'
              : isSlowMoPhase
              ? 'border-amber-400 bg-gradient-to-b from-[#1a1005] via-[#0b0e1a] to-black shadow-[0_0_30px_rgba(251,191,36,0.45)]'
              : 'border-cyan-400 bg-gradient-to-b from-[#0b1829] via-[#090d18] to-black shadow-[0_0_25px_rgba(23,184,184,0.4)]'
          }`}
        >
          {/* Decorative Top & Bottom Prism Ridges */}
          <div className="w-full px-2 py-0.5 border-b border-white/15 flex items-center justify-between text-[9px] font-mono-code uppercase text-slate-400">
            <span>MIN {safeMin}</span>
            <span className="text-amber-300 font-bold">★ BAÚ ★</span>
            <span>MAX {safeMax}</span>
          </div>

          <div
            data-testid="spinning-wheel-number"
            className={`my-auto font-anton text-5xl sm:text-6xl md:text-7xl leading-none tracking-normal ${
              isLocked
                ? 'text-[#FFE600] drop-shadow-[0_0_24px_rgba(255,230,0,0.9)]'
                : isSlowMoPhase
                ? 'text-amber-200 drop-shadow-[0_0_14px_rgba(251,191,36,0.7)]'
                : 'text-cyan-200'
            }`}
          >
            {displayNumber}
          </div>

          <div className="w-full px-2 py-0.5 border-t border-white/15 text-center text-[9px] font-mono-code uppercase tracking-widest text-cyan-300">
            {isLocked ? 'NOTA OFICIAL' : 'GIRANDO...'}
          </div>
        </motion.div>

        {/* Right Ghost Prism Facet */}
        <div
          className={`hidden sm:flex w-14 h-20 md:w-18 md:h-24 border border-slate-700/70 bg-[#080b14]/80 items-center justify-center font-anton text-2xl md:text-3xl text-slate-600 transition-all duration-200 ${
            isLocked ? 'opacity-30 scale-90' : 'opacity-60 rotate-y-12 scale-95'
          }`}
        >
          {nextNeighbor}
        </div>
      </div>
    </div>
  );
};
