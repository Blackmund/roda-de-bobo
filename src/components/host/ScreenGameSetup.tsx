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
    return room.maxRounds && [3, 5, 7, 10].includes(room.maxRounds) ? room.maxRounds : 5;
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
      default:
        return 'RODA DE BOBO';
    }
  };

  const isIndividualMode =
    room.activeGame === 'nota' ||
    room.activeGame === 'limite' ||
    room.activeGame === 'quem-sou-eu' ||
    room.activeGame === 'respostas-sem-perguntas' ||
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
    <div className="max-w-6xl mx-auto w-full relative h-full flex flex-col justify-between min-h-0 gap-1.5 overflow-hidden py-0">
      {/* SUB-HEADER COMPACTO DO JOGO COM BADGES DE STATUS */}
      <div className="py-1.5 px-3 flex flex-wrap items-center justify-between border-b border-rose-500/40 gap-2 shrink-0 bg-[#07080d]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-anton text-lg md:text-2xl text-[#F5F2EB] tracking-wider uppercase leading-none">
            {getGameTitle(room.activeGame)}
          </span>
          <span
            data-testid="setup-mode-badge"
            className={`px-2 py-0.5 border font-mono-code text-[10px] font-bold uppercase ${
              isIndividualMode
                ? 'border-amber-400 bg-amber-950/80 text-amber-300'
                : 'border-cyan-400 bg-cyan-950/80 text-cyan-300'
            }`}
          >
            {isIndividualMode
              ? '👤 MODALIDADE INDIVIDUAL (CADA UM POR SI)'
              : '👥 MODALIDADE EM EQUIPES'}
          </span>
          <span
            data-testid="setup-connection-badge"
            className="px-2 py-0.5 border border-slate-700 bg-black/80 text-slate-300 font-mono-code text-[10px] font-bold uppercase"
          >
            {connectionMode === 'local'
              ? '🖥️ MODO LOCAL'
              : connectionMode === 'host'
              ? `📺 TV + CELULARES #${room.roomId}`
              : `📱 100% MOBILE #${room.roomId}`}
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
          {isIndividualMode ? (
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
                      {room.players.find((p) => p.id === room.startingPlayerId)?.avatar}{' '}
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
                        <span className="text-sm shrink-0">{fp.avatar}</span>
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
                              {player.avatar || '👤'}
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
          ) : (
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
                      {room.players.find((p) => p.id === room.startingPlayerId)?.avatar}{' '}
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
                        <span className="text-sm shrink-0">{fp.avatar}</span>
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
                                  <span className="text-xl shrink-0">{player.avatar || '🕹️'}</span>
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
          )}

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
