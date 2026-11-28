import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRoundResults, mergeRoundExtras, GAME_EXTRAS } from '../utils/matchExtras.ts';
import { buildVictoryModel } from '../app/victory/victoryModel.ts';
import { GAME_NAMES } from '../app/gameNames.ts';
import { buildNextRoundUpdater } from '../app/buildNextRoundUpdater.ts';
import type { TeamId } from '../types/game.ts';

const team = (id: string, name: string, score: number) => ({ id, name, score, members: [] });
const player = (id: string, name: string, teamId: TeamId, score: number, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  avatar: '',
  color: '',
  team: teamId,
  isVip: false,
  score,
  connected: true,
  lastActive: 0,
  powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
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

test('Limite em empate avança para o desempate e abre a vitória quando sai um campeão', () => {
  const update = buildNextRoundUpdater({ setSuddenDeathBanner: () => {}, duvidoEndsEarly: false });
  const room = baseRoom({
    screen: 'playing',
    activeGame: 'limite',
    roundNumber: 3,
    teams: { A: team('A', 'Alfa', 0), B: team('B', 'Bravo', 0) },
    players: [player('a', 'Ana', 'A', 1), player('b', 'Beto', 'B', 1)]
  });
  const tied = update(room);
  assert.equal(tied.screen, 'playing');
  assert.equal(tied.roundNumber, 4);
  assert.equal(tied.maxRounds, 4);

  const completed = update({
    ...tied,
    players: [player('a', 'Ana', 'A', 2), player('b', 'Beto', 'B', 1)]
  });
  assert.equal(completed.screen, 'game-over');
  assert.deepEqual(buildVictoryModel(completed).champions.map((entry) => entry.id), ['a']);
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

test('vitoria: Jogo dos Pontinhos guarda o MENOR numero de dicas', () => {
  const room = baseRoom({
    activeGame: 'pontinhos',
    pontinhos: { winnerPlayerId: 'a', attempts: [{ playerId: 'b', correct: false }, { playerId: 'a', correct: true }] },
    matchExtras: { a: { menosPistas: 4 } }
  });
  assert.equal(mergeRoundExtras(room).a.menosPistas, 2);
});

test('vitoria: GeoGuess guarda a imagem em que cada um acertou (a menor)', () => {
  const room = baseRoom({
    activeGame: 'estadios',
    geoguess: { solvedAt: { a: 1, b: 3 } },
    matchExtras: { a: { menosImagens: 4 } }
  });
  const m = mergeRoundExtras(room);
  assert.equal(m.a.menosImagens, 2);
  assert.equal(m.b.menosImagens, 4);
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
