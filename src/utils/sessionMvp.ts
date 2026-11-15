import type { GameRoom, Player, TeamId, PlayerScoreSnapshot } from '../types/game';
import { MVPStats } from './sessionTypes';
import { computeRoundTeamPoints } from './roundPoints';

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
  } else if (room.activeGame === 'com-terra' && room.comTerra) {
    Object.entries(room.comTerra.pointsAwarded || {}).forEach(([pid, pts]) => {
      deltas[pid] = (deltas[pid] || 0) + pts;
    });
  } else if (room.activeGame === 'adedanha' && room.adedanha) {
    Object.entries(room.adedanha.pointsAwarded || {}).forEach(([pid, pts]) => {
      deltas[pid] = (deltas[pid] || 0) + pts;
    });
  } else if (room.activeGame === 'estadios' && room.estadios) {
    Object.entries(room.estadios.pointsAwarded || {}).forEach(([pid, pts]) => {
      deltas[pid] = (deltas[pid] || 0) + pts;
    });
  } else if (room.activeGame === 'respostas-sem-perguntas' && room.respostasSemPerguntas) {
    Object.entries(room.respostasSemPerguntas.pointsAwarded || {}).forEach(([pid, pts]) => {
      deltas[pid] = (deltas[pid] || 0) + pts;
    });
  } else if ((room.activeGame === 'quem-sou-eu' || room.activeGame === 'onde-estou') && room.quemSouEu) {
    Object.entries(room.quemSouEu.pointsAwarded || {}).forEach(([pid, pts]) => {
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
  } else if (
    room.activeGame === 'mimica' ||
    room.activeGame === 'mega-resenha' ||
    room.activeGame === 'repetente' ||
    room.activeGame === 'como-eu-pinto'
  ) {
    // Jogos de equipe: cada jogador soma os pontos que a propria equipe fez na rodada.
    const teamPts = computeRoundTeamPoints(room);
    room.players.forEach((p) => {
      const pts = teamPts[p.team] || 0;
      if (pts > 0) deltas[p.id] = (deltas[p.id] || 0) + pts;
    });
  } else if (room.activeGame === 'perguntas-e-verdades' && room.perguntasEVerdades) {
    const winnerId = room.perguntasEVerdades.winnerPlayerId;
    if (winnerId && room.players.some((p) => p.id === winnerId)) {
      deltas[winnerId] = (deltas[winnerId] || 0) + 100;
    }
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