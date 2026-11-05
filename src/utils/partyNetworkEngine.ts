import { GameRoom, Player, TeamId } from '../types/game';
import { FIXED_PLAYERS } from './fixedPlayers';
import {
  RETRO_AVATARS,
  resolvePlayerAvatar,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from './retroAvatars';

export const PARTY_DEVICE_CLIENT_ID_KEY = 'PARTY_DEVICE_CLIENT_ID';
export const PARTY_LAST_SESSION_KEY = 'PARTY_LAST_SESSION_V1';
export const PARTY_SYNC_STORAGE_EVENT_KEY = 'PARTY_SYNC_EVENT_V1';
export const PARTY_BROADCAST_CHANNEL_NAME = 'roda_de_bobo_sync';

export type PartyRole = 'player' | 'master';

export interface SavedPartySession {
  clientId: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  avatar: string;
  role: PartyRole;
  fixedPlayerId?: string;
  updatedAt: number;
}

export interface JoinRequestPayload {
  clientId: string;
  playerName: string;
  avatar?: string;
  role: PartyRole;
  roomCode: string;
  fixedPlayerId?: string;
  color?: string;
}

export interface QuickSelectSeatOption {
  id: string;
  name: string;
  avatar: string;
  color: string;
  fixedPlayerId?: string;
  existingPlayerId?: string;
  isAlreadyInRoomOnTv: boolean;
  isClaimedByAnotherPhone: boolean;
  team?: TeamId;
}

export type PartyProtocolMessage =
  | {
      type: 'JOIN_REQUEST';
      payload: JoinRequestPayload;
      timestamp: number;
    }
  | {
      type: 'JOIN_ACCEPTED';
      payload: {
        clientId: string;
        playerId: string;
        roomCode: string;
        role: PartyRole;
        fullGameState: GameRoom;
      };
      timestamp: number;
    }
  | {
      type: 'PLAYER_RECONNECT';
      payload: {
        clientId: string;
        playerId?: string;
        playerName?: string;
        roomCode: string;
      };
      timestamp: number;
    }
  | {
      type: 'REQUEST_FULL_STATE';
      payload: {
        clientId: string;
        roomCode: string;
      };
      timestamp: number;
    }
  | {
      type: 'FULL_STATE_RESPONSE';
      payload: {
        roomCode: string;
        fullGameState: GameRoom;
      };
      timestamp: number;
    }
  | {
      type: 'PING_DEVICE';
      payload: {
        roomCode: string;
        targetPlayerId: string;
        targetClientId?: string;
      };
      timestamp: number;
    }
  | {
      type: 'PLAYER_BUZZ_READY';
      payload: {
        roomCode: string;
        playerId: string;
        playerName: string;
        avatar: string;
      };
      timestamp: number;
    }
  | {
      type: 'HEARTBEAT_PING';
      payload: {
        roomCode: string;
        hostId: string;
      };
      timestamp: number;
    }
  | {
      type: 'HEARTBEAT_PONG';
      payload: {
        roomCode: string;
        clientId: string;
        playerId?: string;
      };
      timestamp: number;
    }
  | {
      type: 'PLAYER_REACTION';
      payload: {
        roomCode: string;
        playerId: string;
        playerName: string;
        emoji: string;
      };
      timestamp: number;
    };

const DEFAULT_COLORS = [
  '#FF1E56', // Neon Rose
  '#17B8B8', // Neon Cyan
  '#FF6B00', // Arcade Orange
  '#9D00FF', // Neon Purple
  '#00FF66', // Neon Lime
  '#FFD600'  // Neon Yellow
];

function getDefaultStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

/**
 * Generates or retrieves the persistent PARTY_DEVICE_CLIENT_ID for this device.
 */
export function getOrCreateDeviceClientId(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = getDefaultStorage()
): string {
  if (storage) {
    try {
      const existing = storage.getItem(PARTY_DEVICE_CLIENT_ID_KEY);
      if (existing && existing.trim()) {
        return existing.trim();
      }
      const legacy = storage.getItem('rb_player_id');
      if (legacy && legacy.trim()) {
        storage.setItem(PARTY_DEVICE_CLIENT_ID_KEY, legacy.trim());
        return legacy.trim();
      }
    } catch {
      // Ignore storage read error
    }
  }

  const generated =
    'dev_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).substring(2, 8);

  if (storage) {
    try {
      storage.setItem(PARTY_DEVICE_CLIENT_ID_KEY, generated);
    } catch {
      // Ignore storage write error
    }
  }
  return generated;
}

/**
 * Cleans and uppercases a room code (4 to 6 alphanumeric characters).
 */
export function sanitizeRoomCode(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
}

/**
 * Generates an unambiguous 6-character alphanumeric room code (e.g. K9X4M2).
 * Excludes O, 0, I, 1 to avoid confusion on TVs and phones.
 */
export function generateNewRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code === 'BOBO' ? 'K9X4M2' : code;
}

export function saveLastPartySession(
  session: SavedPartySession,
  storage: Pick<Storage, 'setItem'> | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(PARTY_LAST_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore quota errors
  }
}

export function loadLastPartySession(
  storage: Pick<Storage, 'getItem'> | null = getDefaultStorage()
): SavedPartySession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PARTY_LAST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedPartySession;
    if (parsed && parsed.clientId && parsed.playerName) {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function clearLastPartySession(
  storage: Pick<Storage, 'removeItem'> | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.removeItem(PARTY_LAST_SESSION_KEY);
  } catch {
    // Ignore remove errors
  }
}

/**
 * Builds the 1-Tap "Quem é você?" seat options combining Fixed Players (Jogadores da Casa)
 * and any players already added on the TV who don't have another phone bound yet.
 */
export function getUnclaimedQuickSelectPlayers(
  room: GameRoom,
  currentClientId?: string
): QuickSelectSeatOption[] {
  const options: QuickSelectSeatOption[] = [];
  const seenNames = new Set<string>();

  // 1. Fixed Players (Jogadores da Casa)
  for (const fp of FIXED_PLAYERS) {
    const normName = fp.name.trim().toLowerCase();
    seenNames.add(normName);

    const existingInRoom = room.players.find(
      (p) =>
        (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
        p.name.trim().toLowerCase() === normName
    );

    const isClaimedByAnotherPhone = Boolean(
      existingInRoom &&
        (existingInRoom.connectionType === 'mobile' ||
          existingInRoom.connectionType === 'master') &&
        existingInRoom.deviceClientId &&
        existingInRoom.deviceClientId !== currentClientId &&
        existingInRoom.id !== currentClientId
    );

    const resolvedAvatar =
      existingInRoom?.avatar ||
      resolvePlayerAvatar({
        playerId: existingInRoom?.id || `fix-${fp.id}`,
        fixedPlayerId: fp.id,
        name: fp.name,
        fixedDefaultAvatar: fp.avatar
      });

    options.push({
      id: fp.id,
      name: fp.name,
      avatar: resolvedAvatar,
      color: existingInRoom?.color || fp.color,
      fixedPlayerId: fp.id,
      existingPlayerId: existingInRoom?.id,
      isAlreadyInRoomOnTv: Boolean(existingInRoom),
      isClaimedByAnotherPhone,
      team: existingInRoom?.team || fp.defaultTeam
    });
  }

  // 2. Any custom players already added on TV who are not in FIXED_PLAYERS
  for (const p of room.players) {
    const normName = p.name.trim().toLowerCase();
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);

    const isClaimedByAnotherPhone = Boolean(
      (p.connectionType === 'mobile' || p.connectionType === 'master') &&
        p.deviceClientId &&
        p.deviceClientId !== currentClientId &&
        p.id !== currentClientId
    );

    options.push({
      id: p.id,
      name: p.name,
      avatar: p.avatar || RETRO_AVATARS[0],
      color: p.color || DEFAULT_COLORS[0],
      fixedPlayerId: p.fixedPlayerId,
      existingPlayerId: p.id,
      isAlreadyInRoomOnTv: true,
      isClaimedByAnotherPhone,
      team: p.team
    });
  }

  return options;
}

/**
 * Core Seat Claiming & Registration Engine:
 * If a player with the same name, fixedPlayerId, or clientId already exists in the room
 * (e.g. added locally on the TV), this binds the mobile device to that exact seat
 * without throwing a duplicate error or creating a duplicate entry!
 */
export function claimOrRegisterPlayerInRoom(
  room: GameRoom,
  request: JoinRequestPayload
): {
  nextRoom: GameRoom;
  claimedPlayer: Player;
  wasExistingSeat: boolean;
} {
  const cleanName = (request.playerName || '').trim();
  const normalizedName = cleanName.toLowerCase();
  const fixedDef = request.fixedPlayerId
    ? FIXED_PLAYERS.find((fp) => fp.id === request.fixedPlayerId)
    : FIXED_PLAYERS.find((fp) => fp.name.trim().toLowerCase() === normalizedName);

  const isFixedPlayer = Boolean(fixedDef);
  const fixedPlayerId = fixedDef ? fixedDef.id : request.fixedPlayerId;
  const finalName = fixedDef ? fixedDef.name : cleanName || `Jogador ${room.players.length + 1}`;
  const connectionType: 'mobile' | 'master' = request.role === 'master' ? 'master' : 'mobile';

  // Look for an existing seat by:
  // 1) matching deviceClientId or id
  // 2) matching fixedPlayerId
  // 3) matching case-insensitive player name
  const existingSeat = room.players.find(
    (p) =>
      p.deviceClientId === request.clientId ||
      p.id === request.clientId ||
      (fixedPlayerId && p.fixedPlayerId === fixedPlayerId) ||
      p.name.trim().toLowerCase() === finalName.trim().toLowerCase()
  );

  const finalAvatar = resolvePlayerAvatar({
    explicitAvatar: request.avatar || existingSeat?.avatar,
    playerId: existingSeat?.id || request.clientId,
    name: finalName,
    fixedPlayerId,
    fixedDefaultAvatar: fixedDef?.avatar,
    indexFallback: room.players.length
  });

  const finalColor =
    request.color ||
    existingSeat?.color ||
    fixedDef?.color ||
    DEFAULT_COLORS[room.players.length % DEFAULT_COLORS.length];

  savePlayerAvatarPreference([existingSeat?.id || request.clientId, finalName, fixedPlayerId], finalAvatar);
  saveLastSelectedAvatar(finalAvatar);

  if (existingSeat) {
    const preservedName =
      existingSeat.name.trim().toLowerCase() === finalName.trim().toLowerCase()
        ? existingSeat.name
        : finalName;
    const claimedPlayer: Player = {
      ...existingSeat,
      name: preservedName,
      avatar: finalAvatar,
      color: finalColor,
      isFixedPlayer: existingSeat.isFixedPlayer || isFixedPlayer,
      fixedPlayerId: existingSeat.fixedPlayerId || fixedPlayerId,
      deviceClientId: request.clientId,
      connectionType,
      isMasterControl: request.role === 'master' || existingSeat.isMasterControl,
      isVip: existingSeat.isVip || request.role === 'master',
      connected: true,
      lastActive: Date.now()
    };

    const updatedPlayers = room.players.map((p) =>
      p.id === existingSeat.id ? claimedPlayer : p
    );
    const membersA = updatedPlayers.filter((p) => p.team === 'A').map((p) => p.id);
    const membersB = updatedPlayers.filter((p) => p.team === 'B').map((p) => p.id);

    return {
      nextRoom: {
        ...room,
        players: updatedPlayers,
        teams: {
          A: { ...room.teams.A, members: membersA },
          B: { ...room.teams.B, members: membersB }
        },
        lastUpdated: Date.now()
      },
      claimedPlayer,
      wasExistingSeat: true
    };
  }

  // Create a brand new player seat in the room
  const teamACount = room.players.filter((p) => p.team === 'A').length;
  const teamBCount = room.players.filter((p) => p.team === 'B').length;
  const assignedTeam: TeamId = fixedDef
    ? fixedDef.defaultTeam
    : teamACount <= teamBCount
    ? 'A'
    : 'B';

  const newPlayer: Player = {
    id: request.clientId,
    name: finalName,
    avatar: finalAvatar,
    color: finalColor,
    team: assignedTeam,
    isVip: room.players.length === 0 || request.role === 'master',
    score: 0,
    roundsPlayed: 0,
    roundsWon: 0,
    accuracy: 0,
    isFixedPlayer,
    fixedPlayerId,
    powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
    connected: true,
    lastActive: Date.now(),
    deviceClientId: request.clientId,
    connectionType,
    isMasterControl: request.role === 'master'
  };

  const updatedPlayers = [...room.players, newPlayer];
  const membersA = updatedPlayers.filter((p) => p.team === 'A').map((p) => p.id);
  const membersB = updatedPlayers.filter((p) => p.team === 'B').map((p) => p.id);

  return {
    nextRoom: {
      ...room,
      players: updatedPlayers,
      teams: {
        A: { ...room.teams.A, members: membersA },
        B: { ...room.teams.B, members: membersB }
      },
      lastUpdated: Date.now()
    },
    claimedPlayer: newPlayer,
    wasExistingSeat: false
  };
}

/**
 * Transparent Auto-Reconnection:
 * Finds a player by deviceClientId, playerId, or saved playerName and marks them online
 * without losing their seat, score, team, or secret hand.
 */
export function reconnectPlayerInRoom(
  room: GameRoom,
  clientId: string,
  fallbackPlayerId?: string,
  fallbackPlayerName?: string
): {
  nextRoom: GameRoom;
  player: Player | null;
} {
  const normFallbackName = (fallbackPlayerName || '').trim().toLowerCase();
  const target = room.players.find(
    (p) =>
      p.deviceClientId === clientId ||
      p.id === clientId ||
      (fallbackPlayerId && p.id === fallbackPlayerId) ||
      (normFallbackName && p.name.trim().toLowerCase() === normFallbackName)
  );

  if (!target) {
    return { nextRoom: room, player: null };
  }

  const updatedPlayer: Player = {
    ...target,
    deviceClientId: clientId,
    connectionType: target.connectionType || 'mobile',
    connected: true,
    lastActive: Date.now()
  };

  const updatedPlayers = room.players.map((p) =>
    p.id === target.id ? updatedPlayer : p
  );

  return {
    nextRoom: {
      ...room,
      players: updatedPlayers,
      lastUpdated: Date.now()
    },
    player: updatedPlayer
  };
}

/**
 * Resolves the active Player in a GameRoom bound to a specific device clientId or userId.
 */
export function findBoundPlayerForDevice(
  room: GameRoom,
  clientId: string,
  savedSession?: SavedPartySession | null
): Player | undefined {
  // 1. Exact deviceClientId match
  const byClient = room.players.find((p) => p.deviceClientId === clientId);
  if (byClient) return byClient;

  // 2. Direct player.id match
  const byId = room.players.find((p) => p.id === clientId);
  if (byId) return byId;

  // 3. Saved session match for the same room
  if (
    savedSession &&
    savedSession.roomCode.toUpperCase() === room.roomId.toUpperCase()
  ) {
    const bySavedId = room.players.find((p) => p.id === savedSession.playerId);
    if (bySavedId) return bySavedId;
  }

  return undefined;
}

/**
 * Triggers a remote Ping / Vibration test on a specific player's mobile controller.
 */
export function triggerPingOnPlayerInRoom(
  room: GameRoom,
  targetPlayerId: string
): GameRoom {
  const now = Date.now();
  const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
  return {
    ...room,
    players: room.players.map((p) =>
      p.id === targetPlayerId ? { ...p, lastPingAt: now, lastActive: now } : p
    ),
    lastPingEvent: {
      targetPlayerId,
      targetClientId: targetPlayer?.deviceClientId,
      timestamp: now
    },
    lastUpdated: now
  };
}

/**
 * Triggers a "⚡ Estou Pronto! / Buzinar na TV" event from a player's mobile controller.
 */
export function triggerBuzzReadyInRoom(
  room: GameRoom,
  playerId: string
): GameRoom {
  const now = Date.now();
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return room;

  return {
    ...room,
    players: room.players.map((p) =>
      p.id === playerId ? { ...p, lastBuzzAt: now, connected: true, lastActive: now } : p
    ),
    lastBuzzEvent: {
      playerId: player.id,
      playerName: player.name,
      avatar: player.avatar,
      timestamp: now
    },
    lastUpdated: now
  };
}

/**
 * Broadcasts a PartyProtocolMessage across BroadcastChannel('roda_de_bobo_sync')
 * and localStorage events for instant cross-tab / cross-window synchronization.
 */
export function emitPartyProtocolMessage(message: PartyProtocolMessage): void {
  if (typeof window === 'undefined') return;

  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(PARTY_BROADCAST_CHANNEL_NAME);
      bc.postMessage(message);
      bc.close();
    }
  } catch {
    // Ignore BroadcastChannel errors
  }

  try {
    window.localStorage.setItem(
      PARTY_SYNC_STORAGE_EVENT_KEY,
      JSON.stringify({ ...message, _nonce: Math.random() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Subscribes to PartyProtocolMessages over BroadcastChannel('roda_de_bobo_sync') and storage events.
 */
export function subscribePartyProtocolMessages(
  onMessage: (msg: PartyProtocolMessage) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let bc: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(PARTY_BROADCAST_CHANNEL_NAME);
      bc.onmessage = (ev) => {
        if (ev.data && typeof ev.data.type === 'string') {
          onMessage(ev.data as PartyProtocolMessage);
        }
      };
    }
  } catch {
    // Ignore BroadcastChannel init errors
  }

  const handleStorage = (ev: StorageEvent) => {
    if (ev.key === PARTY_SYNC_STORAGE_EVENT_KEY && ev.newValue) {
      try {
        const parsed = JSON.parse(ev.newValue) as PartyProtocolMessage;
        if (parsed && typeof parsed.type === 'string') {
          onMessage(parsed);
        }
      } catch {
        // Ignore invalid JSON
      }
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (bc) {
      try {
        bc.close();
      } catch {
        // Ignore close errors
      }
    }
  };
}
