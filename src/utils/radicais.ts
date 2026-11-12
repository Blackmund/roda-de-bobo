/**
 * REG-06: apoio ao juiz do Proibido para a regra "proibido falar o radical das palavras proibidas ou da palavra-alvo".
 *
 * E uma AJUDA, nao um veredito: radical em portugues tem excecoes (no programa o diretor decidiu que "encobrir" nao e do
 * mesmo radical de "cobertura"). Por isso a checagem so avisa quando a palavra dita comeca com o radical de uma
 * palavra da carta (ou o contrario); o juiz decide e pode contestar a falta.
 */

export function normalizeWord(word: string): string {
  return String(word ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Radical aproximado: tira ~3 letras finais (plural, genero, sufixos comuns), mantendo no minimo 4 letras. */
export function stemOf(word: string): string {
  const w = normalizeWord(word);
  if (w.length <= 4) return w;
  return w.slice(0, Math.max(4, w.length - 3));
}

export interface RadicalHit {
  /** A palavra da carta (alvo ou proibida) com a qual a palavra dita parece dividir o radical. */
  cardWord: string;
  /** `identica`: e a propria palavra; `radical`: so compartilha o radical. */
  kind: 'identica' | 'radical';
}

/** Palavras da carta com as quais `spoken` parece dividir o radical (lista vazia = nada suspeito). */
export function checkSpokenWord(spoken: string, cardWords: string[]): RadicalHit[] {
  const s = normalizeWord(spoken);
  if (s.length < 3) return [];
  const hits: RadicalHit[] = [];
  for (const cw of cardWords) {
    const c = normalizeWord(cw);
    if (!c) continue;
    if (s === c) {
      hits.push({ cardWord: cw, kind: 'identica' });
      continue;
    }
    const sc = stemOf(c);
    const ss = stemOf(s);
    if (s.startsWith(sc) || c.startsWith(ss)) hits.push({ cardWord: cw, kind: 'radical' });
  }
  return hits;
}

/** Radicais (maiusculos, com hifen) das palavras da carta, para o juiz consultar. */
export function radicalList(cardWords: string[]): string[] {
  return cardWords
    .map((w) => {
      const n = normalizeWord(w);
      if (!n) return '';
      const st = stemOf(w);
      return st.toUpperCase() + (st.length < n.length ? '-' : '');
    })
    .filter(Boolean);
}
