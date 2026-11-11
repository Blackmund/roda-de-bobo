/**
 * AI Game Content & Random Sub-Theme Generator for "Roda de Bobo"
 * - Communicates with server-side Gemini API (/api/generate-round & /api/generate-subthemes)
 * - Enforces 100% strict theme fidelity (never drifts to unrelated topics)
 * - Tracks used round signatures across the session to guarantee non-repeating randomness
 * - Supports customizable item/card counts (e.g. 3 to 10 items in Tem ou Não Tem, 3 to 10 cards in Proibido, custom scales in Nota)
 * - Scales total survey respondents dynamically: 100 respondents for Top <= 5, scaling up to 120..200 respondents for Top 6..10
 * - Uses direct, natural questions without "Perguntamos a 100 pessoas:" prefixes and 100% real, concrete answers
 */

import { usesLocalContent } from '../config/localGames';
import { drawDesenhoWords, normalizeDesenhoWord } from '../data/desenhoWords';
import { PINTO_WORDS_PER_ROUND } from './comoEuPintoEngine';
import { drawMimicaWords, normalizeMimicaWord } from '../data/mimicaWords';
import { MIMICA_WORDS_PER_ROUND } from './mimicaEngine';
import { drawMegaResenhaWords, normalizeMegaWord } from '../data/megaResenhaWords';
import { MEGA_WORDS_PER_ROUND } from './megaResenhaEngine';
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
import { isApiAvailable } from './apiAvailability';
import {
  clearSeenMemory,
  contentRepeated,
  isSeen,
  looksRepeated,
  markContentSeen,
  markSeen,
  normalizeSeenText,
  seenOrder
} from './seenMemory';

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
  clearSeenMemory();
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
    if (!(await isApiAvailable())) throw new Error('API_UNAVAILABLE');
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

import {
  COTIDIANO_NOTA,
  POP_GERAL_TEM_OU_NAO_TEM,
  CULTURA_POP_PROIBIDO_CARDS,
  TEM_BANKS_BY_CATEGORY,
  NOTA_BANKS_BY_CATEGORY,
  PROIBIDO_BANKS_BY_CATEGORY,
  LIMITE_BANKS_BY_CATEGORY,
  DUVIDO_BANKS_BY_CATEGORY
} from '../data/categoryBanks';


// ============================================================================
// CLEAN FALLBACK ROUND BUILDER (100% THEME-STRICT ACROSS ALL ROUNDS)
// ============================================================================

/**
 * Selects a non-repeating, strictly theme-faithful round when offline or fallback is needed.
 * Every category has its own dedicated multi-round bank across all 5 games so Round 2, 3, 4+
 * NEVER drift into unrelated themes!
 */
/**
 * Itens dos bancos "dourados" (os originais + os 1.435 importados de analise/banco) que combinam com a categoria do tema.
 * Antes so o Limite lia esses bancos no sorteio sem IA; agora Nota, Tem ou Nao Tem, Duvido e Proibido tambem.
 * Tema livre ("custom") usa tudo.
 */
const GOLDEN_CATEGORY_MATCH: Record<ThemeCategory, RegExp | null> = {
  futebol: /futebol|esporte/,
  cinema: /cinema|cultura pop|entretenimento/,
  musica: /musica|entretenimento/,
  games: /game|cultura pop|geek/,
  ciencia: /ciencia|natureza|corpo/,
  animais: /animais|natureza|ciencia/,
  comida: /comida|bebida/,
  cotidiano: /cotidiano|casa|brasil|marcas/,
  relacionamentos: /cotidiano|dates|relacion/,
  profissoes: /trabalho|profiss|vida adulta/,
  cultura_pop: /cultura pop|cinema|entretenimento|brasil/,
  custom: null
};

function goldenFor(game: 'tem' | 'nota' | 'proibido' | 'duvido', category: ThemeCategory): any[] {
  const source: any[] =
    game === 'tem'
      ? TEM_OU_NAO_TEM_GOLDEN_QUESTIONS
      : game === 'nota'
      ? NOTA_GOLDEN_PROMPTS
      : game === 'proibido'
      ? PROIBIDO_GOLDEN_CARDS
      : DUVIDO_GOLDEN_CATEGORIES;
  const re = GOLDEN_CATEGORY_MATCH[category];
  if (!re) return source;
  return source.filter((it) => {
    const cat = String(game === 'duvido' ? it.tema_macro : it.categoria || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return re.test(cat);
  });
}

/** Parcela das rodadas em que o banco proprio vai na frente da IA (quando o tema tem banco proprio): o resto e IA. */
export const BANK_SHARE = 0.4;

/** Lancada no modo estrito quando o banco do tema ja nao tem nada que o jogador nao tenha visto. */
export class BankExhaustedError extends Error {
  constructor() {
    super('BANK_EXHAUSTED');
    this.name = 'BankExhaustedError';
  }
}

export function generateThemeStrictFallbackRound(
  gameId: GameId,
  customTheme: string,
  subtheme: string = customTheme,
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  excludeSignatures: string[] = [],
  difficulty: string = 'dificil'
): { data: unknown; signature: string; subthemeUsed?: string } {
  const round = drawFallbackRound(gameId, customTheme, subtheme, customConfig, excludeSignatures, difficulty, false);
  markContentSeen(gameId, round.data);
  return round;
}

function drawFallbackRound(
  gameId: GameId,
  customTheme: string,
  subtheme: string,
  customConfig: GameCustomConfig,
  excludeSignatures: string[],
  difficulty: string,
  strictFresh: boolean
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
    preferFilter?: (item: T) => boolean,
    getText?: (item: T) => string
  ): { item: T; sig: string; idx: number } => {
    const indexed = pool.map((item, idx) => ({ item, idx, sig: getSig(item, idx) }));
    const shuffledIndexed = fisherYatesShuffle(indexed);
    const available = shuffledIndexed.filter(
      (x) =>
        !excluded.has(x.sig) &&
        !usedQuestionsTracker.has(x.sig) &&
        !(getText && looksRepeated(getText(x.item)))
    );
    let baseSource = available;
    if (available.length === 0) {
      // Tudo do banco ja foi visto: no modo estrito deixa a IA tentar; senao repete o que foi visto HA MAIS TEMPO.
      if (strictFresh) throw new BankExhaustedError();
      if (getText) {
        const orderOf = (x: { item: T }) => {
          const o = seenOrder(getText(x.item));
          return o === -1 ? Number.MAX_SAFE_INTEGER : o;
        };
        const oldest = [...shuffledIndexed].sort((a, b) => orderOf(a) - orderOf(b));
        baseSource = oldest.slice(0, Math.max(1, Math.ceil(oldest.length * 0.1)));
      } else {
        baseSource = shuffledIndexed;
      }
    }
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
    const categoryBank = [
      ...(TEM_BANKS_BY_CATEGORY[category] || POP_GERAL_TEM_OU_NAO_TEM),
      ...(goldenFor('tem', category) as TemOuNaoTemRoundData[])
    ];
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
      },
      (it) => sanitizeCleanGameText(stripPerguntamosPrefix(it.pergunta), 'tem-ou-nao-tem')
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
    const notaPool = [
      ...(NOTA_BANKS_BY_CATEGORY[category] || COTIDIANO_NOTA),
      ...(goldenFor('nota', category) as NotaRoundData[])
    ];
    const picked = pickUnused(
      notaPool,
      (it) => `${category}-nota-${it.pergunta}`,
      undefined,
      (it) => sanitizeCleanGameText(it.pergunta, 'nota')
    );
    const cleanQ = sanitizeCleanGameText(picked.item.pergunta, 'nota');
    registerUsedSignature(cleanQ);
    return {
      data: { pergunta: cleanQ },
      signature: picked.sig
    };
  }

  // 3. Jogo do Proibido
  if (gameId === 'proibido') {
    // Banco da categoria + banco dourado, sem a mesma palavra-alvo duas vezes (ex.: PELÉ nos dois).
    const proibidoPool: ProibidoCard[] = [];
    const proibidoWordsInPool = new Set<string>();
    for (const card of [
      ...(PROIBIDO_BANKS_BY_CATEGORY[category] || CULTURA_POP_PROIBIDO_CARDS),
      ...(goldenFor('proibido', category) as ProibidoCard[])
    ]) {
      const k = normalizeSeenText(card.palavra_alvo);
      if (!k || proibidoWordsInPool.has(k)) continue;
      proibidoWordsInPool.add(k);
      proibidoPool.push(card);
    }
    const usedSet = new Set(usedProibidoWords.map((w) => w.toUpperCase()));
    const unusedCards = proibidoPool.filter(
      (c) => !usedSet.has(c.palavra_alvo.toUpperCase()) && !isSeen(`proibido ${c.palavra_alvo}`)
    );
    if (strictFresh && unusedCards.length < customConfig.proibidoCardsCount) throw new BankExhaustedError();
    const unusedSet = new Set(unusedCards);
    const seenOrderOf = (c: { palavra_alvo: string }) => {
      const o = seenOrder(`proibido ${c.palavra_alvo}`);
      return o === -1 ? -1 : o;
    };
    // Cartas novas primeiro; se faltar, completa com as vistas ha mais tempo.
    const restOldestFirst = proibidoPool
      .filter((c) => !unusedSet.has(c))
      .sort((a, b) => seenOrderOf(a) - seenOrderOf(b));
    const shuffled = [...fisherYatesShuffle(unusedCards), ...restOldestFirst];
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
        !usedQuestionsTracker.has(q.pergunta) &&
        !looksRepeated(q.pergunta)
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
          !usedQuestionsTracker.has(q.pergunta) &&
          !looksRepeated(q.pergunta)
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
      (it) => !usedQuestionsTracker.has(it.pergunta),
      (it) => it.pergunta
    );
    registerUsedSignature(picked.item.pergunta);
    return { data: picked.item, signature: picked.sig };
  }

  // 5. Jogo do Duvido
  const duvidoPool = [
    ...(DUVIDO_BANKS_BY_CATEGORY[category] || CURATED_DUVIDO),
    ...(goldenFor('duvido', category) as DuvidoRoundData[])
  ];
  const picked = pickUnused(
    duvidoPool,
    (it) => `${category}-duvido-${it.categoria_secreta}`,
    (it) => !usedQuestionsTracker.has(it.categoria_secreta),
    (it) => `duvido ${sanitizeCleanGameText(it.categoria_secreta, 'duvido')}`
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
      SessionMemoryManager.isContentFresh(gameId, candidate.data, excludeSignatures) &&
      !contentRepeated(gameId, candidate.data);
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

/** A ultima chamada a IA devolveu algo que o jogador ja viu (ou quase igual)? Permite tentar de novo antes de cair no banco. */
let lastFetchWasDuplicate = false;

async function fetchBatchFromApi(
  gameId: GameId,
  theme: string,
  customConfig: GameCustomConfig,
  excludeSignatures: string[] = [],
  difficulty: string = 'normal',
  explicitSubAngle?: SubAngleDefinition,
  consumePrimaryImmediately: boolean = true
): Promise<GenerateRoundResponse<unknown> | null> {
  // Sem servidor proprio (ex.: Vercel estatico) a IA nao existe: cai direto nos bancos prontos, sem tentativas nem 404.
  if (!(await isApiAvailable())) return null;
  lastFetchWasDuplicate = false;
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
        const primaryRepeated = contentRepeated(gameId, primary.data);

        // Aggressive Caching: Save any extraRounds returned by the batch into RoundContentCache
        const extraRaw: any[] = Array.isArray(json.extraRounds) ? json.extraRounds : [];
        const extraCacheEntries: CachedRoundEntry[] = [];
        for (const extraItem of extraRaw) {
          const formattedExtra = sanitizeAndFormatRoundItem(gameId, extraItem, customConfig, theme);
          if (
            formattedExtra &&
            formattedExtra.signature !== primary.signature &&
            !contentRepeated(gameId, formattedExtra.data)
          ) {
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
          if (!primaryRepeated) extraCacheEntries.unshift({
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
          if (primaryRepeated) {
            // A IA devolveu algo que o jogador ja viu: nao entra em jogo (o chamador tenta de novo ou usa o banco).
            lastFetchWasDuplicate = true;
            return null;
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
const themeKey = (t: string) => `tema ${t}`;

function rememberThemes(themes: string[]): string[] {
  themes.forEach((t) => markSeen(themeKey(t)));
  return themes;
}

/** Temas que o jogador ainda nao viu (nem estao na lista de excluidos), sem duplicar dentro do lote. */
async function freshThemesOnly(candidates: string[], excludeThemes: string[]): Promise<string[]> {
  const excluded = new Set(excludeThemes);
  const out: string[] = [];
  for (const t of candidates) {
    if (typeof t !== 'string' || t.trim().length < 2) continue;
    if (excluded.has(t) || out.includes(t) || looksRepeated(themeKey(t))) continue;
    out.push(t);
  }
  return out;
}

/** Completa a lista com temas do banco local (2.300+ temas-base) que o jogador ainda nao viu. */
async function topUpThemesFromBank(current: string[], excludeThemes: string[], target: number): Promise<string[]> {
  const { pickThemes } = await import('./themeBank');
  const out = [...current];
  for (let attempt = 0; attempt < 8 && out.length < target; attempt++) {
    const batch = pickThemes({ count: 24, exclude: [...excludeThemes, ...out] });
    for (const t of await freshThemesOnly(batch, [...excludeThemes, ...out])) {
      if (out.length < target) out.push(t);
    }
  }
  if (out.length < target) {
    // banco quase todo visto: completa com o que for, preferindo qualquer tema fora dos excluidos
    for (const t of pickThemes({ count: target, exclude: [...excludeThemes, ...out] })) {
      if (out.length < target && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

export async function generateNewThemesWithAI(excludeThemes: string[] = []): Promise<string[]> {
  try {
    if (!(await isApiAvailable())) throw new Error('API_UNAVAILABLE');
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
      const fresh = await freshThemesOnly(json.themes as string[], excludeThemes);
      if (fresh.length >= 8) return rememberThemes(fresh.slice(0, 8));
      // IA repetiu temas ja mostrados: completa com o banco local de temas
      const topUp = await topUpThemesFromBank(fresh, excludeThemes, 8);
      if (topUp.length >= 4) return rememberThemes(topUp);
    }
  } catch {
    // Fall through to local creative pool if offline
  }
  // Banco local de temas (sem IA, sem rede): carregado sob demanda para nao pesar no pacote principal.
  try {
    const topUp = await topUpThemesFromBank([], excludeThemes, 8);
    if (topUp.length >= 4) return rememberThemes(topUp);
  } catch {
    // segue para a lista fixa abaixo
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
  // Jogos de conteudo local nao usam IA: nada a pre-carregar.
  if (usesLocalContent(gameId)) return;
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
  const round = await generateRoundContentCore(
    gameId,
    customTheme,
    customConfig,
    excludeSignatures,
    difficulty,
    explicitSubAngle
  );
  // Memoria de vistos (longo prazo): o que sai daqui nao deve voltar tao cedo, venha do banco, do cache ou da IA.
  markContentSeen(gameId, round.data);
  return round;
}

async function generateRoundContentCore(
  gameId: GameId,
  customTheme: string = '',
  customConfig: GameCustomConfig = DEFAULT_GAME_CUSTOM_CONFIG,
  excludeSignatures: string[] = [],
  difficulty?: string,
  explicitSubAngle?: SubAngleDefinition
): Promise<GenerateRoundResponse<unknown>> {
  // NOV-07: o Como eu pinto sorteia 3 palavras desenhaveis do banco proprio (sem IA); as ja usadas voltam em `excludeSignatures`.
  if (gameId === 'como-eu-pinto') {
    const used = new Set<string>();
    excludeSignatures.forEach((sig) => {
      if (typeof sig === 'string' && sig.startsWith('cep-')) {
        sig.slice(4).split('|').forEach((w) => used.add(normalizeDesenhoWord(w)));
      }
    });
    const picked = drawDesenhoWords(PINTO_WORDS_PER_ROUND, used);
    const words = picked.map((p) => p.palavra);
    return {
      source: 'curated',
      data: words,
      themeUsed: 'Como eu pinto',
      subthemeUsed: picked.map((p) => p.categoria).join(' · '),
      signature: `cep-${words.join('|')}`
    };
  }

  // NOV-06: o Estadios sorteia o estadio no proprio App; aqui so um marcador.
  if (gameId === 'estadios') {
    return {
      source: 'curated',
      data: {},
      themeUsed: 'Estádios',
      subthemeUsed: 'Descubra o estádio pelas pistas',
      signature: `est-round-${Date.now()}`
    };
  }

  // NOV-08: o Respostas sem perguntas sorteia a pergunta no proprio App; aqui so um marcador.
  if (gameId === 'respostas-sem-perguntas') {
    return {
      source: 'curated',
      data: {},
      themeUsed: 'Respostas sem perguntas',
      subthemeUsed: 'Pergunta oculta',
      signature: `rsp-round-${Date.now()}`
    };
  }

  // NOV-05: o Repetente sorteia o tema no proprio App (precisa das equipes); aqui so um marcador.
  if (gameId === 'repetente') {
    return {
      source: 'curated',
      data: {},
      themeUsed: 'Repetente',
      subthemeUsed: 'Combine a palavra com o parceiro',
      signature: `rep-round-${Date.now()}`
    };
  }

  // NOV-03: a Mega Resenha sorteia 5 palavras do banco proprio (sem IA); as ja usadas voltam em `excludeSignatures`.
  if (gameId === 'mega-resenha') {
    const used = new Set<string>();
    excludeSignatures.forEach((sig) => {
      if (typeof sig === 'string' && sig.startsWith('mega-')) {
        sig.slice(5).split('|').forEach((w) => used.add(normalizeMegaWord(w)));
      }
    });
    const picked = drawMegaResenhaWords(MEGA_WORDS_PER_ROUND, used);
    const words = picked.map((p) => p.palavra);
    return {
      source: 'curated',
      data: words,
      themeUsed: 'Mega Resenha',
      subthemeUsed: picked.map((p) => p.categoria).join(' · '),
      signature: `mega-${words.join('|')}`
    };
  }

  // NOV-06: o Onde estou sorteia os momentos no proprio App (precisa do numero de jogadores); aqui so um marcador.
  if (gameId === 'onde-estou') {
    return {
      source: 'curated',
      data: {},
      themeUsed: 'Onde estou',
      subthemeUsed: 'Grandes momentos na testa',
      signature: `oe-round-${Date.now()}`
    };
  }

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

  // 0. INTERCALAR banco proprio e IA: parte das rodadas sai do banco (so itens que o jogador nunca viu) e o resto da IA.
  // So para temas que tem banco proprio (tema livre/"custom" vai direto para a IA); sem item novo no banco, segue para a IA.
  if (detectThemeCategory(theme) !== 'custom' && Math.random() < BANK_SHARE) {
    try {
      const bankAngle = explicitSubAngle || SessionMemoryManager.drawRandomSubAngle(theme);
      const fromBank = drawFallbackRound(
        gameId,
        theme,
        bankAngle.label || pickNextRandomSubtheme(theme),
        customConfig,
        Array.from(allExcludedSet),
        effectiveDifficulty,
        true
      );
      SessionMemoryManager.recordRoundData(gameId, fromBank.data, theme, bankAngle);
      scheduleBackgroundCacheRefill(gameId, theme, customConfig, effectiveDifficulty);
      return {
        source: 'curated',
        data: fromBank.data,
        themeUsed: theme,
        subthemeUsed: fromBank.subthemeUsed || bankAngle.label,
        signature: fromBank.signature
      };
    } catch (err) {
      if (!(err instanceof BankExhaustedError)) throw err;
    }
  }

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
  let apiResult = await fetchBatchFromApi(
    gameId,
    theme,
    customConfig,
    Array.from(allExcludedSet),
    effectiveDifficulty,
    explicitSubAngle,
    true
  );
  if (!apiResult && lastFetchWasDuplicate) {
    // A IA repetiu algo ja visto: uma nova tentativa (outro angulo sorteado) antes de recorrer ao banco.
    apiResult = await fetchBatchFromApi(
      gameId,
      theme,
      customConfig,
      Array.from(allExcludedSet),
      effectiveDifficulty,
      undefined,
      true
    );
  }

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




