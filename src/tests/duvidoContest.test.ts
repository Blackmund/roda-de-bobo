import test from 'node:test';
import assert from 'node:assert/strict';
import { contestDuvidoResult } from '../components/host/ScreenDuvido.tsx';

const base: any = {
  phase: 'RESULT',
  challengedTeam: 'A',
  resultWinnerTeam: 'B',
  resultReason: 'DESISTIU',
  validCount: 3,
  currentBid: 5,
  timerActive: false
};

test('UX-10: contestar devolve a vez a equipe desafiada, com a contagem preservada', () => {
  const next = contestDuvidoResult(base);
  assert.equal(next.phase, 'EXECUTION');
  assert.equal(next.resultWinnerTeam, null);
  assert.equal(next.resultReason, '');
  assert.equal(next.validCount, 3, 'itens ja aceitos continuam valendo');
  assert.equal(next.timerActive, false, 'o juiz retoma sem tempo correndo');
});

test('UX-10: nao ha o que contestar se a desafiada ganhou ou fora da tela de resultado', () => {
  const won = { ...base, resultWinnerTeam: 'A' };
  assert.equal(contestDuvidoResult(won), won);
  const playing = { ...base, phase: 'EXECUTION' };
  assert.equal(contestDuvidoResult(playing), playing);
});
