import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRoundResults, mergeRoundExtras, GAME_EXTRAS } from '../utils/matchExtras.ts';
import { buildVictoryModel } from '../app/victory/victoryModel.ts';
import { GAME_NAMES } from '../app/gameNames.ts';

const team = (id: string, name: string, score: number) => ({ id, name, score, members: [] });
const player = (id: string, name: string, teamId: string, score: number, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  avatar: '',
  color: '',
  team: teamId,
  isVip: false,
  score,
  connected: true,
  lastActive: 0,
  powerCards: {},
  ...extra
});
const baseRoom = (over: Record<string, unknown>): any => ({
  roomId: 'X',
  hostId: 'h',
  screen: 'game-over',
  theme: 'Geral',
  roundNumber: 4,
  maxRounds: 3,
  timerConfig: 60,
  sessionStats: { totalMatches: 1, victoriesA: 0, victoriesB: 0, totalPointsA: 0, totalPointsB: 0, history: [] },
  lastUpdated: 0,
  ...over
});

test('vitoria: todo jogo tem extras com rotulo e regra de soma', () => {
  for (const id of Object.keys(GAME_NAMES)) {
    const defs = (GAME_EXTRAS as any)[id];
    assert.ok(Array.isArray(defs) && defs.length > 0, `${id} sem extras`);
    defs.forEach((d: any) => assert.ok(d.label && ['sum', 'max', 'min'].includes(d.agg)));
  }
});

test('vitoria: Limite soma cravadas e estouros rodada a rodada', () => {
  const room = baseRoom({
    activeGame: 'limite',
    limite: {
      roundData: { valor_exato: 42 },
      guesses: { a: 42, b: 50, c: 42 },
      bustedPlayers: ['b'],
      matchExtras: undefined
    },
    matchExtras: { a: { cravadas: 1 } }
  });
  const merged = mergeRoundExtras(room);
  assert.equal(merged.a.cravadas, 2);
  assert.equal(merged.c.cravadas, 1);
  assert.equal(merged.b.estouros, 1);
});

test('vitoria: Estadios guarda o MENOR numero de pistas', () => {
  const room = baseRoom({
    activeGame: 'estadios',
    estadios: { winnerPlayerId: 'a', attempts: [{ playerId: 'b', correct: false }, { playerId: 'a', correct: true }] },
    matchExtras: { a: { menosPistas: 4 } }
  });
  assert.equal(mergeRoundExtras(room).a.menosPistas, 2);
});

test('vitoria: sequencias e rodadas vencidas por equipe', () => {
  let ex = applyRoundResults({}, { p1: 2, p2: 0 }, { A: 2, B: 0 });
  ex = applyRoundResults(ex, { p1: 1, p2: 0 }, { A: 1, B: 0 });
  ex = applyRoundResults(ex, { p1: 0, p2: 3 }, { A: 0, B: 3 });
  assert.equal(ex['team:A']._won, 2);
  assert.equal(ex['team:A']._maxSeq, 2);
  assert.equal(ex['team:A']._seq, 0);
  assert.equal(ex['team:B']._won, 1);
  assert.equal(ex.p1._maxSeq, 2);
  assert.equal(ex.p1._played, 3);
});

test('vitoria: individual tem um campeao, ranking em ordem e medalhas', () => {
  const room = baseRoom({
    activeGame: 'limite',
    teams: { A: team('A', 'Alfa', 0), B: team('B', 'Bravo', 0) },
    players: [
      player('a', 'Ana', 'A', 9, { roundsPlayed: 3, roundsWon: 2 }),
      player('b', 'Beto', 'B', 7, { roundsPlayed: 3, roundsWon: 2 }),
      player('c', 'Caio', 'A', 2, { roundsPlayed: 3, roundsWon: 1 })
    ],
    matchExtras: { a: { cravadas: 2, _maxSeq: 2 }, b: { cravadas: 3 } }
  });
  const m = buildVictoryModel(room);
  assert.equal(m.mode, 'individual');
  assert.equal(m.tie, false);
  assert.equal(m.champions[0].name, 'Ana');
  assert.deepEqual(m.ranking.map((e) => e.name), ['Ana', 'Beto', 'Caio']);
  assert.equal(m.watermark, 'CAMPEÃO');
  assert.equal(m.stats.find((s) => s.key === 'rodadas')?.value, '2/3');
  assert.equal(m.stats.find((s) => s.key === 'cravadas')?.value, '2');
  assert.equal(m.line, '2 cravadas');
  const ids = m.medals.map((x) => x.id);
  assert.deepEqual(ids, ['destaque', 'quase-la', 'pipoca']);
  assert.equal(m.medals[0].name, 'Beto', 'destaque = mais cravadas, mesmo sem vencer');
  assert.equal(m.medals[1].detail, 'ficou a 2 pontos');
});

test('vitoria: equipe de dois vira "Dupla campeã" e o empate nao inventa campeao', () => {
  const players = [player('a', 'Ana', 'A', 0), player('b', 'Beto', 'A', 0), player('c', 'Caio', 'B', 0), player('d', 'Duda', 'B', 0)];
  const win = buildVictoryModel(
    baseRoom({ activeGame: 'mimica', teams: { A: team('A', 'Os Bolados', 12), B: team('B', 'Os Trutas', 8) }, players })
  );
  assert.equal(win.mode, 'team');
  assert.equal(win.kicker, 'Dupla campeã');
  assert.equal(win.watermark, 'CAMPEÕES');
  assert.equal(win.champions[0].name, 'Os Bolados');

  const tie = buildVictoryModel(
    baseRoom({ activeGame: 'mimica', teams: { A: team('A', 'Os Bolados', 8), B: team('B', 'Os Trutas', 8) }, players })
  );
  assert.equal(tie.tie, true);
  assert.equal(tie.champions.length, 2);
  assert.equal(tie.watermark, 'EMPATE');
  assert.ok(!tie.medals.some((m) => m.id === 'quase-la'));
});
