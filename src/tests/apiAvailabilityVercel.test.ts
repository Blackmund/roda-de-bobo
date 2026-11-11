import test from 'node:test';
import assert from 'node:assert/strict';

// Vercel: so as funcoes de IA existem; /api/health avisa rooms:false.
const store = new Map<string, string>();
(globalThis as any).window = {
  sessionStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v)
  }
};
(globalThis as any).fetch = async () => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => ({ status: 'ok', rooms: false })
});

test('INF-01: na Vercel (health com rooms:false) a IA existe, mas salas/WebSocket nao', async () => {
  const { isApiAvailable, isRoomApiAvailable } = await import('../utils/apiAvailability.ts');
  assert.equal(await isApiAvailable(), true);
  assert.equal(await isRoomApiAvailable(), false);
  assert.equal(store.get('rb_api_rooms_v2'), '0');
});
