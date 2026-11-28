import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameRoom } from '../types/game';
import { updateActiveRound } from '../app/updateActiveRound';

const round = {
  roomId: 'SALAA',
  screen: 'playing',
  activeGame: 'limite',
  roundNumber: 1,
  limite: { roundData: { pergunta: 'Pergunta original' }, guesses: {} }
} as GameRoom;

test('uma atualização atrasada do Limite só modifica a pergunta da rodada de origem', () => {
  const replaceQuestion = (state: NonNullable<GameRoom['limite']>) => ({
    ...state,
    roundData: { ...state.roundData, pergunta: 'Resposta atrasada da IA' }
  });
  const staleRooms: GameRoom[] = [
    { ...round, screen: 'game-over' },
    { ...round, roomId: 'SALAB' },
    { ...round, roundNumber: 2 },
    { ...round, activeGame: 'nota' },
    { ...round, limite: { ...round.limite!, roundData: { ...round.limite!.roundData, pergunta: 'Pergunta trocada' } } }
  ];
  for (const room of staleRooms) {
    assert.equal(updateActiveRound(room, round, 'limite', replaceQuestion), room);
  }
  assert.equal(updateActiveRound(round, round, 'limite', replaceQuestion).limite?.roundData.pergunta, 'Resposta atrasada da IA');
  assert.equal(updateActiveRound(round, round, 'limite', (state) => state), round);
});
