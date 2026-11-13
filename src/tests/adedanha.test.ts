import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdedanhaState,
  callStop,
  castVote,
  categoryResult,
  drawLetter,
  nextCategory,
  roundPoints,
  setOverride,
  startWriting,
  startsWithLetter,
  submitAnswers,
  tickAdedanha,
  verdictOf,
  ADEDANHA_STOP_GRACE_MS
} from '../utils/adedanhaEngine.ts';
import { ADEDANHA_LETRAS_EXCLUIDAS_PADRAO } from '../data/adedanhaCategorias.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import { usesLocalContent } from '../config/localGames.ts';

const players = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function writing() {
  const s = buildAdedanhaState(players, ['Nome', 'Animal', 'Cor'], 'P', 60);
  return startWriting(s, 1000);
}

test('Adedanha: letra sorteada respeita as excluidas e nao repete enquanto houver opcao', () => {
  for (let i = 0; i < 200; i++) {
    const l = drawLetter([], ADEDANHA_LETRAS_EXCLUIDAS_PADRAO);
    assert.ok(!ADEDANHA_LETRAS_EXCLUIDAS_PADRAO.includes(l), l);
  }
  assert.notEqual(drawLetter(['A'], [], () => 0), 'A');
});

test('Adedanha: comeca com a letra ignorando acento e maiusculas', () => {
  assert.equal(startsWithLetter('  Ébano', 'e'), true);
  assert.equal(startsWithLetter('pato', 'P'), true);
  assert.equal(startsWithLetter('gato', 'P'), false);
  assert.equal(startsWithLetter('', 'P'), false);
});

test('Adedanha: STOP abre a janela e o relogio leva para a validacao', () => {
  let s = writing();
  assert.equal(s.endsAt, 61000);
  s = submitAnswers(s, 'a', ['Paula', 'Pato', 'Preto']);
  s = callStop(s, 'a', 5000);
  assert.equal(s.phase, 'STOPPING');
  assert.equal(tickAdedanha(s, 5000 + ADEDANHA_STOP_GRACE_MS - 1).phase, 'STOPPING');
  assert.equal(tickAdedanha(s, 5000 + ADEDANHA_STOP_GRACE_MS).phase, 'VOTING');
  // fim do tempo vira STOP automatico
  assert.equal(tickAdedanha(writing(), 61000).phase, 'STOPPING');
});

test('Adedanha: 10 unica, 5 repetida, 0 vazia/outra letra/recusada; diretor vence os votos', () => {
  let s = writing();
  s = submitAnswers(s, 'a', ['Paula', 'Pato', 'Preto']);
  s = submitAnswers(s, 'b', ['Pedro', 'pato', 'Gato']);
  s = submitAnswers(s, 'c', ['', 'Peru', 'Prata']);
  s = { ...callStop(s, 'a'), phase: 'VOTING' };
  // c "Prata" (cor) recusada pela maioria
  s = castVote(s, 2, 'c', 'a', false);
  s = castVote(s, 2, 'c', 'b', false);
  assert.equal(verdictOf(s, 2, 'c'), 'voted-out');
  assert.equal(verdictOf(s, 2, 'b'), 'wrong-letter');
  assert.equal(verdictOf(s, 0, 'c'), 'empty');
  const animal = categoryResult(s, 1);
  assert.deepEqual(animal.map((x) => x.points), [5, 5, 10]);
  assert.deepEqual(roundPoints(s), { a: 10 + 5 + 10, b: 10 + 5 + 0, c: 0 + 10 + 0 });
  // o diretor aceita a "Prata"
  s = setOverride(s, 2, 'c', true);
  assert.equal(verdictOf(s, 2, 'c'), 'valid');
  // ninguem vota em si mesmo
  assert.equal(castVote(s, 1, 'a', 'a', false), s);
});

test('Adedanha: a ultima categoria leva ao resumo com os pontos gravados', () => {
  let s = writing();
  s = submitAnswers(s, 'a', ['Paula', 'Pato', 'Preto']);
  s = { ...callStop(s, 'a'), phase: 'VOTING', voteIndex: 2 };
  s = nextCategory(s);
  assert.equal(s.phase, 'SUMMARY');
  assert.equal(s.pointsAwarded?.a, 30);
});

test('Adedanha: 2 a 12 jogadores, individual e conteudo local', () => {
  assert.deepEqual([GAME_LIMITS.adedanha.min, GAME_LIMITS.adedanha.max, GAME_LIMITS.adedanha.teamsRequired], [2, 12, false]);
  assert.equal(usesLocalContent('adedanha'), true);
});
