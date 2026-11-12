import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CT_DISCARD_PENALTY,
  actingPlayers,
  allOrientations,
  boardFor,
  buildBag,
  buildComTerraState,
  canPlaceAt,
  canTarget,
  cellAt,
  currentPlayerId,
  discardPiece,
  flipH,
  flipV,
  forceAdvance,
  hasAnyPlacement,
  mulberry32,
  parseShape,
  pickPiece,
  placePiece,
  playerStage,
  resolveAction,
  rotateCW,
  sabotage,
  shapeCells,
  skipSabotage
} from '../utils/comTerraEngine.ts';
import { GAME_LIMITS } from '../config/gameLimits.ts';
import { usesLocalContent } from '../config/localGames.ts';
import { computeRoundTeamPoints } from '../utils/roundPoints.ts';
import type { CTBoard, CTPiece, ComTerraState } from '../types/game.ts';

const P = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const piece = (rows: string[], uid = 'x'): CTPiece => {
  const shape = parseShape(rows);
  const size = shapeCells(shape).length;
  return { uid, shape, size, pts: [0, 1, 2, 3, 5, 7, 9, 12][size] };
};
/** tabuleiro limpo, para testar a regra sem depender do sorteio */
const clear = (s: ComTerraState): ComTerraState => ({
  ...s,
  boards: s.boards.map((b) => ({
    ...b,
    cells: b.cells.map((c) => ({ t: c.t, z: c.z }))
  }))
});
const setCell = (s: ComTerraState, boardIdx: number, x: number, y: number, patch: object): ComTerraState => ({
  ...s,
  boards: s.boards.map((b, i) =>
    i !== boardIdx ? b : { ...b, cells: b.cells.map((c, k) => (k === y * b.w + x ? { ...c, ...patch } : c)) }
  )
});
const give = (s: ComTerraState, pid: string, p: CTPiece): ComTerraState => ({ ...s, hand: { ...s.hand, [pid]: p } });

test('CT: girar e espelhar preservam blocos solidos (1) e furos (2)', () => {
  const m = parseShape(['12', '10']);
  assert.deepEqual(rotateCW(m), [
    [1, 1],
    [0, 2]
  ]);
  assert.deepEqual(flipH(m), [
    [2, 1],
    [0, 1]
  ]);
  assert.deepEqual(flipV(m), [
    [1, 0],
    [1, 2]
  ]);
  for (const o of allOrientations(m)) {
    const cells = shapeCells(o);
    assert.equal(cells.length, 3);
    assert.equal(cells.filter((c) => c.k === 2).length, 1);
  }
  assert.equal(allOrientations(parseShape(['11', '11'])).length, 1);
  assert.equal(allOrientations(m).length, 8); // o furo quebra a simetria do L
});

test('CT: o saco tem pecas de 1 a 7 e os pontos crescem com o numero', () => {
  const bag = buildBag(mulberry32(1), 't');
  const sizes = new Set(bag.map((p) => p.size));
  assert.deepEqual([...sizes].sort(), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(bag.some((p) => p.shape.flat().includes(2)), 'ha pecas com furo');
  assert.equal(new Set(bag.map((p) => p.uid)).size, bag.length);
  const pts = [1, 2, 3, 4, 5, 6, 7].map((n) => bag.find((p) => p.size === n)!.pts);
  assert.deepEqual(pts, [...pts].sort((a, b) => a - b));
});

test('CT Arquiteto: um tabuleiro 8x8 igual para cada jogador, loja com 5 pecas e turnos em rodizio', () => {
  const s = buildComTerraState('arquiteto', P, 8, 42);
  assert.equal(s.boards.length, 3);
  assert.deepEqual(s.boards.map((b) => [b.w, b.h, b.owner]), [
    [8, 8, 'a'],
    [8, 8, 'b'],
    [8, 8, 'c']
  ]);
  assert.deepEqual(s.boards[0].cells, s.boards[1].cells);
  assert.equal(s.shop.length, 5);
  assert.equal(currentPlayerId(s), 'a');
  assert.deepEqual(actingPlayers(s), ['a']);
  assert.equal(playerStage(s, 'a'), 'pick');
  assert.equal(playerStage(s, 'b'), 'wait');
  // fora da vez nao compra
  assert.equal(pickPiece(s, 'b', s.shop[0].uid), s);
});

test('CT: comprar e irreversivel, tira a peca da loja e a loja repoe', () => {
  const s = buildComTerraState('arquiteto', P, 8, 42);
  const uid = s.shop[2].uid;
  const n = pickPiece(s, 'a', uid);
  assert.equal(n.hand.a.uid, uid);
  assert.ok(!n.shop.some((p) => p.uid === uid));
  assert.equal(n.shop.length, 5);
  assert.equal(playerStage(n, 'a'), 'place');
  // ja tem peca na mao: nao compra outra
  assert.equal(pickPiece(n, 'a', n.shop[0].uid), n);
});

test('CT: bloco solido nunca cobre arvore; o furo cobre e vale +2', () => {
  let s = clear(buildComTerraState('arquiteto', P, 8, 1));
  s = setCell(s, 0, 1, 0, { tree: true });
  const p = piece(['12']);
  s = give(s, 'a', p);
  assert.equal(canPlaceAt(s, 'a', p.shape, 1, 0).ok, false); // solido em cima da arvore
  assert.equal(canPlaceAt(s, 'a', p.shape, 0, 0).ok, true); // furo em cima da arvore
  const n = placePiece(s, 'a', p.shape, 0, 0);
  assert.equal(n.pointsAwarded.a, 2 + 2);
  assert.equal(cellAt(boardFor(n, 'a'), 1, 0)?.tree, true); // a arvore continua la, dentro do furo
  assert.equal(cellAt(boardFor(n, 'a'), 1, 0)?.k, 2);
  assert.equal(currentPlayerId(n), 'b');
});

test('CT: ficha coberta por bloco solido e coletada; dentro do furo fica e nao pontua', () => {
  let s = clear(buildComTerraState('arquiteto', P, 8, 1));
  s = setCell(s, 0, 0, 0, { tok: 2 });
  s = setCell(s, 0, 1, 0, { tok: -1 });
  const p = piece(['12']);
  s = give(s, 'a', p);
  const n = placePiece(s, 'a', p.shape, 0, 0);
  assert.equal(n.pointsAwarded.a, 2 + 2); // peca 2 + ficha +2; a ficha -1 ficou dentro do furo
  const b = boardFor(n, 'a');
  assert.equal(cellAt(b, 0, 0)?.tok, undefined);
  assert.equal(cellAt(b, 1, 0)?.tok, -1);
});

test('CT: fora do tabuleiro, em cima de outra peca e orientacao inventada nao valem', () => {
  let s = clear(buildComTerraState('arquiteto', P, 8, 1));
  const p = piece(['111']);
  s = give(s, 'a', p);
  assert.equal(canPlaceAt(s, 'a', p.shape, 6, 0).ok, false);
  assert.equal(placePiece(s, 'a', p.shape, 6, 0), s);
  assert.equal(placePiece(s, 'a', [[1, 1, 1, 1]], 0, 0), s);
  s = setCell(s, 0, 1, 0, { o: 'a', k: 1, p: 'old' });
  assert.equal(canPlaceAt(s, 'a', p.shape, 0, 0).ok, false);
});

test('CT: descartar custa 3 pontos e passa a vez', () => {
  let s = clear(buildComTerraState('arquiteto', P, 8, 1));
  s = give(s, 'a', piece(['11']));
  const n = discardPiece(s, 'a');
  assert.equal(n.pointsAwarded.a, -CT_DISCARD_PENALTY);
  assert.equal(n.hand.a, undefined);
  assert.equal(currentPlayerId(n), 'b');
});

test('CT: peca sem encaixe possivel e detectada', () => {
  let s = clear(buildComTerraState('arquiteto', P, 8, 1));
  const b = s.boards[0];
  s = { ...s, boards: [{ ...b, cells: b.cells.map((c, i) => (i === 0 ? c : { ...c, o: 'a', k: 1 as const, p: 'w' })) }, ...s.boards.slice(1)] };
  assert.equal(hasAnyPlacement(s, 'a', piece(['11'])), false);
  assert.equal(hasAnyPlacement(s, 'a', piece(['1'])), true);
});

test('CT Arquiteto: linha cheia vale +2', () => {
  let s = clear(buildComTerraState('arquiteto', P, 8, 1));
  for (let x = 0; x < 7; x++) s = setCell(s, 0, x, 0, { o: 'a', k: 1, p: 'w' });
  const p = piece(['1']);
  s = give(s, 'a', p);
  const n = placePiece(s, 'a', p.shape, 7, 0);
  assert.equal(n.pointsAwarded.a, 1 + 2);
});

test('CT: cobrir icone de acao com bloco solido da a acao; arvore nao vai em cima de ficha', () => {
  let s = clear(buildComTerraState('arquiteto', P, 8, 1));
  s = setCell(s, 0, 0, 0, { act: 'tree' });
  s = setCell(s, 0, 5, 5, { tok: 1 });
  const p = piece(['1']);
  s = give(s, 'a', p);
  let n = placePiece(s, 'a', p.shape, 0, 0);
  assert.equal(playerStage(n, 'a'), 'action');
  assert.equal(currentPlayerId(n), 'a');
  assert.equal(canTarget(n, 'a', 5, 5), false); // tem ficha
  assert.equal(canTarget(n, 'a', 0, 0), false); // tem peca
  assert.equal(resolveAction(n, 'a', 5, 5), n);
  n = resolveAction(n, 'a', 3, 3);
  assert.equal(cellAt(boardFor(n, 'a'), 3, 3)?.tree, true);
  assert.equal(currentPlayerId(n), 'b');
});

test('CT Arquiteto: depois de todas as rodadas a partida vai para o resultado', () => {
  let s = buildComTerraState('arquiteto', [{ id: 'a' }, { id: 'b' }], 3, 7);
  let guard = 0;
  while (s.phase !== 'SUMMARY' && guard++ < 50) {
    const pid = currentPlayerId(s)!;
    s = pickPiece(s, pid, s.shop[0].uid);
    s = discardPiece(s, pid);
  }
  assert.equal(s.phase, 'SUMMARY');
  assert.equal(guard, 6);
  assert.deepEqual(s.pointsAwarded, { a: -9, b: -9 });
  // a segunda rodada comeca por quem jogou por ultimo na primeira
  const r2 = buildComTerraState('arquiteto', [{ id: 'a' }, { id: 'b' }], 3, 7);
  let t = discardPiece(pickPiece(r2, 'a', r2.shop[0].uid), 'a');
  t = discardPiece(pickPiece(t, 'b', t.shop[0].uid), 'b');
  assert.equal(t.round, 2);
  assert.equal(currentPlayerId(t), 'b');
});

test('CT Plano do Diabo: 3 fases, e joga primeiro quem pegou a peca de menor numero', () => {
  let s = buildComTerraState('diabo', P, 6, 99);
  assert.equal(s.boards.length, 1);
  assert.equal(s.phase, 'PICK');
  assert.equal(s.shop.length, P.length + 2);
  assert.deepEqual(actingPlayers(s), ['a', 'b', 'c']);
  const bySize = [...s.shop].sort((x, y) => x.size - y.size);
  const big = bySize[bySize.length - 1];
  const small = bySize[0];
  const mid = bySize[1];
  s = pickPiece(s, 'a', big.uid);
  // a peca que 'a' levou nao esta mais na loja para os outros
  assert.equal(pickPiece(s, 'b', big.uid), s);
  s = pickPiece(s, 'b', mid.uid);
  assert.equal(s.phase, 'PICK');
  s = pickPiece(s, 'c', small.uid);
  assert.equal(s.phase, 'SABOTAGE');
  assert.equal(s.shop.length, 2); // no Diabo a loja nao repoe no meio da rodada

  // sabotagem: uma arvore no mapa de todos
  const b = s.boards[0];
  const free = b.cells.findIndex((c, i) => canTarget(s, 'a', i % b.w, Math.floor(i / b.w)));
  const fx = free % b.w;
  const fy = Math.floor(free / b.w);
  s = sabotage(s, 'a', 'tree', fx, fy);
  assert.equal(cellAt(s.boards[0], fx, fy)?.tree, true);
  assert.equal(playerStage(s, 'a'), 'wait');
  assert.equal(sabotage(s, 'b', 'tok', fx, fy, -1), s); // casa ja ocupada
  s = skipSabotage(s, 'b');
  s = skipSabotage(s, 'c');
  assert.equal(s.phase, 'PLACE');
  assert.equal(s.queue[0], 'c');
  assert.equal(s.queue[s.queue.length - 1], 'a');
  assert.equal(currentPlayerId(s), 'c');

  s = discardPiece(s, 'c');
  s = discardPiece(s, s.queue[1]);
  s = discardPiece(s, 'a');
  assert.equal(s.round, 2);
  assert.equal(s.phase, 'PICK');
  assert.equal(s.shop.length, P.length + 2);
  assert.deepEqual(s.hand, {});
});

test('CT Fronteiras: comeca na propria base, cresce em trilha continua e nao entra na base alheia', () => {
  let s = buildComTerraState('fronteiras', [{ id: 'a' }, { id: 'b' }], 8, 5);
  const b: CTBoard = s.boards[0];
  assert.equal(b.cells.filter((c) => c.z === 'a').length, 25);
  assert.equal(b.cells.filter((c) => c.z === 'b').length, 25);
  assert.equal(b.cells.filter((c) => c.z === 'ilha').length, 64);
  s = clear(s);
  const p = piece(['1']);
  s = give(s, 'a', p);
  // base de 'a': x 6..10, y 0..4; ilha: 5..12
  assert.equal(canPlaceAt(s, 'a', p.shape, 7, 6).ok, false); // a primeira peca nao pode nascer na ilha
  assert.equal(canPlaceAt(s, 'a', p.shape, 8, 16).ok, false); // base do outro
  assert.equal(canPlaceAt(s, 'a', p.shape, 7, 4).ok, true);
  s = placePiece(s, 'a', p.shape, 7, 4);
  s = give({ ...s, turnIdx: 0 }, 'a', piece(['1'], 'y'));
  assert.equal(canPlaceAt(s, 'a', p.shape, 10, 6).ok, false); // solta, longe da trilha
  assert.equal(canPlaceAt(s, 'a', p.shape, 7, 5).ok, true); // encostada: entra na ilha
});

test('CT: o diretor destrava a partida quando alguem some', () => {
  let s = buildComTerraState('diabo', P, 6, 3);
  s = pickPiece(s, 'a', s.shop[0].uid);
  s = forceAdvance(s);
  assert.equal(s.phase, 'SABOTAGE');
  assert.ok(s.hand.b && s.hand.c);
  s = forceAdvance(s);
  assert.equal(s.phase, 'PLACE');
  const first = currentPlayerId(s)!;
  const before = s.pointsAwarded[first];
  s = forceAdvance(s);
  assert.equal(s.pointsAwarded[first], before); // pular a vez nao tira pontos
  assert.notEqual(currentPlayerId(s), first);
});

test('CT no hub: limites, conteudo local e pontos no placar das equipes', () => {
  assert.deepEqual([GAME_LIMITS['com-terra'].min, GAME_LIMITS['com-terra'].max], [2, 4]);
  assert.equal(usesLocalContent('com-terra'), true);
  const ct = { ...buildComTerraState('arquiteto', [{ id: 'a' }, { id: 'b' }], 3, 1), pointsAwarded: { a: 7, b: -2 } };
  const room: any = {
    activeGame: 'com-terra',
    comTerra: ct,
    players: [
      { id: 'a', team: 'A' },
      { id: 'b', team: 'B' }
    ]
  };
  const pts = computeRoundTeamPoints(room);
  assert.equal(pts.A, 7);
  assert.equal(pts.B, -2);
});
