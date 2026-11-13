import test from 'node:test';
import assert from 'node:assert/strict';
import { pintoGuessMatches, setPintoOutcome, pintoRoundPoints } from '../utils/comoEuPintoEngine.ts';
import type { ComoEuPintoState } from '../types/game.ts';

const base = (phase: ComoEuPintoState['phase'], rival = true): ComoEuPintoState => ({
  phase,
  words: ['casa', 'gato', 'sol'],
  currentIndex: 0,
  outcomes: ['correct', 'pending', 'pending'],
  drawTeam: 'A',
  rivalTeam: rival ? 'B' : undefined,
  drawerPlayerId: 'a',
  timerSeconds: 0,
  timerActive: false,
  strokes: [],
  drawings: [[], [], []]
});

test('Como eu pinto: palpite digitado ignora acento, maiuscula e artigo', () => {
  assert.equal(pintoGuessMatches('  O Gato ', 'gato'), true);
  assert.equal(pintoGuessMatches('avião', 'Aviao'), true);
  assert.equal(pintoGuessMatches('gata', 'gato'), false);
  assert.equal(pintoGuessMatches('', 'gato'), false);
});

test('Como eu pinto: depois do tempo o diretor ainda da o ponto (e corrige no resumo)', () => {
  let s = setPintoOutcome(base('STEAL'), 1, 'correct');
  assert.deepEqual(s.outcomes, ['correct', 'correct', 'pending']);
  s = setPintoOutcome(s, 2, 'stolen');
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(pintoRoundPoints(s), { draw: 2, rival: 1 });
  s = setPintoOutcome(s, 2, 'pending');
  assert.deepEqual(pintoRoundPoints(s), { draw: 2, rival: 0 });
  // sem rival nao existe roubo; durante o desenho nao muda nada
  assert.equal(setPintoOutcome(base('SUMMARY', false), 1, 'stolen').outcomes[1], 'pending');
  const playing = base('PLAYING');
  assert.equal(setPintoOutcome(playing, 1, 'correct'), playing);
});
