import type { Player, TeamId, SessionStats } from '../types/game';
import { resolveMatchMVPFromHistoryEntry } from './sessionMvpHistory';

export type MedalCategory = 'most-wins' | 'best-accuracy' | 'mvp-streaks' | 'top-scorer';export interface TrophyMedal {
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
}interface CareerPlayerRecord {
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
}/**
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