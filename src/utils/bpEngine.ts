/**
 * Com Terra - modo Arquiteto, nas regras do Bärenpark (Phil Walker-Harding, 2017).
 *
 * Cada jogador monta o proprio parque com areas de 4x4. Na vez: coloca UMA peca do seu estoque (encostada nas que ja
 * colocou; a primeira vai em qualquer lugar), nunca no Fosso. Cada icone coberto da uma recompensa:
 *   - Carrinho de mao (verde): uma Area Verde (banheiro, parquinho, rua de comida, rio).
 *   - Betoneira (branca): a Casa de Animal do topo de qualquer pilha (ou uma Area Verde).
 *   - Escavadeira (laranja): qualquer Cercado (ou Casa de Animal, ou Area Verde).
 *   - Equipe de obra: a area de parque do topo de uma das duas pilhas, posta encostada no parque (no maximo 4 areas,
 *     nunca mais perto do jogador do que a Entrada).
 * Area completa (tudo coberto menos o Fosso) = a Estatua de Urso de maior valor que sobrou vai para o Fosso.
 * Sem peca que caiba: passa a vez e pega uma Area Verde. Quem completar as 4 areas encerra: os outros jogam mais uma vez.
 * Pontos: valor das pecas no parque (Areas Verdes valem 0) + estatuas. Desempate: valor das pecas que sobraram no estoque.
 *
 * Confirmado nas regras: icones, colocacao, passar, estatuas, fim e desempate, valores das estatuas por numero de jogadores,
 * tamanhos (verde 1 a 3 casas, casa 4, cercado 5) e quantidades. ESTIMADO (o manual so mostra em figuras): os formatos de
 * cada peca, os valores das casas com 4 jogadores, os valores dos cercados e o desenho dos icones de cada area.
 * Tudo isso esta nas constantes abaixo para ajustar.
 */
import type { BPArea, BPIcon, BPPark, BPRewardKind, BPState, BPTile, BPTileType, CTBoard, CTCell } from '../types/game';
import { allOrientations, mulberry32, shapeCells, type Rng } from './comTerraEngine';

// ---------------------------------------------------------------- pecas
const S = (rows: string[]): number[][] => rows.map((r) => r.split('').map((ch) => (ch === '#' ? 1 : 0)));

export const BP_TILE_META: Record<BPTileType, { label: string; kind: 'green' | 'house' | 'enclosure'; shape: number[][] }> = {
  toilet: { label: 'Banheiro', kind: 'green', shape: S(['#']) },
  playground: { label: 'Parquinho', kind: 'green', shape: S(['##']) },
  food: { label: 'Rua de comida', kind: 'green', shape: S(['##', '#.']) },
  river: { label: 'Rio', kind: 'green', shape: S(['###']) },
  'h-polar': { label: 'Casa do urso-polar', kind: 'house', shape: S(['###', '.#.']) },
  'h-gobi': { label: 'Casa do urso-de-gobi', kind: 'house', shape: S(['##.', '.##']) },
  'h-koala': { label: 'Casa do coala', kind: 'house', shape: S(['###', '#..']) },
  'h-panda': { label: 'Casa do panda', kind: 'house', shape: S(['##', '##']) },
  'e-polar': { label: 'Cercado do urso-polar', kind: 'enclosure', shape: S(['###', '#.#']) },
  'e-gobi': { label: 'Cercado do urso-de-gobi', kind: 'enclosure', shape: S(['.#.', '###', '.#.']) },
  'e-koala': { label: 'Cercado do coala', kind: 'enclosure', shape: S(['####', '#...']) },
  'e-panda': { label: 'Cercado do panda', kind: 'enclosure', shape: S(['##.', '.##', '..#']) }
};

export const BP_GREENS: BPTileType[] = ['toilet', 'playground', 'food', 'river'];
export const BP_HOUSES: BPTileType[] = ['h-polar', 'h-gobi', 'h-koala', 'h-panda'];
export const BP_ENCLOSURES: BPTileType[] = ['e-polar', 'e-gobi', 'e-koala', 'e-panda'];

/** Casas de animal por pilha (de baixo para cima), por numero de jogadores. 2 e 3 jogadores: regra; 4: estimado. */
function houseValues(n: number): number[] {
  if (n <= 2) return [2, 4, 6];
  if (n === 3) return [2, 3, 4, 5, 6];
  if (n === 4) return [2, 3, 3, 4, 5, 5, 6];
  // adaptacao para 5+ jogadores: 2 casas a mais por jogador extra, ainda de 2 a 6
  const len = 7 + (n - 4) * 2;
  return Array.from({ length: len }, (_, k) => 2 + Math.floor((k * 5) / len));
}
/** Cercados (3 de cada animal, sempre todos): valores estimados, de baixo para cima. */
const ENCLOSURE_VALUES: Record<string, number[]> = {
  'e-polar': [6, 7, 8],
  'e-gobi': [5, 6, 7],
  'e-koala': [5, 6, 7],
  'e-panda': [6, 7, 8]
};
/** Estatuas de urso por numero de jogadores (regra); a de maior valor sai primeiro. */
export function statueValues(n: number): number[] {
  if (n <= 2) return [16, 14, 12, 10, 8, 6, 4, 2];
  if (n === 3) return [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3];
  // 4 jogadores: todas (16 a 1). Adaptacao para 5+: 4 por jogador, do maior para 1
  const total = Math.max(16, n * 4);
  return Array.from({ length: total }, (_, i) => total - i);
}
/** Areas Verdes no estoque geral: banheiros e parquinhos todos; ruas e rios 4 por jogador (regra). */
function greenCounts(n: number): Record<string, number> {
  // 5+ jogadores (adaptacao): banheiros e parquinhos crescem junto
  const base = Math.max(10, Math.ceil(2.5 * n));
  return { toilet: base, playground: base, food: 4 * n, river: 4 * n };
}

/** Cercados por animal: 3 (regra); 5+ jogadores ganham um a mais a cada 2 extras, valendo menos. */
function enclosureValues(type: string, n: number): number[] {
  const base = ENCLOSURE_VALUES[type];
  const extra = n > 4 ? Math.ceil((n - 4) / 2) : 0;
  return [...Array.from({ length: extra }, (_, i) => base[0] - extra + i), ...base];
}

// ---------------------------------------------------------------- areas do parque (4x4)
// Icones: P = fosso, W = carrinho, C = betoneira, E = escavadeira, O = equipe de obra, . = vazio.
/** Areas sorteadas a cada partida (procedural): os icones sao fixos por tipo de area, as posicoes (e o fosso) mudam. */
function genArea(rng: Rng, entrance: boolean): string[] {
  const cells: string[] = Array(16).fill('.');
  const free = () => {
    const opts = cells.map((c, i) => (c === '.' ? i : -1)).filter((i) => i >= 0);
    return opts[Math.floor(rng() * opts.length)];
  };
  cells[free()] = 'P';
  // Como no Barenpark: Entrada = 3 carrinhos, 2 betoneiras e 1 equipe de obra (nunca escavadeira).
  // Demais areas = 2 carrinhos, 2 betoneiras, 1 escavadeira e 1 equipe de obra. So as posicoes sao sorteadas.
  const bag: string[] = entrance ? ['W', 'W', 'W', 'C', 'C', 'O'] : ['W', 'W', 'C', 'C', 'E', 'O'];
  bag.forEach((ch) => (cells[free()] = ch));
  return [0, 1, 2, 3].map((r) => cells.slice(r * 4, r * 4 + 4).join(''));
}

const ICON: Record<string, BPIcon | null> = { P: 'pit', W: 'wheel', C: 'cement', E: 'excavator', O: 'crew', '.': null };
const toIcons = (rows: string[]): Array<BPIcon | null> => rows.join('').split('').map((ch) => ICON[ch] ?? null);

/** Grade fixa do parque: 7 areas de largura por 4 de altura; a Entrada fica embaixo, no meio (nada abaixo dela). */
export const BP_GRID_W = 7;
export const BP_GRID_H = 4;
export const BP_ENTRANCE = { ax: 3, ay: 3 };
export const BP_MAX_AREAS = 4;

// ---------------------------------------------------------------- utilidades
function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const key = (x: number, y: number) => x + ',' + y;

let uidN = 0;
function makeTile(type: BPTileType, pts: number, tag: string): BPTile {
  uidN += 1;
  return { uid: `${tag}-${type}-${uidN}-${Math.floor(Math.random() * 1e6)}`, type, pts };
}
export const tileShape = (t: BPTile | BPTileType): number[][] => BP_TILE_META[typeof t === 'string' ? t : t.type].shape;
export const tileKind = (t: BPTile | BPTileType) => BP_TILE_META[typeof t === 'string' ? t : t.type].kind;

// ---------------------------------------------------------------- montagem
export function buildBPState(playerIds: string[], seed = Date.now()): BPState {
  const rng = mulberry32(seed);
  const n = Math.max(1, playerIds.length);
  const entrances = playerIds.map(() => genArea(rng, true));
  const parks: Record<string, BPPark> = {};
  // regra: 1o banheiro, 2o parquinho, 3o parquinho (rua de comida com 3 jogadores), 4o rua de comida. Ninguem comeca com rio.
  // 5+ jogadores (adaptacao): os demais tambem comecam com rua de comida.
  const starting = (i: number): BPTileType => (i === 0 ? 'toilet' : i === 1 ? 'playground' : i === 2 ? (n === 3 ? 'food' : 'playground') : 'food');
  playerIds.forEach((pid, i) => {
    parks[pid] = {
      areas: [{ id: `ent-${i}`, ax: BP_ENTRANCE.ax, ay: BP_ENTRANCE.ay, icons: toIcons(entrances[i % entrances.length]), entrance: true }],
      cells: {},
      supply: [makeTile(starting(i), 0, 'start')],
      statues: []
    };
  });
  const houses: Record<string, number[]> = {};
  BP_HOUSES.forEach((h) => (houses[h] = houseValues(n)));
  const enclosures: Record<string, number[]> = {};
  BP_ENCLOSURES.forEach((e) => (enclosures[e] = enclosureValues(e, n)));
  // 3 areas por jogador (como as 12 do jogo com 4), sorteadas agora
  const areaDeck = Array.from({ length: 3 * n }, (_, i) => ({ id: `pa-${i}`, rows: genArea(rng, false) }));
  const half = Math.ceil(areaDeck.length / 2);
  return {
    turnIdx: 0,
    order: [...playerIds],
    parks,
    greens: greenCounts(n),
    houses,
    enclosures,
    areaPiles: [areaDeck.slice(0, half).map((a) => a.id), areaDeck.slice(half).map((a) => a.id)],
    areaDefs: Object.fromEntries(areaDeck.map((a) => [a.id, a.rows.join('/')])),
    statues: statueValues(n),
    pending: [],
    endTriggeredBy: null,
    turnsLeft: null,
    finished: false,
    log: []
  };
}

// ---------------------------------------------------------------- consultas
export const bpCurrent = (s: BPState): string | null => (s.finished ? null : s.order[s.turnIdx % s.order.length] ?? null);

export function areaAt(park: BPPark, x: number, y: number): BPArea | null {
  const ax = Math.floor(x / 4);
  const ay = Math.floor(y / 4);
  return park.areas.find((a) => a.ax === ax && a.ay === ay) || null;
}
export function iconAt(park: BPPark, x: number, y: number): BPIcon | null {
  const a = areaAt(park, x, y);
  if (!a) return null;
  return a.icons[(y - a.ay * 4) * 4 + (x - a.ax * 4)] ?? null;
}

export interface BPCheck {
  ok: boolean;
  reason?: string;
}

/** A peca (no formato m, canto em x,y) cabe no parque? */
export function bpCanPlace(park: BPPark, m: number[][], x: number, y: number): BPCheck {
  const cells = shapeCells(m).map((c) => ({ x: x + c.dx, y: y + c.dy }));
  for (const c of cells) {
    if (!areaAt(park, c.x, c.y)) return { ok: false, reason: 'Fora do parque' };
    if (iconAt(park, c.x, c.y) === 'pit') return { ok: false, reason: 'Não pode cobrir o fosso' };
    if (park.cells[key(c.x, c.y)]) return { ok: false, reason: 'Já tem peça aqui' };
  }
  if (Object.keys(park.cells).length > 0) {
    const touches = cells.some((c) =>
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ].some(([dx, dy]) => park.cells[key(c.x + dx, c.y + dy)])
    );
    if (!touches) return { ok: false, reason: 'Tem que encostar numa peça já colocada' };
  }
  return { ok: true };
}

export function bpHasPlacement(park: BPPark, type: BPTileType): boolean {
  for (const m of allOrientations(tileShape(type))) {
    for (let y = 0; y < BP_GRID_H * 4; y++) for (let x = 0; x < BP_GRID_W * 4; x++) if (bpCanPlace(park, m, x, y).ok) return true;
  }
  return false;
}

export const bpCanPlaceAny = (park: BPPark): boolean => park.supply.some((t) => bpHasPlacement(park, t.type));

export function areaComplete(park: BPPark, a: BPArea): boolean {
  for (let i = 0; i < 16; i++) {
    if (a.icons[i] === 'pit') continue;
    if (!park.cells[key(a.ax * 4 + (i % 4), a.ay * 4 + Math.floor(i / 4))]) return false;
  }
  return true;
}

/** Onde da para encaixar uma area nova: encostada (lado inteiro) numa area sua, nao abaixo da Entrada, dentro da grade. */
export function areaSpots(park: BPPark): Array<{ ax: number; ay: number }> {
  if (park.areas.length >= BP_MAX_AREAS) return [];
  const taken = new Set(park.areas.map((a) => key(a.ax, a.ay)));
  const out: Array<{ ax: number; ay: number }> = [];
  park.areas.forEach((a) =>
    [
      [1, 0],
      [-1, 0],
      [0, -1],
      [0, 1]
    ].forEach(([dx, dy]) => {
      const ax = a.ax + dx;
      const ay = a.ay + dy;
      if (ax < 0 || ax >= BP_GRID_W || ay < 0 || ay > BP_ENTRANCE.ay || taken.has(key(ax, ay))) return;
      if (!out.some((o) => o.ax === ax && o.ay === ay)) out.push({ ax, ay });
    })
  );
  return out;
}

export function bpScore(s: BPState, pid: string): number {
  const park = s.parks[pid];
  if (!park) return 0;
  const placed = new Map<string, number>();
  Object.values(park.cells).forEach((c) => placed.set(c.uid, c.pts));
  let sum = 0;
  placed.forEach((v) => (sum += v));
  return sum + park.statues.reduce((a, b) => a + b, 0);
}
export const bpSupplyValue = (s: BPState, pid: string) => (s.parks[pid]?.supply || []).reduce((a, t) => a + t.pts, 0);

export function bpRanking(s: BPState): Array<{ playerId: string; points: number; tie: number }> {
  return s.order
    .map((pid) => ({ playerId: pid, points: bpScore(s, pid), tie: bpSupplyValue(s, pid) }))
    .sort((a, b) => b.points - a.points || b.tie - a.tie);
}

/** O que cada recompensa permite pegar (regra: icones maiores tambem aceitam os menores). */
export function rewardOptions(s: BPState, kind: BPRewardKind): BPTileType[] {
  const greens = BP_GREENS.filter((g) => (s.greens[g] || 0) > 0);
  const houses = BP_HOUSES.filter((h) => (s.houses[h] || []).length > 0);
  const encl = BP_ENCLOSURES.filter((e) => (s.enclosures[e] || []).length > 0);
  if (kind === 'wheel' || kind === 'pass') return greens;
  if (kind === 'cement') return [...houses, ...greens];
  return [...encl, ...houses, ...greens];
}
/** Valor que a peca daria agora (topo da pilha). */
export function rewardValue(s: BPState, type: BPTileType): number {
  const k = tileKind(type);
  if (k === 'house') return s.houses[type]?.[s.houses[type].length - 1] ?? 0;
  if (k === 'enclosure') return s.enclosures[type]?.[s.enclosures[type].length - 1] ?? 0;
  return 0;
}

// ---------------------------------------------------------------- acoes
function log(s: BPState, playerId: string, text: string): BPState {
  return { ...s, log: [...s.log.slice(-29), { id: (s.log[s.log.length - 1]?.id ?? 0) + 1, playerId, text }] };
}

function nextTurn(s: BPState): BPState {
  if (s.turnsLeft !== null) {
    const left = s.turnsLeft - 1;
    if (left <= 0) return { ...s, turnsLeft: 0, finished: true, pending: [] };
    return { ...s, turnsLeft: left, turnIdx: s.turnIdx + 1, pending: [] };
  }
  return { ...s, turnIdx: s.turnIdx + 1, pending: [] };
}

/** Fim da vez de quem jogou: estatuas das areas completas, gatilho do fim de jogo e passa para o proximo. */
function closeTurn(s0: BPState, pid: string): BPState {
  let s = s0;
  let park = s.parks[pid];
  const areas = park.areas.map((a) => {
    if (a.statue !== undefined || !areaComplete(park, a)) return a;
    const [top, ...rest] = s.statues;
    s = { ...s, statues: rest };
    s = log(s, pid, top ? `completou uma área: estátua de ${top}` : 'completou uma área (sem estátua sobrando)');
    return { ...a, statue: top ?? 0 };
  });
  const statues = areas.filter((a) => a.statue !== undefined).map((a) => a.statue as number);
  park = { ...park, areas, statues };
  s = { ...s, parks: { ...s.parks, [pid]: park } };
  if (s.endTriggeredBy === null && areas.length >= BP_MAX_AREAS && areas.every((a) => areaComplete(park, a))) {
    s = log({ ...s, endTriggeredBy: pid, turnsLeft: s.order.length }, pid, 'completou o parque! Os outros jogam mais uma vez');
  }
  return nextTurn(s);
}

/** Coloca uma peca do estoque. Os icones cobertos viram recompensas pendentes. */
export function bpPlace(s: BPState, pid: string, uid: string, m: number[][], x: number, y: number): BPState {
  if (s.finished || bpCurrent(s) !== pid || s.pending.length > 0) return s;
  const park = s.parks[pid];
  const tile = park.supply.find((t) => t.uid === uid);
  if (!tile) return s;
  const okShape = allOrientations(tileShape(tile)).some((o) => JSON.stringify(o) === JSON.stringify(m));
  if (!okShape || !bpCanPlace(park, m, x, y).ok) return s;
  const cells = { ...park.cells };
  const pending: BPRewardKind[] = [];
  shapeCells(m).forEach((c) => {
    const cx = x + c.dx;
    const cy = y + c.dy;
    cells[key(cx, cy)] = { uid: tile.uid, type: tile.type, pts: tile.pts };
    const ic = iconAt(park, cx, cy);
    if (ic && ic !== 'pit') pending.push(ic);
  });
  let next: BPState = {
    ...s,
    parks: { ...s.parks, [pid]: { ...park, cells, supply: park.supply.filter((t) => t.uid !== uid) } },
    pending: pending.map((k) => ({ playerId: pid, kind: k }))
  };
  next = log(next, pid, `colocou ${BP_TILE_META[tile.type].label}${tile.pts ? ` (+${tile.pts})` : ''}`);
  return next.pending.length > 0 ? autoSkipCrew(next) : closeTurn(next, pid);
}

/** Equipe de obra sem lugar (4 areas, pilhas vazias ou sem encaixe) nao da nada: some da fila. */
function autoSkipCrew(s: BPState): BPState {
  let out = s;
  while (out.pending.length > 0) {
    const p = out.pending[0];
    if (p.kind !== 'crew') break;
    const park = out.parks[p.playerId];
    const empty = out.areaPiles.every((pile) => pile.length === 0);
    if (areaSpots(park).length > 0 && !empty) break;
    out = { ...out, pending: out.pending.slice(1) };
  }
  if (out.pending.length === 0 && s.pending.length > 0) return closeTurn(out, s.pending[0].playerId);
  return out;
}

/** Resolve a primeira recompensa pendente pegando uma peca (carrinho, betoneira, escavadeira ou passar a vez). */
export function bpTakeReward(s: BPState, pid: string, type: BPTileType): BPState {
  const p = s.pending[0];
  if (!p || p.playerId !== pid || p.kind === 'crew') return s;
  if (!rewardOptions(s, p.kind).includes(type)) return s;
  const kind = tileKind(type);
  let pts = 0;
  let next: BPState = { ...s };
  if (kind === 'green') next = { ...next, greens: { ...next.greens, [type]: (next.greens[type] || 0) - 1 } };
  else if (kind === 'house') {
    const pile = [...next.houses[type]];
    pts = pile.pop() ?? 0;
    next = { ...next, houses: { ...next.houses, [type]: pile } };
  } else {
    const pile = [...next.enclosures[type]];
    pts = pile.pop() ?? 0;
    next = { ...next, enclosures: { ...next.enclosures, [type]: pile } };
  }
  const park = next.parks[pid];
  next = { ...next, parks: { ...next.parks, [pid]: { ...park, supply: [...park.supply, makeTile(type, pts, pid)] } }, pending: next.pending.slice(1) };
  next = log(next, pid, `pegou ${BP_TILE_META[type].label}${pts ? ` (${pts})` : ''}`);
  if (p.kind === 'pass') return nextTurn(next);
  return next.pending.length > 0 ? autoSkipCrew(next) : closeTurn(next, pid);
}

/** Equipe de obra: pega a area do topo da pilha escolhida e encaixa no parque. */
export function bpPlaceArea(s: BPState, pid: string, pileIdx: 0 | 1, ax: number, ay: number): BPState {
  const p = s.pending[0];
  if (!p || p.playerId !== pid || p.kind !== 'crew') return s;
  let idx: 0 | 1 = pileIdx;
  if (s.areaPiles[idx].length === 0) idx = idx === 0 ? 1 : 0;
  const pile = s.areaPiles[idx];
  if (pile.length === 0) return s;
  const park = s.parks[pid];
  if (!areaSpots(park).some((o) => o.ax === ax && o.ay === ay)) return s;
  const id = pile[pile.length - 1];
  const rows = s.areaDefs[id].split('/');
  const piles = [...s.areaPiles] as [string[], string[]];
  piles[idx] = pile.slice(0, -1);
  let next: BPState = {
    ...s,
    areaPiles: piles,
    parks: { ...s.parks, [pid]: { ...park, areas: [...park.areas, { id, ax, ay, icons: toIcons(rows) }] } },
    pending: s.pending.slice(1)
  };
  next = log(next, pid, 'abriu uma área nova no parque');
  return next.pending.length > 0 ? autoSkipCrew(next) : closeTurn(next, pid);
}

/** Icones da area do topo de uma pilha (para mostrar as 2 opcoes antes de escolher). */
export function topAreaIcons(s: BPState, pileIdx: 0 | 1): Array<BPIcon | null> | null {
  const pile = s.areaPiles[pileIdx];
  if (!pile.length) return null;
  return toIcons(s.areaDefs[pile[pile.length - 1]].split('/'));
}

/** Sem peca que caiba: passa a vez e pega uma Area Verde. */
export function bpPass(s: BPState, pid: string): BPState {
  if (s.finished || bpCurrent(s) !== pid || s.pending.length > 0) return s;
  if (bpCanPlaceAny(s.parks[pid])) return s;
  if (rewardOptions(s, 'pass').length === 0) return log(nextTurn(s), pid, 'passou a vez');
  return log({ ...s, pending: [{ playerId: pid, kind: 'pass' }] }, pid, 'passou a vez');
}

/** Visual: o parque como tabuleiro do Com Terra (dono da peca = categoria, para colorir por tipo). */
export function bpBoard(s: BPState, pid: string): CTBoard {
  const park = s.parks[pid];
  const w = BP_GRID_W * 4;
  const h = BP_GRID_H * 4;
  const cells: CTCell[] = Array.from({ length: w * h }, () => ({ t: 0 as const }));
  park?.areas.forEach((a) => {
    for (let i = 0; i < 16; i++) {
      const x = a.ax * 4 + (i % 4);
      const y = a.ay * 4 + Math.floor(i / 4);
      const c: CTCell = { t: 1, z: a.id };
      const ic = a.icons[i];
      if (ic) c.bpi = ic;
      if (ic === 'pit' && a.statue !== undefined) c.statue = a.statue;
      const placed = park.cells[key(x, y)];
      if (placed) {
        c.o = tileKind(placed.type);
        c.k = 1;
        c.p = placed.uid;
      }
      cells[y * w + x] = c;
    }
  });
  return { id: 'bp-' + pid, w, h, owner: pid, cells };
}

/** Ordem de "donos" usada para colorir: Areas Verdes teal, Casas crimson, Cercados ambar. */
export const BP_COLOR_ORDER = ['green', 'house', 'enclosure'];
