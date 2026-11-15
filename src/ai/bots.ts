import type { Player } from '../types/game';

/**
 * Jogadores controlados pela IA. A marca fica no proprio id ("ia-<nivel>-<n>"), assim nao precisa de campo novo
 * em todos os lugares que criam jogador: qualquer tela que trata Player ja aceita a IA.
 */
export type BotLevel = 'facil' | 'medio' | 'dificil' | 'impossivel';

export const BOT_LEVELS: { value: BotLevel; label: string; hint: string }[] = [
  { value: 'facil', label: 'Fácil', hint: 'Erra bastante e demora para responder.' },
  { value: 'medio', label: 'Médio', hint: 'Acerta mais ou menos metade.' },
  { value: 'dificil', label: 'Difícil', hint: 'Acerta quase sempre e chega perto.' },
  { value: 'impossivel', label: 'Impossível', hint: 'Sabe praticamente tudo.' }
];

export interface BotParams {
  /** chance de acertar uma decisao de conhecimento (resposta certa, palavra valida...) */
  acc: number;
  /** espalhamento de palpites numericos (fracao do valor real) */
  spread: number;
  /** tempo para "pensar" antes de agir (ms) */
  think: [number, number];
  /** apetite de risco em leiloes/apostas (0 = conservador, 1 = agressivo) */
  risk: number;
}

export const BOT_PARAMS: Record<BotLevel, BotParams> = {
  facil: { acc: 0.28, spread: 0.45, think: [3200, 5600], risk: 0.25 },
  medio: { acc: 0.55, spread: 0.2, think: [2400, 4200], risk: 0.5 },
  dificil: { acc: 0.82, spread: 0.07, think: [1700, 3000], risk: 0.65 },
  impossivel: { acc: 0.97, spread: 0.01, think: [1100, 2000], risk: 0.8 }
};

const LEVEL_NAMES: Record<BotLevel, string> = { facil: 'Fácil', medio: 'Média', dificil: 'Difícil', impossivel: 'Impossível' };

export const isBotId = (id: string | undefined | null): boolean => !!id && /^ia-(facil|medio|dificil|impossivel)-/.test(id);
export const isBot = (p: Pick<Player, 'id'> | undefined | null): boolean => !!p && isBotId(p.id);

export function botLevelOf(p: Pick<Player, 'id'> | string): BotLevel {
  const id = typeof p === 'string' ? p : p.id;
  const m = /^ia-(facil|medio|dificil|impossivel)-/.exec(id);
  return (m?.[1] as BotLevel) || 'medio';
}

export const botParamsOf = (p: Pick<Player, 'id'> | string): BotParams => BOT_PARAMS[botLevelOf(p)];

/** Dados para criar uma IA nova (para passar ao onAddPlayer de sempre). */
export function newBotPlayer(level: BotLevel, existing: Pick<Player, 'id'>[]): { id: string; name: string; avatar: string; color: string } {
  let n = 1;
  while (existing.some((p) => p.id === `ia-${level}-${n}`)) n++;
  const sameLevel = existing.filter((p) => botLevelOf(p) === level && isBot(p)).length;
  return {
    id: `ia-${level}-${n}`,
    name: `IA ${LEVEL_NAMES[level]}${sameLevel > 0 ? ' ' + (sameLevel + 1) : ''}`,
    avatar: '🤖',
    color: level === 'impossivel' ? '#E6194B' : level === 'dificil' ? '#FFC93C' : level === 'medio' ? '#17B8B8' : '#7A8CFF'
  };
}

/** Utilitarios de sorteio. */
export const chance = (p: number) => Math.random() < p;
export const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);
export function gauss(): number {
  // Box-Muller
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const pickOne = <T,>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined);
