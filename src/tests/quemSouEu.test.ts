import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuemSouEuState,
  drawIdentities,
  finishQuemSouEuRound,
  nextSearchingPlayer,
  pointsForFoundOrder,
  recordCorrectGuess,
  recordQuestion,
  recordWrongGuess
} from '../utils/quemSouEuEngine.ts';
import { QUEM_SOU_EU_IDENTITIES, normalizeIdentity } from '../data/quemSouEuIdentities.ts';
import type { QuemSouEuGameState } from '../types/game.ts';

const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
const ids = QUEM_SOU_EU_IDENTITIES.slice(0, 4);
const playing = (max = 3): QuemSouEuGameState => ({ ...buildQuemSouEuState(players, ids, 0, max), phase: 'PLAYING' });

test('NOV-02: sorteia identidades diferentes e de categorias variadas', () => {
  const picks = drawIdentities(4);
  assert.equal(new Set(picks.map((p) => p.nome)).size, 4);
  assert.equal(new Set(picks.map((p) => p.categoria)).size, 4);
  const used = new Set(QUEM_SOU_EU_IDENTITIES.map((i) => normalizeIdentity(i.nome)));
  assert.equal(drawIdentities(3, used).length, 3); // banco todo usado: recomeca
});

test('NOV-02: banco sem repeticao e com variedade', () => {
  const keys = QUEM_SOU_EU_IDENTITIES.map((i) => normalizeIdentity(i.nome));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(QUEM_SOU_EU_IDENTITIES.length >= 150);
  assert.ok(new Set(QUEM_SOU_EU_IDENTITIES.map((i) => i.categoria)).size >= 7);
});

test('NOV-02: rodizio passa a vez a cada pergunta', () => {
  let s = playing();
  assert.equal(s.turnPlayerId, 'a');
  s = recordQuestion(s);
  assert.equal(s.turnPlayerId, 'b');
  assert.equal(s.entries[0].questions, 1);
  s = recordWrongGuess(s);
  assert.equal(s.turnPlayerId, 'c');
  assert.equal(s.entries[1].wrongGuesses, 1);
});

test('NOV-02: acertar marca a ordem, da mais pontos ao primeiro e quem acertou sai do rodizio', () => {
  let s = playing();
  s = recordCorrectGuess(s); // a acerta em 1o
  assert.equal(s.entries[0].status, 'found');
  assert.equal(s.entries[0].foundOrder, 1);
  assert.equal(s.pointsAwarded.a, 4);
  assert.equal(s.turnPlayerId, 'b');
  s = recordCorrectGuess(s); // b em 2o
  assert.equal(s.pointsAwarded.b, 3);
  assert.equal(nextSearchingPlayer(s, 'b'), 'c');
  assert.deepEqual([1, 2, 3, 4, 9].map((o) => pointsForFoundOrder(o, 4)), [4, 3, 2, 1, 1]);
});

test('NOV-02: a rodada fecha quando todos acertaram', () => {
  let s = playing();
  for (let i = 0; i < 4; i++) s = recordCorrectGuess(s);
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(Object.values(s.pointsAwarded).sort(), [1, 2, 3, 4]);
});

test('NOV-02: quem esgota as perguntas fica de fora e a vez segue; a rodada fecha quando ninguem procura', () => {
  let s = playing(1);
  s = recordQuestion(s); // a: 1 pergunta = limite, fora
  assert.equal(s.entries[0].status, 'out');
  assert.equal(s.turnPlayerId, 'b');
  s = recordQuestion(s);
  s = recordQuestion(s);
  s = recordQuestion(s);
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(s.pointsAwarded, {});
});

test('NOV-02: o diretor pode encerrar e quem nao descobriu fica sem pontos', () => {
  let s = playing();
  s = recordCorrectGuess(s);
  s = finishQuemSouEuRound(s);
  assert.equal(s.phase, 'SUMMARY');
  assert.equal(s.entries.filter((e) => e.status === 'out').length, 3);
  assert.equal(s.pointsAwarded.a, 4);
});
