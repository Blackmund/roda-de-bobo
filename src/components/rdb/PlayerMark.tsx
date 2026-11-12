import React from 'react';

/**
 * Marca do jogador na identidade do programa: um bloco chapado com as iniciais.
 * Substitui o emoji de avatar em todas as telas. A cor sai do nome, entao o mesmo jogador tem sempre
 * a mesma cara, do elenco ao placar e a tela de vitoria. O tamanho acompanha a fonte de quem envolve.
 */

type Markable = { name?: string; playerName?: string; avatar?: string } | null | undefined;

const TONES = ['teal', 'crimson', 'amber', 'cream'] as const;

/** Iniciais: primeira letra das duas primeiras palavras, ou as duas primeiras letras de um nome so. */
export function playerInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  if (words.length === 0) return '';
  const first = Array.from(words[0].replace(/[^\p{L}\p{N}]/gu, ''));
  if (words.length === 1) return first.slice(0, 2).join('').toUpperCase();
  const second = Array.from(words[1].replace(/[^\p{L}\p{N}]/gu, ''));
  return ((first[0] || '') + (second[0] || '')).toUpperCase();
}

/** Cor estavel a partir do nome (mesmo nome, mesma cor). */
export function playerTone(name: string): (typeof TONES)[number] {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + (ch.codePointAt(0) || 0)) >>> 0;
  return TONES[h % TONES.length];
}

export const PlayerMark: React.FC<{ p: Markable; className?: string }> = ({ p, className }) => {
  const name = (p?.name || p?.playerName || '').trim();
  const initials = name ? playerInitials(name) : '';
  const tone = name ? playerTone(name) : 'cream';
  return (
    <span className={`rdb-mark rdb-mark--${tone}${className ? ' ' + className : ''}`} aria-hidden="true">
      <span>{initials || '?'}</span>
    </span>
  );
};
