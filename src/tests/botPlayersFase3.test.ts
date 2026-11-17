import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ADAPTERS } from '../ai/registry.ts';
import { buildComTerraState, playerStage } from '../utils/comTerraEngine.ts';
import type { GameRoom, Player } from '../types/game.ts';

const P = (id: string, team: 'A' | 'B' = 'A'): Player =>
  ({ id, name: id, avatar: '', color: '#fff', team, isVip: false, score: 0, powerCards: {} as any, connected: true, lastActive: 0 }) as Player;
const room = (extra: Partial<GameRoom>): GameRoom =>
  ({ roomId: 'X', hostId: 'h', screen: 'playing', theme: 't', players: [], timerConfig: 0, ...extra }) as unknown as GameRoom;

test('IA no Quem Sou Eu: na vez dela pergunta ou chuta, e a vez anda', () => {
  const bot = P('ia-facil-1');
  const q = {
    phase: 'PLAYING',
    entries: [
      { playerId: bot.id, identity: 'Pelé', category: 'Esporte', status: 'searching', questions: 0, wrongGuesses: 0 },
      { playerId: 'h1', identity: 'Anitta', category: 'Música', status: 'searching', questions: 0, wrongGuesses: 0 }
    ],
    turnPlayerId: bot.id,
    maxQuestions: 10,
    pointsAwarded: {},
    identitiesVisible: false
  };
  const r = room({ activeGame: 'quem-sou-eu', players: [bot, P('h1')], quemSouEu: q as any });
  const mv = ALL_ADAPTERS['quem-sou-eu'](r, bot)!;
  const after = mv.apply(r, undefined).quemSouEu!;
  const me = after.entries.find((e) => e.playerId === bot.id)!;
  assert.ok(me.questions === 1 || me.status === 'found' || me.wrongGuesses === 1);
  assert.equal(ALL_ADAPTERS['onde-estou'], ALL_ADAPTERS['quem-sou-eu']);
});

test('IA no Com Terra (Fronteiras/Diabo): age na etapa dela e avanca o jogo', () => {
  const bot = P('ia-impossivel-1');
  for (const mode of ['fronteiras', 'diabo'] as const) {
    const ct = buildComTerraState(mode as any, [{ id: bot.id }, { id: 'h1' }], 3, 7) as any;
    const r = room({ activeGame: 'com-terra', players: [bot, P('h1', 'B')], comTerra: ct });
    const stage = playerStage(ct, bot.id);
    const mv = ALL_ADAPTERS['com-terra'](r, bot);
    if (stage === 'wait') {
      assert.equal(mv, null, mode);
      continue;
    }
    assert.ok(mv, mode);
    const after = mv!.apply(r, undefined).comTerra as any;
    assert.notDeepEqual(after, ct, `${mode}: a IA mexeu no jogo`);
  }
});

test('IA desenhista no Como Eu Pinto: libera a vez sem precisar de olhos fechados', () => {
  const bot = P('ia-medio-1');
  const p = {
    phase: 'PLAYING', inputMode: 'tv', tvRevealGate: true, words: ['casa', 'gato', 'sol'], currentIndex: 0,
    outcomes: ['pending', 'pending', 'pending'], drawTeam: 'A', drawerPlayerId: bot.id, timerSeconds: 60, timerActive: false,
    strokes: [], drawings: [[], [], []]
  };
  const r = room({ activeGame: 'como-eu-pinto', players: [bot, P('h1')], comoEuPinto: p as any });
  const mv = ALL_ADAPTERS['como-eu-pinto'](r, bot)!;
  const after = mv.apply(r, undefined).comoEuPinto!;
  assert.equal(after.tvRevealGate, false);
  assert.equal(after.wordHidden, true);
});

test('IA desenhista no Como Eu Pinto: transforma os tracos do Gemini em desenho, um traco por vez', () => {
  const bot = P('ia-impossivel-1');
  const p = {
    phase: 'PLAYING', inputMode: 'tv', tvRevealGate: false, words: ['casa', 'gato', 'sol'], currentIndex: 0,
    outcomes: ['pending', 'pending', 'pending'], drawTeam: 'A', drawerPlayerId: bot.id, timerSeconds: 60, timerActive: true,
    strokes: [], drawings: [[], [], []]
  };
  const r = room({ activeGame: 'como-eu-pinto', players: [bot, P('h1')], comoEuPinto: p as any });
  const mv = ALL_ADAPTERS['como-eu-pinto'](r, bot)!;
  const tracos = ['20,80 20,40 50,15 80,40 80,80 20,80', '40,80 40,60 60,60 60,80'];
  const after = mv.apply(r, tracos).comoEuPinto!;
  assert.equal(after.strokes.length, 1);
  const pts = after.strokes[0].points;
  assert.ok(pts.length >= 5 && pts.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
  // proxima chamada (com 1 traco) desenha o segundo
  const r2 = room({ ...r, comoEuPinto: after } as any);
  const after2 = ALL_ADAPTERS['como-eu-pinto'](r2, bot)!.apply(r2, tracos).comoEuPinto!;
  assert.equal(after2.strokes.length, 2);
});
