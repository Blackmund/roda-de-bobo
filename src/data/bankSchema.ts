/**
 * DAD-02: esquema unico de dados dos jogos.
 *
 * Cada banco guarda os itens no formato do seu jogo (pergunta, palavra-alvo, estadio...). Aqui existe a VISAO UNICA, com
 * os mesmos campos para qualquer jogo, usada para validar, contar e filtrar (ex.: por origem) sem conhecer cada formato.
 * Nada e copiado: `unifyBanks()` monta a visao a partir dos bancos em uso.
 */
import { seenHash } from '../utils/seenMemory';

export type BankOrigin = 'programa' | 'autoral' | 'importado' | 'banco';
export type BankItemKind = 'pergunta' | 'categoria' | 'palavra' | 'identidade' | 'momento' | 'estadio' | 'tema' | 'resposta';

export interface UnifiedBankItem {
  id: string;
  /** id do jogo (`limite`, `mimica`...) */
  jogo: string;
  tipo: BankItemKind;
  /** O texto que aparece no jogo (pergunta, categoria, palavra-alvo, nome, tema...). */
  enunciado: string;
  /** Resposta quando existe (valor do Limite, melhor resposta do Tem ou Nao Tem, proibidas do Proibido...). */
  resposta?: string;
  unidade?: string;
  dificuldade?: string;
  categoria?: string;
  /** Video do programa em que o item apareceu, quando conhecido. */
  fonte?: string;
  confianca?: string;
  origem: BankOrigin;
}

type Raw = Record<string, any>;

function originOf(raw: Raw, fallback: BankOrigin): BankOrigin {
  if (raw.origem === 'programa') return 'programa';
  if (raw.origem === 'autoral') return 'autoral';
  if (typeof raw.id === 'string' && /^l\d-/.test(raw.id)) return 'importado'; // lotes de analise/banco
  return fallback;
}

function make(jogo: string, tipo: BankItemKind, enunciado: unknown, raw: Raw, fallback: BankOrigin, extra: Partial<UnifiedBankItem> = {}): UnifiedBankItem {
  const text = String(enunciado ?? '').trim();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `${jogo}-${seenHash(text)}`,
    jogo,
    tipo,
    enunciado: text,
    dificuldade: raw.dificuldade,
    categoria: raw.categoria ?? raw.tema_macro,
    fonte: raw.fonte,
    confianca: raw.confianca,
    origem: originOf(raw, fallback),
    ...extra
  };
}

export interface BankSources {
  limite: Raw[];
  nota: Raw[];
  temOuNaoTem: Raw[];
  duvido: Raw[];
  proibido: Raw[];
  mimica: Raw[];
  megaResenha: Raw[];
  quemSouEu: Raw[];
  ondeEstou: Raw[];
  desenho: Raw[];
  estadios: Raw[];
  respostas: Raw[];
  repetente: Raw[];
}

/** Junta todos os bancos num so formato. Itens de bancos por categoria (sem id) recebem um id estavel pelo texto. */
export function unifyBanks(s: BankSources): UnifiedBankItem[] {
  const out: UnifiedBankItem[] = [];
  s.limite.forEach((r) => out.push(make('limite', 'pergunta', r.pergunta, r, 'banco', { resposta: String(r.valor_exato ?? ''), unidade: r.unidade })));
  s.nota.forEach((r) => out.push(make('nota', 'pergunta', r.pergunta, r, 'banco')));
  s.temOuNaoTem.forEach((r) => out.push(make('tem-ou-nao-tem', 'pergunta', r.pergunta, r, 'banco', { resposta: r.respostas?.[0]?.texto })));
  s.duvido.forEach((r) => out.push(make('duvido', 'categoria', r.categoria_secreta, r, 'banco', { resposta: (r.exemplos_validos || []).slice(0, 3).join(', ') })));
  s.proibido.forEach((r) => out.push(make('proibido', 'palavra', r.palavra_alvo, r, 'banco', { resposta: (r.palavras_proibidas || []).join(', ') })));
  s.mimica.forEach((r) => out.push(make('mimica', 'palavra', r.palavra, r, 'autoral')));
  s.megaResenha.forEach((r) => out.push(make('mega-resenha', 'palavra', r.palavra, r, 'autoral')));
  s.quemSouEu.forEach((r) => out.push(make('quem-sou-eu', 'identidade', r.nome, r, 'autoral')));
  s.ondeEstou.forEach((r) => out.push(make('onde-estou', 'momento', r.nome, r, 'autoral')));
  s.desenho.forEach((r) => out.push(make('como-eu-pinto', 'palavra', r.palavra, r, 'autoral')));
  s.estadios.forEach((r) => out.push(make('estadios', 'estadio', r.nome, r, 'autoral', { resposta: r.cidade })));
  s.respostas.forEach((r) => out.push(make('respostas-sem-perguntas', 'resposta', r.pergunta, r, 'autoral', { resposta: r.resposta })));
  s.repetente.forEach((r) => out.push(make('repetente', 'tema', r.tema, r, 'autoral')));
  return out;
}

/** Filtro por origem (ex.: so o que veio do programa). */
export function filterByOrigin(items: UnifiedBankItem[], origem: BankOrigin): UnifiedBankItem[] {
  return items.filter((i) => i.origem === origem);
}

/** Problemas de um item no esquema unico (lista vazia = valido). */
export function validateUnified(item: UnifiedBankItem): string[] {
  const e: string[] = [];
  if (!item.id) e.push('sem id');
  if (!item.jogo) e.push('sem jogo');
  if (!item.enunciado) e.push('sem enunciado');
  if (!['programa', 'autoral', 'importado', 'banco'].includes(item.origem)) e.push('origem invalida');
  return e;
}
