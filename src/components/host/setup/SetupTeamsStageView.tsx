import React from 'react';
import { GameRoom, TeamId } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { drawRandomStartingPlayer } from '../../../utils/multiplayerRoomEngine';
import { FIXED_PLAYERS } from '../../../utils/fixedPlayers';
import { resolvePlayerAvatar } from '../../../utils/retroAvatars';
import { User, Coins, Crown, UserPlus, QrCode, Trash2 } from 'lucide-react';
import { PlayerMark } from '../../rdb/PlayerMark';

interface SetupTeamsStageViewProps {
  room: GameRoom;
  onSetStartingPlayer: ((playerId: string) => void) | undefined;
  setIsQrModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newCustomName: string;
  setNewCustomName: React.Dispatch<React.SetStateAction<string>>;
  handleAddCustomPlayerDirect: (targetTeam?: TeamId) => void;
  onRemovePlayer: (playerId: string) => void;
  onAddPlayer: (options: { id?: string; name: string; avatar?: string; color?: string; team?: TeamId; isFixedPlayer?: boolean; fixedPlayerId?: string; }) => void;
}

export const SetupTeamsStageView: React.FC<SetupTeamsStageViewProps> = ({
  room,
  onSetStartingPlayer,
  setIsQrModalOpen,
  newCustomName,
  setNewCustomName,
  handleAddCustomPlayerDirect,
  onRemovePlayer,
  onAddPlayer
}) => {
  return (
            /* =========================================================================
               MODALIDADE INDIVIDUAL (CADA UM POR SI — SEM MONTAGEM DE EQUIPES OU DUPLAS)
               ========================================================================= */
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 overflow-hidden">
              {/* Barra Superior do Modo Individual */}
              <div className="bg-[#090b14] border border-amber-400/40 p-3 space-y-2 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-950/80 border border-amber-400/60 text-amber-300 font-mono-code text-[10px] font-bold uppercase tracking-widest mb-1">
                      <User size={11} />
                      <span>MODALIDADE INDIVIDUAL · CADA UM POR SI</span>
                    </div>
                    <h3 className="font-anton text-base md:text-lg uppercase text-white tracking-wide">
                      JOGADORES PARTICIPANTES ({room.players.length})
                    </h3>
                    <p className="text-[11px] font-mono-code text-slate-300">
                      Neste jogo cada participante joga individualmente por seus próprios pontos (cada um por si).
                    </p>
                  </div>

                  {/* Ações Rápidas: Sorteio de Quem Começa e Conectar Celular */}
                  <div className="flex items-center gap-2 flex-wrap">
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
                      className="px-3.5 py-1.5 border border-amber-400/80 bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-300 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Sortear quem joga no 1º turno"
                    >
                      <Coins size={13} />
                      <span>Quem Começa</span>
                    </button>

                    <button
                      type="button"
                      data-testid="setup-open-qr-btn"
                      onClick={() => {
                        sounds.playTick();
                        setIsQrModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 border border-rose-500/80 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(230,25,75,0.35)]"
                      title="Abrir QR Code para celulares entrarem"
                    >
                      <QrCode size={13} className="animate-pulse" />
                      <span>Conectar Celular (QR)</span>
                    </button>
                  </div>
                </div>

                {/* Formulário para Adicionar Jogador Local */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs font-mono-code">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-md bg-black/70 border border-amber-400/50 px-2 py-1">
                    <UserPlus size={13} className="text-amber-300 shrink-0" />
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
                      placeholder="Digitar nome de novo jogador..."
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none font-mono-code"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomPlayerDirect('A')}
                      disabled={!newCustomName.trim()}
                      className="px-2.5 py-0.5 bg-amber-400 disabled:opacity-40 text-black font-anton text-xs uppercase tracking-wider cursor-pointer hover:bg-amber-300 transition-colors"
                    >
                      + Adicionar
                    </button>
                  </div>

                  {room.players.find((p) => p.id === room.startingPlayerId) && (
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Coins size={12} />
                      1º a Jogar:{' '}
                      <PlayerMark p={room.players.find((p) => p.id === room.startingPlayerId)} />{' '}
                      {room.players.find((p) => p.id === room.startingPlayerId)?.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Jogadores Fixos Rápidos (1 clique ativa / desativa no jogo) */}
              <div className="bg-[#07080d] border border-cyan-500/30 p-2 space-y-1.5 shrink-0">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span>JOGADORES FIXOS RÁPIDOS:</span>
                  <span className="text-[10px] text-cyan-300 font-mono-code">CLIQUE PARA ADICIONAR / REMOVER</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {FIXED_PLAYERS.map((fp) => {
                    const assignedPlayer = room.players.find(
                      (p) =>
                        p.fixedPlayerId === fp.id ||
                        p.id === `fix-${fp.id}` ||
                        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
                    );
                    const isAssigned = Boolean(assignedPlayer);

                    return (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => {
                          if (assignedPlayer) {
                            sounds.playFlip();
                            onRemovePlayer(assignedPlayer.id);
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
                              team: 'A',
                              isFixedPlayer: true,
                              fixedPlayerId: fp.id
                            });
                          }
                        }}
                        className={`px-3 py-1.5 border rounded flex items-center gap-2 text-xs font-mono-code transition-all cursor-pointer ${
                          isAssigned
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/50 shadow-sm'
                            : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-600 hover:text-white'
                        }`}
                        title={isAssigned ? `Clique para remover ${fp.name}` : `Clique para adicionar ${fp.name}`}
                      >
                        <span className="text-sm shrink-0"><PlayerMark p={fp} /></span>
                        <span className="font-anton text-xs uppercase text-white truncate">{fp.name}</span>
                        <span
                          className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                            isAssigned ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isAssigned ? '✓ ATIVO' : '+ ADICIONAR'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grade de Jogadores Participantes (Cada um por si) */}
              <div className="flex-1 min-h-0 bg-[#090b14] border border-cyan-500/30 p-2.5 overflow-y-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-code text-slate-300 pb-1 border-b border-white/10">
                  <span className="font-bold uppercase tracking-wider text-white">
                    ESCALAÇÃO INDIVIDUAL ({room.players.length} JOGADORES)
                  </span>
                  <span className={`text-[11px] font-mono-code ${room.players.length >= 2 ? 'text-emerald-400' : 'text-rose-400 font-bold'}`}>
                    {room.players.length >= 2 ? '✅ Pronto para iniciar' : '⚠️ Adicione pelo menos 2 participantes'}
                  </span>
                </div>

                {room.players.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 font-mono-code text-xs border border-dashed border-white/10">
                    Nenhum jogador na sala. Adicione um jogador acima ou clique em um jogador fixo!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {room.players.map((player) => {
                      const isStarter = room.startingPlayerId === player.id;
                      return (
                        <div
                          key={player.id}
                          className={`p-2 border-2 flex items-center justify-between gap-2 bg-[#07080d] transition-all rounded ${
                            isStarter
                              ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                              : 'border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-md bg-black/80 border border-white/15 flex items-center justify-center text-xl shrink-0 shadow-inner">
                              <PlayerMark p={player} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-anton text-xs sm:text-sm text-white uppercase truncate flex items-center gap-1">
                                <span>{player.name}</span>
                                {player.isVip && <Crown size={11} className="text-amber-300 shrink-0" />}
                                {isStarter && <span className="text-amber-400 text-xs" title="1º a jogar">👑</span>}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] font-mono-code text-slate-400">
                                <span>{player.isMobile ? '📱 Celular' : '🖥️ Local'}</span>
                                {isStarter && (
                                  <span className="text-amber-300 font-bold uppercase">• 1º a Jogar</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isStarter && (
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playPowerup();
                                  onSetStartingPlayer?.(player.id);
                                }}
                                className="p-1 border border-slate-700 bg-black/60 hover:border-amber-400 hover:text-amber-300 text-slate-500 rounded cursor-pointer"
                                title="Definir como 1º jogador a responder"
                              >
                                <Coins size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                sounds.playFlip();
                                onRemovePlayer(player.id);
                              }}
                              className="p-1 border border-slate-800 bg-black/60 hover:border-rose-500 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                              title={`Remover ${player.name}`}
                            >
                              <Trash2 size={12} />
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
};
