import React from 'react';
import { GameId, Player } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { ArrowRight } from 'lucide-react';

export type { TutorialCardStep, GameTutorialDefinition } from './tutorialTypes';
export { GAME_TUTORIALS } from './gameTutorials';
export { TutorialStepIllustration } from './TutorialStepIllustration';
import { GAME_TUTORIALS } from './gameTutorials';
import { GameCardArt } from '../art/GameCardArt';
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
  const steps = tutorial.steps;

  return (
    <div data-testid="step5-game-tutorial" className="rdb-tut rdb-wide">
      <div className="rdb-tut-body">
        {/* PALCO: a vinheta animada do jogo, grande e sem nada por cima */}
        <div className="rdb-tut-stage">
          <div className="rdb-tut-stage-art">
            <GameCardArt gameId={gameId} />
          </div>
          <div className="rdb-tut-stage-cap">{tutorial.name}</div>
        </div>

        {/* TEXTO: titulo, os 3 passos e como pontua */}
        <div className="rdb-tut-text">
          <h1 className="rdb-tut-title">{tutorial.welcomeTitle}</h1>
          <p className="rdb-tut-sub">{tutorial.welcomeSubtitle}</p>

          <ol className="rdb-tut-steps" data-testid="tutorial-3cards-container">
            {steps.map((card) => (
              <li key={card.stepNumber} data-testid={`tutorial-step-card-${card.stepNumber}`} className="rdb-tut-step">
                <span className="rdb-tut-num">{card.stepNumber}</span>
                <span className="rdb-tut-step-text">
                  <strong>{card.headline}</strong>
                  <span>{card.description}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="rdb-tut-score" data-testid="tutorial-scoring">
            <span className="rdb-tut-label">Como pontua</span>
            {tutorial.scoringSummary.slice(0, 2).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          {/* UX-12: um exemplo real do programa (ou do banco do jogo), com o video-fonte quando existe */}
          {example && (
            <div className="rdb-tut-score" data-testid="tutorial-example">
              <span className="rdb-tut-label">{example.fonte ? 'Exemplo do programa' : 'Exemplo'}</span>
              <p>
                {example.texto}{' '}
                {example.fonte && (
                  <a
                    href={exampleSourceUrl(example.fonte)}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="tutorial-example-source"
                    title={`Ver no vídeo (confiança ${example.fonte.confianca})`}
                  >
                    Ver no vídeo
                  </a>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="rdb-setup-foot">
        <button
          type="button"
          data-testid="tutorial-skip-btn"
          className="rdb-btn"
          onClick={() => {
            sounds.playFlip();
            onBack();
          }}
        >
          Voltar
        </button>
        <div className="rdb-setup-foot-actions">
          <span className="rdb-tut-ready">
            {players.length} na sala: {players.map((p) => p.name).join(', ')}
          </span>
          <button
            type="button"
            data-testid="tutorial-start-game-btn"
            className="rdb-btn rdb-setup-start"
            onClick={() => {
              sounds.playPowerup();
              onStartGameNow();
            }}
          >
            Começar a jogar
            <ArrowRight />
          </button>
        </div>
      </footer>
    </div>
  );
});
