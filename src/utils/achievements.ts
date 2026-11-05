/**
 * Party Achievements Engine
 * Identifies and computes special accolades from session history and match activity
 * "Roda de Bobo" Party Games Edition
 */

import { GameRoom, TeamId } from '../types/game';

export interface PartyAchievement {
  id: string;
  badge: string;
  tag: string;
  title: string;
  playerTitleBadge: string;
  playerName: string;
  playerAvatar: string;
  playerTeam: TeamId;
  teamName: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  accent: 'rose' | 'amber' | 'cyan' | 'purple' | 'emerald';
}

/**
 * Computes party accolades based on the match and session history logs.
 * Returns a list of distinct, highlighted accolades.
 */
export function computePartyAchievements(room: GameRoom): PartyAchievement[] {
  const achievements: PartyAchievement[] = [];
  const players = room.players || [];
  if (players.length === 0) return achievements;

  const roundEvents = room.roundLog || [];

  // Helper to find player by ID or Name
  const findPlayer = (idOrName?: string) => {
    if (!idOrName) return players[0];
    return (
      players.find((p) => p.id === idOrName || p.name.toLowerCase() === idOrName.toLowerCase()) ||
      players[0]
    );
  };

  // 1. LONGEST WINNING STREAK (Maior Sequência de Vitórias / On Fire 🔥)
  let maxStreak = 0;
  let currentStreak = 0;
  let streakTeam: TeamId = 'A';
  let bestStreakTeam: TeamId = 'A';

  roundEvents.forEach((event) => {
    if (event.winnerTeam === 'A' || event.winnerTeam === 'B') {
      if (event.winnerTeam === streakTeam) {
        currentStreak++;
      } else {
        streakTeam = event.winnerTeam;
        currentStreak = 1;
      }
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        bestStreakTeam = streakTeam;
      }
    } else {
      currentStreak = 0;
    }
  });

  // Find the top player of that streak team
  const streakTeamPlayers = players.filter((p) => p.team === bestStreakTeam);
  const streakPlayer =
    streakTeamPlayers.sort((a, b) => (b.roundsWon || 0) - (a.roundsWon || 0) || b.score - a.score)[0] ||
    players[0];

  const effectiveStreak = Math.max(maxStreak, streakPlayer.roundsWon || 1);
  achievements.push({
    id: 'longest-streak',
    badge: '🔥',
    tag: 'ON FIRE // STREAK',
    title: 'Longest Winning Streak',
    playerTitleBadge: 'Sequência Imbatível',
    playerName: streakPlayer.name,
    playerAvatar: streakPlayer.avatar,
    playerTeam: streakPlayer.team,
    teamName: room.teams[streakPlayer.team]?.name || `Dupla ${streakPlayer.team}`,
    description: `Dominou a mesa liderando uma sequência de ${effectiveStreak} rodadas consecutivas sem dar chance ao adversário!`,
    metricLabel: 'SEQUÊNCIA MÁXIMA',
    metricValue: `${effectiveStreak} Rodadas`,
    accent: 'rose'
  });

  // 2. COMEBACK KING (Rei da Virada / O Resgate Épico 👑)
  // Check if either team was behind in score and rallied, or who scored the most clutch points
  let comebackPlayer = players[0];
  let comebackAmount = 0;
  let hasComeback = false;

  if (roundEvents.length >= 2) {
    // Check if team was trailing at halftime
    const midPoint = Math.floor(roundEvents.length / 2);
    const midEvent = roundEvents[midPoint - 1];
    const finalEvent = roundEvents[roundEvents.length - 1];

    if (midEvent && finalEvent) {
      const diffMid = midEvent.cumulativeScoreA - midEvent.cumulativeScoreB;
      const diffFinal = finalEvent.cumulativeScoreA - finalEvent.cumulativeScoreB;

      // Team A came from behind
      if (diffMid < 0 && diffFinal > 0) {
        hasComeback = true;
        const candidates = players.filter((p) => p.team === 'A');
        comebackPlayer = candidates.sort((a, b) => b.score - a.score)[0] || comebackPlayer;
        comebackAmount = Math.abs(diffMid) + diffFinal;
      } else if (diffMid > 0 && diffFinal < 0) {
        // Team B came from behind
        hasComeback = true;
        const candidates = players.filter((p) => p.team === 'B');
        comebackPlayer = candidates.sort((a, b) => b.score - a.score)[0] || comebackPlayer;
        comebackAmount = diffMid + Math.abs(diffFinal);
      }
    }
  }

  // If no formal match turnaround occurred, reward the highest scoring player in the final round (Clutch Finisher)
  if (!hasComeback) {
    const lastEvent = roundEvents[roundEvents.length - 1];
    if (lastEvent && lastEvent.topPlayerName) {
      comebackPlayer = findPlayer(lastEvent.topPlayerName);
    } else {
      // Runner up or highest scorer on trailing team
      const sortedByScore = [...players].sort((a, b) => b.score - a.score);
      comebackPlayer = sortedByScore[1] || sortedByScore[0];
    }
  }

  achievements.push({
    id: 'comeback-king',
    badge: '👑',
    tag: 'CLUTCH // RESGATE',
    title: 'Comeback King',
    playerTitleBadge: 'Mestre da Virada',
    playerName: comebackPlayer.name,
    playerAvatar: comebackPlayer.avatar,
    playerTeam: comebackPlayer.team,
    teamName: room.teams[comebackPlayer.team]?.name || `Dupla ${comebackPlayer.team}`,
    description: hasComeback
      ? `Protagonizou a maior reação da partida, revertendo desvantagem de ${comebackAmount} pontos para buscar o resultado!`
      : `Mostrou sangue frio nos momentos decisivos, marcando pontos cruciais sob pressão máxima!`,
    metricLabel: 'IMPACTO CLUTCH',
    metricValue: `${comebackPlayer.score} PTS Totais`,
    accent: 'amber'
  });

  // 3. MOST CREATIVE ANSWERS (Mestre da Criatividade & Blefe ✨)
  // Awarded to player with high accuracy or distinctive performance in qualitative games
  const sortedByAccuracy = [...players].sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
  // Pick player different from streak player if possible
  const creativePlayer =
    sortedByAccuracy.find((p) => p.id !== streakPlayer.id) || sortedByAccuracy[0];

  const accuracyVal = creativePlayer.accuracy || (creativePlayer.roundsWon ? Math.min(95, creativePlayer.roundsWon * 30) : 75);

  achievements.push({
    id: 'most-creative',
    badge: '✨',
    tag: 'REPERTÓRIO // TÁTICA',
    title: 'Most Creative Answers',
    playerTitleBadge: 'Mente Brilhante',
    playerName: creativePlayer.name,
    playerAvatar: creativePlayer.avatar,
    playerTeam: creativePlayer.team,
    teamName: room.teams[creativePlayer.team]?.name || `Dupla ${creativePlayer.team}`,
    description: `Surpreendeu a todos com conexões inusitadas, palpites ousados e repertório enciclopédico de cultura pop!`,
    metricLabel: 'TAXA DE PRECISÃO',
    metricValue: `${accuracyVal}% Acertos`,
    accent: 'purple'
  });

  // 4. SNIPER DO LIMITE // LASER FOCUS 🎯
  // Awarded to the player with the cleanest round contributions or lowest margin of error
  const remainingCandidates = players.filter(
    (p) => p.id !== streakPlayer.id && p.id !== comebackPlayer.id
  );
  const sniperPlayer =
    remainingCandidates.sort((a, b) => b.score - a.score)[0] ||
    [...players].sort((a, b) => b.score - a.score)[0];

  achievements.push({
    id: 'sniper-focus',
    badge: '🎯',
    tag: 'MIRA LASER // CIRÚRGICO',
    title: 'Sniper da Rodada',
    playerTitleBadge: 'Olho Clínico',
    playerName: sniperPlayer.name,
    playerAvatar: sniperPlayer.avatar,
    playerTeam: sniperPlayer.team,
    teamName: room.teams[sniperPlayer.team]?.name || `Dupla ${sniperPlayer.team}`,
    description: `Precisão milimétrica nas respostas sem arriscar penalidades desnecessárias na mesa!`,
    metricLabel: 'PONTUAÇÃO INDIVIDUAL',
    metricValue: `${sniperPlayer.score} PTS`,
    accent: 'cyan'
  });

  return achievements;
}
