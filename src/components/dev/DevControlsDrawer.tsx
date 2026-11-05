import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameRoom, Player } from '../../types/game';
import { ControllerView } from '../controller/ControllerView';
import { sounds } from '../../utils/soundEffects';
import { Smartphone, Trash2, UserPlus, X } from 'lucide-react';

interface DevControlsDrawerProps {
  room: GameRoom;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  onRegisterPlayer: (
    name: string,
    avatar?: string,
    color?: string,
    isFixed?: boolean,
    fixedId?: string,
    targetPlayerId?: string
  ) => void;
  onRemovePlayer?: (playerId: string) => void;
}

const DEFAULT_DEV_PLAYERS: Array<{
  id: string;
  name: string;
  avatar: string;
  color: string;
  team: 'A' | 'B';
  isVip: boolean;
  fixedPlayerId: string;
}> = [
  { id: 'fix-marcos-andre', name: 'Marcos André', avatar: '🦁', color: '#FF1E56', team: 'A', isVip: true, fixedPlayerId: 'marcos-andre' },
  { id: 'fix-gisele', name: 'Gisele', avatar: '🦊', color: '#17B8B8', team: 'A', isVip: false, fixedPlayerId: 'gisele' },
  { id: 'fix-debora', name: 'Débora', avatar: '⚡', color: '#FBBF24', team: 'B', isVip: false, fixedPlayerId: 'debora' },
  { id: 'fix-joao-gabriel', name: 'João Gabriel', avatar: '🤖', color: '#A855F7', team: 'B', isVip: false, fixedPlayerId: 'joao-gabriel' },
  { id: 'fix-ayrton', name: 'Ayrton', avatar: '🏎️', color: '#10B981', team: 'A', isVip: false, fixedPlayerId: 'ayrton' },
];

const EXTRA_AVATARS = ['🐉', '🦄', '🐼', '🦈', '🦅', '🐙', '🦖', '🐝', '🦉', '🐺'];
const EXTRA_COLORS = ['#F43F5E', '#06B6D4', '#F59E0B', '#8B5CF6', '#10B981', '#EC4899'];

export const DevControlsDrawer: React.FC<DevControlsDrawerProps> = ({
  room,
  onUpdateRoom,
  onRegisterPlayer,
  onRemovePlayer
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState<string>(DEFAULT_DEV_PLAYERS[0].id);
  const [customBotName, setCustomBotName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleQuickAddAll = () => {
    sounds.playPowerup();
    onUpdateRoom((prev) => {
      const existingIds = new Set(prev.players.map((p) => p.id));
      const existingNames = new Set(prev.players.map((p) => p.name.trim().toLowerCase()));
      const newPlayers: Player[] = [...prev.players];

      DEFAULT_DEV_PLAYERS.forEach((dp) => {
        if (!existingIds.has(dp.id) && !existingNames.has(dp.name.trim().toLowerCase())) {
          newPlayers.push({
            id: dp.id,
            name: dp.name,
            avatar: dp.avatar,
            color: dp.color,
            team: dp.team,
            isVip: dp.isVip && newPlayers.length === 0,
            score: 0,
            roundsPlayed: 0,
            roundsWon: 0,
            accuracy: 0,
            isFixedPlayer: true,
            fixedPlayerId: dp.fixedPlayerId,
            powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
            connected: true,
            lastActive: Date.now()
          });
        }
      });

      const membersA = newPlayers.filter((p) => p.team === 'A').map((p) => p.id);
      const membersB = newPlayers.filter((p) => p.team === 'B').map((p) => p.id);

      return {
        ...prev,
        players: newPlayers,
        teams: {
          A: { ...prev.teams.A, members: membersA },
          B: { ...prev.teams.B, members: membersB }
        }
      };
    });
  };

  const handleAddExtraDevPlayer = (customName?: string) => {
    sounds.playSuccess();
    let createdId = '';
    onUpdateRoom((prev) => {
      const nextNum = prev.players.length + 1;
      const candidateName = customName?.trim() || `Convidado #${nextNum}`;
      if (prev.players.some((p) => p.name.trim().toLowerCase() === candidateName.toLowerCase())) {
        return prev;
      }
      const teamA = prev.players.filter((p) => p.team === 'A').length;
      const teamB = prev.players.filter((p) => p.team === 'B').length;
      const assignedTeam: 'A' | 'B' = teamA <= teamB ? 'A' : 'B';
      const id = `dev-guest-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      createdId = id;

      const newPlayer: Player = {
        id,
        name: candidateName,
        avatar: EXTRA_AVATARS[nextNum % EXTRA_AVATARS.length],
        color: EXTRA_COLORS[nextNum % EXTRA_COLORS.length],
        team: assignedTeam,
        isVip: prev.players.length === 0,
        score: 0,
        roundsPlayed: 0,
        roundsWon: 0,
        accuracy: 0,
        isFixedPlayer: false,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: Date.now()
      };

      const updatedPlayers = [...prev.players, newPlayer];
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
    if (createdId) {
      setActivePlayerId(createdId);
    }
    setCustomBotName('');
  };

  const handleRemoveSinglePlayer = (playerId: string) => {
    sounds.playFlip();
    if (onRemovePlayer) {
      onRemovePlayer(playerId);
    } else {
      onUpdateRoom((prev) => {
        const remaining = prev.players.filter((p) => p.id !== playerId);
        if (remaining.length > 0 && !remaining.some((p) => p.isVip)) {
          remaining[0] = { ...remaining[0], isVip: true };
        }
        const membersA = remaining.filter((p) => p.team === 'A').map((p) => p.id);
        const membersB = remaining.filter((p) => p.team === 'B').map((p) => p.id);
        return {
          ...prev,
          players: remaining,
          teams: {
            A: { ...prev.teams.A, members: membersA },
            B: { ...prev.teams.B, members: membersB }
          }
        };
      });
    }
  };

  const handleClearAllPlayers = () => {
    sounds.playFlip();
    onUpdateRoom((prev) => ({
      ...prev,
      players: [],
      teams: {
        A: { ...prev.teams.A, members: [] },
        B: { ...prev.teams.B, members: [] }
      }
    }));
  };

  const handleJumpToGameOver = () => {
    sounds.playPowerup();
    onUpdateRoom((prev) => {
      let players = [...prev.players];
      if (players.length === 0) {
        players = DEFAULT_DEV_PLAYERS.map((dp, i) => ({
          id: dp.id,
          name: dp.name,
          avatar: dp.avatar,
          color: dp.color,
          team: dp.team,
          isVip: i === 0,
          score: (5 - i) * 120,
          roundsPlayed: 3,
          roundsWon: i % 2 === 0 ? 2 : 1,
          accuracy: 85 - i * 8,
          isFixedPlayer: true,
          fixedPlayerId: dp.fixedPlayerId,
          powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
          connected: true,
          lastActive: Date.now()
        }));
      } else {
        players = players.map((p, i) => ({
          ...p,
          score: p.score || (players.length - i) * 100 + 50,
          roundsPlayed: Math.max(1, p.roundsPlayed || 3),
          roundsWon: Math.max(1, p.roundsWon || 2),
          accuracy: p.accuracy || 75
        }));
      }

      const scoreA = players.filter((p) => p.team === 'A').reduce((s, p) => s + p.score, 0);
      const scoreB = players.filter((p) => p.team === 'B').reduce((s, p) => s + p.score, 0);

      return {
        ...prev,
        screen: 'game-over',
        players,
        teams: {
          A: { ...prev.teams.A, score: scoreA },
          B: { ...prev.teams.B, score: scoreB }
        }
      };
    });
    setIsOpen(false);
  };

  const controllablePlayers =
    room.players.length > 0
      ? room.players
      : DEFAULT_DEV_PLAYERS.map((dp) => ({
          id: dp.id,
          name: dp.name,
          avatar: dp.avatar,
          team: dp.team
        }));

  const currentSimulatedId = controllablePlayers.some((p) => p.id === activePlayerId)
    ? activePlayerId
    : controllablePlayers[0]?.id || DEFAULT_DEV_PLAYERS[0].id;

  return (
    <>
      {/* Discreet circular icon button in bottom-left corner */}
      <div className="fixed bottom-3 left-3 z-40">
        <button
          type="button"
          data-testid="open-dev-drawer-btn"
          onClick={() => {
            sounds.playFlip();
            setIsOpen((prev) => !prev);
          }}
          title="Modo Dev / Simulador de Controles"
          aria-label="Modo Dev / Simulador de Controles"
          className="w-9 h-9 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:border-cyan-400 flex items-center justify-center shadow-lg transition-all cursor-pointer"
        >
          <span className="text-sm leading-none">🛠️</span>
        </button>
      </div>

      {/* High Z-Index Portal Modal for Dev Simulator */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="dev-controls-backdrop"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-end p-2 sm:p-4"
          >
            <div
              data-testid="dev-controls-drawer"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl h-full max-h-[92dvh] bg-slate-950 border-2 border-cyan-400 rounded-none shadow-2xl flex flex-col overflow-hidden relative"
            >
              {/* Header */}
              <div className="p-3 bg-gradient-to-r from-rose-950 to-black border-b border-cyan-400/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-cyan-400" />
                  <span className="font-anton text-sm text-white uppercase tracking-wider">
                    SIMULADOR DE CONTROLES ({room.players.length})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="dev-add-fixed-all-btn"
                    onClick={handleQuickAddAll}
                    className="px-2 py-1 text-[10px] font-mono-code font-bold border border-cyan-400 bg-cyan-950 text-cyan-200 hover:bg-cyan-900 cursor-pointer"
                    title="Conectar automaticamente os 5 Jogadores da Casa"
                  >
                    + Elenco (5)
                  </button>
                  <button
                    type="button"
                    data-testid="dev-add-extra-player-btn"
                    onClick={() => handleAddExtraDevPlayer()}
                    className="px-2 py-1 text-[10px] font-mono-code font-bold border border-emerald-400 bg-emerald-950 text-emerald-200 hover:bg-emerald-900 cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus size={11} />
                    <span>+1</span>
                  </button>
                  {room.players.length > 0 && (
                    <button
                      type="button"
                      data-testid="dev-clear-all-players-btn"
                      onClick={handleClearAllPlayers}
                      className="px-2 py-1 text-[10px] font-mono-code font-bold border border-rose-500 bg-rose-950 text-rose-200 hover:bg-rose-900 cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={11} />
                      <span>Limpar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleJumpToGameOver}
                    className="px-2 py-1 text-[10px] font-mono-code font-bold border border-amber-400 bg-amber-950 text-amber-200 hover:bg-amber-900 cursor-pointer"
                  >
                    🏆 MVP
                  </button>
                  <button
                    type="button"
                    data-testid="close-dev-drawer-btn"
                    aria-label="Fechar simulador de controles"
                    onClick={() => setIsOpen(false)}
                    className="px-2.5 py-1 border border-rose-500 bg-rose-600 hover:bg-rose-500 text-white font-mono-code text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <X size={13} />
                    <span>FECHAR</span>
                  </button>
                </div>
              </div>

              {/* Custom Player Name Quick Add Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddExtraDevPlayer(customBotName);
                }}
                className="px-3 py-2 border-b border-slate-800 bg-black/90 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  data-testid="dev-custom-player-input"
                  value={customBotName}
                  onChange={(e) => setCustomBotName(e.target.value)}
                  placeholder="Adicionar jogador de teste..."
                  maxLength={22}
                  className="flex-1 px-2.5 py-1 bg-black border border-slate-700 focus:border-cyan-400 text-xs text-white font-mono-code focus:outline-none"
                />
                <button
                  type="submit"
                  data-testid="dev-custom-player-submit"
                  className="px-2.5 py-1 border border-cyan-400 bg-cyan-500 hover:bg-cyan-400 text-black font-anton text-xs uppercase tracking-wider cursor-pointer"
                >
                  + ADICIONAR
                </button>
              </form>

              {/* Quick Player Switcher Tabs */}
              <div className="p-2 border-b border-slate-800 bg-black/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
                {controllablePlayers.map((dp) => {
                  const isConnected = room.players.some((p) => p.id === dp.id);
                  const isSelected = currentSimulatedId === dp.id;
                  return (
                    <div
                      key={dp.id}
                      className={`flex items-center border transition-colors shrink-0 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950 text-cyan-200 font-bold'
                          : 'border-slate-800 bg-black/40 text-slate-400 hover:text-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePlayerId(dp.id)}
                        className="px-2.5 py-1 text-xs font-mono-code flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{dp.avatar}</span>
                        <span>{dp.name}</span>
                        <span className="text-[10px] text-slate-500">({dp.team})</span>
                      </button>
                      {isConnected && (
                        <button
                          type="button"
                          data-testid={`dev-remove-player-${dp.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSinglePlayer(dp.id);
                          }}
                          className="px-1.5 py-1 text-[10px] text-rose-400 hover:bg-rose-900/80 hover:text-white border-l border-slate-800 cursor-pointer"
                          title={`Remover ${dp.name} da sala`}
                          aria-label={`Remover ${dp.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Simulated Mobile Phone Frame */}
              <div className="flex-1 p-4 bg-[#05060a] overflow-y-auto flex justify-center items-start min-h-0">
                <div className="w-full max-w-[380px] border-4 border-slate-700 bg-black rounded-2xl p-2 shadow-2xl relative">
                  <div className="w-20 h-3 bg-slate-800 mx-auto rounded-full mb-2" />
                  <div className="bg-[#07080d] rounded-lg overflow-hidden border border-slate-800 min-h-[500px]">
                    <ControllerView
                      room={room}
                      currentPlayerId={currentSimulatedId}
                      onRegisterPlayer={(nm, av, col, isFix, fixId) =>
                        onRegisterPlayer(nm, av, col, isFix, fixId, currentSimulatedId)
                      }
                      onUpdateRoom={onUpdateRoom}
                    />
                  </div>
                  <div className="w-28 h-1 bg-slate-700 mx-auto rounded-full mt-2" />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
