/**
 * ART-08: gera .webp em public/assets/cazetv a partir dos PNG mestres em _master/cazetv (o PNG continua sendo o mestre; o site usa o WebP).
 * Uso:  node scripts/make-webp.mjs
 * Requer o pacote `sharp` (nao e dependencia do projeto: instale so quando for regenerar, ex.: npm i --no-save sharp).
 * As artes animadas (.svg) e os .jpg nao sao tocados.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { default: sharp } = await import('sharp');
const toPath = (u) => u.pathname.replace(/^\/([A-Za-z]:)/, '$1');
const srcDir = process.argv[2] || toPath(new URL('../_master/cazetv/', import.meta.url));
const outDir = process.argv[3] || toPath(new URL('../public/assets/cazetv/', import.meta.url));
const pngs = readdirSync(srcDir).filter((f) => f.endsWith('.png'));
let before = 0;
let after = 0;
for (const f of pngs) {
  const src = join(srcDir, f);
  const out = join(outDir, f.replace(/\.png$/, '.webp'));
  await sharp(src).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(out);
  const a = statSync(src).size;
  const b = statSync(out).size;
  before += a;
  after += b;
  console.log(`${f}: ${Math.round(a / 1024)} KB -> ${Math.round(b / 1024)} KB`);
}
console.log(`total: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
