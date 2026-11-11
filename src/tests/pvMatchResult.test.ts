import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPVMatchResult, PV_MATCH_WIN_POINTS } from '../utils/perguntasEVerdadesEngine.ts';

const players = [
  { id: 'a', score: 100, roundsPlayed: 1, roundsWon: 1, accuracy: 100 }, // resto de outra partida
  { id: 'b', score: 0, roundsPlayed: 1, roundsWon: 0, accuracy: 50 }
];

test('UX-19: partida de 1 rodada termina com 1 rodada, 1 vitoria e 100 pontos', () => {
  const out = applyPVMatchResult(players, 'a', 1, { a: 1 });
  assert.equal(out[0].score, PV_MATCH_WIN_POINTS);
  assert.equal(out[0].roundsPlayed, 1);
  assert.equal(out[0].roundsWon, 1);
  assert.equal(out[1].score, 0);
  assert.equal(out[1].roundsPlayed, 1);
  assert.equal(out[1].roundsWon, 0);
});

test('UX-19: serie melhor de 3 conta rodadas e vitorias da serie', () => {
  const out = applyPVMatchResult(players, 'b', 3, { a: 1, b: 2 });
  assert.equal(out[1].roundsWon, 2);
  assert.equal(out[0].roundsWon, 1);
  assert.equal(out[0].roundsPlayed, 3);
  assert.equal(out[0].accuracy, 33);
});
