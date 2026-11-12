/**
 * Curated Database of 30+ rich rounds per game
 * Fallback & instant play data for "Roda de Bobo"
 * High quality Brazilian pop culture, football, TV, music, internet & everyday life topics.
 */

import type {
  LimiteRoundData,
  DuvidoRoundData,
  ProibidoCard,
  NotaRoundData,
  TemOuNaoTemRoundData
} from '../types/game';

// 1. JOGO DO LIMITE (Exact numbers, no overbidding — 15+ unique questions per category)
export const CURATED_LIMITE: LimiteRoundData[] = [
  // ================= FILMES (16 perguntas) =================
  {
    category: 'Filmes',
    pergunta: "Quantos minutos tem o filme 'Titanic' (1997) dirigido por James Cameron?",
    valor_exato: 194,
    unidade: "minutos",
    curiosidade_explicacao: "O épico romântico de Jack e Rose tem exatamente 3 horas e 14 minutos (194 min) de duração."
  },
  {
    category: 'Filmes',
    pergunta: "Quantas estatuetas do Oscar o filme 'O Senhor dos Anéis: O Retorno do Rei' venceu em 2004?",
    valor_exato: 11,
    unidade: "Oscars",
    curiosidade_explicacao: "Venceu todas as 11 categorias em que foi indicado, empatando o recorde histórico com Titanic e Ben-Hur."
  },
  {
    category: 'Filmes',
    pergunta: "Em que ano estreou nos cinemas o primeiro filme 'Toy Story' da Pixar?",
    valor_exato: 1995,
    unidade: "ano",
    curiosidade_explicacao: "Toy Story foi lançado em 1995 como o primeiro longa-metragem da história feito 100% por computação gráfica."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos minutos tem o filme 'O Poderoso Chefão' (The Godfather, 1972)?",
    valor_exato: 175,
    unidade: "minutos",
    curiosidade_explicacao: "A obra-prima de Francis Ford Coppola sobre a família Corleone tem 2 horas e 55 minutos (175 min)."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos filmes compõem a saga principal 'Harry Potter' lançada nos cinemas entre 2001 e 2011?",
    valor_exato: 8,
    unidade: "filmes",
    curiosidade_explicacao: "Os 7 livros foram adaptados em 8 filmes, pois As Relíquias da Morte foi dividido em Parte 1 e Parte 2."
  },
  {
    category: 'Filmes',
    pergunta: "Em que ano o clássico brasileiro 'Cidade de Deus' foi lançado nos cinemas do Brasil?",
    valor_exato: 2002,
    unidade: "ano",
    curiosidade_explicacao: "Dirigido por Fernando Meirelles e Kátia Lund, estreou em 2002 e recebeu 4 indicações ao Oscar em 2004."
  },
  {
    category: 'Filmes',
    pergunta: "Quantas indicações ao Oscar o filme 'La La Land' recebeu em 2017?",
    valor_exato: 14,
    unidade: "indicações",
    curiosidade_explicacao: "Empatou o recorde máximo de 14 indicações da história da Academia (junto com Titanic e A Malvada)."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos minutos de duração tem o filme 'Oppenheimer' (2023), de Christopher Nolan?",
    valor_exato: 180,
    unidade: "minutos",
    curiosidade_explicacao: "O vencedor do Oscar de Melhor Filme tem cravadas 3 horas (180 minutos) de projeção."
  },
  {
    category: 'Filmes',
    pergunta: "Em que ano estreou o primeiro filme de 'Star Wars' (Episódio IV: Uma Nova Esperança)?",
    valor_exato: 1977,
    unidade: "ano",
    curiosidade_explicacao: "George Lucas revolucionou o cinema mundial em maio de 1977."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos milhões de espectadores aproximadamente 'Tropa de Elite 2' levou aos cinemas brasileiros?",
    valor_exato: 11,
    unidade: "milhões",
    curiosidade_explicacao: "Tropa de Elite 2 (2010) bateu mais de 11 milhões de ingressos vendidos nas bilheterias nacionais."
  },
  {
    category: 'Filmes',
    pergunta: "Em que ano o filme brasileiro 'O Auto da Compadecida' chegou aos cinemas?",
    valor_exato: 2000,
    unidade: "ano",
    curiosidade_explicacao: "Após a minissérie de 1999, o filme de João Grilo e Chicó estreou nos cinemas em setembro de 2000."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos minutos tem a animação 'O Rei Leão' original da Disney (1994)?",
    valor_exato: 88,
    unidade: "minutos",
    curiosidade_explicacao: "O clássico animado de Simba e Mufasa tem enxutos 88 minutos (1h28min)."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos atores diferentes já interpretaram James Bond (007) nos filmes oficiais da Eon Productions?",
    valor_exato: 6,
    unidade: "atores",
    curiosidade_explicacao: "Sean Connery, George Lazenby, Roger Moore, Timothy Dalton, Pierce Brosnan e Daniel Craig."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos minutos dura o filme 'Interestelar' (Interstellar, 2014)?",
    valor_exato: 169,
    unidade: "minutos",
    curiosidade_explicacao: "A jornada espacial de Cooper dura 2 horas e 49 minutos (169 min)."
  },
  {
    category: 'Filmes',
    pergunta: "Em que ano foi lançado o filme 'Jurassic Park: O Parque dos Dinossauros' de Steven Spielberg?",
    valor_exato: 1993,
    unidade: "ano",
    curiosidade_explicacao: "O T-Rex ganhou vida nas telas em junho de 1993."
  },
  {
    category: 'Filmes',
    pergunta: "Quantos minutos tem o filme 'Vingadores: Ultimato' (Avengers: Endgame) nos cinemas?",
    valor_exato: 181,
    unidade: "minutos",
    curiosidade_explicacao: "O desfecho épico da saga do infinito tem 3 horas e 1 minuto de duração (181 min)."
  },

  // ================= ESPORTES (16 perguntas) =================
  {
    category: 'Esportes',
    pergunta: "Quantos gols oficiais Pelé marcou pela Seleção Brasileira principal em jogos oficiais?",
    valor_exato: 77,
    unidade: "gols",
    curiosidade_explicacao: "Segundo a FIFA, Pelé marcou 77 gols em 92 partidas oficiais pela Seleção Canarinho."
  },
  {
    category: 'Esportes',
    pergunta: "Quantas seleções disputaram a primeira Copa do Mundo de Futebol da FIFA em 1930 no Uruguai?",
    valor_exato: 13,
    unidade: "seleções",
    curiosidade_explicacao: "Sem eliminatórias prévias, apenas 13 países aceitaram o convite para jogar no Uruguai."
  },
  {
    category: 'Esportes',
    pergunta: "Qual é o peso máximo oficial (em gramas) de uma bola de futebol de campo segundo a FIFA?",
    valor_exato: 450,
    unidade: "gramas",
    curiosidade_explicacao: "A regra 2 do futebol estipula que a bola deve pesar entre 410g e 450g no início do jogo."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos metros quadrados tem a área de um campo de futebol padrão oficial FIFA (105m x 68m)?",
    valor_exato: 7140,
    unidade: "m²",
    curiosidade_explicacao: "O padrão FIFA de 105 metros de comprimento por 68 metros de largura dá exatamente 7.140 m²."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos minutos durou a lendária partida final da Copa Libertadores 2019 (Flamengo x River)?",
    valor_exato: 97,
    unidade: "minutos",
    curiosidade_explicacao: "Com os acréscimos do segundo tempo da virada histórica de Gabigol, o jogo foi até 97 minutos."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos anos tinha Pelé quando conquistou sua primeira Copa do Mundo em 1958 na Suécia?",
    valor_exato: 17,
    unidade: "anos",
    curiosidade_explicacao: "Pelé foi campeão mundial com apenas 17 anos e 249 dias, recorde absoluto até hoje."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos jogadores formam um time completo em campo no futebol americano da NFL (ataque ou defesa)?",
    valor_exato: 11,
    unidade: "jogadores",
    curiosidade_explicacao: "Assim como no futebol tradicional da bola redonda, jogam 11 contra 11 em campo."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos gols Rogério Ceni marcou oficialmente ao longo de toda a sua carreira como goleiro?",
    valor_exato: 131,
    unidade: "gols",
    curiosidade_explicacao: "Rogério Ceni é o maior goleiro-artilheiro da história do futebol mundial com 131 gols."
  },
  {
    category: 'Esportes',
    pergunta: "Quantas medalhas olímpicas de ouro o nadador Michael Phelps conquistou na carreira?",
    valor_exato: 23,
    unidade: "medalhas de ouro",
    curiosidade_explicacao: "Phelps conquistou 28 medalhas olímpicas no total, sendo 23 delas de ouro!"
  },
  {
    category: 'Esportes',
    pergunta: "Qual é a altura oficial de uma cesta de basquete da NBA (em centímetros do chão ao aro)?",
    valor_exato: 305,
    unidade: "centímetros",
    curiosidade_explicacao: "Dez pés ingleses equivalem exatamente a 3,05 metros (305 cm)."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos quilômetros inteiros (sem as casas decimais) tem uma Maratona Olímpica oficial?",
    valor_exato: 42,
    unidade: "quilômetros",
    curiosidade_explicacao: "A distância oficial de uma maratona é de 42,195 km."
  },
  {
    category: 'Esportes',
    pergunta: "Quantas vitórias Ayrton Senna conquistou na Fórmula 1 ao longo de sua carreira?",
    valor_exato: 41,
    unidade: "vitórias",
    curiosidade_explicacao: "O tricampeão mundial venceu 41 Grandes Prêmios e fez 65 pole positions."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos gols Ronaldo Fenômeno marcou na Copa do Mundo de 2002 (Coreia/Japão)?",
    valor_exato: 8,
    unidade: "gols",
    curiosidade_explicacao: "Ronaldo foi o artilheiro isolado do Penta em 2002 com 8 gols, incluindo 2 na final contra a Alemanha."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos pontos vale um Touchdown (sem o chute extra) no futebol americano?",
    valor_exato: 6,
    unidade: "pontos",
    curiosidade_explicacao: "O touchdown vale 6 pontos, seguido da tentativa de ponto extra (1) ou conversão de 2 pontos."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos títulos de simples de Roland Garros o tenista Rafael Nadal conquistou na carreira?",
    valor_exato: 14,
    unidade: "títulos",
    curiosidade_explicacao: "O Rei do Saibro venceu o Grand Slam francês incríveis 14 vezes entre 2005 e 2022."
  },
  {
    category: 'Esportes',
    pergunta: "Quantos clubes disputam a Série A do Campeonato Brasileiro de pontos corridos atualmente?",
    valor_exato: 20,
    unidade: "clubes",
    curiosidade_explicacao: "Desde 2006, o Brasileirão Série A conta com 20 clubes disputando 38 rodadas."
  },

  // ================= CULTURA POP (16 perguntas) =================
  {
    category: 'Cultura Pop',
    pergunta: "Quantos episódios foram ao ar no seriado 'A Grande Família' (2001-2014) na TV Globo?",
    valor_exato: 485,
    unidade: "episódios",
    curiosidade_explicacao: "A Grande Família teve 14 temporadas históricas e exatamente 485 episódios exibidos!"
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos participantes entraram na casa do Big Brother Brasil 24 (BBB 24)?",
    valor_exato: 26,
    unidade: "participantes",
    curiosidade_explicacao: "Entre Pipoca, Camarote e Puxadinho, o BBB 24 bateu recorde com 26 brothers e sisters."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos capítulos teve a novela brasileira 'Avenida Brasil' (2012)?",
    valor_exato: 179,
    unidade: "capítulos",
    curiosidade_explicacao: "O fenômeno do congelamento de tela de Carminha e Nina teve 179 capítulos na TV Globo."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos livros oficiais compõem a série principal de Harry Potter escrita por J.K. Rowling?",
    valor_exato: 7,
    unidade: "livros",
    curiosidade_explicacao: "Começou em A Pedra Filosofal e terminou em As Relíquias da Morte."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos Pokémon existiam originalmente na Primeira Geração (Kanto - Red/Blue/Yellow)?",
    valor_exato: 151,
    unidade: "Pokémon",
    curiosidade_explicacao: "Do Bulbasaur (#001) até o Mew (#151), a Pokédex clássica tinha 151 monstrinhos."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos episódios teve a série 'Friends' ao longo de suas 10 temporadas?",
    valor_exato: 236,
    unidade: "episódios",
    curiosidade_explicacao: "Foram 236 episódios exibidos originalmente entre 1994 e 2004."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos episódios compõem a série clássica 'Chaves' (El Chavo del Ocho) como programa independente?",
    valor_exato: 290,
    unidade: "episódios",
    curiosidade_explicacao: "Entre 1973 e 1980, Chaves teve cerca de 290 episódios que atravessaram gerações no SBT."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantas Esferas do Dragão precisam ser reunidas para invocar Shenlong em 'Dragon Ball'?",
    valor_exato: 7,
    unidade: "esferas",
    curiosidade_explicacao: "São 7 esferas numeradas de 1 a 7 estrelas."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos jogadores competem pelo prêmio bilionário na 1ª temporada da série 'Round 6' (Squid Game)?",
    valor_exato: 456,
    unidade: "jogadores",
    curiosidade_explicacao: "O protagonista Seong Gi-hun era justamente o último inscrito, o jogador número 456."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Em que ano foi lançado o videogame PlayStation 2 (PS2) pela Sony?",
    valor_exato: 2000,
    unidade: "ano",
    curiosidade_explicacao: "Lançado no ano 2000, o PS2 é o console mais vendido da história com mais de 155 milhões de unidades."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantos episódios teve a série 'Breaking Bad' em suas 5 temporadas?",
    valor_exato: 62,
    unidade: "episódios",
    curiosidade_explicacao: "A saga de Walter White e Jesse Pinkman teve 62 episódios (além de 62 ser o número atômico do Samário!)."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantas temporadas teve a série 'Game of Thrones' da HBO?",
    valor_exato: 8,
    unidade: "temporadas",
    curiosidade_explicacao: "Foram 8 temporadas e 73 episódios exibidos entre 2011 e 2019."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Em que ano a rede social Orkut foi oficialmente criada pelo engenheiro Orkut Büyükkökten?",
    valor_exato: 2004,
    unidade: "ano",
    curiosidade_explicacao: "Lançado em janeiro de 2004, o Orkut virou febre absoluta no Brasil com depoimentos e scraps."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Quantas casas zodiacais os Cavaleiros de Bronze precisam atravessar na Saga do Santuário em Cavaleiros do Zodíaco?",
    valor_exato: 12,
    unidade: "casas",
    curiosidade_explicacao: "De Áries a Peixes, são as 12 Casas do Zodíaco protegidas pelos Cavaleiros de Ouro."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Qual era o limite máximo de caracteres de um Tweet no lançamento original do Twitter em 2006?",
    valor_exato: 140,
    unidade: "caracteres",
    curiosidade_explicacao: "O limite clássico era de 140 caracteres (baseado nos SMS de celular) antes de dobrar para 280 em 2017."
  },
  {
    category: 'Cultura Pop',
    pergunta: "Em que ano estreou a primeira edição do Big Brother Brasil (BBB 1) vencida por Kleber Bambam?",
    valor_exato: 2002,
    unidade: "ano",
    curiosidade_explicacao: "O BBB 1 estreou em janeiro de 2002 na TV Globo."
  },

  // ================= MÚSICA (15 perguntas) =================
  {
    category: 'Música',
    pergunta: "Quantas teclas tem um piano acústico padrão de cauda?",
    valor_exato: 88,
    unidade: "teclas",
    curiosidade_explicacao: "O padrão moderno conta com 52 teclas brancas (naturais) e 36 pretas (acidentes)."
  },
  {
    category: 'Música',
    pergunta: "Quantas faixas musicais tinha o clássico álbum 'Thriller' de Michael Jackson (1982)?",
    valor_exato: 9,
    unidade: "faixas",
    curiosidade_explicacao: "Apenas 9 músicas foram suficientes para vender mais de 70 milhões de cópias mundialmente!"
  },
  {
    category: 'Música',
    pergunta: "Quantos minutos (aproximadamente, sem segundos) tem a versão original de 'Faroeste Caboclo' da Legião Urbana?",
    valor_exato: 9,
    unidade: "minutos",
    curiosidade_explicacao: "A saga de João de Santo Cristo tem 9 minutos e 3 segundos sem nenhum refrão!"
  },
  {
    category: 'Música',
    pergunta: "Quantas cordas possui um cavaquinho tradicional brasileiro usado no samba e pagode?",
    valor_exato: 4,
    unidade: "cordas",
    curiosidade_explicacao: "O cavaquinho possui 4 cordas de aço (tradicionalmente afinadas em Ré-Si-Sol-Ré)."
  },
  {
    category: 'Música',
    pergunta: "Em que ano aconteceu a primeira edição histórica do festival Rock in Rio no Rio de Janeiro?",
    valor_exato: 1985,
    unidade: "ano",
    curiosidade_explicacao: "O primeiro Rock in Rio aconteceu em janeiro de 1985 na Cidade do Rock, em Jacarepaguá."
  },
  {
    category: 'Música',
    pergunta: "Quantos integrantes formavam a banda 'Mamonas Assassinas'?",
    valor_exato: 5,
    unidade: "integrantes",
    curiosidade_explicacao: "Dinho, Bento Hinoto, Júlio Rasec, Samuel Reoli e Sérgio Reoli formavam o quinteto de Guarulhos."
  },
  {
    category: 'Música',
    pergunta: "Quantas cordas tem um violão clássico tradicional?",
    valor_exato: 6,
    unidade: "cordas",
    curiosidade_explicacao: "O violão clássico tem 6 cordas (Mi, Lá, Ré, Sol, Si, Mi), enquanto o de 7 cordas é muito usado no choro/samba."
  },
  {
    category: 'Música',
    pergunta: "Quantos integrantes formavam o grupo original do 'Racionais MC's'?",
    valor_exato: 4,
    unidade: "integrantes",
    curiosidade_explicacao: "Mano Brown, Ice Blue, Edi Rock e KL Jay formam o quarteto lendário do rap nacional."
  },
  {
    category: 'Música',
    pergunta: "Quantas sinfonias completas Ludwig van Beethoven compôs ao longo de sua vida?",
    valor_exato: 9,
    unidade: "sinfonias",
    curiosidade_explicacao: "Beethoven compôs 9 sinfonias, encerrando com a célebre 9ª Sinfonia (Ode à Alegria)."
  },
  {
    category: 'Música',
    pergunta: "Em que ano os Beatles lançaram o lendário álbum 'Sgt. Pepper's Lonely Hearts Club Band'?",
    valor_exato: 1967,
    unidade: "ano",
    curiosidade_explicacao: "O álbum que mudou a história da música pop foi lançado em junho de 1967."
  },
  {
    category: 'Música',
    pergunta: "Quantos minutos (inteiros) tem o épico 'Bohemian Rhapsody' da banda Queen?",
    valor_exato: 5,
    unidade: "minutos",
    curiosidade_explicacao: "A música tem 5 minutos e 55 segundos, algo considerado revolucionário para as rádios em 1975."
  },
  {
    category: 'Música',
    pergunta: "Quantos integrantes tinha a formação clássica do grupo 'Rouge' (Ragatanga)?",
    valor_exato: 5,
    unidade: "integrantes",
    curiosidade_explicacao: "Aline Wirley, Fantine Thó, Karin Hils, Li Martins e Luciana Andrade formaram o quinteto pop."
  },
  {
    category: 'Música',
    pergunta: "Qual é o número no título do famoso álbum de Adele lançado em 2011 com os hits 'Rolling in the Deep' e 'Someone Like You'?",
    valor_exato: 21,
    unidade: "anos",
    curiosidade_explicacao: "O álbum chama-se '21', referência à idade de Adele quando compôs as músicas."
  },
  {
    category: 'Música',
    pergunta: "Quantas notas musicais naturais formam a escala diatônica básica (Dó a Si)?",
    valor_exato: 7,
    unidade: "notas",
    curiosidade_explicacao: "Dó, Ré, Mi, Fá, Sol, Lá e Si são as 7 notas naturais."
  },
  {
    category: 'Música',
    pergunta: "Em que ano o cantor Roberto Carlos lançou seu primeiro álbum solo ('Louco por Você')?",
    valor_exato: 1961,
    unidade: "ano",
    curiosidade_explicacao: "O Rei Roberto Carlos lançou seu LP de estreia em 1961."
  },

  // ================= HISTÓRIA (15 perguntas) =================
  {
    category: 'História',
    pergunta: "Qual é a altura exata da estátua do Cristo Redentor no Rio de Janeiro (incluindo o pedestal)?",
    valor_exato: 38,
    unidade: "metros",
    curiosidade_explicacao: "O monumento tem 30 metros de estátua mais 8 metros de pedestal, totalizando 38m."
  },
  {
    category: 'História',
    pergunta: "Quantos dias durou o pontificado mais longo da história da Igreja Católica (Papa Pio IX)?",
    valor_exato: 11560,
    unidade: "dias",
    curiosidade_explicacao: "Pio IX governou por quase 32 anos (11.560 dias) entre 1846 e 1878."
  },
  {
    category: 'História',
    pergunta: "Quantos anos durou a construção do Coliseu de Roma na Antiguidade?",
    valor_exato: 8,
    unidade: "anos",
    curiosidade_explicacao: "A construção começou no governo de Vespasiano em 72 d.C. e foi concluída em 80 d.C."
  },
  {
    category: 'História',
    pergunta: "Quantos países existem oficialmente no continente africano?",
    valor_exato: 54,
    unidade: "países",
    curiosidade_explicacao: "A África possui 54 países soberanos reconhecidos pela ONU."
  },
  {
    category: 'História',
    pergunta: "Em que ano o homem pisou na Lua pela primeira vez na missão Apollo 11?",
    valor_exato: 1969,
    unidade: "ano",
    curiosidade_explicacao: "Neil Armstrong pisou na Lua em 20 de julho de 1969."
  },
  {
    category: 'História',
    pergunta: "Quantos estados compõem os Estados Unidos da América?",
    valor_exato: 50,
    unidade: "estados",
    curiosidade_explicacao: "Os EUA têm 50 estados mais o distrito federal de Columbia."
  },
  {
    category: 'História',
    pergunta: "Quantos municípios tem o estado de Minas Gerais (o estado com mais municípios do Brasil)?",
    valor_exato: 853,
    unidade: "municípios",
    curiosidade_explicacao: "Minas Gerais lidera disparado o Brasil com incríveis 853 cidades!"
  },
  {
    category: 'História',
    pergunta: "Em que ano caiu o Muro de Berlim, marcando o fim simbólico da Guerra Fria?",
    valor_exato: 1989,
    unidade: "ano",
    curiosidade_explicacao: "O Muro de Berlim foi derrubado na noite de 9 de novembro de 1989."
  },
  {
    category: 'História',
    pergunta: "Quantos anos realmente durou a histórica 'Guerra dos Cem Anos' entre França e Inglaterra?",
    valor_exato: 116,
    unidade: "anos",
    curiosidade_explicacao: "O conflito durou de 1337 a 1453, somando na verdade 116 anos!"
  },
  {
    category: 'História',
    pergunta: "Em que ano Brasília foi oficialmente inaugurada como a nova capital do Brasil por Juscelino Kubitschek?",
    valor_exato: 1960,
    unidade: "ano",
    curiosidade_explicacao: "Brasília foi inaugurada em 21 de abril de 1960."
  },
  {
    category: 'História',
    pergunta: "Quantas estrelas brancas existem na bandeira atual do Brasil (representando os estados e o DF)?",
    valor_exato: 27,
    unidade: "estrelas",
    curiosidade_explicacao: "São 26 estados mais o Distrito Federal, totalizando 27 estrelas."
  },
  {
    category: 'História',
    pergunta: "Em que ano foi proclamada a República do Brasil pelo Marechal Deodoro da Fonseca?",
    valor_exato: 1889,
    unidade: "ano",
    curiosidade_explicacao: "A Proclamação da República ocorreu em 15 de novembro de 1889."
  },
  {
    category: 'História',
    pergunta: "Quantos países da América do Sul fazem fronteira terrestre com o Brasil?",
    valor_exato: 10,
    unidade: "países",
    curiosidade_explicacao: "Todos os países sul-americanos exceto Chile e Equador fazem fronteira com o Brasil (incluindo a Guiana Francesa)."
  },
  {
    category: 'História',
    pergunta: "Em que ano terminou a Segunda Guerra Mundial?",
    valor_exato: 1945,
    unidade: "ano",
    curiosidade_explicacao: "O conflito encerrou-se oficialmente em 1945 após a rendição da Alemanha e do Japão."
  },
  {
    category: 'História',
    pergunta: "Quantos anos Dom Pedro II tinha quando foi declarado maior de idade no 'Golpe da Maioridade' para assumir o trono?",
    valor_exato: 14,
    unidade: "anos",
    curiosidade_explicacao: "Em julho de 1840, Pedro de Alcântara tinha apenas 14 anos quando assumiu o Império do Brasil."
  },

  // ================= GERAL (15 perguntas) =================
  {
    category: 'Geral',
    pergunta: "Quantos ossos compõem o esqueleto de um ser humano adulto?",
    valor_exato: 206,
    unidade: "ossos",
    curiosidade_explicacao: "Nascemos com cerca de 270 ossos que vão se fundindo ao longo do crescimento até 206."
  },
  {
    category: 'Geral',
    pergunta: "Quantos dentes tem uma pessoa adulta com dentição completa (incluindo os 4 sisos)?",
    valor_exato: 32,
    unidade: "dentes",
    curiosidade_explicacao: "Uma dentição permanente completa possui exatamente 32 dentes."
  },
  {
    category: 'Geral',
    pergunta: "Qual é a velocidade máxima aproximada (em km/h) que um guepardo pode atingir numa caçada?",
    valor_exato: 120,
    unidade: "km/h",
    curiosidade_explicacao: "O guepardo pode acelerar de 0 a 100 km/h em 3 segundos e atingir picos de até 120 km/h."
  },
  {
    category: 'Geral',
    pergunta: "Quantos degraus tem a famosa Escadaria Selarón na Lapa (Rio de Janeiro)?",
    valor_exato: 215,
    unidade: "degraus",
    curiosidade_explicacao: "A obra de arte ao ar livre de Jorge Selarón é composta por 215 degraus e 125 metros de extensão."
  },
  {
    category: 'Geral',
    pergunta: "Qual é o peso de uma garrafa PET comum de refrigerante de 2 litros cheia de água (em gramas)?",
    valor_exato: 2045,
    unidade: "gramas",
    curiosidade_explicacao: "2000g de água mais aproximadamente 45g da embalagem plástica e tampa."
  },
  {
    category: 'Geral',
    pergunta: "Quantas casas tem um tabuleiro clássico de xadrez?",
    valor_exato: 64,
    unidade: "casas",
    curiosidade_explicacao: "8 linhas por 8 colunas = 64 casas alternadas entre pretas e brancas."
  },
  {
    category: 'Geral',
    pergunta: "Quantos dias tem um ano bissexto no calendário gregoriano?",
    valor_exato: 366,
    unidade: "dias",
    curiosidade_explicacao: "Acrescenta-se o dia 29 de fevereiro para calibrar o movimento de translação da Terra."
  },
  {
    category: 'Geral',
    pergunta: "Quantas cartas compõem um baralho tradicional com 2 coringas?",
    valor_exato: 54,
    unidade: "cartas",
    curiosidade_explicacao: "4 naipes de 13 cartas (52) mais 2 coringas (jokers)."
  },
  {
    category: 'Geral',
    pergunta: "Quantos segundos tem exatamente uma hora?",
    valor_exato: 3600,
    unidade: "segundos",
    curiosidade_explicacao: "60 segundos por minuto x 60 minutos na hora = 3600 segundos."
  },
  {
    category: 'Geral',
    pergunta: "Quantos elementos químicos existem atualmente na Tabela Periódica oficial da IUPAC?",
    valor_exato: 118,
    unidade: "elementos",
    curiosidade_explicacao: "Do Hidrogênio (1) ao Oganessônio (118), são 118 elementos reconhecidos."
  },
  {
    category: 'Geral',
    pergunta: "Quantos corações possui um polvo?",
    valor_exato: 3,
    unidade: "corações",
    curiosidade_explicacao: "O polvo tem 2 corações branquiais e 1 coração sistêmico, totalizando 3 corações!"
  },
  {
    category: 'Geral',
    pergunta: "Quantos minutos a luz do Sol leva aproximadamente para chegar até a Terra?",
    valor_exato: 8,
    unidade: "minutos",
    curiosidade_explicacao: "Viajando a 300.000 km/s, a luz solar percorre 150 milhões de km em cerca de 8 minutos e 20 segundos."
  },
  {
    category: 'Geral',
    pergunta: "Quantos lados tem um polígono chamado Dodecágono?",
    valor_exato: 12,
    unidade: "lados",
    curiosidade_explicacao: "Do (dois) + deca (dez) = 12 lados e 12 ângulos."
  },
  {
    category: 'Geral',
    pergunta: "Quantas horas tem uma semana completa (7 dias)?",
    valor_exato: 168,
    unidade: "horas",
    curiosidade_explicacao: "7 dias multiplicados por 24 horas por dia totalizam 168 horas."
  },
  {
    category: 'Geral',
    pergunta: "Qual é o DDD telefônico da cidade de São Paulo (capital)?",
    valor_exato: 11,
    unidade: "DDD",
    curiosidade_explicacao: "O código 11 atende a capital paulista e toda a Região Metropolitana de São Paulo."
  }
];

// 2. JOGO DO DUVIDO (Auction & bluff)
export const CURATED_DUVIDO: DuvidoRoundData[] = [
  {
    categoria_secreta: "Clubes que já foram campeões da Copa Libertadores da América",
    total_itens_possiveis: 26,
    exemplos_validos: [
      "Flamengo", "Palmeiras", "São Paulo", "Santos", "Grêmio", "Internacional", "Cruzeiro",
      "Vasco", "Corinthians", "Atlético Mineiro", "Fluminense", "Boca Juniors", "River Plate",
      "Independiente", "Peñarol", "Nacional", "Olimpia", "Estudiantes", "San Lorenzo", "Racing",
      "Colo-Colo", "LDU", "Atlético Nacional", "Vélez Sarsfield", "Once Caldas", "Argentinos Juniors"
    ]
  },
  {
    categoria_secreta: "Países que fazem fronteira terrestre com o Brasil",
    total_itens_possiveis: 10,
    exemplos_validos: [
      "Argentina", "Uruguai", "Paraguai", "Bolívia", "Peru", "Colômbia",
      "Venezuela", "Guiana", "Suriname", "França (Guiana Francesa)"
    ]
  },
  {
    categoria_secreta: "Super-heróis clássicos da Marvel Comics",
    total_itens_possiveis: 25,
    exemplos_validos: [
      "Homem de Ferro", "Capitão América", "Thor", "Hulk", "Homem-Aranha", "Viúva Negra",
      "Gavião Arqueiro", "Pantera Negra", "Doutor Estranho", "Wolverine", "Ciclope", "Tempestade",
      "Deadpool", "Demolidor", "Feiticeira Escarlate", "Visão", "Homem-Formiga", "Vespa",
      "Capitã Marvel", "Surfista Prateado", "Falcão", "Soldado Invernal", "Blade", "Motoqueiro Fantasma"
    ]
  },
  {
    categoria_secreta: "Capitais de países da América do Sul",
    total_itens_possiveis: 12,
    exemplos_validos: [
      "Brasília", "Buenos Aires", "Montevidéu", "Assunção", "Santiago", "Lima",
      "Bogotá", "Caracas", "Quito", "La Paz/Sucre", "Paramaribo", "Georgetown"
    ]
  },
  {
    categoria_secreta: "Estádios de futebol brasileiros com capacidade superior a 40 mil pessoas",
    total_itens_possiveis: 18,
    exemplos_validos: [
      "Maracanã", "Morumbi", "Mineirão", "Castelão", "Arena Castelão", "Mané Garrincha",
      "Arena Corinthians / Neo Química", "Allianz Parque", "Beira-Rio", "Arena do Grêmio",
      "Fonte Nova", "Arena Pernambuco", "Mangueirão", "Arruda", "Serra Dourada"
    ]
  },
  {
    categoria_secreta: "Marcas famosas de automóveis vendidas no Brasil",
    total_itens_possiveis: 22,
    exemplos_validos: [
      "Fiat", "Volkswagen", "Chevrolet", "Ford", "Toyota", "Honda", "Hyundai",
      "Renault", "Nissan", "Jeep", "Peugeot", "Citroën", "BMW", "Mercedes-Benz",
      "Audi", "Volvo", "BYD", "GWM", "Chery / Caoa Chery", "Mitsubishi", "Kia", "Porsche"
    ]
  },
  {
    categoria_secreta: "Artistas brasileiros com mais de 10 milhões de ouvintes mensais no Spotify",
    total_itens_possiveis: 20,
    exemplos_validos: [
      "Anitta", "Marília Mendonça", "Gusttavo Lima", "Alok", "Luísa Sonza", "Henrique & Juliano",
      "Jorge & Mateus", "MC Cabelinho", "KayBlack", "Matuê", "Ludmilla", "Ana Castela",
      "Luan Santana", "Wesley Safadão", "Veigh", "L7NNON", "Felipe Amorim", "Pedro Sampaio"
    ]
  },
  {
    categoria_secreta: "Filmes vencedores do Oscar de Melhor Filme (últimos 30 anos)",
    total_itens_possiveis: 25,
    exemplos_validos: [
      "Oppenheimer", "Tudo em Todo Lugar ao Mesmo Tempo", "No Ritmo do Coração", "Nomadland",
      "Parasita", "Green Book", "A Forma da Água", "Moonlight", "Spotlight", "Birdman",
      "12 Anos de Escravidão", "O Discurso do Rei", "Quem Quer Ser um Milionário?",
      "Onde os Fracos Não Têm Vez", "Os Infiltrados", "Gladiador", "Titanic", "Coração Valente",
      "Forrest Gump", "A Lista de Schindler", "O Retorno do Rei"
    ]
  },
  {
    categoria_secreta: "Tipos/Cortes populares de carne bovina no churrasco brasileiro",
    total_itens_possiveis: 18,
    exemplos_validos: [
      "Picanha", "Fraldinha", "Costela", "Alcatra", "Maminha", "Cupim", "Contrafilé",
      "Filé Mignon", "Bife de Chorizo", "Bife Ancho", "Vazio", "Falda", "Entrecôte", "T-bone", "Acém"
    ]
  },
  {
    categoria_secreta: "Clubes que já foram campeões da UEFA Champions League",
    total_itens_possiveis: 23,
    exemplos_validos: [
      "Real Madrid", "Milan", "Bayern de Munique", "Liverpool", "Barcelona", "Ajax",
      "Internazionale", "Manchester United", "Juventus", "Benfica", "Chelsea", "Porto",
      "Nottingham Forest", "Manchester City", "Borussia Dortmund", "Olympique de Marseille",
      "Aston Villa", "Feyenoord", "PSV Eindhoven", "Estrela Vermelha", "Steaua Bucareste", "Hamburgo", "Celtic"
    ]
  },
  {
    categoria_secreta: "Instrumentos musicais de corda",
    total_itens_possiveis: 16,
    exemplos_validos: [
      "Violão", "Guitarra", "Baixo", "Cavaquinho", "Violino", "Violoncelo", "Contrabaixo acústico",
      "Harpa", "Banjo", "Bandolim", "Ukulele", "Viola caipira", "Alaúde", "Cítara", "Piano"
    ]
  },
  {
    categoria_secreta: "Personagens principais do desenho 'Bob Esponja'",
    total_itens_possiveis: 14,
    exemplos_validos: [
      "Bob Esponja", "Patrick Estrela", "Lula Molusco", "Sr. Sirigueijo", "Sandy Bochechas",
      "Plankton", "Gary", "Sra. Puff", "Pérola", "Karen", "Homem-Sereia", "Mexilhãozinho", "Larry a Lagosta", "Holandês Voador"
    ]
  }
];

// 3. JOGO DO PROIBIDO (Taboo-style 5 cards per round)
export const CURATED_PROIBIDO: ProibidoCard[][] = [
  [
    {
      palavra_alvo: "ABACAXI",
      palavras_proibidas: ["FRUTA", "COROA", "ESPINHO", "AMARELO", "BOB ESPONJA"]
    },
    {
      palavra_alvo: "FUTEBOL",
      palavras_proibidas: ["BOLA", "GOL", "CAMPO", "JOGADOR", "Neymar"]
    },
    {
      palavra_alvo: "CHURRASCO",
      palavras_proibidas: ["CARNE", "PICANHA", "BRASA", "CARVÃO", "DOMINGO"]
    },
    {
      palavra_alvo: "PIZZA",
      palavras_proibidas: ["QUEIJO", "MASSA", "FORNO", "ITÁLIA", "FATIA"]
    },
    {
      palavra_alvo: "CINEMA",
      palavras_proibidas: ["FILME", "PIPOCA", "TELA", "INGRESSO", "SALA"]
    }
  ],
  [
    {
      palavra_alvo: "PRAIA",
      palavras_proibidas: ["AREIA", "MAR", "SOL", "ONDA", "BIQUÍNI"]
    },
    {
      palavra_alvo: "CACHORRO",
      palavras_proibidas: ["LATIR", "OSSINHO", "ANIMAL", "GATO", "PATA"]
    },
    {
      palavra_alvo: "AVIÃO",
      palavras_proibidas: ["VOAR", "ASA", "PILOTO", "AEROPORTO", "CÉU"]
    },
    {
      palavra_alvo: "CASAMENTO",
      palavras_proibidas: ["NOIVA", "ALIANÇA", "IGREJA", "PADRE", "FESTA"]
    },
    {
      palavra_alvo: "CARNAVAL",
      palavras_proibidas: ["SAMBA", "BLOCO", "FANTASIA", "FEVEREIRO", "DESFILE"]
    }
  ],
  [
    {
      palavra_alvo: "MICHAEL JACKSON",
      palavras_proibidas: ["REI DO POP", "MOONWALK", "THRILLER", "LUVA", "CANTOR"]
    },
    {
      palavra_alvo: "WHATSAPP",
      palavras_proibidas: ["MENSAGEM", "ÁUDIO", "ZAP", "VERDINHO", "GRUPO"]
    },
    {
      palavra_alvo: "CAFÉ",
      palavras_proibidas: ["MANHÃ", "XÍCARA", "ACORDAR", "PRETO", "AÇÚCAR"]
    },
    {
      palavra_alvo: "HOSPITAL",
      palavras_proibidas: ["MÉDICO", "DOENTE", "REMÉDIO", "CIRURGIA", "ENFERMEIRA"]
    },
    {
      palavra_alvo: "BATMAN",
      palavras_proibidas: ["MORCEGO", "CORINGA", "GOTHAM", "HERÓI", "ROBIN"]
    }
  ],
  [
    {
      palavra_alvo: "TINDER",
      palavras_proibidas: ["MATCH", "ARRASTAR", "ENCONTRO", "APLICATIVO", "FOTO"]
    },
    {
      palavra_alvo: "GUITARRA",
      palavras_proibidas: ["ROCK", "CORDA", "SOLO", "AMPLIFICADOR", "PALHETA"]
    },
    {
      palavra_alvo: "DINOSSAURO",
      palavras_proibidas: ["METEORO", "EXTINTO", "FÓSSIL", "T-REX", "JURÁSSICO"]
    },
    {
      palavra_alvo: "SUPERMERCADO",
      palavras_proibidas: ["CARRINHO", "COMPRAS", "CAIXA", "PREÇO", "FILA"]
    },
    {
      palavra_alvo: "PIRATA",
      palavras_proibidas: ["NAVIO", "TESOURO", "TAPA-OLHO", "PAPAGAIO", "CARIBE"]
    }
  ]
];

// 4. JOGO DA NOTA (Clean, short 3-to-8 word questions/categories — never mention the word "nota")
export const CURATED_NOTA: NotaRoundData[] = [
  {
    pergunta: "Qual estádio de futebol brasileiro?"
  },
  {
    pergunta: "Qual comida de estádio?"
  },
  {
    pergunta: "Qual jogador da Seleção Brasileira?"
  },
  {
    pergunta: "Qual camisa de time de futebol?"
  },
  {
    pergunta: "Qual ave ou animal voador?"
  },
  {
    pergunta: "Qual animal mamífero da natureza?"
  },
  {
    pergunta: "Qual animal de estimação (pet)?"
  },
  {
    pergunta: "Qual parte ou órgão do corpo humano?"
  },
  {
    pergunta: "Qual planeta ou astro do universo?"
  },
  {
    pergunta: "Qual invenção científica da história?"
  },
  {
    pergunta: "Qual doença ou dor física?"
  },
  {
    pergunta: "Qual lugar para ir em um primeiro encontro?"
  },
  {
    pergunta: "Qual profissão ou trabalho?"
  },
  {
    pergunta: "Qual comida para pedir no delivery?"
  },
  {
    pergunta: "Qual petisco ou porção de boteco?"
  },
  {
    pergunta: "Qual filme ou série para assistir no domingo?"
  }
];


// 5. TEM OU NÃO TEM (Survey of top answers)
export const CURATED_TEM_OU_NAO_TEM: TemOuNaoTemRoundData[] = [
  {
    pergunta: "Quais os jogadores de futebol mais lembrados quando o assunto é cobrança de pênalti?",
    respostas: [
      { texto: "Neymar Jr", sinonimos_aceitos: ["Neymar", "Ney", "Menino Ney"], votos: 42 },
      { texto: "Cristiano Ronaldo", sinonimos_aceitos: ["CR7", "Ronaldo", "Cristiano"], votos: 28 },
      { texto: "Lionel Messi", sinonimos_aceitos: ["Messi", "Leo Messi"], votos: 15 },
      { texto: "Henrique Dourado", sinonimos_aceitos: ["Ceifador", "Dourado"], votos: 9 },
      { texto: "Rogério Ceni", sinonimos_aceitos: ["Ceni", "Mito"], votos: 6 }
    ]
  },
  {
    pergunta: "O que não pode faltar de jeito nenhum em um churrasco de domingo no Brasil?",
    respostas: [
      { texto: "Picanha", sinonimos_aceitos: ["Carne", "Costela", "Bife"], votos: 45 },
      { texto: "Cerveja gelada", sinonimos_aceitos: ["Cerveja", "Chopp", "Bebida", "Gelada"], votos: 30 },
      { texto: "Farofa", sinonimos_aceitos: ["Farofinha"], votos: 12 },
      { texto: "Pão de alho", sinonimos_aceitos: ["Pão com alho"], votos: 8 },
      { texto: "Música", sinonimos_aceitos: ["Samba", "Pagode", "Caixa de som"], votos: 5 }
    ]
  },
  {
    pergunta: "Quais as desculpas mais clássicas para se atrasar ou faltar a um compromisso?",
    respostas: [
      { texto: "Trânsito engarrafado", sinonimos_aceitos: ["Trânsito", "Engarrafamento", "Trânsito parado"], votos: 48 },
      { texto: "Pneu furou", sinonimos_aceitos: ["Carro quebrou", "Carro furou", "Mecânico"], votos: 24 },
      { texto: "Despertador não tocou", sinonimos_aceitos: ["Perdi a hora", "Dormi demais", "Alarme"], votos: 16 },
      { texto: "Dor de barriga", sinonimos_aceitos: ["Passou mal", "Doente", "Estômago"], votos: 8 },
      { texto: "Chuva forte", sinonimos_aceitos: ["Temporal", "Alagamento"], votos: 4 }
    ]
  },
  {
    pergunta: "Quais os super-heróis dos quadrinhos e cinemas mais conhecidos pelo público?",
    respostas: [
      { texto: "Homem-Aranha", sinonimos_aceitos: ["Spiderman", "Peter Parker", "Aranha"], votos: 38 },
      { texto: "Batman", sinonimos_aceitos: ["Homem Morcego", "Bruce Wayne"], votos: 32 },
      { texto: "Superman", sinonimos_aceitos: ["Super-Homem", "Clark Kent"], votos: 18 },
      { texto: "Homem de Ferro", sinonimos_aceitos: ["Iron Man", "Tony Stark"], votos: 8 },
      { texto: "Hulk", sinonimos_aceitos: ["Incrível Hulk", "Bruce Banner"], votos: 4 }
    ]
  },
  {
    pergunta: "O que as pessoas mais esquecem em casa na hora de sair?",
    respostas: [
      { texto: "Celular", sinonimos_aceitos: ["Smartphone", "Telefone"], votos: 40 },
      { texto: "Chaves", sinonimos_aceitos: ["Chave de casa", "Chave do carro"], votos: 28 },
      { texto: "Carteira", sinonimos_aceitos: ["Documento", "Cartão de crédito"], votos: 18 },
      { texto: "Carregador de celular", sinonimos_aceitos: ["Carregador", "Cabo"], votos: 9 },
      { texto: "Óculos", sinonimos_aceitos: ["Óculos de grau", "Óculos de sol"], votos: 5 }
    ]
  },
  {
    pergunta: "Qual o primeiro aplicativo que os brasileiros abrem no celular ao acordar?",
    respostas: [
      { texto: "WhatsApp", sinonimos_aceitos: ["Zap", "Zap Zap"], votos: 52 },
      { texto: "Instagram", sinonimos_aceitos: ["Insta"], votos: 26 },
      { texto: "TikTok", sinonimos_aceitos: ["Tiktok"], votos: 11 },
      { texto: "Twitter", sinonimos_aceitos: ["X", "X Twitter"], votos: 7 },
      { texto: "YouTube", sinonimos_aceitos: ["Youtube"], votos: 4 }
    ]
  }
];


