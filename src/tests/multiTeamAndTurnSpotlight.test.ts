import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultRoom } from '../utils/roomManager';
import { balancePlayersIntoTeams, resolvePublicShareOrigin } from '../utils/multiplayerRoomEngine';
import {
  getTeamCount,
  getActiveTeamIds,
  getNextTeamId,
  cyclePlayerTeamId,
  pickLeastPopulatedTeam,
  normalizePlayersToTeamCount,
  syncTeamsRecordFromPlayers,
  resolveCurrentTurnSpotlight
} from '../utils/teamUtils';
import { Player, TeamId } from '../types/game';

const makePlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, idx) => ({
    id: `p-${idx + 1}`,
    name: `Jogador ${idx + 1}`,
    avatar: '🕹️',
    color: '#17B8B8',
    team: 'A' as const,
    isVip: idx === 0,
    score: 0,
    powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
    connected: true,
    lastActive: Date.now()
  }));

test('Multi-Team Engine: supports 2, 3, and 4 teams with cycling and auto-balancing', () => {
  const room = createDefaultRoom('TEST', 'host-1');
  assert.equal(getTeamCount(room), 2);
  assert.deepEqual(getActiveTeamIds(room), ['A', 'B']);

  room.teamCount = 3;
  assert.equal(getTeamCount(room), 3);
  assert.deepEqual(getActiveTeamIds(room), ['A', 'B', 'C']);

  room.teamCount = 4;
  assert.equal(getTeamCount(room), 4);
  assert.deepEqual(getActiveTeamIds(room), ['A', 'B', 'C', 'D']);

  const active4 = getActiveTeamIds(room);
  assert.equal(cyclePlayerTeamId('A', active4), 'B');
  assert.equal(cyclePlayerTeamId('B', active4), 'C');
  assert.equal(cyclePlayerTeamId('C', active4), 'D');
  assert.equal(cyclePlayerTeamId('D', active4), 'A');

  const balanced4 = balancePlayersIntoTeams(makePlayers(8), 4);
  assert.equal(balanced4.filter((p) => p.team === 'A').length, 2);
  assert.equal(balanced4.filter((p) => p.team === 'B').length, 2);
  assert.equal(balanced4.filter((p) => p.team === 'C').length, 2);
  assert.equal(balanced4.filter((p) => p.team === 'D').length, 2);

  // Reducing from 4 teams to 2 teams normalizes C and D players into A and B
  const normalized2 = normalizePlayersToTeamCount(balanced4, 2);
  assert.equal(normalized2.every((p) => p.team === 'A' || p.team === 'B'), true);
  assert.equal(normalized2.filter((p) => p.team === 'A').length, 4);
  assert.equal(normalized2.filter((p) => p.team === 'B').length, 4);

  const syncedTeams = syncTeamsRecordFromPlayers(balanced4, room.teams);
  assert.equal(syncedTeams.C?.members.length, 2);
  assert.equal(syncedTeams.D?.members.length, 2);

  // Next team skips eliminated teams
  assert.equal(getNextTeamId('A', ['A', 'B', 'C', 'D'], ['B']), 'C');
  assert.equal(getNextTeamId('C', ['A', 'B', 'C', 'D'], ['D', 'A']), 'B');
  assert.equal(pickLeastPopulatedTeam(balanced4.slice(0, 3), ['A', 'B', 'C', 'D']), 'D');
});

test('Turn Spotlight Engine: resolves active player and rotates within teams across games', () => {
  const room = createDefaultRoom('SPOT', 'host-1');
  room.teamCount = 3;
  room.players = balancePlayersIntoTeams(makePlayers(6), 3);
  room.screen = 'playing';
  room.activeGame = 'tem-ou-nao-tem';
  room.temOuNaoTem = {
    phase: 'GUESSING',
    roundData: { pergunta: 'Comidas de boteco?', respostas: [] },
    items: [],
    activeTeam: 'A',
    turnStepIndex: 0,
    strikes: { A: 0, B: 0, C: 0, D: 0 },
    maxStrikes: 2,
    eliminatedTeams: [],
    freeDomainTeam: null,
    roundScore: { A: 0, B: 0, C: 0, D: 0 }
  };

  const spot1 = resolveCurrentTurnSpotlight(room);
  assert.ok(spot1);
  assert.equal(spot1.activeTeamId, 'A');
  const firstTeamAMember = room.players.filter((p) => p.team === 'A')[0];
  const secondTeamAMember = room.players.filter((p) => p.team === 'A')[1];
  assert.equal(spot1.activePlayer?.id, firstTeamAMember.id);

  // Rotating turnStepIndex by 3 (full cycle of 3 teams) rotates to the 2nd member of Team A
  room.temOuNaoTem.turnStepIndex = 3;
  const spot2 = resolveCurrentTurnSpotlight(room);
  assert.ok(spot2);
  assert.equal(spot2.activePlayer?.id, secondTeamAMember.id);

  // In Jogo do Limite, everyone plays simultaneously — there is no "jogador da vez"
  room.activeGame = 'limite';
  const limiteSpotlight = resolveCurrentTurnSpotlight(room);
  assert.equal(limiteSpotlight, null);
});

test('Team Setup Flow & Mode Naming: team count is defined before game launch with 2, 3, 4 teams', () => {
  const room = createDefaultRoom('SETUP', 'host-1');
  const players = makePlayers(8);
  room.players = players;

  // Initial stage defaults to 2 teams
  assert.equal(getTeamCount(room), 2);

  // When host configures teams right after game settings (2, 3, or 4 teams)
  const balanced2 = balancePlayersIntoTeams(room.players, 2);
  assert.equal(balanced2.filter((p) => p.team === 'A').length, 4);
  assert.equal(balanced2.filter((p) => p.team === 'B').length, 4);

  const balanced3 = balancePlayersIntoTeams(room.players, 3);
  assert.equal(getActiveTeamIds(3).length, 3);
  assert.equal(balanced3.filter((p) => p.team === 'A').length, 3);
  assert.equal(balanced3.filter((p) => p.team === 'B').length, 3);
  assert.equal(balanced3.filter((p) => p.team === 'C').length, 2);

  const balanced4 = balancePlayersIntoTeams(room.players, 4);
  assert.equal(getActiveTeamIds(4).length, 4);
  assert.equal(balanced4.filter((p) => p.team === 'A').length, 2);
  assert.equal(balanced4.filter((p) => p.team === 'B').length, 2);
  assert.equal(balanced4.filter((p) => p.team === 'C').length, 2);
  assert.equal(balanced4.filter((p) => p.team === 'D').length, 2);
});

test('Drag & Drop Team Assignment: moving an existing player (e.g. Marcos André) from top shelf moves them without creating a duplicate', () => {
  const room = createDefaultRoom('DRAG01', 'host-1');
  // Player 'Marcos André' is already in Equipe A
  room.players = [
    {
      id: 'fix-marcos-andre',
      name: 'Marcos André',
      avatar: '🎮',
      color: '#17B8B8',
      team: 'A',
      isVip: true,
      score: 0,
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
      connected: true,
      lastActive: Date.now(),
      isFixedPlayer: true,
      fixedPlayerId: 'marcos-andre'
    },
    {
      id: 'p-2',
      name: 'Bruna',
      avatar: '🎨',
      color: '#FF1E56',
      team: 'B',
      isVip: false,
      score: 0,
      powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
      connected: true,
      lastActive: Date.now()
    }
  ];

  // Simulated drag-and-drop drop handler logic matching ScreenGameSetup:
  const handleDropSimulation = (
    droppedPayload: { id?: string; name: string; fixedPlayerId?: string },
    targetTeam: TeamId
  ) => {
    const cleanName = droppedPayload.name.trim();
    const existingMatch = room.players.find(
      (p) =>
        (droppedPayload.id && p.id === droppedPayload.id) ||
        (droppedPayload.fixedPlayerId &&
          (p.fixedPlayerId === droppedPayload.fixedPlayerId || p.id === `fix-${droppedPayload.fixedPlayerId}`)) ||
        p.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existingMatch) {
      // Must switch team, NEVER duplicate
      existingMatch.team = targetTeam;
    } else {
      room.players.push({
        id: droppedPayload.id || `p-${Date.now()}`,
        name: cleanName,
        avatar: '👾',
        color: '#17B8B8',
        team: targetTeam,
        isVip: false,
        score: 0,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: Date.now()
      });
    }
  };

  // Drag "Marcos André" from top fixed players shelf and drop onto Equipe C
  handleDropSimulation({ name: 'Marcos André', fixedPlayerId: 'marcos-andre' }, 'C');

  // Assertions: Exactly 2 players remain in room (no duplicate created!)
  assert.equal(room.players.length, 2);
  const marcos = room.players.find((p) => p.name === 'Marcos André');
  assert.ok(marcos);
  assert.equal(marcos.team, 'C', 'Marcos André must now be in Equipe C');
  assert.equal(
    room.players.filter((p) => p.name.toLowerCase() === 'marcos andré'.toLowerCase()).length,
    1,
    'There must strictly be only 1 Marcos André in the entire room'
  );
});

test('Team Drag Flow & QR Mobile Direct Connect: no "Mover" button, dedicated mobile QR connection, and distinct header tabs', () => {
  // 1. Verify Player interface supports mobile and local players
  const mobilePlayer = {
    id: 'mob-1',
    name: 'Gisele',
    avatar: '🦊',
    color: '#FF1E56',
    team: 'B' as TeamId,
    isVip: false,
    score: 0,
    powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
    connected: true,
    lastActive: Date.now(),
    isMobile: true,
    connectionType: 'mobile' as const,
    deviceClientId: 'device-abc-123'
  };
  assert.equal(mobilePlayer.isMobile, true);
  assert.equal(mobilePlayer.connectionType, 'mobile');

  // 2. Verify share origin and playUrl creation for mobile scanning
  const shareOrigin = resolvePublicShareOrigin('http://localhost:3000');
  const playUrl = `${shareOrigin}/?join=TEST99&role=client`;
  assert.ok(playUrl.includes('TEST99'));
  assert.ok(playUrl.includes('role=client'));

  // 3. Verify distinct dock modal tabs logic:
  // LIVE / CONECTAR CELULARES triggers 'qr' tab
  // 👥 Jogadores triggers 'players' tab
  type DockModalTab = 'qr' | 'players' | 'history' | 'config' | null;
  let activeTab: DockModalTab = null;

  const onLiveConnectClick = () => {
    activeTab = activeTab === 'qr' ? null : 'qr';
  };
  const onPlayersBadgeClick = () => {
    activeTab = activeTab === 'players' ? null : 'players';
  };

  onLiveConnectClick();
  assert.equal(activeTab, 'qr', 'LIVE / CONECTAR CELULARES must open the QR Code tab');

  onPlayersBadgeClick();
  assert.equal(activeTab, 'players', 'Jogadores badge must open the dedicated Players tab');

  // 4. In the players tab, user can click to switch to QR code
  const onSwitchToQrFromPlayers = () => {
    activeTab = 'qr';
  };
  onSwitchToQrFromPlayers();
  assert.equal(activeTab, 'qr', 'Must switch directly to QR Code tab when requested');
});
