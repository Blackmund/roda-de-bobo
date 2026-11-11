import test from 'node:test';
import assert from 'node:assert/strict';
import { getShowQuestions, loadShowQuestions, validateShowQuestion } from '../data/showQuestions.ts';

test('DAD-02: todos os itens do banco do programa validam no esquema único', async () => {
  const all = await loadShowQuestions();
  assert.equal(all.length, 172);
  const ids = new Set(all.map((q) => q.id));
  assert.equal(ids.size, all.length, 'ids únicos');
  for (const q of all) {
    assert.deepEqual(validateShowQuestion(q), [], `item ${q.id} inválido`);
    assert.equal(q.origem, 'programa');
  }
});

test('DAD-01: itens com confiança baixa ou sem resposta ficam marcados como "a conferir"', async () => {
  const all = await loadShowQuestions();
  const lowConfidence = all.filter((q) => q.confianca === 'baixa');
  assert.ok(lowConfidence.length > 0);
  assert.ok(lowConfidence.every((q) => q.aConferir));
  assert.ok(all.filter((q) => q.resposta === null).every((q) => q.aConferir));
  const conferidos = await getShowQuestions({ somenteConferidos: true });
  assert.ok(conferidos.every((q) => q.confianca === 'alta' && q.resposta !== null));
});

test('DAD-01: filtro por jogo e link do vídeo-fonte no minuto', async () => {
  const limite = await getShowQuestions({ jogo: 'limite' });
  assert.equal(limite.length, 33);
  const comLink = limite.find((q) => q.fonte.url);
  assert.ok(comLink && /^https:\/\/youtu\.be\/[\w-]{11}\?t=\d+$/.test(comLink.fonte.url!));
  assert.ok(validateShowQuestion({ id: 'x' }).length > 0, 'item incompleto é rejeitado');
});
