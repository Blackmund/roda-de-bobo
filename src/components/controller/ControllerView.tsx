import React, { useState, useEffect, useRef } from 'react';
import { GameRoom, Player, GameId, TeamId, LimitePowerCardType } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import {
  Crown,
  Sparkles,
  Send,
  EyeOff,
  Eye,
  Minus,
  CheckCircle2,
  Gavel,
  AlertTriangle,
  Check,
  PhoneCall,
  RotateCw,
  Play,
  Volume2,
  Coins,
  Shuffle,
  Calculator,
  Lock,
  Clock,
  Infinity,
  ArrowRight
} from 'lucide-react';
import {
  createFull52Deck,
  validateSuitAscendingOrder,
  autoSortSameSuitCards,
  dealValidRandomHand,
  computeOfficialQuestionAnswer,
  formatOfficialQuestionText,
  formatCardValueLabel,
  SUIT_META,
  OFFICIAL_11_QUESTIONS,
  PVCard
} from '../../utils/perguntasEVerdadesEngine';

import { FIXED_PLAYERS } from '../../utils/fixedPlayers';
import { ensureStrictForbiddenWordsCount } from '../../utils/proibidoGoldenDatabase';
import {
  applyProibidoCardOutcome,
  getProibidoPlayerRole,
  getNextProibidoTurnInfo
} from '../host/ScreenProibido';
import { LIMITE_POWER_CARD_META } from '../host/ScreenLimite';
import { RetroAvatarPicker, RetroAvatarModal } from '../RetroAvatarPicker';
import {
  RETRO_AVATARS,
  loadLastSelectedAvatar,
  resolvePlayerAvatar,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from '../../utils/retroAvatars';
import {
  resolveActiveControllerTimer,
  triggerCountdownHaptic,
  advanceControllerTimerOneSecond,
  safeVibrate
} from '../../utils/hapticFeedback';
import {
  PartyRole,
  findBoundPlayerForDevice,
  loadLastPartySession,
  clearLastPartySession,
  triggerBuzzReadyInRoom
} from '../../utils/partyNetworkEngine';
import { ScreenMobileJoin } from './ScreenMobileJoin';
import { ScreenMobileController } from './ScreenMobileController';
import { resolveSwapPair } from '../../utils/limiteSwap';
import { MobileStandaloneGameView } from './MobileStandaloneGameView';
import {
  TEAM_META,
  getActiveTeamIds,
  getNextTeamId,
  resolveCurrentTurnSpotlight
} from '../../utils/teamUtils';
import { checkAnswerFuzzyMatch } from '../../utils/fuzzyMatch';
import { repetenteWriters, submitRepetenteAnswer } from '../../utils/repetenteEngine';
import { currentValue as respostasValue, pickPosition as respostasPick } from '../../utils/respostasEngine';
import { AdedanhaController } from './games/AdedanhaController';
import { estadiosCluesShown, estadiosValue } from '../../utils/estadiosEngine';
import { DrawingCanvas } from '../DrawingCanvas';
import { PINTO_COLORS, addStroke as pintoAddStroke, clearDrawing as pintoClear, undoStroke as pintoUndo } from '../../utils/comoEuPintoEngine';
import { MimicaController } from './games/MimicaController';
import { QuemSouEuController } from './games/QuemSouEuController';
import { MegaResenhaController } from './games/MegaResenhaController';
import { RepetenteController } from './games/RepetenteController';
import { RespostasSemPerguntasController } from './games/RespostasSemPerguntasController';
import { EstadiosController } from './games/EstadiosController';
import { ComTerraController } from './games/ComTerraController';
import { ComoEuPintoController } from './games/ComoEuPintoController';
import { PerguntasEVerdadesController } from './games/PerguntasEVerdadesController';
import { TemOuNaoTemController } from './games/TemOuNaoTemController';
import { NotaController } from './games/NotaController';
import { ProibidoController } from './games/ProibidoController';
import { DuvidoController } from './games/DuvidoController';
import { LimiteController } from './games/LimiteController';
import { MasterRemoteController } from './games/MasterRemoteController';
import { PlayerMark } from '../rdb/PlayerMark';

interface ControllerViewProps {
  room: GameRoom;
  currentPlayerId: string;
  connectionStatus?: 'Connected' | 'Reconnecting' | 'Offline';
  isPadMode?: boolean;
  onRegisterPlayer: (
    name: string,
    avatar?: string,
    color?: string,
    isFixed?: boolean,
    fixedId?: string,
    targetPlayerId?: string,
    role?: PartyRole,
    targetRoomCodeOverride?: string
  ) => void;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  onSwitchToHostMode?: () => void;
  onBuzzReady?: (playerId: string) => void;
  onStartMatchFromController?: (gameId: GameId, theme: string) => void;
  onNextRound?: () => void;
  onForceSync?: () => void;
}

const COLORS = ['#FF1E56', '#17B8B8', '#FF6B00', '#9D00FF', '#00FF66', '#FFD600'];

export const ControllerView: React.FC<ControllerViewProps> = ({
  room,
  currentPlayerId,
  connectionStatus = 'Connected',
  isPadMode = false,
  onRegisterPlayer,
  onUpdateRoom,
  onSwitchToHostMode,
  onBuzzReady,
  onStartMatchFromController,
  onNextRound,
  onForceSync
}) => {
  const savedPartySession = loadLastPartySession();
  const player = findBoundPlayerForDevice(room, currentPlayerId, savedPartySession);
  const [forceJoinScreen, setForceJoinScreen] = useState(false);

  // Registration Form State
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() =>
    loadLastSelectedAvatar(RETRO_AVATARS[0])
  );
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [showProfileAvatarModal, setShowProfileAvatarModal] = useState(false);

  // Jogo do Limite Input State
  const [limiteGuess, setLimiteGuess] = useState<string>('');
  const [isEditingLimiteGuess, setIsEditingLimiteGuess] = useState<boolean>(false);
  const [selectedSwapTarget2, setSelectedSwapTarget2] = useState<string>('');
  const [selectedSwapTarget, setSelectedSwapTarget] = useState<string>('');
  const [repetenteDraft, setRepetenteDraft] = useState<string>('');
  const [pintoColor, setPintoColor] = useState<string>('#0A0B1E');

  // Reset secret guess input state when round or question changes
  useEffect(() => {
    setLimiteGuess('');
    setIsEditingLimiteGuess(false);
  }, [room.roundNumber, room.limite?.roundData?.pergunta]);

  // Jogo do Duvido Auction Bid State
  const [customBid, setCustomBid] = useState<number>(1);

  // Jogo da Nota Hold to View State
  const [holdingSecret, setHoldingSecret] = useState(false);

  // Tem ou Não Tem Guess State
  const [temGuess, setTemGuess] = useState('');
  const [entryMode, setEntryMode] = useState<'fixed' | 'guest'>('fixed');
  const [isMasterRemoteMode, setIsMasterRemoteMode] = useState(false);
  const [pvBidInput, setPvBidInput] = useState<number>(1);
  const [pvCalcQuestionNum, setPvCalcQuestionNum] = useState<number>(2);

  // --- MOBILE CONTROLLER TIMER & HAPTIC FEEDBACK (navigator.vibrate) LOGIC ---
  const activeTimer = resolveActiveControllerTimer(room);
  const lastVibratedSecondRef = useRef<number | null>(null);
  const onUpdateRoomRef = useRef(onUpdateRoom);
  onUpdateRoomRef.current = onUpdateRoom;

  // Trigger navigator.vibrate haptic feedback on mobile controllers during the last 5 seconds (5..1) and on 0
  useEffect(() => {
    if (activeTimer.isInfinite || activeTimer.secondsRemaining === null) {
      lastVibratedSecondRef.current = null;
      return;
    }

    const sec = activeTimer.secondsRemaining;

    if (activeTimer.active && sec >= 1 && sec <= 5) {
      if (lastVibratedSecondRef.current !== sec) {
        lastVibratedSecondRef.current = sec;
        triggerCountdownHaptic(sec, { isActive: true, isInfinite: false });
        sounds.playTick();
      }
      return;
    }

    if (sec === 0 && lastVibratedSecondRef.current !== null && lastVibratedSecondRef.current !== 0) {
      lastVibratedSecondRef.current = 0;
      triggerCountdownHaptic(0, { isActive: true, isInfinite: false });
      sounds.playBuzzer();
      return;
    }

    if (sec > 5) {
      lastVibratedSecondRef.current = sec;
    }
  }, [activeTimer.active, activeTimer.isInfinite, activeTimer.secondsRemaining]);

  // Autonomous countdown fallback for Mobile Controllers / Master Remote when activeTimer.active is true
  useEffect(() => {
    if (
      activeTimer.isInfinite ||
      !activeTimer.active ||
      activeTimer.secondsRemaining === null ||
      activeTimer.secondsRemaining <= 0
    ) {
      return;
    }

    const isLeaderDevice =
      room.connectionMode === 'multi' &&
      (Boolean(player?.isVip) || room.players[0]?.id === player?.id);
    const delayMs = isLeaderDevice ? 1050 : 1550;

    const timeout = window.setTimeout(() => {
      onUpdateRoomRef.current((prev) => advanceControllerTimerOneSecond(prev).nextRoom);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [
    activeTimer.active,
    activeTimer.isInfinite,
    activeTimer.secondsRemaining,
    activeTimer.gameId,
    room.connectionMode,
    player?.id,
    player?.isVip
  ]);

  const handleToggleMobileTimer = () => {
    sounds.playPowerup();
    onUpdateRoom((prev) => {
      if (prev.timerConfig === 0) return prev;
      if (prev.activeGame === 'proibido' && prev.proibido) {
        const nextActive = !prev.proibido.timerActive;
        return {
          ...prev,
          proibido: {
            ...prev.proibido,
            phase: nextActive ? 'PLAYING' : prev.proibido.phase,
            timerActive: nextActive
          }
        };
      }
      if (prev.activeGame === 'duvido' && prev.duvido && prev.duvido.phase === 'EXECUTION') {
        return {
          ...prev,
          duvido: {
            ...prev.duvido,
            timerActive: !prev.duvido.timerActive
          }
        };
      }
      if (prev.activeGame === 'limite' && prev.limite && prev.limite.phase === 'SECRET_GUESS') {
        return {
          ...prev,
          limite: {
            ...prev.limite,
            timerActive: !prev.limite.timerActive
          }
        };
      }
      return prev;
    });
  };

  const renderMobileTurnSpotlightBanner = () => {
    if (room.screen !== 'playing') return null;
    const spotlight = resolveCurrentTurnSpotlight(room);
    if (!spotlight) return null;

    const isMeActive = Boolean(player && spotlight.activePlayer?.id === player.id);
    const isMyTeamActive = Boolean(player && spotlight.activeTeamId && spotlight.activeTeamId === player.team);
    const teamMeta = spotlight.activeTeamId ? TEAM_META[spotlight.activeTeamId] : null;

    return (
      <div
        data-testid="controller-turn-spotlight-banner"
        className={`border-2 px-3 py-2.5 flex items-center justify-between gap-2.5 transition-all ${
          isMeActive
            ? 'border-emerald-400 bg-gradient-to-r from-emerald-950/90 via-[#071812] to-black shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse'
            : isMyTeamActive
            ? `${teamMeta?.borderClass || 'border-cyan-400'} bg-[#090b14] ${teamMeta?.glowShadow || ''}`
            : 'border-white/15 bg-[#090b14]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-black border border-white/25 flex items-center justify-center text-xl shrink-0">
            <PlayerMark p={spotlight.activePlayer} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`px-1.5 py-0.5 text-[9px] font-mono-code font-bold uppercase tracking-wider ${
                  isMeActive
                    ? 'bg-emerald-400 text-black'
                    : isMyTeamActive
                    ? 'bg-cyan-400 text-black'
                    : 'bg-white/15 text-slate-200'
                }`}
              >
                {isMeActive
                  ? '🔥 É A SUA VEZ AGORA!'
                  : isMyTeamActive
                  ? `⚡ VEZ DA SUA ${teamMeta?.equipeLabel || 'EQUIPE'}`
                  : '🎯 VEZ NA MESA'}
              </span>
              {teamMeta && (
                <span className={`text-[9px] font-mono-code font-bold uppercase ${teamMeta.textClass}`}>
                  {teamMeta.equipeLabel}
                </span>
              )}
            </div>
            <div className="font-anton text-sm text-white uppercase tracking-wide truncate mt-0.5">
              {spotlight.activePlayer ? spotlight.activePlayer.name : spotlight.headline}
            </div>
            <div className="text-[10px] font-mono-code text-slate-300 truncate">
              {spotlight.actionInstruction}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMobileTimerBanner = () => {
    if (room.screen !== 'playing') return null;
    if (
      room.activeGame !== 'limite' &&
      room.activeGame !== 'duvido' &&
      room.activeGame !== 'proibido'
    ) {
      return null;
    }

    if (activeTimer.isInfinite) {
      return (
        <div
          data-testid="controller-timer-banner"
          className="border border-cyan-400/50 bg-[#090b14] px-3 py-2 flex items-center justify-between"
        >
          <span className="text-[10px] font-mono-code text-slate-400 font-bold uppercase">
            CRONÔMETRO DA RODADA:
          </span>
          <span className="flex items-center gap-1.5 font-anton text-sm text-cyan-300 uppercase">
            <Infinity className="w-5 h-5 stroke-[2.25] shrink-0 aspect-square text-cyan-400" />
            <span>LIVRE</span>
          </span>
        </div>
      );
    }

    if (activeTimer.secondsRemaining === null) return null;

    const isCritical = activeTimer.isLastFiveSeconds;
    const isZero = activeTimer.secondsRemaining === 0;

    return (
      <div
        data-testid="controller-timer-banner"
        className={`border-2 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 transition-all ${
          isCritical
            ? 'border-rose-500 bg-rose-950/80 shadow-neon-rose animate-pulse'
            : isZero
            ? 'border-rose-600 bg-rose-950/90'
            : activeTimer.active
            ? 'border-cyan-400 bg-cyan-950/30'
            : 'border-slate-700 bg-[#090b14]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock
            size={16}
            className={isCritical || isZero ? 'text-rose-400' : 'text-cyan-400'}
          />
          <div>
            <div className="text-[9px] font-mono-code text-slate-300 font-bold uppercase">
              {activeTimer.phaseLabel || 'CRONÔMETRO'}
            </div>
            <div
              data-testid="controller-timer-seconds"
              className={`font-anton text-2xl leading-none ${
                isCritical || isZero ? 'text-rose-300' : 'text-white'
              }`}
            >
              {activeTimer.secondsRemaining}s
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCritical && (
            <span
              data-testid="controller-haptic-badge"
              className="px-2 py-1 bg-rose-500 text-white font-mono-code text-[10px] font-bold uppercase tracking-wider"
            >
              📳 VIBRAÇÃO HÁPTICA ({activeTimer.secondsRemaining}S)
            </span>
          )}
          {!isZero && room.activeGame === 'limite' && (
            <span
              data-testid="controller-auto-timer-badge"
              className="px-2.5 py-1 border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 font-mono-code text-[10px] font-bold uppercase"
            >
              🟢 SINCRONIZADO COM A TELA
            </span>
          )}
          {!isZero && room.activeGame !== 'limite' && (
            <button
              type="button"
              data-testid="controller-toggle-timer-btn"
              onClick={handleToggleMobileTimer}
              className={`px-2.5 py-1 border font-mono-code text-[10px] font-bold uppercase cursor-pointer ${
                activeTimer.active
                  ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                  : 'border-emerald-400 bg-emerald-600 text-white'
              }`}
            >
              {activeTimer.active ? '⏸ PAUSAR' : '▶ INICIAR TEMPO'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- MODO 2: CONTROLE CENTRAL / MESTRE DA SALA (1 Celular no Sofá controlando a TV inteira) ---
  if (isMasterRemoteMode) {
    return <MasterRemoteController room={room} setIsMasterRemoteMode={setIsMasterRemoteMode} renderMobileTurnSpotlightBanner={renderMobileTurnSpotlightBanner} renderMobileTimerBanner={renderMobileTimerBanner} onUpdateRoom={onUpdateRoom} setHoldingSecret={setHoldingSecret} holdingSecret={holdingSecret} />;
  }

  // Modo "1 Celular como Prancheta" (?pad=1): conecta direto na sala sem exigir cadastro de jogador.
  if (isPadMode) {
    if (room.activeGame === 'como-eu-pinto' && room.comoEuPinto) {
      const drawerPlayer =
        room.players.find((p) => p.id === room.comoEuPinto?.drawerPlayerId) || room.players[0];
      if (drawerPlayer) {
        return (
          <ComoEuPintoController
            room={room}
            player={drawerPlayer}
            onUpdateRoom={onUpdateRoom}
            wrapIfMultiMode={(content) => content}
            pintoColor={pintoColor}
            setPintoColor={setPintoColor}
            isSharedPad={true}
          />
        );
      }
    }

    return (
      <div
        data-testid="controller-pad-waiting"
        className="min-h-[calc(100dvh-44px)] bg-[#0a0b1e] text-[#f5f2eb] p-6 flex flex-col items-center justify-center text-center gap-4"
      >
        <div className="border-2 border-[#17b8b8] bg-[#10122b] p-6 max-w-sm w-full space-y-3">
          <span className="inline-block bg-[#17b8b8] text-[#0a0b1e] px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider">
            Prancheta conectada · Sala {room.roomId}
          </span>
          <h2 className="font-anton text-2xl uppercase tracking-wide m-0">
            Aguardando o jogo começar na TV
          </h2>
          <p className="text-xs text-[#b9bdd4] m-0">
            Assim que a partida de Como eu pinto iniciar na TV, a folha de desenho vai abrir aqui automaticamente.
          </p>
          {onForceSync && (
            <button
              type="button"
              onClick={onForceSync}
              className="w-full py-2.5 border-2 border-[#17b8b8] bg-[#0a0b1e] text-[#f5f2eb] text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              Sincronizar agora
            </button>
          )}
        </div>
      </div>
    );
  }

  // If player not registered yet or chose to switch player/leave
  if (!player || forceJoinScreen) {
    const searchParams =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const roomParam = searchParams?.get('join') || searchParams?.get('room') || '';

    return (
      <ScreenMobileJoin
        room={room}
        currentClientId={currentPlayerId}
        connectionStatus={connectionStatus}
        initialRoomCodeFromUrl={roomParam || (room.roomId !== 'BOBO' ? room.roomId : '')}
        hasQrRoomParam={Boolean(roomParam)}
        onJoinSession={({ roomCode, playerName, avatar, role, fixedPlayerId, color }) => {
          setForceJoinScreen(false);
          setIsMasterRemoteMode(role === 'master');
          onRegisterPlayer(
            playerName,
            avatar,
            color,
            Boolean(fixedPlayerId),
            fixedPlayerId,
            currentPlayerId,
            role,
            roomCode
          );
        }}
        onSwitchToHostMode={onSwitchToHostMode}
        onForceSync={onForceSync}
      />
    );
  }

  // --- LOBBY / SETUP / MODE SELECT SCREEN (ScreenMobileController with Buzz Ready & Master Remote) ---
  if (room.screen === 'mode-select' || room.screen === 'lobby' || room.screen === 'game-setup' || room.screen === 'rules') {
    const currentRole: PartyRole =
      isMasterRemoteMode || player.connectionType === 'master' || player.isMasterControl
        ? 'master'
        : 'player';

    return (
      <ScreenMobileController
        room={room}
        player={player}
        role={currentRole}
        onChangeRole={(nextRole) => {
          setIsMasterRemoteMode(nextRole === 'master');
          onUpdateRoom((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id
                ? {
                    ...p,
                    connectionType: nextRole === 'master' ? 'master' : 'mobile',
                    isMasterControl: nextRole === 'master'
                  }
                : p
            )
          }));
        }}
        onSyncState={() => {
          onUpdateRoom((prev) => ({ ...prev }));
        }}
        onLeaveOrSwitchPlayer={() => {
          clearLastPartySession();
          setForceJoinScreen(true);
        }}
        onBuzzReady={() => {
          if (onBuzzReady) {
            onBuzzReady(player.id);
          } else {
            onUpdateRoom((prev) => triggerBuzzReadyInRoom(prev, player.id));
          }
        }}
        onUpdateRoom={onUpdateRoom}
        onStartMatchFromController={onStartMatchFromController}
      />
    );
  }

  const wrapIfMultiMode = (content: React.ReactNode) => {
    if (room.connectionMode !== 'multi') {
      return content;
    }
    const isLeader =
      Boolean(player.isVip) ||
      Boolean(player.isMasterControl) ||
      room.players[0]?.id === player.id;
    return (
      <MobileStandaloneGameView
        room={room}
        player={player}
        isLeader={isLeader}
        activeTimerSeconds={activeTimer.secondsRemaining}
        isInfiniteTimer={activeTimer.isInfinite}
        onSyncState={() => onUpdateRoom((prev) => ({ ...prev }))}
        onLeaveRoom={() => {
          clearLastPartySession();
          setForceJoinScreen(true);
        }}
        onLeaderNextRound={onNextRound}
        onUpdateRoom={onUpdateRoom}
      >
        {content}
      </MobileStandaloneGameView>
    );
  };

  // --- GAME 1: JOGO DO LIMITE CONTROLLER ---
  if (room.activeGame === 'limite' && room.limite) {
    return <LimiteController room={room} player={player} selectedSwapTarget={selectedSwapTarget} selectedSwapTarget2={selectedSwapTarget2} limiteGuess={limiteGuess} setLimiteGuess={setLimiteGuess} setIsEditingLimiteGuess={setIsEditingLimiteGuess} onUpdateRoom={onUpdateRoom} wrapIfMultiMode={wrapIfMultiMode} renderMobileTurnSpotlightBanner={renderMobileTurnSpotlightBanner} renderMobileTimerBanner={renderMobileTimerBanner} isEditingLimiteGuess={isEditingLimiteGuess} setSelectedSwapTarget={setSelectedSwapTarget} setSelectedSwapTarget2={setSelectedSwapTarget2} />;
  }

  // --- GAME 2: JOGO DO DUVIDO CONTROLLER ---
  if (room.activeGame === 'duvido' && room.duvido) {
    return <DuvidoController room={room} player={player} customBid={customBid} onUpdateRoom={onUpdateRoom} wrapIfMultiMode={wrapIfMultiMode} renderMobileTurnSpotlightBanner={renderMobileTurnSpotlightBanner} renderMobileTimerBanner={renderMobileTimerBanner} setCustomBid={setCustomBid} />;
  }

  // --- GAME 3: JOGO DO PROIBIDO CONTROLLER ---
  if (room.activeGame === 'proibido' && room.proibido) {
    return <ProibidoController room={room} player={player} onUpdateRoom={onUpdateRoom} wrapIfMultiMode={wrapIfMultiMode} renderMobileTurnSpotlightBanner={renderMobileTurnSpotlightBanner} renderMobileTimerBanner={renderMobileTimerBanner} onNextRound={onNextRound} />;
  }

  // --- GAME 4: JOGO DA NOTA CONTROLLER ---
  if (room.activeGame === 'nota' && room.nota) {
    return <NotaController room={room} player={player} wrapIfMultiMode={wrapIfMultiMode} renderMobileTurnSpotlightBanner={renderMobileTurnSpotlightBanner} setHoldingSecret={setHoldingSecret} holdingSecret={holdingSecret} />;
  }

  // --- GAME 5: TEM OU NÃO TEM CONTROLLER ---
  if (room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem) {
    return <TemOuNaoTemController room={room} player={player} temGuess={temGuess} onUpdateRoom={onUpdateRoom} setTemGuess={setTemGuess} wrapIfMultiMode={wrapIfMultiMode} renderMobileTurnSpotlightBanner={renderMobileTurnSpotlightBanner} />;
  }

  // --- GAME 6: PERGUNTAS E VERDADES (O JOGO DO DIABO) CONTROLLER ---
  if (room.activeGame === 'perguntas-e-verdades' && room.perguntasEVerdades) {
    return <PerguntasEVerdadesController room={room} player={player} pvCalcQuestionNum={pvCalcQuestionNum} onUpdateRoom={onUpdateRoom} pvBidInput={pvBidInput} wrapIfMultiMode={wrapIfMultiMode} setPvCalcQuestionNum={setPvCalcQuestionNum} setPvBidInput={setPvBidInput} />;
  }

  // NOV-07: Como eu pinto no celular. Quem desenha ve a palavra e desenha aqui; os outros veem o desenho.
  if (room.activeGame === 'como-eu-pinto' && room.comoEuPinto) {
    return <ComoEuPintoController room={room} player={player} onUpdateRoom={onUpdateRoom} wrapIfMultiMode={wrapIfMultiMode} pintoColor={pintoColor} setPintoColor={setPintoColor} />;
  }

  // Com Terra no celular: loja, pre-escolha, posicionamento e confirmacao em dois passos.
  if (room.activeGame === 'com-terra' && room.comTerra) {
    return <ComTerraController room={room} player={player} onUpdateRoom={onUpdateRoom} onNextRound={onNextRound} />;
  }

  // Adedanha no celular: escrever, STOP e votar.
  if (room.activeGame === 'adedanha' && room.adedanha) {
    return <AdedanhaController room={room} player={player} onUpdateRoom={onUpdateRoom} wrapIfMultiMode={wrapIfMultiMode} />;
  }

  // NOV-06: Estadios no celular (somente leitura): pistas liberadas e de quem e a vez; o diretor julga na TV.
  if (room.activeGame === 'estadios' && room.estadios) {
    return <EstadiosController room={room} player={player} wrapIfMultiMode={wrapIfMultiMode} />;
  }

  // NOV-08: Respostas sem perguntas no celular. Quem esta na vez escolhe a palavra a revelar; o diretor julga o palpite na TV.
  if (room.activeGame === 'respostas-sem-perguntas' && room.respostasSemPerguntas) {
    return <RespostasSemPerguntasController room={room} player={player} onUpdateRoom={onUpdateRoom} wrapIfMultiMode={wrapIfMultiMode} />;
  }

  // NOV-05: Repetente no celular. O jogador escreve a propria palavra em segredo; os outros nao a veem.
  if (room.activeGame === 'repetente' && room.repetente) {
    return <RepetenteController room={room} player={player} repetenteDraft={repetenteDraft} setRepetenteDraft={setRepetenteDraft} onUpdateRoom={onUpdateRoom} wrapIfMultiMode={wrapIfMultiMode} />;
  }

  // NOV-03: Mega Resenha no celular. Somente leitura: quem da as dicas ve a palavra; o parceiro nao pode olhar.
  if (room.activeGame === 'mega-resenha' && room.megaResenha) {
    return <MegaResenhaController room={room} player={player} wrapIfMultiMode={wrapIfMultiMode} />;
  }

  // NOV-02: Quem sou eu no celular. Mostra a identidade de todos, menos a do proprio jogador.
  if ((room.activeGame === 'quem-sou-eu' || room.activeGame === 'onde-estou') && room.quemSouEu) {
    return <QuemSouEuController room={room} player={player} wrapIfMultiMode={wrapIfMultiMode} />;
  }

  // NOV-01: Mimica no celular. Somente leitura: acertar/pular e confirmado pelo diretor na TV.
  if (room.activeGame === 'mimica' && room.mimica) {
    return <MimicaController room={room} player={player} wrapIfMultiMode={wrapIfMultiMode} />;
  }

  return (
    <div className="min-h-screen bg-[#07080d] p-4 text-white font-mono-code text-xs">
      Aguardando rodada...
    </div>
  );
};

