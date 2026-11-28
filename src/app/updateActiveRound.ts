import type { GameRoom } from '../types/game';

type RoundStateKey = 'limite' | 'temOuNaoTem';

/** Descarta respostas e timers de uma tela que já saiu da rodada. */
export function updateActiveRound<Key extends RoundStateKey>(
  room: GameRoom,
  origin: GameRoom,
  key: Key,
  update: (state: NonNullable<GameRoom[Key]>) => NonNullable<GameRoom[Key]>
): GameRoom {
  const state = room[key];
  if (
    !state ||
    room.screen !== 'playing' ||
    room.roomId !== origin.roomId ||
    room.activeGame !== origin.activeGame ||
    room.roundNumber !== origin.roundNumber ||
    state.roundData.pergunta !== origin[key]?.roundData.pergunta
  ) return room;

  const updated = update(state);
  return updated === state ? room : { ...room, [key]: updated };
}
