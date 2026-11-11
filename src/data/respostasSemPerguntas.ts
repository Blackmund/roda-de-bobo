/**
 * NOV-08: perguntas do Respostas sem perguntas.
 *
 * A pergunta fica oculta e os jogadores só sabem quantas palavras ela tem, então o ideal são perguntas de 6 a 12
 * palavras com UMA resposta curta e estável (nada que mude por temporada). O diretor confere a resposta na tela.
 *
 * - `origem: 'programa'`: exemplo citado pelo diretor no vídeo 1 (referência do Desafio Itaú; só faz sentido
 *   para quem conhece o programa).
 * - `origem: 'autoral'`: lista própria, com fatos gerais estáveis. `aceitas` traz variações comuns da resposta.
 */
export interface RespostaPergunta {
  pergunta: string;
  resposta: string;
  aceitas?: string[];
  categoria: string;
  origem: 'programa' | 'autoral';
}

const q = (
  categoria: string,
  itens: Array<[string, string, string[]?]>,
  origem: RespostaPergunta['origem'] = 'autoral'
): RespostaPergunta[] => itens.map(([pergunta, resposta, aceitas]) => ({ pergunta, resposta, aceitas, categoria, origem }));

export const RESPOSTAS_QUESTIONS: RespostaPergunta[] = [
  ...q(
    'Do programa',
    [['Quem é o produtor mais bonito do Roda de Bobo?', 'Caio Fumaça']],
    'programa'
  ),
  ...q('Geografia', [
    ['Qual é a capital do Brasil, inaugurada em 1960?', 'Brasília'],
    ['Qual é o maior país do mundo em extensão territorial?', 'Rússia'],
    ['Qual é o rio mais extenso que corta o Brasil e a Amazônia?', 'Amazonas', ['Rio Amazonas']],
    ['Em qual continente fica o deserto do Saara?', 'África'],
    ['Qual é a capital da Argentina, banhada pelo Rio da Prata?', 'Buenos Aires'],
    ['Qual oceano banha toda a costa leste do Brasil?', 'Atlântico', ['Oceano Atlântico']],
    ['Qual é o menor país do mundo em área, dentro de Roma?', 'Vaticano', ['Cidade do Vaticano']],
    ['Em qual país fica a cidade de Machu Picchu, antiga cidade inca?', 'Peru'],
    ['Qual é a capital da França, famosa pela Torre Eiffel?', 'Paris'],
    ['Qual cidade brasileira é conhecida como a Cidade Maravilhosa?', 'Rio de Janeiro'],
    ['Qual é o estado brasileiro que tem Salvador como capital?', 'Bahia'],
    ['Qual país tem formato de bota e capital em Roma?', 'Itália']
  ]),
  ...q('Futebol', [
    ['Quantos jogadores de cada time ficam em campo numa partida de futebol?', '11', ['onze']],
    ['Qual país sediou a Copa do Mundo de 2014 do futebol?', 'Brasil'],
    ['Qual seleção ganhou a Copa do Mundo de 2002 no Japão e na Coreia?', 'Brasil'],
    ['Qual jogador é conhecido como o Rei do Futebol?', 'Pelé'],
    ['Qual país venceu a Copa do Mundo de 2022 no Catar?', 'Argentina'],
    ['Como se chama o estádio do Flamengo e do Fluminense no Rio de Janeiro?', 'Maracanã', ['Maracana']],
    ['Quantos minutos tem cada tempo normal de uma partida de futebol?', '45', ['quarenta e cinco']],
    ['Qual cor de cartão significa expulsão do jogador em campo?', 'Vermelho', ['vermelha']],
    ['Qual jogador brasileiro usava a camisa número 10 na Copa de 1970?', 'Pelé'],
    ['Qual é o país de origem do esporte futebol moderno?', 'Inglaterra']
  ]),
  ...q('Esportes', [
    ['Quantos anéis tem o símbolo dos Jogos Olímpicos?', '5', ['cinco']],
    ['Em qual esporte se usa uma raquete e uma peteca ou volante?', 'Badminton'],
    ['Qual é a distância de uma maratona em quilômetros, aproximadamente?', '42', ['42 km', '42,195', 'quarenta e dois']],
    ['Qual país inventou o judô e o sumô como esportes tradicionais?', 'Japão'],
    ['Quantos jogadores de cada time ficam em quadra no vôlei?', '6', ['seis']],
    ['Qual piloto brasileiro foi tricampeão da Fórmula 1 e morreu em 1994?', 'Ayrton Senna', ['Senna']],
    ['Em qual esporte se arremessa a bola numa cesta a três metros de altura?', 'Basquete', ['basquetebol']],
    ['Qual esporte Gustavo Kuerten, o Guga, praticava profissionalmente?', 'Tênis', ['tenis']]
  ]),
  ...q('Ciência e corpo humano', [
    ['Qual é o planeta mais próximo do Sol no sistema solar?', 'Mercúrio', ['Mercurio']],
    ['Qual é o maior planeta do sistema solar?', 'Júpiter', ['Jupiter']],
    ['Quantos ossos tem o corpo de um adulto, aproximadamente?', '206', ['duzentos e seis']],
    ['Qual órgão do corpo humano bombeia o sangue para todo o corpo?', 'Coração', ['coracao']],
    ['Qual gás as plantas absorvem do ar para fazer a fotossíntese?', 'Gás carbônico', ['dióxido de carbono', 'CO2', 'gas carbonico']],
    ['Qual é o estado físico da água quando ela congela?', 'Sólido', ['gelo', 'solido']],
    ['Quantos planetas existem no sistema solar atualmente reconhecidos?', '8', ['oito']],
    ['Qual é o nome da galáxia onde fica o nosso sistema solar?', 'Via Láctea', ['Via Lactea']],
    ['Qual metal é líquido à temperatura ambiente e usado em termômetros antigos?', 'Mercúrio', ['Mercurio']],
    ['Qual é o osso mais longo do corpo humano, na coxa?', 'Fêmur', ['femur']]
  ]),
  ...q('História', [
    ['Quem foi o primeiro presidente do Brasil depois da Proclamação da República?', 'Deodoro da Fonseca', ['Deodoro']],
    ['Em que ano o Brasil foi descoberto pelos portugueses?', '1500', ['mil e quinhentos']],
    ['Quem pintou a famosa obra Mona Lisa, também chamada de Gioconda?', 'Leonardo da Vinci', ['da Vinci']],
    ['Qual navegador português chegou ao Brasil em 1500 comandando a frota?', 'Pedro Álvares Cabral', ['Cabral']],
    ['Qual povo construiu as pirâmides de Gizé no antigo Egito?', 'Egípcios', ['egipcios']],
    ['Qual foi o primeiro homem a pisar na Lua em 1969?', 'Neil Armstrong', ['Armstrong']],
    ['Quem inventou o avião 14-Bis, voando em Paris em 1906?', 'Santos Dumont', ['Santos-Dumont']],
    ['Em qual ano terminou a Segunda Guerra Mundial na Europa?', '1945']
  ]),
  ...q('Cultura pop', [
    ['Qual é o nome do bruxo de óculos criado por J. K. Rowling?', 'Harry Potter'],
    ['Qual é o nome do boneco de madeira cujo nariz cresce quando mente?', 'Pinóquio', ['Pinoquio']],
    ['Qual super-herói usa um escudo e foi congelado durante a guerra?', 'Capitão América', ['Capitao America']],
    ['Qual é o nome do rato mais famoso da Disney, par da Minnie?', 'Mickey', ['Mickey Mouse']],
    ['Qual cantor é chamado de Rei do Pop e dançava o moonwalk?', 'Michael Jackson'],
    ['Qual banda britânica de Liverpool tinha John, Paul, George e Ringo?', 'Beatles', ['The Beatles']],
    ['Em qual filme um navio afunda e Jack e Rose se apaixonam?', 'Titanic'],
    ['Qual personagem da Turma da Mônica tem um coelhinho azul chamado Sansão?', 'Mônica', ['Monica']],
    ['Qual é o nome do vilão de Star Wars que diz Eu sou seu pai?', 'Darth Vader', ['Vader']],
    ['Qual desenho tem uma esponja amarela que mora numa abacaxi no fundo do mar?', 'Bob Esponja']
  ]),
  ...q('Brasil e cultura', [
    ['Qual é o maior festival popular do Brasil, com desfiles de escolas de samba?', 'Carnaval'],
    ['Qual prato típico é feito de feijão preto, carnes e acompanha arroz e couve?', 'Feijoada'],
    ['Qual dança brasileira mistura luta e música e é tocada com berimbau?', 'Capoeira'],
    ['Qual é o nome da moeda usada atualmente no Brasil?', 'Real'],
    ['Qual escritor brasileiro escreveu Dom Casmurro e Memórias Póstumas de Brás Cubas?', 'Machado de Assis'],
    ['Qual é o nome da festa de junho com fogueira, quadrilha e pipoca?', 'Festa junina', ['São João', 'Sao Joao']],
    ['Qual é o nome do ritmo brasileiro típico do Nordeste tocado com sanfona e triângulo?', 'Forró', ['Forro']],
    ['Qual cidade brasileira tem o Pelourinho e a Igreja do Bonfim?', 'Salvador'],
    ['Qual é o ponto turístico no Rio com uma estátua de braços abertos?', 'Cristo Redentor'],
    ['Qual língua oficial é falada pela maioria dos brasileiros?', 'Português', ['portugues']]
  ]),
  ...q('Comidas e bebidas', [
    ['Qual fruta é a base do suco de laranja e vem da laranjeira?', 'Laranja'],
    ['Qual doce brasileiro é feito de leite condensado e chocolate em bolinhas?', 'Brigadeiro'],
    ['Qual é o ingrediente principal do pão de queijo além do queijo?', 'Polvilho', ['Polvilho azedo', 'Polvilho doce']],
    ['De qual fruto vem o chocolate, uma semente de árvore tropical?', 'Cacau'],
    ['Qual bebida é feita de cana, limão, açúcar e gelo no Brasil?', 'Caipirinha'],
    ['Qual país é a origem da pizza e do macarrão como conhecemos?', 'Itália', ['Italia']]
  ]),
  ...q('Animais e natureza', [
    ['Qual é o animal terrestre mais rápido do mundo, parente do gato?', 'Guepardo', ['Chita']],
    ['Qual animal é o maior mamífero do mundo e vive nos oceanos?', 'Baleia-azul', ['Baleia azul', 'Baleia']],
    ['Qual ave brasileira de bico enorme e colorido é símbolo da Amazônia?', 'Tucano'],
    ['Qual é o maior felino das Américas, com pelagem pintada?', 'Onça-pintada', ['Onça', 'Jaguar', 'Onca']],
    ['Qual inseto produz o mel e vive em colmeias com uma rainha?', 'Abelha'],
    ['Quantas patas tem uma aranha, que não é inseto?', '8', ['oito']]
  ])
];

export const normalizeRespostaKey = (s: string): string =>
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

/** Sorteia uma pergunta ainda não usada (esgotando o banco, recomeça). */
export function drawRespostaQuestion(used: Set<string> = new Set(), rng: () => number = Math.random): RespostaPergunta {
  let pool = RESPOSTAS_QUESTIONS.filter((x) => !used.has(normalizeRespostaKey(x.pergunta)));
  if (pool.length === 0) pool = [...RESPOSTAS_QUESTIONS];
  return shuffle(pool, rng)[0];
}
