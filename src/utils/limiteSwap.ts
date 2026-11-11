/**
 * REG-05: a carta Reverse (troca) do Limite troca os palpites de DOIS jogadores escolhidos.
 * `candidateIds` vem ordenado (os outros jogadores primeiro, o dono da carta por ultimo), de modo que o
 * padrao seja trocar dois adversarios. A troca so e valida com dois jogadores distintos.
 */
export interface SwapPair {
  player1: string;
  player2: string;
}

export function resolveSwapPair(candidateIds: string[], pick1?: string, pick2?: string): SwapPair | null {
  const unique = Array.from(new Set(candidateIds));
  if (unique.length < 2) return null;
  const first = pick1 && unique.includes(pick1) ? pick1 : unique[0];
  const second = pick2 && unique.includes(pick2) && pick2 !== first ? pick2 : unique.find((id) => id !== first);
  if (!second || second === first) return null;
  return { player1: first, player2: second };
}
