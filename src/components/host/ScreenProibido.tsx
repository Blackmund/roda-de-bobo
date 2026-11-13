import { themeBadge } from '../../utils/themeUtils';
import React, { useEffect, useRef, useState } from 'react';
import { GameRoom, Player, ProibidoGameState, TeamId } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { getActiveTeamIds, getNextTeamId } from '../../utils/teamUtils';
import { ensureStrictForbiddenWordsCount } from '../../utils/proibidoGoldenDatabase';
import confetti from 'canvas-confetti';
import { RadicalCheck } from './proibido/RadicalCheck';
import { Clock, AlertTriangle, ArrowRight, Check, RotateCcw, Infinity, Eye, EyeOff, Info, RefreshCw, Scale, X as XIcon } from 'lucide-react';
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

  const clock =
    room.timerConfig === 0
      ? 'Livre'
      : `${String(Math.floor(proibido.timerSeconds / 60)).padStart(2, '0')}:${String(proibido.timerSeconds % 60).padStart(2, '0')}`;
  const clockHot = room.timerConfig !== 0 && proibido.timerSeconds <= 10 && proibido.phase === 'PLAYING';
  const lastFoul = proibido.lastFoulIndex !== undefined && proibido.cardOutcomes[proibido.lastFoulIndex] === 'foul';
  const forbiddenOf = (card: { palavra_alvo: string; palavras_proibidas: string[] }) =>
    ensureStrictForbiddenWordsCount(card.palavra_alvo, card.palavras_proibidas, 5, room.theme);

  return (
    <div className={'rdb-pro' + (flashFoul ? ' is-foul' : '')}>
      {/* Barra: o essencial aparece, o resto vira icone com dica */}
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Proibido
          <span className="rdb-lim-round">{is2Player ? 'Cooperativo' : `Equipe ${proibido.speakerTeam} × ${proibido.refereeTeam}`}</span>
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip="Descreva a palavra sem dizer as proibidas, a própria palavra, o radical delas ou a tradução. Cada acerto vale 1 ponto."
        >
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span
            data-testid="proibido-timer-display"
            className={'rdb-lim-timer' + (clockHot ? ' is-hot' : '')}
            data-tip={room.timerConfig === 0 ? 'Sem limite de tempo' : 'Tempo da rodada'}
          >
            {room.timerConfig === 0 ? <Infinity size={16} /> : <Clock size={16} />}
            {clock}
          </span>
          <button
            type="button"
            data-testid="proibido-toggle-tv-words-btn"
            className={'rdb-lim-icon' + (tvWordsHidden ? ' is-on' : '')}
            aria-pressed={tvWordsHidden}
            aria-label={tvWordsHidden ? 'Mostrar as palavras na TV' : 'Ocultar as palavras na TV'}
            data-tip={
              tvWordsHidden
                ? 'Mostrar as palavras na TV (quem adivinha está vendado)'
                : 'Ocultar as palavras na TV (quem adivinha não tem venda)'
            }
            onClick={toggleTvWordsVisibility}
          >
            {tvWordsHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            type="button"
            className="rdb-lim-icon"
            aria-label="Inverter quem fala e quem adivinha"
            data-tip="Inverter quem fala e quem adivinha"
            onClick={handleRotateSpeaker}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Quem fala agora, quem adivinha e quem fiscaliza: uma faixa so */}
      <div className="rdb-tem-turn" data-testid="proibido-role-demonstration-strip">
        <ActiveTurnBanner
          room={room}
          hideSecondary={is2Player}
          extra={
            <span className="rdb-turn-other">
              <span>Adivinha</span>
              <PlayerMark p={guesserPlayer} /> {guesserPlayer?.name}
            </span>
          }
        />
      </div>

      {proibido.phase === 'READY' ? (
        <section className="rdb-pro-ready">
          <h2>{proibido.cards.length} cartas</h2>
          <p>
            {is2Player
              ? `${speakerPlayer?.name} descreve e ${guesserPlayer?.name} adivinha. Os dois pontuam juntos.`
              : `${speakerPlayer?.name} descreve para ${guesserPlayer?.name}. A equipe adversária fiscaliza com a sirene de falta.`}
          </p>
          <button type="button" className="rdb-btn rdb-setup-start" onClick={handleStartTimer}>
            {room.timerConfig === 0 ? 'Iniciar rodada' : `Iniciar cronômetro (${room.timerConfig}s)`}
          </button>
        </section>
      ) : proibido.phase === 'SUMMARY' ? (
        <section data-testid="proibido-summary-panel" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">{countPending === 0 ? 'Todas as cartas' : 'Tempo esgotado'}</span>
            <h2>
              {proibido.roundScore} de {proibido.cards.length} <small>acertadas</small>
            </h2>
            <p>
              {is2Player
                ? 'Os dois jogadores recebem os pontos.'
                : `Pontos da Equipe ${proibido.speakerTeam} (${speakerPlayer?.name} e ${guesserPlayer?.name}).`}{' '}
              Clique numa carta para corrigir.
            </p>
          </div>

          <div className="rdb-pro-sum-grid">
            {proibido.cards.map((card, idx) => {
              const outcome = proibido.cardOutcomes[idx];
              const scored = outcome === 'correct';
              return (
                <button
                  key={idx}
                  type="button"
                  data-testid={`proibido-summary-toggle-card-${idx}`}
                  aria-pressed={scored}
                  className={'rdb-pro-sum-card' + (scored ? ' is-hit' : '')}
                  onClick={() => {
                    sounds.playTick();
                    onUpdateProibidoState((prev) => {
                      const nextOutcomes = [...prev.cardOutcomes];
                      nextOutcomes[idx] = nextOutcomes[idx] === 'correct' ? 'foul' : 'correct';
                      return { ...prev, cardOutcomes: nextOutcomes, roundScore: nextOutcomes.filter((o) => o === 'correct').length };
                    });
                  }}
                >
                  <span className="rdb-pro-sum-top">
                    <strong>{card.palavra_alvo}</strong>
                    <span className="rdb-pro-sum-mark" data-tip={scored ? 'Acertou (+1)' : outcome === 'foul' ? 'Falta' : 'Não pontuou'}>
                      {scored ? <Check size={18} strokeWidth={4} /> : <XIcon size={18} strokeWidth={4} />}
                    </span>
                  </span>
                  <span className="rdb-pro-sum-words">{forbiddenOf(card).join(' · ')}</span>
                </button>
              );
            })}
          </div>

          <div className="rdb-pro-sum-foot">
            <div className="rdb-pro-next">
              <span>{nextTurn.isGameOver ? 'Fim da partida' : 'Próximo a falar'}</span>
              {!nextTurn.isGameOver && (
                <strong>
                  <PlayerMark p={{ name: nextTurn.nextSpeakerName }} /> {nextTurn.nextSpeakerName}
                  <em> · adivinha {nextTurn.nextGuesserName}</em>
                </strong>
              )}
            </div>
            <button type="button" data-testid="proibido-confirm-points-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              {nextTurn.isGameOver ? 'Confirmar e ver o placar final' : 'Confirmar pontos e avançar'}
              <ArrowRight />
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Progresso das cartas */}
          <div className="rdb-pro-progress">
            <div className="rdb-pro-dots">
              {proibido.cards.map((_, idx) => {
                const outcome = proibido.cardOutcomes[idx];
                const current = idx === proibido.currentCardIndex;
                return (
                  <i
                    key={idx}
                    data-testid={`proibido-card-indicator-${idx}`}
                    className={outcome === 'correct' ? 'is-hit' : outcome === 'foul' ? 'is-foul' : outcome === 'skipped' ? 'is-skip' : current ? 'is-now' : ''}
                  >
                    {outcome === 'correct' ? <Check size={14} strokeWidth={4} /> : outcome === 'foul' ? <XIcon size={14} strokeWidth={4} /> : idx + 1}
                  </i>
                );
              })}
            </div>
            <div className="rdb-pro-counts">
              <span data-tip="Acertadas">
                <Check size={16} /> {countCorrect}
              </span>
              <span data-tip="Faltas">
                <XIcon size={16} /> {countFoul}
              </span>
              <span data-tip="Na fila">
                <Clock size={16} /> {countPending}
              </span>
            </div>
          </div>

          {tvWordsHidden ? (
            <section data-testid="proibido-tv-masked-screen" className="rdb-pro-masked">
              <h2>Palavras ocultas na TV</h2>
              <p>
                {guesserPlayer?.name} pode olhar a TV. A palavra e as proibidas aparecem só no celular de {speakerPlayer?.name}
                {!is2Player && refereePlayer ? ` e de ${refereePlayer?.name} (fiscal)` : ''}.
              </p>
              <span className="rdb-lim-round">
                Carta {proibido.currentCardIndex + 1} de {proibido.cards.length}
              </span>
              <button type="button" className="rdb-btn" onClick={toggleTvWordsVisibility}>
                <Eye /> Mostrar na TV (quem adivinha está vendado)
              </button>
            </section>
          ) : (
            <div className="rdb-pro-card">
              <div className="rdb-pro-target">
                <span className="rdb-pro-label">Palavra</span>
                <div className="rdb-pro-target-word">{currentCard?.palavra_alvo}</div>
              </div>
              <div className="rdb-pro-forbidden">
                <span className="rdb-pro-label is-bad">Proibidas</span>
                {(currentCard ? forbiddenOf(currentCard) : []).map((word, wIdx) => (
                  <div key={wIdx} className="rdb-pro-word">
                    {word}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skipFeedbackMsg && (
            <div data-testid="proibido-skip-feedback" className="rdb-pro-note">
              {skipFeedbackMsg}
            </div>
          )}

          {/* Acoes: acertou e falta sao as duas decisoes de sempre */}
          <footer className="rdb-pro-foot">
            <button type="button" className="rdb-btn rdb-pro-hit" onClick={handleHit}>
              <Check size={20} strokeWidth={3} /> Acertou
            </button>
            <button type="button" className="rdb-btn" onClick={handleSkip} data-tip="Manda a carta para o fim da fila">
              <RotateCcw /> Pular
            </button>
            {countPending === 1 && (
              <button type="button" data-testid="proibido-finish-last-card-btn" className="rdb-btn" onClick={handleFinishRemainingAsSkipped}>
                Encerrar rodada <ArrowRight />
              </button>
            )}
            <div className="rdb-pro-foot-end">
              {currentCard && <RadicalCheck cardWords={[currentCard.palavra_alvo, ...currentCard.palavras_proibidas]} />}
              {lastFoul && (
                <button type="button" data-testid="proibido-contest-foul-btn" className="rdb-btn" onClick={handleContestFoul} data-tip="O juiz devolve a carta">
                  <Scale /> Contestar
                </button>
              )}
              <button type="button" data-testid="proibido-foul-btn" className="rdb-btn rdb-tem-strike" onClick={handleFoul} data-tip="Anula a carta: alguém disse uma palavra proibida">
                <AlertTriangle /> Falta
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};
