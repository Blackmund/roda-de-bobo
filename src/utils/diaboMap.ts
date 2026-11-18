import type { CTBoard, CTCell, CTPiece } from '../types/game';

/**
 * PLANO DO DIABO: mapa procedural, catalogo de pecas e contas de pontuacao (quadrados, territorios).
 * Funcoes puras sobre CTBoard; o fluxo de turnos fica em comTerraEngine.
 *
 * Matriz da peca: 0 vazio, 1 solido, 2 furo, 3 ponte (pode ficar sobre a agua).
 */

type Rng = () => number;

/** Dono dos blocos da Peca do Diabo: nao e de ninguem, so ocupa espaco. */
export const DEVIL_OWNER = '~diabo';
export const DIABO_DEVILS = 3;
export const DIABO_DISCARD_PENALTY = 2;
export const DIABO_TERRITORY_BONUS = 8;
export const DIABO_CONTRACT_REWARD = [8, 4];

/** Bonus do quadrado k x k da mesma cor: 2x2 +3, 3x3 +8, 4x4 +15, 5x5 +24... */
export const squareBonus = (k: number) => (k >= 2 ? k * k - 1 : 0);

export function diaboMapSize(n: number): number {
  return n <= 2 ? 14 : n === 3 ? 16 : 18;
}

/* ------------------------------------------------------------------ */
/* Catalogo                                                            */
/* ------------------------------------------------------------------ */

const DIABO_CATALOG: string[] = [
  // 1-2
  '1', '11', '12',
  // 3
  '111', '121', '11/10', '12/10',
  // 4
  '1111', '1211', '11/11', '12/11', '111/010', '121/010', '10/10/11', '10/20/11', '011/110', '012/110',
  // 5: os 12 pentominos
  '011/110/010', '11111', '1000/1111', '1100/0111', '11/11/10', '111/010/010',
  '101/111', '100/100/111', '100/110/011', '010/111/010', '0100/1111', '110/010/011',
  // 5 com furo
  '010/121/010', '101/121', '12/11/10', '111/020/010', '11211', '2000/1111', '100/120/111',
  // 6
  '111/111', '121/111', '211/112', '1111/1001', '110/011/011', '1111/0120', '11110/00011', '0110/1111', '100/111/011', '1211/0011',
  // 7
  '111/111/100', '1111/1210', '11111/01010', '010/121/111', '101/121/101', '111/121/010',
  // 8
  '1111/1111', '1211/1121', '111/121/110', '11100/11111', '0110/1221/0110',
  // pontes
  '131', '1131', '1331', '11311', '010/131/010', '13/11'
];

export function parseRows(code: string): number[][] {
  return code.split('/').map((r) => Array.from(r).map((ch) => Number(ch)));
}

export const blockCount = (m: number[][]) => m.flat().filter((v) => v > 0).length;

export const diaboCatalogSize = () => DIABO_CATALOG.length + 1;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Saco do Diabo: mais pecas medias (3 a 5 blocos), 2 Pecas do Diabo por saco. */
export function buildDiaboBag(rng: Rng, tag: string): CTPiece[] {
  const out: CTPiece[] = [];
  DIABO_CATALOG.forEach((code, i) => {
    const shape = parseRows(code);
    const size = blockCount(shape);
    const copies = size >= 3 && size <= 5 ? 2 : 1;
    for (let c = 0; c < copies; c++) out.push({ uid: `${tag}-${i}-${c}`, shape, size, pts: size });
  });
  for (let c = 0; c < 2; c++) out.push({ uid: `${tag}-d-${c}`, shape: [[1]], size: 1, pts: -1, devil: true });
  return shuffle(out, rng);
}

/* ------------------------------------------------------------------ */
/* Mapa procedural                                                     */
/* ------------------------------------------------------------------ */

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

function inside(size: number, x: number, y: number) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

/** Componentes conexos (4 vizinhos) das casas que passam no filtro. */
export function components(w: number, h: number, ok: (i: number) => boolean): number[][] {
  const seen = new Uint8Array(w * h);
  const out: number[][] = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !ok(i)) continue;
    const comp: number[] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      comp.push(c);
      const cx = c % w;
      const cy = Math.floor(c / w);
      for (const [dx, dy] of N4) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && ok(j)) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

function islandMask(size: number, rng: Rng): Uint8Array {
  const m = new Uint8Array(size * size);
  const c = (size - 1) / 2;
  // ruido grosso (grade 4x4 interpolada) para o contorno nao ficar redondo demais
  const G = 5;
  const grid: number[] = [];
  for (let i = 0; i < G * G; i++) grid.push(rng() - 0.5);
  const noise = (x: number, y: number) => {
    const gx = (x / (size - 1)) * (G - 1);
    const gy = (y / (size - 1)) * (G - 1);
    const x0 = Math.min(G - 2, Math.floor(gx));
    const y0 = Math.min(G - 2, Math.floor(gy));
    const fx = gx - x0;
    const fy = gy - y0;
    const v = (i: number, j: number) => grid[j * G + i];
    return (
      v(x0, y0) * (1 - fx) * (1 - fy) + v(x0 + 1, y0) * fx * (1 - fy) + v(x0, y0 + 1) * (1 - fx) * fy + v(x0 + 1, y0 + 1) * fx * fy
    );
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x - c) / (c + 0.5);
      const dy = (y - c) / (c + 0.5);
      const d = Math.max(Math.abs(dx), Math.abs(dy)) * 0.55 + Math.hypot(dx, dy) * 0.45;
      const v = 1 - d + noise(x, y) * 0.9 + (rng() - 0.5) * 0.25;
      m[y * size + x] = v > 0.02 ? 1 : 0;
    }
  // automato celular: suaviza o contorno
  for (let it = 0; it < 3; it++) {
    const next = new Uint8Array(m);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        let n = 0;
        for (let oy = -1; oy <= 1; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oy) continue;
            const nx = x + ox;
            const ny = y + oy;
            if (inside(size, nx, ny) && m[ny * size + nx]) n++;
          }
        const i = y * size + x;
        next[i] = n >= 5 || (m[i] && n >= 4) ? 1 : 0;
      }
    m.set(next);
  }
  // so a maior ilha fica
  const comps = components(size, size, (i) => m[i] === 1).sort((a, b) => b.length - a.length);
  m.fill(0);
  const keep = comps[0] || [];
  // centraliza a ilha no quadro (o ruido pode empurra-la para um canto)
  let x0 = size;
  let x1 = 0;
  let y0 = size;
  let y1 = 0;
  keep.forEach((i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  const sx = Math.floor((size - 1 - x1 - x0) / 2);
  const sy = Math.floor((size - 1 - y1 - y0) / 2);
  keep.forEach((i) => (m[(Math.floor(i / size) + sy) * size + (i % size) + sx] = 1));
  return m;
}

function carveRiver(b: CTBoard, rng: Rng) {
  const size = b.w;
  const horizontal = rng() < 0.5;
  let lane = Math.floor(size / 3 + rng() * (size / 3));
  const wet = (x: number, y: number) => {
    const c = b.cells[y * size + x];
    if (c && c.t === 1) c.t = 2;
  };
  for (let s = 0; s < size; s++) {
    if (horizontal) wet(s, lane);
    else wet(lane, s);
    if (rng() < 0.35) {
      const nl = Math.min(size - 3, Math.max(2, lane + (rng() < 0.5 ? -1 : 1)));
      if (horizontal) wet(s, nl);
      else wet(nl, s);
      lane = nl;
    }
  }
}

function carveLake(b: CTBoard, rng: Rng) {
  const land = b.cells.map((c, i) => i).filter((i) => b.cells[i].t === 1);
  if (!land.length) return;
  let cur = land[Math.floor(rng() * land.length)];
  const len = 3 + Math.floor(rng() * 4);
  for (let k = 0; k < len; k++) {
    b.cells[cur].t = 2;
    const cx = cur % b.w;
    const cy = Math.floor(cur / b.w);
    const opts = N4.map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => inside(b.w, x, y) && b.cells[y * b.w + x].t === 1);
    if (!opts.length) return;
    const [nx, ny] = opts[Math.floor(rng() * opts.length)];
    cur = ny * b.w + nx;
  }
}

const isFreeCell = (c: CTCell) => c.t === 1 && !c.tree && c.tok === undefined && !c.act && !c.o;

function nearWater(b: CTBoard, i: number): boolean {
  const x = i % b.w;
  const y = Math.floor(i / b.w);
  return N4.some(([dx, dy]) => inside(b.w, x + dx, y + dy) && b.cells[(y + dy) * b.w + x + dx].t === 2);
}

/** Espalha por setor (grade 3x3), em rodizio, para nenhum canto ficar muito melhor. */
function scatterBySector(b: CTBoard, rng: Rng, n: number, apply: (c: CTCell) => void, prefer?: (i: number) => boolean) {
  const S = 3;
  const sectors: number[][] = Array.from({ length: S * S }, () => []);
  b.cells.forEach((c, i) => {
    if (!isFreeCell(c)) return;
    const sx = Math.min(S - 1, Math.floor(((i % b.w) / b.w) * S));
    const sy = Math.min(S - 1, Math.floor((Math.floor(i / b.w) / b.h) * S));
    sectors[sy * S + sx].push(i);
  });
  const lists = sectors.map((l) => {
    const sh = shuffle(l, rng);
    // as preferidas vao para o fim (pop tira do fim)
    return prefer ? [...sh.filter((i) => !prefer(i)), ...sh.filter(prefer)] : sh;
  });
  let s = Math.floor(rng() * lists.length);
  let placed = 0;
  let guard = 0;
  while (placed < n && guard < n * 20) {
    guard++;
    const list = lists[s % lists.length];
    s++;
    while (list.length) {
      const i = list.pop()!;
      if (!isFreeCell(b.cells[i])) continue;
      apply(b.cells[i]);
      placed++;
      break;
    }
    if (lists.every((l) => l.length === 0)) break;
  }
}

function plantGroves(b: CTBoard, rng: Rng, groves: number) {
  for (let g = 0; g < groves; g++) {
    const free = b.cells.map((c, i) => i).filter((i) => isFreeCell(b.cells[i]));
    if (!free.length) return;
    let cur = free[Math.floor(rng() * free.length)];
    const n = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      b.cells[cur].tree = true;
      const cx = cur % b.w;
      const cy = Math.floor(cur / b.w);
      const opts = N4.map(([dx, dy]) => [cx + dx, cy + dy]).filter(
        ([x, y]) => inside(b.w, x, y) && isFreeCell(b.cells[y * b.w + x])
      );
      if (!opts.length) break;
      const [nx, ny] = opts[Math.floor(rng() * opts.length)];
      cur = ny * b.w + nx;
    }
  }
}

function tryMap(n: number, rng: Rng): CTBoard | null {
  const size = diaboMapSize(n);
  const mask = islandMask(size, rng);
  const cells: CTCell[] = [];
  for (let i = 0; i < size * size; i++) cells.push({ t: mask[i] ? 1 : 0 });
  const b: CTBoard = { id: 'mapa', w: size, h: size, owner: null, cells };
  const area0 = cells.filter((c) => c.t === 1).length;
  if (area0 < size * size * 0.55) return null;

  const rivers = n >= 3 ? 2 : 1;
  for (let r = 0; r < rivers; r++) carveRiver(b, rng);
  const lakes = 2 + Math.floor(rng() * 3);
  for (let l = 0; l < lakes; l++) carveLake(b, rng);

  // pedacinhos de terra isolados viram agua
  components(size, size, (i) => cells[i].t === 1).forEach((comp) => {
    if (comp.length < 10) comp.forEach((i) => (cells[i].t = 2));
  });
  const land = cells.filter((c) => c.t === 1).length;
  const water = cells.filter((c) => c.t === 2).length;
  if (water > land * 0.4 || land < size * size * 0.4) return null;

  plantGroves(b, rng, 2 + Math.round(land * 0.012));
  scatterBySector(b, rng, Math.round(land * 0.025), (c) => (c.tok = 2), (i) => nearWater(b, i));
  scatterBySector(b, rng, Math.round(land * 0.05), (c) => (c.tok = 1));
  scatterBySector(b, rng, Math.round(land * 0.04), (c) => (c.tok = -1));
  const acts = Math.max(2, Math.round(land * 0.012));
  scatterBySector(b, rng, acts, (c) => (c.act = 'tree'));
  scatterBySector(b, rng, acts, (c) => (c.act = 'tok'));
  return b;
}

/** Mapa procedural do Plano do Diabo: ilha organica, rios, lagos, bosques e fichas por setor. */
export function buildDiaboMap(n: number, rng: Rng): CTBoard {
  for (let attempt = 0; attempt < 40; attempt++) {
    const b = tryMap(n, rng);
    if (b) return b;
  }
  // reserva: quadrado cheio com um lago (nunca deveria ser preciso)
  const size = diaboMapSize(n);
  const cells: CTCell[] = Array.from({ length: size * size }, () => ({ t: 1 as const }));
  const b: CTBoard = { id: 'mapa', w: size, h: size, owner: null, cells };
  carveLake(b, rng);
  return b;
}

/* ------------------------------------------------------------------ */
/* Contas                                                              */
/* ------------------------------------------------------------------ */

/** Casa de agua coberta por bloco-ponte nao conta como terra do territorio, mas liga os dois lados. */
export function territories(b: CTBoard, pid: string): number[][] {
  return components(b.w, b.h, (i) => b.cells[i].o === pid);
}

export function largestTerritory(b: CTBoard, pid: string): number {
  return Math.max(0, ...territories(b, pid).map((c) => c.length));
}

/**
 * Maior quadrado k x k so com blocos de `pid` que inclui uma casa nova e que e maior do que qualquer
 * quadrado antigo (sem as casas novas) que se sobrepoe a ele. Devolve k (0 se nao ganhou bonus).
 */
export function newSquare(b: CTBoard, pid: string, fresh: Set<number>): number {
  const { w, h } = b;
  const own = (i: number) => b.cells[i].o === pid;
  // somas acumuladas: casas suas e casas novas
  const P = new Int32Array((w + 1) * (h + 1));
  const F = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const k = (y + 1) * (w + 1) + x + 1;
      P[k] = (own(i) ? 1 : 0) + P[k - 1] + P[k - (w + 1)] - P[k - (w + 1) - 1];
      F[k] = (fresh.has(i) ? 1 : 0) + F[k - 1] + F[k - (w + 1)] - F[k - (w + 1) - 1];
    }
  const sum = (A: Int32Array, x: number, y: number, k: number) =>
    A[(y + k) * (w + 1) + x + k] - A[y * (w + 1) + x + k] - A[(y + k) * (w + 1) + x] + A[y * (w + 1) + x];
  // quadrados antigos maximos (canto inferior direito + tamanho)
  const dp = new Int32Array(w * h);
  const old: Array<{ x: number; y: number; k: number }> = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!own(i) || fresh.has(i)) continue;
      const v = x > 0 && y > 0 ? 1 + Math.min(dp[i - 1], dp[i - w], dp[i - w - 1]) : 1;
      dp[i] = v;
      if (v >= 2) old.push({ x, y, k: v });
    }
  for (let k = Math.min(w, h); k >= 2; k--) {
    for (let y = 0; y + k <= h; y++)
      for (let x = 0; x + k <= w; x++) {
        if (sum(P, x, y, k) !== k * k || sum(F, x, y, k) === 0) continue;
        let k0 = 0;
        for (const o of old) {
          const ox0 = o.x - o.k + 1;
          const oy0 = o.y - o.k + 1;
          if (o.x >= x && ox0 <= x + k - 1 && o.y >= y && oy0 <= y + k - 1) k0 = Math.max(k0, o.k);
        }
        if (k > k0) return k;
      }
  }
  return 0;
}

/* ------------------------------------------------------------------ */
/* Contratos                                                           */
/* ------------------------------------------------------------------ */

export interface DiaboContractDef {
  id: string;
  label: string;
  check: (b: CTBoard, pid: string, bestSq: number) => boolean;
}

const countCells = (b: CTBoard, f: (c: CTCell, i: number) => boolean) => b.cells.filter(f).length;

export const DIABO_CONTRACTS: DiaboContractDef[] = [
  { id: 'q3', label: 'Feche um quadrado 3×3', check: (_b, _p, sq) => sq >= 3 },
  { id: 'arv3', label: 'Tenha 3 árvores dentro de furos', check: (b, p) => countCells(b, (c) => c.o === p && c.k === 2 && !!c.tree) >= 3 },
  {
    id: 'agua8',
    label: 'Encoste em 8 casas de água',
    check: (b, p) =>
      countCells(b, (c, i) => {
        if (c.t !== 2 || c.o) return false;
        const x = i % b.w;
        const y = Math.floor(i / b.w);
        return N4.some(([dx, dy]) => inside(b.w, x + dx, y + dy) && b.cells[(y + dy) * b.w + x + dx].o === p);
      }) >= 8
  },
  { id: 'terr3', label: 'Tenha 3 territórios separados', check: (b, p) => territories(b, p).length >= 3 },
  { id: 'ponte2', label: 'Ponha 2 blocos-ponte na água', check: (b, p) => countCells(b, (c) => c.o === p && c.k === 3 && c.t === 2) >= 2 },
  { id: 'blocos20', label: 'Coloque 20 blocos', check: (b, p) => countCells(b, (c) => c.o === p) >= 20 }
];

export function contractDef(id: string): DiaboContractDef | undefined {
  return DIABO_CONTRACTS.find((c) => c.id === id);
}

export function drawContracts(rng: Rng): Array<{ id: string; done: string[] }> {
  return shuffle(DIABO_CONTRACTS, rng)
    .slice(0, 3)
    .map((c) => ({ id: c.id, done: [] }));
}

/** Mare Alta: casas livres na beira da agua viram agua. Devolve quantas viraram. */
export function raiseTide(b: CTBoard, rng: Rng): number {
  const cand = shuffle(
    b.cells.map((c, i) => i).filter((i) => isFreeCell(b.cells[i]) && nearWater(b, i)),
    rng
  );
  const n = Math.min(cand.length, 2 + Math.floor(rng() * 3));
  for (let k = 0; k < n; k++) b.cells[cand[k]].t = 2;
  return n;
}
