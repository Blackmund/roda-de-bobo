import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BP_ENCLOSURES,
  BP_ENCLOSURE_PTS,
  BP_ENTRANCE,
  BP_ICON_LABEL,
  BP_TILE_META,
  areaSpots,
  bpCanPlace,
  bpCurrent,
  bpPass,
  bpPlace,
  bpPlaceArea,
  bpScore,
  bpTakeReward,
  buildBPState,
  findFirstValidPlacement,
  iconAt,
  parkCellBounds,
  rewardOptions,
  snapPlacementToCell,
  statueValues,
  tileShape
} from '../utils/bpEngine.ts';
import { allOrientations, buildComTerraState, shapeCells } from '../utils/comTerraEngine.ts';
import type { BPArea, BPState } from '../types/game.ts';

const blank = (rows = ['....', '....', '....', '....']): BPArea['icons'] =>
  rows.join('').split('').map((ch) => (ch === 'P' ? 'pit' : ch === 'W' ? 'wheel' : ch === 'C' ? 'cement' : ch === 'E' ? 'excavator' : ch === 'O' ? 'crew' : null));

/** Parque de teste: so a entrada, com o desenho de icones pedido. */
function withEntrance(s: BPState, pid: string, rows: string[]): BPState {
  const park = s.parks[pid];
  return { ...s, parks: { ...s.parks, [pid]: { ...park, areas: [{ ...park.areas[0], icons: blank(rows) }] } } };
}
const ox = BP_ENTRANCE.ax * 4;
const oy = BP_ENTRANCE.ay * 4;

test('Bärenpark: montagem conforme a regra (estoque inicial, estatuas, pilhas de casas)', () => {
  const s = buildBPState(['a', 'b'], 7);
  assert.equal(s.parks.a.supply[0].type, 'toilet');
  assert.equal(s.parks.b.supply[0].type, 'playground');
  assert.deepEqual(statueValues(2), [16, 14, 12, 10, 8, 6, 4, 2]);
  assert.deepEqual(s.houses['h-polar'], [2, 4, 6]);
  assert.equal(s.areaPiles[0].length + s.areaPiles[1].length, 6, '3 areas por jogador, sorteadas');
  assert.ok(Object.values(s.parks).every((pk) => pk.supply.every((t) => t.type !== 'river')), 'ninguem comeca com rio');
  // tabuleiros procedurais: cada area tem 1 fosso; a entrada sempre tem equipe de obra
  Object.values(s.areaDefs).forEach((d) => assert.equal(d.split('').filter((c) => c === 'P').length, 1));
  const count = (icons: any[], k: string) => icons.filter((x) => x === k).length;
  Object.values(s.parks).forEach((pk) => {
    const ic = pk.areas[0].icons;
    assert.deepEqual([count(ic, 'wheel'), count(ic, 'cement'), count(ic, 'crew'), count(ic, 'excavator'), count(ic, 'pit')], [3, 2, 1, 0, 1], 'entrada: 3 carrinhos, 2 betoneiras, 1 equipe, sem escavadeira');
  });
  Object.values(s.areaDefs).forEach((d) => {
    const ch = d.split('');
    const n = (k: string) => ch.filter((x) => x === k).length;
    assert.deepEqual([n('W'), n('C'), n('E'), n('O'), n('P')], [2, 2, 1, 1, 1], 'demais: 2 carrinhos, 2 betoneiras, 1 escavadeira, 1 equipe');
  });
  // outra semente = outros tabuleiros
  assert.notDeepEqual(buildBPState(['a', 'b'], 8).areaDefs, s.areaDefs);
  // 6 jogadores: estatuas e pilhas maiores
  const six = buildBPState(['1', '2', '3', '4', '5', '6'], 3);
  assert.equal(six.statues.length, 24);
  assert.equal(six.houses['h-polar'].length, 11);
  assert.equal(six.parks['6'].supply[0].type, 'food');
  assert.equal(bpCurrent(s), 'a');
  const ct = buildComTerraState('arquiteto', [{ id: 'a' }, { id: 'b' }], 3, 1);
  assert.ok(ct.bp, 'Arquiteto usa o motor do Bärenpark');
});

test('Bärenpark: colocar nao cobre o fosso, encosta nas pecas e o icone coberto da recompensa', () => {
  let s = withEntrance(buildBPState(['a', 'b'], 1), 'a', ['W...', '....', '.P..', '....']);
  const uid = s.parks.a.supply[0].uid; // banheiro (1 casa)
  assert.equal(bpCanPlace(s.parks.a, tileShape('toilet'), ox + 1, oy + 2).ok, false, 'fosso');
  s = bpPlace(s, 'a', uid, tileShape('toilet'), ox, oy);
  assert.deepEqual(s.pending, [{ playerId: 'a', kind: 'wheel' }]);
  assert.deepEqual(rewardOptions(s, 'wheel'), ['toilet', 'playground', 'food', 'river']);
  s = bpTakeReward(s, 'a', 'river');
  assert.equal(s.parks.a.supply[0].type, 'river');
  assert.equal(bpCurrent(s), 'b', 'depois da recompensa a vez passa');
  // proxima peca do jogador a tem que encostar
  s = { ...s, turnIdx: 0 };
  assert.equal(bpCanPlace(s.parks.a, tileShape('river'), ox + 1, oy + 3).ok, false, 'solta, sem encostar');
  assert.equal(bpCanPlace(s.parks.a, tileShape('river'), ox + 1, oy).ok, true);
});

test('Bärenpark: betoneira pega a casa do topo (valor mais alto) e a escavadeira aceita cercado', () => {
  let s = withEntrance(buildBPState(['a', 'b'], 2), 'a', ['C...', '....', '..P.', '....']);
  s = bpPlace(s, 'a', s.parks.a.supply[0].uid, tileShape('toilet'), ox, oy);
  assert.ok(rewardOptions(s, 'cement').includes('h-panda'));
  assert.ok(!rewardOptions(s, 'cement').includes('e-panda'));
  s = bpTakeReward(s, 'a', 'h-panda');
  assert.equal(s.parks.a.supply[0].pts, 6);
  assert.deepEqual(s.houses['h-panda'], [2, 4]);
  assert.ok(rewardOptions(s, 'excavator').includes('e-polar'));
});

test('Bärenpark: equipe de obra abre area encostada, nunca abaixo da entrada', () => {
  let s = withEntrance(buildBPState(['a', 'b'], 3), 'a', ['O...', '....', '..P.', '....']);
  s = bpPlace(s, 'a', s.parks.a.supply[0].uid, tileShape('toilet'), ox, oy);
  assert.equal(s.pending[0].kind, 'crew');
  const spots = areaSpots(s.parks.a);
  assert.ok(spots.every((p) => p.ay <= BP_ENTRANCE.ay));
  assert.ok(!spots.some((p) => p.ay > BP_ENTRANCE.ay));
  s = bpPlaceArea(s, 'a', 0, BP_ENTRANCE.ax, BP_ENTRANCE.ay - 1);
  assert.equal(s.parks.a.areas.length, 2);
  assert.ok(iconAt(s.parks.a, ox, oy - 4) !== undefined);
});

test('Bärenpark: area completa ganha a maior estatua; sem peca que caiba, passa e pega Area Verde', () => {
  let s = withEntrance(buildBPState(['a', 'b'], 4), 'a', ['....', '....', '....', '...P']);
  // estoque com pecas que completam a area: 3 rios na horizontal (9 casas) + 2 parquinhos + 1 banheiro + 1 banheiro (15)
  const mk = (type: any, uid: string) => ({ uid, type, pts: 0 });
  s = {
    ...s,
    parks: {
      ...s.parks,
      a: { ...s.parks.a, supply: [mk('river', 'r1'), mk('river', 'r2'), mk('river', 'r3'), mk('playground', 'p1'), mk('toilet', 't1'), mk('toilet', 't2'), mk('playground', 'p2')] }
    }
  };
  const turnA = (st: BPState) => ({ ...st, turnIdx: 0 });
  s = turnA(bpPlace(s, 'a', 'r1', tileShape('river'), ox, oy));
  s = turnA(bpPlace(s, 'a', 'r2', tileShape('river'), ox, oy + 1));
  s = turnA(bpPlace(s, 'a', 'r3', tileShape('river'), ox, oy + 2));
  s = turnA(bpPlace(s, 'a', 'p1', [[1], [1]], ox + 3, oy));
  s = turnA(bpPlace(s, 'a', 't1', [[1]], ox + 3, oy + 2));
  s = turnA(bpPlace(s, 'a', 'p2', [[1, 1]], ox, oy + 3));
  s = bpPlace(s, 'a', 't2', [[1]], ox + 2, oy + 3);
  assert.equal(s.parks.a.areas[0].statue, 16);
  assert.equal(bpScore(s, 'a'), 16);
  assert.equal(s.statues[0], 14);
  // b sem peca que caiba? nao: b tem o parquinho. Esvazia o estoque de b e passa.
  s = { ...s, turnIdx: 1, parks: { ...s.parks, b: { ...s.parks.b, supply: [] } } };
  s = bpPass(s, 'b');
  assert.equal(s.pending[0].kind, 'pass');
  s = bpTakeReward(s, 'b', 'toilet');
  assert.equal(s.parks.b.supply[0].type, 'toilet');
  assert.equal(bpCurrent(s), 'a');
});

test('Barenpark: 12 pentominoes livres unicos de fauna brasileira e 1 unidade por modelo ate 4 jogadores', () => {
  assert.equal(BP_ENCLOSURES.length, 12);

  const canonicalKeys = new Set<string>();
  for (const id of BP_ENCLOSURES) {
    const base = tileShape(id);
    const cells = shapeCells(base);
    assert.equal(cells.length, 5, `${id} deve ter 5 celulas`);
    assert.ok(BP_TILE_META[id]?.label, `${id} deve ter label em BP_TILE_META`);

    // Canonical key across all 8 symmetries of this pentomino
    const forms = allOrientations(base).map((m) =>
      shapeCells(m)
        .map((c) => `${c.dx},${c.dy}`)
        .join(';')
    );
    forms.sort();
    canonicalKeys.add(forms[0]);
  }
  assert.equal(canonicalKeys.size, 12, 'Todos os 12 recintos devem ser pentominoes livres distintos');

  for (const count of [2, 3, 4]) {
    const ids = Array.from({ length: count }, (_, i) => `p${i + 1}`);
    const s = buildBPState(ids);
    for (const id of BP_ENCLOSURES) {
      assert.deepEqual(
        s.enclosures[id],
        [BP_ENCLOSURE_PTS[id]],
        `Com ${count} jogadores, ${id} deve ter exatamente 1 unidade`
      );
    }
  }

  for (const count of [5, 8]) {
    const ids = Array.from({ length: count }, (_, i) => `p${i + 1}`);
    const s = buildBPState(ids);
    for (const id of BP_ENCLOSURES) {
      assert.deepEqual(
        s.enclosures[id],
        [BP_ENCLOSURE_PTS[id] - 1, BP_ENCLOSURE_PTS[id]],
        `Com ${count} jogadores, ${id} deve ter 2 unidades`
      );
    }
  }
});

test('Barenpark: icones brasileiros e helpers de encaixe automatico e snap', () => {
  assert.equal(BP_ICON_LABEL.wheel, 'Carriola');
  assert.equal(BP_ICON_LABEL.cement, 'Betoneira');
  assert.equal(BP_ICON_LABEL.excavator, 'Cavadeira');
  assert.equal(BP_ICON_LABEL.crew, 'Equipe de Obra');
  assert.equal(BP_ICON_LABEL.pit, 'Fosso');

  const s = buildBPState(['a', 'b']);
  const parkA = s.parks.a;
  const first = findFirstValidPlacement(parkA, 'toilet');
  assert.ok(first, 'Deve encontrar encaixe inicial valido para Banheiro/Quiosque');
  assert.equal(bpCanPlace(parkA, first.m, first.x, first.y).ok, true);

  // Snap near out-of-bounds positive coordinates should clamp cleanly inside park bounds
  const b = parkCellBounds(parkA);
  const pShape = tileShape('e-tucano'); // 5-cell pentomino (4 cols x 2 rows)
  const snapped = snapPlacementToCell(parkA, pShape, 99, 99);
  assert.ok(snapped.x >= b.minX && snapped.x <= b.maxX);
  assert.ok(snapped.y >= b.minY && snapped.y <= b.maxY);
  assert.equal(typeof snapped.ok, 'boolean');
});
