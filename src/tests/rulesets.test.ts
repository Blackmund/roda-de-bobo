import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRuleset,
  getRulesetPreset,
  hasShowRuleset,
  isDuvidoShowWon,
  isShowRuleset,
  limiteExactBonusFor,
  resolveRuleset
} from '../config/rulesets.ts';
import { DEFAULT_GAME_CUSTOM_CONFIG } from '../types/game.ts';
import { computeLimiteWinnerPoints } from '../components/host/ScreenLimite.tsx';

test('UX-09 rulesets: padrão é "casa"; só jogos do programa têm versão "show"', () => {
  assert.equal(resolveRuleset(undefined), 'home');
  assert.equal(resolveRuleset(DEFAULT_GAME_CUSTOM_CONFIG), 'home');
  assert.equal(hasShowRuleset('duvido'), true);
  assert.equal(hasShowRuleset('perguntas-e-verdades'), false, 'P&V não existe no programa');
  assert.equal(getRulesetPreset('duvido', 'home'), null);
});

test('applyRuleset: "show" aplica o preset e "home" restaura os padrões', () => {
  const show = applyRuleset('limite', DEFAULT_GAME_CUSTOM_CONFIG, 'show');
  assert.equal(isShowRuleset(show), true);
  assert.equal(show.limiteExactBonus, 0);
  assert.equal(getRulesetPreset('limite', 'show')?.rounds, 10);
  assert.equal(getRulesetPreset('duvido', 'show')?.rounds, 9);
  assert.equal(getRulesetPreset('duvido', 'show')?.timer, 60);

  const back = applyRuleset('limite', show, 'home');
  assert.equal(isShowRuleset(back), false);
  assert.equal(back.limiteExactBonus, DEFAULT_GAME_CUSTOM_CONFIG.limiteExactBonus);
});

test('REG-03 Limite: bônus de palpite exato vem da configuração (casa = 2, programa = 0 → vale 1)', () => {
  assert.equal(limiteExactBonusFor(undefined), 2);
  assert.equal(limiteExactBonusFor({ limiteExactBonus: 0 }), 0);
  const base: any = {
    roundData: { valor_exato: 100 },
    guesses: { p1: 100 },
    powerCardsPlayed: {}
  };
  assert.equal(computeLimiteWinnerPoints({ ...base, exactBonus: 2 }, 'p1'), 2, 'regra da casa');
  assert.equal(computeLimiteWinnerPoints({ ...base }, 'p1'), 2, 'sem exactBonus = padrão da casa');
  assert.equal(computeLimiteWinnerPoints({ ...base, exactBonus: 0 }, 'p1'), 1, 'programa: sem bônus');
  assert.equal(
    computeLimiteWinnerPoints({ ...base, exactBonus: 0, powerCardsPlayed: { p1: 'x2' } }, 'p1'),
    2,
    'carta x2 continua dobrando'
  );
});

test('REG-01 Duvido: no modo programa a partida acaba quando uma equipe chega a 5 temas', () => {
  const show = { ruleset: 'show' as const };
  assert.equal(isDuvidoShowWon(show, 4), false);
  assert.equal(isDuvidoShowWon(show, 5), true);
  assert.equal(isDuvidoShowWon({ ruleset: 'home' }, 9), false, 'regras da casa seguem o nº de rodadas');
  assert.equal(isDuvidoShowWon(undefined, 5), false);
});
