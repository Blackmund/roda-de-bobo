import React from 'react';
import { GameId, Player } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { Play, SkipForward, ArrowLeft, Trophy, CheckCircle2 } from 'lucide-react';

export type { TutorialCardStep, GameTutorialDefinition } from './tutorialTypes';
export { GAME_TUTORIALS } from './gameTutorials';
export { TutorialStepIllustration } from './TutorialStepIllustration';
import { GAME_TUTORIALS } from './gameTutorials';
import { TutorialStepIllustration } from './TutorialStepIllustration';
import { TUTORIAL_EXAMPLES, exampleSourceUrl } from './tutorialExamples';

export interface Step5GameTutorialProps {
  gameId: GameId;
  players: Player[];
  onBack: () => void;
  onStartGameNow: () => void;
}

export const Step5GameTutorial: React.FC<Step5GameTutorialProps> = React.memo(({
  gameId,
  players,
  onBack,
  onStartGameNow
}) => {
  const tutorial = GAME_TUTORIALS[gameId] || GAME_TUTORIALS.limite;
  const example = TUTORIAL_EXAMPLES[gameId];

  const handleSkipOrStart = () => {
    sounds.playPowerup();
    onStartGameNow();
  };

  return (
    <div
      data-testid="step5-game-tutorial"
      className="rdb-wide mx-auto w-full relative h-full flex flex-col justify-between min-h-0 overflow-hidden select-none py-1 px-1 sm:px-2 gap-2"
    >
      {/* 1. CABEÇALHO SUPERIOR COMPACTO (SEM SCROLL, SEM BARRA DE PROGRESSO) */}
      <header className="bg-[#090b14] border border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">{tutorial.icon}</span>
          <span className="font-anton text-lg sm:text-xl text-white uppercase tracking-wider truncate">
            {tutorial.name}
          </span>
          <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-mono-code text-cyan-300 font-bold uppercase tracking-wider">
            TUTORIAL OFICIAL • 3 PASSOS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] font-mono-code text-emerald-400 font-bold">
            ✓ {players.length} JOGADORES NA SALA
          </span>
        </div>
      </header>

      {/* 2. ÁREA CENTRAL: BANNER COMPACTO + OS 3 PASSOS LADO A LADO EM TELA ÚNICA */}
      <main className="flex-1 min-h-0 flex flex-col justify-between gap-2 px-1 overflow-y-auto md:overflow-hidden">
        {/* Banner do Tutorial (Muito compacto para evitar scroll) */}
        <div className="text-center space-y-0.5 py-0.5 shrink-0">
          <h1 className="font-anton text-xl sm:text-2xl md:text-3xl text-white uppercase tracking-wide leading-none">
            {tutorial.welcomeTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mx-auto truncate sm:whitespace-normal">
            {tutorial.welcomeSubtitle}
          </p>
        </div>

        {/* 3 CARDS VISUAIS LADO A LADO - VISÍVEIS DE UMA VEZ SÓ, SEM CLIQUE OBRIGATÓRIO */}
        <div
          data-testid="tutorial-3cards-container"
          className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-h-0"
        >
          {tutorial.steps.map((card) => (
            <div
              key={card.stepNumber}
              data-testid={`tutorial-step-card-${card.stepNumber}`}
              className="rounded-xl border border-cyan-500/30 bg-[#0a0d18] flex flex-col justify-between p-2.5 sm:p-3 min-h-0 relative shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
            >
              {/* Header da Etapa: Número do Passo + Tagzinha no Topo (100% livre de sobreposição com a ilustração) */}
              <div className="flex items-center justify-between gap-1.5 pb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400 text-black font-anton text-xs flex items-center justify-center font-bold shrink-0">
                    {card.stepNumber}
                  </span>
                  <span className="font-anton text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider">
                    PASSO {card.stepNumber}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-400/50 text-[9px] sm:text-[10px] font-mono-code text-cyan-300 font-bold uppercase tracking-wider shrink-0 shadow-sm">
                  {card.accentTag}
                </span>
              </div>

              {/* Ilustração Vetorial Cartoon Vintage Estilo CazéTV / Roda de Bobô (Totalmente desobstruída) */}
              <div className="rdb-tut-art flex-[3] min-h-24 bg-[#060810] border border-white/5 flex items-center justify-center relative overflow-hidden p-1.5">
                <TutorialStepIllustration gameId={gameId} stepNumber={card.stepNumber} />
              </div>

              {/* Textos explicativos diretos e sem enrolação */}
              <div className="space-y-1 pt-1.5 flex-[2] flex flex-col justify-start min-h-0">
                <h3 className="font-anton text-sm sm:text-base text-white uppercase tracking-wide leading-tight">
                  {card.headline}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300 leading-snug font-sans">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* UX-12: um exemplo real do programa (ou do banco do jogo), com o video-fonte quando existe */}
        {example && (
          <div
            data-testid="tutorial-example"
            className="px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-400/25 text-xs shrink-0"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-anton text-[11px] text-emerald-300 uppercase tracking-wider">
                {example.fonte ? '🎬 Exemplo do programa' : '📚 Exemplo'}
              </span>
              <strong className="text-white font-sans">{example.texto}</strong>
              {example.fonte && (
                <a
                  href={exampleSourceUrl(example.fonte)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="tutorial-example-source"
                  className="font-mono-code text-[10px] text-cyan-300 underline hover:text-white"
                  title={`Ver no vídeo (confiança ${example.fonte.confianca})`}
                >
                  ver no vídeo ↗
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug font-sans">{example.detalhe}</p>
          </div>
        )}

        {/* Resumo Rápido de Pontuação (Faixa compacta) */}
        <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Trophy size={13} className="text-amber-400 shrink-0" />
            <span className="font-mono-code text-[11px] sm:text-xs text-amber-200 font-bold truncate">
              {tutorial.scoringSummary[0]}
            </span>
          </div>
          {tutorial.scoringSummary[1] && (
            <span className="font-mono-code text-[10px] sm:text-[11px] text-cyan-300 font-bold truncate">
              • {tutorial.scoringSummary[1]}
            </span>
          )}
        </div>
      </main>

      {/* 3. RODAPÉ PADRONIZADO: PULAR TUTORIAL AO LADO DE INICIAR JOGO AGORA */}
      <footer className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono-code text-slate-400 truncate max-w-md">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <span className="truncate">
            Jogadores prontos:{' '}
            <strong className="text-white">
              {players.map((p) => p.name).join(', ')}
            </strong>
          </span>
        </div>

        {/* Grupo de Ação à Direita: PULAR TUTORIAL ao lado de INICIAR JOGO AGORA */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto sm:ml-0 w-full sm:w-auto justify-end">
          {/* Botão Pular Tutorial */}
          <button
            type="button"
            data-testid="tutorial-skip-btn"
            onClick={handleSkipOrStart}
            className="px-3.5 sm:px-4 py-2 border border-slate-700 hover:border-cyan-400 bg-black/70 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 font-anton text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <SkipForward size={14} />
            <span>PULAR TUTORIAL</span>
          </button>

          {/* Botão Padrão do Sistema: Retangular com cor #E6194B e Apenas 1 Ícone de Play */}
          <button
            type="button"
            data-testid="tutorial-start-game-btn"
            onClick={handleSkipOrStart}
            style={{ backgroundColor: '#E6194B', color: '#FFFFFF' }}
            className="px-5 sm:px-6 py-2 bg-[#E6194B] hover:bg-rose-500 active:bg-rose-700 text-white font-anton font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(230,25,75,0.5)] border border-rose-400/80 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Play size={14} className="fill-white text-white shrink-0" />
            <span className="text-white font-black">COMEÇAR A JOGAR AGORA</span>
          </button>
        </div>
      </footer>
    </div>
  );
});
