import type { GameRoom, GameId, TeamId, RoundActivityEvent } from '../types/game';

const DEFAULT_GAME_NAMES: Record<GameId, string> = {
  limite: 'JOGO DO LIMITE',
  duvido: 'JOGO DO DUVIDO',
  proibido: 'JOGO DO PROIBIDO',
  nota: 'JOGO DA NOTA',
  'tem-ou-nao-tem': 'TEM OU NÃO TEM',
  'perguntas-e-verdades': 'PERGUNTAS E VERDADES',
  mimica: 'JOGO DA MÍMICA',
  'quem-sou-eu': 'QUEM SOU EU',
  'mega-resenha': 'MEGA RESENHA',
  repetente: 'REPETENTE',
  'respostas-sem-perguntas': 'RESPOSTAS SEM PERGUNTAS',
  estadios: 'ESTÁDIOS',
  'como-eu-pinto': 'COMO EU PINTO',
  'onde-estou': 'ONDE ESTOU',
  'com-terra': 'COM TERRA',
  adedanha: 'ADEDANHA'
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