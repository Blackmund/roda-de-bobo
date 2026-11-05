/**
 * Pure Game Logic & Mathematical Engine for "PERGUNTAS E VERDADES"
 * Inspired by "Questions and Truth" (The Devil's Plan: Death Room Finale)
 * "Roda de Bobo" Party Games Edition
 */

export type PevSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds';

export interface PevSecretCard {
  position: number; // 1 to 8 (left to right)
  rank: number; // 1 (Ás) to 13 (Rei/K)
  suit: PevSuit;
  revealedOnTv: boolean;
}

export type PevQuestionCategory = 'SOMA' | 'CONTAGEM' | 'POSIÇÃO';

export interface PevQuestionParams {
  positions?: [number, number, number]; // For #1 (1 to 8)
  parity?: 'even' | 'odd' | 'both'; // For #5
  rank?: number; // For #7 (1 to 13)
  suit?: PevSuit; // For #8
}

export interface PevOfficialQuestionDef {
  id: number; // 1 to 11
  category: PevQuestionCategory;
  shortTitle: string;
  templateText: string;
  needsPositionsSelector?: boolean;
  needsRankSelector?: boolean;
  needsSuitSelector?: boolean;
  needsParitySelector?: boolean;
}

export const SUIT_META: Record<
  PevSuit,
  { symbol: string; label: string; shortLabel: string; colorClass: string; isRed: boolean }
> = {
  spades: {
    symbol: '♠️',
    label: '♠️ Espadas',
    shortLabel: 'Espadas',
    colorClass: 'text-cyan-300',
    isRed: false
  },
  hearts: {
    symbol: '❤️',
    label: '❤️ Copas',
    shortLabel: 'Copas',
    colorClass: 'text-rose-400',
    isRed: true
  },
  clubs: {
    symbol: '♣️',
    label: '♣️ Paus',
    shortLabel: 'Paus',
    colorClass: 'text-emerald-300',
    isRed: false
  },
  diamonds: {
    symbol: '♦️',
    label: '♦️ Ouros',
    shortLabel: 'Ouros',
    colorClass: 'text-amber-300',
    isRed: true
  }
};

export const ALL_SUITS: PevSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const ALL_RANKS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function formatRankLabel(rank: number): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

export function formatRankFullName(rank: number): string {
  switch (rank) {
    case 1:
      return 'Ás (1)';
    case 11:
      return 'Valete / J (11)';
    case 12:
      return 'Dama / Q (12)';
    case 13:
      return 'Rei / K (13)';
    default:
      return `${rank}`;
  }
}

export const OFFICIAL_PEV_QUESTIONS: PevOfficialQuestionDef[] = [
  // [SOMA]
  {
    id: 1,
    category: 'SOMA',
    shortTitle: '#1 Soma de 3 Posições',
    templateText: 'Qual é a soma das cartas nas posições [X, Y, Z]?',
    needsPositionsSelector: true
  },
  {
    id: 2,
    category: 'SOMA',
    shortTitle: '#2 Soma Total das Cartas',
    templateText: 'Qual é a soma de todas as 8 cartas?'
  },
  {
    id: 3,
    category: 'SOMA',
    shortTitle: '#3 Soma de Letras (J, Q, K)',
    templateText: 'Qual é a soma das cartas de letra (Valete=11, Dama=12, Rei=13)?'
  },
  {
    id: 4,
    category: 'SOMA',
    shortTitle: '#4 Soma de Numéricas (Ás a 10)',
    templateText: 'Qual é a soma das cartas numéricas (Ás=1 a 10)?'
  },
  // [CONTAGEM]
  {
    id: 5,
    category: 'CONTAGEM',
    shortTitle: '#5 Contagem de Pares / Ímpares',
    templateText: 'Quantas cartas pares (ou ímpares) existem?',
    needsParitySelector: true
  },
  {
    id: 6,
    category: 'CONTAGEM',
    shortTitle: '#6 Contagem de Letras (J, Q, K)',
    templateText: 'Quantas cartas de letra (J=11, Q=12, K=13) existem?'
  },
  {
    id: 7,
    category: 'CONTAGEM',
    shortTitle: '#7 Contagem de Carta Específica',
    templateText: 'Quantas cartas de valor [Ás a K] existem?',
    needsRankSelector: true
  },
  // [POSIÇÃO]
  {
    id: 8,
    category: 'POSIÇÃO',
    shortTitle: '#8 Posição por Naipe',
    templateText: 'Em quais posições estão as cartas do naipe [♠️/❤️/♣️/♦️]?',
    needsSuitSelector: true
  },
  {
    id: 9,
    category: 'POSIÇÃO',
    shortTitle: '#9 Posições de Consecutivas',
    templateText: 'Em quais posições existem cartas de números consecutivos lado a lado?'
  },
  {
    id: 10,
    category: 'POSIÇÃO',
    shortTitle: '#10 Posições de Números Iguais',
    templateText: 'Em quais posições existem cartas de mesmo número (valor repetido)?'
  },
  {
    id: 11,
    category: 'POSIÇÃO',
    shortTitle: '#11 Posição da Maior e Menor Carta',
    templateText: 'Em qual posição está a sua menor carta e em qual posição está a sua maior carta?'
  }
];

/**
 * Formats the dynamic full question text for the TV spotlight banner and logs.
 */
export function formatDynamicQuestionText(
  questionId: number,
  params: PevQuestionParams = {}
): string {
  switch (questionId) {
    case 1: {
      const pos = params.positions && params.positions.length === 3
        ? [...params.positions].sort((a, b) => a - b)
        : [1, 2, 3];
      return `Qual é a soma das cartas nas posições ${pos[0]}ª, ${pos[1]}ª e ${pos[2]}ª?`;
    }
    case 2:
      return 'Qual é a soma total de todas as 8 cartas?';
    case 3:
      return 'Qual é a soma das cartas de letra (Valete=11, Dama=12, Rei=13)?';
    case 4:
      return 'Qual é a soma das cartas numéricas (Ás=1 a 10)?';
    case 5: {
      if (params.parity === 'even') return 'Quantas cartas PARES existem nas 8 posições?';
      if (params.parity === 'odd') return 'Quantas cartas ÍMPARES existem nas 8 posições?';
      return 'Quantas cartas pares e quantas cartas ímpares existem?';
    }
    case 6:
      return 'Quantas cartas de letra (J=11, Q=12, K=13) existem?';
    case 7: {
      const rk = params.rank ?? 1;
      return `Quantas cartas de valor ${formatRankFullName(rk)} existem?`;
    }
    case 8: {
      const st = params.suit ?? 'spades';
      return `Em quais posições estão as cartas do naipe ${SUIT_META[st].label}?`;
    }
    case 9:
      return 'Em quais posições existem cartas de números consecutivos lado a lado?';
    case 10:
      return 'Em quais posições existem cartas de mesmo número (valor repetido)?';
    case 11:
      return 'Em qual posição está a sua menor carta e em qual posição está a sua maior carta?';
    default:
      return 'Pergunta oficial selecionada';
  }
}

export interface SameSuitValidationResult {
  valid: boolean;
  violations: Array<{
    suit: PevSuit;
    posA: number;
    rankA: number;
    posB: number;
    rankB: number;
  }>;
  errorMessage?: string;
}

/**
 * Validates that a player's 8 cards:
 * 1. Contain exactly 8 cards in positions 1..8
 * 2. Have no duplicate (suit + rank)
 * 3. Strictly obey the official rule: cards of the SAME suit must be in strictly ascending order
 *    from left to right (1st to 8th position). Different suits can interleave freely.
 */
export function validateSameSuitAscendingOrder(cards: PevSecretCard[]): SameSuitValidationResult {
  if (!Array.isArray(cards) || cards.length !== 8) {
    return {
      valid: false,
      violations: [],
      errorMessage: 'Você precisa selecionar exatamente 8 cartas (posições 1ª a 8ª).'
    };
  }

  const ordered = [...cards].sort((a, b) => a.position - b.position);
  const seenKeys = new Set<string>();
  for (const c of ordered) {
    const key = `${c.suit}-${c.rank}`;
    if (seenKeys.has(key)) {
      return {
        valid: false,
        violations: [],
        errorMessage: `Carta duplicada detectada: ${formatRankLabel(c.rank)}${SUIT_META[c.suit].symbol}. Um baralho de 52 cartas não possui cartas repetidas do mesmo naipe.`
      };
    }
    seenKeys.add(key);
  }

  const violations: SameSuitValidationResult['violations'] = [];
  const lastSeenBySuit = new Map<PevSuit, { position: number; rank: number }>();

  for (const card of ordered) {
    const prev = lastSeenBySuit.get(card.suit);
    if (prev && card.rank <= prev.rank) {
      violations.push({
        suit: card.suit,
        posA: prev.position,
        rankA: prev.rank,
        posB: card.position,
        rankB: card.rank
      });
    }
    lastSeenBySuit.set(card.suit, { position: card.position, rank: card.rank });
  }

  if (violations.length > 0) {
    const v = violations[0];
    const suitLabel = SUIT_META[v.suit].label;
    return {
      valid: false,
      violations,
      errorMessage: `Regra violada no naipe ${suitLabel}: a ${v.posA}ª posição (${formatRankLabel(v.rankA)}) deve ser menor que a ${v.posB}ª posição (${formatRankLabel(v.rankB)}). Cartas do mesmo naipe precisam estar em ordem crescente da esquerda para a direita!`
    };
  }

  return { valid: true, violations: [] };
}

/**
 * Automatically sorts cards of the SAME suit in ascending order from left to right
 * while preserving the suit assigned to each position (1..8).
 */
export function autoSortSameSuitCards(cards: PevSecretCard[]): PevSecretCard[] {
  const ordered = [...cards]
    .sort((a, b) => a.position - b.position)
    .map((c, idx) => ({ ...c, position: idx + 1 }));

  const ranksBySuit: Record<PevSuit, number[]> = {
    spades: [],
    hearts: [],
    clubs: [],
    diamonds: []
  };

  ordered.forEach((c) => {
    ranksBySuit[c.suit].push(c.rank);
  });

  // Sort each suit's ranks ascending and ensure strict uniqueness if needed
  ALL_SUITS.forEach((suit) => {
    ranksBySuit[suit].sort((a, b) => a - b);
  });

  const suitCounters: Record<PevSuit, number> = {
    spades: 0,
    hearts: 0,
    clubs: 0,
    diamonds: 0
  };

  return ordered.map((card, index) => {
    const nextRank = ranksBySuit[card.suit][suitCounters[card.suit]];
    suitCounters[card.suit] += 1;
    return {
      ...card,
      position: index + 1,
      rank: nextRank
    };
  });
}

/**
 * Deals 8 random cards from a 52-card deck and automatically sorts same-suit cards
 * in ascending order left-to-right so the hand is immediately valid.
 */
export function dealValidPlayerHand(usedKeys: Set<string> = new Set()): PevSecretCard[] {
  const available: Array<{ suit: PevSuit; rank: number }> = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      const key = `${suit}-${rank}`;
      if (!usedKeys.has(key)) {
        available.push({ suit, rank });
      }
    }
  }

  // Fisher-Yates shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = available[i];
    available[i] = available[j];
    available[j] = tmp;
  }

  const picked = available.slice(0, 8);
  picked.forEach((c) => usedKeys.add(`${c.suit}-${c.rank}`));

  const initialCards: PevSecretCard[] = picked.map((c, idx) => ({
    position: idx + 1,
    rank: c.rank,
    suit: c.suit,
    revealedOnTv: false
  }));

  return autoSortSameSuitCards(initialCards);
}

/**
 * Computes the low-token alert light state (`🚨 ALERTA ≤ 5 TOKENS`).
 * Official rule:
 * - Lights up (true) whenever the player drops to 5 tokens or fewer (`tokens <= 5`).
 * - Turns off automatically when the player returns to having more than 6 tokens (`tokens > 6`).
 * - At exactly 6 tokens, preserves previous state (`wasAlertActive`).
 */
export function computeLowTokenAlertState(tokens: number, wasAlertActive: boolean = false): boolean {
  if (tokens <= 5) return true;
  if (tokens > 6) return false;
  return wasAlertActive;
}

export interface TokenAuctionResolution {
  status: 'WINNER' | 'TIE';
  winnerPlayerId: string | null;
  tiedPlayerIds: string[];
  highBid: number;
  updatedTokens: Record<string, number>;
  updatedLowTokenAlerts: Record<string, boolean>;
  announcement: string;
}

/**
 * Resolves a secret token auction among the active players.
 * Official Tie Rule:
 * - If 2 or more players tie for the highest bid, the tied top bidders recover their bid
 *   AND receive +2 bonus tokens each, triggering a new auction round!
 * - If a single player has the highest bid, all players pay their bid (or winner pays their bid;
 *   in Questions & Truth, bids are spent and highest bidder wins the turn).
 */
export function resolveTokenAuction(
  playerTokens: Record<string, number>,
  bids: Record<string, number>,
  playerIds: string[],
  previousAlerts: Record<string, boolean> = {}
): TokenAuctionResolution {
  let maxBid = -1;
  playerIds.forEach((pid) => {
    const rawBid = Math.max(0, Math.min(playerTokens[pid] ?? 0, bids[pid] ?? 0));
    if (rawBid > maxBid) {
      maxBid = rawBid;
    }
  });

  const topBidders = playerIds.filter((pid) => {
    const rawBid = Math.max(0, Math.min(playerTokens[pid] ?? 0, bids[pid] ?? 0));
    return rawBid === maxBid;
  });

  const updatedTokens: Record<string, number> = { ...playerTokens };
  const updatedLowTokenAlerts: Record<string, boolean> = { ...previousAlerts };

  if (topBidders.length > 1) {
    // Official Tie Rule: tied top bidders recover their bid + receive +2 bonus tokens!
    topBidders.forEach((pid) => {
      updatedTokens[pid] = (playerTokens[pid] ?? 0) + 2;
    });
    playerIds.forEach((pid) => {
      updatedLowTokenAlerts[pid] = computeLowTokenAlertState(
        updatedTokens[pid] ?? 0,
        previousAlerts[pid] ?? false
      );
    });

    return {
      status: 'TIE',
      winnerPlayerId: null,
      tiedPlayerIds: topBidders,
      highBid: maxBid,
      updatedTokens,
      updatedLowTokenAlerts,
      announcement: `⚡ EMPATE NO LEILÃO (${maxBid} tokens)! Os jogadores empatados recuperam a aposta e ganham +2 TOKENS DE BÔNUS para desempatar!`
    };
  }

  const winnerId = topBidders[0] || playerIds[0];
  // Deduct the winning bid from the winner (and any committed bids from players)
  playerIds.forEach((pid) => {
    const rawBid = Math.max(0, Math.min(playerTokens[pid] ?? 0, bids[pid] ?? 0));
    if (pid === winnerId) {
      updatedTokens[pid] = Math.max(0, (playerTokens[pid] ?? 0) - rawBid);
    }
    updatedLowTokenAlerts[pid] = computeLowTokenAlertState(
      updatedTokens[pid] ?? 0,
      previousAlerts[pid] ?? false
    );
  });

  return {
    status: 'WINNER',
    winnerPlayerId: winnerId,
    tiedPlayerIds: [],
    highBid: maxBid,
    updatedTokens,
    updatedLowTokenAlerts,
    announcement: `🪙 Leilão encerrado! Vencedor do turno conquistou o direito de agir.`
  };
}

/**
 * Applies end-of-round +2 token recharge to all active players and updates the low-token alert LED.
 */
export function applyRoundEndTokenRecharge(
  playerTokens: Record<string, number>,
  playerIds: string[],
  previousAlerts: Record<string, boolean> = {},
  bonusPerRound: number = 2
): {
  updatedTokens: Record<string, number>;
  updatedLowTokenAlerts: Record<string, boolean>;
} {
  const updatedTokens: Record<string, number> = { ...playerTokens };
  const updatedLowTokenAlerts: Record<string, boolean> = { ...previousAlerts };

  playerIds.forEach((pid) => {
    const nextVal = (playerTokens[pid] ?? 0) + bonusPerRound;
    updatedTokens[pid] = nextVal;
    updatedLowTokenAlerts[pid] = computeLowTokenAlertState(nextVal, previousAlerts[pid] ?? false);
  });

  return { updatedTokens, updatedLowTokenAlerts };
}

/**
 * Automatically computes the exact mathematical answer for any of the 11 Official Questions
 * against a target player's 8 secret cards.
 */
export function computeOfficialQuestionAnswer(
  cards: PevSecretCard[],
  questionId: number,
  params: PevQuestionParams = {}
): {
  shortAnswer: string;
  detailedExplanation: string;
} {
  if (!Array.isArray(cards) || cards.length !== 8) {
    return {
      shortAnswer: 'Baralho físico (sem cartas digitais)',
      detailedExplanation: 'O jogador alvo está no modo 100% físico. Confira e responda em voz alta!'
    };
  }

  const ordered = [...cards].sort((a, b) => a.position - b.position);

  switch (questionId) {
    case 1: {
      const pos =
        params.positions && params.positions.length === 3
          ? [...params.positions].sort((a, b) => a - b)
          : [1, 2, 3];
      const selectedCards = pos
        .map((p) => ordered.find((c) => c.position === p))
        .filter((c): c is PevSecretCard => Boolean(c));
      const sum = selectedCards.reduce((acc, c) => acc + c.rank, 0);
      const breakdown = selectedCards
        .map((c) => `${c.position}ª (${formatRankLabel(c.rank)}=${c.rank})`)
        .join(' + ');
      return {
        shortAnswer: `${sum}`,
        detailedExplanation: `Soma das posições ${pos[0]}ª, ${pos[1]}ª e ${pos[2]}ª = ${sum} [${breakdown}]`
      };
    }

    case 2: {
      const total = ordered.reduce((acc, c) => acc + c.rank, 0);
      return {
        shortAnswer: `${total}`,
        detailedExplanation: `Soma total das 8 cartas = ${total}`
      };
    }

    case 3: {
      const faceCards = ordered.filter((c) => c.rank >= 11);
      const sum = faceCards.reduce((acc, c) => acc + c.rank, 0);
      return {
        shortAnswer: `${sum}`,
        detailedExplanation:
          faceCards.length > 0
            ? `Soma das cartas de letra (J=11, Q=12, K=13) = ${sum} (${faceCards.length} carta(s) de letra)`
            : '0 (Nenhuma carta de letra J, Q ou K na mão)'
      };
    }

    case 4: {
      const numCards = ordered.filter((c) => c.rank >= 1 && c.rank <= 10);
      const sum = numCards.reduce((acc, c) => acc + c.rank, 0);
      return {
        shortAnswer: `${sum}`,
        detailedExplanation: `Soma das cartas numéricas (Ás=1 a 10) = ${sum} (${numCards.length} carta(s) numérica(s))`
      };
    }

    case 5: {
      const evens = ordered.filter((c) => c.rank % 2 === 0).length;
      const odds = ordered.length - evens;
      if (params.parity === 'even') {
        return {
          shortAnswer: `${evens} pares`,
          detailedExplanation: `Existem ${evens} carta(s) PAR(ES) (e ${odds} ímpares).`
        };
      }
      if (params.parity === 'odd') {
        return {
          shortAnswer: `${odds} ímpares`,
          detailedExplanation: `Existem ${odds} carta(s) ÍMPAR(ES) (e ${evens} pares).`
        };
      }
      return {
        shortAnswer: `${evens} Pares / ${odds} Ímpares`,
        detailedExplanation: `Existem ${evens} carta(s) PARES e ${odds} carta(s) ÍMPARES.`
      };
    }

    case 6: {
      const faceCount = ordered.filter((c) => c.rank >= 11).length;
      return {
        shortAnswer: `${faceCount} carta(s) de letra`,
        detailedExplanation: `Existem ${faceCount} carta(s) de letra (J, Q ou K) nas 8 posições.`
      };
    }

    case 7: {
      const targetRank = params.rank ?? 1;
      const count = ordered.filter((c) => c.rank === targetRank).length;
      return {
        shortAnswer: `${count} carta(s)`,
        detailedExplanation: `Existem ${count} carta(s) de valor ${formatRankFullName(targetRank)}.`
      };
    }

    case 8: {
      const targetSuit = params.suit ?? 'spades';
      const matchingPositions = ordered
        .filter((c) => c.suit === targetSuit)
        .map((c) => `${c.position}ª`);
      const text =
        matchingPositions.length > 0
          ? `Posições: ${matchingPositions.join(', ')}`
          : 'Nenhuma posição (0 cartas desse naipe)';
      return {
        shortAnswer: text,
        detailedExplanation: `Cartas de ${SUIT_META[targetSuit].label}: ${text}`
      };
    }

    case 9: {
      // Consecutive numbers side-by-side (adjacent positions i and i+1 where |rank[i] - rank[i+1]| === 1)
      const pairs: string[] = [];
      for (let i = 0; i < ordered.length - 1; i++) {
        const a = ordered[i];
        const b = ordered[i + 1];
        if (Math.abs(a.rank - b.rank) === 1) {
          pairs.push(`${a.position}ª e ${b.position}ª`);
        }
      }
      const text =
        pairs.length > 0
          ? `Posições consecutivas: ${pairs.join(' | ')}`
          : 'Nenhuma carta consecutiva lado a lado';
      return {
        shortAnswer: text,
        detailedExplanation: text
      };
    }

    case 10: {
      // Repeated ranks positions
      const positionsByRank = new Map<number, number[]>();
      ordered.forEach((c) => {
        const list = positionsByRank.get(c.rank) || [];
        list.push(c.position);
        positionsByRank.set(c.rank, list);
      });

      const repeatedGroups: string[] = [];
      positionsByRank.forEach((posList) => {
        if (posList.length >= 2) {
          repeatedGroups.push(posList.map((p) => `${p}ª`).join(' e '));
        }
      });

      const text =
        repeatedGroups.length > 0
          ? `Iguais nas posições: ${repeatedGroups.join(' | ')}`
          : 'Nenhum número repetido nas 8 cartas';
      return {
        shortAnswer: text,
        detailedExplanation: text
      };
    }

    case 11: {
      const ranks = ordered.map((c) => c.rank);
      const minRank = Math.min(...ranks);
      const maxRank = Math.max(...ranks);
      const minPositions = ordered
        .filter((c) => c.rank === minRank)
        .map((c) => `${c.position}ª`)
        .join(', ');
      const maxPositions = ordered
        .filter((c) => c.rank === maxRank)
        .map((c) => `${c.position}ª`)
        .join(', ');

      return {
        shortAnswer: `Menor: ${minPositions} | Maior: ${maxPositions}`,
        detailedExplanation: `Menor carta na(s) posição(ões) ${minPositions}; Maior carta na(s) posição(ões) ${maxPositions}.`
      };
    }

    default:
      return {
        shortAnswer: '—',
        detailedExplanation: 'Selecione uma pergunta de #1 a #11.'
      };
  }
}

/**
 * Verifies a "Declaração da Verdade" (guessing all 8 card ranks from 1st to 8th position).
 * Suits do NOT need to be guessed — only the 8 numeric values (1..13).
 */
export function verifyTruthDeclaration(
  targetCards: PevSecretCard[],
  guessedRanks: number[]
): {
  correct: boolean;
  matchedCount: number;
} {
  if (!Array.isArray(targetCards) || targetCards.length !== 8 || !Array.isArray(guessedRanks) || guessedRanks.length !== 8) {
    return { correct: false, matchedCount: 0 };
  }

  const ordered = [...targetCards].sort((a, b) => a.position - b.position);
  let matchedCount = 0;
  for (let i = 0; i < 8; i++) {
    if (ordered[i].rank === Number(guessedRanks[i])) {
      matchedCount += 1;
    }
  }

  return {
    correct: matchedCount === 8,
    matchedCount
  };
}
