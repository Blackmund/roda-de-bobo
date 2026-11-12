import type { GameRoom, TeamId } from '../types/game';
import { MVPStats } from './sessionTypes';
import { computeSessionMVP } from './sessionMvp';
import { getMatchRoundActivityLog } from './sessionRoundActivity';

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