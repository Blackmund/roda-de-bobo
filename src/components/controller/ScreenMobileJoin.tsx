import React, { useState, useEffect, useRef } from 'react';
import { GameRoom } from '../../types/game';
import {
  PartyRole,
  QuickSelectSeatOption,
  getUnclaimedQuickSelectPlayers,
  sanitizeRoomCode
} from '../../utils/partyNetworkEngine';
import {
  RETRO_AVATARS,
  loadLastSelectedAvatar,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from '../../utils/retroAvatars';
import { RetroAvatarModal } from '../RetroAvatarPicker';
import { sounds } from '../../utils/soundEffects';
import { RdbLogo } from '../rdb/RdbLogo';
import { PlayerMark } from '../rdb/PlayerMark';

export interface ScreenMobileJoinProps {
  room: GameRoom;
  currentClientId: string;
  connectionStatus?: 'Connected' | 'Reconnecting' | 'Offline';
  initialRoomCodeFromUrl?: string;
  hasQrRoomParam?: boolean;
  onJoinSession: (params: {
    roomCode: string;
    playerName: string;
    avatar: string;
    role: PartyRole;
    fixedPlayerId?: string;
    color?: string;
  }) => void;
  onSwitchToHostMode?: () => void;
  onForceSync?: () => void;
}

export const ScreenMobileJoin: React.FC<ScreenMobileJoinProps> = ({
  room,
  currentClientId,
  connectionStatus = 'Connected',
  initialRoomCodeFromUrl,
  hasQrRoomParam = false,
  onJoinSession,
  onSwitchToHostMode,
  onForceSync
}) => {
  const [roomCode, setRoomCode] = useState<string>(() =>
    sanitizeRoomCode(initialRoomCodeFromUrl || room.roomId || 'BOBO')
  );
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() =>
    loadLastSelectedAvatar(RETRO_AVATARS[0])
  );
  const [selectedColor, setSelectedColor] = useState<string>('#17B8B8');
  const [selectedFixedPlayerId, setSelectedFixedPlayerId] = useState<string | undefined>(
    undefined
  );
  const [selectedRole, setSelectedRole] = useState<PartyRole>('player');
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const quickSelectOptions: QuickSelectSeatOption[] = getUnclaimedQuickSelectPlayers(
    room,
    currentClientId
  );

  // If opened via QR Code with ?room=XXXX, focus straight on the name input
  useEffect(() => {
    if (hasQrRoomParam && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [hasQrRoomParam]);

  const handlePasteCode = async () => {
    sounds.playTick();
    setErrorMessage(null);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const clipText = await navigator.clipboard.readText();
        const cleaned = sanitizeRoomCode(clipText);
        if (cleaned) {
          setRoomCode(cleaned);
          setPasteFeedback('✓ Código colado!');
          window.setTimeout(() => setPasteFeedback(null), 2000);
          return;
        }
      }
      setPasteFeedback('Área de transferência vazia');
      window.setTimeout(() => setPasteFeedback(null), 2000);
    } catch {
      setPasteFeedback('Digite o código manualmente');
      window.setTimeout(() => setPasteFeedback(null), 2000);
    }
  };

  const handleSelectQuickSeat = (seat: QuickSelectSeatOption) => {
    sounds.playSuccess();
    setErrorMessage(null);
    setPlayerName(seat.name);
    setSelectedAvatar(seat.avatar);
    setSelectedColor(seat.color);
    setSelectedFixedPlayerId(seat.fixedPlayerId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = sanitizeRoomCode(roomCode);
    const cleanName = playerName.trim();

    if (cleanCode.length < 3) {
      sounds.playBuzzer();
      setErrorMessage('Digite um código de sala válido (ex: BOBO).');
      return;
    }

    if (!cleanName) {
      sounds.playBuzzer();
      setErrorMessage('Escolha seu nome acima ou digite seu apelido para entrar.');
      return;
    }

    setErrorMessage(null);
    setIsConnecting(true);
    sounds.playPowerup();

    saveLastSelectedAvatar(selectedAvatar);
    savePlayerAvatarPreference(
      [currentClientId, cleanName, selectedFixedPlayerId],
      selectedAvatar
    );

    window.setTimeout(() => {
      onJoinSession({
        roomCode: cleanCode,
        playerName: cleanName,
        avatar: selectedAvatar,
        role: selectedRole,
        fixedPlayerId: selectedFixedPlayerId,
        color: selectedColor
      });
      setIsConnecting(false);
    }, 120);
  };

  const isOnline = connectionStatus === 'Connected';

  return (
    <div
      data-testid="screen-mobile-join"
      className="min-h-[100dvh] bg-[#07080d] text-white p-4 flex flex-col justify-between max-w-md mx-auto gap-4 select-none"
    >
      {/* 1. Header Compacto do Portal */}
      <div className="space-y-2.5">
        <header className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-2 min-w-0 font-anton text-sm sm:text-base tracking-wider uppercase text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              <RdbLogo variant="inline" className="h-5 w-24 shrink-0" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onForceSync && (
              <button
                type="button"
                data-testid="mobile-join-force-sync-btn"
                onClick={() => {
                  sounds.playTick();
                  onForceSync();
                }}
                className="px-2 py-0.5 rounded-full border border-cyan-400/50 bg-cyan-950/60 hover:bg-cyan-400 hover:text-black text-cyan-300 text-[10px] font-mono-code font-bold uppercase cursor-pointer transition-colors"
                title="Forçar sincronização com a TV"
              >
                Sincronizar
              </button>
            )}
            <span
              data-testid="mobile-join-network-status"
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono-code font-bold shrink-0 border ${
                isOnline
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-500/50 text-amber-300 animate-pulse'
              }`}
            >
              {isOnline ? `Conectado à Sala ${roomCode}!` : `Buscando sala ${roomCode}...`}
            </span>
          </div>
        </header>

        <p className="text-xs text-slate-300 text-center px-2 leading-relaxed">
          Digite o código exibido na tela principal da TV, escolha seu nome e entre na partida.
        </p>
      </div>

      {/* 2. Card Principal de Conexão (Formulário Robusto) */}
      <form
        onSubmit={handleSubmit}
        data-testid="mobile-join-form"
        className="bg-slate-900/90 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-5 my-auto"
      >
        {/* Campo 1 — Código da Sessão (Session Code) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="mobile-join-room-code"
              className="text-xs font-mono-code font-black uppercase tracking-wider text-slate-200"
            >
              CÓDIGO DA SALA
            </label>
            <button
              type="button"
              data-testid="mobile-join-paste-code-btn"
              onClick={handlePasteCode}
              className="text-xs font-mono-code font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{pasteFeedback || 'Colar código'}</span>
            </button>
          </div>

          <div className="relative">
            <input
              id="mobile-join-room-code"
              data-testid="mobile-join-room-code-input"
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(sanitizeRoomCode(e.target.value));
                if (errorMessage) setErrorMessage(null);
              }}
              maxLength={6}
              placeholder="BOBO"
              autoComplete="off"
              className="w-full text-center font-mono text-3xl md:text-4xl font-black tracking-[0.35em] uppercase bg-slate-950 border-2 border-slate-800 focus:border-cyan-400 focus:outline-none rounded-xl py-4 text-white placeholder:text-slate-700 transition-colors"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-500 pointer-events-none">
              #
            </span>
          </div>

          {hasQrRoomParam && (
            <div
              data-testid="mobile-join-qr-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-mono-code font-bold"
            >
              <span>✓ Sala encontrada via QR Code</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 font-mono-code">
            Código de 4 a 6 letras/números exibido no topo da TV.
          </p>
        </div>

        {/* Campo 2 — Seu Nome (Your Name) + Atalho de 1-Toque ("Quem é você?") */}
        <div className="space-y-2.5 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label
              htmlFor="mobile-join-player-name"
              className="text-xs font-mono-code font-black uppercase tracking-wider text-slate-200"
            >
              SEU NOME • QUEM É VOCÊ?
            </label>
            <span className="text-[10px] font-mono-code text-cyan-400">
              Toque em 1 clique ou digite
            </span>
          </div>

          {/* Pílulas de Seleção Rápida ("Quem é você?") */}
          <div
            data-testid="mobile-join-quick-seats"
            className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-0.5"
          >
            {quickSelectOptions.map((seat) => {
              const isSelected =
                playerName.trim().toLowerCase() === seat.name.trim().toLowerCase();

              return (
                <button
                  key={seat.id}
                  type="button"
                  data-testid={`mobile-join-seat-pill-${seat.id}`}
                  onClick={() => handleSelectQuickSeat(seat)}
                  className={`rounded-full px-3 py-1.5 border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                      : 'bg-slate-800/80 border-slate-700 hover:border-cyan-400 text-slate-200'
                  }`}
                >
                  <span className="text-sm leading-none"><PlayerMark p={seat} /></span>
                  <span>{seat.name}</span>
                  {seat.isAlreadyInRoomOnTv && !seat.isClaimedByAnotherPhone && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-mono-code uppercase">
                      TV
                    </span>
                  )}
                  {seat.isClaimedByAnotherPhone && (
                    <span className="text-[9px] font-mono-code text-emerald-400">●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Input de Nome + Seletor de Avatar Embutido */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={nameInputRef}
                id="mobile-join-player-name"
                data-testid="mobile-join-name-input"
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  setSelectedFixedPlayerId(undefined);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Seu nome ou apelido..."
                maxLength={24}
                autoComplete="nickname"
                className="w-full bg-slate-950 border-2 border-slate-800 focus:border-cyan-400 focus:outline-none rounded-xl px-3.5 py-3 text-white font-bold text-sm placeholder:text-slate-600 transition-colors"
              />
            </div>

            <span
              data-testid="mobile-join-avatar-btn"
              aria-hidden="true"
              className="h-[48px] px-2 flex items-center justify-center text-2xl shrink-0"
            >
              <PlayerMark p={{ name: playerName.trim() || '?' }} />
            </span>
          </div>
        </div>

        {/* Seletor de Papel na Sala (Modo Individual vs. Controle Mestre) */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
          <div className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">
            SEU PAPEL NA PARTIDA:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="mobile-join-role-player"
              onClick={() => {
                sounds.playTick();
                setSelectedRole('player');
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'player'
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
              }`}
            >
              <span>Entrar como Jogador</span>
            </button>

            <button
              type="button"
              data-testid="mobile-join-role-master"
              onClick={() => {
                sounds.playTick();
                setSelectedRole('master');
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'master'
                  ? 'border-amber-400 bg-amber-950/60 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
              }`}
            >
              <span>Controle Mestre (VIP Host)</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            data-testid="mobile-join-error"
            className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-200 text-xs font-mono-code font-bold text-center"
          >
            {errorMessage}
          </div>
        )}

        {/* Botão Principal de Ação (CTA) */}
        <button
          type="submit"
          data-testid="mobile-join-submit-btn"
          disabled={isConnecting}
          className="w-full py-4 rounded-full font-black text-lg uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-rose-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 transition-all cursor-pointer"
        >
          {isConnecting ? 'CONECTANDO À TV...' : 'ENTRAR NA SESSÃO ➔'}
        </button>
      </form>

      {/* 3. Card Inferior ("Sem código ainda? Crie uma sala como Host") */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2">
        <div className="font-bold text-xs text-slate-200">
          Sem código ainda? Crie uma sala como Host.
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Abra a tela principal na TV ou computador para gerar o código e comandar os 14 jogos.
        </p>
        {onSwitchToHostMode && (
          <button
            type="button"
            data-testid="mobile-join-switch-to-host-btn"
            onClick={() => {
              sounds.playTick();
              onSwitchToHostMode();
            }}
            className="mt-1 py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400/60 text-cyan-300 text-xs font-mono-code font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Abrir Modo TV / Host neste aparelho ➔
          </button>
        )}
      </div>

      {/* Modal de Avatar Retrô */}
      {showAvatarModal && (
        <RetroAvatarModal
          isOpen={showAvatarModal}
          selectedAvatar={selectedAvatar}
          playerName={playerName.trim() || 'Convidado'}
          playerId={currentClientId}
          fixedPlayerId={selectedFixedPlayerId}
          onSelectAvatar={(newAvatar) => {
            setSelectedAvatar(newAvatar);
            saveLastSelectedAvatar(newAvatar);
          }}
          onClose={() => setShowAvatarModal(false)}
        />
      )}
    </div>
  );
};
