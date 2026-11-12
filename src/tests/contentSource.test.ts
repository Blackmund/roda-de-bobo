import test from 'node:test';
import assert from 'node:assert/strict';

const ls = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => void ls.set(k, v),
    removeItem: (k: string) => void ls.delete(k)
  },
  sessionStorage: { getItem: () => '1', setItem: () => {} } // servidor de IA "no ar"
};

let aiCalls = 0;
(globalThis as any).fetch = async () => {
  aiCalls += 1;
  const n = aiCalls;
  const syl = ['ba', 'ce', 'di', 'fo', 'gu', 'ha', 'jo', 'ku', 'la', 'me', 'ni', 'po', 'ra', 'su', 'ti', 'vo'];
  const w = (k: number) => syl[(n >> (k * 2)) % 16] + syl[(n * (k + 3) + k) % 16] + syl[(n + k * 5) % 16] + syl[(n >> k) % 16];
  return {
    ok: true,
    status: 200,
    json: async () => ({ data: { pergunta: `Frase ${w(0)} ${w(1)} ${w(2)} ${w(3)} ${w(4)} ${n}` }, extraRounds: [], fallback: false })
  };
};

const gen = await import('../utils/aiGameGenerator.ts');
const { DEFAULT_GAME_CUSTOM_CONFIG } = await import('../types/game.ts');
await (await import('../data/extraBanks.ts')).loadExtraBanks();

test('DAD-05: "so banco pronto" nunca chama a IA e sempre devolve conteudo do banco', async () => {
  gen.clearUsedRoundSignatures();
  aiCalls = 0;
  const cfg = { ...DEFAULT_GAME_CUSTOM_CONFIG, contentSource: 'bank' as const };
  for (let i = 0; i < 25; i++) {
    const r = await gen.generateRoundContent('nota', 'Futebol', cfg, [], 'normal');
    assert.equal(r.source, 'curated');
  }
  assert.equal(aiCalls, 0, 'a IA nao deve ser chamada');
});

test('DAD-05: "so IA" nao sorteia o banco na frente (tema com banco proprio)', async () => {
  gen.clearUsedRoundSignatures();
  aiCalls = 0;
  const cfg = { ...DEFAULT_GAME_CUSTOM_CONFIG, contentSource: 'ai' as const };
  let curated = 0;
  for (let i = 0; i < 30; i++) {
    const r = await gen.generateRoundContent('nota', 'Futebol', cfg, [], 'normal');
    if (r.source === 'curated') curated += 1;
  }
  assert.equal(curated, 0, `${curated} rodadas vieram do banco no modo so IA`);
  assert.ok(aiCalls >= 30);
});

test('DAD-05: o padrao e misturar (auto)', () => {
  assert.equal(DEFAULT_GAME_CUSTOM_CONFIG.contentSource, 'auto');
});
