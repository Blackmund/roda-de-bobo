import type {
  GameRoom,
  GameId,
  Player,
  TeamId,
  PlayerScoreSnapshot,
  GameHistoryEntry,
  MatchMVPSnapshot,
  RoundActivityEvent,
  SessionStats
} from '../types/game';

export const ROOM_STORAGE_PREFIX = 'rb_room_state_';
export const GLOBAL_ROOM_STORAGE_KEY = 'roda_de_bobo_room_state';
export const ACTIVE_STATE_STORAGE_KEY = 'RODA_DE_BOBO_ACTIVE_STATE';

/** INF-05: versão do formato salvo. Estados de versão maior (ou com forma inválida) são descartados; sem versão = legado, aceito e regravado. */
export const ROOM_SCHEMA_VERSION = 2;

function hasValidRoomShape(parsed: any): boolean {
  if (typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > ROOM_SCHEMA_VERSION) return false;
  if (parsed.players !== undefined && !Array.isArray(parsed.players)) return false;
  if (parsed.teams !== undefined && (parsed.teams === null || typeof parsed.teams !== 'object')) return false;
  return true;
}

export interface MVPHistoryItem {
  matchId: string;
  gameName: string;
  theme: string;
  timestamp: number;
  playerId: string;
  name: string;
  avatar: string;
  team: TeamId;
  teamName: string;
  score: number;
  roundsPlayed: number;
  accuracy: number;
}

export interface MVPStats {
  playerId: string;
  name: string;
  avatar: string;
  team: TeamId;
  teamName: string;
  score: number;
  roundsPlayed: number;
  roundsWon: number;
  accuracy: number;
  matchesWon: number;
  highlightReason: string;
}

/**
 * Returns true for games where the team/dupla plays and scores together as a collective unit
 * (so MVP must NOT be counted individually).
 */
export function isTeamCollectiveGame(gameId?: GameId | null): boolean {
  return gameId === 'tem-ou-nao-tem' || gameId === 'proibido' || gameId === 'duvido' || gameId === 'mimica';
}

/**
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
}

/**
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
}

/**
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
}

/**
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
}

/**
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
}

/**
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
}

/**
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

/**
 * Accumulates individual player scores and individual performance metrics
 * (roundsPlayed, roundsWon, accuracy) at the end of a round across all 5 game modes.
 */
export function accumulateRoundPlayerScores(room: GameRoom): Player[] {
  if (!room.players || room.players.length === 0) return [];

  const deltas: Record<string, number> = {};

  if (room.activeGame === 'limite' && room.limite) {
    Object.entries(room.limite.pointsAwarded || {}).forEach(([pid, pts]) => {
      deltas[pid] = (deltas[pid] || 0) + pts;
    });
  } else if (room.activeGame === 'nota' && room.nota) {
    Object.entries(room.nota.pointsAwarded || {}).forEach(([pid, pts]) => {
      deltas[pid] = (deltas[pid] || 0) + pts;
    });
  } else if (room.activeGame === 'proibido' && room.proibido) {
    const score = room.proibido.roundScore || 0;
    if (score > 0) {
      if (room.proibido.is2PlayerMode || room.players.length === 2) {
        // In 2-player cooperative mode, both players score together!
        room.players.forEach((p) => {
          deltas[p.id] = (deltas[p.id] || 0) + score;
        });
      } else {
        room.players.forEach((p) => {
          if (p.team === room.proibido?.speakerTeam) {
            deltas[p.id] = (deltas[p.id] || 0) + score;
          }
        });
      }
    }
  } else if (room.activeGame === 'duvido' && room.duvido) {
    const winTeam = room.duvido.resultWinnerTeam;
    if (winTeam === 'A' || winTeam === 'B' || winTeam === 'C' || winTeam === 'D') {
      room.players.forEach((p) => {
        if (p.team === winTeam) {
          deltas[p.id] = (deltas[p.id] || 0) + 1;
        }
      });
    }
  } else if (room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem) {
    const roundScores = room.temOuNaoTem.roundScore;

    room.players.forEach((p) => {
      const teamScore = (roundScores as Record<string, number | undefined>)[p.team] || 0;
      if (teamScore > 0) {
        deltas[p.id] = (deltas[p.id] || 0) + teamScore;
      }
    });
  }

  return room.players.map((p) => {
    const gained = deltas[p.id] || 0;
    const prevRoundsPlayed = p.roundsPlayed || 0;
    const prevRoundsWon = p.roundsWon || 0;
    const roundsPlayed = prevRoundsPlayed + 1;
    const roundsWon = prevRoundsWon + (gained > 0 ? 1 : 0);
    const accuracy = Math.min(100, Math.max(0, Math.round((roundsWon / roundsPlayed) * 100)));

    return {
      ...p,
      score: Math.max(0, (p.score || 0) + gained),
      roundsPlayed,
      roundsWon,
      accuracy
    };
  });
}

/**
 * UX-15: MVP da PARTIDA ATUAL. Usa apenas os jogadores da sala (placar e métricas são zerados a cada
 * início de partida), sem olhar o histórico da sessão. Evita mostrar, no fim de um jogo, o MVP (e os
 * pontos) de uma partida anterior. Sem jogadores, cai no cálculo da sessão.
 */
export function computeMatchMVP(room: GameRoom): MVPStats {
  const players = room.players || [];
  if (players.length === 0) return computeSessionMVP(room);

  const top = [...players].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.roundsWon || 0) !== (a.roundsWon || 0)) return (b.roundsWon || 0) - (a.roundsWon || 0);
    return a.name.localeCompare(b.name);
  })[0];

  const roundsPlayed = Math.max(1, top.roundsPlayed || room.roundNumber || room.maxRounds || 1);
  const roundsWon = top.roundsWon || 0;
  const accuracy =
    typeof top.accuracy === 'number' && top.accuracy > 0
      ? top.accuracy
      : Math.round((roundsWon / roundsPlayed) * 100);
  const teamName = room.teams?.[top.team]?.name || `Equipe ${top.team}`;
  const sessionVictories = room.sessionStats as unknown as Record<string, number | undefined>;

  return {
    playerId: top.id,
    name: top.name,
    avatar: top.avatar || '🦁',
    team: top.team,
    teamName,
    score: top.score || 0,
    roundsPlayed,
    roundsWon,
    accuracy,
    matchesWon: sessionVictories?.[`victories${top.team}`] || 0,
    highlightReason: 'Maior pontuação individual da partida'
  };
}

/**
 * Computes the 'Most Valuable Player' (MVP) highlight based on the highest individual score
 * in the session history and current room players, including individual performance metrics.
 */
export function computeSessionMVP(room: GameRoom): MVPStats {
  const teamAName = room.teams?.A?.name || 'Equipe Alfa';
  const teamBName = room.teams?.B?.name || 'Equipe Bravo';
  const victoriesA = room.sessionStats?.victoriesA || 0;
  const victoriesB = room.sessionStats?.victoriesB || 0;
  const history = room.sessionStats?.history || [];
  const defaultSessionRounds =
    history.length > 0
      ? history[history.length - 1].roundsPlayed || room.maxRounds || 3
      : room.maxRounds || room.roundNumber || 3;

  // Map playerId -> best/accumulated individual record across session history + live players
  const candidateMap = new Map<
    string,
    {
      id: string;
      name: string;
      avatar: string;
      team: TeamId;
      highestScore: number;
      roundsPlayed: number;
      roundsWon: number;
      accuracy: number;
      hasExplicitMetrics: boolean;
      lastGameName: string;
    }
  >();

  // 1. Inspect session history snapshots
  history.forEach((entry) => {
    if (entry.playerScores && entry.playerScores.length > 0) {
      entry.playerScores.forEach((ps: PlayerScoreSnapshot) => {
        const existing = candidateMap.get(ps.id);
        const hasMetrics =
          typeof ps.roundsPlayed === 'number' || typeof ps.accuracy === 'number';
        const rp = ps.roundsPlayed ?? existing?.roundsPlayed ?? entry.roundsPlayed ?? defaultSessionRounds;
        const rw = ps.roundsWon ?? existing?.roundsWon ?? (ps.score > 0 ? rp : 0);
        const acc =
          typeof ps.accuracy === 'number'
            ? ps.accuracy
            : rp > 0
            ? Math.round((rw / rp) * 100)
            : 0;

        if (!existing || ps.score >= existing.highestScore) {
          candidateMap.set(ps.id, {
            id: ps.id,
            name: ps.name,
            avatar: ps.avatar || '👑',
            team: ps.team,
            highestScore: Math.max(existing?.highestScore || 0, ps.score),
            roundsPlayed: rp,
            roundsWon: rw,
            accuracy: acc,
            hasExplicitMetrics: Boolean(existing?.hasExplicitMetrics || hasMetrics),
            lastGameName: entry.gameName
          });
        }
      });
    }
  });

  // 2. Merge live players from the room
  (room.players || []).forEach((p) => {
    const existing = candidateMap.get(p.id);
    const bestScore = Math.max(existing?.highestScore || 0, p.score || 0);
    const hasPlayerMetrics =
      (typeof p.roundsPlayed === 'number' && p.roundsPlayed > 0) ||
      (typeof p.accuracy === 'number' && p.accuracy > 0);

    const rp = hasPlayerMetrics
      ? p.roundsPlayed || defaultSessionRounds
      : existing?.hasExplicitMetrics
      ? existing.roundsPlayed
      : p.roundsPlayed || existing?.roundsPlayed || defaultSessionRounds;

    const rw = hasPlayerMetrics
      ? p.roundsWon ?? Math.max(1, Math.round(((p.accuracy ?? 100) / 100) * rp))
      : existing?.hasExplicitMetrics
      ? existing.roundsWon
      : p.roundsWon ?? existing?.roundsWon ?? (bestScore > 0 ? rp : 0);

    const acc = hasPlayerMetrics
      ? p.accuracy ?? (rp > 0 ? Math.round((rw / rp) * 100) : 0)
      : existing?.hasExplicitMetrics
      ? existing.accuracy
      : typeof p.accuracy === 'number' && p.accuracy > 0
      ? p.accuracy
      : rp > 0 && bestScore > 0
      ? Math.round((rw / rp) * 100)
      : 0;

    candidateMap.set(p.id, {
      id: p.id,
      name: p.name,
      avatar: p.avatar || '🦁',
      team: p.team,
      highestScore: bestScore,
      roundsPlayed: rp,
      roundsWon: rw,
      accuracy: acc,
      hasExplicitMetrics: Boolean(hasPlayerMetrics || existing?.hasExplicitMetrics),
      lastGameName:
        existing?.lastGameName ||
        (history.length > 0 ? history[history.length - 1].gameName : 'Sessão Atual')
    });
  });

  // If we have registered players in candidateMap, pick the highest scorer
  if (candidateMap.size > 0) {
    const sorted = Array.from(candidateMap.values()).sort((a, b) => {
      if (b.highestScore !== a.highestScore) {
        return b.highestScore - a.highestScore;
      }
      // Tie-breaker 1: current match team score
      const matchScoreA = a.team === 'A' ? room.teams.A.score : room.teams.B.score;
      const matchScoreB = b.team === 'A' ? room.teams.A.score : room.teams.B.score;
      if (matchScoreB !== matchScoreA) return matchScoreB - matchScoreA;

      // Tie-breaker 2: session victories
      const vicA = a.team === 'A' ? victoriesA : victoriesB;
      const vicB = b.team === 'A' ? victoriesA : victoriesB;
      return vicB - vicA;
    });

    const top = sorted[0];
    const teamName = top.team === 'A' ? teamAName : teamBName;
    const matchesWon = top.team === 'A' ? victoriesA : victoriesB;
    // If all individual scores were 0 (e.g. players joined after rounds), use the team's best score
    const effectiveScore =
      top.highestScore > 0
        ? top.highestScore
        : top.team === 'A'
        ? Math.max(room.teams.A.score, room.sessionStats.totalPointsA)
        : Math.max(room.teams.B.score, room.sessionStats.totalPointsB);

    const effectiveRoundsPlayed = Math.max(1, top.roundsPlayed || defaultSessionRounds);
    const effectiveRoundsWon =
      top.roundsWon > 0
        ? top.roundsWon
        : effectiveScore > 0
        ? effectiveRoundsPlayed
        : 0;
    const effectiveAccuracy =
      top.accuracy > 0
        ? top.accuracy
        : effectiveScore > 0
        ? Math.round((effectiveRoundsWon / effectiveRoundsPlayed) * 100)
        : 0;

    return {
      playerId: top.id,
      name: top.name,
      avatar: top.avatar,
      team: top.team,
      teamName,
      score: effectiveScore,
      roundsPlayed: effectiveRoundsPlayed,
      roundsWon: effectiveRoundsWon,
      accuracy: effectiveAccuracy,
      matchesWon,
      highlightReason: `Maior pontuação individual da sessão (${top.lastGameName})`
    };
  }

  // Fallback when playing in TV-only mode without mobile controllers connected:
  // Derive MVP from the highest single-match/session performance in sessionStats.history
  let bestHistoryScoreA = room.teams?.A?.score || 0;
  let bestHistoryScoreB = room.teams?.B?.score || 0;
  let bestGameName = history.length > 0 ? history[history.length - 1].gameName : 'Partida Final';

  history.forEach((h) => {
    if (h.scoreA > bestHistoryScoreA) {
      bestHistoryScoreA = h.scoreA;
      bestGameName = h.gameName;
    }
    if (h.scoreB > bestHistoryScoreB) {
      bestHistoryScoreB = h.scoreB;
      bestGameName = h.gameName;
    }
  });

  const totalA = Math.max(room.sessionStats?.totalPointsA || 0, bestHistoryScoreA);
  const totalB = Math.max(room.sessionStats?.totalPointsB || 0, bestHistoryScoreB);
  const isTeamAMvp = totalA >= totalB;
  const mvpTeam: TeamId = isTeamAMvp ? 'A' : 'B';
  const mvpTeamName = isTeamAMvp ? teamAName : teamBName;
  const mvpScore = isTeamAMvp ? totalA : totalB;
  const mvpWins = isTeamAMvp ? victoriesA : victoriesB;

  return {
    playerId: `mvp-team-${mvpTeam.toLowerCase()}`,
    name: `Capitão ${mvpTeamName}`,
    avatar: isTeamAMvp ? '🦁' : '🦊',
    team: mvpTeam,
    teamName: mvpTeamName,
    score: mvpScore,
    roundsPlayed: defaultSessionRounds,
    roundsWon: mvpScore > 0 ? defaultSessionRounds : 0,
    accuracy: mvpScore > 0 ? 100 : 0,
    matchesWon: mvpWins,
    highlightReason: `Líder de pontuação no histórico da sessão (${bestGameName})`
  };
}

/**
 * Formats the match results summary text including the MVP player's name, total points,
 * and individual performance metrics.
 */
export function formatMatchResultsShareText(room: GameRoom, mvp: MVPStats): string {
  const teamAName = room.teams?.A?.name || 'Equipe Alfa';
  const teamBName = room.teams?.B?.name || 'Equipe Bravo';
  const scoreA = room.teams?.A?.score ?? 0;
  const scoreB = room.teams?.B?.score ?? 0;

  const outcomeLine =
    scoreA > scoreB
      ? `Vitória: ${teamAName} (${scoreA} PTS x ${scoreB} PTS ${teamBName})`
      : scoreB > scoreA
      ? `Vitória: ${teamBName} (${scoreB} PTS x ${scoreA} PTS ${teamAName})`
      : `Empate: ${teamAName} ${scoreA} PTS x ${scoreB} PTS ${teamBName}`;

  return [
    `🏆 RODA DE BOBO — Resultado da Partida (Sala ${room.roomId})`,
    outcomeLine,
    `👑 MVP: ${mvp.name} (${mvp.teamName}) — ${mvp.score} PTS`,
    `📊 Performance: Accuracy ${mvp.accuracy}% | Rounds Played: ${mvp.roundsPlayed}`
  ].join('\n');
}

/**
 * Shares or copies the match results summary using the Web Share API (`navigator.share`)
 * with automatic clipboard write (`navigator.clipboard.writeText`) so the summary text
 * is always copied/shared across mobile and desktop browsers.
 */
export async function shareMatchResults(
  room: GameRoom,
  mvp: MVPStats,
  nav?: {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    clipboard?: { writeText?: (text: string) => Promise<void> };
  }
): Promise<{ success: boolean; method: 'web-share' | 'clipboard'; text: string }> {
  const text = formatMatchResultsShareText(room, mvp);
  const targetNav =
    nav ??
    (typeof navigator !== 'undefined'
      ? (navigator as unknown as {
          share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
          clipboard?: { writeText?: (text: string) => Promise<void> };
        })
      : undefined);

  let copiedToClipboard = false;
  if (targetNav?.clipboard && typeof targetNav.clipboard.writeText === 'function') {
    try {
      await targetNav.clipboard.writeText(text);
      copiedToClipboard = true;
    } catch {
      // Ignore clipboard write errors when permissions are restricted
    }
  }

  if (targetNav && typeof targetNav.share === 'function') {
    try {
      await targetNav.share({
        title: `Roda de Bobo — Resultado da Partida (${room.roomId})`,
        text
      });
      return { success: true, method: 'web-share', text };
    } catch {
      if (copiedToClipboard) {
        return { success: true, method: 'clipboard', text };
      }
    }
  }

  return {
    success: copiedToClipboard,
    method: 'clipboard',
    text
  };
}

/**
 * Resolves the Match MVP snapshot for a specific GameHistoryEntry session.
 */
export function resolveMatchMVPFromHistoryEntry(
  entry: GameHistoryEntry,
  teamAName = 'Equipe Alfa',
  teamBName = 'Equipe Bravo'
): MVPHistoryItem {
  const defaultRounds = Math.max(1, entry.roundsPlayed || 3);

  if (entry.mvp) {
    const teamName = entry.mvp.team === 'A' ? teamAName : teamBName;
    const rp = Math.max(1, entry.mvp.roundsPlayed || defaultRounds);
    const acc =
      typeof entry.mvp.accuracy === 'number'
        ? entry.mvp.accuracy
        : entry.mvp.score > 0
        ? 100
        : 0;
    return {
      matchId: entry.id,
      gameName: entry.gameName,
      theme: entry.theme,
      timestamp: entry.timestamp,
      playerId: entry.mvp.playerId,
      name: entry.mvp.name,
      avatar: entry.mvp.avatar || '👑',
      team: entry.mvp.team,
      teamName,
      score: entry.mvp.score,
      roundsPlayed: rp,
      accuracy: acc
    };
  }

  if (entry.playerScores && entry.playerScores.length > 0) {
    const sorted = [...entry.playerScores].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const teamScoreA = a.team === 'A' ? entry.scoreA : entry.scoreB;
      const teamScoreB = b.team === 'A' ? entry.scoreA : entry.scoreB;
      return teamScoreB - teamScoreA;
    });

    const top = sorted[0];
    const teamName = top.team === 'A' ? teamAName : teamBName;
    const effectiveScore =
      top.score > 0 ? top.score : top.team === 'A' ? entry.scoreA : entry.scoreB;
    const rp = Math.max(1, top.roundsPlayed || defaultRounds);
    const rw =
      typeof top.roundsWon === 'number'
        ? top.roundsWon
        : effectiveScore > 0
        ? rp
        : 0;
    const acc =
      typeof top.accuracy === 'number'
        ? top.accuracy
        : rp > 0 && effectiveScore > 0
        ? Math.round((rw / rp) * 100)
        : 0;

    return {
      matchId: entry.id,
      gameName: entry.gameName,
      theme: entry.theme,
      timestamp: entry.timestamp,
      playerId: top.id,
      name: top.name,
      avatar: top.avatar || '🦁',
      team: top.team,
      teamName,
      score: effectiveScore,
      roundsPlayed: rp,
      accuracy: acc
    };
  }

  const isTeamAMvp = entry.scoreA >= entry.scoreB;
  const team: TeamId = isTeamAMvp ? 'A' : 'B';
  const teamName = isTeamAMvp ? teamAName : teamBName;
  const score = isTeamAMvp ? entry.scoreA : entry.scoreB;

  return {
    matchId: entry.id,
    gameName: entry.gameName,
    theme: entry.theme,
    timestamp: entry.timestamp,
    playerId: `mvp-team-${team.toLowerCase()}-${entry.id}`,
    name: `Capitão ${teamName}`,
    avatar: isTeamAMvp ? '🦁' : '🦊',
    team,
    teamName,
    score,
    roundsPlayed: defaultRounds,
    accuracy: score > 0 ? 100 : 0
  };
}

/**
 * Builds a reverse-chronological list of previous match MVPs from SessionStats.history.
 */
export function getSessionMVPHistory(
  stats: SessionStats,
  teamAName = 'Equipe Alfa',
  teamBName = 'Equipe Bravo'
): MVPHistoryItem[] {
  if (!stats?.history || stats.history.length === 0) return [];
  return stats.history
    .slice()
    .reverse()
    .map((entry) => resolveMatchMVPFromHistoryEntry(entry, teamAName, teamBName));
}

/**
 * Creates a MatchMVPSnapshot for storing directly inside a new GameHistoryEntry.
 */
export function buildMatchMVPSnapshot(
  players: Player[],
  scoreA: number,
  scoreB: number,
  maxRounds: number,
  teamAName = 'Equipe Alfa',
  teamBName = 'Equipe Bravo'
): MatchMVPSnapshot {
  if (players && players.length > 0) {
    const sorted = [...players].sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      const tA = a.team === 'A' ? scoreA : scoreB;
      const tB = b.team === 'A' ? scoreA : scoreB;
      return tB - tA;
    });
    const top = sorted[0];
    const effectiveScore =
      (top.score || 0) > 0 ? top.score : top.team === 'A' ? scoreA : scoreB;
    const rp = Math.max(1, top.roundsPlayed || maxRounds || 3);
    const rw =
      typeof top.roundsWon === 'number'
        ? top.roundsWon
        : effectiveScore > 0
        ? rp
        : 0;
    const acc =
      typeof top.accuracy === 'number'
        ? top.accuracy
        : Math.round((rw / rp) * 100);

    return {
      playerId: top.id,
      name: top.name,
      avatar: top.avatar || '🦁',
      team: top.team,
      score: effectiveScore,
      roundsPlayed: rp,
      roundsWon: rw,
      accuracy: acc
    };
  }

  const isTeamAMvp = scoreA >= scoreB;
  const team: TeamId = isTeamAMvp ? 'A' : 'B';
  const teamName = isTeamAMvp ? teamAName : teamBName;
  const score = isTeamAMvp ? scoreA : scoreB;
  const rp = Math.max(1, maxRounds || 3);

  return {
    playerId: `mvp-team-${team.toLowerCase()}`,
    name: `Capitão ${teamName}`,
    avatar: isTeamAMvp ? '🦁' : '🦊',
    team,
    score,
    roundsPlayed: rp,
    roundsWon: score > 0 ? rp : 0,
    accuracy: score > 0 ? 100 : 0
  };
}

/**
 * Builds a collective Dupla/Equipe highlight snapshot for team-scored games
 * ('tem-ou-nao-tem', 'proibido', 'duvido') where teammates play and score together
 * and no single individual MVP should be counted.
 */
export function buildTeamCollectiveMVPSnapshot(
  players: Player[],
  winnerTeam: TeamId | 'EMPATE',
  maxTeamScore: number,
  maxRounds: number,
  teamsRecord: GameRoom['teams']
): MatchMVPSnapshot {
  const effectiveTeam: TeamId = winnerTeam === 'EMPATE' ? 'A' : winnerTeam;
  const teamObj = teamsRecord?.[effectiveTeam];
  const teamName = teamObj?.name || `Equipe ${effectiveTeam}`;
  const teamMembers = (players || []).filter((p) => p.team === effectiveTeam);
  const memberNames = teamMembers.map((p) => p.name).join(' & ');
  const collectiveLabel =
    winnerTeam === 'EMPATE'
      ? 'Empate entre Equipes'
      : memberNames
      ? `${teamName} (${memberNames})`
      : teamName;
  const rp = Math.max(1, teamMembers[0]?.roundsPlayed || maxRounds || 3);
  const rw =
    typeof teamMembers[0]?.roundsWon === 'number'
      ? teamMembers[0].roundsWon
      : maxTeamScore > 0
      ? rp
      : 0;
  const acc =
    typeof teamMembers[0]?.accuracy === 'number'
      ? teamMembers[0].accuracy
      : Math.round((rw / rp) * 100);

  return {
    playerId: `mvp-team-collective-${effectiveTeam.toLowerCase()}`,
    name: collectiveLabel,
    avatar: '🤝',
    team: effectiveTeam,
    score: maxTeamScore,
    roundsPlayed: rp,
    roundsWon: rw,
    accuracy: acc
  };
}

const DEFAULT_GAME_NAMES: Record<GameId, string> = {
  limite: 'JOGO DO LIMITE',
  duvido: 'JOGO DO DUVIDO',
  proibido: 'JOGO DO PROIBIDO',
  nota: 'JOGO DA NOTA',
  'tem-ou-nao-tem': 'TEM OU NÃO TEM',
  'perguntas-e-verdades': 'PERGUNTAS E VERDADES',
  mimica: 'JOGO DA MÍMICA'
};

/**
 * Builds a single RoundActivityEvent when a round finishes.
 */
export function buildRoundActivityEvent(
  room: GameRoom,
  roundPointsA: number,
  roundPointsB: number,
  cumulativeScoreA: number,
  cumulativeScoreB: number,
  customGameName?: string
): RoundActivityEvent {
  const roundNumber = Math.max(1, room.roundNumber || 1);
  const gameId: GameId = room.activeGame || 'limite';
  const gameName = customGameName || DEFAULT_GAME_NAMES[gameId] || 'PARTIDA';
  const teamAName = room.teams?.A?.name || 'Equipe Alfa';
  const teamBName = room.teams?.B?.name || 'Equipe Bravo';

  const winnerTeam: TeamId | 'EMPATE' =
    roundPointsA > roundPointsB ? 'A' : roundPointsB > roundPointsA ? 'B' : 'EMPATE';

  const headline =
    winnerTeam === 'A'
      ? `Team A won Round ${roundNumber}`
      : winnerTeam === 'B'
      ? `Team B won Round ${roundNumber}`
      : `Round ${roundNumber} tied — Team A vs Team B`;

  const subheadline =
    winnerTeam === 'A'
      ? `${teamAName} (+${roundPointsA} PTS) superou ${teamBName} (+${roundPointsB} PTS)`
      : winnerTeam === 'B'
      ? `${teamBName} (+${roundPointsB} PTS) superou ${teamAName} (+${roundPointsA} PTS)`
      : `${teamAName} (+${roundPointsA} PTS) empatou com ${teamBName} (+${roundPointsB} PTS)`;

  const winningPlayers = (room.players || []).filter(
    (p) => winnerTeam !== 'EMPATE' && p.team === winnerTeam
  );
  const topPlayerName = winningPlayers.length > 0 ? winningPlayers[0].name : undefined;

  return {
    id: `round_${roundNumber}_${Date.now()}`,
    roundNumber,
    gameId,
    gameName,
    winnerTeam,
    pointsA: roundPointsA,
    pointsB: roundPointsB,
    cumulativeScoreA,
    cumulativeScoreB,
    headline,
    subheadline,
    topPlayerName,
    timestamp: Date.now()
  };
}

/**
 * Retrieves the chronological Round Activity Log for the current/completed match.
 * Falls back to the latest GameHistoryEntry.roundLog or deterministically synthesizes
 * round events if a match state reached game-over without explicit roundLog entries.
 */
export function getMatchRoundActivityLog(room: GameRoom): RoundActivityEvent[] {
  if (room.roundLog && room.roundLog.length > 0) {
    return [...room.roundLog].sort((a, b) => a.roundNumber - b.roundNumber);
  }

  const history = room.sessionStats?.history || [];
  const latestHistory = history.length > 0 ? history[history.length - 1] : undefined;

  if (latestHistory?.roundLog && latestHistory.roundLog.length > 0) {
    return [...latestHistory.roundLog].sort((a, b) => a.roundNumber - b.roundNumber);
  }

  const totalRounds = Math.max(1, latestHistory?.roundsPlayed || room.maxRounds || 3);
  const finalScoreA = latestHistory ? latestHistory.scoreA : room.teams?.A?.score || 0;
  const finalScoreB = latestHistory ? latestHistory.scoreB : room.teams?.B?.score || 0;
  const gameId: GameId = latestHistory?.gameId || room.activeGame || 'limite';
  const gameName = latestHistory?.gameName || DEFAULT_GAME_NAMES[gameId] || 'PARTIDA';
  const teamAName = room.teams?.A?.name || 'Equipe Alfa';
  const teamBName = room.teams?.B?.name || 'Equipe Bravo';

  const events: RoundActivityEvent[] = [];
  let remA = finalScoreA;
  let remB = finalScoreB;
  let cumA = 0;
  let cumB = 0;

  for (let r = 1; r <= totalRounds; r++) {
    const isLast = r === totalRounds;
    let ptsA = 0;
    let ptsB = 0;

    if (isLast) {
      ptsA = remA;
      ptsB = remB;
    } else {
      const roundsLeft = totalRounds - r + 1;
      if (r % 2 === 1) {
        ptsA = Math.ceil(remA / roundsLeft);
        ptsB = Math.floor(remB / (roundsLeft + 1));
      } else {
        ptsA = Math.floor(remA / (roundsLeft + 1));
        ptsB = Math.ceil(remB / roundsLeft);
      }
      remA = Math.max(0, remA - ptsA);
      remB = Math.max(0, remB - ptsB);
    }

    cumA += ptsA;
    cumB += ptsB;

    const winnerTeam: TeamId | 'EMPATE' =
      ptsA > ptsB ? 'A' : ptsB > ptsA ? 'B' : 'EMPATE';

    const headline =
      winnerTeam === 'A'
        ? `Team A won Round ${r}`
        : winnerTeam === 'B'
        ? `Team B won Round ${r}`
        : `Round ${r} tied — Team A vs Team B`;

    const subheadline =
      winnerTeam === 'A'
        ? `${teamAName} (+${ptsA} PTS) superou ${teamBName} (+${ptsB} PTS)`
        : winnerTeam === 'B'
        ? `${teamBName} (+${ptsB} PTS) superou ${teamAName} (+${ptsA} PTS)`
        : `${teamAName} (+${ptsA} PTS) empatou com ${teamBName} (+${ptsB} PTS)`;

    events.push({
      id: `synth_round_${r}`,
      roundNumber: r,
      gameId,
      gameName,
      winnerTeam,
      pointsA: ptsA,
      pointsB: ptsB,
      cumulativeScoreA: cumA,
      cumulativeScoreB: cumB,
      headline,
      subheadline,
      timestamp: latestHistory?.timestamp || Date.now()
    });
  }

  return events;
}

export type MedalCategory = 'most-wins' | 'best-accuracy' | 'mvp-streaks' | 'top-scorer';

export interface TrophyMedal {
  id: MedalCategory;
  title: string;
  subtitle: string;
  medalType: 'gold' | 'emerald' | 'amber-flame' | 'amethyst';
  medalLabel: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  team: TeamId;
  teamName: string;
  metricValue: string;
  secondaryMetric: string;
  unlocked: boolean;
}

interface CareerPlayerRecord {
  id: string;
  name: string;
  avatar: string;
  team: TeamId;
  matchesPlayed: number;
  matchesWon: number;
  totalScore: number;
  roundsPlayed: number;
  roundsWon: number;
  accuracy: number;
  totalMvps: number;
  currentMvpStreak: number;
  maxMvpStreak: number;
}

/**
 * Computes virtual medals for the 'Trophy Room' tab in GlobalStats based on career achievements
 * ('Most Wins', 'Best Accuracy', 'MVP Streaks', and 'Most Points').
 */
export function computeCareerTrophyMedals(
  stats: SessionStats,
  teamAName = 'Equipe Alfa',
  teamBName = 'Equipe Bravo',
  livePlayers: Player[] = []
): TrophyMedal[] {
  const careerMap = new Map<string, CareerPlayerRecord>();
  const history = stats?.history || [];
  let lastMvpPlayerId: string | null = null;

  const ensureRecord = (
    id: string,
    name: string,
    avatar: string,
    team: TeamId
  ): CareerPlayerRecord => {
    const existing = careerMap.get(id);
    if (existing) {
      existing.name = name || existing.name;
      existing.avatar = avatar || existing.avatar;
      existing.team = team || existing.team;
      return existing;
    }
    const created: CareerPlayerRecord = {
      id,
      name,
      avatar: avatar || (team === 'A' ? '🦁' : '🦊'),
      team,
      matchesPlayed: 0,
      matchesWon: 0,
      totalScore: 0,
      roundsPlayed: 0,
      roundsWon: 0,
      accuracy: 0,
      totalMvps: 0,
      currentMvpStreak: 0,
      maxMvpStreak: 0
    };
    careerMap.set(id, created);
    return created;
  };

  // 1. Traverse match history chronologically to compute career wins, accuracy, and MVP streaks
  history.forEach((entry) => {
    const defaultRounds = Math.max(1, entry.roundsPlayed || 3);

    if (entry.playerScores && entry.playerScores.length > 0) {
      entry.playerScores.forEach((ps) => {
        const rec = ensureRecord(ps.id, ps.name, ps.avatar, ps.team);
        rec.matchesPlayed += 1;
        if (entry.winnerTeam === ps.team) {
          rec.matchesWon += 1;
        }
        rec.totalScore += ps.score || 0;
        const rp = Math.max(1, ps.roundsPlayed ?? defaultRounds);
        const rw =
          typeof ps.roundsWon === 'number'
            ? ps.roundsWon
            : (ps.score || 0) > 0
            ? rp
            : 0;
        rec.roundsPlayed += rp;
        rec.roundsWon += rw;
        rec.accuracy =
          typeof ps.accuracy === 'number' && history.length === 1
            ? ps.accuracy
            : rec.roundsPlayed > 0
            ? Math.min(100, Math.round((rec.roundsWon / rec.roundsPlayed) * 100))
            : 0;
      });
    } else {
      // TV-only history entry fallback: attribute to Team A and Team B Captains
      const capA = ensureRecord('captain-team-a', `Capitão ${teamAName}`, '🦁', 'A');
      capA.matchesPlayed += 1;
      if (entry.winnerTeam === 'A') capA.matchesWon += 1;
      capA.totalScore += entry.scoreA || 0;
      capA.roundsPlayed += defaultRounds;
      capA.roundsWon +=
        entry.scoreA > entry.scoreB
          ? defaultRounds
          : entry.scoreA > 0
          ? Math.max(1, Math.floor(defaultRounds / 2))
          : 0;
      capA.accuracy =
        capA.roundsPlayed > 0 ? Math.min(100, Math.round((capA.roundsWon / capA.roundsPlayed) * 100)) : 0;

      const capB = ensureRecord('captain-team-b', `Capitão ${teamBName}`, '🦊', 'B');
      capB.matchesPlayed += 1;
      if (entry.winnerTeam === 'B') capB.matchesWon += 1;
      capB.totalScore += entry.scoreB || 0;
      capB.roundsPlayed += defaultRounds;
      capB.roundsWon +=
        entry.scoreB > entry.scoreA
          ? defaultRounds
          : entry.scoreB > 0
          ? Math.max(1, Math.floor(defaultRounds / 2))
          : 0;
      capB.accuracy =
        capB.roundsPlayed > 0 ? Math.min(100, Math.round((capB.roundsWon / capB.roundsPlayed) * 100)) : 0;
    }

    // Track MVP & consecutive MVP streak
    const mvpItem = resolveMatchMVPFromHistoryEntry(entry, teamAName, teamBName);
    const normalizedMvpId = mvpItem.playerId.startsWith('mvp-team-a')
      ? 'captain-team-a'
      : mvpItem.playerId.startsWith('mvp-team-b')
      ? 'captain-team-b'
      : mvpItem.playerId;

    const mvpRec = ensureRecord(normalizedMvpId, mvpItem.name, mvpItem.avatar, mvpItem.team);
    mvpRec.totalMvps += 1;
    if (lastMvpPlayerId === normalizedMvpId) {
      mvpRec.currentMvpStreak += 1;
    } else {
      careerMap.forEach((r) => {
        if (r.id !== normalizedMvpId) r.currentMvpStreak = 0;
      });
      mvpRec.currentMvpStreak = 1;
      lastMvpPlayerId = normalizedMvpId;
    }
    mvpRec.maxMvpStreak = Math.max(mvpRec.maxMvpStreak, mvpRec.currentMvpStreak);
  });

  // 2. Merge live players if provided
  (livePlayers || []).forEach((p) => {
    const existing = careerMap.get(p.id);
    if (!existing) {
      const rec = ensureRecord(p.id, p.name, p.avatar, p.team);
      const teamWins = p.team === 'A' ? stats?.victoriesA || 0 : stats?.victoriesB || 0;
      rec.matchesPlayed = Math.max(1, stats?.totalMatches || 0);
      rec.matchesWon = teamWins;
      rec.totalScore = p.score || 0;
      rec.roundsPlayed = p.roundsPlayed || 0;
      rec.roundsWon = p.roundsWon || 0;
      rec.accuracy =
        typeof p.accuracy === 'number'
          ? p.accuracy
          : rec.roundsPlayed > 0
          ? Math.round((rec.roundsWon / rec.roundsPlayed) * 100)
          : 0;
    } else {
      existing.totalScore = Math.max(existing.totalScore, p.score || 0);
      if ((p.roundsPlayed || 0) > existing.roundsPlayed) {
        existing.roundsPlayed = p.roundsPlayed || existing.roundsPlayed;
        existing.roundsWon = p.roundsWon ?? existing.roundsWon;
        existing.accuracy = p.accuracy ?? existing.accuracy;
      }
    }
  });

  // 3. Ensure at least the two Team Captains exist if no records were found yet
  if (careerMap.size === 0) {
    const capA = ensureRecord('captain-team-a', `Capitão ${teamAName}`, '🦁', 'A');
    capA.matchesPlayed = stats?.totalMatches || 0;
    capA.matchesWon = stats?.victoriesA || 0;
    capA.totalScore = stats?.totalPointsA || 0;
    capA.roundsPlayed = (stats?.totalMatches || 1) * 3;
    capA.roundsWon = capA.matchesWon * 3;
    capA.accuracy = capA.totalScore > 0 ? 100 : 0;
    capA.totalMvps = capA.matchesWon;
    capA.maxMvpStreak = capA.matchesWon > 0 ? 1 : 0;

    const capB = ensureRecord('captain-team-b', `Capitão ${teamBName}`, '🦊', 'B');
    capB.matchesPlayed = stats?.totalMatches || 0;
    capB.matchesWon = stats?.victoriesB || 0;
    capB.totalScore = stats?.totalPointsB || 0;
    capB.roundsPlayed = (stats?.totalMatches || 1) * 3;
    capB.roundsWon = capB.matchesWon * 3;
    capB.accuracy = capB.totalScore > 0 ? 100 : 0;
    capB.totalMvps = capB.matchesWon;
    capB.maxMvpStreak = capB.matchesWon > 0 ? 1 : 0;
  }

  const allRecords = Array.from(careerMap.values());
  const hasActivity =
    (stats?.totalMatches || 0) > 0 ||
    (stats?.totalPointsA || 0) > 0 ||
    (stats?.totalPointsB || 0) > 0 ||
    allRecords.some((r) => r.totalScore > 0 || r.matchesWon > 0 || r.accuracy > 0);

  // Sort for Most Wins
  const mostWinsWinner = [...allRecords].sort((a, b) => {
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
    return b.totalScore - a.totalScore;
  })[0];

  // Sort for Best Accuracy
  const bestAccuracyWinner = [...allRecords].sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
    return b.totalScore - a.totalScore;
  })[0];

  // Sort for MVP Streaks
  const mvpStreakWinner = [...allRecords].sort((a, b) => {
    if (b.maxMvpStreak !== a.maxMvpStreak) return b.maxMvpStreak - a.maxMvpStreak;
    if (b.totalMvps !== a.totalMvps) return b.totalMvps - a.totalMvps;
    return b.totalScore - a.totalScore;
  })[0];

  // Sort for Top Scorer
  const topScorerWinner = [...allRecords].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    return b.accuracy - a.accuracy;
  })[0];

  const getTeamLabel = (t: TeamId) => (t === 'A' ? teamAName : teamBName);
  const effectiveStreak =
    mvpStreakWinner.maxMvpStreak > 0
      ? mvpStreakWinner.maxMvpStreak
      : hasActivity
      ? 1
      : 0;
  const effectiveTotalMvps =
    mvpStreakWinner.totalMvps > 0
      ? mvpStreakWinner.totalMvps
      : hasActivity
      ? 1
      : 0;

  return [
    {
      id: 'most-wins',
      title: 'Most Wins',
      subtitle: 'Maior número de vitórias na carreira',
      medalType: 'gold',
      medalLabel: 'MEDALHA DE OURO',
      playerId: mostWinsWinner.id,
      playerName: mostWinsWinner.name,
      playerAvatar: mostWinsWinner.avatar,
      team: mostWinsWinner.team,
      teamName: getTeamLabel(mostWinsWinner.team),
      metricValue: `${mostWinsWinner.matchesWon} ${mostWinsWinner.matchesWon === 1 ? 'WIN' : 'WINS'}`,
      secondaryMetric: `${mostWinsWinner.roundsWon}R vencidas · ${mostWinsWinner.totalScore} PTS`,
      unlocked: hasActivity
    },
    {
      id: 'best-accuracy',
      title: 'Best Accuracy',
      subtitle: 'Maior taxa de precisão nas rodadas',
      medalType: 'emerald',
      medalLabel: 'MEDALHA DE PRECISÃO',
      playerId: bestAccuracyWinner.id,
      playerName: bestAccuracyWinner.name,
      playerAvatar: bestAccuracyWinner.avatar,
      team: bestAccuracyWinner.team,
      teamName: getTeamLabel(bestAccuracyWinner.team),
      metricValue: `${bestAccuracyWinner.accuracy}% ACC`,
      secondaryMetric: `${bestAccuracyWinner.roundsWon}/${Math.max(1, bestAccuracyWinner.roundsPlayed)} rodadas pontuadas`,
      unlocked: hasActivity
    },
    {
      id: 'mvp-streaks',
      title: 'MVP Streaks',
      subtitle: 'Maior sequência consecutiva de MVPs',
      medalType: 'amber-flame',
      medalLabel: 'MEDALHA DINASTIA MVP',
      playerId: mvpStreakWinner.id,
      playerName: mvpStreakWinner.name,
      playerAvatar: mvpStreakWinner.avatar,
      team: mvpStreakWinner.team,
      teamName: getTeamLabel(mvpStreakWinner.team),
      metricValue: `${effectiveStreak}x STREAK`,
      secondaryMetric: `${effectiveTotalMvps} ${effectiveTotalMvps === 1 ? 'título de MVP' : 'títulos de MVP'}`,
      unlocked: hasActivity
    },
    {
      id: 'top-scorer',
      title: 'Most Points',
      subtitle: 'Recorde de pontuação acumulada',
      medalType: 'amethyst',
      medalLabel: 'MEDALHA ARTILHEIRO',
      playerId: topScorerWinner.id,
      playerName: topScorerWinner.name,
      playerAvatar: topScorerWinner.avatar,
      team: topScorerWinner.team,
      teamName: getTeamLabel(topScorerWinner.team),
      metricValue: `${topScorerWinner.totalScore} PTS`,
      secondaryMetric: `${Math.max(1, topScorerWinner.matchesPlayed)} ${topScorerWinner.matchesPlayed === 1 ? 'partida jogada' : 'partidas jogadas'}`,
      unlocked: hasActivity
    }
  ];
}

export interface RadarComparisonAxis {
  key: 'points' | 'accuracy' | 'ptsPerRound' | 'roundsWon' | 'impact';
  subject: string;
  mvpScore: number;
  runnerUpScore: number;
  mvpRawLabel: string;
  runnerUpRawLabel: string;
  fullMark: number;
}

export interface MatchPlayerComparison {
  mvp: MVPStats;
  runnerUp: MVPStats;
  axes: RadarComparisonAxis[];
}

/**
 * Computes the side-by-side comparison payload between the current match MVP
 * and the second-highest scoring player (runner-up) from the match, including
 * normalized 0-100 radar chart axes for Recharts/D3 visualization.
 */
export function computeMatchPlayerComparison(room: GameRoom): MatchPlayerComparison {
  const mvp = computeSessionMVP(room);
  const teamAName = room.teams?.A?.name || 'Equipe Alfa';
  const teamBName = room.teams?.B?.name || 'Equipe Bravo';
  const victoriesA = room.sessionStats?.victoriesA || 0;
  const victoriesB = room.sessionStats?.victoriesB || 0;
  const history = room.sessionStats?.history || [];
  const latestHistory = history.length > 0 ? history[history.length - 1] : undefined;
  const defaultRounds = Math.max(
    1,
    latestHistory?.roundsPlayed || room.maxRounds || room.roundNumber || 3
  );

  // Sync MVP with live player metrics if present in room.players
  const liveMvpPlayer = (room.players || []).find((p) => p.id === mvp.playerId);
  const syncedMvp: MVPStats = {
    ...mvp,
    roundsPlayed:
      typeof liveMvpPlayer?.roundsPlayed === 'number' && liveMvpPlayer.roundsPlayed > 0
        ? liveMvpPlayer.roundsPlayed
        : Math.max(1, mvp.roundsPlayed || defaultRounds),
    roundsWon:
      typeof liveMvpPlayer?.roundsWon === 'number' && (liveMvpPlayer.roundsPlayed ?? 0) > 0
        ? liveMvpPlayer.roundsWon
        : mvp.roundsWon,
    accuracy:
      typeof liveMvpPlayer?.accuracy === 'number' && (liveMvpPlayer.roundsPlayed ?? 0) > 0
        ? liveMvpPlayer.accuracy
        : mvp.accuracy
  };

  // Gather all distinct player candidates from current match players & latest history
  const candidateMap = new Map<
    string,
    {
      id: string;
      name: string;
      avatar: string;
      team: TeamId;
      score: number;
      roundsPlayed: number;
      roundsWon: number;
      accuracy: number;
    }
  >();

  if (latestHistory?.playerScores && latestHistory.playerScores.length > 0) {
    latestHistory.playerScores.forEach((ps) => {
      const rp = Math.max(1, ps.roundsPlayed ?? defaultRounds);
      const rw =
        typeof ps.roundsWon === 'number'
          ? ps.roundsWon
          : ps.score > 0
          ? Math.max(1, Math.round(rp * 0.6))
          : 0;
      const acc =
        typeof ps.accuracy === 'number'
          ? ps.accuracy
          : rp > 0
          ? Math.min(100, Math.round((rw / rp) * 100))
          : 0;
      candidateMap.set(ps.id, {
        id: ps.id,
        name: ps.name,
        avatar: ps.avatar || (ps.team === 'A' ? '🦁' : '🦊'),
        team: ps.team,
        score: ps.score || 0,
        roundsPlayed: rp,
        roundsWon: rw,
        accuracy: acc
      });
    });
  }

  (room.players || []).forEach((p) => {
    const existing = candidateMap.get(p.id);
    const score = Math.max(existing?.score || 0, p.score || 0);
    const rp = Math.max(1, p.roundsPlayed || existing?.roundsPlayed || defaultRounds);
    const rw =
      typeof p.roundsWon === 'number'
        ? p.roundsWon
        : existing?.roundsWon ?? (score > 0 ? Math.max(1, Math.round(rp * 0.6)) : 0);
    const acc =
      typeof p.accuracy === 'number' && (p.roundsPlayed ?? 0) > 0
        ? p.accuracy
        : existing?.accuracy ?? (rp > 0 ? Math.min(100, Math.round((rw / rp) * 100)) : 0);

    candidateMap.set(p.id, {
      id: p.id,
      name: p.name,
      avatar: p.avatar || existing?.avatar || (p.team === 'A' ? '🦁' : '🦊'),
      team: p.team,
      score,
      roundsPlayed: rp,
      roundsWon: rw,
      accuracy: acc
    });
  });

  // Remove the MVP from the runner-up candidates pool
  const remainingCandidates = Array.from(candidateMap.values())
    .filter((c) => c.id !== syncedMvp.playerId)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      const teamScoreA = a.team === 'A' ? room.teams?.A?.score || 0 : room.teams?.B?.score || 0;
      const teamScoreB = b.team === 'A' ? room.teams?.A?.score || 0 : room.teams?.B?.score || 0;
      return teamScoreB - teamScoreA;
    });

  let runnerUp: MVPStats;

  if (remainingCandidates.length > 0) {
    const second = remainingCandidates[0];
    const secondTeamName = second.team === 'A' ? teamAName : teamBName;
    const secondMatchesWon = second.team === 'A' ? victoriesA : victoriesB;
    const fallbackTeamScore =
      second.team === 'A' ? room.teams?.A?.score || 0 : room.teams?.B?.score || 0;
    const effectiveSecondScore =
      second.score > 0
        ? second.score
        : syncedMvp.team !== second.team
        ? fallbackTeamScore
        : Math.max(0, Math.round(syncedMvp.score * 0.72));
    const effectiveRp = Math.max(1, second.roundsPlayed || defaultRounds);
    const effectiveRw =
      second.roundsWon > 0
        ? second.roundsWon
        : effectiveSecondScore > 0
        ? Math.max(1, Math.min(effectiveRp, Math.round(effectiveRp * 0.67)))
        : 0;
    const effectiveAcc =
      second.accuracy > 0
        ? second.accuracy
        : effectiveSecondScore > 0
        ? Math.min(100, Math.round((effectiveRw / effectiveRp) * 100))
        : 0;

    runnerUp = {
      playerId: second.id,
      name: second.name,
      avatar: second.avatar,
      team: second.team,
      teamName: secondTeamName,
      score: effectiveSecondScore,
      roundsPlayed: effectiveRp,
      roundsWon: effectiveRw,
      accuracy: effectiveAcc,
      matchesWon: secondMatchesWon,
      highlightReason: '2º Maior Pontuador da Partida (Vice-MVP)'
    };
  } else {
    // Fallback when playing in TV-only mode or with a single registered player:
    // Derive the second-highest scoring contender from the opposing team
    const runnerTeam: TeamId = syncedMvp.team === 'A' ? 'B' : 'A';
    const runnerTeamName = runnerTeam === 'A' ? teamAName : teamBName;
    const rawRunnerScore =
      runnerTeam === 'A'
        ? Math.max(room.teams?.A?.score || 0, latestHistory?.scoreA || 0)
        : Math.max(room.teams?.B?.score || 0, latestHistory?.scoreB || 0);
    const runnerScore = Math.min(syncedMvp.score, rawRunnerScore);
    const roundEvents = getMatchRoundActivityLog(room);
    const roundsWonByRunner = roundEvents.filter((ev) => ev.winnerTeam === runnerTeam).length;
    const effectiveRw =
      roundsWonByRunner > 0
        ? roundsWonByRunner
        : runnerScore > 0
        ? Math.max(1, Math.floor(defaultRounds / 2))
        : 0;
    const effectiveAcc =
      defaultRounds > 0 && (effectiveRw > 0 || runnerScore > 0)
        ? Math.min(100, Math.max(25, Math.round((effectiveRw / defaultRounds) * 100)))
        : 0;

    runnerUp = {
      playerId: `runner-up-team-${runnerTeam.toLowerCase()}`,
      name: `Capitão ${runnerTeamName}`,
      avatar: runnerTeam === 'A' ? '🦁' : '🦊',
      team: runnerTeam,
      teamName: runnerTeamName,
      score: runnerScore,
      roundsPlayed: defaultRounds,
      roundsWon: effectiveRw,
      accuracy: effectiveAcc,
      matchesWon: runnerTeam === 'A' ? victoriesA : victoriesB,
      highlightReason: `2º Maior Pontuador da Partida (${runnerTeamName})`
    };
  }

  // Compute normalized 0-100 radar chart metrics across 5 key performance dimensions
  const maxPoints = Math.max(syncedMvp.score, runnerUp.score, 10);
  const mvpPointsNorm =
    syncedMvp.score > 0 ? Math.min(100, Math.max(12, Math.round((syncedMvp.score / maxPoints) * 100))) : 0;
  const runnerPointsNorm =
    runnerUp.score > 0 ? Math.min(100, Math.max(10, Math.round((runnerUp.score / maxPoints) * 100))) : 0;

  const mvpAvgPts =
    syncedMvp.roundsPlayed > 0
      ? Math.round((syncedMvp.score / syncedMvp.roundsPlayed) * 10) / 10
      : syncedMvp.score;
  const runnerAvgPts =
    runnerUp.roundsPlayed > 0
      ? Math.round((runnerUp.score / runnerUp.roundsPlayed) * 10) / 10
      : runnerUp.score;
  const maxAvgPts = Math.max(mvpAvgPts, runnerAvgPts, 5);
  const mvpAvgNorm =
    mvpAvgPts > 0 ? Math.min(100, Math.max(12, Math.round((mvpAvgPts / maxAvgPts) * 100))) : 0;
  const runnerAvgNorm =
    runnerAvgPts > 0 ? Math.min(100, Math.max(10, Math.round((runnerAvgPts / maxAvgPts) * 100))) : 0;

  const mvpRoundsWonRatio =
    syncedMvp.roundsPlayed > 0
      ? Math.min(100, Math.round((syncedMvp.roundsWon / syncedMvp.roundsPlayed) * 100))
      : 0;
  const runnerRoundsWonRatio =
    runnerUp.roundsPlayed > 0
      ? Math.min(100, Math.round((runnerUp.roundsWon / runnerUp.roundsPlayed) * 100))
      : 0;

  const totalCombinedPoints = Math.max(1, syncedMvp.score + runnerUp.score);
  const mvpShare = Math.round((syncedMvp.score / totalCombinedPoints) * 100);
  const runnerShare = Math.round((runnerUp.score / totalCombinedPoints) * 100);
  const mvpImpact = Math.min(
    100,
    Math.round(mvpShare * 0.65 + syncedMvp.accuracy * 0.35)
  );
  const runnerImpact = Math.min(
    100,
    Math.round(runnerShare * 0.65 + runnerUp.accuracy * 0.35)
  );

  const axes: RadarComparisonAxis[] = [
    {
      key: 'points',
      subject: 'Total Points',
      mvpScore: mvpPointsNorm,
      runnerUpScore: runnerPointsNorm,
      mvpRawLabel: `${syncedMvp.score} PTS`,
      runnerUpRawLabel: `${runnerUp.score} PTS`,
      fullMark: 100
    },
    {
      key: 'accuracy',
      subject: 'Accuracy',
      mvpScore: Math.min(100, Math.max(0, syncedMvp.accuracy)),
      runnerUpScore: Math.min(100, Math.max(0, runnerUp.accuracy)),
      mvpRawLabel: `${syncedMvp.accuracy}%`,
      runnerUpRawLabel: `${runnerUp.accuracy}%`,
      fullMark: 100
    },
    {
      key: 'ptsPerRound',
      subject: 'Pts / Round',
      mvpScore: mvpAvgNorm,
      runnerUpScore: runnerAvgNorm,
      mvpRawLabel: `${mvpAvgPts} PTS/R`,
      runnerUpRawLabel: `${runnerAvgPts} PTS/R`,
      fullMark: 100
    },
    {
      key: 'roundsWon',
      subject: 'Rounds Won',
      mvpScore: mvpRoundsWonRatio,
      runnerUpScore: runnerRoundsWonRatio,
      mvpRawLabel: `${syncedMvp.roundsWon}/${syncedMvp.roundsPlayed}`,
      runnerUpRawLabel: `${runnerUp.roundsWon}/${runnerUp.roundsPlayed}`,
      fullMark: 100
    },
    {
      key: 'impact',
      subject: 'Match Impact',
      mvpScore: mvpImpact,
      runnerUpScore: runnerImpact,
      mvpRawLabel: `${mvpImpact}% IDX`,
      runnerUpRawLabel: `${runnerImpact}% IDX`,
      fullMark: 100
    }
  ];

  return {
    mvp: syncedMvp,
    runnerUp,
    axes
  };
}
