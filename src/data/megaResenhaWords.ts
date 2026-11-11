/**
 * NOV-03: palavras da Mega Resenha.
 *
 * - `origem: 'programa'`: palavras vistas no programa (analise/perguntas/mega_resenha.md); legenda automática,
 *   conferir no vídeo.
 * - `origem: 'autoral'`: lista própria, de palavras concretas que dá para sugerir com dicas de uma palavra só.
 */
export interface MegaResenhaWord {
  palavra: string;
  categoria: string;
  origem: 'programa' | 'autoral';
}

const w = (categoria: string, origem: MegaResenhaWord['origem'], palavras: string[]): MegaResenhaWord[] =>
  palavras.map((palavra) => ({ palavra, categoria, origem }));

export const MEGA_RESENHA_WORDS: MegaResenhaWord[] = [
  ...w('Do programa', 'programa', [
    'Artilheiro',
    'Arquibancada',
    'Faixa de pedestre',
    'Mictório',
    'Pluto',
    'Tornado',
    'Gambiarra',
    'Caravana',
    'Zagueiro',
    'Bagunça'
  ]),
  ...w('Futebol', 'autoral', [
    'Escanteio',
    'Goleiro',
    'Pênalti',
    'Impedimento',
    'Camisa 10',
    'Taça',
    'Chuteira',
    'Apito',
    'Vestiário',
    'Gandula',
    'Falta',
    'Prorrogação',
    'Torcedor',
    'Técnico',
    'Lateral',
    'Meio-campo',
    'Cartão amarelo',
    'Bandeirinha',
    'Estádio',
    'Campeonato'
  ]),
  ...w('Esportes', 'autoral', [
    'Maratona',
    'Natação',
    'Raquete',
    'Cesta',
    'Pódio',
    'Medalha',
    'Ginástica',
    'Surfe',
    'Boxe',
    'Ciclismo',
    'Salto',
    'Largada',
    'Olimpíada',
    'Remo',
    'Skate'
  ]),
  ...w('Casa e objetos', 'autoral', [
    'Geladeira',
    'Travesseiro',
    'Escada',
    'Guarda-roupa',
    'Chuveiro',
    'Espelho',
    'Vassoura',
    'Controle remoto',
    'Cortina',
    'Lanterna',
    'Maçaneta',
    'Panela',
    'Tomada',
    'Relógio',
    'Almofada'
  ]),
  ...w('Comidas e bebidas', 'autoral', [
    'Feijoada',
    'Brigadeiro',
    'Churrasco',
    'Pão de queijo',
    'Pizza',
    'Sorvete',
    'Cafezinho',
    'Coxinha',
    'Pipoca',
    'Hambúrguer',
    'Macarrão',
    'Tapioca',
    'Açaí',
    'Caipirinha',
    'Pastel'
  ]),
  ...w('Animais', 'autoral', [
    'Tubarão',
    'Papagaio',
    'Onça',
    'Jacaré',
    'Morcego',
    'Pinguim',
    'Cavalo-marinho',
    'Aranha',
    'Elefante',
    'Camelo',
    'Baleia',
    'Formiga',
    'Tucano',
    'Capivara',
    'Tatu'
  ]),
  ...w('Brasil', 'autoral', [
    'Carnaval',
    'Feriado',
    'Amazônia',
    'Maracanã',
    'Capoeira',
    'Festa junina',
    'Favela',
    'Sertão',
    'Pelourinho',
    'Cristo Redentor',
    'Pantanal',
    'Cachaça',
    'Forró',
    'Samba',
    'Sanfona'
  ]),
  ...w('Cultura pop', 'autoral', [
    'Super-herói',
    'Vilão',
    'Pirata',
    'Dinossauro',
    'Vampiro',
    'Robô',
    'Astronauta',
    'Princesa',
    'Detetive',
    'Zumbi',
    'Fantasma',
    'Mágico',
    'Cowboy',
    'Ninja',
    'Dragão'
  ]),
  ...w('Lugares', 'autoral', [
    'Aeroporto',
    'Rodoviária',
    'Hospital',
    'Cemitério',
    'Biblioteca',
    'Padaria',
    'Farmácia',
    'Shopping',
    'Escola',
    'Cinema',
    'Praça',
    'Estacionamento',
    'Elevador',
    'Piscina',
    'Delegacia'
  ]),
  ...w('Profissões', 'autoral', [
    'Bombeiro',
    'Carteiro',
    'Padeiro',
    'Piloto',
    'Juiz',
    'Marceneiro',
    'Faxineiro',
    'Vendedor',
    'Motoboy',
    'Garçom',
    'Cabeleireiro',
    'Jornalista',
    'Pedreiro',
    'Cozinheiro',
    'Dentista'
  ]),
  ...w('Cotidiano', 'autoral', [
    'Engarrafamento',
    'Segunda-feira',
    'Despertador',
    'Fila',
    'Aniversário',
    'Reunião',
    'Mudança',
    'Churrasqueira',
    'Vizinho',
    'Boleto',
    'Fofoca',
    'Resenha',
    'Cochilo',
    'Preguiça',
    'Barulho'
  ])
];

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const normalizeMegaWord = norm;

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia `count` palavras diferentes (ainda nao usadas), de categorias variadas. */
export function drawMegaResenhaWords(
  count: number,
  used: Set<string> = new Set(),
  rng: () => number = Math.random
): MegaResenhaWord[] {
  let pool = MEGA_RESENHA_WORDS.filter((m) => !used.has(norm(m.palavra)));
  if (pool.length < count) pool = [...MEGA_RESENHA_WORDS];
  const shuffled = shuffle(pool, rng);
  const picked: MegaResenhaWord[] = [];
  const cats = new Set<string>();
  for (const m of shuffled) {
    if (picked.length >= count) break;
    if (!cats.has(m.categoria)) {
      picked.push(m);
      cats.add(m.categoria);
    }
  }
  for (const m of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(m)) picked.push(m);
  }
  return picked;
}
