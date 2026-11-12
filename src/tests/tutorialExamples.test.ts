import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_EXAMPLES, exampleSourceUrl } from '../components/setup/tutorialExamples.ts';
import { GAME_TUTORIALS } from '../components/setup/gameTutorials.ts';

test('UX-12: todo jogo com tutorial tem um exemplo, e os links do video-fonte sao validos', () => {
  for (const id of Object.keys(GAME_TUTORIALS)) {
    const ex = (TUTORIAL_EXAMPLES as Record<string, any>)[id];
    assert.ok(ex, `${id}: sem exemplo`);
    assert.ok(ex.texto.trim().length > 3, `${id}: texto do exemplo vazio`);
    assert.ok(ex.detalhe.trim().length > 20, `${id}: detalhe do exemplo curto demais`);
    if (ex.fonte) {
      assert.match(ex.fonte.id, /^[A-Za-z0-9_-]{11}$/, `${id}: ID de video invalido`);
      assert.ok(Number.isInteger(ex.fonte.t) && ex.fonte.t >= 0, `${id}: tempo invalido`);
      assert.match(exampleSourceUrl(ex.fonte), /^https:\/\/youtu\.be\/[A-Za-z0-9_-]{11}\?t=\d+$/);
    }
  }
});

test('UX-12: os 8 formatos que existem no programa trazem video-fonte', () => {
  for (const id of ['limite', 'duvido', 'proibido', 'nota', 'tem-ou-nao-tem', 'mimica', 'quem-sou-eu', 'mega-resenha']) {
    assert.ok((TUTORIAL_EXAMPLES as Record<string, any>)[id].fonte, `${id}: exemplo do programa sem fonte`);
  }
});
