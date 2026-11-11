import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExtraBanks, mergeExtraItems, validateExtraItem, type ExtraGame } from '../data/extraBanks.ts';
import { LIMITE_GOLDEN_QUESTIONS } from '../utils/limiteGoldenDatabase.ts';
import { PROIBIDO_GOLDEN_CARDS } from '../utils/proibidoGoldenDatabase.ts';
import { NOTA_GOLDEN_PROMPTS } from '../utils/notaGoldenDatabase.ts';
import { TEM_OU_NAO_TEM_GOLDEN_QUESTIONS } from '../utils/temOuNaoTemGoldenDatabase.ts';
import { DUVIDO_GOLDEN_CATEGORIES } from '../utils/duvidoGoldenDatabase.ts';

test('DAD-01: valida o formato de cada jogo', () => {
  assert.ok(validateExtraItem('proibido', { id: 'x', categoria: 'c', palavra_alvo: 'A', palavras_proibidas: ['b', 'c', 'd', 'e'] }).length);
  assert.ok(validateExtraItem('proibido', { id: 'x', categoria: 'c', palavra_alvo: 'Ação', palavras_proibidas: ['acao', 'c', 'd', 'e', 'f'] }).length);
  assert.deepEqual(validateExtraItem('limite', { id: 'x', categoria: 'c', pergunta: 'q', valor_exato: 3, unidade: 'u' }), []);
  assert.ok(validateExtraItem('limite', { id: 'x', categoria: 'c', pergunta: 'q', valor_exato: 'tres', unidade: 'u' }).length);
});

test('DAD-01: merge descarta invalidos e repetidos (id ou texto) e so acrescenta o novo', () => {
  const target: Record<string, unknown>[] = [{ id: 'a', pergunta: 'Quantos Ossos' }];
  const r = mergeExtraItems('nota', target, [
    { id: 'a', categoria: 'c', pergunta: 'outra' }, // id repetido
    { id: 'b', categoria: 'c', pergunta: 'quantos ossos' }, // texto repetido (sem acento/caixa)
    { id: 'c', categoria: 'c' }, // invalido
    { id: 'd', categoria: 'c', pergunta: 'nova' }
  ]);
  assert.deepEqual(r, { added: 1, skippedInvalid: 1, skippedDuplicate: 2 });
  assert.equal(target.length, 2);
});

test('DAD-01: os 5 bancos extras entram quase inteiros, sem itens invalidos', async () => {
  const sizes = {
    limite: LIMITE_GOLDEN_QUESTIONS.length,
    proibido: PROIBIDO_GOLDEN_CARDS.length,
    nota: NOTA_GOLDEN_PROMPTS.length,
    temOuNaoTem: TEM_OU_NAO_TEM_GOLDEN_QUESTIONS.length,
    duvido: DUVIDO_GOLDEN_CATEGORIES.length
  };
  const res = await loadExtraBanks();
  const expected: Record<ExtraGame, number> = { limite: 255, proibido: 692, nota: 294, temOuNaoTem: 159, duvido: 35 };
  (Object.keys(expected) as ExtraGame[]).forEach((g) => {
    assert.equal(res[g].skippedInvalid, 0, `${g}: itens invalidos`);
    assert.equal(res[g].added + res[g].skippedDuplicate, expected[g], `${g}: total`);
    assert.ok(res[g].added >= expected[g] * 0.95, `${g}: muitos repetidos (${res[g].skippedDuplicate})`);
  });
  assert.equal(LIMITE_GOLDEN_QUESTIONS.length, sizes.limite + res.limite.added);
  assert.equal(PROIBIDO_GOLDEN_CARDS.length, sizes.proibido + res.proibido.added);
});

test('DAD-01: ids unicos depois do merge e votos do Tem ou Nao Tem somam 100', async () => {
  await loadExtraBanks();
  for (const bank of [LIMITE_GOLDEN_QUESTIONS, PROIBIDO_GOLDEN_CARDS, NOTA_GOLDEN_PROMPTS, TEM_OU_NAO_TEM_GOLDEN_QUESTIONS, DUVIDO_GOLDEN_CATEGORIES] as { id: string }[][]) {
    assert.equal(new Set(bank.map((b) => b.id)).size, bank.length);
  }
  const extras = TEM_OU_NAO_TEM_GOLDEN_QUESTIONS.filter((q) => q.id.startsWith('l'));
  const off = extras.filter((q) => q.respostas.reduce((s, a) => s + a.votos, 0) !== 100);
  assert.ok(off.length / Math.max(1, extras.length) < 0.05, `${off.length} perguntas do Tem nao somam 100 votos`);
});
