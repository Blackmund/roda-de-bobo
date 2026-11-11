import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k)
  },
  sessionStorage: { getItem: () => '0', setItem: () => {} } // sem servidor: so banco
};

const gen = await import('../utils/aiGameGenerator.ts');
const seen = await import('../utils/seenMemory.ts');
await (await import('../data/extraBanks.ts')).loadExtraBanks(); // como o App faz 1,5 s depois de abrir

function key(gameId: string, data: any): string {
  return seen.contentKeys(gameId, data).join('|');
}

test('banco: nota/limite/duvido/tem nao repetem enquanto ha itens novos no banco do tema', () => {
  for (const gameId of ['nota', 'limite', 'duvido', 'tem-ou-nao-tem'] as const) {
    gen.clearUsedRoundSignatures();
    const got = new Set<string>();
    let repeats = 0;
    for (let i = 0; i < 12; i++) {
      const r = gen.generateThemeStrictFallbackRound(gameId, 'Futebol', 'Futebol', undefined, [], 'normal');
      const k = key(gameId, r.data);
      if (got.has(k)) repeats += 1;
      got.add(k);
    }
    assert.equal(repeats, 0, `${gameId}: ${repeats} repeticoes em 12 rodadas`);
  }
});

test('banco: proibido nao repete palavra-alvo entre rodadas seguidas', () => {
  gen.clearUsedRoundSignatures();
  const words = new Set<string>();
  for (let i = 0; i < 6; i++) {
    const r = gen.generateThemeStrictFallbackRound('proibido', 'Futebol', 'Futebol', undefined, [], 'normal');
    for (const c of r.data as any[]) {
      assert.equal(words.has(c.palavra_alvo), false, `repetiu ${c.palavra_alvo}`);
      words.add(c.palavra_alvo);
    }
  }
});

test('banco esgotado: a primeira repeticao e de um item dos mais antigos', () => {
  gen.clearUsedRoundSignatures();
  const order: string[] = [];
  let repeatedAt = -1;
  for (let i = 0; i < 3000 && repeatedAt < 0; i++) {
    const r = gen.generateThemeStrictFallbackRound('nota', 'Futebol', 'Futebol', undefined, [], 'normal');
    const k = key('nota', r.data);
    const prev = order.indexOf(k);
    if (prev >= 0) repeatedAt = prev;
    order.push(k);
  }
  assert.ok(repeatedAt >= 0, 'o banco de nota/futebol acaba em algum momento');
  assert.ok(
    repeatedAt <= Math.ceil(order.length * 0.15),
    `item repetido era o #${repeatedAt} de ${order.length}: deveria ser dos mais antigos`
  );
});

test('temas: "Gerar novos temas" sem IA nunca repete um tema ja mostrado em 30 cliques', async () => {
  gen.clearUsedRoundSignatures();
  (globalThis as any).fetch = async () => {
    throw new Error('offline');
  };
  const shown = new Set<string>();
  let dup = 0;
  for (let i = 0; i < 30; i++) {
    const themes = await gen.generateNewThemesWithAI([]);
    assert.equal(themes.length, 8);
    for (const t of themes) {
      if (shown.has(t)) dup += 1;
      shown.add(t);
    }
  }
  assert.equal(dup, 0, `${dup} temas repetidos em 240 exibidos`);
});
