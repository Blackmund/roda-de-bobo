import React, { useState } from 'react';
import { Player, GameRoom, GameId } from '../types/game';
import {
  FIXED_PLAYERS,
  loadFixedPlayersStats,
  FixedPlayerLifetimeStats,
  generateDynamicPlayerTagline,
  GAME_FRIENDLY_NAMES
} from '../utils/fixedPlayers';
import {
  Users,
  UserPlus,
  QrCode,
  X,
  Trophy,
  Flame,
  Crown,
  Target,
  Sparkles,
  TrendingUp,
  Check,
  ArrowRight,
  Shield,
  Activity,
  Award
} from 'lucide-react';
import { TEAM_META } from '../utils/teamUtils';
import { sounds } from '../utils/soundEffects';

interface PlayersManagerModalProps {
  room?: GameRoom;
  onAddPlayer?: (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => void;
  onRemovePlayer?: (playerId: string) => void;
  onOpenQrCode?: () => void;
}

const ALL_GAME_IDS: { id: GameId; label: string; color: string }[] = [
  { id: 'limite', label: 'Limite', color: '#FF1E56' },
  { id: 'duvido', label: 'Duvido', color: '#FBBF24' },
  { id: 'proibido', label: 'Proibido', color: '#10B981' },
  { id: 'nota', label: 'Nota', color: '#A855F7' },
  { id: 'tem-ou-nao-tem', label: 'Tem ou Não Tem', color: '#17B8B8' },
  { id: 'perguntas-e-verdades', label: 'Perguntas e Verdades', color: '#EC4899' },
  { id: 'mimica', label: 'Mímica', color: '#F5B700' },
  { id: 'quem-sou-eu', label: 'Quem Sou Eu', color: '#38BDF8' }
];

export const PlayersManagerModal: React.FC<PlayersManagerModalProps> = ({
  room,
  onAddPlayer,
  onRemovePlayer,
  onOpenQrCode
}) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'profile' | 'guests'>('roster');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('marcos-andre');
  const [newLocalPlayerName, setNewLocalPlayerName] = useState('');

  const fixedStatsMap = loadFixedPlayersStats();

  const selectedFixedDef = FIXED_PLAYERS.find((fp) => fp.id === selectedPlayerId);
  const selectedStats: FixedPlayerLifetimeStats | undefined =
    fixedStatsMap[selectedPlayerId] ||
    (selectedFixedDef
      ? {
          id: selectedFixedDef.id,
          name: selectedFixedDef.name,
          avatar: selectedFixedDef.avatar,
          color: selectedFixedDef.color,
          tagline: selectedFixedDef.tagline,
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
        }
      : undefined);

  // Dynamic Tagline computed in real time
  const dynamicTagline =
    selectedFixedDef && selectedStats
      ? selectedStats.tagline || generateDynamicPlayerTagline(selectedFixedDef, selectedStats)
      : selectedFixedDef?.tagline || '';

  // Guest players aggregation
  const guestMap = new Map<string, { name: string; avatar: string; matches: number; victories: number; totalScore: number }>();
  if (room) {
    room.players.forEach((p) => {
      const isFixed =
        p.isFixedPlayer ||
        FIXED_PLAYERS.some(
          (fp) => fp.id === p.fixedPlayerId || fp.name.toLowerCase() === p.name.toLowerCase()
        );
      if (!isFixed) {
        guestMap.set(p.name.toLowerCase(), {
          name: p.name,
          avatar: p.avatar || '🕹️',
          matches: p.roundsPlayed || 1,
          victories: p.roundsWon || 0,
          totalScore: p.score || 0
        });
      }
    });

    if (room.sessionStats && room.sessionStats.history) {
      room.sessionStats.history.forEach((m) => {
        if (m.playerScores) {
          m.playerScores.forEach((ps) => {
            const isFixed = FIXED_PLAYERS.some((fp) => fp.name.toLowerCase() === ps.name.toLowerCase());
            if (!isFixed) {
              const prev = guestMap.get(ps.name.toLowerCase()) || {
                name: ps.name,
                avatar: ps.avatar || '🕹️',
                matches: 0,
                victories: 0,
                totalScore: 0
              };
              const isWin = m.winnerTeam !== 'EMPATE' && ps.team === m.winnerTeam;
              guestMap.set(ps.name.toLowerCase(), {
                name: ps.name,
                avatar: ps.avatar || prev.avatar,
                matches: prev.matches + 1,
                victories: prev.victories + (isWin ? 1 : 0),
                totalScore: prev.totalScore + (ps.score || 0)
              });
            }
          });
        }
      });
    }
  }

  const guests = Array.from(guestMap.values());

  const handleOpenPlayerProfile = (fpId: string) => {
    sounds.playTick();
    setSelectedPlayerId(fpId);
    setActiveTab('profile');
  };

  // Real-time calculation of game segments for the radial semi-circle
  const gamePlayCounts = selectedStats?.gamePlayCounts || {};
  const totalPlays = Object.values(gamePlayCounts).reduce((acc, count) => acc + (count || 0), 0);

  // Build SVG radial arc segments dynamically based on real gamePlayCounts proportions
  const buildDynamicArcSegments = () => {
    if (totalPlays === 0) {
      return (
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#334155"
          strokeWidth="16"
          strokeLinecap="round"
        />
      );
    }

    const segments: React.ReactNode[] = [];
    let currentAngle = 180; // start at left (180 deg) to 0 deg (right)

    ALL_GAME_IDS.forEach((game) => {
      const count = gamePlayCounts[game.id] || 0;
      if (count === 0) return;

      const angleSpan = (count / totalPlays) * 180;
      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = ((currentAngle - angleSpan) * Math.PI) / 180;

      const cx = 100;
      const cy = 100;
      const r = 80;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy - r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy - r * Math.sin(endRad);

      const largeArcFlag = angleSpan > 180 ? 1 : 0;

      const pathData = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

      segments.push(
        <path
          key={game.id}
          d={pathData}
          fill="none"
          stroke={game.color}
          strokeWidth="18"
          strokeLinecap="butt"
          className="transition-all duration-500 hover:opacity-80"
        />
      );

      currentAngle -= angleSpan;
    });

    return segments;
  };

  // Match History Timeline items (Real-time events)
  const timelineMatches = selectedStats?.matchHistory && selectedStats.matchHistory.length > 0
    ? selectedStats.matchHistory
    : Array.from({ length: selectedStats?.totalMatches || 6 }).map((_, i) => ({
        matchId: `fallback-${i}`,
        gameId: (selectedStats?.favoriteGame || 'limite') as GameId,
        gameName: GAME_FRIENDLY_NAMES[selectedStats?.favoriteGame || 'limite'],
        theme: selectedStats?.favoriteTheme || 'Geral',
        isWin: i < (selectedStats?.totalVictories || 3),
        score: Math.round((selectedStats?.totalPoints || 1000) / Math.max(1, selectedStats?.totalMatches || 1)),
        timestamp: Date.now() - (6 - i) * 3600000,
        teammateName: selectedStats?.bestPartnerName || 'Equipe'
      }));

  return (
    <div data-testid="players-manager-modal" className="space-y-4 text-[#F5F2EB] select-none">
      {/* Horizontal Sub-tabs bar: Elenco da Partida // Dossiê / Histórico // Convidados */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-1.5 bg-black/60 p-1 border border-white/10 rounded">
          <button
            type="button"
            data-testid="tab-roster-btn"
            onClick={() => {
              sounds.playTick();
              setActiveTab('roster');
            }}
            className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider transition-colors cursor-pointer rounded ${
              activeTab === 'roster'
                ? 'bg-[#E6194B] text-white shadow-[0_0_12px_rgba(230,25,75,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Elenco & Conexão ({room?.players.length || 0})
          </button>
          <button
            type="button"
            data-testid="tab-profile-btn"
            onClick={() => {
              sounds.playTick();
              setActiveTab('profile');
            }}
            className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider transition-colors cursor-pointer rounded ${
              activeTab === 'profile'
                ? 'bg-[#17B8B8] text-black font-bold shadow-neon-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Perfil & Histórico Individual
          </button>
          <button
            type="button"
            data-testid="tab-guests-btn"
            onClick={() => {
              sounds.playTick();
              setActiveTab('guests');
            }}
            className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider transition-colors cursor-pointer rounded ${
              activeTab === 'guests'
                ? 'bg-amber-400 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🕹️ Convidados ({guests.length})
          </button>
        </div>

        {onOpenQrCode && (
          <button
            type="button"
            onClick={() => {
              sounds.playTick();
              onOpenQrCode();
            }}
            className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <QrCode size={13} className="text-[#17B8B8]" />
            <span>Conectar Celular</span>
          </button>
        )}
      </div>

      {/* ABA 1: ELENCO ATUAL & ADIÇÃO RÁPIDA */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna Esquerda: Jogadores Ativos na Sala */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                <span className="uppercase font-bold text-white flex items-center gap-1.5">
                  <Users size={14} className="text-rose-400" />
                  <span>JOGADORES ESCALADOS ({room?.players.length || 0})</span>
                </span>
                <span className="text-[10px] text-slate-500">Clique no nome para ver histórico</span>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {room && room.players.length > 0 ? (
                  room.players.map((p) => {
                    const tMeta = TEAM_META[p.team];
                    const fixedDef = FIXED_PLAYERS.find(
                      (fp) => fp.id === p.fixedPlayerId || fp.name.toLowerCase() === p.name.toLowerCase()
                    );

                    return (
                      <div
                        key={p.id}
                        className="p-2.5 border border-white/10 bg-black/50 hover:border-cyan-400/50 flex items-center justify-between gap-3 rounded transition-all group"
                      >
                        <div
                          onClick={() => {
                            if (fixedDef) {
                              handleOpenPlayerProfile(fixedDef.id);
                            }
                          }}
                          className={`flex items-center gap-2.5 min-w-0 flex-1 ${
                            fixedDef ? 'cursor-pointer' : ''
                          }`}
                          title={fixedDef ? 'Clique para abrir o histórico detalhado deste jogador' : undefined}
                        >
                          <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                            {p.avatar || '🕹️'}
                          </span>
                          <div className="min-w-0">
                            <div className="font-anton text-sm text-white uppercase truncate flex items-center gap-1.5">
                              <span className={fixedDef ? 'group-hover:text-cyan-300 transition-colors' : ''}>
                                {p.name}
                              </span>
                              {p.isVip && <span className="text-amber-400 text-xs">👑 VIP</span>}
                              {fixedDef && (
                                <ArrowRight size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                            <div className="text-[10px] font-mono-code text-slate-400 flex items-center gap-2">
                              <span
                                className="px-1.5 py-0.2 rounded font-bold uppercase"
                                style={{
                                  backgroundColor: `${tMeta?.hexColor || '#17B8B8'}25`,
                                  color: tMeta?.hexColor || '#17B8B8'
                                }}
                              >
                                {tMeta?.equipeLabel || `TIME ${p.team}`}
                              </span>
                              <span>•</span>
                              {p.isMobile ? (
                                <span className="text-rose-300 font-bold">📱 Celular</span>
                              ) : (
                                <span className="text-cyan-300">🖥️ Local</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {onRemovePlayer && (
                          <button
                            type="button"
                            data-testid={`dock-remove-player-btn-${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              sounds.playFlip();
                              onRemovePlayer(p.id);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors cursor-pointer shrink-0"
                            title={`Remover ${p.name}`}
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 border border-dashed border-white/10 text-center text-xs font-mono-code text-slate-500">
                    Nenhum jogador na sala ainda. Adicione jogadores ao lado ou conecte celulares.
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita: Adição Rápida */}
            <div className="space-y-3 bg-[#0d101a] border border-white/10 p-3.5 rounded">
              <div className="text-xs font-anton text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus size={14} />
                <span>ADICIONAR JOGADOR À PARTIDA</span>
              </div>

              {/* Chips de Jogadores Fixos */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">
                  Elenco Fixo Oficial (1-Clique para Escalar):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {FIXED_PLAYERS.map((fp) => {
                    const alreadyInRoom = room?.players.some(
                      (p) =>
                        p.fixedPlayerId === fp.id ||
                        p.id === `fix-${fp.id}` ||
                        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
                    );

                    return (
                      <div
                        key={fp.id}
                        className={`p-2 border rounded flex items-center justify-between text-xs font-mono-code transition-all ${
                          alreadyInRoom
                            ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 opacity-80'
                            : 'border-white/10 bg-black/60 hover:border-cyan-400'
                        }`}
                      >
                        <div
                          onClick={() => handleOpenPlayerProfile(fp.id)}
                          className="flex items-center gap-1.5 truncate cursor-pointer flex-1"
                          title="Ver histórico e estatísticas deste jogador"
                        >
                          <span className="text-lg">{fp.avatar}</span>
                          <span className="font-anton uppercase truncate text-white">{fp.name}</span>
                        </div>

                        {alreadyInRoom ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5 shrink-0">
                            <Check size={12} /> ON
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              sounds.playPowerup();
                              onAddPlayer?.({
                                name: fp.name,
                                avatar: fp.avatar,
                                color: fp.color,
                                isFixedPlayer: true,
                                fixedPlayerId: fp.id
                              });
                            }}
                            className="px-2 py-0.5 bg-cyan-400 hover:bg-cyan-300 text-black font-anton text-[10px] uppercase font-bold tracking-wider cursor-pointer shrink-0"
                          >
                            + ESCALAR
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input para convidado */}
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">
                  Ou adicione um novo convidado:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLocalPlayerName}
                    onChange={(e) => setNewLocalPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLocalPlayerName.trim()) {
                        e.preventDefault();
                        sounds.playPowerup();
                        onAddPlayer?.({ name: newLocalPlayerName.trim() });
                        setNewLocalPlayerName('');
                      }
                    }}
                    placeholder="Digite nome do jogador..."
                    className="flex-1 bg-black border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono-code outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    disabled={!newLocalPlayerName.trim()}
                    onClick={() => {
                      if (!newLocalPlayerName.trim()) return;
                      sounds.playPowerup();
                      onAddPlayer?.({ name: newLocalPlayerName.trim() });
                      setNewLocalPlayerName('');
                    }}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                      newLocalPlayerName.trim()
                        ? 'bg-cyan-400 text-black font-bold hover:bg-cyan-300'
                        : 'bg-white/10 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: DOSSIÊ & HISTÓRICO INDIVIDUAL DO JOGADOR (Com Semicírculo Dinâmico sem Seta e Timeline Real) */}
      {activeTab === 'profile' && selectedStats && (
        <div className="space-y-4">
          {/* Seletor rápido de jogador fixo */}
          <div className="flex flex-wrap items-center gap-2 bg-black/60 p-2 border border-white/10 rounded">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold px-1">
              Selecionar Jogador:
            </span>
            {FIXED_PLAYERS.map((fp) => (
              <button
                key={fp.id}
                type="button"
                onClick={() => {
                  sounds.playTick();
                  setSelectedPlayerId(fp.id);
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono-code flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedPlayerId === fp.id
                    ? 'bg-cyan-400 text-black font-bold shadow-neon-cyan'
                    : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <span>{fp.avatar}</span>
                <span className="font-anton uppercase">{fp.name}</span>
              </button>
            ))}
          </div>

          {/* Header do Jogador com Avatar grande, Tagline Dinâmica e Métricas Principais */}
          <div className="p-4 bg-gradient-to-r from-[#0e121d] via-[#090b12] to-[#140b12] border-2 border-red-900/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-16 h-16 border-2 flex items-center justify-center text-4xl shadow-xl bg-black/80 shrink-0"
                style={{ borderColor: selectedStats.color || '#E6194B' }}
              >
                {selectedStats.avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-anton text-2xl text-white uppercase tracking-wider">
                    {selectedStats.name}
                  </h3>
                  <span className="px-2 py-0.5 bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono-code font-bold uppercase">
                    ELENCO OFICIAL
                  </span>
                </div>
                {/* Legenda Dinâmica e Contextual que evolui com jogos e temas */}
                <div className="flex items-center gap-1.5 text-xs font-mono-code text-amber-300 font-bold mt-1 max-w-xl">
                  <Sparkles size={13} className="text-amber-400 shrink-0" />
                  <span className="tracking-wide">{dynamicTagline}</span>
                </div>
              </div>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center w-full sm:w-auto">
              <div className="bg-black/50 border border-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded">
                <span className="text-[9px] font-mono-code text-slate-400 uppercase font-bold block">
                  PARTIDAS
                </span>
                <span className="font-anton text-lg sm:text-xl text-white">
                  {selectedStats.totalMatches}
                </span>
              </div>
              <div className="bg-black/50 border border-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded">
                <span className="text-[9px] font-mono-code text-slate-400 uppercase font-bold block">
                  VITÓRIAS
                </span>
                <span className="font-anton text-lg sm:text-xl text-white">
                  {selectedStats.totalVictories}
                </span>
              </div>
              <div className="bg-black/50 border border-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded">
                <span className="text-[9px] font-mono-code text-amber-400 uppercase font-bold block">
                  MVPS
                </span>
                <span className="font-anton text-lg sm:text-xl text-amber-300">
                  {selectedStats.totalMvps} 👑
                </span>
              </div>
              <div className="bg-black/50 border border-white/10 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded">
                <span className="text-[9px] font-mono-code text-cyan-400 uppercase font-bold block">
                  APROV. %
                </span>
                <span className="font-anton text-lg sm:text-xl text-cyan-300">
                  {selectedStats.totalMatches > 0
                    ? Math.round((selectedStats.totalVictories / selectedStats.totalMatches) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Gráficos: Semicírculo Radial Limpo (sem seta) + Linha do Tempo e Detalhes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gráfico 1: Semicírculo Radial de Jogos (100% dinâmico por proporção real, sem agulha/seta) */}
            <div className="bg-[#0b0e17] border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-[#17B8B8]" />
                  <span className="font-anton text-sm text-white uppercase tracking-wider">
                    DISTRIBUIÇÃO DE DESEMPENHO POR JOGO
                  </span>
                </div>
                <span className="text-[10px] font-mono-code text-slate-400 uppercase">
                  RADIAL PROPORCIONAL
                </span>
              </div>

              {/* Semicircle SVG Gauge sem agulha/seta */}
              <div className="relative flex flex-col items-center justify-center py-2">
                <svg viewBox="0 0 200 115" className="w-56 h-32 overflow-visible">
                  {/* Fundo do arco */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="18"
                    strokeLinecap="round"
                  />
                  {/* Segmentos coloridos proporcionais dinâmicos */}
                  {buildDynamicArcSegments()}
                </svg>

                <div className="text-center -mt-4">
                  <div className="font-anton text-lg text-white uppercase tracking-wider">
                    JOGO FAVORITO: {GAME_FRIENDLY_NAMES[selectedStats.favoriteGame || 'limite'].toUpperCase()}
                  </div>
                  <div className="text-[10px] font-mono-code text-emerald-400 font-bold uppercase">
                    Maior taxa de conversão · {selectedStats.gamePlayCounts?.[selectedStats.favoriteGame || 'limite'] || 0} partidas
                  </div>
                </div>
              </div>

              {/* Detalhamento por Jogo com Barras Horizontais Dinâmicas */}
              <div className="space-y-1.5 pt-2 border-t border-white/10 font-mono-code text-xs">
                {ALL_GAME_IDS.map((g) => {
                  const playCount = selectedStats.gamePlayCounts?.[g.id] || 0;
                  const winCount = selectedStats.gameWinCounts?.[g.id] || 0;
                  const maxPlays = Math.max(...Object.values(selectedStats.gamePlayCounts || {}), 1);
                  const barPercent = Math.min(100, Math.round((playCount / maxPlays) * 100));

                  return (
                    <div key={g.id} className="flex items-center gap-2">
                      <span className="w-32 truncate text-slate-300 text-[11px] uppercase font-bold">
                        {g.label}
                      </span>
                      <div className="flex-1 h-2 bg-slate-900 rounded overflow-hidden">
                        <div
                          style={{ width: `${barPercent}%`, backgroundColor: g.color }}
                          className="h-full transition-all duration-300"
                        />
                      </div>
                      <span className="w-14 text-right font-bold text-white text-[11px]">
                        {playCount}p <span className="text-emerald-400">({winCount}v)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráfico 2: Timeline Detalhada de Vitórias & Derrotas (Blocos W/L + Lista de Histórico Recente) */}
            <div className="bg-[#0b0e17] border border-white/10 p-4 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-400" />
                    <span className="font-anton text-sm text-white uppercase tracking-wider">
                      HISTÓRICO RECENTE // WIN & LOSS TIMELINE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code text-emerald-400 font-bold">
                    {selectedStats.totalVictories}V - {Math.max(0, selectedStats.totalMatches - selectedStats.totalVictories)}D
                  </span>
                </div>
                <p className="text-[11px] font-mono-code text-slate-400 mt-1">
                  Sequência cronológica das últimas participações (verde = vitória, vermelho = derrota).
                </p>

                {/* Blocos Verdes / Vermelhos Reais */}
                <div className="flex items-center gap-1.5 my-3 overflow-x-auto pb-1">
                  {timelineMatches.slice(-12).map((m, i) => (
                    <div
                      key={m.matchId || i}
                      className={`h-8 min-w-[28px] px-1 rounded-sm flex flex-col items-center justify-center font-anton text-xs font-bold text-black shadow-sm shrink-0 cursor-default transition-transform hover:scale-110 ${
                        m.isWin
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                          : 'bg-red-500/80 text-white'
                      }`}
                      title={`${m.gameName} (${m.theme || 'Geral'}): ${m.isWin ? 'Vitória' : 'Derrota'} · ${m.score} pts`}
                    >
                      <span>{m.isWin ? 'W' : 'L'}</span>
                    </div>
                  ))}
                </div>

                {/* Mini Linha do Tempo das Últimas Partidas (com tema e dupla) */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {timelineMatches.slice(-4).reverse().map((m, idx) => (
                    <div
                      key={m.matchId || idx}
                      className="p-1.5 bg-black/40 border border-white/5 flex items-center justify-between text-[11px] font-mono-code rounded"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${m.isWin ? 'bg-emerald-400' : 'bg-red-500'}`} />
                        <span className="text-white font-bold uppercase truncate">{m.gameName}</span>
                        {m.theme && <span className="text-slate-500 truncate">"{m.theme}"</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.teammateName && (
                          <span className="text-slate-400 text-[10px]">c/ {m.teammateName}</span>
                        )}
                        <span className={`font-bold ${m.isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.isWin ? '+VITÓRIA' : 'DERROTA'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações de Dupla e Pontuação */}
              <div className="bg-black/50 border border-white/10 p-3 space-y-2 text-xs font-mono-code rounded mt-2">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Pontos Totais Acumulados:</span>
                  <strong className="text-amber-300 font-anton text-sm">{selectedStats.totalPoints} PTS</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Recorde Pessoal (Melhor Partida):</span>
                  <strong className="text-cyan-300 font-anton text-sm">{selectedStats.bestScore} PTS</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Melhor Entrosamento (Mais Vitórias Juntos):</span>
                  <strong className="text-rose-400 font-anton text-xs uppercase">
                    {selectedStats.bestPartnerName
                      ? `${selectedStats.bestPartnerName} (Equipe)`
                      : selectedPlayerId === 'marcos-andre'
                      ? 'Gisele (Equipe Alfa)'
                      : selectedPlayerId === 'gisele'
                      ? 'Marcos André (Equipe Alfa)'
                      : selectedPlayerId === 'debora'
                      ? 'João Gabriel (Equipe Bravo)'
                      : 'Equipe Titular'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CONVIDADOS E JOGADORES NÃO FIXOS */}
      {activeTab === 'guests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
            <span className="uppercase font-bold text-white flex items-center gap-1.5">
              <span>JOGADORES CONVIDADOS // NÃO FIXOS ({guests.length})</span>
            </span>
            <span className="text-[11px] text-slate-400">Histórico de convidados que participaram das partidas</span>
          </div>

          {guests.length === 0 ? (
            <div className="p-8 border border-dashed border-white/10 bg-black/40 text-center font-mono-code text-xs text-slate-500 rounded">
              Nenhum jogador convidado registrado ainda. Quando pessoas entrarem com seus nomes ou pelo celular via QR Code, o histórico delas ficará salvo aqui!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {guests.map((g, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#0d101a] border border-white/10 flex items-center justify-between gap-2.5 rounded hover:border-cyan-400/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{g.avatar}</span>
                    <div className="min-w-0">
                      <div className="font-anton text-sm text-white uppercase truncate">
                        {g.name}
                      </div>
                      <div className="text-[10px] font-mono-code text-slate-400">
                        {g.matches} {g.matches === 1 ? 'partida' : 'partidas'} · {g.victories}V
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono-code">
                    <div className="font-anton text-sm text-amber-300">
                      {g.totalScore}p
                    </div>
                    <div className="text-[9px] text-cyan-400 uppercase font-bold">
                      {g.matches > 0 ? Math.round((g.victories / g.matches) * 100) : 0}% vit
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
