/**
 * Room Manager & Realtime State Synchronizer
 * Combines Supabase Realtime Presence/Broadcast, WebSockets, BroadcastChannel,
 * localStorage persistence, and REST fallback with automatic reconnection.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { GameRoom, Player, GameId, ScreenState, TeamId, ConnectionMode, DEFAULT_GAME_CUSTOM_CONFIG } from '../types/game';
import { sounds } from './soundEffects';
import {
  RoomConnectionStatus,
  PresencePeer,
  isSupabaseConfigured,
  subscribeSupabaseRoomChannel
} from './supabaseClient';
import { CloudPartyTransport, TransportStatus } from './cloudPartyTransport';
import {
  saveRoomStateToStorage,
  loadRoomStateFromStorage,
  clearRoomStateFromStorage,
  isResumableGame
} from './sessionPersistence';
import { FIXED_PLAYERS } from './fixedPlayers';
import {
  RETRO_AVATARS,
  resolvePlayerAvatar,
  saveLastSelectedAvatar,
  savePlayerAvatarPreference
} from './retroAvatars';
import {
  PartyRole,
  claimOrRegisterPlayerInRoom,
  reconnectPlayerInRoom,
  triggerPingOnPlayerInRoom,
  triggerBuzzReadyInRoom,
  emitPartyProtocolMessage,
  subscribePartyProtocolMessages,
  saveLastPartySession,
  generateNewRoomCode
} from './partyNetworkEngine';
import {
  getActiveTeamIds,
  cyclePlayerTeamId,
  pickLeastPopulatedTeam,
  syncTeamsRecordFromPlayers,
  normalizePlayersToTeamCount
} from './teamUtils';
import { isApiAvailable, markApiUnavailable } from './apiAvailability';

const AVATARS = RETRO_AVATARS;
const COLORS = [
  '#FF1E56', // Neon Rose
  '#17B8B8', // Neon Cyan
  '#FF6B00', // Arcade Orange
  '#9D00FF', // Neon Purple
  '#00FF66', // Neon Lime
  '#FFD600', // Neon Yellow
];

export function validateNewPlayerName(
  existingPlayers: ReadonlyArray<Pick<Player, 'id' | 'name'>>,
  rawName: string,
  ignorePlayerId?: string
): { valid: boolean; error?: string } {
  const normalized = (rawName || '').trim().toLowerCase();
  if (!normalized) {
    return { valid: false, error: 'Informe um nome válido para o jogador' };
  }
  const duplicate = existingPlayers.some(
    (p) => p.id !== ignorePlayerId && (p.name || '').trim().toLowerCase() === normalized
  );
  if (duplicate) {
    return { valid: false, error: 'Já existe um jogador com este nome na sala' };
  }
  return { valid: true };
}

export function canStartMatchWithPlayers(
  players: ReadonlyArray<Pick<Player, 'id' | 'name'>>
): { valid: boolean; error?: string } {
  if (!players || players.length < 2) {
    return { valid: false, error: 'Adicione pelo menos 2 jogadores para continuar' };
  }
  return { valid: true };
}

export function createDefaultRoom(roomId: string, hostId: string): GameRoom {
  return {
    roomId: roomId.toUpperCase(),
    hostId,
    teamCount: 2,
    screen: 'mode-select',
    connectionMode: 'local',
    activeGame: null,
    theme: 'Geral',
    activeSubtheme: '',
    usedRoundSignatures: [],
    customConfig: { ...DEFAULT_GAME_CUSTOM_CONFIG },
    roundNumber: 1,
    maxRounds: 5,
    timerConfig: 60,
    players: [],
    teams: {
      A: { id: 'A', name: 'Equipe Alfa', score: 0, members: [] },
      B: { id: 'B', name: 'Equipe Bravo', score: 0, members: [] },
      C: { id: 'C', name: 'Equipe Charlie', score: 0, members: [] },
      D: { id: 'D', name: 'Equipe Delta', score: 0, members: [] }
    },
    sessionStats: {
      totalMatches: 0,
      victoriesA: 0,
      victoriesB: 0,
      victoriesC: 0,
      victoriesD: 0,
      totalPointsA: 0,
      totalPointsB: 0,
      totalPointsC: 0,
      totalPointsD: 0,
      history: []
    },
    roundLog: [],
    lastUpdated: Date.now()
  };
}

export function useGameRoom(roomId: string, currentUserId: string, isHost: boolean = false) {
  const [resumableRoom, setResumableRoom] = useState<GameRoom | null>(() => {
    if (!isHost) return null;
    const saved = loadRoomStateFromStorage(roomId);
    return isResumableGame(saved) ? saved : null;
  });

  const [room, setRoom] = useState<GameRoom>(() => {
    const base = createDefaultRoom(roomId, currentUserId);
    const saved = loadRoomStateFromStorage(roomId);
    if (saved && isHost) {
      const hasPlayers = (saved.players || []).length >= 2;
      return {
        ...base,
        // UX-02: o jogo ativo (activeGame) não é restaurado aqui, então qualquer tela de jogo
        // (rules, setup, playing, game-over…) ficaria em branco. Sempre volta ao lobby; a partida
        // salva é oferecida em "Retomar partida" (resumableRoom).
        screen: hasPlayers ? 'lobby' : 'mode-select',
        connectionMode: saved.connectionMode || base.connectionMode,
        teamCount: saved.teamCount || base.teamCount,
        players: saved.players || [],
        teams: {
          A: { ...(saved.teams?.A || base.teams.A), score: 0 },
          B: { ...(saved.teams?.B || base.teams.B), score: 0 },
          C: saved.teams?.C,
          D: saved.teams?.D
        },
        sessionStats: saved.sessionStats || base.sessionStats
      };
    }
    return saved && !isHost
      ? { ...saved, lastUpdated: 0 }
      : { ...base, lastUpdated: isHost ? Date.now() : 0 };
  });

  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'Offline' : 'Reconnecting'
  );
  const [presenceCount, setPresenceCount] = useState<number>(1);
  const [presencePeers, setPresencePeers] = useState<PresencePeer[]>([
    { userId: currentUserId, isHost, onlineAt: new Date().toISOString() }
  ]);

  const wsRef = useRef<WebSocket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const supabaseBroadcastRef = useRef<((state: GameRoom) => void) | null>(null);
  const cloudTransportRef = useRef<CloudPartyTransport | null>(null);
  const [cloudStatus, setCloudStatus] = useState<TransportStatus>('connecting');
  const reconnectTimerRef = useRef<number | null>(null);
  const pollGenRef = useRef(0);
  const reconnectAttemptRef = useRef<number>(0);
  const unmountedRef = useRef<boolean>(false);
  const lastLocalUpdateRef = useRef<number>(0);
  const roomRef = useRef<GameRoom>(room);
  roomRef.current = room;

  const pendingJoinRequestRef = useRef<{
    roomCode: string;
    name: string;
    avatar?: string;
    color?: string;
    role: PartyRole;
    fixedPlayerId?: string;
  } | null>(null);

  const applyRemoteState = useCallback((newState: GameRoom) => {
    if (!newState) return;
    setRoom((prev) => {
      // Prevent an uninitialized remote client with 0 players from wiping out the Host's existing players
      if (isHost && (prev?.players?.length || 0) > 0 && (newState.players?.length || 0) === 0) {
        return prev;
      }

      const currentTs = Math.max(prev?.lastUpdated || 0, lastLocalUpdateRef.current);
      const isNewerTimestamp = (newState.lastUpdated || 0) > currentTs;
      // Mobile controllers (!isHost) accept authoritative state updates from the Host/Server
      // even if there is wall-clock skew between the phone and the TV/PC.
      const isClientSyncFromHost =
        !isHost &&
        (newState.lastUpdated || 0) > 0 &&
        (newState.lastUpdated !== prev?.lastUpdated ||
          (newState.players?.length || 0) !== (prev?.players?.length || 0) ||
          newState.screen !== prev?.screen ||
          newState.activeGame !== prev?.activeGame ||
          newState.roundNumber !== prev?.roundNumber);

      if (isNewerTimestamp || isClientSyncFromHost) {
        lastLocalUpdateRef.current = newState.lastUpdated || 0;
        saveRoomStateToStorage(newState);
        return newState;
      }
      return prev;
    });
  }, [isHost]);

  // Broadcast state changes locally, to localStorage, to Cloud MQTT, and to the server
  const broadcastState = useCallback((stateUpdater: (prev: GameRoom) => GameRoom) => {
    setRoom((prev) => {
      const updated = stateUpdater(prev);
      const nextTs = Math.max(Date.now(), (prev?.lastUpdated || 0) + 1, lastLocalUpdateRef.current + 1);
      updated.lastUpdated = nextTs;
      lastLocalUpdateRef.current = nextTs;

      if (updated.screen === 'lobby' && !updated.activeGame && updated.roundNumber === 1) {
        setResumableRoom(null);
      }

      // Persist in localStorage
      saveRoomStateToStorage(updated);

      // Send to Cloud MQTT Realtime Transport
      if (cloudTransportRef.current) {
        cloudTransportRef.current.publishStateUpdate(updated);
      }

      // Send to BroadcastChannel for instant multi-tab sync
      if (broadcastRef.current) {
        try {
          broadcastRef.current.postMessage({ type: 'ROOM_SYNC', state: updated });
        } catch {
          // Ignore closed channel error
        }
      }

      // Send to Supabase Realtime Broadcast if active
      if (supabaseBroadcastRef.current) {
        supabaseBroadcastRef.current(updated);
      }

      // Send to WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: 'UPDATE_STATE',
              roomId: updated.roomId,
              state: updated
            })
          );
        } catch {
          // ignore
        }
      }

      // Background REST persistence (syncs with SSE broadcast on server)
      fetch(`/api/rooms/${updated.roomId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {
        // Silently handle if offline
      });

      return updated;
    });
  }, []);

  const activeRoomCode = (room?.roomId || roomId || 'RODA').toUpperCase();

  const connectRealtime = useCallback(() => {
    if (unmountedRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setConnectionStatus('Offline');
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      clearInterval(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {
        // ignore
      }
      esRef.current = null;
    }

    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setConnectionStatus('Connected');

    // INF-02: polling com backoff exponencial (1,5 s → teto de 30 s). Quando a API não existe
    // (ex.: site estático na Vercel, 404) ou falha várias vezes seguidas, para de insistir:
    // o sincronismo continua pelo BroadcastChannel/MQTT.
    const POLL_BASE_MS = 1500;
    const POLL_MAX_MS = 30000;
    const POLL_MAX_FAILURES = 5;
    let failures = 0;
    let stopped = false;
    const gen = ++pollGenRef.current; // invalida loops antigos (ex.: respostas de fetch em voo após reconectar)

    const schedule = (delay: number) => {
      if (stopped || unmountedRef.current || gen !== pollGenRef.current) return;
      reconnectTimerRef.current = window.setTimeout(pollRoomState, delay);
    };

    const pollRoomState = () => {
      if (stopped || unmountedRef.current || gen !== pollGenRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        schedule(POLL_BASE_MS);
        return;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setConnectionStatus('Offline');
        schedule(POLL_BASE_MS);
        return;
      }
      // Envia a versão local mais recente: o servidor responde "unchanged" sem reenviar o estado inteiro.
      const since = lastLocalUpdateRef.current;
      fetch(`/api/rooms/${activeRoomCode}${since > 0 ? `?since=${since}` : ''}`, { cache: 'no-store' })
        .then((res) => {
          if (res.status === 404) {
            // API ausente neste host: não adianta tentar de novo.
            markApiUnavailable();
            stopped = true;
            return null;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (stopped || unmountedRef.current || gen !== pollGenRef.current) return;
          failures = 0;
          if (json) {
            setConnectionStatus('Connected');
            if (json.state) {
              applyRemoteState(json.state as GameRoom);
            }
            if (typeof json.onlineCount === 'number') {
              setPresenceCount(Math.max(1, json.onlineCount));
            }
          }
          schedule(POLL_BASE_MS);
        })
        .catch(() => {
          // Falha transitória: espera cada vez mais e desiste depois de N tentativas.
          failures += 1;
          if (failures >= POLL_MAX_FAILURES) {
            stopped = true;
            return;
          }
          schedule(Math.min(POLL_MAX_MS, POLL_BASE_MS * 2 ** failures));
        });
    };

    // Só começa a consultar se o servidor próprio existir (1 sondagem por sessão, em /api/health).
    void isApiAvailable().then((available) => {
      if (available) schedule(POLL_BASE_MS);
    });
  }, [activeRoomCode, applyRemoteState]);

  useEffect(() => {
    unmountedRef.current = false;

    // Check localStorage on mount before server hydration
    const localSaved = loadRoomStateFromStorage(activeRoomCode);
    if (isHost && isResumableGame(localSaved)) {
      setResumableRoom(localSaved);
    }

    // 1. Setup BroadcastChannel
    const bcName = `roda-de-bobo-${activeRoomCode}`;
    const bc = new BroadcastChannel(bcName);
    broadcastRef.current = bc;

    bc.onmessage = (event) => {
      if (event.data?.type === 'ROOM_SYNC' && event.data.state) {
        applyRemoteState(event.data.state);
      }
    };

    // 2. Setup Supabase Realtime Presence & Broadcast Channel (when configured)
    const supaSub = subscribeSupabaseRoomChannel({
      roomId: activeRoomCode,
      userId: currentUserId,
      isHost,
      onStatusChange: (status) => {
        if (status === 'Connected') {
          setConnectionStatus('Connected');
        } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setConnectionStatus('Offline');
        }
      },
      onPresenceChange: (peers) => {
        setPresencePeers(peers);
        if (peers.length > 0) {
          setPresenceCount(peers.length);
        }
      },
      onRemoteState: (state) => {
        applyRemoteState(state);
      }
    });
    supabaseBroadcastRef.current = supaSub.broadcastSupabaseState;

    // 2b. Setup Zero-Config Cloud Party Transport (MQTT over WebSockets across networks)
    const cloudTransport = new CloudPartyTransport({
      roomCode: activeRoomCode,
      clientId: currentUserId,
      isHost,
      initialState: isHost ? roomRef.current : undefined,
      onStatusChange: (status) => {
        if (unmountedRef.current) return;
        setCloudStatus(status);
        if (status === 'connected') {
          setConnectionStatus('Connected');
        } else if (status === 'reconnecting') {
          setConnectionStatus('Reconnecting');
        } else if (status === 'offline') {
          setConnectionStatus('Offline');
        }
      },
      onStateUpdate: (newState) => {
        if (unmountedRef.current) return;
        applyRemoteState(newState);
      },
      onJoinRequest: (req) => {
        if (unmountedRef.current || !isHost) return;
        sounds.playSuccess();
        broadcastState((prev) => {
          const { nextRoom } = claimOrRegisterPlayerInRoom(prev, {
            clientId: req.clientId,
            playerName: req.playerName,
            avatar: req.avatar,
            color: req.color,
            role: req.role || 'player',
            roomCode: activeRoomCode,
            fixedPlayerId: req.fixedPlayerId
          });
          return nextRoom;
        });
      },
      onPlayerAction: (action) => {
        if (unmountedRef.current || !isHost) return;
        if (action.actionType === 'BUZZ_READY') {
          sounds.playSuccess();
          broadcastState((prev) => triggerBuzzReadyInRoom(prev, action.playerId));
        }
      },
      onClientPing: () => {
        if (unmountedRef.current || !isHost) return;
      }
    });
    cloudTransportRef.current = cloudTransport;

    // If Host is initializing or switching room codes, immediately publish state to local REST server
    if (isHost && roomRef.current) {
      fetch(`/api/rooms/${activeRoomCode}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...roomRef.current, roomId: activeRoomCode })
      }).catch(() => {});
    }

    // If Mobile Controller switched room codes while joining, immediately dispatch the pending join request
    if (
      !isHost &&
      pendingJoinRequestRef.current &&
      pendingJoinRequestRef.current.roomCode.toUpperCase() === activeRoomCode
    ) {
      cloudTransport.sendJoinRequest({
        name: pendingJoinRequestRef.current.name,
        avatar: pendingJoinRequestRef.current.avatar,
        color: pendingJoinRequestRef.current.color,
        role: pendingJoinRequestRef.current.role,
        fixedPlayerId: pendingJoinRequestRef.current.fixedPlayerId
      });
    }

    // 3. Setup realtime connection with automatic fallback
    connectRealtime();

    // 4. Listen for browser online / offline events
    const handleOnline = () => {
      reconnectAttemptRef.current = 0;
      setConnectionStatus('Reconnecting');
      connectRealtime();
      cloudTransport.forceSync();
    };
    const handleOffline = () => {
      setConnectionStatus('Offline');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Subscribe to PartyProtocolMessages (JOIN_REQUEST, PLAYER_RECONNECT, REQUEST_FULL_STATE, PING_DEVICE, PLAYER_BUZZ_READY, HEARTBEAT)
    const unsubscribePartyProtocol = subscribePartyProtocolMessages((msg) => {
      if (unmountedRef.current) return;

      if (msg.type === 'JOIN_REQUEST') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        broadcastState((prev) => {
          const { nextRoom, claimedPlayer } = claimOrRegisterPlayerInRoom(prev, msg.payload);
          emitPartyProtocolMessage({
            type: 'JOIN_ACCEPTED',
            payload: {
              clientId: msg.payload.clientId,
              playerId: claimedPlayer.id,
              roomCode: nextRoom.roomId,
              role: msg.payload.role,
              fullGameState: nextRoom
            },
            timestamp: Date.now()
          });
          return nextRoom;
        });
      } else if (msg.type === 'JOIN_ACCEPTED') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        applyRemoteState(msg.payload.fullGameState);
      } else if (msg.type === 'PLAYER_RECONNECT') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        broadcastState((prev) => {
          const { nextRoom, player } = reconnectPlayerInRoom(
            prev,
            msg.payload.clientId,
            msg.payload.playerId,
            msg.payload.playerName
          );
          if (player) {
            emitPartyProtocolMessage({
              type: 'FULL_STATE_RESPONSE',
              payload: {
                roomCode: nextRoom.roomId,
                fullGameState: nextRoom
              },
              timestamp: Date.now()
            });
          }
          return nextRoom;
        });
      } else if (msg.type === 'REQUEST_FULL_STATE') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        if (isHost) {
          setRoom((current) => {
            emitPartyProtocolMessage({
              type: 'FULL_STATE_RESPONSE',
              payload: {
                roomCode: current.roomId,
                fullGameState: current
              },
              timestamp: Date.now()
            });
            return current;
          });
        }
      } else if (msg.type === 'FULL_STATE_RESPONSE') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        applyRemoteState(msg.payload.fullGameState);
      } else if (msg.type === 'PING_DEVICE') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        setRoom((prev) => triggerPingOnPlayerInRoom(prev, msg.payload.targetPlayerId));
      } else if (msg.type === 'PLAYER_BUZZ_READY') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        setRoom((prev) => triggerBuzzReadyInRoom(prev, msg.payload.playerId));
      } else if (msg.type === 'PLAYER_REACTION') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        sounds.playPowerup();
        setRoom((prev) => triggerBuzzReadyInRoom(prev, msg.payload.playerId));
      } else if (msg.type === 'HEARTBEAT_PING') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        if (!isHost) {
          emitPartyProtocolMessage({
            type: 'HEARTBEAT_PONG',
            payload: {
              roomCode: activeRoomCode,
              clientId: currentUserId
            },
            timestamp: Date.now()
          });
        }
      } else if (msg.type === 'HEARTBEAT_PONG') {
        if (msg.payload.roomCode.toUpperCase() !== activeRoomCode) return;
        if (isHost) {
          setRoom((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.deviceClientId === msg.payload.clientId || p.id === msg.payload.clientId
                ? { ...p, connected: true, lastActive: Date.now() }
                : p
            )
          }));
        }
      }
    });

    // 4-second Heartbeat Ping/Pong loop
    const heartbeatInterval = window.setInterval(() => {
      if (unmountedRef.current) return;
      if (isHost) {
        emitPartyProtocolMessage({
          type: 'HEARTBEAT_PING',
          payload: {
            roomCode: activeRoomCode,
            hostId: currentUserId
          },
          timestamp: Date.now()
        });
      } else {
        emitPartyProtocolMessage({
          type: 'HEARTBEAT_PONG',
          payload: {
            roomCode: activeRoomCode,
            clientId: currentUserId
          },
          timestamp: Date.now()
        });
      }
    }, 4000);

    // 6. Initial fetch from server
    fetch(`/api/rooms/${activeRoomCode}`)
      .then((res) => res.json())
      .then((json) => {
        if (unmountedRef.current) return;
        setConnectionStatus('Connected');
        const serverState = json.state as GameRoom | null;

        if (isHost) {
          // Determine the best saved state between localStorage and server memory
          const candidateSaved =
            localSaved && (!serverState || localSaved.lastUpdated >= serverState.lastUpdated)
              ? localSaved
              : serverState;

          if (candidateSaved && isResumableGame(candidateSaved)) {
            saveRoomStateToStorage(candidateSaved);
            setResumableRoom(candidateSaved);
            // Keep host in Lobby after refresh so the 'Resume Game' prompt is presented,
            // unless the user already interacted locally since mounting
            if (lastLocalUpdateRef.current === 0) {
              setRoom((prev) => ({
                ...prev,
                screen: 'lobby',
                activeGame: null,
                players: candidateSaved.players || prev.players,
                sessionStats: candidateSaved.sessionStats || prev.sessionStats
              }));
            }
          } else if (serverState && lastLocalUpdateRef.current === 0) {
            applyRemoteState(serverState);
          } else if (lastLocalUpdateRef.current === 0) {
            const initial = createDefaultRoom(roomId, currentUserId);
            setRoom(initial);
          }
        } else if (serverState) {
          applyRemoteState(serverState);
        }
      })
      .catch(() => {
        if (!unmountedRef.current && !navigator.onLine) {
          setConnectionStatus('Offline');
        }
      });

    return () => {
      unmountedRef.current = true;
      cloudTransport.destroy();
      cloudTransportRef.current = null;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(heartbeatInterval);
      unsubscribePartyProtocol();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      clearInterval(reconnectTimerRef.current);
      }
      supaSub.unsubscribe();
      bc.close();
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [activeRoomCode, roomId, currentUserId, isHost, applyRemoteState, connectRealtime, broadcastState]);

  const reconnectRoom = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setConnectionStatus('Reconnecting');
    connectRealtime();
    cloudTransportRef.current?.forceSync();
  }, [connectRealtime]);

  // Restore saved game state from localStorage when host clicks 'Resume Game'
  const resumeSavedGame = useCallback(() => {
    const saved = resumableRoom || loadRoomStateFromStorage(roomId);
    if (!saved) return;

    const restoredScreen: ScreenState =
      saved.screen === 'lobby' && saved.activeGame ? 'playing' : saved.screen;

    setResumableRoom(null);
    broadcastState(() => ({
      ...saved,
      screen: restoredScreen
    }));
  }, [resumableRoom, roomId, broadcastState]);

  // Dismiss the saved game prompt and clear localStorage backup
  const dismissSavedGame = useCallback(() => {
    setResumableRoom(null);
    clearRoomStateFromStorage(roomId);
  }, [roomId]);

  // Actions
  const updateScreen = (screen: ScreenState) => {
    broadcastState((prev) => ({ ...prev, screen }));
  };

  const selectGame = (gameId: GameId) => {
    setResumableRoom(null);
    broadcastState((prev) => ({
      ...prev,
      activeGame: gameId,
      screen: 'game-setup',
      // UX-04: o tema é por jogo; não herda o tema do jogo anterior (ex.: o tema fixo de Perguntas e Verdades).
      theme: 'Geral',
      // o modo de regras (casa x programa) também é por jogo: volta ao padrão ao escolher outro jogo
      customConfig: prev.customConfig ? { ...prev.customConfig, ruleset: 'home' } : prev.customConfig,
      roundNumber: 1,
      roundLog: [],
      teams: syncTeamsRecordFromPlayers(prev.teams, prev.players, true)
    }));
  };

  const registerPlayer = (
    name: string,
    avatar?: string,
    color?: string,
    isFixed?: boolean,
    fixedId?: string,
    targetPlayerId?: string,
    role: PartyRole = 'player',
    targetRoomCodeOverride?: string
  ) => {
    const effectiveClientId = targetPlayerId || currentUserId;

    if (!isHost) {
      const currentRoom = roomRef.current;
      const effectiveRoomCode = (targetRoomCodeOverride || currentRoom.roomId || roomId || 'RODA').toUpperCase();
      const baseRoomForClaim: GameRoom =
        effectiveRoomCode !== currentRoom.roomId.toUpperCase()
          ? loadRoomStateFromStorage(effectiveRoomCode) || { ...currentRoom, roomId: effectiveRoomCode }
          : currentRoom;

      const { nextRoom, claimedPlayer } = claimOrRegisterPlayerInRoom(baseRoomForClaim, {
        clientId: effectiveClientId,
        playerName: name,
        avatar,
        color,
        fixedPlayerId: fixedId,
        role,
        roomCode: effectiveRoomCode
      });

      const joinPayload = {
        roomCode: effectiveRoomCode,
        name: claimedPlayer.name,
        avatar: claimedPlayer.avatar,
        color: claimedPlayer.color,
        role,
        fixedPlayerId: claimedPlayer.fixedPlayerId
      };
      pendingJoinRequestRef.current = joinPayload;

      saveLastPartySession({
        clientId: effectiveClientId,
        roomCode: effectiveRoomCode,
        playerId: claimedPlayer.id,
        playerName: claimedPlayer.name,
        avatar: claimedPlayer.avatar,
        role,
        fixedPlayerId: claimedPlayer.fixedPlayerId,
        updatedAt: Date.now()
      });

      // Optimistic local state update without advancing lastLocalUpdateRef ahead of Host
      setRoom((prev) => ({
        ...nextRoom,
        lastUpdated: prev.lastUpdated || 0
      }));

      const dispatchJoinAcrossTransports = () => {
        if (unmountedRef.current) return;

        emitPartyProtocolMessage({
          type: 'JOIN_REQUEST',
          payload: {
            clientId: effectiveClientId,
            playerName: claimedPlayer.name,
            avatar: claimedPlayer.avatar,
            color: claimedPlayer.color,
            fixedPlayerId: claimedPlayer.fixedPlayerId,
            role,
            roomCode: effectiveRoomCode
          },
          timestamp: Date.now()
        });

        emitPartyProtocolMessage({
          type: 'REQUEST_FULL_STATE',
          payload: {
            clientId: effectiveClientId,
            roomCode: effectiveRoomCode
          },
          timestamp: Date.now()
        });

        if (cloudTransportRef.current) {
          cloudTransportRef.current.sendJoinRequest({
            name: claimedPlayer.name,
            avatar: claimedPlayer.avatar,
            color: claimedPlayer.color,
            role,
            fixedPlayerId: claimedPlayer.fixedPlayerId
          });
        }

        // Atomic REST Join on local/Node server
        fetch(`/api/rooms/${effectiveRoomCode}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: effectiveClientId,
            playerName: claimedPlayer.name,
            avatar: claimedPlayer.avatar,
            color: claimedPlayer.color,
            fixedPlayerId: claimedPlayer.fixedPlayerId,
            role
          })
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (!unmountedRef.current && json?.state) {
              applyRemoteState(json.state as GameRoom);
            }
          })
          .catch(() => {});
      };

      dispatchJoinAcrossTransports();

      // Safety retries in case MQTT or Wi-Fi handshake was still warming up
      window.setTimeout(() => {
        if (unmountedRef.current) return;
        const synced = roomRef.current;
        const confirmedByHost =
          (synced.lastUpdated || 0) > 0 &&
          synced.players.some(
            (p) =>
              p.id === effectiveClientId ||
              p.deviceClientId === effectiveClientId ||
              (claimedPlayer.fixedPlayerId && p.fixedPlayerId === claimedPlayer.fixedPlayerId && p.connected)
          );
        if (!confirmedByHost) {
          dispatchJoinAcrossTransports();
        }
      }, 1500);

      window.setTimeout(() => {
        if (unmountedRef.current) return;
        const synced = roomRef.current;
        const confirmedByHost =
          (synced.lastUpdated || 0) > 0 &&
          synced.players.some(
            (p) =>
              p.id === effectiveClientId ||
              p.deviceClientId === effectiveClientId ||
              (claimedPlayer.fixedPlayerId && p.fixedPlayerId === claimedPlayer.fixedPlayerId && p.connected)
          );
        if (!confirmedByHost) {
          dispatchJoinAcrossTransports();
        }
      }, 3500);

      return;
    }

    broadcastState((prev) => {
      const effectiveRoomCode = (targetRoomCodeOverride || prev.roomId).toUpperCase();
      const baseRoomForClaim: GameRoom =
        effectiveRoomCode !== prev.roomId.toUpperCase()
          ? loadRoomStateFromStorage(effectiveRoomCode) || { ...prev, roomId: effectiveRoomCode }
          : prev;

      const { nextRoom, claimedPlayer } = claimOrRegisterPlayerInRoom(baseRoomForClaim, {
        clientId: effectiveClientId,
        playerName: name,
        avatar,
        color,
        fixedPlayerId: fixedId,
        role,
        roomCode: effectiveRoomCode
      });

      saveLastPartySession({
        clientId: effectiveClientId,
        roomCode: nextRoom.roomId,
        playerId: claimedPlayer.id,
        playerName: claimedPlayer.name,
        avatar: claimedPlayer.avatar,
        role,
        fixedPlayerId: claimedPlayer.fixedPlayerId,
        updatedAt: Date.now()
      });

      return nextRoom;
    });
  };

  const addLobbyPlayer = (options: {
    id?: string;
    name: string;
    avatar?: string;
    color?: string;
    team?: TeamId;
    isFixedPlayer?: boolean;
    fixedPlayerId?: string;
  }) => {
    broadcastState((prev) => {
      const fixedDef = options.fixedPlayerId
        ? FIXED_PLAYERS.find((fp) => fp.id === options.fixedPlayerId)
        : FIXED_PLAYERS.find((fp) => fp.name.toLowerCase() === options.name.trim().toLowerCase());

      if (fixedDef) {
        const alreadyExists = prev.players.some(
          (p) =>
            p.fixedPlayerId === fixedDef.id ||
            p.name.trim().toLowerCase() === fixedDef.name.trim().toLowerCase()
        );
        if (alreadyExists) return prev;
      }

      const isFixed = Boolean(options.isFixedPlayer !== undefined ? options.isFixedPlayer : fixedDef);
      const fixedId = isFixed ? (fixedDef ? fixedDef.id : options.fixedPlayerId) : undefined;
      const finalName = isFixed && fixedDef ? fixedDef.name : options.name.trim();
      if (!finalName) return prev;

      // Case-insensitive duplicate check across all players in the room
      const validation = validateNewPlayerName(prev.players, finalName);
      if (!validation.valid) return prev;

      const generatedId =
        options.id ||
        (fixedId
          ? `fix-${fixedId}`
          : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

      const finalAvatar = resolvePlayerAvatar({
        explicitAvatar: options.avatar,
        playerId: generatedId,
        name: finalName,
        fixedPlayerId: fixedId,
        fixedDefaultAvatar: isFixed && fixedDef ? fixedDef.avatar : undefined,
        indexFallback: prev.players.length
      });
      const finalColor =
        options.color ||
        (isFixed && fixedDef ? fixedDef.color : COLORS[prev.players.length % COLORS.length]);

      savePlayerAvatarPreference([generatedId, finalName, fixedId], finalAvatar);
      if (options.avatar) {
        saveLastSelectedAvatar(finalAvatar);
      }

      const activeTeamIds = getActiveTeamIds(prev);
      const assignedTeam: TeamId =
        options.team && activeTeamIds.includes(options.team)
          ? options.team
          : pickLeastPopulatedTeam(prev.players, activeTeamIds);

      const newPlayer: Player = {
        id: generatedId,
        name: finalName,
        avatar: finalAvatar,
        color: finalColor,
        team: assignedTeam,
        isVip: prev.players.length === 0,
        score: 0,
        roundsPlayed: 0,
        roundsWon: 0,
        accuracy: 0,
        isFixedPlayer: isFixed,
        fixedPlayerId: fixedId,
        powerCards: { ligacao: false, troca: false, x2: false, menos1: false },
        connected: true,
        lastActive: Date.now(),
        connectionType: 'tv-local'
      };

      const updatedPlayers = [...prev.players, newPlayer];

      return {
        ...prev,
        players: updatedPlayers,
        teams: syncTeamsRecordFromPlayers(prev.teams, updatedPlayers, false)
      };
    });
  };

  const updatePlayerAvatar = (playerId: string, newAvatar: string) => {
    const clean = (newAvatar || '').trim();
    if (!clean) return;
    broadcastState((prev) => {
      const target = prev.players.find((p) => p.id === playerId);
      if (!target) return prev;
      savePlayerAvatarPreference([target.id, target.name, target.fixedPlayerId], clean);
      saveLastSelectedAvatar(clean);
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, avatar: clean, lastActive: Date.now() } : p
        )
      };
    });
  };

  const removePlayer = (playerId: string) => {
    broadcastState((prev) => {
      const updatedPlayers = prev.players.filter((p) => p.id !== playerId);
      if (updatedPlayers.length > 0 && !updatedPlayers.some((p) => p.isVip)) {
        updatedPlayers[0] = { ...updatedPlayers[0], isVip: true };
      }

      return {
        ...prev,
        players: updatedPlayers,
        teams: syncTeamsRecordFromPlayers(prev.teams, updatedPlayers, false)
      };
    });
  };

  const switchPlayerTeam = (playerId: string, explicitTeam?: TeamId) => {
    broadcastState((prev) => {
      const activeTeamIds = getActiveTeamIds(prev);
      const updatedPlayers = prev.players.map((p) => {
        if (p.id === playerId) {
          const nextTeam: TeamId =
            explicitTeam && activeTeamIds.includes(explicitTeam)
              ? explicitTeam
              : cyclePlayerTeamId(p.team, activeTeamIds);
          return { ...p, team: nextTeam };
        }
        return p;
      });

      return {
        ...prev,
        players: updatedPlayers,
        teams: syncTeamsRecordFromPlayers(prev.teams, updatedPlayers, false)
      };
    });
  };

  const setRoomTeamCount = (nextTeamCount: 2 | 3 | 4) => {
    broadcastState((prev) => {
      const normalizedPlayers = normalizePlayersToTeamCount(prev.players, nextTeamCount);
      return {
        ...prev,
        teamCount: nextTeamCount,
        customConfig: {
          ...(prev.customConfig || DEFAULT_GAME_CUSTOM_CONFIG),
          teamCount: nextTeamCount
        },
        players: normalizedPlayers,
        teams: syncTeamsRecordFromPlayers(prev.teams, normalizedPlayers, false)
      };
    });
  };

  const pingPlayerDevice = (targetPlayerId: string) => {
    broadcastState((prev) => {
      const next = triggerPingOnPlayerInRoom(prev, targetPlayerId);
      const targetPlayer = next.players.find((p) => p.id === targetPlayerId);
      emitPartyProtocolMessage({
        type: 'PING_DEVICE',
        payload: {
          roomCode: next.roomId,
          targetPlayerId,
          targetClientId: targetPlayer?.deviceClientId
        },
        timestamp: Date.now()
      });
      return next;
    });
  };

  const buzzReadyOnTv = (playerId: string) => {
    if (!isHost) {
      cloudTransportRef.current?.sendPlayerAction(playerId, 'BUZZ_READY');
      fetch(`/api/rooms/${activeRoomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'BUZZ_READY', playerId })
      }).catch(() => {});
    }
    broadcastState((prev) => {
      const next = triggerBuzzReadyInRoom(prev, playerId);
      const p = next.players.find((pl) => pl.id === playerId);
      if (p) {
        emitPartyProtocolMessage({
          type: 'PLAYER_BUZZ_READY',
          payload: {
            roomCode: next.roomId,
            playerId: p.id,
            playerName: p.name,
            avatar: p.avatar
          },
          timestamp: Date.now()
        });
      }
      return next;
    });
  };

  const regenerateRoomCode = (
    explicitCode?: string,
    modeOverride?: ConnectionMode,
    sessionKeyOverride?: string
  ) => {
    const newCode = (explicitCode || generateNewRoomCode()).toUpperCase();
    try {
      if (isHost && typeof localStorage !== 'undefined') {
        localStorage.setItem('rb_active_host_room_code', newCode);
      }
    } catch {
      // ignore
    }
    broadcastState((prev) => ({
      ...prev,
      roomId: newCode,
      sessionKey: sessionKeyOverride || `session_${newCode}_${Date.now().toString(36)}`,
      connectionMode: modeOverride || prev.connectionMode || 'host'
    }));
    return newCode;
  };

  return {
    room,
    resumableRoom,
    resumeSavedGame,
    dismissSavedGame,
    connectionStatus,
    presenceCount: Math.max(presenceCount, room.players.filter((p) => p.connected).length || 1),
    presencePeers,
    reconnectRoom,
    broadcastState,
    updateScreen,
    selectGame,
    registerPlayer,
    addLobbyPlayer,
    updatePlayerAvatar,
    removePlayer,
    switchPlayerTeam,
    setRoomTeamCount,
    pingPlayerDevice,
    buzzReadyOnTv,
    regenerateRoomCode,
    cloudStatus,
    forceSync: useCallback(() => {
      cloudTransportRef.current?.forceSync();
    }, [])
  };
}
