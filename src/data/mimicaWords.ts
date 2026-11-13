/**
 * NOV-01: banco de palavras da Mímica.
 *
 * - `origem: 'programa'`: palavras vistas no programa (analise/perguntas/mimica.md); a confiança vem da
 *   transcrição automática e deve ser conferida no vídeo.
 * - `origem: 'autoral'`: lista própria do projeto, escrita para o formato (mímica de 3 palavras em 1min30).
 *   São palavras comuns, sem o objetivo de reproduzir o conteúdo exato do programa.
 */

import { relatedToAny } from '../utils/similarText';
export interface MimicaWord {
  palavra: string;
  categoria: string;
  dificuldade: 'facil' | 'medio' | 'dificil';
  origem: 'programa' | 'autoral';
}

const w = (
  categoria: string,
  dificuldade: MimicaWord['dificuldade'],
  origem: MimicaWord['origem'],
  palavras: string[]
): MimicaWord[] => palavras.map((palavra) => ({ palavra, categoria, dificuldade, origem }));

export const MIMICA_WORDS: MimicaWord[] = [
  // --- do programa (conferir no vídeo) ---
  ...w('Esportes & Futebol', 'medio', 'programa', [
    'Remo',
    'Pedalada',
    'Bandeirinha',
    'Escudo de time',
    'Mascote',
    'Ponto de saque'
  ]),
  ...w('Cultura Pop & Cinema', 'medio', 'programa', ['O Mágico de Oz', 'Mestre-sala e porta-bandeira']),
  ...w('Esportes & Futebol', 'dificil', 'programa', ['Pipocada']),

  // --- autorais ---
  ...w('Esportes & Futebol', 'facil', 'autoral', [
    'Gol de placa',
    'Cobrança de pênalti',
    'Goleiro',
    'Árbitro',
    'Cartão vermelho',
    'Torcida organizada',
    'Natação',
    'Salto com vara',
    'Surfe',
    'Skate',
    'Boxe',
    'Maratona',
    'Vôlei de praia',
    'Basquete',
    'Ginástica artística'
  ]),
  ...w('Esportes & Futebol', 'medio', 'autoral', [
    'Drible da vaca',
    'Bicicleta (jogada)',
    'Impedimento',
    'Escanteio',
    'Tiro com arco',
    'Esgrima',
    'Levantamento de peso',
    'Arremesso de martelo',
    'Corrida de obstáculos',
    'Tênis de mesa',
    'Golfe',
    'Judô',
    'Fórmula 1',
    'Cabeceio'
  ]),
  ...w('Cultura Pop & Cinema', 'facil', 'autoral', [
    'Super-herói voando',
    'Zumbi',
    'Vampiro',
    'Pirata',
    'Cowboy',
    'Rei Leão',
    'Homem-Aranha',
    'Titanic',
    'Tubarão (filme)',
    'Os Vingadores',
    'Chapeuzinho Vermelho',
    'Branca de Neve',
    'Cinderela',
    'Shrek'
  ]),
  ...w('Cultura Pop & Cinema', 'medio', 'autoral', [
    'Matrix',
    'Jurassic Park',
    'Harry Potter',
    'Star Wars',
    'Piratas do Caribe',
    'Procurando Nemo',
    'Rocky Balboa',
    'Indiana Jones',
    'De Volta para o Futuro',
    'Karatê Kid',
    'O Senhor dos Anéis',
    'Missão Impossível'
  ]),
  ...w('Música & Entretenimento', 'facil', 'autoral', [
    'Violão',
    'Bateria',
    'Guitarrista de rock',
    'Cantor de ópera',
    'DJ',
    'Show de karaokê',
    'Dança de quadrilha',
    'Samba',
    'Forró',
    'Funk',
    'Maestro',
    'Pianista',
    'Cantar no chuveiro'
  ]),
  ...w('Animais & Natureza', 'facil', 'autoral', [
    'Macaco',
    'Elefante',
    'Pinguim',
    'Cobra',
    'Cavalo',
    'Canguru',
    'Galinha',
    'Gato',
    'Coruja',
    'Caranguejo',
    'Girafa',
    'Tartaruga',
    'Urso',
    'Borboleta',
    'Sapo'
  ]),
  ...w('Animais & Natureza', 'medio', 'autoral', [
    'Preguiça',
    'Camaleão',
    'Pavão',
    'Polvo',
    'Golfinho',
    'Flamingo',
    'Tamanduá',
    'Louva-a-deus',
    'Lagosta',
    'Beija-flor'
  ]),
  ...w('Profissões', 'facil', 'autoral', [
    'Bombeiro',
    'Médico',
    'Cozinheiro',
    'Motorista',
    'Dentista',
    'Pintor de parede',
    'Professor',
    'Jardineiro',
    'Padeiro',
    'Garçom',
    'Cabeleireiro',
    'Fotógrafo',
    'Policial',
    'Pescador',
    'Lixeiro'
  ]),
  ...w('Profissões', 'medio', 'autoral', [
    'Astronauta',
    'Mágico',
    'Palhaço',
    'Mergulhador',
    'Cirurgião',
    'Domador de leão',
    'Equilibrista',
    'Piloto de avião',
    'Dublê de cinema',
    'Mecânico'
  ]),
  ...w('Casa & Objetos', 'facil', 'autoral', [
    'Escovar os dentes',
    'Liquidificador',
    'Aspirador de pó',
    'Ventilador',
    'Chuveiro',
    'Geladeira',
    'Guarda-chuva',
    'Martelo',
    'Telefone sem fio',
    'Despertador',
    'Tesoura',
    'Ferro de passar',
    'Máquina de lavar',
    'Pipa',
    'Bicicleta'
  ]),
  ...w('Casa & Objetos', 'medio', 'autoral', [
    'Abridor de lata',
    'Cafeteira',
    'Furadeira',
    'Gangorra',
    'Elevador',
    'Escada rolante',
    'Cortador de grama',
    'Triturador de alho',
    'Ioiô',
    'Cubo mágico'
  ]),
  ...w('Ações & Cotidiano', 'facil', 'autoral', [
    'Tomar banho gelado',
    'Fazer fila no banco',
    'Pegar ônibus lotado',
    'Perder o ônibus',
    'Tirar selfie',
    'Dar um espirro',
    'Passar vergonha',
    'Dormir em pé',
    'Procurar o celular',
    'Acordar atrasado',
    'Cozinhar e queimar a comida',
    'Dar bronca',
    'Fazer cócegas',
    'Pisar em chiclete'
  ]),
  ...w('Ações & Cotidiano', 'medio', 'autoral', [
    'Jogar videogame',
    'Montar barraca de camping',
    'Trocar pneu',
    'Fazer o primeiro encontro',
    'Pedir a conta no restaurante',
    'Fazer exercício na academia',
    'Passear com o cachorro',
    'Atravessar a rua com pressa',
    'Dançar valsa',
    'Dar à luz'
  ]),
  ...w('Brasil & Cultura', 'facil', 'autoral', [
    'Carnaval',
    'Capoeira',
    'Churrasco',
    'Festa junina',
    'Cristo Redentor',
    'Pão de Açúcar',
    'Cangaceiro',
    'Jangadeiro',
    'Saci-Pererê',
    'Boto cor-de-rosa',
    'Curupira',
    'Bumba meu boi'
  ]),
  ...w('Comidas & Bebidas', 'facil', 'autoral', [
    'Comer espaguete',
    'Tomar sorvete',
    'Fazer pipoca',
    'Descascar laranja',
    'Abrir coco',
    'Comer pimenta',
    'Cortar cebola',
    'Fazer pizza',
    'Tomar café quente',
    'Comer melancia'
  ]),
  ...w('Lugares & Viagem', 'facil', 'autoral', [
    'Aeroporto',
    'Parque de diversões',
    'Montanha-russa',
    'Praia',
    'Zoológico',
    'Cinema',
    'Hospital',
    'Circo',
    'Mercado',
    'Cachoeira'
  ]),
  ...w('Lugares & Viagem', 'medio', 'autoral', [
    'Pirâmide do Egito',
    'Torre Eiffel',
    'Estátua da Liberdade',
    'Muralha da China',
    'Coliseu',
    'Polo Norte',
    'Deserto',
    'Submarino'
  ]),
  ...w('Brincadeiras & Jogos', 'facil', 'autoral', [
    'Pega-pega',
    'Esconde-esconde',
    'Cabo de guerra',
    'Pular corda',
    'Amarelinha',
    'Soltar pipa',
    'Jogo da velha',
    'Dança das cadeiras',
    'Cabra-cega',
    'Bolinha de gude'
  ])
];

/** Sorteio simples e testável (rng injetável). */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface DrawMimicaOptions {
  /** palavras (em minúsculas, sem acento) já usadas nesta sessão: só se repetem quando o banco acaba */
  used?: Set<string>;
  rng?: () => number;
  difficulty?: 'facil' | 'medio' | 'dificil';
}

export const normalizeMimicaWord = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Sorteia `count` palavras diferentes, evitando as já usadas. Se o banco inteiro já foi usado, recomeça.
 * Também mistura categorias: no máximo 1 palavra por categoria enquanto houver categorias distintas sobrando.
 */
export function drawMimicaWords(count: number, options: DrawMimicaOptions = {}): MimicaWord[] {
  const rng = options.rng ?? Math.random;
  const used = options.used ?? new Set<string>();
  let pool = MIMICA_WORDS.filter(
    (m) => !used.has(normalizeMimicaWord(m.palavra)) && (!options.difficulty || m.dificuldade !== 'dificil' || options.difficulty === 'dificil')
  );
  if (pool.length < count) pool = [...MIMICA_WORDS];
  // prefere palavras que nao lembrem as ja usadas (mantem o banco todo se faltar opcao)
  const usedList = Array.from(used);
  const notNear = pool.filter((x) => !relatedToAny(x.palavra, usedList));
  if (notNear.length >= count * 2) pool = notNear;
  const shuffled = shuffle(pool, rng);
  const pickedTexts = (list: Array<{ palavra: string }>) => list.map((p) => p.palavra);
  const picked: MimicaWord[] = [];
  const cats = new Set<string>();
  for (const m of shuffled) {
    if (picked.length >= count) break;
    if (cats.has(m.categoria) && shuffled.some((o) => !cats.has(o.categoria) && !picked.includes(o))) continue;
    if (relatedToAny(m.palavra, pickedTexts(picked))) continue;
    picked.push(m);
    cats.add(m.categoria);
  }
  for (const m of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(m)) picked.push(m);
  }
  return picked;
}
