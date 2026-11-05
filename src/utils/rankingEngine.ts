/**
 * Player Ranking & Winrate Engine
 * "Roda de Bobo" Party Games Edition
 */

import { Player, SessionStats } from '../types/game';
import { loadFixedPlayersStats, FIXED_PLAYERS } from './fixedPlayers';

export interface PlayerRankingEntry {
  id: string;
  name: string;
  avatar: string;
  color: string;
  victories: number;
  participations: number;
  winrate: number; // 0 to 100 (%)
  isFixedPlayer?: boolean;
}

/**
 * Computes the unified leaderboard ranking sorted primarily by:
 * 1. Winrate percentage (Aprov. %) descending
 * 2. Total victories descending (tie-breaker)
 * 3. Total participations descending (tie-breaker)
 * 
 * Aggregates both:
 * - Room active players (and their current match stats)
 * - Session history match results (from room.sessionStats.history)
 * - Fixed Players career lifetime stats (from localStorage / fixedPlayers catalog)
 */
export function computePlayerRanking(
  stats?: SessionStats,
  currentPlayers: Player[] = []
): PlayerRankingEntry[] {
  const map = new Map<string, {
    id: string;
    name: string;
    avatar: string;
    color: string;
    victories: number;
    participations: number;
    isFixedPlayer: boolean;
  }>();

  // 1. Ingest Fixed Players Lifetime Stats
  const fixedLifetime = loadFixedPlayersStats();
  FIXED_PLAYERS.forEach((fp) => {
    const life = fixedLifetime[fp.id];
    const key = fp.name.trim().toLowerCase();
    map.set(key, {
      id: fp.id,
      name: fp.name,
      avatar: fp.avatar,
      color: fp.color,
      victories: life ? life.totalVictories : 0,
      participations: life ? Math.max(life.totalMatches, life.totalVictories) : 0,
      isFixedPlayer: true
    });
  });

  // 2. Ingest Session History entries (if any guest or dynamic players have won)
  if (stats && Array.isArray(stats.history)) {
    stats.history.forEach((match) => {
      if (match.playerScores && Array.isArray(match.playerScores)) {
        match.playerScores.forEach((ps) => {
          const key = ps.name.trim().toLowerCase();
          const existing = map.get(key);
          const isWinner = match.winnerTeam !== 'EMPATE' && ps.team === match.winnerTeam;

          if (existing) {
            // Only add if not already covered by fixed player (or if guest match was logged)
            if (!existing.isFixedPlayer) {
              existing.participations += 1;
              if (isWinner) existing.victories += 1;
            }
          } else {
            map.set(key, {
              id: ps.id || key,
              name: ps.name,
              avatar: ps.avatar || '🕹️',
              color: '#17B8B8',
              victories: isWinner ? 1 : 0,
              participations: 1,
              isFixedPlayer: false
            });
          }
        });
      }
    });
  }

  // 3. Ingest active Room Players if present (ensures any newly joined guest appears)
  currentPlayers.forEach((p) => {
    const key = p.name.trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: p.id,
        name: p.name,
        avatar: p.avatar || '🕹️',
        color: p.color || '#17B8B8',
        victories: p.roundsWon || 0,
        participations: Math.max(p.roundsPlayed || 1, p.roundsWon || 0),
        isFixedPlayer: false
      });
    }
  });

  // 4. Transform into array, calculate percentage, and sort
  const entries: PlayerRankingEntry[] = Array.from(map.values()).map((item) => {
    const participations = Math.max(item.participations, item.victories);
    const winrate = participations > 0 ? Math.round((item.victories / participations) * 100) : 0;
    return {
      id: item.id,
      name: item.name,
      avatar: item.avatar,
      color: item.color,
      victories: item.victories,
      participations,
      winrate,
      isFixedPlayer: item.isFixedPlayer
    };
  });

  // Sort by Winrate % DESC -> Victories DESC -> Participations DESC -> Name ASC
  entries.sort((a, b) => {
    if (b.winrate !== a.winrate) {
      return b.winrate - a.winrate;
    }
    if (b.victories !== a.victories) {
      return b.victories - a.victories;
    }
    if (b.participations !== a.participations) {
      return b.participations - a.participations;
    }
    return a.name.localeCompare(b.name);
  });

  return entries;
}
