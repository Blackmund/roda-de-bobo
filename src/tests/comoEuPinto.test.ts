import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_POINTS_PER_STROKE,
  MAX_STROKES,
  addStroke,
  buildComoEuPintoState,
  clearDrawing,
  endDrawing,
  finishSteal,
  markDrawn,
  pickPintoPair,
  pintoRoundPoints,
  remainingWords,
  sanitizeStroke,
  skipWord,
  stealWord,
  tickPintoTimer,
  undoStroke
} from '../utils/comoEuPintoEngine.ts';
import { DESENHO_WORDS, drawDesenhoWords, normalizeDesenhoWord } from '../data/desenhoWords.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import { usesLocalContent } from '../config/localGames.ts';
import type { ComoEuPintoState, DrawStroke } from '../types/game.ts';

const stroke = (n = 3): DrawStroke => ({
  points: Array.from({ length: n }, (_, i) => [i / 10, i / 10] as [number, number]),
  color: '#E6194B',
  width: 0.008
});
const playing = (rival = true): ComoEuPintoState => ({
  ...buildComoEuPintoState({
    words: ['a', 'b', 'c'],
    drawTeam: 'A',
    rivalTeam: rival ? 'B' : undefined,
    drawerPlayerId: 'd',
    guesserPlayerId: 'g',
    timerSeconds: 120
  }),
  phase: 'PLAYING',
  timerActive: true
});

test('NOV-07: tracos sao validados e limitados', () => {
  assert.equal(sanitizeStroke({ points: [], color: '#fff', width: 0.01 }), null);
  const s = sanitizeStroke({ points: [[-1, 2], [0.12345, 0.5]], color: 'javascript:x', width: 9 })!;
  assert.deepEqual(s.points, [[0, 1], [0.123, 0.5]]);
  assert.equal(s.color, '#F5F2EB');
  assert.equal(s.width, 0.05);
  const huge = sanitizeStroke({ points: Array.from({ length: 5000 }, () => [0.5, 0.5] as [number, number]), color: '#fff', width: 0.01 })!;
  assert.equal(huge.points.length, MAX_POINTS_PER_STROKE);
  let st = playing();
  for (let i = 0; i < MAX_STROKES + 20; i++) st = addStroke(st, stroke());
  assert.equal(st.strokes.length, MAX_STROKES);
});

test('NOV-07: desenhar, desfazer e limpar so na fase de desenho', () => {
  let s = playing();
  s = addStroke(s, stroke());
  s = addStroke(s, stroke());
  assert.equal(s.strokes.length, 2);
  s = undoStroke(s);
  assert.equal(s.strokes.length, 1);
  s = clearDrawing(s);
  assert.equal(s.strokes.length, 0);
  const ready = { ...playing(), phase: 'READY' as const };
  assert.equal(addStroke(ready, stroke()), ready);
});

test('NOV-07: acertar guarda o desenho, limpa o canvas e vai para a proxima; tudo certo fecha a rodada', () => {
  let s = playing();
  s = addStroke(s, stroke());
  s = markDrawn(s);
  assert.equal(s.outcomes[0], 'correct');
  assert.equal(s.currentIndex, 1);
  assert.equal(s.strokes.length, 0);
  assert.equal(s.drawings[0].length, 1);
  s = markDrawn(s);
  s = markDrawn(s);
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(pintoRoundPoints(s), { draw: 3, rival: 0 });
});

test('NOV-07: pular volta depois e mantem o desenho de cada palavra', () => {
  let s = playing();
  s = addStroke(s, stroke());
  s = skipWord(s);
  assert.equal(s.currentIndex, 1);
  assert.equal(s.strokes.length, 0);
  s = skipWord(s);
  s = skipWord(s); // volta para a palavra 0, com o desenho guardado
  assert.equal(s.currentIndex, 0);
  assert.equal(s.strokes.length, 1);
  const single = markDrawn(markDrawn(playing()));
  assert.equal(skipWord(single), single); // so resta uma palavra: nao pula
});

test('NOV-07: acabou o tempo com palavras faltando -> dupla rival rouba (1 ponto cada)', () => {
  let s = playing();
  s = markDrawn(s); // 1 acerto
  s = tickPintoTimer({ ...s, timerSeconds: 1 });
  assert.equal(s.phase, 'STEAL');
  assert.equal(remainingWords(s), 2);
  s = stealWord(s, 1);
  assert.equal(s.phase, 'STEAL');
  assert.equal(stealWord(s, 1), s); // nao rouba duas vezes
  s = finishSteal(s);
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(pintoRoundPoints(s), { draw: 1, rival: 1 });
});

test('NOV-07: roubar todas as que faltam fecha direto; sem rival (2 jogadores) vai ao resumo', () => {
  let s = endDrawing(markDrawn(playing()));
  s = stealWord(stealWord(s, 1), 2);
  assert.equal(s.phase, 'SUMMARY');
  assert.deepEqual(pintoRoundPoints(s), { draw: 1, rival: 2 });
  assert.equal(endDrawing(playing(false)).phase, 'SUMMARY');
});

test('NOV-07: quem desenha reveza dentro da equipe', () => {
  const players = [
    { id: 'a1', team: 'A' as const },
    { id: 'b1', team: 'B' as const },
    { id: 'a2', team: 'A' as const },
    { id: 'b2', team: 'B' as const }
  ];
  assert.deepEqual(pickPintoPair(players, 'A', 1, 2), { drawerPlayerId: 'a1', guesserPlayerId: 'a2' });
  assert.deepEqual(pickPintoPair(players, 'A', 3, 2), { drawerPlayerId: 'a2', guesserPlayerId: 'a1' });
});

test('NOV-07: banco sem repeticao, sem palavras com numero e limites em equipes', () => {
  const keys = DESENHO_WORDS.map((w) => normalizeDesenhoWord(w.palavra));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(DESENHO_WORDS.length >= 100);
  assert.ok(DESENHO_WORDS.some((w) => w.origem === 'programa'));
  const picks = drawDesenhoWords(3);
  assert.equal(new Set(picks.map((p) => p.palavra)).size, 3);
  assert.equal(drawDesenhoWords(3, new Set(keys)).length, 3);
  assert.deepEqual([GAME_LIMITS['como-eu-pinto'].min, GAME_LIMITS['como-eu-pinto'].max, GAME_LIMITS['como-eu-pinto'].teamsRequired], [2, 8, true]);
  assert.equal(usesLocalContent('como-eu-pinto'), true);
});
