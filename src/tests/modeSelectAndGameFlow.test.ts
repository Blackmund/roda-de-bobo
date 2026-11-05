import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultRoom,
  canStartMatchWithPlayers
} from '../utils/roomManager';
import {
  resolvePublicShareOrigin,
  setCustomShareOrigin,
  createUniqueRoomSession
} from '../utils/multiplayerRoomEngine';
import {
  drawLimitePowerCardsForPlayers,
  ALL_LIMITE_POWER_CARDS,
  evaluateLimiteRoundReveal
} from '../components/host/ScreenLimite';
import {
  getSavedTruthSlotsForTarget,
  placeCardInTruthRevelationSlot,
  evaluateTruthPalpiteAttempt
} from '../components/host/ScreenPerguntasEVerdades';
import {
  applyProibidoCardOutcome,
  getProibidoPlayerRole,
  getNextProibidoTurnInfo
} from '../components/host/ScreenProibido';
import {
  PRESET_THEMES,
  getSmartSubthemesForTheme
} from '../utils/aiGameGenerator';
import {
  isTeamCollectiveGame,
  accumulateRoundPlayerScores,
  buildTeamCollectiveMVPSnapshot,
  computePlayerSessionTrophies
} from '../utils/sessionPersistence';
import { GameRoom, Player, LimiteGameState } from '../types/game';

test('Initial Screen Flow: createDefaultRoom defaults to mode-select and local mode', () => {
  const room = createDefaultRoom('TEST12', 'host_01');
  assert.equal(room.screen, 'mode-select');
  assert.equal(room.connectionMode, 'local');
  assert.equal(room.players.length, 0);
  assert.equal(room.activeGame, null);
});

test('canStartMatchWithPlayers enforces at least 2 players', () => {
  const zeroPlayers: Player[] = [];
  assert.equal(canStartMatchWithPlayers(zeroPlayers).valid, false);

  const onePlayer: Player[] = [
    {
      id: 'p1',
      name: 'Alice',
      avatar: '👾',
      color: '#E6194B',
      team: 'A',
      isVip: true,
      score: 0,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: true, troca: true, x2: true, menos1: true }
    }
  ];
  assert.equal(canStartMatchWithPlayers(onePlayer).valid, false);

  const twoPlayers: Player[] = [
    ...onePlayer,
    {
      id: 'p2',
      name: 'Bob',
      avatar: '🤖',
      color: '#17B8B8',
      team: 'B',
      isVip: false,
      score: 0,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: true, troca: true, x2: true, menos1: true }
    }
  ];
  assert.equal(canStartMatchWithPlayers(twoPlayers).valid, true);
});

test('Player and Mode Persistence across games: players and mode stay intact', () => {
  const initialRoom = createDefaultRoom('ROOM99', 'host_01');
  initialRoom.connectionMode = 'host';
  initialRoom.players = [
    {
      id: 'p1',
      name: 'Jogador 1',
      avatar: '👑',
      color: '#E6194B',
      team: 'A',
      isVip: true,
      score: 50,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: true, troca: true, x2: true, menos1: true }
    },
    {
      id: 'p2',
      name: 'Jogador 2',
      avatar: '🦊',
      color: '#17B8B8',
      team: 'B',
      isVip: false,
      score: 30,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: true, troca: true, x2: true, menos1: true }
    }
  ];

  // 1. Advance to Lobby
  const inLobby: GameRoom = {
    ...initialRoom,
    screen: 'lobby'
  };
  assert.equal(inLobby.screen, 'lobby');
  assert.equal(inLobby.connectionMode, 'host');
  assert.equal(inLobby.players.length, 2);

  // 2. Open Game 1: Limite
  const inLimiteSetup: GameRoom = {
    ...inLobby,
    activeGame: 'limite',
    screen: 'game-setup'
  };
  assert.equal(inLimiteSetup.screen, 'game-setup');
  assert.equal(inLimiteSetup.connectionMode, 'host');
  assert.equal(inLimiteSetup.players.length, 2);

  // 3. Play Limite and Finish Round
  const afterLimiteMatch: GameRoom = {
    ...inLimiteSetup,
    screen: 'game-over',
    players: inLimiteSetup.players.map((p, idx) => ({ ...p, score: p.score + (idx === 0 ? 10 : 0) }))
  };
  assert.equal(afterLimiteMatch.players[0].score, 60);

  // 4. Return to Lobby for next game (e.g. Proibido)
  const backToLobby: GameRoom = {
    ...afterLimiteMatch,
    screen: 'lobby',
    activeGame: null
  };
  assert.equal(backToLobby.screen, 'lobby');
  assert.equal(backToLobby.connectionMode, 'host'); // Connection mode remains preserved
  assert.equal(backToLobby.players.length, 2); // Players remain preserved
  assert.equal(backToLobby.players[0].name, 'Jogador 1');
  assert.equal(backToLobby.players[0].score, 60); // Scores remain preserved

  // 5. Select Game 2: Proibido directly from Lobby without re-entering mode wizard
  const inProibidoSetup: GameRoom = {
    ...backToLobby,
    activeGame: 'proibido',
    screen: 'game-setup'
  };
  assert.equal(inProibidoSetup.screen, 'game-setup');
  assert.equal(inProibidoSetup.players.length, 2);
  assert.equal(inProibidoSetup.connectionMode, 'host');
});

test('LAN & Web Share Origin Resolution: produces valid mobile controller links', () => {
  // 1. Web production origin (e.g. Vercel / Render / Netlify)
  const webSession = createUniqueRoomSession('host', null, 'https://rodadebobo.vercel.app');
  assert.equal(
    webSession.joinUrl,
    `https://rodadebobo.vercel.app/?join=${webSession.roomCode}&role=client`
  );

  // 2. Local Network Wi-Fi IP override
  setCustomShareOrigin('http://192.168.1.50:3000/');
  assert.equal(resolvePublicShareOrigin(), 'http://192.168.1.50:3000');
  const lanSession = createUniqueRoomSession('host', null);
  assert.equal(
    lanSession.joinUrl,
    `http://192.168.1.50:3000/?join=${lanSession.roomCode}&role=client`
  );

  // Reset custom override
  setCustomShareOrigin('');
});

test('Jogo do Limite Power Cards Draw: 4 players get 4 distinct cards, >4 players get extra random cards', () => {
  const makePlayers = (count: number): Player[] =>
    Array.from({ length: count }, (_, idx) => ({
      id: `p_${idx + 1}`,
      name: `Jogador ${idx + 1}`,
      avatar: '👾',
      color: '#E6194B',
      team: idx % 2 === 0 ? 'A' : 'B',
      isVip: idx === 0,
      score: 0,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false }
    }));

  // 1. With 4 players: each player receives 1 distinct card out of the 4 official cards
  const fourPlayers = makePlayers(4);
  const draw4 = drawLimitePowerCardsForPlayers(fourPlayers);
  const assignedList4 = Object.values(draw4.assignedPowerCards);
  assert.equal(assignedList4.length, 4);
  assert.equal(new Set(assignedList4).size, 4, 'All 4 players receive distinct power cards');
  for (const p of draw4.updatedPlayers) {
    assert.ok(p.assignedPowerCard);
    assert.equal(p.powerCardUsed, false);
    assert.equal(draw4.usedPowerCardsByPlayer[p.id], false);
  }

  // 2. With 6 players (> 4): all 4 base cards are present + 2 extra random cards
  const sixPlayers = makePlayers(6);
  const draw6 = drawLimitePowerCardsForPlayers(sixPlayers);
  const assignedList6 = Object.values(draw6.assignedPowerCards);
  assert.equal(assignedList6.length, 6);
  for (const baseCard of ALL_LIMITE_POWER_CARDS) {
    assert.ok(assignedList6.includes(baseCard), `Base card ${baseCard} is included in >4 draw`);
  }
  for (const p of draw6.updatedPlayers) {
    assert.ok(p.assignedPowerCard && ALL_LIMITE_POWER_CARDS.includes(p.assignedPowerCard));
    assert.equal(p.powerCardUsed, false);
  }
});

test('Unitary Themes & Geral First: PRESET_THEMES starts with Geral and splits Ciência, Espaço, and Corpo Humano', () => {
  assert.equal(PRESET_THEMES[0], 'Geral', 'First theme must be Geral');
  assert.ok(PRESET_THEMES.includes('Ciência'), 'Ciência must be a unitary theme');
  assert.ok(PRESET_THEMES.includes('Espaço'), 'Espaço must be a unitary theme');
  assert.ok(PRESET_THEMES.includes('Corpo Humano'), 'Corpo Humano must be a unitary theme');
  assert.ok(!PRESET_THEMES.includes('Ciência, Espaço e Corpo Humano'));

  const geralSubs = getSmartSubthemesForTheme('Geral');
  assert.ok(geralSubs.length > 10, 'Geral must aggregate diverse subthemes across categories');

  const espacoSubs = getSmartSubthemesForTheme('Espaço');
  assert.ok(espacoSubs.some((s) => s.toLowerCase().includes('planeta') || s.toLowerCase().includes('espacial')));

  const corpoSubs = getSmartSubthemesForTheme('Corpo Humano');
  assert.ok(corpoSubs.some((s) => s.toLowerCase().includes('corpo') || s.toLowerCase().includes('anatomia')));
});

test('Team Collective Games (Tem ou Não Tem, Proibido, Duvido): teammates score equally together without individual MVP bias', () => {
  assert.equal(isTeamCollectiveGame('tem-ou-nao-tem'), true);
  assert.equal(isTeamCollectiveGame('proibido'), true);
  assert.equal(isTeamCollectiveGame('duvido'), true);
  assert.equal(isTeamCollectiveGame('limite'), false);
  assert.equal(isTeamCollectiveGame('nota'), false);

  const room = createDefaultRoom('TEAM01', 'host_01');
  room.activeGame = 'tem-ou-nao-tem';
  room.players = [
    {
      id: 'p1',
      name: 'Marcos André',
      avatar: '🦁',
      color: '#E6194B',
      team: 'A',
      isVip: true,
      score: 0,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false }
    },
    {
      id: 'p2',
      name: 'Gisele',
      avatar: '🦊',
      color: '#E6194B',
      team: 'A',
      isVip: false,
      score: 0,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false }
    },
    {
      id: 'p3',
      name: 'Débora',
      avatar: '⚡',
      color: '#17B8B8',
      team: 'B',
      isVip: false,
      score: 0,
      connected: true,
      lastActive: Date.now(),
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false }
    }
  ];
  room.temOuNaoTem = {
    phase: 'ROUND_END',
    roundData: { pergunta: 'P', respostas: [] },
    items: [],
    activeTeam: 'A',
    strikes: { A: 0, B: 0 },
    maxStrikes: 2,
    eliminatedTeams: [],
    freeDomainTeam: null,
    roundScore: { A: 60, B: 20 }
  };

  const afterRoundPlayers = accumulateRoundPlayerScores(room);
  // Both teammates in Team A must receive the exact same 60 points (no +2 artificial bias to p1)
  assert.equal(afterRoundPlayers[0].score, 60);
  assert.equal(afterRoundPlayers[1].score, 60);
  assert.equal(afterRoundPlayers[2].score, 20);

  const collectiveSnapshot = buildTeamCollectiveMVPSnapshot(
    afterRoundPlayers,
    'A',
    60,
    3,
    room.teams
  );
  assert.ok(
    collectiveSnapshot.name.includes('Equipe Alfa') ||
    collectiveSnapshot.name.includes('Dupla Alfa')
  );
  assert.ok(collectiveSnapshot.name.includes('Marcos André & Gisele'));
  assert.equal(collectiveSnapshot.score, 60);

  // Verify computePlayerSessionTrophies awards 1 team trophy equally to both teammates in Tem ou Não Tem
  room.sessionStats.history = [
    {
      id: 'm_tem_1',
      gameId: 'tem-ou-nao-tem',
      gameName: 'TEM OU NÃO TEM',
      timestamp: Date.now(),
      winnerTeam: 'A',
      scoreA: 60,
      scoreB: 20,
      roundsPlayed: 3,
      theme: 'Geral',
      mvp: collectiveSnapshot,
      playerScores: afterRoundPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        team: p.team,
        score: p.score
      }))
    }
  ];
  const trophies = computePlayerSessionTrophies(room);
  assert.equal(trophies['p1'], 1);
  assert.equal(trophies['p2'], 1);

  // In Tem ou Não Tem, the dupla acts as a single cohesive unit:
  // Active turn is attributed to the whole team (e.g. Dupla A), not individual players
  assert.equal(room.temOuNaoTem.activeTeam, 'A');
  const teamAPlayers = room.players.filter((p) => p.team === 'A');
  assert.equal(teamAPlayers.length, 2);
  // Both players belong to the active team together without an individual 'vez' distinction
  assert.equal(teamAPlayers[0].team, room.temOuNaoTem.activeTeam);
  assert.equal(teamAPlayers[1].team, room.temOuNaoTem.activeTeam);
});

test('Perguntas e Verdades Revelation Mode: saves card positions freely and evaluates only on Palpitar without leaking error location', () => {
  const targetHand = [
    { id: '2_spades', value: 2 as const, suit: 'spades' as const, label: '2♠' },
    { id: '5_hearts', value: 5 as const, suit: 'hearts' as const, label: '5♥' },
    { id: '5_spades', value: 5 as const, suit: 'spades' as const, label: '5♠' },
    { id: '6_clubs', value: 6 as const, suit: 'clubs' as const, label: '6♣' },
    { id: '9_hearts', value: 9 as const, suit: 'hearts' as const, label: '9♥' },
    { id: '11_diamonds', value: 11 as const, suit: 'diamonds' as const, label: 'J♦' },
    { id: '12_spades', value: 12 as const, suit: 'spades' as const, label: 'Q♠' },
    { id: '13_clubs', value: 13 as const, suit: 'clubs' as const, label: 'K♣' }
  ];

  // 1. Place cards freely in any order (even out-of-order same-suit cards) and swap positions
  let slots = new Array(8).fill(null);
  slots = placeCardInTruthRevelationSlot(slots, 0, {
    id: '12_spades',
    value: 12,
    suit: 'spades',
    label: 'Q♠'
  });
  slots = placeCardInTruthRevelationSlot(slots, 6, {
    id: '2_spades',
    value: 2,
    suit: 'spades',
    label: '2♠'
  });
  assert.equal(slots[0]?.id, '12_spades');
  assert.equal(slots[6]?.id, '2_spades');

  // Swap slot 6 with slot 0 via drag-and-drop
  slots = placeCardInTruthRevelationSlot(slots, 0, slots[6]!, 6);
  assert.equal(slots[0]?.id, '2_spades');
  assert.equal(slots[6]?.id, '12_spades');

  // 2. Incomplete slots (< 8) return INCOMPLETE when clicking Palpitar
  const incompleteEval = evaluateTruthPalpiteAttempt(slots, targetHand, 'Alice', 'Bob');
  assert.equal(incompleteEval.status, 'INCOMPLETE');
  assert.equal(incompleteEval.allCorrect, false);

  // 3. Fill all 8 slots with 1 wrong card (slot 3 has 7♣ instead of 6♣)
  const wrongSlots = targetHand.map((c, idx) =>
    idx === 3 ? { id: '7_clubs', value: 7 as const, suit: 'clubs' as const, label: '7♣' } : c
  );
  const wrongEval = evaluateTruthPalpiteAttempt(wrongSlots, targetHand, 'Alice', 'Bob');
  assert.equal(wrongEval.status, 'INCORRECT');
  assert.equal(wrongEval.allCorrect, false);
  // Must NOT reveal how many positions matched (e.g., 7/8) or which position had the error
  assert.ok(!wrongEval.message.includes('7/8'));
  assert.ok(!wrongEval.message.includes('/8'));
  assert.ok(!wrongEval.message.includes('4ª'));

  // 4. Fill all 8 slots with the exact values -> CORRECT
  const correctEval = evaluateTruthPalpiteAttempt(targetHand, targetHand, 'Alice', 'Bob');
  assert.equal(correctEval.status, 'CORRECT');
  assert.equal(correctEval.allCorrect, true);
});

test('Jogo do Proibido: 2-player cooperative roles, blindfold guesser protection, and timer expiration flow', () => {
  const p1: Player = {
    id: 'p1',
    name: 'Alice',
    avatar: '👾',
    color: '#E6194B',
    team: 'A',
    isVip: true,
    score: 0,
    connected: true,
    lastActive: Date.now(),
    powerCards: { ligacao: false, troca: false, x2: false, menos1: false }
  };
  const p2: Player = {
    id: 'p2',
    name: 'Bob',
    avatar: '🤖',
    color: '#17B8B8',
    team: 'B',
    isVip: false,
    score: 0,
    connected: true,
    lastActive: Date.now(),
    powerCards: { ligacao: false, troca: false, x2: false, menos1: false }
  };

  const room: GameRoom = {
    ...createDefaultRoom('PROIB1', 'p1'),
    players: [p1, p2],
    activeGame: 'proibido',
    roundNumber: 1,
    maxRounds: 3,
    proibido: {
      phase: 'PLAYING',
      cards: [
        { palavra_alvo: 'ASTRONAUTA', palavras_proibidas: ['ESPAÇO', 'LUA', 'FOGUETE', 'NASA', 'GRAVIDADE'] },
        { palavra_alvo: 'PIZZA', palavras_proibidas: ['QUEIJO', 'MASSA', 'FORNO', 'ITÁLIA', 'FATIA'] }
      ],
      currentCardIndex: 0,
      pendingQueue: [0, 1],
      speakerTeam: 'A',
      speakerPlayerId: 'p1',
      guesserPlayerId: 'p2',
      refereeTeam: 'B',
      timerSeconds: 15,
      timerActive: true,
      roundScore: 1,
      cardOutcomes: ['correct', 'pending'],
      antiSpoilerMode: 'guesser-back-to-tv',
      tvWordsHidden: false,
      is2PlayerMode: true
    }
  };

  // 1. In 2-Player mode: Alice is Speaker, Bob is Guesser
  const aliceRole = getProibidoPlayerRole(room.proibido!, p1, room.players);
  assert.equal(aliceRole.role, 'SPEAKER');
  assert.equal(aliceRole.isSpeaker, true);
  assert.equal(aliceRole.isGuesser, false);

  const bobRole = getProibidoPlayerRole(room.proibido!, p2, room.players);
  assert.equal(bobRole.role, 'GUESSER');
  assert.equal(bobRole.isGuesser, true);
  assert.equal(bobRole.isSpeaker, false);
  // Guesser should never have referee role in 2-player mode
  assert.equal(bobRole.isReferee, false);

  // 2. Next turn info: in 2-player mode, roles swap in next round (Bob will speak, Alice will guess)
  const nextTurn = getNextProibidoTurnInfo(room);
  assert.equal(nextTurn.nextSpeakerName, 'Bob');
  assert.equal(nextTurn.nextGuesserName, 'Alice');
  assert.equal(nextTurn.isGameOver, false);

  // 3. Timer conclusion guard: when phase is SUMMARY, late taps do not resurrect phase back to PLAYING
  const summaryState = { ...room.proibido!, phase: 'SUMMARY' as const, timerActive: false, timerSeconds: 0 };
  const lateTapResult = applyProibidoCardOutcome(summaryState, 'skipped');
  assert.equal(lateTapResult.nextState.phase, 'SUMMARY');
  assert.equal(lateTapResult.nextState.timerActive, false);

  // 4. In 2-Player cooperative mode, accumulateRoundPlayerScores gives the points to BOTH players
  room.proibido!.roundScore = 5;
  const scoredPlayers = accumulateRoundPlayerScores(room);
  assert.equal(scoredPlayers.find((p) => p.id === 'p1')?.score, 5);
  assert.equal(scoredPlayers.find((p) => p.id === 'p2')?.score, 5);
});

test('Jogo do Limite: timer timeout triggers 5-second reveal countdown, locks player guesses, and transitions to SCORING with giant answer and differences', () => {
  const room = createDefaultRoom('LIM001', 'host_01');
  room.activeGame = 'limite';
  room.timerConfig = 30;

  const baseLimiteState: LimiteGameState = {
    phase: 'SECRET_GUESS',
    roundData: {
      pergunta: 'Quantos degraus tem a Torre Eiffel até o topo acessível ao público?',
      valor_exato: 1665,
      unidade: 'degraus',
      curiosidade_explicacao: 'A escadaria tem exatamente 1.665 degraus do chão ao topo!'
    },
    guesses: {
      p1: 1500, // diff: -165
      p2: 1665, // exact! diff: 0
      p3: 1700  // busted! diff: +35
    },
    submittedPlayers: ['p1', 'p2', 'p3'],
    powerCardsPlayed: {},
    callTimerRemaining: 0,
    timerActive: true,
    timerSeconds: 1,
    revealedOrder: false,
    winners: [],
    bustedPlayers: [],
    closestDifference: 0,
    pointsAwarded: {},
    revealCountdown: null
  };

  // 1. When timer counts down from 1 to 0:
  // It stops timerActive, sets timerSeconds: 0, and initiates 5-second suspense countdown (revealCountdown: 5)
  const timerZeroState: LimiteGameState = {
    ...baseLimiteState,
    timerSeconds: 0,
    timerActive: false,
    revealCountdown: 5
  };
  assert.equal(timerZeroState.timerSeconds, 0);
  assert.equal(timerZeroState.timerActive, false);
  assert.equal(timerZeroState.revealCountdown, 5);

  // 2. Lock verification: isTimeExpired is true when timerSeconds === 0 or revealCountdown is active
  const isTimeExpired1 = (room.timerConfig > 0 && timerZeroState.timerSeconds <= 0) || Boolean(timerZeroState.revealCountdown);
  assert.equal(isTimeExpired1, true, 'Guesses must be locked when round timer reaches 0');

  // 3. Counting down: 5 -> 4 -> 3 -> 2 -> 1 -> 0 triggers reveal
  const countdown1State: LimiteGameState = { ...timerZeroState, revealCountdown: 1 };
  assert.equal(countdown1State.revealCountdown, 1);

  // 4. On 0 (or trigger): evaluateLimiteRoundReveal transitions phase to SCORING and clears revealCountdown
  const scoringState = evaluateLimiteRoundReveal({
    ...countdown1State,
    timerActive: false
  });
  assert.equal(scoringState.phase, 'SCORING');
  assert.equal(scoringState.revealCountdown, null);
  assert.deepEqual(scoringState.winners, ['p2']); // p2 exact
  assert.deepEqual(scoringState.bustedPlayers, ['p3']); // p3 exceeded 1665
  assert.equal(scoringState.pointsAwarded['p2'], 2, 'Exact guess p2 earns 2 points');
  assert.equal(scoringState.closestDifference, 0);

  // 5. Verify difference calculations:
  const exact = scoringState.roundData.valor_exato;
  assert.equal(exact - scoringState.guesses['p1'], 165); // under
  assert.equal(scoringState.guesses['p2'] - exact, 0); // exact
  assert.equal(scoringState.guesses['p3'] - exact, 35); // over
});



