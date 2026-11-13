import React from 'react';
import { Suspense } from 'react';
import { useDevMode } from './devMode';
import { motion } from 'motion/react';
import { GameId, GameRoom, GameHistoryEntry } from '../types/game';
import { ScreenLimite, ScreenDuvido, ScreenComoEuPinto, ScreenEstadios, ScreenAdedanha, ScreenComTerra, ScreenRespostasSemPerguntas, ScreenRepetente, ScreenMegaResenha, ScreenQuemSouEu, ScreenMimica, ScreenProibido, ScreenNota, ScreenTemOuNaoTem, ScreenPerguntasEVerdades } from './lazyScreens';
import { updateFixedPlayersAfterMatch } from '../utils/fixedPlayers';
import { buildMatchMVPSnapshot } from '../utils/sessionPersistence';
import { applyPVMatchResult } from '../utils/perguntasEVerdadesEngine';
import { PhaseStinger } from '../components/art/PhaseStinger';
import { ActiveTurnBanner } from '../components/ActiveTurnBanner';

/** Jogos que ainda nao desenham a propria faixa "Vez de": ela entra aqui, acima do jogo. */
const TURN_BAR_GAMES: GameId[] = [
  'mimica',
  'quem-sou-eu',
  'onde-estou',
  'mega-resenha',
  'repetente',
  'respostas-sem-perguntas',
  'estadios',
  'como-eu-pinto',
  'perguntas-e-verdades',
  'com-terra'
];

interface PlayingScreenProps {
  room: GameRoom;
  isTvMode: boolean;
  broadcastState: (updater: GameRoom | ((prev: GameRoom) => GameRoom)) => void;
  handleNextRound: () => void;
}

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  room,
  isTvMode,
  broadcastState,
  handleNextRound
}) => {
  const devMode = useDevMode();
  return (
            <motion.div
              key={`screen-playing-${room.activeGame}`}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full h-full flex-1 min-h-0 flex flex-col gap-1.5"
            >
              <PhaseStinger room={room} />
              {devMode && room.roundSource && room.activeGame !== 'com-terra' && (
                <div
                  data-testid="round-source-badge"
                  title={room.roundSource === 'ai' ? 'Conteúdo desta rodada gerado pela IA (Gemini)' : 'Conteúdo desta rodada vem do banco de perguntas do jogo'}
                  className="pointer-events-none self-end shrink-0 border border-white/15 px-2 py-1 font-mono text-xs uppercase tracking-wider text-slate-300"
                >
                  {room.roundSource === 'ai' ? 'Conteúdo: IA' : 'Conteúdo: banco'}
                </div>
              )}
              {room.activeGame && TURN_BAR_GAMES.includes(room.activeGame) && (
                <div className="shrink-0" data-testid="playing-turn-bar">
                  <ActiveTurnBanner room={room} />
                </div>
              )}
              <div className="flex-1 min-h-0 relative">
              <Suspense
                fallback={
                  <div className="py-24 text-center font-anton text-2xl text-cyan-300 uppercase tracking-wider animate-pulse">
                    CARREGANDO JOGO...
                  </div>
                }
              >
              {room.activeGame === 'limite' && (
                <ScreenLimite
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateLimiteState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      limite: prev.limite ? updater(prev.limite) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'duvido' && (
                <ScreenDuvido
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateDuvidoState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      duvido: prev.duvido ? updater(prev.duvido) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'proibido' && (
                <ScreenProibido
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateProibidoState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      proibido: prev.proibido ? updater(prev.proibido) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'como-eu-pinto' && (
                <ScreenComoEuPinto
                  room={room}
                  isTvMode={isTvMode}
                  onUpdatePintoState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      comoEuPinto: prev.comoEuPinto ? updater(prev.comoEuPinto) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'com-terra' && (
                <ScreenComTerra
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateComTerraState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      comTerra: prev.comTerra ? updater(prev.comTerra) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'adedanha' && (
                <ScreenAdedanha
                  room={room}
                  onUpdateAdedanhaState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      adedanha: prev.adedanha ? updater(prev.adedanha) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'estadios' && (
                <ScreenEstadios
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateEstadiosState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      estadios: prev.estadios ? updater(prev.estadios) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'respostas-sem-perguntas' && (
                <ScreenRespostasSemPerguntas
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateRespostasState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      respostasSemPerguntas: prev.respostasSemPerguntas ? updater(prev.respostasSemPerguntas) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'repetente' && (
                <ScreenRepetente
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateRepetenteState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      repetente: prev.repetente ? updater(prev.repetente) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'mega-resenha' && (
                <ScreenMegaResenha
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateMegaState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      megaResenha: prev.megaResenha ? updater(prev.megaResenha) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {(room.activeGame === 'quem-sou-eu' || room.activeGame === 'onde-estou') && (
                <ScreenQuemSouEu
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateQuemSouEuState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      quemSouEu: prev.quemSouEu ? updater(prev.quemSouEu) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'mimica' && (
                <ScreenMimica
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateMimicaState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      mimica: prev.mimica ? updater(prev.mimica) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'nota' && (
                <ScreenNota
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateNotaState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      nota: prev.nota ? updater(prev.nota) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'tem-ou-nao-tem' && (
                <ScreenTemOuNaoTem
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateTemOuNaoTemState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      temOuNaoTem: prev.temOuNaoTem ? updater(prev.temOuNaoTem) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'perguntas-e-verdades' && (
                <ScreenPerguntasEVerdades
                  room={room}
                  isTvMode={isTvMode}
                  onUpdatePVState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      perguntasEVerdades: prev.perguntasEVerdades
                        ? updater(prev.perguntasEVerdades)
                        : undefined
                    }))
                  }
                  onDeclareMatchWinner={(winnerPlayerId, reason) => {
                    broadcastState((prev) => {
                      const winPlayer = prev.players.find((pl) => pl.id === winnerPlayerId);
                      const bonusA = winPlayer?.team === 'A' ? 100 : 0;
                      const bonusB = winPlayer?.team === 'B' ? 100 : 0;
                      const newScoreA = prev.teams.A.score + bonusA;
                      const newScoreB = prev.teams.B.score + bonusB;
                      // UX-19: estatisticas da partida a partir da propria serie, sem somar sobre valores antigos.
                      const pvPrev = prev.perguntasEVerdades;
                      const pvMatchRounds = Math.max(1, pvPrev?.matchRoundNumber || 1);
                      const pvWins = {
                        ...(pvPrev?.roundWinsByPlayer || {}),
                        [winnerPlayerId]: (pvPrev?.roundWinsByPlayer?.[winnerPlayerId] || 0) + 1
                      };
                      const updatedPlayers = applyPVMatchResult(prev.players, winnerPlayerId, pvMatchRounds, pvWins);

                      const winnerTeam: 'A' | 'B' | 'EMPATE' =
                        newScoreA > newScoreB ? 'A' : newScoreB > newScoreA ? 'B' : 'EMPATE';

                      const updatedRoundLog = [
                        ...(prev.roundLog || []),
                        {
                          id: 'pv_win_' + Date.now(),
                          roundNumber: prev.perguntasEVerdades?.auctionRound || 1,
                          gameId: 'perguntas-e-verdades' as GameId,
                          gameName: 'PERGUNTAS E VERDADES',
                          winnerTeam,
                          pointsA: bonusA,
                          pointsB: bonusB,
                          cumulativeScoreA: newScoreA,
                          cumulativeScoreB: newScoreB,
                          headline: `👑 ${winPlayer?.name || 'Jogador'} venceu em Perguntas e Verdades!`,
                          subheadline: reason,
                          topPlayerName: winPlayer?.name,
                          timestamp: Date.now()
                        }
                      ];

                      const historyItem: GameHistoryEntry = {
                        id: 'match_' + Date.now(),
                        gameId: 'perguntas-e-verdades',
                        gameName: 'PERGUNTAS E VERDADES',
                        timestamp: Date.now(),
                        winnerTeam,
                        scoreA: newScoreA,
                        scoreB: newScoreB,
                        roundsPlayed: pvMatchRounds,
                        theme: 'O Jogo do Diabo: Perguntas e Verdades',
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
                        mvp: buildMatchMVPSnapshot(
                          updatedPlayers,
                          newScoreA,
                          newScoreB,
                          pvMatchRounds,
                          prev.teams.A.name,
                          prev.teams.B.name
                        ),
                        roundLog: updatedRoundLog
                      };

                      const updatedMatchRoom = {
                        ...prev,
                        screen: 'game-over' as const,
                        players: updatedPlayers,
                        roundLog: updatedRoundLog,
                        perguntasEVerdades: prev.perguntasEVerdades
                          ? {
                              ...prev.perguntasEVerdades,
                              phase: 'FINISHED' as const,
                              winnerPlayerId,
                              winReason: reason
                            }
                          : undefined,
                        teams: {
                          A: { ...prev.teams.A, score: newScoreA },
                          B: { ...prev.teams.B, score: newScoreB }
                        },
                        sessionStats: {
                          totalMatches: prev.sessionStats.totalMatches + 1,
                          victoriesA: prev.sessionStats.victoriesA + (winnerTeam === 'A' ? 1 : 0),
                          victoriesB: prev.sessionStats.victoriesB + (winnerTeam === 'B' ? 1 : 0),
                          totalPointsA: prev.sessionStats.totalPointsA + newScoreA,
                          totalPointsB: prev.sessionStats.totalPointsB + newScoreB,
                          history: [...prev.sessionStats.history, historyItem]
                        }
                      };

                      updateFixedPlayersAfterMatch(updatedMatchRoom);
                      return updatedMatchRoom;
                    });
                  }}
                />
              )}
              </Suspense>
              </div>
            </motion.div>
          );
};
