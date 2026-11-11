/**
 * DAD-01: bancos extras de perguntas (1.435 itens em 5 jogos) vindos de `analise/banco` (lotes 1 a 4).
 *
 * Os JSON ficam em `src/data/extra/` e sao carregados sob demanda (import dinamico, fora do pacote principal).
 * `loadExtraBanks()` valida cada item, descarta repetidos (por id e por texto) e acrescenta o que sobrar aos
 * arrays dos bancos prontos (`*GoldenDatabase`), que o gerador de rodadas ja consulta a cada sorteio.
 *
 * Avisos de qualidade (ver LEIAME de cada lote):
 * - Limite: fatos conferidos de memoria, nao na web. Os 27 itens de confianca "media" trazem `aConferir: true`.
 * - Tem ou Nao Tem: os votos sao estimativa editorial, nao pesquisa real.
 */
import { LIMITE_GOLDEN_QUESTIONS } from '../utils/limiteGoldenDatabase';
import { PROIBIDO_GOLDEN_CARDS } from '../utils/proibidoGoldenDatabase';
import { NOTA_GOLDEN_PROMPTS } from '../utils/notaGoldenDatabase';
import { TEM_OU_NAO_TEM_GOLDEN_QUESTIONS } from '../utils/temOuNaoTemGoldenDatabase';
import { DUVIDO_GOLDEN_CATEGORIES } from '../utils/duvidoGoldenDatabase';

export type ExtraGame = 'limite' | 'proibido' | 'nota' | 'temOuNaoTem' | 'duvido';

type Rec = Record<string, unknown>;

const norm = (s: unknown) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Chave de texto usada para detectar repeticao com o que ja existe. */
export function extraTextKey(game: ExtraGame, item: Rec): string {
  switch (game) {
    case 'proibido':
      return norm(item.palavra_alvo);
    case 'duvido':
      return norm(item.categoria_secreta);
    default:
      return norm(item.pergunta);
  }
}

/** Valida um item do banco extra contra o formato do jogo. Lista vazia = valido. */
export function validateExtraItem(game: ExtraGame, raw: unknown): string[] {
  const e: string[] = [];
  if (!raw || typeof raw !== 'object') return ['item nao e um objeto'];
  const x = raw as Rec;
  if (!isStr(x.id)) e.push('id ausente');
  if (!isStr(x.categoria) && game !== 'duvido') e.push('categoria ausente');
  switch (game) {
    case 'limite':
      if (!isStr(x.pergunta)) e.push('pergunta ausente');
      if (typeof x.valor_exato !== 'number' || !Number.isFinite(x.valor_exato)) e.push('valor_exato invalido');
      if (!isStr(x.unidade)) e.push('unidade ausente');
      break;
    case 'proibido': {
      if (!isStr(x.palavra_alvo)) e.push('palavra_alvo ausente');
      const f = x.palavras_proibidas;
      if (!Array.isArray(f) || f.length !== 5 || !f.every(isStr)) e.push('precisa de 5 palavras proibidas');
      else if (isStr(x.palavra_alvo) && f.some((w) => norm(w) === norm(x.palavra_alvo)))
        e.push('proibida igual a palavra-alvo');
      break;
    }
    case 'nota':
      if (!isStr(x.pergunta)) e.push('pergunta ausente');
      break;
    case 'temOuNaoTem': {
      if (!isStr(x.pergunta)) e.push('pergunta ausente');
      const r = x.respostas;
      if (!Array.isArray(r) || r.length !== 5) e.push('precisa de 5 respostas');
      else if (!r.every((a) => a && isStr((a as Rec).texto) && typeof (a as Rec).votos === 'number'))
        e.push('resposta sem texto ou votos');
      break;
    }
    case 'duvido':
      if (!isStr(x.tema_macro)) e.push('tema_macro ausente');
      if (!isStr(x.categoria_secreta)) e.push('categoria_secreta ausente');
      if (!Array.isArray(x.exemplos_validos) || x.exemplos_validos.length < 3) e.push('exemplos_validos insuficientes');
      break;
  }
  return e;
}

export interface MergeResult {
  added: number;
  skippedInvalid: number;
  skippedDuplicate: number;
}

/** Acrescenta (no proprio array) os itens validos e ineditos. Pura em relacao a rede: so mexe nos arrays recebidos. */
export function mergeExtraItems(game: ExtraGame, target: Rec[], extras: unknown[]): MergeResult {
  const ids = new Set(target.map((t) => String(t.id)));
  const texts = new Set(target.map((t) => extraTextKey(game, t)));
  const result: MergeResult = { added: 0, skippedInvalid: 0, skippedDuplicate: 0 };
  for (const raw of extras) {
    if (validateExtraItem(game, raw).length > 0) {
      result.skippedInvalid++;
      continue;
    }
    const item = raw as Rec;
    const key = extraTextKey(game, item);
    if (ids.has(String(item.id)) || texts.has(key)) {
      result.skippedDuplicate++;
      continue;
    }
    ids.add(String(item.id));
    texts.add(key);
    target.push(item);
    result.added++;
  }
  return result;
}

let loading: Promise<Record<ExtraGame, MergeResult>> | null = null;

/** Carrega (uma vez) os bancos extras e os acrescenta aos bancos prontos. */
export function loadExtraBanks(): Promise<Record<ExtraGame, MergeResult>> {
  if (!loading) {
    loading = (async () => {
      const [limite, proibido, nota, tem, duvido] = await Promise.all([
        import('./extra/limite.json'),
        import('./extra/proibido.json'),
        import('./extra/nota.json'),
        import('./extra/temOuNaoTem.json'),
        import('./extra/duvido.json')
      ]);
      const arr = (m: { default?: unknown }) => ((m.default ?? m) as unknown[]) || [];
      return {
        limite: mergeExtraItems('limite', LIMITE_GOLDEN_QUESTIONS as unknown as Rec[], arr(limite)),
        proibido: mergeExtraItems('proibido', PROIBIDO_GOLDEN_CARDS as unknown as Rec[], arr(proibido)),
        nota: mergeExtraItems('nota', NOTA_GOLDEN_PROMPTS as unknown as Rec[], arr(nota)),
        temOuNaoTem: mergeExtraItems('temOuNaoTem', TEM_OU_NAO_TEM_GOLDEN_QUESTIONS as unknown as Rec[], arr(tem)),
        duvido: mergeExtraItems('duvido', DUVIDO_GOLDEN_CATEGORIES as unknown as Rec[], arr(duvido))
      };
    })();
  }
  return loading;
}
