/**
 * NOV-07: palavras do Como eu pinto.
 *
 * Boas palavras são fáceis de DESENHAR sem escrever letras nem números (proibido no jogo): objetos, animais, lugares,
 * ações e símbolos do futebol. Palavra do piloto do programa: Benfica (águia); `origem: 'programa'` marca o que foi
 * citado no programa (analise/perguntas/perguntas.json). O resto é lista autoral.
 */

import { relatedToAny } from '../utils/similarText';
export interface DesenhoWord {
  palavra: string;
  categoria: string;
  origem: 'programa' | 'autoral';
}

const w = (categoria: string, origem: DesenhoWord['origem'], palavras: string[]): DesenhoWord[] =>
  palavras.map((palavra) => ({ palavra, categoria, origem }));

export const DESENHO_WORDS: DesenhoWord[] = [
  ...w('Do programa', 'programa', ['Benfica']),
  ...w('Futebol', 'autoral', [
    'Chuteira',
    'Apito do árbitro',
    'Goleiro',
    'Taça',
    'Bandeirinha',
    'Rede do gol',
    'Cartão vermelho',
    'Escanteio',
    'Estádio',
    'Torcida',
    'Camisa 10',
    'Bola murcha',
    'Pênalti',
    'Drible'
  ]),
  ...w('Animais', 'autoral', [
    'Águia',
    'Tubarão',
    'Elefante',
    'Girafa',
    'Pinguim',
    'Tartaruga',
    'Coruja',
    'Caranguejo',
    'Cobra',
    'Borboleta',
    'Polvo',
    'Macaco',
    'Cavalo',
    'Camelo',
    'Morcego',
    'Galinha',
    'Jacaré',
    'Papagaio'
  ]),
  ...w('Objetos', 'autoral', [
    'Guarda-chuva',
    'Óculos',
    'Bicicleta',
    'Avião',
    'Violão',
    'Relógio',
    'Chave',
    'Escada',
    'Tesoura',
    'Telefone',
    'Lanterna',
    'Cadeira',
    'Vassoura',
    'Barco',
    'Foguete',
    'Câmera',
    'Martelo',
    'Geladeira',
    'Chapéu',
    'Mala'
  ]),
  ...w('Comidas', 'autoral', [
    'Pizza',
    'Sorvete',
    'Hambúrguer',
    'Melancia',
    'Cenoura',
    'Bolo de aniversário',
    'Espaguete',
    'Pipoca',
    'Banana',
    'Ovo frito',
    'Sanduíche',
    'Abacaxi'
  ]),
  ...w('Lugares e natureza', 'autoral', [
    'Praia',
    'Vulcão',
    'Montanha',
    'Cachoeira',
    'Castelo',
    'Farol',
    'Ponte',
    'Pirâmide',
    'Cristo Redentor',
    'Torre Eiffel',
    'Deserto',
    'Arco-íris',
    'Ilha deserta',
    'Igreja'
  ]),
  ...w('Ações', 'autoral', [
    'Pescar',
    'Dormir',
    'Nadar',
    'Pular corda',
    'Escovar os dentes',
    'Tomar banho',
    'Soltar pipa',
    'Andar de skate',
    'Cozinhar',
    'Dirigir',
    'Plantar uma árvore',
    'Tirar foto'
  ]),
  ...w('Personagens', 'autoral', [
    'Pirata',
    'Palhaço',
    'Fantasma',
    'Robô',
    'Bruxa',
    'Astronauta',
    'Vampiro',
    'Rei',
    'Super-herói',
    'Papai Noel',
    'Sereia',
    'Dragão'
  ]),
  ...w('Brasil', 'autoral', [
    'Carnaval',
    'Samba',
    'Churrasco',
    'Jangada',
    'Berimbau',
    'Cuíca',
    'Bandeira do Brasil',
    'Onça-pintada',
    'Tucano',
    'Festa junina',
    'Capoeira'
  ])
];

export const normalizeDesenhoWord = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia `count` palavras diferentes (ainda nao usadas), de categorias variadas. */
export function drawDesenhoWords(count: number, used: Set<string> = new Set(), rng: () => number = Math.random): DesenhoWord[] {
  let pool = DESENHO_WORDS.filter((x) => !used.has(normalizeDesenhoWord(x.palavra)));
  if (pool.length < count) pool = [...DESENHO_WORDS];
  // prefere palavras que nao lembrem as ja usadas (mantem o banco todo se faltar opcao)
  const usedList = Array.from(used);
  const notNear = pool.filter((x) => !relatedToAny(x.palavra, usedList));
  if (notNear.length >= count * 2) pool = notNear;
  const shuffled = shuffle(pool, rng);
  const pickedTexts = (list: Array<{ palavra: string }>) => list.map((p) => p.palavra);
  const picked: DesenhoWord[] = [];
  const cats = new Set<string>();
  for (const x of shuffled) {
    if (picked.length >= count) break;
    if (!cats.has(x.categoria) && !relatedToAny(x.palavra, pickedTexts(picked))) {
      picked.push(x);
      cats.add(x.categoria);
    }
  }
  for (const x of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(x) && !relatedToAny(x.palavra, pickedTexts(picked))) picked.push(x);
  }
  for (const x of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(x)) picked.push(x);
  }
  return picked;
}
