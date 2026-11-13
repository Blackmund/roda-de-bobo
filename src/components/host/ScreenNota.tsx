import { themeBadge } from '../../utils/themeUtils';
import React, { useState } from 'react';
import { GameRoom, NotaGameState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { generateRoundContent, sanitizeCleanGameText } from '../../utils/aiGameGenerator';
import {
  SpinningNumberWheel,
  drawRandomScoreCSPRNG,
  toggleNotaSelectedPlayer,
  computeNotaRoundPoints
} from '../SpinningNumberWheel';
import { ActiveTurnBanner } from '../ActiveTurnBanner';
import { isShowRuleset } from '../../config/rulesets';
import confetti from 'canvas-confetti';
import { EyeOff, RefreshCw, ArrowRight, Check, Dices, Info, RotateCcw, X as XIcon } from 'lucide-react';
import { PlayerMark } from '../rdb/PlayerMark';

interface ScreenNotaProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateNotaState: (updater: (prev: NotaGameState) => NotaGameState) => void;
  onNextRound: () => void;
}

const FREE_QUESTION_INSPIRATIONS = [
  '💡 Situação em um Date',
  '💡 Nível de desespero na selva',
  '💡 Trabalho que você teria'
];

export const ScreenNota: React.FC<ScreenNotaProps> = ({
  room,
  isTvMode = true,
  onUpdateNotaState,
  onNextRound
}) => {
  const nota = room.nota;
  // REG-02: regras do programa — duas perguntas (esporte + aleatória), demais jogadores vendados
  const isShow = isShowRuleset(room.customConfig);
  const [isSwappingQuestion, setIsSwappingQuestion] = useState(false);

  if (!nota) {
    return (
      <div className="p-8 text-center font-mono-code text-cyan-300">
        Carregando rodada do Jogo da Nota...
      </div>
    );
  }

  const speaker =
    room.players.find((p) => p.id === nota.speakerPlayerId) || room.players[0];
  const otherPlayers = room.players.filter((p) => p.id !== speaker?.id);
  const scaleMin = nota.scaleMin ?? room.customConfig?.notaScaleMin ?? 1;
  const scaleMax = nota.scaleMax || room.customConfig?.notaScaleMax || 10;

  // Normalize legacy phases if any saved state had old phase names
  const effectivePhase =
    nota.phase === 'DRAW'
      ? 'STEP_1_DRAW'
      : nota.phase === 'CLUES'
      ? 'STEP_2_CLUE_1'
      : nota.phase === 'VOTING'
      ? 'STEP_3_CLUE_2'
      : nota.phase === 'REVEAL'
      ? 'STEP_4_REVEAL'
      : nota.phase;

  const drawSubState = nota.drawSubState || 'BLINDFOLD_WARNING';
  const rawRevealSubState = nota.revealSubState;
  const revealSubState =
    rawRevealSubState === 'SPINNING' || rawRevealSubState === 'REVEALED_LOCKED'
      ? rawRevealSubState
      : 'SCORING';
  const selectedIds = nota.selectedCorrectPlayerIds || nota.correctVoters || [];

  const rawQuestionText =
    nota.roundData?.pergunta ||
    nota.roundData?.eixo_principal_futebol_ou_tema1 ||
    'Qual elemento mais marcante ou famoso?';
  const mainQuestionText = sanitizeCleanGameText(rawQuestionText, 'nota');

  // Step 1A -> 1B: Draw CSPRNG secret score and start Pião do Baú spin
  const handleStartSecretDraw = () => {
    sounds.playPowerup();
    const freshScore = drawRandomScoreCSPRNG(scaleMin, scaleMax);
    onUpdateNotaState((prev) => ({
      ...prev,
      phase: 'STEP_1_DRAW',
      secretScore: freshScore,
      drawSubState: 'SPINNING'
    }));
  };

  // Step 1B complete: Wheel locked on number
  const handleSecretWheelLocked = () => {
    onUpdateNotaState((prev) => ({
      ...prev,
      drawSubState: 'MEMORIZED_READY'
    }));
  };

  // Step 1B -> Step 2: Immediately hide number and advance to 1st Clue (AI Theme Question)
  const handleMemorizedContinue = () => {
    sounds.playFlip();
    onUpdateNotaState((prev) => ({
      ...prev,
      phase: 'STEP_2_CLUE_1',
      drawSubState: 'BLINDFOLD_WARNING'
    }));
  };

  // Step 2: Swap AI Question
  const handleSwapQuestion = async () => {
    if (isSwappingQuestion) return;
    setIsSwappingQuestion(true);
    sounds.playFlip();
    try {
      const generated = await generateRoundContent(
        'nota',
        room.theme,
        room.customConfig,
        [...(room.usedRoundSignatures || []), mainQuestionText]
      );
      const newData = generated.data as any;
      if (newData) {
        onUpdateNotaState((prev) => ({
          ...prev,
          roundData: {
            pergunta:
              newData.pergunta ||
              newData.eixo_principal_futebol_ou_tema1 ||
              prev.roundData.pergunta
          }
        }));
      }
    } finally {
      setIsSwappingQuestion(false);
    }
  };

  // Step 2 -> Step 3: Go to 2nd Clue (Free Table Question)
  const handleGoToStep3 = () => {
    sounds.playPowerup();
    onUpdateNotaState((prev) => ({
      ...prev,
      phase: 'STEP_3_CLUE_2'
    }));
  };

  // Step 3 -> Step 4: Trigger Pião do Baú Reveal
  const handleGoToStep4Reveal = () => {
    sounds.playPowerup();
    onUpdateNotaState((prev) => ({
      ...prev,
      phase: 'STEP_4_REVEAL',
      revealSubState: 'SPINNING',
      selectedCorrectPlayerIds: [],
      correctVoters: [],
      pointsAwarded: {}
    }));
  };

  // Step 4A -> Step 4B: Reveal Wheel finished locking on secretScore (stays on wheel screen showing landed score)
  const handleRevealWheelLocked = () => {
    confetti({ particleCount: 70, spread: 75, origin: { y: 0.55 } });
    sounds.playFanfare();
    onUpdateNotaState((prev) => {
      const calc = computeNotaRoundPoints(
        room.players.map((p) => p.id),
        prev.speakerPlayerId,
        prev.selectedCorrectPlayerIds || []
      );
      return {
        ...prev,
        revealSubState: 'REVEALED_LOCKED',
        pointsAwarded: calc.pointsAwarded,
        correctVoters: calc.correctVoters
      };
    });
  };

  // Step 4B -> Step 4C: Advance from the revealed wheel to the scoring table screen
  const handleProceedToScoring = () => {
    sounds.playPowerup();
    onUpdateNotaState((prev) => ({
      ...prev,
      revealSubState: 'SCORING'
    }));
  };

  // Step 4C -> Step 4B: Back to view the wheel and revealed score if desired
  const handleBackToRevealedWheel = () => {
    sounds.playFlip();
    onUpdateNotaState((prev) => ({
      ...prev,
      revealSubState: 'REVEALED_LOCKED'
    }));
  };

  // Step 4C: Toggle player selection (reversible click — multiple players can win)
  const handleTogglePlayerCorrect = (playerId: string) => {
    const isAlreadySelected = selectedIds.includes(playerId);
    if (isAlreadySelected) {
      sounds.playTick();
    } else {
      sounds.playSuccess();
    }
    onUpdateNotaState((prev) => {
      const currentList = Array.isArray(prev.selectedCorrectPlayerIds)
        ? prev.selectedCorrectPlayerIds
        : Array.isArray(prev.correctVoters)
        ? prev.correctVoters
        : [];
      const nextList = toggleNotaSelectedPlayer(currentList, playerId, prev.speakerPlayerId);
      const calc = computeNotaRoundPoints(
        room.players.map((p) => p.id),
        prev.speakerPlayerId,
        nextList
      );
      return {
        ...prev,
        revealSubState: 'SCORING',
        selectedCorrectPlayerIds: nextList,
        correctVoters: calc.correctVoters,
        pointsAwarded: calc.pointsAwarded
      };
    });
  };

  // Step 4B -> Confirm Points & Advance to Next Round (rotates Narrator)
  const handleConfirmPointsAndNextRound = () => {
    const calc = computeNotaRoundPoints(
      room.players.map((p) => p.id),
      nota.speakerPlayerId,
      selectedIds
    );
    onUpdateNotaState((prev) => ({
      ...prev,
      selectedCorrectPlayerIds: calc.correctVoters,
      correctVoters: calc.correctVoters,
      pointsAwarded: calc.pointsAwarded
    }));
    onNextRound();
  };

  const liveCalc = computeNotaRoundPoints(
    room.players.map((p) => p.id),
    nota.speakerPlayerId,
    selectedIds
  );

  const stepNumber =
    effectivePhase === 'STEP_1_DRAW'
      ? 1
      : effectivePhase === 'STEP_2_CLUE_1'
      ? 2
      : effectivePhase === 'STEP_3_CLUE_2'
      ? 3
      : 4;

  const scoringStage = effectivePhase === 'STEP_4_REVEAL' && revealSubState === 'SCORING';
  const stepLabels = [
    'Sorteio da nota',
    isShow ? '1ª pergunta (esporte)' : '1ª pista (IA)',
    isShow ? '2ª pergunta (aleatória)' : '2ª pista (mesa)',
    'Revelação'
  ];

  return (
    <div data-testid="screen-nota" className="rdb-nota">
      {/* Barra: o essencial aparece, o resto vira icone com dica */}
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Nota
          <span data-testid="nota-individual-mode-badge" className="rdb-lim-round">
            R{room.roundNumber}/{room.maxRounds}
          </span>
          <span data-testid="nota-scale-badge" className="rdb-nota-scale" data-tip={`A nota secreta vai de ${scaleMin} (pior) a ${scaleMax} (lendário)`}>
            {scaleMin}–{scaleMax}
          </span>
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip={`Tema: ${room.theme}. O narrador sorteia uma nota em segredo e responde às perguntas na medida dela; a mesa tenta adivinhar. Quem acerta ganha 1 ponto, e o narrador ganha 1 por acerto.`}
        >
          <Info size={16} />
        </span>
        <div className="rdb-pro-dots rdb-nota-steps" aria-label="Etapas da rodada">
          {stepLabels.map((label, i) => (
            <i
              key={label}
              data-testid={`nota-step-pill-${i + 1}`}
              data-tip={`${i + 1}. ${label}`}
              className={stepNumber === i + 1 ? 'is-now' : stepNumber > i + 1 ? 'is-hit' : ''}
            >
              {stepNumber > i + 1 ? <Check size={14} strokeWidth={4} /> : i + 1}
            </i>
          ))}
        </div>
        <div className="rdb-lim-tools">
          {effectivePhase === 'STEP_2_CLUE_1' && (
            <button
              type="button"
              data-testid="nota-swap-question-btn"
              className="rdb-lim-icon"
              disabled={isSwappingQuestion}
              aria-label="Trocar a pergunta"
              data-tip={isSwappingQuestion ? 'Gerando uma pergunta nova...' : 'Trocar a pergunta'}
              onClick={handleSwapQuestion}
            >
              <RefreshCw size={16} className={isSwappingQuestion ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </header>

      {/* Narrador */}
      <div className="rdb-tem-turn">
        <ActiveTurnBanner
          room={room}
          onRotateActivePlayer={() => {
            if (room.players.length <= 1) return;
            onUpdateNotaState((prev) => {
              const curIdx = room.players.findIndex((p) => p.id === prev.speakerPlayerId);
              const nextSpeaker = room.players[(curIdx + 1) % room.players.length];
              return { ...prev, speakerPlayerId: nextSpeaker?.id || prev.speakerPlayerId };
            });
          }}
        />
      </div>
      <span data-testid="nota-narrator-banner" className="sr-only">
        Narrador da rodada: {speaker?.name || 'Jogador'}
      </span>

      {/* Placar */}
      <div data-testid="nota-individual-scoreboard" className="rdb-tem-strip rdb-nota-board">
        {room.players.map((p) => {
          const isCurrentSpeaker = p.id === speaker?.id;
          const canToggleFromStrip = scoringStage && !isCurrentSpeaker;
          const isPlayerSelected = selectedIds.includes(p.id);
          const liveDelta = scoringStage ? liveCalc.pointsAwarded[p.id] || 0 : 0;
          return (
            <div
              key={p.id}
              data-testid={`nota-player-score-card-${p.id}`}
              role={canToggleFromStrip ? 'button' : undefined}
              tabIndex={canToggleFromStrip ? 0 : undefined}
              aria-pressed={canToggleFromStrip ? isPlayerSelected : undefined}
              onClick={() => canToggleFromStrip && handleTogglePlayerCorrect(p.id)}
              className={'rdb-tem-team is-strip' + (isCurrentSpeaker || (scoringStage && isPlayerSelected) ? ' is-turn' : '')}
              style={{ ['--team' as string]: isCurrentSpeaker ? '#ffc93c' : '#17b8b8', cursor: canToggleFromStrip ? 'pointer' : 'default' }}
              data-tip={isCurrentSpeaker ? 'Narrador' : undefined}
            >
              <span className="rdb-tem-team-name">
                <PlayerMark p={p} /> {p.name}
              </span>
              <span className="rdb-tem-team-pts">
                {(p.score || 0) + liveDelta}
                {liveDelta > 0 && <small>+{liveDelta}</small>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rdb-nota-stage">
        {/* Etapa 1: sorteio secreto */}
        {effectivePhase === 'STEP_1_DRAW' && (
          <div data-testid="nota-step-1-draw" className="rdb-nota-center">
            {drawSubState === 'BLINDFOLD_WARNING' ? (
              <>
                <EyeOff size={56} className="rdb-nota-icon" />
                <h2 data-testid="nota-blindfold-warning-text">Todos de olhos fechados, menos {speaker?.name}</h2>
                <p>
                  A nota sai entre {scaleMin} (pior) e {scaleMax} (lendário). Só quem narra olha para a tela.
                </p>
                <button type="button" data-testid="nota-draw-btn" className="rdb-btn rdb-setup-start" onClick={handleStartSecretDraw}>
                  <Dices /> Sortear a nota
                </button>
              </>
            ) : (
              <>
                <h2>Só {speaker?.name} olha. Memorize a nota.</h2>
                <div className="rdb-nota-wheel">
                  <SpinningNumberWheel
                    targetNumber={nota.secretScore}
                    minRange={scaleMin}
                    maxRange={scaleMax}
                    durationMs={3400}
                    autoStart={drawSubState === 'SPINNING'}
                    label="Sorteando a nota secreta..."
                    onComplete={handleSecretWheelLocked}
                  />
                </div>
                {drawSubState === 'MEMORIZED_READY' ? (
                  <button type="button" data-testid="nota-memorized-continue-btn" className="rdb-btn rdb-setup-start" onClick={handleMemorizedContinue}>
                    <Check /> Já memorizei, continuar
                  </button>
                ) : (
                  <span className="rdb-nota-wait">Aguarde o pião parar...</span>
                )}
              </>
            )}
          </div>
        )}

        {/* Etapa 2: primeira pergunta */}
        {effectivePhase === 'STEP_2_CLUE_1' && (
          <div data-testid="nota-step-2-clue-1" className="rdb-nota-center">
            <span className="rdb-lim-round">{isShow ? '1ª pergunta · esporte' : '1ª pista'}</span>
            <h2
              data-testid="nota-step-2-question-text"
              className="rdb-lim-question"
              data-len={mainQuestionText.length <= 50 ? 'xs' : mainQuestionText.length <= 80 ? 's' : mainQuestionText.length <= 105 ? 'm' : mainQuestionText.length <= 130 ? 'l' : 'xl'}
            >
              {mainQuestionText}
            </h2>
            <p>
              {speaker?.name} responde em voz alta, dando um exemplo que combine com a nota secreta ({scaleMin} = fraco, {scaleMax} = lendário). Todos já podem abrir os olhos.
            </p>
            <button type="button" data-testid="nota-go-step-3-btn" className="rdb-btn rdb-setup-start" onClick={handleGoToStep3}>
              Próxima etapa <ArrowRight />
            </button>
          </div>
        )}

        {/* Etapa 3: pergunta da mesa */}
        {effectivePhase === 'STEP_3_CLUE_2' && (
          <div data-testid="nota-step-3-clue-2" className="rdb-nota-center">
            <span className="rdb-lim-round">{isShow ? '2ª pergunta · aleatória' : '2ª pista · mesa'}</span>
            <h2 data-testid="nota-step-3-title" className="rdb-nota-big">
              {isShow ? 'Pergunta tirada do aquário' : 'Pergunta livre da mesa'}
            </h2>
            <p>
              A mesa faz uma pergunta para {speaker?.name} responder na mesma nota ({scaleMin} a {scaleMax}). Depois de todos darem o palpite, revelem a nota.
            </p>
            <div className="rdb-nota-ideas">
              {FREE_QUESTION_INSPIRATIONS.map((idea) => (
                <span key={idea}>{idea.replace('💡 ', '')}</span>
              ))}
            </div>
            <button type="button" data-testid="nota-go-step-4-reveal-btn" className="rdb-btn rdb-setup-start" onClick={handleGoToStep4Reveal}>
              <Dices /> Revelar a nota
            </button>
          </div>
        )}

        {/* Etapa 4: revelacao e pontuacao */}
        {effectivePhase === 'STEP_4_REVEAL' && (
          <div data-testid="nota-step-4-reveal" className="rdb-nota-center">
            {revealSubState === 'SPINNING' || revealSubState === 'REVEALED_LOCKED' ? (
              <>
                <h2>{revealSubState === 'REVEALED_LOCKED' ? `A nota de ${speaker?.name} é` : `Qual foi a nota de ${speaker?.name}?`}</h2>
                <div className="rdb-nota-wheel">
                  <SpinningNumberWheel
                    targetNumber={nota.secretScore}
                    minRange={scaleMin}
                    maxRange={scaleMax}
                    durationMs={3500}
                    autoStart={revealSubState === 'SPINNING'}
                    label="Revelando a nota oficial..."
                    onComplete={handleRevealWheelLocked}
                  />
                </div>
                {revealSubState === 'REVEALED_LOCKED' ? (
                  <button type="button" data-testid="nota-proceed-to-scoring-btn" className="rdb-btn rdb-setup-start" onClick={handleProceedToScoring}>
                    Ir para a pontuação <ArrowRight />
                  </button>
                ) : (
                  <button type="button" data-testid="nota-skip-reveal-spin-btn" className="rdb-btn" onClick={handleRevealWheelLocked}>
                    Revelar agora
                  </button>
                )}
              </>
            ) : (
              <div className="rdb-nota-score">
                <div className="rdb-nota-score-top">
                  <div className="rdb-nota-revealed">
                    <span>Nota de {speaker?.name}</span>
                    <strong data-testid="nota-revealed-score-value">{nota.secretScore}</strong>
                    <button type="button" data-testid="nota-back-to-wheel-btn" className="rdb-lim-icon" aria-label="Rever o pião" data-tip="Rever o pião" onClick={handleBackToRevealedWheel}>
                      <RotateCcw size={16} />
                    </button>
                  </div>
                  <div data-testid="nota-narrator-points-card" className="rdb-nota-revealed is-narrator">
                    <span>Narrador ganha</span>
                    <strong data-testid="nota-narrator-points-value">
                      +{liveCalc.narratorPoints} {liveCalc.narratorPoints === 1 ? 'ponto' : 'pontos'}
                    </strong>
                  </div>
                </div>

                <div className="rdb-nota-pick-head">
                  <span>Quem acertou a nota {nota.secretScore}?</span>
                  <span
                    data-testid="nota-multi-winner-hint"
                    className="rdb-lim-rule"
                    tabIndex={0}
                    data-tip="Clique para dar +1 ponto; clique de novo para tirar."
                  >
                    <Info size={16} />
                  </span>
                </div>
                <div className="rdb-pro-sum-grid rdb-nota-pick">
                  {otherPlayers.map((player) => {
                    const isSelected = selectedIds.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        data-testid={`nota-toggle-winner-${player.id}`}
                        aria-pressed={isSelected}
                        className={'rdb-pro-sum-card' + (isSelected ? ' is-hit' : '')}
                        onClick={() => handleTogglePlayerCorrect(player.id)}
                      >
                        <span className="rdb-pro-sum-top">
                          <strong>
                            <PlayerMark p={player} /> {player.name}
                          </strong>
                          <span className="rdb-pro-sum-mark">{isSelected ? <Check size={18} strokeWidth={4} /> : <XIcon size={18} strokeWidth={4} />}</span>
                        </span>
                        <span className="rdb-pro-sum-words">{isSelected ? '+1 ponto' : 'sem ponto'}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="rdb-nota-foot">
                  <span className="rdb-nota-sum">
                    {selectedIds.length} {selectedIds.length === 1 ? 'acerto' : 'acertos'} · narrador +{liveCalc.narratorPoints}
                  </span>
                  <button type="button" data-testid="nota-confirm-points-next-round-btn" className="rdb-btn rdb-setup-start" onClick={handleConfirmPointsAndNextRound}>
                    Confirmar pontos e avançar
                    <ArrowRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
