import React from 'react';
import { GameId, Player } from '../../types/game';
import { Step5GameTutorial } from '../setup/Step5GameTutorial';

interface ScreenRulesProps {
  gameId: GameId;
  isTvMode?: boolean;
  players: Player[];
  onBack: () => void;
  onStartRound: () => void;
  onAddPlayer: (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    team?: 'A' | 'B';
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => void;
  onRemovePlayer: (playerId: string) => void;
  onSwitchPlayerTeam: (playerId: string) => void;
}

export const ScreenRules: React.FC<ScreenRulesProps> = ({
  gameId,
  players,
  onBack,
  onStartRound
}) => {
  return (
    <Step5GameTutorial
      gameId={gameId}
      players={players}
      onBack={onBack}
      onStartGameNow={onStartRound}
    />
  );
};
