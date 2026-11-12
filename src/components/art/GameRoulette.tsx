import React, { useEffect, useRef, useState } from 'react';
import type { GameId } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { GameCardArt } from './GameCardArt';

interface GameRouletteProps {
  games: Array<{ id: GameId; name: string }>;
  /** Jogo que ja foi sorteado: a roleta passa pelos outros e para nele. */
  target: GameId;
  onDone: () => void;
}

/**
 * Sorteio do jogo surpresa: as vinhetas passam rapido, vao desacelerando e param no jogo sorteado.
 * O resultado ja esta decidido antes (em `target`); a animacao so mostra o caminho ate ele.
 */
export const GameRoulette: React.FC<GameRouletteProps> = ({ games, target, onDone }) => {
  const targetIdx = Math.max(0, games.findIndex((g) => g.id === target));
  const [idx, setIdx] = useState(() => (targetIdx + 1) % games.length);
  const [landed, setLanded] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduced) {
      setIdx(targetIdx);
      setLanded(true);
      timers.push(setTimeout(() => doneRef.current(), 700));
      return () => timers.forEach(clearTimeout);
    }
    // 18 passos: comeca em 70 ms e desacelera ate ~430 ms; o ultimo passo cai no jogo sorteado
    const steps = 18;
    let t = 0;
    for (let s = 1; s <= steps; s++) {
      t += 70 + Math.pow(s / steps, 3) * 360;
      const at = (targetIdx - (steps - s) + games.length * 4) % games.length;
      timers.push(
        setTimeout(() => {
          setIdx(at);
          if (s === steps) {
            setLanded(true);
            sounds.playSuccess();
          } else {
            sounds.playTick();
          }
        }, t)
      );
    }
    timers.push(setTimeout(() => doneRef.current(), t + 1100));
    return () => timers.forEach(clearTimeout);
  }, [targetIdx, games.length]);

  const game = games[idx];
  return (
    <div data-testid="game-roulette" className="rdb-roulette" role="status" aria-live="polite">
      <p className="rdb-roulette-kicker">{landed ? 'O jogo sorteado é' : 'Sorteando o jogo'}</p>
      <div className={`rdb-roulette-frame ${landed ? 'rdb-roulette-frame--landed' : ''}`}>
        <div key={game.id} className="rdb-roulette-art">
          <GameCardArt gameId={game.id} />
        </div>
      </div>
      <p key={`n-${game.id}`} className={`rdb-roulette-name ${landed ? 'rdb-roulette-name--landed' : ''}`}>
        {game.name}
      </p>
    </div>
  );
};
