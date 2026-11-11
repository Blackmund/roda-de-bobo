import type { GameCustomConfig, GameId } from '../types/game';
import { DEFAULT_GAME_CUSTOM_CONFIG } from '../types/game';

/**
 * UX-09 / REG-01..03: conjuntos de regras por sala.
 *
 * - `home` (padrão): regras da casa, mais flexíveis (comportamento atual do site).
 * - `show`: regras fiéis ao programa Roda de Bobo (CazéTV), conforme `analise/01_relatorio_jogos.md`.
 *
 * O ruleset fica em `customConfig.ruleset`; cada jogo lê dali. Alternar no setup aplica o "preset"
 * (rodadas, tempo e parâmetros), que o host ainda pode ajustar depois.
 */
export type GameRuleset = 'home' | 'show';

export const RULESET_LABELS: Record<GameRuleset, string> = {
  home: 'REGRAS DA CASA',
  show: 'REGRAS DO PROGRAMA'
};

/** Duvido do programa: 9 temas; vence quem chegar a 5 temas. */
export const DUVIDO_SHOW_THEMES = 9;
export const DUVIDO_SHOW_WIN_TARGET = 5;

export interface RulesetPreset {
  rounds?: number;
  /** segundos por rodada (0 = livre) */
  timer?: number;
  config: Partial<GameCustomConfig>;
  /** Regras do programa que este preset aplica (mostradas no setup). */
  notes: string[];
}

const SHOW_PRESETS: Partial<Record<GameId, RulesetPreset>> = {
  limite: {
    rounds: 10,
    config: { limiteEnablePowerCards: true, limiteExactBonus: 0, limiteCallTimeoutSeconds: 30 },
    notes: [
      '10 rodadas; vence o palpite mais perto sem ultrapassar (se todos estouram, vence quem estourou menos)',
      '4 cartas de poder sorteadas, 1 por jogador, uso único',
      'Sem bônus por cravar o número (isso é regra da casa)'
    ]
  },
  duvido: {
    rounds: DUVIDO_SHOW_THEMES,
    timer: 60,
    config: { duvidoStartingBid: 1 },
    notes: [
      `${DUVIDO_SHOW_THEMES} temas; vence quem chegar a ${DUVIDO_SHOW_WIN_TARGET} temas`,
      'Um de cada equipe fica vendado; leilão com lance livre',
      '1 minuto para citar os itens do lance duvidado'
    ]
  },
  proibido: {
    timer: 60,
    config: { proibidoCardsCount: 5, proibidoForbiddenCount: 5 },
    notes: ['5 palavras por rodada, cada uma com 5 proibidas', '1 minuto por rodada', 'Radical e juiz (contestar): ainda não automatizados']
  },
  nota: {
    config: { notaScaleMin: 1, notaScaleMax: 10, notaAllowCloseVote: false },
    notes: [
      'Notas de 1 a 10; os outros jogadores ficam vendados',
      'Duas perguntas por rodada: uma de esporte e uma aleatória',
      'Pontuação do programa ainda não confirmada: mantém +1 por palpite certo'
    ]
  },
  'mega-resenha': {
    rounds: 4,
    timer: 60,
    config: {},
    notes: [
      '5 palavras por rodada em 1 minuto; quem dá as dicas vê a palavra e o parceiro chuta de olhos vendados',
      'Cada dica é UMA palavra só (sem frase nem nome composto)',
      'Não vale a própria palavra nem o mesmo radical (a checagem é automática, o juiz pode contestar)'
    ]
  },
  'quem-sou-eu': {
    rounds: 1,
    config: {},
    notes: [
      'Cada jogador tem uma identidade na testa: todos veem, menos ele',
      'Na vez, pergunta de sim ou não (os outros só podem responder sim ou não) ou chuta a identidade, em rodízio',
      'Pontuação do programa ainda não confirmada: o 1º a acertar leva mais pontos'
    ]
  },
  mimica: {
    rounds: 3,
    timer: 90,
    config: {},
    notes: [
      '3 palavras por rodada, 1min30 para o mímico (o parceiro adivinha de olhos vendados na sala principal)',
      'Cada rodada vale mais: 1, 2 e 3 pontos por palavra acertada',
      'Pode pular palavra; o adversário pode ver, mas não pode dar dicas'
    ]
  },
  'tem-ou-nao-tem': {
    config: { temItemsCount: 5, temMaxStrikes: 2 },
    notes: ['Top 5 (pontos = votos)', '2 erros por equipe', 'Respostas alternadas entre as equipes']
  }
};

/** Preset do ruleset para o jogo. `home` não força nada; Perguntas e Verdades não existe no programa. */
export function getRulesetPreset(gameId: GameId | null | undefined, ruleset: GameRuleset): RulesetPreset | null {
  if (!gameId || ruleset !== 'show') return null;
  return SHOW_PRESETS[gameId] ?? null;
}

/** Este jogo tem versão fiel ao programa? */
export function hasShowRuleset(gameId: GameId | null | undefined): boolean {
  return !!gameId && !!SHOW_PRESETS[gameId];
}

export function resolveRuleset(config?: Partial<GameCustomConfig> | null): GameRuleset {
  return config?.ruleset === 'show' ? 'show' : 'home';
}

export function isShowRuleset(config?: Partial<GameCustomConfig> | null): boolean {
  return resolveRuleset(config) === 'show';
}

/** Aplica o ruleset ao config. `home` restaura os padrões dos parâmetros que o preset `show` mexe. */
export function applyRuleset(
  gameId: GameId | null | undefined,
  prev: GameCustomConfig,
  ruleset: GameRuleset
): GameCustomConfig {
  if (ruleset === 'show') {
    const preset = getRulesetPreset(gameId, 'show');
    return { ...prev, ...(preset?.config ?? {}), ruleset: 'show' };
  }
  const preset = SHOW_PRESETS[gameId as GameId];
  const restored: Partial<GameCustomConfig> = {};
  Object.keys(preset?.config ?? {}).forEach((k) => {
    (restored as Record<string, unknown>)[k] = (DEFAULT_GAME_CUSTOM_CONFIG as unknown as Record<string, unknown>)[k];
  });
  return { ...prev, ...restored, ruleset: 'home' };
}

/** Pontos de quem crava o número no Limite (0 = sem bônus; o vencedor ganha 1 ponto como qualquer outro). */
export function limiteExactBonusFor(config?: Partial<GameCustomConfig> | null): number {
  const v = config?.limiteExactBonus;
  return typeof v === 'number' && v >= 0 ? v : DEFAULT_GAME_CUSTOM_CONFIG.limiteExactBonus;
}

/** A partida de Duvido do programa termina quando uma equipe chega a 5 temas. */
export function isDuvidoShowWon(config: Partial<GameCustomConfig> | null | undefined, topTeamScore: number): boolean {
  return isShowRuleset(config) && topTeamScore >= DUVIDO_SHOW_WIN_TARGET;
}
