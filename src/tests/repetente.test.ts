import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allRepetenteSubmitted,
  buildRepetenteGroups,
  buildRepetenteState,
  computeRepetenteResult,
  normalizeAnswer,
  revealRepetente,
  submitRepetenteAnswer,
  tickRepetenteTimer,
  toggleRepetenteOverride
} from '../utils/repetenteEngine.ts';
import { REPETENTE_THEMES, drawRepetenteTheme, normalizeThemeKey } from '../data/repetenteThemes.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import type { RepetenteGameState } from '../types/game.ts';

const players4 = [
  { id: 'a1', team: 'A' as const },
  { id: 'a2', team: 'A' as const },
  { id: 'b1', team: 'B' as const },
  { id: 'b2', team: 'B' as const }
];
const writing = (players = players4, teams: ('A' | 'B')[] = ['A', 'B']): RepetenteGameState => ({
  ...buildRepetenteState({
    theme: 't',
    category: 'c',
    groups: buildRepetenteGroups(players, teams),
    timerSeconds: 30
  }),
  phase: 'WRITING',
  timerActive: true
});
const fill = (s: RepetenteGameState, a: Record<string, string>) =>
  Object.entries(a).reduce((acc, [id, w]) => submitRepetenteAnswer(acc, id, w), s);

test('NOV-05: normaliza acento, caixa, pontuacao e artigo inicial', () => {
  assert.equal(normalizeAnswer('  O Neymar! '), 'neymar');
  assert.equal(normalizeAnswer('Maracanã'), 'maracana');
  assert.equal(normalizeAnswer('Pão   de queijo'), 'pao de queijo');
  assert.notEqual(normalizeAnswer('gato'), normalizeAnswer('gatos'));
  assert.equal(normalizeAnswer('a'), 'a'); // artigo sozinho nao some
});

test('NOV-05: duplas por equipe; sem equipe com 2+ jogadores vira dupla cooperativa', () => {
  const g = buildRepetenteGroups(players4, ['A', 'B']);
  assert.deepEqual(g.map((x) => x.id), ['team-A', 'team-B']);
  const coop = buildRepetenteGroups([{ id: 'x', team: 'A' }, { id: 'y', team: 'B' }], ['A', 'B']);
  assert.deepEqual(coop, [{ id: 'coop', playerIds: ['x', 'y'] }]);
});

test('NOV-05: as duas duplas combinam: 1 ponto para cada', () => {
  let s = writing();
  s = fill(s, { a1: 'Pelé', a2: 'pele', b1: 'Neymar', b2: 'O Neymar' });
  assert.equal(allRepetenteSubmitted(s), true);
  const r = revealRepetente(s).result!;
  assert.deepEqual([r.pointsByTeam.A, r.pointsByTeam.B], [1, 1]);
});

test('NOV-05: so uma dupla combina: ela leva 2 pontos', () => {
  let s = writing();
  s = fill(s, { a1: 'Pelé', a2: 'Pelé', b1: 'Neymar', b2: 'Messi' });
  const r = revealRepetente(s).result!;
  assert.deepEqual([r.pointsByTeam.A, r.pointsByTeam.B], [2, 0]);
});

test('NOV-05: ninguem combina, ninguem pontua; quem nao escreveu nao combina', () => {
  let s = writing();
  s = fill(s, { a1: 'x', a2: 'y', b1: 'z' });
  const r = revealRepetente(s).result!;
  assert.deepEqual([r.pointsByTeam.A, r.pointsByTeam.B], [0, 0]);
  assert.equal(allRepetenteSubmitted(s), false);
});

test('NOV-05: juiz aceita palavras quase iguais e o resultado e recalculado; desfazer volta', () => {
  let s = writing();
  s = fill(s, { a1: 'gato', a2: 'gatos', b1: 'cão', b2: 'cachorro' });
  s = revealRepetente(s);
  assert.equal(s.result!.pointsByTeam.A, 0);
  s = toggleRepetenteOverride(s, 'team-A');
  assert.equal(computeRepetenteResult(s).pointsByTeam.A, 2);
  s = toggleRepetenteOverride(s, 'team-A');
  assert.equal(s.result!.pointsByTeam.A, 0);
});

test('NOV-05: time de 3 so combina quando os 3 escrevem a mesma palavra', () => {
  const trio = [
    { id: 'a1', team: 'A' as const },
    { id: 'a2', team: 'A' as const },
    { id: 'a3', team: 'A' as const },
    { id: 'b1', team: 'B' as const },
    { id: 'b2', team: 'B' as const }
  ];
  let s = fill(writing(trio), { a1: 'sol', a2: 'sol', a3: 'lua', b1: 'x', b2: 'x' });
  assert.deepEqual(revealRepetente(s).result!.groups.map((g) => g.matched), [false, true]);
  s = fill(writing(trio), { a1: 'sol', a2: 'sol', a3: 'Sol', b1: 'x', b2: 'y' });
  assert.deepEqual(revealRepetente(s).result!.groups.map((g) => g.matched), [true, false]);
});

test('NOV-05: modo cooperativo pontua para as duas equipes', () => {
  const duo = [{ id: 'x', team: 'A' as const }, { id: 'y', team: 'B' as const }];
  const r = revealRepetente(fill(writing(duo), { x: 'mar', y: 'Mar' })).result!;
  assert.deepEqual([r.pointsByTeam.A, r.pointsByTeam.B], [1, 1]);
});

test('NOV-05: palavra so entra na fase de escrita e de quem escreve; tempo acaba e revela', () => {
  const ready = { ...writing(), phase: 'READY' as const };
  assert.equal(submitRepetenteAnswer(ready, 'a1', 'x'), ready);
  assert.equal(submitRepetenteAnswer(writing(), 'intruso', 'x').answers.intruso, undefined);
  assert.equal(submitRepetenteAnswer(writing(), 'a1', '   ').answers.a1, undefined);
  const timed = tickRepetenteTimer({ ...writing(), timerSeconds: 1 });
  assert.equal(timed.phase, 'REVEAL');
  assert.ok(timed.result);
});

test('NOV-05: banco de temas sem repeticao e limites 2 a 8 em equipes', () => {
  const keys = REPETENTE_THEMES.map((x) => normalizeThemeKey(x.tema));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(REPETENTE_THEMES.length >= 90);
  assert.ok(REPETENTE_THEMES.some((x) => x.origem === 'programa'));
  assert.equal(drawRepetenteTheme(new Set(keys)).tema.length > 0, true);
  assert.deepEqual([GAME_LIMITS.repetente.min, GAME_LIMITS.repetente.max, GAME_LIMITS.repetente.teamsRequired], [2, 8, true]);
});
