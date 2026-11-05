import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RETRO_AVATAR_CATEGORIES,
  RETRO_AVATARS,
  RetroAvatarCategoryId,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from '../utils/retroAvatars';
import { sounds } from '../utils/soundEffects';
import { Sparkles, Shuffle, X, Check } from 'lucide-react';

interface RetroAvatarPickerProps {
  selectedAvatar: string;
  onSelectAvatar?: (avatar: string) => void;
  onSelect?: (avatar: string) => void;
  playerKeyForStorage?: string | string[];
  playerId?: string;
  playerName?: string;
  fixedPlayerId?: string;
  compact?: boolean;
  accentColor?: 'cyan' | 'rose' | 'amber';
  testIdPrefix?: string;
}

export const RetroAvatarPicker: React.FC<RetroAvatarPickerProps> = ({
  selectedAvatar,
  onSelectAvatar,
  onSelect,
  playerKeyForStorage,
  playerId,
  playerName,
  fixedPlayerId,
  compact = false,
  accentColor = 'cyan',
  testIdPrefix = 'retro-avatar-picker'
}) => {
  const [activeCategory, setActiveCategory] = useState<RetroAvatarCategoryId | 'all'>('all');

  const displayedItems =
    activeCategory === 'all'
      ? RETRO_AVATAR_CATEGORIES.flatMap((cat) => cat.items)
      : RETRO_AVATAR_CATEGORIES.find((cat) => cat.id === activeCategory)?.items || [];

  const handleChoose = (emoji: string) => {
    sounds.playTick();
    saveLastSelectedAvatar(emoji);
    if (playerKeyForStorage) {
      savePlayerAvatarPreference(playerKeyForStorage, emoji);
    }
    if (playerId || playerName || fixedPlayerId) {
      savePlayerAvatarPreference({
        playerId,
        playerName,
        fixedPlayerId,
        avatar: emoji
      });
    }
    if (onSelectAvatar) onSelectAvatar(emoji);
    if (onSelect) onSelect(emoji);
  };

  const handleRandomAvatar = () => {
    sounds.playPowerup();
    const candidates = RETRO_AVATARS.filter((a) => a !== selectedAvatar);
    const randomEmoji =
      candidates[Math.floor(Math.random() * candidates.length)] || RETRO_AVATARS[0];
    handleChoose(randomEmoji);
  };

  const borderActiveClass =
    accentColor === 'rose'
      ? 'border-rose-400 bg-rose-950/80 text-white ring-1 ring-rose-400'
      : accentColor === 'amber'
      ? 'border-amber-400 bg-amber-950/80 text-white ring-1 ring-amber-400'
      : 'border-[#17B8B8] bg-[#17B8B8]/25 text-white ring-1 ring-[#17B8B8]';

  return (
    <div
      data-testid={testIdPrefix}
      className={`border border-white/15 bg-[#07080d]/95 ${
        compact ? 'p-2 space-y-2' : 'p-3 space-y-2.5'
      }`}
    >
      {/* Header + Randomizer */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#17B8B8] shrink-0" />
          <span className="font-anton text-xs tracking-wider text-white uppercase">
            GALERIA DE AVATARES RETRÔ ({RETRO_AVATARS.length})
          </span>
          <span className="px-1.5 py-0.5 bg-white/[0.06] text-[#17B8B8] font-mono-code text-[10px] font-bold">
            ATUAL: {selectedAvatar}
          </span>
        </div>

        <button
          type="button"
          data-testid={`${testIdPrefix}-random-btn`}
          onClick={handleRandomAvatar}
          className="px-2 py-0.5 bg-amber-400/15 hover:bg-amber-400 hover:text-black text-amber-300 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer shrink-0"
        >
          <Shuffle size={11} />
          <span>🎲 Sortear</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          data-testid={`${testIdPrefix}-tab-all`}
          onClick={() => {
            sounds.playTick();
            setActiveCategory('all');
          }}
          className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase transition-colors cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-[#17B8B8] text-black'
              : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          Todos ({RETRO_AVATARS.length})
        </button>
        {RETRO_AVATAR_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-testid={`${testIdPrefix}-tab-${cat.id}`}
            onClick={() => {
              sounds.playTick();
              setActiveCategory(cat.id);
            }}
            className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase transition-colors cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-[#17B8B8] text-black'
                : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Avatar Grid */}
      <div
        data-testid={`${testIdPrefix}-grid`}
        className={`grid ${
          compact
            ? 'grid-cols-8 sm:grid-cols-12 max-h-36'
            : 'grid-cols-6 sm:grid-cols-8 md:grid-cols-12 max-h-48'
        } gap-1.5 overflow-y-auto pr-0.5`}
      >
        {displayedItems.map((item) => {
          const isSelected = selectedAvatar === item.emoji;
          return (
            <button
              key={item.emoji}
              type="button"
              data-testid={`${testIdPrefix}-option-${item.emoji}`}
              onClick={() => handleChoose(item.emoji)}
              title={`${item.emoji} ${item.label}`}
              aria-label={`Escolher avatar ${item.label} ${item.emoji}`}
              className={`min-h-[36px] p-1 border flex flex-col items-center justify-center transition-transform cursor-pointer ${
                isSelected
                  ? `${borderActiveClass} scale-105`
                  : 'border-white/10 bg-black/60 hover:border-white/40 hover:bg-white/[0.06]'
              }`}
            >
              <span className={compact ? 'text-lg leading-none' : 'text-xl leading-none'}>
                {item.emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface RetroAvatarModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  selectedAvatar: string;
  onSelectAvatar?: (avatar: string) => void;
  onSelect?: (avatar: string) => void;
  playerKeyForStorage?: string | string[];
  playerId?: string;
  playerName?: string;
  fixedPlayerId?: string;
}

export const RetroAvatarModal: React.FC<RetroAvatarModalProps> = ({
  isOpen = true,
  onClose,
  title,
  subtitle = 'Sua escolha fica salva automaticamente neste dispositivo',
  selectedAvatar,
  onSelectAvatar,
  onSelect,
  playerKeyForStorage,
  playerId,
  playerName,
  fixedPlayerId
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const computedTitle =
    title ||
    (playerName ? `AVATAR RETRÔ — ${playerName.toUpperCase()}` : 'PERSONALIZAR AVATAR RETRÔ');

  return createPortal(
    <div
      data-testid="retro-avatar-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[1050] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={computedTitle}
        data-testid="retro-avatar-modal"
        onClick={(e) => e.stopPropagation()}
        className="max-w-lg w-full max-h-[90dvh] overflow-y-auto bg-[#07080d] border-2 border-[#17B8B8] p-5 shadow-2xl space-y-4 text-[#F5F2EB]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 border-2 border-[#17B8B8] bg-[#17B8B8]/15 flex items-center justify-center text-2xl shrink-0">
              {selectedAvatar}
            </div>
            <div className="min-w-0">
              <h3 className="font-anton text-base md:text-lg text-white uppercase tracking-wider truncate">
                {computedTitle}
              </h3>
              <p className="text-[11px] font-mono-code text-slate-400 truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="retro-avatar-modal-close-btn"
            aria-label="Fechar seletor de avatar"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] px-2.5 bg-[#E6194B] hover:bg-rose-500 text-white font-mono-code text-xs font-bold uppercase flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <X size={15} />
            <span>FECHAR</span>
          </button>
        </div>

        <RetroAvatarPicker
          selectedAvatar={selectedAvatar}
          onSelectAvatar={(emoji) => {
            if (onSelectAvatar) onSelectAvatar(emoji);
            if (onSelect) onSelect(emoji);
          }}
          playerKeyForStorage={playerKeyForStorage}
          playerId={playerId}
          playerName={playerName}
          fixedPlayerId={fixedPlayerId}
          testIdPrefix="modal-retro-avatar-picker"
        />

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-[10px] font-mono-code text-emerald-300 font-bold uppercase">
            ✓ Salvo em localStorage automaticamente
          </span>
          <button
            type="button"
            data-testid="retro-avatar-modal-confirm-btn"
            onClick={onClose}
            className="px-4 py-2 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            <span>CONFIRMAR AVATAR ({selectedAvatar})</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
