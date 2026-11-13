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
import { GameRoom, GameId, VisualTheme, TeamId, GameCustomConfig } from '../types/game';
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
import { WindowWrapperView } from './window/WindowWrapperView';

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
  repetente: 'REPETENTE',
  'respostas-sem-perguntas': 'RESPOSTAS SEM PERGUNTAS',
  estadios: 'ESTÁDIOS',
  'como-eu-pinto': 'COMO EU PINTO',
  'onde-estou': 'ONDE ESTOU',
  'com-terra': 'COM TERRA',
  adedanha: 'ADEDANHA'
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
  contentSource?: NonNullable<GameCustomConfig['contentSource']>;
  onSetContentSource?: (source: NonNullable<GameCustomConfig['contentSource']>) => void;
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
  contentSource = 'auto',
  onSetContentSource,
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

  return <WindowWrapperView windowContainerRef={windowContainerRef} varActiveFlash={varActiveFlash} visualTheme={visualTheme} className={className} showBackButton={showBackButton} onBack={onBack} handleRequestBack={handleRequestBack} room={room} title={title} onOpenJoinRoomModal={onOpenJoinRoomModal} setActiveDockModal={setActiveDockModal} activeDockModal={activeDockModal} onUndoVar={onUndoVar} canUndoVar={canUndoVar} resumableRoom={resumableRoom} onResumeGame={onResumeGame} openResumeOverlay={openResumeOverlay} scheduleCloseResumeOverlay={scheduleCloseResumeOverlay} isResumeHoverOpen={isResumeHoverOpen} handleToggleMute={handleToggleMute} muted={muted} onSetVisualTheme={onSetVisualTheme} contentSource={contentSource} onSetContentSource={onSetContentSource} onToggleTvMode={onToggleTvMode} isTvMode={isTvMode} onSwitchToControllerMode={onSwitchToControllerMode} canCloseScreen={canCloseScreen} handleRequestClose={handleRequestClose} resumableGameTitle={resumableGameTitle} resumableRoundText={resumableRoundText} resumableScores={resumableScores} setIsResumeHoverOpen={setIsResumeHoverOpen} onDismissResume={onDismissResume} contentScrollRef={contentScrollRef} children={children} playUrl={playUrl} handleCopyPlayUrl={handleCopyPlayUrl} copiedUrl={copiedUrl} onAddPlayer={onAddPlayer} onRemovePlayer={onRemovePlayer} onResetStats={onResetStats} setClearedMemoryNotice={setClearedMemoryNotice} clearedMemoryNotice={clearedMemoryNotice} isExitConfirmOpen={isExitConfirmOpen} setIsExitConfirmOpen={setIsExitConfirmOpen} handleConfirmExit={handleConfirmExit} />;
};

export const WindowWrapper = React.memo(WindowWrapperComponent);


