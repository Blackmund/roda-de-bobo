import type { GameId } from '../types/game';

/**
 * UX-03: fonte única dos limites de jogadores por jogo.
 * Usado pelo catálogo (selo), pela configuração do jogo (aviso + bloqueio do botão Iniciar) e pelo lobby.
 *
 * - min/max: intervalo aceito pelo jogo.
 * - recommended: número ideal (programa original = 4).
 * - teamsRequired: o jogo só existe em equipes/duplas.
 * - participants: quando o jogo usa menos jogadores do que os presentes na sala (aviso, não bloqueio).
 */
export interface GameLimits {
  min: number;
  max: number;
  recommended: number;
  teamsRequired: boolean;
  participants?: number;
  note?: string;
}

export const GAME_LIMITS: Record<GameId, GameLimits> = {
  limite: { min: 2, max: 8, recommended: 4, teamsRequired: false },
  duvido: { min: 2, max: 8, recommended: 4, teamsRequired: true },
  proibido: { min: 2, max: 8, recommended: 4, teamsRequired: true },
  nota: { min: 2, max: 8, recommended: 4, teamsRequired: false },
  mimica: { min: 2, max: 8, recommended: 4, teamsRequired: true },
  'quem-sou-eu': { min: 3, max: 8, recommended: 4, teamsRequired: false },
  'mega-resenha': { min: 2, max: 8, recommended: 4, teamsRequired: true },
  repetente: { min: 2, max: 8, recommended: 4, teamsRequired: true },
  'respostas-sem-perguntas': { min: 2, max: 8, recommended: 4, teamsRequired: false },
  estadios: { min: 2, max: 8, recommended: 4, teamsRequired: false },
  'como-eu-pinto': { min: 2, max: 8, recommended: 4, teamsRequired: true },
  'tem-ou-nao-tem': { min: 2, max: 8, recommended: 4, teamsRequired: true },
  'perguntas-e-verdades': {
    min: 2,
    max: 6,
    recommended: 2,
    teamsRequired: false,
    participants: 2,
    note: 'Jogam 2 por vez; os demais assistem.'
  }
};

export type PlayerCountCheck =
  | { ok: true; warning?: string }
  | { ok: false; reason: 'too-few' | 'too-many'; message: string };

export function getGameLimits(gameId: GameId | null | undefined): GameLimits | null {
  return gameId ? GAME_LIMITS[gameId] ?? null : null;
}

/** Texto curto para o selo do catálogo (ex.: "2 a 8 jogadores"). */
export function formatLimitsLabel(gameId: GameId): string {
  const l = GAME_LIMITS[gameId];
  return l.min === l.max ? `${l.min} jogadores` : `${l.min} a ${l.max} jogadores`;
}

/** Valida a quantidade de jogadores da sala para o jogo. Bloqueia fora de [min, max]; avisa quando sobram jogadores. */
export function validatePlayerCount(gameId: GameId | null | undefined, count: number): PlayerCountCheck {
  const l = getGameLimits(gameId);
  if (!l) return { ok: true };
  if (count < l.min) {
    return { ok: false, reason: 'too-few', message: `Mínimo de ${l.min} jogadores para este jogo.` };
  }
  if (count > l.max) {
    return {
      ok: false,
      reason: 'too-many',
      message: `Este jogo aceita no máximo ${l.max} jogadores (há ${count} na sala). Remova ${count - l.max} para continuar.`
    };
  }
  if (l.participants && count > l.participants) {
    return { ok: true, warning: `${l.note ?? `Participam ${l.participants} jogadores.`}` };
  }
  return { ok: true };
}
