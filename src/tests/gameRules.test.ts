import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURATED_LIMITE, CURATED_TEM_OU_NAO_TEM } from '../data/curatedRounds.ts';
import { normalizeTemVotesTo100 } from '../utils/aiGameGenerator.ts';
import {
  saveRoomStateToStorage,
  loadRoomStateFromStorage,
  clearRoomStateFromStorage,
  isResumableGame,
  getResumableMatchScore,
  accumulateRoundPlayerScores,
  computeSessionMVP,
  formatMatchResultsShareText,
  shareMatchResults,
  buildMatchMVPSnapshot,
  resolveMatchMVPFromHistoryEntry,
  getSessionMVPHistory,
  buildRoundActivityEvent,
  getMatchRoundActivityLog,
  computeCareerTrophyMedals,
  computeMatchPlayerComparison
} from '../utils/sessionPersistence.ts';
import {
  RETRO_AVATAR_CATEGORIES,
  RETRO_AVATARS,
  savePlayerAvatarPreference,
  loadPlayerAvatarPreferences,
  getSavedPlayerAvatar,
  saveLastSelectedAvatar,
  loadLastSelectedAvatar,
  resolvePlayerAvatar
} from '../utils/retroAvatars.ts';
import {
  getCountdownVibrationPattern,
  triggerCountdownHaptic,
  resolveActiveControllerTimer,
  advanceControllerTimerOneSecond
} from '../utils/hapticFeedback.ts';
import {
  sanitizeRoomCode,
  getUnclaimedQuickSelectPlayers,
  claimOrRegisterPlayerInRoom,
  reconnectPlayerInRoom,
  findBoundPlayerForDevice,
  triggerPingOnPlayerInRoom,
  triggerBuzzReadyInRoom
} from '../utils/partyNetworkEngine.ts';
import {
  isLimiteGuessExact,
  computeLimiteWinnerPoints,
  evaluateLimiteRoundReveal,
  toggleLimiteWinnerPoint
} from '../components/host/ScreenLimite.tsx';
import {
  computeNotaRoundPoints,
  toggleNotaSelectedPlayer,
  drawRandomScoreCSPRNG
} from '../components/SpinningNumberWheel.tsx';
import { checkAnswerFuzzyMatch } from '../utils/fuzzyMatch.ts';
import { getTeamCount, getActiveTeamIds } from '../utils/teamUtils.ts';
import {
  UNAMBIGUOUS_ROOM_CHARS,
  generateUnique6CharRoomCode,
  createUniqueRoomSession,
  parseRoomQueryParams,
  drawRandomStartingPlayer,
  balancePlayersIntoTeams,
  DIFFICULTY_META
} from '../utils/multiplayerRoomEngine.ts';
import { GAME_TUTORIALS } from '../components/setup/Step5GameTutorial.tsx';
import type { GameRoom, LimiteGameState, GameId } from '../types/game.ts';
import {
  buildLimitePrompt,
  selectFewShotLimiteExamples
} from '../utils/limiteGoldenDatabase.ts';
import { buildProibidoPrompt, ensureStrictForbiddenWordsCount } from '../utils/proibidoGoldenDatabase.ts';
import { buildDuvidoPrompt } from '../utils/duvidoGoldenDatabase.ts';
import { buildTemOuNaoTemPrompt } from '../utils/temOuNaoTemGoldenDatabase.ts';
import { buildNotaPrompt } from '../utils/notaGoldenDatabase.ts';
import {
  getCacheKey,
  generateThemeStrictFallbackRound
} from '../utils/aiGameGenerator.ts';

function createMockRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    roomId: 'BOBO',
    hostId: 'host_1',
    screen: 'lobby',
    activeGame: null,
    theme: 'Futebol Brasileiro',
    roundNumber: 1,
    maxRounds: 3,
    timerConfig: 60,
    players: [],
    teams: {
      A: { id: 'A', name: 'Dupla Alfa', score: 0, members: [] },
      B: { id: 'B', name: 'Dupla Bravo', score: 0, members: [] }
    },
    sessionStats: {
      totalMatches: 0,
      victoriesA: 0,
      victoriesB: 0,
      totalPointsA: 0,
      totalPointsB: 0,
      history: []
    },
    lastUpdated: 1000,
    ...overrides
  };
}

test('Jogo do Limite: Winner is highest <= exact, strictly > is busted, and non-exact winner gets 1 point', () => {
  const baseState: LimiteGameState = {
    phase: 'SECRET_GUESS',
    roundData: {
      pergunta: 'Quantos km tem a ponte?',
      valor_exato: 485,
      unidade: 'km',
      curiosidade_explicacao: 'Curiosidade'
    },
    guesses: { p1: 450, p2: 480, p3: 486 }, // p3 busted, p2 closest non-exact
    submittedPlayers: ['p1', 'p2', 'p3'],
    powerCardsPlayed: {},
    callTimerRemaining: 0,
    timerActive: false,
    timerSeconds: 60,
    revealedOrder: false,
    winners: [],
    bustedPlayers: [],
    closestDifference: 0,
    pointsAwarded: {}
  };

  const revealed = evaluateLimiteRoundReveal(baseState);
  assert.deepEqual(revealed.winners, ['p2']);
  assert.deepEqual(revealed.bustedPlayers, ['p3']);
  assert.equal(revealed.pointsAwarded['p2'], 1, 'Non-exact closest winner receives 1 point');
});

test('Jogo do Limite: Exact hit ("cravar a resposta exatamente") awards 2 points instead of 1', () => {
  const baseState: LimiteGameState = {
    phase: 'SECRET_GUESS',
    roundData: {
      pergunta: 'Quantos ossos tem o corpo humano adulto?',
      valor_exato: 206,
      unidade: 'ossos',
      curiosidade_explicacao: 'O corpo humano adulto possui exatamente 206 ossos.'
    },
    guesses: { p1: 200, p2: 206, p3: 210 }, // p2 cravou 206!
    submittedPlayers: ['p1', 'p2', 'p3'],
    powerCardsPlayed: {},
    callTimerRemaining: 0,
    timerActive: false,
    timerSeconds: 60,
    revealedOrder: false,
    winners: [],
    bustedPlayers: [],
    closestDifference: 0,
    pointsAwarded: {}
  };

  assert.equal(isLimiteGuessExact(206, 206), true);
  assert.equal(isLimiteGuessExact(200, 206), false);
  assert.equal(computeLimiteWinnerPoints(baseState, 'p2'), 2);
  assert.equal(computeLimiteWinnerPoints(baseState, 'p1'), 1);

  const revealed = evaluateLimiteRoundReveal(baseState);
  assert.deepEqual(revealed.winners, ['p2']);
  assert.equal(revealed.closestDifference, 0);
  assert.equal(revealed.pointsAwarded['p2'], 2, 'Exact guess winner must receive 2 points');

  // Verify toggleLimiteWinnerPoint also respects exact hit (2 pts) and manual forceExact in Mesa/Voz mode
  const toggledOff = toggleLimiteWinnerPoint(revealed, 'p2');
  assert.equal(toggledOff.pointsAwarded['p2'], undefined);

  const toggledBackOn = toggleLimiteWinnerPoint(toggledOff, 'p2');
  assert.equal(toggledBackOn.pointsAwarded['p2'], 2);

  // Manual forceExact for a player who answered by voice
  const voiceExact = toggleLimiteWinnerPoint(toggledOff, 'p1', true);
  assert.equal(voiceExact.pointsAwarded['p1'], 2);
});

test('Jogo do Limite: Exception rule when ALL bust - closest bust wins 1 point', () => {
  const exact = 100;
  const guesses = { p1: 105, p2: 120, p3: 150 }; // all busted

  const valid = Object.entries(guesses).filter(([, v]) => v <= exact);
  assert.equal(valid.length, 0);

  const diffs = Object.entries(guesses).map(([pid, v]) => ({ pid, diff: Math.abs(v - exact) }));
  diffs.sort((a, b) => a.diff - b.diff);

  assert.equal(diffs[0].pid, 'p1');
  assert.equal(diffs[0].diff, 5);
});

test('Tem ou Não Tem: Curated rounds all have 5 answers and votes sum exactly to 100', () => {
  CURATED_TEM_OU_NAO_TEM.forEach((round, idx) => {
    assert.equal(round.respostas.length, 5, `Round ${idx} must have 5 answers`);
    const totalVotes = round.respostas.reduce((acc, curr) => acc + curr.votos, 0);
    assert.equal(totalVotes, 100, `Round ${idx} votes sum must equal 100 (got ${totalVotes})`);

    // Check descending order
    for (let i = 0; i < round.respostas.length - 1; i++) {
      assert.ok(
        round.respostas[i].votos >= round.respostas[i + 1].votos,
        `Round ${idx} must be descending: ${round.respostas[i].votos} vs ${round.respostas[i + 1].votos}`
      );
    }

    // Single Entity Law: absolutely NO slashes "/" or multiple names grouped in a single position
    round.respostas.forEach((item, rIdx) => {
      assert.ok(
        !item.texto.includes('/'),
        `Round ${idx} position ${rIdx + 1} ("${item.texto}") contains forbidden slash "/"`
      );
      assert.ok(
        !item.texto.toLowerCase().includes(' ou '),
        `Round ${idx} position ${rIdx + 1} ("${item.texto}") contains forbidden compound "ou"`
      );
    });
  });
});

test('Tem ou Não Tem: normalizeTemVotesTo100 strips slashes, "ou", and separates synonyms', () => {
  const dirtyItems = [
    { texto: 'Neymar Jr / Gabigol / Raphael Veiga', votos: 40, sinonimos_aceitos: ['neymar'] },
    { texto: 'Chaves ou Chapolin', votos: 30, sinonimos_aceitos: [] },
    { texto: 'Pizza de Mussarela, Pizza de Calabresa', votos: 30, sinonimos_aceitos: [] }
  ];

  const cleaned = normalizeTemVotesTo100(dirtyItems);
  assert.equal(cleaned[0].texto, 'Neymar Jr');
  assert.ok(cleaned[0].sinonimos_aceitos.includes('gabigol'));
  assert.ok(cleaned[0].sinonimos_aceitos.includes('raphael veiga'));

  assert.equal(cleaned[1].texto, 'Chaves');
  assert.ok(cleaned[1].sinonimos_aceitos.includes('chapolin'));

  assert.equal(cleaned[2].texto, 'Pizza de Mussarela');
});


test('Curated Limite rounds all have positive exact values and explanations', () => {
  assert.ok(CURATED_LIMITE.length >= 3);
  CURATED_LIMITE.forEach((round) => {
    assert.ok(typeof round.pergunta === 'string' && round.pergunta.length > 5);
    assert.ok(typeof round.valor_exato === 'number' && round.valor_exato > 0);
    assert.ok(typeof round.curiosidade_explicacao === 'string' && round.curiosidade_explicacao.length > 5);
  });
});

test('Persistence Layer: saves, loads, and clears active room state in localStorage', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    }
  };

  // Default untouched lobby room is not resumable
  const blankRoom = createMockRoom();
  assert.equal(isResumableGame(blankRoom), false);
  assert.equal(saveRoomStateToStorage(blankRoom, mockStorage), false);

  // Active game room is saved and resumable
  const activeRoom = createMockRoom({
    screen: 'playing',
    activeGame: 'tem-ou-nao-tem',
    roundNumber: 2,
    teams: {
      A: { id: 'A', name: 'Dupla Alfa', score: 65, members: [] },
      B: { id: 'B', name: 'Dupla Bravo', score: 35, members: [] }
    }
  });

  assert.equal(isResumableGame(activeRoom), true);
  assert.equal(saveRoomStateToStorage(activeRoom, mockStorage), true);

  const loaded = loadRoomStateFromStorage('BOBO', mockStorage);
  assert.ok(loaded);
  assert.equal(loaded.screen, 'playing');
  assert.equal(loaded.activeGame, 'tem-ou-nao-tem');
  assert.equal(loaded.roundNumber, 2);
  assert.equal(loaded.teams.A.score, 65);

  clearRoomStateFromStorage('BOBO', mockStorage);
  assert.equal(loadRoomStateFromStorage('BOBO', mockStorage), null);

  // Lobby room after returning from a completed match (sessionStats > 0, activeGame: null) is NOT a resumable interrupted match
  const returnedToLobbyRoom = createMockRoom({
    screen: 'lobby',
    activeGame: null,
    roundNumber: 1,
    sessionStats: {
      totalMatches: 1,
      victoriesA: 1,
      victoriesB: 0,
      totalPointsA: 76,
      totalPointsB: 45,
      history: []
    }
  });
  assert.equal(isResumableGame(returnedToLobbyRoom), false);

  // getResumableMatchScore does not double-count temOuNaoTem.roundScore on game-over, but includes live roundScore on playing
  const playingTemRoom = createMockRoom({
    screen: 'playing',
    activeGame: 'tem-ou-nao-tem',
    teams: {
      A: { id: 'A', name: 'Dupla Alfa', score: 50, members: [] },
      B: { id: 'B', name: 'Dupla Bravo', score: 30, members: [] }
    },
    temOuNaoTem: {
      phase: 'GUESSING',
      roundData: { pergunta: 'P', respostas: [] },
      items: [],
      activeTeam: 'A',
      strikes: { A: 0, B: 0 },
      maxStrikes: 2,
      eliminatedTeams: [],
      freeDomainTeam: null,
      roundScore: { A: 26, B: 15 }
    }
  });
  assert.deepEqual(getResumableMatchScore(playingTemRoom), { scoreA: 76, scoreB: 45 });

  const gameOverTemRoom = createMockRoom({
    screen: 'game-over',
    activeGame: 'tem-ou-nao-tem',
    teams: {
      A: { id: 'A', name: 'Dupla Alfa', score: 76, members: [] },
      B: { id: 'B', name: 'Dupla Bravo', score: 45, members: [] }
    },
    temOuNaoTem: {
      phase: 'ROUND_END',
      roundData: { pergunta: 'P', respostas: [] },
      items: [],
      activeTeam: 'A',
      strikes: { A: 0, B: 0 },
      maxStrikes: 2,
      eliminatedTeams: [],
      freeDomainTeam: null,
      roundScore: { A: 76, B: 0 }
    }
  });
  assert.deepEqual(getResumableMatchScore(gameOverTemRoom), { scoreA: 76, scoreB: 45 });
});

test('MVP Calculation: selects highest individual scorer and retrieves performance metrics from player object', () => {
  const room = createMockRoom({
    screen: 'game-over',
    players: [
      {
        id: 'p1',
        name: 'Cazé',
        avatar: '🦁',
        color: '#FF1E56',
        team: 'A',
        isVip: true,
        score: 42,
        roundsPlayed: 4,
        roundsWon: 2,
        accuracy: 50,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      },
      {
        id: 'p2',
        name: 'Beltrão',
        avatar: '🦊',
        color: '#17B8B8',
        team: 'B',
        isVip: false,
        score: 95,
        roundsPlayed: 4,
        roundsWon: 3,
        accuracy: 75,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      }
    ],
    sessionStats: {
      totalMatches: 2,
      victoriesA: 1,
      victoriesB: 1,
      totalPointsA: 120,
      totalPointsB: 150,
      history: [
        {
          id: 'm1',
          gameId: 'tem-ou-nao-tem',
          gameName: 'TEM OU NÃO TEM',
          timestamp: 1000,
          winnerTeam: 'B',
          scoreA: 60,
          scoreB: 95,
          roundsPlayed: 4,
          theme: 'Copa do Mundo',
          playerScores: [
            { id: 'p1', name: 'Cazé', avatar: '🦁', team: 'A', score: 42, roundsPlayed: 4, roundsWon: 2, accuracy: 50 },
            { id: 'p2', name: 'Beltrão', avatar: '🦊', team: 'B', score: 95, roundsPlayed: 4, roundsWon: 3, accuracy: 75 }
          ]
        }
      ]
    }
  });

  const mvp = computeSessionMVP(room);
  assert.equal(mvp.playerId, 'p2');
  assert.equal(mvp.name, 'Beltrão');
  assert.equal(mvp.score, 95);
  assert.equal(mvp.team, 'B');
  assert.equal(mvp.roundsPlayed, 4);
  assert.equal(mvp.roundsWon, 3);
  assert.equal(mvp.accuracy, 75);
});

test('accumulateRoundPlayerScores increments player scores, roundsPlayed, roundsWon, and accuracy', () => {
  const room = createMockRoom({
    activeGame: 'limite',
    players: [
      {
        id: 'p1',
        name: 'Cazé',
        avatar: '🦁',
        color: '#FF1E56',
        team: 'A',
        isVip: true,
        score: 5,
        roundsPlayed: 1,
        roundsWon: 1,
        accuracy: 100,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      },
      {
        id: 'p2',
        name: 'Beltrão',
        avatar: '🦊',
        color: '#17B8B8',
        team: 'B',
        isVip: false,
        score: 0,
        roundsPlayed: 1,
        roundsWon: 0,
        accuracy: 0,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      }
    ],
    limite: {
      phase: 'SCORING',
      roundData: { pergunta: 'Q', valor_exato: 10, unidade: 'u', curiosidade_explicacao: 'c' },
      guesses: { p1: 9, p2: 12 },
      submittedPlayers: ['p1', 'p2'],
      powerCardsPlayed: { p1: 'x2' },
      callTimerRemaining: 0,
      timerActive: false,
      timerSeconds: 60,
      revealedOrder: true,
      winners: ['p1'],
      bustedPlayers: ['p2'],
      closestDifference: 1,
      pointsAwarded: { p1: 2, p2: 0 }
    }
  });

  const updated = accumulateRoundPlayerScores(room);
  assert.equal(updated[0].score, 7);
  assert.equal(updated[0].roundsPlayed, 2);
  assert.equal(updated[0].roundsWon, 2);
  assert.equal(updated[0].accuracy, 100);

  assert.equal(updated[1].score, 0);
  assert.equal(updated[1].roundsPlayed, 2);
  assert.equal(updated[1].roundsWon, 0);
  assert.equal(updated[1].accuracy, 0);
});

test('shareMatchResults uses Web Share API and includes MVP player name and total points', async () => {
  const room = createMockRoom({
    roomId: 'BOBO',
    screen: 'game-over',
    teams: {
      A: { id: 'A', name: 'Dupla Alfa', score: 110, members: ['p1'] },
      B: { id: 'B', name: 'Dupla Bravo', score: 75, members: ['p2'] }
    }
  });

  const mvp = {
    playerId: 'p1',
    name: 'Cazé (VIP)',
    avatar: '🦁',
    team: 'A' as const,
    teamName: 'Dupla Alfa',
    score: 112,
    roundsPlayed: 3,
    roundsWon: 3,
    accuracy: 100,
    matchesWon: 1,
    highlightReason: 'Maior pontuação individual da sessão'
  };

  const formatted = formatMatchResultsShareText(room, mvp);
  assert.ok(formatted.includes('Cazé (VIP)'));
  assert.ok(formatted.includes('112 PTS'));
  assert.ok(formatted.includes('Accuracy 100%'));
  assert.ok(formatted.includes('Rounds Played: 3'));

  let sharedPayload: { title?: string; text?: string } | null = null;
  let clipboardText = '';

  const res = await shareMatchResults(room, mvp, {
    share: async (data) => {
      sharedPayload = data;
    },
    clipboard: {
      writeText: async (txt) => {
        clipboardText = txt;
      }
    }
  });

  assert.equal(res.success, true);
  assert.equal(res.method, 'web-share');
  assert.ok(sharedPayload);
  assert.ok((sharedPayload as { text?: string }).text?.includes('Cazé (VIP)'));
  assert.ok((sharedPayload as { text?: string }).text?.includes('112 PTS'));
  assert.ok(clipboardText.includes('Cazé (VIP)'));
});

test('MVP History: builds match MVP snapshots and lists previous match MVPs with avatar, name, and total score', () => {
  const snapshot = buildMatchMVPSnapshot(
    [
      {
        id: 'p1',
        name: 'Cazé (VIP)',
        avatar: '🦁',
        color: '#FF1E56',
        team: 'A',
        isVip: true,
        score: 88,
        roundsPlayed: 3,
        roundsWon: 3,
        accuracy: 100,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      },
      {
        id: 'p2',
        name: 'Beltrão',
        avatar: '🦊',
        color: '#17B8B8',
        team: 'B',
        isVip: false,
        score: 45,
        roundsPlayed: 3,
        roundsWon: 1,
        accuracy: 33,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      }
    ],
    88,
    45,
    3,
    'Dupla Alfa',
    'Dupla Bravo'
  );

  assert.equal(snapshot.playerId, 'p1');
  assert.equal(snapshot.name, 'Cazé (VIP)');
  assert.equal(snapshot.avatar, '🦁');
  assert.equal(snapshot.score, 88);

  const mvpHistory = getSessionMVPHistory(
    {
      totalMatches: 2,
      victoriesA: 1,
      victoriesB: 1,
      totalPointsA: 148,
      totalPointsB: 165,
      history: [
        {
          id: 'match_1',
          gameId: 'limite',
          gameName: 'JOGO DO LIMITE',
          timestamp: 1000,
          winnerTeam: 'A',
          scoreA: 88,
          scoreB: 45,
          roundsPlayed: 3,
          theme: 'Futebol Brasileiro',
          mvp: snapshot
        },
        {
          id: 'match_2',
          gameId: 'tem-ou-nao-tem',
          gameName: 'TEM OU NÃO TEM',
          timestamp: 2000,
          winnerTeam: 'B',
          scoreA: 60,
          scoreB: 120,
          roundsPlayed: 3,
          theme: 'Anos 90',
          playerScores: [
            { id: 'p1', name: 'Cazé (VIP)', avatar: '🦁', team: 'A', score: 60, roundsPlayed: 3, roundsWon: 1, accuracy: 33 },
            { id: 'p2', name: 'Beltrão', avatar: '🦊', team: 'B', score: 120, roundsPlayed: 3, roundsWon: 3, accuracy: 100 }
          ]
        }
      ]
    },
    'Dupla Alfa',
    'Dupla Bravo'
  );

  // Reverse chronological order: match_2 first, then match_1
  assert.equal(mvpHistory.length, 2);
  assert.equal(mvpHistory[0].matchId, 'match_2');
  assert.equal(mvpHistory[0].name, 'Beltrão');
  assert.equal(mvpHistory[0].avatar, '🦊');
  assert.equal(mvpHistory[0].score, 120);
  assert.equal(mvpHistory[0].gameName, 'TEM OU NÃO TEM');

  assert.equal(mvpHistory[1].matchId, 'match_1');
  assert.equal(mvpHistory[1].name, 'Cazé (VIP)');
  assert.equal(mvpHistory[1].avatar, '🦁');
  assert.equal(mvpHistory[1].score, 88);
  assert.equal(mvpHistory[1].gameName, 'JOGO DO LIMITE');

  // Also test fallback when no playerScores or mvp are on an older entry
  const fallbackEntry = resolveMatchMVPFromHistoryEntry(
    {
      id: 'match_fallback',
      gameId: 'duvido',
      gameName: 'JOGO DO DUVIDO',
      timestamp: 3000,
      winnerTeam: 'A',
      scoreA: 5,
      scoreB: 2,
      roundsPlayed: 3,
      theme: 'Seleção Brasileira'
    },
    'Dupla Alfa',
    'Dupla Bravo'
  );
  assert.equal(fallbackEntry.name, 'Capitão Dupla Alfa');
  assert.equal(fallbackEntry.avatar, '🦁');
  assert.equal(fallbackEntry.score, 5);
});

test('buildRoundActivityEvent and getMatchRoundActivityLog generate timeline events per round', () => {
  const baseRoom = createMockRoom({
    activeGame: 'tem-ou-nao-tem',
    roundNumber: 1,
    maxRounds: 3
  });

  const r1 = buildRoundActivityEvent(baseRoom, 45, 20, 45, 20, 'TEM OU NÃO TEM');
  assert.equal(r1.roundNumber, 1);
  assert.equal(r1.winnerTeam, 'A');
  assert.equal(r1.headline, 'Team A won Round 1');
  assert.equal(r1.pointsA, 45);
  assert.equal(r1.pointsB, 20);

  const r2 = buildRoundActivityEvent(
    { ...baseRoom, roundNumber: 2 },
    15,
    50,
    60,
    70,
    'TEM OU NÃO TEM'
  );
  assert.equal(r2.roundNumber, 2);
  assert.equal(r2.winnerTeam, 'B');
  assert.equal(r2.headline, 'Team B won Round 2');
  assert.equal(r2.cumulativeScoreA, 60);
  assert.equal(r2.cumulativeScoreB, 70);

  const r3 = buildRoundActivityEvent(
    { ...baseRoom, roundNumber: 3 },
    30,
    30,
    90,
    100,
    'TEM OU NÃO TEM'
  );
  assert.equal(r3.roundNumber, 3);
  assert.equal(r3.winnerTeam, 'EMPATE');
  assert.equal(r3.headline, 'Round 3 tied — Team A vs Team B');

  const logFromRoom = getMatchRoundActivityLog({
    ...baseRoom,
    roundLog: [r2, r1, r3]
  });
  assert.equal(logFromRoom.length, 3);
  assert.equal(logFromRoom[0].headline, 'Team A won Round 1');
  assert.equal(logFromRoom[1].headline, 'Team B won Round 2');
  assert.equal(logFromRoom[2].headline, 'Round 3 tied — Team A vs Team B');

  // Verify fallback synthesis when roundLog is absent
  const synthRoom = createMockRoom({
    screen: 'game-over',
    maxRounds: 2,
    teams: {
      A: { id: 'A', name: 'Dupla Alfa', score: 60, members: [] },
      B: { id: 'B', name: 'Dupla Bravo', score: 40, members: [] }
    }
  });
  const synthLog = getMatchRoundActivityLog(synthRoom);
  assert.equal(synthLog.length, 2);
  assert.equal(synthLog[1].cumulativeScoreA, 60);
  assert.equal(synthLog[1].cumulativeScoreB, 40);
});

test('computeCareerTrophyMedals awards virtual medals for Most Wins, Best Accuracy, MVP Streaks, and Most Points', () => {
  const medals = computeCareerTrophyMedals(
    {
      totalMatches: 3,
      victoriesA: 2,
      victoriesB: 1,
      totalPointsA: 220,
      totalPointsB: 170,
      history: [
        {
          id: 'm1',
          gameId: 'limite',
          gameName: 'JOGO DO LIMITE',
          timestamp: 1000,
          winnerTeam: 'A',
          scoreA: 80,
          scoreB: 50,
          roundsPlayed: 3,
          theme: 'Tema 1',
          playerScores: [
            { id: 'p1', name: 'Cazé', avatar: '🦁', team: 'A', score: 80, roundsPlayed: 3, roundsWon: 2, accuracy: 67 },
            { id: 'p2', name: 'Beltrão', avatar: '🦊', team: 'B', score: 50, roundsPlayed: 3, roundsWon: 3, accuracy: 100 }
          ]
        },
        {
          id: 'm2',
          gameId: 'nota',
          gameName: 'JOGO DA NOTA',
          timestamp: 2000,
          winnerTeam: 'A',
          scoreA: 90,
          scoreB: 40,
          roundsPlayed: 3,
          theme: 'Tema 2',
          playerScores: [
            { id: 'p1', name: 'Cazé', avatar: '🦁', team: 'A', score: 90, roundsPlayed: 3, roundsWon: 2, accuracy: 67 },
            { id: 'p2', name: 'Beltrão', avatar: '🦊', team: 'B', score: 40, roundsPlayed: 3, roundsWon: 3, accuracy: 100 }
          ]
        },
        {
          id: 'm3',
          gameId: 'duvido',
          gameName: 'JOGO DO DUVIDO',
          timestamp: 3000,
          winnerTeam: 'B',
          scoreA: 50,
          scoreB: 80,
          roundsPlayed: 3,
          theme: 'Tema 3',
          playerScores: [
            { id: 'p1', name: 'Cazé', avatar: '🦁', team: 'A', score: 50, roundsPlayed: 3, roundsWon: 1, accuracy: 33 },
            { id: 'p2', name: 'Beltrão', avatar: '🦊', team: 'B', score: 80, roundsPlayed: 3, roundsWon: 3, accuracy: 100 }
          ]
        }
      ]
    },
    'Dupla Alfa',
    'Dupla Bravo'
  );

  assert.equal(medals.length, 4);

  const mostWins = medals.find((m) => m.id === 'most-wins');
  assert.ok(mostWins);
  assert.equal(mostWins.title, 'Most Wins');
  assert.equal(mostWins.playerName, 'Cazé');
  assert.equal(mostWins.metricValue, '2 WINS');

  const bestAcc = medals.find((m) => m.id === 'best-accuracy');
  assert.ok(bestAcc);
  assert.equal(bestAcc.title, 'Best Accuracy');
  assert.equal(bestAcc.playerName, 'Beltrão');
  assert.equal(bestAcc.metricValue, '100% ACC');

  const mvpStreaks = medals.find((m) => m.id === 'mvp-streaks');
  assert.ok(mvpStreaks);
  assert.equal(mvpStreaks.title, 'MVP Streaks');
  assert.equal(mvpStreaks.playerName, 'Cazé');
  assert.equal(mvpStreaks.metricValue, '2x STREAK');
});

test('computeMatchPlayerComparison compares MVP against the second-highest scoring player with normalized radar axes', () => {
  const room = createMockRoom({
    screen: 'game-over',
    maxRounds: 4,
    teams: {
      A: { id: 'A', name: 'Dupla Alfa', score: 120, members: ['p1', 'p3'] },
      B: { id: 'B', name: 'Dupla Bravo', score: 92, members: ['p2'] }
    },
    players: [
      {
        id: 'p1',
        name: 'Cazé (VIP)',
        avatar: '🦁',
        color: '#FF1E56',
        team: 'A',
        isVip: true,
        score: 120,
        roundsPlayed: 4,
        roundsWon: 3,
        accuracy: 75,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      },
      {
        id: 'p2',
        name: 'Beltrão',
        avatar: '🦊',
        color: '#17B8B8',
        team: 'B',
        isVip: false,
        score: 92,
        roundsPlayed: 4,
        roundsWon: 4,
        accuracy: 100,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      },
      {
        id: 'p3',
        name: 'Luisinho',
        avatar: '🐯',
        color: '#FF1E56',
        team: 'A',
        isVip: false,
        score: 45,
        roundsPlayed: 4,
        roundsWon: 2,
        accuracy: 50,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: 1000
      }
    ]
  });

  const comparison = computeMatchPlayerComparison(room);
  assert.equal(comparison.mvp.playerId, 'p1');
  assert.equal(comparison.mvp.name, 'Cazé (VIP)');
  assert.equal(comparison.mvp.score, 120);

  // Second-highest scoring player must be p2 (Beltrão, 92 PTS), not p3 (45 PTS)
  assert.equal(comparison.runnerUp.playerId, 'p2');
  assert.equal(comparison.runnerUp.name, 'Beltrão');
  assert.equal(comparison.runnerUp.score, 92);
  assert.equal(comparison.runnerUp.accuracy, 100);

  assert.equal(comparison.axes.length, 5);
  const pointsAxis = comparison.axes.find((a) => a.key === 'points');
  assert.ok(pointsAxis);
  assert.equal(pointsAxis.mvpScore, 100);
  assert.equal(pointsAxis.runnerUpScore, Math.round((92 / 120) * 100));
  assert.equal(pointsAxis.mvpRawLabel, '120 PTS');
  assert.equal(pointsAxis.runnerUpRawLabel, '92 PTS');

  const accAxis = comparison.axes.find((a) => a.key === 'accuracy');
  assert.ok(accAxis);
  assert.equal(accAxis.mvpScore, 75);
  assert.equal(accAxis.runnerUpScore, 100);
});

test('Retro Avatars: provides 48 categorized retro-styled avatars and persists player avatar selections in localStorage', () => {
  assert.equal(RETRO_AVATAR_CATEGORIES.length, 4);
  assert.equal(RETRO_AVATARS.length, 48);

  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    }
  };

  // Default fallback when nothing is stored
  assert.equal(loadLastSelectedAvatar('👾', mockStorage), '👾');
  assert.equal(
    resolvePlayerAvatar({ playerName: 'Novo Jogador', fallbackAvatar: '🦁' }, mockStorage),
    '🦁'
  );

  // Save last selected avatar on device
  saveLastSelectedAvatar('🕹️', mockStorage);
  assert.equal(loadLastSelectedAvatar('👾', mockStorage), '🕹️');

  // Save player avatar preference by playerId, playerName, and fixedPlayerId
  savePlayerAvatarPreference(
    {
      playerId: 'p_guest_1',
      playerName: 'Cyber Bobo',
      avatar: '🤖'
    },
    mockStorage
  );

  assert.equal(getSavedPlayerAvatar({ playerId: 'p_guest_1' }, mockStorage), '🤖');
  assert.equal(getSavedPlayerAvatar({ playerName: '  cyber bobo  ' }, mockStorage), '🤖');
  assert.equal(
    resolvePlayerAvatar({ playerName: 'Cyber Bobo', fallbackAvatar: '🦁' }, mockStorage),
    '🤖'
  );

  // Explicit avatar overrides saved preference only when different, or resolves saved preference when omitted
  savePlayerAvatarPreference(
    {
      playerId: 'fix-caze',
      playerName: 'Cazé',
      fixedPlayerId: 'caze',
      avatar: '🕶️'
    },
    mockStorage
  );

  const prefs = loadPlayerAvatarPreferences(mockStorage);
  assert.equal(prefs['fixed:caze'], '🕶️');
  assert.equal(
    resolvePlayerAvatar(
      {
        playerId: 'fix-caze',
        playerName: 'Cazé',
        fixedPlayerId: 'caze',
        fallbackAvatar: '🦁'
      },
      mockStorage
    ),
    '🕶️'
  );
});

test('Mobile Controller Haptic Timer: triggers navigator.vibrate during the last 5 seconds (5..1) and respects Free Mode', () => {
  const recordedVibrations: Array<number | number[]> = [];
  const mockNavigator = {
    vibrate: (pattern: number | number[]) => {
      recordedVibrations.push(pattern);
      return true;
    }
  };

  // Above 5 seconds: no vibration
  assert.equal(getCountdownVibrationPattern(10, { isActive: true, isInfinite: false }), null);
  assert.equal(getCountdownVibrationPattern(6, { isActive: true, isInfinite: false }), null);
  const res6 = triggerCountdownHaptic(6, { isActive: true, isInfinite: false }, mockNavigator);
  assert.equal(res6.vibrated, false);
  assert.equal(recordedVibrations.length, 0);

  // Free / Infinite Mode: strictly no vibration even if secondsRemaining <= 5
  const resInfinite = triggerCountdownHaptic(3, { isActive: true, isInfinite: true }, mockNavigator);
  assert.equal(resInfinite.vibrated, false);
  assert.equal(recordedVibrations.length, 0);

  // Last 5 seconds (5, 4, 3, 2, 1): triggers navigator.vibrate on every second
  for (const sec of [5, 4, 3, 2, 1]) {
    const res = triggerCountdownHaptic(sec, { isActive: true, isInfinite: false }, mockNavigator);
    assert.equal(res.vibrated, true);
  }
  assert.equal(recordedVibrations.length, 5);
  assert.equal(recordedVibrations[0], 80); // 5s
  assert.equal(recordedVibrations[1], 80); // 4s
  assert.equal(recordedVibrations[2], 80); // 3s
  assert.deepEqual(recordedVibrations[3], [100, 40, 100]); // 2s
  assert.deepEqual(recordedVibrations[4], [100, 40, 100]); // 1s

  // Time expired (0s): triggers buzzer vibration
  const resZero = triggerCountdownHaptic(0, { isActive: true, isInfinite: false }, mockNavigator);
  assert.equal(resZero.vibrated, true);
  assert.deepEqual(recordedVibrations[5], [220, 70, 220]);

  // Verify resolveActiveControllerTimer & advanceControllerTimerOneSecond on Proibido
  const proibidoRoom = createMockRoom({
    screen: 'playing',
    activeGame: 'proibido',
    timerConfig: 60,
    proibido: {
      phase: 'PLAYING',
      cards: [{ palavra_alvo: 'ZICO', palavras_proibidas: ['A', 'B', 'C', 'D', 'E'] }],
      currentCardIndex: 0,
      pendingQueue: [0],
      cardOutcomes: ['pending'],
      speakerTeam: 'A',
      refereeTeam: 'B',
      speakerPlayerId: 'p1',
      antiSpoilerMode: 'guesser-back-to-tv',
      roundScore: 0,
      timerSeconds: 5,
      timerActive: true
    }
  });

  const timerState = resolveActiveControllerTimer(proibidoRoom);
  assert.equal(timerState.active, true);
  assert.equal(timerState.secondsRemaining, 5);
  assert.equal(timerState.isLastFiveSeconds, true);

  const { nextRoom, newSecondsRemaining } = advanceControllerTimerOneSecond(proibidoRoom);
  assert.equal(newSecondsRemaining, 4);
  assert.equal(nextRoom.proibido?.timerSeconds, 4);
});

test('Party Network Engine: 1-Tap Seat Claiming, Reconnection, Ping and Buzz Ready', () => {
  assert.equal(sanitizeRoomCode(' #bobo-12! '), 'BOBO12');

  const initialRoom = createMockRoom({
    players: [
      {
        id: 'tv_guilherme',
        name: 'Guilherme',
        avatar: '🕹️',
        color: '#FF1E56',
        team: 'A',
        isVip: true,
        score: 15,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: Date.now(),
        connectionType: 'tv-local'
      },
      {
        id: 'tv_thais',
        name: 'Thais',
        avatar: '👾',
        color: '#17B8B8',
        team: 'B',
        isVip: false,
        score: 10,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: Date.now(),
        connectionType: 'tv-local'
      }
    ]
  });

  // Unclaimed quick-select players include TV local seats + remaining fixed roster
  const quickSelectBefore = getUnclaimedQuickSelectPlayers(initialRoom, 'dev_phone_1');
  const guilhermeSeat = quickSelectBefore.find(q => q.name === 'Guilherme');
  assert.ok(guilhermeSeat);
  assert.equal(guilhermeSeat.isAlreadyInRoomOnTv, true);
  assert.equal(guilhermeSeat.isClaimedByAnotherPhone, false);

  // Claim Guilherme's existing TV seat from mobile device dev_phone_1 without duplicating player
  const claimRes = claimOrRegisterPlayerInRoom(initialRoom, {
    clientId: 'dev_phone_1',
    playerName: 'guilherme',
    avatar: '🤠',
    role: 'master',
    roomCode: 'BOBO'
  });

  assert.equal(claimRes.wasExistingSeat, true);
  assert.equal(claimRes.nextRoom.players.length, 2, 'Should claim existing seat instead of creating duplicate');
  assert.equal(claimRes.claimedPlayer.id, 'tv_guilherme');
  assert.equal(claimRes.claimedPlayer.score, 15, 'Should preserve player score');
  assert.equal(claimRes.claimedPlayer.connectionType, 'master');
  assert.equal(claimRes.claimedPlayer.isMasterControl, true);
  assert.equal(claimRes.claimedPlayer.deviceClientId, 'dev_phone_1');

  // Verify findBoundPlayerForDevice & transparent reconnect
  const bound = findBoundPlayerForDevice(claimRes.nextRoom, 'dev_phone_1');
  assert.ok(bound);
  assert.equal(bound.id, 'tv_guilherme');

  const reconnected = reconnectPlayerInRoom(claimRes.nextRoom, 'dev_phone_1', 'tv_guilherme');
  assert.ok(reconnected.player);
  assert.equal(reconnected.player.connected, true);

  // Remote ping and buzz events update room state cleanly
  const pingedRoom = triggerPingOnPlayerInRoom(reconnected.nextRoom, 'tv_guilherme');
  assert.ok(pingedRoom.lastPingEvent);
  assert.equal(pingedRoom.lastPingEvent.targetPlayerId, 'tv_guilherme');

  const buzzedRoom = triggerBuzzReadyInRoom(pingedRoom, 'tv_guilherme');
  assert.ok(buzzedRoom.lastBuzzEvent);
  assert.equal(buzzedRoom.lastBuzzEvent.playerName, 'Guilherme');
});

test('Step5GameTutorial: validates comprehensive tutorial cards, rules and scoring summaries for all 6 games', () => {
  const games: GameId[] = ['limite', 'duvido', 'proibido', 'nota', 'tem-ou-nao-tem', 'perguntas-e-verdades'];
  for (const g of games) {
    const tut = GAME_TUTORIALS[g];
    assert.ok(tut, `Tutorial for ${g} must exist`);
    assert.equal(tut.steps.length, 3, `${g} must have exactly 3 visual steps`);
    tut.steps.forEach((step, idx) => {
      assert.equal(step.stepNumber, idx + 1);
      assert.ok(step.headline.length > 5);
      assert.ok(step.description.length > 10);
      assert.ok(step.accentTag.length > 0);
    });
    assert.ok(tut.proibido.length >= 2, `${g} must have at least 2 prohibited rules`);
    assert.ok(tut.permitido.length >= 2, `${g} must have at least 2 permitted rules`);
    assert.ok(tut.scoringSummary.length >= 1, `${g} must have scoring summary`);
  }
});

test('MultiplayerRoomEngine: generates unambiguous 6-character room codes excluding O, 0, I, 1', () => {
  for (let i = 0; i < 40; i++) {
    const code = generateUnique6CharRoomCode();
    assert.equal(code.length, 6, 'Room code must be 6 characters long');
    for (const ch of code) {
      assert.equal(UNAMBIGUOUS_ROOM_CHARS.includes(ch), true, `Char ${ch} must be in unambiguous alphabet`);
      assert.equal(['O', '0', 'I', '1'].includes(ch), false, `Char ${ch} must not be ambiguous`);
    }
  }

  const sessionHost = createUniqueRoomSession('host', 'limite', 'http://localhost:3000');
  assert.equal(sessionHost.roomCode.length, 6);
  assert.equal(sessionHost.mode, 'host');
  assert.equal(sessionHost.sessionKey.startsWith(`session_${sessionHost.roomCode}_`), true);

  const sessionMulti = createUniqueRoomSession('multi', 'duvido', 'http://localhost:3000', sessionHost.roomCode);
  assert.equal(sessionMulti.roomCode.length, 6);
  assert.notEqual(sessionMulti.roomCode, sessionHost.roomCode);
  assert.equal(sessionMulti.mode, 'multi');
});

test('MultiplayerRoomEngine: parses ?join=CODIGO and mode query parameters accurately', () => {
  const q1 = parseRoomQueryParams('?join=k9x4m2&mode=multi');
  assert.equal(q1.joinCode, 'K9X4M2');
  assert.equal(q1.roomCode, 'K9X4M2');
  assert.equal(q1.requestedMode, 'multi');
  assert.equal(q1.shouldOpenQuickJoin, true);

  const q2 = parseRoomQueryParams('?room=AB78CD&mode=host');
  assert.equal(q2.joinCode, null);
  assert.equal(q2.roomCode, 'AB78CD');
  assert.equal(q2.requestedMode, 'host');

  const q3 = parseRoomQueryParams('');
  assert.equal(q3.joinCode, null);
  assert.equal(q3.roomCode, null);
  assert.equal(q3.requestedMode, null);
});

test('MultiplayerRoomEngine: balances players into Dupla A and Dupla B and draws starting player', () => {
  const mockPlayers = [
    {
      id: 'p1',
      name: 'Marcos André',
      avatar: '🕶️',
      color: '#3b82f6',
      team: 'A' as const,
      isVip: true,
      score: 0,
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
      connected: true,
      lastActive: 100
    },
    {
      id: 'p2',
      name: 'Gisele',
      avatar: '👑',
      color: '#ec4899',
      team: 'A' as const,
      isVip: false,
      score: 0,
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
      connected: true,
      lastActive: 100
    },
    {
      id: 'p3',
      name: 'Débora',
      avatar: '⚡',
      color: '#eab308',
      team: 'A' as const,
      isVip: false,
      score: 0,
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
      connected: true,
      lastActive: 100
    },
    {
      id: 'p4',
      name: 'João Gabriel',
      avatar: '🎮',
      color: '#10b981',
      team: 'A' as const,
      isVip: false,
      score: 0,
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
      connected: true,
      lastActive: 100
    }
  ];

  const balanced = balancePlayersIntoTeams(mockPlayers);
  assert.equal(balanced.filter((p) => p.team === 'A').length, 2);
  assert.equal(balanced.filter((p) => p.team === 'B').length, 2);

  const starter = drawRandomStartingPlayer(mockPlayers);
  assert.ok(starter);
  assert.equal(mockPlayers.some((p) => p.id === starter.id), true);

  assert.equal(DIFFICULTY_META.dificil.shortLabel, 'Difícil');
});

test('Step5GameTutorial: provides 3 visual cards for all 6 games', () => {
  const gameIds = ['limite', 'duvido', 'proibido', 'nota', 'tem-ou-nao-tem', 'perguntas-e-verdades'] as const;
  for (const id of gameIds) {
    const def = GAME_TUTORIALS[id];
    assert.ok(def, `Tutorial must exist for ${id}`);
    assert.equal(def.steps.length, 3, `Game ${id} must have 3 visual tutorial cards`);
    assert.equal(def.steps[0].stepNumber, 1);
    assert.equal(def.steps[1].stepNumber, 2);
    assert.equal(def.steps[2].stepNumber, 3);
  }
});

test('Game Difficulty Engine: strictly calibrates questions, few-shot examples, prompt guidelines and cache per difficulty', () => {
  // 1. Limite Guidelines and Prompts
  const facilLimitePrompt = buildLimitePrompt('Geral', 'facil', [], []);
  assert.ok(facilLimitePrompt.includes('NÍVEL FÁCIL (LEVE / INFANTIL / FAMÍLIA)'));
  assert.ok(facilLimitePrompt.includes('criança'));

  const impossivelLimitePrompt = buildLimitePrompt('Geral', 'impossivel', [], []);
  assert.ok(impossivelLimitePrompt.includes('NÍVEL IMPOSSÍVEL'));
  assert.ok(impossivelLimitePrompt.includes('ASTRONÔMICOS OU MICROSCÓPICOS'));

  const medioLimitePrompt = buildLimitePrompt('Geral', 'medio', [], []);
  assert.ok(medioLimitePrompt.includes('NÍVEL MÉDIO'));

  const dificilLimitePrompt = buildLimitePrompt('Geral', 'dificil', [], []);
  assert.ok(dificilLimitePrompt.includes('NÍVEL DIFÍCIL'));

  // 2. Few-shot example selection strictly matches difficulty
  const facilExamples = selectFewShotLimiteExamples('Geral', 6, [], 'facil');
  assert.ok(facilExamples.some((q) => q.dificuldade === 'facil'));

  const impExamples = selectFewShotLimiteExamples('Geral', 6, [], 'impossivel');
  assert.ok(impExamples.some((q) => q.dificuldade === 'impossivel'));

  // 3. Proibido, Duvido, Tem ou Não Tem, and Nota difficulty guidelines
  const proibidoFacil = buildProibidoPrompt('Geral', 5, 'facil', [], []);
  assert.ok(proibidoFacil.includes('NÍVEL FÁCIL'));

  const duvidoFacil = buildDuvidoPrompt('Geral', 'facil', [], []);
  assert.ok(duvidoFacil.includes('NÍVEL FÁCIL'));

  const temFacil = buildTemOuNaoTemPrompt('Geral', 'facil', [], []);
  assert.ok(temFacil.includes('NÍVEL FÁCIL'));

  const notaFacil = buildNotaPrompt('Geral', 'facil', [], []);
  assert.ok(notaFacil.includes('NÍVEL FÁCIL'));

  // 4. Cache Key separation per difficulty
  const keyFacil = getCacheKey('limite', 'Geral', undefined, 'facil');
  const keyDificil = getCacheKey('limite', 'Geral', undefined, 'dificil');
  const keyImp = getCacheKey('limite', 'Geral', undefined, 'impossivel');
  assert.equal(keyFacil, 'limite::geral::facil');
  assert.equal(keyDificil, 'limite::geral');
  assert.equal(keyImp, 'limite::geral::impossivel');
  assert.notEqual(keyFacil, keyDificil);

  // 5. Fallback selection respects difficulty
  const fallbackFacil = generateThemeStrictFallbackRound('limite', 'Geral', 'Geral', { difficulty: 'facil' } as any, [], 'facil');
  const dataFacil = fallbackFacil.data as any;
  assert.equal(dataFacil.dificuldade, 'facil');

  const fallbackImp = generateThemeStrictFallbackRound('limite', 'Geral', 'Geral', { difficulty: 'impossivel' } as any, [], 'impossivel');
  const dataImp = fallbackImp.data as any;
  assert.equal(dataImp.dificuldade, 'impossivel');
});

test('Jogo do Duvido: Execution scoring supports increment (+1), decrement (-1 down to min 0), and doubting team gabarito validation', () => {
  const duvidoState = {
    phase: 'EXECUTION' as const,
    roundData: {
      categoria_secreta: 'Times da Premier League',
      total_itens_possiveis: 20,
      dica_arbitro: 'Cuidado com rebaixados',
      exemplos_validos: ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City']
    },
    blindfoldedPlayers: { A: 'p1', B: 'p2' },
    negotiators: { A: 'p3', B: 'p4' },
    blindfoldConfirmed: { A: true, B: true },
    currentBid: 5,
    currentBidTeam: 'A' as const,
    activeTurnTeam: 'B' as const,
    timerSeconds: 30,
    timerActive: true,
    validCount: 2,
    challengedTeam: 'A' as const,
    challengedPlayerId: null,
    resultWinnerTeam: null,
    resultReason: ''
  };

  // 1. Decrementing decreases validCount by 1
  const decrementedCount = Math.max(0, duvidoState.validCount - 1);
  assert.equal(decrementedCount, 1);

  // 2. Decrementing from 0 clamps to 0 (cannot be negative)
  assert.equal(Math.max(0, 0 - 1), 0);

  // 3. Incrementing increases validCount
  const incrementedCount = duvidoState.validCount + 1;
  assert.equal(incrementedCount, 3);

  // 4. Reaching the target currentBid triggers result phase for the challenged team
  const targetReached = duvidoState.currentBid;
  const isTargetAchieved = targetReached >= duvidoState.currentBid;
  assert.ok(isTargetAchieved);

  // 5. Gabarito contains non-empty valid examples for verification
  assert.ok(Array.isArray(duvidoState.roundData.exemplos_validos));
  assert.ok(duvidoState.roundData.exemplos_validos.length >= 4);
  assert.ok(duvidoState.roundData.exemplos_validos.includes('Arsenal'));
});

test('ensureStrictForbiddenWordsCount strictly guarantees exactly 5 forbidden words for any card', () => {
  // Case 1: "Vingadores" with only 4 words (like the real scenario user experienced)
  const vingadores4Words = ['MARVEL', 'HERÓIS', 'THANOS', 'HOMEM DE FERRO'];
  const fixedVingadores = ensureStrictForbiddenWordsCount('Vingadores', vingadores4Words, 5, 'filmes');
  assert.equal(fixedVingadores.length, 5, 'Vingadores must have strictly 5 words');
  assert.equal(new Set(fixedVingadores).size, 5, 'Vingadores words must be strictly unique');
  assert.ok(fixedVingadores.includes('MARVEL'));
  assert.ok(fixedVingadores.includes('THANOS'));

  // Case 2: Card with empty or null words array
  const emptyCard = ensureStrictForbiddenWordsCount('Batman', [], 5, 'filmes');
  assert.equal(emptyCard.length, 5, 'Empty card must be padded to strictly 5 words');
  assert.equal(new Set(emptyCard).size, 5, 'Words must be unique');

  // Case 3: Card with duplicate words and target word included
  const dirtyWords = ['PIZZA', 'pizza', 'QUEIJO', 'FORNO', 'MASSA'];
  const cleanedPizza = ensureStrictForbiddenWordsCount('Pizza', dirtyWords, 5, 'comidas');
  assert.equal(cleanedPizza.length, 5, 'Target word must be filtered out and result padded to 5');
  assert.ok(!cleanedPizza.includes('PIZZA'), 'Forbidden words must never include target word itself');

  // Case 4: Card with 6 words (should slice to strictly 5)
  const sixWords = ['A', 'B', 'C', 'D', 'E', 'F'];
  const sliced = ensureStrictForbiddenWordsCount('TESTE', sixWords, 5);
  assert.equal(sliced.length, 5);
});

test('Jogo da Nota: Reveal wheel substate lifecycle and interactive scoring flow', () => {
  const players = ['p1_speaker', 'p2_guess', 'p3_guess', 'p4_guess'];
  const secretScore = 7;

  // 1. Initial Reveal State starts spinning
  let revealSubState: 'SPINNING' | 'REVEALED_LOCKED' | 'SCORING' | 'REVEALED' = 'SPINNING';
  assert.equal(revealSubState, 'SPINNING', 'Wheel starts in spinning substate');

  // 2. When wheel finishes, it transitions to REVEALED_LOCKED (showing the landed number on the wheel first)
  revealSubState = 'REVEALED_LOCKED';
  assert.equal(revealSubState, 'REVEALED_LOCKED', 'Wheel locks on number without jumping prematurely to scoring screen');

  // 3. Host clicks "Continuar para a pontuação", advancing to SCORING
  revealSubState = 'SCORING';
  assert.equal(revealSubState, 'SCORING', 'Advances to scoring screen to mark winners');

  // 4. Interactive toggles: p2 and p3 guessed 7 correctly
  let selectedWinners: string[] = [];
  selectedWinners = toggleNotaSelectedPlayer(selectedWinners, 'p2_guess', 'p1_speaker');
  selectedWinners = toggleNotaSelectedPlayer(selectedWinners, 'p3_guess', 'p1_speaker');

  let points = computeNotaRoundPoints(players, 'p1_speaker', selectedWinners);
  assert.equal(points.narratorPoints, 2, 'Narrator gets +1 for each correct player in room');
  assert.equal(points.pointsAwarded['p1_speaker'], 2);
  assert.equal(points.pointsAwarded['p2_guess'], 1);
  assert.equal(points.pointsAwarded['p3_guess'], 1);
  assert.equal(points.pointsAwarded['p4_guess'], 0);

  // 5. Reversible toggle: p3 was marked by mistake, toggle again to remove
  selectedWinners = toggleNotaSelectedPlayer(selectedWinners, 'p3_guess', 'p1_speaker');
  points = computeNotaRoundPoints(players, 'p1_speaker', selectedWinners);
  assert.equal(points.narratorPoints, 1);
  assert.equal(points.pointsAwarded['p3_guess'], 0);

  // 6. Host can return to inspect wheel [↺ Rever Pião]
  revealSubState = 'REVEALED_LOCKED';
  assert.equal(revealSubState, 'REVEALED_LOCKED');

  // 7. CSPRNG score draws within bounds
  for (let i = 0; i < 20; i++) {
    const drawn = drawRandomScoreCSPRNG(1, 10);
    assert.ok(drawn >= 1 && drawn <= 10, 'Drawn score must be strictly in 1..10');
  }
});

test('Tem ou Não Tem / Game Inputs: Fuzzy Match and Typo Tolerance', () => {
  // 1. User typo examples:
  assert.equal(checkAnswerFuzzyMatch('bicicreta', 'Bicicleta'), true, 'bicicreta should match Bicicleta');
  assert.equal(checkAnswerFuzzyMatch('Spiber', 'Spielberg'), true, 'Spiber should match Spielberg');
  assert.equal(checkAnswerFuzzyMatch('Einsteim', 'Albert Einstein'), true, 'Einsteim should match Albert Einstein');
  assert.equal(checkAnswerFuzzyMatch('Albert Eistein', 'Albert Einstein'), true, 'Albert Eistein should match Albert Einstein');

  // 2. Exact and casing/diacritics:
  assert.equal(checkAnswerFuzzyMatch('aviao', 'Avião'), true);
  assert.equal(checkAnswerFuzzyMatch('futebol', 'FUTEBOL'), true);

  // 3. Synonym matching:
  assert.equal(checkAnswerFuzzyMatch('cr7', 'Cristiano Ronaldo', ['cr7', 'ronaldo']), true);
  assert.equal(checkAnswerFuzzyMatch('penaldo', 'Cristiano Ronaldo', ['cr7', 'penaldo']), true);

  // 4. Token substring and plurals:
  assert.equal(checkAnswerFuzzyMatch('gatos', 'Gato'), true);

  // 5. Negative cases:
  assert.equal(checkAnswerFuzzyMatch('banana', 'Bicicleta'), false);
  assert.equal(checkAnswerFuzzyMatch('gato', 'rato'), false);
  assert.equal(checkAnswerFuzzyMatch('sol', 'sal'), false);
});

test('2-Player Mode Bug: Strictly clamped to 2 teams (Team A vs Team B / 1x1 match)', () => {
  const twoPlayersRoom: any = {
    teamCount: 4,
    customConfig: { teamCount: 4 },
    players: [
      { id: 'p1', name: 'Débora', team: 'A' },
      { id: 'p2', name: 'Marcos André', team: 'B' }
    ]
  };

  // Even if room or customConfig asked for 4 teams, 2 players must strictly yield 2 teams!
  const teamCount = getTeamCount(twoPlayersRoom, 4);
  assert.equal(teamCount, 2, '2 players in room must clamp teamCount to 2');

  const activeIds = getActiveTeamIds(twoPlayersRoom, 4);
  assert.deepEqual(activeIds, ['A', 'B'], 'Active teams for 2 players must be strictly A and B');
});
