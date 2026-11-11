import test from 'node:test';
import assert from 'node:assert/strict';
import { THEME_CATEGORIES } from '../data/themeBankData';
import {
  GAME_ANGLES,
  getBaseThemes,
  getThemeBankStats,
  normalizeTheme,
  pickRandomTheme,
  pickThemes,
  type ThemeGameId
} from '../utils/themeBank';

const GAMES = Object.keys(GAME_ANGLES) as ThemeGameId[];

function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Banco de temas: tem milhares de combinações e cada jogo tem conteúdo', () => {
  const stats = getThemeBankStats();
  assert.ok(stats.temasBase >= 1500, `temas-base: ${stats.temasBase}`);
  assert.ok(stats.totalCombinacoes >= 10000, `combinações: ${stats.totalCombinacoes}`);
  assert.ok(stats.cazetv >= 150, `CazéTV: ${stats.cazetv}`);
  for (const g of GAMES) {
    assert.ok(stats.porJogo[g].base >= 400, `${g}: ${stats.porJogo[g].base} temas-base`);
  }
});

test('Banco de temas: sem duplicatas, sem vazios e tamanho de tema razoável', () => {
  const seen = new Map<string, string>();
  for (const cat of THEME_CATEGORIES) {
    assert.ok(cat.temas.length >= 30, `${cat.id} tem poucos temas (${cat.temas.length})`);
    for (const t of cat.temas) {
      assert.ok(t.trim().length >= 3 && t.length <= 40, `tamanho inválido: "${t}"`);
      const k = normalizeTheme(t);
      const prev = seen.get(k);
      if (prev && prev !== cat.id) {
        // repetição entre categorias é tolerada (o getBaseThemes deduplica), mas avisa
        console.warn(`aviso: "${t}" aparece em ${prev} e ${cat.id}`);
      }
      seen.set(k, cat.id);
    }
    const norm = cat.temas.map(normalizeTheme);
    assert.equal(new Set(norm).size, norm.length, `duplicata dentro de ${cat.id}`);
  }
  const base = getBaseThemes();
  assert.equal(new Set(base.map(normalizeTheme)).size, base.length);
});

test('pickThemes: devolve a quantidade pedida, sem repetir e respeitando exclude', () => {
  for (const g of GAMES) {
    const first = pickThemes({ game: g, count: 8, rng: seeded(7) });
    assert.equal(first.length, 8);
    assert.equal(new Set(first.map(normalizeTheme)).size, 8);
    const second = pickThemes({ game: g, count: 8, exclude: first, rng: seeded(7) });
    for (const t of second) {
      assert.ok(!first.map(normalizeTheme).includes(normalizeTheme(t)), `${g}: repetiu "${t}"`);
    }
  }
});

test('pickThemes: nunca devolve vazio nem quebra, mesmo excluindo tudo', () => {
  const everything = getBaseThemes({ game: 'limite' });
  const out = pickThemes({ game: 'limite', count: 8, exclude: everything });
  assert.equal(out.length, 8);
  assert.ok(pickRandomTheme({ game: 'duvido' }).length > 0);
});

test('pickThemes: filtro CazéTV e filtro adulto', () => {
  const caze = pickThemes({ onlyCazetv: true, count: 30, angleChance: 0, rng: seeded(3) });
  const cazeBase = new Set(getBaseThemes({ onlyCazetv: true }).map(normalizeTheme));
  for (const t of caze) assert.ok(cazeBase.has(normalizeTheme(t)), `fora do universo CazéTV: ${t}`);

  const adultCats = THEME_CATEGORIES.filter((c) => c.adulto);
  const safe = new Set(getBaseThemes({ allowAdult: false }).map(normalizeTheme));
  const onlyAdult = adultCats
    .flatMap((c) => c.temas)
    .map(normalizeTheme)
    .filter((k) => !safe.has(k));
  assert.ok(onlyAdult.length > 0);
});

test('pickThemes: recortes de jogo aparecem quando angleChance = 1', () => {
  const out = pickThemes({ game: 'tem-ou-nao-tem', count: 10, angleChance: 1, rng: seeded(11) });
  for (const t of out) {
    const hasAngle = GAME_ANGLES['tem-ou-nao-tem'].some((tpl) => {
      const [pre, post] = tpl.split('{t}');
      return t.startsWith(pre) && t.endsWith(post);
    });
    assert.ok(hasAngle, `sem recorte: ${t}`);
  }
});
