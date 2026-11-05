/**
 * Retro-Styled Avatar Catalog & localStorage Persistence Engine
 * "Roda de Bobo" Party Games Edition
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type RetroAvatarCategoryId = 'arcade' | 'mascotes' | 'resenha' | 'lendas';

export interface RetroAvatarItem {
  emoji: string;
  label: string;
  category: RetroAvatarCategoryId;
}

export interface RetroAvatarCategory {
  id: RetroAvatarCategoryId;
  name: string;
  badge: string;
  items: RetroAvatarItem[];
}

export const RETRO_AVATAR_CATEGORIES: RetroAvatarCategory[] = [
  {
    id: 'arcade',
    name: 'Fliperama & Cyber',
    badge: '8-BIT // RETRO OS',
    items: [
      { emoji: '👾', label: 'Space Invader', category: 'arcade' },
      { emoji: '🕹️', label: 'Joystick Arcade', category: 'arcade' },
      { emoji: '🤖', label: 'Cyber Bot', category: 'arcade' },
      { emoji: '⚡', label: 'Alta Voltagem', category: 'arcade' },
      { emoji: '🛸', label: 'Disco Voador', category: 'arcade' },
      { emoji: '💾', label: 'Disquete 3.5"', category: 'arcade' },
      { emoji: '📟', label: 'Pager Retrô', category: 'arcade' },
      { emoji: '🎮', label: 'Gamepad 16-Bit', category: 'arcade' },
      { emoji: '🔮', label: 'Orbe Neon', category: 'arcade' },
      { emoji: '🕶️', label: 'Cyber Shades', category: 'arcade' },
      { emoji: '🚀', label: 'Foguete Turbo', category: 'arcade' },
      { emoji: '💿', label: 'CD-ROM Laser', category: 'arcade' }
    ]
  },
  {
    id: 'mascotes',
    name: 'Feras & Mascotes',
    badge: 'FERAS DA ARENA',
    items: [
      { emoji: '🦁', label: 'Leão Capitão', category: 'mascotes' },
      { emoji: '🐯', label: 'Tigre de Elite', category: 'mascotes' },
      { emoji: '🦊', label: 'Raposa Astuta', category: 'mascotes' },
      { emoji: '🐼', label: 'Panda Zen', category: 'mascotes' },
      { emoji: '🐸', label: 'Sapo Saltador', category: 'mascotes' },
      { emoji: '🐙', label: 'Polvo Estrategista', category: 'mascotes' },
      { emoji: '🦖', label: 'T-Rex Pixel', category: 'mascotes' },
      { emoji: '🦄', label: 'Unicórnio Turbo', category: 'mascotes' },
      { emoji: '🐉', label: 'Dragão Lendário', category: 'mascotes' },
      { emoji: '🦈', label: 'Tubarão Branco', category: 'mascotes' },
      { emoji: '🦅', label: 'Falcão Real', category: 'mascotes' },
      { emoji: '🦍', label: 'Kong Supremo', category: 'mascotes' }
    ]
  },
  {
    id: 'resenha',
    name: 'Festa & Resenha',
    badge: 'AUDITÓRIO // VIP',
    items: [
      { emoji: '👑', label: 'Rei do Camarote', category: 'resenha' },
      { emoji: '🎸', label: 'Guitar Hero', category: 'resenha' },
      { emoji: '🍕', label: 'Pizza da Madrugada', category: 'resenha' },
      { emoji: '🍺', label: 'Caneca do Boteco', category: 'resenha' },
      { emoji: '🎤', label: 'Host do Auditório', category: 'resenha' },
      { emoji: '🎧', label: 'DJ da Resenha', category: 'resenha' },
      { emoji: '🪩', label: 'Globo Espelhado', category: 'resenha' },
      { emoji: '🌶️', label: 'Pimenta Malagueta', category: 'resenha' },
      { emoji: '🍿', label: 'Pipoca Quente', category: 'resenha' },
      { emoji: '🎯', label: 'Na Mosca', category: 'resenha' },
      { emoji: '🎲', label: 'Dado da Sorte', category: 'resenha' },
      { emoji: '🃏', label: 'Coringa Mestre', category: 'resenha' }
    ]
  },
  {
    id: 'lendas',
    name: 'Esporte & Lendas',
    badge: 'CAMPEÕES',
    items: [
      { emoji: '🏎️', label: 'Piloto Pole Position', category: 'lendas' },
      { emoji: '⚽', label: 'Camisa 10', category: 'lendas' },
      { emoji: '🏆', label: 'Taça de Ouro', category: 'lendas' },
      { emoji: '🥊', label: 'Luva Nocaute', category: 'lendas' },
      { emoji: '🏀', label: 'Enterrada Monstra', category: 'lendas' },
      { emoji: '🛹', label: 'Skate Street', category: 'lendas' },
      { emoji: '🏄', label: 'Surfista Radical', category: 'lendas' },
      { emoji: '🥇', label: 'Medalha de Ouro', category: 'lendas' },
      { emoji: '🔥', label: 'Chama Invicta', category: 'lendas' },
      { emoji: '💎', label: 'Diamante Raro', category: 'lendas' },
      { emoji: '🥷', label: 'Ninja Furtivo', category: 'lendas' },
      { emoji: '🧙', label: 'Mago dos Palpites', category: 'lendas' }
    ]
  }
];

export const RETRO_AVATARS: string[] = RETRO_AVATAR_CATEGORIES.flatMap((cat) =>
  cat.items.map((item) => item.emoji)
);

export const AVATAR_PREFS_STORAGE_KEY = 'rb_player_avatar_prefs_v1';
export const LAST_SELECTED_AVATAR_STORAGE_KEY = 'rb_selected_avatar_v1';

function getDefaultStorage(customStorage?: StorageLike): StorageLike | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function normalizePlayerAvatarKey(rawKey?: string | null): string {
  if (!rawKey) return '';
  return String(rawKey).trim().toLowerCase();
}

export function loadPlayerAvatarPreferences(customStorage?: StorageLike): Record<string, string> {
  const storage = getDefaultStorage(customStorage);
  if (!storage) return {};
  try {
    const raw = storage.getItem(AVATAR_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Ignore malformed storage data
  }
  return {};
}

export interface PlayerAvatarKeyOptions {
  playerId?: string;
  playerName?: string;
  name?: string;
  fixedPlayerId?: string;
}

function extractNormalizedKeys(
  input: string | Array<string | undefined | null> | PlayerAvatarKeyOptions
): string[] {
  const rawKeys: Array<string | undefined | null> = [];
  if (typeof input === 'string') {
    rawKeys.push(input);
  } else if (Array.isArray(input)) {
    rawKeys.push(...input);
  } else if (input && typeof input === 'object') {
    const resolvedName = input.playerName ?? input.name;
    if (input.playerId) {
      rawKeys.push(input.playerId, `id:${input.playerId}`);
    }
    if (input.fixedPlayerId) {
      rawKeys.push(
        input.fixedPlayerId,
        `fixed:${input.fixedPlayerId}`,
        `fix-${input.fixedPlayerId}`
      );
    }
    if (resolvedName) {
      rawKeys.push(resolvedName, `name:${resolvedName}`);
    }
  }

  const normalized: string[] = [];
  for (const k of rawKeys) {
    const norm = normalizePlayerAvatarKey(k);
    if (norm && !normalized.includes(norm)) {
      normalized.push(norm);
    }
  }
  return normalized;
}

export function savePlayerAvatarPreference(
  playerKeysOrOptions:
    | string
    | Array<string | undefined | null>
    | (PlayerAvatarKeyOptions & { avatar: string }),
  avatarOrStorage?: string | StorageLike,
  maybeStorage?: StorageLike
): Record<string, string> {
  let cleanAvatar = '';
  let customStorage: StorageLike | undefined;
  let keys: string[] = [];

  if (
    playerKeysOrOptions &&
    typeof playerKeysOrOptions === 'object' &&
    !Array.isArray(playerKeysOrOptions) &&
    'avatar' in playerKeysOrOptions
  ) {
    cleanAvatar = String(playerKeysOrOptions.avatar || '').trim();
    customStorage = avatarOrStorage as StorageLike | undefined;
    keys = extractNormalizedKeys(playerKeysOrOptions);
  } else {
    cleanAvatar = String((avatarOrStorage as string) || '').trim();
    customStorage = maybeStorage;
    keys = extractNormalizedKeys(playerKeysOrOptions as string | Array<string | undefined | null>);
  }

  const current = loadPlayerAvatarPreferences(customStorage);
  if (!cleanAvatar) return current;

  const updated: Record<string, string> = { ...current };
  keys.forEach((norm) => {
    updated[norm] = cleanAvatar;
  });

  const storage = getDefaultStorage(customStorage);
  if (storage) {
    try {
      storage.setItem(AVATAR_PREFS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
  return updated;
}

export function getSavedPlayerAvatar(
  playerKeysOrOptions: Array<string | undefined | null> | PlayerAvatarKeyOptions,
  customStorage?: StorageLike
): string | null {
  const prefs = loadPlayerAvatarPreferences(customStorage);
  const keys = extractNormalizedKeys(playerKeysOrOptions);
  for (const norm of keys) {
    if (prefs[norm]) {
      return prefs[norm];
    }
  }
  return null;
}

export function saveLastSelectedAvatar(avatar: string, customStorage?: StorageLike): void {
  const clean = String(avatar || '').trim();
  if (!clean) return;
  const storage = getDefaultStorage(customStorage);
  if (storage) {
    try {
      storage.setItem(LAST_SELECTED_AVATAR_STORAGE_KEY, clean);
    } catch {
      // Ignore storage errors
    }
  }
}

export function loadLastSelectedAvatar(
  fallback: string = RETRO_AVATARS[0],
  customStorage?: StorageLike
): string {
  const storage = getDefaultStorage(customStorage);
  if (storage) {
    try {
      const saved = storage.getItem(LAST_SELECTED_AVATAR_STORAGE_KEY);
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch {
      // Ignore storage errors
    }
  }
  return fallback;
}

export function resolvePlayerAvatar(
  options: {
    explicitAvatar?: string;
    playerId?: string;
    name?: string;
    playerName?: string;
    fixedPlayerId?: string;
    fixedDefaultAvatar?: string;
    fallbackAvatar?: string;
    indexFallback?: number;
  },
  customStorage?: StorageLike
): string {
  if (options.explicitAvatar && options.explicitAvatar.trim()) {
    return options.explicitAvatar.trim();
  }

  const saved = getSavedPlayerAvatar(
    {
      playerId: options.playerId,
      playerName: options.playerName ?? options.name,
      fixedPlayerId: options.fixedPlayerId
    },
    customStorage
  );
  if (saved) {
    return saved;
  }

  const fallback = options.fixedDefaultAvatar ?? options.fallbackAvatar;
  if (fallback && fallback.trim()) {
    return fallback.trim();
  }

  const idx = Math.max(0, options.indexFallback ?? 0);
  return RETRO_AVATARS[idx % RETRO_AVATARS.length];
}

