import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSuitAscendingOrder,
  autoSortSameSuitCards,
  dealValidRandomHand,
  computeOfficialQuestionAnswer,
  computeTokenAlertLight,
  resolveTokenAuction,
  verifyTruthDeclaration,
  OFFICIAL_11_QUESTIONS,
  PVCard
} from '../src/utils/perguntasEVerdadesEngine';

describe('Perguntas e Verdades Engine (O Jogo do Diabo)', () => {
  it('has all 11 official questions with SOMA, CONTAGEM, and POSICAO categories', () => {
    assert.equal(OFFICIAL_11_QUESTIONS.length, 11);
    const categories = new Set(OFFICIAL_11_QUESTIONS.map((q) => q.category));
    assert.ok(categories.has('SOMA'));
    assert.ok(categories.has('CONTAGEM'));
    assert.ok(categories.has('POSICAO'));
  });

  it('validates ascending order per suit from left to right and auto-sorts violations', () => {
    const validHand: PVCard[] = [
      { id: 'spades-2', suit: 'spades', value: 2, label: '2' },
      { id: 'hearts-10', suit: 'hearts', value: 10, label: '10' },
      { id: 'spades-5', suit: 'spades', value: 5, label: '5' },
      { id: 'clubs-1', suit: 'clubs', value: 1, label: 'A' },
      { id: 'hearts-12', suit: 'hearts', value: 12, label: 'Q' },
      { id: 'spades-9', suit: 'spades', value: 9, label: '9' },
      { id: 'diamonds-4', suit: 'diamonds', value: 4, label: '4' },
      { id: 'spades-13', suit: 'spades', value: 13, label: 'K' }
    ];
    assert.equal(validateSuitAscendingOrder(validHand).valid, true);

    const invalidHand: PVCard[] = [
      { id: 'spades-9', suit: 'spades', value: 9, label: '9' },
      { id: 'spades-2', suit: 'spades', value: 2, label: '2' },
      { id: 'hearts-10', suit: 'hearts', value: 10, label: '10' },
      { id: 'spades-5', suit: 'spades', value: 5, label: '5' },
      { id: 'clubs-1', suit: 'clubs', value: 1, label: 'A' },
      { id: 'hearts-12', suit: 'hearts', value: 12, label: 'Q' },
      { id: 'diamonds-4', suit: 'diamonds', value: 4, label: '4' },
      { id: 'spades-13', suit: 'spades', value: 13, label: 'K' }
    ];
    assert.equal(validateSuitAscendingOrder(invalidHand).valid, false);

    const fixed = autoSortSameSuitCards(invalidHand);
    assert.equal(validateSuitAscendingOrder(fixed).valid, true);
  });

  it('deals a valid 8-card random hand', () => {
    const hand = dealValidRandomHand();
    assert.equal(hand.length, 8);
    assert.equal(validateSuitAscendingOrder(hand).valid, true);
  });

  it('correctly computes mathematical answers for all 11 official questions', () => {
    const hand: PVCard[] = [
      { id: 'spades-1', suit: 'spades', value: 1, label: 'A' }, // 1ª
      { id: 'spades-2', suit: 'spades', value: 2, label: '2' }, // 2ª
      { id: 'hearts-3', suit: 'hearts', value: 3, label: '3' }, // 3ª
      { id: 'spades-7', suit: 'spades', value: 7, label: '7' }, // 4ª
      { id: 'diamonds-7', suit: 'diamonds', value: 7, label: '7' }, // 5ª
      { id: 'diamonds-8', suit: 'diamonds', value: 8, label: '8' }, // 6ª
      { id: 'diamonds-11', suit: 'diamonds', value: 11, label: 'J' }, // 7ª
      { id: 'clubs-12', suit: 'clubs', value: 12, label: 'Q' } // 8ª
    ];

    // Q1: Sum of positions [1, 2, 4] = 1 + 2 + 7 = 10
    assert.ok(computeOfficialQuestionAnswer(1, hand, { positions1Based: [1, 2, 4] }).summary.includes('10'));
    // Q2: Sum of all 8 cards = 1+2+3+7+7+8+11+12 = 51
    assert.ok(computeOfficialQuestionAnswer(2, hand).summary.includes('51'));
    // Q3: Sum of letters (J=11, Q=12) = 23
    assert.ok(computeOfficialQuestionAnswer(3, hand).summary.includes('23'));
    // Q4: Sum of numerics (1..10) = 51 - 23 = 28
    assert.ok(computeOfficialQuestionAnswer(4, hand).summary.includes('28'));
    // Q5: Count of letters = 2
    assert.ok(computeOfficialQuestionAnswer(5, hand).summary.includes('2'));
    // Q6: Count of numerics = 6
    assert.ok(computeOfficialQuestionAnswer(6, hand).summary.includes('6'));
    // Q7: Count of card 7 = 2
    assert.ok(computeOfficialQuestionAnswer(7, hand, { targetValue: 7 }).summary.includes('2'));
    // Q8: Positions of spades = 1ª, 2ª, 4ª
    assert.ok(computeOfficialQuestionAnswer(8, hand, { targetSuit: 'spades' }).summary.includes('1ª, 2ª, 4ª'));
    // Q9: Repeated values = 4ª e 5ª (7)
    assert.ok(computeOfficialQuestionAnswer(9, hand).summary.includes('4ª e 5ª'));
    // Q10: Consecutive adjacent values = 1ª, 2ª, 3ª (1,2,3) and 5ª, 6ª (7,8) and 7ª, 8ª (11,12)
    assert.ok(computeOfficialQuestionAnswer(10, hand).summary.includes('1ª e 2ª e 3ª'));
    // Q11: Highest (8ª) and Lowest (1ª)
    assert.ok(computeOfficialQuestionAnswer(11, hand).summary.includes('8ª'));
  });

  it('implements token alert LED hysteresis (turns ON at <= 5, turns OFF only at > 6)', () => {
    assert.equal(computeTokenAlertLight(6, false), false);
    assert.equal(computeTokenAlertLight(5, false), true);
    assert.equal(computeTokenAlertLight(6, true), true); // stays ON at 6!
    assert.equal(computeTokenAlertLight(7, true), false); // turns OFF at > 6!
  });

  it('resolves secret token auction and awards +2 bonus on tie', () => {
    const tieRes = resolveTokenAuction({ p1: 10, p2: 10 }, { p1: 4, p2: 4 }, { p1: false, p2: false });
    assert.equal(tieRes.status, 'TIE');
    assert.equal(tieRes.winnerPlayerId, null);
    assert.equal(tieRes.updatedTokens.p1, 12);
    assert.equal(tieRes.updatedTokens.p2, 12);

    const winRes = resolveTokenAuction({ p1: 10, p2: 10 }, { p1: 3, p2: 6 }, { p1: false, p2: false });
    assert.equal(winRes.status, 'WINNER');
    assert.equal(winRes.winnerPlayerId, 'p2');
    assert.equal(winRes.winningBid, 6);
    assert.equal(winRes.updatedTokens.p1, 7);
    assert.equal(winRes.updatedTokens.p2, 4);
    assert.equal(winRes.updatedAlerts.p2, true); // 4 <= 5 -> Alert LED ON!
  });

  it('verifies 8-number Truth Declaration ignoring suits', () => {
    const hand: PVCard[] = [
      { id: 'spades-1', suit: 'spades', value: 1, label: 'A' },
      { id: 'spades-2', suit: 'spades', value: 2, label: '2' },
      { id: 'hearts-3', suit: 'hearts', value: 3, label: '3' },
      { id: 'spades-7', suit: 'spades', value: 7, label: '7' },
      { id: 'diamonds-7', suit: 'diamonds', value: 7, label: '7' },
      { id: 'diamonds-8', suit: 'diamonds', value: 8, label: '8' },
      { id: 'diamonds-9', suit: 'diamonds', value: 9, label: '9' },
      { id: 'clubs-12', suit: 'clubs', value: 12, label: 'Q' }
    ];
    const ok = verifyTruthDeclaration([1, 2, 3, 7, 7, 8, 9, 12], hand);
    assert.equal(ok.allCorrect, true);
    assert.equal(ok.correctCount, 8);

    const fail = verifyTruthDeclaration([1, 2, 3, 7, 8, 8, 9, 12], hand);
    assert.equal(fail.allCorrect, false);
    assert.equal(fail.correctCount, 7);
    assert.equal(fail.positionMatches[4], false);
  });
});
