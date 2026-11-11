import test from 'node:test';
import assert from 'node:assert/strict';

// Simula o navegador: sem servidor próprio (Vercel estático) /api/health responde 404.
const store = new Map<string, string>();
(globalThis as any).window = {
  sessionStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v)
  }
};
let calls = 0;
(globalThis as any).fetch = async () => {
  calls += 1;
  return { status: 404, ok: false };
};

test('INF-01/02: com /api/health 404 a API é dada como ausente, com UMA só requisição por sessão', async () => {
  const { isApiAvailable } = await import('../utils/apiAvailability.ts');
  const results = await Promise.all([isApiAvailable(), isApiAvailable(), isApiAvailable()]);
  assert.deepEqual(results, [false, false, false]);
  assert.equal(calls, 1, 'chamadas simultâneas compartilham a mesma sondagem');
  assert.equal(await isApiAvailable(), false);
  assert.equal(calls, 1, 'resultado em cache, sem nova requisição');
  assert.equal(store.get('rb_api_available_v1'), '0');
});
