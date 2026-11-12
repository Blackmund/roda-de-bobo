import type { GameId } from '../../types/game';

export interface TutorialCardStep {
  stepNumber: 1 | 2 | 3;
  icon: string;
  headline: string;
  description: string;
  accentTag: string;
}

export interface GameTutorialDefinition {
  gameId: GameId;
  icon: string;
  name: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  steps: [TutorialCardStep, TutorialCardStep, TutorialCardStep];
  proibido: string[];
  permitido: string[];
  scoringSummary: string[];
}
