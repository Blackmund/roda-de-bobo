import React, { useState, useEffect, useRef } from 'react';
import { GameRoom, Player, GameId, TeamId } from '../../types/game';
import {
  PartyRole,
  emitPartyProtocolMessage
} from '../../utils/partyNetworkEngine';
import { safeVibrate } from '../../utils/hapticFeedback';
import { sounds } from '../../utils/soundEffects';
import { RetroAvatarModal } from '../RetroAvatarPicker';
import {
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from '../../utils/retroAvatars';
import {
  RefreshCw,
  LogOut,
  Zap,
  Crown,
  Shuffle,
  Play,
  Tv,
  Sparkles
} from 'lucide-react';

export interface ScreenMobileControllerProps {
  room: GameRoom;
  player: Player;
  role: PartyRole;
  onChangeRole: (nextRole: PartyRole) => void;
  onSyncState: () => void;
  onLeaveOrSwitchPlayer: () => void;
  onBuzzReady: () => void;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  onStartMatchFromController?: (gameId: GameId, theme: string) => void;
  children?: React.ReactNode;
}

import { PRESET_THEMES } from '../../utils/aiGameGenerator';
import { PlayerMark } from '../rdb/PlayerMark';

const GAME_OPTIONS: Array<{ id: GameId; name: string; badge: string }> = [
  { id: 'limite', name: 'JOGO DO LIMITE', badge: 'Individual' },
  { id: 'duvido', name: 'JOGO DO DUVIDO', badge: 'Em Equipe' },
  { id: 'proibido', name: 'JOGO DO PROIBIDO', badge: 'Em Equipe' },
  { id: 'nota', name: 'JOGO DA NOTA', badge: 'Individual' },
  { id: 'tem-ou-nao-tem', name: 'TEM OU NÃO TEM', badge: 'Em Equipe' },
  { id: 'perguntas-e-verdades', name: 'PERGUNTAS E VERDADES', badge: '2 a 6 Jogadores' }
];

export const ScreenMobileController: React.FC<ScreenMobileControllerProps> = ({
  room,
  player,
  role,
  onChangeRole,
  onSyncState,
  onLeaveOrSwitchPlayer,
  onBuzzReady,
  onUpdateRoom,
  onStartMatchFromController,
  children
}) => {
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [syncFlash, setSyncFlash] = useState(false);
  const [buzzCooldown, setBuzzCooldown] = useState(false);
  const [pingAlertActive, setPingAlertActive] = useState(false);
  const lastHandledPingRef = useRef<number>(0);

  // Listen for remote Ping / Vibration test triggered from the TV QR Modal
  useEffect(() => {
    const pingTs = Math.max(
      player.lastPingAt || 0,
      room.lastPingEvent?.targetPlayerId === player.id ? room.lastPingEvent.timestamp : 0
    );
    if (pingTs > 0 && pingTs > lastHandledPingRef.current) {
      lastHandledPingRef.current = pingTs;
      safeVibrate([120, 60, 180]);
      sounds.playPowerup();
      setPingAlertActive(true);
      const timer = window.setTimeout(() => setPingAlertActive(false), 3200);
      return () => window.clearTimeout(timer);
    }
  }, [player.id, player.lastPingAt, room.lastPingEvent]);

  const handleRequestFullState = () => {
    sounds.playTick();
    setSyncFlash(true);
    emitPartyProtocolMessage({
      type: 'REQUEST_FULL_STATE',
      payload: {
        clientId: player.deviceClientId || player.id,
        roomCode: room.roomId
      },
      timestamp: Date.now()
    });
    onSyncState();
    window.setTimeout(() => setSyncFlash(false), 900);
  };

  const handleBuzzClick = () => {
    if (buzzCooldown) return;
    setBuzzCooldown(true);
    safeVibrate(80);
    sounds.playPowerup();
    onBuzzReady();
    window.setTimeout(() => setBuzzCooldown(false), 1800);
  };

  const handleSwitchTeam = () => {
    sounds.playFlip();
    onUpdateRoom((prev) => {
      const updatedPlayers = prev.players.map((p) =>
        p.id === player.id
          ? { ...p, team: (p.team === 'A' ? 'B' : 'A') as TeamId }
          : p
      );
      const membersA = updatedPlayers.filter((p) => p.team === 'A').map((p) => p.id);
      const membersB = updatedPlayers.filter((p) => p.team === 'B').map((p) => p.id);
      return {
        ...prev,
        players: updatedPlayers,
        teams: {
          A: { ...prev.teams.A, members: membersA },
          B: { ...prev.teams.B, members: membersB }
        }
      };
    });
  };

  const handleShuffleTeams = () => {
    sounds.playPowerup();
    safeVibrate([60, 40, 80]);
    onUpdateRoom((prev) => {
      const shuffled = [...prev.players].sort(() => Math.random() - 0.5);
      const updatedPlayers = shuffled.map((p, index) => ({
        ...p,
        team: (index % 2 === 0 ? 'A' : 'B') as TeamId
      }));
      const membersA = updatedPlayers.filter((p) => p.team === 'A').map((p) => p.id);
      const membersB = updatedPlayers.filter((p) => p.team === 'B').map((p) => p.id);
      return {
        ...prev,
        players: updatedPlayers,
        teams: {
          A: { ...prev.teams.A, members: membersA },
          B: { ...prev.teams.B, members: membersB }
        }
      };
    });
  };

  const isLobbyOrSetup =
    room.screen === 'lobby' || room.screen === 'game-setup' || room.screen === 'rules';
  const isMasterMode = role === 'master' || Boolean(player.isMasterControl);

  return (
    <div
      data-testid="screen-mobile-controller"
      className="min-h-[100dvh] bg-[#07080d] text-white flex flex-col justify-between max-w-md mx-auto p-3 sm:p-4 gap-3.5 select-none"
    >
      {/* Top Bar do Controle Conectado */}
      <header
        data-testid="mobile-controller-topbar"
        className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col gap-2.5 shadow-lg shrink-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-[170px] flex-1">
            <span
              data-testid="mobile-controller-room-badge"
              className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-mono-code text-xs font-black tracking-wider uppercase shrink-0"
            >
              #{room.roomId}
            </span>

            <button
              type="button"
              data-testid="mobile-controller-avatar-btn"
              onClick={() => setShowAvatarModal(true)}
              className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-700 hover:border-cyan-400 flex items-center justify-center text-lg shrink-0 cursor-pointer"
              title="Trocar Avatar"
            >
              <PlayerMark p={player} />
            </button>

            <div className="min-w-0 flex-1">
              <div
                data-testid="mobile-controller-player-name"
                className="font-anton text-sm sm:text-base text-white uppercase tracking-wide truncate leading-tight"
              >
                {player.name}
              </div>
              <div
                data-testid="mobile-controller-live-status"
                className="text-[10px] font-mono-code text-emerald-300 font-bold flex items-center gap-1 whitespace-nowrap"
              >
                <span>Ao Vivo na TV</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              data-testid="mobile-controller-sync-btn"
              onClick={handleRequestFullState}
              className={`px-2.5 py-1.5 rounded-lg border font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
                syncFlash
                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                  : 'border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200'
              }`}
              title="Forçar sincronização imediata com a TV"
            >
              <RefreshCw size={11} className={syncFlash ? 'animate-spin shrink-0' : 'shrink-0'} />
              <span>Sincronizar</span>
            </button>

            <button
              type="button"
              data-testid="mobile-controller-leave-btn"
              onClick={() => {
                sounds.playFlip();
                onLeaveOrSwitchPlayer();
              }}
              className="px-2.5 py-1.5 rounded-lg border border-rose-500/50 bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer"
              title="Trocar de jogador ou voltar ao portal de entrada"
            >
              <LogOut size={11} className="shrink-0" />
              <span>Trocar / Sair</span>
            </button>
          </div>
        </div>

        {/* Seletor rápido de modo: Jogador vs Controle Mestre */}
        <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            data-testid="mobile-controller-mode-player"
            onClick={() => {
              sounds.playTick();
              onChangeRole('player');
            }}
            className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono-code font-bold uppercase transition-all cursor-pointer ${
              !isMasterMode
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-800 bg-slate-950/60 text-slate-400'
            }`}
          >
            Modo Jogador
          </button>
          <button
            type="button"
            data-testid="mobile-controller-mode-master"
            onClick={() => {
              sounds.playTick();
              onChangeRole('master');
            }}
            className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono-code font-bold uppercase transition-all cursor-pointer ${
              isMasterMode
                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                : 'border-slate-800 bg-slate-950/60 text-slate-400'
            }`}
          >
            Controle Mestre (VIP)
          </button>
        </div>
      </header>

      {/* Banner de Ping Recebido da TV */}
      {pingAlertActive && (
        <div
          data-testid="mobile-controller-ping-alert"
          className="p-3.5 rounded-2xl border-2 border-cyan-300 bg-cyan-500/25 text-cyan-100 font-anton text-sm uppercase tracking-wider text-center shadow-[0_0_25px_rgba(6,182,212,0.5)] animate-pulse"
        >
          PING RECEBIDO DA TV! SEU CELULAR ESTÁ 100% CONECTADO!
        </div>
      )}

      {/* Conteúdo Principal: Lobby/Setup vs Jogo Ativo */}
      {isLobbyOrSetup ? (
        <div className="flex-1 flex flex-col justify-between gap-4">
          {!isMasterMode ? (
            /* Card de Espera Amigável para Jogador Individual */
            <div
              data-testid="mobile-controller-lobby-player-card"
              className="bg-slate-900/90 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-5 my-auto text-center"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono-code font-bold uppercase">
                  <Tv size={12} />
                  <span>Assento Confirmado na Sala #{room.roomId}</span>
                </div>
                <h2 className="font-anton text-2xl sm:text-3xl text-white uppercase tracking-wider">
                  Você está dentro da sala! Olhe para a TV
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Quando a partida começar na TV, os botões e cartas secretas do seu turno aparecerão automaticamente aqui.
                </p>
              </div>

              {/* Avatar + Equipe Atual */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-cyan-400/60 flex items-center justify-center text-3xl cursor-pointer relative shrink-0"
                  >
                    <span><PlayerMark p={player} /></span>
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 font-mono-code text-[8px] font-black">
                      AVATAR
                    </span>
                  </button>
                  <div className="min-w-0">
                    <div className="font-anton text-lg text-white uppercase truncate">{player.name}</div>
                    <div className="text-xs font-mono-code text-cyan-300 break-words">
                      Equipe Atual:{' '}
                      <strong
                        className={player.team === 'A' ? 'text-rose-400' : 'text-cyan-300'}
                      >
                        Equipe {player.team} ({player.team === 'A' ? room.teams.A.name : room.teams.B.name})
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="mobile-controller-switch-team-btn"
                  onClick={handleSwitchTeam}
                  className="px-3 py-2 rounded-xl border border-slate-700 hover:border-cyan-400 bg-slate-900 text-xs font-mono-code font-bold uppercase text-slate-200 cursor-pointer shrink-0"
                >
                  Trocar Equipe
                </button>
              </div>

              {/* Botão Interativo: Estou Pronto! / Buzinar na TV */}
              <button
                type="button"
                data-testid="mobile-controller-buzz-ready-btn"
                onClick={handleBuzzClick}
                disabled={buzzCooldown}
                className="w-full py-3.5 px-5 rounded-full font-black text-sm sm:text-base uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-rose-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap size={18} className="shrink-0" />
                <span>
                  {buzzCooldown
                    ? 'SINAL ENVIADO PARA A TV!'
                    : 'Estou Pronto! / Buzinar na TV'}
                </span>
              </button>

              {/* Botões de Reação em Tempo Real (🔥 😂 🎺 👀) para agitar a sala */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase font-bold tracking-wider mb-2 text-center">
                  REAGIR NA TV ENQUANTO ESPERA:
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { emoji: '🔥', label: 'Fogo' },
                    { emoji: '😂', label: 'Rir' },
                    { emoji: '🎺', label: 'Buzina' },
                    { emoji: '👀', label: 'Olho' }
                  ].map(({ emoji, label }) => (
                    <button
                      key={emoji}
                      type="button"
                      data-testid={`mobile-reaction-btn-${emoji}`}
                      onClick={() => {
                        safeVibrate([40, 20, 60]);
                        sounds.playPowerup();
                        emitPartyProtocolMessage({
                          type: 'PLAYER_REACTION',
                          payload: {
                            emoji,
                            playerId: player.id,
                            playerName: player.name,
                            roomCode: room.roomId
                          },
                          timestamp: Date.now()
                        });
                      }}
                      className="py-2.5 px-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-400 active:scale-95 transition-all text-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md hover:shadow-cyan-500/20"
                      title={`Enviar reação ${label} para a TV`}
                    >
                      <span>{emoji}</span>
                      <span className="text-[9px] font-mono-code text-slate-400 font-bold uppercase">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Painel de Controle Mestre (VIP Host) no Lobby/Setup */
            <div
              data-testid="mobile-controller-lobby-master-card"
              className="bg-slate-900/90 border-2 border-amber-400/60 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 my-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Crown size={18} className="text-amber-400" />
                  <div>
                    <div className="font-anton text-base uppercase tracking-wider text-amber-300">
                      CONTROLE MESTRE (VIP HOST)
                    </div>
                    <div className="text-[10px] font-mono-code text-slate-400">
                      Comande a TV direto do sofá
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="master-remote-shuffle-teams-btn"
                  onClick={handleShuffleTeams}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 font-mono-code text-[11px] font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Shuffle size={12} />
                  <span>Sortear Equipes</span>
                </button>
              </div>

              {/* 1. Escolher o Jogo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono-code text-cyan-300 font-bold uppercase block">
                  1. ESCOLHER O JOGO NA TV:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {GAME_OPTIONS.map((g) => {
                    const isSelected = (room.activeGame || 'limite') === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        data-testid={`master-remote-select-game-${g.id}`}
                        onClick={() => {
                          sounds.playPowerup();
                          onUpdateRoom((prev) => ({
                            ...prev,
                            activeGame: g.id,
                            screen: 'game-setup',
                            roundNumber: 1
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400 text-slate-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                            : 'border-slate-800 bg-slate-950/80 text-white hover:border-cyan-400'
                        }`}
                      >
                        <div className="font-anton text-xs uppercase tracking-wider">{g.name}</div>
                        <div
                          className={`text-[9px] font-mono-code ${
                            isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {g.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Trocar o Tema */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <label
                  htmlFor="master-remote-theme-select"
                  className="text-[11px] font-mono-code text-cyan-300 font-bold uppercase flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  <span>2. TEMA DA PARTIDA (IA PROCEDURAL):</span>
                </label>
                <select
                  id="master-remote-theme-select"
                  data-testid="master-remote-theme-select"
                  value={
                    PRESET_THEMES.includes(room.theme)
                      ? room.theme
                      : PRESET_THEMES[0]
                  }
                  onChange={(e) => {
                    const nextTheme = e.target.value;
                    sounds.playTick();
                    onUpdateRoom((prev) => ({
                      ...prev,
                      theme: nextTheme
                    }));
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 px-3 py-2.5 text-xs font-mono-code font-bold text-white"
                >
                  {PRESET_THEMES.map((th) => (
                    <option key={th} value={th}>
                      {th}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Botão Gigante: INICIAR PARTIDA NA TV */}
              <button
                type="button"
                data-testid="master-remote-start-match-btn"
                onClick={() => {
                  const targetGame = room.activeGame || 'limite';
                  const targetTheme = room.theme || PRESET_THEMES[0];
                  sounds.playPowerup();
                  safeVibrate(100);
                  if (onStartMatchFromController) {
                    onStartMatchFromController(targetGame, targetTheme);
                  } else {
                    onUpdateRoom((prev) => ({
                      ...prev,
                      activeGame: targetGame,
                      screen: 'game-setup'
                    }));
                  }
                }}
                className="w-full py-4 rounded-full font-black text-base sm:text-lg uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-rose-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play size={18} className="fill-white" />
                <span>INICIAR PARTIDA NA TV</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Quando a TV está em qualquer um dos 14 jogos (playing / game-over), renderiza o controle do jogo */
        <div className="flex-1 flex flex-col justify-between gap-3">{children}</div>
      )}

      {showAvatarModal && (
        <RetroAvatarModal
          isOpen={showAvatarModal}
          selectedAvatar={player.avatar}
          playerName={player.name}
          playerId={player.id}
          fixedPlayerId={player.fixedPlayerId}
          onSelectAvatar={(newAvatar) => {
            savePlayerAvatarPreference(
              [player.id, player.name, player.fixedPlayerId],
              newAvatar
            );
            saveLastSelectedAvatar(newAvatar);
            onUpdateRoom((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, avatar: newAvatar, lastActive: Date.now() } : p
              )
            }));
          }}
          onClose={() => setShowAvatarModal(false)}
        />
      )}
    </div>
  );
};
