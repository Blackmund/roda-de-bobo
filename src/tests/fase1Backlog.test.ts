import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_LIMITS, validatePlayerCount, formatLimitsLabel } from '../config/gameLimits.ts';
import {
  computeMatchMVP,
  saveRoomStateToStorage,
  loadRoomStateFromStorage,
  ROOM_SCHEMA_VERSION
} from '../utils/sessionPersistence.ts';

test('UX-03 GAME_LIMITS: bloqueia excesso de jogadores e avisa sobra em Perguntas e Verdades', () => {
  assert.equal(validatePlayerCount('limite', 4).ok, true);
  const tooMany = validatePlayerCount('limite', GAME_LIMITS.limite.max + 1);
  assert.equal(tooMany.ok, false);
  assert.equal(!tooMany.ok && tooMany.reason, 'too-many');
  const tooFew = validatePlayerCount('duvido', 1);
  assert.equal(!tooFew.ok && tooFew.reason, 'too-few');
  // P&V: 6 jogadores é permitido, mas só 2 jogam: aviso, não bloqueio
  const pv = validatePlayerCount('perguntas-e-verdades', 5);
  assert.equal(pv.ok, true);
  assert.ok(pv.ok && pv.warning);
  assert.equal(validatePlayerCount('perguntas-e-verdades', 7).ok, false);
  assert.equal(formatLimitsLabel('perguntas-e-verdades'), '2 a 6 jogadores');
});

test('UX-15 computeMatchMVP: usa só os jogadores da partida atual, ignorando o histórico da sessão', () => {
  const room: any = {
    roomId: 'ABC123',
    activeGame: 'limite',
    screen: 'game-over',
    roundNumber: 3,
    maxRounds: 3,
    teams: { A: { id: 'A', name: 'Alfa', score: 0, members: [] }, B: { id: 'B', name: 'Bravo', score: 0, members: [] } },
    players: [
      { id: 'p1', name: 'Ana', avatar: '🦊', team: 'A', score: 5, roundsPlayed: 3, roundsWon: 2, accuracy: 67 },
      { id: 'p2', name: 'Beto', avatar: '🐻', team: 'B', score: 2, roundsPlayed: 3, roundsWon: 1, accuracy: 33 }
    ],
    sessionStats: {
      totalMatches: 1,
      victoriesA: 0,
      victoriesB: 1,
      totalPointsA: 0,
      totalPointsB: 44,
      history: [
        {
          gameId: 'tem-ou-nao-tem',
          gameName: 'Tem ou Não Tem',
          roundsPlayed: 5,
          winnerTeam: 'B',
          playerScores: [{ id: 'p2', name: 'Beto', avatar: '🐻', team: 'B', score: 44 }]
        }
      ]
    }
  };
  const mvp = computeMatchMVP(room);
  assert.equal(mvp.playerId, 'p1');
  assert.equal(mvp.score, 5, 'não deve herdar os 44 pts da partida anterior');
  assert.equal(mvp.roundsPlayed, 3);
});

test('INF-05 persistência: grava schemaVersion, aceita legado e descarta versão futura ou forma inválida', () => {
  const store = new Map<string, string>();
  const storage = {
    setItem: (k: string, v: string) => void store.set(k, v),
    getItem: (k: string) => store.get(k) ?? null
  };
  const room: any = { roomId: 'ZZ9999', screen: 'rules', activeGame: 'limite', roundNumber: 1, players: [], teams: {} };
  assert.equal(saveRoomStateToStorage(room, storage), true);
  const saved = JSON.parse(store.get('rb_room_state_ZZ9999')!);
  assert.equal(saved.schemaVersion, ROOM_SCHEMA_VERSION);
  assert.ok(loadRoomStateFromStorage('ZZ9999', storage));

  // legado (sem schemaVersion) continua aceito
  store.set('rb_room_state_ZZ9999', JSON.stringify({ ...room }));
  assert.ok(loadRoomStateFromStorage('ZZ9999', storage));

  // versão futura e forma inválida são descartadas
  store.set('rb_room_state_ZZ9999', JSON.stringify({ ...room, schemaVersion: ROOM_SCHEMA_VERSION + 1 }));
  assert.equal(loadRoomStateFromStorage('ZZ9999', storage), null);
  store.set('rb_room_state_ZZ9999', JSON.stringify({ ...room, players: 'quebrado' }));
  assert.equal(loadRoomStateFromStorage('ZZ9999', storage), null);
});
