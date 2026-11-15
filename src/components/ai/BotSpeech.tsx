import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameRoom } from '../../types/game';
import { PlayerMark } from '../rdb/PlayerMark';
import { botLevelOf, BOT_LEVELS } from '../../ai/bots';

const SHOW_MS = 5200;

/** Balao com o que o jogador IA "disse" na ultima jogada (palpite, dica, item da lista). */
export const BotSpeech: React.FC<{ room: GameRoom }> = ({ room }) => {
  const say = room.botSay;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!say) return;
    setNow(Date.now());
    const t = window.setTimeout(() => setNow(Date.now()), SHOW_MS + 50);
    return () => window.clearTimeout(t);
  }, [say?.at]);
  if (!say || now - say.at > SHOW_MS || typeof document === 'undefined') return null;
  const p = room.players.find((x) => x.id === say.playerId);
  if (!p) return null;
  const level = BOT_LEVELS.find((l) => l.value === botLevelOf(p))?.label;
  return createPortal(
    <div key={say.at} className="rdb-botsay" role="status" aria-live="polite" data-testid="bot-speech">
      <PlayerMark p={p} />
      <div className="rdb-botsay-body">
        <span className="rdb-botsay-who">
          {p.name}
          {level && <em>IA · {level}</em>}
        </span>
        <span className="rdb-botsay-text">{say.text}</span>
      </div>
    </div>,
    document.body
  );
};
