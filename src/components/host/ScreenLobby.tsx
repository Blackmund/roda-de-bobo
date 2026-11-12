import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameRoom, GameId, VisualTheme, TeamId } from '../../types/game';
import { isCazeFamily, themeBadge } from '../../utils/themeUtils';
import {
  CazeArt,
  MegaResenhaArt,
  MimicaMasksArt,
  QuemSouEuArt,
  RepetenteArt,
  RespostasSemPerguntasArt,
  EstadiosArt,
  ComoEuPintoArt,
  OndeEstouArt
} from '../RodaIcons';
import { GAME_LIMITS } from '../../config/gameLimits';
import {
  TEAM_META,
  getActiveTeamIds,
  getTeamCount,
  cyclePlayerTeamId
} from '../../utils/teamUtils';
import { DynamicQRCode } from '../DynamicQRCode';
import { GlobalStats } from '../GlobalStats';
import { sounds } from '../../utils/soundEffects';
import { isApiAvailable } from '../../utils/apiAvailability';
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
import { LobbyExtrasPanel } from './lobby/LobbyExtrasPanel';
import { LobbyGameCard } from './lobby/LobbyGameCard';
import { SurpriseArt } from '../art/GameCardArt';
import { Dice, ChevronLeft, ChevronRight } from '../rdb/rdbIcons';

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
  'perguntas-e-verdades': 'PERGUNTAS E VERDADES',
  mimica: 'JOGO DA MÍMICA',
  'quem-sou-eu': 'QUEM SOU EU',
  'mega-resenha': 'MEGA RESENHA',
  repetente: 'REPETENTE',
  'respostas-sem-perguntas': 'RESPOSTAS SEM PERGUNTAS',
  estadios: 'ESTÁDIOS',
  'como-eu-pinto': 'COMO EU PINTO',
  'onde-estou': 'ONDE ESTOU'
};

/** Maximo de cards por pagina do catalogo (o grid e 3x2 no desktop e 2x3 no tablet). */
export const GAMES_PER_PAGE = 6;

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
  },
  {
    id: 'mimica',
    name: 'JOGO DA MÍMICA',
    tagline: 'FAÇA A MÍMICA E O PARCEIRO ADIVINHA',
    badge: 'EM EQUIPE',
    color: '#F5B700',
    renderArt: (cls) => (
      <MimicaMasksArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'quem-sou-eu',
    name: 'QUEM SOU EU',
    tagline: 'DESCUBRA A IDENTIDADE NA SUA TESTA',
    badge: 'INDIVIDUAL',
    color: '#38BDF8',
    renderArt: (cls) => (
      <QuemSouEuArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'mega-resenha',
    name: 'MEGA RESENHA',
    tagline: 'DICAS DE UMA PALAVRA SÓ PARA O PARCEIRO ACERTAR',
    badge: 'EM EQUIPE',
    color: '#F97316',
    renderArt: (cls) => (
      <MegaResenhaArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'repetente',
    name: 'REPETENTE',
    tagline: 'ESCREVAM A MESMA PALAVRA SEM COMBINAR',
    badge: 'EM EQUIPE',
    color: '#84CC16',
    renderArt: (cls) => (
      <RepetenteArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'respostas-sem-perguntas',
    name: 'RESPOSTAS SEM PERGUNTAS',
    tagline: 'ADIVINHE A RESPOSTA DE UMA PERGUNTA OCULTA',
    badge: 'INDIVIDUAL',
    color: '#F43F5E',
    renderArt: (cls) => (
      <RespostasSemPerguntasArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'estadios',
    name: 'ESTÁDIOS',
    tagline: 'DESCUBRA O ESTÁDIO: 5, 4, 3, 2, 1 PONTOS',
    badge: 'INDIVIDUAL',
    color: '#0EA5E9',
    renderArt: (cls) => (
      <EstadiosArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'como-eu-pinto',
    name: 'COMO EU PINTO',
    tagline: 'DESENHE A PALAVRA E O PARCEIRO ADIVINHA',
    badge: 'EM EQUIPE',
    color: '#A855F7',
    renderArt: (cls) => (
      <ComoEuPintoArt
        className={
          cls ||
          'w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 max-h-full max-w-full h-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow'
        }
      />
    )
  },
  {
    id: 'onde-estou',
    name: 'ONDE ESTOU',
    tagline: 'DESCUBRA O GRANDE MOMENTO NA SUA TESTA',
    badge: 'INDIVIDUAL',
    color: '#22C55E',
    renderArt: (cls) => (
      <OndeEstouArt
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
  // Catalogo paginado: no maximo GAMES_PER_PAGE jogos por pagina (a 1a pagina e a tela original com 6).
  const [gamePage, setGamePage] = useState(0);
  const gamePageCount = Math.max(1, Math.ceil(GAMES.length / GAMES_PER_PAGE));
  const currentGamePage = Math.min(gamePage, gamePageCount - 1);
  const pageGames = GAMES.slice(currentGamePage * GAMES_PER_PAGE, (currentGamePage + 1) * GAMES_PER_PAGE);
  const isLastGamePage = currentGamePage >= gamePageCount - 1;
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
    let cancelled = false;
    void isApiAvailable().then((available) => {
      if (cancelled) return;
      if (!available) {
        // Sem servidor proprio neste site: nao existe IA, so os bancos prontos (nada de "Gemini conectada").
        setAiStatusLabel('🟡 Sem servidor de IA neste site: usando os bancos prontos');
        return;
      }
      fetch('/api/ai-status')
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (!cancelled && json?.statusLabel) {
            setAiStatusLabel(json.statusLabel);
          }
        })
        .catch(() => {
          // Keep default connected status badge
        });
    });
    return () => {
      cancelled = true;
    };
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
          className={`xl:col-span-12 flex-1 min-h-0 flex flex-col gap-3 lg:gap-4 overflow-y-auto lg:overflow-hidden ${
            activeSpotlightStep === 1
              ? 'ring-2 ring-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.5)] rounded-xl p-1'
              : ''
          }`}
        >
          {/* Barra do catalogo: etiqueta, modo da sala, sorteio e paginas (tudo numa linha, para a grade ficar com a altura) */}
          <div className="rdb-toolbar">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="rdb-tag">Fliperama</h2>
              <span className="rdb-toolbar-note rdb-hide-sm">{GAMES.length} jogos</span>
              {onGoToModeSelect ? (
                <button
                  type="button"
                  data-testid="lobby-change-mode-btn"
                  onClick={() => {
                    sounds.playTick();
                    onGoToModeSelect();
                  }}
                  className="rdb-btn rdb-btn--cream cursor-pointer"
                  title="Trocar o modo de conexão ou os jogadores da sala"
                >
                  <span data-testid="lobby-mode-badge">
                    {room.connectionMode === 'local'
                      ? 'Modo local'
                      : room.connectionMode === 'host'
                      ? `TV + celulares · ${room.roomId}`
                      : `Só celulares · ${room.roomId}`}
                  </span>
                </button>
              ) : (
                <span data-testid="lobby-mode-badge" className="rdb-toolbar-note">
                  {room.connectionMode === 'local' ? 'Modo local' : `Sala ${room.roomId}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!isLastGamePage && (
                <button
                  type="button"
                  data-testid="lobby-surprise-roulette-btn"
                  onClick={handleSurpriseRoulette}
                  className="rdb-btn rdb-btn--amber cursor-pointer"
                  title="Sortear um jogo surpresa"
                >
                  <Dice />
                  <span className="rdb-hide-sm">Sortear jogo</span>
                </button>
              )}
              {gamePageCount > 1 && (
                <nav data-testid="lobby-pagination" aria-label="Páginas de jogos" className="rdb-pager">
                  <button
                    type="button"
                    data-testid="lobby-page-prev"
                    disabled={currentGamePage === 0}
                    onClick={() => {
                      sounds.playTick();
                      setGamePage(Math.max(0, currentGamePage - 1));
                    }}
                    className="rdb-btn rdb-btn--icon cursor-pointer"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft />
                  </button>
                  <div className="rdb-pager" role="tablist">
                    {Array.from({ length: gamePageCount }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === currentGamePage}
                        aria-pressed={i === currentGamePage}
                        aria-label={`Página ${i + 1} de ${gamePageCount}`}
                        data-testid={`lobby-page-dot-${i}`}
                        onClick={() => {
                          sounds.playTick();
                          setGamePage(i);
                        }}
                        className="rdb-btn rdb-btn--icon cursor-pointer"
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    data-testid="lobby-page-next"
                    disabled={isLastGamePage}
                    onClick={() => {
                      sounds.playTick();
                      setGamePage(Math.min(gamePageCount - 1, currentGamePage + 1));
                    }}
                    className="rdb-btn rdb-btn--icon cursor-pointer"
                    aria-label="Próxima página"
                  >
                    <ChevronRight />
                  </button>
                </nav>
              )}
            </div>
          </div>

          {/* Grade 3x2: seis jogos por pagina; na ultima, a casa que sobra vira o sorteio */}
          <div className={`rdb-grid ${pageGames.length + (isLastGamePage ? 1 : 0) <= 3 ? "rdb-grid--row" : ""}`}>
            {pageGames.map((game) => <LobbyGameCard key={game.id} game={game} handleGameClick={handleGameClick} setHoveredGame={setHoveredGame} visualTheme={visualTheme} />)}
            {isLastGamePage && pageGames.length < GAMES_PER_PAGE && (
              <button
                type="button"
                data-testid="lobby-surprise-roulette-btn"
                onClick={handleSurpriseRoulette}
                className="rdb-card rdb-card--surprise group cursor-pointer"
              >
                <span className="rdb-card-art">
                  <SurpriseArt />
                </span>
                <span className="rdb-card-foot">
                  <span className="min-w-0">
                    <span className="rdb-card-name block">Sortear jogo surpresa</span>
                    <span className="rdb-card-tagline block">Deixa o dado escolher um dos {GAMES.length}</span>
                  </span>
                </span>
              </button>
            )}
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

              {activeModal === 'config' && <LobbyExtrasPanel visualTheme={visualTheme} onSetVisualTheme={onSetVisualTheme} aiStatusLabel={aiStatusLabel} setClearedMemoryNotice={setClearedMemoryNotice} clearedMemoryNotice={clearedMemoryNotice} />}
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


