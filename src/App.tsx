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
// Telas de jogo e componentes pesados são carregados sob demanda (code-splitting)
// para reduzir o bundle inicial e acelerar o primeiro carregamento no celular/TV.
const ScreenLimite = lazy(() =>
  import('./components/host/ScreenLimite').then((m) => ({ default: m.ScreenLimite }))
);
const ScreenDuvido = lazy(() =>
  import('./components/host/ScreenDuvido').then((m) => ({ default: m.ScreenDuvido }))
);
const ScreenProibido = lazy(() =>
  import('./components/host/ScreenProibido').then((m) => ({ default: m.ScreenProibido }))
);
const ScreenNota = lazy(() =>
  import('./components/host/ScreenNota').then((m) => ({ default: m.ScreenNota }))
);
const ScreenTemOuNaoTem = lazy(() =>
  import('./components/host/ScreenTemOuNaoTem').then((m) => ({ default: m.ScreenTemOuNaoTem }))
);
const ScreenPerguntasEVerdades = lazy(() =>
  import('./components/host/ScreenPerguntasEVerdades').then((m) => ({
    default: m.ScreenPerguntasEVerdades
  }))
);
const DevControlsDrawer = lazy(() =>
  import('./components/dev/DevControlsDrawer').then((m) => ({ default: m.DevControlsDrawer }))
);
const ComparePlayersModal = lazy(() =>
  import('./components/ComparePlayersModal').then((m) => ({ default: m.ComparePlayersModal }))
);
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

const GAME_NAMES: Record<GameId, string> = {
  limite: 'JOGO DO LIMITE',
  duvido: 'JOGO DO DUVIDO',
  proibido: 'JOGO DO PROIBIDO',
  nota: 'JOGO DA NOTA',
  'tem-ou-nao-tem': 'TEM OU NÃO TEM',
  'perguntas-e-verdades': 'PERGUNTAS E VERDADES'
};

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
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    const saved = localStorage.getItem('rb_visual_theme') || localStorage.getItem('roda-de-bobo-visual-theme');
    if (isVisualTheme(saved)) return saved as VisualTheme;
    return 'cazetv';
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

      broadcastState((prev) => {
        const effectiveTimer = customTimer ?? prev.timerConfig;
        const effectiveMaxRounds = customMaxRounds ?? prev.maxRounds;
        const mergedCustomConfig: GameCustomConfig = {
          ...DEFAULT_GAME_CUSTOM_CONFIG,
          ...(prev.customConfig || {}),
          ...(customConfigOverride || {})
        };

        let limiteState: LimiteGameState | undefined = undefined;
        let duvidoState: DuvidoGameState | undefined = undefined;
        let proibidoState: ProibidoGameState | undefined = undefined;
        let notaState: NotaGameState | undefined = undefined;
        let temOuNaoTemState: TemOuNaoTemGameState | undefined = undefined;
        let perguntasEVerdadesState: PerguntasEVerdadesGameState | undefined = undefined;

        const effectiveTeamCount = getTeamCount(prev, mergedCustomConfig.teamCount);
        const activeTeamIds = getActiveTeamIds(prev, effectiveTeamCount);
        const startingTeam: TeamId =
          activeTeamIds[(Math.max(1, prev.roundNumber) - 1) % activeTeamIds.length] || 'A';
        const opposingTeam: TeamId = getNextTeamId(startingTeam, activeTeamIds);

        let nextMatchPlayers =
          prev.roundNumber === 1
            ? prev.players.map((p) => ({
                ...p,
                score: 0,
                roundsPlayed: 0,
                roundsWon: 0,
                accuracy: 0
              }))
            : prev.players;

        // Ensure player team assignments respect the clamped team count (2 players = Team A vs Team B)
        if (nextMatchPlayers.length <= 2) {
          if (nextMatchPlayers[0] && nextMatchPlayers[0].team !== 'A') {
            nextMatchPlayers[0] = { ...nextMatchPlayers[0], team: 'A' };
          }
          if (nextMatchPlayers[1] && nextMatchPlayers[1].team !== 'B') {
            nextMatchPlayers[1] = { ...nextMatchPlayers[1], team: 'B' };
          }
        } else {
          nextMatchPlayers = normalizePlayersToTeamCount(nextMatchPlayers, effectiveTeamCount);
        }

        if (gameId === 'limite') {
          const shouldDrawNewPowerCards =
            prev.roundNumber === 1 ||
            !prev.limite?.assignedPowerCards ||
            Object.keys(prev.limite.assignedPowerCards).length === 0;
          const drawnCards = shouldDrawNewPowerCards
            ? drawLimitePowerCardsForPlayers(nextMatchPlayers)
            : null;
          if (drawnCards) {
            nextMatchPlayers = drawnCards.updatedPlayers;
          }
          const defaultPlayMode =
            prev.connectionMode === 'host' || prev.connectionMode === 'multi' ? 'digital' : 'mesa';

          limiteState = {
            phase: 'SECRET_GUESS',
            playMode: prev.limite?.playMode || mergedCustomConfig.limitePlayMode || defaultPlayMode,
            assignedPowerCards:
              drawnCards?.assignedPowerCards || prev.limite?.assignedPowerCards || {},
            usedPowerCardsByPlayer:
              drawnCards?.usedPowerCardsByPlayer || prev.limite?.usedPowerCardsByPlayer || {},
            roundData: data,
            guesses: {},
            submittedPlayers: [],
            powerCardsPlayed: {},
            callTimerRemaining: 0,
            timerActive: effectiveTimer > 0,
            timerSeconds: effectiveTimer,
            revealedOrder: false,
            winners: [],
            bustedPlayers: [],
            closestDifference: 0,
            pointsAwarded: {},
            revealCountdown: null,
            exactBonus: limiteExactBonusFor(mergedCustomConfig)
          };
        } else if (gameId === 'duvido') {
          const teamAPlayers = prev.players.filter((p) => p.team === 'A');
          const teamBPlayers = prev.players.filter((p) => p.team === 'B');
          const teamCPlayers = prev.players.filter((p) => p.team === 'C');
          const teamDPlayers = prev.players.filter((p) => p.team === 'D');
          const maxExamples = mergedCustomConfig.duvidoExamplesCount || 16;

          duvidoState = {
            phase: 'AUCTION',
            roundData: {
              ...data,
              exemplos_validos: Array.isArray(data?.exemplos_validos)
                ? data.exemplos_validos.slice(0, maxExamples)
                : []
            },
            blindfoldedPlayers: {
              A: teamAPlayers[1]?.id || teamAPlayers[0]?.id || 'p-blind-a',
              B: teamBPlayers[1]?.id || teamBPlayers[0]?.id || 'p-blind-b',
              C: teamCPlayers[1]?.id || teamCPlayers[0]?.id || 'p-blind-c',
              D: teamDPlayers[1]?.id || teamDPlayers[0]?.id || 'p-blind-d'
            },
            negotiators: {
              A: teamAPlayers[0]?.id || 'p-neg-a',
              B: teamBPlayers[0]?.id || 'p-neg-b',
              C: teamCPlayers[0]?.id || 'p-neg-c',
              D: teamDPlayers[0]?.id || 'p-neg-d'
            },
            blindfoldConfirmed: { A: true, B: true, C: true, D: true },
            currentBid: 0,
            currentBidTeam: null,
            activeTurnTeam: startingTeam,
            timerSeconds: effectiveTimer,
            timerActive: false,
            validCount: 0,
            challengedTeam: null,
            challengedPlayerId: null,
            resultWinnerTeam: null,
            resultReason: ''
          };
        } else if (gameId === 'proibido') {
          const rawCards = Array.isArray(data) ? data : [data];
          const targetCardsCount = mergedCustomConfig.proibidoCardsCount || 5;
          const targetForbiddenCount = mergedCustomConfig.proibidoForbiddenCount || 5;
          const cards = rawCards.slice(0, targetCardsCount).map((c: any) => ({
            ...c,
            palavras_proibidas: Array.isArray(c.palavras_proibidas)
              ? c.palavras_proibidas.slice(0, targetForbiddenCount)
              : []
          }));

          const is2PlayerMode = prev.players.length === 2;
          let speakerMember: Player | undefined;
          let guesserMember: Player | undefined;
          let refereeMember: Player | undefined;
          let resolvedSpeakerTeam = startingTeam;
          let resolvedRefereeTeam = opposingTeam;

          if (is2PlayerMode) {
            // 2-player cooperative mode: alternate speaker and guesser roles each round
            const roundIdx = Math.max(1, prev.roundNumber) - 1;
            const spkIdx = roundIdx % 2;
            const gsrIdx = (roundIdx + 1) % 2;
            speakerMember = prev.players[spkIdx];
            guesserMember = prev.players[gsrIdx];
            resolvedSpeakerTeam = speakerMember?.team || 'A';
            resolvedRefereeTeam = guesserMember?.team || 'B';
            refereeMember = undefined;
          } else {
            const speakerTeamPlayers = prev.players.filter((p) => p.team === startingTeam);
            const teamRoundTurn = Math.floor((Math.max(1, prev.roundNumber) - 1) / activeTeamIds.length);
            speakerMember =
              speakerTeamPlayers.length > 0
                ? speakerTeamPlayers[teamRoundTurn % speakerTeamPlayers.length]
                : prev.players[0];
            const otherTeamPlayers = speakerTeamPlayers.filter((p) => p.id !== speakerMember?.id);
            guesserMember =
              otherTeamPlayers.length > 0
                ? otherTeamPlayers[0]
                : prev.players.find((p) => p.id !== speakerMember?.id);
            const refereeTeamPlayers = prev.players.filter((p) => p.team === opposingTeam);
            refereeMember = refereeTeamPlayers[0];
          }

          proibidoState = {
            phase: 'READY',
            cards,
            currentCardIndex: 0,
            pendingQueue: cards.map((_: any, idx: number) => idx),
            speakerTeam: resolvedSpeakerTeam,
            speakerPlayerId: speakerMember?.id || prev.players[0]?.id || '',
            guesserPlayerId: guesserMember?.id || prev.players[1]?.id || '',
            refereeTeam: resolvedRefereeTeam,
            refereePlayerId: refereeMember?.id,
            timerSeconds: effectiveTimer,
            timerActive: false,
            roundScore: 0,
            cardOutcomes: new Array(cards.length).fill('pending'),
            antiSpoilerMode: 'guesser-back-to-tv',
            tvWordsHidden: false,
            is2PlayerMode
          };
        } else if (gameId === 'nota') {
          const speakerIdx = (Math.max(1, prev.roundNumber) - 1) % Math.max(1, prev.players.length);
          const speaker = prev.players[speakerIdx] || prev.players[0];
          const scaleMin = mergedCustomConfig.notaScaleMin ?? 1;
          const scaleMax = Math.max(scaleMin + 1, mergedCustomConfig.notaScaleMax || 10);
          notaState = {
            phase: 'STEP_1_DRAW',
            drawSubState: 'BLINDFOLD_WARNING',
            revealSubState: 'SPINNING',
            roundData: data,
            speakerPlayerId: speaker?.id || currentUserId,
            secretScore: drawRandomScoreCSPRNG(scaleMin, scaleMax),
            scaleMin,
            scaleMax,
            selectedCorrectPlayerIds: [],
            allowCloseVote: Boolean(mergedCustomConfig.notaAllowCloseVote),
            votes: {},
            pointsAwarded: {},
            correctVoters: []
          };
        } else if (gameId === 'tem-ou-nao-tem') {
          const targetTemCount = Math.min(
            10,
            Math.max(3, Number(mergedCustomConfig.temItemsCount) || 5)
          );
          const rawSource =
            Array.isArray(data?.rawRespostas) &&
            data.rawRespostas.length >= (data?.respostas?.length || 0)
              ? data.rawRespostas
              : data?.respostas || [];
          const normalizedRespostas = normalizeTemVotesTo100(
            rawSource,
            targetTemCount,
            undefined,
            effectiveTheme
          );
          const items = normalizedRespostas.map((r: any) => ({
            texto: r.texto,
            sinonimos_aceitos: r.sinonimos_aceitos || [],
            votos: r.votos,
            revealed: false
          }));

          temOuNaoTemState = {
            phase: 'GUESSING',
            roundData: {
              ...data,
              respostas: normalizedRespostas
            },
            items,
            activeTeam: startingTeam,
            turnStepIndex: 0,
            strikes: { A: 0, B: 0, C: 0, D: 0 },
            maxStrikes: mergedCustomConfig.temMaxStrikes || 2,
            eliminatedTeams: [],
            freeDomainTeam: null,
            roundScore: { A: 0, B: 0, C: 0, D: 0 }
          };
        } else if (gameId === 'perguntas-e-verdades') {
          const maxTablePlayers = Math.min(6, Math.max(2, mergedCustomConfig.pvMaxPlayers || 6));
          const activePlayers = prev.players.slice(0, maxTablePlayers);
          const deckMode = mergedCustomConfig.pvDeckMode || 'assisted';
          const deckStyle = mergedCustomConfig.pvDeckStyle || 'padrao';
          const tokens: Record<string, number> = {};
          const tokenAlertLight: Record<string, boolean> = {};
          const playerHands: PerguntasEVerdadesGameState['playerHands'] = {};
          const handReady: Record<string, boolean> = {};
          const revealedCards: Record<string, boolean[]> = {};
          const roundWinsByPlayer: Record<string, number> = {};

          activePlayers.forEach((p) => {
            tokens[p.id] = 10;
            tokenAlertLight[p.id] = false;
            playerHands[p.id] = [];
            handReady[p.id] = deckMode === 'physical';
            revealedCards[p.id] = new Array(8).fill(false);
            roundWinsByPlayer[p.id] = 0;
          });

          const firstPlayerId = activePlayers[0]?.id || null;
          const secondPlayerId = activePlayers[1]?.id || activePlayers[0]?.id || null;
          const turnTimerCfg = mergedCustomConfig.pvTurnTimerSeconds ?? 300;
          const tokenTimerCfg = mergedCustomConfig.pvTokenTimerSeconds ?? 30;
          const initialPhase = deckMode === 'assisted' ? 'DECK_SETUP' : 'TOKEN_AUCTION';
          const initialTimer = initialPhase === 'TOKEN_AUCTION' ? tokenTimerCfg : turnTimerCfg;

          perguntasEVerdadesState = {
            phase: initialPhase,
            deckMode,
            deckStyle,
            auctionRound: 1,
            activeTurnPlayerId: firstPlayerId,
            targetOpponentId: secondPlayerId,
            auctionWinnerId: firstPlayerId,
            auctionWinningBid: 0,
            auctionTieMessage: null,
            tokens,
            tokenAlertLight,
            currentBids: {},
            bidSubmitted: {},
            playerHands,
            handReady,
            revealedCards,
            selectedQuestionNumber: 1,
            selectedPositionsQ1: [1, 3, 6],
            selectedValueQ7: 7,
            selectedSuitQ8: 'spades',
            questionHistory: [],
            truthGuessValues: [0, 0, 0, 0, 0, 0, 0, 0],
            savedTruthSlotsByTarget: {},
            lastTruthAttemptMessage: null,
            tokenTimerConfig: tokenTimerCfg,
            turnTimerConfig: turnTimerCfg,
            timerSeconds: initialTimer,
            timerActive: initialPhase !== 'DECK_SETUP' && initialTimer > 0,
            winnerPlayerId: null,
            winReason: null,
            setupPlayerIndex: 0,
            matchRoundNumber: 1,
            totalMatchRounds: effectiveMaxRounds || 1,
            roundWinsByPlayer,
            roundWinBannerMessage: null
          };
        }

        const updatedSignatures = generated.signature
          ? Array.from(new Set([...(prev.usedRoundSignatures || []), generated.signature]))
          : prev.usedRoundSignatures || [];

        return {
          ...prev,
          screen: 'playing',
          activeGame: gameId,
          players: nextMatchPlayers,
          theme: customTheme || prev.theme,
          activeSubtheme: generated.subthemeUsed || prev.activeSubtheme || '',
          usedRoundSignatures: updatedSignatures,
          customConfig: {
            ...mergedCustomConfig,
            teamCount: effectiveTeamCount
          },
          teamCount: effectiveTeamCount,
          timerConfig: effectiveTimer,
          maxRounds: effectiveMaxRounds,
          roundLog: prev.roundNumber === 1 ? [] : prev.roundLog || [],
          limite: limiteState,
          duvido: duvidoState,
          proibido: proibidoState,
          nota: notaState,
          temOuNaoTem: temOuNaoTemState,
          perguntasEVerdades: perguntasEVerdadesState
        };
      });
      // Background prefetch for the NEXT round so transition is zero-delay!
      if (gameId !== 'perguntas-e-verdades') {
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

    broadcastState((prev) => {
      // Accumulate round points from active game across up to 4 teams
      const roundPts: Record<TeamId, number> = { A: 0, B: 0, C: 0, D: 0 };

      if (prev.activeGame === 'proibido' && prev.proibido) {
        if (prev.proibido.is2PlayerMode || prev.players.length === 2) {
          // In 2-player cooperative mode, both players score together!
          roundPts.A += prev.proibido.roundScore || 0;
          roundPts.B += prev.proibido.roundScore || 0;
        } else {
          const spkTeam = prev.proibido.speakerTeam;
          roundPts[spkTeam] = (roundPts[spkTeam] || 0) + prev.proibido.roundScore;
        }
      } else if (prev.activeGame === 'duvido' && prev.duvido) {
        const winTeam = prev.duvido.resultWinnerTeam;
        if (winTeam) {
          roundPts[winTeam] = (roundPts[winTeam] || 0) + 1;
        }
      } else if (prev.activeGame === 'tem-ou-nao-tem' && prev.temOuNaoTem) {
        roundPts.A += prev.temOuNaoTem.roundScore.A || 0;
        roundPts.B += prev.temOuNaoTem.roundScore.B || 0;
        roundPts.C += prev.temOuNaoTem.roundScore.C || 0;
        roundPts.D += prev.temOuNaoTem.roundScore.D || 0;
      } else if (prev.activeGame === 'limite' && prev.limite) {
        Object.entries(prev.limite.pointsAwarded || {}).forEach(([pid, pts]) => {
          const p = prev.players.find((pl) => pl.id === pid);
          if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
        });
      } else if (prev.activeGame === 'nota' && prev.nota) {
        Object.entries(prev.nota.pointsAwarded || {}).forEach(([pid, pts]) => {
          const p = prev.players.find((pl) => pl.id === pid);
          if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
        });
      } else if (prev.activeGame === 'perguntas-e-verdades' && prev.perguntasEVerdades) {
        const winId = prev.perguntasEVerdades.winnerPlayerId;
        const winPlayer = prev.players.find((pl) => pl.id === winId);
        if (winPlayer?.team) roundPts[winPlayer.team] = (roundPts[winPlayer.team] || 0) + 100;
      }

      const roundPointsA = roundPts.A;
      const roundPointsB = roundPts.B;
      const newScoreA = prev.teams.A.score + roundPts.A;
      const newScoreB = prev.teams.B.score + roundPts.B;
      const newScoreC = (prev.teams.C?.score || 0) + roundPts.C;
      const newScoreD = (prev.teams.D?.score || 0) + roundPts.D;
      const updatedPlayers = accumulateRoundPlayerScores(prev);

      const updatedTeams = {
        ...syncTeamsRecordFromPlayers(updatedPlayers, prev.teams),
        A: {
          ...prev.teams.A,
          members: updatedPlayers.filter((p) => p.team === 'A').map((p) => p.id),
          score: newScoreA
        },
        B: {
          ...prev.teams.B,
          members: updatedPlayers.filter((p) => p.team === 'B').map((p) => p.id),
          score: newScoreB
        },
        C: {
          id: 'C' as const,
          name: prev.teams.C?.name || TEAM_META.C.defaultName,
          color: prev.teams.C?.color || TEAM_META.C.hex,
          members: updatedPlayers.filter((p) => p.team === 'C').map((p) => p.id),
          score: newScoreC
        },
        D: {
          id: 'D' as const,
          name: prev.teams.D?.name || TEAM_META.D.defaultName,
          color: prev.teams.D?.color || TEAM_META.D.hex,
          members: updatedPlayers.filter((p) => p.team === 'D').map((p) => p.id),
          score: newScoreD
        }
      };

      const roundEvent = buildRoundActivityEvent(
        prev,
        roundPointsA,
        roundPointsB,
        newScoreA,
        newScoreB,
        prev.activeGame ? GAME_NAMES[prev.activeGame] : 'PARTIDA'
      );
      const updatedRoundLog = [...(prev.roundLog || []), roundEvent];

      const nextRoundNum = prev.roundNumber + 1;
      const isIndividualGame =
        prev.activeGame === 'limite' ||
        prev.activeGame === 'nota' ||
        prev.activeGame === 'perguntas-e-verdades';

      const sortedPlayers = [...updatedPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
      const topScore = sortedPlayers[0]?.score || 0;
      const tiedTopPlayers = sortedPlayers.filter((p) => (p.score || 0) === topScore);

      const activeTeamIds = getActiveTeamIds(prev);
      const activeTeamScores = activeTeamIds.map((tId) => ({
        id: tId,
        score: updatedTeams[tId]?.score || 0
      }));
      const maxTeamScore = Math.max(...activeTeamScores.map((t) => t.score), 0);
      const topTeams = activeTeamScores.filter((t) => t.score === maxTeamScore);

      const isTiedAtEnd =
        nextRoundNum > prev.maxRounds &&
        prev.roundNumber <= 12 &&
        (isIndividualGame
          ? topScore > 0 && tiedTopPlayers.length > 1
          : maxTeamScore > 0 && topTeams.length > 1);

      if (isTiedAtEnd) {
        shouldStartNextRound = true;
        nextMaxRoundsTarget = prev.maxRounds + 1;
        setSuddenDeathBanner('⚡ EMPATE NO TOPO! RODADA DE MORTE SÚBITA ATIVADA!');
        return {
          ...prev,
          roundNumber: nextRoundNum,
          maxRounds: prev.maxRounds + 1,
          players: updatedPlayers,
          roundLog: updatedRoundLog,
          teams: updatedTeams
        };
      }

      setSuddenDeathBanner(null);
      const isGameOver = nextRoundNum > prev.maxRounds || duvidoEndsEarly;

      const clearedTemOuNaoTem = prev.temOuNaoTem
        ? { ...prev.temOuNaoTem, roundScore: { A: 0, B: 0, C: 0, D: 0 } }
        : undefined;
      const clearedProibido = prev.proibido
        ? { ...prev.proibido, roundScore: 0 }
        : undefined;

      if (isGameOver) {
        const winnerTeam: TeamId | 'EMPATE' =
          maxTeamScore > 0 && topTeams.length === 1 ? topTeams[0].id : 'EMPATE';

        const historyItem: GameHistoryEntry = {
          id: 'match_' + Date.now(),
          gameId: prev.activeGame || 'limite',
          gameName: prev.activeGame ? GAME_NAMES[prev.activeGame] : 'JOGO',
          timestamp: Date.now(),
          winnerTeam,
          scoreA: newScoreA,
          scoreB: newScoreB,
          scoreC: newScoreC,
          scoreD: newScoreD,
          roundsPlayed: duvidoEndsEarly ? prev.roundNumber : prev.maxRounds,
          theme: prev.theme,
          playerScores: updatedPlayers.map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            team: p.team,
            score: p.score,
            roundsPlayed: p.roundsPlayed,
            roundsWon: p.roundsWon,
            accuracy: p.accuracy
          })),
          mvp: isIndividualGame
            ? buildMatchMVPSnapshot(
                updatedPlayers,
                newScoreA,
                newScoreB,
                prev.maxRounds,
                prev.teams.A.name,
                prev.teams.B.name
              )
            : buildTeamCollectiveMVPSnapshot(
                updatedPlayers,
                winnerTeam,
                maxTeamScore,
                prev.maxRounds,
                updatedTeams
              ),
          roundLog: updatedRoundLog
        };

        const updatedStats = {
          totalMatches: prev.sessionStats.totalMatches + 1,
          victoriesA: prev.sessionStats.victoriesA + (winnerTeam === 'A' ? 1 : 0),
          victoriesB: prev.sessionStats.victoriesB + (winnerTeam === 'B' ? 1 : 0),
          victoriesC: (prev.sessionStats.victoriesC || 0) + (winnerTeam === 'C' ? 1 : 0),
          victoriesD: (prev.sessionStats.victoriesD || 0) + (winnerTeam === 'D' ? 1 : 0),
          totalPointsA: prev.sessionStats.totalPointsA + newScoreA,
          totalPointsB: prev.sessionStats.totalPointsB + newScoreB,
          totalPointsC: (prev.sessionStats.totalPointsC || 0) + newScoreC,
          totalPointsD: (prev.sessionStats.totalPointsD || 0) + newScoreD,
          history: [...prev.sessionStats.history, historyItem]
        };

        const updatedMatchRoom = {
          ...prev,
          screen: 'game-over' as const,
          players: updatedPlayers,
          roundLog: updatedRoundLog,
          temOuNaoTem: clearedTemOuNaoTem,
          proibido: clearedProibido,
          teams: updatedTeams,
          sessionStats: updatedStats
        };

        // Persist lifetime career statistics for Fixed Players in this match
        updateFixedPlayersAfterMatch(updatedMatchRoom);

        return updatedMatchRoom;
      }

      shouldStartNextRound = true;
      return {
        ...prev,
        roundNumber: nextRoundNum,
        players: updatedPlayers,
        roundLog: updatedRoundLog,
        temOuNaoTem: clearedTemOuNaoTem,
        proibido: clearedProibido,
        teams: updatedTeams
      };
    });

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
      'perguntas-e-verdades'
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
          ) : room.screen === 'playing' ? (
            <motion.div
              key={`screen-playing-${room.activeGame}`}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex-1 min-h-0"
            >
              <Suspense
                fallback={
                  <div className="py-24 text-center font-anton text-2xl text-cyan-300 uppercase tracking-wider animate-pulse">
                    CARREGANDO JOGO...
                  </div>
                }
              >
              {room.activeGame === 'limite' && (
                <ScreenLimite
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateLimiteState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      limite: prev.limite ? updater(prev.limite) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'duvido' && (
                <ScreenDuvido
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateDuvidoState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      duvido: prev.duvido ? updater(prev.duvido) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'proibido' && (
                <ScreenProibido
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateProibidoState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      proibido: prev.proibido ? updater(prev.proibido) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'nota' && (
                <ScreenNota
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateNotaState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      nota: prev.nota ? updater(prev.nota) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'tem-ou-nao-tem' && (
                <ScreenTemOuNaoTem
                  room={room}
                  isTvMode={isTvMode}
                  onUpdateTemOuNaoTemState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      temOuNaoTem: prev.temOuNaoTem ? updater(prev.temOuNaoTem) : undefined
                    }))
                  }
                  onNextRound={handleNextRound}
                />
              )}
              {room.activeGame === 'perguntas-e-verdades' && (
                <ScreenPerguntasEVerdades
                  room={room}
                  isTvMode={isTvMode}
                  onUpdatePVState={(updater) =>
                    broadcastState((prev) => ({
                      ...prev,
                      perguntasEVerdades: prev.perguntasEVerdades
                        ? updater(prev.perguntasEVerdades)
                        : undefined
                    }))
                  }
                  onDeclareMatchWinner={(winnerPlayerId, reason) => {
                    broadcastState((prev) => {
                      const winPlayer = prev.players.find((pl) => pl.id === winnerPlayerId);
                      const bonusA = winPlayer?.team === 'A' ? 100 : 0;
                      const bonusB = winPlayer?.team === 'B' ? 100 : 0;
                      const newScoreA = prev.teams.A.score + bonusA;
                      const newScoreB = prev.teams.B.score + bonusB;
                      const updatedPlayers = prev.players.map((p) =>
                        p.id === winnerPlayerId
                          ? {
                              ...p,
                              score: p.score + 100,
                              roundsPlayed: (p.roundsPlayed || 0) + 1,
                              roundsWon: (p.roundsWon || 0) + 1,
                              accuracy: 100
                            }
                          : {
                              ...p,
                              roundsPlayed: (p.roundsPlayed || 0) + 1,
                              accuracy: p.accuracy || 50
                            }
                      );

                      const winnerTeam: 'A' | 'B' | 'EMPATE' =
                        newScoreA > newScoreB ? 'A' : newScoreB > newScoreA ? 'B' : 'EMPATE';

                      const updatedRoundLog = [
                        ...(prev.roundLog || []),
                        {
                          id: 'pv_win_' + Date.now(),
                          roundNumber: prev.perguntasEVerdades?.auctionRound || 1,
                          gameId: 'perguntas-e-verdades' as GameId,
                          gameName: 'PERGUNTAS E VERDADES',
                          winnerTeam,
                          pointsA: bonusA,
                          pointsB: bonusB,
                          cumulativeScoreA: newScoreA,
                          cumulativeScoreB: newScoreB,
                          headline: `👑 ${winPlayer?.name || 'Jogador'} venceu em Perguntas e Verdades!`,
                          subheadline: reason,
                          topPlayerName: winPlayer?.name,
                          timestamp: Date.now()
                        }
                      ];

                      const historyItem: GameHistoryEntry = {
                        id: 'match_' + Date.now(),
                        gameId: 'perguntas-e-verdades',
                        gameName: 'PERGUNTAS E VERDADES',
                        timestamp: Date.now(),
                        winnerTeam,
                        scoreA: newScoreA,
                        scoreB: newScoreB,
                        roundsPlayed: prev.perguntasEVerdades?.auctionRound || 1,
                        theme: 'O Jogo do Diabo: Perguntas e Verdades',
                        playerScores: updatedPlayers.map((p) => ({
                          id: p.id,
                          name: p.name,
                          avatar: p.avatar,
                          team: p.team,
                          score: p.score,
                          roundsPlayed: p.roundsPlayed,
                          roundsWon: p.roundsWon,
                          accuracy: p.accuracy
                        })),
                        mvp: buildMatchMVPSnapshot(
                          updatedPlayers,
                          newScoreA,
                          newScoreB,
                          prev.perguntasEVerdades?.auctionRound || 1,
                          prev.teams.A.name,
                          prev.teams.B.name
                        ),
                        roundLog: updatedRoundLog
                      };

                      const updatedMatchRoom = {
                        ...prev,
                        screen: 'game-over' as const,
                        players: updatedPlayers,
                        roundLog: updatedRoundLog,
                        perguntasEVerdades: prev.perguntasEVerdades
                          ? {
                              ...prev.perguntasEVerdades,
                              phase: 'FINISHED' as const,
                              winnerPlayerId,
                              winReason: reason
                            }
                          : undefined,
                        teams: {
                          A: { ...prev.teams.A, score: newScoreA },
                          B: { ...prev.teams.B, score: newScoreB }
                        },
                        sessionStats: {
                          totalMatches: prev.sessionStats.totalMatches + 1,
                          victoriesA: prev.sessionStats.victoriesA + (winnerTeam === 'A' ? 1 : 0),
                          victoriesB: prev.sessionStats.victoriesB + (winnerTeam === 'B' ? 1 : 0),
                          totalPointsA: prev.sessionStats.totalPointsA + newScoreA,
                          totalPointsB: prev.sessionStats.totalPointsB + newScoreB,
                          history: [...prev.sessionStats.history, historyItem]
                        }
                      };

                      updateFixedPlayersAfterMatch(updatedMatchRoom);
                      return updatedMatchRoom;
                    });
                  }}
                />
              )}
              </Suspense>
            </motion.div>
          ) : room.screen === 'game-over' ? (
            /* Clean Victory Screen focused on Winning Team/Player & MVP, with clickable icon buttons for Achievements, Hall of Fame, Activity Log & Session History */
            (() => {
              const mvp = computeMatchMVP(room); // UX-15: MVP só da partida atual
              const playerComparison = computeMatchPlayerComparison(room);
              const roundActivityLog = getMatchRoundActivityLog(room);
              const partyAchievements = computePartyAchievements(room);
              const mvpPlayer = room.players.find((p) => p.id === mvp.playerId);
              const playerAccuracy =
                typeof mvpPlayer?.accuracy === 'number' && (mvpPlayer.roundsPlayed ?? 0) > 0
                  ? mvpPlayer.accuracy
                  : mvp.accuracy;
              const playerRoundsPlayed =
                typeof mvpPlayer?.roundsPlayed === 'number' && mvpPlayer.roundsPlayed > 0
                  ? mvpPlayer.roundsPlayed
                  : mvp.roundsPlayed;
              const playerRoundsWon =
                typeof mvpPlayer?.roundsWon === 'number' && (mvpPlayer.roundsPlayed ?? 0) > 0
                  ? mvpPlayer.roundsWon
                  : mvp.roundsWon;
              const avgPointsPerRound =
                playerRoundsPlayed > 0
                  ? Math.round((mvp.score / playerRoundsPlayed) * 10) / 10
                  : mvp.score;

              const isIndividualMatch =
                room.activeGame === 'nota' ||
                room.activeGame === 'limite' ||
                room.activeGame === 'perguntas-e-verdades';

              const sortedIndividualPlayers = [...room.players].sort(
                (a, b) => (b.score || 0) - (a.score || 0)
              );
              const topIndividualScore = sortedIndividualPlayers[0]?.score || 0;
              const tiedIndividualWinners = sortedIndividualPlayers.filter(
                (p) => (p.score || 0) === topIndividualScore
              );

              const activeTeamIds = getActiveTeamIds(room);
              const activeTeamScores = activeTeamIds.map((tId) => ({
                id: tId,
                name: room.teams[tId]?.name || TEAM_META[tId].defaultName,
                score: room.teams[tId]?.score || 0
              }));
              const maxTeamScore = Math.max(...activeTeamScores.map((t) => t.score), 0);
              const topTeams = activeTeamScores.filter((t) => t.score === maxTeamScore);

              const winningTeamKey: TeamId | 'EMPATE' =
                maxTeamScore > 0 && topTeams.length === 1 ? topTeams[0].id : 'EMPATE';
              const winningTeamName =
                winningTeamKey !== 'EMPATE'
                  ? room.teams[winningTeamKey]?.name || TEAM_META[winningTeamKey].defaultName
                  : 'EMPATE';

              const winningTeamPlayers = isIndividualMatch
                ? sortedIndividualPlayers
                : winningTeamKey === 'EMPATE'
                ? [...room.players].sort((a, b) => b.score - a.score)
                : room.players
                    .filter((p) => p.team === winningTeamKey)
                    .sort((a, b) => b.score - a.score);

              const topWinningPlayer = winningTeamPlayers[0] || mvpPlayer || room.players[0];
              const collectiveHighlightName =
                winningTeamKey !== 'EMPATE' ? winningTeamName : 'Empate entre Equipes';
              const collectiveMembersLabel =
                winningTeamPlayers.length > 0
                  ? winningTeamPlayers.map((p) => `${p.avatar} ${p.name}`).join(' & ')
                  : 'Equipe em Conjunto';
              const displayHighlightScore = isIndividualMatch ? mvp.score : maxTeamScore;
              const avgPointsPerRoundDisplay =
                playerRoundsPlayed > 0
                  ? Math.round((displayHighlightScore / playerRoundsPlayed) * 10) / 10
                  : displayHighlightScore;

              const handleShareMatchResults = async () => {
                sounds.playSuccess();
                const shareMvpPayload = isIndividualMatch
                  ? {
                      ...mvp,
                      accuracy: playerAccuracy,
                      roundsPlayed: playerRoundsPlayed,
                      roundsWon: playerRoundsWon
                    }
                  : {
                      ...mvp,
                      name: `${collectiveHighlightName} (${collectiveMembersLabel})`,
                      teamName: 'Pontuação em Equipe',
                      score: maxTeamScore,
                      accuracy: playerAccuracy,
                      roundsPlayed: playerRoundsPlayed,
                      roundsWon: playerRoundsWon
                    };
                const result = await shareMatchResults(room, shareMvpPayload);
                setShareFeedback({ status: 'shared', text: result.text });
                window.setTimeout(() => {
                  setShareFeedback((prev) =>
                    prev.status === 'shared' ? { status: 'idle' } : prev
                  );
                }, 4000);
              };

              const toggleExtraPanel = (
                panel: 'achievements' | 'hall-of-fame' | 'activity-log' | 'history'
              ) => {
                sounds.playFlip();
                setActiveGameOverPanel((prev) => (prev === panel ? null : panel));
              };

              return (
                <motion.div
                  key="screen-game-over"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="h-full flex flex-col justify-between gap-2.5 min-h-0 overflow-hidden"
                >
                  {/* 12-Column Zero-Scroll Horizontal Grid: Winner Centerpiece + MVP / Collective Dupla Card */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 items-stretch">
                    {/* LEFT COLUMN (6 cols): Winning Individual Champion OR Winning Team */}
                    <div
                      data-testid="gameover-winner-centerpiece"
                      className="lg:col-span-6 border border-amber-400/50 bg-gradient-to-b from-amber-950/35 via-[#07080d] to-[#07080d] p-4 text-center relative overflow-hidden flex flex-col justify-between min-h-0"
                    >
                      <div className="space-y-1 shrink-0">
                        <div className="flex justify-center">
                          <Trophy size={40} className="text-amber-400 animate-bounce" />
                        </div>
                        <div className="text-[10px] font-mono-code text-[#17B8B8] font-bold uppercase tracking-widest">
                          {isIndividualMatch
                            ? 'FIM DA PARTIDA // MODALIDADE INDIVIDUAL (TODOS CONTRA TODOS)'
                            : 'FIM DA PARTIDA // EQUIPE CAMPEÃ (PONTUAÇÃO EM CONJUNTO)'}
                        </div>
                        <h1 className="font-anton text-2xl sm:text-4xl text-white uppercase tracking-wide leading-tight">
                          {isIndividualMatch
                            ? tiedIndividualWinners.length === 1 && tiedIndividualWinners[0]
                              ? `🏆 CAMPEÃO INDIVIDUAL: ${tiedIndividualWinners[0].name}!`
                              : '🤝 EMPATE INDIVIDUAL NO TOPO!'
                            : winningTeamKey !== 'EMPATE'
                            ? `🏆 VITÓRIA DA ${winningTeamName}!`
                            : '🤝 EMPATE ÉPICO NA MESA!'}
                        </h1>
                      </div>

                      {/* Highlight of the Ranking Individual or Winning Team Players */}
                      {winningTeamPlayers.length > 0 && (
                        <div className="space-y-1.5 min-h-0">
                          <div className="text-[10px] font-mono-code text-amber-300 uppercase font-bold tracking-wider">
                            {isIndividualMatch
                              ? 'RANKING INDIVIDUAL DOS JOGADORES'
                              : winningTeamKey === 'EMPATE'
                              ? 'INTEGRANTES DAS EQUIPES EMPATADAS'
                              : `EQUIPE CAMPEÃ (${winningTeamName} — PONTUAM JUNTOS)`}
                          </div>
                          {/* UX-14: lista TODOS os jogadores (sem corte em 6); rola dentro do painel se faltar espaço */}
                          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 max-h-[34vh] overflow-y-auto pr-1">
                            {winningTeamPlayers.map((wp, idx) => {
                              const isHighlightedWinner = isIndividualMatch
                                ? idx === 0
                                : winningTeamKey !== 'EMPATE';
                              return (
                                <div
                                  key={wp.id}
                                  data-testid={`winning-player-pill-${wp.id}`}
                                  className={`px-3 py-1.5 border flex items-center gap-2 ${
                                    isHighlightedWinner
                                      ? 'border-amber-300 bg-amber-500/20 text-white ring-1 ring-amber-400/50'
                                      : 'border-white/10 bg-white/[0.03] text-slate-200'
                                  }`}
                                >
                                  <span className="text-xl shrink-0">{wp.avatar}</span>
                                  <div className="text-left min-w-0">
                                    <div className="font-anton text-sm uppercase leading-none flex items-center gap-1 truncate">
                                      {isIndividualMatch && (
                                        <span className="text-[10px] font-mono-code text-[#17B8B8]">
                                          #{idx + 1}
                                        </span>
                                      )}
                                      <span className="truncate">{wp.name}</span>
                                      {isHighlightedWinner && (
                                        <Crown size={12} className="text-amber-300 fill-amber-300 shrink-0" />
                                      )}
                                    </div>
                                    <div className="text-[10px] font-mono-code text-amber-300 font-bold">
                                      {isIndividualMatch ? `${wp.score} PTS` : `${maxTeamScore} PTS (EQUIPE)`}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Match Score Cards (Shown for Team/Duplas games — supports 2, 3, or 4 teams) */}
                      {!isIndividualMatch && (
                        <div
                          className={`grid gap-2.5 pt-1 shrink-0 ${
                            activeTeamIds.length === 2
                              ? 'grid-cols-2'
                              : activeTeamIds.length === 3
                              ? 'grid-cols-3'
                              : 'grid-cols-2 sm:grid-cols-4'
                          }`}
                        >
                          {activeTeamIds.map((tId) => {
                            const meta = TEAM_META[tId];
                            const tName = room.teams[tId]?.name || meta.defaultName;
                            const tScore = room.teams[tId]?.score || 0;
                            const isWin = winningTeamKey === tId;
                            return (
                              <div
                                key={tId}
                                className={`p-2 border text-center ${
                                  isWin
                                    ? `${meta.borderClass} ${meta.bgClass}`
                                    : 'border-white/10 bg-white/[0.03]'
                                }`}
                              >
                                <span className={`font-anton text-[10px] uppercase block truncate ${meta.textClass}`}>
                                  {tName}
                                </span>
                                <span className="font-anton text-2xl text-white">
                                  {tScore} PTS
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN (6 cols): Individual MVP (for individual games) OR Collective Dupla Highlight (for team games) */}
                    <motion.div
                      data-testid="mvp-highlight-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="lg:col-span-6 border border-amber-400/50 bg-gradient-to-r from-amber-950/35 via-[#07080d] to-[#07080d] p-4 relative overflow-hidden flex flex-col justify-between min-h-0"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 border border-amber-300 bg-amber-500/20 flex items-center justify-center text-2xl relative shrink-0">
                            <span>
                              {isIndividualMatch
                                ? topWinningPlayer?.avatar || mvp.avatar
                                : '🤝'}
                            </span>
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black p-0.5 border border-black">
                              <Crown size={11} className="fill-black" />
                            </span>
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-amber-400 text-black font-mono-code text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Award size={10} />
                                <span>
                                  {isIndividualMatch
                                    ? 'CRAQUE DA PARTIDA // MVP'
                                    : 'DESTAQUE COLETIVO // EQUIPE CAMPEÃ'}
                                </span>
                              </span>
                              <span
                                className={`text-[9px] font-mono-code font-bold uppercase px-1.5 py-0.5 border ${
                                  isIndividualMatch
                                    ? 'border-amber-400/50 bg-amber-950/40 text-amber-300'
                                    : winningTeamKey === 'B'
                                    ? 'border-[#17B8B8]/50 bg-[#17B8B8]/10 text-cyan-300'
                                    : 'border-[#E6194B]/50 bg-[#E6194B]/10 text-rose-300'
                                }`}
                              >
                                {isIndividualMatch
                                  ? '👤 MODALIDADE INDIVIDUAL'
                                  : '🤝 PONTUAÇÃO EM CONJUNTO (SEM MVP INDIVIDUAL)'}
                              </span>
                            </div>
                            <div className="font-anton text-xl md:text-2xl text-amber-200 uppercase tracking-wide truncate">
                              {isIndividualMatch ? mvp.name : collectiveHighlightName}
                            </div>
                            <div className="text-[10px] font-mono-code text-amber-300/80 line-clamp-1">
                              {isIndividualMatch
                                ? mvp.highlightReason
                                : `Equipe: ${collectiveMembersLabel} — a equipe joga e pontua junto`}
                            </div>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1.5">
                          <div>
                            <div className="text-[9px] font-mono-code text-amber-300/90 uppercase font-bold tracking-wider">
                              {isIndividualMatch ? 'PONTUAÇÃO MVP' : 'PONTUAÇÃO DA EQUIPE'}
                            </div>
                            <div className="font-anton text-2xl md:text-3xl text-amber-400 leading-none">
                              {displayHighlightScore} PTS
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isIndividualMatch && (
                              <button
                                type="button"
                                data-testid="compare-players-btn"
                                onClick={() => {
                                  sounds.playTick();
                                  setIsCompareModalOpen(true);
                                }}
                                className="px-2.5 py-1 border border-[#17B8B8]/60 bg-[#17B8B8]/15 hover:bg-[#17B8B8] text-cyan-200 hover:text-black font-mono-code text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer"
                              >
                                <Swords size={12} className="shrink-0" />
                                <span>Comparar</span>
                              </button>
                            )}

                            <button
                              type="button"
                              data-testid="share-match-results-btn"
                              onClick={handleShareMatchResults}
                              className={`px-2.5 py-1 border font-mono-code text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                                shareFeedback.status === 'shared'
                                  ? 'border-emerald-400 bg-emerald-950/80 text-emerald-200'
                                  : 'border-amber-300 bg-amber-400 hover:bg-amber-300 text-black'
                              }`}
                            >
                              {shareFeedback.status === 'shared' ? (
                                <>
                                  <Check size={12} className="text-emerald-300 shrink-0" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 size={12} className="shrink-0" />
                                  <span>Compartilhar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Compact Performance Metrics */}
                      <div
                        data-testid="mvp-performance-metrics"
                        className="pt-2.5 border-t border-white/10 grid grid-cols-4 gap-2"
                      >
                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <Target size={11} className="text-amber-400 shrink-0" />
                            <span>Precisão</span>
                          </div>
                          <div
                            data-testid="mvp-metric-accuracy"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {playerAccuracy}%
                          </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <Layers size={11} className="text-amber-400 shrink-0" />
                            <span>Rodadas</span>
                          </div>
                          <div
                            data-testid="mvp-metric-rounds-played"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {playerRoundsPlayed}
                          </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <CheckCircle2 size={11} className="text-amber-400 shrink-0" />
                            <span>Vitórias</span>
                          </div>
                          <div
                            data-testid="mvp-metric-rounds-won"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {playerRoundsWon}/{playerRoundsPlayed}
                          </div>
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono-code text-amber-300/80 uppercase">
                            <TrendingUp size={11} className="text-amber-400 shrink-0" />
                            <span>Pts / Rodada</span>
                          </div>
                          <div
                            data-testid="mvp-metric-avg-pts"
                            className="font-anton text-lg text-amber-200 mt-0.5 whitespace-nowrap"
                          >
                            {avgPointsPerRoundDisplay} PTS
                          </div>
                        </div>
                      </div>

                      {shareFeedback.status === 'shared' && shareFeedback.text && (
                        <div
                          data-testid="share-match-results-feedback"
                          className="px-2.5 py-1 border border-emerald-500/40 bg-emerald-950/40 text-[10px] font-mono-code text-emerald-200 flex items-center justify-between gap-2"
                        >
                          <span>
                            ✅ Resumo copiado (
                            {isIndividualMatch
                              ? `${mvp.name} — ${mvp.score} PTS`
                              : `${collectiveHighlightName} (${collectiveMembersLabel}) — ${maxTeamScore} PTS`}{' '}
                            | Precisão {playerAccuracy}%)
                          </span>
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {/* Compare Players Radar Chart Modal */}
                  <Suspense fallback={null}>
                    <ComparePlayersModal
                      isOpen={isCompareModalOpen}
                      onClose={() => setIsCompareModalOpen(false)}
                      comparison={playerComparison}
                    />
                  </Suspense>

                  {/* Bottom Bar: Extras Dock + Return to Lobby CTA */}
                  <div
                    data-testid="gameover-extras-dock"
                    className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 shrink-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid="toggle-achievements-btn"
                        onClick={() => toggleExtraPanel('achievements')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'achievements'
                            ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-amber-400/50 hover:text-amber-200'
                        }`}
                      >
                        <Medal size={16} className="text-amber-400" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Conquistas ({partyAchievements.length})
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-hall-of-fame-btn"
                        onClick={() => toggleExtraPanel('hall-of-fame')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'hall-of-fame'
                            ? 'border-[#E6194B] bg-[#E6194B]/15 text-rose-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#E6194B]/50 hover:text-rose-200'
                        }`}
                      >
                        <Star size={16} className="text-[#E6194B]" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Hall da Fama
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-activity-log-btn"
                        onClick={() => toggleExtraPanel('activity-log')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'activity-log'
                            ? 'border-[#17B8B8] bg-[#17B8B8]/15 text-cyan-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-[#17B8B8]/50 hover:text-cyan-200'
                        }`}
                      >
                        <Activity size={16} className="text-[#17B8B8]" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Log de Atividade ({roundActivityLog.length})
                        </span>
                      </button>

                      <button
                        type="button"
                        data-testid="toggle-history-btn"
                        onClick={() => toggleExtraPanel('history')}
                        className={`px-3 py-2 border flex items-center gap-2 transition-all cursor-pointer ${
                          activeGameOverPanel === 'history'
                            ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-400/50 hover:text-emerald-200'
                        }`}
                      >
                        <History size={16} className="text-emerald-400" />
                        <span className="font-anton text-xs uppercase tracking-wider">
                          Histórico ({room.sessionStats.totalMatches})
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={handleReturnToLobby}
                      className="px-6 py-2.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-400 text-black font-anton text-sm uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Home size={16} />
                      <span>VOLTAR AO LOBBY PRINCIPAL</span>
                    </button>
                  </div>

                  {/* Accessible Modal Overlay for Extra Game Over Panels */}
                  <AnimatePresence>
                    {activeGameOverPanel && (
                      <div
                        data-testid="gameover-extra-modal-backdrop"
                        onClick={() => setActiveGameOverPanel(null)}
                        className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 10 }}
                          transition={{ duration: 0.18 }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full max-w-3xl max-h-[85dvh] flex flex-col border border-[#17B8B8]/50 bg-[#07080d] shadow-2xl overflow-hidden"
                        >
                          <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between shrink-0">
                            <span className="font-anton text-sm uppercase tracking-wider text-[#17B8B8]">
                              {activeGameOverPanel === 'achievements' && '🏅 CONQUISTAS DA PARTIDA'}
                              {activeGameOverPanel === 'hall-of-fame' && '⭐ HALL DA FAMA'}
                              {activeGameOverPanel === 'activity-log' && '📊 LOG DE ATIVIDADE DA PARTIDA'}
                              {activeGameOverPanel === 'history' && '📜 HISTÓRICO DE SESSÃO'}
                            </span>
                            <button
                              type="button"
                              data-testid="gameover-extra-modal-close"
                              aria-label="Fechar Modal"
                              onClick={() => setActiveGameOverPanel(null)}
                              className="min-w-[44px] min-h-[44px] px-3 flex items-center justify-center gap-1 border border-white/15 bg-white/[0.04] hover:bg-[#E6194B] hover:border-[#E6194B] text-white font-mono-code text-xs font-bold uppercase cursor-pointer transition-colors"
                            >
                              <X size={16} />
                              <span>FECHAR</span>
                            </button>
                          </div>

                          <div className="p-4 overflow-y-auto flex-1">
                            {activeGameOverPanel === 'achievements' && (
                              <PartyAchievements achievements={partyAchievements} />
                            )}

                            {activeGameOverPanel === 'hall-of-fame' && (
                              <FixedPlayersHallOfFame currentMatchPlayers={room.players} />
                            )}

                            {activeGameOverPanel === 'activity-log' && (
                              <div data-testid="round-activity-log" className="space-y-2.5">
                                {roundActivityLog.map((event, idx) => {
                                  const isTeamA = event.winnerTeam === 'A';
                                  const isTeamB = event.winnerTeam === 'B';
                                  const cardBorder = isTeamA
                                    ? 'border-[#E6194B]/40'
                                    : isTeamB
                                    ? 'border-[#17B8B8]/40'
                                    : 'border-amber-500/40';
                                  const headlineColor = isTeamA
                                    ? 'text-rose-300'
                                    : isTeamB
                                    ? 'text-cyan-300'
                                    : 'text-amber-300';

                                  return (
                                    <div
                                      key={event.id || idx}
                                      data-testid={`round-activity-item-${idx}`}
                                      className={`p-3 border bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${cardBorder}`}
                                    >
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono-code uppercase text-slate-400">
                                          <span className="font-bold text-white">
                                            RODADA {event.roundNumber}
                                          </span>
                                          <span>·</span>
                                          <span>{event.gameName}</span>
                                        </div>
                                        <div
                                          data-testid={`round-activity-headline-${idx}`}
                                          className={`font-anton text-base uppercase tracking-wide ${headlineColor}`}
                                        >
                                          {event.headline}
                                        </div>
                                        <div className="text-[11px] font-mono-code text-slate-300">
                                          {event.subheadline}
                                        </div>
                                      </div>

                                      <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
                                        <div className="font-anton text-base tracking-wider">
                                          <span className="text-[#E6194B]">+{event.pointsA} PTS</span>
                                          <span className="text-slate-600 mx-1.5">/</span>
                                          <span className="text-[#17B8B8]">+{event.pointsB} PTS</span>
                                        </div>
                                        <div className="text-[10px] font-mono-code text-slate-400 uppercase">
                                          Placar: {event.cumulativeScoreA} x {event.cumulativeScoreB}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {activeGameOverPanel === 'history' && (
                              <div data-testid="gameover-history-panel">
                                <GlobalStats
                                  stats={room.sessionStats}
                                  teamAName={room.teams.A.name}
                                  teamBName={room.teams.B.name}
                                  players={room.players}
                                  onResetStats={handleResetSessionStats}
                                  defaultExpanded={true}
                                />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })()
          ) : null}
        </AnimatePresence>
      </WindowWrapper>

      {/* Dev Multi-Player Simulator Drawer */}
      <Suspense fallback={null}>
        <DevControlsDrawer
          room={room}
          onUpdateRoom={broadcastState}
          onRegisterPlayer={registerPlayer}
          onRemovePlayer={removePlayer}
        />
      </Suspense>

      {renderJoinRoomModal()}
    </div>
  );
}
