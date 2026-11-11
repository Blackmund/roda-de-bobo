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
import { estadiosCluesShown, estadiosValue } from '../../utils/estadiosEngine';
import { DrawingCanvas } from '../DrawingCanvas';
import { PINTO_COLORS, addStroke as pintoAddStroke, clearDrawing as pintoClear, undoStroke as pintoUndo } from '../../utils/comoEuPintoEngine';

interface ControllerViewProps {
  room: GameRoom;
  currentPlayerId: string;
  connectionStatus?: 'Connected' | 'Reconnecting' | 'Offline';
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
  const [selectedSwapTarget, setSelectedSwapTarget] = useState<string>('');
  const [repetenteDraft, setRepetenteDraft] = useState<string>('');
  const [pintoColor, setPintoColor] = useState<string>('#F5F2EB');

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
            {spotlight.activePlayer?.avatar || '🎯'}
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
    return (
      <div
        data-testid="master-remote-controller"
        className="min-h-screen bg-[#07080d] p-3 md:p-4 flex flex-col justify-between max-w-md mx-auto space-y-4"
      >
        <div className="space-y-4">
          {/* Header with switch back to Individual Player */}
          <div className="border-2 border-amber-400 bg-gradient-to-r from-amber-950/70 via-[#120e04] to-black p-3.5 flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <div>
              <div className="text-[10px] font-mono-code text-amber-300 font-bold uppercase tracking-widest">
                MODO 2 // NETFLIX GAME CONTROLLER
              </div>
              <div className="font-anton text-lg text-white uppercase tracking-wide">
                🎮 CONTROLE MESTRE DA SALA ({room.roomId})
              </div>
            </div>
            <button
              type="button"
              data-testid="switch-to-individual-player-btn"
              onClick={() => {
                sounds.playTick();
                setIsMasterRemoteMode(false);
              }}
              className="px-2.5 py-1 border border-cyan-400 bg-cyan-950 text-cyan-200 font-mono-code text-[10px] font-bold uppercase cursor-pointer shrink-0"
            >
              🙋‍♂️ Modo Individual
            </button>
          </div>

          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* 1. When TV is in Mode Select / Lobby / Game Setup / Rules */}
          {(room.screen === 'mode-select' || room.screen === 'lobby' || room.screen === 'game-setup' || room.screen === 'rules') && (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-4 space-y-3 shadow-neon-cyan">
              <div className="font-anton text-base text-cyan-300 uppercase tracking-wider">
                📺 ESCOLHER JOGO NA TV:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'limite', name: '🎯 JOGO DO LIMITE' },
                  { id: 'duvido', name: '🚨 JOGO DO DUVIDO' },
                  { id: 'proibido', name: '🚫 JOGO DO PROIBIDO' },
                  { id: 'nota', name: '🔟 JOGO DA NOTA' },
                  { id: 'tem-ou-nao-tem', name: '📊 TEM OU NÃO TEM' },
                  { id: 'perguntas-e-verdades', name: '🃏 PERGUNTAS E VERDADES' }
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    data-testid={`master-remote-game-${g.id}`}
                    onClick={() => {
                      sounds.playPowerup();
                      onUpdateRoom((prev) => ({
                        ...prev,
                        activeGame: g.id as GameId,
                        screen: 'game-setup',
                        roundNumber: 1
                      }));
                    }}
                    className={`p-3 border text-left font-anton text-sm uppercase tracking-wider cursor-pointer transition-all ${
                      room.activeGame === g.id
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-slate-700 bg-black/80 text-white hover:border-cyan-400'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              {room.screen !== 'lobby' && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playFlip();
                    onUpdateRoom((prev) => ({ ...prev, screen: 'lobby', activeGame: null }));
                  }}
                  className="w-full py-2.5 border border-rose-500 bg-rose-950/70 text-rose-200 font-anton text-xs uppercase cursor-pointer"
                >
                  ⬅️ VOLTAR TV PARA O LOBBY
                </button>
              )}
            </div>
          )}

          {/* 2. Master Remote for JOGO DO PROIBIDO */}
          {room.screen === 'playing' && room.activeGame === 'proibido' && room.proibido && (
            <div className="border-2 border-rose-500 bg-[#090b14] p-4 space-y-3 shadow-neon-rose">
              <div className="flex items-center justify-between text-xs font-mono-code text-rose-300 font-bold uppercase">
                <span>🚫 CARTA SECRETA DO PROIBIDO</span>
                <span>PONTOS: {room.proibido.roundScore}</span>
              </div>
              <div className="bg-rose-600 text-white p-3 text-center">
                <div className="text-[10px] font-mono-code uppercase">PALAVRA-ALVO</div>
                <div className="font-anton text-3xl uppercase">
                  {room.proibido.cards[room.proibido.currentCardIndex]?.palavra_alvo}
                </div>
              </div>
              <div className="border border-rose-500/40 bg-black p-3 space-y-1 text-center">
                <div className="text-[10px] font-mono-code text-rose-400 uppercase font-bold">
                  5 PALAVRAS PROIBIDAS:
                </div>
                {ensureStrictForbiddenWordsCount(
                  room.proibido.cards[room.proibido.currentCardIndex]?.palavra_alvo,
                  room.proibido.cards[room.proibido.currentCardIndex]?.palavras_proibidas,
                  5,
                  room.theme
                ).map(
                  (w, i) => (
                    <div key={i} className="font-anton text-lg text-rose-200 uppercase">
                      • {w}
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playSuccess();
                    onUpdateRoom((prev) =>
                      prev.proibido
                        ? { ...prev, proibido: applyProibidoCardOutcome(prev.proibido, 'correct').nextState }
                        : prev
                    );
                  }}
                  className="py-4 border-2 border-emerald-400 bg-emerald-600 text-white font-anton text-sm uppercase cursor-pointer"
                >
                  ✅ ACERTO (+1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playBuzzer();
                    onUpdateRoom((prev) =>
                      prev.proibido
                        ? { ...prev, proibido: applyProibidoCardOutcome(prev.proibido, 'foul').nextState }
                        : prev
                    );
                  }}
                  className="py-4 border-2 border-rose-400 bg-rose-600 text-white font-anton text-sm uppercase cursor-pointer"
                >
                  🚨 FALTA (-1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playFlip();
                    onUpdateRoom((prev) =>
                      prev.proibido
                        ? { ...prev, proibido: applyProibidoCardOutcome(prev.proibido, 'skipped').nextState }
                        : prev
                    );
                  }}
                  className="py-4 border border-slate-600 bg-slate-800 text-slate-200 font-anton text-sm uppercase cursor-pointer"
                >
                  ⏭️ PULAR
                </button>
              </div>
            </div>
          )}

          {/* 3. Master Remote for TEM OU NÃO TEM */}
          {room.screen === 'playing' && room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem && (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-4 space-y-3 shadow-neon-cyan">
              <div className="text-xs font-mono-code text-cyan-300 font-bold uppercase">
                📊 GABARITO DO APRESENTADOR (TOQUE PARA REVELAR NA TV):
              </div>
              <div className="space-y-2">
                {room.temOuNaoTem.items.map((it, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={it.revealed}
                    onClick={() => {
                      sounds.playSuccess();
                      onUpdateRoom((prev) => {
                        if (!prev.temOuNaoTem || prev.temOuNaoTem.items[idx]?.revealed) return prev;
                        const team = prev.temOuNaoTem.activeTeam;
                        const updated = [...prev.temOuNaoTem.items];
                        updated[idx] = { ...updated[idx], revealed: true, revealedByTeam: team };
                        const newRoundScore = {
                          ...prev.temOuNaoTem.roundScore,
                          [team]: (prev.temOuNaoTem.roundScore[team] || 0) + updated[idx].votos
                        };
                        const allRevealed = updated.every((x) => x.revealed);
                        const activeTeams = getActiveTeamIds(prev);
                        const nextTeam = prev.temOuNaoTem.freeDomainTeam
                          ? prev.temOuNaoTem.freeDomainTeam
                          : getNextTeamId(team, activeTeams, prev.temOuNaoTem.eliminatedTeams);
                        return {
                          ...prev,
                          temOuNaoTem: {
                            ...prev.temOuNaoTem,
                            items: updated,
                            roundScore: newRoundScore,
                            activeTeam: nextTeam,
                            turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
                            phase: allRevealed ? 'ROUND_END' : prev.temOuNaoTem.phase
                          }
                        };
                      });
                    }}
                    className={`w-full p-3 border text-left flex items-center justify-between font-anton uppercase cursor-pointer ${
                      it.revealed
                        ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300 opacity-60'
                        : 'border-cyan-400 bg-black text-white hover:bg-cyan-950'
                    }`}
                  >
                    <span>
                      #{idx + 1} — {it.texto}
                    </span>
                    <span className="text-amber-300">{it.votos} PTS</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  sounds.playBuzzer();
                  onUpdateRoom((prev) => {
                    if (!prev.temOuNaoTem) return prev;
                    const activeTeams = getActiveTeamIds(prev);
                    const team = prev.temOuNaoTem.activeTeam;
                    const currentStrikes = (prev.temOuNaoTem.strikes[team] || 0) + 1;
                    const updatedStrikes = { ...prev.temOuNaoTem.strikes, [team]: currentStrikes };
                    const updatedEliminated = [...prev.temOuNaoTem.eliminatedTeams];
                    let freeDomain = prev.temOuNaoTem.freeDomainTeam;
                    let nextTeam = prev.temOuNaoTem.activeTeam;
                    const maxStrikes = prev.temOuNaoTem.maxStrikes || 2;
                    if (currentStrikes >= maxStrikes && !updatedEliminated.includes(team)) {
                      updatedEliminated.push(team);
                    }
                    const survivingTeams = activeTeams.filter((t) => !updatedEliminated.includes(t));
                    if (survivingTeams.length === 1) {
                      freeDomain = survivingTeams[0];
                      nextTeam = survivingTeams[0];
                    } else if (survivingTeams.length > 1) {
                      nextTeam = getNextTeamId(team, activeTeams, updatedEliminated);
                    }
                    return {
                      ...prev,
                      temOuNaoTem: {
                        ...prev.temOuNaoTem,
                        strikes: updatedStrikes,
                        eliminatedTeams: updatedEliminated,
                        freeDomainTeam: freeDomain,
                        activeTeam: nextTeam,
                        turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
                        phase: survivingTeams.length === 0 ? 'ROUND_END' : 'GUESSING'
                      }
                    };
                  });
                }}
                className="w-full py-4 border-2 border-rose-500 bg-rose-600 text-white font-anton text-lg uppercase tracking-wider shadow-neon-rose cursor-pointer"
              >
                ❌ MARCAR ERRO (STRIKE EQUIPE {room.temOuNaoTem.activeTeam})
              </button>
            </div>
          )}

          {/* 4. Master Remote for JOGO DO DUVIDO */}
          {room.screen === 'playing' && room.activeGame === 'duvido' && room.duvido && (
            <div className="border-2 border-rose-500 bg-[#090b14] p-4 space-y-3">
              <div className="text-xs font-mono-code text-rose-300 font-bold uppercase">
                🚨 CATEGORIA SECRETA (SÓ NO CONTROLE):
              </div>
              <div className="font-anton text-xl text-white uppercase">
                "{room.duvido.roundData.categoria_secreta}"
              </div>
              {room.duvido.roundData.dica_arbitro && (
                <div className="p-2 border border-amber-400/60 bg-amber-950/40 text-xs font-mono-code text-amber-200">
                  ⚠️ {room.duvido.roundData.dica_arbitro}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playSuccess();
                    onUpdateRoom((prev) =>
                      prev.duvido
                        ? {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              currentBid: prev.duvido.currentBid + 1,
                              currentBidTeam: prev.duvido.activeTurnTeam,
                              activeTurnTeam: prev.duvido.activeTurnTeam === 'A' ? 'B' : 'A'
                            }
                          }
                        : prev
                    );
                  }}
                  className="py-3.5 border border-cyan-400 bg-cyan-500 text-black font-anton text-sm uppercase cursor-pointer"
                >
                  +1 NO LANCE ({room.duvido.currentBid + 1})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playAlarm();
                    onUpdateRoom((prev) =>
                      prev.duvido
                        ? {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              phase: 'EXECUTION',
                              challengedTeam: prev.duvido.currentBidTeam || 'A',
                              timerActive: prev.timerConfig > 0
                            }
                          }
                        : prev
                    );
                  }}
                  className="py-3.5 border border-rose-500 bg-rose-600 text-white font-anton text-sm uppercase cursor-pointer"
                >
                  🚨 DUVIDO!
                </button>
              </div>
              {room.duvido.phase === 'EXECUTION' && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="font-anton text-base text-cyan-200 text-center">
                    EXECUÇÃO: {room.duvido.validCount} / {room.duvido.currentBid} ITENS VÁLIDOS
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playSuccess();
                        onUpdateRoom((prev) => {
                          if (!prev.duvido) return prev;
                          const next = prev.duvido.validCount + 1;
                          const reached = next >= prev.duvido.currentBid;
                          return {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              validCount: next,
                              phase: reached ? 'RESULT' : prev.duvido.phase,
                              timerActive: reached ? false : prev.duvido.timerActive,
                              resultWinnerTeam: reached ? prev.duvido.challengedTeam : null,
                              resultReason: reached ? 'META ATINGIDA!' : ''
                            }
                          };
                        });
                      }}
                      className="py-3 border-2 border-emerald-400 bg-emerald-600 text-white font-anton text-sm uppercase cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 size={16} />
                      <span>+1 ACERTO</span>
                    </button>
                    <button
                      type="button"
                      disabled={room.duvido.validCount <= 0}
                      onClick={() => {
                        sounds.playTick();
                        onUpdateRoom((prev) => {
                          if (!prev.duvido) return prev;
                          return {
                            ...prev,
                            duvido: {
                              ...prev.duvido,
                              validCount: Math.max(0, prev.duvido.validCount - 1)
                            }
                          };
                        });
                      }}
                      className="py-3 border-2 border-rose-400 bg-rose-950/80 disabled:opacity-40 text-rose-200 font-anton text-sm uppercase cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Minus size={16} />
                      <span>-1 DIMINUIR</span>
                    </button>
                  </div>
                  {/* Gabarito on Master Remote */}
                  <div className="p-2 border border-white/10 bg-black/60 space-y-1">
                    <span className="text-[10px] font-mono-code text-amber-300 font-bold uppercase block">
                      Gabarito de Apoio ({room.duvido.roundData.exemplos_validos?.length || 0}):
                    </span>
                    <div className="flex flex-wrap gap-1 text-[11px] text-slate-300 max-h-32 overflow-y-auto">
                      {room.duvido.roundData.exemplos_validos?.map((ex, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Master Remote for JOGO DA NOTA & JOGO DO LIMITE */}
          {room.screen === 'playing' && room.activeGame === 'nota' && room.nota && (
            <div className="border-2 border-purple-500 bg-[#090b14] p-4 space-y-3 text-center">
              <div className="font-anton text-lg text-purple-300 uppercase">
                🔟 CONTROLE DO JOGO DA NOTA
              </div>
              <div
                onMouseDown={() => setHoldingSecret(true)}
                onMouseUp={() => setHoldingSecret(false)}
                onTouchStart={() => setHoldingSecret(true)}
                onTouchEnd={() => setHoldingSecret(false)}
                className="p-6 border-2 border-amber-400 bg-amber-950/40 cursor-pointer select-none"
              >
                {holdingSecret ? (
                  <span className="font-anton text-6xl text-amber-300">{room.nota.secretScore}</span>
                ) : (
                  <span className="font-mono-code text-xs text-amber-200 font-bold uppercase">
                    👁️ SEGURE AQUI PARA ESPIAR A NOTA SECRETA
                  </span>
                )}
              </div>
              {room.nota.revealSubState === 'REVEALED_LOCKED' && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPowerup();
                    onUpdateRoom((prev) =>
                      prev.nota
                        ? { ...prev, nota: { ...prev.nota, revealSubState: 'SCORING' } }
                        : prev
                    );
                  }}
                  className="w-full py-3 bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer shadow-md"
                >
                  CONTINUAR PARA A PONTUAÇÃO ➔
                </button>
              )}
            </div>
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
    const limite = room.limite;
    const myGuess = limite.guesses[player.id];
    const myAssignedCard: LimitePowerCardType =
      limite.assignedPowerCards?.[player.id] || player.assignedPowerCard || 'x2';
    const myCardMeta = LIMITE_POWER_CARD_META[myAssignedCard];
    const isMyPowerCardUsed = Boolean(
      limite.usedPowerCardsByPlayer?.[player.id] ||
        player.powerCardUsed ||
        limite.powerCardsPlayed?.[player.id]
    );
    const otherPlayers = room.players.filter((p) => p.id !== player.id);
    const isTimeExpired =
      (room.timerConfig > 0 && (limite.timerSeconds ?? 0) <= 0) ||
      (limite.revealCountdown !== null && limite.revealCountdown !== undefined);

    const handleSendGuess = () => {
      if (isTimeExpired) return;
      const normalized = limiteGuess.replace(',', '.');
      const num = parseFloat(normalized);
      if (isNaN(num)) return;
      sounds.playSuccess();
      setLimiteGuess('');
      setIsEditingLimiteGuess(false);
      onUpdateRoom((prev) => ({
        ...prev,
        limite: prev.limite
          ? {
              ...prev.limite,
              guesses: { ...prev.limite.guesses, [player.id]: num },
              submittedPlayers: Array.from(new Set([...prev.limite.submittedPlayers, player.id]))
            }
          : undefined
      }));
    };

    const handlePlayCard = (card: LimitePowerCardType) => {
      if (isMyPowerCardUsed || isTimeExpired) {
        sounds.playBuzzer();
        return;
      }
      sounds.playPowerup();
      onUpdateRoom((prev) => {
        const updatedCards = { ...player.powerCards, [card]: true };
        const updatedPlayers = prev.players.map((p) =>
          p.id === player.id
            ? { ...p, powerCards: updatedCards, powerCardUsed: true }
            : p
        );

        let newPhase = prev.limite?.phase;
        let callTimer = prev.limite?.callTimerRemaining || 0;

        if (card === 'ligacao') {
          newPhase = 'CALL_TIMEOUT';
          callTimer = prev.customConfig?.limiteCallTimeoutSeconds || 30;
        }

        const effectiveSwapPartner =
          selectedSwapTarget || prev.players.find((p) => p.id !== player.id)?.id || '';

        return {
          ...prev,
          players: updatedPlayers,
          limite: prev.limite
            ? {
                ...prev.limite,
                activePowerCard: card,
                phase: newPhase || prev.limite.phase,
                callTimerRemaining: callTimer,
                powerCardsPlayed: { ...prev.limite.powerCardsPlayed, [player.id]: card },
                usedPowerCardsByPlayer: {
                  ...(prev.limite.usedPowerCardsByPlayer || {}),
                  [player.id]: true
                },
                swapTarget:
                  card === 'troca' && effectiveSwapPartner
                    ? { player1: player.id, player2: effectiveSwapPartner }
                    : prev.limite.swapTarget
              }
            : undefined
        };
      });
    };

    const powerCardsEnabled = room.customConfig?.limiteEnablePowerCards !== false;
    const callTimeoutSec = room.customConfig?.limiteCallTimeoutSeconds || 30;
    const isScoringPhase = limite.phase === 'SCORING';
    const isMyWinner = Boolean(limite.winners?.includes(player.id));
    const isMyBusted = Boolean(limite.bustedPlayers?.includes(player.id));

    return wrapIfMultiMode(
      <div className="min-h-screen bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* Neutral Question Box with Fliperama: Jogo do Limite on top */}
          <div
            data-testid="controller-limite-question-box"
            className="border border-slate-700/80 bg-slate-900/60 p-3.5 text-center space-y-1.5"
          >
            <span className="block font-anton text-sm text-slate-400 uppercase tracking-widest">
              🕹️ FLIPERAMA: JOGO DO LIMITE
            </span>
            <p className="text-sm font-semibold text-slate-100 leading-snug">
              {limite.roundData.pergunta}
            </p>
          </div>

          {/* Suspense Countdown Banner before reveal */}
          {limite.revealCountdown !== null &&
            limite.revealCountdown !== undefined &&
            limite.revealCountdown > 0 && (
              <div
                data-testid="controller-limite-suspense-countdown"
                className="border-2 border-amber-400 bg-amber-950/80 p-4 text-center space-y-2 animate-pulse shadow-[0_0_25px_rgba(251,191,36,0.5)]"
              >
                <div className="text-xs font-mono-code text-amber-300 font-bold uppercase tracking-widest">
                  ⏳ ATENÇÃO! REVELANDO A RESPOSTA EM:
                </div>
                <div
                  data-testid="controller-limite-countdown-number"
                  className="font-anton text-6xl text-amber-300 leading-none"
                >
                  {limite.revealCountdown}
                </div>
                <div className="text-[11px] font-mono-code text-amber-200">
                  🔔 Olhe para a tela da TV!
                </div>
              </div>
            )}

          {/* Guess Section: Secret until SCORING phase */}
          {isScoringPhase ? (
            <div
              data-testid="controller-limite-reveal-box"
              className="border-2 border-cyan-400 bg-[#090b14] p-4 text-center space-y-2 shadow-neon-cyan"
            >
              <div className="text-[10px] font-mono-code text-cyan-300 font-bold uppercase tracking-widest">
                RESPOSTA OFICIAL REVELADA
              </div>
              <div className="font-anton text-3xl text-cyan-300">
                {limite.roundData.valor_exato.toLocaleString('pt-BR')} {limite.roundData.unidade}
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono-code text-slate-200">
                Seu palpite revelado:{' '}
                <span className="font-bold text-white">
                  {myGuess !== undefined ? myGuess.toLocaleString('pt-BR') : 'Não enviado'}
                </span>
              </div>
              {isMyWinner && (
                <div className="text-xs font-anton text-emerald-400 uppercase tracking-wider">
                  🏆 VOCÊ PONTUOU NESTA RODADA! (+{limite.pointsAwarded?.[player.id] || 1} PTS)
                </div>
              )}
              {isMyBusted && !isMyWinner && (
                <div className="text-xs font-anton text-rose-400 uppercase tracking-wider">
                  💥 SEU PALPITE PASSOU DO VALOR EXATO!
                </div>
              )}
            </div>
          ) : myGuess !== undefined && !isEditingLimiteGuess ? (
            <div
              data-testid="controller-limite-secret-locked"
              className="border-2 border-emerald-400/70 bg-emerald-950/20 p-5 text-center space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                <Lock size={24} />
              </div>
              <div className="font-anton text-xl text-emerald-300 uppercase tracking-wider">
                🔒 PALPITE SECRETO ENVIADO!
              </div>
              <p className="text-xs font-mono-code text-slate-300">
                Seu palpite está guardado em segredo até a hora de revelar a resposta do jogo total.
              </p>
              {isTimeExpired ? (
                <div
                  data-testid="controller-limite-time-expired-lock"
                  className="p-2.5 border-2 border-rose-500/60 bg-rose-950/50 text-rose-300 font-mono-code text-xs font-bold uppercase tracking-wider text-center"
                >
                  🔒 TEMPO ESGOTADO — PALPITE BLOQUEADO!
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="controller-limite-edit-secret-btn"
                  onClick={() => {
                    sounds.playTick();
                    setLimiteGuess('');
                    setIsEditingLimiteGuess(true);
                  }}
                  className="w-full py-2.5 border border-slate-600 bg-slate-900 hover:border-cyan-400 text-slate-200 font-anton text-xs uppercase tracking-wider cursor-pointer"
                >
                  ✏️ ALTERAR MEU PALPITE SECRETO
                </button>
              )}
            </div>
          ) : isTimeExpired ? (
            <div
              data-testid="controller-limite-time-expired-unsubmitted"
              className="border-2 border-rose-500/70 bg-rose-950/30 p-5 text-center space-y-2 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300">
                <Lock size={24} />
              </div>
              <div className="font-anton text-xl text-rose-300 uppercase tracking-wider">
                ⏰ TEMPO ESGOTADO!
              </div>
              <p className="text-xs font-mono-code text-rose-200">
                {myGuess !== undefined
                  ? `Seu palpite anterior foi mantido e bloqueado. Aguarde a revelação na tela!`
                  : `O prazo para enviar palpites encerrou. Aguarde a revelação na tela!`}
              </p>
            </div>
          ) : (
            <div className="border-2 border-cyan-400 bg-black p-4 space-y-3 shadow-neon-cyan">
              <label
                htmlFor="controller-limite-guess"
                className="block text-xs font-mono-code text-cyan-300 font-bold"
              >
                DIGITE SEU PALPITE SECRETO ({limite.roundData.unidade}):
              </label>
              <input
                id="controller-limite-guess"
                name="controllerLimiteGuess"
                type="number"
                step="any"
                autoComplete="off"
                value={limiteGuess}
                onChange={(e) => setLimiteGuess(e.target.value)}
                placeholder="Ex: 485"
                className="w-full bg-black border-2 border-cyan-400 p-3 text-white font-anton text-3xl text-center focus:outline-none"
              />
              <button
                onClick={handleSendGuess}
                disabled={!limiteGuess}
                className="w-full py-3 border-2 border-cyan-300 bg-cyan-400 disabled:opacity-50 text-black font-anton text-base uppercase tracking-wider cursor-pointer"
              >
                🔒 ENVIAR PALPITE SECRETO
              </button>
              {isEditingLimiteGuess && (
                <button
                  type="button"
                  onClick={() => setIsEditingLimiteGuess(false)}
                  className="w-full py-1.5 text-xs font-mono-code text-slate-400 hover:text-white uppercase cursor-pointer"
                >
                  Cancelar alteração
                </button>
              )}
            </div>
          )}

          {/* 1 Drawn Power Card per Player (Single-Use in the Match) */}
          {powerCardsEnabled && (
            <div
              data-testid="controller-limite-power-card-box"
              className="border border-slate-700 bg-[#0c0d16] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-anton text-amber-300 uppercase tracking-wider">
                  🎲 SEU PODER SORTEADO NO JOGO:
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                    isMyPowerCardUsed
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-emerald-400 text-black'
                  }`}
                >
                  {isMyPowerCardUsed ? 'JÁ USADO (0/1)' : 'USO ÚNICO (1/1)'}
                </span>
              </div>

              <div
                className={`p-3 border ${myCardMeta.borderClass} ${myCardMeta.bgClass} space-y-2`}
              >
                <div className={`font-anton text-base uppercase ${myCardMeta.textClass}`}>
                  {myCardMeta.icon}{' '}
                  {myAssignedCard === 'ligacao'
                    ? `Carta Ligação (${callTimeoutSec}s)`
                    : myCardMeta.title}
                </div>
                <p className="text-xs font-mono-code text-slate-200 leading-relaxed">
                  {myCardMeta.description}
                </p>

                {myAssignedCard === 'troca' && !isMyPowerCardUsed && otherPlayers.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <label className="block text-[10px] font-mono-code text-cyan-300 uppercase font-bold">
                      Trocar palpite com qual jogador?
                    </label>
                    <select
                      value={selectedSwapTarget || otherPlayers[0]?.id || ''}
                      onChange={(e) => setSelectedSwapTarget(e.target.value)}
                      className="w-full bg-black border border-cyan-400/60 px-2.5 py-1.5 text-xs font-mono-code text-white"
                    >
                      {otherPlayers.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.avatar} {op.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  data-testid="controller-limite-use-power-btn"
                  onClick={() => handlePlayCard(myAssignedCard)}
                  disabled={isMyPowerCardUsed || isScoringPhase}
                  className="w-full py-2.5 border border-amber-300 bg-amber-400 hover:bg-amber-300 disabled:opacity-35 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
                >
                  {isMyPowerCardUsed
                    ? '✓ PODER JÁ UTILIZADO NESTE JOGO'
                    : `⚡ USAR ${myCardMeta.title.toUpperCase()} AGORA`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- GAME 2: JOGO DO DUVIDO CONTROLLER ---
  if (room.activeGame === 'duvido' && room.duvido) {
    const duvido = room.duvido;
    const isBlindfolded =
      (player.team === 'A' && duvido.blindfoldedPlayers.A === player.id) ||
      (player.team === 'B' && duvido.blindfoldedPlayers.B === player.id);
    const isNegotiator = !isBlindfolded;
    const isMyTurn = duvido.activeTurnTeam === player.team;
    const isChallengedTeam = Boolean(duvido.challengedTeam && player.team === duvido.challengedTeam);
    const isDoubtingTeam = !isChallengedTeam;

    const handleRaiseBid = () => {
      const nextBid = duvido.currentBid + customBid;
      sounds.playSuccess();
      safeVibrate(50);
      onUpdateRoom((prev) => ({
        ...prev,
        duvido: prev.duvido
          ? {
              ...prev.duvido,
              currentBid: nextBid,
              currentBidTeam: player.team,
              activeTurnTeam: getNextTeamId(player.team, getActiveTeamIds(prev))
            }
          : undefined
      }));
    };

    const handleCallDuvido = () => {
      sounds.playAlarm();
      safeVibrate([100, 80, 120]);
      onUpdateRoom((prev) => ({
        ...prev,
        duvido: prev.duvido
          ? {
              ...prev.duvido,
              phase: 'EXECUTION',
              challengedTeam: prev.duvido.currentBidTeam || getNextTeamId(player.team, getActiveTeamIds(prev)),
              timerActive: prev.timerConfig > 0
            }
          : undefined
      }));
    };

    const handleAddValid = () => {
      sounds.playSuccess();
      safeVibrate([60, 40, 80]);
      onUpdateRoom((prev) => {
        if (!prev.duvido) return prev;
        const next = prev.duvido.validCount + 1;
        const reached = next >= prev.duvido.currentBid;
        return {
          ...prev,
          duvido: {
            ...prev.duvido,
            validCount: next,
            phase: reached ? 'RESULT' : prev.duvido.phase,
            timerActive: reached ? false : prev.duvido.timerActive,
            resultWinnerTeam: reached ? prev.duvido.challengedTeam : null,
            resultReason: reached ? `META DE ${prev.duvido.currentBid} ITENS ALCANÇADA COM SUCESSO!` : ''
          }
        };
      });
    };

    const handleDecrementValid = () => {
      sounds.playTick();
      safeVibrate(60);
      onUpdateRoom((prev) => {
        if (!prev.duvido) return prev;
        return {
          ...prev,
          duvido: {
            ...prev.duvido,
            validCount: Math.max(0, prev.duvido.validCount - 1)
          }
        };
      });
    };

    const handleCallInvalid = () => {
      sounds.playBuzzer();
      safeVibrate([150, 100, 150]);
      onUpdateRoom((prev) => {
        if (!prev.duvido) return prev;
        const winningTeam = prev.duvido.challengedTeam === 'A' ? 'B' : 'A';
        return {
          ...prev,
          duvido: {
            ...prev.duvido,
            phase: 'RESULT',
            timerActive: false,
            resultWinnerTeam: winningTeam,
            resultReason: 'ITEM INVÁLIDO OU DESISTÊNCIA! Ponto para a equipe que duvidou.'
          }
        };
      });
    };

    if (isBlindfolded && duvido.phase !== 'EXECUTION') {
      return wrapIfMultiMode(
        <div className="min-h-[60vh] bg-black p-6 flex flex-col items-center justify-center text-center space-y-6">
          <EyeOff size={80} className="text-amber-400 animate-pulse" />
          <h1 className="font-anton text-4xl text-white uppercase">
            VOCÊ ESTÁ VENDADO!
          </h1>
          <p className="text-sm text-slate-300 max-w-xs">
            Feche os olhos ou vire o celular para baixo. Ouça apenas a voz da sala até ouvir o alarme do "DUVIDO!".
          </p>
        </div>
      );
    }

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* Secret Category only for Negotiators */}
          <div className="border-2 border-rose-500 bg-rose-950/40 p-4 space-y-1">
            <span className="text-[10px] font-mono-code font-bold uppercase text-rose-300">
              CATEGORIA SECRETA DO LEILÃO:
            </span>
            <div className="font-anton text-xl text-white uppercase">
              "{duvido.roundData.categoria_secreta}"
            </div>
            <div className="text-xs text-cyan-300 font-mono-code">
              Lance Atual: {duvido.currentBid} itens
            </div>
          </div>

          {duvido.phase === 'AUCTION' && (
            <div className="border-2 border-cyan-400 bg-black p-4 space-y-4">
              <span className="text-xs font-anton text-cyan-300 uppercase tracking-wide block">
                {isMyTurn ? '👉 SUA VEZ DE DAR O LANCE NO LEILÃO!' : 'Aguardando lance do rival...'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCustomBid(Math.max(1, customBid - 1))}
                  className="w-12 h-12 bg-slate-800 text-white font-anton text-xl border border-slate-700"
                >
                  -
                </button>
                <div className="flex-1 text-center font-anton text-3xl text-white">
                  +{customBid}
                </div>
                <button
                  onClick={() => setCustomBid(customBid + 1)}
                  className="w-12 h-12 bg-slate-800 text-white font-anton text-xl border border-slate-700"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleRaiseBid}
                disabled={!isMyTurn}
                className="w-full py-3.5 border-2 border-cyan-300 bg-cyan-400 disabled:opacity-40 text-black font-anton text-base uppercase tracking-wider"
              >
                AUMENTAR APOSTA PARA {duvido.currentBid + customBid} ITENS
              </button>

              <button
                onClick={handleCallDuvido}
                disabled={!isMyTurn || duvido.currentBid <= 0}
                className="w-full py-4 border-2 border-rose-500 bg-rose-600 disabled:opacity-40 text-white font-anton text-xl uppercase tracking-widest shadow-neon-rose"
              >
                🚨 DUVIDO!
              </button>
            </div>
          )}

          {duvido.phase === 'EXECUTION' && (
            isChallengedTeam ? (
              /* Screen for the challenged team on the berlinda (no answers shown to prevent cheating) */
              <div className="border-2 border-amber-400 bg-amber-950/40 p-4 space-y-3 text-center rounded-lg shadow-lg">
                <div className="text-xs font-mono-code text-amber-300 font-bold uppercase tracking-wider">
                  🔥 SUA EQUIPE ESTÁ NA BERLINDA!
                </div>
                <div className="font-anton text-xl sm:text-2xl text-white uppercase leading-tight">
                  Cite em voz alta {duvido.currentBid} itens válidos!
                </div>
                <div className="border border-amber-400/50 bg-black/80 p-3 space-y-1">
                  <div className="text-[10px] font-mono-code text-slate-400 uppercase">
                    ACERTOS VALIDADOS PELA EQUIPE ADVERSÁRIA:
                  </div>
                  <div className="font-anton text-4xl sm:text-5xl text-cyan-300">
                    {duvido.validCount} / {duvido.currentBid}
                  </div>
                </div>
                <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                  A equipe adversária está com o gabarito oficial no celular e avaliando cada resposta dita em voz alta.
                </p>
              </div>
            ) : (
              /* Screen for the doubting / refereeing team with + / - scoring and complete gabarito */
              <div className="space-y-3">
                <div className="border-2 border-cyan-400 bg-cyan-950/40 p-3 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-mono-code font-bold uppercase text-cyan-300">
                    <Gavel size={14} />
                    <span>SUA EQUIPE ESTÁ DUVIDANDO & FISCALIZANDO</span>
                  </div>
                  <div className="font-anton text-sm sm:text-base text-white uppercase">
                    Equipe {duvido.challengedTeam} precisa citar {duvido.currentBid} itens válidos!
                  </div>
                </div>

                <div className="border-2 border-emerald-400 bg-black p-4 space-y-3 text-center shadow-lg">
                  <div className="text-xs font-mono-code uppercase font-bold text-emerald-400">
                    PLACAR DE RESPOSTAS VÁLIDAS:
                  </div>
                  <div
                    data-testid="duvido-mobile-valid-counter"
                    className="font-anton text-4xl sm:text-5xl text-white leading-none"
                  >
                    {duvido.validCount} / {duvido.currentBid}
                  </div>
                  <div className="text-[11px] font-mono-code text-slate-300">
                    Meta: faltam {Math.max(0, duvido.currentBid - duvido.validCount)} itens
                  </div>

                  {/* Direct +1 and -1 Scoring Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      data-testid="duvido-mobile-add-btn"
                      onClick={handleAddValid}
                      className="py-3.5 px-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-anton text-base sm:text-lg uppercase flex items-center justify-center gap-1.5 shadow-md transition-transform cursor-pointer"
                    >
                      <CheckCircle2 size={20} />
                      <span>+1 ACERTOU</span>
                    </button>

                    <button
                      type="button"
                      data-testid="duvido-mobile-dec-btn"
                      onClick={handleDecrementValid}
                      disabled={duvido.validCount <= 0}
                      className="py-3.5 px-2 border-2 border-rose-400 bg-rose-950/80 hover:bg-rose-900 active:scale-95 disabled:opacity-40 text-rose-200 font-anton text-base sm:text-lg uppercase flex items-center justify-center gap-1.5 transition-transform cursor-pointer"
                      title="Diminuir se o item não for correto ou clique acidental"
                    >
                      <Minus size={20} />
                      <span>-1 DIMINUIR</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    data-testid="duvido-mobile-invalid-btn"
                    onClick={handleCallInvalid}
                    className="w-full py-2 border border-rose-500/50 bg-rose-950/30 hover:bg-rose-900/60 text-rose-300 font-mono-code text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    🚨 Item Inválido / Desistência (Fim da Rodada)
                  </button>
                </div>

                {/* Gabarito de Apoio com as Respostas Oficiais no Celular */}
                <div className="border border-white/20 bg-slate-950 p-3 space-y-2 text-left shadow-lg">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono-code font-bold uppercase text-amber-300">
                      <span>📋 GABARITO OFICIAL ({duvido.roundData.exemplos_validos?.length || 0} RESPOSTAS)</span>
                    </div>
                    <span className="text-[10px] font-mono-code text-cyan-300 font-semibold">
                      Toque para +1
                    </span>
                  </div>
                  <p className="text-[10px] font-mono-code text-slate-400 leading-tight">
                    Consulte as respostas válidas abaixo para avaliar se o oponente acertou. Toque em um item para pontuar (+1) ou use os botões acima:
                  </p>

                  <div
                    data-testid="duvido-mobile-gabarito-list"
                    className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-1 bg-black/60 border border-white/10"
                  >
                    {duvido.roundData.exemplos_validos?.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={handleAddValid}
                        className="px-2.5 py-1 text-xs font-medium border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-500 hover:text-black text-cyan-200 transition-colors text-left cursor-pointer active:scale-95"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // --- GAME 3: JOGO DO PROIBIDO CONTROLLER ---
  if (room.activeGame === 'proibido' && room.proibido) {
    const proibido = room.proibido;
    const currentCard = proibido.cards[proibido.currentCardIndex];
    const roleInfo = getProibidoPlayerRole(proibido, player, room.players);
    const { isSpeaker, isGuesser, isReferee, speakerPlayer, guesserPlayer } = roleInfo;
    const nextTurn = getNextProibidoTurnInfo(room);
    const is2Player = Boolean(proibido.is2PlayerMode || room.players.length === 2);

    const updateProibidoCircular = (outcome: 'correct' | 'foul' | 'skipped') => {
      onUpdateRoom((prev) => {
        if (!prev.proibido || prev.proibido.phase === 'SUMMARY') return prev;
        const { nextState } = applyProibidoCardOutcome(prev.proibido, outcome);
        return {
          ...prev,
          proibido: nextState
        };
      });
    };

    const handleHitCard = () => {
      sounds.playSuccess();
      updateProibidoCircular('correct');
    };

    const handleSkipCard = () => {
      sounds.playFlip();
      updateProibidoCircular('skipped');
    };

    const handleFoulCard = () => {
      sounds.playBuzzer();
      updateProibidoCircular('foul');
    };

    const handleStartTimerFromMobile = () => {
      sounds.playPowerup();
      onUpdateRoom((prev) => {
        if (!prev.proibido) return prev;
        return {
          ...prev,
          proibido: {
            ...prev.proibido,
            phase: 'PLAYING',
            timerActive: room.timerConfig > 0
          }
        };
      });
    };

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* Role Badge Indicator */}
          <div
            data-testid="controller-proibido-role-badge"
            className={`p-2.5 border-2 text-center space-y-0.5 ${
              isGuesser
                ? 'border-amber-400 bg-amber-950/70 text-amber-200'
                : isSpeaker
                ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200'
                : isReferee
                ? 'border-rose-500 bg-rose-950/70 text-rose-200'
                : 'border-slate-700 bg-black/60 text-slate-300'
            }`}
          >
            <div className="font-anton text-base uppercase tracking-wider">
              {isGuesser
                ? '🙈 VOCÊ É O ADIVINHADOR (DE OLHO FECHADO)'
                : isSpeaker
                ? '🗣️ VOCÊ É O ORADOR (QUEM FALA E DÁ PISTAS)'
                : isReferee
                ? '🚨 VOCÊ É O FISCAL (ÁRBITRO ADVERSÁRIO)'
                : '👀 ESPECTADOR'}
            </div>
            <div className="text-[10px] font-mono-code opacity-90">
              {isGuesser
                ? `Feche os olhos ou fique de costas! Ouça as pistas de ${speakerPlayer?.name}.`
                : isSpeaker
                ? `Explique as palavras para ${guesserPlayer?.name} sem falar as proibidas!`
                : isReferee
                ? `Fiscalize se ${speakerPlayer?.name} pronuncia alguma palavra proibida.`
                : `Aguarde a sua vez na roda.`}
            </div>
          </div>

          {/* PHASE 1: READY */}
          {proibido.phase === 'READY' && (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-5 text-center space-y-3">
              <div className="text-xl font-anton text-white uppercase">
                RODADA PRONTA // {proibido.cards.length} CARTAS
              </div>
              <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                {isGuesser
                  ? `Você vai adivinhar! Feche os olhos ou fique de costas para a TV. As palavras não vão aparecer na sua tela para não dar spoiler.`
                  : isSpeaker
                  ? `Você vai falar! Assim que o tempo começar, descreva cada carta para ${guesserPlayer?.name} sem pronunciar as 5 palavras proibidas.`
                  : `Prepare-se para fiscalizar com o botão de falta.`}
              </p>
              {(isSpeaker || player.isVip || player.id === room.hostId) && (
                <button
                  type="button"
                  data-testid="controller-proibido-start-timer-btn"
                  onClick={handleStartTimerFromMobile}
                  className="w-full py-3.5 border-2 border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base uppercase tracking-wider cursor-pointer shadow-neon-cyan"
                >
                  {room.timerConfig === 0
                    ? 'INICIAR RODADA (TEMPO LIVRE)'
                    : `INICIAR CRONÔMETRO (${room.timerConfig}S) ➔`}
                </button>
              )}
            </div>
          )}

          {/* PHASE 2: SUMMARY (WHEN TIMER ENDS OR ALL CARDS COMPLETED) */}
          {proibido.phase === 'SUMMARY' && (
            <div
              data-testid="controller-proibido-summary-panel"
              className="border-2 border-[#17B8B8] bg-[#07080d] p-4 text-center space-y-3 shadow-neon-cyan"
            >
              <div className="inline-block px-3 py-0.5 bg-[#E6194B] text-white font-anton text-xs uppercase tracking-widest">
                ⏰ TEMPO ESGOTADO!
              </div>
              <div className="font-anton text-2xl text-white uppercase">
                PONTUAÇÃO: <span className="text-[#17B8B8]">+{proibido.roundScore} PONTOS</span>
              </div>
              <p className="text-xs font-mono-code text-slate-300">
                {is2Player
                  ? `${proibido.roundScore} de ${proibido.cards.length} palavras acertadas em equipe cooperativa!`
                  : `${proibido.roundScore} de ${proibido.cards.length} palavras acertadas pela Equipe ${proibido.speakerTeam}!`}
              </p>

              {/* Next player notice */}
              <div className="p-2.5 border border-white/10 bg-white/[0.03] space-y-1">
                <div className="text-[10px] font-mono-code text-cyan-300 font-bold uppercase">
                  {nextTurn.isGameOver ? '🏁 PARTIDA FINALIZADA' : '👉 PRÓXIMA VEZ / PRÓXIMO A FALAR:'}
                </div>
                <div className="font-anton text-base text-white uppercase flex items-center justify-center gap-1.5">
                  <span>{nextTurn.nextSpeakerAvatar}</span>
                  <span className="text-amber-300">{nextTurn.nextSpeakerName}</span>
                  <span className="text-slate-400 text-xs font-mono-code">
                    ({nextTurn.nextTeamName})
                  </span>
                </div>
              </div>

              {onNextRound && (
                <button
                  type="button"
                  data-testid="controller-proibido-next-turn-btn"
                  onClick={onNextRound}
                  className="w-full py-3.5 border-2 border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base uppercase tracking-wider cursor-pointer shadow-neon-cyan flex items-center justify-center gap-2"
                >
                  <span>
                    {nextTurn.isGameOver
                      ? '🏆 VER PLACAR FINAL ➔'
                      : `AVANÇAR PARA ${nextTurn.nextSpeakerName.toUpperCase()} ➔`}
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}

          {/* PHASE 3: PLAYING */}
          {proibido.phase === 'PLAYING' && (
            <>
              {/* GUESSER BLINDFOLD VIEW: ZERO SPOILERS / NO WORDS EVER */}
              {isGuesser ? (
                <div
                  data-testid="controller-proibido-guesser-blindfold"
                  className="border-2 border-amber-400 bg-[#0d0d16] p-6 text-center space-y-4 shadow-lg"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl">
                    🙈
                  </div>
                  <div className="space-y-1">
                    <div className="font-anton text-2xl text-amber-300 uppercase">
                      VOCÊ ESTÁ ADIVINHANDO!
                    </div>
                    <div className="text-xs font-mono-code text-rose-300 uppercase font-bold">
                      FECHE OS OLHOS OU FIQUE DE COSTAS PARA A TELA
                    </div>
                  </div>
                  <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                    Ouça atentamente as pistas de <strong className="text-cyan-300 font-anton">{speakerPlayer?.name}</strong> e
                    tente adivinhar a palavra-alvo antes do tempo acabar!
                  </p>
                  <div className="p-2 border border-white/10 bg-black/50 text-[11px] font-mono-code text-cyan-200">
                    Carta {proibido.currentCardIndex + 1} de {proibido.cards.length} · Acertos: <strong className="text-emerald-400">+{proibido.roundScore}</strong>
                  </div>
                  <div className="text-[10px] font-mono-code text-amber-400/80 font-bold uppercase">
                    🔒 Palavras secretas ocultadas no seu celular para não estragar o jogo
                  </div>
                </div>
              ) : (
                /* SPEAKER OR REFEREE VIEW (SHOWS CARD & WORDS) */
                <div className="border-2 border-rose-500 bg-[#090b14] p-4 space-y-3">
                  <div className="bg-rose-600 text-white p-3 text-center">
                    <span className="text-[10px] font-mono-code uppercase block">PALAVRA-ALVO</span>
                    <div className="font-anton text-3xl uppercase">{currentCard?.palavra_alvo}</div>
                  </div>

                  <div className="border border-rose-500/40 bg-black/60 p-3 space-y-1">
                    <span className="text-[10px] font-mono-code uppercase text-rose-400 block text-center font-bold">
                      PALAVRAS PROIBIDAS (NÃO PODE FALAR):
                    </span>
                    {ensureStrictForbiddenWordsCount(
                      currentCard?.palavra_alvo,
                      currentCard?.palavras_proibidas,
                      5,
                      room.theme
                    ).map((w, idx) => (
                      <div key={idx} className="font-anton text-lg text-rose-300 text-center uppercase">
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons based on role */}
              {isSpeaker && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleHitCard}
                    data-testid="controller-proibido-hit-btn"
                    className="py-4 border border-emerald-400 bg-emerald-600 text-white font-anton text-base uppercase cursor-pointer"
                  >
                    ACERTOU! (+1)
                  </button>
                  <button
                    onClick={handleSkipCard}
                    data-testid="controller-proibido-skip-btn"
                    className="py-4 border border-slate-600 bg-slate-800 text-slate-300 font-anton text-base uppercase cursor-pointer"
                  >
                    PULAR CARTA
                  </button>
                </div>
              )}

              {isReferee && (
                <button
                  onClick={handleFoulCard}
                  data-testid="controller-proibido-foul-btn"
                  className="w-full py-5 border-2 border-rose-500 bg-rose-600 text-white font-anton text-2xl uppercase tracking-widest shadow-neon-rose flex items-center justify-center gap-2 cursor-pointer"
                >
                  <AlertTriangle size={24} />
                  <span>🚨 FALTA! (FALOU PROIBIDA)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // --- GAME 4: JOGO DA NOTA CONTROLLER ---
  if (room.activeGame === 'nota' && room.nota) {
    const nota = room.nota;
    const isSpeaker = player.id === nota.speakerPlayerId;
    const scaleMin = nota.scaleMin ?? 1;
    const scaleMax = nota.scaleMax || 10;
    const isRevealPhase = nota.phase === 'STEP_4_REVEAL' || nota.phase === 'REVEAL';

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {isRevealPhase ? (
            nota.revealSubState === 'SPINNING' ? (
              <div className="border-2 border-cyan-400 bg-[#090b14] p-6 text-center space-y-3">
                <span className="text-4xl animate-spin block">🎰</span>
                <span className="font-anton text-lg text-cyan-300 uppercase block tracking-wider">
                  O PIÃO ESTÁ GIRANDO NO TELÃO!
                </span>
                <p className="text-xs font-mono-code text-slate-300">
                  Olhe para a TV: a nota secreta está sendo sorteada e revelada agora!
                </p>
              </div>
            ) : (
              <div className="border-2 border-[#FFE600] bg-[#0c0a16] p-6 text-center space-y-3 shadow-[0_0_20px_rgba(255,230,0,0.25)]">
                <span className="text-xs font-mono-code text-amber-300 font-bold uppercase tracking-wider block">
                  🎰 NOTA OFICIAL REVELADA NA TV
                </span>
                <div className="font-anton text-7xl text-[#FFE600] leading-none">
                  {nota.secretScore}
                </div>
                <p className="text-xs font-mono-code text-slate-300">
                  {isSpeaker
                    ? 'Acompanhe no telão os pontos ganhos por cada jogador que acertou!'
                    : `Quem acertou a nota ${nota.secretScore} na mesa leva +1 ponto!`}
                </p>
              </div>
            )
          ) : isSpeaker ? (
            <div className="border-2 border-purple-500 bg-[#0c0a16] p-6 text-center space-y-4">
              <span className="font-anton text-lg text-purple-300 uppercase">
                VOCÊ É O NARRADOR DA RODADA!
              </span>

              {/* Hold to view secret score */}
              <div
                onMouseDown={() => setHoldingSecret(true)}
                onMouseUp={() => setHoldingSecret(false)}
                onTouchStart={() => setHoldingSecret(true)}
                onTouchEnd={() => setHoldingSecret(false)}
                className="w-32 h-44 mx-auto border-2 border-purple-400 bg-purple-950 flex flex-col items-center justify-center cursor-pointer select-none shadow-md"
              >
                {holdingSecret ? (
                  <span className="font-anton text-7xl text-amber-300">{nota.secretScore}</span>
                ) : (
                  <div className="space-y-2 p-2">
                    <span className="text-3xl">👁️</span>
                    <p className="text-[11px] font-mono-code text-purple-200">
                      SEGURE PARA VER SUA NOTA ({scaleMin} A {scaleMax})
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs font-mono-code text-slate-300">
                Responda às perguntas na conversa ao vivo na intensidade da sua nota secreta!
              </p>
            </div>
          ) : (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-5 text-center space-y-3">
              <span className="text-sm font-anton text-cyan-300 uppercase tracking-wide block">
                JOGO DA NOTA ({scaleMin} A {scaleMax}) • INDIVIDUAL
              </span>
              <div className="text-xs font-mono-code text-amber-300 font-bold">
                SEUS PONTOS INDIVIDUAIS: {player.score} PTS
              </div>
              <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                Acompanhe as etapas na TV, ouça as pistas do Narrador e dê o seu palpite individual em voz alta na roda!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- GAME 5: TEM OU NÃO TEM CONTROLLER ---
  if (room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem) {
    const tem = room.temOuNaoTem;
    const isMyTeamTurn = tem.activeTeam === player.team;

    const normalizeStr = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const handleSendTemGuess = () => {
      const guessText = temGuess.trim();
      if (!guessText || !isMyTeamTurn) return;

      const team = player.team;

      let matchedIndex = -1;
      for (let i = 0; i < tem.items.length; i++) {
        const item = tem.items[i];
        if (item.revealed) continue;
        if (checkAnswerFuzzyMatch(guessText, item.texto, item.sinonimos_aceitos)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        sounds.playSuccess();
        onUpdateRoom((prev) => {
          if (!prev.temOuNaoTem) return prev;
          const activeTeams = getActiveTeamIds(prev);
          const updatedItems = [...prev.temOuNaoTem.items];
          updatedItems[matchedIndex] = {
            ...updatedItems[matchedIndex],
            revealed: true,
            revealedByTeam: team
          };
          const addedScore = updatedItems[matchedIndex].votos;
          const newRoundScore = {
            ...prev.temOuNaoTem.roundScore,
            [team]: (prev.temOuNaoTem.roundScore[team] || 0) + addedScore
          };
          const allRevealed = updatedItems.every((it) => it.revealed);
          const nextActiveTeam = prev.temOuNaoTem.freeDomainTeam
            ? prev.temOuNaoTem.freeDomainTeam
            : getNextTeamId(team, activeTeams, prev.temOuNaoTem.eliminatedTeams);

          return {
            ...prev,
            temOuNaoTem: {
              ...prev.temOuNaoTem,
              items: updatedItems,
              roundScore: newRoundScore,
              activeTeam: nextActiveTeam,
              turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
              phase: allRevealed ? 'ROUND_END' : 'GUESSING',
              lastGuessFeedback: {
                text: guessText,
                hit: true,
                itemIndex: matchedIndex,
                team
              }
            }
          };
        });
      } else {
        sounds.playBuzzer();
        onUpdateRoom((prev) => {
          if (!prev.temOuNaoTem) return prev;
          const activeTeams = getActiveTeamIds(prev);
          const currentStrikes = (prev.temOuNaoTem.strikes[team] || 0) + 1;
          const updatedStrikes = { ...prev.temOuNaoTem.strikes, [team]: currentStrikes };
          const updatedEliminated = [...prev.temOuNaoTem.eliminatedTeams];
          let freeDomain = prev.temOuNaoTem.freeDomainTeam;
          let nextTeam = prev.temOuNaoTem.activeTeam;
          const maxStrikes = prev.temOuNaoTem.maxStrikes || 2;

          if (currentStrikes >= maxStrikes && !updatedEliminated.includes(team)) {
            updatedEliminated.push(team);
          }

          const survivingTeams = activeTeams.filter((t) => !updatedEliminated.includes(t));
          if (survivingTeams.length === 1) {
            freeDomain = survivingTeams[0];
            nextTeam = survivingTeams[0];
          } else if (survivingTeams.length > 1) {
            nextTeam = getNextTeamId(team, activeTeams, updatedEliminated);
          }

          const allEliminated = survivingTeams.length === 0;

          return {
            ...prev,
            temOuNaoTem: {
              ...prev.temOuNaoTem,
              strikes: updatedStrikes,
              eliminatedTeams: updatedEliminated,
              freeDomainTeam: freeDomain,
              activeTeam: nextTeam,
              turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
              phase: allEliminated ? 'ROUND_END' : 'GUESSING',
              lastGuessFeedback: {
                text: guessText,
                hit: false,
                team
              }
            }
          };
        });
      }

      setTemGuess('');
    };

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          <div className="border border-cyan-400/60 bg-cyan-950/30 p-3 text-center">
            <span className="font-anton text-base text-cyan-300 uppercase block">
              TEM OU NÃO TEM (TOP {tem.items.length})
            </span>
            <p className="text-xs text-white font-medium">
              "{tem.roundData.pergunta}"
            </p>
          </div>

          <div className="border-2 border-rose-500 bg-black p-4 space-y-3">
            <label htmlFor="controller-tem-guess" className="text-xs font-anton text-rose-300 uppercase block">
              {isMyTeamTurn ? '👉 VEZ DA SUA EQUIPE PALPITAR!' : 'Vez da outra equipe...'}
            </label>
            <input
              id="controller-tem-guess"
              name="controllerTemGuess"
              type="text"
              autoComplete="off"
              value={temGuess}
              onChange={(e) => setTemGuess(e.target.value)}
              placeholder="Digite o palpite da sua equipe..."
              className="w-full bg-black border border-cyan-400 p-3 text-white text-sm focus:outline-none"
            />
            <button
              onClick={handleSendTemGuess}
              disabled={!isMyTeamTurn || !temGuess.trim()}
              className="w-full py-3 border-2 border-cyan-300 bg-cyan-400 disabled:opacity-40 text-black font-anton text-sm uppercase cursor-pointer"
            >
              ENVIAR PALPITE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME 6: PERGUNTAS E VERDADES (O JOGO DO DIABO) CONTROLLER ---
  if (room.activeGame === 'perguntas-e-verdades' && room.perguntasEVerdades) {
    const pv = room.perguntasEVerdades;
    const myTokens = pv.tokens[player.id] ?? 10;
    const myAlertLight = Boolean(pv.tokenAlertLight[player.id]);
    const myHand = pv.playerHands[player.id] || [];
    const isMyHandReady = Boolean(pv.handReady[player.id]);
    const myValidation = validateSuitAscendingOrder(myHand);
    const full52Deck = createFull52Deck();

    // Calculate answer automatically for whichever question is active on TV (or selected locally)
    const activeQNum = pv.selectedQuestionNumber || pvCalcQuestionNum;
    const autoCalcAnswer =
      myHand.length === 8
        ? computeOfficialQuestionAnswer(activeQNum, myHand, {
            positions1Based: pv.selectedPositionsQ1,
            targetValue: pv.selectedValueQ7,
            targetSuit: pv.selectedSuitQ8
          })
        : null;

    const handleToggleCardInHand = (card: PVCard) => {
      sounds.playTick();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        const current = prev.perguntasEVerdades.playerHands[player.id] || [];
        const exists = current.some((c) => c.id === card.id);
        let nextHand: PVCard[];
        if (exists) {
          nextHand = current.filter((c) => c.id !== card.id);
        } else {
          if (current.length >= 8) return prev;
          nextHand = [...current, card];
        }
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            playerHands: {
              ...prev.perguntasEVerdades.playerHands,
              [player.id]: nextHand
            },
            handReady: {
              ...prev.perguntasEVerdades.handReady,
              [player.id]: false
            }
          }
        };
      });
    };

    const handleAutoSortMyHand = () => {
      sounds.playSuccess();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        const current = prev.perguntasEVerdades.playerHands[player.id] || [];
        const sorted = autoSortSameSuitCards(current);
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            playerHands: {
              ...prev.perguntasEVerdades.playerHands,
              [player.id]: sorted
            }
          }
        };
      });
    };

    const handleDealRandomValidForMe = () => {
      sounds.playPowerup();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        const dealt = dealValidRandomHand();
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            playerHands: {
              ...prev.perguntasEVerdades.playerHands,
              [player.id]: dealt
            },
            handReady: {
              ...prev.perguntasEVerdades.handReady,
              [player.id]: true
            }
          }
        };
      });
    };

    const handleLockMyHand = () => {
      if (myHand.length !== 8 || !myValidation.valid) {
        sounds.playBuzzer();
        return;
      }
      sounds.playSuccess();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            handReady: {
              ...prev.perguntasEVerdades.handReady,
              [player.id]: true
            }
          }
        };
      });
    };

    const handleSubmitSecretTokenBid = () => {
      const clamped = Math.max(0, Math.min(myTokens, pvBidInput));
      sounds.playSuccess();
      onUpdateRoom((prev) => {
        if (!prev.perguntasEVerdades) return prev;
        return {
          ...prev,
          perguntasEVerdades: {
            ...prev.perguntasEVerdades,
            currentBids: {
              ...prev.perguntasEVerdades.currentBids,
              [player.id]: clamped
            },
            bidSubmitted: {
              ...prev.perguntasEVerdades.bidSubmitted,
              [player.id]: true
            }
          }
        };
      });
    };

    return wrapIfMultiMode(
      <div
        data-testid="controller-perguntas-e-verdades"
        className="bg-[#07080d] p-3.5 flex flex-col justify-between max-w-md mx-auto space-y-4"
      >
        <div className="space-y-4">
          {/* 1. SECRET TOKEN WALLET & ALERT LIGHT STATUS */}
          <div className="border-2 border-amber-400 bg-gradient-to-r from-amber-950/60 via-black to-rose-950/50 p-3.5 flex items-center justify-between shadow-md">
            <div>
              <div className="text-[10px] font-mono-code text-amber-300 uppercase font-bold flex items-center gap-1">
                <Lock size={11} />
                <span>SEU SALDO SECRETO DE TOKENS</span>
              </div>
              <div
                data-testid="controller-pv-token-balance"
                className="font-anton text-3xl text-white tracking-wider"
              >
                🪙 {myTokens} TOKENS
              </div>
            </div>

            <div className="text-right">
              {myAlertLight ? (
                <div className="px-2.5 py-1 bg-rose-600 border border-rose-300 text-white font-mono-code text-[10px] font-bold uppercase animate-pulse">
                  🚨 ALERTA ≤ 5 LIGADO NA TV
                </div>
              ) : (
                <div className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono-code text-[10px] font-bold uppercase">
                  LED TV APAGADO (&gt;5)
                </div>
              )}
              <div className="text-[9px] font-mono-code text-slate-400 mt-1">
                +2 tokens no fim de cada rodada
              </div>
            </div>
          </div>

          {/* 2. DISCREET MATHEMATICAL AUTO-CALCULATOR ("COLA INTELIGENTE" P/ RESPONDER SEM ERRO) */}
          {myHand.length === 8 && autoCalcAnswer && (
            <div
              data-testid="controller-pv-math-calculator"
              className="border-2 border-emerald-400 bg-[#071512] p-3.5 space-y-2 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
            >
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-anton text-emerald-300 uppercase tracking-wider">
                  <Calculator size={14} />
                  <span>CALCULADORA AUTOMÁTICA DA SUA MÃO (SEM ERRO HUMANO)</span>
                </div>
                <span className="text-[9px] font-mono-code bg-emerald-500 text-black font-bold px-1.5 py-0.5">
                  PERGUNTA #{activeQNum}
                </span>
              </div>

              <div className="text-[11px] font-mono-code text-slate-300">
                {formatOfficialQuestionText(activeQNum, {
                  positions1Based: pv.selectedPositionsQ1,
                  targetValue: pv.selectedValueQ7,
                  targetSuit: pv.selectedSuitQ8
                })}
              </div>

              <div
                data-testid="controller-pv-auto-answer"
                className="p-2.5 bg-black/80 border border-emerald-400/60 font-anton text-lg text-emerald-300 tracking-wide"
              >
                👉 {autoCalcAnswer.summaryText}
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {OFFICIAL_11_QUESTIONS.map((q) => (
                  <button
                    key={q.number}
                    type="button"
                    onClick={() => setPvCalcQuestionNum(q.number)}
                    className={`px-2 py-0.5 text-[10px] font-mono-code font-bold border cursor-pointer ${
                      activeQNum === q.number
                        ? 'border-emerald-300 bg-emerald-400 text-black'
                        : 'border-slate-700 bg-black text-slate-300'
                    }`}
                  >
                    #{q.number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. SECRET TOKEN AUCTION BIDDER */}
          <div className="border-2 border-amber-400/80 bg-[#0b0d16] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-anton text-sm text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins size={15} />
                <span>LEILÃO SECRETO DE TOKENS (RODADA #{pv.auctionRound})</span>
              </span>
              {pv.bidSubmitted[player.id] && (
                <span className="text-[10px] font-mono-code text-emerald-400 font-bold">
                  ✓ Lance Secreto: {pv.currentBids[player.id]} 🪙
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={myTokens}
                value={pvBidInput}
                onChange={(e) => setPvBidInput(Math.max(0, Math.min(myTokens, Number(e.target.value))))}
                className="w-24 bg-black border-2 border-amber-400 p-2 text-center font-anton text-2xl text-white"
              />
              <button
                type="button"
                data-testid="controller-pv-submit-bid-btn"
                onClick={handleSubmitSecretTokenBid}
                className="flex-1 py-2.5 border-2 border-amber-300 bg-amber-400 hover:bg-amber-300 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
              >
                APOSTAR EM SEGREDO ({pvBidInput} 🪙)
              </button>
            </div>
          </div>

          {/* 4. 8 SECRET CARDS HAND BUILDER + ASCENDING SUIT VALIDATOR */}
          <div className="border-2 border-cyan-400 bg-[#090b14] p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
              <span className="font-anton text-sm text-cyan-300 uppercase tracking-wider">
                🃏 SUAS 8 CARTAS SECRETAS ({myHand.length}/8)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="controller-pv-random-hand-btn"
                  onClick={handleDealRandomValidForMe}
                  className="px-2 py-1 border border-cyan-400 bg-cyan-950 text-cyan-200 text-[10px] font-mono-code font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Shuffle size={11} />
                  <span>Sortear 8</span>
                </button>
                {myHand.length > 1 && !myValidation.valid && (
                  <button
                    type="button"
                    data-testid="controller-pv-autosort-btn"
                    onClick={handleAutoSortMyHand}
                    className="px-2 py-1 border border-amber-400 bg-amber-400 text-black text-[10px] font-mono-code font-bold uppercase cursor-pointer"
                  >
                    ✨ Ordenar Naipes
                  </button>
                )}
              </div>
            </div>

            {/* Current 8 Slots */}
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                const c = myHand[idx];
                const isViolation = myValidation.violatingIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => c && handleToggleCardInHand(c)}
                    className={`p-2 border text-center cursor-pointer ${
                      isViolation
                        ? 'border-rose-500 bg-rose-950/60 text-rose-200'
                        : c
                        ? 'border-cyan-400 bg-cyan-950/40 text-white'
                        : 'border-slate-800 bg-black/50 text-slate-500'
                    }`}
                  >
                    <div className="text-[9px] font-mono-code opacity-75">{idx + 1}ª POS</div>
                    <div className="font-anton text-base">
                      {c ? `${formatCardValueLabel(c.value)}${SUIT_META[c.suit].symbol}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>

            {!myValidation.valid && (
              <div
                data-testid="controller-pv-suit-order-error"
                className="p-2 border border-rose-500 bg-rose-950/50 text-[11px] font-mono-code text-rose-200"
              >
                ⚠️ {myValidation.errorMessage}
              </div>
            )}

            {myHand.length === 8 && myValidation.valid && !isMyHandReady && (
              <button
                type="button"
                data-testid="controller-pv-lock-hand-btn"
                onClick={handleLockMyHand}
                className="w-full py-2.5 border-2 border-emerald-400 bg-emerald-500 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
              >
                🔒 TRAVAR MINHAS 8 CARTAS SECRETAS
              </button>
            )}

            {/* Collapsible 52-card Deck Picker for Manual Card Registration */}
            <details className="border border-slate-800 bg-black/60 p-2">
              <summary className="text-[11px] font-mono-code text-cyan-300 cursor-pointer font-bold uppercase">
                Escolher / Editar cartas manualmente do baralho de 52 cartas
              </summary>
              <div className="grid grid-cols-4 gap-1 pt-2 max-h-48 overflow-y-auto">
                {full52Deck.map((card) => {
                  const selected = myHand.some((c) => c.id === card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => handleToggleCardInHand(card)}
                      className={`py-1 text-xs font-mono-code font-bold border cursor-pointer ${
                        selected
                          ? 'border-cyan-300 bg-cyan-400 text-black'
                          : 'border-slate-800 bg-[#0d101b] text-slate-300'
                      }`}
                    >
                      {formatCardValueLabel(card.value)}
                      {SUIT_META[card.suit].symbol}
                    </button>
                  );
                })}
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // NOV-07: Como eu pinto no celular. Quem desenha ve a palavra e desenha aqui; os outros veem o desenho.
  if (room.activeGame === 'como-eu-pinto' && room.comoEuPinto) {
    const c = room.comoEuPinto;
    const isDrawer = player.id === c.drawerPlayerId;
    const canDraw = isDrawer && c.phase === 'PLAYING';
    const mm = Math.floor(c.timerSeconds / 60);
    const ss = String(c.timerSeconds % 60).padStart(2, '0');
    const update = (fn: (prev: NonNullable<GameRoom['comoEuPinto']>) => NonNullable<GameRoom['comoEuPinto']>) =>
      onUpdateRoom((prev) => ({ ...prev, comoEuPinto: prev.comoEuPinto ? fn(prev.comoEuPinto) : undefined }));
    return wrapIfMultiMode(
      <div
        data-testid="controller-pinto-view"
        className="min-h-screen bg-[#07080d] p-3 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🎨 Como eu pinto</span>
          <span className="font-anton text-lg">{room.timerConfig === 0 ? 'LIVRE' : mm + ':' + ss}</span>
        </div>
        {isDrawer ? (
          <div className="border-2 border-cyan-400/60 bg-black p-2 text-center">
            <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">
              Desenhe (sem letras nem números, sem falar)
            </div>
            <div data-testid="controller-pinto-word" className="font-anton text-3xl uppercase leading-tight break-words">
              {c.phase === 'PLAYING' ? (c.wordHidden ? '🙈' : c.words[c.currentIndex]) : c.phase === 'READY' ? 'Aguarde o início' : 'Tempo encerrado'}
            </div>
          </div>
        ) : (
          <div className="border border-white/15 bg-black/50 p-2 text-center font-mono-code text-xs text-slate-300">
            {player.id === c.guesserPlayerId
              ? 'Olhe o desenho e chute a palavra em voz alta!'
              : 'Acompanhe o desenho. Você pode olhar, mas não pode ajudar.'}
          </div>
        )}
        <DrawingCanvas
          testId="controller-pinto-canvas"
          strokes={c.strokes}
          editable={canDraw}
          color={pintoColor}
          onStroke={(stroke) => update((prev) => pintoAddStroke(prev, stroke))}
        />
        {canDraw && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PINTO_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                aria-label={'Cor ' + col}
                onClick={() => setPintoColor(col)}
                style={{ backgroundColor: col }}
                className={'w-8 h-8 border-2 cursor-pointer ' + (pintoColor === col ? 'border-white scale-110' : 'border-black/60')}
              />
            ))}
            <button
              type="button"
              data-testid="controller-pinto-undo"
              onClick={() => update((prev) => pintoUndo(prev))}
              className="px-3 py-1.5 border border-white/25 text-slate-200 font-anton text-xs uppercase cursor-pointer"
            >
              Desfazer
            </button>
            <button
              type="button"
              data-testid="controller-pinto-clear"
              onClick={() => update((prev) => pintoClear(prev))}
              className="px-3 py-1.5 border border-white/25 text-slate-200 font-anton text-xs uppercase cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}
        <div className="font-mono-code text-[11px] text-slate-300 text-center">
          Quem confirma acerto, pulo e roubo é o diretor na TV.
        </div>
      </div>
    );
  }

  // NOV-06: Estadios no celular (somente leitura): pistas liberadas e de quem e a vez; o diretor julga na TV.
  if (room.activeGame === 'estadios' && room.estadios) {
    const e = room.estadios;
    const shown = estadiosCluesShown(e);
    const isMyTurn = e.phase === 'PLAYING' && e.turnPlayerId === player.id;
    const turnName = room.players.find((p) => p.id === e.turnPlayerId)?.name || '—';
    const done = e.phase === 'SUMMARY';
    return wrapIfMultiMode(
      <div
        data-testid="controller-est-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🏟️ Estádios</span>
          <span className="font-anton text-base text-amber-200">Vale {estadiosValue(e)} pts</span>
        </div>
        <div className="border border-white/15 bg-black/50 p-3 text-center">
          <div className="font-anton text-xl uppercase">
            {e.phase === 'READY'
              ? 'Aguarde o início'
              : done
              ? e.winnerPlayerId
                ? (room.players.find((p) => p.id === e.winnerPlayerId)?.name || '—') + ' acertou!'
                : 'Ninguém acertou'
              : isMyTurn
              ? 'Sua vez: diga o estádio em voz alta!'
              : 'Vez de ' + turnName}
          </div>
          {done && (
            <div className="font-mono-code text-xs text-amber-200 mt-1">
              {e.nome} · {e.cidade}, {e.pais}
            </div>
          )}
        </div>
        <ul className="space-y-1.5">
          {e.pistas.map((p, i) => (
            <li
              key={i}
              data-testid={'controller-est-clue-' + i}
              className={
                'border px-2 py-1.5 font-mono-code text-xs ' +
                (i < shown ? 'border-cyan-400/60 text-[#F5F2EB]' : 'border-white/10 text-slate-600')
              }
            >
              <span className="font-anton text-sm mr-1.5">{i + 1}</span>
              {i < shown ? p : '🔒 bloqueada'}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // NOV-08: Respostas sem perguntas no celular. Quem esta na vez escolhe a palavra a revelar; o diretor julga o palpite na TV.
  if (room.activeGame === 'respostas-sem-perguntas' && room.respostasSemPerguntas) {
    const r = room.respostasSemPerguntas;
    const isMyTurn = r.phase === 'PLAYING' && r.turnPlayerId === player.id;
    const turnName = room.players.find((p) => p.id === r.turnPlayerId)?.name || '—';
    const done = r.phase === 'SUMMARY';
    const pick = (i: number) => {
      sounds.playFlip();
      onUpdateRoom((prev) => ({
        ...prev,
        respostasSemPerguntas: prev.respostasSemPerguntas ? respostasPick(prev.respostasSemPerguntas, i) : undefined
      }));
    };
    return wrapIfMultiMode(
      <div
        data-testid="controller-rsp-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">❓ Respostas sem perguntas</span>
          <span className="font-anton text-base text-amber-200">Vale {respostasValue(r)} pts</span>
        </div>
        <div className="border border-cyan-400/50 bg-black p-3 flex flex-wrap gap-1.5 justify-center">
          {r.words.map((w, i) => {
            const canPick = isMyTurn && r.step === 'pick' && !r.revealed[i];
            return (
              <button
                key={i}
                type="button"
                data-testid={'controller-rsp-word-' + i}
                disabled={!canPick}
                onClick={() => pick(i)}
                className={
                  'min-w-[2.8rem] px-2 py-1.5 border font-anton text-lg uppercase ' +
                  (r.revealed[i] || done
                    ? 'border-emerald-400 text-emerald-200'
                    : canPick
                    ? 'border-cyan-300 bg-cyan-950/50 text-cyan-100 cursor-pointer'
                    : 'border-white/15 text-slate-600')
                }
              >
                {r.revealed[i] || done ? w : i + 1}
              </button>
            );
          })}
        </div>
        <div className="border border-white/15 bg-black/50 p-3 text-center">
          <div className="font-anton text-xl uppercase">
            {r.phase === 'READY'
              ? 'Aguarde o início'
              : done
              ? r.winnerPlayerId
                ? (room.players.find((p) => p.id === r.winnerPlayerId)?.name || '—') + ' acertou!'
                : 'Ninguém acertou'
              : isMyTurn
              ? r.step === 'pick'
                ? 'Sua vez: toque numa palavra'
                : 'Agora chute a resposta em voz alta!'
              : 'Vez de ' + turnName}
          </div>
          {done && <div className="font-mono-code text-xs text-amber-200 mt-1">Resposta: {r.answer}</div>}
        </div>
      </div>
    );
  }

  // NOV-05: Repetente no celular. O jogador escreve a propria palavra em segredo; os outros nao a veem.
  if (room.activeGame === 'repetente' && room.repetente) {
    const r = room.repetente;
    const iWrite = repetenteWriters(r).includes(player.id);
    const mine = (r.answers[player.id] ?? '').trim();
    const myGroup = r.groups.find((g) => g.playerIds.includes(player.id));
    const myResult = r.result?.groups.find((g) => g.groupId === myGroup?.id);
    const sendWord = () => {
      const text = repetenteDraft.trim();
      if (!text) return;
      sounds.playTick();
      setRepetenteDraft('');
      onUpdateRoom((prev) => ({
        ...prev,
        repetente: prev.repetente ? submitRepetenteAnswer(prev.repetente, player.id, text) : undefined
      }));
    };
    return wrapIfMultiMode(
      <div
        data-testid="controller-rep-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="font-anton text-lg uppercase">🖍️ Repetente</div>
        <div className="border-2 border-cyan-400/60 bg-black p-3 text-center">
          <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Tema</div>
          <div className="font-anton text-2xl uppercase leading-tight">{r.theme}</div>
        </div>
        {!iWrite ? (
          <div className="border border-white/15 bg-black/50 p-3 text-center font-mono-code text-xs text-slate-300">
            Você não está em nenhuma dupla nesta rodada. Acompanhe na TV.
          </div>
        ) : r.phase === 'READY' ? (
          <div className="border border-white/15 bg-black/50 p-3 text-center font-anton text-xl uppercase">
            Aguarde o início
          </div>
        ) : r.phase === 'WRITING' ? (
          <div className="space-y-2">
            <div className="font-mono-code text-[11px] text-amber-200">
              Escreva UMA palavra e tente bater com a do seu parceiro. Sem combinar!
            </div>
            <input
              data-testid="controller-rep-input"
              value={repetenteDraft}
              onChange={(e) => setRepetenteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendWord();
              }}
              placeholder="Sua palavra"
              className="w-full bg-black border border-cyan-400/60 px-3 py-2 text-base font-mono-code text-white"
            />
            <button
              type="button"
              data-testid="controller-rep-send"
              onClick={sendWord}
              className="w-full py-2.5 border border-cyan-300 bg-cyan-400 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
            >
              {mine ? 'ENVIAR OUTRA PALAVRA' : 'ENVIAR'}
            </button>
            {mine && (
              <div data-testid="controller-rep-sent" className="font-mono-code text-xs text-emerald-300 text-center">
                ✅ Enviado: <strong>{mine}</strong> (pode trocar até a revelação)
              </div>
            )}
          </div>
        ) : (
          <div
            data-testid="controller-rep-result"
            className={`border p-3 text-center ${myResult?.matched ? 'border-emerald-400 bg-emerald-950/40' : 'border-white/15 bg-black/50'}`}
          >
            <div className="font-anton text-xl uppercase">
              {myResult?.matched ? '✅ Vocês combinaram! +' + (myResult.points || 0) : '✖ Não combinou'}
            </div>
            <div className="font-mono-code text-[11px] text-slate-300 mt-1">
              {myGroup?.playerIds
                .map((id) => (room.players.find((p) => p.id === id)?.name || '—') + ': ' + (r.answers[id] || '—'))
                .join(' · ')}
            </div>
          </div>
        )}
      </div>
    );
  }

  // NOV-03: Mega Resenha no celular. Somente leitura: quem da as dicas ve a palavra; o parceiro nao pode olhar.
  if (room.activeGame === 'mega-resenha' && room.megaResenha) {
    const g = room.megaResenha;
    const isGiver = player.id === g.giverPlayerId;
    const isGuesser = player.id === g.guesserPlayerId;
    const mm = Math.floor(g.timerSeconds / 60);
    const ss = String(g.timerSeconds % 60).padStart(2, '0');
    return wrapIfMultiMode(
      <div
        data-testid="controller-mega-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-4 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🗣️ Mega Resenha</span>
          <span className="font-anton text-lg">{room.timerConfig === 0 ? 'LIVRE' : mm + ':' + ss}</span>
        </div>
        {isGuesser ? (
          <div className="border border-amber-400/60 bg-amber-950/30 p-4 text-center space-y-2">
            <div className="text-4xl">🙈</div>
            <div className="font-anton text-xl uppercase">Você chuta!</div>
            <p className="font-mono-code text-xs text-slate-200">Não olhe a tela. Ouça as dicas (uma palavra cada) e arrisque.</p>
          </div>
        ) : isGiver ? (
          g.phase === 'PLAYING' ? (
            <div className="border-2 border-cyan-400/60 bg-black p-4 text-center space-y-2">
              <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Faça seu parceiro acertar (UMA palavra por dica)</div>
              <div data-testid="controller-mega-word" className="font-anton text-4xl uppercase leading-tight break-words">
                {g.wordsHidden ? '🙈' : g.words[g.currentIndex]}
              </div>
              <p className="font-mono-code text-[10px] text-slate-300">
                Acertos: {g.outcomes.filter((o) => o === 'correct').length} de {g.words.length}. Quem confirma é o diretor na TV.
              </p>
            </div>
          ) : (
            <div className="border border-cyan-400/60 bg-cyan-950/30 p-4 text-center">
              <div className="font-anton text-xl uppercase">{g.phase === 'READY' ? 'Você dá as dicas! Aguarde o início.' : 'Rodada encerrada'}</div>
            </div>
          )
        ) : (
          <div className="border border-white/15 bg-black/50 p-4 text-center space-y-1">
            <div className="font-anton text-xl uppercase">Acompanhe na TV</div>
            <p className="font-mono-code text-xs text-slate-300">
              {room.players.find((p) => p.id === g.giverPlayerId)?.name || 'Alguém'} dá as dicas. Você pode olhar, mas não pode ajudar.
            </p>
          </div>
        )}
        <div className="font-mono-code text-[11px] text-slate-300 text-center">+{g.roundScore} pts nesta rodada</div>
      </div>
    );
  }

  // NOV-02: Quem sou eu no celular. Mostra a identidade de todos, menos a do proprio jogador.
  if ((room.activeGame === 'quem-sou-eu' || room.activeGame === 'onde-estou') && room.quemSouEu) {
    const q = room.quemSouEu;
    const isMomentGame = room.activeGame === 'onde-estou';
    const mine = q.entries.find((e) => e.playerId === player.id);
    const turnName = room.players.find((p) => p.id === q.turnPlayerId)?.name || '—';
    const isMyTurn = q.phase === 'PLAYING' && q.turnPlayerId === player.id;
    return wrapIfMultiMode(
      <div
        data-testid="controller-qse-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="font-anton text-lg uppercase">{isMomentGame ? '📍 Onde estou' : '🪪 Quem sou eu'}</div>
        <div
          className={'border p-3 text-center ' + (isMyTurn ? 'border-cyan-300 bg-cyan-950/40' : 'border-white/15 bg-black/50')}
        >
          <div className="font-anton text-xl uppercase">
            {q.phase === 'READY'
              ? 'Aguarde o início'
              : q.phase === 'SUMMARY'
              ? 'Rodada encerrada'
              : isMyTurn
              ? 'É a sua vez! Pergunte ou chute'
              : 'Vez de ' + turnName}
          </div>
          {mine && (
            <div className="font-mono-code text-[11px] text-slate-300 mt-1">
              {mine.status === 'found'
                ? 'Você descobriu! Era ' + mine.identity
                : mine.status === 'out'
                ? 'Você ficou de fora'
                : 'Você: ' + mine.questions + '/' + q.maxQuestions + ' perguntas'}
            </div>
          )}
        </div>
        <div className="font-mono-code text-[10px] text-amber-200 uppercase font-bold">
          {isMomentGame ? 'Quem tem qual momento (o seu fica escondido)' : 'Quem é quem (a sua fica escondida)'}
        </div>
        <ul className="space-y-1">
          {q.entries.map((e) => {
            const self = e.playerId === player.id;
            const name = room.players.find((p) => p.id === e.playerId)?.name || '—';
            return (
              <li
                key={e.playerId}
                className="flex items-center justify-between gap-2 border border-white/10 px-2 py-1.5 font-mono-code text-xs"
              >
                <span className="uppercase text-slate-300">{self ? 'Você' : name}</span>
                <span
                  data-testid={'controller-qse-identity-' + e.playerId}
                  className="font-anton text-base uppercase text-[#F5F2EB]"
                >
                  {self && e.status !== 'found' && q.phase !== 'SUMMARY' ? '❓' : e.identity}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // NOV-01: Mimica no celular. Somente leitura: acertar/pular e confirmado pelo diretor na TV.
  if (room.activeGame === 'mimica' && room.mimica) {
    const m = room.mimica;
    const isMime = player.id === m.mimePlayerId;
    const isGuesser = player.id === m.guesserPlayerId;
    const mm = Math.floor(m.timerSeconds / 60);
    const ss = String(m.timerSeconds % 60).padStart(2, '0');
    return wrapIfMultiMode(
      <div
        data-testid="controller-mimica-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-4 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🎭 Mímica</span>
          <span className="font-anton text-lg">{room.timerConfig === 0 ? 'LIVRE' : mm + ':' + ss}</span>
        </div>
        {isGuesser ? (
          <div className="border border-amber-400/60 bg-amber-950/30 p-4 text-center space-y-2">
            <div className="text-4xl">🙈</div>
            <div className="font-anton text-xl uppercase">Você adivinha!</div>
            <p className="font-mono-code text-xs text-slate-200">
              Não olhe a tela nem o celular de ninguém. Fale o que você acha que é.
            </p>
          </div>
        ) : isMime ? (
          m.phase === 'PLAYING' ? (
            <div className="border-2 border-cyan-400/60 bg-black p-4 text-center space-y-2">
              <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Sua palavra (só mímica!)</div>
              <div data-testid="controller-mimica-word" className="font-anton text-4xl uppercase leading-tight break-words">
                {m.wordsHidden ? '🙈' : m.words[m.currentIndex]}
              </div>
              <p className="font-mono-code text-[10px] text-slate-300">
                Acertos: {m.outcomes.filter((o) => o === 'correct').length} de {m.words.length}. Quem confirma é o diretor na TV.
              </p>
            </div>
          ) : (
            <div className="border border-cyan-400/60 bg-cyan-950/30 p-4 text-center">
              <div className="font-anton text-xl uppercase">
                {m.phase === 'READY' ? 'Você faz a mímica! Aguarde o início.' : 'Rodada encerrada'}
              </div>
            </div>
          )
        ) : (
          <div className="border border-white/15 bg-black/50 p-4 text-center space-y-1">
            <div className="font-anton text-xl uppercase">Acompanhe na TV</div>
            <p className="font-mono-code text-xs text-slate-300">
              {room.players.find((p) => p.id === m.mimePlayerId)?.name || 'Alguém'} faz a mímica. Você pode olhar, mas não pode dar dicas.
            </p>
          </div>
        )}
        <div className="font-mono-code text-[11px] text-slate-300 text-center">
          +{m.roundScore} pts nesta rodada · cada palavra vale {m.roundValue}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] p-4 text-white font-mono-code text-xs">
      Aguardando rodada...
    </div>
  );
};

