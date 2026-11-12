import { isVisualTheme } from './utils/themeUtils';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameRoom } from './utils/roomManager';
import {
  GameId,
  GameRoom,
  GameCustomConfig,
  DEFAULT_GAME_CUSTOM_CONFIG,
  LimiteGameState,
  DuvidoGameState,
  ProibidoGameState,
  MimicaGameState,
  QuemSouEuGameState,
  MegaResenhaGameState,
  RepetenteGameState,
  RespostasSemPerguntasState,
  EstadiosGameState,
  ComoEuPintoState,
  NotaGameState,
  TemOuNaoTemGameState,
  PerguntasEVerdadesGameState,
  GameHistoryEntry,
  VisualTheme,
  ConnectionMode,
  TeamId,
  Player
} from './types/game';
import {
  TEAM_META,
  getActiveTeamIds,
  getTeamCount,
  getNextTeamId,
  syncTeamsRecordFromPlayers,
  normalizePlayersToTeamCount
} from './utils/teamUtils';
import { generateRoundContent, normalizeTemVotesTo100, prefetchRoundsForTheme } from './utils/aiGameGenerator';
import { dealValidRandomHand } from './utils/perguntasEVerdadesEngine';
import { usesLocalContent } from './config/localGames';
import { buildMimicaState, pickMimicaPair } from './utils/mimicaEngine';
import { buildQuemSouEuState, drawIdentities } from './utils/quemSouEuEngine';
import { drawMoments, normalizeMomentKey } from './data/ondeEstouMoments';
import { buildMegaResenhaState } from './utils/megaResenhaEngine';
import { buildRepetenteGroups, buildRepetenteState } from './utils/repetenteEngine';
import { buildRespostasState } from './utils/respostasEngine';
import { buildEstadiosState } from './utils/estadiosEngine';
import { buildComoEuPintoState, pickPintoPair, pintoRoundPoints } from './utils/comoEuPintoEngine';
import { drawEstadio, normalizeEstadioKey } from './data/estadiosBank';
import { drawRespostaQuestion, normalizeRespostaKey } from './data/respostasSemPerguntas';
import { drawRepetenteTheme, normalizeThemeKey } from './data/repetenteThemes';
import { normalizeIdentity } from './data/quemSouEuIdentities';
import { sounds } from './utils/soundEffects';
import { WindowWrapper } from './components/WindowWrapper';
import { ScreenModeSelect } from './components/host/ScreenModeSelect';
import { ScreenLobby } from './components/host/ScreenLobby';
import { ScreenGameSetup } from './components/host/ScreenGameSetup';
import { ScreenRules } from './components/host/ScreenRules';
import { ScreenJoinRoom } from './components/ScreenJoinRoom';
import {
  parseRoomQueryParams,
  createUniqueRoomSession,
  balancePlayersIntoTeams,
  fetchAndCacheLanOrigin,
  generateUnique6CharRoomCode
} from './utils/multiplayerRoomEngine';
import { drawLimitePowerCardsForPlayers } from './components/host/ScreenLimite';
import {
  ScreenLimite,
  ScreenDuvido,
  ScreenComoEuPinto,
  ScreenEstadios,
  ScreenRespostasSemPerguntas,
  ScreenRepetente,
  ScreenMegaResenha,
  ScreenQuemSouEu,
  ScreenMimica,
  ScreenProibido,
  ScreenNota,
  ScreenTemOuNaoTem,
  ScreenPerguntasEVerdades,
  SHOW_DEV_TOOLS,
  DevControlsDrawer,
  ComparePlayersModal
} from './app/lazyScreens';
import { GAME_NAMES } from './app/gameNames';
import { drawRandomScoreCSPRNG } from './components/SpinningNumberWheel';
import { ControllerView } from './components/controller/ControllerView';
import { GlobalStats } from './components/GlobalStats';
import { PartyAchievements } from './components/PartyAchievements';
import { FixedPlayersHallOfFame } from './components/FixedPlayersHallOfFame';
import { computePartyAchievements } from './utils/achievements';
import { updateFixedPlayersAfterMatch } from './utils/fixedPlayers';
import {
  accumulateRoundPlayerScores,
  computeSessionMVP,
  computeMatchMVP,
  computeMatchPlayerComparison,
  shareMatchResults,
  buildMatchMVPSnapshot,
  buildTeamCollectiveMVPSnapshot,
  buildRoundActivityEvent,
  getMatchRoundActivityLog
} from './utils/sessionPersistence';
import { limiteExactBonusFor, isDuvidoShowWon } from './config/rulesets';
import { getOrCreateDeviceClientId } from './utils/partyNetworkEngine';
import { applyPVMatchResult } from './utils/perguntasEVerdadesEngine';
import {
  Tv,
  Smartphone,
  Trophy,
  Home,
  Wifi,
  WifiOff,
  RefreshCw,
  Crown,
  Award,
  Share2,
  Check,
  Target,
  Layers,
  TrendingUp,
  CheckCircle2,
  Activity,
  Swords,
  Star,
  History,
  Medal,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameOverScreen } from './app/GameOverScreen';
import { PlayingScreen } from './app/PlayingScreen';
import { buildNextRoundUpdater } from './app/buildNextRoundUpdater';
import { buildStartedRoundUpdater } from './app/buildStartedRoundUpdater';


export default function App() {
  const parsedQuery = parseRoomQueryParams(window.location.search);
  const urlParams = new URLSearchParams(window.location.search);
  const [roomIdParam] = useState<string>(() => {
    const explicitFromUrl = parsedQuery.joinCode || parsedQuery.roomCode;
    if (explicitFromUrl) {
      return explicitFromUrl.toUpperCase();
    }
    try {
      const savedHostCode = localStorage.getItem('rb_active_host_room_code');
      if (savedHostCode && savedHostCode.trim().length >= 4) {
        return savedHostCode.trim().toUpperCase();
      }
      const generated = generateUnique6CharRoomCode();
      localStorage.setItem('rb_active_host_room_code', generated);
      return generated;
    } catch {
      return 'RODA';
    }
  });

  useEffect(() => {
    fetchAndCacheLanOrigin();
  }, []);

  // DAD-01: bancos extras (1.435 itens) carregados em segundo plano, fora do pacote principal.
  useEffect(() => {
    const t = window.setTimeout(() => {
      import('./data/extraBanks').then((m) => m.loadExtraBanks()).catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(t);
  }, []);

  const isPlayRoute =
    window.location.pathname.startsWith('/play') ||
    Boolean(parsedQuery.joinCode) ||
    urlParams.get('mode') === 'play' ||
    urlParams.get('mode') === 'controller' ||
    parsedQuery.requestedMode === 'multi';
  const [currentUserId] = useState(() => getOrCreateDeviceClientId());

  const [viewMode, setViewMode] = useState<'host' | 'controller'>(isPlayRoute ? 'controller' : 'host');
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState<boolean>(false);
  const [joinCodePreFill, setJoinCodePreFill] = useState<string>(() => parsedQuery.joinCode || '');
  const [isTvMode, setIsTvMode] = useState(true);
  // UX-11: no modo TV (tela grande) a fonte base sobe para ler a ~3 m; ver `html.rb-tv` em index.css.
  useEffect(() => {
    document.documentElement.classList.toggle('rb-tv', isTvMode && viewMode === 'host');
    return () => document.documentElement.classList.remove('rb-tv');
  }, [isTvMode, viewMode]);
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    // A identidade do programa (tema 'original') e o padrao. Quem tinha um tema salvo de antes do redesenho
    // passa uma vez para o novo padrao; depois disso a escolha feita no menu e respeitada.
    const IDENTITY_KEY = 'rb_identity_v2';
    if (!localStorage.getItem(IDENTITY_KEY)) {
      localStorage.setItem(IDENTITY_KEY, '1');
      localStorage.setItem('rb_visual_theme', 'original');
      return 'original';
    }
    const saved = localStorage.getItem('rb_visual_theme') || localStorage.getItem('roda-de-bobo-visual-theme');
    if (isVisualTheme(saved)) return saved as VisualTheme;
    return 'original';
  });

  const handleSetVisualTheme = (theme: VisualTheme) => {
    setVisualTheme(theme);
    localStorage.setItem('rb_visual_theme', theme);
    localStorage.setItem('roda-de-bobo-visual-theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.remove('theme-neon', 'theme-clean', 'theme-cazetv', 'theme-original');
      document.documentElement.classList.add(`theme-${theme}`);
      if (theme === 'original') document.documentElement.classList.add('theme-cazetv');
    }
    broadcastState((prev) => ({
      ...prev,
      visualTheme: theme
    }));
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', visualTheme);
      document.documentElement.classList.remove('theme-neon', 'theme-clean', 'theme-cazetv', 'theme-original');
      document.documentElement.classList.add(`theme-${visualTheme}`);
      if (visualTheme === 'original') document.documentElement.classList.add('theme-cazetv');
    }
  }, [visualTheme]);
  const [isLoadingRound, setIsLoadingRound] = useState(false);
  const roundLoadRequestIdRef = useRef(0);
  const [shareFeedback, setShareFeedback] = useState<{ status: 'idle' | 'shared'; text?: string }>({
    status: 'idle'
  });
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [activeGameOverPanel, setActiveGameOverPanel] = useState<
    'achievements' | 'hall-of-fame' | 'activity-log' | 'history' | null
  >(null);

  // VAR (Desfazer 1 nível) & Sudden Death Tiebreaker state
  const varSnapshotRef = useRef<GameRoom | null>(null);
  const [hasVarSnapshot, setHasVarSnapshot] = useState(false);
  const [varActiveFlash, setVarActiveFlash] = useState(false);
  const [suddenDeathBanner, setSuddenDeathBanner] = useState<string | null>(null);

  // Synchronized Room Hook with Real-time Presence, Connection Status & localStorage Resume
  const {
    room,
    resumableRoom,
    resumeSavedGame,
    dismissSavedGame,
    connectionStatus,
    presenceCount,
    reconnectRoom,
    broadcastState: rawBroadcastState,
    updateScreen,
    selectGame,
    registerPlayer,
    addLobbyPlayer,
    removePlayer,
    switchPlayerTeam,
    setRoomTeamCount,
    updatePlayerAvatar,
    pingPlayerDevice,
    buzzReadyOnTv,
    regenerateRoomCode,
    cloudStatus,
    forceSync
  } = useGameRoom(roomIdParam, currentUserId, viewMode === 'host');

  // UX-02: rede de segurança. Uma tela de jogo sem jogo ativo (estado salvo/sincronizado incompleto)
  // renderizaria em branco; nesse caso volta ao lobby, onde "Retomar partida" fica disponível.
  useEffect(() => {
    if (viewMode !== 'host') return;
    if ((room.screen === 'rules' || room.screen === 'playing' || room.screen === 'game-over') && !room.activeGame) {
      updateScreen('lobby');
    }
  }, [viewMode, room.screen, room.activeGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wrap broadcastState to automatically capture 1-level VAR snapshot during active gameplay
  const broadcastState = (updater: GameRoom | ((prev: GameRoom) => GameRoom)) => {
    rawBroadcastState((prev) => {
      if (prev.screen === 'playing') {
        try {
          varSnapshotRef.current = JSON.parse(JSON.stringify(prev)) as GameRoom;
          setHasVarSnapshot(true);
        } catch {
          // Ignore snapshot clone errors
        }
      }
      return typeof updater === 'function' ? updater(prev) : updater;
    });
  };

  const handleUndoVar = () => {
    if (!varSnapshotRef.current) return;
    const restored = varSnapshotRef.current;
    varSnapshotRef.current = null;
    setHasVarSnapshot(false);
    sounds.playPowerup();
    setVarActiveFlash(true);
    window.setTimeout(() => setVarActiveFlash(false), 1800);
    rawBroadcastState(() => restored);
  };

  // Screen Wake Lock API so TV and mobile controllers never dim during a match
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Ignore Wake Lock permission restrictions in headless/iframe environments
      }
    };
    if (room.screen === 'playing') {
      requestWakeLock();
    }
    return () => {
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [room.screen]);

  // Global Keyboard Shortcuts for Couch / TV Presenter (1-9, X in Tem ou Não Tem)
  useEffect(() => {
    if (viewMode !== 'host' || room.screen !== 'playing') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }

      if (room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem) {
        if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key, 10) - 1;
          if (idx >= 0 && idx < room.temOuNaoTem.items.length) {
            const slotEl = document.querySelector(`[data-testid="tem-slot-${idx + 1}"]`) as HTMLElement | null;
            slotEl?.click();
          }
        } else if (e.key.toLowerCase() === 'x') {
          const strikeBtn = document.querySelector('[data-testid="tem-strike-btn"]') as HTMLElement | null;
          strikeBtn?.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, room.screen, room.activeGame, room.temOuNaoTem?.items?.length]);

  // Trigger celebratory Fanfare sequence and multi-burst confetti when Game Over screen is reached
  useEffect(() => {
    if (room.screen === 'game-over') {
      sounds.playFanfare();
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      const secondBurst = window.setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 65, origin: { x: 0.15, y: 0.6 } });
        confetti({ particleCount: 70, angle: 120, spread: 65, origin: { x: 0.85, y: 0.6 } });
      }, 450);
      return () => clearTimeout(secondBurst);
    } else {
      setShareFeedback({ status: 'idle' });
      setIsCompareModalOpen(false);
      setActiveGameOverPanel(null);
    }
  }, [room.screen]);

  // Escape key closes active Game Over detail modal
  useEffect(() => {
    if (!activeGameOverPanel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveGameOverPanel(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeGameOverPanel]);

  // Load new round for active game using AI generator
  const prepareAndStartRound = async (
    gameId: GameId,
    customTheme: string,
    customTimer?: number,
    customMaxRounds?: number,
    customConfigOverride?: GameCustomConfig,
    excludeSignaturesOverride?: string[]
  ) => {
    // Guard: Do not allow starting a round if fewer than 2 players are added
    if (room.players.length < 2) {
      sounds.playBuzzer();
      return;
    }

    const requestId = ++roundLoadRequestIdRef.current;
    setIsLoadingRound(true);
    sounds.playPowerup();

    try {
      const effectiveTheme = (customTheme || room.theme || 'Geral').trim();
      const effectiveDifficulty = (
        customConfigOverride?.difficulty ||
        room.difficulty ||
        room.customConfig?.difficulty ||
        'dificil'
      ).trim().toLowerCase();
      const effectiveConfig: GameCustomConfig = {
        ...DEFAULT_GAME_CUSTOM_CONFIG,
        ...(room.customConfig || {}),
        difficulty: effectiveDifficulty as any,
        ...(customConfigOverride || {})
      };

      const generated = await generateRoundContent(
        gameId,
        effectiveTheme,
        effectiveConfig,
        excludeSignaturesOverride ?? room.usedRoundSignatures ?? [],
        effectiveDifficulty
      );
      if (requestId !== roundLoadRequestIdRef.current) {
        return;
      }
      const data = generated.data as any;

      broadcastState(buildStartedRoundUpdater({ customTimer, customMaxRounds, customConfigOverride, gameId, data, currentUserId, effectiveTheme, generated, customTheme }));
      // Background prefetch for the NEXT round so transition is zero-delay!
      if (!usesLocalContent(gameId)) {
        window.setTimeout(() => {
          prefetchRoundsForTheme(gameId, effectiveTheme, effectiveConfig);
        }, 400);
      }
    } catch (err) {
      console.error('Error starting round:', err);
    } finally {
      if (requestId === roundLoadRequestIdRef.current) {
        setIsLoadingRound(false);
      }
    }
  };

  const handleNextRound = () => {
    sounds.playPowerup();
    let shouldStartNextRound = false;
    let nextMaxRoundsTarget = room.maxRounds;
    // REG-01: no Duvido do programa a partida acaba quando uma equipe chega a 5 temas (decidido aqui, fora do
    // updater, para também impedir o disparo da próxima rodada logo abaixo).
    const duvidoEndsEarly =
      room.activeGame === 'duvido' &&
      isDuvidoShowWon(
        room.customConfig,
        Math.max(
          0,
          ...getActiveTeamIds(room).map(
            (t) => (room.teams[t]?.score || 0) + (room.duvido?.resultWinnerTeam === t ? 1 : 0)
          )
        )
      );

    broadcastState(buildNextRoundUpdater({ shouldStartNextRound, nextMaxRoundsTarget, setSuddenDeathBanner, duvidoEndsEarly }));

    if (room.activeGame && !duvidoEndsEarly && (room.roundNumber < room.maxRounds || shouldStartNextRound)) {
      prepareAndStartRound(
        room.activeGame,
        room.theme,
        room.timerConfig,
        nextMaxRoundsTarget,
        room.customConfig,
        room.usedRoundSignatures || []
      );
    }
  };

  const handleReturnToLobby = () => {
    roundLoadRequestIdRef.current += 1;
    setIsLoadingRound(false);
    sounds.playFlip();
    setActiveGameOverPanel(null);
    broadcastState((prev) => ({
      ...prev,
      screen: 'lobby',
      activeGame: null,
      roundNumber: 1,
      roundLog: [],
      players: prev.players.map((p) => ({
        ...p,
        score: 0,
        roundsPlayed: 0,
        roundsWon: 0,
        accuracy: 0
      })),
      temOuNaoTem: undefined,
      limite: undefined,
      duvido: undefined,
      proibido: undefined,
      nota: undefined,
      perguntasEVerdades: undefined,
      mimica: undefined,
      quemSouEu: undefined,
      megaResenha: undefined,
      repetente: undefined,
      respostasSemPerguntas: undefined,
      estadios: undefined,
      comoEuPinto: undefined,
      roundSource: undefined,
      teams: {
        A: { ...prev.teams.A, score: 0 },
        B: { ...prev.teams.B, score: 0 }
      }
    }));
  };

  const handleResetSessionStats = () => {
    sounds.playSuccess();
    broadcastState((prev) => ({
      ...prev,
      sessionStats: {
        totalMatches: 0,
        victoriesA: 0,
        victoriesB: 0,
        totalPointsA: 0,
        totalPointsB: 0,
        history: []
      }
    }));
  };

  const renderConnectionBadge = () => {
    const isConnected = connectionStatus === 'Connected';
    const isReconnecting = connectionStatus === 'Reconnecting';

    return (
      <button
        type="button"
        onClick={() => {
          if (!isConnected) reconnectRoom();
        }}
        title={`Room Connection: ${connectionStatus} (${presenceCount} online)`}
        aria-label={`Room Connection Status: ${connectionStatus}`}
        className={`px-2.5 py-1 border font-mono-code text-[11px] font-bold flex items-center gap-1.5 transition-all ${
          isConnected
            ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
            : isReconnecting
            ? 'border-amber-400/70 bg-amber-950/60 text-amber-300 cursor-pointer'
            : 'border-rose-500/70 bg-rose-950/60 text-rose-300 cursor-pointer'
        }`}
      >
        {isConnected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Wifi size={12} className="text-emerald-400" />
            <span>Connected</span>
            <span className="text-[10px] text-emerald-400/80 border-l border-emerald-500/40 pl-1.5">
              {presenceCount} ON
            </span>
          </>
        ) : isReconnecting ? (
          <>
            <RefreshCw size={12} className="text-amber-400 animate-spin" />
            <span>Reconnecting</span>
          </>
        ) : (
          <>
            <WifiOff size={12} className="text-rose-400" />
            <span>Offline</span>
          </>
        )}
      </button>
    );
  };

  const renderJoinRoomModal = () => (
    <ScreenJoinRoom
      isOpen={isJoinRoomOpen}
      initialRoomCode={joinCodePreFill || (room.roomId !== 'RODA' && room.roomId !== 'BOBO' ? room.roomId : '')}
      room={room}
      connectionStatus={connectionStatus}
      onClose={() => setIsJoinRoomOpen(false)}
      onJoinSuccess={({ roomCode, playerName, avatar, fixedPlayerId }) => {
        registerPlayer(
          playerName,
          avatar,
          undefined,
          Boolean(fixedPlayerId),
          fixedPlayerId,
          undefined,
          'player',
          roomCode
        );
        setIsJoinRoomOpen(false);
        setViewMode('controller');
      }}
    />
  );

  // If in pure mobile controller mode
  if (viewMode === 'controller') {
    return (
      <div className="min-h-screen bg-[#07080d] text-white pb-20">
        <div className="bg-[#090b14] border-b border-rose-500/40 p-2 flex flex-wrap items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono-code text-cyan-300 font-bold uppercase truncate">
              📱 CONTROLE MOBILE (SALA: {room.roomId})
            </span>
            {renderConnectionBadge()}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setViewMode('host')}
              className="px-2 py-0.5 border border-cyan-400 bg-cyan-950 text-cyan-200 font-mono-code flex items-center gap-1 cursor-pointer"
            >
              <Tv size={12} />
              Ver Tela da TV
            </button>
          </div>
        </div>

        <ControllerView
          room={room}
          currentPlayerId={currentUserId}
          connectionStatus={connectionStatus}
          onRegisterPlayer={registerPlayer}
          onUpdateRoom={broadcastState}
          onSwitchToHostMode={() => setViewMode('host')}
          onBuzzReady={buzzReadyOnTv}
          onStartMatchFromController={(gId, th) => {
            prepareAndStartRound(gId, th, room.timerConfig, room.maxRounds, room.customConfig);
          }}
          onNextRound={handleNextRound}
          onForceSync={forceSync}
        />

        {renderJoinRoomModal()}
      </div>
    );
  }

  const handleSurpriseGame = () => {
    const allGames: GameId[] = [
      'limite',
      'duvido',
      'proibido',
      'nota',
      'tem-ou-nao-tem',
      'perguntas-e-verdades',
      'mimica',
      'quem-sou-eu',
      'mega-resenha',
      'repetente',
      'respostas-sem-perguntas',
      'estadios',
      'como-eu-pinto',
      'onde-estou'
    ];
    const randomChoice = allGames[Math.floor(Math.random() * allGames.length)];
    selectGame(randomChoice);
  };

  // TV Host View inside Retro OS Window
  return (
    <div
      className={`h-[100dvh] w-full max-h-[100dvh] overflow-hidden flex flex-col justify-between select-none p-1 md:p-2 bg-retro-grid text-[#F5F2EB] selection:bg-rose-500 selection:text-white ${
        visualTheme === 'original' ? 'theme-original theme-cazetv' : visualTheme === 'cazetv' ? 'theme-cazetv' : visualTheme === 'neon' ? 'theme-neon' : 'theme-clean'
      }`}
    >
      {/* Main Retro OS Window Frame with Unified h-12 Header Bar */}
      <WindowWrapper
        title={
          room.screen === 'mode-select'
            ? 'RODA DE BOBO — ESCOLHA DO MODO DE JOGO'
            : `RODA DE BOBO — ${room.activeGame ? (GAME_NAMES[room.activeGame] || room.activeGame.toUpperCase()) : 'PARTY OS LOBBY'}`
        }
        badge={`SALA: ${room.roomId}`}
        className="flex-1 min-h-0"
        isTvMode={isTvMode}
        onToggleTvMode={() => setIsTvMode(!isTvMode)}
        onSwitchToControllerMode={() => setViewMode('controller')}
        onSurpriseGame={handleSurpriseGame}
        onClose={handleReturnToLobby}
        showBackButton={(room.screen !== 'lobby' && room.screen !== 'mode-select') || isLoadingRound}
        onBack={() => {
          if (room.screen === 'rules' && !isLoadingRound) {
            updateScreen('game-setup');
          } else if (room.screen === 'game-setup') {
            updateScreen('lobby');
          } else {
            handleReturnToLobby();
          }
        }}
        resumableRoom={room.screen === 'lobby' ? resumableRoom : null}
        onResumeGame={resumeSavedGame}
        onDismissResume={dismissSavedGame}
        canUndoVar={room.screen === 'playing' && hasVarSnapshot}
        onUndoVar={room.screen === 'playing' ? handleUndoVar : undefined}
        varActiveFlash={varActiveFlash}
        room={room}
        onResetStats={handleResetSessionStats}
        visualTheme={visualTheme}
        onSetVisualTheme={handleSetVisualTheme}
        onOpenJoinRoomModal={() => setIsJoinRoomOpen(true)}
        isLoadingRound={isLoadingRound}
        onAddPlayer={addLobbyPlayer}
        onRemovePlayer={removePlayer}
      >
        {suddenDeathBanner && room.screen === 'playing' && (
          <div
            data-testid="sudden-death-banner"
            className="mb-1.5 px-4 py-1 border border-amber-400/60 bg-gradient-to-r from-amber-950/80 via-rose-950/80 to-amber-950/80 text-amber-300 font-anton text-sm uppercase tracking-widest text-center animate-pulse shrink-0"
          >
            {suddenDeathBanner}
          </div>
        )}
        <AnimatePresence initial={false} mode="wait">
          {isLoadingRound ? (
            <motion.div
              key="loading-round"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8"
            >
              <div className="font-anton text-6xl text-[#17B8B8] animate-spin">
                ⚙️
              </div>
              <div className="font-anton text-2xl md:text-4xl text-white uppercase tracking-wider">
                {room.activeGame === 'proibido'
                  ? `GERANDO CARTAS INÉDITAS SOBRE ${(room.theme || 'TEMA').toUpperCase()}...`
                  : 'MOTOR DE IA GERANDO NOVA RODADA...'}
              </div>
              <p className="text-xs font-mono-code text-[#17B8B8]">
                Tema selecionado: {room.theme}
              </p>
            </motion.div>
          ) : room.screen === 'mode-select' ? (
            <motion.div
              key="screen-mode-select"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex-1 min-h-0 overflow-hidden"
            >
              <ScreenModeSelect
                room={room}
                isTvMode={isTvMode}
                onSelectMode={(mode: ConnectionMode) => {
                  if (mode === 'host' || mode === 'multi') {
                    const session = createUniqueRoomSession(mode, room.activeGame, undefined, room.roomId);
                    regenerateRoomCode(session.roomCode, mode, session.sessionKey);
                  } else {
                    broadcastState((prev) => ({
                      ...prev,
                      connectionMode: 'local',
                      customConfig: {
                        ...(prev.customConfig || DEFAULT_GAME_CUSTOM_CONFIG),
                        connectionMode: 'local'
                      }
                    }));
                  }
                }}
                onAddPlayer={addLobbyPlayer}
                onRemovePlayer={removePlayer}
                onSwitchPlayerTeam={switchPlayerTeam}
                onChangeTeamCount={setRoomTeamCount}
                onUpdatePlayerAvatar={updatePlayerAvatar}
                onShuffleTeams={() => {
                  broadcastState((prev) => {
                    const tCount = getTeamCount(prev);
                    const balancedPlayers = balancePlayersIntoTeams(prev.players, tCount);
                    return {
                      ...prev,
                      players: balancedPlayers,
                      teams: syncTeamsRecordFromPlayers(balancedPlayers, prev.teams)
                    };
                  });
                }}
                onSetStartingPlayer={(playerId: string) => {
                  broadcastState((prev) => ({
                    ...prev,
                    startingPlayerId: playerId,
                    customConfig: {
                      ...(prev.customConfig || DEFAULT_GAME_CUSTOM_CONFIG),
                      startingPlayerId: playerId
                    }
                  }));
                }}
                onRegenerateRoomCode={() => {
                  const activeMode = room.connectionMode || 'host';
                  const session = createUniqueRoomSession(activeMode, room.activeGame, undefined, room.roomId);
                  regenerateRoomCode(session.roomCode, activeMode, session.sessionKey);
                }}
                onProceedToLobby={() => {
                  updateScreen('lobby');
                }}
                onSwitchToControllerMode={() => setViewMode('controller')}
                transportStatus={cloudStatus}
                onForceSync={forceSync}
              />
            </motion.div>
          ) : room.screen === 'lobby' ? (
            <motion.div
              key="screen-lobby"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex-1 min-h-0 overflow-hidden"
            >
              <ScreenLobby
                room={room}
                isTvMode={isTvMode}
                resumableRoom={resumableRoom}
                onResumeGame={resumeSavedGame}
                onDismissResume={dismissSavedGame}
                onSelectGame={selectGame}
                onSwitchPlayerTeam={switchPlayerTeam}
                onChangeTeamCount={setRoomTeamCount}
                onAddPlayer={addLobbyPlayer}
                onRemovePlayer={removePlayer}
                onUpdatePlayerAvatar={updatePlayerAvatar}
                onResetStats={handleResetSessionStats}
                onSwitchToControllerMode={() => setViewMode('controller')}
                onPingPlayer={pingPlayerDevice}
                onRegenerateRoomCode={regenerateRoomCode}
                visualTheme={visualTheme}
                onSetVisualTheme={handleSetVisualTheme}
                onOpenJoinRoomModal={() => setIsJoinRoomOpen(true)}
                onGoToModeSelect={() => updateScreen('mode-select')}
              />
            </motion.div>
          ) : room.screen === 'game-setup' ? (
            <motion.div
              key="screen-setup"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex-1 min-h-0"
            >
              <ScreenGameSetup
                room={room}
                isTvMode={isTvMode}
                onBack={() => updateScreen('lobby')}
                onAddPlayer={addLobbyPlayer}
                onRemovePlayer={removePlayer}
                onSwitchPlayerTeam={switchPlayerTeam}
                onChangeTeamCount={setRoomTeamCount}
                onUpdatePlayerAvatar={updatePlayerAvatar}
                onSelectConnectionMode={(mode: ConnectionMode) => {
                  if (mode === 'host' || mode === 'multi') {
                    const session = createUniqueRoomSession(mode, room.activeGame, undefined, room.roomId);
                    regenerateRoomCode(session.roomCode, mode, session.sessionKey);
                  } else {
                    broadcastState((prev) => ({
                      ...prev,
                      connectionMode: 'local',
                      customConfig: {
                        ...(prev.customConfig || DEFAULT_GAME_CUSTOM_CONFIG),
                        connectionMode: 'local'
                      }
                    }));
                  }
                }}
                onShuffleTeams={() => {
                  broadcastState((prev) => {
                    const tCount = getTeamCount(prev);
                    const balancedPlayers = balancePlayersIntoTeams(prev.players, tCount);
                    return {
                      ...prev,
                      players: balancedPlayers,
                      teams: syncTeamsRecordFromPlayers(balancedPlayers, prev.teams)
                    };
                  });
                }}
                onSetStartingPlayer={(playerId: string) => {
                  broadcastState((prev) => ({
                    ...prev,
                    startingPlayerId: playerId,
                    customConfig: {
                      ...(prev.customConfig || DEFAULT_GAME_CUSTOM_CONFIG),
                      startingPlayerId: playerId
                    }
                  }));
                }}
                onRegenerateUniqueRoom={() => {
                  const activeMode = room.connectionMode || 'host';
                  const session = createUniqueRoomSession(activeMode, room.activeGame, undefined, room.roomId);
                  regenerateRoomCode(session.roomCode, activeMode, session.sessionKey);
                }}
                onGoToRules={(cfg) => {
                  broadcastState((prev) => ({
                    ...prev,
                    screen: 'rules',
                    theme: cfg.theme,
                    timerConfig: cfg.timer,
                    maxRounds: cfg.rounds,
                    difficulty: cfg.difficulty,
                    connectionMode: cfg.connectionMode,
                    customConfig: cfg.customConfig
                  }));
                }}
                onStartDirectly={(cfg) => {
                  if (room.activeGame) {
                    broadcastState((prev) => ({
                      ...prev,
                      theme: cfg.theme,
                      timerConfig: cfg.timer,
                      maxRounds: cfg.rounds,
                      difficulty: cfg.difficulty,
                      connectionMode: cfg.connectionMode,
                      customConfig: cfg.customConfig
                    }));
                    if (cfg.connectionMode === 'multi') {
                      setViewMode('controller');
                    }
                    prepareAndStartRound(room.activeGame, cfg.theme, cfg.timer, cfg.rounds, cfg.customConfig);
                  }
                }}
                transportStatus={cloudStatus}
                onForceSync={forceSync}
              />
            </motion.div>
          ) : room.screen === 'rules' && room.activeGame ? (
            <motion.div
              key="screen-rules"
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex-1 min-h-0"
            >
              <ScreenRules
                gameId={room.activeGame}
                isTvMode={isTvMode}
                players={room.players}
                onAddPlayer={addLobbyPlayer}
                onRemovePlayer={removePlayer}
                onSwitchPlayerTeam={switchPlayerTeam}
                onBack={() => updateScreen('game-setup')}
                onStartRound={() => {
                  if (room.connectionMode === 'multi') {
                    setViewMode('controller');
                  }
                  prepareAndStartRound(
                    room.activeGame!,
                    room.theme,
                    room.timerConfig,
                    room.maxRounds,
                    room.customConfig
                  );
                }}
              />
            </motion.div>
          ) : room.screen === 'playing' ? <PlayingScreen room={room} isTvMode={isTvMode} broadcastState={broadcastState} handleNextRound={handleNextRound} /> : room.screen === 'game-over' ? (
            /* Clean Victory Screen focused on Winning Team/Player & MVP, with clickable icon buttons for Achievements, Hall of Fame, Activity Log & Session History */
            <GameOverScreen room={room} setShareFeedback={setShareFeedback} setActiveGameOverPanel={setActiveGameOverPanel} setIsCompareModalOpen={setIsCompareModalOpen} shareFeedback={shareFeedback} isCompareModalOpen={isCompareModalOpen} activeGameOverPanel={activeGameOverPanel} handleReturnToLobby={handleReturnToLobby} handleResetSessionStats={handleResetSessionStats} />
          ) : null}
        </AnimatePresence>
      </WindowWrapper>

      {/* Dev Multi-Player Simulator Drawer */}
      {SHOW_DEV_TOOLS && (
        <Suspense fallback={null}>
          <DevControlsDrawer
            room={room}
            onUpdateRoom={broadcastState}
            onRegisterPlayer={registerPlayer}
            onRemovePlayer={removePlayer}
          />
        </Suspense>
      )}

      {renderJoinRoomModal()}
    </div>
  );
}
