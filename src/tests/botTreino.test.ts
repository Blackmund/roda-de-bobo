import test from 'node:test';
import assert from 'node:assert/strict';
import { bpPlacements } from '../ai/adapters2.ts';
import { areaSpots, bpCanPlaceAny, bpCurrent, bpPass, bpPlace, bpPlaceArea, bpScore, bpTakeReward, buildBPState, rewardOptions, rewardValue } from '../utils/bpEngine.ts';
import { ALL_ADAPTERS } from '../ai/registry.ts';
import { adedanhaLocal, temPlausibleWrong, siblingWord, questionsFor, megaCluesLocal } from '../ai/knowledge.ts';
import type { BPState, GameRoom, Player } from '../types/game.ts';

/** Partida inteira: "forte" escolhe a melhor jogada, "fraco" escolhe uma qualquer (como o Facil). */
function strongVsWeak(seed: number, strongFirst: boolean): [number, number] {
  const ids = strongFirst ? ['forte', 'fraco'] : ['fraco', 'forte'];
  let s: BPState = buildBPState(ids, seed);
  let r = seed;
  const rnd = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let g = 0; g < 400 && !s.finished; g++) {
    const p = s.pending[0];
    if (p) {
      if (p.kind === 'crew') {
        const spot = areaSpots(s.parks[p.playerId])[0];
        s = spot ? bpPlaceArea(s, p.playerId, 0, spot.ax, spot.ay) : { ...s, pending: s.pending.slice(1) };
      } else {
        const opts = rewardOptions(s, p.kind).sort((x, y) => rewardValue(s, y) - rewardValue(s, x));
        const choice = p.playerId === 'forte' ? opts[0] : opts[Math.floor(rnd() * opts.length)];
        s = choice ? bpTakeReward(s, p.playerId, choice) : { ...s, pending: s.pending.slice(1) };
      }
      continue;
    }
    const pid = bpCurrent(s)!;
    if (!bpCanPlaceAny(s.parks[pid])) {
      s = bpPass(s, pid);
      continue;
    }
    const all = bpPlacements(s, pid);
    const mv = pid === 'forte' ? all[0] : all[Math.floor(rnd() * all.length)];
    s = bpPlace(s, pid, mv.uid, mv.m, mv.x, mv.y);
  }
  return [bpScore(s, 'forte'), bpScore(s, 'fraco')];
}

test('Treino (autojogo) no Com Terra: a IA que escolhe a melhor jogada vence a que joga ao acaso', () => {
  let wins = 0;
  let games = 0;
  for (const seed of [11, 23, 37, 41, 59, 73]) {
    for (const first of [true, false]) {
      const [a, b] = strongVsWeak(seed, first);
      games++;
      if (a > b) wins++;
    }
  }
  assert.ok(wins / games >= 0.75, `venceu ${wins}/${games}`);
});

test('Conhecimento local: Adedanha preenche com a letra certa, sem repetir', () => {
  const ans = adedanhaLocal('B', ['Animal', 'Fruta', 'Cor', 'Cidade, estado ou país', 'Cantor ou banda', 'Time de futebol']);
  const filled = ans.filter(Boolean);
  assert.ok(filled.length >= 5, ans.join(','));
  filled.forEach((w) => assert.equal(w.normalize('NFD')[0].toUpperCase(), 'B', w));
  assert.ok(ans.includes('') || new Set(filled).size === filled.length);
  // nomes compostos inteiros
  const cantor = adedanhaLocal('B', ['Cantor ou banda'])[0];
  assert.ok(/^Belo$|^Bruno Mars$/.test(cantor), cantor);
});

test('Conhecimento local: erros plausiveis e dicas nunca vazios', () => {
  assert.ok(temPlausibleWrong('Qual fruta você mais come no café da manhã?', ['Banana']).length > 0);
  assert.ok(siblingWord('Cachorro').length > 0);
  assert.ok(questionsFor('Futebol').length >= 5);
  assert.ok(Array.isArray(megaCluesLocal('Pizza')));
});

const P = (id: string, team: 'A' | 'B' = 'A'): Player =>
  ({ id, name: id, avatar: '', color: '#fff', team, isVip: false, score: 0, powerCards: {} as any, connected: true, lastActive: 0 }) as Player;

test('IA nunca responde "nao sei": Tem ou Nao Tem sem Gemini erra com uma resposta de verdade', () => {
  const bot = P('ia-facil-1');
  const r = {
    roomId: 'X', hostId: 'h', screen: 'playing', theme: 't', timerConfig: 0, activeGame: 'tem-ou-nao-tem', players: [bot, P('h1', 'B')],
    temOuNaoTem: {
      phase: 'GUESSING', activeTeam: 'A', activePlayerId: bot.id, turnStepIndex: 0, maxStrikes: 2, strikes: { A: 0, B: 0 }, eliminatedTeams: [], freeDomainTeam: null, roundScore: { A: 0, B: 0 },
      roundData: { pergunta: 'Qual fruta você mais come?', respostas: [] },
      items: [{ texto: 'Banana', sinonimos_aceitos: [], votos: 40, revealed: false }]
    }
  } as unknown as GameRoom;
  const mv = ALL_ADAPTERS['tem-ou-nao-tem'](r, bot)!;
  const after = mv.apply(r, []); // [] = Gemini sem resposta -> forca o caminho do erro
  const said = after.botSay?.text || '';
  assert.ok(said.length > 1 && !/n[aã]o sei|passo|hmm/i.test(said), said);
});
