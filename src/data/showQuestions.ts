/**
 * DAD-01 / DAD-02: banco do programa Roda de Bobo (CazéTV) com esquema único.
 *
 * `showQuestions.json` é gerado a partir de `analise/perguntas/perguntas.json` (extraído das legendas dos
 * 39 vídeos). Cada item guarda a origem (`programa`), a fonte (vídeo + minuto, com link) e a confiança.
 * A maioria é REFERÊNCIA (regras, exemplos, respostas que só aparecem na tela do vídeo): `aConferir`
 * marca o que ainda precisa ser conferido no vídeo antes de virar conteúdo jogável.
 *
 * O JSON (~85 KB) é carregado sob demanda (import dinâmico), então não entra no pacote principal.
 */
export type ShowQuestionOrigin = 'programa' | 'ia';
export type ShowQuestionConfidence = 'alta' | 'media' | 'baixa';
export type ShowQuestionKind = 'numerica' | 'lista' | 'palavra' | 'tema' | 'ranking' | 'regra';

export interface ShowQuestionSource {
  videoId: string | null;
  segundos: number | null;
  /** Link direto para o minuto do vídeo, ex.: https://youtu.be/ID?t=212 */
  url: string | null;
  bruto: string | null;
}

export interface ShowQuestion {
  id: string;
  jogo: string;
  tipo: ShowQuestionKind;
  enunciado: string;
  resposta: string | null;
  unidade: string | null;
  dificuldade: 'facil' | 'medio' | 'dificil' | 'impossivel' | null;
  fonte: ShowQuestionSource;
  confianca: ShowQuestionConfidence;
  confiancaNota: string | null;
  contexto: string | null;
  origem: ShowQuestionOrigin;
  /** true quando a confiança não é alta ou falta a resposta: conferir no vídeo antes de usar em jogo. */
  aConferir: boolean;
}

const KINDS: ShowQuestionKind[] = ['numerica', 'lista', 'palavra', 'tema', 'ranking', 'regra'];
const CONFIDENCES: ShowQuestionConfidence[] = ['alta', 'media', 'baixa'];

/** Valida um item contra o esquema. Retorna a lista de problemas (vazia = válido). */
export function validateShowQuestion(q: unknown): string[] {
  const errors: string[] = [];
  if (!q || typeof q !== 'object') return ['item não é um objeto'];
  const x = q as Record<string, unknown>;
  if (typeof x.id !== 'string' || !x.id) errors.push('id ausente');
  if (typeof x.jogo !== 'string' || !x.jogo) errors.push('jogo ausente');
  if (!KINDS.includes(x.tipo as ShowQuestionKind)) errors.push(`tipo inválido: ${String(x.tipo)}`);
  if (typeof x.enunciado !== 'string' || !x.enunciado.trim()) errors.push('enunciado vazio');
  if (x.resposta !== null && typeof x.resposta !== 'string') errors.push('resposta deve ser string ou null');
  if (!CONFIDENCES.includes(x.confianca as ShowQuestionConfidence)) errors.push(`confianca inválida: ${String(x.confianca)}`);
  if (x.origem !== 'programa' && x.origem !== 'ia') errors.push(`origem inválida: ${String(x.origem)}`);
  if (typeof x.aConferir !== 'boolean') errors.push('aConferir ausente');
  const f = x.fonte as Record<string, unknown> | undefined;
  if (!f || typeof f !== 'object' || !('url' in f)) errors.push('fonte ausente');
  return errors;
}

let cache: Promise<ShowQuestion[]> | null = null;

/** Carrega (uma vez) todo o banco do programa. */
export function loadShowQuestions(): Promise<ShowQuestion[]> {
  if (!cache) {
    cache = import('./showQuestions.json').then((m) => (m.default ?? m) as unknown as ShowQuestion[]);
  }
  return cache;
}

export interface ShowQuestionFilter {
  jogo?: string;
  origem?: ShowQuestionOrigin;
  /** Só itens já conferidos (confiança alta e com resposta). */
  somenteConferidos?: boolean;
}

/** Itens do banco por jogo/origem; `somenteConferidos` exclui o que ainda está `aConferir`. */
export async function getShowQuestions(filter: ShowQuestionFilter = {}): Promise<ShowQuestion[]> {
  const all = await loadShowQuestions();
  return all.filter(
    (q) =>
      (!filter.jogo || q.jogo === filter.jogo) &&
      (!filter.origem || q.origem === filter.origem) &&
      (!filter.somenteConferidos || !q.aConferir)
  );
}
