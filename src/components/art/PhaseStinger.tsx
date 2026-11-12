import React, { useEffect, useRef, useState } from 'react';
import type { GameRoom } from '../../types/game';

/**
 * Vinheta de transicao da partida: duas faixas (crimson e teal) cruzam a tela com o nome do momento
 * ("Rodada 2", "Sorteando a nota", "Revelação"...). Aparece quando o momento muda e some sozinha em ~1,2 s.
 * Nao bloqueia cliques e nao aparece com "reduzir movimento" ligado.
 */

/** O momento atual da partida, em texto curto. `null` = nada a anunciar. */
export function stingerLabel(room: GameRoom): string | null {
  if (room.screen !== 'playing' || !room.activeGame) return null;
  const nota = room.activeGame === 'nota' ? room.nota : undefined;
  if (nota) {
    if (nota.phase === 'DRAW' && nota.drawSubState === 'SPINNING') return 'Sorteando a nota';
    if (nota.phase === 'CLUES') return 'Hora das pistas';
    if (nota.phase === 'VOTING') return 'Palpites';
    if (nota.phase === 'REVEAL') return nota.revealSubState === 'SPINNING' ? 'A nota era...' : 'Revelação';
  }
  const state: any =
    room.limite || room.duvido || room.proibido || room.temOuNaoTem || room.mimica || room.megaResenha ||
    room.repetente || room.respostasSemPerguntas || room.estadios || room.comoEuPinto || room.quemSouEu;
  const phase = String(state?.phase || '');
  if (/^(RESULT|ROUND_END|SUMMARY|REVEAL|REVEALED)$/.test(phase)) return 'Resultado';
  if (phase === 'EXECUTION') return 'Duvido!';
  return `Rodada ${room.roundNumber || 1}`;
}

export const PhaseStinger: React.FC<{ room: GameRoom }> = ({ room }) => {
  const label = stingerLabel(room);
  const key = label ? `${room.activeGame}|${room.roundNumber}|${label}` : null;
  const [shown, setShown] = useState<{ key: string; label: string } | null>(null);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!key || !label || key === last.current) return;
    last.current = key;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setShown({ key, label });
    const t = setTimeout(() => setShown((s) => (s?.key === key ? null : s)), 1250);
    return () => clearTimeout(t);
  }, [key, label]);

  if (!shown) return null;
  return (
    <div key={shown.key} data-testid="phase-stinger" className="rdb-stinger" aria-hidden="true">
      <span className="rdb-stinger-bar rdb-stinger-bar--a" />
      <span className="rdb-stinger-bar rdb-stinger-bar--b" />
      <span className="rdb-stinger-label">{shown.label}</span>
    </div>
  );
};
