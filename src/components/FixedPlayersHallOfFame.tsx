import React from 'react';
import { motion } from 'motion/react';
import { FIXED_PLAYERS, loadFixedPlayersStats, FixedPlayerDefinition } from '../utils/fixedPlayers';
import { Trophy, Star, ShieldCheck, Flame, Users } from 'lucide-react';
import { Player } from '../types/game';

interface FixedPlayersHallOfFameProps {
  currentMatchPlayers?: Player[];
}

export const FixedPlayersHallOfFame: React.FC<FixedPlayersHallOfFameProps> = ({
  currentMatchPlayers = []
}) => {
  const stats = loadFixedPlayersStats();

  const getMatchStatus = (fp: FixedPlayerDefinition) => {
    const active = currentMatchPlayers.find(
      (p) =>
        (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
        p.name.toLowerCase() === fp.name.toLowerCase()
    );
    return active;
  };

  return (
    <motion.section
      data-testid="fixed-players-hall-of-fame"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.22 }}
      className="max-w-2xl mx-auto border-2 border-cyan-400/80 bg-[#07080f] shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-950/80 via-black to-rose-950/80 border-b border-cyan-500/50 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <Star size={17} className="text-cyan-400 fill-cyan-400" />
          <h2 className="font-anton text-sm md:text-base text-white tracking-wider uppercase">
            ELENCO FIXO DA CASA // HALL OF FAME
          </h2>
          <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider px-2 py-0.5 bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
            5 JOGADORES FIXOS
          </span>
        </div>
        <div className="text-[10px] font-mono-code text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>HISTÓRICO CUMULATIVO</span>
        </div>
      </div>

      {/* Intro Subtitle */}
      <div className="px-4 py-2 bg-black/50 border-b border-slate-800 text-[11px] font-mono-code text-slate-300 flex items-center justify-between">
        <span>Carreira permanente dos jogadores titulares (Marcos André, Gisele, Débora, João Gabriel, Ayrton).</span>
        <span className="hidden sm:inline text-amber-300">⭐ Titulares</span>
      </div>

      {/* Players Cards Grid */}
      <div className="p-4 md:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {FIXED_PLAYERS.map((fp, idx) => {
          const playerStats = stats[fp.id] || {
            totalMatches: 0,
            totalVictories: 0,
            totalMvps: 0,
            totalPoints: 0,
            bestScore: 0
          };
          const activeInMatch = getMatchStatus(fp);
          const winRate =
            playerStats.totalMatches > 0
              ? Math.round((playerStats.totalVictories / playerStats.totalMatches) * 100)
              : 0;

          return (
            <div
              key={fp.id}
              data-testid={`fixed-player-card-${fp.id}`}
              className={`p-3 border-2 transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden bg-gradient-to-b from-[#090b14] to-black ${
                activeInMatch
                  ? 'border-cyan-400/90 shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header: Avatar, Name & In-Match Badge */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 border flex items-center justify-center text-xl shrink-0 shadow-inner relative"
                  style={{ borderColor: fp.color, backgroundColor: `${fp.color}20` }}
                >
                  <span>{fp.avatar}</span>
                  {activeInMatch && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border border-black rounded-full animate-pulse" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-anton text-sm text-white uppercase truncate flex items-center gap-1.5">
                    <span>{fp.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono-code font-bold uppercase text-slate-400">
                    {activeInMatch ? (
                      <span className="text-emerald-300 font-bold flex items-center gap-0.5">
                        <Flame size={10} />
                        <span>Nesta Partida ({activeInMatch.team === 'A' ? 'Equipe A' : 'Equipe B'})</span>
                      </span>
                    ) : (
                      <span>Banco / Ausente</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Matrix */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80 text-center">
                <div className="bg-black/70 border border-slate-800/80 p-1">
                  <div className="text-[8px] font-mono-code text-slate-400 uppercase font-bold">
                    VITÓRIAS
                  </div>
                  <div className="font-anton text-xs text-white">
                    {playerStats.totalVictories}/{playerStats.totalMatches}
                  </div>
                  <div className="text-[8px] font-mono-code text-cyan-300">
                    {winRate}%
                  </div>
                </div>

                <div className="bg-black/70 border border-slate-800/80 p-1">
                  <div className="text-[8px] font-mono-code text-slate-400 uppercase font-bold">
                    MVPS
                  </div>
                  <div className="font-anton text-xs text-amber-300 flex items-center justify-center gap-0.5">
                    <Trophy size={10} />
                    <span>{playerStats.totalMvps}</span>
                  </div>
                  <div className="text-[8px] font-mono-code text-slate-400">
                    TROFÉUS
                  </div>
                </div>

                <div className="bg-black/70 border border-slate-800/80 p-1">
                  <div className="text-[8px] font-mono-code text-slate-400 uppercase font-bold">
                    RECORDE
                  </div>
                  <div className="font-anton text-xs text-rose-300">
                    {playerStats.bestScore}p
                  </div>
                  <div className="text-[8px] font-mono-code text-slate-400">
                    TOTAL {playerStats.totalPoints}p
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
};
