/**
 * Official Game Engine & Pure Mathematical/Logical Rules for:
 * "PERGUNTAS E VERDADES" (Questions and Truth — O Jogo do Diabo: Death Room)
 */

export type PVSuit = 'spades' | 'hearts' | 'clubs' | 'diamonds';
export type PVCardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface PVCard {
  id: string;
  value: number; // 1 (Ás) to 13 (Rei)
  suit: PVSuit;
  label: string; // 'A', '2'..'10', 'J', 'Q', 'K'
}

export type PVQuestionCategory = 'SOMA' | 'CONTAGEM' | 'POSICAO' | 'POSIÇÃO';

export interface PVQuestionParams {
  positions?: number[]; // 1-based positions [1..8] for Question #1
  positions1Based?: number[]; // alias for Question #1
  targetValue?: number; // 1..13 for Question #7
  targetSuit?: PVSuit;  // suit for Question #8
  extremumMode?: 'ambos' | 'maior' | 'menor'; // for Question #11
}

export interface PVQuestionDefinition {
  id: number; // 1 to 11
  number: number; // 1 to 11
  category: PVQuestionCategory;
  shortTitle: string;
  shortLabel: string;
  templateText: string;
  fullTemplate: string;
  selectorType?: 'positions-3' | 'card-value' | 'suit' | 'NONE';
  needsPositions3?: boolean;
  needsCardValue?: boolean;
  needsSuit?: boolean;
}

export const SUIT_ORDER: PVSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];

export const PV_SUIT_META: Record<
  PVSuit,
  { symbol: string; name: string; label: string; colorClass: string; hex: string }
> = {
  spades: { symbol: '♠', name: 'Espadas', label: 'Espadas', colorClass: 'text-cyan-300', hex: '#00E5FF' },
  hearts: { symbol: '♥', name: 'Copas', label: 'Copas', colorClass: 'text-rose-400', hex: '#FF1E56' },
  clubs: { symbol: '♣', name: 'Paus', label: 'Paus', colorClass: 'text-emerald-300', hex: '#10B981' },
  diamonds: { symbol: '♦', name: 'Ouros', label: 'Ouros', colorClass: 'text-amber-300', hex: '#F59E0B' }
};

export const SUIT_META = PV_SUIT_META;

export const PV_VALUE_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K'
};

export const PV_VALUE_NAMES: Record<number, string> = {
  1: 'Ás (1)',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'Valete / J (11)',
  12: 'Dama / Q (12)',
  13: 'Rei / K (13)'
};

export const OFFICIAL_11_QUESTIONS: PVQuestionDefinition[] = [
  // [SOMA]
  {
    id: 1,
    number: 1,
    category: 'SOMA',
    shortTitle: '#1 Soma de 3 Posições',
    shortLabel: 'Soma de 3 Posições [X, Y, Z]',
    templateText: 'Qual é a soma das cartas nas posições [X, Y, Z]?',
    fullTemplate: 'Qual é a soma das cartas nas posições [X, Y, Z]?',
    selectorType: 'positions-3',
    needsPositions3: true
  },
  {
    id: 2,
    number: 2,
    category: 'SOMA',
    shortTitle: '#2 Soma Total das Cartas',
    shortLabel: 'Soma de todas as 8 cartas',
    templateText: 'Qual é a soma de todas as 8 cartas?',
    fullTemplate: 'Qual é a soma de todas as 8 cartas?',
    selectorType: 'NONE'
  },
  {
    id: 3,
    number: 3,
    category: 'SOMA',
    shortTitle: '#3 Soma de Letras (J, Q, K)',
    shortLabel: 'Soma das cartas de letra (J=11, Q=12, K=13)',
    templateText: 'Qual é a soma das cartas de letra (Valete=11, Dama=12, Rei=13)?',
    fullTemplate: 'Qual é a soma das cartas de letra (Valete=11, Dama=12, Rei=13)?',
    selectorType: 'NONE'
  },
  {
    id: 4,
    number: 4,
    category: 'SOMA',
    shortTitle: '#4 Soma de Numéricas (Ás a 10)',
    shortLabel: 'Soma das cartas numéricas (Ás=1 até 10)',
    templateText: 'Qual é a soma das cartas numéricas (Ás=1 até 10)?',
    fullTemplate: 'Qual é a soma das cartas numéricas (Ás=1 até 10)?',
    selectorType: 'NONE'
  },
  // [CONTAGEM]
  {
    id: 5,
    number: 5,
    category: 'CONTAGEM',
    shortTitle: '#5 Contagem de Letras',
    shortLabel: 'Quantas cartas de letra (J, Q, K) existem?',
    templateText: 'Quantas cartas de letra (Valete, Dama, Rei) existem?',
    fullTemplate: 'Quantas cartas de letra (Valete, Dama, Rei) existem?',
    selectorType: 'NONE'
  },
  {
    id: 6,
    number: 6,
    category: 'CONTAGEM',
    shortTitle: '#6 Contagem de Numéricas',
    shortLabel: 'Quantas cartas numéricas (Ás a 10) existem?',
    templateText: 'Quantas cartas numéricas (Ás a 10) existem?',
    fullTemplate: 'Quantas cartas numéricas (Ás a 10) existem?',
    selectorType: 'NONE'
  },
  {
    id: 7,
    number: 7,
    category: 'CONTAGEM',
    shortTitle: '#7 Contagem de Carta Específica',
    shortLabel: 'Quantas vezes a carta [Valor] aparece?',
    templateText: 'Quantas vezes a carta [número/letra específica] aparece?',
    fullTemplate: 'Quantas vezes a carta [número/letra específica] aparece?',
    selectorType: 'card-value',
    needsCardValue: true
  },
  // [POSIÇÃO]
  {
    id: 8,
    number: 8,
    category: 'POSICAO',
    shortTitle: '#8 Posição por Naipe',
    shortLabel: 'Em quais posições estão as cartas do naipe [Naipe]?',
    templateText: 'Em qual(is) posição(ões) está(ão) a(s) carta(s) do naipe [específico]?',
    fullTemplate: 'Em qual(is) posição(ões) está(ão) a(s) carta(s) do naipe [específico]?',
    selectorType: 'suit',
    needsSuit: true
  },
  {
    id: 9,
    number: 9,
    category: 'POSICAO',
    shortTitle: '#9 Posição de Repetidas',
    shortLabel: 'Posições das cartas com mesmo número/letra',
    templateText: 'Em qual(is) posição(ões) estão as cartas com o mesmo número/letra?',
    fullTemplate: 'Em qual(is) posição(ões) estão as cartas com o mesmo número/letra?',
    selectorType: 'NONE'
  },
  {
    id: 10,
    number: 10,
    category: 'POSICAO',
    shortTitle: '#10 Posição de Consecutivas',
    shortLabel: 'Posições das cartas com valores consecutivos',
    templateText: 'Em qual(is) posição(ões) estão as cartas com valores consecutivos?',
    fullTemplate: 'Em qual(is) posição(ões) estão as cartas com valores consecutivos?',
    selectorType: 'NONE'
  },
  {
    id: 11,
    number: 11,
    category: 'POSICAO',
    shortTitle: '#11 Posição Maior / Menor',
    shortLabel: 'Qual é a posição do maior ou do menor número?',
    templateText: 'Qual é a posição do maior número ou do menor número?',
    fullTemplate: 'Qual é a posição do maior número ou do menor número?',
    selectorType: 'NONE'
  }
];

export function getCardValueLabel(value: number): string {
  return PV_VALUE_LABELS[value] || String(value);
}

export function formatCardValueLabel(value: number): string {
  return getCardValueLabel(value);
}

/**
 * Generates a full 52-card standard deck (without Jokers).
 */
export function createFull52Deck(): PVCard[] {
  const suits: PVSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
  const deck: PVCard[] = [];
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      const label = getCardValueLabel(value);
      deck.push({
        id: `${suit}-${value}`,
        value,
        suit,
        label
      });
    }
  }
  return deck;
}

export interface SuitOrderViolation {
  suit: PVSuit;
  fromIndex: number; // 1-based position
  toIndex: number;   // 1-based position
  fromCard: PVCard;
  toCard: PVCard;
}

/**
 * Validates the core Devil's Plan rule:
 * "Cartas do mesmo naipe devem estar obrigatoriamente em ordem crescente da esquerda para a direita (Ás=1 ... Rei=13).
 *  Naipes diferentes podem se intercalar."
 */
export function validateSuitAscendingOrder(cards: PVCard[]): {
  valid: boolean;
  violations: SuitOrderViolation[];
  violatingIndices: number[];
  errorMessage?: string;
} {
  const violations: SuitOrderViolation[] = [];
  const violatingSet = new Set<number>();
  const lastSeenBySuit: Partial<Record<PVSuit, { index: number; card: PVCard }>> = {};

  cards.forEach((card, idx) => {
    if (!card) return;
    const pos = idx + 1;
    const prev = lastSeenBySuit[card.suit];
    if (prev && card.value <= prev.card.value) {
      violations.push({
        suit: card.suit,
        fromIndex: prev.index,
        toIndex: pos,
        fromCard: prev.card,
        toCard: card
      });
      violatingSet.add(prev.index - 1);
      violatingSet.add(idx);
    }
    lastSeenBySuit[card.suit] = { index: pos, card };
  });

  if (violations.length === 0) {
    return { valid: true, violations: [], violatingIndices: [] };
  }

  const first = violations[0];
  const suitName = PV_SUIT_META[first.suit].name;
  const suitSym = PV_SUIT_META[first.suit].symbol;
  const errorMessage = `Regra de Naipe violada em ${suitSym} ${suitName}: a carta ${first.toCard.label}${suitSym} (${first.toIndex}ª pos) deve ser maior que ${first.fromCard.label}${suitSym} (${first.fromIndex}ª pos).`;

  return {
    valid: false,
    violations,
    violatingIndices: Array.from(violatingSet),
    errorMessage
  };
}

/**
 * Automatically sorts cards of the same suit in ascending order from left to right,
 * keeping each suit in its current position slots.
 */
export function autoSortSameSuitCards(cards: PVCard[]): PVCard[] {
  const result = [...cards];
  const suits: PVSuit[] = ['spades', 'hearts', 'clubs', 'diamonds'];

  for (const suit of suits) {
    const indices: number[] = [];
    const suitCards: PVCard[] = [];
    result.forEach((c, idx) => {
      if (c && c.suit === suit) {
        indices.push(idx);
        suitCards.push(c);
      }
    });
    suitCards.sort((a, b) => a.value - b.value);
    indices.forEach((targetIdx, i) => {
      result[targetIdx] = suitCards[i];
    });
  }

  return result;
}

/**
 * Deals 8 random distinct cards from a 52-card deck and automatically sorts same-suit cards in ascending order.
 */
export function dealValidRandomHand(excludeCardIds: string[] = []): PVCard[] {
  const excluded = new Set(excludeCardIds);
  const available = createFull52Deck().filter((c) => !excluded.has(c.id));
  const pool = available.length >= 8 ? available : createFull52Deck();

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const hand = shuffled.slice(0, 8);
  return autoSortSameSuitCards(hand);
}

/**
 * Formats an official question with its dynamic parameters (#1 positions, #7 value, #8 suit) for the TV banner.
 */
export function formatOfficialQuestionText(
  questionId: number,
  params: PVQuestionParams = {}
): string {
  const def = OFFICIAL_11_QUESTIONS.find((q) => q.id === questionId);
  if (!def) return '';

  if (questionId === 1) {
    const rawPos = params.positions1Based || params.positions || [1, 2, 3];
    const pos = rawPos.slice(0, 3).sort((a, b) => a - b);
    const formattedPos = pos.map((p) => `${p}ª`).join(', ').replace(/, ([^,]*)$/, ' e $1');
    return `Qual é a soma das cartas nas posições ${formattedPos}?`;
  }

  if (questionId === 7) {
    const val = params.targetValue || 1;
    const label = PV_VALUE_NAMES[val] || String(val);
    return `Quantas vezes a carta ${label} aparece nas 8 posições?`;
  }

  if (questionId === 8) {
    const suit = params.targetSuit || 'hearts';
    const meta = PV_SUIT_META[suit];
    return `Em qual(is) posição(ões) está(ão) a(s) carta(s) do naipe de ${meta.symbol} ${meta.name}?`;
  }

  return def.templateText;
}

/**
 * Computes the exact mathematical/logical answer for any of the 11 Official Questions
 * given a player's 8-card hand.
 * Supports both (questionId, hand, params) and (hand, questionId, params).
 */
export function computeOfficialQuestionAnswer(
  firstArg: number | PVCard[],
  secondArg: PVCard[] | number,
  params: PVQuestionParams = {}
): { summary: string; summaryText: string; detail: string } {
  const questionId = typeof firstArg === 'number' ? firstArg : (secondArg as number);
  const hand = Array.isArray(firstArg) ? firstArg : (secondArg as PVCard[]);

  if (!hand || hand.length === 0) {
    const msg = 'Baralho físico (sem cartas registradas no app)';
    return {
      summary: msg,
      summaryText: msg,
      detail: 'Responda em voz alta conferindo suas 8 cartas na mesa.'
    };
  }

  const withSummary = (summary: string, detail: string) => ({
    summary,
    summaryText: `${summary} (${detail})`,
    detail
  });

  switch (questionId) {
    case 1: {
      const rawPos = params.positions1Based || params.positions || [1, 2, 3];
      const positions = rawPos.slice(0, 3).sort((a, b) => a - b);
      const picked = positions.map((pos) => hand[pos - 1]?.value || 0);
      const sum = picked.reduce((acc, v) => acc + v, 0);
      return withSummary(`SOMA = ${sum}`, `Resultado da soma das 3 posições selecionadas: ${sum}`);
    }

    case 2: {
      const sum = hand.reduce((acc, c) => acc + (c?.value || 0), 0);
      return withSummary(`SOMA TOTAL = ${sum}`, `Resultado da soma de todas as 8 cartas: ${sum}`);
    }

    case 3: {
      const letters = hand.filter((c) => c && c.value >= 11);
      const sum = letters.reduce((acc, c) => acc + c.value, 0);
      return withSummary(
        `SOMA DAS LETRAS = ${sum}`,
        letters.length > 0
          ? `Resultado da soma das cartas de letra (J, Q, K): ${sum}`
          : 'Nenhuma carta de letra (J, Q, K) na mão'
      );
    }

    case 4: {
      const numerics = hand.filter((c) => c && c.value <= 10);
      const sum = numerics.reduce((acc, c) => acc + c.value, 0);
      return withSummary(
        `SOMA DAS NUMÉRICAS = ${sum}`,
        numerics.length > 0
          ? `Resultado da soma das cartas numéricas (Ás..10): ${sum}`
          : 'Nenhuma carta numérica (Ás..10) na mão'
      );
    }

    case 5: {
      const count = hand.filter((c) => c && c.value >= 11).length;
      return withSummary(
        `TOTAL DE LETRAS = ${count}`,
        `Quantidade de cartas de letra (Valete, Dama, Rei): ${count}`
      );
    }

    case 6: {
      const count = hand.filter((c) => c && c.value <= 10).length;
      return withSummary(
        `TOTAL DE NUMÉRICAS = ${count}`,
        `Quantidade de cartas numéricas (Ás ate 10): ${count}`
      );
    }

    case 7: {
      const targetVal = params.targetValue || 1;
      const count = hand.filter((c) => c && c.value === targetVal).length;
      const label = getCardValueLabel(targetVal);
      return withSummary(
        `QUANTIDADE DA CARTA "${label}" = ${count}`,
        `A carta ${label} aparece ${count} ${count === 1 ? 'vez' : 'vezes'} nas 8 posições`
      );
    }

    case 8: {
      const suit = params.targetSuit || 'hearts';
      const meta = PV_SUIT_META[suit];
      const positions = hand
        .map((c, idx) => (c && c.suit === suit ? `${idx + 1}ª` : null))
        .filter(Boolean) as string[];
      return withSummary(
        positions.length > 0
          ? `POSIÇÕES DE ${meta.symbol} ${meta.name.toUpperCase()}: ${positions.join(', ')}`
          : `NENHUMA CARTA DE ${meta.symbol} ${meta.name.toUpperCase()}`,
        positions.length > 0
          ? `As cartas do naipe ${meta.symbol} ${meta.name} estão nas posições: ${positions.join(', ')}`
          : `Sem cartas do naipe ${meta.symbol} ${meta.name}`
      );
    }

    case 9: {
      const byValue = new Map<number, number[]>();
      hand.forEach((c, idx) => {
        if (!c) return;
        const list = byValue.get(c.value) || [];
        list.push(idx + 1);
        byValue.set(c.value, list);
      });
      const repeatedPosGroups: string[] = [];
      byValue.forEach((posList) => {
        if (posList.length >= 2) {
          repeatedPosGroups.push(`[${posList.map((p) => `${p}ª`).join(' e ')}]`);
        }
      });
      return withSummary(
        repeatedPosGroups.length > 0
          ? `POSIÇÕES COM CARTAS IGUAIS: ${repeatedPosGroups.join(', ')}`
          : 'NENHUMA CARTA REPETIDA',
        repeatedPosGroups.length > 0
          ? `Há cartas iguais agrupadas nas posições: ${repeatedPosGroups.join(', ')}`
          : 'Todas as 8 cartas possuem números/letras diferentes'
      );
    }

    case 10: {
      const runs: string[] = [];
      let i = 0;
      while (i < hand.length - 1) {
        if (hand[i] && hand[i + 1] && Math.abs(hand[i].value - hand[i + 1].value) === 1) {
          const runPositions = [i + 1, i + 2];
          const diff = hand[i + 1].value - hand[i].value;
          let j = i + 1;
          while (
            j < hand.length - 1 &&
            hand[j + 1] &&
            hand[j + 1].value - hand[j].value === diff
          ) {
            runPositions.push(j + 2);
            j++;
          }
          runs.push(`[${runPositions.map((p) => `${p}ª`).join(' e ')}]`);
          i = j + 1;
        } else {
          i++;
        }
      }
      return withSummary(
        runs.length > 0
          ? `POSIÇÕES CONSECUTIVAS: ${runs.join(', ')}`
          : 'NENHUMA CARTA CONSECUTIVA VIZINHA',
        runs.length > 0
          ? `Há valores consecutivos nas posições vizinhas: ${runs.join(', ')}`
          : 'Não há cartas vizinhas com números seguidos'
      );
    }

    case 11: {
      const values = hand.map((c) => c.value);
      const maxVal = Math.max(...values);
      const minVal = Math.min(...values);
      const maxPos = hand
        .map((c, idx) => (c.value === maxVal ? `${idx + 1}ª` : null))
        .filter(Boolean)
        .join(', ');
      const minPos = hand
        .map((c, idx) => (c.value === minVal ? `${idx + 1}ª` : null))
        .filter(Boolean)
        .join(', ');
      return withSummary(
        `MAIOR NA ${maxPos} POS // MENOR NA ${minPos} POS`,
        `O maior número está na ${maxPos} posição e o menor número está na ${minPos} posição`
      );
    }

    default:
      return withSummary('-', '');
  }
}

/**
 * Official Token Alert Light hysteresis rule:
 * - Lights up (true) when player drops to <= 5 tokens
 * - Turns off automatically (false) only when player returns to > 6 tokens (>= 7)
 * - At exactly 6 tokens, preserves previous alert state
 */
export function computeTokenAlertLight(
  currentTokens: number,
  previousAlertState: boolean = false
): boolean {
  if (currentTokens <= 5) return true;
  if (currentTokens > 6) return false;
  return previousAlertState;
}

export interface TokenAuctionResolution {
  status: 'WINNER' | 'TIE' | 'NO_BIDS';
  winnerPlayerId: string | null;
  winningBid: number;
  highestBid: number;
  tiedPlayerIds: string[];
  updatedTokens: Record<string, number>;
  updatedAlerts: Record<string, boolean>;
  updatedAlertLights: Record<string, boolean>;
  message: string;
}

/**
 * Resolves the secret token auction for a round:
 * - If highest bidders tie: tied players recover their bid AND receive +2 bonus tokens, and auction repeats!
 * - If single highest bidder: all players pay their bid, highest bidder wins the action turn.
 */
export function resolveTokenAuction(
  playerTokens: Record<string, number>,
  bids: Record<string, number>,
  currentAlerts: Record<string, boolean> = {}
): TokenAuctionResolution {
  const entries = Object.entries(bids);
  if (entries.length === 0) {
    return {
      status: 'NO_BIDS',
      winnerPlayerId: null,
      winningBid: 0,
      highestBid: 0,
      tiedPlayerIds: [],
      updatedTokens: { ...playerTokens },
      updatedAlerts: { ...currentAlerts },
      updatedAlertLights: { ...currentAlerts },
      message: 'Nenhum lance registrado.'
    };
  }

  let maxBid = -1;
  entries.forEach(([, bid]) => {
    const cleanBid = Math.max(0, Math.round(bid || 0));
    if (cleanBid > maxBid) maxBid = cleanBid;
  });

  if (maxBid <= 0) {
    return {
      status: 'NO_BIDS',
      winnerPlayerId: null,
      winningBid: 0,
      highestBid: 0,
      tiedPlayerIds: [],
      updatedTokens: { ...playerTokens },
      updatedAlerts: { ...currentAlerts },
      updatedAlertLights: { ...currentAlerts },
      message: 'Todos apostaram 0 tokens.'
    };
  }

  const topBidders = entries
    .filter(([, bid]) => Math.max(0, Math.round(bid || 0)) === maxBid)
    .map(([pid]) => pid);

  const updatedTokens = { ...playerTokens };
  const updatedAlerts = { ...currentAlerts };

  // Official Tie Rule: Top tied bidders recover their submitted tokens + gain +2 bonus tokens!
  if (topBidders.length > 1) {
    topBidders.forEach((pid) => {
      const current = updatedTokens[pid] ?? 10;
      const next = current + 2;
      updatedTokens[pid] = next;
      updatedAlerts[pid] = computeTokenAlertLight(next, updatedAlerts[pid] ?? false);
    });

    return {
      status: 'TIE',
      winnerPlayerId: null,
      winningBid: maxBid,
      highestBid: maxBid,
      tiedPlayerIds: topBidders,
      updatedTokens,
      updatedAlerts,
      updatedAlertLights: updatedAlerts,
      message: `EMPATE NO MAIOR LANCE (${maxBid} tokens)! Os jogadores empatados no topo recuperaram seus tokens e ganharam +2 TOKENS BÔNUS! Façam um novo lance secreto.`
    };
  }

  // Single winner: deduct submitted tokens from each bidder
  const winnerPlayerId = topBidders[0];
  entries.forEach(([pid, bid]) => {
    const current = updatedTokens[pid] ?? 10;
    const clampedBid = Math.min(current, Math.max(0, Math.round(bid || 0)));
    const next = current - clampedBid;
    updatedTokens[pid] = next;
    updatedAlerts[pid] = computeTokenAlertLight(next, updatedAlerts[pid] ?? false);
  });

  return {
    status: 'WINNER',
    winnerPlayerId,
    winningBid: maxBid,
    highestBid: maxBid,
    tiedPlayerIds: [],
    updatedTokens,
    updatedAlerts,
    updatedAlertLights: updatedAlerts,
    message: `Leilão encerrado! Maior lance venceu o direito de agir na rodada.`
  };
}

/**
 * Recharges +2 tokens to every player at the end of a round and updates the <=5 / >6 alert lights.
 */
export function applyRoundEndTokenRecharge(
  playerTokens: Record<string, number>,
  currentAlerts: Record<string, boolean>,
  rechargeAmount: number = 2
): {
  updatedTokens: Record<string, number>;
  updatedAlerts: Record<string, boolean>;
  updatedAlertLights: Record<string, boolean>;
} {
  const updatedTokens: Record<string, number> = {};
  const updatedAlerts: Record<string, boolean> = {};

  Object.keys(playerTokens).forEach((pid) => {
    const next = (playerTokens[pid] ?? 0) + rechargeAmount;
    updatedTokens[pid] = next;
    updatedAlerts[pid] = computeTokenAlertLight(next, currentAlerts[pid] ?? false);
  });

  return { updatedTokens, updatedAlerts, updatedAlertLights: updatedAlerts };
}

/**
 * Verifies a "Declare the Truth" attempt (8 values from left to right, 1..13, suit not required).
 * Supports both (guessedValues, targetHand) and (targetHand, guessedValues).
 */
export function verifyTruthDeclaration(
  firstArg: number[] | PVCard[],
  secondArg: PVCard[] | number[]
): { allCorrect: boolean; correctCount: number; positionMatches: boolean[] } {
  const isFirstNumbers = typeof firstArg?.[0] === 'number';
  const guessedValues = (isFirstNumbers ? firstArg : secondArg) as number[];
  const targetHand = (isFirstNumbers ? secondArg : firstArg) as PVCard[];

  if (!targetHand || targetHand.length !== 8 || !guessedValues || guessedValues.length !== 8) {
    return { allCorrect: false, correctCount: 0, positionMatches: new Array(8).fill(false) };
  }

  let correctCount = 0;
  const positionMatches: boolean[] = [];
  for (let i = 0; i < 8; i++) {
    const match = targetHand[i].value === Number(guessedValues[i]);
    positionMatches.push(match);
    if (match) correctCount++;
  }

  return {
    allCorrect: correctCount === 8,
    correctCount,
    positionMatches
  };
}

/**
 * Validates placing a specific card into a slot (0..7) during the Drag-and-Drop / Click Deck Setup step.
 * Enforces the Devil's Plan rule: cards of the same suit must be in strictly ascending order from left to right.
 */
export function validateCardPlacementInSlot(
  currentSlots: Array<PVCard | null | undefined>,
  targetSlotIndex: number,
  cardToPlace: PVCard
): {
  valid: boolean;
  conflictingSlotIndex?: number;
  errorMessage?: string;
} {
  const suitMeta = PV_SUIT_META[cardToPlace.suit];
  const cardFullName = `${PV_VALUE_NAMES[cardToPlace.value] || cardToPlace.label} de ${suitMeta.name}`;

  for (let i = 0; i < 8; i++) {
    if (i === targetSlotIndex) continue;
    const other = currentSlots[i];
    if (!other || other.id === cardToPlace.id) continue;

    if (other.suit === cardToPlace.suit) {
      const otherFullName = `${PV_VALUE_NAMES[other.value] || other.label} de ${suitMeta.name}`;
      if (i < targetSlotIndex && cardToPlace.value <= other.value) {
        return {
          valid: false,
          conflictingSlotIndex: i,
          errorMessage: `ERRO DE REGRA: ${cardFullName} não pode ficar na ${
            targetSlotIndex + 1
          }ª posição porque é menor que ${otherFullName} na ${
            i + 1
          }ª posição! Cartas do mesmo naipe (${suitMeta.symbol} ${
            suitMeta.name
          }) devem ficar em ordem crescente da esquerda para a direita.`
        };
      }
      if (i > targetSlotIndex && cardToPlace.value >= other.value) {
        return {
          valid: false,
          conflictingSlotIndex: i,
          errorMessage: `ERRO DE REGRA: ${cardFullName} não pode ficar na ${
            targetSlotIndex + 1
          }ª posição porque é maior que ${otherFullName} na ${
            i + 1
          }ª posição! Cartas do mesmo naipe (${suitMeta.symbol} ${
            suitMeta.name
          }) devem ficar em ordem crescente da esquerda para a direita.`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Checks if a player has won the match series (e.g. 1 win in 1-round mode, 2 wins in 3-round Best-of-3 mode,
 * or when it's mathematically impossible for any opponent to overtake or tie the leader).
 */
export function checkMatchSeriesWin(
  roundWinsByPlayer: Record<string, number>,
  totalMatchRounds: number = 1,
  roundsCompletedCount: number = 1
): {
  matchFinished: boolean;
  matchWinnerPlayerId: string | null;
  requiredWins: number;
} {
  const safeTotal = Math.max(1, totalMatchRounds || 1);
  const requiredWins = Math.floor(safeTotal / 2) + 1;

  const sortedEntries = Object.entries(roundWinsByPlayer)
    .filter(([_, wins]) => wins > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedEntries.length === 0) {
    return {
      matchFinished: false,
      matchWinnerPlayerId: null,
      requiredWins
    };
  }

  const [topPlayerId, topWins] = sortedEntries[0];
  const runnerUpWins = sortedEntries.length > 1 ? sortedEntries[1][1] : 0;
  const remainingRounds = Math.max(0, safeTotal - roundsCompletedCount);

  // 1. Majority rule: player reached majority of the series (e.g. 1 in MD1, 2 in MD3, 3 in MD5, 4 in MD7, 5 in MD9)
  if (topWins >= requiredWins) {
    return {
      matchFinished: true,
      matchWinnerPlayerId: topPlayerId,
      requiredWins
    };
  }

  // 2. Mathematically impossible to overtake or tie ("quando não der mais para virar o jogo")
  if (topWins > runnerUpWins + remainingRounds) {
    return {
      matchFinished: true,
      matchWinnerPlayerId: topPlayerId,
      requiredWins
    };
  }

  // 3. All rounds in the series completed: highest wins takes victory
  if (roundsCompletedCount >= safeTotal) {
    return {
      matchFinished: topWins > runnerUpWins,
      matchWinnerPlayerId: topWins > runnerUpWins ? topPlayerId : null,
      requiredWins
    };
  }

  return {
    matchFinished: false,
    matchWinnerPlayerId: null,
    requiredWins
  };
}

