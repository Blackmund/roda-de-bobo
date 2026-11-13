import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameRoom, TeamId } from '../types/game';
import { TEAM_META, getActiveTeamIds } from '../utils/teamUtils';
import { sounds } from '../utils/soundEffects';
import { ComparePlayersModal } from './lazyScreens';
import { GlobalStats } from '../components/GlobalStats';
import { PartyAchievements } from '../components/PartyAchievements';
import { FixedPlayersHallOfFame } from '../components/FixedPlayersHallOfFame';
import { computePartyAchievements } from '../utils/achievements';
import { computeMatchMVP, computeMatchPlayerComparison, shareMatchResults, getMatchRoundActivityLog } from '../utils/sessionPersistence';
import { Trophy, Home, Crown, Award, Share2, Check, Target, Layers, TrendingUp, CheckCircle2, Activity, Swords, Star, History, Medal, X } from 'lucide-react';
import { WinnerArt } from '../components/art/GameCardArt';
import { PlayerMark } from '../components/rdb/PlayerMark';

interface GameOverScreenProps {
  room: GameRoom;
  setShareFeedback: React.Dispatch<React.SetStateAction<{ status: "idle" | "shared"; text?: string; }>>;
  setActiveGameOverPanel: React.Dispatch<React.SetStateAction<"achievements" | "hall-of-fame" | "activity-log" | "history" | null>>;
  setIsCompareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shareFeedback: { status: "idle" | "shared"; text?: string; };
  isCompareModalOpen: boolean;
  activeGameOverPanel: "achievements" | "hall-of-fame" | "activity-log" | "history" | null;
  handleReturnToLobby: () => void;
  handleResetSessionStats: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  room,
  setShareFeedback,
  setActiveGameOverPanel,
  setIsCompareModalOpen,
  shareFeedback,
  isCompareModalOpen,
  activeGameOverPanel,
  handleReturnToLobby,
  handleResetSessionStats
}) => {
              const mvp = computeMatchMVP(room); // UX-15: MVP só da partida atual
              const playerComparison = computeMatchPlayerComparison(room);
              const roundActivityLog = getMatchRoundActivityLog(room);
              const partyAchievements = computePartyAchievements(room);
              const mvpPlayer = room.players.find((p) => p.id === mvp.playerId);
              const playerAccuracy =
                typeof mvpPlayer?.accuracy === 'number' && (mvpPlayer.roundsPlayed ?? 0) > 0
                  ? mvpPlayer.accuracy
                  : mvp.accuracy;
              const playerRoundsPlayed =
                typeof mvpPlayer?.roundsPlayed === 'number' && mvpPlayer.roundsPlayed > 0
                  ? mvpPlayer.roundsPlayed
                  : mvp.roundsPlayed;
              const playerRoundsWon =
                typeof mvpPlayer?.roundsWon === 'number' && (mvpPlayer.roundsPlayed ?? 0) > 0
                  ? mvpPlayer.roundsWon
                  : mvp.roundsWon;
              const avgPointsPerRound =
                playerRoundsPlayed > 0
                  ? Math.round((mvp.score / playerRoundsPlayed) * 10) / 10
                  : mvp.score;

              const isIndividualMatch =
                room.activeGame === 'nota' ||
                room.activeGame === 'limite' ||
                room.activeGame === 'quem-sou-eu' ||
                room.activeGame === 'onde-estou' ||
                room.activeGame === 'respostas-sem-perguntas' ||
                room.activeGame === 'estadios' ||
                room.activeGame === 'com-terra' ||
                room.activeGame === 'perguntas-e-verdades';

              const sortedIndividualPlayers = [...room.players].sort(
                (a, b) => (b.score || 0) - (a.score || 0)
              );
              const topIndividualScore = sortedIndividualPlayers[0]?.score || 0;
              const tiedIndividualWinners = sortedIndividualPlayers.filter(
                (p) => (p.score || 0) === topIndividualScore
              );

              const activeTeamIds = getActiveTeamIds(room);
              const activeTeamScores = activeTeamIds.map((tId) => ({
                id: tId,
                name: room.teams[tId]?.name || TEAM_META[tId].defaultName,
                score: room.teams[tId]?.score || 0
              }));
              const maxTeamScore = Math.max(...activeTeamScores.map((t) => t.score), 0);
              const topTeams = activeTeamScores.filter((t) => t.score === maxTeamScore);

              const winningTeamKey: TeamId | 'EMPATE' =
                maxTeamScore > 0 && topTeams.length === 1 ? topTeams[0].id : 'EMPATE';
              const winningTeamName =
                winningTeamKey !== 'EMPATE'
                  ? room.teams[winningTeamKey]?.name || TEAM_META[winningTeamKey].defaultName
                  : 'EMPATE';

              const winningTeamPlayers = isIndividualMatch
                ? sortedIndividualPlayers
                : winningTeamKey === 'EMPATE'
                ? [...room.players].sort((a, b) => b.score - a.score)
                : room.players
                    .filter((p) => p.team === winningTeamKey)
                    .sort((a, b) => b.score - a.score);

              const topWinningPlayer = winningTeamPlayers[0] || mvpPlayer || room.players[0];
              const collectiveHighlightName =
                winningTeamKey !== 'EMPATE' ? winningTeamName : 'Empate entre Equipes';
              const collectiveMembersLabel =
                winningTeamPlayers.length > 0
                  ? winningTeamPlayers.map((p) => p.name).join(' & ')
                  : 'Equipe em Conjunto';
              const displayHighlightScore = isIndividualMatch ? mvp.score : maxTeamScore;
              const avgPointsPerRoundDisplay =
                playerRoundsPlayed > 0
                  ? Math.round((displayHighlightScore / playerRoundsPlayed) * 10) / 10
                  : displayHighlightScore;

              const handleShareMatchResults = async () => {
                sounds.playSuccess();
                const shareMvpPayload = isIndividualMatch
                  ? {
                      ...mvp,
                      accuracy: playerAccuracy,
                      roundsPlayed: playerRoundsPlayed,
                      roundsWon: playerRoundsWon
                    }
                  : {
                      ...mvp,
                      name: `${collectiveHighlightName} (${collectiveMembersLabel})`,
                      teamName: 'Pontuação em Equipe',
                      score: maxTeamScore,
                      accuracy: playerAccuracy,
                      roundsPlayed: playerRoundsPlayed,
                      roundsWon: playerRoundsWon
                    };
                const result = await shareMatchResults(room, shareMvpPayload);
                setShareFeedback({ status: 'shared', text: result.text });
                window.setTimeout(() => {
                  setShareFeedback((prev) =>
                    prev.status === 'shared' ? { status: 'idle' } : prev
                  );
                }, 4000);
              };

              const toggleExtraPanel = (
                panel: 'achievements' | 'hall-of-fame' | 'activity-log' | 'history'
              ) => {
                sounds.playFlip();
                setActiveGameOverPanel((prev) => (prev === panel ? null : panel));
              };

              return (
                <motion.div
                  key="screen-game-over"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="h-full flex flex-col justify-between gap-2.5 min-h-0 overflow-hidden"
                >
                  {/* 12-Column Zero-Scroll Horizontal Grid: Winner Centerpiece + MVP / Collective Dupla Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 items-stretch">
                    {/* LEFT COLUMN (6 cols): Winning Individual Champion OR Winning Team */}
                    <div
                      data-testid="gameover-winner-centerpiece"
                      className="lg:col-span-6 border border-amber-400/50 bg-gradient-to-b from-amber-950/35 via-[#07080d] to-[#07080d] p-4 text-center relative overflow-hidden flex flex-col justify-between min-h-0"
                    >
                      <div className="rdb-win-head shrink-0">
                        <div className="rdb-win-art">
                          <WinnerArt />
                        </div>
                        <p className="rdb-win-kicker">
                          {isIndividualMatch
                            ? tiedIndividualWinners.length === 1
                              ? 'Campeão da partida'
                              : 'Fim da partida'
                            : winningTeamKey !== 'EMPATE'
                            ? 'Equipe campeã'
                            : 'Fim da partida'}
                        </p>
                        <h1 data-testid="gameover-winner-name" className="rdb-win-name">
                          {isIndividualMatch
                            ? tiedIndividualWinners.length === 1 && tiedIndividualWinners[0]
                              ? tiedIndividualWinners[0].name
                              : 'Empate no topo'
                            : winningTeamKey !== 'EMPATE'
                            ? winningTeamName
                            : 'Empate na mesa'}
                        </h1>
                      </div>

                      {/* Highlight of the Ranking Individual or Winning Team Players */}
                      {winningTeamPlayers.length > 0 && (
                        <div className="space-y-1.5 min-h-0">
                          <div className="text-[10px] font-mono-code text-amber-300 uppercase font-bold tracking-wider">
                            {isIndividualMatch
                              ? 'RANKING INDIVIDUAL DOS JOGADORES'
                              : winningTeamKey === 'EMPATE'
                              ? 'INTEGRANTES DAS EQUIPES EMPATADAS'
                              : `EQUIPE CAMPEÃ (${winningTeamName} — PONTUAM JUNTOS)`}
                          </div>
                          {/* UX-14: lista TODOS os jogadores (sem corte em 6); rola dentro do painel se faltar espaço */}
                          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 max-h-[34vh] overflow-y-auto pr-1">
                            {winningTeamPlayers.map((wp, idx) => {
                              const isHighlightedWinner = isIndividualMatch
                                ? idx === 0
                                : winningTeamKey !== 'EMPATE';
                              return (
                                <div
                                  key={wp.id}
                                  data-testid={`winning-player-pill-${wp.id}`}
                                  className={`px-3 py-1.5 border flex items-center gap-2 ${
                                    isHighlightedWinner
                                      ? 'border-amber-300 bg-amber-500/20 text-white ring-1 ring-amber-400/50'
                                      : 'border-white/10 bg-white/[0.03] text-slate-200'
                                  }`}
                                >
                                  <span className="text-xl shrink-0"><PlayerMark p={wp} /></span>
                                  <div className="text-left min-w-0">
                                    <div className="font-anton text-sm uppercase leading-none flex items-center gap-1 truncate">
                                      {isIndividualMatch && (
                                        <span className="text-[10px] font-mono-code text-[#17B8B8]">
                                          #{idx + 1}
                                        </span>
                                      )}
                                      <span className="truncate">{wp.name}</span>
                                      {isHighlightedWinner && (
                                        <Crown size={12} className="text-amber-300 fill-amber-300 shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono-code text-amber-300 font-bold">
                                      {isIndividualMatch ? `${wp.score} PTS` : `${maxTeamScore} PTS (EQUIPE)`}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Match Score Cards (Shown for Team/Duplas games — supports 2, 3, or 4 teams) */}
                      {!isIndividualMatch && (
                        <div
                          className={`grid gap-2.5 pt-1 shrink-0 ${
                            activeTeamIds.length === 2
                              ? 'grid-cols-2'
                              : activeTeamIds.length === 3
                              ? 'grid-cols-3'
                              : 'grid-cols-2 sm:grid-cols-4'
                          }`}
                        >
                          {activeTeamIds.map((tId) => {
                            const meta = TEAM_META[tId];
                            const tName = room.teams[tId]?.name || meta.defaultName;
                            const tScore = room.teams[tId]?.score || 0;
                            const isWin = winningTeamKey === tId;
                            return (
                              <div
                                key={tId}
                                className={`p-2 border text-center ${
                                  isWin
                                    ? `${meta.borderClass} ${meta.bgClass}`
                                    : 'border-white/10 bg-white/[0.03]'
                                }`}
                              >
                                <span className={`font-anton text-[10px] uppercase block truncate ${meta.textClass}`}>
                                  {tName}
                                </span>
                                <span className="font-anton text-2xl text-white">
                                  {tScore} PTS
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN (6 cols): Individual MVP (for individual games) OR Collective Dupla Highlight (for team games) */}
                    <motion.div
                      data-testid="mvp-highlight-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="lg:col-span-6 border border-amber-400/50 bg-gradient-to-r from-amber-950/35 via-[#07080d] to-[#07080d] p-4 relative overflow-hidden flex flex-col justify-between min-h-0"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 border border-amber-300 bg-amber-500/20 flex items-center justify-center text-2xl relative shrink-0">
                            <span>
                              {isIndividualMatch ? (
                                <PlayerMark p={topWinningPlayer || { name: mvp.name }} />
                              ) : (
                                <PlayerMark p={{ name: 'Equipe' }} />
                              )}
                            </span>
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black p-0.5 border border-black">
                              <Crown size={11} className="fill-black" />
                            </span>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-amber-400 text-black font-mono-code text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Award size={10} />
                                <span>
                                  {isIndividualMatch
                                    ? 'CRAQUE DA PARTIDA // MVP'
                                    : 'DESTAQUE COLETIVO // EQUIPE CAMPEÃ'}
                                </span>
                              </span>
                              <span
                                className={`text-[9px] font-mono-code font-bold uppercase px-1.5 py-0.5 border ${
                                  isIndividualMatch
                                    ? 'border-amber-400/50 bg-amber-950/40 text-amber-300'
                                    : winningTeamKey === 'B'
                                    ? 'border-[#17B8B8]/50 bg-[#17B8B8]/10 text-cyan-300'
                                    : 'border-[#E6194B]/50 bg-[#E6194B]/10 text-rose-300'
                                }`}
                              >
                                {isIndividualMatch
                                  ? '👤 MODALIDADE INDIVIDUAL'
                                  : '🤝 PONTUAÇÃO EM CONJUNTO (SEM MVP INDIVIDUAL)'}
                              </span>
                            </div>
                            <div className="font-anton text-xl md:text-2xl text-amber-200 uppercase tracking-wide truncate">
                              {isIndividualMatch ? mvp.name : collectiveHighlightName}
                            </div>
                            <div className="text-[10px] font-mono-code text-amber-300/80 line-clamp-1">
                              {isIndividualMatch
                                ? mvp.highlightReason
                                : `Equipe: ${collectiveMembersLabel} — a equipe joga e pontua junto`}
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1.5">
                          <div>
                            <div className="text-[9px] font-mono-code text-amber-300/90 uppercase font-bold tracking-wider">
                              {isIndividualMatch ? 'PONTUAÇÃO MVP' : 'PONTUAÇÃO DA EQUIPE'}
                            </div>
                            <div className="font-anton text-2xl md:text-3xl text-amber-400 leading-none">
                              {displayHighlightScore} PTS
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isIndividualMatch && (
                              <button
                                type="button"
                                data-testid="compare-players-btn"
                                onClick={() => {
                                  sounds.playTick();
                                  setIsCompareModalOpen(true);
                                }}
                                className="px-2.5 py-1 border border-[#17B8B8]/60 bg-[#17B8B8]/15 hover:bg-[#17B8B8] text-cyan-200 hover:text-black font-mono-code text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer"
                              >
                                <Swords size={12} className="shrink-0" />
                                <span>Comparar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              data-testid="share-match-results-btn"
                              onClick={handleShareMatchResults}
                              className={`px-2.5 py-1 border font-mono-code text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                                shareFeedback.status === 'shared'
                                  ? 'border-emerald-400 bg-emerald-950/80 text-emerald-200'
                                  : 'border-amber-300 bg-amber-400 hover:bg-amber-300 text-black'
                              }`}
                            >
                              {shareFeedback.status === 'shared' ? (
                                <>
                                  <Check size={12} className="text-emerald-300 shrink-0" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 size={12} className="shrink-0" />
                                  <span>Compartilhar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Compact Performance Metrics */}
                      <div
                        data-testid="mvp-performance-metrics"
                        className="pt-2.5 border-t border-white/10 grid grid-cols-4 gap-2"
                      >
                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <Target size={11} className="text-amber-400 shrink-0" />
                            <span>Precisão</span>
                          </div>
                          <div
                            data-testid="mvp-metric-accuracy"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {playerAccuracy}%
                          </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <Layers size={11} className="text-amber-400 shrink-0" />
                            <span>Rodadas</span>
                          </div>
                          <div
                            data-testid="mvp-metric-rounds-played"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {playerRoundsPlayed}
                          </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <CheckCircle2 size={11} className="text-amber-400 shrink-0" />
                            <span>Vitórias</span>
                          </div>
                          <div
                            data-testid="mvp-metric-rounds-won"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {playerRoundsWon}/{playerRoundsPlayed}
                          </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <TrendingUp size={11} className="text-amber-400 shrink-0" />
                            <span>Pts / Rodada</span>
                          </div>
                          <div
                            data-testid="mvp-metric-avg-pts"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {avgPointsPerRoundDisplay} PTS
                          </div>
                        </div>
                      </div>

                      {shareFeedback.status === 'shared' && shareFeedback.text && (
                        <div
                          data-testid="share-match-results-feedback"
                          className="px-2.5 py-1 border border-emerald-500/40 bg-emerald-950/40 text-[10px] font-mono-code text-emerald-200 flex items-center justify-between gap-2"
                        >
                          <span>
                            ✅ Resumo copiado (
                            {isIndividualMatch
                              ? `${mvp.name} — ${mvp.score} PTS`
                              : `${collectiveHighlightName} (${collectiveMembersLabel}) — ${maxTeamScore} PTS`}{' '}
                            | Precisão {playerAccuracy}%)
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Compare Players Radar Chart Modal */}
                  <Suspense fallback={null}>
                    <ComparePlayersModal
                      isOpen={isCompareModalOpen}
                      onClose={() => setIsCompareModalOpen(false)}
                      comparison={playerComparison}
                    />
                  </Suspense>

                  {/* Bottom Bar: Extras Dock + Return to Lobby CTA */}
                  <div
                    data-testid="gameover-extras-dock"
                    className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 shrink-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid="toggle-achievements-btn"
                        onClick={() => toggleExtraPanel('achievements')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'achievements'
                            ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                        }`}
                      >
                        <Medal size={16} className="text-amber-400" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Conquistas ({partyAchievements.length})
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-hall-of-fame-btn"
                        onClick={() => toggleExtraPanel('hall-of-fame')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'hall-of-fame'
                            ? 'border-[#E6194B] bg-[#E6194B]/15 text-rose-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#E6194B]/50 hover:text-rose-200'
                        }`}
                      >
                        <Star size={16} className="text-[#E6194B]" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Hall da Fama
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-activity-log-btn"
                        onClick={() => toggleExtraPanel('activity-log')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'activity-log'
                            ? 'border-[#17B8B8] bg-[#17B8B8]/15 text-cyan-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#17B8B8]/50 hover:text-cyan-200'
                        }`}
                      >
                        <Activity size={16} className="text-[#17B8B8]" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Log de Atividade ({roundActivityLog.length})
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-history-btn"
                        onClick={() => toggleExtraPanel('history')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'history'
                            ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200'
                        }`}
                      >
                        <History size={16} className="text-emerald-400" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Histórico ({room.sessionStats.totalMatches})
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={handleReturnToLobby}
                      className="px-6 py-2.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-400 text-black font-anton text-sm uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Home size={16} />
                      <span>VOLTAR AO LOBBY PRINCIPAL</span>
                    </button>
                  </div>

                  {/* Accessible Modal Overlay for Extra Game Over Panels */}
                  <AnimatePresence>
                    {activeGameOverPanel && (
                      <div
                        data-testid="gameover-extra-modal-backdrop"
                        onClick={() => setActiveGameOverPanel(null)}
                        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 10 }}
                          transition={{ duration: 0.18 }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full max-w-3xl max-h-[85dvh] flex flex-col border border-[#17B8B8]/50 bg-[#07080d] shadow-2xl overflow-hidden"
                        >
                          <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between shrink-0">
                            <span className="font-anton text-sm uppercase tracking-wider text-[#17B8B8]">
                              {activeGameOverPanel === 'achievements' && '🏅 CONQUISTAS DA PARTIDA'}
                              {activeGameOverPanel === 'hall-of-fame' && '⭐ HALL DA FAMA'}
                              {activeGameOverPanel === 'activity-log' && '📊 LOG DE ATIVIDADE DA PARTIDA'}
                              {activeGameOverPanel === 'history' && '📜 HISTÓRICO DE SESSÃO'}
                            </span>
                            <button
                              type="button"
                              data-testid="gameover-extra-modal-close"
                              aria-label="Fechar Modal"
                              onClick={() => setActiveGameOverPanel(null)}
                              className="min-w-[44px] min-h-[44px] px-3 flex items-center justify-center gap-1 border border-white/15 bg-white/[0.04] hover:bg-[#E6194B] hover:border-[#E6194B] text-white font-mono-code text-xs font-bold uppercase cursor-pointer transition-colors"
                            >
                              <X size={16} />
                              <span>FECHAR</span>
                            </button>
                          </div>

                          <div className="p-4 overflow-y-auto flex-1">
                            {activeGameOverPanel === 'achievements' && (
                              <PartyAchievements achievements={partyAchievements} />
                            )}

                            {activeGameOverPanel === 'hall-of-fame' && (
                              <FixedPlayersHallOfFame currentMatchPlayers={room.players} />
                            )}

                            {activeGameOverPanel === 'activity-log' && (
                              <div data-testid="round-activity-log" className="space-y-2.5">
                                {roundActivityLog.map((event, idx) => {
                                  const isTeamA = event.winnerTeam === 'A';
                                  const isTeamB = event.winnerTeam === 'B';
                                  const cardBorder = isTeamA
                                    ? 'border-[#E6194B]/40'
                                    : isTeamB
                                    ? 'border-[#17B8B8]/40'
                                    : 'border-amber-500/40';
                                  const headlineColor = isTeamA
                                    ? 'text-rose-300'
                                    : isTeamB
                                    ? 'text-cyan-300'
                                    : 'text-amber-300';

                                  return (
                                    <div
                                      key={event.id || idx}
                                      data-testid={`round-activity-item-${idx}`}
                                      className={`p-3 border bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${cardBorder}`}
                                    >
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono-code uppercase text-slate-400">
                                          <span className="font-bold text-white">
                                            RODADA {event.roundNumber}
                                          </span>
                                          <span>·</span>
                                          <span>{event.gameName}</span>
                                        </div>
                                        <div
                                          data-testid={`round-activity-headline-${idx}`}
                                          className={`font-anton text-base uppercase tracking-wide ${headlineColor}`}
                                        >
                                          {event.headline}
                                        </div>
                                        <div className="text-[11px] font-mono-code text-slate-300">
                                          {event.subheadline}
                                        </div>
                                      </div>

                                      <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
                                        <div className="font-anton text-base tracking-wider">
                                          <span className="text-[#E6194B]">+{event.pointsA} PTS</span>
                                          <span className="text-slate-600 mx-1.5">/</span>
                                          <span className="text-[#17B8B8]">+{event.pointsB} PTS</span>
                                        </div>
                                        <div className="text-[10px] font-mono-code text-slate-400 uppercase">
                                          Placar: {event.cumulativeScoreA} x {event.cumulativeScoreB}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {activeGameOverPanel === 'history' && (
                              <div data-testid="gameover-history-panel">
                                <GlobalStats
                                  stats={room.sessionStats}
                                  teamAName={room.teams.A.name}
                                  teamBName={room.teams.B.name}
                                  players={room.players}
                                  onResetStats={handleResetSessionStats}
                                  defaultExpanded={true}
                                />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            };
