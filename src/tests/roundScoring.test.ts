import test from 'node:test';
import assert from 'node:assert/strict';
import { accumulateRoundPlayerScores } from '../utils/sessionMvp.ts';
import { computeRoundTeamPoints } from '../utils/roundPoints.ts';

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `J${i + 1}`,
    avatar: '',
    color: '#fff',
    team: (i % 2 === 0 ? 'A' : 'B') as 'A' | 'B',
    score: 0
  }));

const roomWith = (patch: Record<string, unknown>, n = 4): any => ({ players: players(n), ...patch });

test('pontos por jogador: Mimica, Mega Resenha, Repetente e Como eu pinto somam os pontos da propria equipe', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['mimica', { activeGame: 'mimica', mimica: { mimeTeam: 'A', roundScore: 3 } }],
    ['mega-resenha', { activeGame: 'mega-resenha', megaResenha: { team: 'A', roundScore: 3 } }],
    ['repetente', { activeGame: 'repetente', repetente: { result: { groups: [], pointsByTeam: { A: 3, B: 0, C: 0, D: 0 } } } }]
  ];
  for (const [name, patch] of cases) {
    const out = accumulateRoundPlayerScores(roomWith(patch));
    const byId = Object.fromEntries(out.map((p) => [p.id, p]));
    assert.equal(byId.p1.score, 3, `${name}: equipe A (p1)`);
    assert.equal(byId.p3.score, 3, `${name}: equipe A (p3)`);
    assert.equal(byId.p2.score, 0, `${name}: equipe B nao pontua`);
    assert.equal(byId.p1.roundsWon, 1, `${name}: rodada vencida conta`);
    assert.equal(byId.p2.roundsWon, 0);
  }
});

test('pontos por jogador: dupla cooperativa (2 jogadores) pontua junta nos jogos de equipe', () => {
  const out = accumulateRoundPlayerScores(roomWith({ activeGame: 'mimica', mimica: { mimeTeam: 'A', roundScore: 2 } }, 2));
  assert.deepEqual(out.map((p) => p.score), [2, 2]);
});

test('pontos por jogador: Perguntas e Verdades da +100 ao vencedor', () => {
  const out = accumulateRoundPlayerScores(roomWith({ activeGame: 'perguntas-e-verdades', perguntasEVerdades: { winnerPlayerId: 'p2' } }));
  const byId = Object.fromEntries(out.map((p) => [p.id, p]));
  assert.equal(byId.p2.score, 100);
  assert.equal(byId.p1.score, 0);
});

test('pontos por equipe e por jogador batem (mesma regra em um unico lugar)', () => {
  const room = roomWith({ activeGame: 'mega-resenha', megaResenha: { team: 'B', roundScore: 5 } });
  const team = computeRoundTeamPoints(room);
  assert.equal(team.B, 5);
  assert.equal(team.A, 0);
  const out = accumulateRoundPlayerScores(room);
  const sumB = out.filter((p) => p.team === 'B').reduce((a, p) => a + p.score, 0);
  assert.equal(sumB, 5 * 2, 'cada um dos 2 jogadores da equipe B recebe os 5 pontos');
});
