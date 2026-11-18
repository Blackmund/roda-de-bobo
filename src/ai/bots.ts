import type { Player } from '../types/game';

/**
 * Jogadores controlados pela IA. A marca fica no proprio id ("ia-<nivel>-<n>"), assim nao precisa de campo novo
 * em todos os lugares que criam jogador: qualquer tela que trata Player ja aceita a IA.
 */
export type BotLevel = 'facil' | 'medio' | 'dificil' | 'impossivel';

export const BOT_LEVELS: { value: BotLevel; label: string; hint: string }[] = [
  { value: 'facil', label: 'Fácil', hint: 'Acerta metade e às vezes demora.' },
  { value: 'medio', label: 'Médio', hint: 'Acerta três em cada quatro.' },
  { value: 'dificil', label: 'Difícil', hint: 'Quase não erra e joga a melhor jogada.' },
  { value: 'impossivel', label: 'Impossível', hint: 'Não erra e responde rápido.' }
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
  facil: { acc: 0.5, spread: 0.25, think: [2600, 4400], risk: 0.4 },
  medio: { acc: 0.76, spread: 0.1, think: [1900, 3300], risk: 0.6 },
  dificil: { acc: 0.93, spread: 0.03, think: [1300, 2400], risk: 0.78 },
  impossivel: { acc: 0.995, spread: 0.005, think: [800, 1500], risk: 0.9 }
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
