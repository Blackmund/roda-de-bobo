/**
 * Acha uma foto para cada momento (Onde estou) na Wikipédia/Commons, com poucos pedidos.
 *
 * A Wikimedia limita quem faz muitos pedidos (429), então a busca é em lote: um único pedido traz a foto e o resumo de
 * vários artigos de uma vez. Ordem: artigo em português -> artigo em inglês -> busca na Wikipédia -> Commons.
 * Devolve o link direto (upload.wikimedia.org, miniatura de 960 px ou a original se for menor), ou null.
 * Só roda no servidor e em scripts.
 */
const UA = 'RodaDeBobo/1.0 (party game; non-commercial)';
const BAD_NAME = /(flag|bandeira|logo|escudo|brasao|brasão|coat[_ ]of[_ ]arms|\bmap|mapa|icon|symbol|crest|badge|signature|assinatura|\.svg|\.gif|\.tif|placeholder)/i;

/** Espera maxima por um 429 (a Wikimedia pede para respeitar o Retry-After). No servidor fica curta; nos scripts, longa. */
let maxRateWaitMs = 8000;
export function setMomentImageRateWait(ms: number) {
  maxRateWaitMs = ms;
}

async function getJson(url: string, timeoutMs = 6000, attempt = 0): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
    if (r.status === 429 && attempt < 2) {
      const ra = (Number(r.headers.get('retry-after')) || 2) * 1000;
      if (ra <= maxRateWaitMs) {
        await new Promise((res) => setTimeout(res, ra + 200));
        return getJson(url, timeoutMs, attempt + 1);
      }
      return null;
    }
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const flat = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clean = (u: string) => u.split('?')[0];

const PAGE_PROPS =
  '&prop=pageimages|extracts|description&piprop=thumbnail&pithumbsize=960&exintro=1&explaintext=1&exlimit=max&exchars=500';

interface PageHit {
  title: string;
  image: string | null;
  text: string;
}

function toHit(p: any): PageHit {
  const src: string | undefined = p?.thumbnail?.source;
  const name = src ? decodeURIComponent(src.split('/').pop() || '') : '';
  const image = src && !BAD_NAME.test(name) ? clean(src) : null;
  return { title: p?.title || '', image, text: flat(`${p?.title || ''} ${p?.description || ''} ${p?.extract || ''}`) };
}

function confirms(hit: PageHit, confirma: string[] | undefined): boolean {
  if (!confirma || confirma.length === 0) return true;
  return confirma.some((c) => c && hit.text.includes(flat(c)));
}

/** Varios artigos de uma vez: devolve um mapa "titulo pedido" -> pagina. */
async function pagesByTitle(lang: 'pt' | 'en', titles: string[]): Promise<Map<string, PageHit>> {
  const out = new Map<string, PageHit>();
  const uniq = [...new Set(titles.filter(Boolean))].slice(0, 20);
  if (uniq.length === 0) return out;
  const j = await getJson(
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&redirects=1${PAGE_PROPS}&titles=${encodeURIComponent(uniq.join('|'))}`
  );
  const q = j?.query;
  if (!q) return out;
  const hop = new Map<string, string>();
  for (const n of q.normalized || []) hop.set(n.from, n.to);
  for (const r of q.redirects || []) hop.set(r.from, r.to);
  const byTitle = new Map<string, PageHit>();
  for (const p of Object.values(q.pages || {}) as any[]) {
    if (p.missing !== undefined || p.invalid !== undefined) continue;
    byTitle.set(p.title, toHit(p));
  }
  for (const t of uniq) {
    let cur = t;
    for (let i = 0; i < 4 && hop.has(cur); i++) cur = hop.get(cur)!;
    const hit = byTitle.get(cur);
    if (hit) out.set(t, hit);
  }
  return out;
}

async function searchPages(lang: 'pt' | 'en', term: string): Promise<PageHit[]> {
  const j = await getJson(
    `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=4&gsrsearch=${encodeURIComponent(term)}${PAGE_PROPS}`
  );
  const pages = Object.values((j?.query?.pages as Record<string, any>) || {}).sort((a: any, b: any) => a.index - b.index);
  return (pages as any[]).map(toHit);
}

async function fromCommons(q: string): Promise<string | null> {
  const j = await getJson(
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=6&gsrsearch=' +
      encodeURIComponent(q + ' filetype:bitmap') +
      '&prop=imageinfo&iiprop=url|size&iiurlwidth=960'
  );
  const pages = Object.values((j?.query?.pages as Record<string, any>) || {}).sort((a: any, b: any) => a.index - b.index);
  for (const p of pages as any[]) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.width < 400 || BAD_NAME.test(p.title)) continue;
    const ok = ii.width <= 1100 ? clean(String(ii.url)) : clean(String(ii.thumburl));
    if (ok) return ok;
  }
  return null;
}

export interface MomentImageQuery {
  wiki?: string;
  wikiEn?: string;
  busca?: string;
  /** palavras que o resumo do artigo certo deve citar (ex.: ["futebol"]) para descartar homônimos */
  confirma?: string[];
}

const cache = new Map<string, string>();
const keyOf = (q: MomentImageQuery) => flat(`${q.wiki || ''}|${q.wikiEn || ''}|${q.busca || ''}`);

/** Acha a foto de cada pedido (mesma ordem da entrada), com o mínimo de pedidos à Wikimedia. Guarda os acertos na memória. */
export async function findMomentImages(queries: MomentImageQuery[]): Promise<(string | null)[]> {
  const cached = queries.map((q) => cache.get(keyOf(q)) || null);
  const todo = queries.map((q, i) => ({ q, i })).filter((x) => !cached[x.i]);
  if (todo.length === 0) return cached;
  const found = await findMomentImagesUncached(todo.map((x) => x.q));
  todo.forEach((x, k) => {
    if (found[k]) {
      cache.set(keyOf(x.q), found[k]!);
      cached[x.i] = found[k];
    }
  });
  return cached;
}

async function findMomentImagesUncached(queries: MomentImageQuery[]): Promise<(string | null)[]> {
  const res: (string | null)[] = queries.map(() => null);

  // 1) artigo em portugues, todos de uma vez
  const pt = await pagesByTitle('pt', queries.map((q) => q.wiki || ''));
  queries.forEach((q, i) => {
    const hit = q.wiki ? pt.get(q.wiki) : undefined;
    if (hit?.image && confirms(hit, q.confirma)) res[i] = hit.image;
  });

  // 2) os que faltam: artigo em ingles, todos de uma vez
  const need2 = queries.map((q, i) => (res[i] ? '' : q.wikiEn || ''));
  if (need2.some(Boolean)) {
    const en = await pagesByTitle('en', need2);
    queries.forEach((q, i) => {
      if (res[i]) return;
      const hit = need2[i] ? en.get(need2[i]) : undefined;
      if (hit?.image && confirms(hit, q.confirma)) res[i] = hit.image;
    });
  }

  // 3) busca na Wikipedia (um pedido por momento que ainda falta)
  for (let i = 0; i < queries.length; i++) {
    if (res[i]) continue;
    const q = queries[i];
    const term = q.busca || q.wiki || q.wikiEn;
    if (!term) continue;
    for (const lang of ['pt', 'en'] as const) {
      const hits = await searchPages(lang, term);
      const ok = hits.find((h) => h.image && confirms(h, q.confirma));
      if (ok?.image) {
        res[i] = ok.image;
        break;
      }
    }
  }

  // 4) Commons so para o que continuar sem foto e sem palavras de confirmacao (nao da para checar homonimos la)
  for (let i = 0; i < queries.length; i++) {
    if (res[i]) continue;
    const q = queries[i];
    if (q.confirma && q.confirma.length > 0) continue;
    const term = q.busca || q.wiki || q.wikiEn;
    if (term) res[i] = await fromCommons(term);
  }
  return res;
}

export async function findMomentImage(q: MomentImageQuery): Promise<string | null> {
  return (await findMomentImages([q]))[0];
}
