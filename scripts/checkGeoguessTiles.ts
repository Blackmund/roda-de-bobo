/**
 * Confere o banco do GeoGuess na fonte de imagens: para cada lugar e cada etapa (e a revelacao), baixa o tile do
 * centro e acusa quando a Esri devolve o quadro cinza "Map data not yet available" (sem imagem naquele zoom).
 *
 *   npm run geo:check            (todos)
 *   npm run geo:check -- maracana (so um id)
 *
 * Lugar com etapa sem imagem: use `escala: -1` (ou menos) no lugar, ou etapas proprias.
 */
import { createHash } from 'node:crypto';
import { GEO_LOCAIS } from '../src/data/geoguessBank';
import { GEO_TILE_SOURCE, geoEtapasDo, geoPixel, metersPerPixel } from '../src/utils/geoguessEngine';

// md5 do tile "Map data not yet available" da Esri (medido em 2026-11)
const EMPTY = new Set(['f27d9de7f80c13501f470595e327aa6d']);

const only = process.argv.slice(2);
let bad = 0;
for (const l of GEO_LOCAIS.filter((x) => !only.length || only.includes(x.id))) {
  const { etapas, revelacao } = geoEtapasDo(l);
  const problems: string[] = [];
  for (const [i, e] of [...etapas, revelacao].entries()) {
    const mpp = metersPerPixel(l.lat, e.z);
    const p = geoPixel(l.lat, l.lon, e.z);
    const x = Math.floor((p.x + (e.dx || 0) / mpp) / 256);
    const y = Math.floor((p.y - (e.dy || 0) / mpp) / 256);
    const res = await fetch(GEO_TILE_SOURCE.url(e.z, x, y), { headers: { 'User-Agent': 'roda-de-bobo-geo-check' } });
    const buf = Buffer.from(await res.arrayBuffer());
    const md5 = createHash('md5').update(buf).digest('hex');
    if (!res.ok || EMPTY.has(md5)) problems.push(`${i === etapas.length ? 'revelação' : 'etapa ' + (i + 1)} (z${e.z})`);
  }
  if (problems.length) bad++;
  console.log(`${problems.length ? 'SEM IMAGEM' : 'ok        '} ${l.id}${problems.length ? ': ' + problems.join(', ') : ''}`);
}
console.log(bad ? `\n${bad} lugar(es) com etapa sem imagem.` : '\nTodas as etapas têm imagem.');
process.exitCode = bad ? 1 : 0;
