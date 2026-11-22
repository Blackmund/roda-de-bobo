type OcrWorker = {
  setParameters(options: { tessedit_pageseg_mode: string }): Promise<unknown>;
  recognize(image: HTMLCanvasElement, options: object, output: { tsv: true }): Promise<{ data: { tsv: string } }>;
};

const OCR_MODULE = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js';
let reader: Promise<OcrWorker> | undefined;
let scanQueue: Promise<unknown> = Promise.resolve();
const clues = new Map<string, Promise<string | null>>();

export function warmGeoTextReader() {
  reader ??= import(/* @vite-ignore */ OCR_MODULE).then(async module => {
    const worker: OcrWorker = await module.createWorker(['por', 'eng']);
    await worker.setParameters({ tessedit_pageseg_mode: '11' });
    return worker;
  }).catch(error => {
    reader = undefined;
    throw error;
  });
  return reader;
}

export function geoClueCrop(width: number, height: number, stage: number) {
  const fraction = [0.18, 0.28, 0.66, 0.9, 1][stage] ?? 1;
  const centerX = stage === 0 ? 0.62 : stage === 1 ? 0.34 : 0.5;
  const centerY = stage === 0 ? 0.44 : stage === 1 ? 0.62 : 0.5;
  const w = Math.round(width * fraction);
  const h = Math.round(height * fraction);
  return {
    x: Math.round(Math.max(0, Math.min(width - w, width * centerX - w / 2))),
    y: Math.round(Math.max(0, Math.min(height - h, height * centerY - h / 2))),
    w, h
  };
}

export function geoTextRegions(tsv: string) {
  return tsv.split(/\r?\n/).flatMap(row => {
    const columns = row.split('\t');
    if (columns[0] !== '5' || Number(columns[10]) < 12 || !/\p{L}|\p{N}/u.test(columns.slice(11).join(''))) return [];
    const [x, y, w, h] = columns.slice(6, 10).map(Number);
    return w > 0 && h > 0 ? [{ x, y, w, h }] : [];
  });
}

async function redactClue(url: string, stage: number, signal: AbortSignal) {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  await image.decode();
  signal.throwIfAborted();

  const crop = geoClueCrop(image.naturalWidth, image.naturalHeight, stage);
  const canvas = document.createElement('canvas');
  const scale = Math.min(3, 960 / Math.max(crop.w, crop.h));
  canvas.width = Math.max(1, Math.round(crop.w * scale));
  canvas.height = Math.max(1, Math.round(crop.h * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);

  const worker = await warmGeoTextReader();
  const scan = scanQueue.then(async () => {
    signal.throwIfAborted();
    const { data } = await worker.recognize(canvas, {}, { tsv: true });
    return geoTextRegions(data.tsv);
  });
  scanQueue = scan.catch(() => undefined);
  const regions = await scan;
  signal.throwIfAborted();
  for (const { x, y, w, h } of regions) {
    const pad = Math.max(4, Math.round(h * .28));
    const left = Math.max(0, x - pad);
    const top = Math.max(0, y - pad);
    const right = Math.min(canvas.width, x + w + pad);
    const bottom = Math.min(canvas.height, y + h + pad);
    const sample = ctx.getImageData(left, Math.max(0, top - 2), Math.max(1, right - left), 1).data;
    const total = [0, 0, 0];
    for (let i = 0; i < sample.length; i += 4) {
      total[0] += sample[i];
      total[1] += sample[i + 1];
      total[2] += sample[i + 2];
    }
    ctx.fillStyle = `rgb(${total.map(value => Math.round(value / (sample.length / 4))).join(',')})`;
    ctx.fillRect(left, top, right - left, bottom - top);
  }
  return canvas.toDataURL('image/jpeg', .9);
}

/** A foto original nunca entra no palco. Se o tratamento falhar, usa-se a pista aérea. */
export function prepareGeoClue(url: string, stage: number): Promise<string | null> {
  const key = `${stage}:${url}`;
  const cached = clues.get(key);
  if (cached) return cached;
  const signal = AbortSignal.timeout(9500);
  const result = Promise.race([
    redactClue(url, stage, signal).catch(() => null),
    new Promise<null>(resolve => signal.addEventListener('abort', () => resolve(null), { once: true }))
  ]);
  if (clues.size >= 16) clues.delete(clues.keys().next().value!);
  clues.set(key, result);
  void result.then(image => { if (!image && clues.get(key) === result) clues.delete(key); });
  return result;
}
