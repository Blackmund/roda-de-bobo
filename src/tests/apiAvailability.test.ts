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
  assert.equal(store.get('rb_api_available_v2'), '0');
});

test('INF-01: so uma resposta JSON do servidor conta como API; HTML de fallback de SPA e 404 nao', async () => {
  const { looksLikeApiHealth } = await import('../utils/apiAvailability.ts');
  const h = (type: string) => ({ get: (n: string) => (n.toLowerCase() === 'content-type' ? type : null) });
  assert.equal(looksLikeApiHealth({ ok: true, status: 200, headers: h('application/json; charset=utf-8') }), true);
  assert.equal(looksLikeApiHealth({ ok: true, status: 200, headers: h('text/html; charset=utf-8') }), false); // SPA fallback
  assert.equal(looksLikeApiHealth({ ok: false, status: 404, headers: h('text/html') }), false);
  assert.equal(looksLikeApiHealth({ ok: false, status: 500, headers: h('application/json') }), false);
  assert.equal(looksLikeApiHealth({ ok: true, status: 200 }), false); // sem content-type
});

test('INF-01: sem API, o envio de estado (POST) nao sai: nada de 404 a cada mudanca', async () => {
  const { postToApi } = await import('../utils/apiAvailability.ts');
  const before = calls;
  postToApi('/api/rooms/ABC123/state', { roomId: 'ABC123' });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(calls, before, 'nenhuma requisicao nova com a API ausente');
  postToApi('/api/rooms/ABC123/state', { ciclico: (() => { const o: any = {}; o.o = o; return o; })() }); // nao quebra
});
