import { ConnectionMode, GameDifficulty, GameId, GameRoom, Player, TeamId } from '../types/game';
import { sanitizeRoomCode } from './partyNetworkEngine';
import { isApiAvailable } from './apiAvailability';

/**
 * Unambiguous 32-character alphabet for 6-character room codes.
 * Strictly excludes O, 0, I, and 1 to avoid visual confusion on TVs and phones.
 */
export const UNAMBIGUOUS_ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface UniqueRoomSessionDescriptor {
  roomCode: string;
  sessionKey: string;
  mode: ConnectionMode;
  activeGame: GameId | null;
  joinUrl: string;
  whatsappShareUrl: string;
  createdAt: number;
}

export interface ParsedJoinQueryParams {
  joinCode: string | null;
  roomCode: string | null;
  requestedMode: ConnectionMode | null;
  shouldOpenQuickJoin: boolean;
  isControllerView: boolean;
  isPadMode?: boolean;
}

export type AuthoritativeRoomEvent =
  | {
      type: 'PLAYER_JOIN';
      roomCode: string;
      clientId: string;
      playerName: string;
      avatar: string;
      fixedPlayerId?: string;
      isLeader?: boolean;
      timestamp: number;
    }
  | {
      type: 'PLAYER_ACTION';
      roomCode: string;
      clientId: string;
      playerId: string;
      actionType: string;
      payload: Record<string, unknown>;
      timestamp: number;
    }
  | {
      type: 'REQUEST_SYNC';
      roomCode: string;
      clientId: string;
      timestamp: number;
    }
  | {
      type: 'ROOM_STATE_UPDATE';
      roomCode: string;
      state: GameRoom;
      ackClientId?: string;
      timestamp: number;
    };

function getRandomIndex(max: number): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return array[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Generates a cryptographically random 6-character alphanumeric room code
 * (e.g. K9X4M2) without ambiguous characters (O/0, I/1).
 */
export function generateUnique6CharRoomCode(
  existingCodes: ReadonlyArray<string> = []
): string {
  const existingSet = new Set(existingCodes.map((c) => c.toUpperCase()));
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += UNAMBIGUOUS_ROOM_CHARS[getRandomIndex(UNAMBIGUOUS_ROOM_CHARS.length)];
    }
    if (code !== 'BOBO' && !existingSet.has(code)) {
      return code;
    }
  }
  // Fallback guaranteed 6-char code
  let fallback = '';
  for (let i = 0; i < 6; i++) {
    fallback += UNAMBIGUOUS_ROOM_CHARS[getRandomIndex(UNAMBIGUOUS_ROOM_CHARS.length)];
  }
  return fallback;
}

const CUSTOM_SHARE_ORIGIN_KEY = 'rb_custom_share_origin';
const CACHED_LAN_ORIGIN_KEY = 'rb_cached_lan_origin';

let cachedLanOrigin: string | null = null;
let cachedLanIps: string[] = [];
let cachedLanPort: number = 3000;
let isFetchingLanInfo = false;
let inMemoryCustomShareOrigin: string | null = null;

try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    cachedLanOrigin = window.sessionStorage.getItem(CACHED_LAN_ORIGIN_KEY);
  }
} catch {
  // ignore storage errors
}

export function setCustomShareOrigin(origin: string | null): void {
  const cleaned = (origin || '').trim().replace(/\/+$/, '');
  inMemoryCustomShareOrigin = cleaned || null;
  try {
    if (typeof window === 'undefined') return;
    if (cleaned) {
      window.localStorage?.setItem(CUSTOM_SHARE_ORIGIN_KEY, cleaned);
    } else {
      window.localStorage?.removeItem(CUSTOM_SHARE_ORIGIN_KEY);
    }
    window.dispatchEvent(new CustomEvent('rb:lan-origin-updated'));
  } catch {
    // ignore
  }
}

export function getCustomShareOrigin(): string | null {
  if (inMemoryCustomShareOrigin) {
    return inMemoryCustomShareOrigin;
  }
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const saved = window.localStorage.getItem(CUSTOM_SHARE_ORIGIN_KEY);
    return saved ? saved.trim().replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
}

export async function fetchAndCacheLanOrigin(): Promise<{
  lanOrigin: string | null;
  allIps: string[];
  port: number;
}> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return { lanOrigin: cachedLanOrigin, allIps: cachedLanIps, port: cachedLanPort };
  }
  if (isFetchingLanInfo) {
    return { lanOrigin: cachedLanOrigin, allIps: cachedLanIps, port: cachedLanPort };
  }
  isFetchingLanInfo = true;
  try {
    if (!(await isApiAvailable())) {
      return { lanOrigin: cachedLanOrigin, allIps: cachedLanIps, port: cachedLanPort };
    }
    const res = await fetch('/api/network-info', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const port = Number(window.location.port) || Number(data?.port) || 3000;
      cachedLanPort = port;
      if (Array.isArray(data?.allIps)) {
        cachedLanIps = data.allIps;
      }
      if (data?.lanIp) {
        const computedOrigin = `http://${data.lanIp}:${port}`;
        const changed = computedOrigin !== cachedLanOrigin;
        cachedLanOrigin = computedOrigin;
        try {
          window.sessionStorage?.setItem(CACHED_LAN_ORIGIN_KEY, computedOrigin);
        } catch {
          // ignore
        }
        if (changed) {
          window.dispatchEvent(
            new CustomEvent('rb:lan-origin-updated', {
              detail: { lanOrigin: computedOrigin, allIps: cachedLanIps, port }
            })
          );
        }
      }
    }
  } catch {
    // On static web deployments without /api/network-info, window.location.origin is used directly
  } finally {
    isFetchingLanInfo = false;
  }
  return { lanOrigin: cachedLanOrigin, allIps: cachedLanIps, port: cachedLanPort };
}

export function getAvailableShareOrigins(): {
  currentOrigin: string;
  allLanOrigins: string[];
  isLocalhost: boolean;
  customOrigin: string | null;
} {
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const port =
    (typeof window !== 'undefined' && Number(window.location.port)) || cachedLanPort || 3000;
  const allLanOrigins = cachedLanIps.map((ip) => `http://${ip}:${port}`);
  return {
    currentOrigin: resolvePublicShareOrigin(),
    allLanOrigins,
    isLocalhost,
    customOrigin: getCustomShareOrigin()
  };
}

/**
 * Resolves the public origin for QR codes and share links:
 * 1) Uses explicit rawOrigin when provided (e.g. unit tests)
 * 2) Uses custom user override if configured
 * 3) Converts ais-pre- to ais-dev- on Cloud Run / AI Studio
 * 4) Automatically replaces localhost / 127.0.0.1 with the machine's Wi-Fi/LAN IPv4 address so phones on the same Wi-Fi can connect!
 * 5) Uses window.location.origin directly when deployed to the Web (Vercel, Netlify, Render, etc.)
 */
export function resolvePublicShareOrigin(rawOrigin?: string): string {
  if (rawOrigin !== undefined) {
    if (rawOrigin.includes('ais-pre-')) {
      return rawOrigin.replace('ais-pre-', 'ais-dev-');
    }
    return rawOrigin;
  }

  const customOverride = getCustomShareOrigin();
  if (customOverride) {
    return customOverride;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  if (origin.includes('ais-pre-')) {
    return origin.replace('ais-pre-', 'ais-dev-');
  }

  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    if (!cachedLanOrigin && !isFetchingLanInfo) {
      fetchAndCacheLanOrigin();
    }
    if (cachedLanOrigin) {
      return cachedLanOrigin;
    }
  }

  return origin;
}

/**
 * Creates a unique room session with a 6-character code, sessionKey, and ready-to-share URLs.
 */
export function createUniqueRoomSession(
  mode: ConnectionMode,
  activeGame: GameId | null = null,
  originOverride?: string,
  existingRoomCodeToAvoid?: string
): UniqueRoomSessionDescriptor {
  const roomCode = generateUnique6CharRoomCode(
    existingRoomCodeToAvoid ? [existingRoomCodeToAvoid, 'BOBO'] : ['BOBO']
  );
  const createdAt = Date.now();
  const sessionKey = `session_${roomCode}_${createdAt.toString(36)}`;
  const baseOrigin = resolvePublicShareOrigin(originOverride);
  // CRITICAL: NEVER pass mode=host in the QR code or share URL. Always enforce role=client!
  const joinUrl = `${baseOrigin}/?join=${roomCode}&role=client`;
  const whatsappText = encodeURIComponent(
    `🎉 Entre na nossa sala do Roda de Bobo!\n🔑 Código da Sala: *${roomCode}*\n👉 Clique para entrar direto: ${joinUrl}`
  );
  const whatsappShareUrl = `https://wa.me/?text=${whatsappText}`;

  return {
    roomCode,
    sessionKey,
    mode,
    activeGame,
    joinUrl,
    whatsappShareUrl,
    createdAt
  };
}

/**
 * Parses URL query string (`?join=K9X4M2`, `?room=K9X4M2`, `?role=client`, `?mode=multi|host|play|controller`)
 * to determine initial routing and quick-join behavior.
 */
export function parseRoomQueryParams(search: string): ParsedJoinQueryParams {
  const params = new URLSearchParams(search || '');
  const rawJoin = params.get('join');
  const rawRoom = params.get('room');
  const rawMode = (params.get('mode') || '').toLowerCase();
  const rawRole = (params.get('role') || '').toLowerCase();
  const rawPad = (params.get('pad') || '').toLowerCase();

  const joinCode = rawJoin ? sanitizeRoomCode(rawJoin) : null;
  const roomCode = rawRoom ? sanitizeRoomCode(rawRoom) : joinCode;
  const isPadMode = rawPad === '1' || rawPad === 'true' || rawMode === 'pad';

  // If a join code is present or role=client, it is ALWAYS a client controller
  const hasJoinParam = Boolean(joinCode && joinCode.length >= 3);

  let requestedMode: ConnectionMode | null = null;
  if (hasJoinParam || rawRole === 'client') {
    requestedMode = 'multi';
  } else if (rawMode === 'multi') {
    requestedMode = 'multi';
  } else if (rawMode === 'host') {
    requestedMode = 'host';
  } else if (rawMode === 'local') {
    requestedMode = 'local';
  }

  const isControllerView =
    hasJoinParam ||
    rawRole === 'client' ||
    isPadMode ||
    rawMode === 'controller' ||
    rawMode === 'play' ||
    rawMode === 'multi';

  return {
    joinCode: joinCode && joinCode.length >= 3 ? joinCode : null,
    roomCode: roomCode && roomCode.length >= 3 ? roomCode : null,
    requestedMode,
    shouldOpenQuickJoin: hasJoinParam && !isPadMode,
    isControllerView,
    isPadMode
  };
}

/**
 * Randomly selects a starting player from the roster using CSPRNG.
 */
export function drawRandomStartingPlayer(players: ReadonlyArray<Player>): Player | null {
  if (!players || players.length === 0) return null;
  const idx = getRandomIndex(players.length);
  return players[idx] || players[0] || null;
}

/**
 * Shuffles and balances players across active teams (2, 3, or 4 teams; defaults to 2).
 */
export function balancePlayersIntoTeams(
  players: ReadonlyArray<Player>,
  teamCount: 2 | 3 | 4 = 2
): Player[] {
  const copy = [...players];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  const activeTeams: TeamId[] =
    teamCount === 4
      ? ['A', 'B', 'C', 'D']
      : teamCount === 3
      ? ['A', 'B', 'C']
      : ['A', 'B'];
  return copy.map((player, idx) => ({
    ...player,
    team: activeTeams[idx % activeTeams.length] as TeamId
  }));
}

export const DIFFICULTY_META: Record<
  GameDifficulty,
  {
    id: GameDifficulty;
    label: string;
    shortLabel: string;
    badge: string;
    description: string;
  }
> = {
  facil: {
    id: 'facil',
    label: 'Fácil',
    shortLabel: 'Fácil',
    badge: 'Aquecimento',
    description: 'Perguntas diretas e cotidianas para aquecer a roda.'
  },
  medio: {
    id: 'medio',
    label: 'Médio',
    shortLabel: 'Médio',
    badge: 'Equilibrado',
    description: 'Desafio moderado com curiosidades e cultura pop.'
  },
  dificil: {
    id: 'dificil',
    label: 'Difícil (Padrão)',
    shortLabel: 'Difícil',
    badge: 'Padrão Oficial',
    description: 'Nível clássico do Roda de Bobo: exige raciocínio rápido e criatividade.'
  },
  impossivel: {
    id: 'impossivel',
    label: 'Impossível',
    shortLabel: 'Impossível',
    badge: 'Hardcore 🔥',
    description: 'Perguntas insanas, específicas e restrições máximas para veteranos.'
  }
};
