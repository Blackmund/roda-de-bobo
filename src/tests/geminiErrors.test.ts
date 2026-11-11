import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiStatusPayload,
  blockMsFor,
  classifyGeminiError,
  healthFromError,
  isTerminalForModel
} from '../utils/geminiErrors.ts';

test('INF-09: 402 de credito esgotado e reconhecido (o caso real do diagnostico)', () => {
  const real = new Error('{"error":{"code":402,"message":"Your prepayment credits are depleted. Please go to AI Studio","status":"PAYMENT_REQUIRED"}}');
  assert.equal(classifyGeminiError(real), 'no_credit');
  assert.equal(classifyGeminiError('HTTP 402'), 'no_credit');
  assert.equal(classifyGeminiError(new Error('Billing account disabled')), 'no_credit');
});

test('INF-09: permissao/chave, quota, modelo inexistente e timeout sao distintos', () => {
  assert.equal(classifyGeminiError(new Error('403 PERMISSION_DENIED')), 'auth');
  assert.equal(classifyGeminiError(new Error('API key not valid. Please pass a valid API key.')), 'auth');
  assert.equal(classifyGeminiError(new Error('429 RESOURCE_EXHAUSTED')), 'quota');
  assert.equal(classifyGeminiError(new Error('404 models/x is not found')), 'not_found');
  assert.equal(classifyGeminiError(new Error('GEMINI_CALL_TIMEOUT_5800MS')), 'timeout');
  assert.equal(classifyGeminiError(new Error('boom')), 'other');
  assert.equal(classifyGeminiError(undefined), 'other');
  assert.equal(classifyGeminiError(null), 'other');
});

test('INF-09: erros terminais nao repetem no mesmo modelo e ficam bloqueados pelo tempo certo', () => {
  for (const k of ['no_credit', 'auth', 'quota', 'not_found'] as const) assert.equal(isTerminalForModel(k), true, k);
  for (const k of ['timeout', 'other'] as const) assert.equal(isTerminalForModel(k), false, k);
  assert.equal(blockMsFor('no_credit'), 3600000);
  assert.equal(blockMsFor('auth'), 3600000);
  assert.equal(blockMsFor('quota'), 8000);
  assert.equal(blockMsFor('timeout'), 0);
});

test('INF-09: o status mostrado na interface reflete a saude real da IA', () => {
  assert.equal(aiStatusPayload('ok', true).connected, true);
  assert.match(aiStatusPayload('ok', true).statusLabel, /Conectada/);
  const semCredito = aiStatusPayload('no_credit', true);
  assert.equal(semCredito.connected, false);
  assert.equal(semCredito.reason, 'no_credit');
  assert.match(semCredito.statusLabel, /sem crédito/);
  assert.equal(aiStatusPayload('ok', false).connected, false); // sem chave nunca "conectada"
  assert.equal(aiStatusPayload('unknown', false).reason, 'no_key');
  assert.match(aiStatusPayload('auth', true).statusLabel, /recusada/);
  assert.equal(healthFromError('no_credit'), 'no_credit');
  assert.equal(healthFromError('auth'), 'auth');
  assert.equal(healthFromError('timeout'), 'error');
});
