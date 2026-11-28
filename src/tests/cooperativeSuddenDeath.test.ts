import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNextRoundUpdater } from '../app/buildNextRoundUpdater.ts';
import type { TeamId } from '../types/game.ts';

const team = (id: TeamId, score: number) => ({ id, name: `Equipe ${id}`, score, members: [] });
const player = (id: string, teamId: TeamId, score: number) => ({
  id,
  name: id,
  avatar: '',
  color: '',
  team: teamId,
  isVip: false,
  score,
  connected: true,
  lastActive: 0,
  powerCards: { ligacao: false, troca: false, x2: false, menos1: false }
});

const lastRoundRoom = (over: Record<string, unknown>, players: ReturnType<typeof player>[]): any => ({
  roomId: 'X',
  hostId: 'h',
  screen: 'playing',
  theme: 'Geral',
  roundNumber: 3,
  maxRounds: 3,
  timerConfig: 60,
  teams: { A: team('A', 4), B: team('B', 4) },
  players,
  sessionStats: { totalMatches: 0, victoriesA: 0, victoriesB: 0, totalPointsA: 0, totalPointsB: 0, history: [] },
  lastUpdated: 0,
  ...over
});

const cooperativeCases: [string, Record<string, unknown>][] = [
  ['mimica', { activeGame: 'mimica', mimica: { mimeTeam: 'A', roundScore: 2 } }],
  ['mega-resenha', { activeGame: 'mega-resenha', megaResenha: { team: 'A', roundScore: 2 } }],
  ['proibido', { activeGame: 'proibido', proibido: { speakerTeam: 'A', roundScore: 2, is2PlayerMode: true } }],
  ['repetente', { activeGame: 'repetente', repetente: { result: { groups: [], pointsByTeam: { A: 1, B: 1, C: 0, D: 0 } } } }]
];

test('modo cooperativo (2 jogadores): a partida termina na ultima rodada, sem morte subita eterna', () => {
  for (const [name, patch] of cooperativeCases) {
    let banner: string | null = 'x';
    const update = buildNextRoundUpdater({ setSuddenDeathBanner: (v) => { banner = v as string | null; }, duvidoEndsEarly: false });
    const out = update(lastRoundRoom(patch, [player('a', 'A', 4), player('b', 'B', 4)]));
    assert.equal(out.screen, 'game-over', `${name}: dupla cooperativa sempre empata nas equipes, nao pode abrir morte subita`);
    assert.equal(out.maxRounds, 3, `${name}: numero de rodadas nao cresce`);
    assert.equal(banner, null, `${name}: sem faixa de morte subita`);
  }
});

test('jogo de equipe competitivo empatado na ultima rodada continua abrindo morte subita', () => {
  const update = buildNextRoundUpdater({ setSuddenDeathBanner: () => {}, duvidoEndsEarly: false });
  const out = update(
    lastRoundRoom({ activeGame: 'mimica', mimica: { mimeTeam: 'A', roundScore: 0 } }, [
      player('a1', 'A', 4),
      player('b1', 'B', 4),
      player('a2', 'A', 0),
      player('b2', 'B', 0)
    ])
  );
  assert.equal(out.screen, 'playing');
  assert.equal(out.maxRounds, 4);
});
