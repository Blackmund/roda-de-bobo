import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameRoom, GameId, VisualTheme, TeamId } from '../../types/game';
import { isCazeFamily, themeBadge } from '../../utils/themeUtils';
import { CazeArt } from '../RodaIcons';
import {
  TEAM_META,
  getActiveTeamIds,
  getTeamCount,
  cyclePlayerTeamId
} from '../../utils/teamUtils';
import { DynamicQRCode } from '../DynamicQRCode';
import { GlobalStats } from '../GlobalStats';
import { sounds } from '../../utils/soundEffects';
import {
  LimiteArcadeArt,
  TelefoneSemFioBoyArt,
  ProibidoSirenArt,
  NotaCardArt,
  TemOuNaoTemBoardArt,
  PerguntasEVerdadesArt,
  GarticBicycleArt,
  RodaDeBoboOfficialBadge,
  RetroPointerCursor
} from '../RodaIcons';
import {
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Shield,
  Users,
  Play,
  Crown,
  Sparkles,
  Smartphone,
  RotateCcw,
  X,
  Star,
  UserPlus,
  Trash2,
  ChevronDown,
  Settings,
  Shuffle,
  KeyRound
} from 'lucide-react';
import { motion } from 'motion/react';
import { FIXED_PLAYERS, FixedPlayerDefinition, isFixedPlayer } from '../../utils/fixedPlayers';
import { clearUsedRoundSignatures } from '../../utils/aiGameGenerator';
import { computePlayerSessionTrophies } from '../../utils/sessionPersistence';
import { resolvePublicShareOrigin } from '../../utils/multiplayerRoomEngine';
import { RetroAvatarPicker, RetroAvatarModal } from '../RetroAvatarPicker';
import { QRCodeModal } from '../QRCodeModal';
import { PlayersManagerModal } from '../PlayersManagerModal';
import {
  loadLastSelectedAvatar,
  resolvePlayerAvatar,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from '../../utils/retroAvatars';

interface ScreenLobbyProps {
  room: GameRoom;
  isTvMode?: boolean;
  resumableRoom?: GameRoom | null;
  onResumeGame?: () => void;
  onDismissResume?: () => void;
  onSelectGame: (gameId: GameId) => void;
  onSwitchPlayerTeam: (playerId: string, explicitTeam?: TeamId) => void;
  onChangeTeamCount?: (count: 2 | 3 | 4) => void;
  onAddPlayer?: (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    team?: TeamId;
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => void;
  onUpdatePlayerAvatar?: (playerId: string, avatar: string) => void;
  onRemovePlayer?: (playerId: string) => void;
  onResetStats?: () => void;
  onSwitchToControllerMode?: () => void;
  onPingPlayer?: (playerId: string) => void;
  onRegenerateRoomCode?: () => void;
  visualTheme?: VisualTheme;
  onSetVisualTheme?: (theme: VisualTheme) => void;
  activeSpotlightStep?: 1 | 2 | 3 | 4 | null;
  onOpenJoinRoomModal?: () => void;
  onGoToModeSelect?: () => void;
}

const GAME_TITLES: Record<GameId, string> = {
  limite: 'JOGO DO LIMITE',
  duvido: 'JOGO DO DUVIDO',
  proibido: 'JOGO DO PROIBIDO',
  nota: 'JOGO DA NOTA',
  'tem-ou-nao-tem': 'TEM OU NÃO TEM',
  'perguntas-e-verdades': 'PERGUNTAS E VERDADES'
};

const GAMES: Array<{
  id: GameId;
  name: string;
  tagline: string;
  badge: string;
  color: string;
  renderArt: (className?: string) => React.ReactNode;
}> = [
  {
    id: 'limite',
    name: 'JOGO DO LIMITE',
    tagline: 'QUEM CHEGAR MAIS PERTO SEM ESTOURAR',
    badge: 'INDIVIDUAL',
    color: '#FF6B00',
    renderArt: (cls) => (
      <LimiteArcadeArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'duvido',
    name: 'JOGO DO DUVIDO',
    tagline: 'LEILÃO DE BLEFE E MEMÓRIA EM EQUIPES',
    badge: 'EM EQUIPE',
    color: '#FF1E56',
    renderArt: (cls) => (
      <TelefoneSemFioBoyArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'proibido',
    name: 'JOGO DO PROIBIDO',
    tagline: 'FALE A PALAVRA-ALVO SEM AS 5 PROIBIDAS',
    badge: 'EM EQUIPE',
    color: '#17B8B8',
    renderArt: (cls) => (
      <ProibidoSirenArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'nota',
    name: 'JOGO DA NOTA',
    tagline: 'DESCUBRA A NOTA SECRETA DO NARRADOR',
    badge: 'INDIVIDUAL',
    color: '#9D00FF',
    renderArt: (cls) => (
      <NotaCardArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'tem-ou-nao-tem',
    name: 'TEM OU NÃO TEM',
    tagline: 'O TOP 5 A TOP 10 DAS PESQUISAS',
    badge: 'EM EQUIPE',
    color: '#00E5FF',
    renderArt: (cls) => (
      <TemOuNaoTemBoardArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'perguntas-e-verdades',
    name: 'PERGUNTAS E VERDADES',
    tagline: '8 CARTAS SECRETAS, LEILÃO DE TOKENS E 11 PERGUNTAS',
    badge: '2 A 6 JOGADORES',
    color: '#FF1E56',
    renderArt: (cls) => (
      <PerguntasEVerdadesArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  }
];

const ScreenLobbyComponent: React.FC<ScreenLobbyProps> = ({
  room,
  isTvMode = false,
  resumableRoom,
  onResumeGame,
  onDismissResume,
  onSelectGame,
  onSwitchPlayerTeam,
  onChangeTeamCount,
  onAddPlayer,
  onRemovePlayer,
  onUpdatePlayerAvatar,
  onResetStats,
  onSwitchToControllerMode,
  onPingPlayer,
  onRegenerateRoomCode,
  visualTheme = 'neon',
  onSetVisualTheme,
  activeSpotlightStep = null,
  onOpenJoinRoomModal,
  onGoToModeSelect
}) => {
  const [copied, setCopied] = useState(false);
  const [hoveredGame, setHoveredGame] = useState<GameId | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestTeam, setGuestTeam] = useState<TeamId>('A');
  const activeTeamIds = getActiveTeamIds(room);
  const currentTeamCount = getTeamCount(room);
  const [selectedGuestAvatar, setSelectedGuestAvatar] = useState<string>(() =>
    loadLastSelectedAvatar('👾')
  );
  const [isGuestAvatarModalOpen, setIsGuestAvatarModalOpen] = useState(false);
  const [editingAvatarPlayerId, setEditingAvatarPlayerId] = useState<string | null>(null);
  const [showModalAvatarCatalog, setShowModalAvatarCatalog] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [usePublicSharedUrl, setUsePublicSharedUrl] = useState(true);

  const [activeModal, setActiveModal] = useState<'qr' | 'players' | 'history' | 'config' | null>(null);
  const [aiStatusLabel, setAiStatusLabel] = useState<string>(
    '🟢 IA Gemini Conectada (Gerando temas em tempo real)'
  );
  const [clearedMemoryNotice, setClearedMemoryNotice] = useState(false);
  const editingPlayer = room.players.find((p) => p.id === editingAvatarPlayerId) || null;

  useEffect(() => {
    fetch('/api/ai-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.statusLabel) {
          setAiStatusLabel(json.statusLabel);
        }
      })
      .catch(() => {
        // Keep default connected status badge
      });
  }, []);

  useEffect(() => {
    const handleOpenLobbyModal = (e: Event) => {
      const customEvent = e as CustomEvent<'qr' | 'players' | 'history' | 'config'>;
      if (customEvent.detail) {
        setActiveModal((prev) => (prev === customEvent.detail ? null : customEvent.detail));
      }
    };
    window.addEventListener('rb:open-lobby-modal', handleOpenLobbyModal);
    return () => window.removeEventListener('rb:open-lobby-modal', handleOpenLobbyModal);
  }, []);

  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  const baseOrigin = resolvePublicShareOrigin(window.location.origin);
  const playUrl = `${baseOrigin}/?join=${room.roomId}&role=client`;

  const handleCopy = () => {
    navigator.clipboard.writeText(playUrl);
    setCopied(true);
    sounds.playSuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGameClick = (gameId: GameId) => {
    sounds.playPowerup();
    onSelectGame(gameId);
  };

  const handleSurpriseRoulette = () => {
    const allGames: GameId[] = [
      'limite',
      'duvido',
      'proibido',
      'nota',
      'tem-ou-nao-tem',
      'perguntas-e-verdades'
    ];
    const randomChoice = allGames[Math.floor(Math.random() * allGames.length)];
    handleGameClick(randomChoice);
  };

  const handleToggleSuggestedPlayer = (fp: FixedPlayerDefinition) => {
    setDuplicateError(null);
    const existing = room.players.find(
      (p) =>
        (p.fixedPlayerId && p.fixedPlayerId === fp.id) ||
        p.name.trim().toLowerCase() === fp.name.trim().toLowerCase()
    );
    if (existing) {
      if (onRemovePlayer) {
        sounds.playFlip();
        onRemovePlayer(existing.id);
      }
    } else if (onAddPlayer) {
      sounds.playSuccess();
      const resolvedAvatar = resolvePlayerAvatar({
        playerId: `fix-${fp.id}`,
        playerName: fp.name,
        fixedPlayerId: fp.id,
        fallbackAvatar: fp.avatar
      });
      onAddPlayer({
        id: `fix-${fp.id}`,
        name: fp.name,
        avatar: resolvedAvatar,
        color: fp.color,
        team: fp.defaultTeam,
        isFixedPlayer: true,
        fixedPlayerId: fp.id
      });
    }
  };

  const handleAddCustomGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed || !onAddPlayer) return;
    const isDup = room.players.some(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDup) {
      sounds.playBuzzer();
      setDuplicateError('Já existe um jogador com este nome na sala');
      return;
    }
    setDuplicateError(null);
    sounds.playSuccess();
    saveLastSelectedAvatar(selectedGuestAvatar);
    savePlayerAvatarPreference({
      playerName: trimmed,
      avatar: selectedGuestAvatar
    });
    onAddPlayer({
      name: trimmed,
      avatar: selectedGuestAvatar,
      team: guestTeam,
      isFixedPlayer: false
    });
    setGuestName('');
    setGuestTeam((prev) => cyclePlayerTeamId(prev, activeTeamIds));
  };

  const teamAPlayers = room.players.filter((p) => p.team === 'A');
  const teamBPlayers = room.players.filter((p) => p.team === 'B');
  const isLobbyReady = room.players.length >= 2;
  const sessionTrophies = computePlayerSessionTrophies(room);

  const handleShuffleLobbyTeams = () => {
    if (room.players.length < 2) return;
    sounds.playPowerup();
    const shuffled = [...room.players].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, idx) => {
      const targetTeam: TeamId = activeTeamIds[idx % activeTeamIds.length];
      if (p.team !== targetTeam) {
        onSwitchPlayerTeam(p.id, targetTeam);
      }
    });
  };

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col justify-between overflow-hidden relative">
      {/* Main Grid: Clean Full-Width 6 Game Cards Showcase */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 md:gap-4 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Games Container: Primary Full-Width Element of the Screen (12 cols) */}
        <div
          data-testid="lobby-games-container"
          className={`xl:col-span-12 flex-1 min-h-0 flex flex-col justify-start lg:justify-center py-1 gap-2.5 overflow-y-auto lg:overflow-hidden transition-all ${
            activeSpotlightStep === 1
              ? 'ring-2 ring-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.5)] rounded-xl p-1'
              : ''
          }`}
        >
          {/* Compact 1-Line Section Header with [ 🔑 ENTRAR EM UMA SALA (CÓDIGO) ] & Sortear Jogo Surpresa */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <Sparkles size={14} className="text-[#17B8B8] shrink-0" />
              <h2
                className={`font-anton text-sm md:text-base tracking-wider text-white uppercase truncate ${
                  visualTheme === 'neon' ? 'neon-text-cyan' : ''
                }`}
              >
                FLIPERAMA
              </h2>
              <span
                className={`hidden sm:inline text-[11px] font-mono-code text-[#17B8B8] font-semibold shrink-0 ${
                  visualTheme === 'neon' ? 'text-cyan-300' : ''
                }`}
              >
                · ESCOLHA UM DOS 6 JOGOS
              </span>

              <span
                data-testid="lobby-mode-badge"
                className="px-2 py-0.5 border border-cyan-500/40 bg-black/80 text-cyan-300 font-mono-code text-[10px] font-bold uppercase hidden md:inline-flex items-center gap-1"
              >
                {room.connectionMode === 'local'
                  ? '🖥️ LOCAL'
                  : room.connectionMode === 'host'
                  ? `📺 TV+CEL #${room.roomId}`
                  : `📱 MOBILE #${room.roomId}`}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {onGoToModeSelect && (
                <button
                  type="button"
                  data-testid="lobby-change-mode-btn"
                  onClick={() => {
                    sounds.playTick();
                    onGoToModeSelect();
                  }}
                  className="px-2.5 py-1 border border-slate-700 hover:border-cyan-400 bg-black/70 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-200 font-mono-code text-[11px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  title="Alterar modo de conexão ou jogadores da sala"
                >
                  <Settings size={12} className="text-cyan-400" />
                  <span>Modo / Jogadores ({room.players.length})</span>
                </button>
              )}

              {onOpenJoinRoomModal && (
                <button
                  type="button"
                  data-testid="lobby-join-room-code-btn"
                  onClick={() => {
                    sounds.playTick();
                    onOpenJoinRoomModal();
                  }}
                  className="px-3 py-1 border-2 border-cyan-400 bg-cyan-500/20 hover:bg-cyan-400 hover:text-black text-cyan-200 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                  title="Entrar em uma sala existente digitando o código de 6 dígitos"
                >
                  <KeyRound size={13} />
                  <span>ENTRAR NA SALA</span>
                </button>
              )}

              <button
                type="button"
                data-testid="lobby-surprise-roulette-btn"
                onClick={handleSurpriseRoulette}
                className="px-2.5 py-1 border border-amber-400 bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-300 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                title="Sortear Jogo Surpresa (Modo Roleta)"
              >
                <Sparkles size={12} className="text-amber-300" />
                <span>🎲 Sortear Jogo Surpresa</span>
              </button>
            </div>
          </div>

          {/* 6 Games Adaptive Grid: Protected Height (flex-1 min-h-0) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-3 lg:grid-rows-2 gap-3 md:gap-4 flex-1 min-h-0">
            {GAMES.map((game) => (
              <div
                key={game.id}
                data-testid={`lobby-game-card-${game.id}`}
                onClick={() => handleGameClick(game.id)}
                onMouseEnter={() => {
                  setHoveredGame(game.id);
                  sounds.playTick();
                }}
                onMouseLeave={() => setHoveredGame(null)}
                className={`group relative cursor-pointer transition-all duration-200 overflow-hidden flex flex-col justify-between [@media(max-height:700px)]:flex-row [@media(max-height:700px)]:items-center [@media(max-height:700px)]:justify-between [@media(max-height:700px)]:px-4 min-h-0 ${
                  visualTheme === 'original'
                  ? 'bg-[#0a0b1e] border-2 border-[#17B8B8] hover:border-[#E6194B] shadow-none rounded-none'
                  : visualTheme === 'cazetv'
                    ? 'bg-[#080b16] border-2 border-[#17B8B8] hover:border-[#E6194B] shadow-[4px_4px_0px_#000] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-0.5'
                    : visualTheme === 'neon'
                    ? 'bg-slate-950/90 border-2 border-cyan-500/40 hover:border-[#E6194B] hover:shadow-[0_0_24px_rgba(230,25,75,0.45)] shadow-lg'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-[#E6194B]'
                }`}
              >
                {/* Priority #3: Discrete Category Tag in Top-Right Corner */}
                <div
                  className="absolute top-2 right-2 text-[10px] [@media(max-height:700px)]:text-[9px] [@media(max-height:700px)]:top-1.5 [@media(max-height:700px)]:right-2 px-2.5 py-0.5 font-mono-code font-bold uppercase tracking-wider z-10 pointer-events-none bg-[#E6194B] text-white border border-rose-400/40 shadow-sm"
                >
                  {game.badge}
                </div>

                {/* Vertical Layout (Default when viewport height > 700px) */}
                <div className="flex flex-col justify-between w-full h-full min-h-0 [@media(max-height:700px)]:hidden">
                  {/* Priority #2: Illustration / Icon Area */}
                  {isCazeFamily(visualTheme) ? (
                    /* Modo CazéTV / Original: Ilustração em SVG vetorial animado com 2 layouts responsivos (compact / wide) */
                    <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-end relative overflow-hidden pt-1 px-1 pb-0">
                      <div className="flex-1 w-full min-h-0 flex items-end justify-center overflow-hidden">
                        <CazeArt
                          gameId={game.id}
                          mode="card"
                          className="w-full h-full max-h-full max-w-full select-none pointer-events-none"
                          fallback={game.renderArt('w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain')}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Outros Modos (Neon, Clean, etc.): Ícone centralizado na área disponível */
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                      <div className="flex-1 min-h-0 flex items-center justify-center max-h-full max-w-full overflow-hidden">
                        {game.renderArt(
                          'w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 max-h-full max-w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105 filter drop-shadow'
                        )}
                      </div>
                    </div>
                  )}

                  {/* Priority #1: Bottom Title Bar com animação de troca no Hover pelo Subtítulo/Legenda */}
                  <div
                    className={`shrink-0 w-full py-2.5 px-3 border-t-2 transition-colors duration-200 z-10 flex items-center justify-between gap-2 overflow-hidden ${
                      visualTheme === 'original'
                      ? 'bg-[#0a0b1e] border-[#17B8B8] group-hover:bg-[#E6194B] group-hover:border-[#E6194B]'
                      : visualTheme === 'cazetv'
                        ? 'bg-[#0c1020] border-[#17B8B8] group-hover:bg-[#E6194B] group-hover:border-[#E6194B]'
                        : 'bg-slate-950/95 border-cyan-400 group-hover:bg-[#E6194B] group-hover:border-[#E6194B]'
                    }`}
                  >
                    <div className="relative flex-1 h-7 overflow-hidden flex items-center justify-center">
                      {/* Nome do Jogo (sobe e sai no hover) */}
                      <span
                        className={`absolute inset-0 flex items-center justify-center font-anton font-black uppercase tracking-wider text-sm md:text-base lg:text-lg text-center truncate transition-all duration-300 transform group-hover:-translate-y-full group-hover:opacity-0 ${
                          visualTheme === 'original' ? 'text-[#17B8B8]' : 'text-[#F5F2EB]'
                        }`}
                      >
                        {game.name}
                      </span>
                      {/* Legenda do Jogo (sobe e entra no hover substituindo o nome) */}
                      <span
                        className="absolute inset-0 flex items-center justify-center font-anton font-bold uppercase tracking-wide text-xs md:text-sm text-white text-center px-1 line-clamp-1 transition-all duration-300 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                        title={game.tagline}
                      >
                        {game.tagline}
                      </span>
                    </div>
                    <Play
                      size={14}
                      className="text-cyan-300 fill-cyan-300 group-hover:text-white group-hover:fill-white shrink-0 transition-colors"
                    />
                  </div>
                </div>

                {/* Automatic Horizontal Compact Layout for Short Screens (@media (max-height: 700px)) */}
                <div className="hidden [@media(max-height:700px)]:flex flex-row items-center justify-between w-full h-full py-2 gap-3 min-h-0">
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center overflow-hidden">
                    {isCazeFamily(visualTheme) ? (
                      <CazeArt
                        gameId={game.id}
                        mode="icon"
                        className="w-14 h-14 max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                        fallback={game.renderArt('w-12 h-12 object-contain')}
                      />
                    ) : (
                      game.renderArt(
                        'w-12 h-12 max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
                      )
                    )}
                  </div>
                  <div className="relative text-left flex-1 min-w-0 ml-2 pr-2 h-10 overflow-hidden flex flex-col justify-center">
                    {/* Nome (sobe no hover) */}
                    <div className="font-anton font-black uppercase tracking-wider text-sm md:text-base text-cyan-300 group-hover:text-white truncate transition-all duration-300 group-hover:-translate-y-6 group-hover:opacity-0">
                      {game.name}
                    </div>
                    {/* Legenda (sobe para o lugar do nome no hover) */}
                    <div className="absolute inset-0 flex items-center font-anton font-bold text-xs uppercase text-white truncate transition-all duration-300 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                      {game.tagline}
                    </div>
                  </div>
                  <Play
                    size={16}
                    className="text-cyan-300 fill-cyan-300 group-hover:text-[#E6194B] group-hover:fill-[#E6194B] group-hover:scale-110 shrink-0 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clean Lobby: Sidebar removed from main screen so the 6 Game Cards have 100% spotlight */}
      </div>

      {/* STANDARDIZED TOP-LEVEL MODALS VIA PORTAL (z-[999], backdrop click & ESC close, 44x44px X button) */}
      {activeModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="lobby-modal-backdrop"
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              data-testid={`lobby-modal-${activeModal}`}
              onClick={(e) => e.stopPropagation()}
              className={`${
                activeModal === 'qr' || activeModal === 'players' || activeModal === 'history' ? 'max-w-4xl xl:max-w-5xl' : 'max-w-lg'
              } w-full max-h-[88dvh] overflow-y-auto bg-[#07080d] border border-[#17B8B8]/60 p-6 relative shadow-2xl space-y-4 text-[#F5F2EB]`}
            >
              {/* Modal Top Bar with Tabs & 44x44px [ X FECHAR ] */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveModal('qr')}
                    className={`px-2.5 py-1 font-anton text-xs uppercase tracking-wider cursor-pointer ${
                      activeModal === 'qr'
                        ? 'bg-[#17B8B8] text-black'
                        : 'bg-white/[0.04] text-[#17B8B8]'
                    }`}
                  >
                    📱 Conectar Celulares
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal('players')}
                    className={`px-2.5 py-1 font-anton text-xs uppercase tracking-wider cursor-pointer ${
                      activeModal === 'players'
                        ? 'bg-[#E6194B] text-white'
                        : 'bg-white/[0.04] text-rose-300'
                    }`}
                  >
                    👥 Jogadores ({room.players.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal('history')}
                    className={`px-2.5 py-1 font-anton text-xs uppercase tracking-wider cursor-pointer ${
                      activeModal === 'history'
                        ? 'bg-amber-400 text-black'
                        : 'bg-white/[0.04] text-amber-300'
                    }`}
                  >
                    📜 Histórico ({room.sessionStats.totalMatches})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModal('config')}
                    className={`px-2.5 py-1 font-anton text-xs uppercase tracking-wider cursor-pointer ${
                      activeModal === 'config'
                        ? 'bg-emerald-400 text-black'
                        : 'bg-white/[0.04] text-emerald-300'
                    }`}
                  >
                    ⚙️ Config
                  </button>
                </div>

                <button
                  type="button"
                  data-testid="lobby-modal-close-btn"
                  aria-label="Fechar modal"
                  onClick={() => setActiveModal(null)}
                  className="min-w-[44px] min-h-[44px] px-3 bg-[#E6194B] hover:bg-rose-500 text-white font-mono-code text-xs font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <X size={16} />
                  <span>[ X FECHAR ]</span>
                </button>
              </div>

              {activeModal === 'qr' && (
                <QRCodeModal
                  room={room}
                  playUrl={playUrl}
                  onPingPlayer={onPingPlayer}
                  onRegenerateRoomCode={onRegenerateRoomCode}
                />
              )}

              {activeModal === 'players' && (
                <PlayersManagerModal
                  room={room}
                  onAddPlayer={onAddPlayer}
                  onRemovePlayer={onRemovePlayer}
                  onOpenQrCode={() => setActiveModal('qr')}
                />
              )}

              {activeModal === 'history' && (
                <div>
                  <GlobalStats
                    stats={room.sessionStats}
                    teamAName={room.teams.A.name}
                    teamBName={room.teams.B.name}
                    players={room.players}
                    onResetStats={onResetStats}
                    defaultExpanded={true}
                  />
                </div>
              )}

              {activeModal === 'config' && (
                <div className="space-y-4">
                  {/* Theme Selector Section */}
                  <div className="bg-white/[0.03] border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-anton text-sm uppercase text-white flex items-center gap-2">
                          <Sparkles size={16} className="text-[#17B8B8]" />
                          <span>TEMA VISUAL DA INTERFACE</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                          Escolha entre Neon, Clean, Modo 2 (broadcast) e Modo 3 (Original CazéTV)
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                          visualTheme === 'neon'
                            ? 'bg-[#17B8B8] text-black shadow-neon-cyan'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {themeBadge(visualTheme)} ATIVO
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" data-theme-grid="4">
                      <button
                        type="button"
                        data-testid="lobby-config-theme-neon-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('neon');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          visualTheme === 'neon'
                            ? 'border-[#17B8B8] bg-[#17B8B8]/15 shadow-neon-cyan ring-1 ring-[#17B8B8]'
                            : 'border-white/10 bg-white/[0.02] hover:border-[#17B8B8]/60 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
                            <span>⚡ VERSÃO NEON</span>
                            <span className="text-[10px] font-mono-code bg-black/60 px-1.5 py-0.5 text-[#17B8B8]">PADRÃO</span>
                          </span>
                          {visualTheme === 'neon' && <Check size={16} className="text-[#17B8B8]" />}
                        </div>
                        <p className="text-[11px] font-mono-code text-slate-300 mt-2 leading-relaxed">
                          Estética Retro OS / Cyber Arcade: bordas neon brilhantes (Cyan/Rose), scanlines CRT de fliperama na TV e glow nos botões.
                        </p>
                      </button>

                      <button
                        type="button"
                        data-testid="lobby-config-theme-clean-btn"
                        onClick={() => {
                          sounds.playTick();
                          onSetVisualTheme?.('clean');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          visualTheme === 'clean'
                            ? 'border-white/40 bg-white/10 ring-1 ring-white/60'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-white flex items-center gap-1.5">
                            <span>🔲 VERSÃO CLEAN</span>
                            <span className="text-[10px] font-mono-code bg-white/10 px-1.5 py-0.5 text-slate-300">MINIMAL</span>
                          </span>
                          {visualTheme === 'clean' && <Check size={16} className="text-white" />}
                        </div>
                        <p className="text-[11px] font-mono-code text-slate-300 mt-2 leading-relaxed">
                          Visual moderno de estúdio: bordas finas sutis, tema escuro flat e sem efeito de scanlines.
                        </p>
                      </button>
                      {([['cazetv','📺 MODO 2','Broadcast CazéTV: navy, moldura crimson, cartelas de auditório.'],['original','🔴 MODO 3 · ORIGINAL','Réplica do Roda de Bobo original: janela retrô, logo oficial e ilustrações flat.']] as const).map(([tid, label, desc]) => (
                        <button
                          key={tid}
                          type="button"
                          data-testid={`lobby-config-theme-${tid}-btn`}
                          onClick={() => {
                            sounds.playPowerup();
                            onSetVisualTheme?.(tid);
                          }}
                          className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            visualTheme === tid
                              ? 'border-[#E6194B] bg-[#E6194B]/15 ring-1 ring-[#E6194B]'
                              : 'border-white/10 bg-white/[0.02] hover:border-[#E6194B]/60 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-anton text-sm uppercase tracking-wide text-rose-300">{label}</span>
                            {visualTheme === tid && <Check size={16} className="text-rose-300" />}
                          </div>
                          <p className="text-[11px] font-mono-code text-slate-300 mt-2 leading-relaxed">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border-l-4 border-emerald-400 p-4 space-y-2">
                    <div className="text-[10px] font-mono-code text-emerald-300 font-bold uppercase tracking-widest">
                      MOTOR GENERATIVO DE PERGUNTAS E TEMAS
                    </div>
                    <div
                      data-testid="config-ai-status-badge"
                      className="font-anton text-base md:text-lg text-white uppercase tracking-wide"
                    >
                      {aiStatusLabel}
                    </div>
                    <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                      Todas as perguntas do Jogo da Nota, Jogo do Duvido, Jogo do Limite, Jogo do Proibido e Tem ou Não Tem são geradas de forma limpa, curta e fiel ao tema escolhido (sem templates repetitivos).
                    </p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 p-4 space-y-3">
                    <div className="font-anton text-sm text-[#17B8B8] uppercase tracking-wider">
                      MEMÓRIA ANTI-REPETIÇÃO DE PERGUNTAS
                    </div>
                    <p className="text-xs font-mono-code text-slate-400">
                      O sistema guarda as perguntas e palavras já sorteadas para não repetir durante a sessão.
                    </p>
                    <button
                      type="button"
                      data-testid="config-clear-memory-btn"
                      onClick={() => {
                        clearUsedRoundSignatures();
                        sounds.playSuccess();
                        setClearedMemoryNotice(true);
                        setTimeout(() => setClearedMemoryNotice(false), 2500);
                      }}
                      className="px-4 py-2 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>
                        {clearedMemoryNotice
                          ? '✅ MEMÓRIA DE PERGUNTAS REINICIADA!'
                          : 'LIMPAR HISTÓRICO DE PERGUNTAS USADAS'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Modal for Guest Avatar Selection from Sidebar */}
      <RetroAvatarModal
        isOpen={isGuestAvatarModalOpen}
        onClose={() => setIsGuestAvatarModalOpen(false)}
        title="ESCOLHER AVATAR RETRÔ DO CONVIDADO"
        subtitle="Escolha entre 48 ícones de fliperama, mascotes, festa e lendas"
        selectedAvatar={selectedGuestAvatar}
        onSelectAvatar={(emoji) => {
          setSelectedGuestAvatar(emoji);
        }}
      />

      {/* Modal for Editing an Existing Player's Avatar */}
      <RetroAvatarModal
        isOpen={Boolean(editingPlayer)}
        onClose={() => setEditingAvatarPlayerId(null)}
        title={
          editingPlayer
            ? `AVATAR DE ${editingPlayer.name.toUpperCase()}`
            : 'PERSONALIZAR AVATAR'
        }
        subtitle="Salvo automaticamente em localStorage para próximas sessões"
        selectedAvatar={editingPlayer?.avatar || selectedGuestAvatar}
        playerKeyForStorage={
          editingPlayer
            ? [editingPlayer.id, editingPlayer.name, editingPlayer.fixedPlayerId || '']
            : undefined
        }
        onSelectAvatar={(emoji) => {
          if (editingPlayer && onUpdatePlayerAvatar) {
            onUpdatePlayerAvatar(editingPlayer.id, emoji);
          }
        }}
      />
    </div>
  );
};

export const ScreenLobby = React.memo(ScreenLobbyComponent);


