/**
 * BANCO LOCAL DE TEMAS (sem IA, sem rede, sem limite de uso)
 *
 * Usado como fallback do botão "Gerar Novos Temas", do sorteio de tema e do servidor
 * quando a IA está sem crédito/offline. Os dados base ficam em data/themeBankData.ts;
 * aqui eles são multiplicados pelos "recortes" (ângulos) de cada jogo.
 *
 * Exemplos:
 *   pickThemes({ game: 'duvido', count: 8, exclude: usados })
 *   pickRandomTheme({ game: 'proibido' })
 *   getThemeBankStats()
 */

import { THEME_CATEGORIES, type ThemeCategoryData, type ThemeGameId } from '../data/themeBankData';

export type { ThemeGameId } from '../data/themeBankData';

/** Recortes por jogo: cada tema base gera uma variante por template. {t} = tema base. */
export const GAME_ANGLES: Record<ThemeGameId, string[]> = {
  limite: [
    '{t}: números e recordes',
    '{t}: quanto, quantos e quando',
    'Curiosidades numéricas de {t}',
    'Valores absurdos em {t}'
  ],
  duvido: [
    '{t}: cite o máximo que conseguir',
    'Lista oficial de {t}',
    'Quantos itens de {t} existem?',
    'Duvido que você cite 10 de {t}'
  ],
  proibido: [
    '{t}: descreva sem falar o óbvio',
    'Palavras do universo de {t}',
    '{t}: mímica falada',
    'Adivinhe sem dizer: {t}'
  ],
  nota: [
    '{t}: escala de 1 a 10',
    '{t}: do pior ao melhor',
    'Glórias e perrengues de {t}',
    'Ranking pessoal de {t}'
  ],
  'tem-ou-nao-tem': [
    'O que vem à cabeça: {t}',
    'Pesquisa dos 100: {t}',
    '{t}: o que o brasileiro lembra primeiro',
    'Painel de votos: {t}'
  ],
  'perguntas-e-verdades': [
    'Verdades sobre {t}',
    '{t}: conta a real',
    'Já fez isso? {t}',
    '{t}: confissões da roda'
  ]
};

export interface ThemeBankFilter {
  /** Restringe às categorias que funcionam bem neste jogo. */
  game?: ThemeGameId;
  /** Só temas do universo CazéTV (futebol, Copa, Olimpíadas, reações, narração). */
  onlyCazetv?: boolean;
  /** false remove categorias de humor mais adulto (padrão: true). */
  allowAdult?: boolean;
  /** Restringe a categorias específicas (ids). */
  categories?: string[];
}

export interface PickThemesOptions extends ThemeBankFilter {
  count?: number;
  /** Temas já usados na sessão (compara sem acento e sem diferença de maiúsculas). */
  exclude?: string[];
  /** 0 a 1: chance de devolver o tema com recorte do jogo (padrão 0.5). Só vale com game. */
  angleChance?: number;
  /** Gerador aleatório (0 a 1). Útil para testes determinísticos. */
  rng?: () => number;
}

export function normalizeTheme(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectCategories(filter: ThemeBankFilter = {}): ThemeCategoryData[] {
  const allowAdult = filter.allowAdult !== false;
  return THEME_CATEGORIES.filter((c) => {
    if (filter.game && !c.jogos.includes(filter.game)) return false;
    if (filter.onlyCazetv && !c.cazetv) return false;
    if (!allowAdult && c.adulto) return false;
    if (filter.categories && filter.categories.length > 0 && !filter.categories.includes(c.id)) {
      return false;
    }
    return true;
  });
}

/** Lista de temas-base (sem recortes), sem duplicatas. */
export function getBaseThemes(filter: ThemeBankFilter = {}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of selectCategories(filter)) {
    for (const t of cat.temas) {
      const k = normalizeTheme(t);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(t);
      }
    }
  }
  return out;
}

/** Aplica um recorte do jogo a um tema-base. */
export function applyGameAngle(baseTheme: string, game: ThemeGameId, angleIndex: number): string {
  const list = GAME_ANGLES[game];
  const tpl = list[((angleIndex % list.length) + list.length) % list.length];
  return tpl.replace('{t}', baseTheme);
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sorteia temas sem repetir. Mistura temas-base com variantes do recorte do jogo.
 * Nunca falha e nunca chama rede: se o pool acabar, ignora o "exclude" para completar.
 */
export function pickThemes(options: PickThemesOptions = {}): string[] {
  const { game, count = 8, exclude = [], angleChance = 0.5 } = options;
  const rng = options.rng || Math.random;
  const excluded = new Set(exclude.map(normalizeTheme));

  const bases = shuffleInPlace(getBaseThemes(options), rng);
  const result: string[] = [];
  const used = new Set<string>();

  const tryAdd = (candidate: string, base: string, respectExclude: boolean) => {
    const k = normalizeTheme(candidate);
    if (used.has(k)) return false;
    if (respectExclude && (excluded.has(k) || excluded.has(normalizeTheme(base)))) return false;
    used.add(k);
    result.push(candidate);
    return true;
  };

  for (const respect of [true, false]) {
    for (const base of bases) {
      if (result.length >= count) return result;
      const useAngle = Boolean(game) && rng() < angleChance;
      const candidate = useAngle
        ? applyGameAngle(base, game as ThemeGameId, Math.floor(rng() * 1000))
        : base;
      tryAdd(candidate, base, respect);
    }
  }
  return result;
}

export function pickRandomTheme(options: PickThemesOptions = {}): string {
  return pickThemes({ ...options, count: 1 })[0] || 'Geral';
}

/** Total de combinações únicas possíveis (temas-base + recortes de todos os jogos). */
export function getThemeBankStats() {
  const base = getBaseThemes();
  const perGame = {} as Record<ThemeGameId, { base: number; comRecortes: number }>;
  let totalCombinacoes = base.length;
  (Object.keys(GAME_ANGLES) as ThemeGameId[]).forEach((g) => {
    const b = getBaseThemes({ game: g }).length;
    const comRecortes = b + b * GAME_ANGLES[g].length;
    perGame[g] = { base: b, comRecortes };
    totalCombinacoes += b * GAME_ANGLES[g].length;
  });
  return {
    categorias: THEME_CATEGORIES.length,
    temasBase: base.length,
    totalCombinacoes,
    cazetv: getBaseThemes({ onlyCazetv: true }).length,
    porJogo: perGame
  };
}
