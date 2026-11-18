import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GEO_ETAPAS_PADRAO,
  buildGeoGuessState,
  geoEtapasDo,
  geoPixel,
  geoTilesFor,
  geoValue,
  judgeGeoGuess,
  nextGeoStage,
  pendingGeoGuesses,
  submitGeoGuess
} from '../utils/geoguessEngine.ts';
import { GEO_CATEGORIAS, GEO_LOCAIS, GEO_REGIOES, drawGeoLocal, geoPool } from '../data/geoguessBank.ts';
import { PONTINHOS, PONTINHOS_TEMAS, drawPontinho, normalizePontinhoKey, pontinhosPool } from '../data/pontinhosBank.ts';
import type { GeoGuessGameState } from '../types/game.ts';

const ids = ['a', 'b', 'c'];
const local = GEO_LOCAIS.find((l) => l.id === 'san-siro')!;
const playing = (): GeoGuessGameState => ({ ...buildGeoGuessState(local), phase: 'PLAYING' });

test('GeoGuess: 5 imagens do mesmo ponto, do close (zoom maior) a cidade (zoom menor)', () => {
  const s = buildGeoGuessState(local);
  assert.equal(s.etapas.length, 5);
  assert.equal(s.lat, local.lat);
  for (let i = 1; i < s.etapas.length; i++) assert.ok(s.etapas[i].z < s.etapas[i - 1].z, 'cada etapa abre mais');
  // a escala desloca todos os zooms juntos
  const big = geoEtapasDo({ escala: -2 });
  assert.deepEqual(big.etapas.map((e) => e.z), GEO_ETAPAS_PADRAO.map((e) => e.z - 2));
});

test('GeoGuess: palpite no celular, diretor julga, quem acerta leva o valor da imagem (5, 4, 3...)', () => {
  let s = playing();
  assert.equal(geoValue(s), 5);
  s = submitGeoGuess(s, 'a', '  San Siro ');
  s = submitGeoGuess(s, 'b', 'Wembley');
  assert.equal(s.guesses.a.text, 'San Siro');
  assert.deepEqual(pendingGeoGuesses(s).sort(), ['a', 'b']);
  s = judgeGeoGuess(s, 'a', true, ids);
  s = judgeGeoGuess(s, 'b', false, ids);
  assert.deepEqual(s.pointsAwarded, { a: 5 });
  assert.equal(s.solvedAt.a, 0);
  // quem errou nao troca o palpite na mesma imagem; quem acertou fica travado
  assert.equal(submitGeoGuess(s, 'b', 'Outro').guesses.b.text, 'Wembley');
  assert.equal(submitGeoGuess(s, 'a', 'Outro').guesses.a.text, 'San Siro');
  s = nextGeoStage(s);
  assert.equal(s.stage, 1);
  assert.equal(geoValue(s), 4);
  assert.equal(s.guesses.b, undefined, 'palpite errado sai na imagem nova');
  s = submitGeoGuess(s, 'b', 'Meazza');
  s = judgeGeoGuess(s, 'b', true, ids);
  assert.deepEqual(s.pointsAwarded, { a: 5, b: 4 });
});

test('GeoGuess: chute falado (sem palpite escrito) tambem pode ser julgado; todos certos revela', () => {
  let s = playing();
  s = judgeGeoGuess(s, 'a', true, ['a', 'b']);
  assert.equal(s.phase, 'PLAYING');
  s = judgeGeoGuess(s, 'b', true, ['a', 'b']);
  assert.equal(s.phase, 'REVEAL');
});

test('GeoGuess: depois da 5a imagem vem a revelacao, sem pontos para quem nao acertou', () => {
  let s = playing();
  for (let i = 0; i < 5; i++) s = nextGeoStage(s);
  assert.equal(s.phase, 'REVEAL');
  assert.equal(s.answerVisible, true);
  assert.deepEqual(s.pointsAwarded, {});
});

test('GeoGuess: os tiles cobrem a area pedida e ficam centrados no ponto', () => {
  const e = { z: 17, span: 3 };
  const tiles = geoTilesFor(local.lat, local.lon, e, 900, 500);
  assert.ok(tiles.length >= 6);
  const size = 900 / 3;
  assert.ok(tiles.every((t) => Math.abs(t.size - size) < 1e-6));
  assert.ok(tiles.some((t) => t.left <= 0) && tiles.some((t) => t.left + t.size >= 900));
  assert.ok(tiles.some((t) => t.top <= 0) && tiles.some((t) => t.top + t.size >= 500));
  // o ponto cai no meio da area
  const p = geoPixel(local.lat, local.lon, 17);
  const tx = Math.floor(p.x / 256);
  const ty = Math.floor(p.y / 256);
  const centerTile = tiles.find((t) => t.key === `17/${tx}/${ty}`)!;
  const k = size / 256;
  assert.ok(Math.abs(centerTile.left + (p.x - tx * 256) * k - 450) < 1);
  assert.ok(Math.abs(centerTile.top + (p.y - ty * 256) * k - 250) < 1);
});

test('GeoGuess: banco com ids unicos, coordenadas validas, dica que nao entrega a resposta', () => {
  const seen = new Set<string>();
  const regioes = new Set(GEO_REGIOES.map((r) => r.id));
  const cats = new Set(GEO_CATEGORIAS.map((c) => c.id));
  for (const l of GEO_LOCAIS) {
    assert.ok(!seen.has(l.id), `id repetido ${l.id}`);
    seen.add(l.id);
    assert.ok(Math.abs(l.lat) < 85 && Math.abs(l.lon) <= 180, l.id);
    assert.ok(regioes.has(l.regiao), `${l.id}: regiao`);
    assert.ok(l.categorias.length > 0 && l.categorias.every((c) => cats.has(c)), `${l.id}: categorias`);
    assert.ok(l.dica.length > 0 && l.dica.length <= 60, `${l.id}: dica curta`);
    assert.ok(!normalizePontinhoKey(l.dica).includes(normalizePontinhoKey(l.nome)), `${l.id}: dica entrega o nome`);
  }
  assert.ok(GEO_LOCAIS.length >= 40);
});

test('GeoGuess: tags combinam (regioes OU, categorias OU, regiao E categoria)', () => {
  const brTur = geoPool(['brasil', 'pontos-turisticos']);
  assert.ok(brTur.length > 0);
  assert.ok(brTur.every((l) => l.pais === 'Brasil' && l.categorias.includes('pontos-turisticos')));
  const euSul = geoPool(['europa', 'america-do-sul']);
  assert.ok(euSul.some((l) => l.regiao === 'europa') && euSul.some((l) => l.regiao === 'america-do-sul'));
  assert.ok(euSul.every((l) => l.regiao === 'europa' || l.regiao === 'america-do-sul'));
  assert.ok(geoPool(['estadios']).every((l) => l.categorias.includes('estadios')));
  assert.equal(geoPool([]).length, GEO_LOCAIS.length);
  // combinacao vazia cai no banco inteiro, e o sorteio nao repete ate esgotar
  assert.ok(drawGeoLocal(new Set(), ['oceania', 'estadios']));
  const used = new Set(geoPool(['estadios']).slice(1).map((l) => l.id));
  assert.equal(drawGeoLocal(used, ['estadios']).id, geoPool(['estadios'])[0].id);
});

test('Jogo dos Pontinhos: temas variados, 5 dicas, as 3 primeiras nao entregam a resposta', () => {
  for (const t of PONTINHOS_TEMAS) assert.ok(pontinhosPool([t]).length >= 5, `tema ${t} com poucos itens`);
  for (const p of PONTINHOS) {
    assert.equal(p.pistas.length, 5, p.nome);
    const n = normalizePontinhoKey(p.nome);
    p.pistas.slice(0, 3).forEach((d) => assert.ok(!normalizePontinhoKey(d).includes(n), `${p.nome}: "${d}"`));
  }
  assert.equal(drawPontinho(new Set(), ['Animais']).tema, 'Animais');
});
