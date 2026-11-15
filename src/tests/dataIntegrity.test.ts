import test from 'node:test';
import assert from 'node:assert/strict';
import type { GameId } from '../types/game.ts';

/**
 * Integridade dos dados dos jogos: bancos de perguntas/palavras e registro dos 14 jogos.
 * Cada teste junta TODOS os problemas e falha mostrando a lista (AUDIT_REPORT=1 imprime sem falhar).
 */
const REPORT = process.env.AUDIT_REPORT === '1';

const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function check(title: string, issues: string[]) {
  if (REPORT) {
    console.log(`\n## ${title}: ${issues.length} problema(s)`);
    issues.slice(0, 40).forEach((i) => console.log('  - ' + i));
    return;
  }
  assert.equal(issues.length, 0, `${title}:\n  - ${issues.slice(0, 25).join('\n  - ')}${issues.length > 25 ? `\n  ... +${issues.length - 25}` : ''}`);
}

function dupes<T>(items: T[], key: (t: T) => string, label: (t: T) => string): string[] {
  const seen = new Map<string, T>();
  const out: string[] = [];
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    if (seen.has(k)) out.push(`duplicado: "${label(it)}" == "${label(seen.get(k) as T)}"`);
    else seen.set(k, it);
  }
  return out;
}

const D = '../data/';
const U = '../utils/';

test('bancos dos jogos novos: campos preenchidos, sem duplicados e valores validos', async () => {
  const { MIMICA_WORDS } = await import(D + 'mimicaWords.ts');
  const { MEGA_RESENHA_WORDS } = await import(D + 'megaResenhaWords.ts');
  const { QUEM_SOU_EU_IDENTITIES } = await import(D + 'quemSouEuIdentities.ts');
  const { ONDE_ESTOU_MOMENTS } = await import(D + 'ondeEstouMoments.ts');
  const { DESENHO_WORDS } = await import(D + 'desenhoWords.ts');
  const { RESPOSTAS_QUESTIONS } = await import(D + 'respostasSemPerguntas.ts');
  const { REPETENTE_THEMES } = await import(D + 'repetenteThemes.ts');
  const issues: string[] = [];

  const need = (label: string, arr: any[], fields: string[]) =>
    arr.forEach((it, i) => fields.forEach((f) => {
      if (typeof it[f] !== 'string' || !it[f].trim()) issues.push(`${label}[${i}] sem "${f}"`);
    }));
  need('mimica', MIMICA_WORDS, ['palavra', 'categoria']);
  need('mega', MEGA_RESENHA_WORDS, ['palavra', 'categoria']);
  need('quemSouEu', QUEM_SOU_EU_IDENTITIES, ['nome', 'categoria']);
  need('ondeEstou', ONDE_ESTOU_MOMENTS, ['nome', 'categoria']);
  need('desenho', DESENHO_WORDS, ['palavra', 'categoria']);
  need('respostas', RESPOSTAS_QUESTIONS, ['pergunta', 'resposta', 'categoria']);
  need('repetente', REPETENTE_THEMES, ['tema', 'categoria']);

  issues.push(...dupes(MIMICA_WORDS, (x: any) => norm(x.palavra), (x: any) => `mimica ${x.palavra}`));
  issues.push(...dupes(MEGA_RESENHA_WORDS, (x: any) => norm(x.palavra), (x: any) => `mega ${x.palavra}`));
  issues.push(...dupes(QUEM_SOU_EU_IDENTITIES, (x: any) => norm(x.nome), (x: any) => `quemSouEu ${x.nome}`));
  issues.push(...dupes(ONDE_ESTOU_MOMENTS, (x: any) => norm(x.nome), (x: any) => `ondeEstou ${x.nome}`));
  issues.push(...dupes(DESENHO_WORDS, (x: any) => norm(x.palavra), (x: any) => `desenho ${x.palavra}`));
  issues.push(...dupes(RESPOSTAS_QUESTIONS, (x: any) => norm(x.pergunta), (x: any) => `respostas ${x.pergunta}`));
  issues.push(...dupes(REPETENTE_THEMES, (x: any) => norm(x.tema), (x: any) => `repetente ${x.tema}`));

  MIMICA_WORDS.forEach((w: any) => {
    if (w.dificuldade && !['facil', 'medio', 'dificil'].includes(w.dificuldade)) issues.push(`mimica ${w.palavra}: dificuldade invalida "${w.dificuldade}"`);
    if (w.palavra.length > 40) issues.push(`mimica ${w.palavra}: longa demais para a tela`);
  });
  MEGA_RESENHA_WORDS.forEach((w: any) => {
    if (w.palavra.length > 40) issues.push(`mega ${w.palavra}: longa demais`);
  });
  RESPOSTAS_QUESTIONS.forEach((q: any) => {
    if (!/\?\s*$/.test(q.pergunta)) issues.push(`respostas "${q.pergunta}" nao termina em "?"`);
  });
  check('bancos dos jogos novos', issues);
});

test('Estadios: as 3 primeiras pistas nao entregam o nome (as finais podem), ha 3+ pistas e respostas aceitas', async () => {
  const { ESTADIOS } = await import(D + 'estadiosBank.ts');
  const issues: string[] = [];
  issues.push(...dupes(ESTADIOS, (x: any) => norm(x.nome), (x: any) => `estadio ${x.nome}`));
  for (const e of ESTADIOS as any[]) {
    if (!Array.isArray(e.pistas) || e.pistas.length < 3) issues.push(`${e.nome}: menos de 3 pistas`);
    const names = [e.nome, ...(e.aceitas || [])].map(norm).filter((n) => n.length >= 5);
    for (const [i, p] of (e.pistas || []).slice(0, 3).entries()) {
      const np = norm(p);
      const leak = names.find((n) => np.includes(n));
      if (leak) issues.push(`${e.nome}: pista ${i + 1} entrega a resposta ("${leak}")`);
    }
    if (!(e.aceitas || []).length) issues.push(`${e.nome}: sem respostas aceitas`);
    if (!e.cidade || !e.pais) issues.push(`${e.nome}: sem cidade/pais`);
  }
  check('Estadios', issues);
});

test('bancos dourados (originais + importados): formato e coerencia por jogo', async () => {
  await (await import(D + 'extraBanks.ts')).loadExtraBanks();
  const { PROIBIDO_GOLDEN_CARDS } = await import(U + 'proibidoGoldenDatabase.ts');
  const { TEM_OU_NAO_TEM_GOLDEN_QUESTIONS } = await import(U + 'temOuNaoTemGoldenDatabase.ts');
  const { DUVIDO_GOLDEN_CATEGORIES } = await import(U + 'duvidoGoldenDatabase.ts');
  const { LIMITE_GOLDEN_QUESTIONS } = await import(U + 'limiteGoldenDatabase.ts');
  const { NOTA_GOLDEN_PROMPTS } = await import(U + 'notaGoldenDatabase.ts');
  const issues: string[] = [];

  // Proibido
  issues.push(...dupes(PROIBIDO_GOLDEN_CARDS, (x: any) => norm(x.palavra_alvo), (x: any) => `proibido ${x.palavra_alvo}`));
  for (const c of PROIBIDO_GOLDEN_CARDS as any[]) {
    const t = norm(c.palavra_alvo);
    const f: string[] = c.palavras_proibidas || [];
    if (f.length !== 5) issues.push(`proibido ${c.palavra_alvo}: ${f.length} palavras proibidas (esperado 5)`);
    if (new Set(f.map(norm)).size !== f.length) issues.push(`proibido ${c.palavra_alvo}: proibidas repetidas`);
    if (f.some((w) => norm(w) === t)) issues.push(`proibido ${c.palavra_alvo}: proibida igual a palavra-alvo`);
    if (f.some((w) => !String(w).trim())) issues.push(`proibido ${c.palavra_alvo}: proibida vazia`);
  }
  // Tem ou Nao Tem
  issues.push(...dupes(TEM_OU_NAO_TEM_GOLDEN_QUESTIONS, (x: any) => norm(x.pergunta), (x: any) => `tem ${x.pergunta}`));
  for (const q of TEM_OU_NAO_TEM_GOLDEN_QUESTIONS as any[]) {
    const r = q.respostas || [];
    if (r.length < 5) issues.push(`tem "${q.pergunta}": so ${r.length} respostas`);
    const votos = r.map((a: any) => a.votos);
    if (votos.some((v: any) => typeof v !== 'number' || !(v > 0))) issues.push(`tem "${q.pergunta}": voto invalido`);
    for (let i = 1; i < votos.length; i++) if (votos[i] > votos[i - 1]) issues.push(`tem "${q.pergunta}": votos fora de ordem decrescente`);
    const total = votos.reduce((a: number, b: number) => a + b, 0);
    if (total > 100) issues.push(`tem "${q.pergunta}": votos somam ${total} (>100)`);
    if (new Set(r.map((a: any) => norm(a.texto))).size !== r.length) issues.push(`tem "${q.pergunta}": respostas repetidas`);
  }
  // Duvido
  issues.push(...dupes(DUVIDO_GOLDEN_CATEGORIES, (x: any) => norm(x.categoria_secreta), (x: any) => `duvido ${x.categoria_secreta}`));
  for (const c of DUVIDO_GOLDEN_CATEGORIES as any[]) {
    const ex: string[] = c.exemplos_validos || [];
    if (ex.length < 3) issues.push(`duvido ${c.categoria_secreta}: so ${ex.length} exemplos`);
    if (new Set(ex.map(norm)).size !== ex.length) issues.push(`duvido ${c.categoria_secreta}: exemplos repetidos`);
    if (typeof c.total_itens_possiveis === 'number' && c.total_itens_possiveis < ex.length) issues.push(`duvido ${c.categoria_secreta}: total (${c.total_itens_possiveis}) menor que os exemplos (${ex.length})`);
  }
  // Limite
  issues.push(...dupes(LIMITE_GOLDEN_QUESTIONS, (x: any) => norm(x.pergunta), (x: any) => `limite ${x.pergunta}`));
  for (const q of LIMITE_GOLDEN_QUESTIONS as any[]) {
    if (typeof q.valor_exato !== 'number' || !Number.isFinite(q.valor_exato)) issues.push(`limite ${q.id}: valor_exato invalido`);
    if (!q.unidade || !String(q.unidade).trim()) issues.push(`limite ${q.id}: sem unidade`);
    if (q.dificuldade && !['facil', 'medio', 'dificil', 'impossivel'].includes(q.dificuldade)) issues.push(`limite ${q.id}: dificuldade invalida`);
  }
  // Nota
  issues.push(...dupes(NOTA_GOLDEN_PROMPTS, (x: any) => norm(x.pergunta), (x: any) => `nota ${x.pergunta}`));
  // Nota aceita pergunta ("Qual...?") ou pedido ("Cite...", "Descreva..."): so exige texto e escala de exemplo
  for (const q of NOTA_GOLDEN_PROMPTS as any[]) {
    if (!String(q.pergunta || '').trim()) issues.push(`nota ${q.id}: pergunta vazia`);
  }
  // ids unicos entre os bancos dourados
  const ids = [...PROIBIDO_GOLDEN_CARDS, ...TEM_OU_NAO_TEM_GOLDEN_QUESTIONS, ...DUVIDO_GOLDEN_CATEGORIES, ...LIMITE_GOLDEN_QUESTIONS, ...NOTA_GOLDEN_PROMPTS].map((x: any) => x.id).filter(Boolean);
  issues.push(...dupes(ids, (x: string) => x, (x: string) => `id ${x}`));
  check('bancos dourados', issues);
});

test('registro: todos os 16 jogos estao em nomes, regras, limites, tutoriais e conteudo local', async () => {
  const { GAME_FRIENDLY_NAMES } = await import(U + 'fixedPlayers.ts');
  const { GAME_TUTORIALS } = await import('../components/setup/gameTutorials.ts');
  const { GAME_NAMES } = await import('../app/gameNames.ts');
  const { GAME_LIMITS } = await import('../config/gameLimits.ts');
  const { LOCAL_CONTENT_GAMES } = await import('../config/localGames.ts');
  const rules: any = await import('../config/rulesets.ts');
  const ids = Object.keys(GAME_FRIENDLY_NAMES) as GameId[];
  const issues: string[] = [];
  if (ids.length !== 16) issues.push(`esperava 16 jogos em GAME_FRIENDLY_NAMES, achou ${ids.length}`);
  for (const id of ids) {
    if (!GAME_NAMES[id]) issues.push(`${id}: sem GAME_NAMES`);
    const t = GAME_TUTORIALS[id];
    if (!t) issues.push(`${id}: sem tutorial`);
    else {
      if (t.gameId !== id) issues.push(`${id}: tutorial com gameId "${t.gameId}"`);
      if (!t.steps || t.steps.length !== 3) issues.push(`${id}: tutorial sem 3 passos`);
      if (!t.scoringSummary?.length) issues.push(`${id}: tutorial sem resumo de pontuacao`);
    }
    if (GAME_LIMITS && !GAME_LIMITS[id]) issues.push(`${id}: sem GAME_LIMITS`);
  }
  for (const id of LOCAL_CONTENT_GAMES as string[]) if (!(ids as string[]).includes(id)) issues.push(`localGames cita jogo desconhecido: ${id}`);
  const presets = rules.GAME_RULESETS || rules.RULESETS || rules.DEFAULT_RULESETS;
  if (presets) for (const id of ids) if (!presets[id]) issues.push(`${id}: sem preset de regras`);
  check('registro dos jogos', issues);
});

test('bancos por categoria (usados sem IA): formato e coerencia por jogo', async () => {
  const B: any = await import(D + 'categoryBanks.ts');
  const issues: string[] = [];
  const all = (m: Record<string, any[]>) => Object.entries(m).flatMap(([cat, arr]) => arr.map((it) => ({ cat, it })));

  for (const { cat, it } of all(B.PROIBIDO_BANKS_BY_CATEGORY)) {
    const f: string[] = it.palavras_proibidas || [];
    const t = norm(it.palavra_alvo);
    if (!t) issues.push(`[${cat}] proibido sem palavra_alvo`);
    if (f.length < 5) issues.push(`[${cat}] proibido ${it.palavra_alvo}: so ${f.length} proibidas`);
    if (f.some((w) => norm(w) === t)) issues.push(`[${cat}] proibido ${it.palavra_alvo}: proibida igual ao alvo`);
    if (new Set(f.map(norm)).size !== f.length) issues.push(`[${cat}] proibido ${it.palavra_alvo}: proibidas repetidas`);
  }
  for (const { cat, it } of all(B.TEM_BANKS_BY_CATEGORY)) {
    const r = it.respostas || [];
    if (!String(it.pergunta || '').trim()) issues.push(`[${cat}] tem sem pergunta`);
    if (r.length < 5) issues.push(`[${cat}] tem "${it.pergunta}": so ${r.length} respostas`);
    if (new Set(r.map((a: any) => norm(a.texto))).size !== r.length) issues.push(`[${cat}] tem "${it.pergunta}": respostas repetidas`);
    if (r.some((a: any) => !(a.votos > 0))) issues.push(`[${cat}] tem "${it.pergunta}": voto invalido`);
  }
  for (const { cat, it } of all(B.DUVIDO_BANKS_BY_CATEGORY)) {
    const ex: string[] = it.exemplos_validos || [];
    if (ex.length < 3) issues.push(`[${cat}] duvido ${it.categoria_secreta}: so ${ex.length} exemplos`);
    if (new Set(ex.map(norm)).size !== ex.length) issues.push(`[${cat}] duvido ${it.categoria_secreta}: exemplos repetidos`);
  }
  for (const { cat, it } of all(B.LIMITE_BANKS_BY_CATEGORY)) {
    if (!String(it.pergunta || '').trim()) issues.push(`[${cat}] limite sem pergunta`);
    if (typeof it.valor_exato !== 'number' || !Number.isFinite(it.valor_exato)) issues.push(`[${cat}] limite "${it.pergunta}": valor_exato invalido`);
  }
  for (const { cat, it } of all(B.NOTA_BANKS_BY_CATEGORY)) {
    if (!String(it.pergunta || '').trim()) issues.push(`[${cat}] nota sem pergunta`);
  }
  check('bancos por categoria', issues);
});

test('DAD-02: todos os bancos cabem no esquema unico (id, jogo, enunciado, origem) e os ids nao se repetem por jogo', async () => {
  await (await import(D + 'extraBanks.ts')).loadExtraBanks();
  const { unifyBanks, validateUnified, filterByOrigin } = await import(D + 'bankSchema.ts');
  const B: any = await import(D + 'categoryBanks.ts');
  const flat = (m: Record<string, any[]>) => Object.values(m).flat();
  const uniqById = (arr: any[]) => Array.from(new Map(arr.map((x, i) => [x.id ?? 'i' + i, x])).values());
  const items = unifyBanks({
    limite: [...(await import(U + 'limiteGoldenDatabase.ts')).LIMITE_GOLDEN_QUESTIONS, ...flat(B.LIMITE_BANKS_BY_CATEGORY)],
    nota: [...(await import(U + 'notaGoldenDatabase.ts')).NOTA_GOLDEN_PROMPTS, ...flat(B.NOTA_BANKS_BY_CATEGORY)],
    temOuNaoTem: [...(await import(U + 'temOuNaoTemGoldenDatabase.ts')).TEM_OU_NAO_TEM_GOLDEN_QUESTIONS, ...flat(B.TEM_BANKS_BY_CATEGORY)],
    duvido: [...(await import(U + 'duvidoGoldenDatabase.ts')).DUVIDO_GOLDEN_CATEGORIES, ...flat(B.DUVIDO_BANKS_BY_CATEGORY)],
    proibido: [...(await import(U + 'proibidoGoldenDatabase.ts')).PROIBIDO_GOLDEN_CARDS, ...flat(B.PROIBIDO_BANKS_BY_CATEGORY)],
    mimica: (await import(D + 'mimicaWords.ts')).MIMICA_WORDS,
    megaResenha: (await import(D + 'megaResenhaWords.ts')).MEGA_RESENHA_WORDS,
    quemSouEu: (await import(D + 'quemSouEuIdentities.ts')).QUEM_SOU_EU_IDENTITIES,
    ondeEstou: (await import(D + 'ondeEstouMoments.ts')).ONDE_ESTOU_MOMENTS,
    desenho: (await import(D + 'desenhoWords.ts')).DESENHO_WORDS,
    estadios: (await import(D + 'estadiosBank.ts')).ESTADIOS,
    respostas: (await import(D + 'respostasSemPerguntas.ts')).RESPOSTAS_QUESTIONS,
    repetente: (await import(D + 'repetenteThemes.ts')).REPETENTE_THEMES
  });
  void uniqById;
  const issues: string[] = [];
  for (const it of items as any[]) {
    const e = validateUnified(it);
    if (e.length) issues.push(`${it.jogo} "${it.enunciado}": ${e.join(', ')}`);
  }
  // ids unicos por jogo (itens repetidos entre banco por categoria e dourado ja foram checados nos outros testes)
  const seen = new Map<string, number>();
  for (const it of items as any[]) {
    const k = it.jogo + '|' + it.id;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  const dupIds = Array.from(seen.entries()).filter(([, n]) => n > 1).map(([k]) => k);
  // o banco por categoria repete itens de "custom" (junta categorias): ids repetidos aqui sao so a mesma linha em duas listas
  if (!REPORT) assert.ok(items.length > 2500, `esperava mais de 2500 itens unificados, achou ${items.length}`);
  assert.ok((filterByOrigin(items, 'programa') as any[]).length >= 10, 'deve haver itens vistos no programa');
  assert.ok((filterByOrigin(items, 'importado') as any[]).length > 1000, 'os lotes importados de analise/banco devem aparecer');
  check('esquema unico', issues);
  if (REPORT) console.log(`  (${items.length} itens unificados; ${dupIds.length} ids repetidos entre listas)`);
});
