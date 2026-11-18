import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildComTerraState,
  canPlaceAt,
  canSabotage,
  canTarget,
  currentPlayerId,
  discardPiece,
  finishNow,
  forceAdvance,
  hasAnyPlacement,
  mulberry32,
  pickPiece,
  placePiece,
  playerStage,
  sabotage,
  shapeCells
} from '../utils/comTerraEngine.ts';
import {
  DIABO_CONTRACTS,
  buildDiaboBag,
  buildDiaboMap,
  components,
  diaboMapSize,
  newSquare,
  parseRows,
  squareBonus
} from '../utils/diaboMap.ts';
import type { CTBoard, CTCell, CTPiece, ComTerraState } from '../types/game.ts';

const P = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

const piece = (code: string, uid = 'x', extra: Partial<CTPiece> = {}): CTPiece => {
  const shape = parseRows(code);
  const size = shapeCells(shape).length;
  return { uid, shape, size, pts: size, ...extra };
};

/** mapa limpo 10x10 de terra (e agua onde pedir), para testar regra sem sorteio */
const clean = (s: ComTerraState, water: Array<[number, number]> = []): ComTerraState => {
  const cells: CTCell[] = Array.from({ length: 100 }, () => ({ t: 1 as const }));
  water.forEach(([x, y]) => (cells[y * 10 + x].t = 2));
  return { ...s, boards: [{ id: 'mapa', w: 10, h: 10, owner: null, cells }] };
};

/** poe a peca na mao de `pid` e faz ser a vez dele */
const give = (s: ComTerraState, pid: string, p: CTPiece): ComTerraState => ({
  ...s,
  phase: 'TURN',
  queue: s.order,
  turnIdx: s.order.indexOf(pid),
  hand: { ...s.hand, [pid]: p },
  pending: []
});

const at = (s: ComTerraState, x: number, y: number) => s.boards[0].cells[y * s.boards[0].w + x];

test('Diabo: mapa procedural maior, deterministico pela semente e com tudo que o jogo precisa', () => {
  assert.deepEqual([2, 3, 4].map(diaboMapSize), [14, 16, 18]);
  for (const n of [2, 3, 4]) {
    for (let seed = 1; seed <= 25; seed++) {
      const b = buildDiaboMap(n, mulberry32(seed));
      assert.equal(b.w, diaboMapSize(n));
      const land = b.cells.filter((c) => c.t === 1).length;
      assert.ok(land >= b.w * b.h * 0.4, `terra suficiente (n=${n}, seed=${seed})`);
      assert.ok(b.cells.some((c) => c.t === 2), 'tem agua');
      assert.ok(b.cells.filter((c) => c.tree).length >= 4, 'tem bosques');
      assert.ok(b.cells.some((c) => c.tok === 2) && b.cells.some((c) => c.tok === -1), 'tem fichas');
      assert.ok(b.cells.some((c) => c.act === 'tree') && b.cells.some((c) => c.act === 'tok'), 'tem icones');
      // a ilha (terra + agua) e uma massa so
      assert.equal(components(b.w, b.h, (i) => b.cells[i].t !== 0).length, 1);
    }
  }
  const a = buildDiaboMap(3, mulberry32(42));
  const b = buildDiaboMap(3, mulberry32(42));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, buildDiaboMap(3, mulberry32(43)));
});

test('Diabo: saco com 1 a 8 blocos, furos, pontes e 2 Pecas do Diabo', () => {
  const bag = buildDiaboBag(mulberry32(1), 't');
  const sizes = new Set(bag.map((p) => p.size));
  for (let k = 1; k <= 8; k++) assert.ok(sizes.has(k), `tem peca de ${k}`);
  assert.ok(bag.some((p) => p.shape.flat().includes(2)), 'tem furo');
  assert.ok(bag.some((p) => p.shape.flat().includes(3)), 'tem ponte');
  assert.equal(bag.filter((p) => p.devil).length, 2);
  bag.forEach((p) => assert.equal(p.pts, p.devil ? -1 : p.size));
  assert.ok(new Set(bag.map((p) => JSON.stringify(p.shape))).size >= 60, 'catalogo de ~70 formas');
});

test('Diabo: turnos em rodizio fixo, loja aberta reposta na hora e quem comeca gira por rodada', () => {
  let s = buildComTerraState('diabo', P, 4, 9);
  assert.equal(s.phase, 'TURN');
  assert.equal(s.shop.length, P.length + 3);
  assert.deepEqual(s.devils, { a: 3, b: 3, c: 3 });
  assert.equal(currentPlayerId(s), 'a');
  assert.equal(playerStage(s, 'b'), 'wait');
  const uid = s.shop[0].uid;
  s = pickPiece(s, 'a', uid);
  assert.equal(s.shop.length, P.length + 3);
  assert.ok(!s.shop.some((p) => p.uid === uid));
  assert.equal(playerStage(s, 'a'), 'place');
  s = discardPiece(s, 'a');
  assert.equal(s.pointsAwarded.a, -2);
  assert.equal(currentPlayerId(s), 'b');
  s = discardPiece(pickPiece(s, 'b', s.shop[0].uid), 'b');
  s = discardPiece(pickPiece(s, 'c', s.shop[0].uid), 'c');
  assert.equal(s.round, 2);
  assert.deepEqual(s.queue, ['b', 'c', 'a']);
});

test('Diabo: depois da primeira peca, encosta numa peca sua (se der); a Peca do Diabo vai em qualquer lugar', () => {
  let s = clean(buildComTerraState('diabo', P, 4, 9));
  const one = piece('1');
  s = give(s, 'a', one);
  assert.equal(canPlaceAt(s, 'a', one.shape, 7, 7).ok, true); // primeira: qualquer lugar
  s = placePiece(s, 'a', one.shape, 0, 0);
  s = give(s, 'a', piece('1', 'y'));
  assert.equal(canPlaceAt(s, 'a', one.shape, 7, 7).reason, 'Encoste em uma peça sua');
  assert.equal(canPlaceAt(s, 'a', one.shape, 1, 0).ok, true);
  // encostar na peca de outro nao conta
  s = { ...s, boards: [{ ...s.boards[0], cells: s.boards[0].cells.map((c, i) => (i === 22 ? { ...c, o: 'b', k: 1 as const } : c)) }] };
  assert.equal(canPlaceAt(s, 'a', one.shape, 3, 2).ok, false);
  // Peca do Diabo: solta, sem encostar, vale -1 e e de ninguem
  const devil = piece('1', 'd', { devil: true, pts: -1 });
  s = give(s, 'a', devil);
  assert.equal(canPlaceAt(s, 'a', devil.shape, 8, 8).ok, true);
  const before = s.pointsAwarded.a;
  s = placePiece(s, 'a', devil.shape, 8, 8);
  assert.equal(s.pointsAwarded.a, before - 1);
  assert.equal(at(s, 8, 8).o, '~diabo');
});

test('Diabo: sem encaixe encostado, a peca abre territorio novo', () => {
  let s = clean(buildComTerraState('diabo', P, 4, 9));
  // 'a' tem um bloco no canto cercado por pecas de 'b'
  const cells = s.boards[0].cells.map((c) => ({ ...c }));
  cells[0] = { t: 1, o: 'a', k: 1 };
  cells[1] = { t: 1, o: 'b', k: 1 };
  cells[10] = { t: 1, o: 'b', k: 1 };
  s = give({ ...s, boards: [{ ...s.boards[0], cells }] }, 'a', piece('11'));
  assert.equal(canPlaceAt(s, 'a', parseRows('11'), 5, 5).ok, true);
});

test('Diabo: pontos por bloco e bonus crescente por quadrado da mesma cor', () => {
  assert.deepEqual([2, 3, 4, 5, 6].map(squareBonus), [3, 8, 15, 24, 35]);
  let s = clean(buildComTerraState('diabo', P, 4, 9));
  const bar = piece('11');
  s = placePiece(give(s, 'a', bar), 'a', bar.shape, 0, 0);
  assert.equal(s.pointsAwarded.a, 2);
  s = placePiece(give(s, 'a', bar), 'a', bar.shape, 0, 1); // fecha 2x2
  assert.equal(s.pointsAwarded.a, 2 + 2 + 3);
  assert.equal(s.bestSq?.a, 2);
  // outro 2x2 colado ao lado, sem sobrepor: vale de novo
  const sq = piece('11/11');
  s = placePiece(give(s, 'a', sq), 'a', sq.shape, 2, 0);
  assert.equal(s.pointsAwarded.a, 7 + 4 + 3);
  // L de 5 completa o 3x3 (colunas 0-2, linhas 0-2)
  const el = piece('001/001/111');
  const before = s.pointsAwarded.a;
  const blocked = placePiece(give(s, 'a', el), 'a', el.shape, 0, 0);
  assert.equal(blocked.pointsAwarded.a, before); // casas ocupadas: jogada recusada
  const row = piece('111');
  s = placePiece(give(s, 'a', row), 'a', row.shape, 0, 2);
  assert.equal(s.pointsAwarded.a, before + 3 + 8);
  assert.equal(s.bestSq?.a, 3);
});

test('Diabo: quadrado deslocado sobre um que ja existia nao paga de novo', () => {
  const cells: CTCell[] = Array.from({ length: 25 }, () => ({ t: 1 as const }));
  const b: CTBoard = { id: 'm', w: 5, h: 5, owner: null, cells };
  [0, 1, 5, 6].forEach((i) => (cells[i] = { t: 1, o: 'a', k: 1 }));
  // nova coluna x=2 nas linhas 0-1 forma um 2x2 (x1-2) que sobrepoe o antigo
  [2, 7].forEach((i) => (cells[i] = { t: 1, o: 'a', k: 1 }));
  assert.equal(newSquare(b, 'a', new Set([2, 7])), 0);
  // ja se crescer para 3x3 paga
  [10, 11, 12].forEach((i) => (cells[i] = { t: 1, o: 'a', k: 1 }));
  assert.equal(newSquare(b, 'a', new Set([10, 11, 12])), 3);
});

test('Diabo: ponte fica sobre a agua; bloco comum nao', () => {
  let s = clean(buildComTerraState('diabo', P, 4, 9), [[5, 5]]);
  const bridge = piece('131');
  s = give(s, 'a', bridge);
  assert.equal(canPlaceAt(s, 'a', bridge.shape, 4, 5).ok, true);
  assert.equal(canPlaceAt(s, 'a', parseRows('113'), 4, 5).ok, false);
  s = placePiece(s, 'a', bridge.shape, 4, 5);
  assert.equal(at(s, 5, 5).k, 3);
  assert.equal(s.pointsAwarded.a, 3);
});

test('Diabo: diabinho so na sua vez, antes de pegar a peca, 1 por vez e 3 por partida', () => {
  let s = clean(buildComTerraState('diabo', P, 6, 9));
  assert.equal(canSabotage(s, 'b'), false);
  assert.equal(canSabotage(s, 'a'), true);
  s = sabotage(s, 'a', 'tok', 4, 4, -1);
  assert.equal(at(s, 4, 4).tok, -1);
  assert.equal(s.devils?.a, 2);
  assert.equal(sabotage(s, 'a', 'tree', 5, 5), s); // so um por vez
  s = pickPiece(s, 'a', s.shop[0].uid);
  assert.equal(canSabotage(s, 'a'), false); // ja pegou a peca
  s = discardPiece(s, 'a');
  assert.equal(canSabotage(s, 'b'), true);
  assert.equal(canTarget(s, 'b', 4, 4), false); // casa ja tem ficha
  s = { ...s, devils: { ...s.devils, b: 0 } };
  assert.equal(canSabotage(s, 'b'), false);
});

test('Diabo: fim de partida da +8 ao maior territorio (empate +4 cada)', () => {
  let s = clean(buildComTerraState('diabo', [{ id: 'a' }, { id: 'b' }], 4, 9));
  const cells = s.boards[0].cells.map((c) => ({ ...c }));
  [0, 1, 2].forEach((i) => (cells[i] = { t: 1, o: 'a', k: 1 }));
  [50, 51].forEach((i) => (cells[i] = { t: 1, o: 'b', k: 1 }));
  s = { ...s, boards: [{ ...s.boards[0], cells }] };
  const end = finishNow(s);
  assert.equal(end.phase, 'SUMMARY');
  assert.deepEqual(end.territoryWinners, ['a']);
  assert.equal(end.pointsAwarded.a, 8);
  assert.equal(finishNow(end), end); // nao paga duas vezes
  cells[52] = { t: 1, o: 'b', k: 1 };
  const tie = finishNow({ ...s, boards: [{ ...s.boards[0], cells }] });
  assert.deepEqual([tie.pointsAwarded.a, tie.pointsAwarded.b], [4, 4]);
});

test('Diabo: acabam as rodadas ou acaba o espaco, acaba a partida', () => {
  let s = buildComTerraState('diabo', [{ id: 'a' }, { id: 'b' }], 3, 9);
  for (let i = 0; i < 6; i++) {
    const pid = currentPlayerId(s)!;
    s = discardPiece(pickPiece(s, pid, s.shop[0].uid), pid);
  }
  assert.equal(s.phase, 'SUMMARY');
  // mapa sem casa livre: ninguem encaixa nada
  let full = clean(buildComTerraState('diabo', [{ id: 'a' }, { id: 'b' }], 8, 9));
  full = { ...full, boards: [{ ...full.boards[0], cells: full.boards[0].cells.map((c, i) => (i === 0 ? c : { ...c, o: 'b', k: 1 as const })) }] };
  full = give(full, 'a', piece('1'));
  full = placePiece(full, 'a', parseRows('1'), 0, 0);
  assert.equal(full.phase, 'SUMMARY');
});

test('Diabo: Mare Alta engole casas livres na beira da agua a cada rodada', () => {
  let s = buildComTerraState('diabo', [{ id: 'a' }, { id: 'b' }], 4, 9, false, { mare: true });
  const water = (x: ComTerraState) => x.boards[0].cells.filter((c) => c.t === 2).length;
  const w0 = water(s);
  s = discardPiece(pickPiece(s, 'a', s.shop[0].uid), 'a');
  s = discardPiece(pickPiece(s, 'b', s.shop[0].uid), 'b');
  assert.equal(s.round, 2);
  assert.ok(water(s) >= w0 + 2 && water(s) <= w0 + 4);
  const calm = buildComTerraState('diabo', [{ id: 'a' }, { id: 'b' }], 4, 9);
  assert.equal(calm.variants?.mare, false);
});

test('Diabo: Contratos sorteiam 3 objetivos; o 1o a cumprir ganha +8 e o 2o +4', () => {
  const s0 = buildComTerraState('diabo', P, 4, 9, false, { contratos: true });
  assert.equal(s0.contracts?.length, 3);
  s0.contracts!.forEach((c) => assert.ok(DIABO_CONTRACTS.some((d) => d.id === c.id)));
  assert.equal(buildComTerraState('diabo', P, 4, 9).contracts, undefined);
  let s = clean({ ...s0, contracts: [{ id: 'q3', done: [] }] });
  const sq = piece('111/111/111');
  s = placePiece(give(s, 'a', sq), 'a', sq.shape, 0, 0);
  assert.equal(s.pointsAwarded.a, 9 + 8 + 8); // blocos + quadrado 3x3 + contrato
  s = placePiece(give(s, 'b', sq), 'b', sq.shape, 5, 5);
  assert.equal(s.pointsAwarded.b, 9 + 8 + 4);
  s = placePiece(give(s, 'c', piece('111/111/111', 'z')), 'c', sq.shape, 5, 0);
  assert.equal(s.pointsAwarded.c, 9 + 8); // contrato fechado
  assert.deepEqual(s.contracts![0].done, ['a', 'b']);
});

test('Diabo: o diretor pula a vez de quem sumiu sem tirar pontos', () => {
  let s = buildComTerraState('diabo', P, 6, 3);
  s = pickPiece(s, 'a', s.shop[0].uid);
  s = forceAdvance(s);
  assert.equal(s.pointsAwarded.a, 0);
  assert.equal(currentPlayerId(s), 'b');
  assert.deepEqual(s.hand, {});
});

test('Diabo: 4 IAs jogam uma partida inteira (com Mare e Contratos) ate o resultado', async () => {
  const { ALL_ADAPTERS } = await import('../ai/registry.ts');
  const ids = ['ia-impossivel-1', 'ia-dificil-1', 'ia-medio-1', 'ia-facil-1'];
  const players = ids.map((id) => ({ id, name: id, avatar: '', color: '#fff', team: 'A', isVip: false, score: 0, powerCards: {}, connected: true, lastActive: 0 }));
  let room: any = {
    roomId: 'X', hostId: 'h', screen: 'playing', theme: 't', timerConfig: 0, activeGame: 'com-terra', players,
    comTerra: buildComTerraState('diabo', players, 6, 77, false, { mare: true, contratos: true })
  };
  const t0 = Date.now();
  for (let step = 0; step < 400 && room.comTerra.phase !== 'SUMMARY'; step++) {
    const pid = currentPlayerId(room.comTerra)!;
    const bot = players.find((p) => p.id === pid)!;
    const mv = ALL_ADAPTERS['com-terra'](room, bot as any);
    assert.ok(mv, `IA ${pid} tem jogada (${playerStage(room.comTerra, pid)})`);
    room = mv!.apply(room, undefined);
  }
  assert.equal(room.comTerra.phase, 'SUMMARY');
  const placed = room.comTerra.boards[0].cells.filter((c: CTCell) => c.o && c.o !== '~diabo').length;
  assert.ok(placed >= 40, `as IAs ocuparam o mapa (${placed} blocos)`);
  assert.ok(Date.now() - t0 < 15000, 'IA rapida o bastante');
});
