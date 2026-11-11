import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addClue,
  applyMegaOutcome,
  buildMegaResenhaState,
  finishMegaRound,
  overruleClue,
  sharesRadical,
  tickMegaTimer,
  validateClue
} from '../utils/megaResenhaEngine.ts';
import { drawMegaResenhaWords, MEGA_RESENHA_WORDS, normalizeMegaWord } from '../data/megaResenhaWords.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import type { MegaResenhaGameState } from '../types/game.ts';

const playing = (words = ['Artilheiro', 'Escanteio', 'Pluto']): MegaResenhaGameState => ({
  ...buildMegaResenhaState({ words, team: 'A', giverPlayerId: 'g', guesserPlayerId: 'v', timerSeconds: 60 }),
  phase: 'PLAYING',
  timerActive: true
});

test('NOV-03: dica valida e UMA palavra de outro radical', () => {
  assert.equal(validateClue('Artilheiro', 'goleador').ok, true);
  assert.equal(validateClue('Artilheiro', 'campeonato').ok, true);
  assert.equal(validateClue('Escanteio', 'torcida').ok, true);
});

test('NOV-03: dica com varias palavras, vazia ou igual a palavra e invalida', () => {
  assert.match(validateClue('Artilheiro', 'quem faz gol').reason!, /UMA palavra/);
  assert.match(validateClue('Pão de queijo', 'queijo').reason!, /própria palavra/);
  assert.equal(validateClue('Artilheiro', '   ').ok, false);
  assert.match(validateClue('Faixa de pedestre', 'pé-de-moleque').reason!, /UMA palavra/);
});

test('NOV-03: mesmo radical e barrado (com e sem acento)', () => {
  assert.equal(validateClue('Artilheiro', 'artilharia').ok, false);
  assert.equal(validateClue('Goleiro', 'goleada').ok, false);
  assert.equal(validateClue('Gol', 'goleador').ok, false);
  assert.equal(validateClue('Mictório', 'MICTORIO').ok, false);
  assert.equal(sharesRadical('cobertura', 'encobrir'), false); // prefixo diferente: so o juiz resolve
});

test('NOV-03: palavras diferentes nao sao barradas so por letra inicial', () => {
  assert.equal(validateClue('Carnaval', 'cavalo').ok, true);
  assert.equal(validateClue('Pizza', 'pipoca').ok, true);
  assert.equal(validateClue('Pluto', 'cachorro').ok, true);
});

test('NOV-03: dicas ficam registradas por palavra e a invalida marca o aviso', () => {
  let s = playing();
  s = addClue(s, 'goleador');
  s = addClue(s, 'artilharia');
  assert.deepEqual(s.clues[0].map((c) => c.valid), [true, false]);
  assert.match(s.lastEvent!, /Dica inválida/);
  s = overruleClue(s, 0, 1);
  assert.equal(s.clues[0][1].valid, true);
  assert.equal(s.clues[0][1].overruled, true);
  assert.equal(addClue(s, '  ').clues[0].length, 2);
});

test('NOV-03: acerto soma 1, pulada volta e a rodada fecha ao acertar tudo', () => {
  let s = playing();
  s = applyMegaOutcome(s, 'skipped');
  assert.equal(s.currentIndex, 1);
  s = applyMegaOutcome(s, 'correct');
  s = applyMegaOutcome(s, 'correct');
  assert.equal(s.currentIndex, 0);
  s = applyMegaOutcome(s, 'correct');
  assert.equal(s.roundScore, 3);
  assert.equal(s.phase, 'SUMMARY');
});

test('NOV-03: o tempo acaba e encerra; encerrar manualmente guarda os acertos', () => {
  let s = { ...playing(), timerSeconds: 1 };
  s = tickMegaTimer(s);
  assert.equal(s.phase, 'SUMMARY');
  let t = applyMegaOutcome(playing(), 'correct');
  t = finishMegaRound(t);
  assert.equal(t.roundScore, 1);
  assert.equal(t.phase, 'SUMMARY');
});

test('NOV-03: banco com palavras unicas, origem declarada e sorteio de 5 sem repetir', () => {
  const keys = MEGA_RESENHA_WORDS.map((m) => normalizeMegaWord(m.palavra));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(MEGA_RESENHA_WORDS.length >= 150);
  assert.ok(MEGA_RESENHA_WORDS.some((m) => m.origem === 'programa'));
  const picks = drawMegaResenhaWords(5);
  assert.equal(new Set(picks.map((p) => p.palavra)).size, 5);
  const all = new Set(keys);
  assert.equal(drawMegaResenhaWords(5, all).length, 5);
  assert.deepEqual([GAME_LIMITS['mega-resenha'].min, GAME_LIMITS['mega-resenha'].max], [2, 8]);
});
