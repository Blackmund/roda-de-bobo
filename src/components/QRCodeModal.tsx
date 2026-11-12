import React, { useState, useEffect, useRef } from 'react';
import { GameRoom } from '../types/game';
import { DynamicQRCode } from './DynamicQRCode';
import { sounds } from '../utils/soundEffects';
import { Copy, Check, RefreshCw, Smartphone, Tv, Crown, Vibrate } from 'lucide-react';
import { PlayerMark } from './rdb/PlayerMark';

export interface QRCodeModalProps {
  room: GameRoom;
  playUrl: string;
  onPingPlayer?: (playerId: string) => void;
  onRegenerateRoomCode?: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  room,
  playUrl,
  onPingPlayer,
  onRegenerateRoomCode
}) => {
  const [copied, setCopied] = useState(false);
  const [pingedPlayerId, setPingedPlayerId] = useState<string | null>(null);
  const [recentlyJoinedIds, setRecentlyJoinedIds] = useState<Record<string, boolean>>({});
  const knownMobileIdsRef = useRef<Set<string>>(new Set());

  // Detect newly connected mobile devices to trigger Cyan flash + sound effect
  useEffect(() => {
    const currentMobilePlayers = room.players.filter(
      (p) => p.connectionType === 'mobile' || p.connectionType === 'master'
    );

    const newIds: string[] = [];
    for (const mp of currentMobilePlayers) {
      if (!knownMobileIdsRef.current.has(mp.id)) {
        knownMobileIdsRef.current.add(mp.id);
        newIds.push(mp.id);
      }
    }

    if (newIds.length > 0) {
      sounds.playPowerup();
      setRecentlyJoinedIds((prev) => {
        const next = { ...prev };
        for (const id of newIds) next[id] = true;
        return next;
      });
      const timer = window.setTimeout(() => {
        setRecentlyJoinedIds((prev) => {
          const next = { ...prev };
          for (const id of newIds) delete next[id];
          return next;
        });
      }, 2500);
      return () => window.clearTimeout(timer);
    }
  }, [room.players]);

  const handleCopyInviteLink = async () => {
    sounds.playSuccess();
    try {
      await navigator.clipboard.writeText(playUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePing = (playerId: string) => {
    sounds.playTick();
    setPingedPlayerId(playerId);
    onPingPlayer?.(playerId);
    window.setTimeout(() => {
      setPingedPlayerId((curr) => (curr === playerId ? null : curr));
    }, 1400);
  };

  return (
    <div
      data-testid="qr-code-studio-modal"
      className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch text-left"
    >
      {/* Coluna da Esquerda (Acesso Instantâneo) */}
      <div className="md:col-span-6 bg-slate-900/70 border border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3.5">
        <div className="flex flex-col items-center text-center gap-3">
          {/* QR Code Gigante de Alto Contraste com moldura neon Ciano */}
          <div className="p-2.5 rounded-2xl bg-slate-950 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)]">
            <DynamicQRCode url={playUrl} size={188} />
          </div>

          {/* Código da Sala Gigante */}
          <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl py-2.5 px-3">
            <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest">
              CÓDIGO DIRETO NA TV
            </div>
            <div
              data-testid="qr-modal-room-code"
              className="font-anton text-3xl tracking-[0.2em] text-cyan-300 uppercase"
            >
              SALA: {room.roomId}
            </div>
            <p className="font-mono-code text-[10px] text-slate-400 truncate mt-0.5 select-all">
              {playUrl}
            </p>
          </div>
        </div>

        {/* Botões Rápidos: Copiar Link + Gerar Novo Código */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="qr-modal-copy-link-btn"
            onClick={handleCopyInviteLink}
            className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Link Copiado!' : '📋 Copiar Link de Convite'}</span>
          </button>

          {onRegenerateRoomCode && (
            <button
              type="button"
              data-testid="qr-modal-regenerate-code-btn"
              onClick={() => {
                sounds.playFlip();
                onRegenerateRoomCode();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>🔄 Gerar Novo Código</span>
            </button>
          )}
        </div>

        {/* Instruções passo a passo claras */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1 text-[11px] font-mono-code text-slate-300">
          <div className="text-cyan-300 font-bold uppercase text-[10px]">
            COMO CONECTAR EM 5 SEGUNDOS:
          </div>
          <div>1. Aponte a câmera para o QR Code</div>
          <div>2. Toque no seu nome na lista</div>
          <div>3. Seu celular vira o controle!</div>
        </div>
      </div>

      {/* Coluna da Direita (Lobby de Presença Ao Vivo — "Quem já conectou") */}
      <div className="md:col-span-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <div className="font-anton text-base uppercase tracking-wider text-white flex items-center gap-2">
                <Smartphone size={16} className="text-cyan-400" />
                <span>QUEM JÁ CONECTOU ({room.players.length})</span>
              </div>
              <div className="text-[10px] font-mono-code text-slate-400">
                Lobby de Presença Ao Vivo • Sincronização Instantânea
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono-code text-[10px] font-bold">
              🟢 Radar Ativo
            </span>
          </div>

          {room.lastBuzzEvent && Date.now() - room.lastBuzzEvent.timestamp < 8000 && (
            <div
              data-testid="qr-modal-buzz-banner"
              className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 font-mono-code text-xs font-bold flex items-center justify-between animate-pulse"
            >
              <span>
                ⚡ <PlayerMark p={room.lastBuzzEvent} /> {room.lastBuzzEvent.playerName} está pronto no celular!
              </span>
              <span className="text-[10px] uppercase">AO VIVO</span>
            </div>
          )}

          {room.players.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl text-slate-400 space-y-2">
              <Smartphone size={28} className="text-cyan-400/70 animate-bounce" />
              <div className="font-anton text-sm uppercase text-slate-200">
                Aguardando celulares conectarem...
              </div>
              <p className="text-[11px] font-mono-code text-slate-400">
                Assim que alguém entrar pelo QR Code ou código, aparecerá aqui em tempo real!
              </p>
            </div>
          ) : (
            <div
              data-testid="qr-modal-presence-list"
              className="space-y-2 overflow-y-auto max-h-[310px] pr-1"
            >
              {room.players.map((player) => {
                const isMaster =
                  player.connectionType === 'master' || Boolean(player.isMasterControl);
                const isMobile = player.connectionType === 'mobile' || isMaster;
                const isNewFlash = Boolean(recentlyJoinedIds[player.id]);
                const isPinged = pingedPlayerId === player.id;

                return (
                  <div
                    key={player.id}
                    data-testid={`qr-modal-player-row-${player.id}`}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                      isNewFlash
                        ? 'border-cyan-300 bg-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.5)] animate-pulse'
                        : isMobile
                        ? 'border-cyan-500/40 bg-slate-950/90'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                        <PlayerMark p={player} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white truncate">
                            {player.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono-code font-bold uppercase ${
                              player.team === 'A'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            Equipe {player.team}
                          </span>
                        </div>

                        <div
                          data-testid={`qr-modal-player-signal-${player.id}`}
                          className="text-[10px] font-mono-code flex items-center gap-1 mt-0.5"
                        >
                          {isMaster ? (
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <Crown size={11} />
                              👑 Controle Mestre
                            </span>
                          ) : isMobile ? (
                            <span className="text-emerald-300 font-bold">
                              🟢 Conectado pelo Celular
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Tv size={11} />
                              🖥️ Jogador Local na TV
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`qr-modal-ping-btn-${player.id}`}
                      onClick={() => handlePing(player.id)}
                      className={`px-2.5 py-1.5 rounded-lg border font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                        isPinged
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                          : 'border-cyan-500/50 bg-cyan-950/50 hover:bg-cyan-500 hover:text-slate-950 text-cyan-200'
                      }`}
                      title="Disparar vibração e alerta visual no celular deste jogador"
                    >
                      <Vibrate size={12} />
                      <span>{isPinged ? '📳 Ping Enviado!' : '📳 Testar Vibração / Ping'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono-code text-slate-400">
          <span>
            📱 Celulares vinculados:{' '}
            <strong className="text-cyan-300">
              {
                room.players.filter(
                  (p) => p.connectionType === 'mobile' || p.connectionType === 'master'
                ).length
              }
            </strong>
          </span>
          <span>
            🖥️ Locais na TV:{' '}
            <strong className="text-slate-200">
              {
                room.players.filter(
                  (p) => p.connectionType !== 'mobile' && p.connectionType !== 'master'
                ).length
              }
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
