import React, { useState, useEffect } from 'react';
import { ConnectionMode, GameRoom, TeamId } from '../../types/game';
import { PlayerRosterSelector } from '../PlayerRosterSelector';
import { DynamicQRCode } from '../DynamicQRCode';
import { FIXED_PLAYERS, FixedPlayerDefinition } from '../../utils/fixedPlayers';
import { resolvePlayerAvatar } from '../../utils/retroAvatars';
import { computePlayerSessionTrophies } from '../../utils/sessionPersistence';
import {
  drawRandomStartingPlayer,
  resolvePublicShareOrigin,
  fetchAndCacheLanOrigin
} from '../../utils/multiplayerRoomEngine';
import {
  TEAM_META,
  getTeamCount
} from '../../utils/teamUtils';
import { sounds } from '../../utils/soundEffects';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  Share2,
  Shuffle,
  Coins,
  Crown,
  Users,
  Smartphone,
  Tv,
  RefreshCw,
  Trash2,
  Star,
  AlertCircle
} from 'lucide-react';
import { PlayerMark } from '../rdb/PlayerMark';

export interface Step4PlayerLobbyProps {
  room: GameRoom;
  connectionMode: ConnectionMode;
  isIndividualMode: boolean;
  showMissingPlayersWarning: boolean;
  onClearMissingWarning: () => void;
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
  onShuffleTeams: () => void;
  onSetStartingPlayer: (playerId: string) => void;
  onRegenerateUniqueRoom: () => void;
  onSwitchToControllerMode?: () => void;
  onBackToStep3: () => void;
  onProceedToTutorial: () => void;
  transportStatus?: string;
  onForceSync?: () => void;
}

export const Step4PlayerLobby: React.FC<Step4PlayerLobbyProps> = React.memo(({
  room,
  connectionMode,
  isIndividualMode,
  showMissingPlayersWarning,
  onClearMissingWarning,
  onAddPlayer,
  onRemovePlayer,
  onSwitchPlayerTeam,
  onUpdatePlayerAvatar,
  teamCount,
  onChangeTeamCount,
  onShuffleTeams,
  onSetStartingPlayer,
  onRegenerateUniqueRoom,
  onSwitchToControllerMode,
  onBackToStep3,
  onProceedToTutorial,
  transportStatus,
  onForceSync
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const hasMinPlayers = room.players.length >= 2;
  const startingPlayer = room.players.find((p) => p.id === room.startingPlayerId) || null;

  const [baseOrigin, setBaseOrigin] = useState<string>(() => resolvePublicShareOrigin());

  useEffect(() => {
    fetchAndCacheLanOrigin().then(() => {
      setBaseOrigin(resolvePublicShareOrigin());
    });
    const handleLanUpdated = () => setBaseOrigin(resolvePublicShareOrigin());
    window.addEventListener('rb:lan-origin-updated', handleLanUpdated);
    return () => window.removeEventListener('rb:lan-origin-updated', handleLanUpdated);
  }, []);

  // CRITICAL: Always pass role=client and NEVER mode=host so scanning phones open as controllers
  const joinUrl = `${baseOrigin}/?join=${room.roomId}&role=client`;
  const whatsappText = encodeURIComponent(
    `🎉 Entre na nossa sala do Roda de Bobo!\n🔑 Código da Sala: *${room.roomId}*\n👉 Clique para entrar: ${joinUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  const handleCopyJoinUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      sounds.playSuccess();
      window.setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDrawStarter = () => {
    if (room.players.length === 0) {
      sounds.playBuzzer();
      return;
    }
    sounds.playPowerup();
    const drawn = drawRandomStartingPlayer(room.players);
    if (drawn) {
      onSetStartingPlayer(drawn.id);
    }
  };

  const handleToggleHousePlayer = (fp: FixedPlayerDefinition) => {
    setDuplicateWarning(null);
    onClearMissingWarning();
    const existing = room.players.find(
      (p) =>
        (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
    );
    if (existing) {
      sounds.playFlip();
      onRemovePlayer(existing.id);
    } else {
      sounds.playSuccess();
      const avatar = resolvePlayerAvatar({
        playerId: `fix-${fp.id}`,
        fixedPlayerId: fp.id,
        name: fp.name,
        fixedDefaultAvatar: fp.avatar
      });
      onAddPlayer({
        id: `fix-${fp.id}`,
        name: fp.name,
        avatar,
        color: fp.color,
        team: fp.defaultTeam,
        isFixedPlayer: true,
        fixedPlayerId: fp.id
      });
    }
  };

  const handleAddQuickGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed) return;
    const isDuplicate = room.players.some(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      sounds.playBuzzer();
      setDuplicateWarning('Já existe um jogador com este nome na sala');
      return;
    }
    setDuplicateWarning(null);
    onClearMissingWarning();
    sounds.playSuccess();
    onAddPlayer({
      name: trimmed,
      isFixedPlayer: false
    });
    setGuestName('');
  };

  return (
    <div
      data-testid="step4-player-lobby"
      className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 overflow-y-auto scrollbar-none p-2 md:p-3 border border-white/10 bg-white/[0.02]"
    >
      {/* Top Bar de Utilitários da Etapa 4: Sortear Equipes & Sortear Quem Começa */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-cyan-500/15 border border-cyan-400/60 text-cyan-300 font-mono-code text-[10px] font-bold uppercase tracking-widest">
            ETAPA 4 DE 6 · {connectionMode === 'local' ? 'ESCALAÇÃO LOCAL' : `SALA #${room.roomId}`}
          </span>
          <span className="font-anton text-base md:text-lg text-white uppercase tracking-wide">
            {connectionMode === 'local'
              ? '🖥️ ADICIONAR JOGADORES NA MESMA TELA'
              : connectionMode === 'host'
              ? '📺 PAREAMENTO TV + CELULARES EM TEMPO REAL'
              : '📱 SALA MULTIPLAYER 100% MOBILE'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!isIndividualMode && onChangeTeamCount && (
            <div className="flex items-center gap-1 bg-black/60 border border-slate-700 px-1.5 py-0.5">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">
                Equipes:
              </span>
              {([2, 3, 4] as const).map((cnt) => {
                const activeCnt = teamCount || getTeamCount(room);
                const isCntDisabled = room.players.length > 0 && cnt > room.players.length;
                return (
                  <button
                    key={cnt}
                    type="button"
                    data-testid={`step4-team-count-btn-${cnt}`}
                    disabled={isCntDisabled}
                    title={isCntDisabled ? `Requer ao menos ${cnt} jogadores na sala` : undefined}
                    onClick={() => {
                      if (isCntDisabled) return;
                      sounds.playTick();
                      onChangeTeamCount(cnt);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-anton uppercase cursor-pointer ${
                      isCntDisabled
                        ? 'opacity-30 cursor-not-allowed text-slate-600'
                        : activeCnt === cnt
                        ? 'bg-[#17B8B8] text-black font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cnt} Eq.
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            data-testid="step4-shuffle-teams-btn"
            disabled={room.players.length < 2}
            onClick={() => {
              sounds.playPowerup();
              onShuffleTeams();
            }}
            className="px-3 py-1 border border-cyan-400/70 bg-cyan-950/60 hover:bg-cyan-400 hover:text-black disabled:opacity-40 text-cyan-200 font-mono-code text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shuffle size={13} />
            <span>🎲 Sortear Equipes</span>
          </button>

          <button
            type="button"
            data-testid="step4-draw-starter-btn"
            disabled={room.players.length < 1}
            onClick={handleDrawStarter}
            className="px-3 py-1 border border-amber-400/70 bg-amber-950/60 hover:bg-amber-400 hover:text-black disabled:opacity-40 text-amber-200 font-mono-code text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Coins size={13} />
            <span>🪙 Sortear Quem Começa</span>
          </button>
        </div>
      </div>

      {/* Banner de Quem Começa (quando sorteado) */}
      {startingPlayer && (
        <div
          data-testid="step4-starting-player-banner"
          className="px-3 py-1.5 border border-amber-400 bg-amber-500/20 text-amber-200 font-mono-code text-xs font-bold flex items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-2">
            <Coins size={14} className="text-amber-300" />
            <span>
              🪙 SORTEADO PARA COMEÇAR A PARTIDA:{' '}
              <strong className="text-white uppercase">
                <PlayerMark p={startingPlayer} /> {startingPlayer.name}
              </strong>
            </span>
          </div>
          <span className="text-[10px] uppercase bg-black/50 px-2 py-0.5 text-amber-300">
            1º Turno Definido
          </span>
        </div>
      )}

      {/* CASO A: MODO LOCAL */}
      {connectionMode === 'local' ? (
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-y-auto scrollbar-none">
          <PlayerRosterSelector
            players={room.players}
            onAddPlayer={(opts) => {
              onClearMissingWarning();
              onAddPlayer(opts);
            }}
            onRemovePlayer={onRemovePlayer}
            onSwitchPlayerTeam={onSwitchPlayerTeam}
            onUpdatePlayerAvatar={onUpdatePlayerAvatar}
            teamCount={teamCount || getTeamCount(room)}
            onChangeTeamCount={onChangeTeamCount}
            showMissingPlayersWarning={showMissingPlayersWarning}
            compact={true}
            isIndividualMode={isIndividualMode}
            sessionTrophies={computePlayerSessionTrophies(room)}
          />
        </div>
      ) : (
        /* CASO B: MODO HOST OU MODO MULTI (SALA COM CÓDIGO ÚNICO DE 6 CARACTERES E QR CODE GIGANTE) */
        <div
          data-testid="step4-remote-pairing-lobby"
          className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-none"
        >
          {/* LADO ESQUERDO (5 cols): QR CODE GIGANTE + CÓDIGO MONOESPAÇADO DE 6 CARACTERES */}
          <div className="lg:col-span-5 border-2 border-cyan-400/70 bg-[#090b14] p-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono-code text-cyan-300 font-bold uppercase">
                {connectionMode === 'host' ? <Tv size={14} /> : <Smartphone size={14} />}
                <span>
                  {connectionMode === 'host'
                    ? 'ESCANEIE PARA USAR O CELULAR COMO CONTROLE'
                    : 'ESCANEIE PARA JOGAR 100% NO CELULAR'}
                </span>
              </div>
              <button
                type="button"
                data-testid="step4-regenerate-code-btn"
                onClick={() => {
                  sounds.playPowerup();
                  onRegenerateUniqueRoom();
                }}
                className="px-2 py-0.5 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono-code text-slate-300 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                title="Gerar novo código único de 6 caracteres"
              >
                <RefreshCw size={10} />
                <span>Novo Código</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-3 my-auto">
              <div className="p-2 bg-white rounded-xl shadow-[0_0_25px_rgba(23,184,184,0.35)] shrink-0">
                <DynamicQRCode url={joinUrl} size={148} />
              </div>

              <div className="text-center space-y-1.5 w-full">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase font-bold tracking-widest">
                  CÓDIGO ÚNICO DA SALA (6 CARACTERES)
                </div>
                <div
                  data-testid="step4-unique-room-code"
                  className="font-mono-code text-3xl sm:text-4xl font-black tracking-[0.28em] text-[#17B8B8] bg-black/90 border-2 border-[#17B8B8]/60 py-2 px-4 rounded-xl select-all shadow-neon-cyan"
                >
                  {room.roomId}
                </div>
                <div
                  data-testid="step4-join-url-display"
                  className="text-[10px] font-mono-code text-slate-400 truncate bg-black/50 px-2 py-1 border border-white/10 select-all"
                >
                  {joinUrl}
                </div>

                {/* Realtime Cloud Status Badge & Force Sync Button */}
                <div
                  data-testid="step4-realtime-cloud-badge"
                  className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-black/80 border border-cyan-400/50 text-[10px] sm:text-[11px] font-mono-code"
                >
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                    <span className="truncate">🟢 Nuvem Realtime Ativa (Sala: {room.roomId})</span>
                  </div>
                  {onForceSync && (
                    <button
                      type="button"
                      data-testid="step4-force-sync-btn"
                      onClick={() => {
                        sounds.playPowerup();
                        onForceSync();
                      }}
                      className="px-2 py-0.5 border border-cyan-400/70 bg-cyan-950/80 hover:bg-cyan-400 hover:text-black text-cyan-200 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                      title="Forçar sincronização em tempo real entre TV e Celular"
                    >
                      <RefreshCw size={10} />
                      <span>Sincronizar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                data-testid="step4-copy-link-btn"
                onClick={handleCopyJoinUrl}
                className="py-2 px-3 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedLink ? 'LINK COPIADO!' : '📋 Copiar Link da Sala'}</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="step4-whatsapp-share-btn"
                onClick={() => sounds.playSuccess()}
                className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
              >
                <Share2 size={14} />
                <span>📲 Compartilhar no WhatsApp</span>
              </a>
            </div>
          </div>

          {/* LADO DIREITO (7 cols): JOGADORES CONECTADOS EM TEMPO REAL + LÍDER DA SALA */}
          <div className="lg:col-span-7 border border-white/15 bg-[#090b14] p-3.5 flex flex-col justify-between gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#17B8B8]" />
                <span className="font-anton text-base text-white uppercase tracking-wider">
                  JOGADORES CONECTADOS ({room.players.length})
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                    hasMinPlayers
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {hasMinPlayers ? '✓ MÍNIMO ATINGIDO' : 'AGUARDANDO MÍN. 2 JOGADORES'}
                </span>
              </div>

              {onSwitchToControllerMode && (
                <button
                  type="button"
                  data-testid="step4-open-mobile-view-btn"
                  onClick={() => {
                    sounds.playTick();
                    onSwitchToControllerMode();
                  }}
                  className="px-2.5 py-1 border border-amber-400/70 bg-amber-950/60 hover:bg-amber-400 hover:text-black text-amber-200 font-mono-code text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Smartphone size={12} />
                  <span>
                    {connectionMode === 'multi'
                      ? '📱 Abrir Tela Mobile Multi'
                      : '🎮 Simular Controle Mobile'}
                  </span>
                </button>
              )}
            </div>

            {/* Atalho rápido para Jogadores Fixos da Casa / Criador da Sala */}
            <div className="space-y-1.5 bg-black/50 border border-white/10 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-anton text-amber-300 uppercase flex items-center gap-1">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>
                    {connectionMode === 'multi'
                      ? 'ESCALAR LÍDER (VIP #1) E JOGADORES DA CASA:'
                      : 'ADICIONAR JOGADORES DA CASA OU CONVIDADOS:'}
                  </span>
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  Sincroniza com os celulares
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {FIXED_PLAYERS.map((fp) => {
                  const inRoom = room.players.some(
                    (p) =>
                      p.fixedPlayerId === fp.id ||
                      p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
                  );
                  return (
                    <button
                      key={fp.id}
                      type="button"
                      data-testid={`step4-fixed-player-${fp.id}`}
                      onClick={() => handleToggleHousePlayer(fp)}
                      className={`px-2.5 py-1 text-xs font-mono-code font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                        inRoom
                          ? 'border-[#17B8B8] bg-[#17B8B8]/20 text-white'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400'
                      }`}
                    >
                      <span><PlayerMark p={fp} /></span>
                      <span>{fp.name}</span>
                      {inRoom ? <Check size={11} className="text-cyan-300" /> : <span>+</span>}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleAddQuickGuest} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  data-testid="step4-guest-input"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    if (duplicateWarning) setDuplicateWarning(null);
                  }}
                  placeholder="Adicionar participante pelo nome..."
                  maxLength={22}
                  className="flex-1 px-2.5 py-1.5 bg-black border border-slate-700 focus:border-cyan-400 text-xs text-white font-mono-code focus:outline-none"
                />
                <button
                  type="submit"
                  data-testid="step4-add-guest-btn"
                  disabled={!guestName.trim()}
                  className="px-3 py-1.5 bg-[#17B8B8] hover:bg-cyan-300 disabled:opacity-40 text-black font-anton text-xs uppercase cursor-pointer"
                >
                  + ADICIONAR
                </button>
              </form>

              {duplicateWarning && (
                <div
                  data-testid="step4-duplicate-warning"
                  className="text-[11px] font-mono-code text-rose-300 font-bold"
                >
                  ⚠️ {duplicateWarning}
                </div>
              )}
            </div>

            {/* Lista de Slots de Jogadores Conectados em Tempo Real */}
            <div
              data-testid="step4-connected-players-slots"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0 content-start overflow-y-auto"
            >
              {room.players.map((p, idx) => {
                const tMeta = TEAM_META[p.team] || TEAM_META.A;
                return (
                  <div
                    key={p.id}
                    data-testid={`step4-player-slot-${p.id}`}
                    className={`p-2.5 border-l-4 bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2 ${tMeta.borderClass}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0"><PlayerMark p={p} /></span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate">{p.name}</span>
                          {(idx === 0 || p.isVip) && (
                            <span
                              data-testid="step4-leader-crown-badge"
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-400 text-black font-mono-code text-[9px] font-black uppercase shrink-0"
                            >
                              <Crown size={9} className="fill-black" />
                              <span>LÍDER VIP</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono-code text-emerald-300 flex items-center gap-1">
                          <span>● Conectado</span>
                          {!isIndividualMode && (
                            <span className={tMeta.textClass}>· {tMeta.equipeLabel}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isIndividualMode && (
                        <button
                          type="button"
                          onClick={() => onSwitchPlayerTeam(p.id)}
                          className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase cursor-pointer border ${tMeta.borderClass} ${tMeta.bgClass} ${tMeta.textClass}`}
                        >
                          {tMeta.equipeLabel} ⇄
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemovePlayer(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                        aria-label={`Remover ${p.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {room.players.length < 4 &&
                Array.from({ length: Math.max(0, 2 - room.players.length) }).map((_, i) => (
                  <div
                    key={`empty-slot-${i}`}
                    className="p-2.5 border border-dashed border-slate-700 bg-black/40 flex items-center justify-center gap-2 text-xs font-mono-code text-slate-500"
                  >
                    <Smartphone size={14} className="animate-pulse text-cyan-500/60" />
                    <span>Aguardando jogador conectar via QR / Código...</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Rodapé da Etapa 4 com Trava de Segurança Mín. 2 Jogadores */}
      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          data-testid="step4-back-to-step3-btn"
          onClick={() => {
            sounds.playTick();
            onBackToStep3();
          }}
          className="px-4 py-2.5 border border-slate-700 bg-black/70 hover:border-cyan-400 text-slate-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>VOLTAR AO MODO DE CONEXÃO</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {!hasMinPlayers && (
            <div className="flex items-center gap-1.5 text-xs font-mono-code text-amber-300 font-bold">
              <AlertCircle size={14} className="text-amber-400 shrink-0" />
              <span>Adicione pelo menos 2 jogadores para avançar</span>
            </div>
          )}

          <button
            type="button"
            data-testid="step4-go-to-tutorial-btn"
            disabled={!hasMinPlayers}
            onClick={() => {
              sounds.playPowerup();
              onProceedToTutorial();
            }}
            className="w-full sm:w-auto px-6 py-3 bg-[#17B8B8] hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-anton text-base md:text-lg uppercase tracking-wider shadow-neon-cyan flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>
              {connectionMode === 'local'
                ? 'IR PARA O TUTORIAL ➔'
                : 'AVANÇAR PARA O TUTORIAL ➔'}
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
});
