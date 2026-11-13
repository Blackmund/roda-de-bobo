import React from 'react';
import { PVDeckStyle } from '../types/game';
import { PVCard, PVSuit, formatCardValueLabel } from '../utils/perguntasEVerdadesEngine';

interface PlayingCardViewProps {
  card: PVCard | null | undefined;
  styleMode?: PVDeckStyle; // 'padrao' (Roda de Bobo) | 'compacto' | 'holografico'
  className?: string;
  isConflict?: boolean;
  isSelected?: boolean;
  isRevealed?: boolean;
  slotLabel?: string;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SUIT_NAME: Record<PVSuit, string> = {
  spades: 'Espadas',
  hearts: 'Copas',
  clubs: 'Paus',
  diamonds: 'Ouros'
};

const SUIT_SYMBOL_CHAR: Record<PVSuit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

/**
 * Attaches a crisp playing-card drag ghost image synchronously during HTML5 onDragStart
 * so holding and dragging a card from the deck or slots shows the card under the cursor.
 */
export function attachCardDragImage(e: React.DragEvent, card: PVCard) {
  if (typeof document === 'undefined' || !e.dataTransfer) return;
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const ghost = document.createElement('div');
  ghost.className = 'rdb-pv-drag-ghost' + (isRed ? ' is-red' : '');

  const val = document.createElement('span');
  val.className = 'rdb-pv-drag-ghost-val';
  val.textContent = formatCardValueLabel(card.value);

  const pip = document.createElement('span');
  pip.className = 'rdb-pv-drag-ghost-pip';
  pip.textContent = `${SUIT_SYMBOL_CHAR[card.suit]}\uFE0E`;

  ghost.appendChild(val);
  ghost.appendChild(pip);
  document.body.appendChild(ghost);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.id);
  try {
    e.dataTransfer.setDragImage(ghost, 36, 44);
  } catch {
    // Some headless browsers do not implement setDragImage
  }
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 0);
  });
}

export const SuitPip: React.FC<{ suit: PVSuit; className?: string }> = ({
  suit,
  className = 'rdb-pv-pip'
}) => {
  switch (suit) {
    case 'hearts':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case 'diamonds':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M12 2L21 12L12 22L3 12Z" />
        </svg>
      );
    case 'spades':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M12 2C7 7 3.5 10.2 3.5 14a4.5 4.5 0 0 0 7.2 3.6c-.3 1.5-.9 2.9-2.2 3.9h7c-1.3-1-1.9-2.4-2.2-3.9A4.5 4.5 0 0 0 20.5 14C20.5 10.2 17 7 12 2z" />
        </svg>
      );
    case 'clubs':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M12 3a4.2 4.2 0 0 0-3.1 7A4.3 4.3 0 0 0 3.5 14a4.3 4.3 0 0 0 7.2 3.2c-.3 1.5-.9 3-2.2 4.3h7c-1.3-1.3-1.9-2.8-2.2-4.3A4.3 4.3 0 0 0 20.5 14a4.3 4.3 0 0 0-5.4-4A4.2 4.2 0 0 0 12 3z" />
        </svg>
      );
  }
};

export const PlayingCardView: React.FC<PlayingCardViewProps> = ({
  card,
  styleMode = 'padrao',
  className = '',
  isConflict = false,
  isSelected = false,
  slotLabel,
  onRemove,
  onClick
}) => {
  if (!card) {
    return (
      <div
        onClick={onClick}
        className={
          'rdb-pv-cardbox is-empty' +
          (isConflict ? ' is-conflict' : '') +
          (isSelected ? ' is-selected' : '') +
          (className ? ` ${className}` : '')
        }
      >
        <div className="rdb-pv-cardbox-top">
          <span className="rdb-pv-cardbox-pos">{slotLabel || 'POS'}</span>
        </div>
        <div className="rdb-pv-cardbox-mid is-dash">—</div>
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const rankLabel = formatCardValueLabel(card.value);
  const suitName = SUIT_NAME[card.suit];

  if (styleMode === 'compacto') {
    return (
      <div
        onClick={onClick}
        className={
          'rdb-pv-cardbox is-compact' +
          (isRed ? ' is-red' : '') +
          (isConflict ? ' is-conflict' : '') +
          (isSelected ? ' is-selected' : '') +
          (className ? ` ${className}` : '')
        }
      >
        <div className="rdb-pv-cardbox-top">
          <span className="rdb-pv-cardbox-pos">{slotLabel || 'POS'}</span>
          {onRemove && (
            <button
              type="button"
              aria-label={`Remover ${rankLabel} de ${suitName}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="rdb-pv-cardbox-x"
            >
              ×
            </button>
          )}
        </div>
        <div className="rdb-pv-cardbox-mid">
          <span className="rdb-pv-cardbox-val">{rankLabel}</span>
          <SuitPip suit={card.suit} className="rdb-pv-pip is-sm" />
        </div>
      </div>
    );
  }

  const isHolo = styleMode === 'holografico';
  const isFace = card.value === 1 || card.value >= 11;

  return (
    <div
      onClick={onClick}
      className={
        'rdb-pv-cardbox' +
        (isRed ? ' is-red' : '') +
        (isFace ? ' is-face' : '') +
        (isHolo ? ' is-holo' : '') +
        (isConflict ? ' is-conflict' : '') +
        (isSelected ? ' is-selected' : '') +
        (className ? ` ${className}` : '')
      }
    >
      <div className="rdb-pv-cardbox-top">
        <span className="rdb-pv-cardbox-pos">{slotLabel || 'POS'}</span>
        {onRemove && (
          <button
            type="button"
            aria-label={`Remover ${rankLabel} de ${suitName}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rdb-pv-cardbox-x"
          >
            ×
          </button>
        )}
      </div>

      <div className="rdb-pv-cardbox-mid">
        <span className="rdb-pv-cardbox-val">{rankLabel}</span>
        <SuitPip suit={card.suit} className="rdb-pv-pip" />
      </div>

      <div className="rdb-pv-cardbox-foot">
        <span>{suitName}</span>
      </div>
    </div>
  );
};
