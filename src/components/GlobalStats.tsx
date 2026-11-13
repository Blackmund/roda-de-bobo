import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, SessionStats, GameHistoryEntry } from '../types/game';
import {
  getSessionMVPHistory,
  computeCareerTrophyMedals
} from '../utils/sessionPersistence';
import {
  Trophy,
  History,
  ChevronDown,
  ChevronUp,
  Flame,
  RotateCcw,
  Crown,
  Medal,
  Calendar,
  Clock,
  Sparkles,
  Award,
  Users
} from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import { PlayerMark } from './rdb/PlayerMark';

interface GlobalStatsProps {
  stats: SessionStats;
  teamAName: string;
  teamBName: string;
  players?: Player[];
  onResetStats?: () => void;
  className?: string;
  defaultExpanded?: boolean;
}

function formatDate(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Hoje, ${timeStr}`;
    }
    return `${d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })}, ${timeStr}`;
  } catch {
    return 'Recente';
  }
}

export const GlobalStats: React.FC<GlobalStatsProps> = ({
  stats,
  teamAName,
  teamBName,
  players = [],
  onResetStats,
  className = ''
}) => {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // 1. Total de Partidas & Rodadas
  const totalMatches = stats.totalMatches || stats.history.length;
  const totalRounds = stats.history.reduce((sum, h) => sum + (h.roundsPlayed || 1), 0);

  // 2. Jogo Mais Disputado da Sessão
  const gameCounts: Record<string, { count: number; name: string }> = {};
  stats.history.forEach((h) => {
    const name = h.gameName || 'Jogo';
    if (!gameCounts[name]) {
      gameCounts[name] = { count: 0, name };
    }
    gameCounts[name].count += 1;
  });
  const topGameEntry = Object.values(gameCounts).sort((a, b) => b.count - a.count)[0];
  const topGameName = topGameEntry ? topGameEntry.name : 'Nenhum ainda';
  const topGameCount = topGameEntry ? topGameEntry.count : 0;

  // 3. Recorde Individual de Pontos (Single-match high score)
  let recordScore = 0;
  let recordPlayerName = '-';
  let recordPlayerAvatar = '👑';

  stats.history.forEach((h) => {
    if (h.mvp && h.mvp.score > recordScore) {
      recordScore = h.mvp.score;
      recordPlayerName = h.mvp.name;
      recordPlayerAvatar = h.mvp.avatar || '👑';
    }
    h.playerScores?.forEach((ps) => {
      if (ps.score > recordScore) {
        recordScore = ps.score;
        recordPlayerName = ps.name;
        recordPlayerAvatar = ps.avatar || '👑';
      }
    });
  });

  if (recordScore === 0 && players.length > 0) {
    const topPlayer = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    if (topPlayer && (topPlayer.score || 0) > 0) {
      recordScore = topPlayer.score;
      recordPlayerName = topPlayer.name;
      recordPlayerAvatar = topPlayer.avatar || '👑';
    }
  }

  // 4. MVPs e Troféus
  const mvpHistory = getSessionMVPHistory(stats, teamAName, teamBName);
  const trophyMedals = computeCareerTrophyMedals(stats, teamAName, teamBName, players);
  const unlockedTrophies = trophyMedals.filter((m) => m.unlocked).length;

  const toggleMatchRow = (id: string) => {
    sounds.playTick();
    setExpandedMatchId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      data-testid="global-stats-container"
      className={`space-y-4 text-[#F5F2EB] select-none ${className}`}
    >
      {/* 1. Header & Quick Overview KPI Cards */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/60 border border-white/10 p-3 sm:p-4 rounded">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#17B8B8] shrink-0" />
          <h2 className="font-anton text-base sm:text-lg uppercase tracking-wide text-white">
            HISTÓRICO DE PARTIDAS
          </h2>
        </div>

        {onResetStats && stats.totalMatches > 0 && (
          <button
            type="button"
            onClick={() => {
              sounds.playFlip();
              onResetStats();
            }}
            className="text-[11px] font-mono-code text-rose-400 hover:text-rose-300 flex items-center gap-1.5 border border-rose-500/40 bg-rose-950/20 px-2.5 py-1.5 whitespace-nowrap hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} className="shrink-0" />
            <span>Zerar Histórico</span>
          </button>
        )}
      </div>

      {/* KPI Performance Metrics Grid (Indicadores dinâmicos da sessão) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Matches */}
        <div className="bg-[#0b0d14] border border-white/10 p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">
            PARTIDAS
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-anton text-2xl sm:text-3xl text-white">
              {totalMatches}
            </span>
            <span className="text-[10px] font-mono-code text-slate-500 font-bold uppercase">
              {totalRounds > 0 ? `${totalRounds} RODADAS` : 'TOTAL'}
            </span>
          </div>
        </div>

        {/* Jogo Mais Jogado (Substitui Dupla Alfa) */}
        <div className="bg-[#0b0d14] border border-cyan-500/30 p-3 flex flex-col justify-between min-w-0">
          <span className="text-[10px] font-mono-code uppercase text-cyan-400 font-bold truncate">
            JOGO MAIS JOGADO
          </span>
          <div className="flex items-baseline justify-between mt-1 min-w-0">
            <span className="font-anton text-base sm:text-lg text-cyan-300 uppercase truncate">
              {topGameCount > 0 ? topGameName : '-'}
            </span>
            <span className="text-[10px] font-mono-code text-cyan-400/80 font-bold shrink-0 ml-1">
              {topGameCount > 0 ? `${topGameCount} ${topGameCount === 1 ? 'PARTIDA' : 'PARTIDAS'}` : 'NENHUM AINDA'}
            </span>
          </div>
        </div>

        {/* Recorde Individual (Substitui Dupla Bravo) */}
        <div className="bg-[#0b0d14] border border-rose-500/30 p-3 flex flex-col justify-between min-w-0">
          <span className="text-[10px] font-mono-code uppercase text-rose-400 font-bold truncate">
            RECORDE DE PONTOS
          </span>
          <div className="flex items-baseline justify-between mt-1 min-w-0">
            <span className="font-anton text-2xl sm:text-3xl text-rose-300 shrink-0">
              {recordScore > 0 ? `${recordScore}P` : '-'}
            </span>
            <span className="text-[10px] font-mono-code text-rose-400/80 font-bold truncate ml-1">
              {recordPlayerName !== '-' ? recordPlayerName : 'RECORDE DA MESA'}
            </span>
          </div>
        </div>

        {/* Troféus e MVPs Ativos */}
        <div className="bg-[#0b0d14] border border-amber-500/30 p-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono-code uppercase text-amber-400 font-bold">
            CONQUISTAS & MVPS
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-anton text-2xl sm:text-3xl text-amber-300">
              {mvpHistory.length}
            </span>
            <span className="text-[10px] font-mono-code text-amber-400/80 font-bold">
              {unlockedTrophies} TROFÉUS
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Row List of Matches (Click to Expand Detail) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 px-1">
          <span>PARTIDAS RECENTES ({stats.history.length})</span>
          <span>CLIQUE NA LINHA PARA EXPANDIR</span>
        </div>

        {stats.history.length === 0 ? (
          <div className="p-8 border border-dashed border-white/10 bg-black/40 text-center font-mono-code text-xs text-slate-500 rounded">
            Nenhuma partida registrada nesta sessão. Conclua uma partida para visualizar o histórico detalhado aqui!
          </div>
        ) : (
          <div className="space-y-2">
            {stats.history
              .slice()
              .reverse()
              .map((entry, idx) => {
                const matchId = entry.id || `match-${idx}`;
                const isExpanded = expandedMatchId === matchId;

                const winnerTeamName =
                  entry.winnerTeam === 'A'
                    ? teamAName
                    : entry.winnerTeam === 'B'
                    ? teamBName
                    : 'EMPATE';

                const loserTeamName =
                  entry.winnerTeam === 'A'
                    ? teamBName
                    : entry.winnerTeam === 'B'
                    ? teamAName
                    : null;

                const winningPlayers =
                  entry.playerScores?.filter((p) => p.team === entry.winnerTeam) || [];
                const losingPlayers =
                  entry.playerScores?.filter((p) => p.team && p.team !== entry.winnerTeam) || [];

                const winnerLabel =
                  winningPlayers.length > 0
                    ? winningPlayers.map((p) => p.name).join(' & ')
                    : winnerTeamName;

                const loserLabel =
                  losingPlayers.length > 0
                    ? losingPlayers.map((p) => p.name).join(' & ')
                    : loserTeamName;

                const winnerScore =
                  entry.winnerTeam === 'A'
                    ? entry.scoreA
                    : entry.winnerTeam === 'B'
                    ? entry.scoreB
                    : Math.max(entry.scoreA, entry.scoreB);

                const loserScore =
                  entry.winnerTeam === 'A'
                    ? entry.scoreB
                    : entry.winnerTeam === 'B'
                    ? entry.scoreA
                    : Math.min(entry.scoreA, entry.scoreB);

                return (
                  <div
                    key={matchId}
                    data-testid={`history-row-${idx}`}
                    className={`border transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'border-cyan-400/80 bg-[#0d101a] shadow-[0_0_16px_rgba(23,184,184,0.15)]'
                        : 'border-white/10 bg-[#07090e] hover:border-white/25 hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Compact Clickable Summary Row */}
                    <div
                      onClick={() => toggleMatchRow(matchId)}
                      className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 cursor-pointer select-none"
                    >
                      {/* Left: Indicator bar, Game Name & Timestamp */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span
                          className={`w-1.5 self-stretch rounded-full shrink-0 ${
                            entry.winnerTeam === 'A'
                              ? 'bg-rose-500'
                              : entry.winnerTeam === 'B'
                              ? 'bg-cyan-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-anton text-sm sm:text-base text-white uppercase tracking-wider truncate">
                              {entry.gameName}
                            </span>
                            <span className="px-1.5 py-0.2 text-[9px] font-mono-code bg-white/10 text-slate-300 font-bold uppercase rounded shrink-0">
                              {entry.roundsPlayed}R
                            </span>
                          </div>
                          <div className="text-[10px] sm:text-[11px] font-mono-code text-slate-400 flex items-center gap-1.5 sm:gap-2 mt-0.5 truncate">
                            <span className="flex items-center gap-1 shrink-0">
                              <Clock size={11} className="text-slate-500" />
                              {formatDate(entry.timestamp)}
                            </span>
                            {entry.theme && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="truncate max-w-[140px] sm:max-w-[220px]">
                                  "{entry.theme}"
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Winner & Loser concise summary */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 font-mono-code text-xs w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                        {entry.winnerTeam === 'EMPATE' ? (
                          <div className="text-amber-400 font-bold uppercase bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 text-[10px] sm:text-[11px]">
                            EMPATE ({entry.scoreA} x {entry.scoreB})
                          </div>
                        ) : (
                          <div className="text-left sm:text-right">
                            <div className="flex items-center gap-1.5 justify-start sm:justify-end">
                              <Trophy size={13} className="text-amber-400 shrink-0" />
                              <span className="font-anton text-xs sm:text-sm text-white uppercase tracking-wide truncate max-w-[150px] sm:max-w-none">
                                {winnerLabel}
                              </span>
                              <span className="font-anton text-sm sm:text-base font-bold text-amber-300 shrink-0">
                                {winnerScore} PTS
                              </span>
                            </div>
                            {loserLabel && (
                              <div className="text-[9px] sm:text-[10px] text-slate-500 text-left sm:text-right truncate max-w-[180px] sm:max-w-none">
                                derrotou {loserLabel} ({loserScore} pts)
                              </div>
                            )}
                          </div>
                        )}

                        {/* MVP Pill if present */}
                        {entry.mvp && (
                          <div className="hidden md:flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-amber-300 text-[10px] font-mono-code font-bold uppercase shrink-0">
                            <Crown size={11} className="text-amber-400" />
                            <span>{entry.mvp.name} ({entry.mvp.score}p)</span>
                          </div>
                        )}

                        {/* Chevron Expand Indicator */}
                        <div
                          className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-slate-400 border border-white/10 transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180 text-cyan-300 border-cyan-400/40 bg-cyan-950/30' : ''
                          }`}
                        >
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/10 bg-black/60 p-3.5 space-y-3"
                        >
                          {/* Match Stats Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono-code">
                            {/* Placar Final */}
                            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                PLACAR FINAL
                              </span>
                              <div className="font-anton text-lg text-white">
                                <span className="text-rose-400">{teamAName}: {entry.scoreA} pts</span>
                                <span className="text-slate-500 mx-1.5">x</span>
                                <span className="text-cyan-400">{teamBName}: {entry.scoreB} pts</span>
                              </div>
                            </div>

                            {/* MVP da Partida */}
                            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded">
                              <span className="text-[10px] text-amber-400 uppercase font-bold block mb-1 flex items-center gap-1">
                                <Crown size={11} /> MVP DA PARTIDA
                              </span>
                              {entry.mvp ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg"><PlayerMark p={entry.mvp} /></span>
                                  <div>
                                    <div className="font-anton text-sm text-white uppercase">
                                      {entry.mvp.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {entry.mvp.score} pontos · Acc {entry.mvp.accuracy || 100}%
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px]">Jogo coletivo em equipe</span>
                              )}
                            </div>

                            {/* Tema e Rodadas */}
                            <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                                DETALHES
                              </span>
                              <div className="text-slate-300 text-[11px] truncate">
                                <strong>Tema:</strong> {entry.theme || 'Geral'}
                              </div>
                              <div className="text-slate-400 text-[10px] mt-0.5">
                                <strong>Duração:</strong> {entry.roundsPlayed} rodadas disputadas
                              </div>
                            </div>
                          </div>

                          {/* Individual Player Scores if available */}
                          {entry.playerScores && entry.playerScores.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-mono-code uppercase font-bold text-slate-400 flex items-center gap-1">
                                <Users size={12} /> PONTUAÇÃO DOS JOGADORES NA PARTIDA:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {entry.playerScores.map((ps) => (
                                  <div
                                    key={ps.id}
                                    className="p-2 bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono-code"
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span><PlayerMark p={ps} /></span>
                                      <span className="truncate text-white font-bold">{ps.name}</span>
                                    </div>
                                    <span className="text-amber-300 font-anton text-sm shrink-0">
                                      {ps.score}p
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 3. Salão de Conquistas & Troféus (Compact Cards at bottom) */}
      {trophyMedals.length > 0 && (
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
            <span className="flex items-center gap-1.5">
              <Medal size={14} className="text-amber-400" />
              <span>TROFÉUS & RECORDES DE CARREIRA</span>
            </span>
            <span className="text-amber-400 font-bold">
              {trophyMedals.filter((m) => m.unlocked).length} DESBLOQUEADOS
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {trophyMedals.map((medal) => (
              <div
                key={medal.id}
                className="p-2.5 bg-black/40 border border-white/10 flex items-center gap-2.5 rounded"
              >
                <span className="text-2xl shrink-0"><PlayerMark p={{ name: medal.playerName }} /></span>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono-code text-amber-400 font-bold uppercase truncate">
                    {medal.title}
                  </div>
                  <div className="font-anton text-xs text-white uppercase truncate">
                    {medal.playerName}
                  </div>
                  <div className="text-[9px] font-mono-code text-slate-400 truncate">
                    {medal.metricValue}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
