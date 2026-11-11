import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSwapPair } from '../utils/limiteSwap.ts';
import { evaluateLimiteRoundReveal } from '../components/host/ScreenLimite.tsx';
import type { LimiteGameState } from '../types/game.ts';

test('REG-05: Reverse exige dois alvos distintos', () => {
  assert.equal(resolveSwapPair(['a']), null);
  assert.deepEqual(resolveSwapPair(['b', 'c', 'a']), { player1: 'b', player2: 'c' });
  assert.deepEqual(resolveSwapPair(['b', 'c', 'a'], 'c', 'a'), { player1: 'c', player2: 'a' });
});

test('REG-05: escolha repetida ou invalida cai em outro jogador, nunca no mesmo', () => {
  const pair = resolveSwapPair(['b', 'c', 'a'], 'c', 'c');
  assert.ok(pair && pair.player1 !== pair.player2);
  const invalid = resolveSwapPair(['b', 'c'], 'zzz', 'yyy');
  assert.ok(invalid && invalid.player1 !== invalid.player2);
});

test('REG-05: a troca de dois adversarios muda quem leva o ponto', () => {
  const base = {
    phase: 'SECRET_GUESS',
    roundData: { pergunta: 'q', valor_exato: 100 },
    guesses: { a: 100, b: 10, c: 20 },
    winners: [],
    bustedPlayers: [],
    pointsAwarded: {}
  } as unknown as LimiteGameState;
  const semTroca = evaluateLimiteRoundReveal(base);
  assert.deepEqual(semTroca.winners, ['a']);
  // b e c trocam entre si: o palpite de a continua o melhor
  const comTroca = evaluateLimiteRoundReveal({ ...base, swapTarget: { player1: 'b', player2: 'c' } });
  assert.deepEqual(comTroca.winners, ['a']);
  // a (100) troca com b (10): quem passa a ter 10 e b com 100 ganha
  const trocaMelhor = evaluateLimiteRoundReveal({ ...base, swapTarget: { player1: 'a', player2: 'b' } });
  assert.deepEqual(trocaMelhor.winners, ['b']);
});
