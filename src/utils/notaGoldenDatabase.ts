/**
 * BANCO DE OURO OFICIAL DO "JOGO DA NOTA" (17 EXEMPLOS MESTRES)
 * + ENGENHARIA DE FORMULAÇÃO (AS 6 LEIS DAS PERGUNTAS ESCALONÁVEIS 1 A 10)
 */

export type NotaGoldenCategory =
  | 'Esportes & Futebol'
  | 'Cotidiano & Dates'
  | 'Animais & Natureza'
  | 'Cultura Pop & Cinema'
  | 'Comidas & Bebidas'
  | 'Trabalho & Vida Adulta';

export interface NotaPromptItem {
  id: string;
  categoria: NotaGoldenCategory;
  pergunta: string;
  exemplo_escala_interna: string; // Apenas guia interno para a IA entender a escala 1 vs 10
}

export const NOTA_SIX_GOLDEN_LAWS = `AS 6 LEIS DE OURO PARA FORMULAR PERGUNTAS DO "JOGO DA NOTA":
1. PROIBIÇÃO ABSOLUTA DE MENCIONAR "NOTA" OU O NOME DO TEMA:
   - A pergunta NUNCA deve conter frases como "No universo de...", "Qual merece a sua nota?" ou "Correspondente à nota que você tirou". Os jogadores já sabem que estão no Jogo da Nota!
2. ESCALONABILIDADE DE 1 A 10 (O ESPECTRO "VÁRZEA AO LENDÁRIO"):
   - Toda pergunta precisa permitir respostas que vão desde algo terrível, caótico, humilhante ou fraco (Nota 1) até algo perfeito, lendário, luxuoso ou extremo (Nota 10).
3. DOIS FORMATOS DE PERGUNTA ACEITOS (MISTURAR PARA DAR VARIEDADE):
   - Formato A — "Catálogo de Qualidade/Grandeza": Pede um item, pessoa, lugar ou obra dentro do tema (ex: "Qual dupla de zagueiros do futebol brasileiro?", "Qual estádio para jogar uma final no Brasil?", "Qual animal predador da natureza?").
   - Formato B — "Situação Hipotética / Causos da Vida Real" (Mais engraçado): Pede ao narrador para descrever uma cena ou acontecimento dentro de um contexto (ex: "Você foi a um primeiro encontro (date): o que aconteceu lá?", "Você está perdido na selva: qual é a sua situação atual?", "Qual desculpa você daria para faltar ao trabalho?").
4. FRASE CURTA, DIRETA E CONVERSACIONAL (MÁXIMO 8 A 15 PALAVRAS):
   - Deve parecer uma pergunta feita por um amigo na mesa de bar, limpa e sem parênteses explicativos.
5. FUGIR DO ÓBVIO DENTRO DO TEMA:
   - Se o tema for Futebol, não pergunte apenas "Qual o melhor jogador?". Explore camisa de time, comida de estádio, arbitragem, comemoração de gol, contratação furada, desculpa de jogador ao ser substituído.
6. FIDELIDADE ESTRITA AO TEMA ESCOLHIDO:
   - Se o usuário escolheu Animais, 100% da pergunta é sobre animais; se escolheu Cinema, 100% sobre cinema; se escolheu Cotidiano/Dates, 100% sobre situações da vida real.`;

export const NOTA_GOLDEN_PROMPTS: NotaPromptItem[] = [
  // ESPORTES & FUTEBOL (PADRÃO CAZÉTV)
  {
    id: 'not-01',
    categoria: 'Esportes & Futebol',
    pergunta: 'Cite uma dupla de zagueiros da história recente do futebol brasileiro',
    exemplo_escala_interna:
      '1 = zaga rebaixada que batia cabeça; 10 = Geromel e Kannemann no auge / Rodrigo Caio e Pablo Marí em 2019'
  },
  {
    id: 'not-02',
    categoria: 'Esportes & Futebol',
    pergunta: 'Qual estádio brasileiro para mandar um jogo decisivo à noite?',
    exemplo_escala_interna:
      '1 = estádio esburacado sem refletor; 10 = Maracanã ou Morumbi lotado em noite de Libertadores'
  },
  {
    id: 'not-03',
    categoria: 'Esportes & Futebol',
    pergunta: 'Qual comida ou bebida vendida na arquibancada de um estádio?',
    exemplo_escala_interna:
      "1 = copo d'água quente; 10 = tropeiro do Mineirão ou pernil lendário na porta do estádio"
  },
  {
    id: 'not-04',
    categoria: 'Esportes & Futebol',
    pergunta: 'Qual adversário para enfrentar fora de casa nas oitavas da Libertadores?',
    exemplo_escala_interna:
      '1 = time estreante fácil ao nível do mar; 10 = Boca na Bombonera ou time na altitude de 4.000m'
  },
  {
    id: 'not-05',
    categoria: 'Esportes & Futebol',
    pergunta: 'Qual comemoração de gol depois de marcar aos 48 do segundo tempo?',
    exemplo_escala_interna:
      '1 = apenas dar um aperto de mão tímido; 10 = tirar a camisa, subir no alambrado e chorar com a torcida'
  },

  // COTIDIANO, DATES E SITUAÇÕES HIPOTÉTICAS
  {
    id: 'not-06',
    categoria: 'Cotidiano & Dates',
    pergunta: 'Qual lugar para levar alguém no primeiro encontro (date)?',
    exemplo_escala_interna:
      '1 = fila do banco ou lanchonete suja de rodoviária; 10 = restaurante incrível com vista para o mar'
  },
  {
    id: 'not-07',
    categoria: 'Cotidiano & Dates',
    pergunta: 'Você saiu em um encontro (date): o que aconteceu durante a noite?',
    exemplo_escala_interna:
      '1 = a pessoa falou do ex a noite toda e fugiu sem pagar a conta; 10 = química perfeita e viagem marcada juntos'
  },
  {
    id: 'not-08',
    categoria: 'Cotidiano & Dates',
    pergunta: 'Qual presente para ganhar de aniversário da pessoa que você gosta?',
    exemplo_escala_interna:
      '1 = um par de meias furadas ou sabonete usado; 10 = passagem aérea para a Europa ou videogame novo'
  },
  {
    id: 'not-09',
    categoria: 'Trabalho & Vida Adulta',
    pergunta: 'Que profissão ou trabalho você teria pelo resto da vida?',
    exemplo_escala_interna:
      '1 = limpar fossa séptica sob sol de 42 graus; 10 = testador de hotéis de luxo nas Maldivas'
  },
  {
    id: 'not-10',
    categoria: 'Trabalho & Vida Adulta',
    pergunta: 'Qual desculpa para mandar ao chefe dizendo que não vai trabalhar hoje?',
    exemplo_escala_interna:
      '1 = falar que ficou com preguiça; 10 = história cinematográfica de abdução ou emergência inquestionável'
  },

  // ANIMAIS, NATUREZA & SOBREVIVÊNCIA
  {
    id: 'not-11',
    categoria: 'Animais & Natureza',
    pergunta: 'Descreva uma situação de sobrevivência perdido na selva',
    exemplo_escala_interna:
      '1 = passeio tranquilo com barraca; 10 = 4h30 da manhã sem lanterna, caiu num formigueiro e deu de cara com um tigre'
  },
  {
    id: 'not-12',
    categoria: 'Animais & Natureza',
    pergunta: 'Qual animal aéreo ou ave representa o seu nível atual?',
    exemplo_escala_interna:
      '1 = pombo manco de praça; 10 = harpia ou falcão-peregrino em mergulho a 300 km/h'
  },
  {
    id: 'not-13',
    categoria: 'Animais & Natureza',
    pergunta: 'Se você tivesse que enfrentar um animal no mano a mano sem armas, qual seria?',
    exemplo_escala_interna:
      '1 = uma joaninha ou hamster; 10 = urso-polar ou hipopótamo furioso'
  },

  // CULTURA POP, CINEMA E COMIDAS
  {
    id: 'not-14',
    categoria: 'Cultura Pop & Cinema',
    pergunta: 'Qual vilão do cinema ou dos desenhos animados?',
    exemplo_escala_interna:
      '1 = vilão atrapalhado que tropeça sozinho; 10 = Darth Vader ou Thanos dizimando metade do universo'
  },
  {
    id: 'not-15',
    categoria: 'Cultura Pop & Cinema',
    pergunta: 'Qual personagem da vila do Chaves?',
    exemplo_escala_interna:
      '1 = figurante sem fala; 10 = Seu Madruga ou Chaves no episódio de Acapulco'
  },
  {
    id: 'not-16',
    categoria: 'Comidas & Bebidas',
    pergunta: 'O que você encontra ao abrir a geladeira de madrugada morrendo de fome?',
    exemplo_escala_interna:
      '1 = meio limão seco e uma garrafa de água vazia; 10 = lasanha caseira pronta e pudim inteiro'
  },
  {
    id: 'not-17',
    categoria: 'Comidas & Bebidas',
    pergunta: 'Qual prato de um churrasco de domingo?',
    exemplo_escala_interna:
      '1 = pão de alho queimado que caiu no carvão; 10 = picanha no ponto perfeito com farofa crocante'
  }
];

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function matchThemeToNotaCategory(theme: string): NotaGoldenCategory {
  const norm = (theme || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    /(futebol|esporte|copa|olimpiada|atleta|selecao|brasileirao|champions|nba|formula 1|f1|corrida|tenis|volei|lutas|ufc)/.test(
      norm
    )
  ) {
    return 'Esportes & Futebol';
  }
  if (
    /(animal|natureza|selva|bicho|pet|cachorro|gato|oceano|floresta|biologia)/.test(norm)
  ) {
    return 'Animais & Natureza';
  }
  if (
    /(comida|bebida|boteco|churrasco|pizza|restaurante|culinaria|doce|sobremesa|geladeira|cozinha|fome)/.test(
      norm
    )
  ) {
    return 'Comidas & Bebidas';
  }
  if (
    /(trabalho|profissao|emprego|chefe|escritorio|carreira|faculdade|escola|boleto|adulto)/.test(
      norm
    )
  ) {
    return 'Trabalho & Vida Adulta';
  }
  if (
    /(date|encontro|namoro|casal|relacionamento|festa|aniversario|cotidiano|rotina|viagem|ferias)/.test(
      norm
    )
  ) {
    return 'Cotidiano & Dates';
  }
  return 'Cultura Pop & Cinema';
}

/**
 * Selects 6 dynamic few-shot examples from NOTA_GOLDEN_PROMPTS,
 * prioritizing the category closest to the user's chosen theme.
 */
export function selectFewShotNotaExamples(
  theme: string,
  count: number = 6,
  excludeQuestions: string[] = []
): NotaPromptItem[] {
  const clampedCount = Math.min(8, Math.max(4, count));
  const targetCat = matchThemeToNotaCategory(theme);
  const excludedSet = new Set(excludeQuestions.map((q) => String(q || '').trim().toLowerCase()));

  const available = NOTA_GOLDEN_PROMPTS.filter(
    (p) =>
      !excludedSet.has(p.id.toLowerCase()) && !excludedSet.has(p.pergunta.toLowerCase())
  );
  const pool = available.length >= clampedCount ? available : NOTA_GOLDEN_PROMPTS;

  const matching = shuffleArray(pool.filter((p) => p.categoria === targetCat));
  const others = shuffleArray(pool.filter((p) => p.categoria !== targetCat));

  return [...matching, ...others].slice(0, clampedCount);
}

/**
 * Draws an official non-repeating prompt from NOTA_GOLDEN_PROMPTS.
 */
export function drawUnusedGoldenNotaPrompt(
  theme: string,
  usedQuestions: Iterable<string> = []
): NotaPromptItem | null {
  const usedSet = new Set(
    Array.from(usedQuestions).map((s) => String(s || '').trim().toLowerCase())
  );
  const targetCat = matchThemeToNotaCategory(theme);

  const unusedInCat = NOTA_GOLDEN_PROMPTS.filter(
    (p) =>
      p.categoria === targetCat &&
      !usedSet.has(p.id.toLowerCase()) &&
      !usedSet.has(p.pergunta.toLowerCase())
  );
  if (unusedInCat.length > 0) {
    return shuffleArray(unusedInCat)[0];
  }

  const allUnused = NOTA_GOLDEN_PROMPTS.filter(
    (p) => !usedSet.has(p.id.toLowerCase()) && !usedSet.has(p.pergunta.toLowerCase())
  );
  if (allUnused.length > 0) {
    return shuffleArray(allUnused)[0];
  }

  return null;
}

/**
 * Builds the official Master Calibration Prompt for Jogo da Nota (Etapa 2),
 * embedding the 6 Golden Laws and dynamic Few-Shot Examples.
 */

export function getNotaDifficultyGuideline(dificuldade: string): string {
  const norm = (dificuldade || 'dificil').toLowerCase().trim();
  if (norm === 'facil') {
    return `DIRETRIZ ESTRITA DE NÍVEL FÁCIL (LEVE / INFANTIL / FAMÍLIA):
- O nível selecionado é FÁCIL! A pergunta para a escala de 1 a 10 DEVE ser leve, fofa, familiar e compreensível até para uma criança (ex: "Qual sabor de sorvete?", "Qual animal da floresta?", "Você ganhou um presente surpresa: o que era?").
- Nada de situações complexas ou inadequadas para crianças.`;
  }
  if (norm === 'medio') {
    return `DIRETRIZ ESTRITA DE NÍVEL MÉDIO:
- Situações sociais do dia a dia, divertidas e relacionáveis para amigos e família (ex: "Qual filme para assistir em dia de chuva?", "O que comer num domingo à noite?").`;
  }
  if (norm === 'impossivel') {
    return `DIRETRIZ ESTRITA DE NÍVEL IMPOSSÍVEL:
- Dilemas surreais, situações cósmicas ou absurdas (ex: "Você foi abduzido por alienígenas e tem que convencer eles a salvar a Terra: qual é o seu argumento?", "Um gênio da lâmpada apareceu mas ele tem muito mau humor: o que você pediu?").`;
  }
  return `DIRETRIZ ESTRITA DE NÍVEL DIFÍCIL:
- Situações polêmicas, dilemas cômicos afiados e perguntas provocativas onde achar o meio-termo é um desafio hilário.`;
}

/**
 * Builds the official Master Calibration Prompt for Jogo da Nota (Etapa 2),
 * embedding the 6 Golden Laws, difficulty calibration, and dynamic Few-Shot Examples.
 */
export const buildNotaPrompt = (
  tema: string,
  dificuldadeOrFewShot?: string | NotaPromptItem[],
  exemplosFewShotOrHistorico?: NotaPromptItem[] | string[],
  historicoUsado?: string[]
): string => {
  let dificuldade = 'dificil';
  let exemplosFewShot: NotaPromptItem[] = [];
  let historico: string[] = [];

  if (typeof dificuldadeOrFewShot === 'string') {
    dificuldade = dificuldadeOrFewShot;
    exemplosFewShot = (Array.isArray(exemplosFewShotOrHistorico) ? exemplosFewShotOrHistorico : []) as NotaPromptItem[];
    historico = (historicoUsado || []) as string[];
  } else if (Array.isArray(dificuldadeOrFewShot)) {
    exemplosFewShot = dificuldadeOrFewShot;
    historico = (Array.isArray(exemplosFewShotOrHistorico) ? exemplosFewShotOrHistorico : []) as string[];
  }

  return `
Você é o roteirista oficial do "Jogo da Nota" do programa Roda de Bobo (CazeTV).
Sua tarefa é criar UMA pergunta/desafio curto, criativo e engraçado sobre o TEMA: "${tema}" (Dificuldade: ${dificuldade}).

${NOTA_SIX_GOLDEN_LAWS}

${getNotaDifficultyGuideline(dificuldade)}

ESTUDE ESTES EXEMPLOS PERFEITOS E IMITE A SIMPLICIDADE E O HUMOR DELES:
${JSON.stringify(exemplosFewShot.slice(0, 6), null, 2)}

REGRAS DE OURO DE ESCRITA (ESTRITAMENTE OBRIGATÓRIO):
1. NUNCA escreva a palavra "nota", "número", "escala" ou o nome do tema dentro da frase! (PROIBIDO escrever "No universo de...", "O que merece a sua nota?", etc.).
2. A frase deve ter no máximo 8 a 15 palavras, limpa, direta e sem parênteses.
3. CALIBRAÇÃO DO NÍVEL (${dificuldade.toUpperCase()}): Respeite a tonalidade da dificuldade (leve e infantil no Fácil; cotidiana no Médio; polêmica no Difícil; surreal/cósmica no Impossível).
4. A pergunta DEVE permitir que o jogador responda citando algo que vá do horrível/fraco/caótico (se ele tirou 1) até o lendário/perfeito/extremo (se ele tirou 10).
5. NUNCA repita perguntas ou ideias parecidas com: ${JSON.stringify(historico)}.

Retorne APENAS um JSON válido:
{
  "pergunta": "Frase curta, humana e direta sem mencionar a palavra nota"
}
`;
};
