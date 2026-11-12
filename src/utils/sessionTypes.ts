import type { TeamId } from '../types/game';

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