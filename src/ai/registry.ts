import type { GameRoom, Player } from '../types/game';
import { ADAPTERS, type BotMove } from './adapters';
import { ADAPTERS_PHASE2 } from './adapters2';
import { ADAPTERS_PHASE3 } from './adapters3';

type Adapter = (room: GameRoom, bot: Player) => BotMove | null;

/** Todos os jogos em que a IA ja joga (Fases 1, 2 e 3). */
export const ALL_ADAPTERS: Record<string, Adapter> = { ...(ADAPTERS as Record<string, Adapter>), ...ADAPTERS_PHASE2, ...ADAPTERS_PHASE3 };
export const BOT_READY_GAMES = Object.keys(ALL_ADAPTERS);
