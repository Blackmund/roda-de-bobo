import { themeBadge } from '../../utils/themeUtils';
import React, { useEffect, useRef, useState } from 'react';
import { GameRoom, Player, ProibidoGameState, TeamId } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { RodaDeBoboOfficialBadge } from '../RodaIcons';
import { getActiveTeamIds, getNextTeamId } from '../../utils/teamUtils';
import { ensureStrictForbiddenWordsCount } from '../../utils/proibidoGoldenDatabase';
import confetti from 'canvas-confetti';
import { RadicalCheck } from './proibido/RadicalCheck';
import {
  Clock,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Infinity,
  Eye,
  EyeOff
} from 'lucide-react';
import { PlayerMark } from '../rdb/PlayerMark';
import { ActiveTurnBanner } from '../ActiveTurnBanner';

interface ScreenProibidoProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateProibidoState: (updater: (prev: ProibidoGameState) => ProibidoGameState) => void;
  onNextRound: () => void;
}

export type ProibidoRole = 'SPEAKER' | 'GUESSER' | 'REFEREE' | 'SPECTATOR';

export function getProibidoPlayerRole(
  proibido: ProibidoGameState,
  player: { id: string; team?: TeamId },
  allPlayers: Player[]
): {
  role: ProibidoRole;
  isSpeaker: boolean;
  isGuesser: boolean;
  isReferee: boolean;
  speakerPlayer: Player | undefined;
  guesserPlayer: Player | undefined;
  refereePlayer: Player | undefined;
} {
  const is2Player = Boolean(proibido.is2PlayerMode || allPlayers.length === 2);
  const speakerPlayer = allPlayers.find((p) => p.id === proibido.speakerPlayerId) || allPlayers[0];
  const guesserPlayer =
    allPlayers.find((p) => p.id === proibido.guesserPlayerId) ||
    allPlayers.find((p) => p.id !== speakerPlayer?.id) ||
    allPlayers[1];
  const refereePlayer =
    allPlayers.find((p) => p.id === proibido.refereePlayerId) ||
    (!is2Player ? allPlayers.find((p) => p.team === proibido.refereeTeam) : undefined);

  const isSpeaker = player.id === speakerPlayer?.id;
  const isGuesser = !isSpeaker && player.id === guesserPlayer?.id;
  const isReferee = !isSpeaker && !isGuesser && (is2Player ? false : player.team === proibido.refereeTeam);

  let role: ProibidoRole = 'SPECTATOR';
  if (isSpeaker) role = 'SPEAKER';
  else if (isGuesser) role = 'GUESSER';
  else if (isReferee) role = 'REFEREE';

  return {
    role,
    isSpeaker,
    isGuesser,
    isReferee,
    speakerPlayer,
    guesserPlayer,
    refereePlayer
  };
}

export function getNextProibidoTurnInfo(room: GameRoom): {
  nextSpeakerName: string;
  nextSpeakerAvatar: string;
  nextGuesserName: string;
  nextTeamName: string;
  isGameOver: boolean;
} {
  const currentProibido = room.proibido;
  const nextRoundNum = room.roundNumber + 1;
  const isGameOver = nextRoundNum > (room.maxRounds || 3);
  const activeTeamIds = getActiveTeamIds(room);

  if (room.players.length === 2) {
    const currentSpeakerId = currentProibido?.speakerPlayerId;
    const p0 = room.players[0];
    const p1 = room.players[1];
    const nextSpeaker = currentSpeakerId === p0?.id ? p1 : p0;
    const nextGuesser = currentSpeakerId === p0?.id ? p0 : p1;
    return {
      nextSpeakerName: nextSpeaker?.name || 'Jogador 2',
      nextSpeakerAvatar: nextSpeaker?.avatar || '👤',
      nextGuesserName: nextGuesser?.name || 'Jogador 1',
      nextTeamName: 'Equipe Cooperativa',
      isGameOver
    };
  }

  const nextTeamId = getNextTeamId(currentProibido?.speakerTeam || 'A', activeTeamIds);
  const nextTeamPlayers = room.players.filter((p) => p.team === nextTeamId);
  const teamRoundTurn = Math.floor(nextRoundNum / activeTeamIds.length);
  const nextSpeaker =
    nextTeamPlayers.length > 0
      ? nextTeamPlayers[teamRoundTurn % nextTeamPlayers.length]
      : room.players[0];
  const otherPlayers = nextTeamPlayers.filter((p) => p.id !== nextSpeaker?.id);
  const nextGuesser =
    otherPlayers[0] || room.players.find((p) => p.id !== nextSpeaker?.id) || room.players[0];

  const teamName = room.teams[nextTeamId]?.name || `Equipe ${nextTeamId}`;
  return {
    nextSpeakerName: nextSpeaker?.name || 'Próximo Orador',
    nextSpeakerAvatar: nextSpeaker?.avatar || '👤',
    nextGuesserName: nextGuesser?.name || 'Adivinhador',
    nextTeamName: teamName,
    isGameOver
  };
}

export function applyProibidoCardOutcome(
  prev: ProibidoGameState,
  outcome: 'correct' | 'foul' | 'skipped'
): { nextState: ProibidoGameState; justFinishedAllCards: boolean } {
  if (prev.phase === 'SUMMARY') {
    return { nextState: prev, justFinishedAllCards: true };
  }
  const totalCards = prev.cards.length;
  if (totalCards === 0) {
    return { nextState: { ...prev, phase: 'SUMMARY', timerActive: false }, justFinishedAllCards: true };
  }

  const currentIdx = Math.min(Math.max(0, prev.currentCardIndex), totalCards - 1);
  const fallbackQueue = prev.cards
    .map((_, idx) => idx)
    .filter((idx) => prev.cardOutcomes[idx] !== 'correct' && prev.cardOutcomes[idx] !== 'foul');

  const rawQueue =
    Array.isArray(prev.pendingQueue) && prev.pendingQueue.length > 0
      ? prev.pendingQueue
      : fallbackQueue;

  // Deduplicate and keep only valid indices that haven't been resolved as correct or foul
  const activeQueue = Array.from(new Set(rawQueue)).filter(
    (idx) =>
      idx >= 0 &&
      idx < totalCards &&
      prev.cardOutcomes[idx] !== 'correct' &&
      prev.cardOutcomes[idx] !== 'foul'
  );

  const restOfQueue = activeQueue.filter((idx) => idx !== currentIdx);
  const updatedOutcomes = [...prev.cardOutcomes];
  updatedOutcomes[currentIdx] = outcome;

  if (outcome === 'skipped') {
    const nextQueue = [...restOfQueue, currentIdx];
    return {
      justFinishedAllCards: false,
      nextState: {
        ...prev,
        currentCardIndex: nextQueue[0] ?? currentIdx,
        pendingQueue: nextQueue,
        cardOutcomes: updatedOutcomes,
        phase: 'PLAYING'
      }
    };
  }

  const nextQueue = restOfQueue;
  const isFinished = nextQueue.length === 0;
  return {
    justFinishedAllCards: isFinished,
    nextState: {
      ...prev,
      roundScore: outcome === 'correct' ? prev.roundScore + 1 : prev.roundScore,
      lastFoulIndex: outcome === 'foul' ? currentIdx : prev.lastFoulIndex,
      currentCardIndex: isFinished ? currentIdx : nextQueue[0],
      pendingQueue: nextQueue,
      cardOutcomes: updatedOutcomes,
      phase: isFinished ? 'SUMMARY' : 'PLAYING',
      timerActive: isFinished ? false : prev.timerActive
    }
  };
}

/**
 * REG-06 / UX-10: contestar falta. No programa o diretor arbitra polemicas (ex.: 'encobrir' x 'cobertura'
 * nao e o mesmo radical). Se o juiz aceita a contestacao, a ultima falta e desfeita: a carta volta a ser a atual.
 */
export function contestProibidoFoul(prev: ProibidoGameState): ProibidoGameState {
  const idx = prev.lastFoulIndex;
  if (idx === undefined || prev.cardOutcomes[idx] !== 'foul') return prev;
  const outcomes = [...prev.cardOutcomes];
  outcomes[idx] = 'pending';
  const queue = [idx, ...(prev.pendingQueue ?? []).filter((i) => i !== idx)];
  return {
    ...prev,
    cardOutcomes: outcomes,
    pendingQueue: queue,
    currentCardIndex: idx,
    lastFoulIndex: undefined,
    phase: 'PLAYING',
    timerActive: prev.phase === 'SUMMARY' ? prev.timerSeconds > 0 : prev.timerActive
  };
}

export const ScreenProibido: React.FC<ScreenProibidoProps> = ({
  room,
  isTvMode = false,
  onUpdateProibidoState,
  onNextRound
}) => {
  const proibido = room.proibido;
  const [flashFoul, setFlashFoul] = useState(false);
  const [skipFeedbackMsg, setSkipFeedbackMsg] = useState<string | null>(null);
  const updateStateRef = useRef(onUpdateProibidoState);
  updateStateRef.current = onUpdateProibidoState;

  // Countdown timer — strictly disabled when room.timerConfig === 0 (Free / Infinite Mode)
  useEffect(() => {
    if (
      room.timerConfig === 0 ||
      !proibido ||
      proibido.phase !== 'PLAYING' ||
      !proibido.timerActive
    ) {
      return;
    }

    const interval = setInterval(() => {
      updateStateRef.current((prev) => {
        if (room.timerConfig === 0 || !prev.timerActive || prev.phase !== 'PLAYING') {
          return prev;
        }
        if (prev.timerSeconds <= 1) {
          sounds.playBuzzer();
          return {
            ...prev,
            phase: 'SUMMARY',
            timerActive: false,
            timerSeconds: 0
          };
        }
        const nextSec = prev.timerSeconds - 1;
        if (nextSec <= 10) {
          sounds.playTick(nextSec);
        }
        return {
          ...prev,
          timerSeconds: nextSec
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room.timerConfig, proibido?.phase, proibido?.timerActive]);

  if (!proibido) {
    return (
      <div className="p-8 text-center font-mono-code text-cyan-300">
        Carregando rodada do Jogo do Proibido...
      </div>
    );
  }

  const currentCard = proibido.cards[proibido.currentCardIndex];

  const handleStartTimer = () => {
    sounds.playPowerup();
    onUpdateProibidoState((prev) => ({
      ...prev,
      phase: 'PLAYING',
      timerActive: room.timerConfig > 0
    }));
  };

  const handleHit = () => {
    sounds.playSuccess();
    setSkipFeedbackMsg(null);
    onUpdateProibidoState((prev) => {
      const { nextState, justFinishedAllCards } = applyProibidoCardOutcome(prev, 'correct');
      if (justFinishedAllCards) {
        confetti({ particleCount: 70, spread: 60 });
      }
      return nextState;
    });
  };

  const handleSkip = () => {
    sounds.playFlip();
    onUpdateProibidoState((prev) => {
      const remainingIndices = prev.cards
        .map((_, idx) => idx)
        .filter((idx) => prev.cardOutcomes[idx] !== 'correct' && prev.cardOutcomes[idx] !== 'foul');

      if (remainingIndices.length <= 1) {
        setSkipFeedbackMsg('⏳ Esta é a última carta restante! Acerte, marque falta ou encerre a rodada.');
        setTimeout(() => setSkipFeedbackMsg(null), 2500);
      } else {
        setSkipFeedbackMsg('⏭️ Carta enviada para o fim da fila!');
        setTimeout(() => setSkipFeedbackMsg(null), 1200);
      }

      const { nextState } = applyProibidoCardOutcome(prev, 'skipped');
      return nextState;
    });
  };

  const handleFinishRemainingAsSkipped = () => {
    sounds.playFlip();
    setSkipFeedbackMsg(null);
    onUpdateProibidoState((prev) => ({
      ...prev,
      phase: 'SUMMARY',
      timerActive: false,
      pendingQueue: []
    }));
  };

  const handleFoul = () => {
    sounds.playBuzzer();
    setSkipFeedbackMsg(null);
    setFlashFoul(true);
    setTimeout(() => setFlashFoul(false), 900);

    onUpdateProibidoState((prev) => {
      const { nextState } = applyProibidoCardOutcome(prev, 'foul');
      return nextState;
    });
  };

  const handleContestFoul = () => {
    sounds.playFlip();
    setSkipFeedbackMsg('⚖️ Falta contestada: o juiz devolveu a carta!');
    setTimeout(() => setSkipFeedbackMsg(null), 1800);
    onUpdateProibidoState((prev) => contestProibidoFoul(prev));
  };

  const toggleTvWordsVisibility = () => {
    sounds.playFlip();
    onUpdateProibidoState((prev) => {
      const nextHidden = !Boolean(prev.tvWordsHidden || prev.antiSpoilerMode === 'guesser-looking-tv');
      return {
        ...prev,
        tvWordsHidden: nextHidden,
        antiSpoilerMode: nextHidden ? 'guesser-looking-tv' : 'guesser-back-to-tv'
      };
    });
  };

  const activeTeamIds = getActiveTeamIds(room);
  const is2Player = Boolean(proibido.is2PlayerMode || room.players.length === 2);
  const roleInfo = getProibidoPlayerRole(proibido, { id: '' }, room.players);
  const { speakerPlayer, guesserPlayer, refereePlayer } = roleInfo;
  const nextTurn = getNextProibidoTurnInfo(room);
  const tvWordsHidden = Boolean(proibido.tvWordsHidden || proibido.antiSpoilerMode === 'guesser-looking-tv');

  const handleRotateSpeaker = () => {
    onUpdateProibidoState((prev) => {
      if (is2Player) {
        const nextSpeaker = prev.speakerPlayerId === room.players[0]?.id ? room.players[1] : room.players[0];
        const nextGuesser = prev.speakerPlayerId === room.players[0]?.id ? room.players[0] : room.players[1];
        return {
          ...prev,
          speakerPlayerId: nextSpeaker?.id || prev.speakerPlayerId,
          guesserPlayerId: nextGuesser?.id || prev.guesserPlayerId
        };
      }
      const teamMembers = room.players.filter((p) => p.team === prev.speakerTeam);
      if (teamMembers.length <= 1) return prev;
      const curIdx = teamMembers.findIndex((p) => p.id === prev.speakerPlayerId);
      const nextMember = teamMembers[(curIdx + 1) % teamMembers.length];
      const otherMembers = teamMembers.filter((p) => p.id !== nextMember?.id);
      return {
        ...prev,
        speakerPlayerId: nextMember?.id || prev.speakerPlayerId,
        guesserPlayerId: otherMembers[0]?.id || prev.guesserPlayerId
      };
    });
  };

  const handleSelectSpeakerTeam = (nextTeam: TeamId) => {
    onUpdateProibidoState((prev) => {
      const teamMembers = room.players.filter((p) => p.team === nextTeam);
      const otherMembers = teamMembers.slice(1);
      return {
        ...prev,
        speakerTeam: nextTeam,
        refereeTeam: getNextTeamId(nextTeam, activeTeamIds),
        speakerPlayerId: teamMembers[0]?.id || prev.speakerPlayerId,
        guesserPlayerId: otherMembers[0]?.id || prev.guesserPlayerId
      };
    });
  };

  const countCorrect = proibido.cardOutcomes.filter((o) => o === 'correct').length;
  const countFoul = proibido.cardOutcomes.filter((o) => o === 'foul').length;
  const countPending = proibido.cards.length - countCorrect - countFoul;

  return (
    <div className={`h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 transition-colors duration-200 relative ${flashFoul ? 'bg-rose-950/80 p-2 border-2 border-[#E6194B]' : ''}`}>
      {/* Top left diagonal pinstripes */}
      <div className="absolute top-0 left-0 w-64 h-44 pointer-events-none retro-stripes opacity-15 z-0" />

      {/* 1. Compact Arcade Header Bar (shrink-0 py-1 px-3) */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-1 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 bg-[#E6194B] border border-white/40 flex items-center justify-center font-anton text-white text-xs shrink-0">
            RB
          </div>
          <span className="font-anton text-sm md:text-base text-white tracking-wider uppercase leading-none truncate">
            JOGO DO PROIBIDO
          </span>
          <span className="text-[10px] font-mono-code text-[#17B8B8] uppercase border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 shrink-0 hidden sm:inline">
            {is2Player ? '🤝 COOPERATIVO' : `🏆 EQUIPE ${proibido.speakerTeam} VS ${proibido.refereeTeam}`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Button to Show/Hide Words on TV (Anti-Spoiler / Modo Sem Venda) */}
          <button
            type="button"
            data-testid="proibido-toggle-tv-words-btn"
            onClick={toggleTvWordsVisibility}
            className={`text-[10px] font-mono-code font-bold px-2 py-0.5 border flex items-center gap-1 cursor-pointer transition-colors ${
              tvWordsHidden
                ? 'border-emerald-400 bg-emerald-950 text-emerald-300 hover:bg-emerald-900'
                : 'border-amber-400 bg-amber-950 text-amber-300 hover:bg-amber-900'
            }`}
            title={
              tvWordsHidden
                ? 'Clique para exibir palavras na TV (caso o adivinhador esteja vendado)'
                : 'Clique para ocultar palavras na TV (caso o adivinhador não tenha venda)'
            }
          >
            {tvWordsHidden ? <Eye size={12} /> : <EyeOff size={12} />}
            <span className="hidden sm:inline">
              {tvWordsHidden ? '👁️ MOSTRAR PALAVRAS' : '🙈 OCULTAR PALAVRAS'}
            </span>
            <span className="sm:hidden">{tvWordsHidden ? '👁️ VER' : '🙈 OCULTAR'}</span>
          </button>

          {/* Compact Neon Timer Box */}
          <div className="border border-[#E6194B]/70 bg-[#07080d] px-2.5 py-0.5 flex items-center gap-1.5 shrink-0">
            <Clock size={13} className="text-rose-400 shrink-0" />
            <div
              data-testid="proibido-timer-display"
              className={`font-anton text-base md:text-lg leading-none ${
                room.timerConfig === 0
                  ? 'text-[#17B8B8]'
                  : proibido.timerSeconds <= 10
                  ? 'text-[#E6194B] animate-ping'
                  : 'text-[#F5F2EB]'
              }`}
            >
              {room.timerConfig === 0 ? (
                <span className="flex items-center gap-1 text-xs">
                  <Infinity className="w-3.5 h-3.5 text-[#17B8B8]" />
                  <span>LIVRE</span>
                </span>
              ) : (
                `${String(Math.floor(proibido.timerSeconds / 60)).padStart(2, '0')}:${String(proibido.timerSeconds % 60).padStart(2, '0')}`
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quem fala agora, quem adivinha e quem fiscaliza: uma faixa so */}
      <div className="relative z-10 shrink-0" data-testid="proibido-role-demonstration-strip">
        <ActiveTurnBanner
          room={room}
          hideSecondary={is2Player}
          extra={
            <>
              <span className="rdb-turn-other">
                <span>Adivinha sem olhar</span>
                <PlayerMark p={guesserPlayer} /> {guesserPlayer?.name}
              </span>
              <button type="button" className="rdb-seg" onClick={handleRotateSpeaker} title="Inverter quem fala e quem adivinha">
                Inverter papéis
              </button>
            </>
          }
        />
      </div>

      {/* Main Game Card Display */}
      {proibido.phase === 'READY' ? (
        <div className="relative z-10 flex-1 min-h-0 border border-white/10 bg-white/[0.03] p-4 md:p-6 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto scrollbar-none">
          <div className="space-y-1.5">
            <h2 className="font-anton text-3xl md:text-5xl text-white uppercase">
              RODADA PRONTA // {proibido.cards.length} CARTAS
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto">
              {is2Player
                ? `Modo 2 Jogadores Cooperativo! ${speakerPlayer?.name} descreve as palavras para ${guesserPlayer?.name} adivinhar. Ambos pontuam juntos!`
                : `O orador (${speakerPlayer?.name}) deve descrever as palavras para seu parceiro (${guesserPlayer?.name}) sem falar as proibidas. O adversário fiscaliza com a sirene de falta.`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartTimer}
            className="px-8 py-3 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-lg md:text-xl uppercase tracking-widest shadow-neon-cyan transition-colors inline-flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
          >
            {room.timerConfig === 0 ? (
              <>
                <Infinity className="w-5 h-5 stroke-[2.25] shrink-0 aspect-square text-black" />
                <span>INICIAR RODADA (LIVRE)</span>
              </>
            ) : (
              <span>{`INICIAR CRONÔMETRO (${room.timerConfig}S)`}</span>
            )}
          </button>
        </div>
      ) : proibido.phase === 'SUMMARY' ? (
        /* Round Summary with Reversible Card Outcome Toggles + Next Player */
        <div
          data-testid="proibido-summary-panel"
          className="relative z-10 flex-1 min-h-0 border-2 border-[#17B8B8]/60 bg-[#07080d]/95 p-3 md:p-4 flex flex-col justify-between text-center overflow-hidden gap-2.5 shadow-2xl"
        >
          <div className="space-y-0.5 shrink-0">
            <div className="inline-block px-3 py-0.5 bg-[#E6194B] text-white font-anton text-xs uppercase tracking-widest">
              {countPending === 0 ? '🎉 TODAS AS CARTAS FINALIZADAS!' : '⏰ TEMPO ESGOTADO!'}
            </div>
            <h2 className="font-anton text-2xl md:text-4xl text-white uppercase tracking-wide">
              PONTUAÇÃO DA RODADA: <span className="text-[#17B8B8]">+{proibido.roundScore} PONTOS</span>
            </h2>
            <p className="text-[11px] font-mono-code text-slate-300">
              {is2Player
                ? `${proibido.roundScore} de ${proibido.cards.length} palavras acertadas em equipe cooperativa! (Ambos recebem +${proibido.roundScore} pontos)`
                : `${proibido.roundScore} de ${proibido.cards.length} palavras acertadas pela Equipe ${proibido.speakerTeam} (${speakerPlayer?.name} e ${guesserPlayer?.name})`}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none flex">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 max-w-6xl m-auto w-full py-1">
              {proibido.cards.map((card, idx) => {
                const outcome = proibido.cardOutcomes[idx];
                const isScored = outcome === 'correct';
                const cardForbiddenWords = ensureStrictForbiddenWordsCount(
                  card.palavra_alvo,
                  card.palavras_proibidas,
                  5,
                  room.theme
                );

                return (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`proibido-summary-toggle-card-${idx}`}
                    aria-pressed={isScored}
                    onClick={() => {
                      sounds.playTick();
                      onUpdateProibidoState((prev) => {
                        const nextOutcomes = [...prev.cardOutcomes];
                        nextOutcomes[idx] = nextOutcomes[idx] === 'correct' ? 'foul' : 'correct';
                        const nextScore = nextOutcomes.filter((o) => o === 'correct').length;
                        return {
                          ...prev,
                          cardOutcomes: nextOutcomes,
                          roundScore: nextScore
                        };
                      });
                    }}
                    className={`p-3 border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 rounded-sm ${
                      isScored
                        ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8] text-white shadow-sm'
                        : 'border-white/10 bg-[#07080d] text-slate-400 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 w-full">
                      <div className="min-w-0 flex-1">
                        <div className="font-anton text-xl sm:text-2xl lg:text-3xl uppercase text-white leading-tight break-words">
                          {card.palavra_alvo}
                        </div>
                        <div className="text-[10px] sm:text-[11px] font-mono-code uppercase mt-0.5">
                          {isScored ? (
                            <span className="text-[#17B8B8] font-bold">✅ ACERTOU (+1 PT)</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">❌ {outcome === 'foul' ? 'FALTA' : 'NÃO PONTUOU'}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono-code text-xs sm:text-sm font-bold text-[#17B8B8] shrink-0 px-1.5 py-0.5 bg-black/50 border border-white/10">
                        {isScored ? '+1 ✓' : '0'}
                      </span>
                    </div>

                    {/* 5 forbidden words split cleanly into 2 lines for 100% full visibility */}
                    <div className="pt-1.5 border-t border-white/10 w-full text-left">
                      <span className="text-[8px] sm:text-[9px] font-mono-code text-slate-400 uppercase block tracking-wider leading-none mb-1 font-semibold">
                        Proibidas:
                      </span>
                      <div className="text-xs sm:text-sm font-mono-code text-slate-300 leading-snug space-y-0.5">
                        <div className="text-slate-300">
                          {cardForbiddenWords.slice(0, 3).join(' • ')}
                        </div>
                        <div className="text-slate-400">
                          {cardForbiddenWords.slice(3, 5).join(' • ')}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Turn Callout + Confirm Points Button */}
          <div className="pt-2 border-t border-white/10 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-[10px] font-mono-code text-cyan-300 font-bold uppercase">
                {nextTurn.isGameOver ? '🏁 PARTIDA FINALIZADA' : '👉 PRÓXIMA VEZ / PRÓXIMO A FALAR:'}
              </div>
              <div className="font-anton text-base md:text-lg text-white uppercase flex items-center gap-1.5">
                <PlayerMark p={{ name: nextTurn.nextSpeakerName }} />
                <span className="text-amber-300">{nextTurn.nextSpeakerName}</span>
                <span className="text-slate-400 text-xs font-mono-code font-normal">
                  ({nextTurn.nextTeamName})
                </span>
                {!nextTurn.isGameOver && (
                  <span className="text-xs font-mono-code text-slate-400">
                    · Adivinhador: <strong className="text-cyan-200">{nextTurn.nextGuesserName}</strong>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              data-testid="proibido-confirm-points-btn"
              onClick={onNextRound}
              className="px-8 py-3 border-2 border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base md:text-lg uppercase tracking-wider shadow-neon-cyan transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>
                {nextTurn.isGameOver
                  ? 'Confirmar Pontos e Ver Placar Final ➔'
                  : 'Confirmar Pontos e Avançar ➔'}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* Active Card Display (Expanded Stage, Zero Vertical Scroll) */
        <div className="relative z-10 flex-1 min-h-0 w-full flex flex-col justify-between gap-1 sm:gap-1.5 overflow-hidden">
          {/* Progress indicators (5 cards + status summary) */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white/[0.03] border border-white/10 px-3 py-1 shrink-0">
            <div className="flex items-center gap-1.5">
              {proibido.cards.map((_, idx) => {
                const outcome = proibido.cardOutcomes[idx];
                const isCurrent = idx === proibido.currentCardIndex;
                return (
                  <div
                    key={idx}
                    data-testid={`proibido-card-indicator-${idx}`}
                    className={`w-6 h-6 flex items-center justify-center font-anton text-xs border transition-all ${
                      outcome === 'correct'
                        ? 'border-[#17B8B8] bg-[#17B8B8]/20 text-cyan-200'
                        : outcome === 'foul'
                        ? 'border-[#E6194B] bg-[#E6194B]/20 text-rose-300'
                        : isCurrent
                        ? 'border-[#17B8B8] bg-[#17B8B8] text-black scale-105'
                        : outcome === 'skipped'
                        ? 'border-amber-400/60 bg-amber-950/50 text-amber-300'
                        : 'border-white/10 bg-[#07080d] text-slate-500'
                    }`}
                  >
                    {outcome === 'correct'
                      ? '✓'
                      : outcome === 'foul'
                      ? '✕'
                      : outcome === 'skipped'
                      ? '⏳'
                      : idx + 1}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono-code font-bold uppercase">
              <span className="text-[#17B8B8]">✅ Acertadas: {countCorrect}</span>
              <span className="text-[#E6194B]">❌ Faltas: {countFoul}</span>
              <span className="text-amber-300">⏳ Fila: {countPending}</span>
            </div>
          </div>

          {tvWordsHidden ? (
            /* Anti-spoiler masked screen on TV when guesser has no blindfold */
            <div
              data-testid="proibido-tv-masked-screen"
              className="flex-1 min-h-0 flex flex-col items-center justify-center border-2 border-amber-400/70 bg-[#07080d]/95 p-4 text-center gap-3 shadow-2xl overflow-hidden"
            >
              <div className="space-y-1 max-w-lg">
                <div className="font-anton text-2xl md:text-3xl text-amber-300 uppercase">
                  PALAVRAS OCULTAS NA TV (MODO SEM VENDA)
                </div>
                <p className="text-xs md:text-sm text-slate-300">
                  O Adivinhador (<strong className="text-amber-200 font-anton">{guesserPlayer?.name}</strong>) pode olhar para a TV!
                  A palavra-alvo e as proibidas estão visíveis apenas no celular do{' '}
                  <strong className="text-cyan-300 font-anton">Orador ({speakerPlayer?.name})</strong>
                  {!is2Player && refereePlayer ? (
                    <> e do <strong className="text-rose-400 font-anton">Fiscal ({refereePlayer?.name})</strong>.</>
                  ) : '.'}
                </p>
              </div>

              <div className="px-4 py-2 border border-white/20 bg-white/[0.04] font-anton text-xl md:text-2xl text-white">
                CARTA {proibido.currentCardIndex + 1} DE {proibido.cards.length}
              </div>

              <button
                type="button"
                onClick={toggleTvWordsVisibility}
                className="px-5 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-black font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Eye size={16} />
                <span>MOSTRAR PALAVRAS NA TV (JOGADOR COM VENDA)</span>
              </button>
            </div>
          ) : (
            /* Official CazéTV Visual Layout (Expanded Prominent Stage) */
            <div className="flex-1 min-h-0 flex flex-col justify-between relative border border-[#E6194B]/60 bg-white/[0.03] p-2 sm:p-3 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-1 shrink-0">
                <span className="text-[10px] font-mono-code text-rose-300 uppercase font-bold">
                  👀 VISÍVEL NA TV — O ADIVINHADOR DEVE ESTAR DE COSTAS OU DE OLHO FECHADO!
                </span>
                <button
                  type="button"
                  onClick={toggleTvWordsVisibility}
                  className="px-2 py-0.5 border border-amber-400 bg-amber-950 text-amber-200 text-[10px] font-mono-code font-bold uppercase cursor-pointer"
                >
                  🙈 Ocultar Palavras na TV
                </button>
              </div>

              <div className="rdb-proibido-card">
              {/* Top Red Ticket Banner with Perforated CazéTV Edges */}
              <div className="rdb-proibido-target relative bg-[#E6194B] text-[#F5F2EB] px-8 text-center select-none overflow-hidden">
                {/* Left perforated ticket notch */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-[#0c1020] flex flex-col justify-around py-0.5">
                  <span className="w-1.5 h-1.5 bg-[#E6194B] rounded-full" />
                  <span className="w-1.5 h-1.5 bg-[#E6194B] rounded-full" />
                  <span className="w-1.5 h-1.5 bg-[#E6194B] rounded-full" />
                </div>
                {/* Right perforated ticket notch */}
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#0c1020] flex flex-col justify-around py-0.5 items-end">
                  <span className="w-1.5 h-1.5 bg-[#E6194B] rounded-full" />
                  <span className="w-1.5 h-1.5 bg-[#E6194B] rounded-full" />
                  <span className="w-1.5 h-1.5 bg-[#E6194B] rounded-full" />
                </div>
                <div className="rdb-proibido-target-word font-anton tracking-wider uppercase">
                  {currentCard?.palavra_alvo}
                </div>
              </div>

              {/* Frame with Vertical Rotated "PROIBIDAS" Labels and Cream Words */}
              <div className="rdb-proibido-forbidden relative flex flex-col justify-evenly border border-white/10 bg-[#07080d]/95 px-6 py-2">
                <div className="absolute -left-5 top-1/2 -translate-y-1/2 -rotate-90 bg-[#E6194B] text-white font-anton text-[9px] tracking-widest uppercase px-2 py-0.5 select-none shadow">
                  PROIBIDAS
                </div>
                <div className="absolute -right-5 top-1/2 -translate-y-1/2 rotate-90 bg-[#E6194B] text-white font-anton text-[9px] tracking-widest uppercase px-2 py-0.5 select-none shadow">
                  PROIBIDAS
                </div>

                {/* Exactly 5 Forbidden Words Stacked Vertically with prominent typography */}
                {(() => {
                  const safeWords = currentCard
                    ? ensureStrictForbiddenWordsCount(
                        currentCard.palavra_alvo,
                        currentCard.palavras_proibidas,
                        5,
                        room.theme
                      )
                    : [];
                  return (
                    <div className="flex flex-col items-center justify-evenly flex-1 min-h-0 py-0.5 gap-1 sm:gap-1.5">
                      {safeWords.map((word, wIdx) => (
                        <div
                          key={wIdx}
                          className="rdb-proibido-word font-anton text-[#F5F2EB] tracking-wide uppercase text-center select-none"
                        >
                          {word}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              </div>
            </div>
          )}

          {skipFeedbackMsg && (
            <div
              data-testid="proibido-skip-feedback"
              className="text-center py-1 px-3 border border-amber-400/60 bg-amber-950/70 text-amber-200 font-mono-code text-xs font-bold uppercase shrink-0"
            >
              {skipFeedbackMsg}
            </div>
          )}

          {/* Quick Host Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 shrink-0 border-t border-white/10 mt-0.5">
            {/* Primary Action Controls: Hit & Skip */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleHit}
                className="px-5 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 size={16} />
                <span>ACERTOU (+1 PONTO)</span>
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="px-3.5 py-2 border border-white/20 bg-white/[0.04] hover:bg-white/10 text-slate-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>PULAR CARTA</span>
              </button>
              {countPending === 1 && (
                <button
                  type="button"
                  data-testid="proibido-finish-last-card-btn"
                  onClick={handleFinishRemainingAsSkipped}
                  className="px-3.5 py-2 border border-amber-400/60 bg-amber-950/70 hover:bg-amber-400 hover:text-black text-amber-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>ENCERRAR RODADA</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>

            {/* Destructive Control: Visually isolated on the right with crimson theme */}
            <div className="pl-3 border-l border-white/15 flex items-center gap-2">
              {currentCard && <RadicalCheck cardWords={[currentCard.palavra_alvo, ...currentCard.palavras_proibidas]} />}
              {proibido.lastFoulIndex !== undefined && proibido.cardOutcomes[proibido.lastFoulIndex] === 'foul' && (
                <button
                  type="button"
                  data-testid="proibido-contest-foul-btn"
                  onClick={handleContestFoul}
                  className="px-3 py-2 border border-sky-400/60 bg-sky-950/60 hover:bg-sky-400 hover:text-black text-sky-200 font-anton text-xs md:text-sm uppercase tracking-wider cursor-pointer transition-colors"
                >
                  ⚖️ CONTESTAR FALTA
                </button>
              )}
              <button
                type="button"
                onClick={handleFoul}
                className="px-4 py-2 border-2 border-[#E6194B] bg-[#E6194B]/20 hover:bg-[#E6194B] text-rose-300 hover:text-white font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <AlertTriangle size={15} />
                <span>🚨 FALTA (ANULAR CARTA)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
