import test from 'node:test';
import assert from 'node:assert/strict';
import { ONDE_ESTOU_MOMENTS, drawMoments, normalizeMomentKey } from '../data/ondeEstouMoments.ts';
import {
  buildQuemSouEuState,
  recordCorrectGuess,
  recordQuestion
} from '../utils/quemSouEuEngine.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import { usesLocalContent } from '../config/localGames.ts';
import { hasShowRuleset } from '../config/rulesets.ts';
import type { QuemSouEuGameState } from '../types/game.ts';

test('NOV-06: banco de momentos sem repeticao, com ano em todos e origem declarada', () => {
  const keys = ONDE_ESTOU_MOMENTS.map((x) => normalizeMomentKey(x.nome));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(ONDE_ESTOU_MOMENTS.length >= 35);
  for (const x of ONDE_ESTOU_MOMENTS) {
    assert.match(x.nome, /\((19|20)\d\d\)$/, `sem ano no fim: ${x.nome}`);
    assert.ok(x.nome.length <= 80, `rotulo longo demais: ${x.nome}`);
  }
  assert.ok(ONDE_ESTOU_MOMENTS.some((x) => x.origem === 'programa'));
  assert.ok(new Set(ONDE_ESTOU_MOMENTS.map((x) => x.categoria)).size >= 3);
});

test('NOV-06: sorteia um momento por jogador, sem repetir, e recomeca quando o banco acaba', () => {
  const picks = drawMoments(4);
  assert.equal(new Set(picks.map((p) => p.nome)).size, 4);
  assert.ok(new Set(picks.map((p) => p.categoria)).size >= 3);
  const all = new Set(ONDE_ESTOU_MOMENTS.map((x) => normalizeMomentKey(x.nome)));
  assert.equal(drawMoments(3, all).length, 3);
  const used = new Set(picks.map((p) => normalizeMomentKey(p.nome)));
  assert.ok(drawMoments(4, used).every((p) => !used.has(normalizeMomentKey(p.nome))));
});

test('NOV-06: a dinamica e a do Quem sou eu: rodizio, ordem de acerto e pontos', () => {
  const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const moments = drawMoments(3);
  let s: QuemSouEuGameState = { ...buildQuemSouEuState(players, moments, 0), phase: 'PLAYING' };
  assert.deepEqual(s.entries.map((e) => e.identity), moments.map((m) => m.nome));
  s = recordQuestion(s);
  assert.equal(s.turnPlayerId, 'b');
  s = recordCorrectGuess(s); // b descobre em 1o
  assert.equal(s.pointsAwarded.b, 3);
  assert.equal(s.entries.find((e) => e.playerId === 'b')?.foundOrder, 1);
});

test('NOV-06: limites 2 a 8 individual, conteudo local e preset do programa', () => {
  assert.deepEqual([GAME_LIMITS['onde-estou'].min, GAME_LIMITS['onde-estou'].max, GAME_LIMITS['onde-estou'].teamsRequired], [2, 8, false]);
  assert.equal(usesLocalContent('onde-estou'), true);
  assert.equal(hasShowRuleset('onde-estou'), true);
});
