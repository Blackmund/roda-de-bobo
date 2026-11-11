/**
 * Fixed Players System & Persistent Lifetime Career History
 * "Roda de Bobo" Party Games Edition
 */

import { GameRoom, GameId, TeamId, GameHistoryEntry } from '../types/game';

export interface FixedPlayerDefinition {
  id: string;
  name: string;
  avatar: string;
  color: string;
  tagline: string;
  defaultTeam: TeamId;
}

export interface MatchOutcomeEvent {
  matchId: string;
  gameId: GameId;
  gameName: string;
  theme?: string;
  isWin: boolean;
  score: number;
  timestamp: number;
  teammateName?: string;
}

export interface FixedPlayerLifetimeStats {
  id: string;
  name: string;
  avatar: string;
  color: string;
  tagline?: string;
  totalMatches: number;
  totalVictories: number;
  totalMvps: number;
  totalPoints: number;
  roundsPlayed: number;
  roundsWon: number;
  bestScore: number;
  favoriteGame?: GameId;
  favoriteTheme?: string;
  bestPartnerName?: string;
  gamePlayCounts: Partial<Record<GameId, number>>;
  gameWinCounts?: Partial<Record<GameId, number>>;
  themePlayCounts?: Record<string, number>;
  partnerWinCounts?: Record<string, number>;
  matchHistory?: MatchOutcomeEvent[];
  lastPlayed: number;
}

export const FIXED_PLAYERS: FixedPlayerDefinition[] = [
  {
    id: 'marcos-andre',
    name: 'Marcos André',
    avatar: '🦁',
    color: '#FF1E56',
    tagline: 'Capitão da Resenha & Especialista em Limite e Futebol',
    defaultTeam: 'A'
  },
  {
    id: 'gisele',
    name: 'Gisele',
    avatar: '🦊',
    color: '#17B8B8',
    tagline: 'Mestre da Cultura Pop, Séries & Respostas Rápidas',
    defaultTeam: 'A'
  },
  {
    id: 'debora',
    name: 'Débora',
    avatar: '⚡',
    color: '#FBBF24',
    tagline: 'Estrategista de Blefe, Duvido & Foco Laser',
    defaultTeam: 'B'
  },
  {
    id: 'joao-gabriel',
    name: 'João Gabriel',
    avatar: '🤖',
    color: '#A855F7',
    tagline: 'Enciclopédia de Games, Animes & Raciocínio Lógico',
    defaultTeam: 'B'
  },
  {
    id: 'ayrton',
    name: 'Ayrton',
    avatar: '🏎️',
    color: '#10B981',
    tagline: 'Piloto dos Palpites, Proibido & Rei da Velocidade',
    defaultTeam: 'A'
  }
];

const STORAGE_KEY = 'roda_fixed_players_lifetime_stats_v1';

export const GAME_FRIENDLY_NAMES: Record<GameId, string> = {
  limite: 'J. Limite',
  duvido: 'J. Duvido',
  proibido: 'J. Proibido',
  nota: 'J. da Nota',
  'tem-ou-nao-tem': 'Tem ou Não Tem',
  'perguntas-e-verdades': 'P. & Verdades',
  mimica: 'J. da Mímica',
  'quem-sou-eu': 'Quem Sou Eu',
  'mega-resenha': 'Mega Resenha',
  repetente: 'Repetente',
  'respostas-sem-perguntas': 'Respostas s/ Perguntas',
  estadios: 'Estádios',
  'como-eu-pinto': 'Como Eu Pinto',
  'onde-estou': 'Onde Estou'
};

/**
 * Generates an evolving, contextual tagline/badge for a player based on their actual performance.
 * e.g., "Capitão da Resenha & Especialista em J. Limite e Futebol"
 */
export function generateDynamicPlayerTagline(
  playerDef: FixedPlayerDefinition,
  stats: FixedPlayerLifetimeStats
): string {
  const parts: string[] = [];

  // Prefix archetype
  if (playerDef.id === 'marcos-andre') parts.push('Capitão da Resenha');
  else if (playerDef.id === 'gisele') parts.push('Rainha da Agilidade');
  else if (playerDef.id === 'debora') parts.push('Estrategista de Blefe');
  else if (playerDef.id === 'joao-gabriel') parts.push('Mente Analítica');
  else if (playerDef.id === 'ayrton') parts.push('Velocista dos Palpites');
  else parts.push('Jogador de Elite');

  // Favorite Game
  const gameKey = stats.favoriteGame || 'limite';
  const gameName = GAME_FRIENDLY_NAMES[gameKey] || 'Jogos de Auditório';

  // Favorite Theme
  let topTheme = stats.favoriteTheme;
  if (!topTheme && stats.themePlayCounts) {
    let maxThemeCount = 0;
    Object.entries(stats.themePlayCounts).forEach(([theme, count]) => {
      if (count > maxThemeCount) {
        maxThemeCount = count;
        topTheme = theme;
      }
    });
  }

  if (topTheme && topTheme.toLowerCase() !== 'geral') {
    parts.push(`Especialista em ${gameName} e ${topTheme}`);
  } else {
    parts.push(`Especialista em ${gameName}`);
  }

  return parts.join(' & ');
}

/**
 * Initial base stats so the Hall of Fame displays rich, realistic history on first load,
 * which continuously updates as games conclude.
 */
function createInitialStats(): Record<string, FixedPlayerLifetimeStats> {
  const now = Date.now();
  return {
    'marcos-andre': {
      id: 'marcos-andre',
      name: 'Marcos André',
      avatar: '🦁',
      color: '#FF1E56',
      tagline: 'Capitão da Resenha & Especialista em J. Limite e Futebol',
      totalMatches: 8,
      totalVictories: 6,
      totalMvps: 4,
      totalPoints: 1740,
      roundsPlayed: 32,
      roundsWon: 22,
      bestScore: 420,
      favoriteGame: 'limite',
      favoriteTheme: 'Futebol',
      bestPartnerName: 'Gisele',
      gamePlayCounts: { limite: 5, 'tem-ou-nao-tem': 2, proibido: 1 },
      gameWinCounts: { limite: 4, 'tem-ou-nao-tem': 2 },
      themePlayCounts: { Futebol: 4, Geral: 3, Música: 1 },
      partnerWinCounts: { Gisele: 5, Débora: 1 },
      matchHistory: [
        { matchId: 'm-1', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Futebol', isWin: true, score: 380, timestamp: now - 3600000 * 8, teammateName: 'Gisele' },
        { matchId: 'm-2', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Futebol', isWin: true, score: 320, timestamp: now - 3600000 * 7, teammateName: 'Gisele' },
        { matchId: 'm-3', gameId: 'tem-ou-nao-tem', gameName: 'Tem ou Não Tem', theme: 'Geral', isWin: true, score: 260, timestamp: now - 3600000 * 6, teammateName: 'Gisele' },
        { matchId: 'm-4', gameId: 'proibido', gameName: 'Jogo do Proibido', theme: 'Música', isWin: false, score: 140, timestamp: now - 3600000 * 5, teammateName: 'Ayrton' },
        { matchId: 'm-5', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Futebol', isWin: true, score: 420, timestamp: now - 3600000 * 4, teammateName: 'Gisele' },
        { matchId: 'm-6', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Geral', isWin: false, score: 180, timestamp: now - 3600000 * 3, teammateName: 'Débora' },
        { matchId: 'm-7', gameId: 'tem-ou-nao-tem', gameName: 'Tem ou Não Tem', theme: 'Futebol', isWin: true, score: 290, timestamp: now - 3600000 * 2, teammateName: 'Gisele' },
        { matchId: 'm-8', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Geral', isWin: true, score: 350, timestamp: now - 3600000 * 1, teammateName: 'Gisele' }
      ],
      lastPlayed: now - 3600000
    },
    gisele: {
      id: 'gisele',
      name: 'Gisele',
      avatar: '🦊',
      color: '#17B8B8',
      tagline: 'Rainha da Agilidade & Especialista em Tem ou Não Tem e Séries',
      totalMatches: 7,
      totalVictories: 5,
      totalMvps: 3,
      totalPoints: 1490,
      roundsPlayed: 28,
      roundsWon: 18,
      bestScore: 360,
      favoriteGame: 'tem-ou-nao-tem',
      favoriteTheme: 'Séries',
      bestPartnerName: 'Marcos André',
      gamePlayCounts: { 'tem-ou-nao-tem': 4, proibido: 2, limite: 1 },
      gameWinCounts: { 'tem-ou-nao-tem': 3, proibido: 1, limite: 1 },
      themePlayCounts: { Séries: 3, Geral: 3, Filmes: 1 },
      partnerWinCounts: { 'Marcos André': 4, Ayrton: 1 },
      matchHistory: [
        { matchId: 'm-g1', gameId: 'tem-ou-nao-tem', gameName: 'Tem ou Não Tem', theme: 'Séries', isWin: true, score: 310, timestamp: now - 3600000 * 7, teammateName: 'Marcos André' },
        { matchId: 'm-g2', gameId: 'tem-ou-nao-tem', gameName: 'Tem ou Não Tem', theme: 'Geral', isWin: true, score: 280, timestamp: now - 3600000 * 6, teammateName: 'Marcos André' },
        { matchId: 'm-g3', gameId: 'proibido', gameName: 'Jogo do Proibido', theme: 'Filmes', isWin: true, score: 240, timestamp: now - 3600000 * 5, teammateName: 'Ayrton' },
        { matchId: 'm-g4', gameId: 'proibido', gameName: 'Jogo do Proibido', theme: 'Geral', isWin: false, score: 160, timestamp: now - 3600000 * 4, teammateName: 'Ayrton' },
        { matchId: 'm-g5', gameId: 'tem-ou-nao-tem', gameName: 'Tem ou Não Tem', theme: 'Séries', isWin: true, score: 360, timestamp: now - 3600000 * 3, teammateName: 'Marcos André' },
        { matchId: 'm-g6', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Geral', isWin: false, score: 190, timestamp: now - 3600000 * 2, teammateName: 'João Gabriel' },
        { matchId: 'm-g7', gameId: 'tem-ou-nao-tem', gameName: 'Tem ou Não Tem', theme: 'Séries', isWin: true, score: 320, timestamp: now - 3600000 * 1, teammateName: 'Marcos André' }
      ],
      lastPlayed: now - 3600000
    },
    debora: {
      id: 'debora',
      name: 'Débora',
      avatar: '⚡',
      color: '#FBBF24',
      tagline: 'Estrategista de Blefe & Especialista em J. Duvido e Estratégia',
      totalMatches: 6,
      totalVictories: 4,
      totalMvps: 2,
      totalPoints: 1280,
      roundsPlayed: 24,
      roundsWon: 14,
      bestScore: 330,
      favoriteGame: 'duvido',
      favoriteTheme: 'Comidas',
      bestPartnerName: 'João Gabriel',
      gamePlayCounts: { duvido: 4, nota: 2 },
      gameWinCounts: { duvido: 3, nota: 1 },
      themePlayCounts: { Comidas: 3, Geral: 2, Música: 1 },
      partnerWinCounts: { 'João Gabriel': 3, 'Marcos André': 1 },
      matchHistory: [
        { matchId: 'm-d1', gameId: 'duvido', gameName: 'Jogo do Duvido', theme: 'Comidas', isWin: true, score: 310, timestamp: now - 3600000 * 6, teammateName: 'João Gabriel' },
        { matchId: 'm-d2', gameId: 'duvido', gameName: 'Jogo do Duvido', theme: 'Geral', isWin: true, score: 290, timestamp: now - 3600000 * 5, teammateName: 'João Gabriel' },
        { matchId: 'm-d3', gameId: 'nota', gameName: 'Jogo da Nota', theme: 'Música', isWin: false, score: 150, timestamp: now - 3600000 * 4, teammateName: 'Ayrton' },
        { matchId: 'm-d4', gameId: 'duvido', gameName: 'Jogo do Duvido', theme: 'Comidas', isWin: true, score: 330, timestamp: now - 3600000 * 3, teammateName: 'João Gabriel' },
        { matchId: 'm-d5', gameId: 'nota', gameName: 'Jogo da Nota', theme: 'Geral', isWin: true, score: 260, timestamp: now - 3600000 * 2, teammateName: 'Marcos André' },
        { matchId: 'm-d6', gameId: 'duvido', gameName: 'Jogo do Duvido', theme: 'Comidas', isWin: false, score: 170, timestamp: now - 3600000 * 1, teammateName: 'João Gabriel' }
      ],
      lastPlayed: now - 7200000
    },
    'joao-gabriel': {
      id: 'joao-gabriel',
      name: 'João Gabriel',
      avatar: '🤖',
      color: '#A855F7',
      tagline: 'Mente Analítica & Especialista em J. da Nota e Games',
      totalMatches: 6,
      totalVictories: 3,
      totalMvps: 2,
      totalPoints: 1190,
      roundsPlayed: 24,
      roundsWon: 12,
      bestScore: 310,
      favoriteGame: 'nota',
      favoriteTheme: 'Games',
      bestPartnerName: 'Débora',
      gamePlayCounts: { nota: 3, limite: 2, duvido: 1 },
      gameWinCounts: { nota: 2, limite: 1 },
      themePlayCounts: { Games: 3, Animes: 2, Geral: 1 },
      partnerWinCounts: { Débora: 3 },
      matchHistory: [
        { matchId: 'm-j1', gameId: 'nota', gameName: 'Jogo da Nota', theme: 'Games', isWin: true, score: 290, timestamp: now - 3600000 * 6, teammateName: 'Débora' },
        { matchId: 'm-j2', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Animes', isWin: false, score: 160, timestamp: now - 3600000 * 5, teammateName: 'Gisele' },
        { matchId: 'm-j3', gameId: 'nota', gameName: 'Jogo da Nota', theme: 'Games', isWin: true, score: 310, timestamp: now - 3600000 * 4, teammateName: 'Débora' },
        { matchId: 'm-j4', gameId: 'duvido', gameName: 'Jogo do Duvido', theme: 'Geral', isWin: false, score: 140, timestamp: now - 3600000 * 3, teammateName: 'Débora' },
        { matchId: 'm-j5', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Games', isWin: true, score: 270, timestamp: now - 3600000 * 2, teammateName: 'Débora' },
        { matchId: 'm-j6', gameId: 'nota', gameName: 'Jogo da Nota', theme: 'Animes', isWin: false, score: 180, timestamp: now - 3600000 * 1, teammateName: 'Ayrton' }
      ],
      lastPlayed: now - 7200000
    },
    ayrton: {
      id: 'ayrton',
      name: 'Ayrton',
      avatar: '🏎️',
      color: '#10B981',
      tagline: 'Velocista dos Palpites & Especialista em J. Proibido e Cotidiano',
      totalMatches: 5,
      totalVictories: 3,
      totalMvps: 1,
      totalPoints: 1040,
      roundsPlayed: 20,
      roundsWon: 13,
      bestScore: 290,
      favoriteGame: 'proibido',
      favoriteTheme: 'Cotidiano',
      bestPartnerName: 'Gisele',
      gamePlayCounts: { proibido: 3, duvido: 1, limite: 1 },
      gameWinCounts: { proibido: 2, duvido: 1 },
      themePlayCounts: { Cotidiano: 3, Esportes: 1, Geral: 1 },
      partnerWinCounts: { Gisele: 2, 'Marcos André': 1 },
      matchHistory: [
        { matchId: 'm-a1', gameId: 'proibido', gameName: 'Jogo do Proibido', theme: 'Cotidiano', isWin: true, score: 280, timestamp: now - 3600000 * 5, teammateName: 'Gisele' },
        { matchId: 'm-a2', gameId: 'duvido', gameName: 'Jogo do Duvido', theme: 'Esportes', isWin: true, score: 250, timestamp: now - 3600000 * 4, teammateName: 'Marcos André' },
        { matchId: 'm-a3', gameId: 'proibido', gameName: 'Jogo do Proibido', theme: 'Cotidiano', isWin: false, score: 160, timestamp: now - 3600000 * 3, teammateName: 'Débora' },
        { matchId: 'm-a4', gameId: 'limite', gameName: 'Jogo do Limite', theme: 'Geral', isWin: false, score: 140, timestamp: now - 3600000 * 2, teammateName: 'João Gabriel' },
        { matchId: 'm-a5', gameId: 'proibido', gameName: 'Jogo do Proibido', theme: 'Cotidiano', isWin: true, score: 290, timestamp: now - 3600000 * 1, teammateName: 'Gisele' }
      ],
      lastPlayed: now - 86400000
    }
  };
}

/**
 * Loads persistent stats from localStorage with fallback to default profiles.
 */
export function loadFixedPlayersStats(): Record<string, FixedPlayerLifetimeStats> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const initial = createInitialStats();
        FIXED_PLAYERS.forEach((fp) => {
          if (!parsed[fp.id]) {
            parsed[fp.id] = initial[fp.id];
          } else {
            // Ensure fields like matchHistory, tagline exist
            if (!parsed[fp.id].matchHistory) {
              parsed[fp.id].matchHistory = initial[fp.id]?.matchHistory || [];
            }
            if (!parsed[fp.id].gameWinCounts) {
              parsed[fp.id].gameWinCounts = initial[fp.id]?.gameWinCounts || {};
            }
            if (!parsed[fp.id].themePlayCounts) {
              parsed[fp.id].themePlayCounts = initial[fp.id]?.themePlayCounts || {};
            }
            if (!parsed[fp.id].tagline) {
              parsed[fp.id].tagline = generateDynamicPlayerTagline(fp, parsed[fp.id]);
            }
          }
        });
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[FixedPlayers] Failed to load from storage:', err);
  }
  const initial = createInitialStats();
  saveFixedPlayersStats(initial);
  return initial;
}

/**
 * Persists updated stats to localStorage.
 */
export function saveFixedPlayersStats(stats: Record<string, FixedPlayerLifetimeStats>): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }
  } catch (err) {
    console.warn('[FixedPlayers] Failed to save stats:', err);
  }
}

/**
 * Finds a fixed player definition by ID or case-insensitive exact name.
 */
export function findFixedPlayerDefinition(nameOrId: string): FixedPlayerDefinition | undefined {
  const normalized = nameOrId.trim().toLowerCase();
  return FIXED_PLAYERS.find(
    (fp) => fp.id.toLowerCase() === normalized || fp.name.toLowerCase() === normalized
  );
}

/**
 * Checks whether a given player name or ID belongs to the fixed player roster.
 */
export function isFixedPlayer(nameOrId: string): boolean {
  return Boolean(findFixedPlayerDefinition(nameOrId));
}

/**
 * Updates persistent lifetime stats for all fixed players participating in a finished match.
 * Generates dynamic taglines, tracks theme preference, partner synergy, and real-time win/loss timeline events.
 */
export function updateFixedPlayersAfterMatch(room: GameRoom): Record<string, FixedPlayerLifetimeStats> {
  const stats = loadFixedPlayersStats();
  const winningTeam: TeamId | 'EMPATE' =
    room.teams.A.score > room.teams.B.score
      ? 'A'
      : room.teams.B.score > room.teams.A.score
      ? 'B'
      : 'EMPATE';

  const isCollectiveTeamGame =
    room.activeGame === 'tem-ou-nao-tem' ||
    room.activeGame === 'proibido' ||
    room.activeGame === 'duvido';
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const mvpPlayerId = isCollectiveTeamGame ? null : sortedPlayers[0]?.id;

  room.players.forEach((player) => {
    const fixedDef = player.fixedPlayerId
      ? FIXED_PLAYERS.find((fp) => fp.id === player.fixedPlayerId)
      : findFixedPlayerDefinition(player.name);

    if (!fixedDef) return;

    const currentStats = stats[fixedDef.id] || {
      id: fixedDef.id,
      name: fixedDef.name,
      avatar: fixedDef.avatar,
      color: fixedDef.color,
      totalMatches: 0,
      totalVictories: 0,
      totalMvps: 0,
      totalPoints: 0,
      roundsPlayed: 0,
      roundsWon: 0,
      bestScore: 0,
      gamePlayCounts: {},
      gameWinCounts: {},
      themePlayCounts: {},
      partnerWinCounts: {},
      matchHistory: [],
      lastPlayed: Date.now()
    };

    const isWinner = winningTeam !== 'EMPATE' && player.team === winningTeam;
    const isMvp = player.id === mvpPlayerId && player.score > 0;
    const matchScore = player.score || 0;
    const roundsPlayed = player.roundsPlayed || room.roundNumber || 1;
    const roundsWon = player.roundsWon || 0;

    // Update Game counts & Win counts
    const updatedGameCounts = { ...(currentStats.gamePlayCounts || {}) };
    const updatedGameWins = { ...(currentStats.gameWinCounts || {}) };
    if (room.activeGame) {
      updatedGameCounts[room.activeGame] = (updatedGameCounts[room.activeGame] || 0) + 1;
      if (isWinner) {
        updatedGameWins[room.activeGame] = (updatedGameWins[room.activeGame] || 0) + 1;
      }
    }

    // Determine favorite game based on frequency and wins
    let favoriteGame = currentStats.favoriteGame;
    let maxGameMetric = 0;
    Object.entries(updatedGameCounts).forEach(([gId, count]) => {
      const wins = updatedGameWins[gId as GameId] || 0;
      const metric = (count || 0) + wins * 2;
      if (metric > maxGameMetric) {
        maxGameMetric = metric;
        favoriteGame = gId as GameId;
      }
    });

    // Update Theme counts
    const updatedThemeCounts = { ...(currentStats.themePlayCounts || {}) };
    const currentTheme = room.theme || 'Geral';
    updatedThemeCounts[currentTheme] = (updatedThemeCounts[currentTheme] || 0) + 1;

    let favoriteTheme = currentStats.favoriteTheme || currentTheme;
    let maxThemeCount = 0;
    Object.entries(updatedThemeCounts).forEach(([theme, count]) => {
      if (count > maxThemeCount) {
        maxThemeCount = count;
        favoriteTheme = theme;
      }
    });

    // Find Teammate
    const teammate = room.players.find((p) => p.team === player.team && p.id !== player.id);
    const updatedPartnerWins = { ...(currentStats.partnerWinCounts || {}) };
    if (teammate && isWinner) {
      updatedPartnerWins[teammate.name] = (updatedPartnerWins[teammate.name] || 0) + 1;
    }

    let bestPartnerName = currentStats.bestPartnerName;
    let maxPartnerWins = 0;
    Object.entries(updatedPartnerWins).forEach(([partner, count]) => {
      if (count > maxPartnerWins) {
        maxPartnerWins = count;
        bestPartnerName = partner;
      }
    });

    // Append to Match History for Win/Loss Timeline (keep last 15)
    const newOutcome: MatchOutcomeEvent = {
      matchId: `m-${Date.now()}`,
      gameId: room.activeGame || 'limite',
      gameName: GAME_FRIENDLY_NAMES[room.activeGame || 'limite'] || 'Jogo',
      theme: currentTheme,
      isWin: isWinner,
      score: matchScore,
      timestamp: Date.now(),
      teammateName: teammate?.name
    };

    const updatedMatchHistory = [
      ...(currentStats.matchHistory || []),
      newOutcome
    ].slice(-15);

    const mergedStats: FixedPlayerLifetimeStats = {
      ...currentStats,
      name: fixedDef.name,
      avatar: fixedDef.avatar,
      color: fixedDef.color,
      totalMatches: currentStats.totalMatches + 1,
      totalVictories: currentStats.totalVictories + (isWinner ? 1 : 0),
      totalMvps: currentStats.totalMvps + (isMvp ? 1 : 0),
      totalPoints: currentStats.totalPoints + matchScore,
      roundsPlayed: currentStats.roundsPlayed + roundsPlayed,
      roundsWon: currentStats.roundsWon + roundsWon,
      bestScore: Math.max(currentStats.bestScore, matchScore),
      favoriteGame,
      favoriteTheme,
      bestPartnerName,
      gamePlayCounts: updatedGameCounts,
      gameWinCounts: updatedGameWins,
      themePlayCounts: updatedThemeCounts,
      partnerWinCounts: updatedPartnerWins,
      matchHistory: updatedMatchHistory,
      lastPlayed: Date.now()
    };

    // Recalculate dynamic tagline
    mergedStats.tagline = generateDynamicPlayerTagline(fixedDef, mergedStats);

    stats[fixedDef.id] = mergedStats;
  });

  saveFixedPlayersStats(stats);
  return stats;
}
