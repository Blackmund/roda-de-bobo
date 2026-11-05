import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectThemeCategory,
  generateThemeStrictFallbackRound,
  normalizeTemVotesTo100,
  getTemTotalRespondents,
  stripPerguntamosPrefix,
  getSmartSubthemesForTheme,
  pickNextRandomSubtheme
} from '../src/utils/aiGameGenerator';
import { DEFAULT_GAME_CUSTOM_CONFIG } from '../src/types/game';

test('detectThemeCategory identifies Animais, Comida, Futebol, Cinema and other core categories accurately', () => {
  assert.equal(detectThemeCategory('Animais'), 'animais');
  assert.equal(detectThemeCategory('Animais Selvagens e Pets'), 'animais');
  assert.equal(detectThemeCategory('Futebol Brasileiro'), 'futebol');
  assert.equal(detectThemeCategory('Filmes, Séries e Marvel'), 'cinema');
  assert.equal(detectThemeCategory('Comidas, Boteco e Gastronomia'), 'comida');
});

test('getTemTotalRespondents returns 100 for Top <= 5 and scales up to 120..200 for Top 6..10', () => {
  assert.equal(getTemTotalRespondents(3), 100);
  assert.equal(getTemTotalRespondents(4), 100);
  assert.equal(getTemTotalRespondents(5), 100);
  assert.equal(getTemTotalRespondents(6), 120);
  assert.equal(getTemTotalRespondents(7), 140);
  assert.equal(getTemTotalRespondents(8), 160);
  assert.equal(getTemTotalRespondents(9), 180);
  assert.equal(getTemTotalRespondents(10), 200);
});

test('stripPerguntamosPrefix removes any "Perguntamos a X pessoas:" prefix and starts directly with the question', () => {
  assert.equal(
    stripPerguntamosPrefix('Perguntamos a 100 pessoas: O que é mais consumido em um boteco?'),
    'O que é mais consumido em um boteco?'
  );
  assert.equal(
    stripPerguntamosPrefix('Quais as melhores comidas típicas do Brasil?'),
    'Quais as melhores comidas típicas do Brasil?'
  );
});

test('Tem ou Não Tem with theme "Animais" NEVER returns off-topic questions and sums to 100 for Top 5', () => {
  const usedSignatures: string[] = [];
  for (let i = 0; i < 6; i++) {
    const res = generateThemeStrictFallbackRound(
      'tem-ou-nao-tem',
      'Animais',
      'Reino Animal',
      DEFAULT_GAME_CUSTOM_CONFIG,
      usedSignatures
    );
    usedSignatures.push(res.signature);
    const data = res.data as { pergunta: string; respostas: Array<{ texto: string; votos: number }> };
    const lowerQ = data.pergunta.toLowerCase();

    assert.ok(
      !lowerQ.startsWith('perguntamos'),
      `Question should not start with "Perguntamos a 100 pessoas:": ${data.pergunta}`
    );
    assert.ok(
      !lowerQ.includes('super-heroi') &&
        !lowerQ.includes('super-herói') &&
        !lowerQ.includes('churrasco'),
      `Expected animal question, got off-topic: ${data.pergunta}`
    );
    assert.equal(data.respostas.length, 5);
    const sumVotes = data.respostas.reduce((acc, r) => acc + r.votos, 0);
    assert.equal(sumVotes, 100);
  }
  assert.equal(new Set(usedSignatures).size, 6);
});

test('Tem ou Não Tem with theme "Comidas, Boteco e Gastronomia" and Top 10 returns 10 concrete food/drink answers summing to 200', () => {
  const custom10 = {
    ...DEFAULT_GAME_CUSTOM_CONFIG,
    temItemsCount: 10,
    temMaxStrikes: 2
  };

  const res = generateThemeStrictFallbackRound(
    'tem-ou-nao-tem',
    'Comidas, Boteco e Gastronomia',
    'Petiscos Clássicos de Boteco',
    custom10,
    []
  );
  const data = res.data as { pergunta: string; respostas: Array<{ texto: string; votos: number }> };

  assert.ok(
    !data.pergunta.toLowerCase().startsWith('perguntamos'),
    `Question must start directly without "Perguntamos a 100 pessoas:": ${data.pergunta}`
  );
  assert.equal(data.respostas.length, 10, 'Should generate 10 answer slots when temItemsCount=10');
  const totalVotes = data.respostas.reduce((sum, item) => sum + item.votos, 0);
  assert.equal(totalVotes, 200, 'Votes across all 10 items must sum to 200 respondents');

  // Verify none of the answers are generic meta-placeholders
  for (const item of data.respostas) {
    assert.ok(
      !item.texto.toLowerCase().includes('o maior clássico de') &&
        !item.texto.toLowerCase().includes('personagem ou ícone') &&
        !item.texto.toLowerCase().includes('momento histórico'),
      `Answer must be a real concrete item, got placeholder: ${item.texto}`
    );
  }

  // Verify descending order
  for (let i = 1; i < data.respostas.length; i++) {
    assert.ok(
      data.respostas[i - 1].votos >= data.respostas[i].votos,
      'Votes should be sorted in non-increasing order'
    );
  }
});

test('normalizeTemVotesTo100 normalizes any N items to getTemTotalRespondents(N) total votes', () => {
  const raw = Array.from({ length: 8 }, (_, idx) => ({
    texto: `Resposta ${idx + 1}`,
    sinonimos_aceitos: [`Syn ${idx + 1}`],
    votos: 10
  }));

  const normalized8 = normalizeTemVotesTo100(raw, 8);
  assert.equal(normalized8.length, 8);
  assert.equal(
    normalized8.reduce((acc, item) => acc + item.votos, 0),
    160
  );

  const normalized5 = normalizeTemVotesTo100(raw, 5);
  assert.equal(normalized5.length, 5);
  assert.equal(
    normalized5.reduce((acc, item) => acc + item.votos, 0),
    100
  );
});

test('Proibido respects custom proibidoCardsCount and proibidoForbiddenCount and stays on theme', () => {
  const customProibido = {
    ...DEFAULT_GAME_CUSTOM_CONFIG,
    proibidoCardsCount: 8,
    proibidoForbiddenCount: 4
  };

  const res = generateThemeStrictFallbackRound('proibido', 'Animais', 'Selva', customProibido, []);
  const cards = res.data as Array<{ palavra_alvo: string; palavras_proibidas: string[] }>;

  assert.equal(cards.length, 8);
  cards.forEach((card) => {
    assert.equal(card.palavras_proibidas.length, 4);
  });
});

test('Science / Astronomy theme synthesizes strictly on-theme concrete questions and scales votes to 140 for Top 7', () => {
  const customTheme = 'Astronomia e Planetas';
  const res = generateThemeStrictFallbackRound(
    'tem-ou-nao-tem',
    customTheme,
    'Sistema Solar',
    { ...DEFAULT_GAME_CUSTOM_CONFIG, temItemsCount: 7 },
    []
  );
  const data = res.data as { pergunta: string; respostas: Array<{ texto: string; votos: number }> };
  assert.ok(!data.pergunta.toLowerCase().startsWith('perguntamos'));
  assert.equal(data.respostas.length, 7);
  assert.equal(
    data.respostas.reduce((acc, r) => acc + r.votos, 0),
    140
  );
});

test('Subtheme generator produces relevant subthemes and rotates without immediate repetition', () => {
  const subs = getSmartSubthemesForTheme('Animais');
  assert.ok(subs.length >= 6);
  const picked1 = pickNextRandomSubtheme('Animais');
  const picked2 = pickNextRandomSubtheme('Animais');
  assert.notEqual(picked1, picked2);
});
