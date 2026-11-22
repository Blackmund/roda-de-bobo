import type { GeoLocal } from '../data/geoguessBank';

export interface GeoPhoto {
  url: string;
  source: string;
  author: string;
  license: string;
}

interface MediaFile {
  title: string;
  index?: number;
  coordinates?: { lat: number; lon: number }[];
  categories?: { title: string }[];
  imageinfo?: {
    thumburl?: string;
    descriptionurl?: string;
    width: number;
    height: number;
    extmetadata?: Record<string, { value?: string }>;
  }[];
}

const CHRIST_PHOTOS: GeoPhoto[] = ([
  ['d/de', 'Detail, Christ the Redeemer statue.JPG', 'Dkoukoul', 'CC BY-SA 3.0'],
  ['8/83', 'Christ the Redeemer - From Above.jpg', 'Alexandre Cesar Salem e Silva', 'CC BY-SA 3.0'],
  ['2/2b', 'Christ the Redeemer on Corcovado Mountain, Rio de Janeiro, Brazil.jpg', 'Wilfredor', 'CC0'],
  ['f/f9', 'Cristo Redentor on the Corcovado, Rio de Janeiro.jpg', 'Wilfredor', 'CC0'],
  ['5/5f', 'Corcovado e o Cristo.jpg', 'Vinícius94', 'CC BY-SA 4.0']
]).map(([directory, title, author, license]) => {
  const file = encodeURIComponent(title.replaceAll(' ', '_'));
  return {
    url: `https://thumb.wikimedia.org/wikipedia/commons/thumb/${directory}/${file}/960px-${file}`,
    source: `https://commons.wikimedia.org/wiki/File:${file}`,
    author, license
  };
});

const sourceTerms: Record<string, string> = {
  'san-siro': 'Stadio Giuseppe Meazza',
  'maracana': 'Estádio do Maracanã',
  'cataratas-iguacu': 'Iguazu Falls',
  'torre-eiffel': 'Eiffel Tower',
  'catedral-se': 'Catedral da Sé São Paulo',
  'muralha-mutianyu': 'Mutianyu Great Wall',
  'cidade-proibida': 'Forbidden City Beijing',
  'lótus-delhi': 'Lotus Temple Delhi'
};

const exactCategories: Record<string, string> = {
  'san-siro': 'Stadio Giuseppe Meazza',
  maracana: 'Estádio do Maracanã',
  'torre-eiffel': 'Eiffel Tower',
  'machu-picchu': 'Machu Picchu',
  'cataratas-iguacu': 'Iguazu Falls',
  'taj-mahal': 'Taj Mahal',
  'sagrada-familia': 'Sagrada Família',
  'grand-canyon': 'Grand Canyon',
  'monte-fuji': 'Mount Fuji',
  'teatro-amazonas': 'Teatro Amazonas',
  'burj-khalifa': 'Burj Khalifa',
  'angkor-wat': 'Angkor Wat',
  stonehenge: 'Stonehenge'
};

const plain = (text = '') => text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const normal = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const wider = /aerial|panoram|skyline|birds.eye|from above|view from|vista aerea|vista panoramica/;
const details = /detail|detalhe|close.up|facade|fachada|entrance|entrada|interior/;

function photoFrom(file: MediaFile): GeoPhoto | null {
  const i = file.imageinfo?.[0];
  if (!i?.thumburl || !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(i.thumburl) ||
      !i.descriptionurl?.startsWith('https://commons.wikimedia.org/') || i.width < 480 || i.height < 360) return null;
  const meta = i.extmetadata;
  const license = plain(meta?.LicenseShortName?.value);
  if (!/^(CC BY|CC ?0|Public domain|PDM)/i.test(license)) return null;
  return {
    url: i.thumburl.split('?')[0],
    source: i.descriptionurl,
    author: plain(meta?.Artist?.value) || 'Wikimedia Commons',
    license
  };
}

async function queryPhotos(params: Record<string, string>, signal: AbortSignal): Promise<MediaFile[]> {
  const query = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    prop: 'imageinfo|coordinates|categories', iiprop: 'url|size|extmetadata', iiurlwidth: '960',
    cllimit: '150',
    iiextmetadatafilter: 'Artist|LicenseShortName', ...params
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${query}`, { signal });
  if (!response.ok) return [];
  const json = await response.json();
  return Array.isArray(json.query?.pages) ? json.query.pages : [];
}

/** Preenche as etapas com fotos diferentes. As lacunas continuam sendo vistas aéreas. */
export async function loadGeoPhotos(local: GeoLocal, signal: AbortSignal): Promise<(GeoPhoto | null)[]> {
  if (local.id === 'cristo-redentor') return CHRIST_PHOTOS;

  // Use o ponto fotografável da pergunta, inclusive quando a resposta é a cidade ou o país.
  const name = sourceTerms[local.id] || (local.pergunta === 'local' || local.id.startsWith('cidade-')
    ? local.nome : local.lugar.split(',')[0]);
  const term = name.replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedName = normal(term);
  if (normalizedName.length < 4) return [];
  const category = exactCategories[local.id];
  const search = {
    generator: 'search', gsrnamespace: '6', gsrlimit: '20',
    gsrsearch: `intitle:"${term}" filetype:bitmap`
  };
  const byCategory = category ? await queryPhotos({
    generator: 'categorymembers', gcmtitle: 'Category:' + category,
    gcmnamespace: '6', gcmtype: 'file', gcmlimit: '20'
  }, signal) : [];
  const files = byCategory.length >= 5 ? byCategory : [...byCategory, ...await queryPhotos(search, signal)];
  const expectedCategory = 'category ' + normalizedName;
  const city = normal(local.lugar.split(',')[0]);
  const radius = local.categorias.includes('natureza') ? .24 : local.pergunta === 'cidade' ? .06 : .025;

  const seen = new Set<string>();
  const candidates = files.flatMap(file => {
    const title = normal(file.title);
    if (/logo|diagram|map of|coat of arms|flag of|icon|ticket|poster/.test(title)) return [];
    const near = file.coordinates?.some(point => Math.hypot(
      point.lat - local.lat,
      (point.lon - local.lon) * Math.cos(local.lat * Math.PI / 180)
    ) < radius);
    const namedCategory = file.categories?.some(tag => normal(tag.title) === expectedCategory);
    const namedContext = local.pergunta === 'local' && city.length > 4 && city !== normalizedName && title.includes(city);
    if (!byCategory.includes(file) && (!title.includes(normalizedName) || !(near || namedCategory || namedContext))) return [];
    const photo = photoFrom(file);
    if (!photo || seen.has(photo.url)) return [];
    seen.add(photo.url);
    const ratio = file.imageinfo![0].width / file.imageinfo![0].height;
    const breadth = wider.test(title) ? 3 : details.test(title) ? 0 : ratio >= 1.6 ? 2 : 1;
    return [{ photo, breadth, index: file.index ?? 0 }];
  }).sort((a, b) => a.breadth - b.breadth || a.index - b.index);

  const stages: (GeoPhoto | null)[] = [null, null, null, null, null];
  const wide = candidates.findIndex(candidate => candidate.breadth === 3);
  if (wide >= 0) stages[4] = candidates.splice(wide, 1)[0].photo;
  if (candidates.length >= 4) {
    const last = candidates.length - 1;
    for (let i = 0; i < 4; i++) {
      const candidate = candidates[Math.round(i * last / 3)];
      stages[i] = candidate.photo;
    }
  } else {
    // Abre com um detalhe aéreo se a busca só encontrou vistas reconhecíveis.
    for (let i = 0; i < candidates.length; i++) stages[i + 1] = candidates[i].photo;
  }
  return stages;
}
