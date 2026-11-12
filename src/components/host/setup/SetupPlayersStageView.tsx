import React from 'react';
import { GameRoom, TeamId } from '../../../types/game';
import { getActiveTeamIds, TEAM_META } from '../../../utils/teamUtils';
import { sounds } from '../../../utils/soundEffects';
import { drawRandomStartingPlayer } from '../../../utils/multiplayerRoomEngine';
import { FIXED_PLAYERS } from '../../../utils/fixedPlayers';
import { Shuffle, Coins, Crown, GripVertical, UserPlus, QrCode, X, Smartphone } from 'lucide-react';
import { PlayerMark } from '../../rdb/PlayerMark';

interface SetupPlayersStageViewProps {
  effectiveTeamCount: 2 | 3 | 4;
  room: GameRoom;
  handleSetTeamCountBoth: (nextCount: 2 | 3 | 4) => void;
  handleFallbackShuffleTeams: () => void;
  onSetStartingPlayer: ((playerId: string) => void) | undefined;
  setIsQrModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDraggingItem: React.Dispatch<React.SetStateAction<{ type: "team-player" | "fixed-player" | "new-player"; id?: string; name: string; } | null>>;
  setDragOverTeam: React.Dispatch<React.SetStateAction<TeamId | null>>;
  newCustomName: string;
  setNewCustomName: React.Dispatch<React.SetStateAction<string>>;
  handleAddCustomPlayerDirect: (targetTeam?: TeamId) => void;
  dragOverTeam: TeamId | null;
  handleDropOnTeam: (e: React.DragEvent, targetTeam: TeamId) => void;
  draggingItem: { type: "team-player" | "fixed-player" | "new-player"; id?: string; name: string; } | null;
  onRemovePlayer: (playerId: string) => void;
}

export const SetupPlayersStageView: React.FC<SetupPlayersStageViewProps> = ({
  effectiveTeamCount,
  room,
  handleSetTeamCountBoth,
  handleFallbackShuffleTeams,
  onSetStartingPlayer,
  setIsQrModalOpen,
  setDraggingItem,
  setDragOverTeam,
  newCustomName,
  setNewCustomName,
  handleAddCustomPlayerDirect,
  dragOverTeam,
  handleDropOnTeam,
  draggingItem,
  onRemovePlayer
}) => {
  return (
            /* =========================================================================
               MODALIDADE EM EQUIPES (TEM OU NÃO TEM, DUVIDO, PROIBIDO)
               ========================================================================= */
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 overflow-hidden">
              {/* Barra Superior de Definição de Equipes com o Seletor */}
              <div className="bg-[#090b14] border border-cyan-500/40 p-3 space-y-2 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Retro Scanline Segmented Control */}
                  <div
                    data-testid="setup-team-count-segmented-control"
                    className="inline-flex items-center border border-cyan-500/60 bg-black/90 p-1"
                  >
                    <span className="font-anton text-cyan-300 tracking-wider text-xs sm:text-sm mr-2 px-2 uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]">
                      EQUIPES:
                    </span>
                    {([2, 3, 4] as const).map((cnt) => {
                      const active = effectiveTeamCount === cnt;
                      const isCountDisabled = room.players.length > 0 && cnt > room.players.length;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          data-testid={`setup-team-count-btn-${cnt}`}
                          disabled={isCountDisabled}
                          title={isCountDisabled ? `Requer ao menos ${cnt} jogadores na sala` : undefined}
                          onClick={() => {
                            if (isCountDisabled) return;
                            sounds.playTick();
                            handleSetTeamCountBoth(cnt);
                          }}
                          className={`px-4 sm:px-6 py-1.5 font-anton text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
                            isCountDisabled
                              ? 'opacity-30 cursor-not-allowed text-slate-600 bg-black/40 border border-slate-900'
                              : active
                              ? 'bg-[#17B8B8] text-black font-black shadow-neon-cyan border border-cyan-200'
                              : 'text-cyan-400 hover:text-white bg-black/60 hover:bg-cyan-950/40 border border-slate-800'
                          }`}
                        >
                          {cnt} EQUIPES
                        </button>
                      );
                    })}
                  </div>

                  {/* Sorteios Rápidos */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="setup-shuffle-teams-btn"
                      onClick={() => {
                        sounds.playPowerup();
                        handleFallbackShuffleTeams();
                      }}
                      className="px-3.5 py-1.5 border border-amber-400/80 bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-300 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Sortear e equilibrar jogadores automaticamente entre as equipes"
                    >
                      <Shuffle size={13} />
                      <span>Sortear Equipes</span>
                    </button>

                    <button
                      type="button"
                      data-testid="setup-draw-starter-btn"
                      onClick={() => {
                        sounds.playPowerup();
                        const picked = drawRandomStartingPlayer(room.players);
                        if (picked && onSetStartingPlayer) {
                          onSetStartingPlayer(picked.id);
                        }
                      }}
                      className="px-3.5 py-1.5 border border-rose-500/80 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-200 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Sortear quem joga no 1º turno"
                    >
                      <Coins size={13} />
                      <span>Quem Começa</span>
                    </button>
                  </div>
                </div>

                {/* Banner de Status Informativo */}
                <div className="flex flex-wrap items-center justify-between text-xs font-mono-code text-slate-300 pt-1 border-t border-white/10 gap-2">
                  <span>
                    Total: <strong className="text-white">{room.players.length} Jogadores</strong> divididos em{' '}
                    <strong className="text-cyan-300">{effectiveTeamCount} Equipes</strong>. Arraste qualquer jogador entre as equipes ou use os botões rápidos.
                  </span>
                  {room.players.find((p) => p.id === room.startingPlayerId) && (
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Coins size={12} />
                      1º Turno:{' '}
                      <PlayerMark p={room.players.find((p) => p.id === room.startingPlayerId)} />{' '}
                      {room.players.find((p) => p.id === room.startingPlayerId)?.name}
                    </span>
                  )}
                </div>
              </div>

              {/* ESTANTE SUPERIOR: JOGADORES FIXOS E DISPONÍVEIS (DRAG & DROP PARA AS EQUIPES) */}
              <div
                data-testid="setup-draggable-players-shelf"
                className="bg-[#07080d] border border-cyan-500/30 p-2.5 space-y-1.5 shrink-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code">
                  <span className="text-cyan-300 font-bold uppercase flex items-center gap-1.5">
                    <GripVertical size={13} className="text-cyan-400" />
                    <span>ESCALAÇÃO DE JOGADORES (LOCAL OU CELULAR):</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="setup-open-qr-btn"
                      onClick={() => {
                        sounds.playTick();
                        setIsQrModalOpen(true);
                      }}
                      className="px-2.5 py-1 border border-rose-500/80 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(230,25,75,0.35)]"
                      title="Abrir QR Code para jogadores entrarem com o celular"
                    >
                      <QrCode size={13} className="animate-pulse" />
                      <span>CONECTAR CELULAR (QR CODE)</span>
                    </button>

                    <span className="text-[10px] text-slate-400 hidden sm:inline">
                      💡 Arraste o jogador direto para a equipe desejada
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5 max-h-24 scrollbar-none">
                  {/* Chip Rápido para Conectar Celular via QR Code */}
                  <button
                    type="button"
                    data-testid="setup-quick-qr-chip"
                    onClick={() => {
                      sounds.playTick();
                      setIsQrModalOpen(true);
                    }}
                    className="px-2 py-1 border border-dashed border-rose-400/80 bg-rose-950/50 hover:bg-rose-500 hover:text-white text-rose-300 rounded flex items-center gap-1.5 text-xs font-mono-code transition-all cursor-pointer hover:scale-[1.03] shrink-0 shadow-sm"
                    title="Aponte a câmera do celular para o QR Code e entre na partida"
                  >
                    <Smartphone size={13} className="text-rose-400" />
                    <span className="font-anton uppercase tracking-wider text-[11px]">+ Celular (QR)</span>
                  </button>

                  {/* Chips dos Jogadores Fixos */}
                  {FIXED_PLAYERS.map((fp) => {
                    const assignedPlayer = room.players.find(
                      (p) =>
                        p.fixedPlayerId === fp.id ||
                        p.id === `fix-${fp.id}` ||
                        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
                    );
                    const isAssigned = Boolean(assignedPlayer);
                    const assignedTeamMeta = assignedPlayer ? TEAM_META[assignedPlayer.team] : null;

                    return (
                      <div
                        key={fp.id}
                        data-testid={`setup-drag-fixed-player-${fp.id}`}
                        draggable="true"
                        onDragStart={(e) => {
                          setDraggingItem({ type: 'fixed-player', id: fp.id, name: fp.name });
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify({
                              type: 'fixed-player',
                              fixedPlayerId: fp.id,
                              name: fp.name,
                              avatar: fp.avatar,
                              color: fp.color
                            })
                          );
                          e.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onDragEnd={() => {
                          setDraggingItem(null);
                          setDragOverTeam(null);
                        }}
                        className={`px-2 py-1 border rounded flex items-center gap-1.5 text-xs font-mono-code transition-all cursor-grab active:cursor-grabbing select-none hover:scale-[1.02] shadow-sm ${
                          isAssigned
                            ? `${assignedTeamMeta?.borderClass} bg-black/80 hover:bg-slate-900 ring-1 ring-white/10`
                            : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-cyan-400/80 hover:text-white'
                        }`}
                        title={
                          isAssigned
                            ? `${fp.name} está na ${assignedTeamMeta?.name}. Arraste para outra equipe para movê-lo!`
                            : `Arraste ${fp.name} para uma equipe para adicioná-lo`
                        }
                      >
                        <GripVertical size={11} className="text-slate-500 shrink-0" />
                        <span className="text-sm shrink-0"><PlayerMark p={fp} /></span>
                        <span className="font-anton text-xs text-white uppercase truncate">{fp.name}</span>
                        {isAssigned ? (
                          <span
                            className="text-[9px] font-bold uppercase px-1 py-0.2 rounded"
                            style={{ backgroundColor: `${assignedTeamMeta?.hexColor}33`, color: assignedTeamMeta?.hexColor }}
                          >
                            {assignedTeamMeta?.duplaLabel}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-cyan-300 uppercase bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-500/30">
                            + Arraste
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Criar e Arrastar Novo Jogador Convidado */}
                  <div className="flex items-center gap-1 ml-auto shrink-0 bg-black/60 border border-slate-700 px-2 py-0.5 rounded">
                    <input
                      type="text"
                      value={newCustomName}
                      onChange={(e) => setNewCustomName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomPlayerDirect('A');
                        }
                      }}
                      placeholder="Novo jogador..."
                      className="w-24 sm:w-28 bg-transparent text-xs text-white placeholder-slate-500 outline-none font-mono-code"
                    />
                    <div
                      draggable={Boolean(newCustomName.trim())}
                      onDragStart={(e) => {
                        if (!newCustomName.trim()) {
                          e.preventDefault();
                          return;
                        }
                        setDraggingItem({ type: 'new-player', name: newCustomName.trim() });
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            type: 'new-player',
                            name: newCustomName.trim()
                          })
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onDragEnd={() => {
                        setDraggingItem(null);
                        setDragOverTeam(null);
                      }}
                      onClick={() => handleAddCustomPlayerDirect('A')}
                      className={`px-2 py-0.5 text-[10px] font-anton uppercase tracking-wider rounded cursor-pointer transition-all flex items-center gap-1 ${
                        newCustomName.trim()
                          ? 'bg-cyan-400 text-black font-bold cursor-grab active:cursor-grabbing hover:bg-cyan-300'
                          : 'bg-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                      title={
                        newCustomName.trim()
                          ? 'Arraste este nome para uma equipe ou clique para adicionar na Equipe A'
                          : 'Digite o nome primeiro'
                      }
                    >
                      <UserPlus size={11} />
                      <span>{newCustomName.trim() ? 'Arraste' : '+'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid com as Colunas das Equipes (Zonas de Drop Ativas) */}
              <div
                className={`grid gap-3 flex-1 min-h-0 overflow-y-auto p-1 ${
                  effectiveTeamCount === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : effectiveTeamCount === 3
                    ? 'grid-cols-1 md:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {getActiveTeamIds(room, effectiveTeamCount).map((tId) => {
                  const tMeta = TEAM_META[tId];
                  const teamPlayers = room.players.filter((p) => p.team === tId);
                  const isDropTargetActive = dragOverTeam === tId;

                  return (
                    <div
                      key={tId}
                      data-testid={`setup-team-box-${tId}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDragEnter={() => setDragOverTeam(tId)}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverTeam(null);
                        }
                      }}
                      onDrop={(e) => handleDropOnTeam(e, tId)}
                      className={`border-2 flex flex-col justify-between overflow-hidden shadow-lg transition-all duration-150 ${
                        isDropTargetActive
                          ? 'border-cyan-300 ring-2 ring-cyan-400 bg-cyan-950/40 shadow-[0_0_25px_rgba(23,184,184,0.45)]'
                          : `${tMeta.borderClass} bg-[#090b14]/90`
                      }`}
                    >
                      {/* Team Header */}
                      <div className={`p-2.5 border-b ${tMeta.borderClass} ${tMeta.bgClass} flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: tMeta.hexColor }} />
                          <h4 className="font-anton text-sm md:text-base uppercase text-white tracking-wider">
                            {tMeta.name} ({tMeta.duplaLabel})
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 bg-black/60 rounded text-slate-200">
                          {teamPlayers.length} {teamPlayers.length === 1 ? 'Jogador' : 'Jogadores'}
                        </span>
                      </div>

                      {/* Banner de Drop Hover Ativo */}
                      {isDropTargetActive && (
                        <div className="px-2 py-1 bg-cyan-500/25 border-b border-cyan-400 text-cyan-200 text-center font-mono-code text-[11px] font-bold uppercase animate-pulse shrink-0">
                          ⬇ SOLTE AQUI PARA ENTRAR NA {tMeta.name.toUpperCase()}!
                        </div>
                      )}

                      {/* Team Player Cards Draggables */}
                      <div className="p-2 space-y-2 flex-1 min-h-0 overflow-y-auto">
                        {teamPlayers.length === 0 ? (
                          <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs font-mono-code border border-dashed border-white/10 rounded">
                            <span>Equipe Vazia</span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              Arraste um jogador aqui ou clique em "Sortear Equipes"
                            </span>
                          </div>
                        ) : (
                          teamPlayers.map((player) => {
                            const isBeingDragged = draggingItem?.id === player.id;
                            return (
                              <div
                                key={player.id}
                                data-testid={`setup-team-player-${player.id}`}
                                draggable="true"
                                onDragStart={(e) => {
                                  setDraggingItem({ type: 'team-player', id: player.id, name: player.name });
                                  e.dataTransfer.setData(
                                    'application/json',
                                    JSON.stringify({
                                      type: 'team-player',
                                      playerId: player.id,
                                      name: player.name,
                                      currentTeam: player.team
                                    })
                                  );
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => {
                                  setDraggingItem(null);
                                  setDragOverTeam(null);
                                }}
                                className={`p-2 border border-white/15 bg-black/70 hover:bg-black/90 flex items-center justify-between gap-2 transition-all cursor-grab active:cursor-grabbing select-none rounded ${
                                  isBeingDragged ? 'opacity-40 scale-95 border-dashed border-cyan-400' : ''
                                }`}
                                title="Arraste para outra equipe"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <GripVertical size={13} className="text-slate-500 shrink-0 hover:text-cyan-300" />
                                  <span className="text-xl shrink-0"><PlayerMark p={player} /></span>
                                  <div className="min-w-0">
                                    <div className="font-anton text-sm text-white uppercase truncate flex items-center gap-1">
                                      <span>{player.name}</span>
                                      {player.isVip && <Crown size={12} className="text-amber-300 shrink-0" />}
                                    </div>
                                    <div className="text-[10px] font-mono-code text-slate-400 flex items-center gap-1.5 flex-wrap">
                                      <span>{player.id === room.startingPlayerId ? '🪙 Começa a partida' : 'Escalado'}</span>
                                      {player.isMobile && (
                                        <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 py-0.2 rounded font-bold uppercase">
                                          📱 Celular
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Botão de Excluir / Remover da Equipe */}
                                <button
                                  type="button"
                                  data-testid={`setup-remove-player-btn-${player.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sounds.playFlip();
                                    onRemovePlayer(player.id);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 rounded transition-colors cursor-pointer shrink-0"
                                  title={`Remover ${player.name} da partida`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
};
