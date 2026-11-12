import type { GameRoom, GameId } from '../types/game';

export const ROOM_STORAGE_PREFIX = 'rb_room_state_';export const GLOBAL_ROOM_STORAGE_KEY = 'roda_de_bobo_room_state';export const ACTIVE_STATE_STORAGE_KEY = 'RODA_DE_BOBO_ACTIVE_STATE';/** INF-05: versão do formato salvo. Estados de versão maior (ou com forma inválida) são descartados; sem versão = legado, aceito e regravado. */
export const ROOM_SCHEMA_VERSION = 2;function hasValidRoomShape(parsed: any): boolean {
  if (typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > ROOM_SCHEMA_VERSION) return false;
  if (parsed.players !== undefined && !Array.isArray(parsed.players)) return false;
  if (parsed.teams !== undefined && (parsed.teams === null || typeof parsed.teams !== 'object')) return false;
  return true;
}/**
 * Returns true for games where the team/dupla plays and scores together as a collective unit
 * (so MVP must NOT be counted individually).
 */
export function isTeamCollectiveGame(gameId?: GameId | null): boolean {
  return gameId === 'tem-ou-nao-tem' || gameId === 'proibido' || gameId === 'duvido' || gameId === 'mimica' || gameId === 'mega-resenha' || gameId === 'repetente' || gameId === 'como-eu-pinto';
}/**
 * Computes the number of session trophies (🏆) earned by each player in the current session.
 */
export function computePlayerSessionTrophies(room: GameRoom | null | undefined): Record<string, number> {
  const trophies: Record<string, number> = {};
  if (!room) return trophies;

  const history = room.sessionStats?.history || [];
  history.forEach((entry) => {
    const isCollective = isTeamCollectiveGame(entry.gameId);
    if (!isCollective && entry.mvp?.playerId) {
      trophies[entry.mvp.playerId] = (trophies[entry.mvp.playerId] || 0) + 1;
    }
    if (
      entry.winnerTeam === 'A' ||
      entry.winnerTeam === 'B' ||
      entry.winnerTeam === 'C' ||
      entry.winnerTeam === 'D'
    ) {
      (entry.playerScores || []).forEach((ps) => {
        if (ps.team === entry.winnerTeam) {
          trophies[ps.id] = (trophies[ps.id] || 0) + 1;
        }
      });
    }
  });

  return trophies;
}/**
 * Determines whether a room state has meaningful progress worth persisting in localStorage.
 */
export function isRoomWorthSaving(room: GameRoom | null | undefined): boolean {
  if (!room || !room.roomId) return false;
  return (
    room.screen !== 'lobby' ||
    room.activeGame !== null ||
    room.roundNumber > 1 ||
    (room.teams?.A?.score || 0) > 0 ||
    (room.teams?.B?.score || 0) > 0 ||
    (room.sessionStats?.totalMatches || 0) > 0 ||
    (room.players?.length || 0) > 0
  );
}/**
 * Determines whether a saved room state represents an active or resumable session
 * that should trigger the 'Resume Game' prompt in the Lobby after a browser refresh.
 */
export function isResumableGame(room: GameRoom | null | undefined): boolean {
  if (!room || !room.roomId) return false;
  return (
    room.screen !== 'lobby' ||
    room.activeGame !== null ||
    room.roundNumber > 1
  );
}/**
 * Computes the accurate match score for a resumable room without double-counting
 * round scores that have already been accumulated into team totals at round end / game over.
 */
export function getResumableMatchScore(room: GameRoom): { scoreA: number; scoreB: number } {
  const baseA = room.teams?.A?.score || 0;
  const baseB = room.teams?.B?.score || 0;

  if (room.screen !== 'playing') {
    return { scoreA: baseA, scoreB: baseB };
  }

  let liveRoundA = 0;
  let liveRoundB = 0;

  if (room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem) {
    liveRoundA = room.temOuNaoTem.roundScore?.A || 0;
    liveRoundB = room.temOuNaoTem.roundScore?.B || 0;
  } else if (room.activeGame === 'proibido' && room.proibido) {
    if (room.proibido.speakerTeam === 'A') {
      liveRoundA = room.proibido.roundScore || 0;
    } else {
      liveRoundB = room.proibido.roundScore || 0;
    }
  }

  return {
    scoreA: baseA + liveRoundA,
    scoreB: baseB + liveRoundB
  };
}/**
 * Persists the current GameRoom state into localStorage.
 */
export function saveRoomStateToStorage(
  room: GameRoom,
  storage?: Pick<Storage, 'setItem'>
): boolean {
  if (!isRoomWorthSaving(room)) return false;

  const targetStorage =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!targetStorage) return false;

  try {
    const serialized = JSON.stringify({ ...room, schemaVersion: ROOM_SCHEMA_VERSION });
    const roomKey = `${ROOM_STORAGE_PREFIX}${room.roomId.toUpperCase()}`;
    targetStorage.setItem(roomKey, serialized);
    targetStorage.setItem(GLOBAL_ROOM_STORAGE_KEY, serialized);
    targetStorage.setItem(ACTIVE_STATE_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}/**
 * Loads a previously saved GameRoom state from localStorage for the given roomId.
 */
export function loadRoomStateFromStorage(
  roomId: string,
  storage?: Pick<Storage, 'getItem'>
): GameRoom | null {
  const targetStorage =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!targetStorage) return null;

  try {
    const normalizedId = roomId.toUpperCase();
    const roomKey = `${ROOM_STORAGE_PREFIX}${normalizedId}`;
    const raw =
      targetStorage.getItem(roomKey) ||
      targetStorage.getItem(GLOBAL_ROOM_STORAGE_KEY) ||
      targetStorage.getItem(ACTIVE_STATE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GameRoom;
    if (!parsed || typeof parsed !== 'object' || !parsed.roomId) return null;
    if (!hasValidRoomShape(parsed)) return null;
    if (parsed.roomId.toUpperCase() !== normalizedId) return null;
    if (!isRoomWorthSaving(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}/**
 * Clears the persisted GameRoom state from localStorage for the given roomId.
 */
export function clearRoomStateFromStorage(
  roomId: string,
  storage?: Pick<Storage, 'removeItem'>
): void {
  const targetStorage =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!targetStorage) return;

  try {
    const roomKey = `${ROOM_STORAGE_PREFIX}${roomId.toUpperCase()}`;
    targetStorage.removeItem(roomKey);
    targetStorage.removeItem(GLOBAL_ROOM_STORAGE_KEY);
    targetStorage.removeItem(ACTIVE_STATE_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}