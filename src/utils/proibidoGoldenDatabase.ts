/**
 * BANCO DE OURO OFICIAL DO "JOGO DO PROIBIDO" (18 EXEMPLOS MESTRES)
 * + ENGENHARIA DE FORMULAÇÃO (AS 6 LEIS DE BLOQUEIO MENTAL)
 */

export interface ProibidoGoldenCard {
  id: string;
  categoria: string;
  palavra_alvo: string;
  palavras_proibidas: [string, string, string, string, string];
  dificuldade?: 'facil' | 'medio' | 'dificil' | 'impossivel';
}

export type ProibidoCard = ProibidoGoldenCard;

/**
 * Guarantees strictly `targetCount` (default: 5) forbidden words for any card.
 * Never allows fewer than targetCount forbidden words under any circumstance.
 */
export function ensureStrictForbiddenWordsCount(
  targetWord: string,
  words: string[] | undefined | null,
  targetCount: number = 5,
  themeHint: string = ''
): string[] {
  const normTarget = String(targetWord || '').trim().toUpperCase();
  const rawList = Array.isArray(words) ? words : [];

  // Clean, trim, uppercase, remove duplicates and matches with the target word
  const cleanList = Array.from(
    new Set(
      rawList
        .map((w) => String(w || '').trim().toUpperCase())
        .filter((w) => Boolean(w) && w !== normTarget)
    )
  );

  // If already at targetCount or higher, return exactly targetCount
  if (cleanList.length >= targetCount) {
    return cleanList.slice(0, targetCount);
  }

  // Check if targetWord exists in PROIBIDO_GOLDEN_CARDS
  const goldenMatch = PROIBIDO_GOLDEN_CARDS.find(
    (c) => c.palavra_alvo.toUpperCase() === normTarget
  );
  if (goldenMatch) {
    for (const gw of goldenMatch.palavras_proibidas) {
      const normGw = gw.toUpperCase();
      if (!cleanList.includes(normGw) && normGw !== normTarget) {
        cleanList.push(normGw);
        if (cleanList.length >= targetCount) return cleanList.slice(0, targetCount);
      }
    }
  }

  // Special known pop-culture / cinema / Marvel fallbacks (e.g. Vingadores)
  if (normTarget.includes('VINGADOR') || normTarget.includes('AVENGERS')) {
    const marvelPool = [
      'MARVEL',
      'HERÓIS',
      'THANOS',
      'HOMEM DE FERRO',
      'CAPITÃO AMÉRICA',
      'THOR',
      'HULK',
      'CINEMA',
      'FILME'
    ];
    for (const mw of marvelPool) {
      if (!cleanList.includes(mw) && mw !== normTarget) {
        cleanList.push(mw);
        if (cleanList.length >= targetCount) return cleanList.slice(0, targetCount);
      }
    }
  }

  // Thematic dictionary fallbacks based on common concepts
  const thematicBackups: Record<string, string[]> = {
    filmes: ['CINEMA', 'FILME', 'PERSONAGEM', 'ATRIZ', 'ATOR', 'DIRETOR', 'TELA', 'ROTEIRO', 'SÉRIE', 'HOLLYWOOD'],
    cinema: ['CINEMA', 'FILME', 'PERSONAGEM', 'ATRIZ', 'ATOR', 'DIRETOR', 'TELA', 'ROTEIRO', 'SÉRIE', 'HOLLYWOOD'],
    futebol: ['BOLA', 'GOL', 'JOGADOR', 'CAMPO', 'ESTÁDIO', 'TIME', 'TORCIDA', 'CAMISA', 'APITO', 'TÉCNICO'],
    comida: ['COMER', 'PRATO', 'SABOR', 'DOCE', 'SALGADO', 'RECEITA', 'FORNO', 'PANELA', 'MESA', 'INGREDIENTE'],
    musica: ['CANTOR', 'MÚSICA', 'SHOW', 'ÁLBUM', 'BANDA', 'LETRA', 'VOZ', 'PALCO', 'INSTRUMENTO', 'CANÇÃO'],
    games: ['JOGO', 'CONSOLE', 'FASE', 'VIDEOGAME', 'PERSONAGEM', 'TELA', 'CONTROLE', 'PLAYER', 'ONLINE'],
    geral: ['NOME', 'TÍTULO', 'FAMOSO', 'POPULAR', 'CONCEITO', 'OBJETO', 'REFERÊNCIA', 'ORIGEM', 'CARACTERÍSTICA']
  };

  const lowerTheme = (themeHint || '').toLowerCase();
  const matchedKey = Object.keys(thematicBackups).find((k) => lowerTheme.includes(k)) || 'geral';
  const pool = [...thematicBackups[matchedKey], ...thematicBackups.geral];

  for (const pw of pool) {
    if (cleanList.length >= targetCount) break;
    if (!cleanList.includes(pw) && pw !== normTarget) {
      cleanList.push(pw);
    }
  }

  let counter = 1;
  while (cleanList.length < targetCount) {
    const pad = `PROIBIDO ${counter++}`;
    if (!cleanList.includes(pad)) {
      cleanList.push(pad);
    }
  }

  return cleanList.slice(0, targetCount);
}

export const PROIBIDO_SIX_GOLDEN_LAWS = `AS 6 LEIS DE OURO PARA FORMULAR CARTAS DO "JOGO DO PROIBIDO":
1. A ANATOMIA PERFEITA DAS 5 PALAVRAS PROIBIDAS (REGRA DOS 5 PILARES BLOQUEADOS):
   - Proibida 1 (A Categoria Direta / O que é): Se o alvo é Abacaxi, bloqueie FRUTA. Se é Polo Aquático, bloqueie ESPORTE ou NATAÇÃO. Se é Zico, bloqueie FUTEBOL ou JOGADOR.
   - Proibida 2 (O Principal Associado / Clube / País / Obra): Em Zico, bloqueie FLAMENGO. Em Torre Eiffel, bloqueie PARIS ou FRANÇA.
   - Proibida 3 (O Apelido / Bordão / Parte Física Marcante): Em Zico, bloqueie GALINHO. Em Abacaxi, bloqueie COROA.
   - Proibida 4 (A Ação / Lugar / Característica Sensorial): Em Abacaxi, bloqueie ESPINHO ou AMARELO. Em Polo Aquático, bloqueie ÁGUA e PISCINA. Em Zico, bloqueie MARACANÃ.
   - Proibida 5 (A Referência Pop / Meme / Data Histórica): Em Abacaxi, bloqueie BOB ESPONJA. Em Zico, bloqueie 1981.
2. PROIBIÇÃO DE PALAVRAS PROIBIDAS FRACAS OU GENÉRICAS:
   - NUNCA coloque adjetivos vagos nas palavras proibidas (como "Legal", "Grande", "Famoso", "Bom", "Bonito"). Cada palavra proibida deve ser um substantivo, verbo ou característica que o jogador realmente tentaria falar nos primeiros 3 segundos!
3. VARIEDADE ABSOLUTA ENTRE AS CARTAS DA MESMA MÃO:
   - Dentro de uma rodada de cartas sobre um tema, as palavras_alvo DEVEM pertencer a subcategorias diferentes (Carta 1: Uma Pessoa/Personagem; Carta 2: Um Objeto/Comida; Carta 3: Um Lugar/Construção; Carta 4: Um Conceito/Evento; Carta 5: Uma Obra/Marca). NUNCA gere 5 jogadores seguidos ou 5 frutas seguidas na mesma mão!
4. ALVOS RECONHECÍVEIS POR TODA A MESA:
   - A dificuldade do jogo deve estar nas 5 palavras bloqueadas, e não em uma palavra-alvo obscura que ninguém na sala conhece. Escolha alvos icônicos dentro do tema e trave os caminhos óbvios de explicação!
5. PALAVRAS PROIBIDAS SEMPRE DE 1 OU 2 TERMOS DIRETOS:
   - As palavras proibidas devem ser palavras isoladas ou termos curtos consagrados (ex: BOB ESPONJA, COPA DO MUNDO), nunca frases longas.
6. BLOQUEIO DE RADICAIS NA PRÓPRIA CARTA:
   - Não desperdice uma das 5 palavras proibidas colocando uma palavra que já tem o mesmo radical da palavra-alvo (pois a regra do jogo já proíbe automaticamente falar o mesmo radical!).`;

export const PROIBIDO_GOLDEN_CARDS: ProibidoGoldenCard[] = [
  // EXEMPLOS OFICIAIS E CALIBRADOS (PADRÃO RODA DE BOBO)
  {
    id: 'pro-01',
    categoria: 'Geral & Cotidiano',
    palavra_alvo: 'ABACAXI',
    palavras_proibidas: ['FRUTA', 'COROA', 'ESPINHO', 'AMARELO', 'BOB ESPONJA']
  },
  {
    id: 'pro-02',
    categoria: 'Esportes & Futebol',
    palavra_alvo: 'POLO AQUÁTICO',
    palavras_proibidas: ['ÁGUA', 'NATAÇÃO', 'PISCINA', 'BOLA', 'GOL']
  },
  {
    id: 'pro-03',
    categoria: 'Esportes & Futebol',
    palavra_alvo: 'ZICO',
    palavras_proibidas: ['FLAMENGO', 'GALINHO', 'MARACANÃ', 'FUTEBOL', '1981']
  },
  {
    id: 'pro-04',
    categoria: 'Geografia & Natureza',
    palavra_alvo: 'DESERTO',
    palavras_proibidas: ['AREIA', 'OÁSIS', 'CALOR', 'CAMELO', 'SAARA']
  },
  {
    id: 'pro-05',
    categoria: 'Esportes & Futebol',
    palavra_alvo: 'IMPEDIMENTO',
    palavras_proibidas: ['BANDEIRINHA', 'VAR', 'LINHA', 'ATAQUE', 'POSICIONADO']
  },
  {
    id: 'pro-06',
    categoria: 'Esportes & Futebol',
    palavra_alvo: 'MARTA',
    palavras_proibidas: ['FUTEBOL', 'RAINHA', 'SELEÇÃO', 'CAMISA 10', 'ALAGOAS']
  },
  {
    id: 'pro-07',
    categoria: 'Cultura Pop & Cinema',
    palavra_alvo: 'HOMEM-ARANHA',
    palavras_proibidas: ['PETER PARKER', 'TEIA', 'HERÓI', 'MARVEL', 'TIO BEN']
  },
  {
    id: 'pro-08',
    categoria: 'Cultura Pop & Cinema',
    palavra_alvo: 'SEU MADRUGA',
    palavras_proibidas: ['CHAVES', 'ALUGUEL', 'CHIQUINHA', 'TAPA', 'VILA']
  },
  {
    id: 'pro-09',
    categoria: 'Cultura Pop & Cinema',
    palavra_alvo: 'TITANIC',
    palavras_proibidas: ['NAVIO', 'ICEBERG', 'JACK', 'ROSE', 'AFUNDAR']
  },
  {
    id: 'pro-10',
    categoria: 'Cultura Pop & Cinema',
    palavra_alvo: 'DARTH VADER',
    palavras_proibidas: ['STAR WARS', 'PAI', 'LUKE', 'SABRE DE LUZ', 'CAPACETE']
  },
  {
    id: 'pro-11',
    categoria: 'Brasil & Cultura',
    palavra_alvo: 'PÃO DE QUEIJO',
    palavras_proibidas: ['MINAS GERAIS', 'MINEIRO', 'POLVILHO', 'CAFÉ', 'FORNO']
  },
  {
    id: 'pro-12',
    categoria: 'Brasil & Cultura',
    palavra_alvo: 'CRISTO REDENTOR',
    palavras_proibidas: ['RIO DE JANEIRO', 'ESTÁTUA', 'BRAÇOS', 'CORCOVADO', 'MARAVILHA']
  },
  {
    id: 'pro-13',
    categoria: 'Geral & Cotidiano',
    palavra_alvo: 'CHUVEIRO ELÉTRICO',
    palavras_proibidas: ['BANHO', 'ÁGUA', 'RESISTÊNCIA', 'QUENTE', 'BANHEIRO']
  },
  {
    id: 'pro-14',
    categoria: 'Geral & Cotidiano',
    palavra_alvo: 'RESSACA',
    palavras_proibidas: ['BEBIDA', 'ÁLCOOL', 'CERVEJA', 'DOR DE CABEÇA', 'DIA SEGUINTE']
  },
  {
    id: 'pro-15',
    categoria: 'Ciência & Corpo Humano',
    palavra_alvo: 'SOLUÇO',
    palavras_proibidas: ['DIAFRAGMA', 'SUSTO', 'ÁGUA', 'PRENDER', 'RESPIRAÇÃO']
  },
  {
    id: 'pro-16',
    categoria: 'Ciência & Espaço',
    palavra_alvo: 'BURACO NEGRO',
    palavras_proibidas: ['ESPAÇO', 'GRAVIDADE', 'LUZ', 'ESTRELA', 'INTERESTELAR']
  },
  {
    id: 'pro-17',
    categoria: 'Música & Entretenimento',
    palavra_alvo: 'MICHAEL JACKSON',
    palavras_proibidas: ['POP', 'MOONWALK', 'THRILLER', 'LUVA', 'BILLIE JEAN']
  },
  {
    id: 'pro-18',
    categoria: 'Música & Entretenimento',
    palavra_alvo: 'EVIDÊNCIAS',
    palavras_proibidas: ['CHITÃOZINHO', 'XORORÓ', 'KARAOKÊ', 'SERTANEJO', 'MENTIRAS']
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

export function matchThemeToProibidoCategory(theme: string): string {
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
    /(filme|cinema|cultura pop|serie|novela|tv|anime|game|celebridade|oscar|marvel|disney|streaming|netflix|bbb|reality|chaves|star wars)/.test(
      norm
    )
  ) {
    return 'Cultura Pop & Cinema';
  }
  if (
    /(musica|cantor|banda|carnaval|samba|pagode|sertanejo|rock|pop|show|instrumento|festival|spotify|karaoke)/.test(
      norm
    )
  ) {
    return 'Música & Entretenimento';
  }
  if (
    /(ciencia|corpo|humano|medicina|anatomia|saude|biologia)/.test(norm)
  ) {
    return 'Ciência & Corpo Humano';
  }
  if (
    /(espaco|planeta|universo|astronomia|estrela|nasa|fisica)/.test(norm)
  ) {
    return 'Ciência & Espaço';
  }
  if (
    /(geografia|natureza|animal|pais|mundo|viagem|clima|deserto|oceano|floresta)/.test(norm)
  ) {
    return 'Geografia & Natureza';
  }
  if (
    /(brasil|mineiro|nordeste|rio de janeiro|sao paulo|comida|culinaria|boteco|churrasco)/.test(
      norm
    )
  ) {
    return 'Brasil & Cultura';
  }
  return 'Geral & Cotidiano';
}

/**
 * Selects 6 dynamic few-shot examples from PROIBIDO_GOLDEN_CARDS,
 * prioritizing the category closest to the user's chosen theme.
 */

export function getProibidoDifficultyGuideline(dificuldade: string): string {
  const norm = (dificuldade || 'dificil').toLowerCase().trim();
  if (norm === 'facil') {
    return `DIRETRIZ ESTRITA DE NÍVEL FÁCIL (LEVE / INFANTIL / FAMÍLIA):
- O nível selecionado é FÁCIL! As palavras-alvo DEVEM ser termos universais, cotidianos e conhecidos por qualquer criança de 8-10 anos (ex: animais como LEÃO, GATO; comidas como PIZZA, PIPOCA; objetos como CELULAR, BICICLETA; heróis como HOMEM-ARANHA; lugares como PRAIA, ESCOLA).
- As 5 palavras proibidas devem ser as palavras mais óbvias, mas AINDA DEIXANDO caminhos simples e naturais para uma criança descrever sem travar o cérebro!`;
  }
  if (norm === 'medio') {
    return `DIRETRIZ ESTRITA DE NÍVEL MÉDIO (CONHECIMENTOS GERAIS):
- O nível selecionado é MÉDIO! Palavras-alvo de conhecimento geral para jovens e adultos: profissões comuns, filmes consagrados, países turísticos, monumentos conhecidos (ex: ARQUITETO, EGITO, TITANIC, TORRE EIFFEL).
- 5 palavras proibidas que exigem atenção e criatividade moderada.`;
  }
  if (norm === 'impossivel') {
    return `DIRETRIZ ESTRITA DE NÍVEL IMPOSSÍVEL (EXTREMO / ULTRA DESAFIADOR):
- O nível selecionado é IMPOSSÍVEL! As palavras-alvo devem ser altamente complexas, abstratas ou específicas (ex: tratados históricos, animais exóticos como ORNITORRINCO, constelações como ÓRION, expedições históricas, termos científicos).
- As 5 palavras proibidas bloqueiam impiedosamente todas as conexões diretas!`;
  }
  // Default: 'dificil'
  return `DIRETRIZ ESTRITA DE NÍVEL DIFÍCIL (DESAFIO PADRÃO CazeTV / RODA DE BOBO):
- O nível selecionado é DIFÍCIL! Termos específicos do tema, nuances culturais e celebridades com as 5 palavras proibidas travando cruelmente as associações mais imediatas.`;
}

/**
 * Selects 6 dynamic few-shot examples from PROIBIDO_GOLDEN_CARDS,
 * prioritizing the requested difficulty and category closest to the user's chosen theme.
 */
export function selectFewShotProibidoExamples(
  theme: string,
  count: number = 6,
  excludeWords: string[] = [],
  dificuldade: string = 'dificil'
): ProibidoGoldenCard[] {
  const clampedCount = Math.min(8, Math.max(4, count));
  const targetCat = matchThemeToProibidoCategory(theme);
  const targetDiff = (dificuldade || 'dificil').toLowerCase().trim();
  const excludedSet = new Set(excludeWords.map((w) => String(w || '').trim().toUpperCase()));

  const available = PROIBIDO_GOLDEN_CARDS.filter(
    (c) => !excludedSet.has(c.palavra_alvo.toUpperCase())
  );
  const basePool = available.length >= clampedCount ? available : PROIBIDO_GOLDEN_CARDS;

  const diffMatching = basePool.filter((c) => (c.dificuldade || 'dificil') === targetDiff);
  const effectivePool = diffMatching.length >= 2 ? diffMatching : basePool;

  const matching = shuffleArray(effectivePool.filter((c) => c.categoria === targetCat));
  const others = shuffleArray(effectivePool.filter((c) => c.categoria !== targetCat));

  const picked = [...matching, ...others].slice(0, clampedCount);
  if (picked.length < clampedCount) {
    const remaining = shuffleArray(basePool.filter((c) => !picked.some((p) => p.id === c.id)));
    picked.push(...remaining.slice(0, clampedCount - picked.length));
  }
  return picked;
}

/**
 * Builds the official Master Calibration Prompt for Jogo do Proibido,
 * embedding the 6 Golden Laws, difficulty calibration, and dynamic Few-Shot Examples.
 */
export const buildProibidoPrompt = (
  tema: string,
  qtdCartas: number,
  dificuldade: string,
  exemplosFewShot: ProibidoGoldenCard[],
  palavrasJaUsadas: string[]
): string => `
Você é o criador oficial de cartas do "Jogo do Proibido" do programa Roda de Bobo (CazeTV).
Sua tarefa é gerar ${qtdCartas} cartas INÉDITAS e perfeitamente calibradas estritamente sobre o TEMA: "${tema}" (Nível de dificuldade: ${dificuldade}).

${PROIBIDO_SIX_GOLDEN_LAWS}

${getProibidoDifficultyGuideline(dificuldade)}

ESTUDE ESTES EXEMPLOS OFICIAIS NESTE NÍVEL E IMITE O ESTILO DELES:
${JSON.stringify(exemplosFewShot.slice(0, 6), null, 2)}

COMO FORMULAR AS CARTAS (OBRIGATÓRIO):
1. REGRA ABSOLUTA: Cada carta DEVE conter ESTRITAMENTE e EXATAMENTE 5 palavras proibidas no array (nunca 4, nunca 6, exatamente 5!).
2. DIVERSIDADE NA MÃO: As ${qtdCartas} palavras-alvo geradas agora DEVEM ser de subcategorias diferentes dentro do tema "${tema}" (misture pessoas/personagens, objetos, lugares, eventos e conceitos). NUNCA gere palavras parecidas na mesma rodada!
3. AS 5 PALAVRAS PROIBIDAS DEVEM SEGUIR A CALIBRAÇÃO DO NÍVEL (${dificuldade.toUpperCase()}):
   - Proibidas relevantes que respeitem a experiência do jogador (fácil para crianças no Fácil, cruel para adultos no Difícil/Impossível).
4. PROIBIDO usar palavras proibidas genéricas ("Famoso", "Grande", "Legal") ou palavras com o mesmo radical da palavra-alvo.
5. NUNCA repita nenhuma destas palavras já jogadas: ${JSON.stringify(palavrasJaUsadas)}.

Retorne APENAS um JSON válido com array de objetos:
[
  {
    "palavra_alvo": "TERMO EM MAIÚSCULO",
    "palavras_proibidas": ["PROIBIDA 1", "PROIBIDA 2", "PROIBIDA 3", "PROIBIDA 4", "PROIBIDA 5"]
  }
]
`;
