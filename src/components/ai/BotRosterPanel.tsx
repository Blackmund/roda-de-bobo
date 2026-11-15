import React, { useState } from 'react';
import { Bot, Plus, X } from 'lucide-react';
import type { Player, TeamId } from '../../types/game';
import { BOT_LEVELS, BotLevel, botLevelOf, isBot, newBotPlayer } from '../../ai/bots';
import { BOT_READY_GAMES } from '../../ai/registry';
import { GAME_NAMES } from '../../app/gameNames';
import { sounds } from '../../utils/soundEffects';

/** Escalar adversarios IA: escolhe o nivel e adiciona; cada IA aparece com o nivel e pode sair. */
export const BotRosterPanel: React.FC<{
  players: Player[];
  onAddPlayer: (o: { id?: string; name: string; avatar?: string; color?: string; team?: TeamId; isFixedPlayer?: boolean }) => void;
  onRemovePlayer: (id: string) => void;
}> = ({ players, onAddPlayer, onRemovePlayer }) => {
  const [level, setLevel] = useState<BotLevel>('medio');
  const bots = players.filter(isBot);
  const humans = players.length - bots.length;
  const add = () => {
    sounds.playPowerup();
    const b = newBotPlayer(level, players);
    onAddPlayer({ ...b, isFixedPlayer: false });
  };
  return (
    <section className="rdb-botpanel" data-testid="bot-roster-panel" aria-label="Jogadores IA">
      <header className="rdb-botpanel-head">
        <Bot size={18} />
        <h3>Jogar contra IA</h3>
        <span className="rdb-botpanel-count">
          {humans} {humans === 1 ? 'pessoa' : 'pessoas'} · {bots.length} IA
        </span>
      </header>
      <div className="rdb-botpanel-levels" role="radiogroup" aria-label="Nível da IA">
        {BOT_LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={level === l.value}
            data-testid={'bot-level-' + l.value}
            data-tip={l.hint}
            className={'rdb-botpanel-level is-' + l.value + (level === l.value ? ' is-on' : '')}
            onClick={() => {
              sounds.playTick();
              setLevel(l.value);
            }}
          >
            {l.label}
          </button>
        ))}
        <button type="button" className="rdb-botpanel-add" data-testid="bot-add" onClick={add}>
          <Plus size={15} /> Adicionar IA
        </button>
      </div>
      {bots.length > 0 && (
        <ul className="rdb-botpanel-list">
          {bots.map((b) => (
            <li key={b.id} className={'is-' + botLevelOf(b)}>
              <span>{b.name}</span>
              <button
                type="button"
                aria-label={'Tirar ' + b.name}
                data-testid={'bot-remove-' + b.id}
                onClick={() => {
                  sounds.playFlip();
                  onRemovePlayer(b.id);
                }}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="rdb-botpanel-note">
        A IA já joga: {BOT_READY_GAMES.map((g) => GAME_NAMES[g as keyof typeof GAME_NAMES]).join(', ').toLowerCase()}. Nos outros jogos ela entra nas próximas fases.
      </p>
    </section>
  );
};
