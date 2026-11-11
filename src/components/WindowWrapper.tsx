import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  RotateCcw,
  X,
  ChevronDown,
  Volume2,
  VolumeX,
  QrCode,
  History,
  Trophy,
  Settings,
  Copy,
  Check,
  Sparkles,
  Users,
  Tv,
  Smartphone,
  KeyRound
} from 'lucide-react';
import { RodaDeBoboOfficialBadge } from './RodaIcons';
import { isCazeFamily, nextTheme as nextThemeOf, themeBadge, cazeArtSrc } from '../utils/themeUtils';
import { GameRoom, GameId, VisualTheme, TeamId } from '../types/game';
import { getResumableMatchScore } from '../utils/sessionPersistence';
import { sounds } from '../utils/soundEffects';
import { DynamicQRCode } from './DynamicQRCode';
import { GlobalStats } from './GlobalStats';
import { LeaderboardRanking } from './LeaderboardRanking';
import { PlayersManagerModal } from './PlayersManagerModal';
import { clearUsedRoundSignatures } from '../utils/aiGameGenerator';
import { resolvePublicShareOrigin, fetchAndCacheLanOrigin } from '../utils/multiplayerRoomEngine';
import { FIXED_PLAYERS } from '../utils/fixedPlayers';
import { TEAM_META } from '../utils/teamUtils';

const GAME_TITLES: Record<GameId, string> = {
  limite: 'JOGO DO LIMITE',
  duvido: 'JOGO DO DUVIDO',
  proibido: 'JOGO DO PROIBIDO',
  nota: 'JOGO DA NOTA',
  'tem-ou-nao-tem': 'TEM OU NÃO TEM',
  'perguntas-e-verdades': 'PERGUNTAS E VERDADES',
  mimica: 'JOGO DA MÍMICA',
  'quem-sou-eu': 'QUEM SOU EU',
  'mega-resenha': 'MEGA RESENHA',
  repetente: 'REPETENTE'
};

interface WindowWrapperProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  isTvMode?: boolean;
  onToggleTvMode?: () => void;
  onSwitchToControllerMode?: () => void;
  onSurpriseGame?: () => void;
  onClose?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  room?: GameRoom;
  onResetStats?: () => void;
  resumableRoom?: GameRoom | null;
  onResumeGame?: () => void;
  onDismissResume?: () => void;
  canUndoVar?: boolean;
  onUndoVar?: () => void;
  varActiveFlash?: boolean;
  visualTheme?: VisualTheme;
  onSetVisualTheme?: (theme: VisualTheme) => void;
  onOpenJoinRoomModal?: () => void;
  isLoadingRound?: boolean;
  onAddPlayer?: (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    team?: TeamId;
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => void;
  onRemovePlayer?: (playerId: string) => void;
}

const WindowWrapperComponent: React.FC<WindowWrapperProps> = ({
  title,
  badge,
  children,
  className = '',
  isTvMode = true,
  onToggleTvMode,
  onSwitchToControllerMode,
  onSurpriseGame,
  onClose,
  showBackButton = false,
  onBack,
  room,
  onResetStats,
  resumableRoom,
  onResumeGame,
  onDismissResume,
  canUndoVar = false,
  onUndoVar,
  varActiveFlash = false,
  visualTheme = 'neon',
  onSetVisualTheme,
  onOpenJoinRoomModal,
  isLoadingRound = false,
  onAddPlayer,
  onRemovePlayer
}) => {
  const [isResumeHoverOpen, setIsResumeHoverOpen] = useState(false);
  const [muted, setMutedState] = useState(() => sounds.isMuted());
  const [activeDockModal, setActiveDockModal] = useState<'qr' | 'players' | 'history' | 'ranking' | 'config' | null>(null);
  const [newLocalPlayerName, setNewLocalPlayerName] = useState('');
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<'back' | 'close'>('back');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [clearedMemoryNotice, setClearedMemoryNotice] = useState(false);
  const windowContainerRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimeoutRef = useRef<number | null>(null);

  const isGameRunning = room?.screen === 'playing' || Boolean(isLoadingRound);
  const canCloseScreen = Boolean((room && room.screen !== 'lobby' && (onClose || onBack)) || isLoadingRound);

  const handleRequestBack = () => {
    if (!onBack) return;
    sounds.playTick();
    if (isGameRunning) {
      setPendingExitAction('back');
      setIsExitConfirmOpen(true);
    } else {
      onBack();
    }
  };

  const handleRequestClose = () => {
    const closeAction = onClose || onBack;
    if (!closeAction || room?.screen === 'lobby' || room?.screen === 'mode-select') return;
    sounds.playTick();
    if (isGameRunning) {
      setPendingExitAction('close');
      setIsExitConfirmOpen(true);
    } else {
      closeAction();
    }
  };

  const handleConfirmExit = () => {
    setIsExitConfirmOpen(false);
    if (pendingExitAction === 'close') {
      (onClose || onBack)?.();
    } else {
      (onBack || onClose)?.();
    }
  };

  useEffect(() => {
    if (!isGameRunning && isExitConfirmOpen) {
      setIsExitConfirmOpen(false);
    }
  }, [isGameRunning, isExitConfirmOpen]);

  useEffect(() => {
    if (!activeDockModal && !isExitConfirmOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDockModal(null);
        setIsExitConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDockModal, isExitConfirmOpen]);

  const handleToggleMute = () => {
    const nextMuted = sounds.toggleMute();
    setMutedState(nextMuted);
    if (!nextMuted) {
      sounds.playTick();
    }
  };

  const openResumeOverlay = () => {
    if (hoverCloseTimeoutRef.current) {
      window.clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
    setIsResumeHoverOpen(true);
  };

  const scheduleCloseResumeOverlay = () => {
    if (hoverCloseTimeoutRef.current) {
      window.clearTimeout(hoverCloseTimeoutRef.current);
    }
    hoverCloseTimeoutRef.current = window.setTimeout(() => {
      setIsResumeHoverOpen(false);
    }, 140);
  };

  const resumableScores = resumableRoom ? getResumableMatchScore(resumableRoom) : { scoreA: 0, scoreB: 0 };
  const resumableGameTitle = resumableRoom?.activeGame
    ? GAME_TITLES[resumableRoom.activeGame]
    : 'SESSÃO EM ANDAMENTO';
  const resumableRoundText = resumableRoom
    ? resumableRoom.screen === 'game-over'
      ? `Placar Final (${resumableRoom.maxRounds} rodadas)`
      : `Rodada ${resumableRoom.roundNumber} de ${resumableRoom.maxRounds}`
    : '';

  const [baseOrigin, setBaseOrigin] = useState<string>(() =>
    resolvePublicShareOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  );

  useEffect(() => {
    fetchAndCacheLanOrigin().then(() => {
      setBaseOrigin(resolvePublicShareOrigin(typeof window !== 'undefined' ? window.location.origin : ''));
    });
    const handleLanUpdated = () => {
      setBaseOrigin(resolvePublicShareOrigin(typeof window !== 'undefined' ? window.location.origin : ''));
    };
    window.addEventListener('rb:lan-origin-updated', handleLanUpdated);
    return () => window.removeEventListener('rb:lan-origin-updated', handleLanUpdated);
  }, []);

  const playUrl = `${baseOrigin}/?join=${room?.roomId || 'RODA'}&role=client`;

  const handleCopyPlayUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(playUrl);
      setCopiedUrl(true);
      sounds.playSuccess();
      window.setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div
      ref={windowContainerRef}
      className={`relative border ${
        varActiveFlash
          ? 'border-amber-400 border-dashed shadow-[0_0_32px_rgba(251,191,36,0.75)]'
          : visualTheme === 'neon'
          ? 'border-2 border-[#17B8B8] shadow-neon-cyan'
          : visualTheme === 'original' ? 'border-2 border-[#E6194B]' : 'border-[#E6194B]/70'
      } bg-[#07080d] shadow-2xl flex flex-col justify-between retro-window-container transition-all duration-200 flex-1 min-h-0 h-full max-h-full overflow-hidden select-none ${className}`}
    >
      {/* VAR Review Flash Banner */}
      {varActiveFlash && (
        <div
          data-testid="var-review-flash-banner"
          className="absolute inset-x-0 top-10 z-50 flex justify-center pointer-events-none"
        >
          <div className="px-6 py-2 border border-dashed border-amber-300 bg-amber-950/95 text-amber-300 font-anton text-base md:text-lg uppercase tracking-widest shadow-[0_0_28px_rgba(251,191,36,0.8)] animate-pulse">
            📺 REVISÃO DO VAR — ÚLTIMA AÇÃO RESTAURADA!
          </div>
        </div>
      )}

      {/* UNIFIED SINGLE TOP BAR (h-12 / 48px) */}
      <div className="relative z-30 h-12 min-h-[48px] max-h-[48px] bg-[#07080d] border-b border-white/10 px-3 flex items-center justify-between gap-2 select-none shrink-0">
        {/* Left Side: Back button, Logo RODA DE BOBO, Clickable Room/QR Badge, Clickable Players Badge, VAR & Saved Match */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {showBackButton && onBack ? (
            <button
              type="button"
              data-testid="window-back-btn"
              onClick={handleRequestBack}
              className="w-7 h-7 flex items-center justify-center border border-[#17B8B8] bg-[#17B8B8]/10 text-[#17B8B8] hover:bg-[#17B8B8] hover:text-black font-mono-code text-xs font-bold uppercase transition-colors cursor-pointer shrink-0"
              title="Voltar"
              aria-label="Voltar"
            >
              <ArrowLeft size={14} />
            </button>
          ) : null}

          <div className="flex items-center gap-1.5 min-w-0">
            <div className="bg-white/[0.03] px-1.5 py-0.5 flex items-center shrink-0">
              <RodaDeBoboOfficialBadge size="sm" />
            </div>

            {visualTheme === 'original' && room?.activeGame && (<img src={cazeArtSrc(room.activeGame)} alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-8 w-8 object-contain pointer-events-none select-none shrink-0" />)}
            <span className="font-anton tracking-wider text-sm text-[#F5F2EB] uppercase hidden 2xl:inline truncate max-w-[220px]">
              {title}
            </span>

            {/* On Lobby / Mode Select: [ 🔑 ENTRAR EM UMA SALA (CÓDIGO) ]. Inside game: [ 🔴 LIVE / CONECTAR CELULARES ] */}
            {room?.screen === 'lobby' || room?.screen === 'mode-select' ? (
              <button
                type="button"
                data-testid="dock-qr-btn"
                onClick={() => {
                  sounds.playTick();
                  if (onOpenJoinRoomModal) {
                    onOpenJoinRoomModal();
                  } else {
                    window.dispatchEvent(new CustomEvent('rb:open-lobby-modal', { detail: 'qr' }));
                  }
                }}
                className="px-2.5 py-1 border border-cyan-400/80 bg-cyan-500/15 hover:bg-cyan-400 hover:text-black text-cyan-200 font-mono-code text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                title="Entrar em uma sala existente digitando o código de 6 dígitos"
                aria-label="ENTRAR EM UMA SALA (CÓDIGO)"
              >
                <KeyRound size={13} className="shrink-0 text-cyan-300" />
                <span className="md:hidden">ENTRAR</span>
                <span className="hidden md:inline">ENTRAR NA SALA</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="dock-qr-btn"
                onClick={() => {
                  sounds.playTick();
                  setActiveDockModal((prev) => (prev === 'qr' ? null : 'qr'));
                }}
                className={`px-2 sm:px-2.5 py-1 border font-mono-code text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeDockModal === 'qr'
                    ? 'border-[#17B8B8] bg-[#17B8B8] text-black shadow-neon-cyan'
                    : 'border-[#E6194B] bg-gradient-to-r from-[#E6194B]/25 via-purple-950/60 to-[#17B8B8]/25 text-white hover:border-[#17B8B8] hover:bg-[#17B8B8] hover:text-black shadow-[0_0_15px_rgba(230,25,75,0.3)]'
                }`}
                title="Abrir Portal Live Together / Conectar Celulares via QR Code"
                aria-label="LIVE / CONECTAR CELULARES"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <QrCode size={13} className="shrink-0 text-cyan-300" />
                <span className="md:hidden">🔴 LIVE</span>
                <span className="hidden md:inline">🔴 LIVE / CONECTAR CELULARES</span>
                {room?.connectionMode && room.connectionMode !== 'local' && (
                  <span className="hidden lg:inline px-1.5 py-0.5 rounded bg-black/50 border border-cyan-400/40 text-cyan-300 text-[10px]">
                    #{room.roomId} • {room.players.filter((p) => p.connected !== false).length || 0} ON
                  </span>
                )}
              </button>
            )}

            {/* Clickable Badge: [ 👥 Jogadores: X ] */}
            {room && (
              <button
                type="button"
                data-testid="header-players-badge-btn"
                onClick={() => {
                  sounds.playTick();
                  setActiveDockModal((prev) => (prev === 'players' ? null : 'players'));
                }}
                className="px-2 py-1 border border-[#E6194B]/60 bg-[#E6194B]/15 hover:bg-[#E6194B] hover:text-white text-rose-300 font-mono-code text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Gerenciar Jogadores da Sala"
              >
                <span className="sm:hidden">👥 {room.players.length}</span>
                <span className="hidden sm:inline">👥 Jogadores: {room.players.length}</span>
              </button>
            )}

            {/* VAR (Desfazer) Button */}
            {onUndoVar && (
              <button
                type="button"
                data-testid="var-undo-btn"
                disabled={!canUndoVar}
                onClick={onUndoVar}
                className={`px-2 py-1 border font-mono-code text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shrink-0 ${
                  canUndoVar
                    ? 'border-amber-400/80 bg-amber-500/15 hover:bg-amber-400 hover:text-black text-amber-300 cursor-pointer'
                    : 'border-white/10 bg-white/[0.02] text-slate-600 cursor-not-allowed'
                }`}
                title="Revisão do VAR: Desfazer última ação"
              >
                <RotateCcw size={11} className="shrink-0" />
                <span className="hidden sm:inline">📺 VAR (Desfazer)</span>
              </button>
            )}

            {/* Menu Item: Saved Game State in localStorage */}
            {resumableRoom && onResumeGame && (
              <div
                className="relative shrink-0"
                onMouseEnter={openResumeOverlay}
                onMouseLeave={scheduleCloseResumeOverlay}
              >
                <button
                  type="button"
                  data-testid="resume-game-menu-item"
                  aria-expanded={isResumeHoverOpen}
                  onClick={openResumeOverlay}
                  onFocus={openResumeOverlay}
                  className={`px-2 py-1 border font-mono-code text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                    isResumeHoverOpen
                      ? 'border-amber-300 bg-amber-400 text-black'
                      : 'border-amber-400/70 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300'
                  }`}
                  title="Passe o mouse para ver a partida salva e retomar"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isResumeHoverOpen ? 'bg-black' : 'bg-amber-400'
                    }`}
                  />
                  <RotateCcw size={12} className="shrink-0" />
                  <span className="hidden md:inline">PARTIDA SALVA</span>
                  <ChevronDown
                    size={12}
                    className={`shrink-0 transition-transform duration-200 ${
                      isResumeHoverOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Sound, Rules, History, Config, TV/Mobile Toggle & Decorative Retro OS Controls */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Global Sound Mute / Unmute Toggle */}
          <button
            type="button"
            data-testid="window-mute-btn"
            onClick={handleToggleMute}
            className={`px-2 py-1 border font-mono-code text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
              muted
                ? 'border-[#E6194B]/60 bg-[#E6194B]/15 text-rose-300 hover:bg-[#E6194B]/25'
                : 'border-[#17B8B8]/50 bg-[#17B8B8]/10 text-[#17B8B8] hover:bg-[#17B8B8]/20'
            }`}
            title={muted ? 'Ativar efeitos sonoros' : 'Silenciar efeitos sonoros'}
            aria-label={muted ? 'Ativar som' : 'Silenciar som'}
          >
            {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            <span className="hidden xl:inline">{muted ? 'MUDO' : 'SOM'}</span>
          </button>

          {/* Global Header Utility Dock */}
          <div
            data-testid="header-utility-dock"
            className="flex items-center gap-1 bg-white/[0.03] px-1 py-0.5 border border-white/10"
          >
            <button
              type="button"
              data-testid="dock-history-btn"
              onClick={() => {
                sounds.playTick();
                setActiveDockModal((prev) => (prev === 'history' ? null : 'history'));
              }}
              className={`px-2 py-1 text-[11px] font-mono-code font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer ${
                activeDockModal === 'history'
                  ? 'bg-[#17B8B8] text-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Histórico de Partidas"
              aria-label="Histórico de Partidas"
            >
              <History size={13} />
              <span className="hidden xl:inline">Histórico</span>
            </button>

            <button
              type="button"
              data-testid="dock-ranking-btn"
              onClick={() => {
                sounds.playTick();
                setActiveDockModal((prev) => (prev === 'ranking' ? null : 'ranking'));
              }}
              className={`px-2 py-1 text-[11px] font-mono-code font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer ${
                activeDockModal === 'ranking'
                  ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                  : 'text-amber-300 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Ranking e Tabela de Classificação"
              aria-label="Ranking e Tabela de Classificação"
            >
              <Trophy size={13} className="text-amber-400" />
              <span className="hidden xl:inline">Ranking</span>
            </button>

            {onSetVisualTheme && (
              <button
                type="button"
                data-testid="dock-quick-theme-btn"
                onClick={() => {
                  sounds.playTick();
                  onSetVisualTheme(nextThemeOf(visualTheme));
                }}
                className={`px-2 py-1 text-[11px] font-mono-code font-bold uppercase flex items-center gap-1 transition-all cursor-pointer ${
                  isCazeFamily(visualTheme)
                    ? 'border border-[#E6194B] bg-[#E6194B]/20 text-rose-300 shadow-[0_0_12px_rgba(230,25,75,0.4)]'
                    : visualTheme === 'neon'
                    ? 'border border-[#17B8B8]/80 bg-[#17B8B8]/20 text-cyan-300 shadow-neon-cyan'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
                title="Alternar entre temas: Neon, Clean, Modo 2 e Modo 3 (Original)"
                aria-label="Alternar Tema Visual"
              >
                <Sparkles
                  size={12}
                  className={
                    isCazeFamily(visualTheme)
                      ? 'text-rose-400 animate-pulse'
                      : visualTheme === 'neon'
                      ? 'text-[#17B8B8] animate-pulse'
                      : 'text-slate-400'
                  }
                />
                <span className="hidden 2xl:inline">
                  {themeBadge(visualTheme)}
                </span>
              </button>
            )}

            <button
              type="button"
              data-testid="dock-config-btn"
              onClick={() => {
                sounds.playTick();
                setActiveDockModal((prev) => (prev === 'config' ? null : 'config'));
              }}
              className={`px-2 py-1 text-[11px] font-mono-code font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer ${
                activeDockModal === 'config'
                  ? 'bg-[#17B8B8] text-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
              title="Configurações de Tema, IA e Áudio"
              aria-label="Configurações de Tema, IA e Áudio"
            >
              <Settings size={13} />
              <span className="hidden xl:inline">Config</span>
            </button>
          </div>

          {/* Toggle [ 📺 Modo TV / 📱 Celular ] */}
          {onToggleTvMode && (
            <button
              type="button"
              data-testid="toggle-tv-mode-btn"
              onClick={() => {
                sounds.playTick();
                onToggleTvMode();
              }}
              className={`px-2 py-1 border font-mono-code text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                isTvMode
                  ? 'border-amber-300 bg-[#FFE600] text-black'
                  : 'border-slate-700 bg-black text-slate-300 hover:border-cyan-400'
              }`}
              title="Alternar Modo TV"
            >
              <Tv size={12} />
              <span className="hidden 2xl:inline">TV</span>
            </button>
          )}

          {onSwitchToControllerMode && (
            <button
              type="button"
              onClick={() => {
                sounds.playTick();
                onSwitchToControllerMode();
              }}
              className="px-2 py-1 border border-cyan-400/70 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 font-mono-code text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title="Alternar para Visão de Controle Mobile"
            >
              <Smartphone size={12} />
              <span className="hidden 2xl:inline">Celular</span>
            </button>
          )}

          {/* Retro OS Window Controls (_ □ Decorative, X interactive when inside a screen) */}
          <div
            data-testid="window-decorative-controls"
            className="flex items-center border border-[#E6194B]/60 bg-black shrink-0 select-none"
          >
            <span
              data-testid="window-minimize-btn"
              aria-hidden="true"
              className="hidden sm:flex w-7 h-6 items-center justify-center border-r border-[#E6194B]/30 text-[#E6194B] pointer-events-none select-none"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="2" y="5.25" width="8" height="1.75" fill="currentColor" rx="0.5" />
              </svg>
            </span>

            <span
              data-testid="window-recenter-btn"
              aria-hidden="true"
              className="hidden sm:flex w-7 h-6 items-center justify-center border-r border-[#E6194B]/30 text-[#E6194B] pointer-events-none select-none"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M4.5 2.25H11.75V9.5"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinecap="square"
                />
                <rect
                  x="2.25"
                  y="4.5"
                  width="7.25"
                  height="7.25"
                  stroke="currentColor"
                  strokeWidth="1.35"
                />
                <circle cx="5.875" cy="8.125" r="1" fill="currentColor" />
              </svg>
            </span>

            {canCloseScreen ? (
              <button
                type="button"
                data-testid="window-close-btn"
                onClick={handleRequestClose}
                title="Fechar tela atual"
                aria-label="Fechar tela atual"
                className="w-7 h-6 flex items-center justify-center bg-[#E6194B] hover:bg-rose-500 text-white transition-colors cursor-pointer"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            ) : (
              <span
                data-testid="window-close-btn"
                aria-hidden="true"
                className="hidden sm:flex w-7 h-6 items-center justify-center bg-[#E6194B] text-white pointer-events-none select-none"
              >
                <X size={14} strokeWidth={2.5} />
              </span>
            )}
          </div>
        </div>

        {/* Hover Overlay Panel for Resume Game */}
        {resumableRoom && onResumeGame && (
          <div
            onMouseEnter={openResumeOverlay}
            onMouseLeave={scheduleCloseResumeOverlay}
            className={`absolute left-2 right-2 lg:left-3 lg:right-auto lg:w-[860px] top-full pt-1.5 z-50 transition-all duration-200 origin-top-left ${
              isResumeHoverOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                : 'opacity-0 -translate-y-1.5 pointer-events-none invisible'
            }`}
          >
            <div
              data-testid="resume-game-prompt"
              className="border border-amber-400/80 bg-[#07080d]/95 backdrop-blur-md p-4 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-400 text-black font-mono-code text-[10px] font-bold uppercase tracking-wider shrink-0">
                    ESTADO SALVO NO NAVEGADOR // LOCALSTORAGE
                  </span>
                  <span className="text-xs font-mono-code text-amber-300 font-bold uppercase shrink-0">
                    {resumableGameTitle}
                  </span>
                  <span className="px-2 py-0.5 bg-[#17B8B8]/15 text-[11px] font-mono-code text-[#17B8B8] font-semibold shrink-0">
                    {resumableRoundText}
                  </span>
                </div>

                <div className="font-anton text-lg md:text-xl text-white uppercase tracking-wide">
                  Deseja retomar a partida interrompida?
                </div>

                <div className="text-xs font-mono-code text-slate-300 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Placar:{' '}
                      <strong className="text-rose-400">
                        {resumableRoom.teams.A.name} ({resumableScores.scoreA} PTS)
                      </strong>{' '}
                      x{' '}
                      <strong className="text-cyan-300">
                        {resumableRoom.teams.B.name} ({resumableScores.scoreB} PTS)
                      </strong>
                    </span>
                  </div>
                  <div className="text-amber-200/90 truncate max-w-xl">
                    Tema: "{resumableRoom.theme}"
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 w-full md:w-auto md:self-center shrink-0">
                <button
                  type="button"
                  data-testid="resume-game-button"
                  onClick={() => {
                    sounds.playPowerup();
                    setIsResumeHoverOpen(false);
                    onResumeGame();
                  }}
                  className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-anton text-sm md:text-base uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw size={16} className="shrink-0" />
                  <span>RESUME GAME // RETOMAR PARTIDA</span>
                </button>
                {onDismissResume && (
                  <button
                    type="button"
                    data-testid="dismiss-resume-button"
                    onClick={() => {
                      sounds.playFlip();
                      setIsResumeHoverOpen(false);
                      onDismissResume();
                    }}
                    title="Descartar estado salvo"
                    className="w-full sm:w-auto justify-center px-3 py-2.5 border border-white/15 bg-white/[0.03] hover:border-[#E6194B] hover:text-rose-300 text-slate-300 font-mono-code text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <X size={14} className="shrink-0" />
                    <span>Descartar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area — Strictly Zero Vertical Scroll on Desktop/TV */}
      <div className="relative z-10 flex-1 min-h-0 flex overflow-hidden">
        <div
          ref={contentScrollRef}
          className={`relative flex-1 min-h-0 overflow-hidden flex flex-col justify-between ${
            isTvMode ? 'p-2 md:p-3' : 'p-2.5 md:p-4'
          }`}
        >
          {children}
        </div>
      </div>

      {/* GLOBAL UTILITY DOCK MODAL (z-[999], backdrop click, ESC, 44x44px X button) */}
      {activeDockModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="dock-modal-backdrop"
            onClick={() => setActiveDockModal(null)}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              data-testid={`dock-modal-${activeDockModal}`}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto bg-[#07080d] border border-[#17B8B8]/60 p-3 sm:p-6 relative shadow-2xl space-y-3 sm:space-y-4 text-[#F5F2EB] transition-all duration-200 ${
                activeDockModal === 'config' || activeDockModal === 'ranking' || activeDockModal === 'players' || activeDockModal === 'history'
                  ? 'max-w-4xl xl:max-w-5xl'
                  : 'max-w-xl'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveDockModal('qr')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'qr'
                        ? 'bg-[#17B8B8] text-black font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    📱 QR Code (Celular)
                  </button>
                  <button
                    type="button"
                    data-testid="dock-tab-players-btn"
                    onClick={() => setActiveDockModal('players')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'players'
                        ? 'bg-[#E6194B] text-white font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    👥 Jogadores ({room?.players.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDockModal('history')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'history'
                        ? 'bg-[#17B8B8] text-black font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    📜 Histórico
                  </button>
                  <button
                    type="button"
                    data-testid="dock-tab-ranking-btn"
                    onClick={() => setActiveDockModal('ranking')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'ranking'
                        ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : 'bg-white/[0.04] text-amber-300 hover:text-white'
                    }`}
                  >
                    🏆 Ranking
                  </button>
                  <button
                    type="button"
                    data-testid="dock-tab-config-btn"
                    onClick={() => setActiveDockModal('config')}
                    className={`px-3 py-1.5 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors ${
                      activeDockModal === 'config'
                        ? 'bg-[#17B8B8] text-black font-bold'
                        : 'bg-white/[0.04] text-slate-300 hover:text-white'
                    }`}
                  >
                    ⚙️ Configuração
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="dock-modal-close-btn"
                  aria-label="Fechar modal"
                  onClick={() => setActiveDockModal(null)}
                  className="w-9 h-9 bg-[#E6194B] hover:bg-rose-500 active:bg-rose-700 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm hover:scale-105 active:scale-95"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {activeDockModal === 'qr' && (
                <div className="space-y-4 text-center py-2">
                  <div className="flex justify-center">
                    <DynamicQRCode url={playUrl} size={210} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300">
                      Aponte a câmera do smartphone para entrar na{' '}
                      <strong className="text-[#17B8B8]">SALA {room?.roomId || 'RODA'}</strong> (Modo
                      Controle Mestre ou Controle Individual):
                    </p>
                    <p className="font-mono-code text-xs text-[#17B8B8] font-bold break-all bg-white/[0.03] p-2.5 border border-white/10 select-all">
                      {playUrl}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyPlayUrl}
                      className="w-full py-2.5 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedUrl ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedUrl ? 'LINK COPIADO!' : 'COPIAR LINK DA SALA'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeDockModal === 'players' && (
                <PlayersManagerModal
                  room={room}
                  onAddPlayer={onAddPlayer}
                  onRemovePlayer={onRemovePlayer}
                  onOpenQrCode={() => setActiveDockModal('qr')}
                />
              )}

              {activeDockModal === 'history' && room && (
                <GlobalStats
                  stats={room.sessionStats}
                  teamAName={room.teams.A.name}
                  teamBName={room.teams.B.name}
                  players={room.players}
                  onResetStats={onResetStats}
                  defaultExpanded={true}
                />
              )}

              {activeDockModal === 'ranking' && (
                <LeaderboardRanking
                  stats={room?.sessionStats}
                  players={room?.players || []}
                />
              )}

              {activeDockModal === 'config' && (
                <div className="space-y-4">
                  {/* Seção 1: Seletor de Modo Visual (4 Temas em Grid Horizontal que verticaliza conforme a tela diminui) */}
                  <div className="bg-white/[0.03] border border-white/10 p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-950/70 border border-cyan-400/50 text-[#17B8B8]">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <h3 className="font-anton text-sm sm:text-base uppercase tracking-wider text-white leading-none">
                            VISUAL DO SISTEMA
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono-code mt-0.5">
                            Escolha a skin dessa bagaça
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                          visualTheme === 'original'
                            ? 'bg-[#E6194B] text-white shadow-[0_0_12px_rgba(230,25,75,0.5)] border border-rose-300/40'
                            : visualTheme === 'cazetv'
                            ? 'bg-[#E6194B] text-white shadow-[0_0_12px_rgba(230,25,75,0.5)]'
                            : visualTheme === 'neon'
                            ? 'bg-[#17B8B8] text-black shadow-neon-cyan'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {visualTheme === 'original'
                          ? '🔴 CAZETV ATIVO'
                          : visualTheme === 'cazetv'
                          ? '📺 BROAD ATIVO'
                          : visualTheme === 'neon'
                          ? '⚡ NEON ATIVO'
                          : '✨ CLEAN ATIVO'}
                      </span>
                    </div>

                    {/* 4 Cards de Tema: Horizontal no Desktop (4 cols), 2 cols em tablet, 1 col no mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {/* CARD 1: NEON */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-neon-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('neon');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'neon'
                            ? 'border-[#17B8B8] bg-[#17B8B8]/15 shadow-neon-cyan ring-2 ring-[#17B8B8]'
                            : 'border-white/10 bg-black/40 hover:border-[#17B8B8]/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
                            <span>⚡ NEON</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-black/80 px-1.5 py-0.5 text-[#17B8B8] border border-cyan-500/40 font-bold">
                            PADRÃO
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#17B8B8] shadow-neon-cyan" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E6194B] shadow-neon-rose" />
                          </div>
                          {visualTheme === 'neon' ? (
                            <span className="font-bold text-cyan-300 flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>

                      {/* CARD 2: CLEAN */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-clean-btn"
                        onClick={() => {
                          sounds.playTick();
                          onSetVisualTheme?.('clean');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'clean'
                            ? 'border-white bg-white/10 ring-2 ring-white/60 shadow-lg'
                            : 'border-white/10 bg-black/40 hover:border-white/40 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-white flex items-center gap-1.5">
                            <span>✨ CLEAN</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-white/10 px-1.5 py-0.5 text-slate-200 border border-white/20 font-bold">
                            MINIMAL
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                          </div>
                          {visualTheme === 'clean' ? (
                            <span className="font-bold text-white flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>

                      {/* CARD 3: BROAD */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-cazetv-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('cazetv');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'cazetv'
                            ? 'border-[#E6194B] bg-[#E6194B]/20 shadow-[0_0_20px_rgba(230,25,75,0.4)] ring-2 ring-[#E6194B]'
                            : 'border-white/10 bg-black/40 hover:border-[#E6194B]/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-rose-300 flex items-center gap-1.5">
                            <span>📺 BROAD</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-[#E6194B] text-white px-1.5 py-0.5 font-bold">
                            BROADCAST
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E6194B]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#080b16] border border-white/40" />
                          </div>
                          {visualTheme === 'cazetv' ? (
                            <span className="font-bold text-rose-300 flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>

                      {/* CARD 4: CAZETV */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-original-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('original');
                        }}
                        className={`p-3 border-2 text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'original'
                            ? 'border-[#E6194B] bg-[#0a0b1e] ring-2 ring-[#17B8B8] shadow-[0_0_20px_rgba(23,184,184,0.35)]'
                            : 'border-[#E6194B]/50 bg-[#0a0b1e]/70 hover:border-[#E6194B] hover:bg-[#0a0b1e]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-[#F5F2EB] flex items-center gap-1.5">
                            <span>🔴 CAZETV</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-[#17B8B8] text-black px-1.5 py-0.5 font-bold">
                            OFICIAL
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E6194B] border border-white" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#17B8B8]" />
                          </div>
                          {visualTheme === 'original' ? (
                            <span className="font-bold text-[#17B8B8] flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Seção 2: Linha Horizontal de Áudio e Memória de IA (Grid 2 Colunas no Desktop) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Painel de Áudio */}
                    <div className="bg-white/[0.03] border border-white/10 p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="font-anton text-sm uppercase text-white flex items-center gap-1.5">
                            {muted ? (
                              <VolumeX size={16} className="text-rose-400" />
                            ) : (
                              <Volume2 size={16} className="text-[#17B8B8]" />
                            )}
                            <span>EFEITOS SONOROS DE AUDITÓRIO</span>
                          </div>
                          <span
                            className={`text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 ${
                              muted
                                ? 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                                : 'bg-cyan-950/80 border border-cyan-400/50 text-cyan-300'
                            }`}
                          >
                            {muted ? 'MUDO' : 'ATIVO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono-code mt-1">
                          Alterna os sons retrô de TV, sirenes, buzinas de erro, roleta e alertas sonoros do cronômetro.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className={`flex-1 py-2 px-3 font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            muted
                              ? 'bg-[#E6194B] hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(230,25,75,0.4)]'
                              : 'bg-[#17B8B8] hover:bg-cyan-300 text-black shadow-neon-cyan'
                          }`}
                        >
                          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          <span>{muted ? 'ATIVAR ÁUDIO' : 'MUTAR ÁUDIO'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => sounds.playPowerup()}
                          className="px-3 py-2 bg-white/[0.06] hover:bg-white/15 border border-white/10 text-slate-200 font-anton text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                          title="Tocar som de teste"
                        >
                          <span>TESTAR</span>
                        </button>
                      </div>
                    </div>

                    {/* Painel de Memória IA */}
                    <div className="bg-white/[0.03] border border-white/10 p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="font-anton text-sm uppercase text-[#17B8B8] flex items-center gap-1.5">
                            <RotateCcw size={15} className="text-[#17B8B8]" />
                            <span>MEMÓRIA ANTI-REPETIÇÃO (IA)</span>
                          </div>
                          <span className="text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 bg-black/60 border border-white/10 text-slate-300">
                            GEMINI 2.5
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono-code mt-1">
                          Histórico local de perguntas e cartas já geradas na sessão para garantir rodadas 100% inéditas.
                        </p>
                      </div>

                      <div className="pt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            clearUsedRoundSignatures();
                            sounds.playSuccess();
                            setClearedMemoryNotice(true);
                            window.setTimeout(() => setClearedMemoryNotice(false), 2500);
                          }}
                          className={`w-full py-2 px-3 font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            clearedMemoryNotice
                              ? 'bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                              : 'bg-white/[0.06] hover:bg-[#17B8B8] text-white hover:text-black border border-white/15'
                          }`}
                        >
                          <RotateCcw size={14} className={clearedMemoryNotice ? 'animate-spin' : ''} />
                          <span>
                            {clearedMemoryNotice
                              ? '✓ MEMÓRIA REINICIADA COM SUCESSO!'
                              : 'REINICIAR MEMÓRIA DE PERGUNTAS'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* CONFIRMATION MODAL WHEN EXITING AN ACTIVE RUNNING GAME */}
      {isExitConfirmOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="confirm-exit-game-backdrop"
            onClick={() => setIsExitConfirmOpen(false)}
            className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              data-testid="confirm-exit-game-modal"
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-[#07080d] border-2 border-[#E6194B] p-6 shadow-[0_0_40px_rgba(230,25,75,0.4)] space-y-5 text-[#F5F2EB]"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 bg-[#E6194B]/20 border border-[#E6194B]/60 text-rose-300 font-mono-code text-[10px] font-bold uppercase tracking-widest">
                    PARTIDA EM ANDAMENTO
                  </span>
                  <h2 className="font-anton text-2xl text-white uppercase tracking-wide">
                    DESEJA SAIR DESTA TELA?
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExitConfirmOpen(false)}
                  aria-label="Cancelar saída"
                  className="w-8 h-8 flex items-center justify-center border border-white/15 bg-white/[0.04] hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm font-mono-code text-slate-300 leading-relaxed">
                Tem certeza que deseja sair da partida em andamento e voltar ao menu principal?
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  data-testid="cancel-exit-game-btn"
                  onClick={() => {
                    sounds.playTick();
                    setIsExitConfirmOpen(false);
                  }}
                  className="py-2.5 px-4 border border-[#17B8B8] bg-[#17B8B8]/15 hover:bg-[#17B8B8] text-[#17B8B8] hover:text-black font-anton text-sm uppercase tracking-wider transition-colors cursor-pointer"
                >
                  NÃO, FICAR
                </button>
                <button
                  type="button"
                  data-testid="confirm-exit-game-btn"
                  onClick={handleConfirmExit}
                  className="py-2.5 px-4 border border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider transition-colors cursor-pointer"
                >
                  SIM, SAIR
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export const WindowWrapper = React.memo(WindowWrapperComponent);


