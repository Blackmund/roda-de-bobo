/**
 * Utilitário de Normalização e Correspondência Fuzzy (Tolerância a Erros de Digitação)
 * Projetado para os jogos "Tem ou Não Tem", "Proibido" e "Duvido".
 *
 * Tolera erros comuns de digitação em português brasileiro:
 * - Variações fonéticas (ex: "bicicreta" -> "bicicleta", "einsteim" -> "einstein")
 * - Erros de 1 a 3 letras para palavras médias e longas (ex: "spiber" -> "spielberg")
 * - Remoção completa de acentos, pontuações e caixa alta/baixa
 * - Correspondência por token ou substring para nomes compostos ("albert einstein" <-> "einstein")
 */

/**
 * Normaliza uma string removendo diacríticos, pontuação e espaços redundantes.
 */
export function normalizeFuzzyString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // substitui pontuações por espaço
    .replace(/\s+/g, ' ') // colapsa múltiplos espaços
    .trim();
}

/**
 * Normalização fonética leve em PT-BR para aproximar sons equivalentes:
 * - "bicicreta" -> substituição de clusters consonantais r/l (cr -> cl)
 * - "einsteim" -> terminal 'm' vira 'n'
 * - "ph" -> "f", "y" -> "i", "ç" -> "s", "ch" -> "x", "z" no final -> "s"
 * - consoantes duplas reduzidas para simples
 */
export function normalizePhoneticPT(str: string): string {
  let s = normalizeFuzzyString(str);
  if (!s) return '';

  // Redução de consoantes duplas (ex: "ss" -> "s", "rr" -> "r", "ll" -> "l", "tt" -> "t")
  s = s.replace(/([b-df-hj-np-tv-z])\1+/g, '$1');

  // Grafias fonéticas comuns
  s = s.replace(/ph/g, 'f');
  s = s.replace(/y/g, 'i');
  s = s.replace(/w/g, 'v');
  s = s.replace(/ç/g, 's');
  s = s.replace(/ch/g, 'x');

  // Troca comum em PT-BR popular entre r e l em encontros consonantais:
  // "bicicreta" -> "bicicleta", "framengo" -> "flamengo", "chicrete" -> "chiclete", "crube" -> "clube"
  s = s.replace(/([bcdfgpt])r([aeiou])/g, '$1l$2');

  // Letra 'm' e 'n' no final de palavras (ex: "einsteim" -> "einstein", "jardim" -> "jardin")
  s = s.replace(/m\b/g, 'n');

  // Letra 'z' no final de palavras soa como 's' (ex: "dez" -> "des")
  s = s.replace(/z\b/g, 's');

  return s;
}

/**
 * Calcula a distância de Levenshtein (número mínimo de edições: inserções, deleções ou substituições)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row: number[] = [];
  for (let j = 0; j <= b.length; j++) {
    row[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Define o limite máximo de distância de Levenshtein tolerado com base no comprimento da palavra:
 * - Palavras muito curtas (<= 3 letras): 0 (apenas exato, evita falsos positivos como "sol" e "sal")
 * - Palavras curtas (4 a 5 letras): 0 erros (REG-10: com 1 erro "praia" casava com "praça" e pontuava errado;
 *   plural/variações curtas continuam aceitos pela regra de substring)
 * - Palavras médias (6 a 8 letras): até 2 erros (ex: "abacaxi" -> "abacxi", "bicicreta" -> "bicicleta")
 * - Palavras longas (>= 9 letras): até 3 erros (ex: "spiber" -> "spielberg", "schwarzenegger")
 */
export function maxAllowedDistance(length: number): number {
  if (length <= 5) return 0;
  if (length <= 8) return 2;
  return 3;
}

/**
 * Compara dois termos individuais e determina se são suficientemente parecidos.
 */
function isSingleTermMatch(input: string, target: string): boolean {
  if (!input || !target) return false;
  if (input === target) return true;

  // Substring direta se o trecho tiver tamanho representativo (>= 4 caracteres; 3 gerava falsos positivos como "pra" em "praca")
  if (input.length >= 4 && target.includes(input)) return true;
  if (target.length >= 4 && input.includes(target)) return true;

  // Levenshtein direto
  const maxDist = maxAllowedDistance(Math.max(input.length, target.length));
  const dist = levenshteinDistance(input, target);
  if (dist <= maxDist) return true;

  // Levenshtein com normalização fonética PT-BR
  const phonInput = normalizePhoneticPT(input);
  const phonTarget = normalizePhoneticPT(target);
  if (phonInput === phonTarget) return true;

  const phonDist = levenshteinDistance(phonInput, phonTarget);
  const phonMaxDist = maxAllowedDistance(Math.max(phonInput.length, phonTarget.length));
  if (phonDist <= phonMaxDist) return true;

  return false;
}

/**
 * Verifica se o palpite do jogador corresponde ao item esperado ou a qualquer um de seus sinônimos.
 *
 * @param rawInput Texto digitado ou falado pelo jogador
 * @param itemText Texto oficial da resposta no painel
 * @param synonyms Lista de sinônimos aceitos configurados para o item
 * @returns boolean indicando se houve correspondência com tolerância a erros
 */
export function checkAnswerFuzzyMatch(
  rawInput: string,
  itemText: string,
  synonyms: string[] = []
): boolean {
  const inputNorm = normalizeFuzzyString(rawInput);
  if (!inputNorm) return false;

  const candidates = [itemText, ...(synonyms || [])];

  for (const candidate of candidates) {
    const candNorm = normalizeFuzzyString(candidate);
    if (!candNorm) continue;

    // 1. Igualdade exata
    if (inputNorm === candNorm) return true;

    // 2. Substring direta completa
    if (
      (inputNorm.length >= 4 && candNorm.includes(inputNorm)) ||
      (candNorm.length >= 4 && inputNorm.includes(candNorm))
    ) {
      return true;
    }

    // 3. Comparação direta com distância de Levenshtein / Fonética
    if (isSingleTermMatch(inputNorm, candNorm)) {
      return true;
    }

    // 4. Comparação por tokens / palavras (para nomes próprios compostos como "Albert Einstein", "Steven Spielberg")
    const inputWords = inputNorm.split(' ').filter((w) => w.length >= 3);
    const candWords = candNorm.split(' ').filter((w) => w.length >= 3);

    // Se o usuário digitou uma única palavra e ela casa com qualquer palavra significativa do alvo (ex: "einsteim" em "albert einstein")
    if (inputWords.length === 1 && candWords.length > 1) {
      for (const cw of candWords) {
        if (isSingleTermMatch(inputWords[0], cw)) {
          return true;
        }
      }
    }

    // Se o alvo tem 1 palavra e o usuário digitou várias (ex: digitou "albert einstein" e o alvo é só "einstein")
    if (candWords.length === 1 && inputWords.length > 1) {
      for (const iw of inputWords) {
        if (isSingleTermMatch(iw, candWords[0])) {
          return true;
        }
      }
    }

    // Se ambos têm múltiplas palavras, verificar se as palavras chave conferem
    if (inputWords.length > 1 && candWords.length > 1) {
      let matchedCount = 0;
      for (const iw of inputWords) {
        if (candWords.some((cw) => isSingleTermMatch(iw, cw))) {
          matchedCount++;
        }
      }
      if (matchedCount >= Math.min(inputWords.length, candWords.length)) {
        return true;
      }
    }
  }

  return false;
}
