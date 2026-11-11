/**
 * NOV-06: banco do jogo Estádios.
 *
 * No programa a foto do estádio aparece na tela e quem acerta de primeira leva 5 pontos, de segunda 4, e assim por
 * diante (relatório, seção 11). Aqui não há fotos, então cada estádio traz 5 PISTAS escritas, da mais vaga à mais
 * óbvia: a 1ª tentativa vê só a pista 1 (vale 5), a 2ª vê as pistas 1 e 2 (vale 4), etc. O campo `foto` aceita um
 * caminho de imagem para quando houver fotos: a tela mostra a foto junto das pistas.
 *
 * Os fatos são gerais e bem conhecidos; capacidades são aproximadas ("cerca de") e mudam com reformas, então
 * conferir antes de tratar como definitivo. Lista própria do projeto.
 */
export interface EstadioItem {
  nome: string;
  cidade: string;
  pais: string;
  /** variações aceitas como resposta */
  aceitas: string[];
  /** 5 pistas, da mais vaga para a mais óbvia */
  pistas: [string, string, string, string, string];
  /** caminho opcional de uma foto (ex.: /estadios/maracana.jpg) */
  foto?: string;
}

export const ESTADIOS: EstadioItem[] = [
  {
    nome: 'Maracanã',
    cidade: 'Rio de Janeiro',
    pais: 'Brasil',
    aceitas: ['Maracana', 'Estádio Mário Filho', 'Mario Filho'],
    pistas: [
      'Fica na América do Sul.',
      'Fica numa cidade famosa pelo Carnaval e pelo Cristo Redentor.',
      'É a casa do Flamengo e do Fluminense.',
      'Foi inaugurado em 1950, para a Copa do Mundo daquele ano.',
      'Palco do "Maracanazo": o Uruguai venceu a final de 1950 ali.'
    ]
  },
  {
    nome: 'Morumbi',
    cidade: 'São Paulo',
    pais: 'Brasil',
    aceitas: ['Estádio do Morumbi', 'Cicero Pompeu de Toledo', 'Cícero Pompeu de Toledo'],
    pistas: [
      'Fica no hemisfério sul.',
      'Fica na maior cidade do Brasil.',
      'É a casa do tricolor paulista.',
      'Foi inaugurado em 1960 e recebe grandes shows internacionais.',
      'Pertence ao São Paulo Futebol Clube; o nome oficial homenageia Cícero Pompeu de Toledo.'
    ]
  },
  {
    nome: 'Mineirão',
    cidade: 'Belo Horizonte',
    pais: 'Brasil',
    aceitas: ['Mineirao', 'Estádio Governador Magalhães Pinto'],
    pistas: [
      'Fica no Sudeste do Brasil, longe do litoral.',
      'Fica na capital de Minas Gerais.',
      'É palco de jogos do Cruzeiro e do Atlético Mineiro.',
      'Foi inaugurado em 1965 e reformado para a Copa de 2014.',
      'Foi ali que o Brasil perdeu de 7 a 1 para a Alemanha na semifinal de 2014.'
    ]
  },
  {
    nome: 'Beira-Rio',
    cidade: 'Porto Alegre',
    pais: 'Brasil',
    aceitas: ['Beira Rio', 'Estádio Beira-Rio', 'Estadio Beira-Rio'],
    pistas: [
      'Fica no Sul do Brasil.',
      'Fica na capital gaúcha.',
      'É a casa do Internacional.',
      'Foi inaugurado em 1969 e foi sede da Copa de 2014.',
      'O nome vem da sua localização, à margem do lago Guaíba.'
    ]
  },
  {
    nome: 'Neo Química Arena',
    cidade: 'São Paulo',
    pais: 'Brasil',
    aceitas: ['Arena Corinthians', 'Itaquerão', 'Itaquerao', 'Corinthians Arena'],
    pistas: [
      'É um estádio moderno, aberto em 2014.',
      'Fica na Zona Leste de uma metrópole brasileira.',
      'É a casa do Corinthians.',
      'Recebeu o jogo de abertura da Copa do Mundo de 2014.',
      'É conhecido como "Itaquerão" e hoje leva o nome de um patrocinador farmacêutico.'
    ]
  },
  {
    nome: 'Allianz Parque',
    cidade: 'São Paulo',
    pais: 'Brasil',
    aceitas: ['Palestra Itália', 'Palestra Italia', 'Arena Palmeiras'],
    pistas: [
      'É um estádio moderno, inaugurado em 2014.',
      'Fica na Zona Oeste de uma grande metrópole.',
      'É a casa do Palmeiras.',
      'Foi construído no terreno do antigo Palestra Itália.',
      'Leva o nome de uma seguradora alemã.'
    ]
  },
  {
    nome: 'Vila Belmiro',
    cidade: 'Santos',
    pais: 'Brasil',
    aceitas: ['Estádio Urbano Caldeira', 'Urbano Caldeira'],
    pistas: [
      'É um estádio pequeno e muito tradicional.',
      'Fica no litoral de São Paulo.',
      'É a casa do Santos.',
      'Foi inaugurado em 1916.',
      'Foi onde Pelé jogou boa parte da carreira.'
    ]
  },
  {
    nome: 'São Januário',
    cidade: 'Rio de Janeiro',
    pais: 'Brasil',
    aceitas: ['Sao Januario', 'Estádio de São Januário', 'Estádio São Januário'],
    pistas: [
      'É um estádio histórico, inaugurado em 1927.',
      'Fica numa cidade carioca de morros e praias.',
      'É a casa do Vasco da Gama.',
      'Fica no bairro de Vasco da Gama, na Zona Norte.',
      'Tem uma capela dentro do complexo e era um dos maiores do país na inauguração.'
    ]
  },
  {
    nome: 'Castelão',
    cidade: 'Fortaleza',
    pais: 'Brasil',
    aceitas: ['Castelao', 'Arena Castelão', 'Arena Castelao'],
    pistas: [
      'Fica no Nordeste do Brasil.',
      'Fica na capital do Ceará.',
      'É usado por Ceará e Fortaleza.',
      'Foi inaugurado em 1973 e foi sede da Copa de 2014.',
      'O nome oficial homenageia o ex-governador Plácido Aderaldo Castelo.'
    ]
  },
  {
    nome: 'Mané Garrincha',
    cidade: 'Brasília',
    pais: 'Brasil',
    aceitas: ['Mane Garrincha', 'Estádio Nacional de Brasília', 'Estadio Nacional de Brasilia'],
    pistas: [
      'Fica no Centro-Oeste do Brasil.',
      'Fica na capital federal.',
      'Foi sede da Copa do Mundo de 2014.',
      'Foi inaugurado em 1974 e reformado para o Mundial.',
      'O nome homenageia um dos maiores pontas da história do futebol brasileiro.'
    ]
  },
  {
    nome: 'Arena da Baixada',
    cidade: 'Curitiba',
    pais: 'Brasil',
    aceitas: ['Baixada', 'Ligga Arena', 'Estádio Joaquim Américo'],
    pistas: [
      'Fica no Sul do Brasil.',
      'Fica na capital do Paraná.',
      'É a casa do Athletico Paranaense.',
      'Foi uma das sedes da Copa do Mundo de 2014.',
      'É chamada de "Baixada" por estar numa área baixa da cidade.'
    ]
  },
  {
    nome: 'Arena Fonte Nova',
    cidade: 'Salvador',
    pais: 'Brasil',
    aceitas: ['Fonte Nova', 'Estádio da Fonte Nova'],
    pistas: [
      'Fica no Nordeste do Brasil.',
      'Fica na capital da Bahia.',
      'É usada pelo Bahia.',
      'Foi reconstruída para a Copa de 2014 no lugar de um estádio antigo.',
      'O estádio antigo daquele terreno foi demolido depois de um acidente, em 2007.'
    ]
  },
  {
    nome: 'Pacaembu',
    cidade: 'São Paulo',
    pais: 'Brasil',
    aceitas: ['Estádio do Pacaembu', 'Estadio do Pacaembu', 'Paulo Machado de Carvalho'],
    pistas: [
      'É um estádio tombado como patrimônio histórico.',
      'Fica numa metrópole brasileira, em um bairro de mesmo nome.',
      'Foi inaugurado em 1940.',
      'Tem o Museu do Futebol funcionando sob as suas arquibancadas.',
      'Seu nome oficial é Paulo Machado de Carvalho e já foi casa de vários clubes paulistas.'
    ]
  },
  {
    nome: 'Arena do Grêmio',
    cidade: 'Porto Alegre',
    pais: 'Brasil',
    aceitas: ['Arena do Gremio', 'Arena Grêmio', 'Arena Gremio'],
    pistas: [
      'É um estádio moderno, inaugurado em 2012.',
      'Fica no Sul do Brasil.',
      'É a casa do Grêmio.',
      'Substituiu o estádio Olímpico Monumental.',
      'Tem cerca de 55 mil lugares e as arquibancadas são cobertas.'
    ]
  },
  {
    nome: 'Camp Nou',
    cidade: 'Barcelona',
    pais: 'Espanha',
    aceitas: ['Spotify Camp Nou', 'Nou Camp'],
    pistas: [
      'Fica na Europa.',
      'Fica numa cidade catalã à beira do Mediterrâneo.',
      'É a casa do Barcelona.',
      'Foi inaugurado em 1957 e é um dos maiores estádios da Europa.',
      'O nome significa "campo novo" em catalão.'
    ]
  },
  {
    nome: 'Santiago Bernabéu',
    cidade: 'Madri',
    pais: 'Espanha',
    aceitas: ['Santiago Bernabeu', 'Bernabéu', 'Bernabeu'],
    pistas: [
      'Fica na Europa.',
      'Fica na capital da Espanha.',
      'É a casa do Real Madrid.',
      'Foi inaugurado em 1947 e passou por grandes reformas.',
      'Leva o nome de um ex-jogador e presidente do clube.'
    ]
  },
  {
    nome: 'Old Trafford',
    cidade: 'Manchester',
    pais: 'Inglaterra',
    aceitas: ['Teatro dos Sonhos', 'Theatre of Dreams'],
    pistas: [
      'Fica na Europa, no Reino Unido.',
      'Fica no noroeste da Inglaterra.',
      'É a casa do Manchester United.',
      'Tem capacidade de cerca de 74 mil lugares.',
      'É chamado de "Teatro dos Sonhos".'
    ]
  },
  {
    nome: 'Anfield',
    cidade: 'Liverpool',
    pais: 'Inglaterra',
    aceitas: [],
    pistas: [
      'Fica na Europa, no Reino Unido.',
      'Fica numa cidade portuária, terra dos Beatles.',
      'É a casa do Liverpool.',
      'Tem uma arquibancada famosa chamada Kop.',
      'A torcida canta "You\'ll Never Walk Alone" antes dos jogos.'
    ]
  },
  {
    nome: 'Wembley',
    cidade: 'Londres',
    pais: 'Inglaterra',
    aceitas: ['Estádio de Wembley', 'Wembley Stadium'],
    pistas: [
      'Fica na Europa, no Reino Unido.',
      'Fica na capital inglesa.',
      'É o estádio da seleção inglesa.',
      'Foi reinaugurado em 2007 e cobre cerca de 90 mil lugares.',
      'Tem um grande arco branco que é sua marca registrada.'
    ]
  },
  {
    nome: 'San Siro',
    cidade: 'Milão',
    pais: 'Itália',
    aceitas: ['Giuseppe Meazza', 'Estádio Giuseppe Meazza', 'Stadio Giuseppe Meazza'],
    pistas: [
      'Fica na Europa.',
      'Fica numa capital italiana da moda.',
      'É compartilhado por dois clubes da cidade: Milan e Inter.',
      'Foi inaugurado em 1926.',
      'O nome oficial homenageia um grande atacante italiano, Giuseppe Meazza.'
    ]
  },
  {
    nome: 'Allianz Arena',
    cidade: 'Munique',
    pais: 'Alemanha',
    aceitas: ['Allianz Arena Munique'],
    pistas: [
      'Fica na Europa.',
      'Fica no sul da Alemanha, na capital da Baviera.',
      'É a casa do Bayern de Munique.',
      'Foi inaugurado em 2005, para a Copa de 2006.',
      'A fachada muda de cor: vermelha quando joga o Bayern.'
    ]
  },
  {
    nome: 'Signal Iduna Park',
    cidade: 'Dortmund',
    pais: 'Alemanha',
    aceitas: ['Westfalenstadion', 'Estádio Westfália', 'Estadio Westfalia', 'Signal Iduna'],
    pistas: [
      'Fica na Europa.',
      'Fica numa cidade industrial alemã.',
      'É a casa do Borussia Dortmund.',
      'Tem uma das maiores arquibancadas em pé da Europa.',
      'A torcida amarela forma a "Muralha Amarela" (Gelbe Wand).'
    ]
  },
  {
    nome: 'Stade de France',
    cidade: 'Saint-Denis',
    pais: 'França',
    aceitas: ['Stade de France Saint-Denis', 'Estádio da França'],
    pistas: [
      'Fica na Europa.',
      'Fica num subúrbio ao norte de Paris.',
      'Foi inaugurado em 1998.',
      'É o estádio da seleção francesa e do rugby nacional.',
      'Ali a França foi campeã do mundo ao vencer o Brasil na final de 1998.'
    ]
  },
  {
    nome: 'Estádio Azteca',
    cidade: 'Cidade do México',
    pais: 'México',
    aceitas: ['Azteca', 'Estadio Azteca', 'Estádio Asteca', 'Banorte'],
    pistas: [
      'Fica na América do Norte.',
      'Fica numa capital a mais de 2.200 metros de altitude.',
      'Recebeu finais de Copa do Mundo em 1970 e em 1986.',
      'Em 1970 o Brasil de Pelé foi campeão ali.',
      'Em 1986 Maradona fez o gol "mão de Deus" e outro memorável nesse estádio.'
    ]
  },
  {
    nome: 'La Bombonera',
    cidade: 'Buenos Aires',
    pais: 'Argentina',
    aceitas: ['Bombonera', 'Alberto J. Armando', 'Estádio Alberto José Armando'],
    pistas: [
      'Fica na América do Sul.',
      'Fica num bairro portuário de uma capital sul-americana.',
      'É a casa do Boca Juniors.',
      'Foi inaugurado em 1940.',
      'O apelido significa "caixa de bombons" pelo formato das arquibancadas.'
    ]
  },
  {
    nome: 'Monumental de Núñez',
    cidade: 'Buenos Aires',
    pais: 'Argentina',
    aceitas: ['Monumental', 'Monumental de Nunez', 'Estádio Monumental de Núñez', 'Más Monumental'],
    pistas: [
      'Fica na América do Sul.',
      'Fica na capital argentina, no bairro de Núñez.',
      'É a casa do River Plate.',
      'Foi sede da final da Copa do Mundo de 1978.',
      'É o maior estádio da Argentina e rival geográfico de La Bombonera.'
    ]
  },
  {
    nome: 'Estádio Centenário',
    cidade: 'Montevidéu',
    pais: 'Uruguai',
    aceitas: ['Centenario', 'Estadio Centenario', 'Estádio Centenario'],
    pistas: [
      'Fica na América do Sul.',
      'Fica numa capital banhada pelo Rio da Prata.',
      'Foi inaugurado em 1930.',
      'Recebeu a final da primeira Copa do Mundo da história.',
      'O nome celebra o primeiro centenário da Constituição do país, e o Uruguai foi campeão ali em 1930.'
    ]
  },
  {
    nome: 'Estádio da Luz',
    cidade: 'Lisboa',
    pais: 'Portugal',
    aceitas: ['Luz', 'Estadio da Luz', 'Estádio da Luz Lisboa'],
    pistas: [
      'Fica na Europa.',
      'Fica numa capital de língua portuguesa.',
      'É a casa do Benfica.',
      'Foi inaugurado em 2003, para a Eurocopa de 2004.',
      'Tem uma águia (Vitória) que sobrevoa o campo antes dos jogos.'
    ]
  },
  {
    nome: 'Estádio do Dragão',
    cidade: 'Porto',
    pais: 'Portugal',
    aceitas: ['Dragão', 'Estadio do Dragao', 'Estádio Dragão'],
    pistas: [
      'Fica na Europa.',
      'Fica no norte de Portugal.',
      'É a casa do FC Porto.',
      'Foi inaugurado em 2003, também para a Eurocopa de 2004.',
      'O nome vem do símbolo do clube, um dragão.'
    ]
  },
  {
    nome: 'Emirates Stadium',
    cidade: 'Londres',
    pais: 'Inglaterra',
    aceitas: ['Emirates', 'Estádio Emirates'],
    pistas: [
      'Fica na Europa, no Reino Unido.',
      'Fica ao norte da capital inglesa.',
      'É a casa do Arsenal.',
      'Foi inaugurado em 2006.',
      'Leva o nome de uma companhia aérea do Oriente Médio.'
    ]
  },
  {
    nome: 'Etihad Stadium',
    cidade: 'Manchester',
    pais: 'Inglaterra',
    aceitas: ['Etihad', 'City of Manchester Stadium'],
    pistas: [
      'Fica na Europa, no Reino Unido.',
      'Fica numa cidade do noroeste da Inglaterra.',
      'É a casa do Manchester City.',
      'Foi construído para os Jogos da Commonwealth de 2002.',
      'Leva o nome de uma companhia aérea dos Emirados Árabes.'
    ]
  },
  {
    nome: 'Stamford Bridge',
    cidade: 'Londres',
    pais: 'Inglaterra',
    aceitas: ['Stamford', 'Estádio Stamford Bridge'],
    pistas: [
      'Fica na Europa, no Reino Unido.',
      'Fica no oeste da capital inglesa.',
      'É a casa do Chelsea.',
      'Fica no bairro de Fulham.',
      'O nome lembra uma ponte sobre um riacho que passava por ali.'
    ]
  },
  {
    nome: 'Estádio Olímpico de Roma',
    cidade: 'Roma',
    pais: 'Itália',
    aceitas: ['Stadio Olimpico', 'Olimpico', 'Estádio Olímpico', 'Estadio Olimpico de Roma'],
    pistas: [
      'Fica na Europa.',
      'Fica numa capital italiana cheia de monumentos.',
      'É dividido por dois clubes da cidade: Roma e Lazio.',
      'Foi estádio dos Jogos Olímpicos de 1960.',
      'Fica no complexo esportivo do Foro Itálico, às margens do Tibre.'
    ]
  },
  {
    nome: 'Lusail',
    cidade: 'Lusail',
    pais: 'Catar',
    aceitas: ['Estádio Lusail', 'Lusail Stadium', 'Lusail Iconic Stadium'],
    pistas: [
      'Fica na Ásia, no Oriente Médio.',
      'Fica numa cidade nova ao norte de Doha.',
      'É o maior estádio do país, com cerca de 80 mil lugares.',
      'Recebeu a decisão da Copa do Mundo de 2022.',
      'Ali a Argentina de Messi foi campeã mundial, batendo a França nos pênaltis.'
    ]
  },
  {
    nome: 'Soccer City',
    cidade: 'Joanesburgo',
    pais: 'África do Sul',
    aceitas: ['FNB Stadium', 'Estádio FNB', 'Calabash'],
    pistas: [
      'Fica na África.',
      'Fica na maior cidade sul-africana.',
      'Recebeu a final da Copa do Mundo de 2010.',
      'O formato lembra uma cabaça (calabash).',
      'Ali a Espanha foi campeã mundial pela primeira vez.'
    ]
  },
  {
    nome: 'Estádio Olímpico de Berlim',
    cidade: 'Berlim',
    pais: 'Alemanha',
    aceitas: ['Olympiastadion', 'Olympiastadion Berlin', 'Estadio Olimpico de Berlim'],
    pistas: [
      'Fica na Europa.',
      'Fica na capital alemã.',
      'Foi construído para os Jogos Olímpicos de 1936.',
      'É a casa do Hertha Berlin.',
      'Recebeu a final da Copa de 2006, vencida pela Itália.'
    ]
  }
];

export const normalizeEstadioKey = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia um estádio ainda não usado (esgotado o banco, recomeça). */
export function drawEstadio(used: Set<string> = new Set(), rng: () => number = Math.random): EstadioItem {
  let pool = ESTADIOS.filter((e) => !used.has(normalizeEstadioKey(e.nome)));
  if (pool.length === 0) pool = [...ESTADIOS];
  return shuffle(pool, rng)[0];
}
