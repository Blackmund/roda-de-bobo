import React, { useEffect, useRef, useState } from 'react';
import { sounds } from '../../utils/soundEffects';

/**
 * Sorteio da letra em tela cheia: raios girando atras de uma moldura, a letra passando como uma roleta e, ao parar,
 * um "pulo" e a moldura encolhendo para o lugar dela na tela. Some sozinho.
 */
export const LetterDrawOverlay: React.FC<{ letter: string; spinning: boolean; compact?: boolean; sound?: boolean }> = ({ letter, spinning, compact, sound }) => {
  const [stage, setStage] = useState<'off' | 'spin' | 'land' | 'leave'>('off');
  const wasSpinning = useRef(false);
  const spinStart = useRef(0);

  // som da roleta: cada letra que passa da um toque de catraca; ao parar, o resultado
  useEffect(() => {
    if (!sound || !spinning) return;
    if (!spinStart.current) spinStart.current = Date.now();
    sounds.playSpinTick(Math.min(1, (Date.now() - spinStart.current) / 2600));
  }, [letter, spinning, sound]);
  useEffect(() => {
    if (!sound || spinning || !spinStart.current) return;
    spinStart.current = 0;
    sounds.playSpinStop();
  }, [spinning, sound]);

  useEffect(() => {
    if (spinning) {
      wasSpinning.current = true;
      setStage('spin');
      return;
    }
    if (!wasSpinning.current) return;
    wasSpinning.current = false;
    setStage('land');
    const t1 = window.setTimeout(() => setStage('leave'), 750);
    const t2 = window.setTimeout(() => setStage('off'), 1250);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [spinning]);

  if (stage === 'off') return null;
  return (
    <div className={`rdb-draw is-${stage}` + (compact ? ' is-compact' : '')} data-testid="letter-draw-overlay" aria-live="polite">
      <div className="rdb-draw-rays" aria-hidden="true" />
      <div className="rdb-draw-frame">
        <span key={letter + stage} className="rdb-draw-letter">
          {letter}
        </span>
      </div>
      <span className="rdb-draw-caption">{stage === 'spin' ? 'Sorteando a letra…' : `Letra ${letter}!`}</span>
    </div>
  );
};
