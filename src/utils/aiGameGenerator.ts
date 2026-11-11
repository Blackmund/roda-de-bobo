/**
 * AI Game Content & Random Sub-Theme Generator for "Roda de Bobo"
 * - Communicates with server-side Gemini API (/api/generate-round & /api/generate-subthemes)
 * - Enforces 100% strict theme fidelity (never drifts to unrelated topics)
 * - Tracks used round signatures across the session to guarantee non-repeating randomness
 * - Supports customizable item/card counts (e.g. 3 to 10 items in Tem ou Não Tem, 3 to 10 cards in Proibido, custom scales in Nota)
 * - Scales total survey respondents dynamically: 100 respondents for Top <= 5, scaling up to 120..200 respondents for Top 6..10
 * - Uses direct, natural questions without "Perguntamos a 100 pessoas:" prefixes and 100% real, concrete answers
 */

import { drawMimicaWords, normalizeMimicaWord } from '../data/mimicaWords';
import { MIMICA_WORDS_PER_ROUND } from './mimicaEngine';
import {
  GameId,
  GameCustomConfig,
  DEFAULT_GAME_CUSTOM_CONFIG,
  LimiteCategory,
  LimiteRoundData,
  DuvidoRoundData,
  ProibidoCard,
  NotaRoundData,
  TemOuNaoTemRoundData
} from '../types/game';
import {
  CURATED_LIMITE,
  CURATED_DUVIDO,
  CURATED_PROIBIDO,
  CURATED_NOTA
} from '../data/curatedRounds';
import {
  SessionMemoryManager,
  SessionMemorySnapshot,
  SubAngleDefinition,
  FEW_SHOT_STYLE_GUIDE,
  SEMANTIC_SUB_ANGLES,
  buildSessionMemoryPromptBlock
} from './sessionMemory';
import {
  LimiteQuestion,
  LIMITE_GOLDEN_QUESTIONS,
  LIMITE_SEVEN_GOLDEN_LAWS,
  selectFewShotLimiteExamples,
  drawUnusedGoldenLimiteQuestion,
  buildLimitePrompt,
  isGoldenDatabaseCompatibleTheme,
  matchThemeToGoldenCategory
} from './limiteGoldenDatabase';
import {
  DuvidoCategory,
  DUVIDO_GOLDEN_CATEGORIES,
  DUVIDO_SIX_GOLDEN_LAWS,
  selectFewShotDuvidoExamples,
  drawUnusedGoldenDuvidoCategory,
  buildDuvidoPrompt
} from './duvidoGoldenDatabase';
import {
  ProibidoGoldenCard,
  PROIBIDO_GOLDEN_CARDS,
  PROIBIDO_SIX_GOLDEN_LAWS,
  selectFewShotProibidoExamples,
  buildProibidoPrompt,
  ensureStrictForbiddenWordsCount
} from './proibidoGoldenDatabase';
import {
  NotaPromptItem,
  NOTA_GOLDEN_PROMPTS,
  NOTA_SIX_GOLDEN_LAWS,
  selectFewShotNotaExamples,
  drawUnusedGoldenNotaPrompt,
  buildNotaPrompt
} from './notaGoldenDatabase';
import {
  TemOuNaoTemQuestion,
  TemOuNaoTemAnswer,
  TEM_OU_NAO_TEM_GOLDEN_QUESTIONS,
  TEM_OU_NAO_TEM_SIX_GOLDEN_LAWS,
  selectFewShotTemOuNaoTemExamples,
  buildTemOuNaoTemPrompt
} from './temOuNaoTemGoldenDatabase';

export {
  LIMITE_GOLDEN_QUESTIONS,
  LIMITE_SEVEN_GOLDEN_LAWS,
  selectFewShotLimiteExamples,
  drawUnusedGoldenLimiteQuestion,
  buildLimitePrompt,
  DUVIDO_GOLDEN_CATEGORIES,
  DUVIDO_SIX_GOLDEN_LAWS,
  selectFewShotDuvidoExamples,
  drawUnusedGoldenDuvidoCategory,
  buildDuvidoPrompt,
  PROIBIDO_GOLDEN_CARDS,
  PROIBIDO_SIX_GOLDEN_LAWS,
  selectFewShotProibidoExamples,
  buildProibidoPrompt,
  NOTA_GOLDEN_PROMPTS,
  NOTA_SIX_GOLDEN_LAWS,
  selectFewShotNotaExamples,
  drawUnusedGoldenNotaPrompt,
  buildNotaPrompt,
  TEM_OU_NAO_TEM_GOLDEN_QUESTIONS,
  TEM_OU_NAO_TEM_SIX_GOLDEN_LAWS,
  selectFewShotTemOuNaoTemExamples,
  buildTemOuNaoTemPrompt
};
export type {
  LimiteQuestion,
  DuvidoCategory,
  ProibidoGoldenCard,
  NotaPromptItem,
  TemOuNaoTemQuestion,
  TemOuNaoTemAnswer
};

export interface GenerateRoundResponse<T> {
  source: 'ai' | 'curated';
  data: T;
  themeUsed: string;
  subthemeUsed: string;
  signature: string;
}

const USED_QUESTIONS_STORAGE_KEY = 'rb_used_questions_tracker';
const USED_PROIBIDO_WORDS_STORAGE_KEY = 'rb_used_proibido_words';

function loadPersistedUsedQuestions(): Set<string> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(USED_QUESTIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed);
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return new Set<string>();
}

function persistUsedQuestions(set: Set<string>): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const arr = Array.from(set).slice(-300);
      window.localStorage.setItem(USED_QUESTIONS_STORAGE_KEY, JSON.stringify(arr));
    }
  } catch {
    // ignore storage errors
  }
}

function loadPersistedUsedProibidoWords(): string[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(USED_PROIBIDO_WORDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((w) => String(w).toUpperCase().trim()).filter(Boolean).slice(-200);
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

function persistUsedProibidoWords(words: string[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const trimmed = words.slice(-200);
      window.localStorage.setItem(USED_PROIBIDO_WORDS_STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // ignore storage errors
  }
}

// Global anti-repetition memory (persisted in localStorage when available)
export const usedQuestionsTracker: Set<string> = loadPersistedUsedQuestions();
export const usedProibidoWords: string[] = loadPersistedUsedProibidoWords();
const sessionUsedSignatures = new Set<string>(usedQuestionsTracker);
const sessionUsedSubthemes = new Set<string>();

export function getUsedProibidoWords(): string[] {
  return [...usedProibidoWords];
}

export function registerUsedProibidoWords(words: string[]): void {
  if (!Array.isArray(words) || words.length === 0) return;
  words.forEach((w) => {
    const clean = String(w || '').toUpperCase().trim();
    if (clean && !usedProibidoWords.includes(clean)) {
      usedProibidoWords.push(clean);
    }
  });
  while (usedProibidoWords.length > 200) {
    usedProibidoWords.shift();
  }
  persistUsedProibidoWords(usedProibidoWords);
}

/**
 * Pure Fisher-Yates shuffle that returns a new randomly permuted array.
 */
export function fisherYatesShuffle<T>(array: readonly T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

export function getUsedRoundSignatures(): string[] {
  return Array.from(new Set([...sessionUsedSignatures, ...usedQuestionsTracker]));
}

export function clearUsedRoundSignatures(): void {
  sessionUsedSignatures.clear();
  sessionUsedSubthemes.clear();
  usedQuestionsTracker.clear();
  usedProibidoWords.length = 0;
  persistUsedQuestions(usedQuestionsTracker);
  persistUsedProibidoWords(usedProibidoWords);
  SessionMemoryManager.clear();
  clearRoundContentCache();
}

export function registerUsedSignature(sig: string): void {
  if (!sig) return;
  sessionUsedSignatures.add(sig);
  usedQuestionsTracker.add(sig);
  persistUsedQuestions(usedQuestionsTracker);
}

/**
 * Maps a user-chosen theme string to one of the 6 structured LimiteCategory buckets.
 */
export function mapThemeToLimiteCategory(theme: string): LimiteCategory {
  const norm = (theme || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (
    /(filme|cinema|serie|hollywood|ator|atriz|oscar|netflix|disney|marvel|dc|diretor|bilheteria|animacao|desenho)/.test(
      norm
    )
  ) {
    return 'Filmes';
  }
  if (
    /(futebol|esporte|copa|selecao|clube|brasileirao|libertadores|champions|gol|craque|estadio|olimpiada|nba|basquete|tenis|formula 1|corrida|volei)/.test(
      norm
    )
  ) {
    return 'Esportes';
  }
  if (
    /(musica|cantor|cantora|banda|show|festival|pagode|sertanejo|rock|pop|funk|trap|carnaval|spotify|samba|forro|album|instrumento|karaoke)/.test(
      norm
    )
  ) {
    return 'Música';
  }
  if (
    /(historia|geografia|pais|paises|mundo|viagem|viagens|cidade|capital|continente|guerra|imperio|rei|presidente|antiguidade|monumento)/.test(
      norm
    )
  ) {
    return 'História';
  }
  if (
    /(cultura pop|meme|internet|game|anime|videogame|geek|nerd|pokemon|naruto|dragon ball|playstation|nintendo|tv|novela|bbb|reality|fofoca|celebridade)/.test(
      norm
    )
  ) {
    return 'Cultura Pop';
  }
  return 'Geral';
}

/**
 * Strips any legacy "Perguntamos a X pessoas:" prefix so questions always start directly.
 */
export function stripPerguntamosPrefix(question: string): string {
  const cleaned = (question || '')
    .replace(/^perguntamos\s+a\s+\d+\s+pessoas\s*:\s*/i, '')
    .trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Enforces the Golden Rule of Writing across all games:
 * - Removes surrounding quotes ("...", '...', “...”)
 * - Removes fake template concatenations ("No universo de...", "Sobre...", "(Tema: Subtema)")
 * - For Jogo da Nota, removes any trailing "que represente a sua nota" / "de acordo com a sua nota"
 */
export function sanitizeCleanGameText(rawText: string, gameId?: GameId): string {
  let text = String(rawText || '').trim();
  if (!text) return '';

  text = text.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  text = text
    .replace(/^no\s+universo\s+de\s+[^:]+:\s*/i, '')
    .replace(/^sobre\s+[^:]+:\s*/i, '')
    .replace(/\([^)]*:\s*[^)]*\)\s*:?\s*/g, '')
    .trim();

  text = text.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();

  if (gameId === 'nota') {
    text = text
      .replace(
        /\s*(?:cujo\s+\w+\s+)?(?:que\s+represente|que\s+mere[cç]a|que\s+resume|correspondente\s+[aà]|de\s+acordo\s+com|com\s+essa|que\s+vale|representa(?:\s+exatamente)?(?:\s+o\s+n[ií]vel\s+d[ae])?)\s+(?:exatamente\s+)?(?:o\s+n[ií]vel\s+da\s+)?(?:a\s+)?(?:sua\s+|essa\s+)?nota(?:\s+que\s+voc[eê]\s+tirou)?(?:\s*\(?de\s*\d+\s*a\s*\d+\)?)?\??$/i,
        ''
      )
      .replace(/\s*:?\s*o\s+que\s+merece\s+exatamente\s+a\s+nota\s+que\s+voc[eê]\s+tirou\??$/i, '')
      .trim();

    if (/^cite\s+um(?:a)?\s+/i.test(text)) {
      text = text.replace(/^cite\s+um(?:a)?\s+/i, 'Qual ');
      if (!text.endsWith('?')) text += '?';
    }
  }

  text = text.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Returns the total number of survey respondents (and total points sum) for a given Top count:
 * - Up to Top 5 (3, 4, 5): 100 respondents
 * - Top 6: 120 respondents
 * - Top 7: 140 respondents
 * - Top 8: 160 respondents
 * - Top 9: 180 respondents
 * - Top 10: 200 respondents
 */
export function getTemTotalRespondents(targetCount: number = 5): number {
  const count = Math.min(10, Math.max(3, Math.round(targetCount || 5)));
  if (count <= 5) return 100;
  return 100 + (count - 5) * 20;
}

/**
 * Normalizes an array of Tem ou Não Tem answers to have exactly `targetCount` items (3..10)
 * sorted in descending order with `votos` strictly summing to `explicitTotal ?? getTemTotalRespondents(targetCount)`.
 */
export function normalizeTemVotesTo100(
  items: Array<{ texto: string; sinonimos_aceitos: string[]; votos: number }>,
  targetCount: number = 5,
  explicitTotal?: number,
  themeHint?: string
): Array<{ texto: string; sinonimos_aceitos: string[]; votos: number }> {
  const count = Math.min(10, Math.max(3, Math.round(targetCount || 5)));
  const totalTarget = explicitTotal ?? getTemTotalRespondents(count);

  const normalizeTextKey = (s: string) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const seenTexts = new Set<string>();
  const pool: Array<{ texto: string; sinonimos_aceitos: string[]; votos: number }> = [];

  for (const it of items || []) {
    if (!it || !it.texto) continue;
    // Strict single-answer enforcement: strip any "/", " ou ", or ","
    const rawClean = String(it.texto)
      .split('/')[0]
      .split(/\s+ou\s+/i)[0]
      .split(',')[0]
      .trim();
    if (!rawClean) continue;
    const key = normalizeTextKey(rawClean);
    if (!key || seenTexts.has(key)) continue;
    seenTexts.add(key);

    // Extract any extra aliases from slash, comma, or "ou" split into synonyms
    const extraAliases: string[] = [];
    const parts = it.texto.split(/[\/,]|\s+ou\s+/i);
    for (let p = 1; p < parts.length; p++) {
      const alt = parts[p].trim().toLowerCase();
      if (alt && !extraAliases.includes(alt)) extraAliases.push(alt);
    }

    const mergedSynonyms = Array.from(
      new Set([
        ...(Array.isArray(it.sinonimos_aceitos) ? it.sinonimos_aceitos : []),
        ...extraAliases
      ])
    );

    pool.push({
      texto: rawClean,
      sinonimos_aceitos: mergedSynonyms,
      votos: Number(it.votos) || 10
    });
  }

  if (pool.length < count) {
    let categoryExtras: Array<{ texto: string; sinonimos_aceitos: string[]; votos?: number }> = [];
    try {
      const cat = detectThemeCategory(themeHint || '');
      const bank = TEM_BANKS_BY_CATEGORY?.[cat] || POP_GERAL_TEM_OU_NAO_TEM || [];
      for (const round of bank) {
        if (Array.isArray(round?.respostas)) {
          for (const r of round.respostas) {
            categoryExtras.push(r);
          }
        }
      }
    } catch {
      // Fallback if banks not yet initialized
    }

    const defaultExtras = [
      { texto: 'Cerveja', sinonimos_aceitos: ['Bebida', 'Refrigerante', 'Breja', 'Chopp'] },
      { texto: 'Batata frita', sinonimos_aceitos: ['Fritas', 'Batatinha'] },
      { texto: 'Pão de queijo', sinonimos_aceitos: ['Pao de queijo'] },
      { texto: 'Pastel', sinonimos_aceitos: ['Pastelzinho'] },
      { texto: 'Brigadeiro', sinonimos_aceitos: ['Docinho'] },
      { texto: 'Coxinha', sinonimos_aceitos: ['Salgadinho'] },
      { texto: 'Pipoca', sinonimos_aceitos: ['Pipoquinha'] },
      { texto: 'Sorvete', sinonimos_aceitos: ['Picole'] },
      { texto: 'Pizza', sinonimos_aceitos: ['Calabresa'] },
      { texto: 'Chocolate', sinonimos_aceitos: ['Bombom'] }
    ];

    const combinedExtras = [...categoryExtras, ...defaultExtras];
    let extraIdx = 0;
    while (pool.length < count && extraIdx < combinedExtras.length) {
      const fb = combinedExtras[extraIdx++];
      const cleanFbText = String(fb.texto || '').split('/')[0].split(/\s+ou\s+/i)[0].split(',')[0].trim();
      const key = normalizeTextKey(cleanFbText);
      if (!key || seenTexts.has(key)) continue;
      seenTexts.add(key);
      pool.push({
        texto: cleanFbText,
        sinonimos_aceitos: fb.sinonimos_aceitos || [],
        votos: Math.max(2, 12 - pool.length)
      });
    }
  }

  const sliced = pool.slice(0, count);
  sliced.sort((a, b) => (b.votos || 1) - (a.votos || 1));

  const rawTotal = sliced.reduce((acc, it) => acc + Math.max(1, it.votos || 1), 0);
  let remaining = totalTarget;

  const normalized = sliced.map((it, idx) => {
    if (idx === sliced.length - 1) {
      return {
        texto: it.texto,
        sinonimos_aceitos: it.sinonimos_aceitos || [],
        votos: Math.max(1, remaining)
      };
    }
    const minNeededForRest = sliced.length - 1 - idx;
    const rawShare = Math.round((Math.max(1, it.votos || 1) / rawTotal) * totalTarget);
    const clamped = Math.max(1, Math.min(remaining - minNeededForRest, rawShare));
    remaining -= clamped;
    return {
      texto: it.texto,
      sinonimos_aceitos: it.sinonimos_aceitos || [],
      votos: clamped
    };
  });

  normalized.sort((a, b) => b.votos - a.votos);
  return normalized;
}

/**
 * Detects which thematic macro-domain a central theme belongs to,
 * or returns 'custom' if it's a freeform user topic.
 */
export type ThemeCategory =
  | 'animais'
  | 'comida'
  | 'futebol'
  | 'cinema'
  | 'musica'
  | 'games'
  | 'ciencia'
  | 'cotidiano'
  | 'relacionamentos'
  | 'profissoes'
  | 'cultura_pop'
  | 'custom';

/**
 * Canonical unitary themes ordered from most popular/general to specific.
 * "Geral" is always the first theme and covers diverse topics across all categories.
 */
export const PRESET_THEMES: string[] = [
  'Geral',
  'Cotidiano',
  'Comidas',
  'Boteco',
  'Futebol',
  'Filmes',
  'Séries',
  'Música',
  'Relacionamentos',
  'Perrengues',
  'Memes & Internet',
  'Animais',
  'Celebridades & TV',
  'Novelas',
  'Anos 90 & 2000',
  'Doces & Sobremesas',
  'Churrasco',
  'Games',
  'Animes',
  'Super-Heróis',
  'Viagens',
  'Profissões',
  'Esportes',
  'Corpo Humano',
  'Ciência',
  'Espaço',
  'História',
  'Geografia'
];

export function isGeneralTheme(theme: string): boolean {
  const norm = (theme || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  return (
    norm === '' ||
    norm === 'geral' ||
    norm.startsWith('geral ') ||
    norm.startsWith('geral (') ||
    norm === 'assuntos diversos' ||
    norm === 'variados'
  );
}

export function detectThemeCategory(theme: string): ThemeCategory {
  const norm = (theme || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (isGeneralTheme(norm)) {
    return 'custom';
  }

  if (
    /(animal|animais|bicho|pet|cachorro|gato|selva|zoologico|natureza|fauna|ave|inseto|mamifero|reptil|oceano|marinho|dinossauro|fazenda)/.test(
      norm
    )
  ) {
    return 'animais';
  }
  if (
    /(relacionamento|date|encontro|namoro|casal|amor|casamento|crush|sogra|paquera|beijo|tinder|solteiro)/.test(
      norm
    )
  ) {
    return 'relacionamentos';
  }
  if (
    /(profissao|profissoes|trabalho|carreira|emprego|escritorio|chefe|salario|faculdade|empresa|demissao|reuniao)/.test(
      norm
    )
  ) {
    return 'profissoes';
  }
  if (
    /(habito|cotidiano|perrengue|boleto|pix|geladeira|banheiro|bolsa da mae|vida adulta|rotina|acordar|supermercado)/.test(
      norm
    )
  ) {
    return 'cotidiano';
  }
  if (
    /(comida|churrasco|gastronomia|boteco|culinaria|doce|fruta|restaurante|bebida|cozinha|pizza|lanche|bar|feijoada|nordeste|salgado|sobremesa)/.test(
      norm
    )
  ) {
    return 'comida';
  }
  if (
    /(futebol|copa|selecao|clube|brasileirao|libertadores|champions|esporte|gol|craque|estadio|torcida)/.test(
      norm
    )
  ) {
    return 'futebol';
  }
  if (
    /(filme|cinema|marvel|serie|hollywood|ator|atriz|oscar|netflix|disney|heroi|novela|desenho|quadrinho)/.test(
      norm
    )
  ) {
    return 'cinema';
  }
  if (
    /(cultura pop|meme|internet|fofoca|celebridade|reality|bbb|tiktok|instagram|rede social|nostalgia|anos 90|anos 2000)/.test(
      norm
    )
  ) {
    return 'cultura_pop';
  }
  if (
    /(musica|pagode|sertanejo|rock|k-pop|mpb|cantor|banda|show|funk|trap|carnaval|spotify|samba|forro|karaoke)/.test(
      norm
    )
  ) {
    return 'musica';
  }
  if (
    /(game|anime|videogame|geek|nerd|pokemon|naruto|dragon ball|playstation|nintendo|gamer|manga)/.test(
      norm
    )
  ) {
    return 'games';
  }
  if (
    /(ciencia|espaco|corpo|humano|planeta|astronomia|biologia|fisica|quimica|anatomia|universo|medicina|historia|geografia)/.test(
      norm
    )
  ) {
    return 'ciencia';
  }
  return 'custom';
}

/**
 * Generates a shuffled list of creative, strictly on-topic subthemes for any central theme.
 */
export function getSmartSubthemesForTheme(centralTheme: string): string[] {
  const clean = centralTheme.trim() || 'Geral';
  const norm = clean
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Unitary specialized subtheme pools when a specific unitary theme is chosen
  if (norm === 'espaco') {
    return fisherYatesShuffle([
      'Planetas, estrelas e Sistema Solar',
      'Astronautas, Lua e exploração espacial',
      'Galáxias, buracos negros e mistérios do universo',
      'Foguetes, satélites e missões espaciais'
    ]);
  }
  if (norm === 'corpo humano') {
    return fisherYatesShuffle([
      'Órgãos, ossos e músculos do corpo humano',
      'Cérebro, sentidos e curiosidades do corpo',
      'Saúde, sono e funcionamento do organismo',
      'Recordes e mistérios da anatomia humana'
    ]);
  }
  if (norm === 'ciencia') {
    return fisherYatesShuffle([
      'Invenções científicas que mudaram o mundo',
      'Descobertas da física, química e biologia',
      'Cientistas famosos e experimentos históricos',
      'Fenômenos da natureza e tecnologia'
    ]);
  }

  const cat = detectThemeCategory(clean);

  const pools: Record<ThemeCategory, string[]> = {
    animais: [
      'Nomes de cachorros mais comuns no Brasil',
      'Pets e animais exóticos',
      'Animais de zoológico e savana',
      'Mamíferos, aves e répteis',
      'Animais venenosos e peçonhentos',
      'Insetos e bichos de quintal',
      'Criaturas marinhas e oceanos',
      'Animais da fazenda e fauna brasileira'
    ],
    futebol: [
      'Estádios e arenas de futebol',
      'Lendas da Seleção Brasileira e Copas',
      'Clubes da Série A do Brasileirão',
      'Batedores de falta, pênalti e goleiros',
      'Comidas de estádio e rituais de torcida',
      'Clássicos e rivalidades históricas'
    ],
    cinema: [
      'Filmes clássicos e vencedores do Oscar',
      'Super-heróis e vilões do cinema',
      'Séries famosas de TV e streaming',
      'Animações e desenhos inesquecíveis',
      'Diretores e atores consagrados'
    ],
    musica: [
      'Músicas clássicas de karaokê e churrasco',
      'Instrumentos musicais',
      'Cantores e bandas brasileiras',
      'Ritmos musicais e festas populares',
      'Hits dos anos 90 e 2000'
    ],
    comida: [
      'Petiscos e porções de boteco',
      'Pratos típicos das regiões do Brasil',
      'Comidas famosas do Nordeste',
      'Bebidas, sucos e drinks populares',
      'Sabores de pizza e salgados de festa',
      'Sobremesas e doces brasileiros'
    ],
    games: [
      'Personagens lendários dos videogames',
      'Animes e mangás populares no Brasil',
      'Consoles clássicos e jogos multiplayer',
      'Poderes e golpes famosos dos animes'
    ],
    ciencia: [
      'Órgãos e ossos do corpo humano',
      'Planetas, estrelas e exploração espacial',
      'Invenções científicas da história',
      'Fenômenos da natureza e astronomia',
      'Descobertas da medicina e biologia'
    ],
    cotidiano: [
      'Hábitos ao acordar e rotina em casa',
      'Itens clássicos de geladeira e cozinha',
      'Perrengues de boleto, Pix e trânsito',
      'Desculpas de atraso e situações do dia a dia'
    ],
    relacionamentos: [
      'Situações de primeiro encontro (date)',
      'Apelidos carinhosos e vida de casal',
      'Ciúmes, sogras e festas de casamento',
      'Cantadas, aplicativos de namoro e términos'
    ],
    profissoes: [
      'Profissões clássicas e carreiras dos sonhos',
      'Rotina de escritório, reuniões e home office',
      'Perrengues de entrevista de emprego e chefe',
      'Cursos de faculdade e ferramentas de trabalho'
    ],
    cultura_pop: [
      'Memes clássicos da internet brasileira',
      'Redes sociais, influenciadores e virais',
      'Reality shows, TV brasileira e celebridades',
      'Nostalgia dos anos 90 e anos 2000'
    ],
    custom: [
      'Clássicos e favoritos do tema',
      'Personagens, lugares e itens marcantes',
      'Curiosidades e detalhes específicos',
      'Momentos mais lembrados pelo público'
    ]
  };

  if (isGeneralTheme(clean)) {
    const allGeneralSubthemes = [
      ...pools.cotidiano,
      ...pools.comida,
      ...pools.cinema,
      ...pools.musica,
      ...pools.futebol,
      ...pools.cultura_pop,
      ...pools.animais,
      ...pools.relacionamentos,
      ...pools.ciencia
    ];
    return fisherYatesShuffle(allGeneralSubthemes);
  }

  return fisherYatesShuffle(pools[cat]);
}

/**
 * Picks a fresh random subtheme for a central theme that hasn't been used recently.
 */
export function pickNextRandomSubtheme(centralTheme: string): string {
  const candidates = getSmartSubthemesForTheme(centralTheme);
  const unused = candidates.filter((c) => !sessionUsedSubthemes.has(c));
  const chosen = unused.length > 0 ? unused[0] : candidates[Math.floor(Math.random() * candidates.length)];
  sessionUsedSubthemes.add(chosen);
  if (sessionUsedSubthemes.size >= candidates.length) {
    sessionUsedSubthemes.clear();
    sessionUsedSubthemes.add(chosen);
  }
  return chosen;
}

/**
 * Requests AI-generated random subthemes from the backend, with instant smart fallback.
 */
export async function generateRandomSubthemes(
  centralTheme: string,
  count: number = 6
): Promise<string[]> {
  const base = centralTheme.trim() || 'Cultura Pop e Curiosidades';
  try {
    const res = await fetch('/api/generate-subthemes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ centralTheme: base, count })
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.subthemes) && json.subthemes.length > 0) {
        return json.subthemes.slice(0, count);
      }
    }
  } catch {
    // Fallback to smart local subthemes
  }
  return getSmartSubthemesForTheme(base).slice(0, count);
}

// ============================================================================
// 1. COMIDAS, BOTECO E GASTRONOMIA BANK (10 real answers per question!)
// ============================================================================

const COMIDA_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'O que é mais consumido em um boteco brasileiro?',
    respostas: [
      { texto: 'Cerveja gelada / Chopp', sinonimos_aceitos: ['Cerveja', 'Chopp', 'Breja', 'Litrão', 'Gelada'], votos: 38 },
      { texto: 'Torresmo crocante', sinonimos_aceitos: ['Torresmo', 'Pururuca', 'Panceta'], votos: 26 },
      { texto: 'Coxinha', sinonimos_aceitos: ['Coxinha de frango', 'Salgado'], votos: 22 },
      { texto: 'Batata frita', sinonimos_aceitos: ['Fritas', 'Porcao de batata', 'Batatinha'], votos: 20 },
      { texto: 'Pastel (Carne / Queijo)', sinonimos_aceitos: ['Pastel', 'Pastelzinho', 'Porcao de pastel'], votos: 18 },
      { texto: 'Bolinho de bacalhau', sinonimos_aceitos: ['Bacalhau', 'Bolinho'], votos: 16 },
      { texto: 'Calabresa acebolada', sinonimos_aceitos: ['Calabresa', 'Linguica', 'Linguica acebolada'], votos: 15 },
      { texto: 'Frango a passarinho', sinonimos_aceitos: ['Frango', 'Passarinho', 'Isca de frango'], votos: 14 },
      { texto: 'Mandioca / Aipim frito', sinonimos_aceitos: ['Mandioca', 'Aipim', 'Macaxeira'], votos: 11 },
      { texto: 'Amendoim / Tremoço / Ovo de codorna', sinonimos_aceitos: ['Amendoim', 'Tremoco', 'Ovo de codorna', 'Azeitona'], votos: 10 }
    ]
  },
  {
    pergunta: 'Quais as melhores comidas típicas do Brasil?',
    respostas: [
      { texto: 'Feijoada completa', sinonimos_aceitos: ['Feijoada', 'Feijao preto'], votos: 40 },
      { texto: 'Churrasco / Picanha', sinonimos_aceitos: ['Churrasco', 'Picanha', 'Costela'], votos: 32 },
      { texto: 'Pão de queijo mineiro', sinonimos_aceitos: ['Pao de queijo'], votos: 24 },
      { texto: 'Moqueca de peixe / camarão', sinonimos_aceitos: ['Moqueca', 'Moqueca baiana', 'Moqueca capixaba'], votos: 20 },
      { texto: 'Coxinha de frango', sinonimos_aceitos: ['Coxinha'], votos: 18 },
      { texto: 'Baião de dois', sinonimos_aceitos: ['Baiao de dois', 'Baiao'], votos: 16 },
      { texto: 'Acarajé', sinonimos_aceitos: ['Acaraje'], votos: 14 },
      { texto: 'Escondidinho de carne seca', sinonimos_aceitos: ['Escondidinho', 'Carne seca'], votos: 13 },
      { texto: 'Brigadeiro', sinonimos_aceitos: ['Docinho', 'Brigadeiro de panela'], votos: 12 },
      { texto: 'Pastel de feira com caldo de cana', sinonimos_aceitos: ['Pastel', 'Pastel de feira', 'Tropeiro', 'Feijao tropeiro'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais as comidas mais famosas do Nordeste brasileiro?',
    respostas: [
      { texto: 'Acarajé', sinonimos_aceitos: ['Acaraje'], votos: 36 },
      { texto: 'Baião de dois', sinonimos_aceitos: ['Baiao de dois', 'Baiao'], votos: 28 },
      { texto: 'Carne de sol com macaxeira', sinonimos_aceitos: ['Carne de sol', 'Macaxeira', 'Carne seca', 'Jabá'], votos: 24 },
      { texto: 'Tapioca recheada', sinonimos_aceitos: ['Tapioca', 'Beiju'], votos: 20 },
      { texto: 'Cuscuz nordestino', sinonimos_aceitos: ['Cuscuz', 'Cuscuz com ovo', 'Cuscuz de milho'], votos: 18 },
      { texto: 'Vatapá', sinonimos_aceitos: ['Vatapa', 'Caruru'], votos: 16 },
      { texto: 'Buchada de bode / Sarapatel', sinonimos_aceitos: ['Buchada', 'Buchada de bode', 'Sarapatel'], votos: 15 },
      { texto: 'Bolo de rolo', sinonimos_aceitos: ['Bolo de rolo pernambucano', 'Cartola'], votos: 14 },
      { texto: 'Bobó de camarão / Moqueca', sinonimos_aceitos: ['Bobo de camarao', 'Bobo', 'Moqueca'], votos: 11 },
      { texto: 'Paçoca de carne de sol / Queijo coalho', sinonimos_aceitos: ['Pacoca', 'Queijo coalho', 'Arrumadinho'], votos: 10 }
    ]
  },
  {
    pergunta: 'Quais as bebidas mais famosas pedidas pelos brasileiros?',
    respostas: [
      { texto: 'Cerveja / Chopp', sinonimos_aceitos: ['Cerveja', 'Chopp', 'Gelada'], votos: 42 },
      { texto: 'Caipirinha de limão', sinonimos_aceitos: ['Caipirinha', 'Caipiroska'], votos: 28 },
      { texto: 'Refrigerante (Coca-Cola / Guaraná)', sinonimos_aceitos: ['Refrigerante', 'Coca', 'Guarana', 'Refri'], votos: 24 },
      { texto: 'Café / Cafezinho', sinonimos_aceitos: ['Cafe', 'Cafezinho', 'Pingado'], votos: 20 },
      { texto: 'Cachaça / Pinga', sinonimos_aceitos: ['Cachaca', 'Pinga', 'Aguardente'], votos: 17 },
      { texto: 'Suco natural (Laranja / Maracujá)', sinonimos_aceitos: ['Suco', 'Suco de laranja'], votos: 15 },
      { texto: 'Vinho', sinonimos_aceitos: ['Vinho tinto', 'Vinho suave'], votos: 14 },
      { texto: 'Whisky / Uísque', sinonimos_aceitos: ['Whisky', 'Uisque'], votos: 14 },
      { texto: 'Água de coco', sinonimos_aceitos: ['Agua de coco', 'Coco gelado'], votos: 13 },
      { texto: 'Gin tônica / Vodka', sinonimos_aceitos: ['Gin', 'Vodka', 'Drinks', 'Energetico'], votos: 13 }
    ]
  },
  {
    pergunta: 'O que não pode faltar em um churrasco de domingo no Brasil?',
    respostas: [
      { texto: 'Picanha / Carne bovina', sinonimos_aceitos: ['Picanha', 'Carne', 'Costela', 'Fraldinha'], votos: 44 },
      { texto: 'Cerveja bem gelada', sinonimos_aceitos: ['Cerveja', 'Chopp', 'Bebida'], votos: 30 },
      { texto: 'Pão de alho', sinonimos_aceitos: ['Pao de alho'], votos: 22 },
      { texto: 'Linguiça toscana / apimentada', sinonimos_aceitos: ['Linguica', 'Toscana'], votos: 18 },
      { texto: 'Farofa', sinonimos_aceitos: ['Farofinha', 'Farofa temperada'], votos: 16 },
      { texto: 'Vinagrete / Molho à campanha', sinonimos_aceitos: ['Vinagrete', 'Molho'], votos: 15 },
      { texto: 'Queijo coalho na brasa', sinonimos_aceitos: ['Queijo coalho', 'Queijinho'], votos: 14 },
      { texto: 'Coraçãozinho de frango', sinonimos_aceitos: ['Coracao', 'Coracao de frango'], votos: 14 },
      { texto: 'Asinha / Coxinha de frango', sinonimos_aceitos: ['Frango', 'Asinha', 'Drumet'], votos: 14 },
      { texto: 'Maionese de batata / Arroz', sinonimos_aceitos: ['Maionese', 'Salada de maionese', 'Arroz'], votos: 13 }
    ]
  },
  {
    pergunta: 'Quais os sabores de pizza mais pedidos nas pizzarias do Brasil?',
    respostas: [
      { texto: 'Calabresa com cebola', sinonimos_aceitos: ['Calabresa'], votos: 38 },
      { texto: 'Mussarela', sinonimos_aceitos: ['Mussarela', 'Queijo'], votos: 28 },
      { texto: 'Portuguesa', sinonimos_aceitos: ['Pizza portuguesa'], votos: 24 },
      { texto: 'Frango com Catupiry', sinonimos_aceitos: ['Frango', 'Catupiry', 'Frango com requeijao'], votos: 22 },
      { texto: 'Marguerita', sinonimos_aceitos: ['Margherita', 'Manjericao'], votos: 18 },
      { texto: 'Quatro Queijos', sinonimos_aceitos: ['4 queijos', 'Quatro queijos'], votos: 16 },
      { texto: 'Pepperoni', sinonimos_aceitos: ['Peperoni', 'Salame'], votos: 15 },
      { texto: 'Napolitana / Presunto', sinonimos_aceitos: ['Napolitana', 'Presunto e queijo'], votos: 13 },
      { texto: 'Bacon com milho', sinonimos_aceitos: ['Bacon', 'Milho'], votos: 13 },
      { texto: 'Chocolate / Brigadeiro com morango', sinonimos_aceitos: ['Chocolate', 'Brigadeiro', 'Pizza doce'], votos: 13 }
    ]
  },
  {
    pergunta: 'Quais os salgados de festa de aniversário mais disputados pelos convidados?',
    respostas: [
      { texto: 'Coxinha de frango', sinonimos_aceitos: ['Coxinha'], votos: 42 },
      { texto: 'Bolinha de queijo', sinonimos_aceitos: ['Bolinha de queijo', 'Queijo'], votos: 28 },
      { texto: 'Quibe frito', sinonimos_aceitos: ['Quibe', 'Kibe'], votos: 22 },
      { texto: 'Risole de presunto e queijo', sinonimos_aceitos: ['Risole', 'Risoles'], votos: 19 },
      { texto: 'Empadinha de frango / palmito', sinonimos_aceitos: ['Empada', 'Empadinha'], votos: 18 },
      { texto: 'Pastelzinho de festa', sinonimos_aceitos: ['Pastel', 'Pastelzinho'], votos: 16 },
      { texto: 'Enroladinho de salsicha', sinonimos_aceitos: ['Salsicha', 'Enroladinho'], votos: 15 },
      { texto: 'Esfiha de carne', sinonimos_aceitos: ['Esfiha', 'Esfirra'], votos: 14 },
      { texto: 'Croquete de carne', sinonimos_aceitos: ['Croquete'], votos: 13 },
      { texto: 'Mini pão de queijo / Canudinho', sinonimos_aceitos: ['Pao de queijo', 'Canudinho'], votos: 13 }
    ]
  },
  {
    pergunta: 'Quais as sobremesas mais amadas pelos brasileiros depois do almoço?',
    respostas: [
      { texto: 'Pudim de leite condensado', sinonimos_aceitos: ['Pudim'], votos: 38 },
      { texto: 'Brigadeiro / Docinho', sinonimos_aceitos: ['Brigadeiro', 'Beijinho'], votos: 30 },
      { texto: 'Mousse de maracujá / chocolate', sinonimos_aceitos: ['Mousse', 'Musse'], votos: 22 },
      { texto: 'Pavê de chocolate / biscoito', sinonimos_aceitos: ['Pave'], votos: 20 },
      { texto: 'Bolo de cenoura com chocolate', sinonimos_aceitos: ['Bolo', 'Bolo de cenoura', 'Bolo de chocolate'], votos: 18 },
      { texto: 'Sorvete / Picolé', sinonimos_aceitos: ['Sorvete', 'Picole', 'Acai'], votos: 16 },
      { texto: 'Torta de limão / morango', sinonimos_aceitos: ['Torta', 'Torta de limao'], votos: 15 },
      { texto: 'Romeu e Julieta (Queijo com goiabada)', sinonimos_aceitos: ['Goiabada', 'Romeu e julieta'], votos: 14 },
      { texto: 'Salada de frutas', sinonimos_aceitos: ['Fruta', 'Salada de fruta'], votos: 14 },
      { texto: 'Arroz doce / Manjar de coco', sinonimos_aceitos: ['Arroz doce', 'Manjar', 'Canjica'], votos: 13 }
    ]
  },
  {
    pergunta: 'O que o brasileiro mais gosta de passar ou colocar dentro do pão francês no café da manhã?',
    respostas: [
      { texto: 'Manteiga na chapa', sinonimos_aceitos: ['Manteiga', 'Margarina', 'Pao na chapa'], votos: 40 },
      { texto: 'Queijo mussarela / prato', sinonimos_aceitos: ['Queijo', 'Mussarela', 'Queijo quente'], votos: 28 },
      { texto: 'Presunto (Misto quente)', sinonimos_aceitos: ['Presunto', 'Misto', 'Misto quente'], votos: 24 },
      { texto: 'Requeijão cremoso', sinonimos_aceitos: ['Requeijao', 'Catupiry'], votos: 20 },
      { texto: 'Ovo mexido / frito', sinonimos_aceitos: ['Ovo', 'Pao com ovo', 'Ovos mexidos'], votos: 18 },
      { texto: 'Mortadela', sinonimos_aceitos: ['Pao com mortadela'], votos: 16 },
      { texto: 'Queijo minas / Ricota', sinonimos_aceitos: ['Queijo branco', 'Queijo minas'], votos: 14 },
      { texto: 'Patê / Peito de peru / Salame', sinonimos_aceitos: ['Peito de peru', 'Salame', 'Pate'], votos: 14 },
      { texto: 'Leite condensado / Doce de leite / Nutella', sinonimos_aceitos: ['Doce de leite', 'Nutella', 'Leite condensado'], votos: 13 },
      { texto: 'Geleia de frutas', sinonimos_aceitos: ['Geleia'], votos: 13 }
    ]
  },
  {
    pergunta: 'Quais comidas têm opiniões mais divididas (muita gente ama, mas muita gente odeia)?',
    respostas: [
      { texto: 'Uva-passa no arroz / natal', sinonimos_aceitos: ['Uva passa', 'Passas'], votos: 38 },
      { texto: 'Coentro no tempero', sinonimos_aceitos: ['Coentro'], votos: 28 },
      { texto: 'Jiló / Quiabo', sinonimos_aceitos: ['Jilo', 'Quiabo'], votos: 24 },
      { texto: 'Bife de fígado acebolado', sinonimos_aceitos: ['Figado', 'Bife de figado'], votos: 20 },
      { texto: 'Azeitona (na empada ou pizza)', sinonimos_aceitos: ['Azeitona'], votos: 18 },
      { texto: 'Abacaxi na pizza (Pizza Havaiana)', sinonimos_aceitos: ['Pizza de abacaxi', 'Abacaxi'], votos: 16 },
      { texto: 'Sushi / Peixe cru', sinonimos_aceitos: ['Sushi', 'Comida japonesa'], votos: 15 },
      { texto: 'Cebola crua', sinonimos_aceitos: ['Cebola'], votos: 14 },
      { texto: 'Buchada / Dobradinha / Mocotó', sinonimos_aceitos: ['Dobradinha', 'Buchada', 'Mocoto'], votos: 14 },
      { texto: 'Pequi / Açaí com gosto de terra', sinonimos_aceitos: ['Pequi', 'Acai', 'Chuchu'], votos: 13 }
    ]
  }
];

const COMIDA_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'FEIJOADA', palavras_proibidas: ['FEIJÃO', 'PRETO', 'PORCO', 'QUARTA', 'SÁBADO', 'COUVE', 'LARANJA'] },
  { palavra_alvo: 'COXINHA', palavras_proibidas: ['FRANGO', 'SALGADO', 'CATUPIRY', 'FESTA', 'FRITA', 'GOTA', 'MASSA'] },
  { palavra_alvo: 'CAIPIRINHA', palavras_proibidas: ['LIMÃO', 'CACHAÇA', 'GELO', 'AÇÚCAR', 'BEBIDA', 'ÁLCOOL', 'BRASIL'] },
  { palavra_alvo: 'TORRESMO', palavras_proibidas: ['PORCO', 'CROCANTE', 'GORDURA', 'BOTECO', 'FRITO', 'PELE', 'PURURUCA'] },
  { palavra_alvo: 'PÃO DE ALHO', palavras_proibidas: ['CHURRASCO', 'BRASA', 'QUEIJO', 'ENTRADA', 'ASSAR', 'CARNE', 'PASTA'] },
  { palavra_alvo: 'ACARAJÉ', palavras_proibidas: ['BAHIA', 'CAMARÃO', 'VATAPÁ', 'DENDÊ', 'BAIANA', 'PIMENTA', 'FEIJÃO'] },
  { palavra_alvo: 'BRIGADEIRO', palavras_proibidas: ['CHOCOLATE', 'LEITE CONDENSADO', 'GRANULADO', 'DOCE', 'FESTA', 'PANELA', 'ANIVERSÁRIO'] },
  { palavra_alvo: 'PASTEL DE FEIRA', palavras_proibidas: ['CALDO DE CANA', 'FRITO', 'QUEIJO', 'CARNE', 'MASSA', 'BARRACA', 'DOMINGO'] },
  { palavra_alvo: 'PUDIM', palavras_proibidas: ['LEITE CONDENSADO', 'CALDA', 'CARAMELO', 'SOBREMESA', 'FORNO', 'BURACO', 'DOCE'] },
  { palavra_alvo: 'PICANHA', palavras_proibidas: ['CHURRASCO', 'CARNE', 'GORDURA', 'BOI', 'ESPETO', 'SAL GROSSO', 'GRELHA'] }
];

const COMIDA_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Qual é a temperatura ideal em graus Celsius (°C) do óleo quente para fritar uma coxinha ou pastel sem encharcar?',
    valor_exato: 180,
    unidade: 'graus °C',
    curiosidade_explicacao: 'A fritura perfeita de salgados de boteco ocorre entre 175°C e 180°C!'
  },
  {
    pergunta: 'Quantos mililitros (ml) tem a garrafa tradicional de cerveja de mesa compartilhada nos botecos brasileiros?',
    valor_exato: 600,
    unidade: 'ml',
    curiosidade_explicacao: 'A clássica garrafa compartilhada nos botecos brasileiros com camisinha térmica tem exatos 600 ml!'
  },
  {
    pergunta: 'Quantas fatias tem uma pizza grande tradicional (35 cm) nas pizzarias brasileiras?',
    valor_exato: 8,
    unidade: 'fatias',
    curiosidade_explicacao: 'A pizza grande tradicional de 35cm no Brasil é cortada em exatamente 8 fatias!'
  },
  {
    pergunta: 'Quantas unidades vêm em uma caixa tradicional de ovos grandes vendida nos supermercados brasileiros?',
    valor_exato: 12,
    unidade: 'ovos',
    curiosidade_explicacao: 'A embalagem clássica de ovos nos mercados brasileiros é vendida por dúzia (12 unidades).'
  },
  {
    pergunta: 'Quantos mililitros (ml) tem uma lata padrão de refrigerante ou cerveja no Brasil?',
    valor_exato: 350,
    unidade: 'ml',
    curiosidade_explicacao: 'A lata tradicional padrão de refrigerante e cerveja no Brasil contém 350 ml.'
  },
  {
    pergunta: 'Quantos gramas pesa um pacote padrão tradicional de arroz tipo 1 de 5 kg?',
    valor_exato: 5000,
    unidade: 'gramas',
    curiosidade_explicacao: 'Um pacote de 5 quilos equivale a exatos 5.000 gramas.'
  }
];

const COMIDA_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Petiscos e porções clássicas servidas em cardápio de boteco',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Torresmo', 'Batata frita', 'Coxinha', 'Bolinho de bacalhau', 'Pastel', 'Calabresa acebolada',
      'Frango a passarinho', 'Mandioca frita', 'Isca de peixe', 'Provolone à milanesa', 'Amendoim',
      'Tremoço', 'Ovo de codorna', 'Salame', 'Azeitona', 'Quibe', 'Bolinho de feijoada', 'Moela',
      'Coração de frango', 'Pão de alho', 'Espetinho', 'Polenta frita', 'Camarão alho e óleo'
    ]
  },
  {
    categoria_secreta: 'Pratos e comidas típicas das regiões do Brasil',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Feijoada', 'Moqueca', 'Acarajé', 'Baião de dois', 'Pão de queijo', 'Feijão tropeiro',
      'Vaca atolada', 'Barreado', 'Arroz carreteiro', 'Churrasco', 'Tacacá', 'Pato no tucupi',
      'Carne de sol com macaxeira', 'Cuscuz', 'Tapioca', 'Vatapá', 'Bobó de camarão', 'Galinhada',
      'Pamonha', 'Curau', 'Bolo de rolo', 'Escondidinho', 'Buchada de bode', 'Virado à paulista'
    ]
  },
  {
    categoria_secreta: 'Frutas tropicais e comuns encontradas nas feiras do Brasil',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Banana', 'Maçã', 'Laranja', 'Manga', 'Abacaxi', 'Melancia', 'Mamão', 'Uva', 'Morango',
      'Limão', 'Maracujá', 'Goiaba', 'Caju', 'Acerola', 'Jabuticaba', 'Açaí', 'Coco', 'Abacate',
      'Pera', 'Pêssego', 'Kiwi', 'Melão', 'Tangerina / Mexerica', 'Pitaya', 'Caqui'
    ]
  },
  {
    categoria_secreta: 'Doces e sobremesas clássicas de festa de aniversário e padaria no Brasil',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Brigadeiro', 'Beijinho', 'Cajuzinho', 'Bem-casado', 'Pudim de leite', 'Mousse de maracujá',
      'Pavê', 'Torta de limão', 'Bolo de cenoura com chocolate', 'Quindim', 'Sonho de padaria',
      'Churros', 'Romeo e Julieta', 'Cocada', 'Paçoca', 'Pé de moleque', 'Canjica', 'Arroz doce', 'Doce de leite'
    ]
  },
  {
    categoria_secreta: 'Sabores clássicos de pizza das pizzarias brasileiras',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Calabresa', 'Muçarela', 'Portuguesa', 'Marguerita', 'Frango com Catupiry', 'Quatro Queijos',
      'Pepperoni', 'Napolitana', 'Toscana', 'Atum', 'Bacon', 'Milho', 'Palmito', 'Baiana',
      'Lombo Canadense', 'Brócolis', 'Rúcula com Tomate Seco', 'Chocolate com Morango', 'Romeu e Julieta', 'Banana com Canela'
    ]
  },
  {
    categoria_secreta: 'Cortes de carne e acompanhamentos clássicos de churrasco brasileiro',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Picanha', 'Fraldinha', 'Maminha', 'Alcatra', 'Contrafilé', 'Costela', 'Cupim', 'Pão de alho',
      'Queijo coalho', 'Coração de frango', 'Linguiça toscana', 'Asinha / Tulipa de frango',
      'Farofa', 'Vinagrete', 'Maionese de batata', 'Arroz branco', 'Abacaxi assado com canela'
    ]
  }
];

const COMIDA_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual petisco ou porção de boteco?' },
  { pergunta: 'Qual prato típico brasileiro?' },
  { pergunta: 'Qual sobremesa ou doce brasileiro?' },
  { pergunta: 'Qual comida para pedir no delivery?' },
  { pergunta: 'Qual sabor de pizza?' },
  { pergunta: 'Qual salgado de festa de aniversário?' }
];

// ============================================================================
// 2. ANIMAIS E NATUREZA BANK (Rich, specific & varied question angles!)
// ============================================================================

const ANIMAIS_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'Quais os nomes de cachorro mais comuns no Brasil?',
    respostas: [
      { texto: 'Thor', sinonimos_aceitos: ['Tor'], votos: 38 },
      { texto: 'Mel', sinonimos_aceitos: ['Melzinha'], votos: 30 },
      { texto: 'Rex', sinonimos_aceitos: ['Max', 'Rex'], votos: 24 },
      { texto: 'Bob / Toby', sinonimos_aceitos: ['Bob', 'Toby', 'Bobi'], votos: 20 },
      { texto: 'Nina / Luna', sinonimos_aceitos: ['Nina', 'Luna', 'Lola'], votos: 18 },
      { texto: 'Luke / Luck', sinonimos_aceitos: ['Luke', 'Luck', 'Lucky'], votos: 16 },
      { texto: 'Belinha / Bela', sinonimos_aceitos: ['Belinha', 'Bela'], votos: 15 },
      { texto: 'Bolinha / Totó', sinonimos_aceitos: ['Bolinha', 'Toto', 'Floquinho'], votos: 14 },
      { texto: 'Amora / Cacau', sinonimos_aceitos: ['Amora', 'Cacau', 'Pandora'], votos: 13 },
      { texto: 'Pipoca / Paçoca / Caramelo', sinonimos_aceitos: ['Pipoca', 'Pacoca', 'Caramelo', 'Simba', 'Zeus'], votos: 12 }
    ]
  },
  {
    pergunta: 'Quais os tipos de pets (animais de estimação) mais criados pelas famílias?',
    respostas: [
      { texto: 'Cachorro / Cão', sinonimos_aceitos: ['Cachorro', 'Cao', 'Vira-lata', 'Dog'], votos: 44 },
      { texto: 'Gato', sinonimos_aceitos: ['Gatinho', 'Bichano', 'Felino'], votos: 32 },
      { texto: 'Calopsita / Papagaio', sinonimos_aceitos: ['Passarinho', 'Papagaio', 'Calopsita', 'Periquito'], votos: 24 },
      { texto: 'Peixe de aquário (Betta / Dourado)', sinonimos_aceitos: ['Peixe', 'Peixinho', 'Aquario'], votos: 20 },
      { texto: 'Hamster', sinonimos_aceitos: ['Hamster', 'Ratinho'], votos: 18 },
      { texto: 'Porquinho-da-índia', sinonimos_aceitos: ['Porquinho da india', 'Preá'], votos: 15 },
      { texto: 'Tartaruga / Jabuti', sinonimos_aceitos: ['Tartaruga', 'Jabuti', 'Cagado'], votos: 13 },
      { texto: 'Coelho', sinonimos_aceitos: ['Coelhinho'], votos: 12 },
      { texto: 'Canário / Curió / Agapornis', sinonimos_aceitos: ['Canario', 'Passaro'], votos: 11 },
      { texto: 'Chinchila / Furão', sinonimos_aceitos: ['Chinchila', 'Furao'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais os tipos de pets exóticos que algumas pessoas criam em casa?',
    respostas: [
      { texto: 'Iguana / Camaleão', sinonimos_aceitos: ['Iguana', 'Camaleao', 'Lagarto'], votos: 36 },
      { texto: 'Cobra (Jiboia / Corn Snake)', sinonimos_aceitos: ['Cobra', 'Serpente', 'Jiboia'], votos: 28 },
      { texto: 'Furão (Ferret)', sinonimos_aceitos: ['Furao', 'Ferret'], votos: 24 },
      { texto: 'Aranha Caranguejeira / Tarântula', sinonimos_aceitos: ['Aranha', 'Tarantula', 'Caranguejeira'], votos: 20 },
      { texto: 'Mini Porco (Mini Pig)', sinonimos_aceitos: ['Porco', 'Mini porco', 'Porquinho'], votos: 18 },
      { texto: 'Cacatua / Arara / Tucano', sinonimos_aceitos: ['Cacatua', 'Arara', 'Tucano'], votos: 16 },
      { texto: 'Ouriço (Hedgehog)', sinonimos_aceitos: ['Ourico', 'Porco espinho'], votos: 15 },
      { texto: 'Gecko (Lagartixa-leopardo) / Dragão-barbudo', sinonimos_aceitos: ['Gecko', 'Dragao barbudo'], votos: 15 },
      { texto: 'Axolote / Salamandra', sinonimos_aceitos: ['Axolote', 'Sapo'], votos: 14 },
      { texto: 'Coruja / Falcão / Macaco Sagui', sinonimos_aceitos: ['Coruja', 'Sagui', 'Mico'], votos: 14 }
    ]
  },
  {
    pergunta: 'Quais os animais que as pessoas mais procuram ver em um zoológico?',
    respostas: [
      { texto: 'Leão', sinonimos_aceitos: ['Rei da selva', 'Leao'], votos: 38 },
      { texto: 'Girafa', sinonimos_aceitos: ['Girafas'], votos: 30 },
      { texto: 'Elefante', sinonimos_aceitos: ['Elefante africano'], votos: 24 },
      { texto: 'Macaco / Gorila / Chimpanzé', sinonimos_aceitos: ['Macaco', 'Gorila', 'Chimpanze'], votos: 22 },
      { texto: 'Tigre', sinonimos_aceitos: ['Tigre de bengala'], votos: 18 },
      { texto: 'Hipopótamo / Rinoceronte', sinonimos_aceitos: ['Hipopotamo', 'Rinoceronte'], votos: 16 },
      { texto: 'Zebra', sinonimos_aceitos: ['Zebras'], votos: 14 },
      { texto: 'Urso (Pardo / Polar / Panda)', sinonimos_aceitos: ['Urso', 'Panda'], votos: 13 },
      { texto: 'Onça-pintada', sinonimos_aceitos: ['Onca', 'Pantera'], votos: 13 },
      { texto: 'Pinguim / Jacaré / Cobra', sinonimos_aceitos: ['Pinguim', 'Jacare', 'Flamingo'], votos: 12 }
    ]
  },
  {
    pergunta: 'Quando falamos de mamíferos, qual o primeiro animal que vem à mente?',
    respostas: [
      { texto: 'Cachorro', sinonimos_aceitos: ['Cao', 'Cachorro'], votos: 38 },
      { texto: 'Leão', sinonimos_aceitos: ['Leao'], votos: 28 },
      { texto: 'Vaca / Boi (pelo leite)', sinonimos_aceitos: ['Vaca', 'Boi'], votos: 24 },
      { texto: 'Baleia (maior mamífero marinho)', sinonimos_aceitos: ['Baleia'], votos: 20 },
      { texto: 'Gato', sinonimos_aceitos: ['Gatinho'], votos: 18 },
      { texto: 'Elefante', sinonimos_aceitos: ['Elefantes'], votos: 16 },
      { texto: 'Macaco / Gorila', sinonimos_aceitos: ['Macaco', 'Gorila'], votos: 15 },
      { texto: 'Cavalo', sinonimos_aceitos: ['Egua'], votos: 14 },
      { texto: 'Golfinho', sinonimos_aceitos: ['Boto', 'Golfinhos'], votos: 14 },
      { texto: 'Morcego (único mamífero que voa) / Ser Humano', sinonimos_aceitos: ['Morcego', 'Humano', 'Canguru'], votos: 13 }
    ]
  },
  {
    pergunta: 'Quando falamos de répteis, qual o primeiro animal que vem à mente?',
    respostas: [
      { texto: 'Cobra / Serpente', sinonimos_aceitos: ['Cobra', 'Serpente', 'Cascavel', 'Sucuri'], votos: 42 },
      { texto: 'Jacaré / Crocodilo', sinonimos_aceitos: ['Jacare', 'Crocodilo'], votos: 32 },
      { texto: 'Tartaruga / Jabuti', sinonimos_aceitos: ['Tartaruga', 'Jabuti', 'Cagado'], votos: 24 },
      { texto: 'Lagartixa / Lagarto', sinonimos_aceitos: ['Lagartixa', 'Lagarto', 'Calango'], votos: 20 },
      { texto: 'Iguana', sinonimos_aceitos: ['Iguana verde'], votos: 18 },
      { texto: 'Camaleão', sinonimos_aceitos: ['Camaleao'], votos: 16 },
      { texto: 'Dragão-de-komodo', sinonimos_aceitos: ['Dragao de komodo', 'Komodo'], votos: 14 },
      { texto: 'Teiú / Teju', sinonimos_aceitos: ['Teiu', 'Teju'], votos: 12 },
      { texto: 'Dinossauro (T-Rex / Velociraptor)', sinonimos_aceitos: ['Dinossauro'], votos: 11 },
      { texto: 'Jiboia / Naja', sinonimos_aceitos: ['Jiboia', 'Naja'], votos: 11 }
    ]
  },
  {
    pergunta: 'Na pergunta "Se você fosse um animal, qual seria?", o que as pessoas mais respondem?',
    respostas: [
      { texto: 'Águia / Falcão (para poder voar)', sinonimos_aceitos: ['Aguia', 'Falcao', 'Passaro', 'Passarinho'], votos: 38 },
      { texto: 'Leão (rei da selva)', sinonimos_aceitos: ['Leao'], votos: 30 },
      { texto: 'Gato (para dormir e ter vida mansa)', sinonimos_aceitos: ['Gato', 'Gatinho'], votos: 26 },
      { texto: 'Cachorro de madame (mimado e amado)', sinonimos_aceitos: ['Cachorro', 'Cao'], votos: 22 },
      { texto: 'Golfinho / Tubarão (viver livre no mar)', sinonimos_aceitos: ['Golfinho', 'Tubarao'], votos: 18 },
      { texto: 'Lobo (espírito livre / alcateia)', sinonimos_aceitos: ['Lobo'], votos: 16 },
      { texto: 'Tigre / Pantera / Onça', sinonimos_aceitos: ['Tigre', 'Pantera', 'Onca'], votos: 14 },
      { texto: 'Cavalo selvagem (correr livre)', sinonimos_aceitos: ['Cavalo'], votos: 13 },
      { texto: 'Bicho-preguiça / Coala (só dormir)', sinonimos_aceitos: ['Preguica', 'Bicho preguica', 'Coala'], votos: 12 },
      { texto: 'Urso (para hibernar no frio) / Borboleta', sinonimos_aceitos: ['Urso', 'Borboleta'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais os animais mais venenosos ou peçonhentos do mundo?',
    respostas: [
      { texto: 'Cobra (Naja / Cascavel / Coral / Taipan)', sinonimos_aceitos: ['Cobra', 'Naja', 'Cascavel', 'Jararaca', 'Coral'], votos: 42 },
      { texto: 'Aranha (Armadeira / Viúva-negra / Marrom)', sinonimos_aceitos: ['Aranha', 'Armadeira', 'Viuva negra'], votos: 32 },
      { texto: 'Escorpião (Escorpião-amarelo)', sinonimos_aceitos: ['Escorpiao'], votos: 26 },
      { texto: 'Água-viva / Caravela (Vespa-do-mar)', sinonimos_aceitos: ['Agua viva', 'Agua-viva', 'Caravela'], votos: 20 },
      { texto: 'Sapo-dourado / Rã-flecha-venenosa', sinonimos_aceitos: ['Sapo', 'Ra', 'Sapo colorido'], votos: 18 },
      { texto: 'Baiacu / Peixe-pedra / Peixe-leão', sinonimos_aceitos: ['Baiacu', 'Peixe pedra', 'Peixe'], votos: 15 },
      { texto: 'Polvo-de-anéis-azuis', sinonimos_aceitos: ['Polvo'], votos: 13 },
      { texto: 'Abelha / Vespa / Marimbondo', sinonimos_aceitos: ['Abelha', 'Vespa', 'Marimbondo'], votos: 12 },
      { texto: 'Taturana / Lagarta-de-fogo / Lacraia', sinonimos_aceitos: ['Taturana', 'Lagarta', 'Lacraia', 'Centopeia'], votos: 11 },
      { texto: 'Arraia / Dragão-de-komodo', sinonimos_aceitos: ['Arraia', 'Komodo'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais os menores insetos ou bichinhos minúsculos que todo mundo conhece?',
    respostas: [
      { texto: 'Formiga', sinonimos_aceitos: ['Formiguinha'], votos: 40 },
      { texto: 'Pulga', sinonimos_aceitos: ['Pulgas'], votos: 28 },
      { texto: 'Mosquito / Pernilongo / Borrachudo', sinonimos_aceitos: ['Mosquito', 'Pernilongo', 'Muriçoca', 'Borrachudo'], votos: 24 },
      { texto: 'Piolho', sinonimos_aceitos: ['Lendea', 'Piolho'], votos: 20 },
      { texto: 'Mosquitinho de fruta / Mosca', sinonimos_aceitos: ['Mosca', 'Mosquitinho'], votos: 18 },
      { texto: 'Cupim', sinonimos_aceitos: ['Aleluia', 'Siriri'], votos: 16 },
      { texto: 'Joaninha', sinonimos_aceitos: ['Joaninhas'], votos: 15 },
      { texto: 'Carrapato / Ácaro / Bicho-de-pé', sinonimos_aceitos: ['Carrapato', 'Acaro', 'Bicho de pe', 'Micuim'], votos: 14 },
      { texto: 'Abelha Jataí (sem ferrão)', sinonimos_aceitos: ['Abelha', 'Jatai'], votos: 13 },
      { texto: 'Pulgão / Percevejo / Traça', sinonimos_aceitos: ['Pulgao', 'Percevejo', 'Traca'], votos: 12 }
    ]
  },
  {
    pergunta: 'Quais nomes de animais também são usados como apelidos ou xingamentos no Brasil?',
    respostas: [
      { texto: 'Burro / Jumento / Asno', sinonimos_aceitos: ['Burro', 'Jumento', 'Jegue', 'Mula'], votos: 38 },
      { texto: 'Anta', sinonimos_aceitos: ['Anta'], votos: 28 },
      { texto: 'Cachorro / Cão', sinonimos_aceitos: ['Cachorro', 'Vira-lata'], votos: 24 },
      { texto: 'Vaca / Piranha / Galinha', sinonimos_aceitos: ['Vaca', 'Galinha', 'Piranha'], votos: 20 },
      { texto: 'Cobra / Jararaca / Cascavel (falso)', sinonimos_aceitos: ['Cobra', 'Jararaca', 'Cascavel', 'Vibora'], votos: 18 },
      { texto: 'Porco (desorganizado)', sinonimos_aceitos: ['Porco', 'Suino'], votos: 16 },
      { texto: 'Cavalo (bruto / grosseiro)', sinonimos_aceitos: ['Cavalo'], votos: 15 },
      { texto: 'Gato / Gata (elogio de beleza)', sinonimos_aceitos: ['Gato', 'Gata', 'Gatinho'], votos: 15 },
      { texto: 'Traíra / Rato (falso)', sinonimos_aceitos: ['Traira', 'Rato', 'Ratazana'], votos: 14 },
      { texto: 'Frango (goleiro) / Baleia / Preguiça', sinonimos_aceitos: ['Frango', 'Preguica', 'Lesma', 'Tartaruga'], votos: 12 }
    ]
  },
  {
    pergunta: 'Além de "piu-piu", qual outro som famoso um animal faz?',
    respostas: [
      { texto: 'Au-au (Cachorro)', sinonimos_aceitos: ['Au au', 'Latido', 'Cachorro'], votos: 40 },
      { texto: 'Miau (Gato)', sinonimos_aceitos: ['Miau', 'Miado', 'Gato'], votos: 30 },
      { texto: 'Muuu (Vaca / Boi)', sinonimos_aceitos: ['Muuu', 'Mu', 'Mugido', 'Vaca'], votos: 24 },
      { texto: 'Cocoricó / Có-có-ri-có (Galo)', sinonimos_aceitos: ['Cocorico', 'Co co', 'Galo', 'Galinha'], votos: 20 },
      { texto: 'Quá-quá (Pato)', sinonimos_aceitos: ['Qua qua', 'Quack', 'Pato'], votos: 18 },
      { texto: 'Oinc-oinc / Ronc (Porco)', sinonimos_aceitos: ['Oinc', 'Ronc', 'Porco'], votos: 16 },
      { texto: 'Mééé / Bééé (Ovelha / Cabra)', sinonimos_aceitos: ['Meee', 'Beee', 'Ovelha', 'Bode'], votos: 15 },
      { texto: 'Roar / Rugido (Leão)', sinonimos_aceitos: ['Rugido', 'Roar', 'Leao'], votos: 13 },
      { texto: 'Relincho / Iiirrrrí (Cavalo)', sinonimos_aceitos: ['Relincho', 'Cavalo', 'Pocoto'], votos: 12 },
      { texto: 'Croac / Coachar (Sapo) / Bzzz (Abelha)', sinonimos_aceitos: ['Croac', 'Sapo', 'Zumbido', 'Abelha'], votos: 12 }
    ]
  },
  {
    pergunta: 'Se Luciano Huck adotasse mais um cachorro, que nome ele daria?',
    respostas: [
      { texto: 'Thor', sinonimos_aceitos: ['Tor'], votos: 36 },
      { texto: 'Louro / Lourinho', sinonimos_aceitos: ['Louro', 'Louro Jose'], votos: 28 },
      { texto: 'Caldeirão / Domingão', sinonimos_aceitos: ['Caldeirao', 'Domingao'], votos: 24 },
      { texto: 'Caramelo', sinonimos_aceitos: ['Vira lata caramelo'], votos: 20 },
      { texto: 'Huck / Huckinho', sinonimos_aceitos: ['Huck'], votos: 18 },
      { texto: 'Pipoca / Paçoca', sinonimos_aceitos: ['Pipoca', 'Pacoca'], votos: 16 },
      { texto: 'Bob / Rex', sinonimos_aceitos: ['Bob', 'Rex'], votos: 15 },
      { texto: 'Simba', sinonimos_aceitos: ['Simba'], votos: 15 },
      { texto: 'Pinta / Pintinha (pinta da Angélica)', sinonimos_aceitos: ['Pinta', 'Angelica'], votos: 14 },
      { texto: 'Lata Velha / Milionário', sinonimos_aceitos: ['Lata velha', 'Milionario', 'Zeus'], votos: 14 }
    ]
  }
];

const ANIMAIS_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'LEÃO', palavras_proibidas: ['REI', 'SELVA', 'JUBA', 'SIMBA', 'RUGIDO', 'ÁFRICA', 'FELINO'] },
  { palavra_alvo: 'GIRAFA', palavras_proibidas: ['PESCOÇO', 'ALTA', 'MANCHAS', 'SAVANA', 'FOLHAS', 'ZOOLÓGICO', 'GRANDE'] },
  { palavra_alvo: 'CACHORRO', palavras_proibidas: ['LATIR', 'OSSO', 'PET', 'GATO', 'AMIGO', 'COLEIRA', 'PATAS'] },
  { palavra_alvo: 'ELEFANTE', palavras_proibidas: ['TROMBA', 'ORELHA', 'GRANDE', 'MARFIM', 'CINZA', 'DUMBO', 'PESADO'] },
  { palavra_alvo: 'TUBARÃO', palavras_proibidas: ['MAR', 'DENTES', 'BARBATANA', 'PRAIA', 'OCEANO', 'SANGUE', 'PEIXE'] },
  { palavra_alvo: 'CANGURU', palavras_proibidas: ['AUSTRÁLIA', 'PULAR', 'BOLSA', 'FILHOTE', 'BOXE', 'SALTAR', 'PATAS'] },
  { palavra_alvo: 'PAPAGAIO', palavras_proibidas: ['FALAR', 'AVE', 'VERDE', 'LORO', 'REPETIR', 'PENA', 'BICO'] },
  { palavra_alvo: 'CAMALEÃO', palavras_proibidas: ['COR', 'MUDAR', 'CAMUFLAGEM', 'LAGARTO', 'LÍNGUA', 'RÉPTIL', 'OLHOS'] },
  { palavra_alvo: 'PINGUIM', palavras_proibidas: ['GELO', 'FRIO', 'ANTÁRTIDA', 'AVE', 'VOAR', 'SMOKING', 'NEVE'] },
  { palavra_alvo: 'ABELHA', palavras_proibidas: ['MEL', 'COLMEIA', 'FERRÃO', 'RAINHA', 'FLOR', 'AMARELA', 'ZUMBIDO'] },
  { palavra_alvo: 'CAPIVARA', palavras_proibidas: ['ROEDOR', 'BRASIL', 'LAGOA', 'GRANDE', 'GRAMA', 'CARRAPATO', 'MANSA'] },
  { palavra_alvo: 'BALEIA', palavras_proibidas: ['OCEANO', 'GIGANTE', 'MAMÍFERO', 'ÁGUA', 'JUBARTE', 'AZUL', 'ESGUICHO'] }
];

const ANIMAIS_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Qual é a velocidade máxima aproximada (em km/h) que um guepardo (o mamífero terrestre mais rápido) atinge numa caçada?',
    valor_exato: 120,
    unidade: 'km/h',
    curiosidade_explicacao: 'O guepardo acelera de 0 a 100 km/h em 3 segundos e alcança até 120 km/h!'
  },
  {
    pergunta: 'Quantos meses dura a gestação de uma mamãe elefante-africano (a mais longa entre os mamíferos terrestres)?',
    valor_exato: 22,
    unidade: 'meses',
    curiosidade_explicacao: 'Os elefantes carregam seus filhotes na barriga por quase 2 anos (22 meses).'
  },
  {
    pergunta: 'Quantos corações possui um polvo no fundo do mar?',
    valor_exato: 3,
    unidade: 'corações',
    curiosidade_explicacao: 'O polvo tem 3 corações: dois bombeiam sangue para as brânquias e um para o resto do corpo!'
  },
  {
    pergunta: 'Quantas horas por dia, em média, um coala passa dormindo ou descansando nos galhos de eucalipto?',
    valor_exato: 20,
    unidade: 'horas',
    curiosidade_explicacao: 'Por conta da dieta de folhas de eucalipto de baixa caloria, coalas dormem cerca de 20 horas por dia.'
  },
  {
    pergunta: 'Quantas patas possui uma aranha (ou qualquer aracnídeo adulto)?',
    valor_exato: 8,
    unidade: 'patas',
    curiosidade_explicacao: 'Diferente dos insetos (que têm 6 patas), todos os aracnídeos possuem 8 patas!'
  },
  {
    pergunta: 'Quantas patas possui um inseto adulto (como a formiga, abelha ou besouro)?',
    valor_exato: 6,
    unidade: 'patas',
    curiosidade_explicacao: 'Todos os insetos adultos possuem exatamente 3 pares de patas, totalizando 6 patas.'
  },
  {
    pergunta: 'Quantos estômagos (compartimentos gástricos) possui uma vaca ou boi para digerir o capim?',
    valor_exato: 4,
    unidade: 'compartimentos',
    curiosidade_explicacao: 'Os ruminantes possuem 4 cavidades estomacais: rúmen, retículo, omaso e abomaso.'
  }
];

const ANIMAIS_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Animais mamíferos de grande porte da África ou Brasil',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Leão', 'Elefante', 'Girafa', 'Hipopótamo', 'Rinoceronte', 'Zebra', 'Gorila', 'Guepardo',
      'Leopardo', 'Hiena', 'Búfalo', 'Onça-pintada', 'Anta', 'Capivara', 'Tamanduá-bandeira',
      'Lobo-guará', 'Cervo', 'Chimpanzé', 'Javali', 'Camelo', 'Dromedário'
    ]
  },
  {
    categoria_secreta: 'Raças famosas de cachorros conhecidas no Brasil',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Pastor Alemão', 'Golden Retriever', 'Labrador', 'Poodle', 'Pinscher', 'Bulldog Francês',
      'Shih Tzu', 'Yorkshire', 'Pug', 'Rottweiler', 'Pitbull', 'Dachshund (Salsicha)', 'Beagle',
      'Husky Siberiano', 'Dálmata', 'Chihuahua', 'São Bernardo', 'Akita', 'Fila Brasileiro', 'Lulu da Pomerânia'
    ]
  },
  {
    categoria_secreta: 'Aves e pássaros conhecidos no Brasil e no mundo',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Papagaio', 'Arara', 'Tucano', 'Beija-flor', 'Bem-te-vi', 'Sabiá', 'João-de-barro',
      'Canário', 'Calopsita', 'Coruja', 'Águia', 'Falcão', 'Gavião', 'Urubu', 'Pombo',
      'Pardal', 'Andorinha', 'Pinguim', 'Avestruz', 'Ema', 'Flamingo', 'Pavão', 'Cisne', 'Pato', 'Galinha'
    ]
  },
  {
    categoria_secreta: 'Animais marinhos e criaturas que vivem no oceano',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Baleia', 'Golfinho', 'Tubarão', 'Polvo', 'Lula', 'Água-viva', 'Tartaruga marinha',
      'Cavalo-marinho', 'Estrela-do-mar', 'Caranguejo', 'Siri', 'Lagosta', 'Camarão',
      'Arraia', 'Foca', 'Leão-marinho', 'Orca', 'Peixe-palhaço', 'Baiacu', 'Enguia', 'Ouriço-do-mar'
    ]
  },
  {
    categoria_secreta: 'Insetos, aracnídeos e bichinhos de jardim',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Formiga', 'Abelha', 'Vespa / Marimbondo', 'Borboleta', 'Mariposa', 'Joaninha', 'Besouro',
      'Grilo', 'Gafanhoto', 'Louva-a-deus', 'Libélula', 'Mosquito / Pernilongo', 'Mosca',
      'Cigarra', 'Vagalume', 'Cupim', 'Barata', 'Aranha', 'Escorpião', 'Centopeia / Lacraia', 'Minhoca', 'Caracol'
    ]
  },
  {
    categoria_secreta: 'Animais criados em fazenda, sítio ou roça',
    total_itens_possiveis: 20,
    exemplos_validos: [
      'Vaca', 'Boi', 'Cavalo', 'Égua', 'Porco', 'Galinha', 'Galo', 'Pintinho', 'Ovelha',
      'Carneiro', 'Cabra', 'Bode', 'Pato', 'Ganso', 'Peru', 'Jumento / Jegue', 'Mula', 'Coelho', 'Cachorro', 'Gato'
    ]
  }
];

const ANIMAIS_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual ave ou animal voador?' },
  { pergunta: 'Qual animal mamífero da natureza?' },
  { pergunta: 'Qual animal de estimação (pet)?' },
  { pergunta: 'Qual predador da selva ou savana?' },
  { pergunta: 'Qual criatura marinha do oceano?' },
  { pergunta: 'Qual inseto ou bicho de jardim?' }
];

// ============================================================================
// 3. FUTEBOL, CINEMA, MÚSICA, GAMES, CIÊNCIA & POP CULTURE BANKS (10 answers!)
// ============================================================================

const FUTEBOL_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'Quais os maiores craques e lendas da história da Seleção Brasileira?',
    respostas: [
      { texto: 'Pelé', sinonimos_aceitos: ['Rei Pele', 'Edson Arantes'], votos: 42 },
      { texto: 'Ronaldo Fenômeno', sinonimos_aceitos: ['Ronaldo', 'Fenomeno', 'R9'], votos: 30 },
      { texto: 'Ronaldinho Gaúcho', sinonimos_aceitos: ['Ronaldinho', 'Bruxo', 'R10'], votos: 24 },
      { texto: 'Romário', sinonimos_aceitos: ['Baixinho', 'Romario'], votos: 20 },
      { texto: 'Neymar Jr', sinonimos_aceitos: ['Neymar', 'Menino Ney'], votos: 18 },
      { texto: 'Garrincha', sinonimos_aceitos: ['Mane Garrincha'], votos: 16 },
      { texto: 'Zico', sinonimos_aceitos: ['Galinho'], votos: 15 },
      { texto: 'Rivaldo', sinonimos_aceitos: ['Rivaldo 10'], votos: 13 },
      { texto: 'Cafu', sinonimos_aceitos: ['Roberto Carlos', 'Lateral'], votos: 11 },
      { texto: 'Kaká', sinonimos_aceitos: ['Bebeto', 'Taffarel'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais os clubes brasileiros com as maiores e mais fanáticas torcidas do país?',
    respostas: [
      { texto: 'Flamengo', sinonimos_aceitos: ['Mengao', 'Fla'], votos: 40 },
      { texto: 'Corinthians', sinonimos_aceitos: ['Timao', 'Corintians'], votos: 34 },
      { texto: 'São Paulo', sinonimos_aceitos: ['Tricolor Paulista', 'Sao Paulo'], votos: 24 },
      { texto: 'Palmeiras', sinonimos_aceitos: ['Verdao', 'Porco'], votos: 22 },
      { texto: 'Vasco da Gama', sinonimos_aceitos: ['Vasco', 'Gigante da Colina'], votos: 18 },
      { texto: 'Cruzeiro', sinonimos_aceitos: ['Cabuloso', 'Raposa'], votos: 15 },
      { texto: 'Grêmio', sinonimos_aceitos: ['Gremio', 'Imortal'], votos: 14 },
      { texto: 'Atlético Mineiro', sinonimos_aceitos: ['Galo', 'Atletico MG'], votos: 12 },
      { texto: 'Bahia', sinonimos_aceitos: ['Sport', 'Fortaleza', 'Esquadrao'], votos: 11 },
      { texto: 'Internacional', sinonimos_aceitos: ['Santos', 'Botafogo', 'Fluminense', 'Inter'], votos: 10 }
    ]
  },
  {
    pergunta: 'Quais os jogadores mais lembrados quando o assunto é cobrança de pênalti?',
    respostas: [
      { texto: 'Neymar Jr', sinonimos_aceitos: ['Neymar', 'Ney'], votos: 38 },
      { texto: 'Cristiano Ronaldo', sinonimos_aceitos: ['CR7', 'Cristiano'], votos: 30 },
      { texto: 'Lionel Messi', sinonimos_aceitos: ['Messi'], votos: 22 },
      { texto: 'Rogério Ceni', sinonimos_aceitos: ['Ceni', 'Rogerio Ceni'], votos: 20 },
      { texto: 'Marcelinho Carioca', sinonimos_aceitos: ['Marcelinho', 'Pe de anjo'], votos: 18 },
      { texto: 'Juninho Pernambucano', sinonimos_aceitos: ['Juninho', 'Reizinho'], votos: 16 },
      { texto: 'Roberto Carlos', sinonimos_aceitos: ['Roberto Carlos'], votos: 15 },
      { texto: 'Ronaldinho Gaúcho', sinonimos_aceitos: ['Ronaldinho'], votos: 15 },
      { texto: 'Zico', sinonimos_aceitos: ['Galinho'], votos: 13 },
      { texto: 'Raphael Veiga', sinonimos_aceitos: ['Veiga', 'Gabigol', 'Marcos Assuncao', 'Henrique Dourado'], votos: 13 }
    ]
  },
  {
    pergunta: 'O que o torcedor brasileiro mais consome ou faz quando vai ao estádio de futebol?',
    respostas: [
      { texto: 'Cerveja gelada', sinonimos_aceitos: ['Chopp', 'Bebida'], votos: 38 },
      { texto: 'Cantar o hino e gritar gol', sinonimos_aceitos: ['Cantar', 'Gritar', 'Torcer'], votos: 28 },
      { texto: 'Feijão tropeiro', sinonimos_aceitos: ['Cachorro quente', 'Pernil', 'Lanche', 'Tropeiro'], votos: 24 },
      { texto: 'Vestir a camisa oficial do time', sinonimos_aceitos: ['Camisa', 'Manto'], votos: 20 },
      { texto: 'Xingar o juiz', sinonimos_aceitos: ['Juiz', 'Arbitro'], votos: 18 },
      { texto: 'Amendoim', sinonimos_aceitos: ['Pipoca', 'Picole'], votos: 16 },
      { texto: 'Abraçar desconhecido na hora do gol', sinonimos_aceitos: ['Abracar', 'Comemorar'], votos: 15 },
      { texto: 'Tirar foto', sinonimos_aceitos: ['Foto', 'Celular', 'Video'], votos: 14 },
      { texto: 'Rezar nos acréscimos', sinonimos_aceitos: ['Rezar', 'Sofrer'], votos: 14 },
      { texto: 'Sinalizador', sinonimos_aceitos: ['Bandeira', 'Bandeirao', 'Faixa'], votos: 13 }
    ]
  }
];

const CINEMA_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'Quais os super-heróis mais famosos dos cinemas?',
    respostas: [
      { texto: 'Homem-Aranha', sinonimos_aceitos: ['Spiderman', 'Peter Parker', 'Aranha'], votos: 40 },
      { texto: 'Batman', sinonimos_aceitos: ['Bruce Wayne', 'Homem Morcego'], votos: 32 },
      { texto: 'Superman', sinonimos_aceitos: ['Super-Homem', 'Clark Kent'], votos: 24 },
      { texto: 'Homem de Ferro', sinonimos_aceitos: ['Iron Man', 'Tony Stark'], votos: 20 },
      { texto: 'Capitão América', sinonimos_aceitos: ['Capitao America', 'Steve Rogers'], votos: 18 },
      { texto: 'Hulk', sinonimos_aceitos: ['Bruce Banner', 'Incrivel Hulk'], votos: 16 },
      { texto: 'Thor', sinonimos_aceitos: ['Deus do Trovao'], votos: 14 },
      { texto: 'Mulher-Maravilha', sinonimos_aceitos: ['Wonder Woman', 'Diana'], votos: 13 },
      { texto: 'Wolverine', sinonimos_aceitos: ['Logan', 'X-Men'], votos: 12 },
      { texto: 'Pantera Negra', sinonimos_aceitos: ['Flash', 'Deadpool'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais as séries mais comentadas pelos brasileiros?',
    respostas: [
      { texto: 'Chaves', sinonimos_aceitos: ['Chapolin', 'El Chavo'], votos: 38 },
      { texto: 'Stranger Things', sinonimos_aceitos: ['Eleven', 'Mundo Invertido'], votos: 28 },
      { texto: 'Game of Thrones', sinonimos_aceitos: ['GOT', 'Guerra dos Tronos'], votos: 24 },
      { texto: 'Breaking Bad', sinonimos_aceitos: ['Walter White', 'Heisenberg'], votos: 22 },
      { texto: 'Todo Mundo Odeia o Chris', sinonimos_aceitos: ['Chris', 'Julius'], votos: 20 },
      { texto: 'Friends', sinonimos_aceitos: ['Friends'], votos: 16 },
      { texto: 'La Casa de Papel', sinonimos_aceitos: ['Casa de Papel', 'Professor'], votos: 15 },
      { texto: 'Round 6', sinonimos_aceitos: ['Squid Game', 'Batatinha frita 123'], votos: 13 },
      { texto: 'The Walking Dead', sinonimos_aceitos: ['The Boys', 'Zumbi'], votos: 12 },
      { texto: 'Eu, a Patroa e as Crianças', sinonimos_aceitos: ['Patroa', 'Greys Anatomy', 'A Grande Familia'], votos: 12 }
    ]
  },
  {
    pergunta: 'Quais as animações mais amadas de todos os tempos?',
    respostas: [
      { texto: 'O Rei Leão', sinonimos_aceitos: ['Rei Leao', 'Simba'], votos: 40 },
      { texto: 'Toy Story', sinonimos_aceitos: ['Woody', 'Buzz Lightyear'], votos: 30 },
      { texto: 'Shrek', sinonimos_aceitos: ['Burro', 'Fiona', 'Shrek'], votos: 26 },
      { texto: 'Procurando Nemo', sinonimos_aceitos: ['Nemo', 'Dory'], votos: 20 },
      { texto: 'Frozen', sinonimos_aceitos: ['Elsa', 'Olaf', 'Let it go'], votos: 18 },
      { texto: 'Monstros S.A.', sinonimos_aceitos: ['Sullivan', 'Mike Wazowski', 'Boo'], votos: 16 },
      { texto: 'A Era do Gelo', sinonimos_aceitos: ['Sid', 'Scrat', 'Manny'], votos: 14 },
      { texto: 'Divertida Mente', sinonimos_aceitos: ['Alegria', 'Ansiedade', 'Divertidamente'], votos: 13 },
      { texto: 'Os Incríveis', sinonimos_aceitos: ['Incriveis', 'Gelado'], votos: 12 },
      { texto: 'Carros', sinonimos_aceitos: ['Relampago McQueen', 'Meu Malvado Favorito', 'Minions'], votos: 11 }
    ]
  },
  {
    pergunta: 'O que as pessoas mais consomem quando vão ao cinema?',
    respostas: [
      { texto: 'Pipoca com manteiga', sinonimos_aceitos: ['Pipoca', 'Pipoca salgada'], votos: 46 },
      { texto: 'Refrigerante', sinonimos_aceitos: ['Coca', 'Guarana', 'Refri'], votos: 30 },
      { texto: 'Chocolate', sinonimos_aceitos: ['MMs', 'KitKat', 'Bombom', 'Barra de chocolate'], votos: 24 },
      { texto: 'Bala de goma', sinonimos_aceitos: ['Fini', 'Bala', 'Jujuba', 'Mentos'], votos: 20 },
      { texto: 'Salgadinho', sinonimos_aceitos: ['Biscoito', 'Doritos', 'Chips'], votos: 18 },
      { texto: 'Nachos com cheddar', sinonimos_aceitos: ['Nachos', 'Cheddar'], votos: 15 },
      { texto: 'Hambúrguer', sinonimos_aceitos: ['Fast-food', 'McDonalds', 'Burger King'], votos: 13 },
      { texto: 'Amendoim japonês', sinonimos_aceitos: ['Amendoim', 'Castanha'], votos: 12 },
      { texto: 'Água mineral', sinonimos_aceitos: ['Agua', 'Suco'], votos: 11 },
      { texto: 'Pipoca doce', sinonimos_aceitos: ['Sorvete', 'Milkshake', 'Churros'], votos: 11 }
    ]
  }
];

const MUSICA_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'Quais as músicas brasileiras mais cantadas em karaokê?',
    respostas: [
      { texto: 'Evidências (Chitãozinho & Xororó)', sinonimos_aceitos: ['Evidencias', 'Chitaozinho'], votos: 44 },
      { texto: 'Cheia de Manias (Raça Negra)', sinonimos_aceitos: ['Cheia de manias', 'Raca Negra', 'Didididiê'], votos: 30 },
      { texto: 'Boate Azul', sinonimos_aceitos: ['Boate azul'], votos: 22 },
      { texto: 'Anna Júlia (Los Hermanos)', sinonimos_aceitos: ['Ana Julia', 'Anna Julia'], votos: 20 },
      { texto: 'Tempo Perdido (Legião Urbana)', sinonimos_aceitos: ['Tempo perdido', 'Legiao Urbana', 'Eduardo e Monica'], votos: 18 },
      { texto: 'Garçom (Reginaldo Rossi)', sinonimos_aceitos: ['Garcom', 'Reginaldo Rossi'], votos: 16 },
      { texto: 'Tá Escrito (Grupo Revelação)', sinonimos_aceitos: ['Ta escrito', 'Revelacao'], votos: 14 },
      { texto: 'Dormi na Praça (Bruno & Marrone)', sinonimos_aceitos: ['Dormi na praca', 'Bruno e Marrone'], votos: 13 },
      { texto: 'Pelados em Santos (Mamonas Assassinas)', sinonimos_aceitos: ['Mamonas', 'Brasilia amarela'], votos: 12 },
      { texto: 'Descobridor dos Sete Mares (Tim Maia)', sinonimos_aceitos: ['Tim Maia', 'Sete mares', 'Nao Quero Dinheiro'], votos: 11 }
    ]
  },
  {
    pergunta: 'Com qual cantor(a) sertanejo(a) você viveria uma história de amor?',
    respostas: [
      { texto: 'Luan Santana', sinonimos_aceitos: ['Luan'], votos: 38 },
      { texto: 'Gusttavo Lima', sinonimos_aceitos: ['Gusttavo Lima', 'Gustavo Lima', 'Embaixador'], votos: 30 },
      { texto: 'Ana Castela', sinonimos_aceitos: ['Ana Castela', 'Boiadeira'], votos: 24 },
      { texto: 'Jorge', sinonimos_aceitos: ['Jorge e Mateus'], votos: 20 },
      { texto: 'Henrique', sinonimos_aceitos: ['Juliano', 'Henrique e Juliano'], votos: 18 },
      { texto: 'Leonardo', sinonimos_aceitos: ['Cantor Leonardo'], votos: 16 },
      { texto: 'Simone Mendes', sinonimos_aceitos: ['Maiara', 'Maraisa', 'Lauana Prado'], votos: 15 },
      { texto: 'Gustavo Mioto', sinonimos_aceitos: ['Mioto', 'Gustavo Mioto'], votos: 14 },
      { texto: 'Zé Felipe', sinonimos_aceitos: ['Murilo Huff', 'Luan Pereira'], votos: 13 },
      { texto: 'Zezé Di Camargo', sinonimos_aceitos: ['Daniel', 'Paula Fernandes', 'Chitaozinho'], votos: 12 }
    ]
  },
  {
    pergunta: 'Quais os estilos musicais mais escutados em festas no Brasil?',
    respostas: [
      { texto: 'Sertanejo', sinonimos_aceitos: ['Sertanejo universitario', 'Modao'], votos: 38 },
      { texto: 'Pagode', sinonimos_aceitos: ['Samba'], votos: 32 },
      { texto: 'Funk', sinonimos_aceitos: ['Funk carioca', 'Funk paulista'], votos: 24 },
      { texto: 'Forró', sinonimos_aceitos: ['Piseiro', 'Xote'], votos: 20 },
      { texto: 'Música Eletrônica', sinonimos_aceitos: ['Pop', 'Eletronica', 'DJ'], votos: 18 },
      { texto: 'Rock Nacional', sinonimos_aceitos: ['Rock'], votos: 16 },
      { texto: 'MPB', sinonimos_aceitos: ['Musica Popular Brasileira'], votos: 15 },
      { texto: 'Axé', sinonimos_aceitos: ['Carnaval', 'Marchinha'], votos: 13 },
      { texto: 'Trap', sinonimos_aceitos: ['Rap', 'Hip-Hop'], votos: 12 },
      { texto: 'Reggae', sinonimos_aceitos: ['Arrocha', 'Brega'], votos: 12 }
    ]
  }
];

const GAMES_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'Quais os personagens mais famosos da história dos videogames?',
    respostas: [
      { texto: 'Mario', sinonimos_aceitos: ['Super Mario', 'Luigi'], votos: 40 },
      { texto: 'Sonic', sinonimos_aceitos: ['Sonic the Hedgehog'], votos: 30 },
      { texto: 'Pikachu', sinonimos_aceitos: ['Pokemon'], votos: 24 },
      { texto: 'Kratos', sinonimos_aceitos: ['God of War', 'Bom de Guerra'], votos: 20 },
      { texto: 'CJ (Carl Johnson)', sinonimos_aceitos: ['CJ', 'Trevor', 'GTA'], votos: 18 },
      { texto: 'Link', sinonimos_aceitos: ['Zelda', 'Link Zelda'], votos: 16 },
      { texto: 'Pac-Man', sinonimos_aceitos: ['Come-come', 'Pacman'], votos: 15 },
      { texto: 'Ryu', sinonimos_aceitos: ['Ken', 'Street Fighter', 'Hadouken'], votos: 13 },
      { texto: 'Scorpion', sinonimos_aceitos: ['Sub-Zero', 'Mortal Kombat'], votos: 12 },
      { texto: 'Lara Croft', sinonimos_aceitos: ['Crash Bandicoot', 'Leon', 'Steve Minecraft'], votos: 12 }
    ]
  },
  {
    pergunta: 'Quais os animes mais populares entre os fãs no Brasil?',
    respostas: [
      { texto: 'Dragon Ball Z', sinonimos_aceitos: ['Dragon Ball', 'Goku', 'DBZ'], votos: 42 },
      { texto: 'Naruto', sinonimos_aceitos: ['Naruto Shippuden', 'Sasuke'], votos: 32 },
      { texto: 'One Piece', sinonimos_aceitos: ['Luffy', 'One Piece'], votos: 24 },
      { texto: 'Cavaleiros do Zodíaco', sinonimos_aceitos: ['CDZ', 'Seiya', 'Cavaleiros'], votos: 20 },
      { texto: 'Pokémon', sinonimos_aceitos: ['Pokemon', 'Ash', 'Pikachu'], votos: 18 },
      { texto: 'Death Note', sinonimos_aceitos: ['Kira', 'L', 'Death Note'], votos: 15 },
      { texto: 'Attack on Titan', sinonimos_aceitos: ['Shingeki no Kyojin', 'Eren'], votos: 14 },
      { texto: 'Demon Slayer', sinonimos_aceitos: ['Kimetsu no Yaiba', 'Tanjiro'], votos: 13 },
      { texto: 'Jujutsu Kaisen', sinonimos_aceitos: ['Gojo', 'Sukuna', 'Jujutsu'], votos: 11 },
      { texto: 'Yu-Gi-Oh!', sinonimos_aceitos: ['Yu Yu Hakusho', 'Bleach'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais os jogos de videogame mais jogados da história?',
    respostas: [
      { texto: 'Minecraft', sinonimos_aceitos: ['Minecraft', 'Steve'], votos: 40 },
      { texto: 'Grand Theft Auto (GTA)', sinonimos_aceitos: ['GTA V', 'San Andreas', 'GTA 5'], votos: 30 },
      { texto: 'EA Sports FC (FIFA)', sinonimos_aceitos: ['FIFA', 'PES', 'Bomba Patch'], votos: 24 },
      { texto: 'Fortnite', sinonimos_aceitos: ['Free Fire'], votos: 20 },
      { texto: 'Counter-Strike', sinonimos_aceitos: ['CS', 'Call of Duty', 'COD'], votos: 18 },
      { texto: 'League of Legends', sinonimos_aceitos: ['LoL', 'Valorant'], votos: 16 },
      { texto: 'Roblox', sinonimos_aceitos: ['Roblox'], votos: 15 },
      { texto: 'Super Mario World', sinonimos_aceitos: ['Mario Kart', 'Super Mario'], votos: 14 },
      { texto: 'God of War', sinonimos_aceitos: ['The Last of Us'], votos: 12 },
      { texto: 'Mortal Kombat', sinonimos_aceitos: ['Street Fighter', 'Candy Crush'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais os consoles de videogame mais marcantes de todos os tempos?',
    respostas: [
      { texto: 'PlayStation 2 (PS2)', sinonimos_aceitos: ['PS2', 'Play 2', 'PlayStation 2'], votos: 42 },
      { texto: 'Super Nintendo (SNES)', sinonimos_aceitos: ['Super Nintendo', 'SNES'], votos: 28 },
      { texto: 'PlayStation 4', sinonimos_aceitos: ['PS4', 'PS5', 'PlayStation 5'], votos: 24 },
      { texto: 'Xbox 360', sinonimos_aceitos: ['Xbox 360', 'Xbox'], votos: 20 },
      { texto: 'PlayStation 1 (PS1)', sinonimos_aceitos: ['PS1', 'Play 1'], votos: 18 },
      { texto: 'Nintendo Switch', sinonimos_aceitos: ['Switch', 'Nintendo Switch', 'Wii'], votos: 16 },
      { texto: 'Mega Drive', sinonimos_aceitos: ['Master System', 'Sega'], votos: 15 },
      { texto: 'Nintendo 64', sinonimos_aceitos: ['Nintendo 64', 'N64'], votos: 14 },
      { texto: 'Game Boy', sinonimos_aceitos: ['Game Boy', 'Gameboy', 'Nintendo DS'], votos: 12 },
      { texto: 'Atari 2600', sinonimos_aceitos: ['Atari', 'PSP'], votos: 11 }
    ]
  },
  {
    pergunta: 'Cite uma coisa que faz qualquer gamer passar raiva ao jogar online',
    respostas: [
      { texto: 'Lag (Internet caindo)', sinonimos_aceitos: ['Lag', 'Internet', 'Ping alto', 'Queda de conexao'], votos: 44 },
      { texto: 'Perder para cheater (hacker)', sinonimos_aceitos: ['Hacker', 'Cheater', 'Xiter'], votos: 28 },
      { texto: 'Controle descarregar no meio da partida', sinonimos_aceitos: ['Controle', 'Bateria', 'Analogico'], votos: 22 },
      { texto: 'Time ruim (trolls)', sinonimos_aceitos: ['Time ruim', 'Troll', 'Noob', 'AFK'], votos: 20 },
      { texto: 'Morrer para o Chefão no final', sinonimos_aceitos: ['Boss', 'Chefao', 'Morrer no final'], votos: 18 },
      { texto: 'Esquecer de salvar o jogo', sinonimos_aceitos: ['Sem salvar', 'Save', 'Faltar luz'], votos: 16 },
      { texto: 'Camper escondido no mapa', sinonimos_aceitos: ['Camper', 'Escondido'], votos: 14 },
      { texto: 'Atualização gigante antes de entrar', sinonimos_aceitos: ['Atualizacao', 'Download'], votos: 13 },
      { texto: 'Jogo fechar sozinho (crashar)', sinonimos_aceitos: ['Bug', 'Crash', 'Travar'], votos: 13 },
      { texto: 'Alguém chamar no meio da partida sem pause', sinonimos_aceitos: ['Mae chamando', 'Nao tem pause'], votos: 12 }
    ]
  }
];

const CIENCIA_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'Cite uma parte do corpo que as pessoas costumam fraturar',
    respostas: [
      { texto: 'Tornozelo', sinonimos_aceitos: ['Pe', 'Dedinho do pe'], votos: 38 },
      { texto: 'Braço', sinonimos_aceitos: ['Antebraco', 'Pulso', 'Punho'], votos: 30 },
      { texto: 'Perna', sinonimos_aceitos: ['Tibia', 'Canela'], votos: 24 },
      { texto: 'Joelho', sinonimos_aceitos: ['Ligamento', 'Menisco'], votos: 22 },
      { texto: 'Dedo da mão', sinonimos_aceitos: ['Mindinho', 'Dedo'], votos: 18 },
      { texto: 'Clavícula', sinonimos_aceitos: ['Ombro'], votos: 16 },
      { texto: 'Costela', sinonimos_aceitos: ['Costelas'], votos: 14 },
      { texto: 'Nariz', sinonimos_aceitos: ['Osso do nariz'], votos: 13 },
      { texto: 'Dente', sinonimos_aceitos: ['Dentes'], votos: 13 },
      { texto: 'Fêmur', sinonimos_aceitos: ['Quadril', 'Bacia', 'Coluna'], votos: 12 }
    ]
  },
  {
    pergunta: 'Cite algo essencial que astronautas levam em missões espaciais',
    respostas: [
      { texto: 'Traje espacial', sinonimos_aceitos: ['Capacete', 'Roupa espacial'], votos: 40 },
      { texto: 'Comida desidratada', sinonimos_aceitos: ['Comida espacial', 'Comida em saquinho'], votos: 30 },
      { texto: 'Tanque de oxigênio', sinonimos_aceitos: ['Oxigenio', 'Ar'], votos: 24 },
      { texto: 'Água potável', sinonimos_aceitos: ['Agua', 'Bolsa de agua'], votos: 20 },
      { texto: 'Câmera fotográfica', sinonimos_aceitos: ['Camera', 'Equipamentos'], votos: 18 },
      { texto: 'Foto da família', sinonimos_aceitos: ['Foto', 'Familia'], votos: 16 },
      { texto: 'Bandeira do país', sinonimos_aceitos: ['Bandeira'], votos: 15 },
      { texto: 'Rádio comunicador', sinonimos_aceitos: ['Radio', 'Comunicador', 'Computador'], votos: 13 },
      { texto: 'Saco de dormir', sinonimos_aceitos: ['Saco de dormir preso'], votos: 12 },
      { texto: 'Kit de primeiros socorros', sinonimos_aceitos: ['Remedio', 'Kit medico'], votos: 12 }
    ]
  },
  {
    pergunta: 'Quais os planetas e astros mais lembrados do Sistema Solar?',
    respostas: [
      { texto: 'Terra', sinonimos_aceitos: ['Planeta Terra'], votos: 38 },
      { texto: 'Marte', sinonimos_aceitos: ['Planeta Vermelho'], votos: 30 },
      { texto: 'Júpiter', sinonimos_aceitos: ['Jupiter'], votos: 24 },
      { texto: 'Saturno', sinonimos_aceitos: ['Planeta dos aneis'], votos: 22 },
      { texto: 'Sol', sinonimos_aceitos: ['Estrela Sol'], votos: 20 },
      { texto: 'Lua', sinonimos_aceitos: ['Lua cheia'], votos: 18 },
      { texto: 'Vênus', sinonimos_aceitos: ['Venus', 'Estrela Dalva'], votos: 14 },
      { texto: 'Mercúrio', sinonimos_aceitos: ['Mercurio'], votos: 12 },
      { texto: 'Netuno', sinonimos_aceitos: ['Urano'], votos: 11 },
      { texto: 'Plutão', sinonimos_aceitos: ['Buraco negro'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais os monumentos turísticos mais famosos do planeta?',
    respostas: [
      { texto: 'Cristo Redentor', sinonimos_aceitos: ['Corcovado', 'Rio de Janeiro'], votos: 40 },
      { texto: 'Torre Eiffel', sinonimos_aceitos: ['Paris'], votos: 32 },
      { texto: 'Estátua da Liberdade', sinonimos_aceitos: ['Nova York'], votos: 24 },
      { texto: 'Coliseu de Roma', sinonimos_aceitos: ['Coliseu', 'Roma'], votos: 20 },
      { texto: 'Pirâmides do Egito', sinonimos_aceitos: ['Piramides', 'Egito', 'Esfinge'], votos: 18 },
      { texto: 'Muralha da China', sinonimos_aceitos: ['Grande Muralha', 'China'], votos: 16 },
      { texto: 'Taj Mahal', sinonimos_aceitos: ['India'], votos: 14 },
      { texto: 'Machu Picchu', sinonimos_aceitos: ['Peru'], votos: 13 },
      { texto: 'Big Ben', sinonimos_aceitos: ['Londres'], votos: 12 },
      { texto: 'Cataratas do Iguaçu', sinonimos_aceitos: ['Pao de Acucar', 'Iguacu'], votos: 11 }
    ]
  }
];

const CIENCIA_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'BURACO NEGRO', palavras_proibidas: ['ESPAÇO', 'GRAVIDADE', 'LUZ', 'ESTRELA', 'INTERESTELAR', 'UNIVERSO', 'GALÁXIA'] },
  { palavra_alvo: 'CORAÇÃO', palavras_proibidas: ['SANGUE', 'BATER', 'PEITO', 'ÓRGÃO', 'AMOR', 'PULSO', 'VEIA'] },
  { palavra_alvo: 'ASTRONAUTA', palavras_proibidas: ['ESPAÇO', 'FOGUETE', 'LUA', 'NASA', 'CAPACETE', 'GRAVIDADE', 'TERRA'] },
  { palavra_alvo: 'CÉREBRO', palavras_proibidas: ['CABEÇA', 'PENSAR', 'MENTE', 'NEURÔNIO', 'INTELIGÊNCIA', 'CRÂNIO', 'MEMÓRIA'] },
  { palavra_alvo: 'DNA', palavras_proibidas: ['GENÉTICA', 'SANGUE', 'HERANÇA', 'CÉLULA', 'CORPO', 'TESTE', 'BIOLOGIA'] },
  { palavra_alvo: 'SISTEMA SOLAR', palavras_proibidas: ['PLANETAS', 'SOL', 'TERRA', 'MARTE', 'ESPAÇO', 'ÓRBITA', 'VIA LÁCTEA'] },
  { palavra_alvo: 'PULMÃO', palavras_proibidas: ['RESPIRAR', 'AR', 'OXIGÊNIO', 'PEITO', 'FUMAR', 'ÓRGÃO', 'TÓRAX'] },
  { palavra_alvo: 'GRAVIDADE', palavras_proibidas: ['CAIR', 'NEWTON', 'MAÇÃ', 'PESO', 'TERRA', 'ESPAÇO', 'FLUTUAR'] },
  { palavra_alvo: 'TELESCÓPIO', palavras_proibidas: ['ESTRELAS', 'OLHAR', 'ESPAÇO', 'LENTE', 'HUBBLE', 'ASTRONOMIA', 'PLANETA'] },
  { palavra_alvo: 'ESQUELETO', palavras_proibidas: ['OSSOS', 'CAVEIRA', 'CORPO', 'CRÂNIO', 'HUMANO', 'RAIO-X', 'CALCIO'] }
];

const CIENCIA_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Quantos ossos tem o pé humano somando os dois pés?',
    valor_exato: 52,
    unidade: 'ossos',
    curiosidade_explicacao: 'Cada pé humano possui 26 ossos (somando 52 ossos nos dois pés, quase um quarto de todos os ossos do corpo!).'
  },
  {
    pergunta: 'Quantos ossos compõem o esqueleto de um ser humano adulto?',
    valor_exato: 206,
    unidade: 'ossos',
    curiosidade_explicacao: 'Um adulto tem exatamente 206 ossos após a fusão dos ossos da infância.'
  },
  {
    pergunta: 'Quantos dentes tem uma pessoa adulta com dentição completa (incluindo os 4 sisos)?',
    valor_exato: 32,
    unidade: 'dentes',
    curiosidade_explicacao: 'A arcada dentária adulta completa possui 32 dentes.'
  },
  {
    pergunta: 'Quantos minutos a luz do Sol leva aproximadamente para chegar até a Terra?',
    valor_exato: 8,
    unidade: 'minutos',
    curiosidade_explicacao: 'A luz solar percorre 150 milhões de km em cerca de 8 minutos e 20 segundos.'
  },
  {
    pergunta: 'Quantos elementos químicos existem atualmente na Tabela Periódica oficial da IUPAC?',
    valor_exato: 118,
    unidade: 'elementos',
    curiosidade_explicacao: 'Do Hidrogênio (1) ao Oganessônio (118), são 118 elementos reconhecidos.'
  },
  {
    pergunta: 'Quantos cromossomos possui uma célula somática normal do corpo humano?',
    valor_exato: 46,
    unidade: 'cromossomos',
    curiosidade_explicacao: 'O ser humano possui 23 pares de cromossomos, totalizando 46 cromossomos.'
  },
  {
    pergunta: 'Quantos dias terrestres o planeta Marte leva para dar uma volta completa ao redor do Sol?',
    valor_exato: 687,
    unidade: 'dias',
    curiosidade_explicacao: 'Um ano marciano dura aproximadamente 687 dias terrestres!'
  }
];

const CIENCIA_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Órgãos e ossos do corpo humano',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Coração', 'Pulmão', 'Cérebro', 'Fígado', 'Estômago', 'Rim', 'Intestino', 'Pâncreas',
      'Fêmur', 'Crânio', 'Costela', 'Tíbia', 'Fíbula', 'Úmero', 'Rádio', 'Ulna', 'Clavícula',
      'Patela', 'Coluna vertebral', 'Bexiga', 'Esôfago', 'Traqueia', 'Baço', 'Pele'
    ]
  },
  {
    categoria_secreta: 'Planetas, luas e astros do Sistema Solar',
    total_itens_possiveis: 20,
    exemplos_validos: [
      'Mercúrio', 'Vênus', 'Terra', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Netuno',
      'Sol', 'Lua', 'Plutão', 'Europa', 'Titã', 'Ganimedes', 'Io', 'Calisto', 'Fobos', 'Deimos', 'Ceres', 'Cometa Halley'
    ]
  },
  {
    categoria_secreta: 'Elementos químicos da Tabela Periódica',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Oxigênio', 'Hidrogênio', 'Carbono', 'Nitrogênio', 'Ferro', 'Ouro', 'Prata', 'Cobre',
      'Alumínio', 'Cálcio', 'Sódio', 'Potássio', 'Cloro', 'Hélio', 'Mercúrio', 'Chumbo',
      'Zinco', 'Urânio', 'Lítio', 'Titânio', 'Enxofre', 'Fósforo', 'Silício', 'Platina'
    ]
  },
  {
    categoria_secreta: 'Invenções científicas e tecnológicas que mudaram a história',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Lâmpada elétrica', 'Telefone', 'Internet', 'Avião', 'Roda', 'Bússola', 'Imprensa',
      'Penicilina', 'Vacina', 'Motor a vapor', 'Computador', 'Telescópio', 'Microscópio',
      'Raio-X', 'Rádio', 'Televisão', 'Satélite', 'Laser', 'Bateria elétrica', 'Transistor'
    ]
  },
  {
    categoria_secreta: 'Especialidades da medicina e áreas da saúde',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Cardiologia', 'Pediatria', 'Ortopedia', 'Dermatologia', 'Neurologia', 'Oftalmologia',
      'Psiquiatria', 'Ginecologia', 'Urologia', 'Oncologia', 'Endocrinologia', 'Geriatria',
      'Anestesiologia', 'Otorrinolaringologia', 'Cirurgia Plástica', 'Radiologia', 'Nefrologia', 'Gastroenterologia'
    ]
  }
];

const CIENCIA_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual parte ou órgão do corpo humano?' },
  { pergunta: 'Qual planeta ou astro do universo?' },
  { pergunta: 'Qual invenção científica da história?' },
  { pergunta: 'Qual doença ou dor física?' },
  { pergunta: 'Qual fenômeno da natureza?' },
  { pergunta: 'Qual descoberta da medicina?' },
  { pergunta: 'Qual aparelho ou exame médico?' },
  { pergunta: 'Qual cientista ou inventor famoso?' }
];

// --- FUTEBOL DEDICATED BANKS ---
const FUTEBOL_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'IMPEDIMENTO', palavras_proibidas: ['BANDEIRINHA', 'JUIZ', 'ATAQUE', 'LINHA', 'VAR', 'GOL', 'POSIÇÃO'] },
  { palavra_alvo: 'MARACANÃ', palavras_proibidas: ['ESTÁDIO', 'RIO DE JANEIRO', 'FLAMENGO', 'FLUMINENSE', 'FINAL', 'FUTEBOL', 'TORCIDA'] },
  { palavra_alvo: 'PÊNALTI', palavras_proibidas: ['FALTA', 'ÁREA', 'GOLEIRO', 'CHUTE', 'MARCA', 'GOL', 'JUIZ'] },
  { palavra_alvo: 'PELÉ', palavras_proibidas: ['REI', 'SANTOS', 'SELEÇÃO', 'CAMISA 10', 'COPA', 'FUTEBOL', 'EDSON'] },
  { palavra_alvo: 'CARTÃO VERMELHO', palavras_proibidas: ['EXPULSO', 'JUIZ', 'FALTA', 'AMARELO', 'JOGADOR', 'CAMPO', 'ÁRBITRO'] },
  { palavra_alvo: 'LIBERTADORES', palavras_proibidas: ['AMÉRICA', 'CAMPEÃO', 'TAÇA', 'TORNEIO', 'FINAL', 'CONMEBOL', 'GLÓRIA'] },
  { palavra_alvo: 'GOLEIRO', palavras_proibidas: ['LUVA', 'DEFESA', 'TRAVE', 'GOL', 'MÃO', 'ÁREA', 'FRANGO'] },
  { palavra_alvo: 'ESCANTEIO', palavras_proibidas: ['CANTO', 'BANDEIRINHA', 'CRUZAMENTO', 'CABEÇADA', 'LINHA DE FUNDO', 'BOLA', 'CAMPO'] },
  { palavra_alvo: 'NEYMAR', palavras_proibidas: ['SANTOS', 'BARCELONA', 'PSG', 'SELEÇÃO', 'MENINO', 'DRIBLE', 'CAMISA 10'] },
  { palavra_alvo: 'COPA DO MUNDO', palavras_proibidas: ['SELEÇÃO', 'FIFA', 'QUATRO ANOS', 'TAÇA', 'CAMPEÃO', 'PENTACAMPEÃO', 'PAÍSES'] }
];

const FUTEBOL_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Quantos gols o Brasil sofreu da Alemanha na semifinal da Copa do Mundo de 2014 no Mineirão?',
    valor_exato: 7,
    unidade: 'gols',
    curiosidade_explicacao: 'O histórico 7 a 1 no Mineirão aconteceu em 8 de julho de 2014.'
  },
  {
    pergunta: 'Em que ano a Seleção Brasileira conquistou o Pentacampeonato Mundial na Copa da Coreia e do Japão?',
    valor_exato: 2002,
    unidade: 'ano',
    curiosidade_explicacao: 'Em 30 de junho de 2002, com dois gols de Ronaldo Fenômeno contra a Alemanha!'
  },
  {
    pergunta: 'Quantos minutos regulamentares dura uma partida de futebol somando prorrogação completa (sem acréscimos)?',
    valor_exato: 120,
    unidade: 'minutos',
    curiosidade_explicacao: 'São 90 minutos do tempo normal mais 30 minutos de prorrogação (dois tempos de 15).'
  },
  {
    pergunta: 'A quantos metros da linha do gol fica exatamente a marca do pênalti em um campo oficial de futebol?',
    valor_exato: 11,
    unidade: 'metros',
    curiosidade_exato: 11,
    curiosidade_explicacao: 'A marca da cal fica a exatos 11 metros (12 jardas) do centro da linha do gol.'
  } as LimiteRoundData,
  {
    pergunta: 'Quantos clubes disputam a Série A do Campeonato Brasileiro de pontos corridos atualmente?',
    valor_exato: 20,
    unidade: 'clubes',
    curiosidade_explicacao: 'Desde 2006, a Série A do Brasileirão é disputada por exatos 20 clubes em 38 rodadas.'
  },
  {
    pergunta: 'Quantas Copas do Mundo de Futebol a Seleção Brasileira já venceu em sua história?',
    valor_exato: 5,
    unidade: 'títulos',
    curiosidade_explicacao: 'O Brasil venceu em 1958, 1962, 1970, 1994 e 2002, sendo o único pentacampeão.'
  }
];

const FUTEBOL_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Clubes que já jogaram a Série A do Campeonato Brasileiro',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Flamengo', 'Corinthians', 'Palmeiras', 'São Paulo', 'Santos', 'Vasco da Gama', 'Fluminense',
      'Botafogo', 'Grêmio', 'Internacional', 'Cruzeiro', 'Atlético Mineiro', 'Bahia', 'Vitória',
      'Athletico Paranaense', 'Coritiba', 'Fortaleza', 'Ceará', 'Sport', 'Goiás', 'Juventude', 'Criciúma'
    ]
  },
  {
    categoria_secreta: 'Jogadores que já vestiram a camisa da Seleção Brasileira em Copas do Mundo',
    total_itens_possiveis: 35,
    exemplos_validos: [
      'Pelé', 'Garrincha', 'Zico', 'Romário', 'Bebeto', 'Ronaldo Fenômeno', 'Rivaldo', 'Ronaldinho Gaúcho',
      'Kaká', 'Cafu', 'Roberto Carlos', 'Taffarel', 'Dunga', 'Neymar', 'Thiago Silva', 'Casemiro',
      'Vinícius Júnior', 'Richarlison', 'Alisson', 'Adriano Imperador', 'Robinho', 'Sócrates'
    ]
  },
  {
    categoria_secreta: 'Estádios de futebol famosos do Brasil e do mundo',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Maracanã', 'Morumbi', 'Mineirão', 'Beira-Rio', 'Neo Química Arena', 'Allianz Parque', 'Vila Belmiro',
      'São Januário', 'Fonte Nova', 'Castelão', 'Mané Garrincha', 'Camp Nou', 'Santiago Bernabéu',
      'Wembley', 'La Bombonera', 'San Siro', 'Old Trafford', 'Allianz Arena'
    ]
  },
  {
    categoria_secreta: 'Seleções nacionais que já disputaram ou venceram a Copa do Mundo',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Brasil', 'Alemanha', 'Itália', 'Argentina', 'França', 'Uruguai', 'Inglaterra', 'Espanha',
      'Holanda', 'Portugal', 'Croácia', 'Bélgica', 'México', 'Japão', 'Coreia do Sul', 'Marrocos',
      'Colômbia', 'Chile', 'Paraguai', 'Senegal', 'Camarões', 'Suíça'
    ]
  },
  {
    categoria_secreta: 'Gigantes do futebol europeu (clubes da Champions League)',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Real Madrid', 'Barcelona', 'Manchester City', 'Manchester United', 'Liverpool', 'Chelsea',
      'Arsenal', 'Bayern de Munique', 'Borussia Dortmund', 'Paris Saint-Germain', 'Milan',
      'Inter de Milão', 'Juventus', 'Porto', 'Benfica', 'Ajax', 'Atlético de Madrid'
    ]
  }
];

const FUTEBOL_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual estádio de futebol brasileiro?' },
  { pergunta: 'Qual comida de estádio?' },
  { pergunta: 'Qual jogador da Seleção Brasileira?' },
  { pergunta: 'Qual camisa de time de futebol?' },
  { pergunta: 'Qual clube do futebol mundial?' },
  { pergunta: 'Qual treinador de futebol?' },
  { pergunta: 'Qual narração ou bordão de futebol?' },
  { pergunta: 'Qual comemoração de gol famosa?' }
];

// --- CINEMA & SÉRIES DEDICATED BANKS ---
const CINEMA_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'TITANIC', palavras_proibidas: ['NAVIO', 'ICEBERG', 'JACK', 'ROSE', 'AFUNDAR', 'MAR', 'LEONARDO DICAPRIO'] },
  { palavra_alvo: 'HOMEM-ARANHA', palavras_proibidas: ['TEIA', 'PETER PARKER', 'HERÓI', 'MARVEL', 'PICADA', 'INSETO', 'PRÉDIO'] },
  { palavra_alvo: 'DARTH VADER', palavras_proibidas: ['STAR WARS', 'PAI', 'LUKE', 'SABRE DE LUZ', 'FORÇA', 'CAPACETE', 'VILÃO'] },
  { palavra_alvo: 'HARRY POTTER', palavras_proibidas: ['BRUXO', 'VARINHA', 'HOGWARTS', 'CICATRIZ', 'MAGIA', 'ÓCULOS', 'HERMIONE'] },
  { palavra_alvo: 'SHREK', palavras_proibidas: ['OGRO', 'VERDE', 'BURRO', 'FIONA', 'PÂNTANO', 'GATO DE BOTAS', 'DESENHO'] },
  { palavra_alvo: 'CORINGA', palavras_proibidas: ['BATMAN', 'PALHAÇO', 'VILÃO', 'RISADA', 'GOTHAM', 'CARTA', 'MAQUIAGEM'] },
  { palavra_alvo: 'VINGADORES', palavras_proibidas: ['MARVEL', 'HERÓIS', 'THANOS', 'HOMEM DE FERRO', 'CAPITÃO AMÉRICA', 'THOR', 'HULK'] },
  { palavra_alvo: 'O REI LEÃO', palavras_proibidas: ['SIMBA', 'MUFASA', 'SCAR', 'HAKUNA MATATA', 'DISNEY', 'ÁFRICA', 'ANIMAÇÃO'] },
  { palavra_alvo: 'CHAVES', palavras_proibidas: ['BARRIL', 'VILA', 'SEU MADRUGA', 'QUICO', 'CHIQUINHA', 'SANDUÍCHE DE PRESUNTO', 'SBT'] },
  { palavra_alvo: 'OSCAR', palavras_proibidas: ['PRÊMIO', 'ESTATUETA', 'HOLLYWOOD', 'MELHOR FILME', 'CINEMA', 'ATOR', 'OURO'] }
];

const CINEMA_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Quantas estatuetas do Oscar o filme Titanic (1997) venceu na cerimônia de premiação?',
    valor_exato: 11,
    unidade: 'Oscars',
    curiosidade_explicacao: 'Titanic empatou o recorde histórico vencendo 11 Oscars, ao lado de Ben-Hur e O Senhor dos Anéis: O Retorno do Rei!'
  },
  {
    pergunta: 'Em que ano foi lançado o primeiro filme de Harry Potter (A Pedra Filosofal) nos cinemas?',
    valor_exato: 2001,
    unidade: 'ano',
    curiosidade_explicacao: 'Harry Potter e a Pedra Filosofal estreou mundialmente nos cinemas em novembro de 2001.'
  },
  {
    pergunta: 'Quantos minutos dura a versão de cinema de Vingadores: Ultimato (Avengers: Endgame)?',
    valor_exato: 181,
    unidade: 'minutos',
    curiosidade_explicacao: 'Vingadores: Ultimato tem exatamente 3 horas e 1 minuto (181 minutos) de duração.'
  },
  {
    pergunta: 'Quantas temporadas completas teve a série clássica Friends na televisão?',
    valor_exato: 10,
    unidade: 'temporadas',
    curiosidade_explicacao: 'Friends teve 10 temporadas e 236 episódios exibidos entre 1994 e 2004.'
  },
  {
    pergunta: 'Qual é o número do jogador protagonista Seong Gi-hun na série Round 6 (Squid Game)?',
    valor_exato: 456,
    unidade: 'número',
    curiosidade_explicacao: 'Eram 456 participantes no jogo, e o protagonista Gi-hun usava o agasalho número 456.'
  },
  {
    pergunta: 'Quantos filmes principais compõem a saga original completa de Harry Potter nos cinemas?',
    valor_exato: 8,
    unidade: 'filmes',
    curiosidade_explicacao: 'Os 7 livros foram adaptados em 8 filmes (as Relíquias da Morte foi dividido em Parte 1 e Parte 2).'
  }
];

const CINEMA_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Filmes de animação da Disney ou Pixar',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'O Rei Leão', 'Toy Story', 'Procurando Nemo', 'Monstros S.A.', 'Os Incríveis', 'Frozen',
      'Divertida Mente', 'Carros', 'Up: Altas Aventuras', 'Moana', 'Aladdin', 'A Bela e a Fera',
      'A Pequena Sereia', 'Mulan', 'Tarzan', 'Ratatouille', 'Wall-E', 'Viva: A Vida é uma Festa',
      'Encanto', 'Lilo & Stitch', 'Branca de Neve', 'Cinderela'
    ]
  },
  {
    categoria_secreta: 'Super-heróis e vilões dos filmes da Marvel ou DC',
    total_itens_possiveis: 35,
    exemplos_validos: [
      'Homem-Aranha', 'Batman', 'Superman', 'Homem de Ferro', 'Capitão América', 'Thor', 'Hulk',
      'Mulher-Maravilha', 'Viúva Negra', 'Pantera Negra', 'Doutor Estranho', 'Wolverine', 'Deadpool',
      'Flash', 'Aquaman', 'Thanos', 'Coringa', 'Loki', 'Venom', 'Feiticeira Escarlate', 'Gavião Arqueiro'
    ]
  },
  {
    categoria_secreta: 'Séries famosas da Netflix, HBO ou TV aberta',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Stranger Things', 'Game of Thrones', 'Breaking Bad', 'La Casa de Papel', 'Round 6',
      'Friends', 'Chaves', 'Todo Mundo Odeia o Chris', 'The Walking Dead', 'The Boys',
      'Wandinha', 'Grey\'s Anatomy', 'Peaky Blinders', 'Dark', 'The Office', 'Eu, a Patroa e as Crianças',
      'A Grande Família', 'Black Mirror', 'Bridgerton', 'The Last of Us'
    ]
  },
  {
    categoria_secreta: 'Filmes campeões de bilheteria da história do cinema',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Avatar', 'Vingadores: Ultimato', 'Titanic', 'Star Wars', 'Jurassic Park', 'O Rei Leão',
      'Homem-Aranha: Sem Volta Para Casa', 'Top Gun: Maverick', 'Barbie', 'Frozen', 'Harry Potter',
      'Velozes e Furiosos', 'Pantera Negra', 'O Senhor dos Anéis', 'Batman: O Cavaleiro das Trevas',
      'Matrix', 'E.T. O Extraterrestre', 'Tubarão', 'De Volta para o Futuro'
    ]
  },
  {
    categoria_secreta: 'Atores e atrizes famosos de Hollywood ou do Brasil',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Leonardo DiCaprio', 'Brad Pitt', 'Tom Cruise', 'Will Smith', 'Robert Downey Jr.',
      'Dwayne Johnson (The Rock)', 'Johnny Depp', 'Keanu Reeves', 'Morgan Freeman', 'Tom Hanks',
      'Scarlett Johansson', 'Margot Robbie', 'Angelina Jolie', 'Meryl Streep', 'Fernanda Montenegro',
      'Wagner Moura', 'Selton Mello', 'Tony Ramos', 'Adriana Esteves', 'Rodrigo Santoro'
    ]
  }
];

const CINEMA_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual filme para assistir no cinema?' },
  { pergunta: 'Qual série famosa de TV ou streaming?' },
  { pergunta: 'Qual super-herói ou vilão do cinema?' },
  { pergunta: 'Qual animação ou desenho clássico?' },
  { pergunta: 'Qual ator ou atriz de cinema?' },
  { pergunta: 'Qual franquia ou saga do cinema?' },
  { pergunta: 'Qual comida de cinema?' },
  { pergunta: 'Qual filme de terror ou suspense?' }
];

// --- MÚSICA DEDICATED BANKS ---
const MUSICA_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'KARAOKÊ', palavras_proibidas: ['CANTAR', 'MICROFONE', 'LETRA', 'TELA', 'MÚSICA', 'EVIDÊNCIAS', 'VOZ'] },
  { palavra_alvo: 'VIOLÃO', palavras_proibidas: ['CORDAS', 'TOCAR', 'MÚSICA', 'INSTRUMENTO', 'PALHETA', 'ACÚSTICO', 'RODA'] },
  { palavra_alvo: 'MICHAEL JACKSON', palavras_proibidas: ['REI DO POP', 'THRILLER', 'MOONWALK', 'BILLIE JEAN', 'DANÇA', 'LUVA', 'CANTOR'] },
  { palavra_alvo: 'SERTANEJO', palavras_proibidas: ['DUPLA', 'CHAPÉU', 'CORNO', 'MODÃO', 'SOFRÊNCIA', 'GOIÁS', 'MÚSICA'] },
  { palavra_alvo: 'BATERIA', palavras_proibidas: ['BAQUETA', 'TAMBOR', 'PRATO', 'RITMO', 'BANDA', 'TOCAR', 'BUMBO'] },
  { palavra_alvo: 'ANITTA', palavras_proibidas: ['PODEROSA', 'FUNK', 'CANTORA', 'ENVOLVER', 'RIO DE JANEIRO', 'POP', 'DANÇA'] },
  { palavra_alvo: 'CARNAVAL', palavras_proibidas: ['SAMBA', 'BLOCO', 'FANTASIA', 'FEVEREIRO', 'TRIO ELÉTRICO', 'DESFILE', 'FERIADO'] },
  { palavra_alvo: 'ROBERTO CARLOS', palavras_proibidas: ['REI', 'FIM DE ANO', 'GLOBO', 'AZUL', 'EMOCÕES', 'CANTOR', 'ESPECIAL'] },
  { palavra_alvo: 'FONE DE OUVIDO', palavras_proibidas: ['ESCUTAR', 'MÚSICA', 'ORELHA', 'BLUETOOTH', 'SOM', 'CABO', 'CELULAR'] },
  { palavra_alvo: 'SPOTIFY', palavras_proibidas: ['APLICATIVO', 'MÚSICA', 'PLAYLIST', 'OUVIR', 'STREAMING', 'VERDE', 'RETROSPECTIVA'] }
];

const MUSICA_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Quantas cordas tem um violão tradicional padrão utilizado na música popular?',
    valor_exato: 6,
    unidade: 'cordas',
    curiosidade_explicacao: 'O violão clássico padrão possui 6 cordas (Mi, Lá, Ré, Sol, Si, Mi).'
  },
  {
    pergunta: 'Quantas teclas (brancas e pretas somadas) possui um piano acústico padrão completo?',
    valor_exato: 88,
    unidade: 'teclas',
    curiosidade_explicacao: 'Um piano padrão possui 88 teclas: 52 brancas e 36 pretas.'
  },
  {
    pergunta: 'Quantos integrantes formavam a banda britânica The Beatles em sua formação clássica?',
    valor_exato: 4,
    unidade: 'integrantes',
    curiosidade_explicacao: 'John Lennon, Paul McCartney, George Harrison e Ringo Starr formavam o quarteto de Liverpool.'
  },
  {
    pergunta: 'Quantos integrantes tinha a banda brasileira Mamonas Assassinas?',
    valor_exato: 5,
    unidade: 'integrantes',
    curiosidade_explicacao: 'Dinho, Bento Hinoto, Júlio Rasec, Samuel Reoli e Sérgio Reoli formavam o quinteto de Guarulhos.'
  },
  {
    pergunta: 'Em que ano aconteceu a primeira edição histórica do festival Rock in Rio no Brasil?',
    valor_exato: 1985,
    unidade: 'ano',
    curiosidade_explicacao: 'O primeiro Rock in Rio aconteceu em janeiro de 1985 na Cidade do Rock, em Jacarepaguá.'
  }
];

const MUSICA_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Instrumentos musicais de corda, sopro ou percussão',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Violão', 'Guitarra', 'Baixo', 'Bateria', 'Piano', 'Teclado', 'Violino', 'Violoncelo',
      'Flauta', 'Saxofone', 'Trompete', 'Trombone', 'Clarinete', 'Harpa', 'Cavaquinho', 'Ukulele',
      'Pandeiro', 'Sanfona / Acordeão', 'Berimbau', 'Tamborim', 'Cuíca', 'Gaita', 'Triângulo', 'Zabumba'
    ]
  },
  {
    categoria_secreta: 'Cantores, cantoras e duplas sertanejas do Brasil',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Chitãozinho & Xororó', 'Zezé Di Camargo & Luciano', 'Jorge & Mateus', 'Henrique & Juliano',
      'Gusttavo Lima', 'Luan Santana', 'Marília Mendonça', 'Ana Castela', 'Maiara & Maraisa',
      'Simone Mendes', 'Leonardo', 'Daniel', 'Bruno & Marrone', 'Matheus & Kauan', 'Zé Neto & Cristiano',
      'Rio Negro & Solimões', 'César Menotti & Fabiano', 'Gustavo Mioto'
    ]
  },
  {
    categoria_secreta: 'Bandas famosas de Rock Nacional ou Internacional',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Legião Urbana', 'Charlie Brown Jr.', 'Skank', 'Jota Quest', 'Capital Inicial', 'Paralamas do Sucesso',
      'Titãs', 'Barão Vermelho', 'Mamonas Assassinas', 'CPM 22', 'Sepultura', 'Queen', 'The Beatles',
      'Rolling Stones', 'AC/DC', 'Metallica', 'Guns N\' Roses', 'Nirvana', 'Coldplay', 'Linkin Park', 'U2'
    ]
  },
  {
    categoria_secreta: 'Estilos e gêneros musicais ouvidos no Brasil e no mundo',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Sertanejo', 'Samba', 'Pagode', 'Funk', 'Forró', 'Piseiro', 'Axé', 'MPB', 'Bossa Nova',
      'Rock', 'Pop', 'Rap', 'Trap', 'Hip-Hop', 'Reggae', 'Eletrônica', 'Jazz', 'Blues',
      'Música Clássica', 'Gospel', 'Brega', 'Arrocha', 'Frevo', 'K-Pop', 'Reggaeton'
    ]
  },
  {
    categoria_secreta: 'Grandes cantores e grupos da música brasileira (MPB, Samba, Pagode e Pop)',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Roberto Carlos', 'Tim Maia', 'Jorge Ben Jor', 'Caetano Veloso', 'Gilberto Gil', 'Chico Buarque',
      'Djavan', 'Elis Regina', 'Rita Lee', 'Ivete Sangalo', 'Anitta', 'Ludmilla', 'Thiaguinho',
      'Péricles', 'Ferrugem', 'Zeca Pagodinho', 'Alcione', 'Seu Jorge', 'Raça Negra', 'Exaltasamba', 'Grupo Revelação'
    ]
  }
];

const MUSICA_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual música para cantar no karaokê?' },
  { pergunta: 'Qual cantor ou banda brasileira?' },
  { pergunta: 'Qual instrumento musical?' },
  { pergunta: 'Qual ritmo musical para tocar na festa?' },
  { pergunta: 'Qual show ou festival de música?' },
  { pergunta: 'Qual dupla sertaneja ou grupo de pagode?' },
  { pergunta: 'Qual música internacional famosa?' },
  { pergunta: 'Qual música para ouvir viajando de carro?' }
];

// --- GAMES, NERD & ANIME DEDICATED BANKS ---
const GAMES_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'MINECRAFT', palavras_proibidas: ['BLOCOS', 'CUBO', 'STEVE', 'CREEPER', 'CONSTRUIR', 'DIAMANTE', 'PICARETA'] },
  { palavra_alvo: 'PIKACHU', palavras_proibidas: ['POKÉMON', 'AMARELO', 'CHOQUE', 'ASH', 'RATO', 'ELÉTRICO', 'POKÉBOLA'] },
  { palavra_alvo: 'SUPER MARIO', palavras_proibidas: ['NINTENDO', 'BIGODE', 'LUIGI', 'ENCANADOR', 'COGUMELO', 'PRINCESA', 'JOGO'] },
  { palavra_alvo: 'GOKU', palavras_proibidas: ['DRAGON BALL', 'KAMEHAMEHA', 'SAIYAJIN', 'VEGETA', 'ESFERAS', 'ANIME', 'CABELO'] },
  { palavra_alvo: 'GTA', palavras_proibidas: ['ROUBAR', 'CARRO', 'POLÍCIA', 'CJ', 'MISSÃO', 'ROCKSTAR', 'CIDADE'] },
  { palavra_alvo: 'NARUTO', palavras_proibidas: ['NINJA', 'RAPOSA', 'SASUKE', 'KONOHA', 'HOKAGE', 'RASENGAN', 'ANIME'] },
  { palavra_alvo: 'PLAYSTATION', palavras_proibidas: ['SONY', 'VIDEOGAME', 'CONSOLE', 'CONTROLE', 'XBOX', 'JOGAR', 'TV'] },
  { palavra_alvo: 'FREE FIRE', palavras_proibidas: ['CELULAR', 'TIRO', 'BATTLE ROYALE', 'CAPA', 'GARENA', 'DIAMANTE', 'PARAQUEDAS'] },
  { palavra_alvo: 'PAC-MAN', palavras_proibidas: ['COME-COME', 'FANTASMA', 'AMARELO', 'LABIRINTO', 'BOLINHA', 'FLIperama', 'CLÁSSICO'] },
  { palavra_alvo: 'SONIC', palavras_proibidas: ['AZUL', 'RÁPIDO', 'OURIÇO', 'ANÉIS', 'CORRER', 'SEGA', 'TAILS'] }
];

const GAMES_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Quantos Pokémon existiam na primeira geração clássica (Região de Kanto - Red/Blue)?',
    valor_exato: 151,
    unidade: 'Pokémon',
    curiosidade_explicacao: 'A Pokédex original de Kanto ia do Bulbasaur (#001) até o Mew (#151).'
  },
  {
    pergunta: 'Quantas Esferas do Dragão precisam ser reunidas no anime Dragon Ball para invocar Shenlong?',
    valor_exato: 7,
    unidade: 'esferas',
    curiosidade_explicacao: 'São exatamente 7 Esferas do Dragão, de 1 a 7 estrelas.'
  },
  {
    pergunta: 'Em que ano foi lançado o jogo Grand Theft Auto V (GTA 5) originalmente para PS3 e Xbox 360?',
    valor_exato: 2013,
    unidade: 'ano',
    curiosidade_explicacao: 'GTA V foi lançado em setembro de 2013 e se tornou um dos jogos mais vendidos da história.'
  },
  {
    pergunta: 'Quantos blocos de Obsidiana no mínimo são necessários para construir o portal do Nether no Minecraft (sem os cantos)?',
    valor_exato: 10,
    unidade: 'blocos',
    curiosidade_explicacao: 'O portal mínimo 4x5 sem os 4 blocos dos cantos exige exatamente 10 blocos de obsidiana!'
  },
  {
    pergunta: 'Quantos jogadores caem na ilha em uma partida padrão clássica de Fortnite Battle Royale?',
    valor_exato: 100,
    unidade: 'jogadores',
    curiosidade_explicacao: 'O modo Battle Royale clássico do Fortnite coloca 100 jogadores saltando do Ônibus de Batalha.'
  }
];

const GAMES_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Personagens famosos da história dos videogames',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Mario', 'Luigi', 'Bowser', 'Princesa Peach', 'Yoshi', 'Sonic', 'Pikachu', 'Charizard',
      'Kratos', 'Link', 'Zelda', 'Lara Croft', 'CJ (Carl Johnson)', 'Trevor', 'Pac-Man',
      'Ryu', 'Ken', 'Chun-Li', 'Scorpion', 'Sub-Zero', 'Crash Bandicoot', 'Leon S. Kennedy',
      'Master Chief', 'Steve (Minecraft)', 'Donkey Kong', 'Mega Man'
    ]
  },
  {
    categoria_secreta: 'Animes e mangás famosos conhecidos no Brasil',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Dragon Ball Z', 'Naruto', 'One Piece', 'Cavaleiros do Zodíaco', 'Pokémon', 'Death Note',
      'Attack on Titan', 'Demon Slayer', 'Jujutsu Kaisen', 'Yu-Gi-Oh!', 'Yu Yu Hakusho', 'Bleach',
      'Fullmetal Alchemist', 'Hunter x Hunter', 'My Hero Academia', 'One Punch Man', 'Sailor Moon',
      'InuYasha', 'Digimon', 'Sakura Card Captors', 'Beyblade', 'Chainsaw Man'
    ]
  },
  {
    categoria_secreta: 'Consoles de videogame lançados ao longo da história',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'PlayStation 1', 'PlayStation 2', 'PlayStation 3', 'PlayStation 4', 'PlayStation 5',
      'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X', 'Super Nintendo', 'Nintendo 64',
      'GameCube', 'Nintendo Wii', 'Nintendo Switch', 'Game Boy', 'Nintendo DS', 'Mega Drive',
      'Master System', 'Atari 2600', 'Dreamcast', 'PSP'
    ]
  },
  {
    categoria_secreta: 'Jogos de videogame e celular mais jogados do mundo',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Minecraft', 'GTA V', 'GTA San Andreas', 'FIFA / EA FC', 'Bomba Patch / PES', 'Fortnite',
      'Free Fire', 'Roblox', 'Counter-Strike (CS)', 'League of Legends (LoL)', 'Valorant',
      'Call of Duty', 'God of War', 'The Last of Us', 'Red Dead Redemption', 'Resident Evil 4',
      'Super Mario World', 'Mortal Kombat', 'Street Fighter', 'The Sims', 'Among Us', 'Clash Royale', 'Candy Crush'
    ]
  }
];

const GAMES_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual personagem famoso de videogame?' },
  { pergunta: 'Qual jogo para jogar com amigos?' },
  { pergunta: 'Qual anime ou mangá famoso?' },
  { pergunta: 'Qual console de videogame da história?' },
  { pergunta: 'Qual poder ou golpe de anime?' },
  { pergunta: 'Qual jogo clássico de celular?' },
  { pergunta: 'Qual vilão famoso dos videogames?' }
];

// --- COTIDIANO, BRASILIDADES & FAMÍLIA DEDICATED BANKS ---
const COTIDIANO_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'CHURRASCO', palavras_proibidas: ['CARNE', 'DOMINGO', 'CARVÃO', 'GRELHA', 'PICANHA', 'CERVEJA', 'ESPETO'] },
  { palavra_alvo: 'BOLETO', palavras_proibidas: ['PAGAR', 'CONTA', 'VENCIMENTO', 'BANCO', 'DINHEIRO', 'CÓDIGO DE BARRAS', 'MÊS'] },
  { palavra_alvo: 'CHINELO HAVAIANAS', palavras_proibidas: ['PÉ', 'DEDO', 'BORRACHA', 'SANDÁLIA', 'PRAIA', 'MÃE', 'TIRA'] },
  { palavra_alvo: 'FILTRO DE BARRO', palavras_proibidas: ['ÁGUA', 'VÓ', 'FRESQUINHA', 'VELA', 'COZINHA', 'TORNEIRA', 'SEDE'] },
  { palavra_alvo: 'DESPERTADOR', palavras_proibidas: ['ACORDAR', 'MANHÃ', 'SONECA', 'HORA', 'SONO', 'ALARME', 'CELULAR'] },
  { palavra_alvo: 'PIX', palavras_proibidas: ['TRANSFERÊNCIA', 'DINHEIRO', 'CHAVE', 'BANCO', 'PAGAR', 'CONTA', 'QR CODE'] },
  { palavra_alvo: 'GRUPO DA FAMÍLIA', palavras_proibidas: ['WHATSAPP', 'BOM DIA', 'TIA', 'MENSAGEM', 'FIGURINHA', 'CELULAR', 'PARENTES'] },
  { palavra_alvo: 'FEIRA LIVRE', palavras_proibidas: ['PASTEL', 'CALDO DE CANA', 'FRUTA', 'VERDURA', 'BARRACA', 'DOMINGO', 'GRITAR'] }
];

const COTIDIANO_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Qual é o número de telefone de três dígitos para acionar o SAMU (Ambulância) no Brasil?',
    valor_exato: 192,
    unidade: 'telefone',
    curiosidade_explicacao: 'No Brasil, 190 é Polícia Militar, 192 é SAMU e 193 é Corpo de Bombeiros.'
  },
  {
    pergunta: 'Quantos estados possui o Brasil (sem contar o Distrito Federal)?',
    valor_exato: 26,
    unidade: 'estados',
    curiosidade_explicacao: 'O Brasil tem 26 estados e 1 Distrito Federal, totalizando 27 unidades federativas.'
  },
  {
    pergunta: 'Quantos dígitos tem um número de CPF no Brasil (incluindo os dois dígitos verificadores)?',
    valor_exato: 11,
    unidade: 'dígitos',
    curiosidade_explicacao: 'O CPF é composto por 9 dígitos principais mais 2 dígitos verificadores (total de 11 números).'
  },
  {
    pergunta: 'Quantos dígitos tem um código de CEP completo de endereço no Brasil?',
    valor_exato: 8,
    unidade: 'dígitos',
    curiosidade_explicacao: 'O CEP brasileiro tem 8 algarismos no formato 00000-000.'
  },
  {
    pergunta: 'Qual é o valor em reais da maior cédula de dinheiro em circulação no Brasil (nota do lobo-guará)?',
    valor_exato: 200,
    unidade: 'reais',
    curiosidade_explicacao: 'A cédula de R$ 200 estampada com o lobo-guará foi lançada pelo Banco Central em 2020.'
  }
];

const COTIDIANO_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Objetos e eletrodomésticos encontrados dentro de uma cozinha brasileira',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Geladeira', 'Fogão', 'Micro-ondas', 'Liquidificador', 'Airfryer', 'Panela de pressão',
      'Frigideira', 'Filtro de barro', 'Cafeteira', 'Batedeira', 'Torradeira', 'Sanduicheira',
      'Garfo', 'Faca', 'Colher', 'Prato', 'Copo', 'Xícara', 'Tábua de carne', 'Escorredor de louça', 'Pote de sorvete com feijão'
    ]
  },
  {
    categoria_secreta: 'Coisas que as pessoas costumam levar para passar o dia na praia',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Protetor solar', 'Guarda-sol', 'Cadeira de praia', 'Canga', 'Toalha', 'Óculos de sol',
      'Chinelo', 'Chapéu / Boné', 'Cooler / Caixa térmica', 'Cerveja', 'Água de coco', 'Biquíni / Sunga',
      'Bola / Frescobol', 'Baldinho de areia', 'Bronzeador', 'Caixa de som'
    ]
  },
  {
    categoria_secreta: 'Estados e capitais do Brasil',
    total_itens_possiveis: 35,
    exemplos_validos: [
      'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Bahia', 'Paraná', 'Rio Grande do Sul',
      'Pernambuco', 'Ceará', 'Pará', 'Santa Catarina', 'Goiás', 'Maranhão', 'Amazonas',
      'Espírito Santo', 'Paraíba', 'Rio Grande do Norte', 'Alagoas', 'Mato Grosso', 'Belo Horizonte',
      'Salvador', 'Fortaleza', 'Recife', 'Curitiba', 'Porto Alegre', 'Manaus', 'Brasília'
    ]
  },
  {
    categoria_secreta: 'Supermercados, bancos e aplicativos que todo brasileiro usa no dia a dia',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'WhatsApp', 'Instagram', 'iFood', 'Uber', '99', 'Nubank', 'Itaú', 'Bradesco',
      'Banco do Brasil', 'Caixa Econômica', 'Santander', 'Mercado Livre', 'Shopee',
      'Carrefour', 'Assaí', 'Atacadão', 'Pão de Açúcar', 'Gov.br', 'YouTube', 'TikTok'
    ]
  }
];

const COTIDIANO_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual tarefa doméstica do dia a dia?' },
  { pergunta: 'Qual presente de aniversário?' },
  { pergunta: 'Qual desculpa para chegar atrasado?' },
  { pergunta: 'Qual eletrodoméstico da casa?' },
  { pergunta: 'Qual passeio de domingo em família?' },
  { pergunta: 'Qual coisa que tem na feira livre?' }
];

const POP_GERAL_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: 'O que tem dentro da bolsa da sua mãe?',
    respostas: [
      { texto: 'Carteira / Dinheiro / Moedas', sinonimos_aceitos: ['Carteira', 'Dinheiro', 'Cartao'], votos: 38 },
      { texto: 'Celular', sinonimos_aceitos: ['Telefone', 'Smartphone'], votos: 30 },
      { texto: 'Remédio (Dorflex / Dipirona)', sinonimos_aceitos: ['Remedio', 'Comprimido', 'Dorflex'], votos: 24 },
      { texto: 'Chaves de casa / do carro', sinonimos_aceitos: ['Chave', 'Chaves'], votos: 20 },
      { texto: 'Batom / Maquiagem / Espelhinho', sinonimos_aceitos: ['Batom', 'Maquiagem', 'Espelho'], votos: 18 },
      { texto: 'Bala / Chiclete / Halls', sinonimos_aceitos: ['Bala', 'Chiclete', 'Balinha'], votos: 16 },
      { texto: 'Óculos de grau ou de sol', sinonimos_aceitos: ['Oculos'], votos: 15 },
      { texto: 'Guarda-chuva / Sombrinha', sinonimos_aceitos: ['Sombrinha', 'Guarda chuva'], votos: 14 },
      { texto: 'Lenço de papel / Papel higiênico / Álcool em gel', sinonimos_aceitos: ['Lenco', 'Alcool em gel', 'Papel'], votos: 13 },
      { texto: 'Caneta / Papelzinho / Conta paga', sinonimos_aceitos: ['Caneta', 'Boleto', 'Documento', 'RG'], votos: 12 }
    ]
  },
  {
    pergunta: 'O que as pessoas fazem enquanto estão no banheiro?',
    respostas: [
      { texto: 'Mexer no celular (TikTok / Instagram / Reels)', sinonimos_aceitos: ['Celular', 'TikTok', 'Instagram', 'WhatsApp'], votos: 46 },
      { texto: 'Cantar no chuveiro', sinonimos_aceitos: ['Cantar', 'Musica'], votos: 28 },
      { texto: 'Ler o rótulo do shampoo quando esquece o celular', sinonimos_aceitos: ['Ler shampoo', 'Rotulo', 'Shampoo'], votos: 22 },
      { texto: 'Pensar na vida / Discutir mentalmente', sinonimos_aceitos: ['Pensar', 'Refletir'], votos: 20 },
      { texto: 'Responder mensagens no WhatsApp', sinonimos_aceitos: ['Zap', 'Mensagem'], votos: 18 },
      { texto: 'Se olhar no espelho / Espremer espinha', sinonimos_aceitos: ['Espelho', 'Espinha'], votos: 16 },
      { texto: 'Jogar joguinho no celular', sinonimos_aceitos: ['Jogar', 'Jogo'], votos: 14 },
      { texto: 'Ouvir música ou podcast', sinonimos_aceitos: ['Ouvir musica', 'Podcast'], votos: 13 },
      { texto: 'Escovar os dentes / Fazer a barba', sinonimos_aceitos: ['Escovar os dentes', 'Barba'], votos: 12 },
      { texto: 'Cochilar / Fugir das visitas ou do trabalho', sinonimos_aceitos: ['Dormir', 'Cochilar', 'Esconder'], votos: 11 }
    ]
  },
  {
    pergunta: 'O que tem na porta da geladeira de todo brasileiro?',
    respostas: [
      { texto: 'Garrafa de água gelada', sinonimos_aceitos: ['Agua', 'Garrafa de agua'], votos: 40 },
      { texto: 'Ovos', sinonimos_aceitos: ['Ovo'], votos: 30 },
      { texto: 'Leite', sinonimos_aceitos: ['Caixa de leite'], votos: 24 },
      { texto: 'Ketchup', sinonimos_aceitos: ['Mostarda', 'Maionese', 'Molho'], votos: 22 },
      { texto: 'Refrigerante', sinonimos_aceitos: ['Coca', 'Suco'], votos: 18 },
      { texto: 'Manteiga', sinonimos_aceitos: ['Margarina', 'Requeijao'], votos: 16 },
      { texto: 'Cerveja', sinonimos_aceitos: ['Latas de cerveja'], votos: 14 },
      { texto: 'Limão cortado pela metade', sinonimos_aceitos: ['Limao', 'Meio limao'], votos: 13 },
      { texto: 'Remédio', sinonimos_aceitos: ['Xarope', 'Colirio'], votos: 12 },
      { texto: 'Sachês de molho', sinonimos_aceitos: ['Sache', 'Shoyu', 'Vinagre'], votos: 11 }
    ]
  },
  {
    pergunta: 'Qual é a primeira coisa que você faz depois de acordar?',
    respostas: [
      { texto: 'Olhar o celular', sinonimos_aceitos: ['WhatsApp', 'Celular', 'Olhar celular'], votos: 42 },
      { texto: 'Desligar o despertador', sinonimos_aceitos: ['Soneca', 'Despertador'], votos: 30 },
      { texto: 'Ir ao banheiro', sinonimos_aceitos: ['Xixi', 'Banheiro'], votos: 24 },
      { texto: 'Escovar os dentes', sinonimos_aceitos: ['Lavar o rosto'], votos: 20 },
      { texto: 'Tomar café', sinonimos_aceitos: ['Passar cafe', 'Cafe'], votos: 18 },
      { texto: 'Beber água', sinonimos_aceitos: ['Tomar agua', 'Agua'], votos: 15 },
      { texto: 'Espreguiçar', sinonimos_aceitos: ['Bocejar'], votos: 14 },
      { texto: 'Reclamar de sono', sinonimos_aceitos: ['Voltar a dormir', 'Reclamar'], votos: 13 },
      { texto: 'Tomar banho', sinonimos_aceitos: ['Banho'], votos: 12 },
      { texto: 'Arrumar a cama', sinonimos_aceitos: ['Abrir a janela'], votos: 12 }
    ]
  },
  {
    pergunta: 'Como os casais se chamam carinhosamente no Brasil?',
    respostas: [
      { texto: 'Amor', sinonimos_aceitos: ['Mozao', 'Mor'], votos: 42 },
      { texto: 'Vida', sinonimos_aceitos: ['Minha vida'], votos: 30 },
      { texto: 'Bebê', sinonimos_aceitos: ['Baby'], votos: 24 },
      { texto: 'Meu bem', sinonimos_aceitos: ['Bem', 'Benzinho'], votos: 20 },
      { texto: 'Momô', sinonimos_aceitos: ['Mo'], votos: 18 },
      { texto: 'Princesa', sinonimos_aceitos: ['Principe', 'Rei', 'Rainha'], votos: 16 },
      { texto: 'Tchutchuca', sinonimos_aceitos: ['Tigrao'], votos: 14 },
      { texto: 'Nego', sinonimos_aceitos: ['Nega', 'Preta'], votos: 13 },
      { texto: 'Cheiro', sinonimos_aceitos: ['Chuchu', 'Xuxu', 'Meu cheiro'], votos: 12 },
      { texto: 'Paixão', sinonimos_aceitos: ['Coracao', 'Docinho', 'Lindo'], votos: 11 }
    ]
  },
  {
    pergunta: 'O que faz você perder o interesse na pessoa já no primeiro encontro (date)?',
    respostas: [
      { texto: 'Mau hálito', sinonimos_aceitos: ['Bafo', 'Cheiro ruim'], votos: 38 },
      { texto: 'Não largar o celular na mesa', sinonimos_aceitos: ['Mexer no celular', 'Celular'], votos: 30 },
      { texto: 'Tratar mal o garçom', sinonimos_aceitos: ['Arrogante', 'Mal educado'], votos: 26 },
      { texto: 'Falar do ex o tempo todo', sinonimos_aceitos: ['Falar de ex', 'Ex namorado'], votos: 22 },
      { texto: 'Ser mão de vaca na conta', sinonimos_aceitos: ['Pao duro', 'Conta'], votos: 18 },
      { texto: 'Só falar de si mesmo', sinonimos_aceitos: ['Egocentrico'], votos: 16 },
      { texto: 'Chegar muito atrasado sem avisar', sinonimos_aceitos: ['Atraso'], votos: 14 },
      { texto: 'Comer de boca aberta', sinonimos_aceitos: ['Falta de educacao'], votos: 13 },
      { texto: 'Mentir descaradamente', sinonimos_aceitos: ['Mentiroso', 'Contar vantagem'], votos: 12 },
      { texto: 'Dar vexame bêbado', sinonimos_aceitos: ['Bebado', 'Passar vergonha'], votos: 11 }
    ]
  },
  {
    pergunta: 'Quais as desculpas mais clássicas para se atrasar a um compromisso?',
    respostas: [
      { texto: 'Trânsito engarrafado', sinonimos_aceitos: ['Transito', 'Engarrafamento'], votos: 42 },
      { texto: 'Pneu furou', sinonimos_aceitos: ['Carro quebrou', 'Mecanico'], votos: 28 },
      { texto: 'Perdi a hora', sinonimos_aceitos: ['Despertador', 'Dormi demais'], votos: 24 },
      { texto: 'Passei mal', sinonimos_aceitos: ['Dor de barriga', 'Doente', 'Enxaqueca'], votos: 20 },
      { texto: 'Chuva forte', sinonimos_aceitos: ['Temporal', 'Alagamento'], votos: 18 },
      { texto: 'Ônibus atrasou', sinonimos_aceitos: ['Uber cancelou', 'Metro'], votos: 16 },
      { texto: 'Consulta médica de última hora', sinonimos_aceitos: ['Dentista', 'Exame'], votos: 14 },
      { texto: 'Esqueci a chave de casa', sinonimos_aceitos: ['Voltei em casa', 'Documento'], votos: 13 },
      { texto: 'Bateria do celular acabou', sinonimos_aceitos: ['Sem bateria', 'Descarregou'], votos: 13 },
      { texto: 'Imprevisto familiar', sinonimos_aceitos: ['Filho', 'Cachorro', 'Pet'], votos: 12 }
    ]
  }
];

// --- RELACIONAMENTOS, CRUSH & TRETAS DEDICATED BANKS ---
const RELACIONAMENTOS_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  POP_GERAL_TEM_OU_NAO_TEM[4], // Como os casais se chamam carinhosamente no Brasil?
  POP_GERAL_TEM_OU_NAO_TEM[5], // O que faz você perder o interesse na pessoa já no primeiro encontro (date)?
  {
    pergunta: 'Quais os lugares mais escolhidos para levar o crush no primeiro encontro (date)?',
    respostas: [
      { texto: 'Barzinho', sinonimos_aceitos: ['Bar', 'Boteco', 'Chopp'], votos: 38 },
      { texto: 'Restaurante', sinonimos_aceitos: ['Jantar romantico', 'Pizzaria', 'Japa'], votos: 30 },
      { texto: 'Cinema', sinonimos_aceitos: ['Filme'], votos: 24 },
      { texto: 'Cafeteria', sinonimos_aceitos: ['Sorveteria', 'Acai'], votos: 20 },
      { texto: 'Shopping', sinonimos_aceitos: ['Praca de alimentacao'], votos: 18 },
      { texto: 'Praia', sinonimos_aceitos: ['Calcadao', 'Orla', 'Por do sol'], votos: 16 },
      { texto: 'Parque ao ar livre', sinonimos_aceitos: ['Praca', 'Parque'], votos: 14 },
      { texto: 'Hamburgueria', sinonimos_aceitos: ['Lanchonete', 'Podrao'], votos: 14 },
      { texto: 'Show ao vivo', sinonimos_aceitos: ['Balada', 'Festa'], votos: 13 },
      { texto: 'Assistir filme em casa', sinonimos_aceitos: ['Netflix', 'Pedir delivery'], votos: 13 }
    ]
  },
  {
    pergunta: 'Quais os motivos mais comuns de DR (discussão de relação) entre casais?',
    respostas: [
      { texto: 'Ciúmes', sinonimos_aceitos: ['Curtida no Instagram', 'Ex', 'Rede social'], votos: 40 },
      { texto: 'Dinheiro', sinonimos_aceitos: ['Gastos financeiros', 'Contas'], votos: 28 },
      { texto: 'Indecisão sobre onde comer', sinonimos_aceitos: ['Comida', 'Onde comer', 'Fome'], votos: 24 },
      { texto: 'Demora para responder mensagens', sinonimos_aceitos: ['WhatsApp', 'Visualizar e nao responder'], votos: 20 },
      { texto: 'Bagunça em casa', sinonimos_aceitos: ['Toalha molhada na cama', 'Louca', 'Limpeza'], votos: 18 },
      { texto: 'Atraso para sair', sinonimos_aceitos: ['Demora para se arrumar'], votos: 16 },
      { texto: 'Família e parentes', sinonimos_aceitos: ['Sogra', 'Familia'], votos: 15 },
      { texto: 'Videogame e futebol', sinonimos_aceitos: ['Futebol', 'Amigos', 'Bar'], votos: 14 },
      { texto: 'Esquecer datas especiais', sinonimos_aceitos: ['Aniversario de namoro'], votos: 13 },
      { texto: 'Ronco de madrugada', sinonimos_aceitos: ['Coberta', 'Dormir'], votos: 12 }
    ]
  }
];

const RELACIONAMENTOS_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'CIÚMES', palavras_proibidas: ['NAMORADO', 'BRIGA', 'EX', 'CELULAR', 'DESCONFIAR', 'CASAL', 'SENTIMENTO'] },
  { palavra_alvo: 'TINDER', palavras_proibidas: ['APLICATIVO', 'MATCH', 'ENCONTRO', 'SOLTEIRO', 'FOTOS', 'DESLIZAR', 'PAQUERA'] },
  { palavra_alvo: 'ALIANÇA', palavras_proibidas: ['ANEL', 'DEDO', 'CASAMENTO', 'OURO', 'NOIVADO', 'COMPROMISSO', 'MÃO'] },
  { palavra_alvo: 'SOGRA', palavras_proibidas: ['MÃE', 'NAMORADO', 'ESPOSA', 'MARIDO', 'FAMÍLIA', 'GENRO', 'NORA'] },
  { palavra_alvo: 'PRIMEIRO BEIJO', palavras_proibidas: ['BOCA', 'LÍNGUA', 'ENCONTRO', 'NAMORO', 'PAIXÃO', 'ABRAÇO', 'ROMÂNTICO'] },
  { palavra_alvo: 'LUA DE MEL', palavras_proibidas: ['VIAGEM', 'CASAMENTO', 'NOIVOS', 'HOTEL', 'ROMÂNTICO', 'FESTA', 'CASAL'] },
  { palavra_alvo: 'STALKEAR', palavras_proibidas: ['INSTAGRAM', 'PERFIL', 'CURTIR', 'FOTO', 'ANTIGA', 'EX', 'INVESTIGAR'] },
  { palavra_alvo: 'FRIENDZONE', palavras_proibidas: ['AMIGO', 'AMIZADE', 'CRUSH', 'ILUDIDO', 'APAIXONADO', 'FORA', 'IRMÃO'] }
];

const RELACIONAMENTOS_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Em qual dia do mês de junho é comemorado o Dia dos Namorados no Brasil?',
    valor_exato: 12,
    unidade: 'de junho',
    curiosidade_explicacao: 'No Brasil, o Dia dos Namorados é celebrado em 12 de junho, véspera do dia de Santo Antônio (o santo casamenteiro).'
  },
  {
    pergunta: 'Quantos anos de casamento um casal comemora quando celebra as famosas Bodas de Ouro?',
    valor_exato: 50,
    unidade: 'anos',
    curiosidade_explicacao: 'Bodas de Prata são 25 anos, Bodas de Ouro são 50 anos e Bodas de Diamante são 60 anos de casados!'
  },
  {
    pergunta: 'Quantos anos de casamento representam as tradicionais Bodas de Prata?',
    valor_exato: 25,
    unidade: 'anos',
    curiosidade_explicacao: 'As Bodas de Prata celebram exatos 25 anos de união matrimonial.'
  },
  {
    pergunta: 'Em qual dia de fevereiro é celebrado o Valentine\'s Day (Dia de São Valentim) nos Estados Unidos e Europa?',
    valor_exato: 14,
    unidade: 'de fevereiro',
    curiosidade_explicacao: 'O Dia de São Valentim é comemorado mundialmente em 14 de fevereiro.'
  }
];

const RELACIONAMENTOS_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Apelidos carinhosos que casais usam para se chamar no Brasil',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Amor', 'Mozão', 'Vida', 'Bebê', 'Bem', 'Meu bem', 'Benzinho', 'Momô', 'Princesa',
      'Príncipe', 'Paixão', 'Coração', 'Docinho', 'Cheiro', 'Xuxu', 'Tigrão', 'Tchutchuca',
      'Nego', 'Nega', 'Lindo', 'Linda', 'Gato', 'Gata', 'Tesouro'
    ]
  },
  {
    categoria_secreta: 'Presentes clássicos de Dia dos Namorados ou aniversário de namoro',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Buquê de flores', 'Caixa de bombom / Chocolate', 'Perfume', 'Aliança / Anel', 'Colar / Joia',
      'Urso de pelúcia', 'Cesta de café da manhã', 'Jantar romântico', 'Relógio', 'Roupa',
      'Sapato / Tênis', 'Carta de amor', 'Porta-retrato com foto', 'Viagem de fim de semana', 'Vinho'
    ]
  },
  {
    categoria_secreta: 'Lugares para ir em um primeiro encontro (date)',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Barzinho', 'Restaurante italiano', 'Restaurante japonês', 'Pizzaria', 'Cinema', 'Cafeteria',
      'Sorveteria', 'Hamburgueria', 'Parque', 'Praia', 'Shopping', 'Show ao vivo', 'Boliche',
      'Museu / Exposição', 'Teatro / Stand-up', 'Feirinha gastronômica', 'Mirante'
    ]
  }
];

const RELACIONAMENTOS_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual lugar para ir em um primeiro encontro?' },
  { pergunta: 'Qual apelido carinhoso de casal?' },
  { pergunta: 'Qual presente de Dia dos Namorados?' },
  { pergunta: 'Qual cantada ou elogio na paquera?' },
  { pergunta: 'Qual desculpa para terminar um namoro?' },
  { pergunta: 'Qual música romântica de casal?' }
];

// --- PROFISSÕES, TRABALHO & ESTUDOS DEDICATED BANKS ---
const PROFISSOES_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  POP_GERAL_TEM_OU_NAO_TEM[6], // Quais as desculpas mais clássicas para se atrasar ou faltar a um compromisso?
  {
    pergunta: 'Quais as profissões que as crianças mais sonham em ter?',
    respostas: [
      { texto: 'Jogador de Futebol', sinonimos_aceitos: ['Atleta', 'Futebolista'], votos: 38 },
      { texto: 'Médico', sinonimos_aceitos: ['Pediatra', 'Medica', 'Doutor'], votos: 30 },
      { texto: 'Veterinário', sinonimos_aceitos: ['Veterinaria', 'Cuidar de bichos'], votos: 24 },
      { texto: 'Bombeiro', sinonimos_aceitos: ['Policial'], votos: 20 },
      { texto: 'Astronauta', sinonimos_aceitos: ['Cosmonauta'], votos: 18 },
      { texto: 'Professor', sinonimos_aceitos: ['Professora'], votos: 16 },
      { texto: 'Youtuber', sinonimos_aceitos: ['Influencer', 'Streamer', 'Gamer'], votos: 15 },
      { texto: 'Cantor', sinonimos_aceitos: ['Ator', 'Atriz', 'Artista'], votos: 14 },
      { texto: 'Piloto de Avião', sinonimos_aceitos: ['Piloto', 'Aviador'], votos: 13 },
      { texto: 'Advogado', sinonimos_aceitos: ['Engenheiro', 'Cientista'], votos: 12 }
    ]
  },
  {
    pergunta: 'O que não pode faltar na mesa de trabalho no computador?',
    respostas: [
      { texto: 'Caneca de café', sinonimos_aceitos: ['Xicara', 'Garrafa de agua', 'Cafe'], votos: 42 },
      { texto: 'Notebook', sinonimos_aceitos: ['Computador', 'Monitor extra'], votos: 30 },
      { texto: 'Mouse e Teclado', sinonimos_aceitos: ['Mouse', 'Teclado'], votos: 24 },
      { texto: 'Fone de ouvido', sinonimos_aceitos: ['Headset'], votos: 20 },
      { texto: 'Carregador de celular', sinonimos_aceitos: ['Celular', 'Cabo'], votos: 18 },
      { texto: 'Bloco de notas', sinonimos_aceitos: ['Post-it', 'Caderno', 'Agenda'], votos: 16 },
      { texto: 'Caneta', sinonimos_aceitos: ['Porta canetas'], votos: 15 },
      { texto: 'Cadeira ergonômica', sinonimos_aceitos: ['Apoio de pe'], votos: 13 },
      { texto: 'Luminária de mesa', sinonimos_aceitos: ['Planta', 'Luminaria'], votos: 11 },
      { texto: 'Lanchinho', sinonimos_aceitos: ['Biscoito', 'Chocolate', 'Remedio'], votos: 11 }
    ]
  }
];

const PROFISSOES_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'ATESTADO MÉDICO', palavras_proibidas: ['FALTAR', 'TRABALHO', 'DOENTE', 'HOSPITAL', 'DOUTOR', 'CHEFE', 'DIAS'] },
  { palavra_alvo: 'HOME OFFICE', palavras_proibidas: ['CASA', 'TRABALHAR', 'REMOTO', 'COMPUTADOR', 'PIJAMA', 'REUNIÃO', 'ESCRITÓRIO'] },
  { palavra_alvo: 'ENTREVISTA DE EMPREGO', palavras_proibidas: ['CURRÍCULO', 'VAGA', 'CONTRATAR', 'RH', 'CHEFE', 'SALÁRIO', 'PERGUNTAS'] },
  { palavra_alvo: 'FÉRIAS', palavras_proibidas: ['DESCANSAR', 'TRINTA DIAS', 'VIAGEM', 'TRABALHO', 'PRAIA', 'FOLGA', 'ANO'] },
  { palavra_alvo: 'PROFESSOR', palavras_proibidas: ['ESCOLA', 'ALUNO', 'AULA', 'PROVA', 'QUADRO', 'ENSINAR', 'MATÉRIA'] },
  { palavra_alvo: 'ESTAGIÁRIO', palavras_proibidas: ['FACULDADE', 'APRENDER', 'CULPA', 'BOLSA', 'JOVEM', 'EMPRESA', 'EFETIVADO'] },
  { palavra_alvo: 'DÉCIMO TERCEIRO', palavras_proibidas: ['SALÁRIO', 'FIM DE ANO', 'DEZEMBRO', 'DINHEIRO', 'PARCELA', 'NATAL', 'EXTRA'] },
  { palavra_alvo: 'VESTIBULAR', palavras_proibidas: ['ENEM', 'FACULDADE', 'PROVA', 'REDAÇÃO', 'ESTUDAR', 'PASSAR', 'UNIVERSIDADE'] }
];

const PROFISSOES_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Qual é a nota máxima que um estudante pode tirar na Redação do ENEM no Brasil?',
    valor_exato: 1000,
    unidade: 'pontos',
    curiosidade_explicacao: 'A redação do ENEM avalia 5 competências de 200 pontos cada, totalizando nota máxima 1000!'
  },
  {
    pergunta: 'Quantas horas semanais compõem a jornada máxima padrão de trabalho CLT na Constituição Brasileira?',
    valor_exato: 44,
    unidade: 'horas',
    curiosidade_explicacao: 'A Constituição Federal estabelece o limite padrão de 8 horas diárias e 44 horas semanais na CLT.'
  },
  {
    pergunta: 'Quantos dias corridos de férias remuneradas um trabalhador CLT tem direito após 12 meses de trabalho (sem faltas)?',
    valor_exato: 30,
    unidade: 'dias',
    curiosidade_explicacao: 'A cada período aquisitivo de 12 meses, o trabalhador CLT adquire direito a 30 dias de férias.'
  },
  {
    pergunta: 'Quantos anos dura normalmente a graduação da faculdade de Medicina no Brasil?',
    valor_exato: 6,
    unidade: 'anos',
    curiosidade_explicacao: 'O curso de Medicina no Brasil tem duração mínima oficial de 6 anos (12 semestres), incluindo o internato.'
  }
];

const PROFISSOES_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Profissões e carreiras conhecidas no mercado de trabalho',
    total_itens_possiveis: 35,
    exemplos_validos: [
      'Médico', 'Advogado', 'Engenheiro', 'Professor', 'Enfermeiro', 'Dentista', 'Arquiteto',
      'Psicólogo', 'Veterinário', 'Contador', 'Programador', 'Designer', 'Jornalista', 'Farmacêutico',
      'Fisioterapeuta', 'Nutricionista', 'Bombeiro', 'Policial', 'Piloto', 'Chef de Cozinha',
      'Eletricista', 'Mecânico', 'Cabeleireiro', 'Motorista', 'Garçom', 'Vendedor'
    ]
  },
  {
    categoria_secreta: 'Matérias escolares do ensino fundamental e médio no Brasil',
    total_itens_possiveis: 20,
    exemplos_validos: [
      'Matemática', 'Português', 'História', 'Geografia', 'Biologia', 'Física', 'Química',
      'Inglês', 'Espanhol', 'Educação Física', 'Artes', 'Filosofia', 'Sociologia',
      'Literatura', 'Redação', 'Ciências', 'Informática'
    ]
  },
  {
    categoria_secreta: 'Objetos de material escolar ou de escritório',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Caneta', 'Lápis', 'Borracha', 'Apontador', 'Caderno', 'Mochila', 'Estojo', 'Régua',
      'Tesoura', 'Cola', 'Lápis de cor', 'Canetinha', 'Marca-texto', 'Grampeador', 'Clipes',
      'Corretivo', 'Calculadora', 'Pasta', 'Post-it', 'Compasso'
    ]
  }
];

const PROFISSOES_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual profissão ou trabalho?' },
  { pergunta: 'Qual matéria da época da escola?' },
  { pergunta: 'Qual curso de faculdade?' },
  { pergunta: 'Qual desculpa para faltar na segunda-feira?' },
  { pergunta: 'Qual benefício de empresa ou trabalho?' },
  { pergunta: 'Qual comida de marmita no trabalho?' }
];

// --- CULTURA POP, CELEBRIDADES, MEMES & TV DEDICATED BANKS ---
const CULTURA_POP_PROIBIDO_CARDS: ProibidoCard[] = [
  { palavra_alvo: 'BIG BROTHER BRASIL', palavras_proibidas: ['GLOBO', 'PAREDÃO', 'REALITY', 'CASA', 'ELIMINADO', 'TADEU', 'LÍDER'] },
  { palavra_alvo: 'SILVIO SANTOS', palavras_proibidas: ['SBT', 'AVIÃOZINHO', 'MA OE', 'DOMINGO', 'BAÚ', 'APRESENTADOR', 'DINHEIRO'] },
  { palavra_alvo: 'MEME', palavras_proibidas: ['ENGRAÇADO', 'INTERNET', 'VIRAL', 'RIR', 'FIGURINHA', 'WHATSAPP', 'PIADA'] },
  { palavra_alvo: 'ANA MARIA BRAGA', palavras_proibidas: ['MAIS VOCÊ', 'LOURO JOSÉ', 'MANHÃ', 'GLOBO', 'RECEITA', 'ACORDA MENINA', 'MESA'] },
  { palavra_alvo: 'FAUSTÃO', palavras_proibidas: ['OLOCO MEU', 'DOMINGÃO', 'VÍDEO CASSETADAS', 'APRESENTADOR', 'FOGO', 'DANÇA DOS FAMOSOS', 'ARQUIVO CONFIDENCIAL'] },
  { palavra_alvo: 'CARRETA FURACÃO', palavras_proibidas: ['FOFÃO', 'TRENZINHO', 'DANÇAR', 'RUA', 'FANTASIA', 'MÚSICA', 'SIGA EM FRENTE'] },
  { palavra_alvo: 'NOVELA DAS NOVE', palavras_proibidas: ['GLOBO', 'AVENIDA BRASIL', 'VILÃ', 'CAPÍTULO', 'FINAL', 'TELEVISÃO', 'ATOR'] },
  { palavra_alvo: 'INFLUENCIADOR DIGITAL', palavras_proibidas: ['INSTAGRAM', 'SEGUIDORES', 'STORIES', 'PUBLI', 'INTERNET', 'TIKTOK', 'FAMOSO'] }
];

const CULTURA_POP_LIMITE: LimiteRoundData[] = [
  {
    pergunta: 'Em que ano foi ao ar a primeiríssima edição do Big Brother Brasil (BBB 1, vencida por Kleber Bambam)?',
    valor_exato: 2002,
    unidade: 'ano',
    curiosidade_explicacao: 'O BBB 1 estreou na TV Globo em janeiro de 2002, consagrando Kleber Bambam e a boneca Maria Eugênia.'
  },
  {
    pergunta: 'Em que ano a novela fenômeno Avenida Brasil (Carminha e Nina) foi exibida originalmente na TV Globo?',
    valor_exato: 2012,
    unidade: 'ano',
    curiosidade_explicacao: 'Avenida Brasil parou o país em 2012 com a rivalidade entre Nina e Carminha.'
  },
  {
    pergunta: 'Qual é o número do canal histórico da TV Globo no sinal aberto da cidade do Rio de Janeiro?',
    valor_exato: 4,
    unidade: 'canal',
    curiosidade_explicacao: 'No Rio de Janeiro a Globo é historicamente o Canal 4 (e em São Paulo, o Canal 5).'
  },
  {
    pergunta: 'Quantos segundos no máximo podiam durar os vídeos do TikTok quando a plataforma foi lançada inicialmente?',
    valor_exato: 15,
    unidade: 'segundos',
    curiosidade_explicacao: 'No lançamento original, os vídeos curtos do TikTok tinham limite padrão de 15 segundos.'
  }
];

const CULTURA_POP_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: 'Apresentadores famosos da televisão brasileira',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Silvio Santos', 'Faustão', 'Gugu Liberato', 'Luciano Huck', 'Marcos Mion', 'Ana Maria Braga',
      'Fátima Bernardes', 'Xuxa', 'Eliana', 'Celso Portiolli', 'Ratinho', 'Rodrigo Faro',
      'Tadeu Schmidt', 'Tiago Leifert', 'Pedro Bial', 'Serginho Groisman', 'Hebe Camargo',
      'Sabrina Sato', 'Tatá Werneck', 'Datena', 'William Bonner', 'Craque Neto'
    ]
  },
  {
    categoria_secreta: 'Novelas clássicas e famosas da televisão brasileira',
    total_itens_possiveis: 30,
    exemplos_validos: [
      'Avenida Brasil', 'O Clone', 'Senhora do Destino', 'Vale Tudo', 'Roque Santeiro',
      'Pantanal', 'O Rei do Gado', 'Terra Nostra', 'Laços de Família', 'Mulheres de Areia',
      'A Viagem', 'Chocolate com Pimenta', 'Alma Gêmea', 'O Cravo e a Rosa', 'Caminho das Índias',
      'Império', 'Amor à Vida', 'Carrossel', 'Chiquititas', 'Rebelde', 'Malhação'
    ]
  },
  {
    categoria_secreta: 'Participantes históricos e campeões do Big Brother Brasil (BBB)',
    total_itens_possiveis: 25,
    exemplos_validos: [
      'Juliette', 'Gil do Vigor', 'Kleber Bambam', 'Sabrina Sato', 'Grazi Massafera',
      'Jean Wyllys', 'Diego Alemão', 'Dourado', 'Manu Gavassi', 'Babu Santana', 'Prior',
      'Arthur Aguiar', 'Jade Picon', 'Davi Brito', 'Thelma Assis', 'Gleici Damasceno',
      'Emilly Araújo', 'Ana Paula Renault', 'Karol Conká', 'Fiuk', 'Viih Tube'
    ]
  }
];

const CULTURA_POP_NOTA: NotaRoundData[] = [
  { pergunta: 'Qual programa da televisão brasileira?' },
  { pergunta: 'Qual novela famosa da TV?' },
  { pergunta: 'Qual meme famoso da internet?' },
  { pergunta: 'Qual apresentador de TV brasileiro?' },
  { pergunta: 'Qual participante histórico de reality show?' },
  { pergunta: 'Qual rede social ou aplicativo?' }
];

// ============================================================================
// UNIFIED CATEGORY MAPS FOR ALL 11 CATEGORIES + CUSTOM
// ============================================================================

const TEM_BANKS_BY_CATEGORY: Record<ThemeCategory, TemOuNaoTemRoundData[]> = {
  comida: COMIDA_TEM_OU_NAO_TEM,
  animais: ANIMAIS_TEM_OU_NAO_TEM,
  futebol: FUTEBOL_TEM_OU_NAO_TEM,
  cinema: CINEMA_TEM_OU_NAO_TEM,
  musica: MUSICA_TEM_OU_NAO_TEM,
  games: GAMES_TEM_OU_NAO_TEM,
  ciencia: CIENCIA_TEM_OU_NAO_TEM,
  cotidiano: POP_GERAL_TEM_OU_NAO_TEM.slice(0, 4),
  relacionamentos: RELACIONAMENTOS_TEM_OU_NAO_TEM,
  profissoes: PROFISSOES_TEM_OU_NAO_TEM,
  cultura_pop: POP_GERAL_TEM_OU_NAO_TEM,
  custom: [
    ...POP_GERAL_TEM_OU_NAO_TEM,
    ...COMIDA_TEM_OU_NAO_TEM,
    ...FUTEBOL_TEM_OU_NAO_TEM,
    ...CINEMA_TEM_OU_NAO_TEM,
    ...MUSICA_TEM_OU_NAO_TEM,
    ...ANIMAIS_TEM_OU_NAO_TEM,
    ...RELACIONAMENTOS_TEM_OU_NAO_TEM
  ]
};

const NOTA_BANKS_BY_CATEGORY: Record<ThemeCategory, NotaRoundData[]> = {
  comida: COMIDA_NOTA,
  animais: ANIMAIS_NOTA,
  futebol: FUTEBOL_NOTA,
  cinema: CINEMA_NOTA,
  musica: MUSICA_NOTA,
  games: GAMES_NOTA,
  ciencia: CIENCIA_NOTA,
  cotidiano: COTIDIANO_NOTA,
  relacionamentos: RELACIONAMENTOS_NOTA,
  profissoes: PROFISSOES_NOTA,
  cultura_pop: CULTURA_POP_NOTA,
  custom: [
    ...COTIDIANO_NOTA,
    ...COMIDA_NOTA,
    ...CINEMA_NOTA,
    ...MUSICA_NOTA,
    ...FUTEBOL_NOTA,
    ...CULTURA_POP_NOTA,
    ...RELACIONAMENTOS_NOTA
  ]
};

const PROIBIDO_BANKS_BY_CATEGORY: Record<ThemeCategory, ProibidoCard[]> = {
  comida: COMIDA_PROIBIDO_CARDS,
  animais: ANIMAIS_PROIBIDO_CARDS,
  futebol: FUTEBOL_PROIBIDO_CARDS,
  cinema: CINEMA_PROIBIDO_CARDS,
  musica: MUSICA_PROIBIDO_CARDS,
  games: GAMES_PROIBIDO_CARDS,
  ciencia: CIENCIA_PROIBIDO_CARDS,
  cotidiano: COTIDIANO_PROIBIDO_CARDS,
  relacionamentos: RELACIONAMENTOS_PROIBIDO_CARDS,
  profissoes: PROFISSOES_PROIBIDO_CARDS,
  cultura_pop: CULTURA_POP_PROIBIDO_CARDS,
  custom: [
    ...CULTURA_POP_PROIBIDO_CARDS,
    ...COTIDIANO_PROIBIDO_CARDS,
    ...COMIDA_PROIBIDO_CARDS,
    ...CINEMA_PROIBIDO_CARDS,
    ...MUSICA_PROIBIDO_CARDS,
    ...FUTEBOL_PROIBIDO_CARDS,
    ...ANIMAIS_PROIBIDO_CARDS
  ]
};

const LIMITE_BANKS_BY_CATEGORY: Record<ThemeCategory, LimiteRoundData[]> = {
  comida: COMIDA_LIMITE,
  animais: ANIMAIS_LIMITE,
  futebol: FUTEBOL_LIMITE,
  cinema: CINEMA_LIMITE,
  musica: MUSICA_LIMITE,
  games: GAMES_LIMITE,
  ciencia: CIENCIA_LIMITE,
  cotidiano: COTIDIANO_LIMITE,
  relacionamentos: RELACIONAMENTOS_LIMITE,
  profissoes: PROFISSOES_LIMITE,
  cultura_pop: CULTURA_POP_LIMITE,
  custom: [
    ...CURATED_LIMITE,
    ...COTIDIANO_LIMITE,
    ...COMIDA_LIMITE,
    ...CINEMA_LIMITE,
    ...FUTEBOL_LIMITE,
    ...MUSICA_LIMITE,
    ...CIENCIA_LIMITE
  ]
};

const DUVIDO_BANKS_BY_CATEGORY: Record<ThemeCategory, DuvidoRoundData[]> = {
  comida: COMIDA_DUVIDO,
  animais: ANIMAIS_DUVIDO,
  futebol: FUTEBOL_DUVIDO,
  cinema: CINEMA_DUVIDO,
  musica: MUSICA_DUVIDO,
  games: GAMES_DUVIDO,
  ciencia: CIENCIA_DUVIDO,
  cotidiano: COTIDIANO_DUVIDO,
  relacionamentos: RELACIONAMENTOS_DUVIDO,
  profissoes: PROFISSOES_DUVIDO,
  cultura_pop: CULTURA_POP_DUVIDO,
  custom: [
    ...CURATED_DUVIDO,
    ...COTIDIANO_DUVIDO,
    ...COMIDA_DUVIDO,
    ...CINEMA_DUVIDO,
    ...FUTEBOL_DUVIDO,
    ...MUSICA_DUVIDO,
    ...ANIMAIS_DUVIDO
  ]
};

// ============================================================================
// CLEAN FALLBACK ROUND BUILDER (100% THEME-STRICT ACROSS ALL ROUNDS)
// ============================================================================

/**
 * Selects a non-repeating, strictly theme-faithful round when offline or fallback is needed.
 * Every category has its own dedicated multi-round bank across all 5 games so Round 2, 3, 4+
 * NEVER drift into unrelated themes!
 */
export function generateThemeStrictFallbackRound(
  gameId: GameId,
  customTheme: string,
  subtheme: string = customTheme,
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  excludeSignatures: string[] = [],
  difficulty: string = 'dificil'
): { data: unknown; signature: string; subthemeUsed?: string } {
  const targetDiff = (difficulty || customConfig?.difficulty || 'dificil').toLowerCase().trim();
  const category = detectThemeCategory(customTheme);
  const safeSubtheme = subtheme || customTheme || '';
  const excluded = new Set([
    ...sessionUsedSignatures,
    ...usedQuestionsTracker,
    ...excludeSignatures
  ]);

  const pickUnused = <T>(
    pool: T[],
    getSig: (item: T, idx: number) => string,
    preferFilter?: (item: T) => boolean
  ): { item: T; sig: string; idx: number } => {
    const indexed = pool.map((item, idx) => ({ item, idx, sig: getSig(item, idx) }));
    const shuffledIndexed = fisherYatesShuffle(indexed);
    const available = shuffledIndexed.filter(
      (x) => !excluded.has(x.sig) && !usedQuestionsTracker.has(x.sig)
    );
    const baseSource = available.length > 0 ? available : shuffledIndexed;
    const preferred = preferFilter ? baseSource.filter((x) => preferFilter(x.item)) : [];
    const source = preferred.length > 0 ? preferred : baseSource;
    const picked = source[0];
    registerUsedSignature(picked.sig);
    return picked;
  };

  const subPart = (safeSubtheme.includes(':') ? safeSubtheme.split(':').slice(1).join(':') : safeSubtheme)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  const subKeywords = subPart.split(/\s+/).filter((w) => w.length >= 4);

  // 1. Tem ou Não Tem
  if (gameId === 'tem-ou-nao-tem') {
    const categoryBank = TEM_BANKS_BY_CATEGORY[category] || POP_GERAL_TEM_OU_NAO_TEM;
    const picked = pickUnused(
      categoryBank,
      (it) => `${category}-tem-${it.pergunta}`,
      (it) => {
        if (subKeywords.length === 0) return false;
        const text = `${it.pergunta} ${it.respostas.map((r) => r.texto).join(' ')}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return subKeywords.some((kw) => text.includes(kw));
      }
    );
    const finalQuestion = sanitizeCleanGameText(stripPerguntamosPrefix(picked.item.pergunta), 'tem-ou-nao-tem');

    registerUsedSignature(finalQuestion);
    return {
      data: {
        pergunta: finalQuestion,
        rawRespostas: picked.item.respostas,
        respostas: normalizeTemVotesTo100(
          picked.item.respostas,
          customConfig.temItemsCount,
          undefined,
          customTheme
        )
      },
      signature: picked.sig,
      subthemeUsed: `${customTheme.trim() || 'Tema Geral'} // Top ${customConfig.temItemsCount}`
    };
  }

  // 2. Jogo da Nota
  if (gameId === 'nota') {
    const notaPool = NOTA_BANKS_BY_CATEGORY[category] || COTIDIANO_NOTA;
    const picked = pickUnused(notaPool, (it) => `${category}-nota-${it.pergunta}`);
    const cleanQ = sanitizeCleanGameText(picked.item.pergunta, 'nota');
    registerUsedSignature(cleanQ);
    return {
      data: { pergunta: cleanQ },
      signature: picked.sig
    };
  }

  // 3. Jogo do Proibido
  if (gameId === 'proibido') {
    const proibidoPool = PROIBIDO_BANKS_BY_CATEGORY[category] || CULTURA_POP_PROIBIDO_CARDS;
    const usedSet = new Set(usedProibidoWords.map((w) => w.toUpperCase()));
    const unusedCards = proibidoPool.filter((c) => !usedSet.has(c.palavra_alvo.toUpperCase()));
    const pool = unusedCards.length >= customConfig.proibidoCardsCount ? unusedCards : proibidoPool;
    const shuffled = fisherYatesShuffle(pool);
    const selected = shuffled.slice(0, customConfig.proibidoCardsCount).map((c) => ({
      palavra_alvo: c.palavra_alvo,
      palavras_proibidas: ensureStrictForbiddenWordsCount(
        c.palavra_alvo,
        c.palavras_proibidas,
        customConfig.proibidoForbiddenCount || 5,
        category
      )
    }));
    registerUsedProibidoWords(selected.map((c) => c.palavra_alvo));
    const sig = `${category}-proibido-${selected.map((c) => c.palavra_alvo).join(',')}`;
    registerUsedSignature(sig);
    return { data: selected, signature: sig };
  }

  // 4. Jogo do Limite
  if (gameId === 'limite') {
    const diffGoldenCandidates = LIMITE_GOLDEN_QUESTIONS.filter(
      (q) =>
        (q.dificuldade || 'dificil') === targetDiff &&
        !excluded.has(q.id) &&
        !excluded.has(q.pergunta) &&
        !usedQuestionsTracker.has(q.id) &&
        !usedQuestionsTracker.has(q.pergunta)
    );
    if (diffGoldenCandidates.length > 0) {
      const goldenCat = matchThemeToGoldenCategory(customTheme);
      const catMatches = diffGoldenCandidates.filter((q) => q.categoria === goldenCat);
      const poolToPick = catMatches.length > 0 ? catMatches : diffGoldenCandidates;
      const pickedGolden = fisherYatesShuffle(poolToPick)[0];
      registerUsedSignature(pickedGolden.id);
      registerUsedSignature(pickedGolden.pergunta);
      return {
        data: {
          ...pickedGolden,
          category: mapThemeToLimiteCategory(customTheme)
        },
        signature: `${category}-limite-${pickedGolden.id}`
      };
    }

    if (isGoldenDatabaseCompatibleTheme(customTheme)) {
      const goldenCat = matchThemeToGoldenCategory(customTheme);
      const goldenCandidates = LIMITE_GOLDEN_QUESTIONS.filter(
        (q) =>
          q.categoria === goldenCat &&
          !excluded.has(q.id) &&
          !excluded.has(q.pergunta) &&
          !usedQuestionsTracker.has(q.id) &&
          !usedQuestionsTracker.has(q.pergunta)
      );
      if (goldenCandidates.length > 0) {
        const pickedGolden = fisherYatesShuffle(goldenCandidates)[0];
        registerUsedSignature(pickedGolden.id);
        registerUsedSignature(pickedGolden.pergunta);
        return {
          data: {
            ...pickedGolden,
            category: mapThemeToLimiteCategory(customTheme)
          },
          signature: `${category}-limite-${pickedGolden.id}`
        };
      }
    }

    const limitePool = LIMITE_BANKS_BY_CATEGORY[category] || CURATED_LIMITE;
    const picked = pickUnused(
      limitePool,
      (it) => `${category}-limite-${it.pergunta}`,
      (it) => !usedQuestionsTracker.has(it.pergunta)
    );
    registerUsedSignature(picked.item.pergunta);
    return { data: picked.item, signature: picked.sig };
  }

  // 5. Jogo do Duvido
  const duvidoPool = DUVIDO_BANKS_BY_CATEGORY[category] || CURATED_DUVIDO;
  const picked = pickUnused(
    duvidoPool,
    (it) => `${category}-duvido-${it.categoria_secreta}`,
    (it) => !usedQuestionsTracker.has(it.categoria_secreta)
  );
  registerUsedSignature(picked.item.categoria_secreta);
  return {
    data: {
      ...picked.item,
      categoria_secreta: sanitizeCleanGameText(picked.item.categoria_secreta, 'duvido'),
      exemplos_validos: picked.item.exemplos_validos.slice(0, customConfig.duvidoExamplesCount)
    },
    signature: picked.sig
  };
}

// ============================================================================
// 5-SECOND TIMEOUT + EXPONENTIAL BACKOFF RETRY ENGINE
// ============================================================================

export interface RetryWithBackoffOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

/**
 * Executes an async Gemini API operation with a strict 5-second (5000ms) timeout
 * per attempt and automatically retries with exponential backoff (baseDelayMs * 2^attempt)
 * if the response time exceeds 5 seconds or fails transiently before surfacing an error.
 */
export async function withTimeoutAndExponentialBackoff<T>(
  operation: (attempt: number, signal: AbortSignal) => Promise<T>,
  options: RetryWithBackoffOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  let lastError: unknown = new Error('Gemini API call failed after retries');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(() => {
        const timeoutErr = new Error(`GEMINI_TIMEOUT_${timeoutMs}MS_ATTEMPT_${attempt + 1}`);
        controller.abort(timeoutErr);
        reject(timeoutErr);
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([
        operation(attempt, controller.signal),
        timeoutPromise
      ]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      return result;
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      lastError = err;
      if (attempt < maxRetries) {
        const backoffMs = baseDelayMs * Math.pow(2, attempt);
        if (options.onRetry) {
          options.onRetry(attempt + 1, err, backoffMs);
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// EXPLICIT SESSION_MEMORY SNAPSHOT PROMPT BUILDER (STRICT SEMANTIC PIVOT)
// ============================================================================

/**
 * Builds the complete procedural generation prompt with the explicit `sessionMemory`
 * snapshot embedded directly into the instructions, enforcing rejection of previous
 * themes and sub-angles and forcing a pivot to an unrelated semantic domain.
 */
export function buildProceduralRoundPrompt(
  gameId: GameId,
  userTheme: string,
  difficulty: string = 'normal',
  sessionMemorySnapshot: SessionMemorySnapshot = SessionMemoryManager.getSnapshot(),
  randomSubAngle: SubAngleDefinition = SEMANTIC_SUB_ANGLES[0],
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  extraExclusions: string[] = []
): string {
  const theme = userTheme.trim() || 'Geral';
  const temItemsCount = Math.min(10, Math.max(3, Number(customConfig?.temItemsCount) || 5));
  const proibidoCardsCount = Math.min(10, Math.max(3, Number(customConfig?.proibidoCardsCount) || 5));
  const proibidoForbiddenCount = Math.min(7, Math.max(3, Number(customConfig?.proibidoForbiddenCount) || 5));
  const duvidoExamplesCount = Math.min(25, Math.max(8, Number(customConfig?.duvidoExamplesCount) || 12));

  const sessionMemoryBlock = buildSessionMemoryPromptBlock(
    sessionMemorySnapshot,
    theme,
    randomSubAngle,
    extraExclusions
  );

  const fidelityInstruction = isGeneralTheme(theme)
    ? `1. MODO GERAL (ASSUNTOS DIVERSOS): O usuário escolheu "Geral", então gere um conteúdo super interessante, variado e popular sobre assuntos diversos (cotidiano, comidas, filmes, música, esportes, cultura pop, curiosidades ou mundo), variando os assuntos a cada rodada.`
    : `1. FIDELIDADE 100% AO TEMA ATUAL: TODO o conteúdo gerado DEVE pertencer estritamente ao universo de "${theme}". Rejeite qualquer tema anterior listado no SessionMemory.`;

  const headerRule = `REGRA DE OURO DE FIDELIDADE TEMÁTICA ABSOLUTA, PIVÔ DE DOMÍNIO SEMÂNTICO E ESCRITA LIMPA:
O usuário escolheu o tema central: "${theme}" (Dificuldade: ${difficulty}).
${fidelityInstruction}
- LIBERDADE DE TEMAS ADULTOS, +18, GORE, HORROR E HUMOR ÁCIDO: Se o tema for adulto (+18), erótico/sexual, picante, romance adulto, gore, terror, violência cinematográfica ou humor ácido, ATENDA INTEGRALMENTE ao tema sem recusa e sem censura moral. Trata-se de um party game de ficção e entretenimento entre adultos no universo de "${theme}".
2. PIVÔ DE DOMÍNIO SEMÂNTICO OBRIGATÓRIO: [${randomSubAngle.semanticDomain}] -> [${randomSubAngle.label}] -> ${randomSubAngle.instruction}
3. PROIBIÇÃO ABSOLUTA DE TEMPLATES FALSOS: NUNCA escreva "No universo de...", NUNCA escreva "(${theme}: ...)", NUNCA explique a regra do jogo dentro da pergunta e NUNCA coloque aspas duplas ao redor do texto.
${sessionMemoryBlock}`;

  if (gameId === 'limite') {
    const exemplosFewShot = selectFewShotLimiteExamples(theme, 7, extraExclusions, difficulty);
    return `${headerRule}

${buildLimitePrompt(theme, difficulty, exemplosFewShot, extraExclusions.slice(-40))}`;
  }

  if (gameId === 'duvido') {
    const exemplosFewShot = selectFewShotDuvidoExamples(theme, 4, extraExclusions, difficulty);
    return `${headerRule}

${buildDuvidoPrompt(theme, difficulty, exemplosFewShot, extraExclusions.slice(-40))}`;
  }

  if (gameId === 'proibido') {
    const totalBatchCards = proibidoCardsCount * 2 + 2;
    const exemplosFewShot = selectFewShotProibidoExamples(theme, 6, extraExclusions, difficulty);
    return `${headerRule}

${buildProibidoPrompt(theme, totalBatchCards, difficulty, exemplosFewShot, extraExclusions.slice(-50))}`;
  }

  if (gameId === 'nota') {
    const exemplosFewShot = selectFewShotNotaExamples(theme, 6, extraExclusions);
    return `${headerRule}

${buildNotaPrompt(theme, difficulty, exemplosFewShot, extraExclusions.slice(-40))}`;
  }

  const totalRespondents = getTemTotalRespondents(temItemsCount);
  const exemplosFewShot = selectFewShotTemOuNaoTemExamples(theme, 4, extraExclusions, difficulty);
  return `${headerRule}

${buildTemOuNaoTemPrompt(
  theme,
  difficulty,
  exemplosFewShot,
  extraExclusions.slice(-40),
  temItemsCount,
  totalRespondents
)}`;
}

// ============================================================================
// LOCALSTORAGE CACHE SYSTEM INDEXED BY gameId AND userTheme
// ============================================================================

const ROUND_CACHE_STORAGE_KEY = 'rb_ai_generation_cache_v1';
const ROUND_CACHE_ITEM_PREFIX = 'rb_ai_cache::';
const MAX_CACHED_ROUNDS_PER_KEY = 10;

export interface CachedRoundEntry {
  data: any;
  subthemeUsed: string;
  subAngleId?: number;
  signature: string;
  createdAt: number;
}

const roundPrefetchCache = new Map<string, CachedRoundEntry[]>();
const inFlightPrefetchMap = new Map<string, Promise<GenerateRoundResponse<unknown> | null>>();

function getStorageEngine(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return null;
}

/**
 * Generates the canonical cache key indexed by `gameId` and `userTheme`.
 */
export function getCacheKey(
  gameId: GameId,
  userTheme: string,
  config?: GameCustomConfig,
  difficulty?: string
): string {
  const normTheme = (userTheme || 'geral').trim().toLowerCase().replace(/\s+/g, ' ');
  const diff = (difficulty || config?.difficulty || '').toLowerCase().trim();
  if (diff && diff !== 'dificil') {
    return `${gameId}::${normTheme}::${diff}`;
  }
  return `${gameId}::${normTheme}`;
}

function loadRoundCacheFromStorage(): void {
  try {
    const storage = getStorageEngine();
    if (!storage) return;
    const raw = storage.getItem(ROUND_CACHE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [key, entries] of Object.entries(parsed)) {
          if (Array.isArray(entries)) {
            roundPrefetchCache.set(key, entries.slice(0, MAX_CACHED_ROUNDS_PER_KEY));
          }
        }
      }
    }
  } catch {
    // Ignore storage errors
  }
}

function saveRoundCacheToStorage(updatedKey?: string): void {
  try {
    const storage = getStorageEngine();
    if (!storage) return;
    const obj: Record<string, CachedRoundEntry[]> = {};
    for (const [key, entries] of roundPrefetchCache.entries()) {
      if (entries.length > 0) {
        obj[key] = entries.slice(0, MAX_CACHED_ROUNDS_PER_KEY);
      }
    }
    storage.setItem(ROUND_CACHE_STORAGE_KEY, JSON.stringify(obj));

    if (updatedKey) {
      const keyEntries = roundPrefetchCache.get(updatedKey) || [];
      if (keyEntries.length > 0) {
        storage.setItem(`${ROUND_CACHE_ITEM_PREFIX}${updatedKey}`, JSON.stringify(keyEntries));
      } else {
        storage.removeItem(`${ROUND_CACHE_ITEM_PREFIX}${updatedKey}`);
      }
    }
  } catch {
    // Ignore storage quota or serialization errors
  }
}

loadRoundCacheFromStorage();

/**
 * Reads cached generation results for `(gameId, userTheme)` directly from localStorage
 * (hydrated with the in-memory map).
 */
export function getCachedRoundsFromLocalStorage(
  gameId: GameId,
  userTheme: string,
  config?: GameCustomConfig,
  difficulty?: string
): CachedRoundEntry[] {
  const cacheKey = getCacheKey(gameId, userTheme, config, difficulty);
  try {
    const storage = getStorageEngine();
    if (storage) {
      const directRaw = storage.getItem(`${ROUND_CACHE_ITEM_PREFIX}${cacheKey}`);
      if (directRaw) {
        const parsed = JSON.parse(directRaw);
        if (Array.isArray(parsed)) {
          roundPrefetchCache.set(cacheKey, parsed.slice(0, MAX_CACHED_ROUNDS_PER_KEY));
          return parsed;
        }
      }
      const masterRaw = storage.getItem(ROUND_CACHE_STORAGE_KEY);
      if (masterRaw) {
        const parsedMaster = JSON.parse(masterRaw);
        if (parsedMaster && Array.isArray(parsedMaster[cacheKey])) {
          roundPrefetchCache.set(cacheKey, parsedMaster[cacheKey].slice(0, MAX_CACHED_ROUNDS_PER_KEY));
          return parsedMaster[cacheKey];
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return roundPrefetchCache.get(cacheKey) || [];
}

export function clearRoundContentCache(): void {
  const keysToClear = Array.from(roundPrefetchCache.keys());
  roundPrefetchCache.clear();
  inFlightPrefetchMap.clear();
  try {
    const storage = getStorageEngine();
    if (storage) {
      storage.removeItem(ROUND_CACHE_STORAGE_KEY);
      for (const k of keysToClear) {
        storage.removeItem(`${ROUND_CACHE_ITEM_PREFIX}${k}`);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export function getRoundContentCacheSize(
  gameId: GameId,
  userTheme: string,
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  difficulty?: string
): number {
  return getCachedRoundsFromLocalStorage(gameId, userTheme, customConfig, difficulty).length;
}

export function pushToRoundContentCache(
  gameId: GameId,
  userTheme: string,
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  entries: CachedRoundEntry[] = [],
  difficulty?: string
): void {
  if (!entries || entries.length === 0) return;
  const diff = difficulty || customConfig?.difficulty || 'dificil';
  const cacheKey = getCacheKey(gameId, userTheme, customConfig, diff);
  const existing = getCachedRoundsFromLocalStorage(gameId, userTheme, customConfig, diff);
  const seenSigs = new Set(existing.map((e) => e.signature));

  const merged = [...existing];
  for (const entry of entries) {
    if (entry && entry.signature && !seenSigs.has(entry.signature)) {
      seenSigs.add(entry.signature);
      merged.push(entry);
    }
  }

  roundPrefetchCache.set(cacheKey, merged.slice(0, MAX_CACHED_ROUNDS_PER_KEY));
  saveRoundCacheToStorage(cacheKey);
}

function isCachedEntryCompatibleWithConfig(
  gameId: GameId,
  candidate: CachedRoundEntry,
  customConfig: GameCustomConfig
): boolean {
  if (!candidate || !candidate.data) return false;
  if (gameId === 'tem-ou-nao-tem') {
    const targetCount = Math.min(10, Math.max(3, Number(customConfig?.temItemsCount) || 5));
    const rawAnswers =
      Array.isArray(candidate.data?.rawRespostas) &&
      candidate.data.rawRespostas.length >= (candidate.data?.respostas?.length || 0)
        ? candidate.data.rawRespostas
        : candidate.data?.respostas;
    return Array.isArray(rawAnswers) && rawAnswers.length >= targetCount;
  }
  if (gameId === 'proibido') {
    const targetCards = Math.min(10, Math.max(3, Number(customConfig?.proibidoCardsCount) || 5));
    return Array.isArray(candidate.data) && candidate.data.length >= targetCards;
  }
  return true;
}

function adaptCachedEntryToConfig(
  gameId: GameId,
  candidate: CachedRoundEntry,
  userTheme: string,
  customConfig: GameCustomConfig
): CachedRoundEntry {
  if (gameId === 'tem-ou-nao-tem' && candidate.data) {
    const targetCount = Math.min(10, Math.max(3, Number(customConfig?.temItemsCount) || 5));
    const rawAnswers =
      Array.isArray(candidate.data?.rawRespostas) &&
      candidate.data.rawRespostas.length >= (candidate.data?.respostas?.length || 0)
        ? candidate.data.rawRespostas
        : candidate.data?.respostas || [];
    return {
      ...candidate,
      data: {
        ...candidate.data,
        rawRespostas: rawAnswers,
        respostas: normalizeTemVotesTo100(rawAnswers, targetCount, undefined, userTheme)
      }
    };
  }
  if (gameId === 'proibido' && Array.isArray(candidate.data)) {
    const targetCards = Math.min(10, Math.max(3, Number(customConfig?.proibidoCardsCount) || 5));
    const targetForbidden = Math.min(
      7,
      Math.max(3, Number(customConfig?.proibidoForbiddenCount) || 5)
    );
    return {
      ...candidate,
      data: candidate.data.slice(0, targetCards).map((c: any) => ({
        palavra_alvo: String(c.palavra_alvo || '').toUpperCase(),
        palavras_proibidas: ensureStrictForbiddenWordsCount(
          c.palavra_alvo,
          c.palavras_proibidas,
          targetForbidden,
          userTheme
        )
      }))
    };
  }
  return candidate;
}

function consumeFreshCachedRound(
  gameId: GameId,
  userTheme: string,
  customConfig: GameCustomConfig,
  excludeSignatures: string[],
  difficulty?: string
): CachedRoundEntry | null {
  const diff = difficulty || customConfig?.difficulty || 'dificil';
  const cacheKey = getCacheKey(gameId, userTheme, customConfig, diff);
  const queued = getCachedRoundsFromLocalStorage(gameId, userTheme, customConfig, diff);
  if (queued.length === 0) return null;

  const excludedSet = new Set(excludeSignatures);
  const remaining: CachedRoundEntry[] = [];
  let chosen: CachedRoundEntry | null = null;

  for (const candidate of queued) {
    const isFresh =
      !excludedSet.has(candidate.signature) &&
      SessionMemoryManager.isContentFresh(gameId, candidate.data, excludeSignatures);
    if (!isFresh) continue;

    if (!chosen && isCachedEntryCompatibleWithConfig(gameId, candidate, customConfig)) {
      chosen = adaptCachedEntryToConfig(gameId, candidate, userTheme, customConfig);
    } else {
      remaining.push(candidate);
    }
  }

  roundPrefetchCache.set(cacheKey, remaining);
  saveRoundCacheToStorage(cacheKey);
  return chosen;
}

function sanitizeAndFormatRoundItem(
  gameId: GameId,
  rawItem: any,
  customConfig: GameCustomConfig,
  themeHint: string = ''
): { data: any; signature: string } | null {
  if (!rawItem) return null;
  const item = JSON.parse(JSON.stringify(rawItem));

  if (gameId === 'tem-ou-nao-tem' && item.pergunta) {
    const targetCount = Math.min(10, Math.max(3, Number(customConfig?.temItemsCount) || 5));
    const rawPool =
      Array.isArray(item.rawRespostas) && item.rawRespostas.length >= (item.respostas?.length || 0)
        ? item.rawRespostas
        : Array.isArray(item.respostas)
        ? item.respostas
        : [];
    if (rawPool.length < targetCount) {
      return null;
    }
    item.pergunta = sanitizeCleanGameText(stripPerguntamosPrefix(item.pergunta), 'tem-ou-nao-tem');
    item.rawRespostas = rawPool;
    item.respostas = normalizeTemVotesTo100(rawPool, targetCount, undefined, themeHint).map((ans, idx) => ({
      ...ans,
      posicao: idx + 1,
      texto: String(ans.texto).split('/')[0].split(/\s+ou\s+/i)[0].split(',')[0].trim().toUpperCase()
    }));
    return { data: item, signature: String(item.pergunta) };
  }
  if (gameId === 'nota' && item.pergunta) {
    item.pergunta = sanitizeCleanGameText(item.pergunta, 'nota');
    return { data: item, signature: String(item.pergunta) };
  }
  if (gameId === 'duvido' && item.categoria_secreta) {
    item.categoria_secreta = sanitizeCleanGameText(item.categoria_secreta, 'duvido');
    if (Array.isArray(item.exemplos_validos)) {
      item.exemplos_validos = item.exemplos_validos.slice(
        0,
        Math.max(20, customConfig.duvidoExamplesCount || 20)
      );
    }
    return { data: item, signature: String(item.categoria_secreta) };
  }
  if (gameId === 'limite' && item.pergunta) {
    item.pergunta = sanitizeCleanGameText(item.pergunta, 'limite');
    return { data: item, signature: String(item.pergunta) };
  }
  if (gameId === 'proibido') {
    const cards = Array.isArray(item) ? item : Array.isArray(item.cartas) ? item.cartas : null;
    if (cards && cards.length > 0) {
      const targetForbidden = Math.max(3, Math.min(10, Number(customConfig?.proibidoForbiddenCount) || 5));
      const formatted = cards.slice(0, customConfig.proibidoCardsCount || 5).map((c: any) => ({
        palavra_alvo: String(c.palavra_alvo || '').toUpperCase(),
        palavras_proibidas: ensureStrictForbiddenWordsCount(
          c.palavra_alvo,
          c.palavras_proibidas,
          targetForbidden,
          themeHint
        )
      }));
      const sig = `proibido-${formatted.map((c: any) => c.palavra_alvo).join(',')}`;
      return { data: formatted, signature: sig };
    }
  }
  return null;
}

async function fetchBatchFromApi(
  gameId: GameId,
  theme: string,
  customConfig: GameCustomConfig,
  excludeSignatures: string[] = [],
  difficulty: string = 'normal',
  explicitSubAngle?: SubAngleDefinition,
  consumePrimaryImmediately: boolean = true
): Promise<GenerateRoundResponse<unknown> | null> {
  const randomSubAngle = explicitSubAngle || SessionMemoryManager.drawRandomSubAngle(theme);
  const subtheme = randomSubAngle.label || pickNextRandomSubtheme(theme);
  const sessionMemorySnapshot = SessionMemoryManager.getSnapshot();
  const sessionMemoryHistory = SessionMemoryManager.getUsedHistoryForPrompt(80);
  const allExcluded = Array.from(
    new Set([
      ...sessionUsedSignatures,
      ...usedQuestionsTracker,
      ...excludeSignatures,
      ...sessionMemoryHistory
    ])
  );

  const promptInstruction = buildProceduralRoundPrompt(
    gameId,
    theme,
    difficulty,
    sessionMemorySnapshot,
    randomSubAngle,
    customConfig,
    allExcluded
  );

  const limiteFewShotExamples =
    gameId === 'limite' ? selectFewShotLimiteExamples(theme, 7, allExcluded, difficulty) : undefined;
  const duvidoFewShotExamples =
    gameId === 'duvido' ? selectFewShotDuvidoExamples(theme, 4, allExcluded, difficulty) : undefined;
  const proibidoFewShotExamples =
    gameId === 'proibido' ? selectFewShotProibidoExamples(theme, 6, allExcluded, difficulty) : undefined;
  const notaFewShotExamples =
    gameId === 'nota' ? selectFewShotNotaExamples(theme, 6, allExcluded) : undefined;
  const temFewShotExamples =
    gameId === 'tem-ou-nao-tem'
      ? selectFewShotTemOuNaoTemExamples(theme, 4, allExcluded, difficulty)
      : undefined;

  try {
    const json = await withTimeoutAndExponentialBackoff(
      async (_attempt, signal) => {
        const res = await fetch('/api/generate-round', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          signal,
          body: JSON.stringify({
            gameId,
            theme,
            subtheme,
            difficulty,
            sessionMemory: sessionMemoryHistory,
            sessionMemorySnapshot,
            promptInstruction,
            limiteFewShotExamples,
            duvidoFewShotExamples,
            proibidoFewShotExamples,
            notaFewShotExamples,
            temFewShotExamples,
            randomSubAngle,
            customConfig,
            randomSeed: Math.random(),
            excludeSignatures: allExcluded,
            excludeProibidoWords: getUsedProibidoWords()
          })
        });

        if (!res.ok) {
          throw new Error(`HTTP_${res.status}`);
        }
        return await res.json();
      },
      {
        timeoutMs: consumePrimaryImmediately ? 6500 : 7500,
        maxRetries: consumePrimaryImmediately ? 0 : 1,
        baseDelayMs: 250
      }
    );

    if (json && json.data && !json.fallback) {
      const primary = sanitizeAndFormatRoundItem(gameId, json.data, customConfig, theme);
      if (primary) {
        const resolvedSubtheme = json.subthemeUsed || subtheme;

        // Aggressive Caching: Save any extraRounds returned by the batch into RoundContentCache
        const extraRaw: any[] = Array.isArray(json.extraRounds) ? json.extraRounds : [];
        const extraCacheEntries: CachedRoundEntry[] = [];
        for (const extraItem of extraRaw) {
          const formattedExtra = sanitizeAndFormatRoundItem(gameId, extraItem, customConfig, theme);
          if (formattedExtra && formattedExtra.signature !== primary.signature) {
            extraCacheEntries.push({
              data: formattedExtra.data,
              subthemeUsed: resolvedSubtheme,
              subAngleId: randomSubAngle.id,
              signature: formattedExtra.signature,
              createdAt: Date.now()
            });
          }
        }

        if (!consumePrimaryImmediately) {
          extraCacheEntries.unshift({
            data: primary.data,
            subthemeUsed: resolvedSubtheme,
            subAngleId: randomSubAngle.id,
            signature: primary.signature,
            createdAt: Date.now()
          });
          pushToRoundContentCache(gameId, theme, customConfig, extraCacheEntries);
        } else {
          if (extraCacheEntries.length > 0) {
            pushToRoundContentCache(gameId, theme, customConfig, extraCacheEntries);
          }
          // Record consumed round in SessionMemoryManager immediately
          SessionMemoryManager.recordRoundData(gameId, primary.data, theme, randomSubAngle);
          registerUsedSignature(primary.signature);
          if (gameId === 'proibido' && Array.isArray(primary.data)) {
            registerUsedProibidoWords(primary.data.map((c: any) => String(c.palavra_alvo || '')));
          }
        }

        return {
          source: 'ai',
          data: primary.data,
          themeUsed: theme,
          subthemeUsed: resolvedSubtheme,
          signature: primary.signature
        };
      }
    }
  } catch {
    // Ignore network/timeout errors after exponential backoff retries and fall through
  }
  return null;
}

function scheduleBackgroundCacheRefill(
  gameId: GameId,
  theme: string,
  customConfig: GameCustomConfig,
  difficulty: string = 'normal'
): void {
  if (gameId === 'perguntas-e-verdades') return;
  const cacheKey = getCacheKey(gameId, theme, customConfig);
  const currentCached = (roundPrefetchCache.get(cacheKey) || []).filter((entry) =>
    isCachedEntryCompatibleWithConfig(gameId, entry, customConfig)
  );
  if (currentCached.length >= 2 || inFlightPrefetchMap.has(cacheKey)) {
    return;
  }

  const nextSubAngle = SessionMemoryManager.drawRandomSubAngle(theme);
  const promise = fetchBatchFromApi(
    gameId,
    theme,
    customConfig,
    [],
    difficulty,
    nextSubAngle,
    false
  ).finally(() => {
    inFlightPrefetchMap.delete(cacheKey);
  });

  inFlightPrefetchMap.set(cacheKey, promise);
}

/**
 * Dynamically generates 8 brand-new creative themes using the Gemini API
 * for the "✨ Gerar Novos Temas com IA" button in Setup.
 */
export async function generateNewThemesWithAI(excludeThemes: string[] = []): Promise<string[]> {
  try {
    const json = await withTimeoutAndExponentialBackoff(
      async (_attempt, signal) => {
        const res = await fetch('/api/generate-themes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({ excludeThemes })
        });
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        return await res.json();
      },
      { timeoutMs: 3500, maxRetries: 1, baseDelayMs: 250 }
    );
    if (Array.isArray(json?.themes) && json.themes.length > 0) {
      return json.themes;
    }
  } catch {
    // Fall through to local creative pool if offline
  }
  const creativeBackup = [
    'Reality Shows',
    'Comidas de Rua',
    'Infância Brasileira',
    'Carros & Trânsito',
    'Festas de Família',
    'Copa do Mundo',
    'Karaokê',
    'Mistérios do Mundo',
    'Praia & Verão',
    'Desenhos Animados',
    'Supermercado',
    'Pets'
  ];
  return fisherYatesShuffle(creativeBackup.filter((t) => !excludeThemes.includes(t))).slice(0, 8);
}

/**
 * Direct procedural generation entrypoint matching:
 * (gameType, userTheme, difficulty, sessionMemory, randomSubAngle)
 */
export async function generateProceduralGameContent(
  gameType: GameId,
  userTheme: string,
  difficulty: string = 'normal',
  sessionMemory: string[] = SessionMemoryManager.getUsedHistoryForPrompt(),
  randomSubAngle: SubAngleDefinition = SessionMemoryManager.drawRandomSubAngle(userTheme),
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG
): Promise<GenerateRoundResponse<unknown>> {
  return generateRoundContent(
    gameType,
    userTheme,
    customConfig,
    sessionMemory,
    difficulty,
    randomSubAngle
  );
}

/**
 * Warms the AI round cache in the background while the host is choosing/typing a theme
 * on the Setup screen.
 */
export function prefetchRoundsForTheme(
  gameId: GameId,
  customTheme: string,
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  difficulty?: string
): void {
  if (gameId === 'perguntas-e-verdades') return;
  const theme = customTheme.trim();
  if (!theme || theme.length < 2) return;

  const effectiveDiff = difficulty || customConfig?.difficulty || 'dificil';
  scheduleBackgroundCacheRefill(gameId, theme, customConfig, effectiveDiff);
}

/**
 * Main entry point to generate a round for any game, strictly honoring the central theme,
 * aggressive RoundContentCache, non-blocking fast timeout with background prefetching, CSPRNG semantic
 * sub-angle, Few-Shot Style Guide, and explicit SessionMemory snapshot injection.
 */
export async function generateRoundContent(
  gameId: GameId,
  customTheme: string = '',
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  excludeSignatures: string[] = [],
  difficulty?: string,
  explicitSubAngle?: SubAngleDefinition
): Promise<GenerateRoundResponse<unknown>> {
  // NOV-02: o Quem sou eu sorteia as identidades no proprio App (precisa do numero de jogadores); aqui so um marcador.
  if (gameId === 'quem-sou-eu') {
    return {
      source: 'curated',
      data: {},
      themeUsed: 'Quem sou eu',
      subthemeUsed: 'Identidades na testa',
      signature: `qse-round-${Date.now()}`
    };
  }

  // NOV-01: a Mimica sorteia palavras do banco proprio (sem IA, sem cache); as ja usadas voltam em `excludeSignatures`.
  if (gameId === 'mimica') {
    const used = new Set<string>();
    excludeSignatures.forEach((sig) => {
      if (typeof sig === 'string' && sig.startsWith('mimica-')) {
        sig.slice(7).split('|').forEach((w) => used.add(normalizeMimicaWord(w)));
      }
    });
    const picked = drawMimicaWords(MIMICA_WORDS_PER_ROUND, { used, difficulty: (difficulty as 'facil' | 'medio' | 'dificil') || undefined });
    const words = picked.map((p) => p.palavra);
    return {
      source: 'curated',
      data: words,
      themeUsed: 'Mímica',
      subthemeUsed: picked.map((p) => p.categoria).join(' · '),
      signature: `mimica-${words.join('|')}`
    };
  }

  if (gameId === 'perguntas-e-verdades') {
    return {
      source: 'curated',
      data: {},
      themeUsed: 'Perguntas e Verdades (O Jogo do Diabo)',
      subthemeUsed: '8 Cartas Secretas & 11 Perguntas Oficiais',
      signature: `pv-${Date.now()}`
    };
  }

  const effectiveDifficulty = (difficulty || customConfig?.difficulty || 'dificil').trim().toLowerCase();
  const theme = customTheme.trim() || 'Geral';
  const cacheKey = getCacheKey(gameId, theme, customConfig, effectiveDifficulty);
  const sessionMemoryHistory = SessionMemoryManager.getUsedHistoryForPrompt(80);
  const allExcludedSet = new Set([
    ...sessionUsedSignatures,
    ...usedQuestionsTracker,
    ...excludeSignatures,
    ...sessionMemoryHistory
  ]);

  // 1. AGGRESSIVE CACHE HIT: Check if RoundContentCache already has a verified-fresh round
  const cachedRound = consumeFreshCachedRound(
    gameId,
    theme,
    customConfig,
    Array.from(allExcludedSet),
    effectiveDifficulty
  );
  if (cachedRound) {
    const matchedAngle =
      SEMANTIC_SUB_ANGLES.find((a) => a.id === cachedRound.subAngleId) ||
      explicitSubAngle ||
      SessionMemoryManager.drawRandomSubAngle(theme);
    SessionMemoryManager.recordRoundData(gameId, cachedRound.data, theme, matchedAngle);
    registerUsedSignature(cachedRound.signature);
    if (gameId === 'proibido' && Array.isArray(cachedRound.data)) {
      registerUsedProibidoWords(cachedRound.data.map((c: any) => String(c.palavra_alvo || '')));
    }
    // Refill cache asynchronously in the background so the next round is also instant
    scheduleBackgroundCacheRefill(gameId, theme, customConfig, difficulty);
    return {
      source: 'ai',
      data: cachedRound.data,
      themeUsed: theme,
      subthemeUsed: cachedRound.subthemeUsed,
      signature: cachedRound.signature
    };
  }

  // 2. IN-FLIGHT PREFETCH COALESCE (wait up to 5500ms for AI prefetch to resolve):
  const inFlight = inFlightPrefetchMap.get(cacheKey);
  if (inFlight) {
    try {
      await Promise.race([
        inFlight,
        new Promise((resolve) => setTimeout(resolve, 5500))
      ]);
      const postFlightCached = consumeFreshCachedRound(
        gameId,
        theme,
        customConfig,
        Array.from(allExcludedSet),
        effectiveDifficulty
      );
      if (postFlightCached) {
        const matchedAngle =
          SEMANTIC_SUB_ANGLES.find((a) => a.id === postFlightCached.subAngleId) ||
          explicitSubAngle ||
          SessionMemoryManager.drawRandomSubAngle(theme);
        SessionMemoryManager.recordRoundData(gameId, postFlightCached.data, theme, matchedAngle);
        registerUsedSignature(postFlightCached.signature);
        if (gameId === 'proibido' && Array.isArray(postFlightCached.data)) {
          registerUsedProibidoWords(
            postFlightCached.data.map((c: any) => String(c.palavra_alvo || ''))
          );
        }
        scheduleBackgroundCacheRefill(gameId, theme, customConfig, difficulty);
        return {
          source: 'ai',
          data: postFlightCached.data,
          themeUsed: theme,
          subthemeUsed: postFlightCached.subthemeUsed,
          signature: postFlightCached.signature
        };
      }
    } catch {
      // If in-flight failed or timed out, fall through to direct API call
    }
  }

  // 3. Call Gemini API directly (with warm background cache)
  const apiResult = await fetchBatchFromApi(
    gameId,
    theme,
    customConfig,
    Array.from(allExcludedSet),
    effectiveDifficulty,
    explicitSubAngle,
    true
  );

  if (apiResult) {
    scheduleBackgroundCacheRefill(gameId, theme, customConfig, effectiveDifficulty);
    return apiResult;
  }

  // Ensure background cache refill is running for subsequent rounds
  scheduleBackgroundCacheRefill(gameId, theme, customConfig, effectiveDifficulty);

  // 4. Fallback to 100% theme-strict local bank ONLY if offline or API key unavailable after retries
  const activeFallbackAngle = explicitSubAngle || SessionMemoryManager.drawRandomSubAngle(theme);
  const subtheme = activeFallbackAngle.label || pickNextRandomSubtheme(theme);
  const fallback = generateThemeStrictFallbackRound(
    gameId,
    theme,
    subtheme,
    customConfig,
    Array.from(allExcludedSet),
    effectiveDifficulty
  );

  SessionMemoryManager.recordRoundData(gameId, fallback.data, theme, activeFallbackAngle);

  return {
    source: 'curated',
    data: fallback.data,
    themeUsed: theme,
    subthemeUsed: fallback.subthemeUsed || subtheme,
    signature: fallback.signature
  };
}




