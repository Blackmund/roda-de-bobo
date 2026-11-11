import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCAL_CONTENT_GAMES, usesLocalContent } from '../config/localGames.ts';
import { prefetchRoundsForTheme } from '../utils/aiGameGenerator.ts';

test('jogos de conteudo local nunca pedem rodadas a IA', () => {
  assert.equal(usesLocalContent('mimica'), true);
  assert.equal(usesLocalContent('respostas-sem-perguntas'), true);
  assert.equal(usesLocalContent('limite'), false);
  assert.equal(usesLocalContent(null), false);

  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: unknown) => {
    calls.push(String(input));
    return { ok: false, status: 400, json: async () => ({}) } as unknown as Response;
  }) as typeof fetch;
  try {
    for (const g of LOCAL_CONTENT_GAMES) prefetchRoundsForTheme(g, 'Futebol');
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(calls, []);
});
