import type { GameRoom, Player, TeamId, GameHistoryEntry, MatchMVPSnapshot, SessionStats } from '../types/game';
import { MVPHistoryItem } from './sessionTypes';

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