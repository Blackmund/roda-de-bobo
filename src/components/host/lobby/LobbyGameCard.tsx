import React from 'react';
import { GameId, VisualTheme } from '../../../types/game';
import { GAME_LIMITS } from '../../../config/gameLimits';
import { sounds } from '../../../utils/soundEffects';
import { GameCardArt } from '../../art/GameCardArt';
import { Users } from '../../rdb/rdbIcons';

interface LobbyGameCardProps {
  game: { id: GameId; name: string; tagline: string; badge: string; color: string; renderArt: (className?: string) => React.ReactNode; };
  handleGameClick: (gameId: GameId) => void;
  setHoveredGame: React.Dispatch<React.SetStateAction<GameId | null>>;
  /** Mantido por compatibilidade: o card tem um desenho so, o da identidade do programa. */
  visualTheme?: VisualTheme;
}

/** Card do catalogo: arte grande em cima, faixa com nome, descricao e numero de jogadores embaixo. */
export const LobbyGameCard: React.FC<LobbyGameCardProps> = ({ game, handleGameClick, setHoveredGame }) => {
  const limits = GAME_LIMITS[game.id as keyof typeof GAME_LIMITS];
  // O selo do canto diz o modo (individual / em equipe); quando o texto antigo so repetia o numero de jogadores, some.
  const mode = /JOGADORES/i.test(game.badge) ? null : game.badge;
  return (
    <button
      type="button"
      data-testid={`lobby-game-card-${game.id}`}
      onClick={() => handleGameClick(game.id)}
      onMouseEnter={() => {
        setHoveredGame(game.id);
        sounds.playTick();
      }}
      onMouseLeave={() => setHoveredGame(null)}
      onFocus={() => setHoveredGame(game.id)}
      onBlur={() => setHoveredGame(null)}
      className="rdb-card group cursor-pointer"
    >
      {mode && <span className="rdb-card-mode">{mode}</span>}
      <span className="rdb-card-art">
        <GameCardArt gameId={game.id} />
      </span>
      <span className="rdb-card-foot">
        <span className="min-w-0">
          <span className="rdb-card-name block">{game.name}</span>
          <span className="rdb-card-tagline block" title={game.tagline}>
            {game.tagline}
          </span>
        </span>
        {limits && (
          <span
            data-testid={`game-players-range-${game.id}`}
            className="rdb-card-players"
            title="Quantidade de jogadores"
            aria-label={`${limits.min} a ${limits.max} jogadores`}
          >
            <Users />
            {limits.min}–{limits.max}
          </span>
        )}
      </span>
    </button>
  );
};
