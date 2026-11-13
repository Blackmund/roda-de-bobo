/**
 * BANCO DE OURO OFICIAL DO "TEM OU NÃO TEM" (7 EXEMPLOS MESTRES)
 * + ENGENHARIA DE FORMULAÇÃO (AS 6 LEIS DO PAINEL DE 100 VOTOS)
 */

export interface TemOuNaoTemAnswer {
  posicao: 1 | 2 | 3 | 4 | 5 | number;
  texto: string;
  votos: number;
  sinonimos_aceitos: string[];
}

export interface TemOuNaoTemQuestion {
  id: string;
  categoria: string;
  pergunta: string;
  respostas: [
    TemOuNaoTemAnswer,
    TemOuNaoTemAnswer,
    TemOuNaoTemAnswer,
    TemOuNaoTemAnswer,
    TemOuNaoTemAnswer
  ];
}

export const TEM_OU_NAO_TEM_SIX_GOLDEN_LAWS = `AS REGRAS DE OURO PARA FORMULAR PESQUISAS DO "TEM OU NÃO TEM":
1. LEI DO CRITÉRIO ÚNICO (ESTRITAMENTE PROIBIDO PERGUNTAS DUPLAS COM "OU" / "E"):
   - No Tem ou Não Tem, a pergunta NUNCA deve misturar duas categorias, habilidades ou contextos diferentes usando "ou" ou "e".
   - ❌ PROIBIDO: "Quais os jogadores mais lembrados quando o assunto é cobrança de pênalti ou falta?" (mistura dois fundamentos diferentes!).
   - ✅ CORRETO: "Quais os jogadores mais lembrados quando o assunto é cobrança de pênalti?" OU "Quais os jogadores mais lembrados quando o assunto é gol de falta?".
   - ❌ PROIBIDO: "Quais as comidas doces ou salgadas mais vendidas em festa junina?"
   - ✅ CORRETO: "Quais as comidas mais tradicionais de uma festa junina?".
   - Cada pergunta deve ter um ÚNICO recorte cristalino, específico e direto para que o ranking de 1 a 10 faça sentido total.
2. LEI DA RESPOSTA ÚNICA POR POSIÇÃO (ESTRITAMENTE PROIBIDO USAR BARRAS "/" OU EMPATES):
   - Cada posição do painel (1 a 5 ou 1 a 10) DEVE conter ESTRITAMENTE 1 ÚNICO NOME, ITEM OU PESSOA.
   - ❌ TERMINANTEMENTE PROIBIDO: "RAPHAEL VEIGA / GABIGOL / MARCOS ASSUNÇÃO", "Chaves / Chapolin" ou "Coca-Cola / Guaraná".
   - ✅ CORRETO: Cada posição tem 1 único nome: Posição 10: "RAPHAEL VEIGA". Variações de digitação vão APENAS dentro de "sinonimos_aceitos".
3. PERGUNTA DE ASSOCIAÇÃO IMEDIATA ("O QUE VEM À CABEÇA DO BRASILEIRO MÉDIO?"):
   - A pergunta simula uma pesquisa de opinião popular feita com 100 pessoas.
   - Use estruturas clássicas de auditório: "Diga um jogador que você lembra imediatamente quando o assunto é...", "Cite algo que nunca pode faltar em...", "Quando o assunto é [X], qual é o primeiro nome que vem à cabeça?".
4. MATEMÁTICA EXATA DOS VOTOS (EM ORDEM DECRESCENTE):
   - As respostas DEVEM somar exatamente 100 votos (ou a meta especificada).
   - O 1º lugar (Bloco Ciano no topo) deve ser a resposta mais dominante/unânime (ex: entre 35 e 70 votos), e os lugares seguintes distribuem o restante em ordem decrescente rigorosa (ex: 70, 10, 10, 6, 4 ou 42, 24, 16, 11, 7).
5. RESPOSTAS CURTAS DE 1 A 3 PALAVRAS (SEM FRASES LONGAS NO PAINEL):
   - Cada item do painel deve ser um substantivo, nome próprio ou ação curtíssima (ex: "Cristiano Ronaldo", "Pão de Alho", "Dormir", "Chaves").
6. DICIONÁRIO RICO DE SINÔNIMOS ACEITOS ("sinonimos_aceitos"):
   - Para que a validação digital funcione perfeitamente quando o jogador digitar o palpite, cada resposta DEVE trazer um array "sinonimos_aceitos" contendo apelidos, nomes completos, variações sem acento e termos equivalentes em letras minúsculas.
7. LEI DA CATEGORIA ABERTA (ESTRITAMENTE PROIBIDO PERGUNTA TRIVIA COM RESPOSTA ÚNICA):
   - O Tem ou Não Tem é uma pesquisa aberta de auditório (Family Feud / 100 Brasileiros Dizem). NUNCA faça uma pergunta de curiosidade/conhecimento geral que tenha apenas 1 único fato verdadeiro no mundo real.
   - ❌ TERMINANTEMENTE PROIBIDO: "Qual evento histórico é lembrado por ter sido o maior desastre marítimo de todos os tempos em sua viagem inaugural?" (Isso é pergunta de quiz escolar! Só existe o Titanic como resposta verdadeira, o que força o painel a inventar itens desconexos e sem sentido como "Afundamento", "Iceberg", "1912", "Passageiros").
   - ❌ PROIBIDO: "Quem descobriu o Brasil?" (Só existe Cabral).
   - ❌ PROIBIDO: "Qual o maior país da América do Sul?" (Só existe Brasil).
   - ✅ CORRETO SE O TEMA FOR UMA COISA ESPECÍFICA (ex: Titanic): Pergunte associações diretas: "Quando você pensa no Titanic, o que vem primeiro à sua mente?" -> 1. Iceberg (35), 2. Leonardo DiCaprio / Jack (25), 3. Rose (18), 4. Naufrágio / Afundar (12), 5. Violino / Músicos (6), 6. Música da Céline Dion (4).
   - ✅ CORRETO SE O TEMA FOR UMA CLASSE ABERTA: Pergunte itens dessa classe: "Cite um desastre histórico marcante que as pessoas mais lembram" -> 1. Titanic, 2. Chernobyl, 3. 11 de Setembro, 4. Pompeia, 5. Hiroshima.
   - Cada posição do ranking deve ser do mesmo tipo/categoria e fazer sentido comparativo total.`;

export const TEM_OU_NAO_TEM_GOLDEN_QUESTIONS: TemOuNaoTemQuestion[] = [
  {
    id: 'tont-01',
    categoria: 'Esportes & Futebol',
    pergunta:
      'Diga um jogador que você lembra imediatamente quando o assunto é cobrança de pênalti',
    respostas: [
      {
        posicao: 1,
        texto: 'Cristiano Ronaldo',
        votos: 70,
        sinonimos_aceitos: ['cr7', 'cristiano', 'ronaldo', 'penaldo']
      },
      {
        posicao: 2,
        texto: 'Henrique Dourado',
        votos: 10,
        sinonimos_aceitos: ['ceifador', 'dourado', 'henrique']
      },
      {
        posicao: 3,
        texto: 'Neymar Jr.',
        votos: 10,
        sinonimos_aceitos: ['neymar', 'ney', 'adulto ney']
      },
      {
        posicao: 4,
        texto: 'Gabigol',
        votos: 6,
        sinonimos_aceitos: ['gabriel barbosa', 'gabi', 'gabriel']
      },
      {
        posicao: 5,
        texto: 'Fábio Santos',
        votos: 4,
        sinonimos_aceitos: ['fabio santos', 'tio chico']
      }
    ]
  },
  {
    id: 'tont-02',
    categoria: 'Esportes & Futebol',
    pergunta: 'Diga um jogador histórico famoso por marcar gols de falta',
    respostas: [
      {
        posicao: 1,
        texto: 'Juninho Pernambucano',
        votos: 48,
        sinonimos_aceitos: ['juninho', 'reizin', 'pernambucano']
      },
      {
        posicao: 2,
        texto: 'Rogério Ceni',
        votos: 22,
        sinonimos_aceitos: ['ceni', 'rogerio', 'mito']
      },
      {
        posicao: 3,
        texto: 'Marcelinho Carioca',
        votos: 14,
        sinonimos_aceitos: ['marcelinho', 'pe de anjo']
      },
      {
        posicao: 4,
        texto: 'Zico',
        votos: 10,
        sinonimos_aceitos: ['galinho', 'arthur antunes coimbra']
      },
      {
        posicao: 5,
        texto: 'Roberto Carlos',
        votos: 6,
        sinonimos_aceitos: ['roberto']
      }
    ]
  },
  {
    id: 'tont-03',
    categoria: 'Cotidiano & Brasil',
    pergunta: 'Cite algo que nunca pode faltar em um churrasco de domingo no Brasil',
    respostas: [
      {
        posicao: 1,
        texto: 'Picanha',
        votos: 45,
        sinonimos_aceitos: ['picanha', 'carne', 'costela', 'contrafile', 'churrasco']
      },
      {
        posicao: 2,
        texto: 'Cerveja Gelada',
        votos: 25,
        sinonimos_aceitos: ['cerveja', 'breja', 'chopp', 'bebida']
      },
      {
        posicao: 3,
        texto: 'Pão de Alho',
        votos: 15,
        sinonimos_aceitos: ['pao de alho', 'paozinho']
      },
      {
        posicao: 4,
        texto: 'Farofa',
        votos: 9,
        sinonimos_aceitos: ['farofa', 'vinagrete', 'molho campanha']
      },
      {
        posicao: 5,
        texto: 'Pagode',
        votos: 6,
        sinonimos_aceitos: ['pagode', 'samba', 'musica', 'sertanejo', 'som']
      }
    ]
  },
  {
    id: 'tont-04',
    categoria: 'Cotidiano & Brasil',
    pergunta: 'Qual é a primeira coisa que uma pessoa faz assim que acorda de manhã?',
    respostas: [
      {
        posicao: 1,
        texto: 'Olhar o Celular',
        votos: 50,
        sinonimos_aceitos: ['celular', 'whatsapp', 'despertador', 'telefone', 'mexer no celular']
      },
      {
        posicao: 2,
        texto: 'Ir ao Banheiro',
        votos: 20,
        sinonimos_aceitos: ['banheiro', 'fazer xixi', 'urinar', 'lavar o rosto']
      },
      {
        posicao: 3,
        texto: 'Escovar os Dentes',
        votos: 14,
        sinonimos_aceitos: ['escovar dente', 'dentes', 'escovar']
      },
      {
        posicao: 4,
        texto: 'Tomar Café',
        votos: 10,
        sinonimos_aceitos: ['cafe', 'tomar cafe', 'beber agua', 'agua', 'passar cafe']
      },
      {
        posicao: 5,
        texto: 'Soneca',
        votos: 6,
        sinonimos_aceitos: ['soneca', 'voltar a dormir', 'adiar despertador', 'espreguicar']
      }
    ]
  },
  {
    id: 'tont-05',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'Diga um super-herói que todo mundo conhece, mesmo quem não assiste filmes de herói',
    respostas: [
      {
        posicao: 1,
        texto: 'Homem-Aranha',
        votos: 38,
        sinonimos_aceitos: ['spiderman', 'spider-man', 'peter parker', 'aranha']
      },
      {
        posicao: 2,
        texto: 'Batman',
        votos: 27,
        sinonimos_aceitos: ['homem morcego', 'bruce wayne']
      },
      {
        posicao: 3,
        texto: 'Superman',
        votos: 20,
        sinonimos_aceitos: ['super-homem', 'super homem', 'clark kent']
      },
      {
        posicao: 4,
        texto: 'Homem de Ferro',
        votos: 9,
        sinonimos_aceitos: ['iron man', 'tony stark']
      },
      {
        posicao: 5,
        texto: 'Mulher-Maravilha',
        votos: 6,
        sinonimos_aceitos: ['wonder woman', 'diana']
      }
    ]
  },
  {
    id: 'tont-06',
    categoria: 'Comidas & Bebidas',
    pergunta: 'Cite um sabor de pizza que sempre gera discussão ou é o mais pedido na mesa',
    respostas: [
      {
        posicao: 1,
        texto: 'Calabresa',
        votos: 40,
        sinonimos_aceitos: ['calabresa acebolada', 'calabresa com cebola']
      },
      {
        posicao: 2,
        texto: 'Portuguesa',
        votos: 24,
        sinonimos_aceitos: ['portuga']
      },
      {
        posicao: 3,
        texto: 'Frango com Catupiry',
        votos: 18,
        sinonimos_aceitos: ['frango', 'catupiry', 'frango catupiry']
      },
      {
        posicao: 4,
        texto: 'Mussarela',
        votos: 11,
        sinonimos_aceitos: ['mussarela', 'mucarela', 'marguerita', 'margherita', 'queijo']
      },
      {
        posicao: 5,
        texto: 'Quatro Queijos',
        votos: 7,
        sinonimos_aceitos: ['4 queijos']
      }
    ]
  },
  {
    id: 'tont-07',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Cite uma parte do corpo humano que as pessoas mais costumam machucar ao bater num móvel',
    respostas: [
      {
        posicao: 1,
        texto: 'Dedinho do Pé',
        votos: 36,
        sinonimos_aceitos: ['pe', 'dedinho', 'tornozelo', 'dedo do pe']
      },
      {
        posicao: 2,
        texto: 'Canela',
        votos: 25,
        sinonimos_aceitos: ['canela', 'perna', 'tibia', 'coxa']
      },
      {
        posicao: 3,
        texto: 'Joelho',
        votos: 19,
        sinonimos_aceitos: ['ligamento', 'menisco']
      },
      {
        posicao: 4,
        texto: 'Cotovelo',
        votos: 12,
        sinonimos_aceitos: ['cotovelo', 'braco', 'pulso']
      },
      {
        posicao: 5,
        texto: 'Cabeça',
        votos: 8,
        sinonimos_aceitos: ['cabeca', 'testa', 'galo']
      }
    ]
  }
];

function shuffleArray<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[i] = tmp;
  }
  return copy;
}

export function matchThemeToTemOuNaoTemCategory(theme: string): string {
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
    /(comida|bebida|pizza|churrasco|boteco|restaurante|culinaria|doce|sobremesa|cozinha)/.test(
      norm
    )
  ) {
    return 'Comidas & Bebidas';
  }
  if (
    /(filme|cinema|cultura pop|serie|novela|tv|heroi|marvel|disney|anime|game|celebridade)/.test(
      norm
    )
  ) {
    return 'Cultura Pop & Cinema';
  }
  if (/(ciencia|corpo|humano|medicina|anatomia|saude|biologia|animal|natureza)/.test(norm)) {
    return 'Ciência & Corpo Humano';
  }
  return 'Cotidiano & Brasil';
}

/**
 * Selects 4 dynamic few-shot examples from TEM_OU_NAO_TEM_GOLDEN_QUESTIONS,
 * prioritizing the category closest to the user's chosen theme.
 */

export function getTemOuNaoTemDifficultyGuideline(dificuldade: string): string {
  const norm = (dificuldade || 'dificil').toLowerCase().trim();
  if (norm === 'facil') {
    return `DIRETRIZ ESTRITA DE NÍVEL FÁCIL (LEVE / INFANTIL / FAMÍLIA):
- O nível selecionado é FÁCIL! A pesquisa simulada DEVE ser sobre situações cotidianas, óbvias e familiares até para crianças de 8-10 anos (ex: "Cite um animal de estimação comum", "Cite algo que toda criança leva para a escola", "Cite uma comida doce de festa de aniversário", "Cite algo que se leva para a praia").
- As respostas devem ter altíssima concordância e respostas óbvias e clássicas nas primeiras posições (ex: Cachorro, Gato, Pássaro).`;
  }
  if (norm === 'medio') {
    return `DIRETRIZ ESTRITA DE NÍVEL MÉDIO (CONHECIMENTOS GERAIS E COTIDIANO):
- O nível selecionado é MÉDIO! Situações sociais do dia a dia de jovens e adultos (ex: "Cite uma desculpa comum para chegar atrasado", "Cite algo que as pessoas esquecem com frequência ao sair de casa", "Cite uma profissão que trabalha aos sábados e domingos").
- Requer observação do cotidiano e bom senso social.`;
  }
  if (norm === 'impossivel') {
    return `DIRETRIZ ESTRITA DE NÍVEL IMPOSSÍVEL (INCONVENCIONAL / SURPREENDENTE):
- O nível selecionado é IMPOSSÍVEL! Pesquisas com temas inusitados, dilemas bizarros ou curiosidades humanas onde as respostas do público são surpreendentes, imprevisíveis e contraintuitivas (ex: "Cite a coisa mais estranha que alguém já colecionou", "Cite o motivo mais bizarro para terminar um relacionamento").
- As respostas do painel chocam e divertem a sala inteira quando são reveladas!`;
  }
  // Default: 'dificil'
  return `DIRETRIZ ESTRITA DE NÍVEL DIFÍCIL (DESAFIO PADRÃO AUDITÓRIO / RODA DE BOBO):
- O nível selecionado é DIFÍCIL! Perguntas onde a opinião pública é muito dividida e onde a 4ª e 5ª posições são pegadinhas que exigem muita perspicácia.`;
}

/**
 * Selects 4 dynamic few-shot examples from TEM_OU_NAO_TEM_GOLDEN_QUESTIONS,
 * prioritizing the requested difficulty and category closest to the user's chosen theme.
 */
export function selectFewShotTemOuNaoTemExamples(
  theme: string,
  count: number = 4,
  excludeQuestions: string[] = [],
  _dificuldade: string = 'dificil'
): TemOuNaoTemQuestion[] {
  const clampedCount = Math.min(7, Math.max(3, count));
  const targetCat = matchThemeToTemOuNaoTemCategory(theme);
  const excludedSet = new Set(excludeQuestions.map((q) => String(q || '').trim().toLowerCase()));

  const available = TEM_OU_NAO_TEM_GOLDEN_QUESTIONS.filter(
    (q) =>
      !excludedSet.has(q.id.toLowerCase()) && !excludedSet.has(q.pergunta.toLowerCase())
  );
  const pool = available.length >= clampedCount ? available : TEM_OU_NAO_TEM_GOLDEN_QUESTIONS;

  const matching = shuffleArray(pool.filter((q) => q.categoria === targetCat));
  const others = shuffleArray(pool.filter((q) => q.categoria !== targetCat));

  return [...matching, ...others].slice(0, clampedCount);
}

/**
 * Builds the official Master Calibration Prompt for Tem ou Não Tem,
 * embedding the 6 Golden Laws, difficulty calibration, and dynamic Few-Shot Examples.
 */
export const buildTemOuNaoTemPrompt = (
  tema: string,
  dificuldade: string,
  exemplosFewShot: TemOuNaoTemQuestion[],
  historicoUsado: string[],
  qtdRespostas: number = 5,
  totalVotos: number = 100
): string => `
Você é o produtor de pesquisas do jogo "Tem ou Não Tem" (Caldeirão com Mion / Desafio Top 5 ou Top 10 do Roda de Bobo).
Sua tarefa é simular uma pesquisa feita com ${totalVotos} pessoas sobre o TEMA: "${tema}" (Nível de dificuldade: ${dificuldade}) e gerar o painel oficial com exatamente ${qtdRespostas} respostas mais citadas.

${TEM_OU_NAO_TEM_SIX_GOLDEN_LAWS}

${getTemOuNaoTemDifficultyGuideline(dificuldade)}

ESTUDE ESTES EXEMPLOS OFICIAIS E IMITE RIGOROSAMENTE A ESTRUTURA DELES:
${JSON.stringify(exemplosFewShot.slice(0, 4), null, 2)}

REGRAS CRÍTICAS DE OURO (OBRIGATÓRIO E SEM EXCEÇÃO):
1. LEI DO CRITÉRIO ÚNICO (SEM "OU" / "E"): A pergunta DEVE escolher UM ÚNICO critério específico.
   - NUNCA junte dois contextos com "ou" ou "e" (Ex: NUNCA faça "cobrança de pênalti ou falta", NUNCA faça "doces ou salgados").
   - Escolha só um fundamento por vez: "cobrança de pênalti" OU "gol de falta".
2. LEI DA RESPOSTA ÚNICA POR POSIÇÃO (ESTRITAMENTE PROIBIDO USAR BARRAS "/"):
   - Cada posição DEVE ter ESTRITAMENTE 1 ÚNICO NOME, PESSOA OU ITEM.
   - NUNCA use barra "/" nem junte nomes diferentes (Ex: NUNCA coloque "RAPHAEL VEIGA / GABIGOL", coloque APENAS "RAPHAEL VEIGA").
   - Coloque sinônimos ou apelidos apenas no array "sinonimos_aceitos".
3. As ${qtdRespostas} respostas DEVEM estar ordenadas da 1ª (mais votada) até a ${qtdRespostas}ª, e a SOMA EXATA dos votos das ${qtdRespostas} respostas DEVE SER ${totalVotos} (ex: 45 + 23 + 15 + 10 + 7 = 100).
4. CALIBRAÇÃO DO NÍVEL (${dificuldade.toUpperCase()}): As perguntas e respostas devem refletir fielmente o nível escolhido (fácil e cotidiano no Fácil; curioso no Difícil; surpreendente no Impossível).
5. Cada resposta deve ser curta (1 a 4 palavras), mas COMPLETA: quem lê só a resposta, sem a pergunta, entende do que se trata. NUNCA corte a resposta no meio (ERRADO: "Primeiro homem", "Lançamento foguete". CERTO: "Homem no espaço", "Gagarin em órbita", "Lançamento do Sputnik"). Prefira o nome próprio do fato, da pessoa ou do objeto. O campo "texto" vai em português com acentuação correta (ERRADO: "Estacao espacial". CERTO: "Estação Espacial"); só os "sinonimos_aceitos" ficam sem acento. Cada resposta deve incluir um array "sinonimos_aceitos" em letras minúsculas e sem acento para permitir validação flexível quando o jogador digitar.
6. Zero sobreposição entre as posições: itens equivalentes devem ficar agrupados nos sinônimos.
7. PROIBIDO PERGUNTA TRIVIA DE RESPOSTA ÚNICA: NUNCA faça perguntas cuja resposta verdadeira seja um fato isolado (ex: NUNCA faça "Qual evento histórico foi o maior desastre marítimo em sua viagem inaugural?"). Se o tema for Titanic, a pergunta DEVE ser de associação aberta: "Quando você pensa no Titanic, o que vem primeiro à sua mente?".
8. NUNCA repita perguntas ou painéis já utilizados: ${JSON.stringify(historicoUsado)}.

Retorne APENAS um JSON válido no formato:
{
  "pergunta": "Texto direto e de critério único da pergunta",
  "respostas": [
    { "posicao": 1, "texto": "Resposta 1", "votos": 45, "sinonimos_aceitos": ["sinonimo1", "sinonimo2"] },
    { "posicao": 2, "texto": "Resposta 2", "votos": 23, "sinonimos_aceitos": ["sinonimo1"] },
    { "posicao": 3, "texto": "Resposta 3", "votos": 15, "sinonimos_aceitos": ["sinonimo1"] },
    { "posicao": 4, "texto": "Resposta 4", "votos": 10, "sinonimos_aceitos": ["sinonimo1"] },
    { "posicao": 5, "texto": "Resposta 5", "votos": 7, "sinonimos_aceitos": ["sinonimo1"] }
  ]
}
`;
