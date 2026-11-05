import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyProibidoCardOutcome } from '../../components/host/ScreenProibido';
import { ProibidoGameState } from '../../types/game';

function createInitialProibidoState(cardCount = 5): ProibidoGameState {
  const cards = Array.from({ length: cardCount }, (_, i) => ({
    palavra_alvo: `CARTA_${i + 1}`,
    palavras_proibidas: ['A', 'B', 'C', 'D', 'E']
  }));
  return {
    phase: 'PLAYING',
    cards,
    currentCardIndex: 0,
    pendingQueue: cards.map((_, idx) => idx),
    speakerTeam: 'A',
    speakerPlayerId: 'p1',
    refereeTeam: 'B',
    timerSeconds: 60,
    timerActive: true,
    roundScore: 0,
    cardOutcomes: new Array(cardCount).fill('pending'),
    antiSpoilerMode: 'guesser-back-to-tv'
  };
}

describe('Jogo do Proibido - Circular Queue for Skipped Cards', () => {
  it('moves a skipped card to the end of the queue and brings it back after other cards', () => {
    let state = createInitialProibidoState(5);

    // Card 0: Skipped -> moves to end of queue [1, 2, 3, 4, 0]
    let res = applyProibidoCardOutcome(state, 'skipped');
    state = res.nextState;
    assert.equal(res.justFinishedAllCards, false);
    assert.equal(state.phase, 'PLAYING');
    assert.equal(state.currentCardIndex, 1);
    assert.deepEqual(state.pendingQueue, [1, 2, 3, 4, 0]);
    assert.equal(state.cardOutcomes[0], 'skipped');

    // Card 1: Correct -> removed from queue [2, 3, 4, 0]
    res = applyProibidoCardOutcome(state, 'correct');
    state = res.nextState;
    assert.equal(state.currentCardIndex, 2);
    assert.deepEqual(state.pendingQueue, [2, 3, 4, 0]);
    assert.equal(state.roundScore, 1);

    // Card 2: Foul -> removed from queue [3, 4, 0]
    res = applyProibidoCardOutcome(state, 'foul');
    state = res.nextState;
    assert.equal(state.currentCardIndex, 3);
    assert.deepEqual(state.pendingQueue, [3, 4, 0]);
    assert.equal(state.roundScore, 1);

    // Card 3: Correct -> removed from queue [4, 0]
    res = applyProibidoCardOutcome(state, 'correct');
    state = res.nextState;
    assert.equal(state.currentCardIndex, 4);
    assert.deepEqual(state.pendingQueue, [4, 0]);
    assert.equal(state.roundScore, 2);

    // Card 4: Correct -> removed from queue [0], Card 0 returns to screen!
    res = applyProibidoCardOutcome(state, 'correct');
    state = res.nextState;
    assert.equal(res.justFinishedAllCards, false);
    assert.equal(state.phase, 'PLAYING');
    assert.equal(state.currentCardIndex, 0);
    assert.deepEqual(state.pendingQueue, [0]);
    assert.equal(state.roundScore, 3);

    // Card 0 (returned): Skipped again -> stays in queue [0] because it's the last remaining card
    res = applyProibidoCardOutcome(state, 'skipped');
    state = res.nextState;
    assert.equal(res.justFinishedAllCards, false);
    assert.equal(state.phase, 'PLAYING');
    assert.equal(state.currentCardIndex, 0);
    assert.deepEqual(state.pendingQueue, [0]);

    // Card 0: Correct -> queue empty [], round finishes!
    res = applyProibidoCardOutcome(state, 'correct');
    state = res.nextState;
    assert.equal(res.justFinishedAllCards, true);
    assert.equal(state.phase, 'SUMMARY');
    assert.deepEqual(state.pendingQueue, []);
    assert.equal(state.roundScore, 4);
    assert.equal(state.timerActive, false);
  });
});
