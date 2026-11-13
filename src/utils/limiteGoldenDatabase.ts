/**
 * BANCO DE OURO OFICIAL DO "JOGO DO LIMITE" (PERGUNTAS MESTRAS OFICIAIS)
 * + ENGENHARIA DE FORMULAÇÃO (AS 7 LEIS DE OURO DO GAME DESIGN)
 */

export type LimiteGoldenCategory =
  | 'Geral & Curiosidades'
  | 'Guinness & Bizarros'
  | 'Esportes & Futebol'
  | 'Cultura Pop & Cinema'
  | 'Ciência & Corpo Humano';

export interface LimiteQuestion {
  id: string;
  categoria: LimiteGoldenCategory;
  pergunta: string;
  valor_exato: number;
  unidade: string;
  curiosidade_explicacao: string;
  dificuldade?: 'facil' | 'medio' | 'dificil' | 'impossivel';
}

export const LIMITE_GOLDEN_QUESTIONS: LimiteQuestion[] = [
  // 1. LISTA PRINCIPAL & CURIOSIDADES GERAIS
  {
    id: 'lim-01',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Quantas vezes uma abelha bate as asas em apenas 1 segundo?',
    valor_exato: 200,
    unidade: 'vezes por segundo',
    curiosidade_explicacao:
      'A média científica cravada nos jogos é 200 (podendo variar de 200 a 230 batidas por segundo!).'
  },
  {
    id: 'lim-02',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'Por quantos dólares foi vendido o sabre de luz original de Luke Skywalker em um leilão em dezembro de 2008?',
    valor_exato: 240000,
    unidade: 'dólares (US$)',
    curiosidade_explicacao:
      'US$ 240.000! Curiosidade: em um leilão mais recente, outra peça usada no duelo de O Império Contra-Ataca bateu US$ 3,75 milhões!'
  },
  {
    id: 'lim-03',
    categoria: 'Geral & Curiosidades',
    pergunta:
      'Qual o tamanho total da Muralha da China (em quilômetros), segundo o último levantamento arqueológico oficial?',
    valor_exato: 21196,
    unidade: 'km',
    curiosidade_explicacao:
      '21.196 km somando todas as ramificações construídas ao longo das dinastias!'
  },
  {
    id: 'lim-04',
    categoria: 'Geral & Curiosidades',
    pergunta:
      'Quantos quilômetros de extensão tem o Rio Amazonas, segundo a medição oficial do INPE?',
    valor_exato: 6992,
    unidade: 'km',
    curiosidade_explicacao:
      '6.992 km pelo levantamento do INPE (superando o Rio Nilo como o maior do mundo!).'
  },
  {
    id: 'lim-05',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Susie Hewer juntou dois de seus hobbies — correr maratonas e fazer crochê. Quantos metros de corrente de crochê ela fez enquanto corria a Maratona de Londres?',
    valor_exato: 139.4,
    unidade: 'metros',
    curiosidade_explicacao:
      '139,4 metros correndo! (Na versão de tricô na Maratona de Kansas City, David Babcock fez um cachecol de 3,7 metros).'
  },
  {
    id: 'lim-06',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Qual o tamanho da maior unha do mundo já registrada pelo Guinness Book (em centímetros), somando as unhas das duas mãos de Diana Armstrong?',
    valor_exato: 1306,
    unidade: 'centímetros',
    curiosidade_explicacao:
      '1.306 cm (ou 13,06 metros — quase o tamanho de um ônibus!). Em uma única mão/polegar de Shridhar Chillal, a marca foi 197,8 cm.'
  },
  {
    id: 'lim-07',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'Quantos bilhões de reais (ex: 1.3) a Globo fatura, em média, apenas com cotas de patrocínio e publicidade em uma edição recente do Big Brother Brasil (BBB)?',
    valor_exato: 1.3,
    unidade: 'bilhões de reais (R$)',
    curiosidade_explicacao:
      'Cerca de R$ 1,2 a R$ 1,5 bilhão! O recorde recente ultrapassou R$ 1,3 bilhão antes mesmo da estreia.'
  },
  {
    id: 'lim-08',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'Redenção (exibida pela TV Excelsior entre 1966 e 1968) é a maior novela da história da TV brasileira. Quantos capítulos ela teve ao todo?',
    valor_exato: 596,
    unidade: 'capítulos',
    curiosidade_explicacao:
      '596 capítulos! Na Globo, a maior foi Irmãos Coragem (328); no SBT, As Aventuras de Poliana teve 564 e Chiquititas 545.'
  },
  {
    id: 'lim-09',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'A Netflix fatura mais de US$ 35 bilhões anualmente. Quantos por cento (%) dos novos assinantes de um trimestre chegaram a entrar impulsionados por uma única série fenômeno (como Round 6)?',
    valor_exato: 22,
    unidade: '% (por cento)',
    curiosidade_explicacao:
      'Entre 15% e 22% do crescimento trimestral! No auge, Round 6 gerou quase US$ 900 milhões em valor de impacto.'
  },

  // 2. RECORDES BIZARROS DO GUINNESS BOOK (PADRÃO RODA DE BOBO)
  {
    id: 'lim-10',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'O americano Joey Chestnut é o maior comedor competitivo do mundo. Quantos cachorros-quentes (com pão e salsicha) ele conseguiu comer em apenas 10 minutos para bater o recorde mundial?',
    valor_exato: 76,
    unidade: 'cachorros-quentes',
    curiosidade_explicacao:
      '76 cachorros-quentes completos em 10 minutos (mais de 7 por minuto!).'
  },
  {
    id: 'lim-11',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Ashrita Furman detém o recorde de equilibrar o maior número de caixas de leite no queixo ao mesmo tempo. Quantas caixas ele equilibrou?',
    valor_exato: 22,
    unidade: 'caixas de leite',
    curiosidade_explicacao: '22 caixas de leite equilibradas apenas no queixo!'
  },
  {
    id: 'lim-12',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Quantas camisetas o recordista Ted Hastings conseguiu vestir, uma por cima da outra, de uma só vez?',
    valor_exato: 260,
    unidade: 'camisetas',
    curiosidade_explicacao:
      '260 camisetas vestidas simultaneamente (indo do tamanho M até o 20GG!).'
  },
  {
    id: 'lim-13',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Qual a duração (em horas inteiras) do beijo mais longo da história registrado pelo Guinness Book, protagonizado por um casal tailandês?',
    valor_exato: 58,
    unidade: 'horas',
    curiosidade_explicacao:
      'Exatas 58 horas, 35 minutos e 58 segundos sem desgrudar os lábios!'
  },
  {
    id: 'lim-14',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Quantas colheres o recordista Abolfazl Saber Mokhtari conseguiu equilibrar grudadas no próprio corpo ao mesmo tempo?',
    valor_exato: 88,
    unidade: 'colheres',
    curiosidade_explicacao: '88 colheres equilibradas na pele de uma só vez!'
  },
  {
    id: 'lim-15',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Qual a velocidade máxima (em km/h) já atingida por um carrinho de supermercado motorizado no Guinness Book?',
    valor_exato: 141.9,
    unidade: 'km/h',
    curiosidade_explicacao:
      '141,9 km/h dentro de um carrinho de compras gigante com motor!'
  },
  {
    id: 'lim-16',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Quantos ovos um homem conseguiu quebrar usando apenas a própria cabeça em 1 minuto?',
    valor_exato: 142,
    unidade: 'ovos',
    curiosidade_explicacao: '142 ovos esmagados na testa em 60 segundos!'
  },
  {
    id: 'lim-17',
    categoria: 'Guinness & Bizarros',
    pergunta:
      'Qual é o recorde mundial oficial (em metros) de arremesso de aparelho celular?',
    valor_exato: 110.42,
    unidade: 'metros',
    curiosidade_explicacao:
      '110,42 metros — mais longe que o comprimento de um campo de futebol inteiro!'
  },

  // 3. FUTEBOL, ESPORTES E MUNDO CAZÉTV
  {
    id: 'lim-18',
    categoria: 'Esportes & Futebol',
    pergunta:
      'Rogério Ceni é o goleiro com mais gols na história do futebol. Quantos gols oficiais (reconhecidos pela FIFA/IFFHS) ele marcou na carreira?',
    valor_exato: 131,
    unidade: 'gols oficiais',
    curiosidade_explicacao:
      '131 gols oficiais reconhecidos pela FIFA/IFFHS (132 na contagem do São Paulo FC).'
  },
  {
    id: 'lim-19',
    categoria: 'Esportes & Futebol',
    pergunta:
      'Qual foi o público total presente no Maracanã na final da Copa do Mundo de 1950 (Brasil x Uruguai), somando pagantes e não-pagantes nas estimativas históricas da FIFA?',
    valor_exato: 199854,
    unidade: 'pessoas',
    curiosidade_explicacao:
      '199.854 pessoas presentes (sendo 173.850 pagantes registrados na bilheteria)!'
  },
  {
    id: 'lim-20',
    categoria: 'Esportes & Futebol',
    pergunta:
      'Quantos minutos durou a partida de tênis mais longa da história (entre John Isner e Nicolas Mahut, em Wimbledon 2010)?',
    valor_exato: 665,
    unidade: 'minutos',
    curiosidade_explicacao:
      '665 minutos! Foram 11 horas e 5 minutos de partida divididos ao longo de 3 dias!'
  },
  {
    id: 'lim-21',
    categoria: 'Esportes & Futebol',
    pergunta:
      'Em 2012, Lionel Messi bateu o recorde histórico de gols marcados em um único ano civil. Quantos gols ele fez naquele ano?',
    valor_exato: 91,
    unidade: 'gols',
    curiosidade_explicacao:
      '91 gols oficiais em um único ano (superando os 85 gols de Gerd Müller em 1972)!'
  },
  {
    id: 'lim-22',
    categoria: 'Esportes & Futebol',
    pergunta:
      'Quantos pênaltis foram cobrados ao todo na disputa de pênaltis mais longa da história do futebol profissional (recorde batido em 2024 em Israel)?',
    valor_exato: 56,
    unidade: 'cobranças de pênalti',
    curiosidade_explicacao:
      '56 cobranças na partida do SC Dimona em 2024 (superando as 54 cobranças de Washington x Bedlington em 2022)!'
  },
  {
    id: 'lim-23',
    categoria: 'Esportes & Futebol',
    pergunta:
      'Quantos quilos pesava Chad Rowan (Akebono), o lendário lutador havaiano que se tornou o primeiro estrangeiro campeão máximo (Yokozuna) do sumô?',
    valor_exato: 227,
    unidade: 'kg',
    curiosidade_explicacao:
      '227 kg! (No sumô amador mundial, Emanuel Yarbrough chegou a registrar o recorde de 326 kg no Guinness).'
  },

  // 4. CULTURA POP, CINEMA, MÚSICA E BRASIL
  {
    id: 'lim-24',
    categoria: 'Geral & Curiosidades',
    pergunta:
      'Quantas palavras diferentes um único pássaro (o periquito Puck) conseguiu falar comprovadamente para entrar no Guinness Book?',
    valor_exato: 1728,
    unidade: 'palavras diferentes',
    curiosidade_explicacao:
      '1.728 palavras distintas registradas no vocabulário do pequeno periquito Puck!'
  },
  {
    id: 'lim-25',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      "No filme Titanic (1997), quantas vezes a personagem Rose diz o nome 'Jack' ao longo de todo o filme?",
    valor_exato: 80,
    unidade: 'vezes',
    curiosidade_explicacao:
      "Rose diz 'Jack' 80 vezes (enquanto Jack diz 'Rose' 50 vezes ao longo do filme)!"
  },
  {
    id: 'lim-26',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'Quantos tijolos de LEGO foram usados para construir a maior estrutura de LEGO do mundo (uma réplica em tamanho real da nave X-Wing de Star Wars)?',
    valor_exato: 5335200,
    unidade: 'peças de LEGO',
    curiosidade_explicacao:
      '5.335.200 peças de LEGO (pesando mais de 20 toneladas)!'
  },
  {
    id: 'lim-27',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'O seriado Chaves parece ter milhares de episódios, mas quantos episódios oficiais (como programa independente, entre 1973 e 1980) foram realmente gravados?',
    valor_exato: 290,
    unidade: 'episódios',
    curiosidade_explicacao: 'Apenas 290 episódios como programa independente!'
  },
  {
    id: 'lim-28',
    categoria: 'Cultura Pop & Cinema',
    pergunta:
      'Quantos milhões de dólares líquidos custou a produção do filme mais caro da história do cinema (Star Wars: O Despertar da Força, segundo relatórios fiscais revelados pela Forbes)?',
    valor_exato: 447,
    unidade: 'milhões de dólares (US$)',
    curiosidade_explicacao:
      'US$ 447 milhões líquidos (o custo bruto passou de US$ 533 milhões)!'
  },
  {
    id: 'lim-29',
    categoria: 'Geral & Curiosidades',
    pergunta:
      'Quantos degraus tem a famosa escadaria da Igreja da Penha, no Rio de Janeiro?',
    valor_exato: 382,
    unidade: 'degraus',
    curiosidade_explicacao:
      '382 degraus esculpidos na pedra (mais que os 365 dias do ano)!'
  },
  {
    id: 'lim-30',
    categoria: 'Geral & Curiosidades',
    pergunta:
      'Quantos degraus é preciso subir para chegar ao topo da Torre Eiffel a pé (da base até o último nível)?',
    valor_exato: 1665,
    unidade: 'degraus',
    curiosidade_explicacao: '1.665 degraus até o topo da Torre Eiffel!'
  },

  // 5. CIÊNCIA, CORPO HUMANO E CURIOSIDADES ABSURDAS
  {
    id: 'lim-31',
    categoria: 'Ciência & Corpo Humano',
    pergunta:
      'Quantos litros de saliva um ser humano saudável produz, em média, ao longo de toda a sua vida?',
    valor_exato: 25000,
    unidade: 'litros',
    curiosidade_explicacao:
      'De 25.000 a 30.000 litros ao longo da vida — o suficiente para encher duas piscinas!'
  },
  {
    id: 'lim-32',
    categoria: 'Ciência & Corpo Humano',
    pergunta:
      'Se esticarmos todos os vasos sanguíneos (artérias, veias e capilares) de um único corpo humano adulto em linha reta, quantos quilômetros eles teriam?',
    valor_exato: 96500,
    unidade: 'km',
    curiosidade_explicacao:
      '96.500 km (quase 100 mil km — dá para dar duas voltas e meia na Terra!).'
  },
  {
    id: 'lim-33',
    categoria: 'Geral & Curiosidades',
    pergunta:
      'Qual é a distância exata (em quilômetros) em linha reta entre o ponto mais ao norte do Brasil (Monte Caburaí, RR) e o ponto mais ao sul (Arroio Chuí, RS)?',
    valor_exato: 4394,
    unidade: 'km',
    curiosidade_explicacao:
      '4.394 km de ponta a ponta (quase a mesma distância leste-oeste de 4.319 km)!'
  },
  {
    id: 'lim-34',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantas ilhas formam oficialmente o arquipélago das Filipinas?',
    valor_exato: 7641,
    unidade: 'ilhas',
    curiosidade_explicacao: '7.641 ilhas catalogadas no arquipélago!'
  },
  {
    id: 'lim-35',
    categoria: 'Ciência & Corpo Humano',
    pergunta:
      "Quantos 'chutes' (pontapés) um bebê dá, em média, dentro da barriga da mãe durante os 9 meses de gestação?",
    valor_exato: 30000,
    unidade: 'chutes',
    curiosidade_explicacao:
      'Cerca de 30.000 a 40.000 chutes ao longo de toda a gestação!'
  },
  {
    id: 'lim-36',
    categoria: 'Ciência & Corpo Humano',
    pergunta:
      'Quantos músculos diferentes o rosto humano utiliza, no mínimo, apenas para dar um sorriso verdadeiro?',
    valor_exato: 12,
    unidade: 'músculos',
    curiosidade_explicacao:
      'De 12 a 17 músculos para sorrir (e cerca de 43 músculos para franzir a testa!).'
  },
  {
    id: 'lim-37',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantas janelas existem no Palácio de Buckingham, em Londres?',
    valor_exato: 760,
    unidade: 'janelas',
    curiosidade_explicacao:
      '760 janelas (que são limpas a cada 6 semanas pela equipe real)!'
  },
  {
    id: 'lim-38',
    categoria: 'Geral & Curiosidades',
    pergunta:
      "Em 2010, um programador comprou 2 pizzas do Papa John's usando 10.000 Bitcoins. Convertendo para a cotação histórica recente, quantos milhões de dólares custaram essas pizzas?",
    valor_exato: 700,
    unidade: 'milhões de dólares (US$)',
    curiosidade_explicacao:
      'Mais de US$ 700 milhões de dólares pelas duas pizzas mais caras da história!'
  },
  {
    id: 'lim-39',
    categoria: 'Ciência & Corpo Humano',
    pergunta:
      'Quantas sementes existem, em média, na parte externa de um único morango médio?',
    valor_exato: 200,
    unidade: 'sementes',
    curiosidade_explicacao:
      'Cerca de 200 pequenas sementes (aquênios) na casca de cada morango!'
  },
  {
    id: 'lim-40',
    categoria: 'Ciência & Corpo Humano',
    pergunta:
      'Qual a idade (em anos) da árvore viva não-clonal mais velha do mundo (o pinheiro Matusalém, na Califórnia)?',
    valor_exato: 4858,
    unidade: 'anos',
    curiosidade_explicacao:
      'Mais de 4.858 anos de vida — ela já existia antes mesmo das Pirâmides do Egito serem construídas!',
    dificuldade: 'dificil'
  },
  // ================= NÍVEL FÁCIL (LEVE / INFANTIL / FAMÍLIA) =================
  {
    id: 'lim-facil-01',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Quantos dentes de leite uma criança tem normalmente na boca antes de começar a troca pelos dentes permanentes?',
    valor_exato: 20,
    unidade: 'dentes de leite',
    curiosidade_explicacao: 'São 20 dentes de leite (10 em cima e 10 embaixo). Os adultos têm 32 dentes permanentes!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-02',
    categoria: 'Esportes & Futebol',
    pergunta: 'Em uma partida oficial de futebol, quantos jogadores de CADA equipe entram em campo como titulares?',
    valor_exato: 11,
    unidade: 'jogadores por time',
    curiosidade_explicacao: '11 jogadores (1 goleiro e 10 na linha), somando 22 atletas em campo!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-03',
    categoria: 'Esportes & Futebol',
    pergunta: 'Quantos minutos dura UM tempo regulamentar em uma partida de futebol profissional (sem contar acréscimos)?',
    valor_exato: 45,
    unidade: 'minutos',
    curiosidade_explicacao: '45 minutos por tempo, totalizando 90 minutos de jogo regulamentar!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-04',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Quantas cores compõem o arco-íris clássico na física e na cultura popular?',
    valor_exato: 7,
    unidade: 'cores',
    curiosidade_explicacao: '7 cores: vermelho, laranja, amarelo, verde, azul, anil e violeta!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-05',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantos dias tem o mês de fevereiro em um ano normal (que NÃO é ano bissexto)?',
    valor_exato: 28,
    unidade: 'dias',
    curiosidade_explicacao: '28 dias nos anos comuns e 29 dias nos anos bissextos a cada 4 anos!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-06',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantas letras tem o alfabeto oficial da língua portuguesa (incluindo as letras K, W e Y)?',
    valor_exato: 26,
    unidade: 'letras',
    curiosidade_explicacao: '26 letras desde o Acordo Ortográfico que oficializou K, W e Y no alfabeto!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-07',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantos estados compõem a República Federativa do Brasil, além do Distrito Federal?',
    valor_exato: 26,
    unidade: 'estados',
    curiosidade_explicacao: 'São 26 estados mais o Distrito Federal, totalizando 27 unidades federativas!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-08',
    categoria: 'Cultura Pop & Cinema',
    pergunta: 'Quantos filmes compõem a saga principal de Harry Potter lançados nos cinemas entre 2001 e 2011?',
    valor_exato: 8,
    unidade: 'filmes',
    curiosidade_explicacao: 'Os 7 livros viraram 8 filmes porque As Relíquias da Morte foi dividido em Parte 1 e Parte 2!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-09',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantas peças de xadrez cada jogador possui no início de uma partida (peões, torres, cavalos, bispos, rei e dama)?',
    valor_exato: 16,
    unidade: 'peças por jogador',
    curiosidade_explicacao: '16 peças para as brancas e 16 para as pretas, somando 32 peças no tabuleiro!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-10',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Quantos dedos um ser humano tem somando todos os dedos das duas mãos e dos dois pés?',
    valor_exato: 20,
    unidade: 'dedos no total',
    curiosidade_explicacao: '10 dedos nas mãos e 10 dedos nos pés, totalizando 20 dedos!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-11',
    categoria: 'Cultura Pop & Cinema',
    pergunta: 'Quantos anões acompanham e protegem a princesa no clássico conto infantil da Branca de Neve?',
    valor_exato: 7,
    unidade: 'anões',
    curiosidade_explicacao: '7 anões: Mestre, Zangado, Feliz, Dunga, Soneca, Atchim e Dengoso!',
    dificuldade: 'facil'
  },
  {
    id: 'lim-facil-12',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantas horas tem um dia completo (somando o período claro e a noite inteira)?',
    valor_exato: 24,
    unidade: 'horas',
    curiosidade_explicacao: '24 horas é o tempo aproximado de rotação completa do planeta Terra!',
    dificuldade: 'facil'
  },

  // ================= NÍVEL MÉDIO (CONHECIMENTOS GERAIS DEDUTÍVEIS) =================
  {
    id: 'lim-med-01',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Em que ano a missão Apollo 11 pousou na Lua e Neil Armstrong se tornou o primeiro homem a pisar em solo lunar?',
    valor_exato: 1969,
    unidade: 'ano',
    curiosidade_explicacao: 'Em 20 de julho de 1969 o mundo parou para assistir a histórica transmissão ao vivo!',
    dificuldade: 'medio'
  },
  {
    id: 'lim-med-02',
    categoria: 'Esportes & Futebol',
    pergunta: 'Qual é a capacidade aproximada de público do Estádio do Maracanã (em milhares de lugares sentados) após a última reforma?',
    valor_exato: 78,
    unidade: 'milhares de lugares',
    curiosidade_explicacao: 'A capacidade oficial é de 78.838 torcedores sentados!',
    dificuldade: 'medio'
  },
  {
    id: 'lim-med-03',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Quantos países soberanos e independentes compõem o continente da América do Sul?',
    valor_exato: 12,
    unidade: 'países',
    curiosidade_explicacao: '12 países independentes (além do território ultramarino da Guiana Francesa)!',
    dificuldade: 'medio'
  },
  {
    id: 'lim-med-04',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Qual é a velocidade máxima aproximada (em km/h) que um guepardo — o animal terrestre mais rápido do mundo — atinge em corrida rápida?',
    valor_exato: 120,
    unidade: 'km/h',
    curiosidade_explicacao: 'Ele acelera de 0 a 100 km/h em menos de 3 segundos, atingindo até 120 km/h!',
    dificuldade: 'medio'
  },
  {
    id: 'lim-med-05',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Quantos ossos compõem o esqueleto de um ser humano adulto com todas as articulações formadas?',
    valor_exato: 206,
    unidade: 'ossos',
    curiosidade_explicacao: '206 ossos! Nascemos com cerca de 270 que se fundem ao longo da infância e adolescência.',
    dificuldade: 'medio'
  },
  {
    id: 'lim-med-06',
    categoria: 'Cultura Pop & Cinema',
    pergunta: 'Em que ano foi lançado nos cinemas o clássico primeiro filme de Star Wars (Episódio IV: Uma Nova Esperança)?',
    valor_exato: 1977,
    unidade: 'ano',
    curiosidade_explicacao: 'Estreou em 1977 sob direção de George Lucas e revolucionou a indústria do cinema!',
    dificuldade: 'medio'
  },
  {
    id: 'lim-med-07',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Qual é a altura aproximada da Estátua da Liberdade em Nova York (em metros), medida desde o solo da base até a ponta da tocha?',
    valor_exato: 93,
    unidade: 'metros',
    curiosidade_explicacao: '93 metros do chão à tocha (sendo 46 metros apenas a estátua sem o pedestal)!',
    dificuldade: 'medio'
  },
  {
    id: 'lim-med-08',
    categoria: 'Esportes & Futebol',
    pergunta: 'Quantas seleções nacionais disputaram a primeira Copa do Mundo de Futebol da FIFA realizada no Uruguai em 1930?',
    valor_exato: 13,
    unidade: 'seleções',
    curiosidade_explicacao: '13 seleções participaram, e a seleção anfitriã (Uruguai) sagrou-se campeã mundial!',
    dificuldade: 'medio'
  },

  // ================= NÍVEL IMPOSSÍVEL (EXTREMO / INACREDITÁVEL / NÚMEROS ASTRONÔMICOS) =================
  {
    id: 'lim-imp-01',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Segundo estudo científico da Universidade de Hong Kong publicado na revista PNAS, quantas formigas vivas existem no planeta Terra (em quatrilhões)?',
    valor_exato: 20,
    unidade: 'quatrilhões de formigas',
    curiosidade_explicacao: '20 quatrilhões (20.000.000.000.000.000)! Existem cerca de 2,5 milhões de formigas para cada ser humano vivo!',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-02',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Estudos arqueológicos estimam que a Grande Pirâmide de Gizé foi construída com quantos milhões de blocos maciços de pedra calcária e granito?',
    valor_exato: 2.3,
    unidade: 'milhões de blocos',
    curiosidade_explicacao: 'Cerca de 2,3 milhões de blocos pesando em média 2,5 toneladas cada um!',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-03',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Quantos batimentos cardíacos por minuto chega a registrar o coração de um beija-flor em pleno voo pairado?',
    valor_exato: 1260,
    unidade: 'batimentos por minuto (bpm)',
    curiosidade_explicacao: 'Até 1.260 bpm (mais de 20 batidas por segundo)! Em repouso durante a noite cai para cerca de 250 bpm.',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-04',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Se todos os vasos sanguíneos (artérias, veias e capilares) de um ser humano adulto fossem alinhados em linha reta, quantos quilômetros de extensão eles teriam?',
    valor_exato: 100000,
    unidade: 'km',
    curiosidade_explicacao: 'Aproximadamente 100.000 km! O suficiente para dar duas voltas e meia inteiras ao redor do planeta Terra!',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-05',
    categoria: 'Geral & Curiosidades',
    pergunta: 'Cientistas estimam que em 1 metro cúbico (m³) de areia de praia comum existem quantos milhões de grãos de areia?',
    valor_exato: 8000,
    unidade: 'milhões de grãos',
    curiosidade_explicacao: 'Cerca de 8 bilhões (8.000 milhões) de grãos de areia por metro cúbico!',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-06',
    categoria: 'Geral & Curiosidades',
    pergunta: 'No histórico primeiro voo motorizado dos irmãos Wright em 1903, quantos metros a aeronave Flyer 1 percorreu antes de pousar?',
    valor_exato: 37,
    unidade: 'metros',
    curiosidade_explicacao: 'Apenas 37 metros em 12 segundos no ar! Menor que a envergadura de asas de um Boeing 747 moderno.',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-07',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Segundo o censo global publicado na prestigiada revista científica Nature, quantas árvores existem atualmente no planeta Terra (em bilhões)?',
    valor_exato: 3040,
    unidade: 'bilhões de árvores',
    curiosidade_explicacao: 'Aproximadamente 3,04 trilhões (3.040 bilhões) de árvores em todo o planeta!',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-08',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'A cada minuto, quantos relâmpagos atingem a superfície do planeta Terra somando todas as tempestades globais simultâneas?',
    valor_exato: 2400,
    unidade: 'relâmpagos por minuto',
    curiosidade_explicacao: 'Cerca de 2.400 relâmpagos por minuto (aproximadamente 40 a 44 raios por segundo na Terra)!',
    dificuldade: 'impossivel'
  },
  {
    id: 'lim-imp-09',
    categoria: 'Ciência & Corpo Humano',
    pergunta: 'Quantos quilos de comida (folhas, galhos e cascas) um elefante-africano adulto consome por dia na natureza para se manter vivo?',
    valor_exato: 150,
    unidade: 'kg de comida por dia',
    curiosidade_explicacao: 'Cerca de 150 kg de comida por dia, passando até 18 horas diárias apenas mastigando!',
    dificuldade: 'impossivel'
  }

];

/**
 * AS 7 LEIS DE OURO PARA FORMULAR UMA PERGUNTA DO "JOGO DO LIMITE"
 */
export const LIMITE_SEVEN_GOLDEN_LAWS = `AS 7 LEIS DE OURO PARA FORMULAR UMA PERGUNTA DO "JOGO DO LIMITE":
1. Estrutura "Contexto Curioso + Pergunta Direta" (Storytelling):
   - NUNCA faça uma pergunta seca e sem graça. Comece contextualizando o recordista, o filme, o evento ou a situação absurda na primeira frase, e faça a pergunta numérica na segunda frase.
2. Unidade de Medida e Escala Explícitas na Pergunta:
   - A pergunta DEVE declarar entre parênteses ou no texto qual é a unidade exata esperada na resposta: (em quilômetros), (em centímetros), (em minutos), (em milhões de dólares), (em quilos), (em horas).
3. Recorte Temporal ou Critério Oficial Claro:
   - Quando um dado puder variar, especifique o recorte na pergunta: "segundo o último levantamento arqueológico oficial", "somando as duas mãos", "como programa independente entre 1973 e 1980", "em um único ano civil (2012)", "em 1 minuto".
4. Valor Cravado Único (Sem Range Ambíguo no Número Principal):
   - O JSON da pergunta deve cravar UM único número oficial exato (valor_exato) para o cálculo do jogo, e explicar eventual margem ou detalhe dentro do campo curiosidade_explicacao.
5. Ancoragem Mental Possível (Estimável, mas ninguém sabe de cor):
   - Escolha fatos onde ninguém na sala sabe o número exato decorado, mas todos conseguem imaginar a cena e debater.
6. Gabarito com "Fator UAU" (Curiosidade Comparativa na Revelação):
   - O campo curiosidade_explicacao DEVE trazer uma comparação visual divertida ou dado bônus (ex: "1.306 cm — quase o tamanho de um ônibus!", "665 minutos — 11 horas e 5 minutos divididos em 3 dias!", "25.000 litros — o suficiente para encher duas piscinas!").
7. Respeito Absoluto ao Tema Escolhido:
   - Se o usuário escolheu um tema específico, aplique exatamente essa mesma fórmula de "Recorde / Contagem Inusitada / Bastidores / Estatística Absurda" 100% dentro do tema escolhido!`;

function normalizeText(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

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

/**
 * Maps any user theme string to the closest LimiteGoldenCategory in LIMITE_GOLDEN_QUESTIONS.
 */
export function matchThemeToGoldenCategory(tema: string): LimiteGoldenCategory {
  const norm = normalizeText(tema);

  if (
    /(futebol|esporte|copa|selecao|clube|brasileirao|libertadores|champions|gol|craque|estadio|olimpiada|nba|basquete|tenis|formula 1|corrida|volei|luta|boxe|ufc|atleta|maracana|caze)/.test(
      norm
    )
  ) {
    return 'Esportes & Futebol';
  }

  if (
    /(filme|cinema|serie|tv|novela|bbb|reality|netflix|star wars|titanic|chaves|lego|musica|cantor|banda|show|pop|cultura pop|anime|game|jogos|marvel|disney|celebridade|fofoca|hollywood)/.test(
      norm
    )
  ) {
    return 'Cultura Pop & Cinema';
  }

  if (
    /(ciencia|corpo|humano|biologia|animal|animais|abelha|medicina|saude|anatomia|natureza|espaco|planeta|universo|fisica|quimica|arvore|planta|fruta|morango|bebes|gestacao)/.test(
      norm
    )
  ) {
    return 'Ciência & Corpo Humano';
  }

  if (
    /(guinness|recorde|bizarro|maluco|insano|absurdo|curiosidade|desafio|comida|comer|cachorro-quente|ovo|supermercado|beijo|unha|camiseta|croche)/.test(
      norm
    )
  ) {
    return 'Guinness & Bizarros';
  }

  return 'Geral & Curiosidades';
}

/**
 * Checks whether the user's theme corresponds directly to one of the Golden Database categories
 * or a classic/general theme where Golden Questions can be served directly.
 */
export function isGoldenDatabaseCompatibleTheme(tema: string): boolean {
  const norm = normalizeText(tema);
  if (!norm) return true;
  return /(geral|curiosidade|classico|guinness|recorde|bizarro|futebol|esporte|copa|cultura pop|cinema|filme|serie|tv|novela|ciencia|corpo humano|biologia|natureza|animais|mundo)/.test(
    norm
  );
}

/**
 * Dynamically selects 6 to 8 few-shot examples from LIMITE_GOLDEN_QUESTIONS,
 * prioritizing examples from the category closest to the requested theme.
 */

export function getLimiteDifficultyGuideline(dificuldade: string): string {
  const norm = (dificuldade || 'dificil').toLowerCase().trim();
  if (norm === 'facil') {
    return `DIRETRIZ ESTRITA DE NÍVEL FÁCIL (LEVE / INFANTIL / FAMÍLIA):
- O nível selecionado é FÁCIL! A pergunta DEVE ser leve, amigável, clara e acessível até para uma criança de 8 a 10 anos jogar com a família!
- USE números pequenos, familiares, intuitivos e do cotidiano (ex: quantos dentes de leite uma criança tem normalmente [20], quantos jogadores entram em campo em cada time num jogo de futebol [11], quantos dias tem o mês de fevereiro em ano comum [28], quantas cores tem o arco-íris clássico [7], quantos minutos tem um tempo de futebol [45], quantas letras tem o alfabeto [26]).
- É ESTRITAMENTE PROIBIDO fazer perguntas complexas, acadêmicas, recordes bizarros do Guinness, orçamentos milionários de produções, estatísticas obscuras ou contagens microscópicas!
- O número deve ser fácil de estimar para crianças e iniciantes.`;
  }
  if (norm === 'medio') {
    return `DIRETRIZ ESTRITA DE NÍVEL MÉDIO (CONHECIMENTOS GERAIS DEDUTÍVEIS):
- O nível selecionado é MÉDIO! A pergunta é um pouco mais elaborada, mas ainda perfeitamente acessível para adolescentes e adultos antenados deduzirem ou saberem a resposta com boa aproximação!
- Curiosidades consagradas de cultura pop, esportes, geografia e história (ex: capacidade aproximada de público de um grande estádio como o Maracanã em milhares, ano de lançamento de um filme clássico, quantos países compõem a América do Sul [12], velocidade máxima em km/h de um animal conhecido como o guepardo [120], ossos no corpo humano [206]).
- O jogador consegue deduzir a faixa do número com lógica de senso comum e cultura geral.`;
  }
  if (norm === 'impossivel') {
    return `DIRETRIZ ESTRITA DE NÍVEL IMPOSSÍVEL (EXTREMO / INACREDITÁVEL / NÚMEROS ASTRONÔMICOS OU MICROSCÓPICOS):
- O nível selecionado é IMPOSSÍVEL! A pergunta DEVE ser de um nível extraordinário, algo que NINGUÉM no mundo decoraria, mas que POSSUI UM NÚMERO CIENTÍFICO OU HISTÓRICO REALMENTE COMPROVADO E DOCUMENTADO!
- Fatos chocantes, números astronômicos, contagens biológicas microscópicas, proporções cósmicas, censos globais inacreditáveis ou recordes extremos (ex: quantas formigas vivas existem na Terra segundo estudo da Universidade de Hong Kong [20 quatrilhões], quantos tijolos de pedra foram usados na Grande Pirâmide de Gizé [2.3 milhões], quantos batimentos por minuto dá o coração de um beija-flor em voo [1260], quantos metros percorreu o avião dos irmãos Wright no 1º voo de 1903 [37 metros], quantos grãos de areia existem em média em 1 metro cúbico de praia [8000 milhões]).
- O jogador não tem como saber exatamente; o suspense é total e a revelação do gabarito provoca espanto, risadas e choque imediato na sala!`;
  }
  // Default: 'dificil'
  return `DIRETRIZ ESTRITA DE NÍVEL DIFÍCIL (DESAFIO PADRÃO AUDITÓRIO / RODA DE BOBO):
- O nível selecionado é DIFÍCIL! Este é o nível padrão das perguntas competitivas de gameshow da TV (CazeTV / Roda de Bobo).
- As perguntas são desafiadoras, inusitadas e complexas: recordes oficiais do Guinness dentro do tema, estatísticas curiosas de bastidores de cinema, somatórios de feitos esportivos ou dimensões surpreendentes (ex: quantas calorias Michael Phelps consumia por dia no auge [12000], quantas vezes uma palavra específica é dita em um filme clássico, quantos figurinos foram confeccionados para uma grande produção).
- Quase impossível saber o número cravado de cabeça, exigindo intenso debate de lógica e aproximação entre os jogadores.`;
}

function getLimiteRule3ByDifficulty(dificuldade: string): string {
  const norm = (dificuldade || 'dificil').toLowerCase().trim();
  if (norm === 'facil') {
    return '3. NÍVEL FÁCIL: Use números pequenos, intuitivos e do cotidiano acessíveis a crianças. PROIBIDO perguntas com orçamentos milionários, termos acadêmicos ou recordes obscuros!';
  }
  if (norm === 'medio') {
    return '3. NÍVEL MÉDIO: Fatos de cultura geral consagrados que o jogador antenado consegue deduzir a faixa com bom senso.';
  }
  if (norm === 'impossivel') {
    return '3. NÍVEL IMPOSSÍVEL: Perguntas extraordinárias sobre números astronômicos, contagens microscópicas ou proporções absurdas com comprovação científica ou histórica real!';
  }
  return '3. NÍVEL DIFÍCIL: Recordes oficiais do Guinness, estatísticas curiosas de bastidores e somatórios complexos onde ninguém sabe o número de cabeça.';
}

/**
 * Dynamically selects 6 to 8 few-shot examples from LIMITE_GOLDEN_QUESTIONS,
 * prioritizing examples matching the requested difficulty and category closest to the requested theme.
 */
export function selectFewShotLimiteExamples(
  tema: string,
  count: number = 7,
  excludeIdsOrQuestions: string[] = [],
  dificuldade: string = 'dificil'
): LimiteQuestion[] {
  const safeCount = Math.min(8, Math.max(6, count));
  const targetCategory = matchThemeToGoldenCategory(tema);
  const excludedSet = new Set(excludeIdsOrQuestions.map((x) => normalizeText(x)));
  const targetDiff = (dificuldade || 'dificil').toLowerCase().trim();

  const available = LIMITE_GOLDEN_QUESTIONS.filter(
    (q) =>
      !excludedSet.has(normalizeText(q.id)) &&
      !excludedSet.has(normalizeText(q.pergunta))
  );
  const basePool = available.length >= safeCount ? available : LIMITE_GOLDEN_QUESTIONS;

  // Prioritize questions matching the requested difficulty
  const diffMatching = basePool.filter((q) => (q.dificuldade || 'dificil') === targetDiff);
  const effectivePool = diffMatching.length >= 3 ? diffMatching : basePool;

  const sameCategory = shuffleArray(
    effectivePool.filter((q) => q.categoria === targetCategory)
  );
  const otherCategories = shuffleArray(
    effectivePool.filter((q) => q.categoria !== targetCategory)
  );

  const pickedSame = sameCategory.slice(0, Math.min(5, safeCount));
  const neededOthers = Math.max(0, safeCount - pickedSame.length);
  const pickedOthers = otherCategories.slice(0, neededOthers);

  const combined = [...pickedSame, ...pickedOthers];
  if (combined.length < safeCount) {
    const remaining = shuffleArray(basePool.filter((q) => !combined.some((c) => c.id === q.id)));
    combined.push(...remaining.slice(0, safeCount - combined.length));
  }

  return combined;
}

/**
 * Draws a non-repeating official question from LIMITE_GOLDEN_QUESTIONS,
 * prioritizing the difficulty and category matching the theme.
 */
export function drawUnusedGoldenLimiteQuestion(
  tema: string,
  usedIdsOrQuestions: Iterable<string> = [],
  dificuldade: string = 'dificil'
): LimiteQuestion {
  const usedSet = new Set<string>();
  for (const item of usedIdsOrQuestions) {
    usedSet.add(normalizeText(String(item)));
  }

  const targetCategory = matchThemeToGoldenCategory(tema);
  const targetDiff = (dificuldade || 'dificil').toLowerCase().trim();

  const unusedAll = LIMITE_GOLDEN_QUESTIONS.filter(
    (q) =>
      !usedSet.has(normalizeText(q.id)) &&
      !usedSet.has(normalizeText(q.pergunta))
  );

  const pool = unusedAll.length > 0 ? unusedAll : LIMITE_GOLDEN_QUESTIONS;
  const diffMatches = pool.filter((q) => (q.dificuldade || 'dificil') === targetDiff);
  const effectivePool = diffMatches.length > 0 ? diffMatches : pool;

  const categoryMatches = effectivePool.filter((q) => q.categoria === targetCategory);
  const candidates = categoryMatches.length > 0 ? categoryMatches : effectivePool;

  const shuffled = shuffleArray(candidates);
  return shuffled[0] || LIMITE_GOLDEN_QUESTIONS[0];
}

/**
 * Official master prompt builder for Jogo do Limite using the 7 Golden Laws,
 * difficulty-specific calibration instructions, and dynamic few-shot examples.
 */
export const buildLimitePrompt = (
  tema: string,
  dificuldade: string,
  exemplosFewShot: LimiteQuestion[],
  historicoUsado: string[]
) => `
Você é o criador oficial de perguntas do "Jogo do Limite" (estilo Roda de Bobo / Wits & Wagers).
Sua tarefa é criar uma pergunta numérica INÉDITA, fascinante e perfeitamente calibrada sobre o TEMA: "${tema}" (Nível de dificuldade: ${dificuldade}).

${LIMITE_SEVEN_GOLDEN_LAWS}

${getLimiteDifficultyGuideline(dificuldade)}

ESTUDE ESTES EXEMPLOS PERFEITOS DO NOSSO BANCO OFICIAL E IMITE EXATAMENTE O ESTILO E A ESCALA DELES:
${JSON.stringify(exemplosFewShot, null, 2)}

COMO FORMULAR A SUA PERGUNTA (OBRIGATÓRIO):
1. PERGUNTA CURTA E DIRETA: no MÁXIMO 120 caracteres (conte!) e no máximo 2 frases, para ser lida em voz alta na TV. Uma premissa de poucas palavras e a pergunta (ex: "No filme Titanic (1997), quantos metros tinha o navio?"). NÃO escreva parágrafos, NÃO explique o contexto da carreira, NÃO coloque ressalvas entre parênteses.
2. UNIDADE EXPLÍCITA: Deixe 100% claro na pergunta em qual unidade de medida o jogador deve responder (ex: "em quilômetros", "em minutos", "em milhões de dólares", "em centímetros").
3. REQUISITO DO NÍVEL (${dificuldade.toUpperCase()}):
${getLimiteRule3ByDifficulty(dificuldade)}
4. CURIOSIDADE COMPARATIVA NO GABARITO: No campo "curiosidade_explicacao", traga uma comparação visual impactante ou fato bônus sobre aquele número (ex: "quase o tamanho de um ônibus!", "o suficiente para dar duas voltas na Terra!").
5. NÚMERO INDISCUTÍVEL: o "valor_exato" deve ser um número oficial e amplamente aceito, com UMA fonte de referência clara (federação, censo, recorde homologado, ficha técnica). PROIBIDO usar totais que têm várias contagens diferentes (ex: gols de toda a carreira de Pelé, que variam por critério), estimativas, números "aproximados" ou fatos disputados. Se não tiver certeza do número, escolha outro assunto.
6. NÃO REPITA NADA DESTA LISTA JÁ USADA: ${JSON.stringify(historicoUsado)}.

Retorne APENAS um JSON válido com:
{
  "pergunta": "Texto completo e envolvente da pergunta com a unidade clara",
  "valor_exato": 1234,
  "unidade": "unidade curta exibida ao lado do número",
  "curiosidade_explicacao": "Explicação curta e impactante revelada junto com o gabarito",
  "fonte_do_numero": "Quem divulga esse número oficialmente (ex: FIFA, IBGE, Guinness)"
}
`;
