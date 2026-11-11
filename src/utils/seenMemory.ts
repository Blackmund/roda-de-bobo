/**
 * MEMORIA DE VISTOS (anti-repeticao de longo prazo)
 *
 * Guarda, neste aparelho, uma impressao digital curta (hash de 32 bits em base 36, ~7 caracteres) de cada
 * pergunta/categoria/palavra/tema que ja apareceu. Com o teto de 30.000 itens ocupa ~210 KB, entao um jogador
 * precisa ver dezenas de milhares de itens ate o mais antigo ser esquecido.
 *
 * - `looksRepeated(texto)`: igual a algo ja visto (exato, sem acento/pontuacao/caixa) OU quase igual
 *   (mesmas palavras de conteudo reordenadas/reescritas: similaridade de Jaccard >= 0,6 com os 400 mais recentes).
 * - `seenOrder(texto)`: -1 se nunca visto; senao a posicao (menor = visto ha mais tempo). Serve para, quando um
 *   banco inteiro ja foi visto, repetir primeiro o que foi visto ha MAIS tempo.
 *
 * Sem localStorage (modo privado, teste), funciona so em memoria.
 */

const SEEN_KEY = 'rb_seen_v1';
const RECENT_KEY = 'rb_seen_recent_v1';
export const SEEN_MAX = 30000;
export const RECENT_MAX = 400;
export const NEAR_DUP_THRESHOLD = 0.6;
const MIN_TOKENS_FOR_FUZZY = 4;

const STOPWORDS = new Set([
  'para', 'pelo', 'pela', 'pelos', 'pelas', 'qual', 'quais', 'quem', 'como', 'onde', 'quando', 'quanto', 'quantos',
  'quantas', 'cite', 'diga', 'voce', 'voces', 'uma', 'umas', 'uns', 'dos', 'das', 'que', 'com', 'sem', 'por', 'mais',
  'menos', 'muito', 'muita', 'esse', 'essa', 'este', 'esta', 'isso', 'aquele', 'aquela', 'seu', 'sua', 'seus', 'suas',
  'foi', 'ser', 'tem', 'tinha', 'sao', 'era', 'entre', 'sobre', 'depois', 'antes', 'ainda', 'tambem', 'todo', 'toda',
  'todos', 'todas', 'qualquer', 'algum', 'alguma', 'jogo', 'jogador', 'famoso', 'famosa', 'conhecido', 'conhecida'
]);

/** Minusculas, sem acento, sem pontuacao, espacos colapsados. */
export function normalizeSeenText(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** FNV-1a de 32 bits, em base 36. */
export function seenHash(text: string): string {
  const s = normalizeSeenText(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function contentTokens(text: string): string[] {
  const out = new Set<string>();
  for (const t of normalizeSeenText(text).split(' ')) {
    if (t.length >= 4 && !STOPWORDS.has(t)) out.add(t.length > 6 ? t.slice(0, 6) : t); // radical grosseiro: plural/genero
  }
  return Array.from(out).slice(0, 14);
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let inter = 0;
  for (const t of a) if (setB.has(t)) inter += 1;
  return inter / (a.length + b.length - inter);
}

// ---- armazenamento ----------------------------------------------------------------------------------------------

let seen: Map<string, number> | null = null; // hash -> ordem de insercao (ordem de Map = antigo -> recente)
let recent: string[][] | null = null;
let counter = 0;
let dirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function load() {
  if (seen && recent) return;
  seen = new Map();
  recent = [];
  const st = storage();
  if (!st) return;
  try {
    const raw = st.getItem(SEEN_KEY);
    if (raw) for (const h of raw.split(',')) if (h) seen.set(h, counter++);
  } catch {
    // ignore
  }
  try {
    const raw = st.getItem(RECENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) recent = parsed.filter((x) => Array.isArray(x)).slice(-RECENT_MAX);
    }
  } catch {
    // ignore
  }
}

function flushNow() {
  flushTimer = null;
  if (!dirty || !seen || !recent) return;
  dirty = false;
  const st = storage();
  if (!st) return;
  try {
    st.setItem(SEEN_KEY, Array.from(seen.keys()).join(','));
    st.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // cota cheia: segue so em memoria
  }
}

function scheduleFlush() {
  dirty = true;
  if (flushTimer) return;
  // adia: varias marcacoes seguidas viram uma unica gravacao
  flushTimer = setTimeout(flushNow, 400);
  (flushTimer as unknown as { unref?: () => void }).unref?.();
}

/** Grava na hora (usado nos testes e ao limpar). */
export function flushSeenMemory(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushNow();
}

// ---- API --------------------------------------------------------------------------------------------------------

export function isSeen(text: string): boolean {
  load();
  const n = normalizeSeenText(text);
  return n.length > 0 && seen!.has(seenHash(n));
}

/** -1 = nunca visto; senao a ordem (menor = visto ha mais tempo). */
export function seenOrder(text: string): number {
  load();
  const v = seen!.get(seenHash(text));
  return v === undefined ? -1 : v;
}

/** Ja visto (exato) ou quase igual a algo recente (mesmas palavras de conteudo, reescrito/reordenado). */
export function looksRepeated(text: string): boolean {
  load();
  if (isSeen(text)) return true;
  const tokens = contentTokens(text);
  if (tokens.length < MIN_TOKENS_FOR_FUZZY) return false;
  for (const prev of recent!) {
    if (prev.length >= MIN_TOKENS_FOR_FUZZY && jaccard(tokens, prev) >= NEAR_DUP_THRESHOLD) return true;
  }
  return false;
}

export function markSeen(text: string): void {
  const n = normalizeSeenText(text);
  if (!n) return;
  load();
  const h = seenHash(n);
  seen!.delete(h); // revisto: vai para o fim (mais recente)
  seen!.set(h, counter++);
  while (seen!.size > SEEN_MAX) {
    const oldest = seen!.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    seen!.delete(oldest);
  }
  const tokens = contentTokens(n);
  if (tokens.length >= MIN_TOKENS_FOR_FUZZY) {
    recent!.push(tokens);
    if (recent!.length > RECENT_MAX) recent!.splice(0, recent!.length - RECENT_MAX);
  }
  scheduleFlush();
}

export function seenCount(): number {
  load();
  return seen!.size;
}

export function clearSeenMemory(): void {
  seen = new Map();
  recent = [];
  counter = 0;
  dirty = false;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const st = storage();
  try {
    st?.removeItem(SEEN_KEY);
    st?.removeItem(RECENT_KEY);
  } catch {
    // ignore
  }
}

/** Para testes: descarta o estado em memoria e recarrega do localStorage. */
export function reloadSeenMemoryForTests(): void {
  seen = null;
  recent = null;
  counter = 0;
}

// ---- chaves de conteudo por jogo -----------------------------------------------------------------------------------

/** Textos que identificam uma rodada para fins de repeticao (uma pergunta, uma categoria ou as palavras-alvo). */
export function contentKeys(gameId: string, data: any): string[] {
  if (!data) return [];
  if (gameId === 'proibido' && Array.isArray(data)) {
    return data.map((c: any) => `proibido ${c?.palavra_alvo ?? ''}`).filter((k) => k.trim().length > 9);
  }
  if (gameId === 'duvido') return data.categoria_secreta ? [`duvido ${data.categoria_secreta}`] : [];
  if (gameId === 'tem-ou-nao-tem' || gameId === 'limite' || gameId === 'nota') {
    return data.pergunta ? [String(data.pergunta)] : [];
  }
  return [];
}

export function markContentSeen(gameId: string, data: any): void {
  for (const k of contentKeys(gameId, data)) markSeen(k);
}

/** Algum item da rodada ja foi visto (ou e quase igual a um recente)? Proibido: so palavra-alvo repetida conta (sem fuzzy). */
export function contentRepeated(gameId: string, data: any): boolean {
  const keys = contentKeys(gameId, data);
  if (keys.length === 0) return false;
  if (gameId === 'proibido') return keys.some((k) => isSeen(k));
  return keys.some((k) => looksRepeated(k));
}
