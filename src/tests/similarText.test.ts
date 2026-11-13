import test from 'node:test';
import assert from 'node:assert/strict';
import { isRelated, pickDistinct, relatedToAny } from '../utils/similarText.ts';
import { drawMimicaWords } from '../data/mimicaWords.ts';
import { drawMegaResenhaWords } from '../data/megaResenhaWords.ts';
import { drawDesenhoWords } from '../data/desenhoWords.ts';

test('parecidos: Deserto e Deserto do Saara contam como a mesma coisa', () => {
  assert.equal(isRelated('Deserto', 'Deserto do Saara'), true);
  assert.equal(isRelated('DESERTO DO SAARA', 'deserto'), true);
  assert.equal(isRelated('Copa do Mundo', 'Copa América'), true);
  assert.equal(isRelated('Pizza', 'Pizzaria'), true);
  assert.equal(isRelated('Estádio', 'Estádios'), true);
  assert.equal(isRelated('desertodosaara', 'Deserto'), true);
});

test('parecidos: palavras diferentes nao sao barradas por engano', () => {
  assert.equal(isRelated('Deserto', 'Desenho'), false);
  assert.equal(isRelated('Praia', 'Montanha'), false);
  assert.equal(isRelated('Sol', 'Solteiro'), false);
  assert.equal(isRelated('Bola de Ouro', 'Troféu'), false);
  assert.equal(isRelated('', 'Deserto'), false);
  assert.equal(relatedToAny('Mar', ['Rio', 'Lago']), false);
});

test('parecidos: pickDistinct nao entrega duas parecidas na mesma rodada e evita as recentes', () => {
  const cards = ['Deserto', 'Deserto do Saara', 'Floresta', 'Oceano', 'Ilha', 'Vulcão'];
  const picked = pickDistinct(cards, 4, (c) => c, ['Oceano Atlântico']);
  assert.equal(picked.length, 4);
  assert.ok(!(picked.includes('Deserto') && picked.includes('Deserto do Saara')));
  assert.ok(!picked.includes('Oceano'));
});

test('parecidos: se faltar opcao, completa mesmo assim (nunca devolve rodada incompleta)', () => {
  const cards = ['Deserto', 'Deserto do Saara', 'Deserto do Atacama'];
  const picked = pickDistinct(cards, 3, (c) => c, ['Deserto']);
  assert.equal(picked.length, 3);
});

test('parecidos: os sorteios de palavras nao repetem familia na mesma rodada', () => {
  for (let i = 0; i < 30; i++) {
    for (const words of [
      drawMimicaWords(5).map((w) => w.palavra),
      drawMegaResenhaWords(5).map((w) => w.palavra),
      drawDesenhoWords(5).map((w) => w.palavra)
    ]) {
      assert.equal(words.length, 5);
      words.forEach((w, a) => words.forEach((x, b) => a < b && assert.equal(isRelated(w, x), false, `${w} / ${x}`)));
    }
  }
});

test('Limite: a maioria das perguntas dos bancos tem ate 130 caracteres (cabe em 2 linhas na TV)', async () => {
  const { LIMITE_GOLDEN_QUESTIONS } = await import('../utils/limiteGoldenDatabase.ts');
  const { LIMITE_BANKS_BY_CATEGORY, CURATED_LIMITE } = await import('../data/categoryBanks.ts').then(async (m: any) => ({ LIMITE_BANKS_BY_CATEGORY: m.LIMITE_BANKS_BY_CATEGORY || {}, CURATED_LIMITE: (await import('../data/curatedRounds.ts')).CURATED_LIMITE }));
  const all: string[] = [
    ...LIMITE_GOLDEN_QUESTIONS.map((q: any) => q.pergunta),
    ...(CURATED_LIMITE as any[]).map((q) => q.pergunta),
    ...Object.values(LIMITE_BANKS_BY_CATEGORY as Record<string, any[]>).flat().map((q: any) => q.pergunta)
  ];
  assert.ok(all.length > 50);
  const short = all.filter((p) => p.length <= 130).length;
  assert.ok(short / all.length >= 0.8, `so ${short}/${all.length} cabem`);
  assert.ok(all.every((p) => p.length <= 200));
});
