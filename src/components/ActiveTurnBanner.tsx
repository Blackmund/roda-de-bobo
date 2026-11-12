import React from 'react';
import { GameRoom, TeamId } from '../types/game';
import { resolveCurrentTurnSpotlight, TEAM_META, getActiveTeamIds, getTeamDisplayName } from '../utils/teamUtils';
import { sounds } from '../utils/soundEffects';
import { PlayerMark } from './rdb/PlayerMark';

interface ActiveTurnBannerProps {
  room: GameRoom;
  onRotateActivePlayer?: () => void;
  onSelectActiveTeam?: (teamId: TeamId) => void;
  compact?: boolean;
  className?: string;
  /** Papeis extras do jogo (ex.: quem adivinha no Proibido) e acoes do diretor. */
  extra?: React.ReactNode;
  /** Esconde o segundo papel do resolvedor (ex.: fiscal quando so ha 2 jogadores). */
  hideSecondary?: boolean;
}

/** Tira emoji e o que vem entre parenteses: na faixa fica so o texto que importa. */
const clean = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/\s*\([^()]*(\([^()]*\))?[^()]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s—-]+/, '')
    .trim();

/**
 * "Vez de": a faixa unica que diz quem joga agora, igual em todos os jogos.
 * Bloco na cor da equipe, o nome grande, o papel de quem joga e, em uma linha, o que fazer.
 */
export const ActiveTurnBanner: React.FC<ActiveTurnBannerProps> = ({
  room,
  onRotateActivePlayer,
  onSelectActiveTeam,
  className = '',
  extra,
  hideSecondary
}) => {
  const spotlight = resolveCurrentTurnSpotlight(room);
  if (!spotlight) return null;

  const {
    isTeamGame,
    activeTeamId,
    activeTeamName,
    activeTeamMeta,
    activePlayer,
    secondaryPlayer,
    secondaryRoleLabel,
    roleBadge,
    actionInstruction,
    teammates,
    canRotatePlayer
  } = spotlight;

  const activeTeamIds = getActiveTeamIds(room);
  const color = activeTeamMeta?.hex || '#17b8b8';
  const role = clean(roleBadge);

  return (
    <div
      data-testid="active-turn-spotlight-banner"
      data-active-team={activeTeamId || 'INDIVIDUAL'}
      data-active-player={activePlayer?.name || ''}
      className={`rdb-turn ${className}`}
      style={{ ['--turn' as string]: color }}
    >
      <span className="rdb-turn-flag">Vez de</span>
      <span className="rdb-turn-mark">
        <PlayerMark p={activePlayer} />
      </span>
      <div className="rdb-turn-who">
        <strong data-testid="active-turn-player-name" className="rdb-turn-name">
          {activePlayer ? activePlayer.name : activeTeamName || 'Mesa'}
        </strong>
        <span className="rdb-turn-role" data-testid={isTeamGame && activeTeamId ? 'active-turn-team-pill' : undefined}>
          {role}
          {isTeamGame && activeTeamName ? ` · ${activeTeamName}` : ''}
          {isTeamGame && teammates.length > 0 ? ` · com ${teammates.map((t) => t.name).join(', ')}` : ''}
        </span>
      </div>
      <p className="rdb-turn-what">{clean(actionInstruction)}</p>

      <div className="rdb-turn-side">
        {!hideSecondary && secondaryPlayer && secondaryRoleLabel && (
          <span className="rdb-turn-other">
            <span>{clean(secondaryRoleLabel)}</span>
            <PlayerMark p={secondaryPlayer} /> {secondaryPlayer.name}
          </span>
        )}
        {extra}
        {isTeamGame && onSelectActiveTeam && activeTeamIds.length > 2 && (
          <div data-testid="active-turn-team-switcher" className="rdb-turn-teams">
            {activeTeamIds.map((tid) => (
              <button
                key={tid}
                type="button"
                className="rdb-seg"
                aria-pressed={tid === activeTeamId}
                title={`Passar a vez para ${getTeamDisplayName(room, tid)}`}
                onClick={() => {
                  sounds.playTick();
                  onSelectActiveTeam(tid);
                }}
              >
                {TEAM_META[tid].duplaLabel}
              </button>
            ))}
          </div>
        )}
        {canRotatePlayer && onRotateActivePlayer && (
          <button
            type="button"
            data-testid="active-turn-rotate-player-btn"
            className="rdb-seg"
            title="Passar a vez para o próximo jogador da equipe"
            onClick={() => {
              sounds.playTick();
              onRotateActivePlayer();
            }}
          >
            Trocar jogador
          </button>
        )}
      </div>
    </div>
  );
};
