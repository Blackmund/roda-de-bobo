import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cazeArtSrc } from '../utils/themeUtils.ts';
import { RDB_ICONS } from '../components/rdb/rdbIcons.tsx';

const dir = fileURLToPath(new URL('../../public/assets/cazetv/', import.meta.url));
const masters = fileURLToPath(new URL('../../_master/cazetv/', import.meta.url));

test('ART-08: toda arte PNG mestre tem versao WebP bem menor, e o site aponta para a WebP que existe', () => {
  const pngs = readdirSync(masters).filter((f) => f.endsWith('.png'));
  assert.ok(pngs.length >= 6);
  for (const png of pngs) {
    const webp = png.replace(/\.png$/, '.webp');
    assert.ok(existsSync(dir + webp), `${webp} nao existe (rode scripts/make-webp.mjs)`);
    assert.ok(statSync(dir + webp).size < statSync(masters + png).size / 2, `${webp} deveria ser bem menor que o PNG`);
  }
  const src = cazeArtSrc('limite');
  assert.equal(src, '/assets/cazetv/limite.webp');
  assert.ok(existsSync(dir + 'limite.webp'));
});

test('ART-08: o peso total das artes WebP usadas fica abaixo de 600 KB', () => {
  const total = readdirSync(dir)
    .filter((f) => f.endsWith('.webp'))
    .reduce((acc, f) => acc + statSync(dir + f).size, 0);
  assert.ok(total < 600 * 1024, `WebP somam ${Math.round(total / 1024)} KB`);
});

test('ART-01: os mestres (PNG/JPG) ficam fora de public/ e a pasta publicada so tem WebP e SVG', () => {
  assert.ok(readdirSync(masters).some((f) => f.endsWith('.png')));
  assert.ok(readdirSync(dir).every((f) => /\.(webp|svg)$/.test(f)), 'public/assets/cazetv so deve ter WebP e SVG');
});

test('ART-04: o kit de icones tem os 22 icones com nome unico', () => {
  assert.equal(Object.keys(RDB_ICONS).length, 22);
  for (const [name, Icon] of Object.entries(RDB_ICONS)) assert.equal(typeof Icon, 'function', name);
});
