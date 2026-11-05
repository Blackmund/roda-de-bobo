import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { GameRoom } from '../types/game';

export type RoomConnectionStatus = 'Connected' | 'Reconnecting' | 'Offline';

export interface PresencePeer {
  userId: string;
  isHost: boolean;
  onlineAt: string;
}

export interface RoomPresenceData {
  status: RoomConnectionStatus;
  onlinePeers: PresencePeer[];
  source: 'supabase' | 'realtime-ws';
  lastSyncedAt: number;
}

const supabaseUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'MY_SUPABASE_URL' &&
  supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY' &&
  supabaseUrl.startsWith('http')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

interface RoomChannelHandlers {
  roomId: string;
  userId: string;
  isHost: boolean;
  onStatusChange: (status: RoomConnectionStatus) => void;
  onPresenceChange: (peers: PresencePeer[]) => void;
  onRemoteState?: (state: GameRoom) => void;
}

/**
 * Subscribes to a Supabase Realtime channel for room presence and state broadcast
 * when Supabase credentials are configured.
 */
export function subscribeSupabaseRoomChannel({
  roomId,
  userId,
  isHost,
  onStatusChange,
  onPresenceChange,
  onRemoteState
}: RoomChannelHandlers): {
  channel: RealtimeChannel | null;
  broadcastSupabaseState: (state: GameRoom) => void;
  unsubscribe: () => void;
} {
  if (!supabase) {
    return {
      channel: null,
      broadcastSupabaseState: () => {},
      unsubscribe: () => {}
    };
  }

  const normalizedRoom = roomId.toUpperCase();
  const channel = supabase.channel(`room:${normalizedRoom}`, {
    config: {
      presence: {
        key: userId
      },
      broadcast: {
        self: false
      }
    }
  });

  const syncPresenceState = () => {
    const rawState = channel.presenceState<{
      userId?: string;
      isHost?: boolean;
      onlineAt?: string;
    }>();
    const peers: PresencePeer[] = [];

    Object.entries(rawState).forEach(([key, presences]) => {
      const latest = presences[0];
      if (latest) {
        peers.push({
          userId: latest.userId || key,
          isHost: Boolean(latest.isHost),
          onlineAt: latest.onlineAt || new Date().toISOString()
        });
      }
    });

    onPresenceChange(peers);
  };

  channel
    .on('presence', { event: 'sync' }, syncPresenceState)
    .on('presence', { event: 'join' }, syncPresenceState)
    .on('presence', { event: 'leave' }, syncPresenceState)
    .on('broadcast', { event: 'ROOM_SYNC' }, (payload) => {
      if (payload?.payload?.state && onRemoteState) {
        onRemoteState(payload.payload.state as GameRoom);
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange('Connected');
        try {
          await channel.track({
            userId,
            isHost,
            onlineAt: new Date().toISOString()
          });
        } catch {
          // Ignore presence track error
        }
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        onStatusChange(navigator.onLine ? 'Reconnecting' : 'Offline');
      } else if (status === 'CLOSED') {
        onStatusChange('Offline');
      }
    });

  const broadcastSupabaseState = (state: GameRoom) => {
    channel
      .send({
        type: 'broadcast',
        event: 'ROOM_SYNC',
        payload: { state }
      })
      .catch(() => {});
  };

  const unsubscribe = () => {
    supabase.removeChannel(channel);
  };

  return {
    channel,
    broadcastSupabaseState,
    unsubscribe
  };
}
