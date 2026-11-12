import React, { useState } from 'react';
import { Player, SessionStats } from '../types/game';
import { computePlayerRanking, PlayerRankingEntry } from '../utils/rankingEngine';
import { Trophy, Search, Sparkles } from 'lucide-react';
import { sounds } from '../utils/soundEffects';
import { PlayerMark } from './rdb/PlayerMark';

interface LeaderboardRankingProps {
  stats?: SessionStats;
  players?: Player[];
  className?: string;
}

export const LeaderboardRanking: React.FC<LeaderboardRankingProps> = ({
  stats,
  players = [],
  className = ''
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'winrate' | 'victories' | 'participations'>('winrate');

  const rankingList = computePlayerRanking(stats, players);

  const filteredRanking = rankingList
    .filter((entry) => entry.name.toLowerCase().includes(searchFilter.trim().toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'winrate') {
        if (b.winrate !== a.winrate) return b.winrate - a.winrate;
        return b.victories - a.victories;
      }
      if (sortBy === 'victories') {
        if (b.victories !== a.victories) return b.victories - a.victories;
        return b.winrate - a.winrate;
      }
      return b.participations - a.participations;
    });

  return (
    <div
      data-testid="leaderboard-ranking-table"
      className={`space-y-4 ${className}`}
    >
      {/* Header com título limpo "RANKING" (sem legendas) */}
      <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-3 rounded">
        <Trophy size={20} className="text-amber-400 shrink-0" />
        <h2 className="font-anton text-lg sm:text-xl uppercase tracking-wider text-white">
          RANKING
        </h2>
      </div>

      {/* Main Broadcast TV Leaderboard Table */}
      <div className="w-full select-none">
        <div className="w-full border-2 border-red-900/60 bg-[#0d0f17] shadow-2xl overflow-hidden">
          {/* Table Column Headers */}
          <div className="grid grid-cols-12 text-center font-anton text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest border-b-2 border-red-800/80 bg-black/90">
            <div className="col-span-5 py-2 px-2 sm:px-3 text-left text-slate-400 flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:inline">POSIÇÃO & JOGADOR</span>
              <span className="sm:hidden">JOGADOR</span>
            </div>
            <div className="col-span-2 py-2 px-0.5 sm:px-1 text-white border-l border-red-800/50 bg-black/60">
              <span className="hidden sm:inline">VITÓRIAS</span>
              <span className="sm:hidden">VIT</span>
            </div>
            <div className="col-span-3 py-2 px-0.5 sm:px-1 text-orange-400 border-l border-red-800/50 bg-[#160b05]">
              <span className="hidden sm:inline">PARTICIPAÇÕES</span>
              <span className="sm:hidden">PART</span>
            </div>
            <div className="col-span-2 py-2 px-0.5 sm:px-1 text-cyan-300 border-l border-red-800/50 bg-[#041a1a]">
              <span className="hidden sm:inline">APROV. %</span>
              <span className="sm:hidden">APROV</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-red-900/40 font-mono-code">
            {filteredRanking.map((entry, index) => {
              const position = index + 1;

              // Distinct target styling for top ranks
              const targetRingColor =
                position === 1
                  ? 'border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                  : position === 2
                  ? 'border-orange-400 text-orange-300'
                  : position === 3
                  ? 'border-amber-600 text-amber-500'
                  : 'border-orange-600/70 text-orange-400';

              return (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 items-stretch text-center transition-colors hover:bg-white/[0.04] ${
                    position === 1 ? 'bg-amber-950/15' : 'bg-transparent'
                  }`}
                >
                  {/* Position Badge & Player Avatar/Name */}
                  <div className="col-span-5 py-1.5 sm:py-2 px-1.5 sm:px-3 flex items-center gap-1.5 sm:gap-3 text-left min-w-0">
                    {/* Concentric Bullseye / Target Badge (Identical to CazéTV Broadcast Graphic) */}
                    <div className="relative shrink-0 flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10">
                      {/* Outer target ring */}
                      <span
                        className={`absolute inset-0 rounded-full border-2 ${targetRingColor} opacity-75`}
                      />
                      {/* Middle ring */}
                      <span
                        className={`absolute inset-0.5 sm:inset-1 rounded-full border ${targetRingColor} opacity-90`}
                      />
                      {/* Inner disc with number */}
                      <span className="relative font-anton text-xs sm:text-base md:text-xl font-bold tracking-normal">
                        {position}
                      </span>
                    </div>

                    {/* Player Photo / Avatar Card with Red Outline */}
                    <div
                      className="w-7 h-7 sm:w-10 sm:h-10 shrink-0 border-2 border-red-600 bg-slate-900/90 flex items-center justify-center text-sm sm:text-xl shadow-md overflow-hidden"
                      style={{ borderColor: entry.color || '#E6194B' }}
                    >
                      <PlayerMark p={entry} />
                    </div>

                    {/* Player Name and Fixed Tag */}
                    <div className="min-w-0 flex-1">
                      <div className="font-anton text-xs sm:text-sm md:text-base text-white uppercase tracking-wide truncate flex items-center gap-1 sm:gap-1.5">
                        <span className="truncate">{entry.name}</span>
                        {position === 1 && (
                          <Sparkles size={12} className="text-amber-400 shrink-0 animate-pulse hidden sm:inline" />
                        )}
                      </div>
                      <div className="text-[8px] sm:text-[10px] text-slate-400 flex items-center gap-1">
                        {entry.isFixedPlayer ? (
                          <span className="text-cyan-400 font-bold uppercase tracking-wider">
                            ELENCO
                          </span>
                        ) : (
                          <span className="text-slate-500 uppercase">CONVIDADO</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vitórias Column (Black/Dark Slate Background, Bold White Numbers) */}
                  <div className="col-span-2 py-1.5 sm:py-2 px-0.5 sm:px-1 flex items-center justify-center border-l border-red-900/50 bg-[#0f1118]">
                    <span className="font-anton text-sm sm:text-xl md:text-2xl text-white tracking-wider">
                      {entry.victories}
                    </span>
                  </div>

                  {/* Participações Column (Vibrant Orange Background, Bold White Numbers) */}
                  <div className="col-span-3 py-1.5 sm:py-2 px-0.5 sm:px-1 flex items-center justify-center border-l border-red-900/50 bg-[#E05315]">
                    <span className="font-anton text-sm sm:text-xl md:text-2xl text-white tracking-wider">
                      {entry.participations}
                    </span>
                  </div>

                  {/* Aprov. % Column (Cyan / Electric Blue Background, Bold White Numbers with %) */}
                  <div className="col-span-2 py-1.5 sm:py-2 px-0.5 sm:px-1 flex items-center justify-center border-l border-red-900/50 bg-[#00D2D3]">
                    <span className="font-anton text-xs sm:text-xl md:text-2xl text-white tracking-wider drop-shadow-sm">
                      {entry.winrate}%
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredRanking.length === 0 && (
              <div className="py-8 text-center text-slate-500 font-mono-code text-xs">
                Nenhum jogador encontrado com "{searchFilter}".
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parte inferior: Busca + Descrição lado a lado / responsivo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 bg-black/60 border border-white/10 p-2.5 sm:p-3 rounded">
        {/* Descrição ao lado da busca */}
        <p className="text-[11px] sm:text-xs font-mono-code text-slate-400">
          Classificação proporcional por aproveitamento (% de vitórias sobre participações).
        </p>

        {/* Input de Busca + Filtro de Ordenação */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <div className="relative flex-1 sm:w-44 md:w-48">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar jogador..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-black border border-white/15 focus:border-[#17B8B8] text-xs font-mono-code text-white placeholder-slate-500 outline-none rounded"
            />
          </div>

          {/* Quick Sort Toggles */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 border border-white/10 shrink-0 rounded">
            <button
              type="button"
              onClick={() => {
                sounds.playTick();
                setSortBy('winrate');
              }}
              className={`px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-mono-code font-bold uppercase cursor-pointer transition-colors rounded ${
                sortBy === 'winrate'
                  ? 'bg-cyan-400 text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ordenar por Aproveitamento"
            >
              % APROV.
            </button>
            <button
              type="button"
              onClick={() => {
                sounds.playTick();
                setSortBy('victories');
              }}
              className={`px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-mono-code font-bold uppercase cursor-pointer transition-colors rounded ${
                sortBy === 'victories'
                  ? 'bg-[#E6194B] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ordenar por Vitórias"
            >
              VITÓRIAS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
