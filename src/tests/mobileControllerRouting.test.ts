import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolveControllerViewTarget } from '../components/controller/controllerRouting.ts';
import { ScreenMobileController } from '../components/controller/ScreenMobileController.tsx';
import type { GameRoom, Player } from '../types/game.ts';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Marco',
    avatar: '😎',
    color: '#17B8B8',
    team: 'A',
    isVip: true,
    score: 0,
    connected: true,
    lastActive: 1000,
    powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
    connectionType: 'master',
    isMasterControl: true,
    ...overrides
  };
}

function makeRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  const p = makePlayer();
  return {
    roomId: 'BOBO',
    hostId: 'host-1',
    screen: 'lobby',
    activeGame: 'limite',
    theme: 'Geral',
    roundNumber: 1,
    maxRounds: 3,
    timerConfig: 60,
    players: [p],
    teams: {
      A: { id: 'A', name: 'Equipe A', score: 0, members: ['p1'] },
      B: { id: 'B', name: 'Equipe B', score: 0, members: [] }
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

test('resolveControllerViewTarget keeps VIP master in lobby-controller during lobby/setup/rules', () => {
  for (const roomScreen of ['mode-select', 'lobby', 'game-setup', 'rules'] as const) {
    assert.equal(
      resolveControllerViewTarget({
        isPadMode: false,
        hasPlayer: true,
        forceJoinScreen: false,
        roomScreen,
        isMasterRemoteMode: true
      }),
      'lobby-controller',
      `Expected lobby-controller on ${roomScreen} even when isMasterRemoteMode is true`
    );
  }
});

test('resolveControllerViewTarget switches to master-remote only during playing screen', () => {
  assert.equal(
    resolveControllerViewTarget({
      isPadMode: false,
      hasPlayer: true,
      forceJoinScreen: false,
      roomScreen: 'playing',
      isMasterRemoteMode: true
    }),
    'master-remote'
  );

  assert.equal(
    resolveControllerViewTarget({
      isPadMode: false,
      hasPlayer: true,
      forceJoinScreen: false,
      roomScreen: 'playing',
      isMasterRemoteMode: false
    }),
    'game-controller'
  );
});

test('resolveControllerViewTarget prioritizes join screen when player left or is unregistered even if master mode was active', () => {
  assert.equal(
    resolveControllerViewTarget({
      isPadMode: false,
      hasPlayer: true,
      forceJoinScreen: true,
      roomScreen: 'lobby',
      isMasterRemoteMode: true
    }),
    'join'
  );

  assert.equal(
    resolveControllerViewTarget({
      isPadMode: false,
      hasPlayer: false,
      forceJoinScreen: false,
      roomScreen: 'playing',
      isMasterRemoteMode: true
    }),
    'join'
  );
});

test('ScreenMobileController renders VIP Host lobby controls when role is master', () => {
  const player = makePlayer();
  const room = makeRoom({ screen: 'lobby' });
  const html = renderToStaticMarkup(
    React.createElement(ScreenMobileController, {
      room,
      player,
      role: 'master',
      onChangeRole: () => {},
      onSyncState: () => {},
      onLeaveOrSwitchPlayer: () => {},
      onBuzzReady: () => {},
      onUpdateRoom: () => {},
      onStartMatchFromController: () => {}
    })
  );

  assert.ok(html.includes('data-testid="mobile-controller-lobby-master-card"'));
  assert.ok(html.includes('data-testid="master-remote-start-match-btn"'));
  assert.ok(html.includes('data-testid="master-remote-theme-select"'));
  assert.ok(html.includes('data-testid="master-remote-shuffle-teams-btn"'));
});
