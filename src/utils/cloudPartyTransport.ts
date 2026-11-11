/**
 * Cloud Party Transport Service
 * Zero-config cross-device realtime synchronization using MQTT over WebSockets
 * (with automatic failover across public SSL brokers configured via mqttConfig)
 * + Local BroadcastChannel + Server WS/REST.
 *
 * Guarantees that mobile phones (4G / Wi-Fi) scanning a TV's QR Code synchronize
 * immediately on the topic `roda-de-bobo-v2/room/${roomCode}` without requiring
 * Supabase API keys or manual network setup.
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { GameRoom } from '../types/game';
import { getMqttConfig, getAllBrokerEndpoints, getRoomMqttTopic } from '../config/mqttConfig';
import { isRoomApiAvailable, postToApi } from './apiAvailability';

export type TransportStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export type CloudPartyMessage =
  | {
      type: 'CLIENT_PING' | 'HELLO_HOST';
      clientId: string;
      playerName?: string;
      avatar?: string;
      timestamp: number;
    }
  | {
      type: 'HOST_PONG';
      hostId: string;
      roomCode: string;
      state: GameRoom;
      timestamp: number;
    }
  | {
      type: 'REQUEST_SYNC';
      clientId: string;
      roomCode: string;
      timestamp: number;
    }
  | {
      type: 'ROOM_STATE_UPDATE';
      roomCode: string;
      state: GameRoom;
      senderId?: string;
      timestamp: number;
    }
  | {
      type: 'PLAYER_JOIN_REQUEST';
      roomCode: string;
      clientId: string;
      playerName: string;
      avatar?: string;
      color?: string;
      role?: 'player' | 'master';
      fixedPlayerId?: string;
      timestamp: number;
    }
  | {
      type: 'PLAYER_ACTION';
      roomCode: string;
      clientId: string;
      playerId: string;
      actionType: string;
      payload?: Record<string, unknown>;
      timestamp: number;
    };

export interface CloudPartyTransportOptions {
  roomCode: string;
  clientId: string;
  isHost: boolean;
  initialState?: GameRoom;
  onStatusChange?: (status: TransportStatus, details?: string) => void;
  onStateUpdate?: (state: GameRoom) => void;
  onJoinRequest?: (req: {
    clientId: string;
    playerName: string;
    avatar?: string;
    color?: string;
    role?: 'player' | 'master';
    fixedPlayerId?: string;
  }) => void;
  onPlayerAction?: (action: {
    clientId: string;
    playerId: string;
    actionType: string;
    payload?: Record<string, unknown>;
  }) => void;
  onClientPing?: (ping: { clientId: string; playerName?: string; avatar?: string }) => void;
}

export class CloudPartyTransport {
  private client: MqttClient | null = null;
  private brokerList: string[];
  private currentBrokerIndex = 0;
  private roomCode: string;
  private clientId: string;
  private isHost: boolean;
  private topic: string;
  private isDestroyed = false;
  private broadcastChannel: BroadcastChannel | null = null;
  private serverWs: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private status: TransportStatus = 'connecting';
  private lastKnownState: GameRoom | null = null;
  private pendingMessages: CloudPartyMessage[] = [];

  private onStatusChange?: (status: TransportStatus, details?: string) => void;
  private onStateUpdate?: (state: GameRoom) => void;
  private onJoinRequest?: CloudPartyTransportOptions['onJoinRequest'];
  private onPlayerAction?: CloudPartyTransportOptions['onPlayerAction'];
  private onClientPing?: CloudPartyTransportOptions['onClientPing'];

  constructor(options: CloudPartyTransportOptions) {
    this.roomCode = (options.roomCode || 'RODA').toUpperCase().trim();
    this.clientId = options.clientId;
    this.isHost = options.isHost;
    this.lastKnownState = options.initialState || null;
    this.brokerList = getAllBrokerEndpoints();
    this.topic = getRoomMqttTopic(this.roomCode);

    this.onStatusChange = options.onStatusChange;
    this.onStateUpdate = options.onStateUpdate;
    this.onJoinRequest = options.onJoinRequest;
    this.onPlayerAction = options.onPlayerAction;
    this.onClientPing = options.onClientPing;

    this.initLocalBroadcast();
    this.initServerWebSocket();
    this.connectMqtt();

    // Start periodic heartbeat / state refresh
    this.startHeartbeat();
  }

  private updateStatus(status: TransportStatus, details?: string) {
    this.status = status;
    if (this.onStatusChange) {
      try {
        this.onStatusChange(status, details);
      } catch {
        // ignore callback errors
      }
    }
  }

  public getStatus(): TransportStatus {
    return this.status;
  }

  public getTopic(): string {
    return this.topic;
  }

  private initLocalBroadcast() {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.broadcastChannel = new BroadcastChannel(`roda_cloud_sync_${this.roomCode}`);
      this.broadcastChannel.onmessage = (event) => {
        if (!event?.data) return;
        this.handleIncomingMessage(event.data);
      };
    } catch {
      // BroadcastChannel might fail in private windows or strict sandboxes
    }
  }

  private initServerWebSocket() {
    if (typeof window === 'undefined') return;
    // Sem servidor próprio (ex.: Vercel estático) não há /ws: evita o erro de conexão e segue só com MQTT/BroadcastChannel.
    void isRoomApiAvailable().then((available) => {
      if (available && !this.isDestroyed) this.openServerWebSocket();
    });
  }

  private openServerWebSocket() {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws?roomId=${this.roomCode}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (this.isDestroyed) {
          ws.close();
          return;
        }
        this.serverWs = ws;
        this.updateStatus('connected', `Conectado na sala (${this.roomCode})`);

        if (this.isHost && this.lastKnownState) {
          try {
            ws.send(
              JSON.stringify({
                type: 'UPDATE_STATE',
                roomId: this.roomCode,
                state: this.lastKnownState
              })
            );
          } catch {
            // ignore
          }
        }

        // Flush any queued messages over WebSocket
        if (this.pendingMessages.length > 0) {
          for (const pending of this.pendingMessages) {
            try {
              if (pending.type === 'PLAYER_JOIN_REQUEST' || pending.type === 'PLAYER_ACTION') {
                ws.send(
                  JSON.stringify({
                    type: 'DISPATCH_ACTION',
                    roomId: this.roomCode,
                    action: pending
                  })
                );
              }
            } catch {
              // ignore
            }
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'ROOM_SYNC' && parsed.state) {
            this.handleIncomingMessage({
              type: 'ROOM_STATE_UPDATE',
              roomCode: this.roomCode,
              state: parsed.state,
              timestamp: parsed.state.lastUpdated || Date.now()
            });
          } else if (parsed.type === 'ACTION' && parsed.action) {
            this.handleIncomingMessage(parsed.action);
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        // Silently handled
      };

      ws.onclose = () => {
        this.serverWs = null;
      };
    } catch {
      // Local WS might not be reachable
    }
  }

  private connectMqtt() {
    if (this.isDestroyed) return;
    const config = getMqttConfig();
    const brokerUrl = this.brokerList[this.currentBrokerIndex] || config.primaryBrokerUrl;
    
    let brokerHost = 'broker';
    try {
      brokerHost = new URL(brokerUrl).hostname;
    } catch {
      // ignore
    }
    
    this.updateStatus('connecting', `Conectando via ${brokerHost}...`);

    try {
      const randomId = Math.random().toString(36).substring(2, 8);
      const cleanClientId = `rdb_${this.isHost ? 'host' : 'cli'}_${randomId}`;

      const clientOptions: IClientOptions = {
        clientId: cleanClientId,
        clean: true,
        connectTimeout: config.connectTimeoutMs,
        reconnectPeriod: config.reconnectPeriodMs,
        keepalive: config.keepaliveSec
      };

      if (config.username) {
        clientOptions.username = config.username;
      }
      if (config.password) {
        clientOptions.password = config.password;
      }

      const client = mqtt.connect(brokerUrl, clientOptions);
      this.client = client;

      client.on('connect', () => {
        if (this.isDestroyed) {
          client.end();
          return;
        }
        this.updateStatus('connected', `Conectado à nuvem (${this.roomCode})`);

        // Subscribe to room topic
        client.subscribe(this.topic, { qos: 0 }, (err) => {
          if (!err) {
            // Flush any queued messages first
            if (this.pendingMessages.length > 0) {
              const queue = [...this.pendingMessages];
              this.pendingMessages = [];
              for (const msg of queue) {
                try {
                  client.publish(this.topic, JSON.stringify(msg), { qos: 0, retain: false });
                } catch {
                  // ignore
                }
              }
            }

            if (!this.isHost) {
              // Clients request sync immediately
              this.requestSync();
            } else if (this.lastKnownState) {
              // Host broadcasts latest snapshot with retain: true
              this.publishStateUpdate(this.lastKnownState);
            }
          }
        });
      });

      client.on('message', (_receivedTopic, payload) => {
        try {
          const str = payload.toString();
          const data = JSON.parse(str);
          this.handleIncomingMessage(data);
        } catch {
          // ignore corrupted messages
        }
      });

      client.on('error', () => {
        this.tryNextBroker();
      });

      client.on('offline', () => {
        if (!this.isDestroyed && this.status !== 'connecting') {
          this.updateStatus('reconnecting', 'Tentando reconectar...');
        }
      });
    } catch {
      this.tryNextBroker();
    }
  }

  private tryNextBroker() {
    if (this.isDestroyed) return;
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
    }

    if (this.brokerList.length > 0) {
      this.currentBrokerIndex = (this.currentBrokerIndex + 1) % this.brokerList.length;
    }
    this.updateStatus('reconnecting', 'Alternando servidor em nuvem...');

    window.setTimeout(() => {
      if (!this.isDestroyed) {
        this.connectMqtt();
      }
    }, 1200);
  }

  private startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.isDestroyed) return;
      if (!this.isHost) {
        // Periodically ping host to maintain freshness
        this.sendClientPing();
      }
    }, 5000);
  }

  private handleIncomingMessage(msg: any) {
    if (!msg || typeof msg !== 'object') return;
    const msgRoom = String(msg.roomCode || '').toUpperCase().trim();
    if (msgRoom && msgRoom !== this.roomCode) {
      return;
    }

    switch (msg.type) {
      case 'CLIENT_PING':
      case 'HELLO_HOST': {
        if (this.isHost && this.lastKnownState) {
          // Notify Host of client ping
          if (this.onClientPing) {
            this.onClientPing({
              clientId: msg.clientId,
              playerName: msg.playerName,
              avatar: msg.avatar
            });
          }
          // Respond with state pong immediately
          this.sendDirectMessage({
            type: 'HOST_PONG',
            hostId: this.clientId,
            roomCode: this.roomCode,
            state: this.lastKnownState,
            timestamp: Date.now()
          });
        }
        break;
      }

      case 'REQUEST_SYNC': {
        if (this.isHost && this.lastKnownState) {
          this.sendDirectMessage({
            type: 'ROOM_STATE_UPDATE',
            roomCode: this.roomCode,
            state: this.lastKnownState,
            senderId: this.clientId,
            timestamp: Date.now()
          });
        }
        break;
      }

      case 'HOST_PONG':
      case 'ROOM_STATE_UPDATE': {
        if (msg.state && typeof msg.state === 'object') {
          this.lastKnownState = msg.state as GameRoom;
          if (this.onStateUpdate) {
            this.onStateUpdate(msg.state as GameRoom);
          }
        }
        break;
      }

      case 'PLAYER_JOIN_REQUEST': {
        if (this.isHost && this.onJoinRequest) {
          this.onJoinRequest({
            clientId: msg.clientId,
            playerName: msg.playerName,
            avatar: msg.avatar,
            color: msg.color,
            role: msg.role,
            fixedPlayerId: msg.fixedPlayerId
          });
        }
        break;
      }

      case 'PLAYER_ACTION': {
        if (this.isHost && this.onPlayerAction) {
          this.onPlayerAction({
            clientId: msg.clientId,
            playerId: msg.playerId,
            actionType: msg.actionType,
            payload: msg.payload
          });
        }
        break;
      }

      default:
        break;
    }
  }

  private sendDirectMessage(msg: CloudPartyMessage) {
    const raw = JSON.stringify(msg);

    // 1. Send via MQTT Cloud with retain: true for Host state snapshots
    if (this.client && this.client.connected) {
      try {
        const isRetained = Boolean(this.isHost && msg.type === 'ROOM_STATE_UPDATE');
        this.client.publish(this.topic, raw, { qos: 0, retain: isRetained });
      } catch {
        // ignore
      }
    } else if (msg.type === 'PLAYER_JOIN_REQUEST' || msg.type === 'PLAYER_ACTION') {
      this.pendingMessages.push(msg);
      if (this.pendingMessages.length > 15) {
        this.pendingMessages.shift();
      }
    }

    // 2. Send via Local BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {
        // ignore
      }
    }

    // 3. Send via Server WebSocket if present
    if (this.serverWs && this.serverWs.readyState === WebSocket.OPEN) {
      try {
        if (msg.type === 'ROOM_STATE_UPDATE') {
          this.serverWs.send(
            JSON.stringify({
              type: 'UPDATE_STATE',
              roomId: this.roomCode,
              state: msg.state
            })
          );
        } else if (msg.type === 'PLAYER_JOIN_REQUEST' || msg.type === 'PLAYER_ACTION') {
          this.serverWs.send(
            JSON.stringify({
              type: 'DISPATCH_ACTION',
              roomId: this.roomCode,
              action: msg
            })
          );
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Published by the Host (TV) when room state updates.
   */
  public publishStateUpdate(state: GameRoom) {
    this.lastKnownState = state;
    this.sendDirectMessage({
      type: 'ROOM_STATE_UPDATE',
      roomCode: this.roomCode,
      state,
      senderId: this.clientId,
      timestamp: Date.now()
    });

    // Also persist to server REST endpoint
    postToApi(`/api/rooms/${this.roomCode}/state`, state);
  }

  /**
   * Dispatched by a Mobile Controller when requesting to join a room.
   */
  public sendJoinRequest(player: {
    name: string;
    avatar?: string;
    color?: string;
    role?: 'player' | 'master';
    fixedPlayerId?: string;
  }) {
    this.sendDirectMessage({
      type: 'PLAYER_JOIN_REQUEST',
      roomCode: this.roomCode,
      clientId: this.clientId,
      playerName: player.name,
      avatar: player.avatar,
      color: player.color,
      role: player.role,
      fixedPlayerId: player.fixedPlayerId,
      timestamp: Date.now()
    });
  }

  /**
   * Dispatched by a Mobile Controller for in-game actions (buzz, guess, reaction).
   */
  public sendPlayerAction(playerId: string, actionType: string, payload?: Record<string, unknown>) {
    this.sendDirectMessage({
      type: 'PLAYER_ACTION',
      roomCode: this.roomCode,
      clientId: this.clientId,
      playerId,
      actionType,
      payload,
      timestamp: Date.now()
    });
  }

  /**
   * Sends a lightweight ping to the Host.
   */
  public sendClientPing(playerName?: string, avatar?: string) {
    this.sendDirectMessage({
      type: 'CLIENT_PING',
      clientId: this.clientId,
      playerName,
      avatar,
      timestamp: Date.now()
    });
  }

  /**
   * Explicitly requests the Host to resend the latest state.
   */
  public requestSync() {
    this.sendDirectMessage({
      type: 'REQUEST_SYNC',
      clientId: this.clientId,
      roomCode: this.roomCode,
      timestamp: Date.now()
    });
  }

  /**
   * Force synchronization triggered by user click on [ 🔄 Forçar Sincronização ].
   */
  public forceSync() {
    if (this.isHost && this.lastKnownState) {
      this.publishStateUpdate(this.lastKnownState);
    } else {
      this.requestSync();
    }
  }

  /**
   * Clean up connections and listeners.
   */
  public destroy() {
    this.isDestroyed = true;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {
        // ignore
      }
      this.broadcastChannel = null;
    }
    if (this.serverWs) {
      try {
        this.serverWs.close();
      } catch {
        // ignore
      }
      this.serverWs = null;
    }
  }
}
