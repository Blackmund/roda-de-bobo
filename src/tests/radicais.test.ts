import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSpokenWord, radicalList, stemOf } from '../utils/radicais.ts';

test('REG-06: radical aproximado ignora acento, caixa e as ultimas letras', () => {
  assert.equal(stemOf('Cobertura'), 'cobert');
  assert.equal(stemOf('GOL'), 'gol');
  assert.equal(stemOf('Artilheiro'), 'artilhe');
});

test('REG-06: palavra dita parecida com o alvo ou com uma proibida e sinalizada', () => {
  const card = ['LUTADOR', 'BOXE', 'RINGUE', 'SOCO', 'MMA'];
  const hits = checkSpokenWord('lutar', card);
  assert.ok(hits.some((h) => h.cardWord === 'LUTADOR' && h.kind === 'radical'), 'lutar x lutador');
  assert.equal(checkSpokenWord('boxe', card)[0].kind, 'identica');
  assert.ok(checkSpokenWord('boxeador', card).some((h) => h.cardWord === 'BOXE'), 'boxeador x boxe');
});

test('REG-06: polemica do programa ("encobrir" x "cobertura") NAO e sinalizada: fica a cargo do juiz', () => {
  assert.deepEqual(checkSpokenWord('encobrir', ['COBERTURA', 'GOL', 'BOLA']), []);
});

test('REG-06: palavras nao relacionadas e entradas curtas nao geram aviso', () => {
  assert.deepEqual(checkSpokenWord('futebol', ['LUTADOR', 'BOXE']), []);
  assert.deepEqual(checkSpokenWord('lu', ['LUTADOR']), []);
});

test('REG-06: lista de radicais para consulta do juiz', () => {
  assert.deepEqual(radicalList(['LUTADOR', 'MMA']), ['LUTA-', 'MMA']);
});
