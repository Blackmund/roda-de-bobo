import { computeRoundTeamPoints } from '../utils/roundPoints';
import { GAME_NAMES } from './gameNames';
import type { GameRoom } from '../types/game';
import React from 'react';
import { GameHistoryEntry, TeamId } from '../types/game';
import { TEAM_META, getActiveTeamIds, syncTeamsRecordFromPlayers } from '../utils/teamUtils';
import { pintoRoundPoints } from '../utils/comoEuPintoEngine';
import { updateFixedPlayersAfterMatch } from '../utils/fixedPlayers';
import { accumulateRoundPlayerScores, buildMatchMVPSnapshot, buildTeamCollectiveMVPSnapshot, buildRoundActivityEvent } from '../utils/sessionPersistence';

interface buildNextRoundUpdaterDeps {
  shouldStartNextRound: boolean;
  nextMaxRoundsTarget: number;
  setSuddenDeathBanner: React.Dispatch<React.SetStateAction<string | null>>;
  duvidoEndsEarly: boolean;
}

export const buildNextRoundUpdater = ({
  shouldStartNextRound,
  nextMaxRoundsTarget,
  setSuddenDeathBanner,
  duvidoEndsEarly
}: buildNextRoundUpdaterDeps): ((prev: GameRoom) => GameRoom) =>
(prev) => {
      // Pontos da rodada por equipe (regra de cada jogo em utils/roundPoints.ts)
      const roundPts = computeRoundTeamPoints(prev);

      const roundPointsA = roundPts.A;
      const roundPointsB = roundPts.B;
      const newScoreA = prev.teams.A.score + roundPts.A;
      const newScoreB = prev.teams.B.score + roundPts.B;
      const newScoreC = (prev.teams.C?.score || 0) + roundPts.C;
      const newScoreD = (prev.teams.D?.score || 0) + roundPts.D;
      const updatedPlayers = accumulateRoundPlayerScores(prev);

      const updatedTeams = {
        ...syncTeamsRecordFromPlayers(updatedPlayers, prev.teams),
        A: {
          ...prev.teams.A,
          members: updatedPlayers.filter((p) => p.team === 'A').map((p) => p.id),
          score: newScoreA
        },
        B: {
          ...prev.teams.B,
          members: updatedPlayers.filter((p) => p.team === 'B').map((p) => p.id),
          score: newScoreB
        },
        C: {
          id: 'C' as const,
          name: prev.teams.C?.name || TEAM_META.C.defaultName,
          color: prev.teams.C?.color || TEAM_META.C.hex,
          members: updatedPlayers.filter((p) => p.team === 'C').map((p) => p.id),
          score: newScoreC
        },
        D: {
          id: 'D' as const,
          name: prev.teams.D?.name || TEAM_META.D.defaultName,
          color: prev.teams.D?.color || TEAM_META.D.hex,
          members: updatedPlayers.filter((p) => p.team === 'D').map((p) => p.id),
          score: newScoreD
        }
      };

      const roundEvent = buildRoundActivityEvent(
        prev,
        roundPointsA,
        roundPointsB,
        newScoreA,
        newScoreB,
        prev.activeGame ? GAME_NAMES[prev.activeGame] : 'PARTIDA'
      );
      const updatedRoundLog = [...(prev.roundLog || []), roundEvent];

      const nextRoundNum = prev.roundNumber + 1;
      const isIndividualGame =
        prev.activeGame === 'limite' ||
        prev.activeGame === 'nota' ||
        prev.activeGame === 'quem-sou-eu' ||
        prev.activeGame === 'onde-estou' ||
        prev.activeGame === 'respostas-sem-perguntas' ||
        prev.activeGame === 'estadios' ||
        prev.activeGame === 'perguntas-e-verdades';

      const sortedPlayers = [...updatedPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
      const topScore = sortedPlayers[0]?.score || 0;
      const tiedTopPlayers = sortedPlayers.filter((p) => (p.score || 0) === topScore);

      const activeTeamIds = getActiveTeamIds(prev);
      const activeTeamScores = activeTeamIds.map((tId) => ({
        id: tId,
        score: updatedTeams[tId]?.score || 0
      }));
      const maxTeamScore = Math.max(...activeTeamScores.map((t) => t.score), 0);
      const topTeams = activeTeamScores.filter((t) => t.score === maxTeamScore);

      const isTiedAtEnd =
        nextRoundNum > prev.maxRounds &&
        prev.roundNumber <= 12 &&
        (isIndividualGame
          ? topScore > 0 && tiedTopPlayers.length > 1
          : maxTeamScore > 0 && topTeams.length > 1);

      if (isTiedAtEnd) {
        shouldStartNextRound = true;
        nextMaxRoundsTarget = prev.maxRounds + 1;
        setSuddenDeathBanner('⚡ EMPATE NO TOPO! RODADA DE MORTE SÚBITA ATIVADA!');
        return {
          ...prev,
          roundNumber: nextRoundNum,
          maxRounds: prev.maxRounds + 1,
          players: updatedPlayers,
          roundLog: updatedRoundLog,
          teams: updatedTeams
        };
      }

      setSuddenDeathBanner(null);
      const isGameOver = nextRoundNum > prev.maxRounds || duvidoEndsEarly;

      const clearedTemOuNaoTem = prev.temOuNaoTem
        ? { ...prev.temOuNaoTem, roundScore: { A: 0, B: 0, C: 0, D: 0 } }
        : undefined;
      const clearedProibido = prev.proibido
        ? { ...prev.proibido, roundScore: 0 }
        : undefined;

      if (isGameOver) {
        const winnerTeam: TeamId | 'EMPATE' =
          maxTeamScore > 0 && topTeams.length === 1 ? topTeams[0].id : 'EMPATE';

        const historyItem: GameHistoryEntry = {
          id: 'match_' + Date.now(),
          gameId: prev.activeGame || 'limite',
          gameName: prev.activeGame ? GAME_NAMES[prev.activeGame] : 'JOGO',
          timestamp: Date.now(),
          winnerTeam,
          scoreA: newScoreA,
          scoreB: newScoreB,
          scoreC: newScoreC,
          scoreD: newScoreD,
          roundsPlayed: duvidoEndsEarly ? prev.roundNumber : prev.maxRounds,
          theme: prev.theme,
          playerScores: updatedPlayers.map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            team: p.team,
            score: p.score,
            roundsPlayed: p.roundsPlayed,
            roundsWon: p.roundsWon,
            accuracy: p.accuracy
          })),
          mvp: isIndividualGame
            ? buildMatchMVPSnapshot(
                updatedPlayers,
                newScoreA,
                newScoreB,
                prev.maxRounds,
                prev.teams.A.name,
                prev.teams.B.name
              )
            : buildTeamCollectiveMVPSnapshot(
                updatedPlayers,
                winnerTeam,
                maxTeamScore,
                prev.maxRounds,
                updatedTeams
              ),
          roundLog: updatedRoundLog
        };

        const updatedStats = {
          totalMatches: prev.sessionStats.totalMatches + 1,
          victoriesA: prev.sessionStats.victoriesA + (winnerTeam === 'A' ? 1 : 0),
          victoriesB: prev.sessionStats.victoriesB + (winnerTeam === 'B' ? 1 : 0),
          victoriesC: (prev.sessionStats.victoriesC || 0) + (winnerTeam === 'C' ? 1 : 0),
          victoriesD: (prev.sessionStats.victoriesD || 0) + (winnerTeam === 'D' ? 1 : 0),
          totalPointsA: prev.sessionStats.totalPointsA + newScoreA,
          totalPointsB: prev.sessionStats.totalPointsB + newScoreB,
          totalPointsC: (prev.sessionStats.totalPointsC || 0) + newScoreC,
          totalPointsD: (prev.sessionStats.totalPointsD || 0) + newScoreD,
          history: [...prev.sessionStats.history, historyItem]
        };

        const updatedMatchRoom = {
          ...prev,
          screen: 'game-over' as const,
          players: updatedPlayers,
          roundLog: updatedRoundLog,
          temOuNaoTem: clearedTemOuNaoTem,
          proibido: clearedProibido,
          teams: updatedTeams,
          sessionStats: updatedStats
        };

        // Persist lifetime career statistics for Fixed Players in this match
        updateFixedPlayersAfterMatch(updatedMatchRoom);

        return updatedMatchRoom;
      }

      shouldStartNextRound = true;
      return {
        ...prev,
        roundNumber: nextRoundNum,
        players: updatedPlayers,
        roundLog: updatedRoundLog,
        temOuNaoTem: clearedTemOuNaoTem,
        proibido: clearedProibido,
        teams: updatedTeams
      };
    };
