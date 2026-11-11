import test from 'node:test';
import assert from 'node:assert/strict';
import { generateNewRoomCode } from '../utils/partyNetworkEngine.ts';

test('INF-04: codigo de sala tem 6 simbolos sem ambiguos (O, 0, I, 1) e varia', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const code = generateNewRoomCode();
    assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    seen.add(code);
  }
  assert.ok(seen.size > 490, `codigos repetidos demais: ${seen.size}/500`);
});
