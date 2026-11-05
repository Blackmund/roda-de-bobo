import React, { useState } from 'react';
import { Player, TeamId } from '../types/game';
import { FIXED_PLAYERS, FixedPlayerDefinition, isFixedPlayer } from '../utils/fixedPlayers';
import { validateNewPlayerName } from '../utils/roomManager';
import { sounds } from '../utils/soundEffects';
import { RetroAvatarModal } from './RetroAvatarPicker';
import {
  RETRO_AVATARS,
  loadLastSelectedAvatar,
  resolvePlayerAvatar,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from '../utils/retroAvatars';
import {
  TEAM_META,
  getActiveTeamIds,
  cyclePlayerTeamId,
  pickLeastPopulatedTeam
} from '../utils/teamUtils';
import {
  Users,
  Star,
  Check,
  UserPlus,
  Trash2,
  Crown,
  AlertTriangle,
  Shuffle,
  Coins,
  ArrowRightLeft
} from 'lucide-react';

interface PlayerRosterSelectorProps {
  players: Player[];
  onAddPlayer: (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    team?: TeamId;
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => void;
  onRemovePlayer: (playerId: string) => void;
  onSwitchPlayerTeam: (playerId: string, explicitTeam?: TeamId) => void;
  onUpdatePlayerAvatar?: (playerId: string, avatar: string) => void;
  teamCount?: 2 | 3 | 4;
  onChangeTeamCount?: (count: 2 | 3 | 4) => void;
  showMissingPlayersWarning?: boolean;
  compact?: boolean;
  isIndividualMode?: boolean;
  hideTeamControls?: boolean;
  sessionTrophies?: Record<string, number>;
}

export const PlayerRosterSelector: React.FC<PlayerRosterSelectorProps> = ({
  players,
  onAddPlayer,
  onRemovePlayer,
  onSwitchPlayerTeam,
  onUpdatePlayerAvatar,
  teamCount: propTeamCount,
  onChangeTeamCount,
  showMissingPlayersWarning = false,
  compact = false,
  isIndividualMode = false,
  hideTeamControls = false,
  sessionTrophies = {}
}) => {
  const [localTeamCount, setLocalTeamCount] = useState<2 | 3 | 4>(() => {
    if (propTeamCount === 3 || propTeamCount === 4) return propTeamCount;
    if (players.some((p) => p.team === 'D')) return 4;
    if (players.some((p) => p.team === 'C')) return 3;
    return 2;
  });

  const rawTeamCount: 2 | 3 | 4 = propTeamCount || localTeamCount;
  const effectiveTeamCount: 2 | 3 | 4 =
    players.length > 0 && players.length <= 2
      ? 2
      : players.length === 3 && rawTeamCount > 3
      ? 3
      : rawTeamCount;
  const activeTeamIds = getActiveTeamIds(effectiveTeamCount);

  const [guestName, setGuestName] = useState('');
  const [guestTeam, setGuestTeam] = useState<TeamId>('A');
  const [selectedGuestAvatar, setSelectedGuestAvatar] = useState<string>(() =>
    loadLastSelectedAvatar(RETRO_AVATARS[0])
  );
  const [showGuestAvatarModal, setShowGuestAvatarModal] = useState(false);
  const [editingAvatarPlayer, setEditingAvatarPlayer] = useState<Player | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [starterDrawBanner, setStarterDrawBanner] = useState<string | null>(null);

  const handleSetTeamCount = (nextCount: 2 | 3 | 4) => {
    sounds.playTick();
    setLocalTeamCount(nextCount);
    if (onChangeTeamCount) {
      onChangeTeamCount(nextCount);
    } else {
      const nextActiveIds = getActiveTeamIds(nextCount);
      players.forEach((p, idx) => {
        if (!nextActiveIds.includes(p.team)) {
          const fallbackTeam = nextActiveIds[idx % nextActiveIds.length];
          onSwitchPlayerTeam(p.id, fallbackTeam);
        }
      });
    }
    if (!getActiveTeamIds(nextCount).includes(guestTeam)) {
      setGuestTeam('A');
    }
  };

  const handleShuffleTeams = () => {
    if (players.length < 2) return;
    sounds.playPowerup();
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, idx) => {
      const targetTeam: TeamId = activeTeamIds[idx % activeTeamIds.length];
      if (p.team !== targetTeam) {
        onSwitchPlayerTeam(p.id, targetTeam);
      }
    });
    setStarterDrawBanner(
      `🎲 ${effectiveTeamCount} Equipes sorteadas e equilibradas automaticamente!`
    );
  };

  const handleDrawStarter = () => {
    if (players.length === 0) return;
    sounds.playPowerup();
    if (isIndividualMode) {
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      setStarterDrawBanner(
        `🪙 SORTEIO DE QUEM COMEÇA: ${randomPlayer.avatar} ${randomPlayer.name.toUpperCase()} INICIA A PARTIDA!`
      );
    } else {
      const pickedTeamId = activeTeamIds[Math.floor(Math.random() * activeTeamIds.length)];
      const meta = TEAM_META[pickedTeamId];
      setStarterDrawBanner(
        `🪙 SORTEIO INICIAL: ${meta.equipeLabel} COMEÇA A PRIMEIRA RODADA!`
      );
    }
  };

  const handleToggleFixedPlayer = (fp: FixedPlayerDefinition) => {
    setDuplicateError(null);
    const existing = players.find(
      (p) =>
        (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
    );
    if (existing) {
      sounds.playFlip();
      onRemovePlayer(existing.id);
    } else {
      sounds.playSuccess();
      const resolvedAvatar = resolvePlayerAvatar({
        playerId: `fix-${fp.id}`,
        playerName: fp.name,
        fixedPlayerId: fp.id,
        fallbackAvatar: fp.avatar
      });
      const balancedTeam = pickLeastPopulatedTeam(players, activeTeamIds);
      onAddPlayer({
        id: `fix-${fp.id}`,
        name: fp.name,
        avatar: resolvedAvatar,
        color: fp.color,
        team: balancedTeam,
        isFixedPlayer: true,
        fixedPlayerId: fp.id
      });
    }
  };

  const handleAddAllFixed = () => {
    setDuplicateError(null);
    sounds.playPowerup();
    const simulated = [...players];
    FIXED_PLAYERS.forEach((fp) => {
      const exists = simulated.some(
        (p) =>
          (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
          p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
      );
      if (!exists) {
        const resolvedAvatar = resolvePlayerAvatar({
          playerId: `fix-${fp.id}`,
          playerName: fp.name,
          fixedPlayerId: fp.id,
          fallbackAvatar: fp.avatar
        });
        const targetTeam = pickLeastPopulatedTeam(simulated, activeTeamIds);
        simulated.push({
          id: `fix-${fp.id}`,
          name: fp.name,
          avatar: resolvedAvatar,
          color: fp.color,
          team: targetTeam,
          isVip: false,
          score: 0,
          powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
          connected: true,
          lastActive: Date.now()
        });
        onAddPlayer({
          id: `fix-${fp.id}`,
          name: fp.name,
          avatar: resolvedAvatar,
          color: fp.color,
          team: targetTeam,
          isFixedPlayer: true,
          fixedPlayerId: fp.id
        });
      }
    });
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed) return;
    const check = validateNewPlayerName(players, trimmed);
    if (!check.valid) {
      sounds.playBuzzer();
      setDuplicateError(check.error || 'Já existe um jogador com este nome na sala');
      return;
    }
    setDuplicateError(null);
    sounds.playSuccess();
    saveLastSelectedAvatar(selectedGuestAvatar);
    savePlayerAvatarPreference({
      playerName: trimmed,
      avatar: selectedGuestAvatar
    });
    const validGuestTeam = activeTeamIds.includes(guestTeam)
      ? guestTeam
      : pickLeastPopulatedTeam(players, activeTeamIds);
    onAddPlayer({
      name: trimmed,
      avatar: selectedGuestAvatar,
      team: validGuestTeam,
      isFixedPlayer: false
    });
    setGuestName('');
    setGuestTeam((prev) => cyclePlayerTeamId(prev, activeTeamIds));
  };

  const isCompactCards = players.length > 4;

  return (
    <div
      data-testid="pregame-player-selector"
      className={`border ${
        showMissingPlayersWarning && players.length < 2
          ? 'border-amber-400/80 bg-amber-950/15'
          : 'border-white/10 bg-white/[0.03]'
      } ${compact ? 'p-2.5 md:p-3 space-y-2' : 'p-3 md:p-3.5 space-y-2.5'} transition-all`}
    >
      {/* Header: Title + Status Badge + Team Count Selector + Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Users size={16} className="text-[#17B8B8] shrink-0" />
          <h3 className="font-anton text-sm md:text-base tracking-wider text-white uppercase shrink-0">
            {hideTeamControls ? `JOGADORES NA SALA (${players.length})` : `JOGADORES & EQUIPES (${players.length})`}
          </h3>
          {players.length < 2 ? (
            <span className="px-2 py-0.5 bg-[#E6194B] text-white font-mono-code text-[10px] font-bold uppercase animate-pulse shrink-0">
              MÍNIMO 2 JOGADORES
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 font-mono-code text-[10px] font-bold uppercase shrink-0">
              ✓ PRONTO
            </span>
          )}
          {!hideTeamControls && (
            isIndividualMode ? (
              <span
                data-testid="roster-individual-mode-badge"
                className="px-2 py-0.5 bg-amber-500/15 text-amber-300 font-mono-code text-[10px] font-bold uppercase shrink-0"
              >
                👤 MODALIDADE INDIVIDUAL (TODOS CONTRA TODOS)
              </span>
            ) : (
              <div
                data-testid="roster-team-count-selector"
                className="flex items-center gap-1 bg-black/60 border border-white/15 px-1.5 py-0.5"
              >
                <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold mr-1">
                  Equipes:
                </span>
                {([2, 3, 4] as const).map((cnt) => {
                  const isCountDisabled = players.length > 0 && cnt > players.length;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      data-testid={`roster-team-count-btn-${cnt}`}
                      disabled={isCountDisabled}
                      title={isCountDisabled ? `Requer ao menos ${cnt} jogadores na sala` : undefined}
                      onClick={() => {
                        if (isCountDisabled) return;
                        handleSetTeamCount(cnt);
                      }}
                      className={`px-2 py-0.5 font-anton text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                        isCountDisabled
                          ? 'opacity-30 cursor-not-allowed text-slate-600 bg-black/40'
                          : effectiveTeamCount === cnt
                          ? 'bg-[#17B8B8] text-black font-black shadow-neon-cyan'
                          : 'text-slate-400 hover:text-white bg-white/[0.03]'
                      }`}
                    >
                      {cnt} Equipes
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {!hideTeamControls && !isIndividualMode && players.length >= 2 && (
            <button
              type="button"
              data-testid="shuffle-teams-btn"
              onClick={handleShuffleTeams}
              className="px-2.5 py-1 bg-[#17B8B8]/15 hover:bg-[#17B8B8] hover:text-black text-[#17B8B8] font-mono-code text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Shuffle size={12} />
              <span>🎲 Sortear Equipes</span>
            </button>
          )}
          {players.length >= 2 && (
            <button
              type="button"
              data-testid="draw-starter-btn"
              onClick={handleDrawStarter}
              className="px-2.5 py-1 bg-[#E6194B]/15 hover:bg-[#E6194B] text-rose-200 hover:text-white font-mono-code text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Coins size={12} />
              <span>🎲 Sortear Quem Começa</span>
            </button>
          )}
          <button
            type="button"
            data-testid="pregame-add-all-fixed-btn"
            onClick={handleAddAllFixed}
            className="px-2.5 py-1 bg-amber-400/15 hover:bg-amber-400 hover:text-black text-amber-200 font-mono-code text-[11px] font-bold uppercase transition-colors cursor-pointer"
          >
            ⭐ Escalar Todos os Fixos
          </button>
        </div>
      </div>

      {starterDrawBanner && (
        <div
          data-testid="starter-draw-banner"
          className="px-2.5 py-1 bg-amber-500/15 text-amber-200 font-mono-code text-[11px] font-bold uppercase flex items-center justify-between"
        >
          <span>{starterDrawBanner}</span>
          <button
            type="button"
            onClick={() => setStarterDrawBanner(null)}
            className="text-[10px] text-amber-300 hover:underline cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Duplicate Name Error Banner */}
      {duplicateError && (
        <div
          data-testid="duplicate-player-warning"
          className="px-2.5 py-1.5 bg-[#E6194B]/20 border-l-4 border-[#E6194B] text-rose-200 flex items-center gap-2 text-xs font-mono-code font-bold"
        >
          <AlertTriangle size={14} className="text-[#E6194B] shrink-0" />
          <span>{duplicateError}</span>
        </div>
      )}

      {/* Warning banner if fewer than 2 players */}
      {(showMissingPlayersWarning || players.length < 2) && (
        <div
          data-testid="missing-players-warning"
          className={`px-2.5 py-1.5 flex items-center gap-2 text-xs font-mono-code ${
            showMissingPlayersWarning
              ? 'bg-amber-500/20 border-l-4 border-amber-400 text-amber-200 font-bold'
              : 'bg-[#E6194B]/10 border-l-4 border-[#E6194B] text-rose-200'
          }`}
        >
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span>Adicione pelo menos 2 jogadores para continuar</span>
        </div>
      )}

      {/* Quick Select Fixed Players (60% / 7 cols) + Guest Input Grid (40% / 5 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
        {/* Left 7 cols (~60%): Fixed Players */}
        <div className="md:col-span-7 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-mono-code text-amber-300 font-bold uppercase">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span>Jogadores Fixos da Casa:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FIXED_PLAYERS.map((fp) => {
              const isSelected = players.some(
                (p) =>
                  (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
                  p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
              );
              const displayAvatar = resolvePlayerAvatar({
                playerId: `fix-${fp.id}`,
                playerName: fp.name,
                fixedPlayerId: fp.id,
                fallbackAvatar: fp.avatar
              });
              return (
                <button
                  key={fp.id}
                  type="button"
                  data-testid={`pregame-fixed-player-${fp.id}`}
                  onClick={() => handleToggleFixedPlayer(fp)}
                  className={`px-2.5 py-1 text-xs font-mono-code font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/15 text-white'
                      : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <span>{displayAvatar}</span>
                  <span>{fp.name}</span>
                  {isSelected ? (
                    <Check size={12} className="text-[#17B8B8]" />
                  ) : (
                    <span className="text-amber-400">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 cols (~40%): Custom Guest Input */}
        <form onSubmit={handleAddGuest} className="md:col-span-5 space-y-1">
          <label
            htmlFor="pregame-guest-input"
            className="block text-[11px] font-mono-code text-[#17B8B8] font-bold uppercase"
          >
            + Adicionar Convidado:
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="pregame-guest-avatar-btn"
              onClick={() => setShowGuestAvatarModal(true)}
              className="px-2 py-1 bg-[#17B8B8]/15 hover:bg-[#17B8B8]/30 border border-[#17B8B8]/40 text-base leading-none cursor-pointer shrink-0 transition-all"
              title="Escolher avatar retrô"
              aria-label="Escolher avatar retrô"
            >
              {selectedGuestAvatar}
            </button>
            <input
              id="pregame-guest-input"
              data-testid="pregame-guest-input"
              type="text"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                if (duplicateError) setDuplicateError(null);
              }}
              placeholder="Nome do convidado..."
              maxLength={22}
              className="flex-1 min-w-0 px-2.5 py-1 bg-black/60 border border-white/15 focus:border-[#17B8B8] text-xs text-white font-mono-code focus:outline-none"
            />
            {!isIndividualMode && (
              <button
                type="button"
                onClick={() => setGuestTeam((prev) => cyclePlayerTeamId(prev, activeTeamIds))}
                className={`px-2 py-1 text-[10px] font-mono-code font-bold uppercase cursor-pointer shrink-0 border ${
                  TEAM_META[guestTeam]?.borderClass || 'border-[#17B8B8]'
                } ${TEAM_META[guestTeam]?.bgClass || ''} ${
                  TEAM_META[guestTeam]?.textClass || 'text-white'
                }`}
                title="Alternar equipe inicial"
              >
                Eq. {guestTeam}
              </button>
            )}
            <button
              type="submit"
              data-testid="pregame-add-guest-btn"
              disabled={!guestName.trim()}
              className="px-3 py-1 bg-[#17B8B8] hover:bg-cyan-300 disabled:opacity-40 text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
            >
              <UserPlus size={13} />
              <span>Adicionar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Players Roster — Grouped by Team Columns (or Individual Grid) */}
      {players.length > 0 && (
        <div className="pt-1.5 border-t border-white/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-code text-slate-400">
            {hideTeamControls ? (
              <>
                <span>
                  Jogadores na Sala:{' '}
                  <strong className="text-cyan-300">
                    {players.length} Conectados
                  </strong>
                </span>
                <span className="hidden sm:inline text-slate-400">
                  Toque no avatar para personalizar
                </span>
              </>
            ) : isIndividualMode ? (
              <>
                <span>
                  Escalados:{' '}
                  <strong className="text-amber-300">
                    {players.length} Jogadores (Disputa Individual — Todos Contra Todos)
                  </strong>
                </span>
                <span className="hidden sm:inline text-[#17B8B8]">
                  Toque no ícone para trocar avatar
                </span>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span>Divisão de Equipes:</span>
                  {activeTeamIds.map((tid) => {
                    const meta = TEAM_META[tid];
                    const count = players.filter((p) => p.team === tid).length;
                    return (
                      <span
                        key={tid}
                        className={`px-2 py-0.5 border ${meta.borderClass} ${meta.bgClass} ${meta.textClass} font-bold uppercase text-[10px]`}
                      >
                        {meta.duplaLabel}: {count} {count === 1 ? 'jogador' : 'jogadores'}
                      </span>
                    );
                  })}
                </div>
                <span className="hidden sm:inline text-slate-400">
                  Clique no botão de equipe do jogador para movê-lo ({activeTeamIds.join(' ➔ ')})
                </span>
              </>
            )}
          </div>

          {hideTeamControls || isIndividualMode ? (
            <div
              data-testid="roster-auto-fit-grid"
              className="grid grid-cols-[repeat(auto-fit,minmax(145px,1fr))] gap-2"
            >
              {players.map((player, idx) => (
                <div
                  key={player.id}
                  data-testid={`roster-player-card-${player.id}`}
                  className={`flex items-center justify-between bg-white/[0.03] border ${
                    hideTeamControls
                      ? 'border-cyan-400/30 border-l-2 border-l-cyan-400'
                      : 'border-amber-400/30 border-l-2 border-l-amber-400'
                  } gap-2 ${
                    isCompactCards ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-xs md:text-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <button
                      type="button"
                      data-testid={`roster-edit-avatar-btn-${player.id}`}
                      onClick={() => setEditingAvatarPlayer(player)}
                      className="text-base shrink-0 hover:scale-110 transition-transform cursor-pointer px-0.5 bg-white/[0.03] hover:bg-[#17B8B8]/20 border border-transparent hover:border-[#17B8B8]/50"
                      title={`Trocar avatar de ${player.name}`}
                    >
                      {player.avatar}
                    </button>
                    <span className="font-bold text-white truncate">{player.name}</span>
                    {(sessionTrophies[player.id] || 0) > 0 && (
                      <span
                        data-testid={`player-trophy-badge-${player.id}`}
                        className="px-1 py-0.2 bg-amber-400/20 text-amber-300 font-mono-code text-[9px] font-bold shrink-0"
                        title="Troféus na sessão atual"
                      >
                        🏆 {sessionTrophies[player.id]}
                      </span>
                    )}
                    {(player.isFixedPlayer || isFixedPlayer(player.name)) && (
                      <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                    )}
                    {player.isVip && (
                      <Crown size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 text-[9px] font-mono-code font-bold bg-amber-500/15 text-amber-300 uppercase">
                      #{idx + 1} SOLO
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemovePlayer(player.id)}
                      className="p-0.5 text-slate-400 hover:text-[#E6194B] cursor-pointer"
                      title={`Remover ${player.name}`}
                      aria-label={`Remover ${player.name}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VISUAL TEAM COLUMNS BOARD (2, 3, or 4 Teams) */
            <div
              data-testid="roster-auto-fit-grid"
              className={`grid grid-cols-1 ${
                effectiveTeamCount === 2
                  ? 'md:grid-cols-2'
                  : effectiveTeamCount === 3
                  ? 'md:grid-cols-3'
                  : 'md:grid-cols-2 xl:grid-cols-4'
              } gap-2.5`}
            >
              {activeTeamIds.map((tid) => {
                const meta = TEAM_META[tid];
                const teamPlayers = players.filter((p) => p.team === tid);
                return (
                  <div
                    key={tid}
                    data-testid={`roster-team-column-${tid}`}
                    className={`border ${meta.borderClass} bg-[#07080d]/90 p-2 flex flex-col justify-between gap-2`}
                  >
                    <div className="space-y-1.5">
                      <div
                        className={`flex items-center justify-between px-2 py-1 ${meta.bgClass} border-b ${meta.borderClass}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 font-anton text-[10px] uppercase ${meta.badgeClass}`}
                          >
                            {tid}
                          </span>
                          <span
                            className={`font-anton text-xs md:text-sm uppercase tracking-wider ${meta.textClass}`}
                          >
                            {meta.equipeLabel}
                          </span>
                        </div>
                        <span className="font-mono-code text-[10px] text-white/80 font-bold">
                          {teamPlayers.length} {teamPlayers.length === 1 ? 'JOGADOR' : 'JOGADORES'}
                        </span>
                      </div>

                      {teamPlayers.length === 0 ? (
                        <div className="py-3 px-2 text-center font-mono-code text-[10px] text-slate-500 border border-dashed border-white/10">
                          Nenhum jogador na {meta.equipeLabel}. Clique no botão de equipe de um jogador para movê-lo para cá.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {teamPlayers.map((player) => {
                            const nextTid = cyclePlayerTeamId(player.team, activeTeamIds);
                            return (
                              <div
                                key={player.id}
                                data-testid={`roster-player-card-${player.id}`}
                                className={`flex items-center justify-between bg-white/[0.04] hover:bg-white/[0.07] border-l-4 ${meta.borderClass} gap-1.5 ${
                                  isCompactCards ? 'py-1 px-2 text-xs' : 'py-1.5 px-2.5 text-xs'
                                } transition-colors`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    data-testid={`roster-edit-avatar-btn-${player.id}`}
                                    onClick={() => setEditingAvatarPlayer(player)}
                                    className="text-base shrink-0 hover:scale-110 transition-transform cursor-pointer px-0.5 bg-white/[0.03] hover:bg-[#17B8B8]/20 border border-transparent hover:border-[#17B8B8]/50"
                                    title={`Trocar avatar de ${player.name}`}
                                  >
                                    {player.avatar}
                                  </button>
                                  <span className="font-bold text-white truncate">
                                    {player.name}
                                  </span>
                                  {(sessionTrophies[player.id] || 0) > 0 && (
                                    <span
                                      data-testid={`player-trophy-badge-${player.id}`}
                                      className="px-1 py-0.2 bg-amber-400/20 text-amber-300 font-mono-code text-[9px] font-bold shrink-0"
                                      title="Troféus na sessão atual"
                                    >
                                      🏆 {sessionTrophies[player.id]}
                                    </span>
                                  )}
                                  {(player.isFixedPlayer || isFixedPlayer(player.name)) && (
                                    <Star
                                      size={11}
                                      className="fill-amber-400 text-amber-400 shrink-0"
                                    />
                                  )}
                                  {player.isVip && (
                                    <Crown
                                      size={11}
                                      className="text-amber-400 fill-amber-400 shrink-0"
                                    />
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    data-testid={`roster-switch-team-btn-${player.id}`}
                                    onClick={() => onSwitchPlayerTeam(player.id)}
                                    title={`Mover ${player.name} para Equipe ${nextTid}`}
                                    className={`px-1.5 py-0.5 text-[9px] font-mono-code font-bold uppercase cursor-pointer flex items-center gap-1 border ${meta.borderClass} ${meta.bgClass} ${meta.textClass} hover:brightness-125`}
                                  >
                                    <span>{player.team}</span>
                                    <ArrowRightLeft size={9} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRemovePlayer(player.id)}
                                    className="p-0.5 text-slate-400 hover:text-[#E6194B] cursor-pointer"
                                    title={`Remover ${player.name}`}
                                    aria-label={`Remover ${player.name}`}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showGuestAvatarModal && (
        <RetroAvatarModal
          selectedAvatar={selectedGuestAvatar}
          playerName={guestName.trim() || 'Novo Convidado'}
          onSelect={(avatar) => {
            setSelectedGuestAvatar(avatar);
            saveLastSelectedAvatar(avatar);
          }}
          onClose={() => setShowGuestAvatarModal(false)}
        />
      )}

      {editingAvatarPlayer && (
        <RetroAvatarModal
          selectedAvatar={editingAvatarPlayer.avatar}
          playerName={editingAvatarPlayer.name}
          playerId={editingAvatarPlayer.id}
          fixedPlayerId={editingAvatarPlayer.fixedPlayerId}
          onSelect={(newAvatar) => {
            savePlayerAvatarPreference({
              playerId: editingAvatarPlayer.id,
              playerName: editingAvatarPlayer.name,
              fixedPlayerId: editingAvatarPlayer.fixedPlayerId,
              avatar: newAvatar
            });
            if (onUpdatePlayerAvatar) {
              onUpdatePlayerAvatar(editingAvatarPlayer.id, newAvatar);
            }
            setEditingAvatarPlayer((prev) => (prev ? { ...prev, avatar: newAvatar } : null));
          }}
          onClose={() => setEditingAvatarPlayer(null)}
        />
      )}
    </div>
  );
};
