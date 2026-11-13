import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PevSecretCard,
  OFFICIAL_PEV_QUESTIONS,
  validateSameSuitAscendingOrder,
  autoSortSameSuitCards,
  dealValidPlayerHand,
  computeLowTokenAlertState,
  resolveTokenAuction,
  applyRoundEndTokenRecharge,
  computeOfficialQuestionAnswer,
  verifyTruthDeclaration,
  formatDynamicQuestionText
} from '../perguntasEVerdadesLogic';
import {
  checkMatchSeriesWin,
  validateCardPlacementInSlot,
  validateCardMoveOrSwapInSlots,
  resolveTokenAuction as resolveEngineAuction,
  PVCard
} from '../perguntasEVerdadesEngine';

const SAMPLE_VALID_HAND: PevSecretCard[] = [
  { position: 1, rank: 2, suit: 'spades', revealedOnTv: false },
  { position: 2, rank: 5, suit: 'hearts', revealedOnTv: false },
  { position: 3, rank: 5, suit: 'spades', revealedOnTv: false },
  { position: 4, rank: 6, suit: 'clubs', revealedOnTv: false },
  { position: 5, rank: 9, suit: 'hearts', revealedOnTv: false },
  { position: 6, rank: 11, suit: 'diamonds', revealedOnTv: false },
  { position: 7, rank: 12, suit: 'spades', revealedOnTv: false },
  { position: 8, rank: 13, suit: 'clubs', revealedOnTv: false }
];

describe('Perguntas e Verdades Logic (Questions & Truth)', () => {
  it('exposes all 11 official questions grouped by SOMA, CONTAGEM, POSIÇÃO', () => {
    assert.equal(OFFICIAL_PEV_QUESTIONS.length, 11);
    assert.equal(OFFICIAL_PEV_QUESTIONS.filter((q) => q.category === 'SOMA').length, 4);
    assert.equal(OFFICIAL_PEV_QUESTIONS.filter((q) => q.category === 'CONTAGEM').length, 3);
    assert.equal(OFFICIAL_PEV_QUESTIONS.filter((q) => q.category === 'POSIÇÃO').length, 4);
  });

  it('validates same-suit ascending order from left to right and rejects violations', () => {
    const validRes = validateSameSuitAscendingOrder(SAMPLE_VALID_HAND);
    assert.equal(validRes.valid, true);
    assert.equal(validRes.violations.length, 0);

    // Violate spades order: position 1 has 10 of spades, position 3 has 5 of spades
    const invalidHand: PevSecretCard[] = SAMPLE_VALID_HAND.map((c) =>
      c.position === 1 ? { ...c, rank: 10 } : c
    );
    const invalidRes = validateSameSuitAscendingOrder(invalidHand);
    assert.equal(invalidRes.valid, false);
    assert.equal(invalidRes.violations.length, 1);
    assert.equal(invalidRes.violations[0].suit, 'spades');
  });

  it('autoSortSameSuitCards fixes out-of-order same-suit cards while preserving suit slots', () => {
    const unsorted: PevSecretCard[] = [
      { position: 1, rank: 12, suit: 'spades', revealedOnTv: false },
      { position: 2, rank: 9, suit: 'hearts', revealedOnTv: false },
      { position: 3, rank: 2, suit: 'spades', revealedOnTv: false },
      { position: 4, rank: 13, suit: 'clubs', revealedOnTv: false },
      { position: 5, rank: 5, suit: 'hearts', revealedOnTv: false },
      { position: 6, rank: 11, suit: 'diamonds', revealedOnTv: false },
      { position: 7, rank: 5, suit: 'spades', revealedOnTv: false },
      { position: 8, rank: 6, suit: 'clubs', revealedOnTv: false }
    ];

    const sorted = autoSortSameSuitCards(unsorted);
    const check = validateSameSuitAscendingOrder(sorted);
    assert.equal(check.valid, true);
    assert.equal(sorted[0].rank, 2); // 1st spades
    assert.equal(sorted[2].rank, 5); // 2nd spades
    assert.equal(sorted[6].rank, 12); // 3rd spades
    assert.equal(sorted[1].rank, 5); // 1st hearts
    assert.equal(sorted[4].rank, 9); // 2nd hearts
  });

  it('dealValidPlayerHand always produces 8 valid cards obeying the same-suit ascending rule', () => {
    const used = new Set<string>();
    for (let p = 0; p < 4; p++) {
      const hand = dealValidPlayerHand(used);
      assert.equal(hand.length, 8);
      const validation = validateSameSuitAscendingOrder(hand);
      assert.equal(validation.valid, true);
    }
  });

  it('computes low-token alert light (<= 5 ON, > 6 OFF, 6 preserves hysteresis)', () => {
    assert.equal(computeLowTokenAlertState(10, false), false);
    assert.equal(computeLowTokenAlertState(5, false), true);
    assert.equal(computeLowTokenAlertState(3, false), true);
    // If alert was ON and player goes to 6 tokens, stays ON until > 6 (7+)
    assert.equal(computeLowTokenAlertState(6, true), true);
    assert.equal(computeLowTokenAlertState(7, true), false);
  });

  it('resolves token auction with official tie rule (+2 bonus tokens on tie) and single winner deduction', () => {
    const tokens = { p1: 10, p2: 10, p3: 10 };
    // Tie between p1 and p2 at 4 tokens
    const tieResult = resolveTokenAuction(tokens, { p1: 4, p2: 4, p3: 1 }, ['p1', 'p2', 'p3']);
    assert.equal(tieResult.status, 'TIE');
    assert.deepEqual(tieResult.tiedPlayerIds, ['p1', 'p2']);
    assert.equal(tieResult.updatedTokens.p1, 12); // 10 + 2 bonus
    assert.equal(tieResult.updatedTokens.p2, 12); // 10 + 2 bonus
    assert.equal(tieResult.updatedTokens.p3, 10);

    // Single winner p2 bids 7
    const winResult = resolveTokenAuction(
      tieResult.updatedTokens,
      { p1: 5, p2: 7, p3: 2 },
      ['p1', 'p2', 'p3']
    );
    assert.equal(winResult.status, 'WINNER');
    assert.equal(winResult.winnerPlayerId, 'p2');
    assert.equal(winResult.updatedTokens.p2, 5); // 12 - 7 = 5 -> triggers low token alert!
    assert.equal(winResult.updatedLowTokenAlerts.p2, true);

    // Round end recharges +2 tokens to everyone (p2 goes from 5 -> 7 -> alert turns OFF!)
    const recharged = applyRoundEndTokenRecharge(
      winResult.updatedTokens,
      ['p1', 'p2', 'p3'],
      winResult.updatedLowTokenAlerts
    );
    assert.equal(recharged.updatedTokens.p2, 7);
    assert.equal(recharged.updatedLowTokenAlerts.p2, false);
  });

  it('calculates exact mathematical answers for all 11 official questions', () => {
    // Ranks in SAMPLE_VALID_HAND: [2, 5, 5, 6, 9, 11, 12, 13]
    // #1: Sum of positions 1, 3, 6 -> 2 + 5 + 11 = 18
    const q1 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 1, { positions: [1, 3, 6] });
    assert.equal(q1.shortAnswer, '18');

    // #2: Total sum -> 2+5+5+6+9+11+12+13 = 63
    const q2 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 2);
    assert.equal(q2.shortAnswer, '63');

    // #3: Sum of face cards (11, 12, 13) -> 36
    const q3 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 3);
    assert.equal(q3.shortAnswer, '36');

    // #4: Sum of numeric cards (2+5+5+6+9) -> 27
    const q4 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 4);
    assert.equal(q4.shortAnswer, '27');

    // #5: Even/odd count -> evens: 2, 6, 12 (3 pares), odds: 5, 5, 9, 11, 13 (5 ímpares)
    const q5 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 5);
    assert.equal(q5.shortAnswer, '3 Pares / 5 Ímpares');

    // #6: Face cards count -> 3
    const q6 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 6);
    assert.ok(q6.shortAnswer.startsWith('3'));

    // #7: Specific rank count (rank 5) -> 2 cartas
    const q7 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 7, { rank: 5 });
    assert.ok(q7.shortAnswer.startsWith('2'));

    // #8: Suit positions for spades -> 1ª, 3ª, 7ª
    const q8 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 8, { suit: 'spades' });
    assert.ok(q8.shortAnswer.includes('1ª, 3ª, 7ª'));

    // #9: Consecutive side-by-side -> 3ª(5) & 4ª(6), 6ª(11) & 7ª(12), 7ª(12) & 8ª(13)
    const q9 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 9);
    assert.ok(q9.shortAnswer.includes('3ª e 4ª'));
    assert.ok(q9.shortAnswer.includes('6ª e 7ª'));
    assert.ok(q9.shortAnswer.includes('7ª e 8ª'));

    // #10: Repeated values -> 2ª e 3ª (both rank 5)
    const q10 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 10);
    assert.ok(q10.shortAnswer.includes('2ª e 3ª'));

    // #11: Min & Max positions -> Menor: 1ª | Maior: 8ª
    const q11 = computeOfficialQuestionAnswer(SAMPLE_VALID_HAND, 11);
    assert.ok(q11.shortAnswer.includes('Menor: 1ª'));
    assert.ok(q11.shortAnswer.includes('Maior: 8ª'));

    // Dynamic text formatting check
    assert.equal(
      formatDynamicQuestionText(1, { positions: [1, 3, 6] }),
      'Qual é a soma das cartas nas posições 1ª, 3ª e 6ª?'
    );
  });

  it('verifies Truth Declaration (8 card values ignoring suit)', () => {
    const exactMatch = verifyTruthDeclaration(SAMPLE_VALID_HAND, [2, 5, 5, 6, 9, 11, 12, 13]);
    assert.equal(exactMatch.correct, true);
    assert.equal(exactMatch.matchedCount, 8);

    const wrongMatch = verifyTruthDeclaration(SAMPLE_VALID_HAND, [2, 5, 4, 6, 9, 11, 12, 13]);
    assert.equal(wrongMatch.correct, false);
    assert.equal(wrongMatch.matchedCount, 7);
  });

  describe('checkMatchSeriesWin (Melhor de 1, 3, 5, 7, 9 & Impossível Virar)', () => {
    it('Melhor de 1 (totalMatchRounds = 1): 1 vitória encerra a série imediatamente', () => {
      const ongoing = checkMatchSeriesWin({}, 1, 0);
      assert.equal(ongoing.matchFinished, false);
      assert.equal(ongoing.requiredWins, 1);

      const won = checkMatchSeriesWin({ p1: 1 }, 1, 1);
      assert.equal(won.matchFinished, true);
      assert.equal(won.matchWinnerPlayerId, 'p1');
      assert.equal(won.requiredWins, 1);
    });

    it('Melhor de 3 (totalMatchRounds = 3): quem vencer 2 encerra a série', () => {
      // Rodada 1: p1 vence (1x0). Restam 2 rodadas.
      const r1 = checkMatchSeriesWin({ p1: 1, p2: 0 }, 3, 1);
      assert.equal(r1.matchFinished, false);
      assert.equal(r1.requiredWins, 2);

      // Rodada 2: p1 vence novamente (2x0). 2 vitórias atingidas -> fim de série!
      const r2Sweep = checkMatchSeriesWin({ p1: 2, p2: 0 }, 3, 2);
      assert.equal(r2Sweep.matchFinished, true);
      assert.equal(r2Sweep.matchWinnerPlayerId, 'p1');

      // Rodada 2 alternativa: p2 vence (1x1). Jogo empatado, série prossegue para R3
      const r2Tied = checkMatchSeriesWin({ p1: 1, p2: 1 }, 3, 2);
      assert.equal(r2Tied.matchFinished, false);

      // Rodada 3: p2 vence (2x1).
      const r3 = checkMatchSeriesWin({ p1: 1, p2: 2 }, 3, 3);
      assert.equal(r3.matchFinished, true);
      assert.equal(r3.matchWinnerPlayerId, 'p2');
    });

    it('Melhor de 5 (totalMatchRounds = 5): primeiro a 3 vitórias ganha imediatamente', () => {
      // 2x0 no round 2 -> ainda pode virar (restam 3)
      const r2 = checkMatchSeriesWin({ p1: 2, p2: 0 }, 5, 2);
      assert.equal(r2.matchFinished, false);
      assert.equal(r2.requiredWins, 3);

      // 3x0 no round 3 -> atinge 3 vitórias (maioria), encerra série na hora
      const r3 = checkMatchSeriesWin({ p1: 3, p2: 0 }, 5, 3);
      assert.equal(r3.matchFinished, true);
      assert.equal(r3.matchWinnerPlayerId, 'p1');

      // 3x1 no round 4 -> atinge 3 vitórias, encerra
      const r4 = checkMatchSeriesWin({ p1: 1, p2: 3 }, 5, 4);
      assert.equal(r4.matchFinished, true);
      assert.equal(r4.matchWinnerPlayerId, 'p2');
    });

    it('Melhor de 9 (totalMatchRounds = 9): regra da impossibilidade matemática de virar o jogo', () => {
      // Rodada 7 de 9: p1 tem 4 vitórias, p2 tem 1 vitória.
      // Restam 2 rodadas (9 - 7 = 2). Máximo que p2 pode alcançar: 1 + 2 = 3.
      // Como p1 já tem 4 vitórias, é matematicamente impossível virar ou empatar!
      const impossibleTurnaround = checkMatchSeriesWin({ p1: 4, p2: 1 }, 9, 7);
      assert.equal(impossibleTurnaround.matchFinished, true);
      assert.equal(impossibleTurnaround.matchWinnerPlayerId, 'p1');

      // Rodada 6 de 9: p1 tem 4 vitórias, p2 tem 0 vitórias.
      // Restam 3 rodadas. Máximo que p2 pode alcançar: 0 + 3 = 3. 4 > 3 -> Vitória antecipada garantida!
      const earlyCleanSweep = checkMatchSeriesWin({ p1: 4, p2: 0 }, 9, 6);
      assert.equal(earlyCleanSweep.matchFinished, true);
      assert.equal(earlyCleanSweep.matchWinnerPlayerId, 'p1');

      // Rodada 5 de 9: p1 tem 5 vitórias -> atinge maioria (requiredWins = 5)
      const r5 = checkMatchSeriesWin({ p1: 5, p2: 0 }, 9, 5);
      assert.equal(r5.matchFinished, true);
      assert.equal(r5.matchWinnerPlayerId, 'p1');
    });
  });

  describe('Deck setup slot validation & 0-bid tie rule (Engine)', () => {
    it('blocks placing smaller card after larger card of same suit (e.g. 4♣ after 8♣ or 6♠ after 7♠)', () => {
      const slots: Array<PVCard | null> = [
        { id: 'clubs-8', value: 8, suit: 'clubs', label: '8' },
        null,
        null,
        null,
        null,
        null,
        null,
        null
      ];

      // 4♣ after 8♣ -> must reject
      const badPlacement = validateCardPlacementInSlot(slots, 1, {
        id: 'clubs-4',
        value: 4,
        suit: 'clubs',
        label: '4'
      });
      assert.equal(badPlacement.valid, false);
      assert.equal(badPlacement.conflictingSlotIndex, 0);

      // 9♣ after 8♣ -> valid
      const goodSameSuit = validateCardPlacementInSlot(slots, 1, {
        id: 'clubs-9',
        value: 9,
        suit: 'clubs',
        label: '9'
      });
      assert.equal(goodSameSuit.valid, true);

      // 4♥ (different suit) after 8♣ -> valid
      const goodOtherSuit = validateCardPlacementInSlot(slots, 1, {
        id: 'hearts-4',
        value: 4,
        suit: 'hearts',
        label: '4'
      });
      assert.equal(goodOtherSuit.valid, true);
    });

    it('validates swaps between occupied slots in both directions', () => {
      const slots: Array<PVCard | null> = [
        { id: 'spades-2', value: 2, suit: 'spades', label: '2' },
        { id: 'spades-7', value: 7, suit: 'spades', label: '7' },
        null,
        null,
        null,
        null,
        null,
        null
      ];
      // Swapping 7♠ with 2♠ puts 7♠ before 2♠ -> must reject
      const badSwap = validateCardMoveOrSwapInSlots(slots, 0, slots[1]!, 1);
      assert.equal(badSwap.valid, false);

      // Moving 7♠ to slot 3 (still after 2♠) -> valid
      const goodMove = validateCardMoveOrSwapInSlots(slots, 2, slots[1]!, 1);
      assert.equal(goodMove.valid, true);
    });

    it('treats 0 vs 0 auction bids as a TIE awarding +2 bonus tokens', () => {
      const res = resolveEngineAuction({ p1: 10, p2: 10 }, { p1: 0, p2: 0 }, {});
      assert.equal(res.status, 'TIE');
      assert.deepEqual(res.tiedPlayerIds, ['p1', 'p2']);
      assert.equal(res.updatedTokens.p1, 12);
      assert.equal(res.updatedTokens.p2, 12);
    });
  });
});
