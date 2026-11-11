import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMimicaOutcome,
  buildMimicaState,
  finishMimicaRound,
  mimicaRoundValue,
  pickMimicaPair,
  tickMimicaTimer,
  undoMimicaCorrect
} from '../utils/mimicaEngine.ts';
import { drawMimicaWords, MIMICA_WORDS, normalizeMimicaWord } from '../data/mimicaWords.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import { hasShowRuleset, applyRuleset } from '../config/rulesets.ts';
import { DEFAULT_GAME_CUSTOM_CONFIG, type MimicaGameState } from '../types/game.ts';

const playing = (words = ['a', 'b', 'c'], value = 1): MimicaGameState => ({
  ...buildMimicaState({
    words,
    mimeTeam: 'A',
    mimePlayerId: 'p1',
    guesserPlayerId: 'p2',
    timerSeconds: 90,
    roundNumber: 1,
    config: null
  }),
  roundValue: value,
  phase: 'PLAYING',
  timerActive: true
});

test('NOV-01: valor da rodada cresce de 1 a 3 no programa e fica em 1 na casa', () => {
  const show = { ...DEFAULT_GAME_CUSTOM_CONFIG, ruleset: 'show' as const };
  assert.deepEqual([1, 2, 3, 4, 9].map((r) => mimicaRoundValue(r, show)), [1, 2, 3, 3, 3]);
  assert.deepEqual([1, 2, 3].map((r) => mimicaRoundValue(r, DEFAULT_GAME_CUSTOM_CONFIG)), [1, 1, 1]);
});

test('NOV-01: acertar soma o valor da rodada e a rodada fecha quando todas foram acertadas', () => {
  let s = playing(['a', 'b', 'c'], 2);
  s = applyMimicaOutcome(s, 'correct');
  s = applyMimicaOutcome(s, 'correct');
  assert.equal(s.roundScore, 4);
  assert.equal(s.phase, 'PLAYING');
  s = applyMimicaOutcome(s, 'correct');
  assert.equal(s.roundScore, 6);
  assert.equal(s.phase, 'SUMMARY');
  assert.equal(s.timerActive, false);
});

test('NOV-01: palavra pulada pode voltar e ainda pontuar; ao acabar o tempo nao conta', () => {
  let s = playing(['a', 'b', 'c']);
  s = applyMimicaOutcome(s, 'skipped'); // a pulada, vai para b
  assert.equal(s.currentIndex, 1);
  s = applyMimicaOutcome(s, 'correct'); // b certa, vai para c
  s = applyMimicaOutcome(s, 'correct'); // c certa, volta para a
  assert.equal(s.currentIndex, 0);
  assert.equal(s.phase, 'PLAYING');
  s = applyMimicaOutcome(s, 'correct');
  assert.equal(s.roundScore, 3);
  assert.equal(s.phase, 'SUMMARY');

  const early = finishMimicaRound(applyMimicaOutcome(playing(['a', 'b', 'c']), 'skipped'));
  assert.equal(early.phase, 'SUMMARY');
  assert.equal(early.roundScore, 0);
});

test('NOV-01: pular a unica palavra restante nao quebra', () => {
  let s = playing(['a']);
  s = applyMimicaOutcome(s, 'skipped');
  assert.equal(s.currentIndex, 0);
  assert.equal(s.phase, 'PLAYING');
});

test('NOV-01: cronometro conta e encerra em zero; desfazer acerto devolve a palavra', () => {
  let s = { ...playing(), timerSeconds: 2 };
  s = tickMimicaTimer(s);
  assert.equal(s.timerSeconds, 1);
  s = tickMimicaTimer(s);
  assert.equal(s.phase, 'SUMMARY');
  assert.equal(s.timerSeconds, 0);

  let t = playing(['a', 'b'], 2);
  t = applyMimicaOutcome(t, 'correct');
  assert.equal(t.roundScore, 2);
  t = undoMimicaCorrect(t, 0);
  assert.equal(t.roundScore, 0);
  assert.equal(t.currentIndex, 0);
  assert.equal(t.outcomes[0], 'pending');
});

test('NOV-01: mimico e parceiro revezam dentro da equipe', () => {
  const players = [
    { id: 'a1', team: 'A' as const },
    { id: 'b1', team: 'B' as const },
    { id: 'a2', team: 'A' as const },
    { id: 'b2', team: 'B' as const }
  ];
  const r1 = pickMimicaPair(players, 'A', 1, 2);
  const r3 = pickMimicaPair(players, 'A', 3, 2);
  assert.equal(r1.mimePlayerId, 'a1');
  assert.equal(r1.guesserPlayerId, 'a2');
  assert.equal(r3.mimePlayerId, 'a2');
  assert.equal(r3.guesserPlayerId, 'a1');
  // 1x1: o parceiro e o outro jogador da sala
  const duo = pickMimicaPair([{ id: 'x', team: 'A' }, { id: 'y', team: 'B' }], 'A', 1, 2);
  assert.deepEqual(duo, { mimePlayerId: 'x', guesserPlayerId: 'y' });
});

test('NOV-01: sorteio traz 3 palavras diferentes, evita usadas e mistura categorias', () => {
  const picks = drawMimicaWords(3);
  assert.equal(new Set(picks.map((p) => p.palavra)).size, 3);
  assert.equal(new Set(picks.map((p) => p.categoria)).size, 3);
  const used = new Set(MIMICA_WORDS.slice(0, MIMICA_WORDS.length - 5).map((m) => normalizeMimicaWord(m.palavra)));
  const next = drawMimicaWords(3, { used });
  assert.ok(next.every((m) => !used.has(normalizeMimicaWord(m.palavra))) || MIMICA_WORDS.length - used.size < 3);
  // banco todo usado: recomeca em vez de travar
  const all = new Set(MIMICA_WORDS.map((m) => normalizeMimicaWord(m.palavra)));
  assert.equal(drawMimicaWords(3, { used: all }).length, 3);
});

test('NOV-01: banco sem palavras repetidas e com origem declarada', () => {
  const keys = MIMICA_WORDS.map((m) => normalizeMimicaWord(m.palavra));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(MIMICA_WORDS.length >= 150);
  assert.ok(MIMICA_WORDS.some((m) => m.origem === 'programa'));
});

test('NOV-01: limites de jogadores e preset do programa', () => {
  assert.deepEqual([GAME_LIMITS.mimica.min, GAME_LIMITS.mimica.max, GAME_LIMITS.mimica.teamsRequired], [2, 8, true]);
  assert.equal(hasShowRuleset('mimica'), true);
  const cfg = applyRuleset('mimica', DEFAULT_GAME_CUSTOM_CONFIG, 'show');
  assert.equal(cfg.ruleset, 'show');
});
