import React from 'react';
import { PVDeckStyle } from '../types/game';
import { PVCard, PVSuit, formatCardValueLabel } from '../utils/perguntasEVerdadesEngine';

interface PlayingCardViewProps {
  card: PVCard | null | undefined;
  styleMode?: PVDeckStyle; // 'padrao' (CazéTV Ilustrado) | 'compacto' | 'holografico'
  className?: string;
  isConflict?: boolean;
  isSelected?: boolean;
  isRevealed?: boolean; // If false (and not null), can show card back
  slotLabel?: string;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SUIT_DATA: Record<PVSuit, { symbol: string; name: string; color: string; bgAccent: string }> = {
  spades: { symbol: '♠', name: 'Espadas', color: '#00E5FF', bgAccent: 'from-cyan-950/80 to-[#0a101f]' },
  hearts: { symbol: '♥', name: 'Copas', color: '#FF1E56', bgAccent: 'from-rose-950/80 to-[#190a12]' },
  clubs: { symbol: '♣', name: 'Paus', color: '#10B981', bgAccent: 'from-emerald-950/80 to-[#071712]' },
  diamonds: { symbol: '♦', name: 'Ouros', color: '#FBBF24', bgAccent: 'from-amber-950/80 to-[#191307]' }
};

/**
 * Unique CazéTV style illustrated face motifs for card ranks.
 */
function renderCardCenterArtwork(val: number, suit: PVSuit, styleMode: PVDeckStyle) {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  const suitInfo = SUIT_DATA[suit];

  if (styleMode === 'compacto') {
    return (
      <div className="flex flex-col items-center justify-center my-auto">
        <span className="font-anton text-lg leading-none" style={{ color: suitInfo.color }}>
          {formatCardValueLabel(val)}
        </span>
        <span className="text-xs leading-none mt-0.5" style={{ color: suitInfo.color }}>
          {suitInfo.symbol}
        </span>
      </div>
    );
  }

  // Holographic style motif
  if (styleMode === 'holografico') {
    return (
      <div className="relative flex flex-col items-center justify-center my-auto w-full h-full">
        {/* Hologram scanlines / glitch shimmer */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/10 via-fuchsia-500/10 to-amber-300/10 pointer-events-none mix-blend-screen" />
        <div className="relative z-10 flex flex-col items-center">
          <span
            className="font-anton text-xl sm:text-2xl leading-none drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
            style={{
              color: '#FFFFFF',
              textShadow: '0 0 10px #00E5FF, 0 0 20px #FF007F'
            }}
          >
            {formatCardValueLabel(val)}
          </span>
          <span
            className="text-lg leading-none mt-0.5 filter drop-shadow-[0_0_6px_#FF007F]"
            style={{ color: suitInfo.color }}
          >
            {suitInfo.symbol}
          </span>
          <span className="text-[8px] font-mono-code uppercase tracking-wider text-cyan-300 font-bold opacity-80 mt-0.5">
            HOLOGRAM
          </span>
        </div>
      </div>
    );
  }

  // Padrão CazéTV Ilustrado (Vintage Cartoon Pop Art Card)
  // Distinguish Face cards (A, J, Q, K / 1, 11, 12, 13) and Numbers (2..10)
  const isFaceCard = val === 1 || val >= 11;

  return (
    <div className="relative flex flex-col items-center justify-center my-auto w-full px-1">
      {/* Decorative center frame */}
      <div
        className={`w-full py-1 px-1 rounded flex flex-col items-center justify-center border ${
          isRed ? 'border-rose-500/40 bg-rose-950/40' : 'border-cyan-500/40 bg-cyan-950/40'
        }`}
      >
        {isFaceCard ? (
          // Royal Cartoon Face Icon / Crown / Ace Badge
          <div className="flex flex-col items-center">
            <span className="text-sm sm:text-base leading-none">
              {val === 1 ? '👑' : val === 11 ? '⚔️' : val === 12 ? '👸' : '🤴'}
            </span>
            <span className="font-anton text-base sm:text-lg leading-none mt-0.5" style={{ color: suitInfo.color }}>
              {formatCardValueLabel(val)}
            </span>
          </div>
        ) : (
          // Pip grid / Cartoon numbers
          <div className="flex flex-col items-center">
            <span className="font-anton text-base sm:text-lg leading-none" style={{ color: suitInfo.color }}>
              {formatCardValueLabel(val)}
            </span>
            <div className="flex items-center gap-0.5 text-xs sm:text-sm leading-none mt-0.5" style={{ color: suitInfo.color }}>
              <span>{suitInfo.symbol}</span>
              {val >= 7 && <span className="opacity-75">{suitInfo.symbol}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const PlayingCardView: React.FC<PlayingCardViewProps> = ({
  card,
  styleMode = 'padrao',
  className = '',
  isConflict = false,
  isSelected = false,
  slotLabel,
  onRemove,
  onClick,
  size = 'md'
}) => {
  const suitInfo = card ? SUIT_DATA[card.suit] : null;
  const isRed = card?.suit === 'hearts' || card?.suit === 'diamonds';

  // Empty Slot Styling
  if (!card) {
    return (
      <div
        onClick={onClick}
        className={`h-20 sm:h-24 border-2 p-1 flex flex-col justify-between transition-all cursor-pointer relative select-none rounded ${
          isConflict
            ? 'border-rose-500 bg-rose-950 animate-pulse'
            : isSelected
            ? 'border-cyan-300 bg-cyan-950/60 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
            : 'border-dashed border-slate-700 bg-black/70 hover:border-cyan-400'
        } ${className}`}
      >
        <div className="flex items-center justify-between text-[9px] font-mono-code font-bold text-cyan-300">
          <span>{slotLabel || 'SLOT'}</span>
        </div>
        <div className="my-auto text-center font-mono-code text-[10px] text-slate-500">
          —
        </div>
      </div>
    );
  }

  // Holographic Deck Visuals
  if (styleMode === 'holografico') {
    return (
      <div
        onClick={onClick}
        className={`h-20 sm:h-24 border-2 p-1 flex flex-col justify-between transition-all cursor-pointer relative select-none rounded bg-gradient-to-br from-[#0c142c] via-[#1a0b2e] to-[#0a1724] border-cyan-400/90 shadow-[0_0_15px_rgba(0,229,255,0.35)] overflow-hidden ${
          isConflict ? 'border-rose-500 bg-rose-950 animate-pulse' : ''
        } ${isSelected ? 'ring-2 ring-fuchsia-400 border-white' : ''} ${className}`}
      >
        {/* Hologram Rainbow Sheen Gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-400/15 to-fuchsia-500/20 pointer-events-none mix-blend-screen" />

        {/* Top Header: Rank + Suit + Remove Button */}
        <div className="relative z-10 flex items-center justify-between text-[9px] font-mono-code font-bold">
          <div className="flex items-center gap-1" style={{ color: suitInfo?.color }}>
            <span className="font-anton text-xs">{formatCardValueLabel(card.value)}</span>
            <span>{suitInfo?.symbol}</span>
          </div>
          {slotLabel && <span className="text-[8px] text-cyan-300/80">{slotLabel}</span>}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="w-3.5 h-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center cursor-pointer text-[10px] rounded-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Center Artwork */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-0">
          {renderCardCenterArtwork(card.value, card.suit, 'holografico')}
        </div>

        {/* Bottom Corner Rank */}
        <div className="relative z-10 flex items-center justify-between text-[8px] font-mono-code text-cyan-300/80">
          <span>{suitInfo?.name}</span>
          <span className="font-anton" style={{ color: suitInfo?.color }}>
            {formatCardValueLabel(card.value)}
          </span>
        </div>
      </div>
    );
  }

  // Padrão CazéTV Ilustrado (Full Card Representation)
  if (styleMode === 'padrao') {
    return (
      <div
        onClick={onClick}
        className={`h-20 sm:h-24 border-2 p-1 flex flex-col justify-between transition-all cursor-pointer relative select-none rounded bg-[#0d1324] border-amber-400 shadow-[0_2px_10px_rgba(0,0,0,0.5)] ${
          isConflict ? 'border-rose-500 bg-rose-950 animate-pulse' : ''
        } ${isSelected ? 'border-cyan-300 ring-2 ring-cyan-400' : ''} ${className}`}
      >
        {/* Top Bar: Corner Index (Value + Suit) */}
        <div className="flex items-center justify-between text-[10px] font-mono-code font-bold">
          <div className="flex items-center gap-0.5" style={{ color: suitInfo?.color }}>
            <span className="font-anton text-xs">{formatCardValueLabel(card.value)}</span>
            <span>{suitInfo?.symbol}</span>
          </div>
          {slotLabel && <span className="text-[8px] text-slate-400">{slotLabel}</span>}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="w-3.5 h-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center cursor-pointer text-[10px] rounded-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Center CazéTV Illustrated Motif */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {renderCardCenterArtwork(card.value, card.suit, 'padrao')}
        </div>

        {/* Bottom Bar: Inverted Corner Index */}
        <div className="flex items-center justify-between text-[8px] font-mono-code text-slate-400">
          <span className="truncate max-w-[50px]">{suitInfo?.name}</span>
          <div className="flex items-center gap-0.5" style={{ color: suitInfo?.color }}>
            <span>{suitInfo?.symbol}</span>
            <span className="font-anton text-[10px]">{formatCardValueLabel(card.value)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Compact View (Original Minimal View)
  return (
    <div
      onClick={onClick}
      className={`h-16 sm:h-20 border-2 p-1 flex flex-col justify-between transition-all cursor-pointer relative select-none rounded ${
        isConflict
          ? 'border-rose-500 bg-rose-950 animate-pulse'
          : isSelected
          ? 'border-cyan-300 bg-cyan-950/60 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
          : 'border-amber-400 bg-[#0d1324]'
      } ${className}`}
    >
      <div className="flex items-center justify-between text-[9px] font-mono-code font-bold text-cyan-300">
        <span>{slotLabel || 'POS'}</span>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-3.5 h-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center cursor-pointer text-[10px] rounded-xs"
          >
            ×
          </button>
        )}
      </div>

      <div className={`text-center my-auto ${isRed ? 'text-rose-400' : 'text-cyan-200'}`}>
        <div className="font-anton text-lg leading-none">{formatCardValueLabel(card.value)}</div>
        <div className="text-xs leading-none mt-0.5">{suitInfo?.symbol}</div>
      </div>
    </div>
  );
};
