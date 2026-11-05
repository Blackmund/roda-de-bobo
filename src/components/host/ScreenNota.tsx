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
import confetti from 'canvas-confetti';
import {
  EyeOff,
  Eye,
  RefreshCw,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Dices,
  MessageSquare,
  Trophy
} from 'lucide-react';

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

  return (
    <div
      data-testid="screen-nota"
      className={
        isTvMode
          ? 'h-full flex flex-col justify-between min-h-0 gap-2 overflow-hidden select-none'
          : 'space-y-4'
      }
    >
      {/* TOP HEADER BAR: Narrator, Scale Range, Theme & 4-Step Progress */}
      <div className="border-b border-white/10 bg-white/[0.03] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-0.5 border border-amber-400/70 bg-amber-950/60 flex items-center gap-2">
            <span className="text-base leading-none">{speaker?.avatar || '🎤'}</span>
            <span
              data-testid="nota-narrator-banner"
              className="font-anton text-xs md:text-sm text-amber-300 uppercase tracking-wider"
            >
              NARRADOR DA RODADA: <strong className="text-white">{speaker?.name || 'Jogador'}</strong>
            </span>
          </div>

          <span
            data-testid="nota-individual-mode-badge"
            className="px-2 py-0.5 border border-white/10 bg-[#07080d] text-amber-300 font-mono-code text-[10px] font-bold uppercase"
          >
            👤 INDIVIDUAL • R{room.roundNumber}/{room.maxRounds}
          </span>

          <span
            data-testid="nota-scale-badge"
            className="px-2 py-0.5 border border-[#17B8B8]/50 bg-[#17B8B8]/10 text-cyan-200 font-mono-code text-[10px] font-bold uppercase"
          >
            ESCALA {scaleMin} A {scaleMax}
          </span>

          <span className="px-2 py-0.5 border border-white/10 bg-[#07080d] text-rose-200 font-mono-code text-[10px] font-bold uppercase truncate max-w-[240px]">
            TEMA: {room.theme}
          </span>
        </div>

        {/* 4-Step Progress Pills */}
        <div className="flex items-center gap-1 font-mono-code text-[10px] font-bold uppercase overflow-x-auto scrollbar-none py-0.5">
          {[
            { num: 1, label: '1. Sorteio' },
            { num: 2, label: '2. 1ª Pista (IA)' },
            { num: 3, label: '3. 2ª Pista (Mesa)' },
            { num: 4, label: '4. Revelação' }
          ].map((st) => (
            <span
              key={st.num}
              data-testid={`nota-step-pill-${st.num}`}
              className={`px-2 py-0.5 border transition-colors ${
                stepNumber === st.num
                  ? 'border-[#17B8B8] bg-[#17B8B8] text-black font-black'
                  : stepNumber > st.num
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-white/10 bg-[#07080d] text-slate-500'
              }`}
            >
              {st.label}
            </span>
          ))}
        </div>
      </div>

      {/* Active Turn / Narrator Spotlight Banner */}
      <div className="shrink-0">
        <ActiveTurnBanner
          room={room}
          compact
          onRotateActivePlayer={() => {
            if (room.players.length <= 1) return;
            onUpdateNotaState((prev) => {
              const curIdx = room.players.findIndex((p) => p.id === prev.speakerPlayerId);
              const nextSpeaker = room.players[(curIdx + 1) % room.players.length];
              return {
                ...prev,
                speakerPlayerId: nextSpeaker?.id || prev.speakerPlayerId
              };
            });
          }}
        />
      </div>

      {/* Dynamic 1-line Action Guidance Banner ("O que eu faço agora?") */}
      <div className="shrink-0 px-3 py-1 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono-code">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-[#17B8B8] animate-pulse shrink-0" />
          <span className="text-slate-300">
            {effectivePhase === 'STEP_1_DRAW' ? (
              <>🎲 🎤 <strong className="text-white">NARRADOR ({speaker?.name}):</strong> Gire a roleta ou sorteie a nota secreta [{scaleMin}-{scaleMax}]</>
            ) : effectivePhase === 'STEP_2_CLUE_1' ? (
              <>🎤 <strong className="text-white">1ª PISTA:</strong> Narrador ({speaker?.name}) fala a dica inicial para a nota sorteada</>
            ) : effectivePhase === 'STEP_3_CLUE_2' ? (
              <>🎤 <strong className="text-white">2ª PISTA:</strong> Narrador ({speaker?.name}) fala a dica comparativa complementar</>
            ) : revealSubState === 'SPINNING' || revealSubState === 'REVEALED_LOCKED' ? (
              <>🎰 <strong className="text-white">REVELAÇÃO DO PIÃO:</strong> Acompanhe o sorteio no telão revelando a nota secreta</>
            ) : (
              <>🎯 <strong className="text-white">PONTUAÇÃO:</strong> Marque quem acertou a nota e confirme os pontos</>
            )}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:inline">
          {themeBadge(room.visualTheme)}
        </span>
      </div>

      {/* INDIVIDUAL SCOREBOARD STRIP (Auto-Fit Grid for 2 to 8+ Players) */}
      <div
        data-testid="nota-individual-scoreboard"
        className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-1.5 shrink-0"
      >
        {room.players.map((p) => {
          const isCurrentSpeaker = p.id === speaker?.id;
          const canToggleFromStrip =
            effectivePhase === 'STEP_4_REVEAL' && revealSubState === 'SCORING' && !isCurrentSpeaker;
          const isPlayerSelected = selectedIds.includes(p.id);
          const liveDelta =
            effectivePhase === 'STEP_4_REVEAL' && revealSubState === 'SCORING'
              ? liveCalc.pointsAwarded[p.id] || 0
              : 0;
          const totalPts = (p.score || 0) + liveDelta;
          return (
            <div
              key={p.id}
              data-testid={`nota-player-score-card-${p.id}`}
              aria-pressed={canToggleFromStrip ? isPlayerSelected : undefined}
              onClick={() => {
                if (canToggleFromStrip) {
                  handleTogglePlayerCorrect(p.id);
                }
              }}
              className={`px-2.5 py-1 border flex items-center justify-between gap-1.5 transition-all ${
                canToggleFromStrip ? 'cursor-pointer hover:border-[#17B8B8]' : ''
              } ${
                isCurrentSpeaker
                  ? 'border-amber-400/70 bg-amber-950/40 text-amber-200'
                  : isPlayerSelected && effectivePhase === 'STEP_4_REVEAL' && revealSubState === 'SCORING'
                  ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8] text-white'
                  : 'border-white/10 bg-white/[0.03] text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm shrink-0">{p.avatar}</span>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate">{p.name}</div>
                  <div className="text-[9px] font-mono-code uppercase truncate">
                    {isCurrentSpeaker ? (
                      <span className="text-amber-300 font-bold">🎤 NARRADOR</span>
                    ) : isPlayerSelected && effectivePhase === 'STEP_4_REVEAL' ? (
                      <span className="text-[#17B8B8] font-bold">✅ PONTUADO</span>
                    ) : (
                      <span className="text-slate-400">INDIVIDUAL</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-anton text-sm md:text-base text-[#FFE600] leading-none">
                  {totalPts} PTS
                </div>
                {liveDelta > 0 && (
                  <div className="text-[9px] font-mono-code text-[#17B8B8] font-bold">
                    +{liveDelta}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          ETAPA 1: SORTEIO SECRETO DO NARRADOR
         ===================================================================== */}
      {effectivePhase === 'STEP_1_DRAW' && (
        <div
          data-testid="nota-step-1-draw"
          className="flex-1 min-h-0 border border-white/10 bg-white/[0.03] p-3 md:p-5 flex flex-col items-center justify-between text-center shadow-2xl overflow-y-auto scrollbar-none gap-2"
        >
          {drawSubState === 'BLINDFOLD_WARNING' ? (
            <>
              <div className="space-y-1 shrink-0">
                <span className="px-3 py-0.5 bg-amber-400 text-black font-anton text-xs uppercase tracking-widest">
                  ETAPA 1 DE 4 // SORTEIO SECRETO DO NARRADOR
                </span>
                <h2 className="font-anton text-2xl sm:text-3xl md:text-4xl text-white uppercase tracking-wide pt-1">
                  NARRADOR DA RODADA:{' '}
                  <span className="text-amber-300">
                    {speaker?.avatar} {speaker?.name}
                  </span>
                </h2>
              </div>

              <div className="max-w-2xl w-full border border-[#E6194B]/60 bg-[#E6194B]/10 p-3 md:p-5 space-y-2 my-auto">
                <div className="w-10 h-10 mx-auto rounded-full border border-[#E6194B] bg-[#07080d] flex items-center justify-center text-[#E6194B]">
                  <EyeOff size={22} />
                </div>
                <p
                  data-testid="nota-blindfold-warning-text"
                  className="font-anton text-base sm:text-lg md:text-2xl text-[#F5F2EB] uppercase leading-snug tracking-wide"
                >
                  🙈 Todos os outros jogadores devem fechar os olhos ou virar de costas agora! Apenas{' '}
                  <span className="text-[#17B8B8] underline">{speaker?.name}</span> deve olhar para a tela.
                </p>
                <p className="text-xs font-mono-code text-rose-200/90">
                  A nota será sorteada entre <strong>{scaleMin}</strong> (pior/mínimo) e{' '}
                  <strong>{scaleMax}</strong> (lendário/máximo).
                </p>
              </div>

              <div className="w-full flex justify-center pt-1 shrink-0">
                <button
                  type="button"
                  data-testid="nota-draw-btn"
                  onClick={handleStartSecretDraw}
                  className="px-8 py-3 border border-[#FFE600] bg-[#FFE600] hover:bg-amber-300 text-black font-anton text-lg md:text-xl uppercase tracking-widest shadow-[0_0_24px_rgba(255,230,0,0.45)] active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
                >
                  <Dices size={22} />
                  <span>Sortear a Nota</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-0.5 shrink-0">
                <span className="px-3 py-0.5 bg-[#17B8B8] text-black font-anton text-xs uppercase tracking-widest">
                  APENAS {speaker?.name?.toUpperCase()} OLHANDO PARA A TV!
                </span>
                <h3 className="font-anton text-base md:text-xl text-white uppercase">
                  MEMORIZE SUA NOTA SECRETA (DE {scaleMin} A {scaleMax})
                </h3>
              </div>

              <div className="my-auto">
                <SpinningNumberWheel
                  targetNumber={nota.secretScore}
                  minRange={scaleMin}
                  maxRange={scaleMax}
                  durationMs={3400}
                  autoStart={drawSubState === 'SPINNING'}
                  label="PIÃO DO BAÚ // SORTEANDO SUA NOTA SECRETA..."
                  onComplete={handleSecretWheelLocked}
                />
              </div>

              <div className="min-h-[44px] flex items-center justify-center w-full shrink-0">
                {drawSubState === 'MEMORIZED_READY' ? (
                  <button
                    type="button"
                    data-testid="nota-memorized-continue-btn"
                    onClick={handleMemorizedContinue}
                    className="px-7 py-2.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base md:text-lg uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 size={18} />
                    <span>Já memorizei minha nota -&gt; Continuar</span>
                  </button>
                ) : (
                  <span className="text-xs font-mono-code text-amber-300 animate-pulse uppercase font-bold">
                    ⏳ Aguarde o Pião do Baú parar na sua nota...
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          ETAPA 2: 1ª PISTA — PERGUNTA DO TEMA PRINCIPAL (GERADA PELA IA)
         ===================================================================== */}
      {effectivePhase === 'STEP_2_CLUE_1' && (
        <div
          data-testid="nota-step-2-clue-1"
          className="flex-1 min-h-0 border border-white/10 bg-white/[0.03] p-3 md:p-5 flex flex-col justify-between overflow-y-auto scrollbar-none gap-2"
        >
          {/* Top Alert: Open Eyes */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 border border-[#17B8B8]/60 bg-[#17B8B8]/10 text-cyan-200 font-anton text-xs md:text-sm uppercase tracking-wider">
              <Eye size={15} className="text-[#17B8B8] shrink-0" />
              <span>👀 Todos os jogadores já podem abrir os olhos!</span>
            </div>

            <button
              type="button"
              data-testid="nota-swap-question-btn"
              disabled={isSwappingQuestion}
              onClick={handleSwapQuestion}
              className="px-3 py-1 border border-white/20 bg-[#07080d] hover:border-[#17B8B8] text-slate-200 font-mono-code text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSwappingQuestion ? 'animate-spin' : ''} />
              <span>🔄 Trocar Pergunta</span>
            </button>
          </div>

          {/* Centerpiece: 1st AI Question Card */}
          <div className="my-auto max-w-4xl mx-auto w-full border border-[#17B8B8]/40 bg-[#07080d]/80 p-4 md:p-6 text-center space-y-3 shadow-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-[#17B8B8] text-black font-anton text-xs uppercase tracking-widest">
              <Sparkles size={13} />
              <span>1ª PISTA // PERGUNTA DO TEMA PRINCIPAL ({room.theme.toUpperCase()})</span>
            </div>

            <h2
              data-testid="nota-step-2-question-text"
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#F5F2EB] uppercase leading-snug tracking-normal text-center max-w-4xl mx-auto"
            >
              {mainQuestionText}
            </h2>

            <p className="text-xs md:text-sm font-mono-code text-cyan-200/90 max-w-2xl mx-auto">
              🎤 <strong className="text-white">{speaker?.name}</strong> deve responder em voz alta na mesa dando um exemplo que represente a nota secreta (de{' '}
              <strong>{scaleMin}</strong> = horrível/fraco até <strong>{scaleMax}</strong> = lendário/extremo).
            </p>
          </div>

          {/* Footer CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 shrink-0">
            <span className="text-xs font-mono-code text-slate-400 hidden sm:inline">
               Nota oculta com segurança • Responda verbalmente na roda
            </span>
            <button
              type="button"
              data-testid="nota-go-step-3-btn"
              onClick={handleGoToStep3}
              className="w-full sm:w-auto ml-auto px-7 py-2.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base md:text-lg uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Próxima Etapa (Pergunta Livre)</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          ETAPA 3: 2ª PISTA — PERGUNTA LIVRE DA MESA
         ===================================================================== */}
      {effectivePhase === 'STEP_3_CLUE_2' && (
        <div
          data-testid="nota-step-3-clue-2"
          className="flex-1 min-h-0 border border-white/10 bg-white/[0.03] p-3 md:p-5 flex flex-col justify-between overflow-y-auto scrollbar-none gap-2"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
            <span className="px-3 py-0.5 bg-[#E6194B] text-white font-anton text-xs uppercase tracking-widest">
              ETAPA 3 DE 4 // 2ª PISTA AO VIVO NA RODA
            </span>
            <span className="text-xs font-mono-code text-rose-300 font-bold uppercase">
              NARRADOR: {speaker?.avatar} {speaker?.name}
            </span>
          </div>

          {/* Centerpiece: Free Question from the Table */}
          <div className="my-auto max-w-3xl mx-auto w-full border border-[#E6194B]/40 bg-[#07080d]/80 p-4 md:p-6 text-center space-y-3 shadow-2xl">
            <div className="w-10 h-10 mx-auto rounded-full border border-[#E6194B] bg-[#07080d] flex items-center justify-center text-[#E6194B]">
              <MessageSquare size={20} />
            </div>

            <h2
              data-testid="nota-step-3-title"
              className="font-anton text-2xl sm:text-3xl md:text-4xl text-white uppercase tracking-wide"
            >
              2ª PISTA: PERGUNTA LIVRE DA MESA
            </h2>

            <p className="font-mono-code text-xs sm:text-sm text-[#F5F2EB] leading-relaxed max-w-2xl mx-auto">
              Agora os outros jogadores da mesa devem fazer uma{' '}
              <strong className="text-rose-300">pergunta livre</strong> para{' '}
              <strong className="text-[#17B8B8]">{speaker?.name}</strong> responder de acordo com a{' '}
              <strong className="text-amber-300">mesma nota ({scaleMin} a {scaleMax})</strong>! Após todos darem seus palpites na mesa, revelem a nota.
            </p>

            {/* 3 Discreet Optional Inspiration Pills */}
            <div className="pt-1 space-y-1">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider">
                Sugestões opcionais para inspirar a mesa:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {FREE_QUESTION_INSPIRATIONS.map((idea) => (
                  <span
                    key={idea}
                    className="px-2.5 py-0.5 border border-white/10 bg-white/[0.03] text-slate-300 font-mono-code text-xs"
                  >
                    {idea}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer CTA: Revelar a Nota! */}
          <div className="flex justify-center pt-2 border-t border-white/10 shrink-0">
            <button
              type="button"
              data-testid="nota-go-step-4-reveal-btn"
              onClick={handleGoToStep4Reveal}
              className="px-8 py-2.5 border border-[#FFE600] bg-[#FFE600] hover:bg-amber-300 text-black font-anton text-lg md:text-xl uppercase tracking-widest shadow-[0_0_24px_rgba(255,230,0,0.5)] active:scale-95 transition-all flex items-center gap-3 cursor-pointer"
            >
              <span>🎰 Revelar a Nota!</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          ETAPA 4: REVELAÇÃO "PIÃO DO BAÚ" E PONTUAÇÃO INTERATIVA (TOGGLE + COMMIT)
         ===================================================================== */}
      {effectivePhase === 'STEP_4_REVEAL' && (
        <div
          data-testid="nota-step-4-reveal"
          className="flex-1 min-h-0 border border-white/10 bg-white/[0.03] p-3 md:p-4 flex flex-col justify-between gap-2 shadow-2xl overflow-y-auto scrollbar-none"
        >
          {revealSubState === 'SPINNING' || revealSubState === 'REVEALED_LOCKED' ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-between text-center py-2 gap-3 max-w-2xl mx-auto w-full">
              <div className="space-y-1 shrink-0">
                <span className="px-3 py-0.5 bg-[#FFE600] text-black font-anton text-xs uppercase tracking-widest">
                  {revealSubState === 'REVEALED_LOCKED'
                    ? '🎰 NOTA OFICIAL REVELADA!'
                    : 'ETAPA 4 // REVELAÇÃO DO PIÃO DO BAÚ'}
                </span>
                <h2 className="font-anton text-xl sm:text-2xl md:text-3xl text-white uppercase tracking-wider">
                  {revealSubState === 'REVEALED_LOCKED' ? (
                    <>
                      A NOTA SECRETA DE <span className="text-amber-300">{speaker?.name}</span> É:
                    </>
                  ) : (
                    <>
                      QUAL FOI A NOTA DE <span className="text-amber-300">{speaker?.name}</span>?
                    </>
                  )}
                </h2>
              </div>

              <div className="my-auto">
                <SpinningNumberWheel
                  targetNumber={nota.secretScore}
                  minRange={scaleMin}
                  maxRange={scaleMax}
                  durationMs={3500}
                  autoStart={revealSubState === 'SPINNING'}
                  label="PIÃO DO BAÚ // REVELANDO A NOTA OFICIAL..."
                  onComplete={handleRevealWheelLocked}
                />
              </div>

              <div className="w-full shrink-0 flex flex-col items-center gap-2">
                {revealSubState === 'REVEALED_LOCKED' ? (
                  <>
                    <div className="px-6 py-2 border border-[#FFE600] bg-[#FFE600]/15 text-[#FFE600] font-anton text-xl sm:text-2xl uppercase tracking-wider rounded shadow-[0_0_25px_rgba(255,230,0,0.35)] flex items-center gap-2">
                      <span>🎰 NOTA CRAVADA:</span>
                      <span className="text-2xl sm:text-4xl font-black underline text-white">
                        {nota.secretScore}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-mono-code text-slate-300">
                      Descubra quem acertou na mesa para computar os pontos!
                    </p>
                    <button
                      type="button"
                      data-testid="nota-proceed-to-scoring-btn"
                      onClick={handleProceedToScoring}
                      style={{ backgroundColor: '#E6194B', color: '#FFFFFF' }}
                      className="px-8 sm:px-10 py-3 bg-[#E6194B] hover:bg-rose-500 active:bg-rose-700 text-white font-anton text-base sm:text-lg uppercase tracking-wider shadow-[0_0_20px_rgba(230,25,75,0.6)] border border-rose-400/80 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer mt-1 hover:scale-[1.02]"
                    >
                      <span>CONTINUAR PARA A PONTUAÇÃO</span>
                      <ArrowRight size={18} className="text-white" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    data-testid="nota-skip-reveal-spin-btn"
                    onClick={handleRevealWheelLocked}
                    className="px-5 py-2 border border-[#17B8B8] bg-[#17B8B8]/15 hover:bg-[#17B8B8] text-cyan-200 hover:text-black font-mono-code text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    ⚡ Revelar Nota Agora
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Top Row: Revealed Official Score + Narrator Auto-Calculated Points Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-stretch shrink-0">
                {/* Revealed Number Box */}
                <div className="md:col-span-5 border border-[#FFE600]/60 bg-[#07080d] p-2.5 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono-code text-amber-300 font-bold uppercase tracking-widest">
                        🎰 NOTA OFICIAL REVELADA
                      </span>
                      <button
                        type="button"
                        data-testid="nota-back-to-wheel-btn"
                        onClick={handleBackToRevealedWheel}
                        className="text-[9px] font-mono-code text-cyan-300 hover:underline uppercase cursor-pointer"
                      >
                        [↺ Rever Pião]
                      </button>
                    </div>
                    <div className="font-anton text-sm md:text-base text-white uppercase">
                      Nota de {speaker?.name}:
                    </div>
                    <div className="text-[10px] font-mono-code text-slate-400">
                      Escala de {scaleMin} a {scaleMax}
                    </div>
                  </div>
                  <div
                    data-testid="nota-revealed-score-value"
                    className="w-14 h-14 border border-[#FFE600] bg-black flex items-center justify-center font-anton text-3xl text-[#FFE600] shrink-0"
                  >
                    {nota.secretScore}
                  </div>
                </div>

                {/* Narrator Dynamic Points Card */}
                <div
                  data-testid="nota-narrator-points-card"
                  className="md:col-span-7 border border-[#17B8B8]/50 bg-[#07080d] p-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 border border-[#17B8B8]/50 bg-black flex items-center justify-center text-xl shrink-0">
                      {speaker?.avatar || '🎤'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono-code text-[#17B8B8] font-bold uppercase">
                        DESTAQUE DO NARRADOR (+1 PT POR ACERTO NA MESA)
                      </div>
                      <div className="font-anton text-base md:text-xl text-white uppercase truncate flex items-center gap-1.5">
                        <span>
                          NARRADOR: <span className="text-[#17B8B8]">{speaker?.name}</span>
                        </span>
                        <ArrowRight size={16} className="text-[#17B8B8] shrink-0" />
                        <span>
                          Ganha{' '}
                          <span
                            data-testid="nota-narrator-points-value"
                            className="text-[#FFE600]"
                          >
                            +{liveCalc.narratorPoints} {liveCalc.narratorPoints === 1 ? 'Ponto' : 'Pontos'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-2.5 py-1 border border-[#17B8B8]/40 bg-black text-center shrink-0">
                    <div className="font-anton text-xl text-[#FFE600] leading-none">
                      +{liveCalc.narratorPoints}
                    </div>
                    <div className="text-[9px] font-mono-code text-[#17B8B8] uppercase">PTS</div>
                  </div>
                </div>
              </div>

              {/* Interactive Winner Selection Grid (Toggleable & Reversible with ring-2 ring-[#17B8B8] bg-[#17B8B8]/10) */}
              <div className="flex-1 min-h-0 flex flex-col justify-between border border-white/10 bg-[#07080d]/70 p-2.5 gap-2 overflow-y-auto scrollbar-none">
                <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <h3 className="font-anton text-sm md:text-base text-white uppercase tracking-wide">
                    Selecione quem acertou a nota{' '}
                    <span className="text-[#FFE600] underline">{nota.secretScore}</span>:
                  </h3>
                  <span
                    data-testid="nota-multi-winner-hint"
                    className="text-[10px] font-mono-code text-[#17B8B8] font-bold"
                  >
                    💡 Seleção reversível: clique para selecionar (+1 pt) • clique novamente para desmarcar
                  </span>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 my-auto">
                  {otherPlayers.map((player) => {
                    const isSelected = selectedIds.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        type="button"
                        data-testid={`nota-toggle-winner-${player.id}`}
                        aria-pressed={isSelected}
                        onClick={() => handleTogglePlayerCorrect(player.id)}
                        className={`p-2 border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8] text-white'
                            : 'border-white/10 bg-white/[0.03] hover:border-[#17B8B8]/50 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg shrink-0">{player.avatar}</span>
                          <div className="min-w-0">
                            <div className="font-anton text-sm uppercase truncate">
                              {player.name}
                            </div>
                            <div className="text-[10px] font-mono-code uppercase">
                              {isSelected ? (
                                <span className="text-[#17B8B8] font-bold">
                                  ✅ SELECIONADO
                                </span>
                              ) : (
                                <span className="text-slate-400">Selecionar (+1 pt)</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`px-2 py-0.5 border font-anton text-xs uppercase shrink-0 ${
                            isSelected
                              ? 'border-[#17B8B8] bg-[#17B8B8] text-black'
                              : 'border-white/10 bg-black/60 text-slate-500'
                          }`}
                        >
                          {isSelected ? '+1 PT ✓' : '+0'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Final Confirmation Button (Commit Action) */}
              <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-white/10 shrink-0">
                <div className="text-xs font-mono-code text-slate-300">
                  Resumo:{' '}
                  <strong className="text-[#17B8B8]">{selectedIds.length}</strong>{' '}
                  {selectedIds.length === 1 ? 'jogador selecionado' : 'jogadores selecionados'} (+1 pt cada) •{' '}
                  Narrador <strong className="text-[#17B8B8]">{speaker?.name}</strong> ganha{' '}
                  <strong className="text-[#FFE600]">+{liveCalc.narratorPoints} pts</strong>
                </div>

                <button
                  type="button"
                  data-testid="nota-confirm-points-next-round-btn"
                  onClick={handleConfirmPointsAndNextRound}
                  className="px-7 py-2.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-sm md:text-base uppercase tracking-wider shadow-neon-cyan active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Trophy size={16} />
                  <span>Confirmar Pontos e Avançar ➔</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
