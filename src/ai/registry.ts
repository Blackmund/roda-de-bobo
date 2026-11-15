import type { GameRoom, Player } from '../types/game';
import { ADAPTERS, type BotMove } from './adapters';
import { ADAPTERS_PHASE2 } from './adapters2';

type Adapter = (room: GameRoom, bot: Player) => BotMove | null;

/** Todos os jogos em que a IA ja joga (Fase 1 + Fase 2). */
export const ALL_ADAPTERS: Record<string, Adapter> = { ...(ADAPTERS as Record<string, Adapter>), ...ADAPTERS_PHASE2 };
export const BOT_READY_GAMES = Object.keys(ALL_ADAPTERS);
