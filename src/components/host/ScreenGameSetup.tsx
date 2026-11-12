import React, { useState, useEffect, useCallback } from 'react';
import { usesLocalContent } from '../../config/localGames';
import {
  GameRoom,
  GameId,
  GameCustomConfig,
  ConnectionMode,
  GameDifficulty,
  TeamId,
  DEFAULT_GAME_CUSTOM_CONFIG
} from '../../types/game';
import { getActiveTeamIds, getTeamCount, TEAM_META, cyclePlayerTeamId } from '../../utils/teamUtils';
import { sounds } from '../../utils/soundEffects';
import { validatePlayerCount } from '../../config/gameLimits';
import {
  PRESET_THEMES,
  prefetchRoundsForTheme,
  generateNewThemesWithAI
} from '../../utils/aiGameGenerator';
import { drawRandomStartingPlayer } from '../../utils/multiplayerRoomEngine';
import { FIXED_PLAYERS, FixedPlayerDefinition } from '../../utils/fixedPlayers';
import { resolvePlayerAvatar } from '../../utils/retroAvatars';
import { Step2ConfigureGame } from '../setup/Step2ConfigureGame';
import { Step3SelectMode } from '../setup/Step3SelectMode';
import { Step4PlayerLobby } from '../setup/Step4PlayerLobby';
import { DynamicQRCode } from '../DynamicQRCode';
import { resolvePublicShareOrigin, fetchAndCacheLanOrigin } from '../../utils/multiplayerRoomEngine';
import {
  Check,
  Users,
  User,
  Shuffle,
  Coins,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Crown,
  BookOpen,
  Play,
  GripVertical,
  UserPlus,
  QrCode,
  Copy,
  X,
  Trash2,
  Smartphone
} from 'lucide-react';
import { SetupPlayersStageView } from './setup/SetupPlayersStageView';
import { SetupTeamsStageView } from './setup/SetupTeamsStageView';
import { getRulesetPreset } from '../../config/rulesets';

export interface SetupLaunchConfig {
  theme: string;
  timer: number;
  rounds: number;
  difficulty: GameDifficulty;
  connectionMode: ConnectionMode;
  customConfig: GameCustomConfig;
}

interface ScreenGameSetupProps {
  room: GameRoom;
  isTvMode?: boolean;
  onBack: () => void;
  onGoToRules: (config: SetupLaunchConfig) => void;
  onStartDirectly: (config: SetupLaunchConfig) => void;
  onAddPlayer: (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    team?: TeamId;
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => void;
  onRemovePlayer: (playerId: string) => void;
  onSwitchPlayerTeam: (playerId: string, explicitTeam?: TeamId) => void;
  onUpdatePlayerAvatar?: (playerId: string, avatar: string) => void;
  onChangeTeamCount?: (count: 2 | 3 | 4) => void;
  onSelectConnectionMode?: (mode: ConnectionMode) => void;
  onShuffleTeams?: () => void;
  onSetStartingPlayer?: (playerId: string) => void;
  onRegenerateUniqueRoom?: (mode: ConnectionMode) => void;
  onSwitchToControllerMode?: () => void;
  transportStatus?: string;
  onForceSync?: () => void;
}

const RANDOM_ROULETTE_THEMES = [
  'Pets',
  'Geladeira',
  'Primeiro Encontro',
  'Vida Adulta',
  'Comidas de Rua',
  'Escola & Infância',
  'Desenhos Animados',
  'Quadrinhos',
  'Copa do Mundo',
  'Sobremesas',
  'Reality Shows',
  'Karaokê',
  'Videogames Clássicos',
  'Cidades Turísticas'
];

export const ScreenGameSetup: React.FC<ScreenGameSetupProps> = ({
  room,
  onBack,
  onGoToRules,
  onStartDirectly,
  onAddPlayer,
  onRemovePlayer,
  onSwitchPlayerTeam,
  onUpdatePlayerAvatar,
  onChangeTeamCount,
  onSelectConnectionMode,
  onShuffleTeams,
  onSetStartingPlayer,
  onRegenerateUniqueRoom,
  onSwitchToControllerMode,
  transportStatus,
  onForceSync
}) => {
  // Two sequential stages before the game launches:
  // 1. 'config': Theme, Timer, Rounds, Difficulty
  // 2. 'teams': Team Count (2, 3, 4) & Player Assignment (defined right after game config, before gameplay!)
  const [setupStage, setSetupStage] = useState<'config' | 'teams'>('config');

  // Drag & drop state for moving players between teams and from the fixed players pool
  const [dragOverTeam, setDragOverTeam] = useState<TeamId | null>(null);
  const [draggingItem, setDraggingItem] = useState<{
    type: 'team-player' | 'fixed-player' | 'new-player';
    id?: string;
    name: string;
  } | null>(null);
  const [newCustomName, setNewCustomName] = useState('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [baseOrigin, setBaseOrigin] = useState(() =>
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

  const [theme, setTheme] = useState(() =>
    !room.theme ||
    room.theme === 'Futebol Brasileiro, Filmes e Cultura Pop' ||
    room.theme === 'Animais e Vida Selvagem' ||
    (room.activeGame !== 'perguntas-e-verdades' && room.theme === 'O Jogo do Diabo: Perguntas e Verdades')
      ? 'Geral'
      : room.theme
  );
  const [difficulty, setDifficulty] = useState<GameDifficulty>(
    room.difficulty || room.customConfig?.difficulty || 'dificil'
  );
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(
    room.connectionMode || room.customConfig?.connectionMode || 'local'
  );
  const [timer, setTimer] = useState(room.timerConfig ?? 60);
  const [rounds, setRounds] = useState(() => {
    if (room.activeGame === 'perguntas-e-verdades') {
      return room.maxRounds && [1, 3, 5, 7, 9].includes(room.maxRounds) ? room.maxRounds : 3;
    }
    // aceita tambem o numero de rodadas do preset do programa (ex.: 9 no Duvido)
    const showRounds = getRulesetPreset(room.activeGame, 'show')?.rounds;
    return room.maxRounds && ([3, 5, 7, 10].includes(room.maxRounds) || room.maxRounds === showRounds) ? room.maxRounds : 5;
  });
  const [customConfig, setCustomConfig] = useState<GameCustomConfig>({
    ...DEFAULT_GAME_CUSTOM_CONFIG,
    ...(room.customConfig || {}),
    autoRandomSubtheme: true
  });

  const [showMissingPlayersWarning, setShowMissingPlayersWarning] = useState(false);
  // UX-03: limites de jogadores por jogo (GAME_LIMITS)
  const playerCountCheck = validatePlayerCount(room.activeGame, room.players.length);
  const playerLimitBlocked = !playerCountCheck.ok && playerCountCheck.reason === 'too-many';
  const [dynamicThemes, setDynamicThemes] = useState<string[]>(PRESET_THEMES);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);

  // Warm the AI round cache as soon as the host selects or types a theme
  useEffect(() => {
    if (!room.activeGame || usesLocalContent(room.activeGame)) return;
    const clean = theme.trim();
    if (clean.length < 3) return;
    const timeoutId = window.setTimeout(() => {
      prefetchRoundsForTheme(
        room.activeGame!,
        clean,
        {
          ...customConfig,
          difficulty,
          connectionMode
        },
        difficulty
      );
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [room.activeGame, theme, customConfig, difficulty, connectionMode]);

  const getGameTitle = (id: GameId | null) => {
    switch (id) {
      case 'limite':
        return 'JOGO DO LIMITE';
      case 'duvido':
        return 'JOGO DO DUVIDO';
      case 'proibido':
        return 'JOGO DO PROIBIDO';
      case 'nota':
        return 'JOGO DA NOTA';
      case 'tem-ou-nao-tem':
        return 'TEM OU NÃO TEM';
      case 'perguntas-e-verdades':
        return 'PERGUNTAS E VERDADES';
      case 'mimica':
        return 'JOGO DA MÍMICA';
      case 'quem-sou-eu':
        return 'QUEM SOU EU';
      case 'mega-resenha':
        return 'MEGA RESENHA';
      case 'repetente':
        return 'REPETENTE';
      case 'respostas-sem-perguntas':
        return 'RESPOSTAS SEM PERGUNTAS';
      case 'estadios':
        return 'ESTÁDIOS';
      case 'como-eu-pinto':
        return 'COMO EU PINTO';
      case 'onde-estou':
        return 'ONDE ESTOU';
      case 'com-terra':
        return 'COM TERRA';
      default:
        return 'RODA DE BOBO';
    }
  };

  const isIndividualMode =
    room.activeGame === 'nota' ||
    room.activeGame === 'limite' ||
    room.activeGame === 'quem-sou-eu' ||
    room.activeGame === 'onde-estou' ||
    room.activeGame === 'respostas-sem-perguntas' ||
    room.activeGame === 'estadios' ||
    room.activeGame === 'com-terra' ||
    room.activeGame === 'perguntas-e-verdades';

  const effectiveTeamCount = getTeamCount(room, customConfig.teamCount);

  const handleRollRandomCentralTheme = useCallback(() => {
    sounds.playPowerup();
    const pool = Array.from(new Set([...dynamicThemes, ...RANDOM_ROULETTE_THEMES]));
    const candidates = pool.filter((t) => t !== theme);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (picked) setTheme(picked);
  }, [dynamicThemes, theme]);

  const handleGenerateAiThemes = useCallback(async () => {
    if (isGeneratingThemes) return;
    sounds.playPowerup();
    setIsGeneratingThemes(true);
    try {
      const generated = await generateNewThemesWithAI(dynamicThemes);
      if (Array.isArray(generated) && generated.length > 0) {
        const merged = Array.from(
          new Set(['Geral', ...generated, ...PRESET_THEMES.slice(1)])
        );
        setDynamicThemes(merged);
        setTheme(generated[0] || 'Geral');
      }
    } finally {
      setIsGeneratingThemes(false);
    }
  }, [isGeneratingThemes, dynamicThemes]);

  const handleFallbackShuffleTeams = useCallback(() => {
    if (onShuffleTeams) {
      onShuffleTeams();
      return;
    }
    const activeIds = getActiveTeamIds(room, effectiveTeamCount);
    const shuffled = [...room.players].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, idx) => {
      const targetTeam: TeamId = activeIds[idx % activeIds.length];
      if (p.team !== targetTeam) {
        onSwitchPlayerTeam(p.id, targetTeam);
      }
    });
  }, [onShuffleTeams, room.players, room, effectiveTeamCount, onSwitchPlayerTeam]);

  const handleSetTeamCountBoth = useCallback(
    (nextCount: 2 | 3 | 4) => {
      setCustomConfig((prev) => ({ ...prev, teamCount: nextCount }));
      onChangeTeamCount?.(nextCount);
    },
    [onChangeTeamCount]
  );

  // Drag & drop drop handler that moves players across teams and prevents duplication
  const handleDropOnTeam = useCallback(
    (e: React.DragEvent, targetTeam: TeamId) => {
      e.preventDefault();
      setDragOverTeam(null);
      setDraggingItem(null);

      let payload: any = null;
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) payload = JSON.parse(raw);
      } catch (err) {
        // ignore invalid json
      }

      if (!payload) return;

      // 1. Moving an existing player from inside a team card
      if (payload.type === 'team-player' && payload.playerId) {
        const existing = room.players.find((p) => p.id === payload.playerId);
        if (existing) {
          if (existing.team !== targetTeam) {
            sounds.playSuccess();
            onSwitchPlayerTeam(existing.id, targetTeam);
          }
          return;
        }
      }

      // 2. Fixed player or new custom player
      const cleanName = (payload.name || '').trim();
      if (!cleanName) return;

      // CRITICAL: Prevent duplicate player bug!
      // If player with same fixedPlayerId, fix-id or name already exists in room,
      // move that player to targetTeam instead of adding a duplicate!
      const existingMatch = room.players.find(
        (p) =>
          (payload.fixedPlayerId &&
            (p.fixedPlayerId === payload.fixedPlayerId || p.id === `fix-${payload.fixedPlayerId}`)) ||
          p.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      if (existingMatch) {
        // Player is already in the room! Move them to targetTeam!
        if (existingMatch.team !== targetTeam) {
          sounds.playSuccess();
          onSwitchPlayerTeam(existingMatch.id, targetTeam);
        }
      } else {
        // Brand new player to the room: add them directly to targetTeam!
        sounds.playPowerup();
        const isFixed = Boolean(payload.fixedPlayerId);
        const avatar =
          payload.avatar ||
          resolvePlayerAvatar({
            name: cleanName,
            playerId: payload.fixedPlayerId ? `fix-${payload.fixedPlayerId}` : undefined,
            fixedPlayerId: payload.fixedPlayerId,
            fixedDefaultAvatar: payload.avatar
          });
        onAddPlayer({
          id: payload.fixedPlayerId ? `fix-${payload.fixedPlayerId}` : undefined,
          name: cleanName,
          avatar,
          color: payload.color || '#17B8B8',
          team: targetTeam,
          isFixedPlayer: isFixed,
          fixedPlayerId: payload.fixedPlayerId
        });
        if (payload.type === 'new-player') {
          setNewCustomName('');
        }
      }
    },
    [room.players, onSwitchPlayerTeam, onAddPlayer]
  );

  const handleAddCustomPlayerDirect = useCallback(
    (targetTeam: TeamId = 'A') => {
      const clean = newCustomName.trim();
      if (!clean) return;
      const existingMatch = room.players.find(
        (p) => p.name.trim().toLowerCase() === clean.toLowerCase()
      );
      if (existingMatch) {
        sounds.playSuccess();
        if (existingMatch.team !== targetTeam) {
          onSwitchPlayerTeam(existingMatch.id, targetTeam);
        }
      } else {
        sounds.playPowerup();
        onAddPlayer({
          name: clean,
          avatar: resolvePlayerAvatar({ name: clean }),
          color: '#17B8B8',
          team: targetTeam,
          isFixedPlayer: false
        });
      }
      setNewCustomName('');
    },
    [newCustomName, room.players, onSwitchPlayerTeam, onAddPlayer]
  );

  const handleProceedToStep5Tutorial = useCallback(() => {
    if (room.players.length < 2) {
      sounds.playBuzzer();
      setShowMissingPlayersWarning(true);
      return;
    }
    if (playerLimitBlocked) {
      sounds.playBuzzer();
      return;
    }
    const cleanTheme =
      room.activeGame === 'perguntas-e-verdades'
        ? 'O Jogo do Diabo: Perguntas e Verdades'
        : theme.trim() || 'Geral';

    onGoToRules({
      theme: cleanTheme,
      timer,
      rounds,
      difficulty,
      connectionMode,
      customConfig: {
        ...customConfig,
        difficulty,
        connectionMode,
        autoRandomSubtheme: true
      }
    });
  }, [
    room.players.length,
    playerLimitBlocked,
    room.activeGame,
    theme,
    timer,
    rounds,
    difficulty,
    connectionMode,
    customConfig,
    onGoToRules
  ]);

  const handleStartGameDirectly = useCallback(() => {
    if (room.players.length < 2) {
      sounds.playBuzzer();
      setShowMissingPlayersWarning(true);
      return;
    }
    if (playerLimitBlocked) {
      sounds.playBuzzer();
      return;
    }
    const cleanTheme =
      room.activeGame === 'perguntas-e-verdades'
        ? 'O Jogo do Diabo: Perguntas e Verdades'
        : theme.trim() || 'Geral';

    onStartDirectly({
      theme: cleanTheme,
      timer,
      rounds,
      difficulty,
      connectionMode,
      customConfig: {
        ...customConfig,
        difficulty,
        connectionMode,
        autoRandomSubtheme: true
      }
    });
  }, [
    room.players.length,
    playerLimitBlocked,
    room.activeGame,
    theme,
    timer,
    rounds,
    difficulty,
    connectionMode,
    customConfig,
    onStartDirectly
  ]);

  return (
    <div className="rdb-wide mx-auto w-full relative h-full flex flex-col justify-between min-h-0 gap-1.5 overflow-hidden py-0">
      {/* SUB-HEADER COMPACTO DO JOGO COM BADGES DE STATUS */}
      <div className="py-1.5 px-3 flex flex-wrap items-center justify-between border-b border-rose-500/40 gap-2 shrink-0 bg-[#07080d]">
        <div className="flex items-center gap-2 flex-wrap">
          {setupStage === 'teams' && (
            <span className="font-anton text-lg md:text-2xl text-[#F5F2EB] tracking-wider uppercase leading-none">
              {getGameTitle(room.activeGame)}
            </span>
          )}
          <span
            data-testid="setup-mode-badge"
            hidden={setupStage !== 'teams'}
            className={`px-2 py-0.5 border font-mono-code text-[10px] font-bold uppercase ${
              isIndividualMode
                ? 'border-amber-400 bg-amber-950/80 text-amber-300'
                : 'border-cyan-400 bg-cyan-950/80 text-cyan-300'
            }`}
          >
            {isIndividualMode
              ? 'INDIVIDUAL'
              : 'EM EQUIPES'}
          </span>
          <span
            data-testid="setup-connection-badge"
            className="px-2 py-0.5 border border-slate-700 bg-black/80 text-slate-300 font-mono-code text-[10px] font-bold uppercase"
          >
            {connectionMode === 'local'
              ? 'MODO LOCAL'
              : connectionMode === 'host'
              ? `TV + CELULARES #${room.roomId}`
              : `SÓ CELULARES #${room.roomId}`}
          </span>
        </div>

        {/* Navegação entre Etapa 1 (Configurações) e Etapa 2 (Jogadores/Equipes) */}
        <div className="flex items-center gap-1.5 font-mono-code text-[11px] font-bold uppercase">
          <button
            type="button"
            data-testid="setup-stage-config-tab"
            onClick={() => {
              sounds.playTick();
              setSetupStage('config');
            }}
            className={`px-3 py-1 border flex items-center gap-1.5 cursor-pointer transition-colors ${
              setupStage === 'config'
                ? 'border-cyan-400 bg-cyan-400 text-black shadow-neon-cyan font-black'
                : 'border-slate-700 bg-black/60 text-slate-400 hover:border-slate-500 hover:text-white'
            }`}
          >
            <span>1. CONFIGURAÇÕES</span>
          </button>

          <button
            type="button"
            data-testid="setup-stage-teams-tab"
            onClick={() => {
              sounds.playTick();
              setSetupStage('teams');
            }}
            className={`px-3 py-1 border flex items-center gap-1.5 cursor-pointer transition-colors ${
              setupStage === 'teams'
                ? 'border-cyan-400 bg-cyan-400 text-black shadow-neon-cyan font-black'
                : 'border-slate-700 bg-black/60 text-slate-400 hover:border-slate-500 hover:text-white'
            }`}
          >
            {isIndividualMode ? <User size={12} /> : <Users size={12} />}
            <span>
              {isIndividualMode
                ? `2. JOGADORES (${room.players.length})`
                : `2. EQUIPES (${effectiveTeamCount})`}
            </span>
          </button>
        </div>
      </div>

      {/* UX-03: excesso de jogadores bloqueia o início; sobra de jogadores só avisa */}
      {!playerCountCheck.ok && playerCountCheck.reason === 'too-many' && (
        <div
          data-testid="setup-too-many-players-banner"
          className="px-3 py-1.5 bg-rose-950 border border-rose-500 text-rose-200 font-mono-code text-xs"
        >
          ⚠️ {playerCountCheck.message}
        </div>
      )}
      {playerCountCheck.ok && playerCountCheck.warning && (
        <div
          data-testid="setup-players-notice-banner"
          className="px-3 py-1.5 bg-amber-950/60 border border-amber-500/60 text-amber-200 font-mono-code text-xs"
        >
          ℹ️ {playerCountCheck.warning}
        </div>
      )}

      {/* AVISO DE JOGADORES INSUFICIENTES (SE HOUVER) */}
      {showMissingPlayersWarning && room.players.length < 2 && (
        <div
          data-testid="setup-missing-players-banner"
          className="px-3 py-1.5 bg-rose-950 border border-rose-500 text-rose-200 font-mono-code text-xs flex items-center justify-between"
        >
          <span>⚠️ Mínimo de 2 jogadores necessários para iniciar a partida!</span>
          <button
            type="button"
            onClick={() => setShowMissingPlayersWarning(false)}
            className="text-white uppercase font-bold underline text-[10px]"
          >
            Fechar
          </button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL: CONFIGURAÇÃO DO JOGO (ETAPA 1) OU DEFINIÇÃO DE JOGADORES / EQUIPES (ETAPA 2) */}
      {setupStage === 'teams' ? (
        <div
          data-testid="setup-teams-stage-container"
          className="flex-1 min-h-0 flex flex-col justify-between gap-2.5 overflow-y-auto md:overflow-hidden p-1"
        >
          {isIndividualMode ? <SetupTeamsStageView room={room} onSetStartingPlayer={onSetStartingPlayer} setIsQrModalOpen={setIsQrModalOpen} newCustomName={newCustomName} setNewCustomName={setNewCustomName} handleAddCustomPlayerDirect={handleAddCustomPlayerDirect} onRemovePlayer={onRemovePlayer} onAddPlayer={onAddPlayer} /> : <SetupPlayersStageView effectiveTeamCount={effectiveTeamCount} room={room} handleSetTeamCountBoth={handleSetTeamCountBoth} handleFallbackShuffleTeams={handleFallbackShuffleTeams} onSetStartingPlayer={onSetStartingPlayer} setIsQrModalOpen={setIsQrModalOpen} setDraggingItem={setDraggingItem} setDragOverTeam={setDragOverTeam} newCustomName={newCustomName} setNewCustomName={setNewCustomName} handleAddCustomPlayerDirect={handleAddCustomPlayerDirect} dragOverTeam={dragOverTeam} handleDropOnTeam={handleDropOnTeam} draggingItem={draggingItem} onRemovePlayer={onRemovePlayer} />}

          {/* Barra de Ações Inferior para a Etapa de Equipes */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              data-testid="teams-back-to-config-btn"
              onClick={() => {
                sounds.playFlip();
                setSetupStage('config');
              }}
              className="px-4 py-2.5 border border-slate-700 bg-black/60 hover:border-slate-500 text-slate-300 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>VOLTAR ÀS CONFIGURAÇÕES</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="teams-go-to-rules-btn"
                onClick={() => {
                  sounds.playTick();
                  handleProceedToStep5Tutorial();
                }}
                className="px-4 py-2.5 border border-cyan-400 bg-cyan-500/20 hover:bg-cyan-400 hover:text-black text-cyan-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer font-bold"
              >
                <BookOpen size={15} />
                <span>REGRAS & TUTORIAL</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                data-testid="teams-start-game-btn"
                onClick={() => {
                  sounds.playPowerup();
                  handleStartGameDirectly();
                }}
                style={{ backgroundColor: '#E6194B', color: '#FFFFFF' }}
                className="px-6 py-2.5 bg-[#E6194B] hover:bg-rose-500 active:bg-rose-700 text-white font-anton font-black text-sm md:text-base uppercase tracking-wider shadow-[0_0_20px_rgba(230,25,75,0.55)] border border-rose-400/80 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <Play size={16} className="fill-white text-white" />
                <span className="text-white font-black">INICIAR JOGO AGORA</span>
                <ArrowRight size={18} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Step2ConfigureGame
          activeGame={room.activeGame || 'limite'}
          theme={theme}
          onChangeTheme={setTheme}
          dynamicThemes={dynamicThemes}
          isGeneratingThemes={isGeneratingThemes}
          onGenerateAiThemes={handleGenerateAiThemes}
          onRollRandomTheme={handleRollRandomCentralTheme}
          difficulty={difficulty}
          onChangeDifficulty={(nextDiff) => {
            setDifficulty(nextDiff);
            setCustomConfig((prev) => ({ ...prev, difficulty: nextDiff }));
          }}
          timer={timer}
          onChangeTimer={setTimer}
          rounds={rounds}
          onChangeRounds={setRounds}
          customConfig={customConfig}
          onChangeCustomConfig={(updater) => {
            setCustomConfig((prev) => {
              const next = typeof updater === 'function' ? updater(prev) : updater;
              if (next.teamCount && next.teamCount !== prev.teamCount) {
                onChangeTeamCount?.(next.teamCount);
              }
              return next;
            });
          }}
          onProceedToTeams={() => {
            sounds.playTick();
            setSetupStage('teams');
          }}
          onStartDirectly={handleStartGameDirectly}
          onGoToRules={handleProceedToStep5Tutorial}
          onBackToLobby={onBack}
          connectedPlayersCount={room.players.length}
          connectionMode={connectionMode}
          gameTitle={getGameTitle(room.activeGame)}
        />
      )}

      {/* Modal Dedicado de Conexão Mobile via QR Code na Tela de Equipes */}
      {isQrModalOpen && (
        <div
          data-testid="setup-qr-modal-backdrop"
          onClick={() => setIsQrModalOpen(false)}
          className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            data-testid="setup-qr-modal"
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full bg-[#07080d] border-2 border-rose-500/80 p-5 sm:p-6 relative shadow-[0_0_40px_rgba(230,25,75,0.4)] space-y-4 text-center text-[#F5F2EB]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-300 font-anton text-base sm:text-lg uppercase tracking-wider">
                <Smartphone size={18} className="text-rose-400" />
                <span>ENTRAR NA PARTIDA PELO CELULAR</span>
              </div>
              <button
                type="button"
                data-testid="setup-qr-modal-close-btn"
                onClick={() => setIsQrModalOpen(false)}
                className="min-w-[36px] min-h-[36px] bg-[#E6194B] hover:bg-rose-500 text-white font-mono-code text-xs font-bold uppercase flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 py-1">
              <div className="flex justify-center">
                <DynamicQRCode url={playUrl} size={210} />
              </div>

              <div className="space-y-1.5 text-left bg-black/60 border border-white/10 p-3 rounded">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono-code text-slate-400">CÓDIGO DA SALA:</span>
                  <span className="font-mono-code text-base font-black text-rose-300 tracking-wider">
                    #{room.roomId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono-code text-slate-400">MODO ATUAL:</span>
                  <span className="text-xs font-anton text-cyan-300 uppercase">
                    {room.connectionMode === 'host'
                      ? '📺 TV HOST + CONTROLES'
                      : room.connectionMode === 'multi'
                      ? '📱 100% MOBILE'
                      : '🖥️ LOCAL'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono-code text-slate-400">JOGADORES CONECTADOS:</span>
                  <span className="text-xs font-mono-code font-bold text-emerald-400">
                    👥 {room.players.length} participante(s)
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 font-mono-code leading-relaxed">
                Aponte a câmera do seu smartphone para o QR Code acima. Digite seu nome e escolha seu avatar para entrar automaticamente nesta partida e cair nas equipes!
              </p>

              <p className="font-mono-code text-[11px] text-[#17B8B8] font-bold break-all bg-white/[0.03] p-2 border border-white/10 select-all">
                {playUrl}
              </p>

              <button
                type="button"
                onClick={handleCopyPlayUrl}
                className="w-full py-2 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer font-bold"
              >
                {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedUrl ? 'LINK COPIADO!' : 'COPIAR LINK DA SALA'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2 border border-slate-700 bg-white/[0.04] hover:bg-white/10 text-slate-300 font-anton text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              CONCLUÍDO / VOLTAR ÀS EQUIPES
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
