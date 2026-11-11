import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEstadiosState,
  estadiosCluesShown,
  estadiosValue,
  giveUpEstadio,
  judgeEstadio
} from '../utils/estadiosEngine.ts';
import { ESTADIOS, drawEstadio, normalizeEstadioKey } from '../data/estadiosBank.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import { usesLocalContent } from '../config/localGames.ts';
import type { EstadiosGameState } from '../types/game.ts';

const ids = ['a', 'b', 'c'];
const item = {
  nome: 'X',
  cidade: 'C',
  pais: 'P',
  pistas: ['1', '2', '3', '4', '5'] as const
};
const playing = (): EstadiosGameState => ({
  ...buildEstadiosState(item, ids.map((id) => ({ id })), 0),
  phase: 'PLAYING'
});

test('NOV-06: acertou de primeira = 5 pontos, de segunda = 4, e assim por diante', () => {
  let s = playing();
  assert.equal(estadiosValue(s), 5);
  assert.equal(estadiosCluesShown(s), 1);
  s = judgeEstadio(s, true, ids);
  assert.deepEqual(s.pointsAwarded, { a: 5 });
  assert.equal(s.phase, 'SUMMARY');

  let t = playing();
  t = judgeEstadio(t, false, ids);
  assert.equal(estadiosValue(t), 4);
  assert.equal(estadiosCluesShown(t), 2);
  assert.equal(t.turnPlayerId, 'b');
  t = judgeEstadio(t, true, ids);
  assert.deepEqual(t.pointsAwarded, { b: 4 });
});

test('NOV-06: cada erro revela mais uma pista e passa a vez em rodizio', () => {
  let s = playing();
  const turns: string[] = [s.turnPlayerId];
  for (let i = 0; i < 4; i++) {
    s = judgeEstadio(s, false, ids);
    turns.push(s.turnPlayerId);
  }
  assert.deepEqual(turns, ['a', 'b', 'c', 'a', 'b']);
  assert.equal(estadiosCluesShown(s), 5);
  assert.equal(estadiosValue(s), 1);
  assert.equal(s.phase, 'PLAYING');
  s = judgeEstadio(s, true, ids);
  assert.deepEqual(s.pointsAwarded, { b: 1 });
});

test('NOV-06: errar todas as pistas encerra sem pontos; diretor pode desistir', () => {
  let s = playing();
  for (let i = 0; i < 5; i++) s = judgeEstadio(s, false, ids);
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(s.pointsAwarded, {});
  assert.equal(s.answerVisible, true);
  assert.equal(estadiosCluesShown(s), 5);
  const gu = giveUpEstadio(playing());
  assert.equal(gu.phase, 'SUMMARY');
  assert.equal(giveUpEstadio(gu), gu);
});

test('NOV-06: so julga durante a partida', () => {
  const ready = { ...playing(), phase: 'READY' as const };
  assert.equal(judgeEstadio(ready, true, ids), ready);
});

test('NOV-06: banco com 5 pistas por estadio, sem repeticao, e foto opcional', () => {
  const keys = ESTADIOS.map((e) => normalizeEstadioKey(e.nome));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(ESTADIOS.length >= 30);
  for (const e of ESTADIOS) {
    assert.equal(e.pistas.length, 5, e.nome);
    assert.ok(e.pistas.every((p) => p.trim().length > 10), e.nome);
    assert.ok(e.cidade && e.pais, e.nome);
    // a pista mais vaga nao entrega o nome do estadio
    assert.ok(!normalizeEstadioKey(e.pistas[0]).includes(normalizeEstadioKey(e.nome)), `pista 1 entrega ${e.nome}`);
  }
  assert.ok(drawEstadio(new Set(keys)).nome.length > 0);
  assert.deepEqual([GAME_LIMITS.estadios.min, GAME_LIMITS.estadios.max], [2, 8]);
  assert.equal(usesLocalContent('estadios'), true);
});
