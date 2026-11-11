import test from 'node:test';
import assert from 'node:assert/strict';

// Site com servidor de IA (health ok) e localStorage em memoria.
const ls = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => void ls.set(k, v),
    removeItem: (k: string) => void ls.delete(k)
  },
  sessionStorage: { getItem: () => '1', setItem: () => {} }
};

let aiCalls = 0;
let script: (n: number, body: any) => any = (n) => ({ pergunta: `Pergunta inedita numero ${n} sobre assuntos variados e curiosos` });
(globalThis as any).fetch = async (_url: string, init: any) => {
  aiCalls += 1;
  const body = JSON.parse(init?.body || '{}');
  return { ok: true, status: 200, json: async () => ({ data: script(aiCalls, body), extraRounds: [], fallback: false }) };
};

const gen = await import('../utils/aiGameGenerator.ts');
const seen = await import('../utils/seenMemory.ts');
await (await import('../data/extraBanks.ts')).loadExtraBanks();

test('IA repetiu algo que o jogador ja viu: a rodada e descartada e a IA tenta de novo', async () => {
  gen.clearUsedRoundSignatures();
  aiCalls = 0;
  const repetida = 'Qual a pior desculpa para chegar atrasado na reuniao de segunda-feira?';
  seen.markSeen(repetida);
  script = (n) => (n === 1 ? { pergunta: repetida } : { pergunta: `Pergunta nova numero ${n} que ninguem viu ainda` });
  const r = await gen.generateRoundContent('nota', 'Tema Livre Totalmente Inventado Xyzzy', undefined, [], 'normal');
  assert.equal(r.source, 'ai');
  assert.notEqual((r.data as any).pergunta, repetida);
  assert.ok(aiCalls >= 2, 'houve nova tentativa depois da repeticao');
});

test('IA repetindo sempre: cai no banco em vez de mostrar o que ja foi visto', async () => {
  gen.clearUsedRoundSignatures();
  aiCalls = 0;
  const repetida = 'Pergunta que a IA insiste em devolver toda vez sem variar nada';
  seen.markSeen(repetida);
  script = () => ({ pergunta: repetida });
  const r = await gen.generateRoundContent('nota', 'Tema Livre Totalmente Inventado Xyzzy', undefined, [], 'normal');
  assert.notEqual((r.data as any).pergunta, repetida);
  assert.equal(r.source, 'curated');
});

test('mistura banco + IA: 150 rodadas de Nota/Futebol sem nenhuma repeticao, com os dois lados participando', async () => {
  gen.clearUsedRoundSignatures();
  aiCalls = 0;
  // frases realmente diferentes entre si (palavras de conteudo distintas), como uma IA de verdade faria
  const syl = ['ba', 'ce', 'di', 'fo', 'gu', 'ha', 'jo', 'ku', 'la', 'me', 'ni', 'po', 'ra', 'su', 'ti', 'vo'];
  const word = (n: number, k: number) => syl[(n >> (k * 2)) % 16] + syl[(n * (k + 3) + k) % 16] + syl[(n + k * 5) % 16] + syl[(n >> k) % 16];
  script = (n) => ({ pergunta: `Frase ${word(n, 0)} ${word(n, 1)} ${word(n, 2)} ${word(n, 3)} ${word(n * 7, 4)} ${n}` });
  const shown = new Set<string>();
  let curated = 0;
  let ai = 0;
  let repeats = 0;
  for (let i = 0; i < 150; i++) {
    const r = await gen.generateRoundContent('nota', 'Futebol', undefined, [], 'normal');
    const q = seen.normalizeSeenText((r.data as any).pergunta);
    if (shown.has(q)) repeats += 1;
    shown.add(q);
    if (r.source === 'curated') curated += 1;
    else ai += 1;
  }
  assert.equal(repeats, 0, `${repeats} repeticoes em 150 rodadas`);
  assert.ok(curated >= 20, `banco participou pouco (${curated})`);
  assert.ok(ai >= 20, `IA participou pouco (${ai})`);
});
