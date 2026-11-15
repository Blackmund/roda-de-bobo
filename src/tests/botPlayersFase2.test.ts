import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ADAPTERS, BOT_READY_GAMES } from '../ai/registry.ts';
import { bpPlacements } from '../ai/adapters2.ts';
import { buildBPState, bpCurrent } from '../utils/bpEngine.ts';
import { buildEstadiosState } from '../utils/estadiosEngine.ts';
import type { GameRoom, Player } from '../types/game.ts';

const P = (id: string, team: 'A' | 'B' = 'A'): Player =>
  ({ id, name: id, avatar: '', color: '#fff', team, isVip: false, score: 0, powerCards: {} as any, connected: true, lastActive: 0 }) as Player;
const room = (extra: Partial<GameRoom>): GameRoom =>
  ({ roomId: 'X', hostId: 'h', screen: 'playing', theme: 't', players: [], timerConfig: 0, ...extra }) as unknown as GameRoom;

test('IA Fase 2: os 12 jogos com IA estao registrados', () => {
  for (const g of ['estadios', 'mega-resenha', 'com-terra', 'perguntas-e-verdades', 'limite', 'adedanha']) assert.ok(BOT_READY_GAMES.includes(g), g);
  assert.equal(BOT_READY_GAMES.length, 12);
});

test('IA no Com Terra (Arquiteto): acha encaixes validos e o Impossivel joga o melhor', () => {
  const bot = P('ia-impossivel-1');
  const bp = buildBPState([bot.id, 'h1'], 42);
  const placements = bpPlacements(bp, bot.id);
  assert.ok(placements.length > 0);
  for (let i = 1; i < placements.length; i++) assert.ok(placements[i - 1].value >= placements[i].value);
  const r = room({ activeGame: 'com-terra', players: [bot, P('h1', 'B')], comTerra: { mode: 'arquiteto', phase: 'TURN', bp } as any });
  assert.equal(bpCurrent(bp), bot.id);
  const mv = ALL_ADAPTERS['com-terra'](r, bot)!;
  assert.ok(mv);
  const after = mv.apply(r, undefined);
  const cellsAfter = Object.keys(after.comTerra!.bp!.parks[bot.id].cells).length;
  assert.ok(cellsAfter > 0, 'colocou uma peca');
});

test('IA no Estadios: na vez dela, julga um palpite e a vez anda ou a rodada acaba', () => {
  const bot = P('ia-impossivel-1');
  const s = { ...buildEstadiosState({ nome: 'Maracanã', cidade: 'Rio', pais: 'Brasil', pistas: ['a', 'b', 'c', 'd', 'e'] }, [bot, P('h1')]), phase: 'PLAYING' as const };
  const r = room({ activeGame: 'estadios', players: [bot, P('h1')], estadios: s });
  const mv = ALL_ADAPTERS.estadios(r, bot)!;
  const after = mv.apply(r, undefined).estadios!;
  assert.equal(after.attempts.length, 1);
  assert.equal(after.attempts[0].playerId, bot.id);
});
