import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProibidoCardOutcome, contestProibidoFoul } from '../components/host/ScreenProibido.tsx';
import type { ProibidoGameState } from '../types/game.ts';

function makeState(n = 3): ProibidoGameState {
  return {
    phase: 'PLAYING',
    cards: Array.from({ length: n }, (_, i) => ({
      palavra_alvo: `P${i}`,
      palavras_proibidas: ['a', 'b', 'c', 'd', 'e']
    })) as unknown as ProibidoGameState['cards'],
    currentCardIndex: 0,
    pendingQueue: Array.from({ length: n }, (_, i) => i),
    speakerTeam: 'A',
    speakerPlayerId: 'p1',
    refereeTeam: 'B',
    timerSeconds: 30,
    timerActive: true,
    roundScore: 0,
    cardOutcomes: Array.from({ length: n }, () => 'pending' as const),
    antiSpoilerMode: 'guesser-back-to-tv'
  };
}

test('REG-06: falta registra a carta e contestar devolve ela como atual', () => {
  const afterFoul = applyProibidoCardOutcome(makeState(), 'foul').nextState;
  assert.equal(afterFoul.cardOutcomes[0], 'foul');
  assert.equal(afterFoul.lastFoulIndex, 0);
  assert.equal(afterFoul.currentCardIndex, 1);

  const contested = contestProibidoFoul(afterFoul);
  assert.equal(contested.cardOutcomes[0], 'pending');
  assert.equal(contested.currentCardIndex, 0);
  assert.equal(contested.lastFoulIndex, undefined);
  assert.deepEqual(contested.pendingQueue, [0, 1, 2]);
  assert.equal(contested.phase, 'PLAYING');
});

test('REG-06: contestar a falta da ultima carta reabre a rodada se ainda ha tempo', () => {
  let s = makeState(1);
  s = applyProibidoCardOutcome(s, 'foul').nextState;
  assert.equal(s.phase, 'SUMMARY');
  const contested = contestProibidoFoul(s);
  assert.equal(contested.phase, 'PLAYING');
  assert.equal(contested.timerActive, true);
  assert.equal(contested.cardOutcomes[0], 'pending');
});

test('REG-06: sem falta registrada, contestar nao muda nada', () => {
  const s = makeState();
  assert.equal(contestProibidoFoul(s), s);
});
