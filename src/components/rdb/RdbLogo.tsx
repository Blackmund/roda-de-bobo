import React from 'react';

/**
 * ART-05: logo "RODA DE BOBO" em SVG.
 * - `stacked`: empilhado, como na camisa do programa (RODA / DE / BOBO), com sombra dura e a tarja crimson do "DE".
 * - `inline`: numa linha, para cabecalhos.
 * Usa a fonte Anton (a mesma do site) e segue o tamanho do container (`className` define a largura).
 */
export const RdbLogo: React.FC<{ variant?: 'stacked' | 'inline'; className?: string; title?: string }> = ({
  variant = 'stacked',
  className = 'w-40',
  title = 'Roda de Bobo'
}) => {
  if (variant === 'inline') {
    return (
      <svg viewBox="0 0 260 56" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
        <title>{title}</title>
        <g fontFamily="Anton, Impact, sans-serif" fontSize="44" letterSpacing="2">
          <text x="3" y="45" fill="#120A16" stroke="#120A16" strokeWidth="6" strokeLinejoin="round">RODA</text>
          <text x="0" y="42" fill="#F5F2EB">RODA</text>
          <rect x="108" y="10" width="38" height="34" fill="#120A16" transform="translate(3 3)" />
          <rect x="108" y="10" width="38" height="34" fill="#FF1E56" stroke="#120A16" strokeWidth="3" />
          <text x="127" y="37" textAnchor="middle" fontSize="26" fill="#FFFFFF">DE</text>
          <text x="156" y="45" fill="#120A16" stroke="#120A16" strokeWidth="6" strokeLinejoin="round">BOBO</text>
          <text x="153" y="42" fill="#F5F2EB">BOBO</text>
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 190" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <g fontFamily="Anton, Impact, sans-serif" textAnchor="middle" letterSpacing="3">
        <text x="104" y="68" fontSize="76" fill="#120A16" stroke="#120A16" strokeWidth="9" strokeLinejoin="round">RODA</text>
        <text x="100" y="64" fontSize="76" fill="#F5F2EB">RODA</text>
        <g transform="rotate(-3 100 96)">
          <rect x="62" y="76" width="82" height="38" fill="#120A16" transform="translate(4 4)" />
          <rect x="62" y="76" width="82" height="38" fill="#FF1E56" stroke="#120A16" strokeWidth="4" />
          <text x="103" y="107" fontSize="30" fill="#FFFFFF">DE</text>
        </g>
        <text x="104" y="180" fontSize="76" fill="#120A16" stroke="#120A16" strokeWidth="9" strokeLinejoin="round">BOBO</text>
        <text x="100" y="176" fontSize="76" fill="#F5F2EB">BOBO</text>
      </g>
    </svg>
  );
};
