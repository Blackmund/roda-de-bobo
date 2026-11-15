import test from 'node:test';
import assert from 'node:assert/strict';
import { isBot, botLevelOf, newBotPlayer, BOT_PARAMS } from '../ai/bots.ts';
import { ADAPTERS } from '../ai/adapters.ts';
import { buildAdedanhaState, callStop, submitAnswers } from '../utils/adedanhaEngine.ts';
import type { GameRoom, Player } from '../types/game.ts';

const P = (id: string, team: 'A' | 'B' = 'A'): Player =>
  ({ id, name: id, avatar: '', color: '#fff', team, isVip: false, score: 0, powerCards: {} as any, connected: true, lastActive: 0 }) as Player;
const room = (extra: Partial<GameRoom>): GameRoom =>
  ({ roomId: 'X', hostId: 'h', screen: 'playing', theme: 't', players: [], timerConfig: 0, ...extra }) as unknown as GameRoom;

test('IA: o id marca o jogador e o nivel', () => {
  assert.equal(isBot({ id: 'ia-dificil-1' }), true);
  assert.equal(isBot({ id: 'fix-joao' }), false);
  assert.equal(botLevelOf('ia-impossivel-2'), 'impossivel');
  const b1 = newBotPlayer('medio', []);
  const b2 = newBotPlayer('medio', [{ id: b1.id }]);
  assert.notEqual(b1.id, b2.id);
  assert.ok(BOT_PARAMS.impossivel.acc > BOT_PARAMS.dificil.acc && BOT_PARAMS.dificil.acc > BOT_PARAMS.medio.acc && BOT_PARAMS.medio.acc > BOT_PARAMS.facil.acc);
});

test('IA no Limite: Impossivel crava o valor e entrega uma vez so', () => {
  const bot = P('ia-impossivel-1');
  const r = room({
    activeGame: 'limite',
    players: [bot, P('h1', 'B')],
    limite: { phase: 'SECRET_GUESS', roundData: { pergunta: 'Q', valor_exato: 128, unidade: '', curiosidade_explicacao: '' }, guesses: {}, submittedPlayers: [], timerSeconds: 30 } as any
  });
  const mv = ADAPTERS.limite!(r, bot)!;
  assert.ok(mv);
  const after = mv.apply(r, undefined);
  assert.equal(after.limite!.guesses[bot.id], 128);
  assert.deepEqual(after.limite!.submittedPlayers, [bot.id]);
  assert.equal(ADAPTERS.limite!(after, bot), null);
});

test('IA no Respostas: escolhe uma palavra na vez dela e passa a chutar', () => {
  const bot = P('ia-dificil-1');
  const r = room({
    activeGame: 'respostas-sem-perguntas',
    players: [bot, P('h1')],
    respostasSemPerguntas: {
      phase: 'PLAYING', category: 'c', words: ['qual', 'a', 'capital'], answer: 'Brasília', revealed: [false, false, false],
      turnPlayerId: bot.id, step: 'pick', attempts: [], pointsAwarded: {}, answerVisible: false
    } as any
  });
  const mv = ADAPTERS['respostas-sem-perguntas']!(r, bot)!;
  const after = mv.apply(r, undefined);
  assert.equal(after.respostasSemPerguntas!.step, 'guess');
  assert.equal(after.respostasSemPerguntas!.revealed.filter(Boolean).length, 1);
  assert.equal(after.botSay?.playerId, bot.id);
});

test('IA na Adedanha: vota em todas as respostas pendentes da categoria', () => {
  const bot = P('ia-impossivel-1');
  let s = buildAdedanhaState([{ id: 'h1' }, { id: 'h2' }, { id: bot.id }], ['Fruta'], 'B', 60);
  s = { ...s, phase: 'WRITING' };
  s = submitAnswers(s, 'h1', ['Banana']);
  s = submitAnswers(s, 'h2', ['Maçã']);
  s = callStop(s, 'h1');
  s = { ...s, phase: 'VOTING', voteIndex: 0 };
  const r = room({ activeGame: 'adedanha', players: [P('h1'), P('h2'), bot], adedanha: s });
  const mv = ADAPTERS.adedanha!(r, bot)!;
  const rnd = Math.random;
  Math.random = () => 0.01; // sorteio fixo: a IA vota "do jeito certo"
  let after;
  try {
    after = mv.apply(r, undefined).adedanha!;
  } finally {
    Math.random = rnd;
  }
  assert.equal(after.votes['0|h1'][bot.id], true);
  assert.equal(after.votes['0|h2'][bot.id], false);
});
