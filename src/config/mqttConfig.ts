/**
 * MQTT Realtime Cloud Transport Configuration
 * Manages connection endpoints, credentials, and topic schemas
 * with automatic fallback to public SSL brokers (EMQX, HiveMQ, Mosquitto)
 * when Supabase is not configured.
 */

export interface MqttConfig {
  primaryBrokerUrl: string;
  fallbackBrokers: string[];
  topicPrefix: string;
  username?: string;
  password?: string;
  connectTimeoutMs: number;
  reconnectPeriodMs: number;
  keepaliveSec: number;
}

const DEFAULT_PRIMARY_BROKER = 'wss://broker.emqx.io:8084/mqtt';

const DEFAULT_FALLBACK_BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081'
];

const DEFAULT_TOPIC_PREFIX = 'roda-de-bobo-v2/room';

export function getMqttConfig(): MqttConfig {
  const envPrimary =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_MQTT_BROKER_URL
      : undefined;

  const envFallbacks =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_MQTT_FALLBACK_BROKERS
      : undefined;

  const envPrefix =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_MQTT_TOPIC_PREFIX
      : undefined;

  const envUsername =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_MQTT_USERNAME
      : undefined;

  const envPassword =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_MQTT_PASSWORD
      : undefined;

  const fallbackList = envFallbacks
    ? envFallbacks.split(',').map((u: string) => u.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_BROKERS;

  return {
    primaryBrokerUrl: (envPrimary || DEFAULT_PRIMARY_BROKER).trim(),
    fallbackBrokers: fallbackList.length > 0 ? fallbackList : DEFAULT_FALLBACK_BROKERS,
    topicPrefix: (envPrefix || DEFAULT_TOPIC_PREFIX).trim().replace(/\/+$/, ''),
    username: envUsername ? String(envUsername).trim() : undefined,
    password: envPassword ? String(envPassword).trim() : undefined,
    connectTimeoutMs: 8000,
    reconnectPeriodMs: 3500,
    keepaliveSec: 25
  };
}

/**
 * Returns an ordered array of broker endpoints to attempt, starting with primary.
 */
export function getAllBrokerEndpoints(): string[] {
  const cfg = getMqttConfig();
  const all = [cfg.primaryBrokerUrl, ...cfg.fallbackBrokers];
  // Deduplicate preserving order
  return Array.from(new Set(all));
}

/**
 * Computes the unique Pub/Sub topic string for a specific room session code.
 * E.g., `roda-de-bobo-v2/room/KJ77S7`
 */
export function getRoomMqttTopic(roomCode: string): string {
  const cfg = getMqttConfig();
  const cleanCode = (roomCode || 'RODA').toUpperCase().trim();
  return `${cfg.topicPrefix}/${cleanCode}`;
}
