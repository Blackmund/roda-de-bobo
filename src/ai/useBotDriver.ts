import { useEffect, useRef } from 'react';
import type { GameRoom } from '../types/game';
import { ALL_ADAPTERS as ADAPTERS } from './registry';
import { isBot } from './bots';

/**
 * Faz os jogadores IA jogarem. Roda na tela do jogo (TV/PC): a cada mudanca da sala, pergunta ao adaptador do jogo
 * se alguma IA precisa agir; agenda a jogada com o tempo de "pensar" do nivel e aplica pela mesma atualizacao de sala
 * que o celular usaria. Cada jogada tem uma chave: nunca roda duas vezes.
 */
export function useBotDriver(room: GameRoom, broadcastState: (updater: (prev: GameRoom) => GameRoom) => void) {
  const done = useRef(new Set<string>());
  const pending = useRef(new Map<string, number>());
  const broadcastRef = useRef(broadcastState);
  broadcastRef.current = broadcastState;

  useEffect(() => {
    if (room.screen !== 'playing' || !room.activeGame) return;
    const adapter = ADAPTERS[room.activeGame];
    if (!adapter) return;
    const bots = (room.players || []).filter(isBot);
    for (const bot of bots) {
      let mv;
      try {
        mv = adapter(room, bot);
      } catch {
        mv = null;
      }
      if (!mv || done.current.has(mv.key) || pending.current.has(mv.key)) continue;
      const move = mv;
      // o "pensar" (Gemini) corre junto com a espera, para a jogada sair no tempo certo
      const thinking = move.think ? move.think().catch(() => null) : Promise.resolve(undefined);
      const id = window.setTimeout(async () => {
        const data = await thinking;
        pending.current.delete(move.key);
        done.current.add(move.key);
        broadcastRef.current((prev) => {
          try {
            return move.apply(prev, data);
          } catch {
            return prev;
          }
        });
      }, Math.max(150, move.delay));
      pending.current.set(move.key, id);
    }
  }, [room]);

  useEffect(
    () => () => {
      pending.current.forEach((id) => window.clearTimeout(id));
      pending.current.clear();
    },
    []
  );
}
