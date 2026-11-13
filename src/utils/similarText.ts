/**
 * Palavras e temas PARECIDOS (nao so iguais): "Deserto" e "Deserto do Saara", "Copa do Mundo" e "Copa", "Pizza" e "Pizzaria".
 * Serve para o sorteio nao entregar duas rodadas quase iguais na mesma partida.
 * A comparacao e conservadora de proposito: na duvida, considera parecido (o sorteio so usa isso como preferencia e
 * volta ao banco inteiro se faltar opcao).
 */

const STOP = new Set([
  'de', 'do', 'da', 'dos', 'das', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'em', 'no', 'na', 'nos', 'nas', 'para', 'por',
  'com', 'sem', 'ao', 'aos', 'que', 'qual', 'quais', 'ou'
]);

export function plain(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palavras que carregam sentido (sem artigos e preposicoes), sem o "s" do plural. */
export function keyTokens(text: string): string[] {
  return plain(text)
    .split(' ')
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

/** Dois textos falam da mesma coisa (ou de coisas coladas uma na outra)? */
export function isRelated(a: string, b: string): boolean {
  const pa = plain(a);
  const pb = plain(b);
  if (!pa || !pb) return false;
  if (pa === pb) return true;
  const ta = keyTokens(a);
  const tb = keyTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;

  // um e parte do outro: "deserto" dentro de "deserto do saara"
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (small.every((t) => big.includes(t))) return true;

  // compartilham uma palavra de peso ("copa do mundo" e "mundo pet" nao contam por "do"; "copa" e "copa america" sim)
  if (ta.some((x) => x.length >= 4 && tb.includes(x))) return true;

  // uma palavra e o comeco da outra ("pizza" e "pizzaria", "futebol" e "futebolistico")
  for (const x of ta) {
    for (const y of tb) {
      const [s, l] = x.length <= y.length ? [x, y] : [y, x];
      if (s.length >= 5 && l.startsWith(s) && l.length - s.length <= 4) return true;
    }
  }

  // escritos sem espaco ("desertodosaara"): um contem o outro
  const ca = pa.replace(/ /g, '');
  const cb = pb.replace(/ /g, '');
  const [cs, cl] = ca.length <= cb.length ? [ca, cb] : [cb, ca];
  return cs.length >= 5 && cl.includes(cs);
}

export function relatedToAny(text: string, others: Iterable<string>): boolean {
  for (const o of others) if (isRelated(text, o)) return true;
  return false;
}

/**
 * Escolhe ate `count` itens, na ordem recebida, sem nenhum parecido com os ja escolhidos nem com `avoid`.
 * Se nao houver itens suficientes, completa relaxando primeiro o `avoid` e depois a regra entre os escolhidos.
 */
export function pickDistinct<T>(candidates: T[], count: number, getText: (item: T) => string, avoid: string[] = []): T[] {
  const picked: T[] = [];
  const texts: string[] = [];
  const run = (useAvoid: boolean, useAmong: boolean) => {
    for (const c of candidates) {
      if (picked.length >= count) return;
      if (picked.includes(c)) continue;
      const t = getText(c);
      if (useAvoid && relatedToAny(t, avoid)) continue;
      if (useAmong && relatedToAny(t, texts)) continue;
      picked.push(c);
      texts.push(t);
    }
  };
  run(true, true);
  run(false, true);
  run(false, false);
  return picked;
}

/* ---- memoria dos ultimos temas por jogo (sobrevive ao recarregar a pagina) ---- */

const KEY = 'rdb-recent-similar-v1';
const MAX_PER_GAME = 60;
let recent: Record<string, string[]> | null = null;

function load(): Record<string, string[]> {
  if (recent) return recent;
  recent = {};
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') recent = parsed;
    }
  } catch {
    /* sem armazenamento: so em memoria */
  }
  return recent!;
}

export function recentTexts(game: string): string[] {
  return [...(load()[game] || [])];
}

export function rememberRecent(game: string, text: string): void {
  const t = String(text || '').trim();
  if (!t) return;
  const all = load();
  const list = (all[game] || []).filter((x) => plain(x) !== plain(t));
  list.push(t);
  while (list.length > MAX_PER_GAME) list.shift();
  all[game] = list;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignorado */
  }
}

export function isNearRecent(game: string, text: string): boolean {
  return relatedToAny(text, load()[game] || []);
}

export function clearRecentSimilar(): void {
  recent = {};
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch {
    /* ignorado */
  }
}
