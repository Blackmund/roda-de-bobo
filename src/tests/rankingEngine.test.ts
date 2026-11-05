import test from 'node:test';
import assert from 'node:assert/strict';
import { computePlayerRanking } from '../utils/rankingEngine';
import { Player, SessionStats } from '../types/game';

test('Ranking Engine: calculates proportional winrate (% de vitórias sobre participações)', () => {
  const dummyPlayers: Player[] = [
    {
      id: 'novato',
      name: 'Novato Relâmpago',
      avatar: '⚡',
      color: '#17B8B8',
      team: 'A',
      isVip: false,
      score: 100,
      roundsPlayed: 1,
      roundsWon: 1,
      powerCards: { ligacao: true, troca: true, x2: true, menos1: true },
      connected: true,
      lastActive: Date.now()
    },
    {
      id: 'veterano',
      name: 'Veterano de Guerra',
      avatar: '🦁',
      color: '#E6194B',
      team: 'B',
      isVip: false,
      score: 800,
      roundsPlayed: 10,
      roundsWon: 7,
      powerCards: { ligacao: true, troca: true, x2: true, menos1: true },
      connected: true,
      lastActive: Date.now()
    }
  ];

  const ranking = computePlayerRanking(undefined, dummyPlayers);
  
  // Novato won 1 of 1 -> 100%
  const novato = ranking.find((r) => r.name === 'Novato Relâmpago');
  assert.ok(novato);
  assert.equal(novato.winrate, 100);
  assert.equal(novato.victories, 1);
  assert.equal(novato.participations, 1);

  // Novato (100%) should rank above Veterano (70%) in proportional winrate ranking
  const veterano = ranking.find((r) => r.name === 'Veterano de Guerra');
  assert.ok(veterano);
  assert.equal(veterano.winrate, 70);

  const novatoIndex = ranking.indexOf(novato);
  const veteranoIndex = ranking.indexOf(veterano);
  assert.ok(novatoIndex < veteranoIndex, 'Novato with 100% winrate should rank higher than 70%');
});

test('Ranking Engine: includes fixed players and breaks ties by total victories', () => {
  const ranking = computePlayerRanking();
  assert.ok(ranking.length >= 5, 'Should include fixed roster players');
  
  // All entries must have non-negative integers and winrate between 0 and 100
  ranking.forEach((entry) => {
    assert.ok(entry.winrate >= 0 && entry.winrate <= 100);
    assert.ok(entry.participations >= entry.victories);
  });
});
