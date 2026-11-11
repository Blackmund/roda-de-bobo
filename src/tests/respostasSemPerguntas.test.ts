import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRespostasState,
  currentValue,
  giveUpRound,
  judgeGuess,
  nextPlayerId,
  pickPosition,
  splitQuestion
} from '../utils/respostasEngine.ts';
import {
  RESPOSTAS_QUESTIONS,
  drawRespostaQuestion,
  normalizeRespostaKey
} from '../data/respostasSemPerguntas.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import type { RespostasSemPerguntasState } from '../types/game.ts';

const ids = ['a', 'b', 'c'];
const item = { pergunta: 'Quem é o lanterna do Desafio Itaú?', resposta: 'X', categoria: 'c' };
const make = (q = item): RespostasSemPerguntasState => ({
  ...buildRespostasState(q, ids.map((id) => ({ id })), 0),
  phase: 'PLAYING'
});

test('NOV-08: conta as palavras antes da interrogacao', () => {
  assert.equal(splitQuestion('Quem é o lanterna do Desafio Itaú?').length, 7);
  assert.deepEqual(splitQuestion('Qual é a capital?  '), ['Qual', 'é', 'a', 'capital']);
});

test('NOV-08: valor = numero de palavras, menos 1 por erro (minimo 1)', () => {
  let s = make({ ...item, pergunta: 'uma pergunta de onze palavras para testar o valor dos pontos?' });
  assert.equal(s.words.length, 11);
  assert.equal(currentValue(s), 11);
  s = pickPosition(s, 0);
  s = judgeGuess(s, false, ids);
  assert.equal(currentValue(s), 10);
  const tiny = make({ ...item, pergunta: 'Qual capital?' });
  assert.equal(currentValue(tiny), 2);
});

test('NOV-08: escolhe UMA posicao oculta e so na etapa de escolha', () => {
  let s = make();
  assert.equal(s.step, 'pick');
  s = pickPosition(s, 2);
  assert.deepEqual(s.revealed.map(Number), [0, 0, 1, 0, 0, 0, 0]);
  assert.equal(s.step, 'guess');
  assert.equal(pickPosition(s, 3), s); // ja escolheu: precisa chutar
  const again = judgeGuess(s, false, ids);
  assert.equal(pickPosition(again, 2), again); // posicao ja revelada
  assert.equal(pickPosition(again, 99), again);
});

test('NOV-08: acertou na primeira ganha o total de palavras e fecha a rodada', () => {
  let s = make();
  s = pickPosition(s, 0);
  s = judgeGuess(s, true, ids);
  assert.equal(s.phase, 'SUMMARY');
  assert.equal(s.winnerPlayerId, 'a');
  assert.deepEqual(s.pointsAwarded, { a: 7 });
  assert.equal(s.answerVisible, true);
});

test('NOV-08: errar passa a vez em rodizio e o proximo ganha um ponto a menos', () => {
  let s = make();
  s = pickPosition(s, 0);
  s = judgeGuess(s, false, ids); // a erra
  assert.equal(s.turnPlayerId, 'b');
  assert.equal(s.step, 'pick');
  s = pickPosition(s, 6);
  s = judgeGuess(s, true, ids); // b acerta
  assert.deepEqual(s.pointsAwarded, { b: 6 });
  assert.deepEqual(s.attempts.map((x) => x.position), [0, 6]);
  assert.equal(nextPlayerId(ids, 'c'), 'a');
});

test('NOV-08: todas reveladas sem acerto encerra sem pontos; diretor pode desistir', () => {
  let s = make({ ...item, pergunta: 'Uma duas?' });
  assert.equal(s.words.length, 2);
  s = pickPosition(s, 0);
  s = judgeGuess(s, false, ids);
  s = pickPosition(s, 1);
  s = judgeGuess(s, false, ids);
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(s.pointsAwarded, {});
  const gu = giveUpRound(make());
  assert.equal(gu.phase, 'SUMMARY');
  assert.equal(giveUpRound(gu), gu);
});

test('NOV-08: banco sem repeticao, com perguntas de 6+ palavras e resposta preenchida', () => {
  const keys = RESPOSTAS_QUESTIONS.map((x) => normalizeRespostaKey(x.pergunta));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(RESPOSTAS_QUESTIONS.length >= 70);
  for (const x of RESPOSTAS_QUESTIONS) {
    assert.ok(x.resposta.trim().length > 0, x.pergunta);
    assert.ok(x.pergunta.trim().endsWith('?'), x.pergunta);
    if (x.origem === 'autoral') assert.ok(splitQuestion(x.pergunta).length >= 6, `curta demais: ${x.pergunta}`);
  }
  assert.ok(RESPOSTAS_QUESTIONS.some((x) => x.origem === 'programa'));
  assert.ok(drawRespostaQuestion(new Set(keys)).pergunta.length > 0);
  assert.deepEqual(
    [GAME_LIMITS['respostas-sem-perguntas'].min, GAME_LIMITS['respostas-sem-perguntas'].max],
    [2, 8]
  );
});
