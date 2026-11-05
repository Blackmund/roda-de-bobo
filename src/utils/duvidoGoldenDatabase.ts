/**
 * BANCO DE OURO OFICIAL DO "JOGO DO DUVIDO" (14 EXEMPLOS MESTRES)
 * + ENGENHARIA DE FORMULAÇÃO (AS 6 LEIS DE OURO DO LEILÃO DE BLEFE)
 */

export type DuvidoMacroTheme =
  | 'Esportes & Futebol'
  | 'Cultura Pop & Cinema'
  | 'Geografia & Mundo'
  | 'Música & Artistas'
  | 'Cotidiano & Marcas'
  | 'Ciência & Natureza';

export interface DuvidoCategory {
  id: string;
  tema_macro: DuvidoMacroTheme;
  categoria_secreta: string;
  total_itens_possiveis: number;
  dica_arbitro: string;
  exemplos_validos: string[];
  dificuldade?: 'facil' | 'medio' | 'dificil' | 'impossivel';
}

export const DUVIDO_SIX_GOLDEN_LAWS = `AS 6 LEIS DE OURO PARA FORMULAR CATEGORIAS DO "JOGO DO DUVIDO":
1. REGRA DO "TETO FINITO E CONHECIDO" (ENTRE 15 E 50 ITENS EXISTENTES):
   - A categoria NÃO pode ter apenas 5 itens possíveis (senão o leilão morre no número 4) e NÃO pode ser infinita/genérica demais como "Coisas vermelhas" (senão qualquer um fala 30 coisas sem esforço).
   - O universo ideal de respostas possíveis fica entre 15 e 45 itens reais (ex: 20 clubes de uma liga, 26 estados + DF, 27 filmes de uma franquia, 32 seleções de uma Copa).
2. CRITÉRIO DE VALIDAÇÃO 100% OBJETIVO (ZERO SUBJETIVIDADE):
   - NUNCA gere categorias subjetivas como "Melhores filmes de ação" ou "Jogadores mais bonitos", pois não há como o árbitro julgar se está certo ou errado.
   - Toda categoria precisa ter uma lista oficial verificável (ex: "Filmes dirigidos por Quentin Tarantino", "Clubes que disputam a atual Série A do Brasileirão").
3. ARMADILHA MENTAL (EFEITO "BRANCO SOB PRESSÃO" E RISCO DE ERRO):
   - As melhores categorias estilo Roda de Bobo são aquelas onde é muito fácil lembrar os primeiros 6 ou 7 itens, mas a partir do 10º item o jogador entra em pânico com o relógio e corre o risco de chutar um item inválido, rebaixado ou de outra categoria.
4. TEXTO CURTO E DIRETO NO PLURAL (SEM PERGUNTAS):
   - O título da categoria deve ser sempre uma frase nominal direta no plural, sem ponto de interrogação e sem explicar a regra (ex: "Países que começam com a letra B", e nunca "Quais são os países que...").
5. INFORMAR O TOTAL APROXIMADO DE ITENS POSSÍVEIS:
   - O JSON deve trazer "total_itens_possiveis" (ex: 20 para clubes da liga) para que os negociadores tenham uma referência mental de até onde o leilão pode ir.
6. GABARITO DE APOIO COMPLETO PARA O ÁRBITRO:
   - O JSON deve retornar um array "exemplos_validos" contendo de 18 a 30 respostas oficiais corretas daquela categoria, além de "dica_arbitro" com o aviso curto do que NÃO vale ou pegadinha comum dessa categoria!`;

export const DUVIDO_GOLDEN_CATEGORIES: DuvidoCategory[] = [
  // ESPORTES & FUTEBOL
  {
    id: 'duv-01',
    tema_macro: 'Esportes & Futebol',
    categoria_secreta: 'Times que disputam a atual temporada da Premier League',
    total_itens_possiveis: 20,
    dica_arbitro: 'Cuidado com times que foram rebaixados para a Championship (2ª divisão)!',
    exemplos_validos: [
      'Arsenal',
      'Aston Villa',
      'Bournemouth',
      'Brentford',
      'Brighton',
      'Chelsea',
      'Crystal Palace',
      'Everton',
      'Fulham',
      'Ipswich Town',
      'Leicester City',
      'Liverpool',
      'Manchester City',
      'Manchester United',
      'Newcastle',
      'Nottingham Forest',
      'Southampton',
      'Tottenham',
      'West Ham',
      'Wolverhampton'
    ]
  },
  {
    id: 'duv-02',
    tema_macro: 'Esportes & Futebol',
    categoria_secreta: 'Clubes que já foram campeões da Copa Libertadores da América',
    total_itens_possiveis: 26,
    dica_arbitro:
      'Vale qualquer clube sul-americano que tenha pelo menos 1 título da Libertadores na história.',
    exemplos_validos: [
      'Independiente',
      'Boca Juniors',
      'Peñarol',
      'River Plate',
      'Estudiantes',
      'Olimpia',
      'Nacional',
      'São Paulo',
      'Palmeiras',
      'Santos',
      'Grêmio',
      'Flamengo',
      'Cruzeiro',
      'Internacional',
      'Atlético Nacional',
      'Colo-Colo',
      'Racing',
      'Argentinos Juniors',
      'Vélez Sarsfield',
      'Vasco da Gama',
      'Once Caldas',
      'LDU Quito',
      'Corinthians',
      'Atlético Mineiro',
      'San Lorenzo',
      'Fluminense'
    ]
  },
  {
    id: 'duv-03',
    tema_macro: 'Esportes & Futebol',
    categoria_secreta: 'Jogadores convocados pelo Brasil na Copa do Mundo de 2002 (Pentacampeonato)',
    total_itens_possiveis: 23,
    dica_arbitro: 'Valem os 23 jogadores da lista final de Felipão em 2002.',
    exemplos_validos: [
      'Marcos',
      'Cafu',
      'Lúcio',
      'Roque Júnior',
      'Edmílson',
      'Roberto Carlos',
      'Ricardinho',
      'Gilberto Silva',
      'Ronaldo',
      'Rivaldo',
      'Ronaldinho Gaúcho',
      'Dida',
      'Belletti',
      'Ânderson Polga',
      'Kléberson',
      'Júnior',
      'Denílson',
      'Vampeta',
      'Juninho Paulista',
      'Edílson',
      'Luizão',
      'Rogério Ceni',
      'Kaká'
    ]
  },
  {
    id: 'duv-04',
    tema_macro: 'Esportes & Futebol',
    categoria_secreta: 'Franquias (times) que disputam a NBA atualmente',
    total_itens_possiveis: 30,
    dica_arbitro: 'Aceite o nome da cidade ou o nome da franquia (ex: Lakers, Bulls, Celtics).',
    exemplos_validos: [
      'Lakers',
      'Celtics',
      'Warriors',
      'Bulls',
      'Heat',
      'Knicks',
      'Nets',
      '76ers',
      'Bucks',
      'Suns',
      'Mavericks',
      'Nuggets',
      'Clippers',
      'Spurs',
      'Rockets',
      'Raptors',
      'Cavaliers',
      'Hawks',
      'Hornets',
      'Magic',
      'Wizards',
      'Pistons',
      'Pacers',
      'Timberwolves',
      'Thunder',
      'Trail Blazers',
      'Jazz',
      'Kings',
      'Pelicans',
      'Grizzlies'
    ]
  },
  {
    id: 'duv-05',
    tema_macro: 'Esportes & Futebol',
    categoria_secreta: 'Pilotos que já foram campeões mundiais de Fórmula 1',
    total_itens_possiveis: 34,
    dica_arbitro: 'Qualquer campeão mundial da história da F1 desde 1950.',
    exemplos_validos: [
      'Ayrton Senna',
      'Nelson Piquet',
      'Emerson Fittipaldi',
      'Michael Schumacher',
      'Lewis Hamilton',
      'Max Verstappen',
      'Juan Manuel Fangio',
      'Alain Prost',
      'Sebastian Vettel',
      'Niki Lauda',
      'Jackie Stewart',
      'Fernando Alonso',
      'Mika Häkkinen',
      'Kimi Räikkönen',
      'Jenson Button',
      'Nico Rosberg',
      'Nigel Mansell',
      'Damon Hill',
      'Jacques Villeneuve',
      'James Hunt',
      'Mario Andretti',
      'Alan Jones',
      'Keke Rosberg'
    ]
  },

  // GEOGRAFIA & MUNDO
  {
    id: 'duv-06',
    tema_macro: 'Geografia & Mundo',
    categoria_secreta: 'Países do mundo que começam com a letra B',
    total_itens_possiveis: 17,
    dica_arbitro:
      'Não valem cidades ou estados (como Bahia ou Berlim), apenas países soberanos!',
    exemplos_validos: [
      'Brasil',
      'Bélgica',
      'Bolívia',
      'Bulgária',
      'Bahamas',
      'Bangladesh',
      'Barbados',
      'Bahrein',
      'Belize',
      'Benim',
      'Bielorrússia (Belarus)',
      'Bósnia e Herzegovina',
      'Botsuana',
      'Brunei',
      'Burkina Faso',
      'Burundi',
      'Butão'
    ]
  },
  {
    id: 'duv-07',
    tema_macro: 'Geografia & Mundo',
    categoria_secreta: 'Capitais dos estados brasileiros',
    total_itens_possiveis: 27,
    dica_arbitro: 'As 26 capitais estaduais + Brasília (Distrito Federal).',
    exemplos_validos: [
      'São Paulo',
      'Rio de Janeiro',
      'Belo Horizonte',
      'Vitória',
      'Curitiba',
      'Florianópolis',
      'Porto Alegre',
      'Brasília',
      'Goiânia',
      'Cuiabá',
      'Campo Grande',
      'Salvador',
      'Recife',
      'Fortaleza',
      'Natal',
      'João Pessoa',
      'Maceió',
      'Aracaju',
      'Teresina',
      'São Luís',
      'Belém',
      'Manaus',
      'Rio Branco',
      'Porto Velho',
      'Boa Vista',
      'Macapá',
      'Palmas'
    ]
  },
  {
    id: 'duv-08',
    tema_macro: 'Geografia & Mundo',
    categoria_secreta: 'Países que fazem parte do continente europeu',
    total_itens_possiveis: 50,
    dica_arbitro:
      'Valem países 100% europeus e transcontinentais reconhecidos (Rússia, Turquia).',
    exemplos_validos: [
      'Portugal',
      'Espanha',
      'França',
      'Itália',
      'Alemanha',
      'Reino Unido',
      'Suíça',
      'Suécia',
      'Noruega',
      'Dinamarca',
      'Finlândia',
      'Polônia',
      'Ucrânia',
      'Rússia',
      'Grécia',
      'Croácia',
      'Sérvia',
      'Áustria',
      'Bélgica',
      'Holanda (Países Baixos)',
      'Irlanda',
      'Islândia',
      'Romênia',
      'Hungria',
      'República Tcheca',
      'Eslováquia',
      'Bulgária',
      'Albânia',
      'Vaticano',
      'Mônaco'
    ]
  },

  // CULTURA POP & CINEMA
  {
    id: 'duv-09',
    tema_macro: 'Cultura Pop & Cinema',
    categoria_secreta: 'Longas-metragens de animação lançados pela Pixar',
    total_itens_possiveis: 28,
    dica_arbitro:
      'Cuidado para não aceitar animações da DreamWorks (como Shrek ou Madagascar)!',
    exemplos_validos: [
      'Toy Story',
      'Vida de Inseto',
      'Monstros S.A.',
      'Procurando Nemo',
      'Os Incríveis',
      'Carros',
      'Ratatouille',
      'WALL-E',
      'Up: Altas Aventuras',
      'Valente',
      'Universidade Monstros',
      'Divertida Mente',
      'O Bom Dinossauro',
      'Procurando Dory',
      'Viva: A Vida é uma Festa',
      'Dois Irmãos',
      'Soul',
      'Luca',
      'Red: Crescer é uma Fera',
      'Lightyear',
      'Elementos'
    ]
  },
  {
    id: 'duv-10',
    tema_macro: 'Cultura Pop & Cinema',
    categoria_secreta: 'Personagens que já entraram na casa da vila do Chaves',
    total_itens_possiveis: 25,
    dica_arbitro:
      'Valem moradores fixos e personagens recorrentes/visitantes clássicos do seriado Chaves.',
    exemplos_validos: [
      'Chaves',
      'Quico',
      'Chiquinha',
      'Seu Madruga',
      'Dona Florinda',
      'Professor Girafales',
      'Senhor Barriga',
      'Dona Clotilde (Bruxa do 71)',
      'Nhonho',
      'Popis',
      'Godinez',
      'Jaiminho',
      'Dona Neves',
      'Paty',
      'Glória',
      'Seu Furtado',
      'Senhor Calvillo',
      'Madruguinha',
      'Malicha',
      'Hector Bonilla'
    ]
  },
  {
    id: 'duv-11',
    tema_macro: 'Cultura Pop & Cinema',
    categoria_secreta: 'Filmes em que o ator Leonardo DiCaprio atuou',
    total_itens_possiveis: 30,
    dica_arbitro: 'Qualquer filme oficial da filmografia de Leonardo DiCaprio.',
    exemplos_validos: [
      'Titanic',
      'O Lobo de Wall Street',
      'A Origem',
      'O Regresso',
      'Ilha do Medo',
      'Django Livre',
      'Era Uma Vez em... Hollywood',
      'Prenda-Me se For Capaz',
      'Os Infiltrados',
      'O Aviador',
      'Gangues de Nova York',
      'Diamante de Sangue',
      'Romeu + Julieta',
      'A Praia',
      'O Grande Gatsby',
      'Não Olhe para Cima',
      'Assassinos da Lua das Flores',
      'O Homem da Máscara de Ferro',
      'Gilbert Grape'
    ]
  },

  // CIÊNCIA, CORPO HUMANO & COTIDIANO
  {
    id: 'duv-12',
    tema_macro: 'Ciência & Natureza',
    categoria_secreta: 'Elementos químicos da Tabela Periódica',
    total_itens_possiveis: 118,
    dica_arbitro: 'Não valem misturas ou ligas metálicas (como Bronze, Aço ou Água)!',
    exemplos_validos: [
      'Hidrogênio',
      'Hélio',
      'Lítio',
      'Carbono',
      'Nitrogênio',
      'Oxigênio',
      'Flúor',
      'Neônio',
      'Sódio',
      'Magnésio',
      'Alumínio',
      'Silício',
      'Fósforo',
      'Enxofre',
      'Cloro',
      'Potássio',
      'Cálcio',
      'Ferro',
      'Cobre',
      'Zinco',
      'Prata',
      'Ouro',
      'Mercúrio',
      'Chumbo',
      'Urânio',
      'Platina'
    ]
  },
  {
    id: 'duv-13',
    tema_macro: 'Cotidiano & Marcas',
    categoria_secreta: 'Marcas de carros (montadoras de automóveis)',
    total_itens_possiveis: 50,
    dica_arbitro:
      'Apenas o nome da marca/montadora (ex: Fiat, Ford), não o nome do modelo (ex: Uno, Fiesta).',
    exemplos_validos: [
      'Fiat',
      'Volkswagen',
      'Chevrolet',
      'Ford',
      'Toyota',
      'Honda',
      'Hyundai',
      'Renault',
      'Nissan',
      'Jeep',
      'Peugeot',
      'Citroën',
      'Mitsubishi',
      'BYD',
      'Caoa Chery',
      'BMW',
      'Mercedes-Benz',
      'Audi',
      'Porsche',
      'Ferrari',
      'Lamborghini',
      'Volvo',
      'Kia',
      'Subaru',
      'Land Rover',
      'Jaguar',
      'Tesla'
    ]
  },
  {
    id: 'duv-14',
    tema_macro: 'Música & Artistas',
    categoria_secreta: 'Escolas de Samba do Carnaval do Rio de Janeiro ou São Paulo',
    total_itens_possiveis: 35,
    dica_arbitro: 'Valem escolas do Grupo Especial e Série Ouro/Acesso de RJ ou SP.',
    exemplos_validos: [
      'Mangueira',
      'Portela',
      'Beija-Flor',
      'Salgueiro',
      'Imperatriz Leopoldinense',
      'Grande Rio',
      'Vila Isabel',
      'Unidos da Tijuca',
      'Mocidade Independente',
      'Viradouro',
      'Paraíso do Tuiuti',
      'Império Serrano',
      'Estácio de Sá',
      'União da Ilha',
      'Vai-Vai',
      'Mancha Verde',
      'Mocidade Alegre',
      'Gaviões da Fiel',
      'Rosas de Ouro',
      'Império de Casa Verde'
    ]
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

export function matchThemeToDuvidoMacro(theme: string): DuvidoMacroTheme {
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
    /(filme|cinema|cultura pop|serie|novela|tv|musica|anime|game|celebridade|oscar|marvel|disney|streaming|netflix|bbb|reality|chaves|ator|atriz)/.test(
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
    return 'Música & Artistas';
  }
  if (
    /(geografia|pais|mundo|cidade|capital|estado|continente|viagem|turismo|mapa|europa|brasil|historia)/.test(
      norm
    )
  ) {
    return 'Geografia & Mundo';
  }
  if (
    /(ciencia|corpo|humano|animal|natureza|biologia|espaco|planeta|universo|fisica|quimica|medicina|bicho|anatomia|elemento)/.test(
      norm
    )
  ) {
    return 'Ciência & Natureza';
  }
  return 'Cotidiano & Marcas';
}

/**
 * Selects 4 to 6 dynamic few-shot examples from DUVIDO_GOLDEN_CATEGORIES,
 * prioritizing the macro theme closest to the user's chosen theme.
 */

/**
 * Draws an unused golden category for the requested theme and difficulty.
 */
export function drawUnusedGoldenDuvidoCategory(
  tema: string,
  usedIdsOrCategories: Iterable<string> = [],
  dificuldade: string = 'dificil'
): DuvidoCategory | null {
  const usedSet = new Set<string>();
  for (const item of usedIdsOrCategories) {
    usedSet.add(String(item || '').toLowerCase().trim());
  }
  const targetMacro = matchThemeToDuvidoMacro(tema);
  const targetDiff = (dificuldade || 'dificil').toLowerCase().trim();

  const unusedInMacro = DUVIDO_GOLDEN_CATEGORIES.filter(
    (c) =>
      c.tema_macro === targetMacro &&
      (c.dificuldade || 'dificil') === targetDiff &&
      !usedSet.has(c.id.toLowerCase()) &&
      !usedSet.has(c.categoria_secreta.toLowerCase())
  );
  if (unusedInMacro.length > 0) {
    return shuffleArray(unusedInMacro)[0];
  }

  const allUnused = DUVIDO_GOLDEN_CATEGORIES.filter(
    (c) =>
      (c.dificuldade || 'dificil') === targetDiff &&
      !usedSet.has(c.id.toLowerCase()) &&
      !usedSet.has(c.categoria_secreta.toLowerCase())
  );
  if (allUnused.length > 0) {
    return shuffleArray(allUnused)[0];
  }

  return DUVIDO_GOLDEN_CATEGORIES[0] || null;
}

export function getDuvidoDifficultyGuideline(dificuldade: string): string {
  const norm = (dificuldade || 'dificil').toLowerCase().trim();
  if (norm === 'facil') {
    return `DIRETRIZ ESTRITA DE NÍVEL FÁCIL (LEVE / INFANTIL / FAMÍLIA):
- O nível selecionado é FÁCIL! A categoria de listagem DEVE ser ampla, familiar e com dezenas de itens que qualquer criança ou família conhece (ex: "Sabores comuns de sorvete", "Personagens da Disney ou Pixar", "Animais que voam", "Cores do arco-íris e primárias", "Frutas populares no Brasil").
- Garanta que qualquer jogador consiga citar pelo menos 8 a 15 respostas sem esforço acadêmico!`;
  }
  if (norm === 'medio') {
    return `DIRETRIZ ESTRITA DE NÍVEL MÉDIO (CONHECIMENTOS GERAIS):
- O nível selecionado é MÉDIO! Categorias de cultura geral para jovens e adultos (ex: "Capitais de países da Europa", "Clubes de futebol que já venceram a Copa Libertadores", "Vencedores da Copa do Mundo", "Filmes da Marvel").
- Dá para listar os primeiros 6 a 10 com tranquilidade antes de começar a apertar.`;
  }
  if (norm === 'impossivel') {
    return `DIRETRIZ ESTRITA DE NÍVEL IMPOSSÍVEL (EXTREMO / HIPER-ESPECÍFICO):
- O nível selecionado é IMPOSSÍVEL! A categoria deve ser ultra-específica e desafiadora até para especialistas (ex: "Países que possuem exatamente uma única vogal no nome", "Capitais mundiais com mais de 2.000 metros de altitude", "Elementos químicos cujo símbolo não tem nenhuma letra do nome em português").
- Lembrar de mais de 2 ou 3 itens sob a pressão do relógio é um verdadeiro milagre!`;
  }
  // Default: 'dificil'
  return `DIRETRIZ ESTRITA DE NÍVEL DIFÍCIL (DESAFIO PADRÃO CazeTV / RODA DE BOBO):
- O nível selecionado é DIFÍCIL! Categorias competitivas de gameshow: "Filmes dirigidos por Quentin Tarantino", "Países que fazem fronteira com a China", "Treinadores campeões da Champions League por dois clubes diferentes".
- Efeito armadilha clássico: fácil lembrar 4 ou 5, mas quase impossível passar de 10 sem errar.`;
}

/**
 * Selects 4 dynamic few-shot examples from DUVIDO_GOLDEN_CATEGORIES,
 * prioritizing the requested difficulty and category matching the requested theme.
 */
export function selectFewShotDuvidoExamples(
  theme: string,
  count: number = 4,
  excludeCategories: string[] = [],
  dificuldade: string = 'dificil'
): DuvidoCategory[] {
  const safeCount = Math.min(6, Math.max(2, count));
  const targetMacro = matchThemeToDuvidoMacro(theme);
  const targetDiff = (dificuldade || 'dificil').toLowerCase().trim();
  const excludedSet = new Set(excludeCategories.map((c) => String(c || '').toLowerCase().trim()));

  const available = DUVIDO_GOLDEN_CATEGORIES.filter(
    (c) =>
      !excludedSet.has(c.id.toLowerCase()) &&
      !excludedSet.has(c.categoria_secreta.toLowerCase())
  );
  const basePool = available.length >= safeCount ? available : DUVIDO_GOLDEN_CATEGORIES;

  const diffMatching = basePool.filter((c) => (c.dificuldade || 'dificil') === targetDiff);
  const effectivePool = diffMatching.length >= 2 ? diffMatching : basePool;

  const sameMacro = shuffleArray(effectivePool.filter((c) => c.tema_macro === targetMacro));
  const otherMacros = shuffleArray(effectivePool.filter((c) => c.tema_macro !== targetMacro));

  const picked = [...sameMacro, ...otherMacros].slice(0, safeCount);
  if (picked.length < safeCount) {
    const remaining = shuffleArray(basePool.filter((c) => !picked.some((p) => p.id === c.id)));
    picked.push(...remaining.slice(0, safeCount - picked.length));
  }
  return picked;
}

/**
 * Builds the official Master Calibration Prompt for Jogo do Duvido,
 * embedding the 6 Golden Laws, difficulty calibration, and dynamic Few-Shot Examples.
 */
export const buildDuvidoPrompt = (
  tema: string,
  dificuldade: string,
  exemplosFewShot: DuvidoCategory[],
  historicoUsado: string[]
): string => `
Você é o criador oficial de desafios do "Jogo do Duvido" do programa Roda de Bobo (CazeTV).
Sua tarefa é criar UMA categoria de listagem INÉDITA e perfeitamente calibrada estritamente sobre o TEMA: "${tema}" (Nível de dificuldade: ${dificuldade}).

${DUVIDO_SIX_GOLDEN_LAWS}

${getDuvidoDifficultyGuideline(dificuldade)}

ESTUDE ESTES EXEMPLOS OFICIAIS NESTE NÍVEL E IMITE A ESTRUTURA DELES:
${JSON.stringify(exemplosFewShot.slice(0, 4), null, 2)}

REGRAS OBRIGATÓRIAS DE FORMULAÇÃO:
1. A categoria DEVE ter entre 15 e 45 respostas reais possíveis no mundo (nem poucas demais, nem infinitas).
2. O critério deve ser 100% OBJETIVO e verificável (nunca use "Melhores...", "Mais bonitos...", "Famosos...").
3. A frase de "categoria_secreta" deve ser curta, direta, no plural e SEM ponto de interrogação (ex: "Filmes dirigidos por Christopher Nolan", "Ossos do corpo humano", "Campeões do Brasileirão na era dos pontos corridos").
4. CALIBRAÇÃO DO NÍVEL (${dificuldade.toUpperCase()}): Respeite a dificuldade (ampla e fácil para crianças no Fácil; específica no Difícil; hiper-específica no Impossível).
5. Liste no campo "exemplos_validos" pelo menos 20 itens reais e corretos dessa categoria para ajudar o árbitro da mesa.
6. PROIBIDO repetir ou usar assuntos parecidos com os já jogados: ${JSON.stringify(historicoUsado)}.

Retorne APENAS um JSON válido:
{
  "categoria_secreta": "Título curto e direto da lista no plural",
  "total_itens_possiveis": 25,
  "dica_arbitro": "Aviso curto do que NÃO vale ou pegadinha comum dessa categoria",
  "exemplos_validos": ["Item 1", "Item 2", "...até 20+ itens"]
}
`;
