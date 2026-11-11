import test from 'node:test';
import assert from 'node:assert/strict';

// Site estatico: /api/health responde HTML com 200 (fallback de SPA); nao existe servidor proprio.
const store = new Map<string, string>();
(globalThis as any).window = {
  sessionStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v)
  }
};
const calls: string[] = [];
(globalThis as any).fetch = async (url: string) => {
  calls.push(String(url));
  return {
    ok: true,
    status: 200,
    headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null) },
    json: async () => {
      throw new Error('nao e JSON');
    }
  };
};

test('INF-08: sem servidor proprio, temas e sub-temas vem do banco local sem chamar /api/generate-*', async () => {
  const { generateNewThemesWithAI, generateRandomSubthemes } = await import('../utils/aiGameGenerator.ts');
  const themes = await generateNewThemesWithAI([]);
  const subs = await generateRandomSubthemes('Futebol', 4);
  assert.ok(Array.isArray(themes) && themes.length > 0, 'temas locais de reserva');
  assert.ok(Array.isArray(subs) && subs.length > 0, 'sub-temas locais de reserva');
  const aiCalls = calls.filter((u) => u.includes('/api/generate-'));
  assert.deepEqual(aiCalls, [], 'nenhuma chamada de IA');
  assert.equal(calls.filter((u) => u.includes('/api/health')).length, 1, 'uma unica sondagem');
});
