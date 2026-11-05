import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePublicShareOrigin,
  createUniqueRoomSession,
  parseRoomQueryParams,
  generateUnique6CharRoomCode
} from '../utils/multiplayerRoomEngine.ts';

test('resolvePublicShareOrigin converts ais-pre- to ais-dev- to prevent Google auth barrier', () => {
  const preUrl = 'https://ais-pre-uzdoqscffyae4eyfiedlij-726644972033.us-west2.run.app';
  const resolved = resolvePublicShareOrigin(preUrl);
  assert.equal(resolved, 'https://ais-dev-uzdoqscffyae4eyfiedlij-726644972033.us-west2.run.app');

  // Kept untouched if already ais-dev-
  const devUrl = 'https://ais-dev-uzdoqscffyae4eyfiedlij-726644972033.us-west2.run.app';
  assert.equal(resolvePublicShareOrigin(devUrl), devUrl);

  // Localhost untouched
  assert.equal(resolvePublicShareOrigin('http://localhost:3000'), 'http://localhost:3000');
});

test('createUniqueRoomSession enforces role=client and never includes mode=host in share URL', () => {
  const session = createUniqueRoomSession('host', 'limite', 'https://ais-dev-test.run.app');

  assert.ok(session.roomCode);
  assert.equal(session.roomCode.length, 6);
  assert.notEqual(session.roomCode, 'BOBO');

  // joinUrl must enforce role=client and NOT mode=host
  assert.ok(session.joinUrl.includes(`?join=${session.roomCode}&role=client`));
  assert.equal(session.joinUrl.includes('mode=host'), false);

  // WhatsApp share link must also point to role=client
  assert.ok(decodeURIComponent(session.whatsappShareUrl).includes('role=client'));
  assert.equal(session.whatsappShareUrl.includes('mode=host'), false);
});

test('parseRoomQueryParams always treats ?join=XXXX as controller even if &mode=host is present', () => {
  // Classic bug scenario: user scanned a QR with mode=host previously
  const parsedConflict = parseRoomQueryParams('?join=KJ77S7&mode=host');
  assert.equal(parsedConflict.joinCode, 'KJ77S7');
  assert.equal(parsedConflict.isControllerView, true);
  assert.equal(parsedConflict.shouldOpenQuickJoin, true);

  // Normal join
  const parsedJoin = parseRoomQueryParams('?join=KJ77S7&role=client');
  assert.equal(parsedJoin.joinCode, 'KJ77S7');
  assert.equal(parsedJoin.isControllerView, true);
  assert.equal(parsedJoin.shouldOpenQuickJoin, true);

  // TV Host on PC (no join param)
  const parsedHost = parseRoomQueryParams('?mode=host');
  assert.equal(parsedHost.joinCode, null);
  assert.equal(parsedHost.isControllerView, false);
  assert.equal(parsedHost.requestedMode, 'host');
});

test('generateUnique6CharRoomCode generates unambiguous 6-char codes excluding O, 0, I, 1', () => {
  const codes: string[] = [];
  for (let i = 0; i < 50; i++) {
    const code = generateUnique6CharRoomCode(codes);
    assert.equal(code.length, 6);
    assert.equal(/^[A-Z2-9]{6}$/.test(code), true);
    assert.equal(code.includes('O'), false);
    assert.equal(code.includes('0'), false);
    assert.equal(code.includes('I'), false);
    assert.equal(code.includes('1'), false);
    codes.push(code);
  }
});

test('MQTT Config & Topic Schema: publishes to roda-de-bobo-v2/room/${roomCode} with fallback to broker.emqx.io', async () => {
  const { getMqttConfig, getRoomMqttTopic, getAllBrokerEndpoints } = await import(
    '../config/mqttConfig.ts'
  );
  const { CloudPartyTransport } = await import('../utils/cloudPartyTransport.ts');

  const config = getMqttConfig();
  assert.equal(config.primaryBrokerUrl, 'wss://broker.emqx.io:8084/mqtt');
  assert.equal(config.topicPrefix, 'roda-de-bobo-v2/room');

  const endpoints = getAllBrokerEndpoints();
  assert.ok(endpoints.includes('wss://broker.emqx.io:8084/mqtt'));
  assert.ok(endpoints.includes('wss://broker.hivemq.com:8884/mqtt'));
  assert.ok(endpoints.includes('wss://test.mosquitto.org:8081'));

  const topic = getRoomMqttTopic('KJ77S7');
  assert.equal(topic, 'roda-de-bobo-v2/room/KJ77S7');

  // Verify CloudPartyTransport initializes with the exact topic and status
  const transport = new CloudPartyTransport({
    roomCode: 'KJ77S7',
    clientId: 'cli_test_123',
    isHost: false
  });

  assert.equal(transport.getTopic(), 'roda-de-bobo-v2/room/KJ77S7');
  assert.ok(['connecting', 'connected'].includes(transport.getStatus()));

  transport.destroy();
});
