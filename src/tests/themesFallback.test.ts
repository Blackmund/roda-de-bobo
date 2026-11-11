import test from 'node:test';
import assert from 'node:assert/strict';

// Servidor de IA fora do ar (sem credito, offline ou site estatico): fetch falha.
const store = new Map<string, string>();
(globalThis as any).window = {
  sessionStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v)
  }
};
store.set('rb_api_available_v2', '1'); // API "existe", mas a chamada de temas falha
(globalThis as any).fetch = async () => {
  throw new Error('HTTP_402');
};

test('INF-10: sem IA, "Gerar novos temas" usa o banco local: 8 temas variados e sem repetir os excluidos', async () => {
  const { generateNewThemesWithAI } = await import('../utils/aiGameGenerator.ts');
  const exclude = ['Brega', 'Futebol'];
  const a = await generateNewThemesWithAI(exclude);
  const b = await generateNewThemesWithAI(exclude);
  assert.equal(a.length, 8);
  assert.equal(new Set(a).size, 8, 'sem repeticao dentro do lote');
  assert.ok(a.every((t) => typeof t === 'string' && t.trim().length > 1));
  assert.ok(a.every((t) => !exclude.includes(t)), 'respeita os excluidos');
  assert.notDeepEqual(a, b, 'cada pedido sorteia de novo');
});
