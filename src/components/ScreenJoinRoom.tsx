import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GameRoom } from '../types/game';
import {
  PartyRole,
  QuickSelectSeatOption,
  getUnclaimedQuickSelectPlayers,
  sanitizeRoomCode
} from '../utils/partyNetworkEngine';
import {
  RETRO_AVATARS,
  loadLastSelectedAvatar,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from '../utils/retroAvatars';
import { RetroAvatarModal } from './RetroAvatarPicker';
import { DynamicQRCode } from './DynamicQRCode';
import { resolvePublicShareOrigin } from '../utils/multiplayerRoomEngine';
import { sounds } from '../utils/soundEffects';
import {
  KeyRound,
  QrCode,
  X,
  ClipboardPaste,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Smartphone,
  Layers
} from 'lucide-react';
import { PlayerMark } from './rdb/PlayerMark';

export interface ScreenJoinRoomProps {
  isOpen: boolean;
  room: GameRoom;
  currentClientId?: string;
  initialCode?: string;
  initialRoomCode?: string;
  connectionStatus?: 'Connected' | 'Reconnecting' | 'Offline';
  onClose: () => void;
  onJoinRoom?: (params: {
    roomCode: string;
    playerName: string;
    avatar: string;
    role: PartyRole;
    fixedPlayerId?: string;
    color?: string;
  }) => void;
  onJoinSuccess?: (params: {
    roomCode: string;
    playerName: string;
    avatar: string;
    role?: PartyRole;
    fixedPlayerId?: string;
    color?: string;
  }) => void;
  onForceSync?: () => void;
}

export const ScreenJoinRoom: React.FC<ScreenJoinRoomProps> = ({
  isOpen,
  room,
  currentClientId = '',
  initialCode = '',
  initialRoomCode = '',
  connectionStatus = 'Connected',
  onClose,
  onJoinRoom,
  onJoinSuccess
}) => {
  const effectiveInitial = initialRoomCode || initialCode;
  const [roomCode, setRoomCode] = useState<string>(() =>
    sanitizeRoomCode(effectiveInitial || (room.roomId !== 'BOBO' && room.roomId !== 'RODA' ? room.roomId : ''))
  );
  const [joinMethod, setJoinMethod] = useState<'code' | 'qr'>('code');
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const activeTargetCode = roomCode || room.roomId || 'RODA';
  const baseOrigin = typeof window !== 'undefined' ? resolvePublicShareOrigin(window.location.origin) : '';
  const directJoinUrl = `${baseOrigin}/?join=${activeTargetCode}&role=client`;

  useEffect(() => {
    if (initialCode) {
      setRoomCode(sanitizeRoomCode(initialCode));
    }
  }, [initialCode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (joinMethod === 'code') {
      if (roomCode.length >= 4 && nameInputRef.current) {
        nameInputRef.current.focus();
      } else if (codeInputRef.current) {
        codeInputRef.current.focus();
      }
    }
  }, [isOpen, joinMethod]);

  if (!isOpen || typeof document === 'undefined') return null;

  const quickSelectOptions: QuickSelectSeatOption[] = getUnclaimedQuickSelectPlayers(
    room,
    currentClientId
  );

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
      setPasteFeedback('Digite manualmente');
      window.setTimeout(() => setPasteFeedback(null), 2000);
    } catch {
      setPasteFeedback('Digite manualmente');
      window.setTimeout(() => setPasteFeedback(null), 2000);
    }
  };

  const handleCopyDirectLink = () => {
    sounds.playSuccess();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(directJoinUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
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

    if (cleanCode.length < 4) {
      sounds.playBuzzer();
      setErrorMessage('Digite o código da sala de 4 a 6 caracteres (ex: K9X4M2).');
      return;
    }

    if (!cleanName) {
      sounds.playBuzzer();
      setErrorMessage('Selecione seu nome da casa ou digite seu apelido para entrar.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    sounds.playPowerup();

    saveLastSelectedAvatar(selectedAvatar);
    savePlayerAvatarPreference(
      [currentClientId, cleanName, selectedFixedPlayerId],
      selectedAvatar
    );

    window.setTimeout(() => {
      const payload = {
        roomCode: cleanCode,
        playerName: cleanName,
        avatar: selectedAvatar,
        role: selectedRole,
        fixedPlayerId: selectedFixedPlayerId,
        color: selectedColor
      };
      if (onJoinRoom) {
        onJoinRoom(payload);
      }
      if (onJoinSuccess) {
        onJoinSuccess(payload);
      }
      setIsSubmitting(false);
    }, 100);
  };

  const isOnline = connectionStatus === 'Connected';

  return createPortal(
    <div
      data-testid="screen-join-room-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-[1050] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none overflow-y-auto"
    >
      <div
        role="dialog"
        aria-modal="true"
        data-testid="screen-join-room-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[#07080d] border-2 border-cyan-400 p-4 sm:p-6 shadow-[0_0_45px_rgba(6,182,212,0.35)] space-y-4 text-white my-auto rounded-xl transition-all"
      >
        {/* Header do Modal com Status e Opções de Entrada */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shrink-0">
              <KeyRound size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-anton text-lg sm:text-2xl uppercase tracking-wider text-white leading-tight">
                  ENTRAR NA SALA
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold border shrink-0 ${
                    isOnline
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                  }`}
                >
                  {isOnline ? '🟢 Conectado' : '🔄 Sincronizando'}
                </span>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400">
                Escolha como entrar: digitando o código ou escaneando o QR Code pelo smartphone
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="join-room-close-btn"
            onClick={() => {
              sounds.playTick();
              onClose();
            }}
            aria-label="Fechar entrada de sala"
            className="w-9 h-9 bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-sm"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Seletor de Modo: [ ⌨️ Entrar com Código ] vs [ 📱 Escanear QR Code ] */}
        <div className="flex items-center justify-center sm:justify-start gap-2 bg-black/60 p-1 border border-white/10 rounded w-fit">
          <button
            type="button"
            data-testid="join-method-code-btn"
            onClick={() => {
              sounds.playTick();
              setJoinMethod('code');
            }}
            className={`px-4 py-2 font-anton text-xs uppercase tracking-wider flex items-center gap-2 rounded cursor-pointer transition-all ${
              joinMethod === 'code'
                ? 'bg-cyan-400 text-black font-bold shadow-neon-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound size={14} />
            <span>Entrar com Código</span>
          </button>

          <button
            type="button"
            data-testid="join-method-qr-btn"
            onClick={() => {
              sounds.playTick();
              setJoinMethod('qr');
            }}
            className={`px-4 py-2 font-anton text-xs uppercase tracking-wider flex items-center gap-2 rounded cursor-pointer transition-all ${
              joinMethod === 'qr'
                ? 'bg-[#E6194B] text-white font-bold shadow-[0_0_12px_rgba(230,25,75,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode size={14} />
            <span>Ler QR Code</span>
          </button>
        </div>

        {/* Conteúdo Horizontal: Grid com 2 colunas no desktop */}
        {joinMethod === 'code' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Coluna Esquerda: Código da Sala e Papel */}
              <div className="space-y-3 bg-[#0d101a] border border-white/10 p-4 rounded">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="join-room-code-input"
                      className="text-xs font-mono-code font-bold uppercase tracking-wider text-cyan-300"
                    >
                      1. CÓDIGO DA SALA (6 DÍGITOS)
                    </label>
                    <button
                      type="button"
                      data-testid="join-room-paste-btn"
                      onClick={handlePasteCode}
                      className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 font-mono-code text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ClipboardPaste size={12} />
                      <span>{pasteFeedback || 'Colar código'}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      ref={codeInputRef}
                      id="join-room-code-input"
                      data-testid="join-room-code-input"
                      type="text"
                      value={roomCode}
                      onChange={(e) => {
                        setRoomCode(sanitizeRoomCode(e.target.value));
                        if (errorMessage) setErrorMessage(null);
                      }}
                      maxLength={6}
                      placeholder="K9X4M2"
                      autoComplete="off"
                      className="w-full text-center font-mono-code text-3xl sm:text-4xl font-black tracking-[0.3em] uppercase bg-black border-2 border-slate-700 focus:border-cyan-400 focus:outline-none rounded py-3 text-white placeholder:text-slate-700 transition-colors"
                    />
                    {initialCode && roomCode === sanitizeRoomCode(initialCode) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-[10px] font-mono-code text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>SALA ATIVA</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Papel na Sala */}
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono-code font-bold uppercase text-slate-400 block">
                    Modo de Conexão:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid="join-room-role-player"
                      onClick={() => {
                        sounds.playTick();
                        setSelectedRole('player');
                      }}
                      className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        selectedRole === 'player'
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                          : 'border-slate-800 bg-black text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🙋‍♂️ Jogador</span>
                    </button>
                    <button
                      type="button"
                      data-testid="join-room-role-master"
                      onClick={() => {
                        sounds.playTick();
                        setSelectedRole('master');
                      }}
                      className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        selectedRole === 'master'
                          ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                          : 'border-slate-800 bg-black text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>👑 Host / Telão</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Identificação, Jogadores da Casa e Avatar */}
              <div className="space-y-3 bg-[#0d101a] border border-white/10 p-4 rounded">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="join-room-name-input"
                    className="text-xs font-mono-code font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    <span>2. IDENTIFICAÇÃO DO JOGADOR</span>
                  </label>
                  <span className="text-[10px] font-mono-code text-slate-400">
                    1 clique no elenco
                  </span>
                </div>

                {/* Elenco Rápido */}
                <div
                  data-testid="join-room-quick-seats"
                  className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto"
                >
                  {quickSelectOptions.map((seat) => {
                    const isSelected =
                      playerName.trim().toLowerCase() === seat.name.trim().toLowerCase();
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        data-testid={`join-room-seat-${seat.id}`}
                        onClick={() => handleSelectQuickSeat(seat)}
                        className={`px-2.5 py-1 border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer rounded ${
                          isSelected
                            ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                            : 'bg-black border-slate-700 hover:border-cyan-400 text-slate-200'
                        }`}
                      >
                        <span><PlayerMark p={seat} /></span>
                        <span>{seat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input de Nome e Seletor de Avatar */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <input
                    ref={nameInputRef}
                    id="join-room-name-input"
                    data-testid="join-room-name-input"
                    type="text"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      setSelectedFixedPlayerId(undefined);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Ou digite seu apelido..."
                    maxLength={24}
                    className="flex-1 bg-black border-2 border-slate-700 focus:border-cyan-400 focus:outline-none rounded px-3 py-2 text-white font-bold text-sm placeholder:text-slate-600"
                  />

                  <span
                    data-testid="join-room-avatar-btn"
                    aria-hidden="true"
                    className="h-[42px] px-2 flex items-center justify-center text-xl shrink-0"
                  >
                    <PlayerMark p={{ name: playerName.trim() || '?' }} />
                  </span>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div
                data-testid="join-room-error"
                className="p-2.5 rounded bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-mono-code font-bold text-center"
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {/* Botão de Entrar */}
            <button
              type="submit"
              data-testid="join-room-submit-btn"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded font-anton text-lg uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-[#17B8B8] to-rose-500 text-black font-black shadow-[0_0_25px_rgba(23,184,184,0.45)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'SINCRONIZANDO SALA...' : 'ENTRAR NA SALA AGORA'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* Visualização de QR Code (Horizontal, Ampla e Funcional) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-[#0d101a] border border-white/10 p-4 sm:p-6 rounded">
            {/* Coluna Esquerda: O QR Code em Destaque */}
            <div className="flex flex-col items-center justify-center p-3 bg-black/60 border border-cyan-400/40 rounded shadow-neon-cyan">
              <DynamicQRCode url={directJoinUrl} size={220} />
              <span className="text-[11px] font-mono-code text-cyan-300 font-bold uppercase mt-2">
                SALA: {activeTargetCode}
              </span>
            </div>

            {/* Coluna Direita: Instruções, Link Direto e Botões Rápidos */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-anton text-base uppercase">
                  <Smartphone size={18} />
                  <span>COMO ENTRAR PELO CELULAR</span>
                </div>
                <p className="text-xs font-mono-code text-slate-300 mt-1 leading-relaxed">
                  1. Aponte a câmera do seu celular para o QR Code ao lado.<br />
                  2. Toque na notificação para abrir o controle móvel no navegador.<br />
                  3. Seu celular se conectará automaticamente à sala <strong>{activeTargetCode}</strong>.
                </p>
              </div>

              {/* Link direto copíavel */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <span className="text-[10px] font-mono-code uppercase font-bold text-slate-400 block">
                  Link Direto da Sala:
                </span>
                <div className="p-2.5 bg-black border border-slate-700 text-[11px] font-mono-code text-cyan-300 break-all select-all rounded">
                  {directJoinUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyDirectLink}
                  className="w-full py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors rounded"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'LINK COPIADO COM SUCESSO!' : 'COPIAR LINK DA SALA'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <RetroAvatarModal
          isOpen={showAvatarModal}
          selectedAvatar={selectedAvatar}
          playerName={playerName || 'Jogador'}
          onSelectAvatar={(emoji) => setSelectedAvatar(emoji)}
          onClose={() => setShowAvatarModal(false)}
        />
      </div>
    </div>,
    document.body
  );
};
