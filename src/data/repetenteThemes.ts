/**
 * NOV-05: temas do Repetente (cada jogador escreve UMA palavra em segredo; a dupla ganha ponto se combinar).
 *
 * - `origem: 'programa'`: exemplos citados pelo diretor no programa (analise/perguntas/perguntas.json).
 * - `origem: 'autoral'`: lista própria. Bons temas têm uma resposta "óbvia" que várias pessoas escolheriam,
 *   mas com margem para divergir (é aí que está a graça).
 */
export interface RepetenteTheme {
  tema: string;
  categoria: string;
  origem: 'programa' | 'autoral';
}

const t = (categoria: string, origem: RepetenteTheme['origem'], temas: string[]): RepetenteTheme[] =>
  temas.map((tema) => ({ tema, categoria, origem }));

export const REPETENTE_THEMES: RepetenteTheme[] = [
  ...t('Do programa', 'programa', [
    'Pior jogador do Desafio Itaú',
    'Um time de futebol (Flamengo, Fluminense, Vasco, Fortaleza...)'
  ]),
  ...t('Futebol', 'autoral', [
    'Maior craque brasileiro de todos os tempos',
    'Um clube do Rio de Janeiro',
    'Um estádio brasileiro',
    'Uma posição de campo',
    'Um jogador que jogou no Barcelona',
    'Uma seleção que ganhou Copa do Mundo',
    'Um goleiro famoso',
    'Algo que o torcedor grita no estádio',
    'Um técnico da seleção brasileira',
    'Um cartão ou punição do jogo',
    'Um país sede de Copa do Mundo',
    'Uma comemoração de gol'
  ]),
  ...t('Esportes', 'autoral', [
    'Um esporte olímpico',
    'Um esporte que usa raquete',
    'Um esporte de água',
    'Um atleta olímpico brasileiro',
    'Um piloto de Fórmula 1',
    'Algo que se usa na academia',
    'Um esporte de inverno',
    'Um lutador famoso'
  ]),
  ...t('Comidas e bebidas', 'autoral', [
    'Um prato típico brasileiro',
    'Uma fruta tropical',
    'Um sabor de pizza',
    'Algo que se come no café da manhã',
    'Um doce de festa de aniversário',
    'Uma bebida gelada',
    'Um tempero',
    'Um lanche de fast food',
    'Um sabor de sorvete',
    'Algo que se come no cinema'
  ]),
  ...t('Cotidiano', 'autoral', [
    'Algo que se leva à praia',
    'Algo que tem na geladeira',
    'Um eletrodoméstico',
    'Algo que se esquece em casa',
    'Uma desculpa para chegar atrasado',
    'Algo que se faz no domingo',
    'Um cômodo da casa',
    'Algo que sempre falta na mochila',
    'Um item da lista do mercado',
    'Algo que se perde com frequência',
    'Um móvel',
    'Algo que se usa no banho'
  ]),
  ...t('Brasil', 'autoral', [
    'Uma cidade brasileira',
    'Um estado do Nordeste',
    'Um rio brasileiro',
    'Um ponto turístico do Brasil',
    'Uma festa brasileira',
    'Um ritmo musical brasileiro',
    'Um cantor sertanejo',
    'Um sotaque ou gíria brasileira',
    'Um personagem do folclore',
    'Uma capital do Brasil'
  ]),
  ...t('Cultura pop', 'autoral', [
    'Um super-herói',
    'Um filme de animação',
    'Uma série famosa',
    'Um vilão de cinema',
    'Um personagem de desenho animado',
    'Um ator brasileiro',
    'Uma banda de rock',
    'Um cantor internacional',
    'Uma novela brasileira',
    'Um personagem da Disney',
    'Um jogo de videogame',
    'Um apresentador de TV'
  ]),
  ...t('Animais e natureza', 'autoral', [
    'Um animal de estimação',
    'Um animal da África',
    'Um animal que voa',
    'Um bicho que dá medo',
    'Um animal do mar',
    'Uma flor',
    'Um fenômeno da natureza',
    'Um animal brasileiro'
  ]),
  ...t('Lugares e viagem', 'autoral', [
    'Um país europeu',
    'Um lugar para passar as férias',
    'Um meio de transporte',
    'Um lugar com muita fila',
    'Uma capital do mundo',
    'Algo que se leva na mala de viagem',
    'Um monumento famoso',
    'Um lugar para ir num primeiro encontro'
  ]),
  ...t('Escola e trabalho', 'autoral', [
    'Uma matéria da escola',
    'Uma profissão',
    'Algo que tem no escritório',
    'Uma profissão perigosa',
    'Material escolar',
    'Algo que se faz na hora do intervalo',
    'Um cargo de empresa'
  ]),
  ...t('Tecnologia', 'autoral', [
    'Uma rede social',
    'Um aplicativo de celular',
    'Uma marca de celular',
    'Um site que todo mundo usa',
    'Uma marca de tênis',
    'Uma marca de refrigerante',
    'Um buscador ou assistente virtual'
  ])
];

export const normalizeThemeKey = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia um tema ainda nao usado (se todos foram usados, recomeca). */
export function drawRepetenteTheme(used: Set<string> = new Set(), rng: () => number = Math.random): RepetenteTheme {
  let pool = REPETENTE_THEMES.filter((x) => !used.has(normalizeThemeKey(x.tema)));
  if (pool.length === 0) pool = [...REPETENTE_THEMES];
  return shuffle(pool, rng)[0];
}
