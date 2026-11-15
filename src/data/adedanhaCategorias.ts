/**
 * Adedanha (Stop): categorias e letras.
 *
 * As categorias classicas sao as do Stop/Adedanha de papel; as tematicas e as "da resenha" puxam para o humor do programa.
 * As letras tem peso: as dificeis (K, W, Y, X, Q, Z) quase nao saem e podem ser excluidas na configuracao.
 */
export const ADEDANHA_CLASSICAS = [
  'Nome',
  'Animal',
  'Cor',
  'Fruta',
  'Cidade, estado ou país',
  'Objeto',
  'Marca',
  'Profissão',
  'Comida',
  'Filme ou série',
  'Parte do corpo',
  'Time de futebol'
];

export const ADEDANHA_TEMATICAS = [
  'Jogador de futebol',
  'Cantor ou banda',
  'Novela',
  'Personagem',
  'Coisa de casa',
  'Bebida',
  'Esporte',
  'Doença',
  'Instrumento musical',
  'Meio de transporte',
  'Coisa que tem na praia',
  'Coisa que tem no estádio'
];

export const ADEDANHA_RESENHA = [
  'Desculpa para faltar no trabalho',
  'Coisa que a mãe fala',
  'Apelido de amigo',
  'Motivo para terminar namoro',
  'Coisa que se perde em casa',
  'Palavrão leve'
];

export const ADEDANHA_TODAS = [...ADEDANHA_CLASSICAS, ...ADEDANHA_TEMATICAS, ...ADEDANHA_RESENHA];

/** Padrao do Stop: 7 categorias classicas. */
export const ADEDANHA_PADRAO = ['Nome', 'Animal', 'Cor', 'Fruta', 'Cidade, estado ou país', 'Objeto', 'Marca'];

/** Peso de cada letra (quanto maior, mais sai). As letras raras ficam quase fora. */
export const ADEDANHA_LETRAS: Record<string, number> = {
  A: 10, B: 9, C: 10, D: 8, E: 7, F: 8, G: 8, H: 4, I: 5, J: 6, K: 0.3, L: 8, M: 10,
  N: 6, O: 5, P: 10, Q: 1, R: 9, S: 10, T: 9, U: 3, V: 7, W: 0.3, X: 0.5, Y: 0.3, Z: 1.5
};

/** Letras que ficam de fora por padrao (dificeis demais para varias categorias). */
export const ADEDANHA_LETRAS_EXCLUIDAS_PADRAO = ['K', 'W', 'Y', 'X', 'Q'];
