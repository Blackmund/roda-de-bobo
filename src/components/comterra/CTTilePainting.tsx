import type { BPTileType } from '../../types/game';
import { BP_TILE_META } from '../../utils/bpEngine';
import { shapeCells } from '../../utils/comTerraEngine';
import { useCTSkin } from './CTSkin';

type Cell = { x: number; y: number };
type Orientation = {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
};

function footprint(cells: Cell[]) {
  return cells.map(({ x, y }) => `${x},${y}`).sort().join(';');
}

const paintings = Object.fromEntries(Object.entries(BP_TILE_META).map(([type, { shape }]) => {
  const cols = shape[0].length;
  const rows = shape.length;
  const cells = shapeCells(shape);
  // The same matrix transforms both the occupied cells and the artwork.
  const rotations: Orientation[] = [
    { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 },
    { a: 0, b: 1, c: -1, d: 0, tx: rows, ty: 0 },
    { a: -1, b: 0, c: 0, d: -1, tx: cols, ty: rows },
    { a: 0, b: -1, c: 1, d: 0, tx: 0, ty: cols }
  ];
  const orientations = new Map<string, Orientation>();
  for (const mirrored of [false, true]) {
    for (const rotation of rotations) {
      const { a, b, c, d, tx, ty } = rotation;
      const t = mirrored ? { a: -a, b: -b, c, d, tx: tx + a * cols, ty: ty + b * cols } : rotation;
      const key = footprint(cells.map(({ dx, dy }) => {
        const x = dx + 0.5;
        const y = dy + 0.5;
        return { x: Math.floor(t.a * x + t.c * y + t.tx), y: Math.floor(t.b * x + t.d * y + t.ty) };
      }));
      if (!orientations.has(key)) orientations.set(key, t);
    }
  }
  return [type, { cols, rows, orientations }];
}));

export function CTTilePainting({ type, cells, unit }: { type: BPTileType; cells: Cell[]; unit: number }) {
  const tileDirectory = useCTSkin() === 'cartoon' ? 'tiles-cartoon' : 'tiles';
  const painting = paintings[type];
  if (!painting || cells.length === 0) return null;
  const left = Math.min(...cells.map(({ x }) => x));
  const top = Math.min(...cells.map(({ y }) => y));
  const orientation = painting.orientations.get(footprint(cells.map(({ x, y }) => ({ x: x - left, y: y - top }))));
  if (!orientation) return null;

  const { a, b, c, d, tx, ty } = orientation;
  return (
    <image
      href={`${import.meta.env.BASE_URL}assets/com-terra/${tileDirectory}/${type}.webp`}
      width={painting.cols * unit}
      height={painting.rows * unit}
      transform={`matrix(${a} ${b} ${c} ${d} ${(left + tx) * unit} ${(top + ty) * unit})`}
      pointerEvents="none"
    />
  );
}
