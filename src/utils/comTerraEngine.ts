import type {
  CTBoard,
  CTCell,
  CTMode,
  CTPendingKind,
  CTPiece,
  CTVariants,
  ComTerraState
} from '../types/game';
import {
  DEVIL_OWNER,
  DIABO_CONTRACT_REWARD,
  DIABO_DEVILS,
  DIABO_DISCARD_PENALTY,
  DIABO_TERRITORY_BONUS,
  buildDiaboBag,
  buildDiaboMap,
  contractDef,
  drawContracts,
  largestTerritory,
  newSquare,
  raiseTide,
  squareBonus
} from './diaboMap';

/**
 * COM TERRA: motor puro do jogo de poliminos (sem React, sem rede).
 *
 * Matriz da peca: 0 = vazio, 1 = bloco solido, 2 = bloco com furo vazado.
 * Casa do tabuleiro: terreno (0 vazio, 1 terra, 2 agua) + arvore, ficha ou icone de acao, e a peca que a cobre.
 *
 * Tres modos:
 *  - arquiteto: um tabuleiro 8x8 por jogador; turnos em rodizio.
 *  - diabo: um mapa procedural unico; turnos em rodizio com loja aberta; quadrados da mesma cor dao bonus.
 *  - fronteiras: bases 5x5 ligadas a uma ilha central 8x8; cada jogador cresce em trilha continua.
 *
 * Toda funcao que muda o estado valida a jogada e devolve o MESMO objeto quando ela e invalida,
 * porque varios aparelhos mandam atualizacoes sobre o mesmo estado.
 */

export type Rng = () => number;

import { buildBPState } from './bpEngine';

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pontos da peca pelo numero dela (1 a 7 = quantidade de blocos). */
export const CT_PIECE_POINTS = [0, 1, 2, 3, 5, 7, 9, 12];
export const CT_DISCARD_PENALTY = 3;
export const CT_TREE_BONUS = 2;
export const CT_LINE_BONUS = 2;

export const CT_MODE_LABEL: Record<CTMode, string> = {
  arquiteto: 'Reserva · Bärenpark',
  diabo: 'Plano do Diabo',
  fronteiras: 'Fronteiras'
};

/* ------------------------------------------------------------------ */
/* Pecas                                                               */
/* ------------------------------------------------------------------ */

const CATALOG: string[][] = [
  // 1
  ['1'],
  ['2'],
  // 2
  ['11'],
  ['12'],
  // 3
  ['111'],
  ['121'],
  ['11', '10'],
  ['12', '10'],
  ['21', '10'],
  // 4
  ['1111'],
  ['1211'],
  ['11', '11'],
  ['12', '11'],
  ['111', '010'],
  ['121', '010'],
  ['111', '020'],
  ['10', '10', '11'],
  ['10', '20', '11'],
  ['011', '110'],
  ['012', '110'],
  // 5
  ['010', '121', '010'],
  ['101', '111'],
  ['101', '121'],
  ['1000', '1111'],
  ['2000', '1111'],
  ['11', '11', '10'],
  ['12', '11', '10'],
  ['111', '010', '010'],
  ['111', '020', '010'],
  ['100', '110', '011'],
  ['11211'],
  // 6
  ['111', '111'],
  ['121', '111'],
  ['211', '112'],
  ['1111', '1001'],
  ['110', '011', '011'],
  ['1111', '0120'],
  // 7
  ['111', '111', '100'],
  ['1111', '1210'],
  ['11111', '01010'],
  ['010', '121', '111'],
  ['101', '121', '101']
];

export function parseShape(rows: string[]): number[][] {
  return rows.map((r) => Array.from(r).map((ch) => Number(ch)));
}

export function rotateCW(m: number[][]): number[][] {
  const h = m.length;
  const w = m[0].length;
  const out: number[][] = [];
  for (let x = 0; x < w; x++) {
    const row: number[] = [];
    for (let y = h - 1; y >= 0; y--) row.push(m[y][x]);
    out.push(row);
  }
  return out;
}

export function rotateCCW(m: number[][]): number[][] {
  return rotateCW(rotateCW(rotateCW(m)));
}

/** Espelhar X: inverte esquerda e direita. */
export function flipH(m: number[][]): number[][] {
  return m.map((row) => [...row].reverse());
}

/** Espelhar Y: inverte cima e baixo. */
export function flipV(m: number[][]): number[][] {
  return [...m].reverse().map((row) => [...row]);
}

export function allOrientations(m: number[][]): number[][][] {
  const seen = new Set<string>();
  const out: number[][][] = [];
  let cur = m;
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const key = JSON.stringify(cur);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(cur);
      }
      cur = rotateCW(cur);
    }
    cur = flipH(cur);
  }
  return out;
}

export function shapeCells(m: number[][]): Array<{ dx: number; dy: number; k: 1 | 2 | 3 }> {
  const out: Array<{ dx: number; dy: number; k: 1 | 2 | 3 }> = [];
  m.forEach((row, dy) =>
    row.forEach((v, dx) => {
      if (v === 1 || v === 2 || v === 3) out.push({ dx, dy, k: v });
    })
  );
  return out;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Saco de pecas embaralhado: as pequenas aparecem mais vezes do que as gigantes. */
export function buildBag(rng: Rng, tag: string): CTPiece[] {
  const out: CTPiece[] = [];
  CATALOG.forEach((rows, i) => {
    const shape = parseShape(rows);
    const size = shapeCells(shape).length;
    const copies = size <= 2 ? 2 : size <= 5 ? 2 : 1;
    for (let c = 0; c < copies; c++) {
      out.push({ uid: `${tag}-${i}-${c}`, shape, size, pts: CT_PIECE_POINTS[size] });
    }
  });
  return shuffle(out, rng);
}

/* ------------------------------------------------------------------ */
/* Tabuleiros                                                          */
/* ------------------------------------------------------------------ */

const idx = (b: CTBoard, x: number, y: number) => y * b.w + x;

export function cellAt(b: CTBoard, x: number, y: number): CTCell | null {
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null;
  return b.cells[idx(b, x, y)] || null;
}

function blankBoard(id: string, w: number, h: number, owner: string | null, t: 0 | 1): CTBoard {
  const cells: CTCell[] = [];
  for (let i = 0; i < w * h; i++) cells.push({ t });
  return { id, w, h, owner, cells };
}

const isFree = (c: CTCell) => c.t === 1 && !c.tree && c.tok === undefined && !c.act && !c.o;

interface Features {
  trees: number;
  plus1: number;
  plus2: number;
  minus1: number;
  actTree: number;
  actTok: number;
}

function scatter(b: CTBoard, rng: Rng, f: Features, filter: (c: CTCell, i: number) => boolean = () => true) {
  const free = shuffle(
    b.cells.map((c, i) => i).filter((i) => isFree(b.cells[i]) && filter(b.cells[i], i)),
    rng
  );
  const take = (n: number, apply: (c: CTCell) => void) => {
    for (let k = 0; k < n; k++) {
      const i = free.pop();
      if (i === undefined) return;
      apply(b.cells[i]);
    }
  };
  take(f.trees, (c) => (c.tree = true));
  take(f.plus1, (c) => (c.tok = 1));
  take(f.plus2, (c) => (c.tok = 2));
  take(f.minus1, (c) => (c.tok = -1));
  take(f.actTree, (c) => (c.act = 'tree'));
  take(f.actTok, (c) => (c.act = 'tok'));
}

function buildArquitetoBoards(playerIds: string[], rng: Rng): CTBoard[] {
  const template = blankBoard('t', 8, 8, null, 1);
  scatter(template, rng, { trees: 3, plus1: 3, plus2: 1, minus1: 2, actTree: 1, actTok: 1 });
  // o mesmo terreno para todos: a disputa e pela loja, nao pela sorte do mapa
  return playerIds.map((pid) => ({
    ...template,
    id: 'b-' + pid,
    owner: pid,
    cells: template.cells.map((c) => ({ ...c }))
  }));
}

/** Bases em volta da ilha: cima, direita, baixo, esquerda (ate 4 jogadores). */
const FRONT_BASES: Array<{ x: number; y: number }> = [
  { x: 6, y: 0 },
  { x: 13, y: 7 },
  { x: 7, y: 13 },
  { x: 0, y: 6 }
];
const FRONT_SLOTS: Record<number, number[]> = { 1: [0], 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };

function buildFronteirasBoard(playerIds: string[], rng: Rng): CTBoard[] {
  const b = blankBoard('mapa', 18, 18, null, 0);
  for (let y = 5; y <= 12; y++)
    for (let x = 5; x <= 12; x++) {
      const c = b.cells[idx(b, x, y)];
      c.t = 1;
      c.z = 'ilha';
    }
  // um lago no meio da ilha
  [
    [8, 8],
    [9, 8],
    [8, 9],
    [9, 9]
  ].forEach(([x, y]) => (b.cells[idx(b, x, y)].t = 2));
  const slots = FRONT_SLOTS[Math.min(4, Math.max(1, playerIds.length))];
  playerIds.slice(0, 4).forEach((pid, i) => {
    const base = FRONT_BASES[slots[i]];
    for (let y = base.y; y < base.y + 5; y++)
      for (let x = base.x; x < base.x + 5; x++) {
        const c = b.cells[idx(b, x, y)];
        c.t = 1;
        c.z = pid;
      }
    scatter(b, rng, { trees: 1, plus1: 1, plus2: 0, minus1: 0, actTree: 0, actTok: 0 }, (c) => c.z === pid);
  });
  // a ilha concentra as fichas que valem a viagem
  scatter(b, rng, { trees: 5, plus1: 6, plus2: 7, minus1: 5, actTree: 2, actTok: 2 }, (c) => c.z === 'ilha');
  return [b];
}

/* ------------------------------------------------------------------ */
/* Estado                                                              */
/* ------------------------------------------------------------------ */

export function clampComTerraRounds(n: number | undefined): number {
  const v = Math.round(Number(n) || 8);
  return Math.min(12, Math.max(3, v));
}

export function comTerraMaxPlayers(mode?: CTMode): number {
  // Arquiteto (Barenpark adaptado) vai ate 8; Plano do Diabo e Fronteiras foram desenhados para 4
  return mode === 'arquiteto' ? 8 : 4;
}

function refill(s: ComTerraState): ComTerraState {
  let bag = s.bag || [];
  const shop = [...(s.shop || [])];
  let bagNo = s.bagNo;
  while (shop.length < s.shopSize) {
    if (bag.length === 0) {
      bagNo += 1;
      const rng = mulberry32(s.seed + bagNo * 7919);
      bag = s.mode === 'diabo' ? buildDiaboBag(rng, 'p' + bagNo) : buildBag(rng, 'p' + bagNo);
    }
    shop.push(bag[0]);
    bag = bag.slice(1);
  }
  return { ...s, bag, shop, bagNo };
}

export function buildComTerraState(
  mode: CTMode,
  players: Array<{ id: string }>,
  totalRounds: number,
  seed: number = Date.now() % 2147483647,
  /** so para testes: o Arquiteto antigo (loja e tabuleiro 8x8), antes de virar Barenpark */
  classicArquiteto = false,
  /** Plano do Diabo: Mare Alta e Contratos */
  variants: CTVariants = {}
): ComTerraState {
  const order = players.slice(0, comTerraMaxPlayers(mode)).map((p) => p.id);
  const rng = mulberry32(seed);
  const boards =
    mode === 'arquiteto'
      ? buildArquitetoBoards(order, rng)
      : mode === 'diabo'
      ? [buildDiaboMap(order.length, rng)]
      : buildFronteirasBoard(order, rng);
  const pointsAwarded: Record<string, number> = {};
  order.forEach((id) => (pointsAwarded[id] = 0));
  const base: ComTerraState = {
    mode,
    phase: 'TURN',
    round: 1,
    totalRounds: clampComTerraRounds(totalRounds),
    order,
    queue: order,
    turnIdx: 0,
    shop: [],
    bag: [],
    bagNo: 0,
    shopSize: mode === 'diabo' ? order.length + 3 : 5,
    hand: {},
    pickSeq: {},
    sabotaged: [],
    pending: [],
    boards,
    pointsAwarded,
    log: [],
    seq: 0,
    seed
  };
  if (mode === 'diabo') {
    const devils: Record<string, number> = {};
    const bestSq: Record<string, number> = {};
    order.forEach((id) => {
      devils[id] = DIABO_DEVILS;
      bestSq[id] = 0;
    });
    base.devils = devils;
    base.bestSq = bestSq;
    base.variants = { mare: !!variants.mare, contratos: !!variants.contratos };
    if (variants.contratos) base.contracts = drawContracts(mulberry32(seed ^ 0x5bd1e995));
  }
  if (mode === 'arquiteto' && !classicArquiteto) {
    // Arquiteto = Barenpark: o estado do jogo vive em `bp`; a loja e os tabuleiros antigos nao sao usados.
    return { ...base, shop: [], bag: [], boards: [], bp: buildBPState(order, seed) };
  }
  return refill(base);
}

/* ------------------------------------------------------------------ */
/* Consulta                                                            */
/* ------------------------------------------------------------------ */

export type CTStage = 'pick' | 'place' | 'action' | 'sabotage' | 'wait' | 'done';

export function currentPlayerId(s: ComTerraState): string | null {
  if (s.phase === 'TURN' || s.phase === 'PLACE') return (s.queue || [])[s.turnIdx] || null;
  return null;
}

export function pendingFor(s: ComTerraState, pid: string): CTPendingKind | null {
  const p = (s.pending || []).find((x) => x.playerId === pid);
  return p ? p.kind : null;
}

/** O que este jogador precisa fazer agora. */
export function playerStage(s: ComTerraState, pid: string): CTStage {
  if (s.phase === 'SUMMARY') return 'done';
  if (!(s.order || []).includes(pid)) return 'wait';
  const hand = (s.hand || {})[pid];
  if (s.phase === 'PICK') return hand ? 'wait' : 'pick';
  if (s.phase === 'SABOTAGE') return (s.sabotaged || []).includes(pid) ? 'wait' : 'sabotage';
  if (currentPlayerId(s) !== pid) return 'wait';
  if (pendingFor(s, pid)) return 'action';
  if (hand) return 'place';
  return s.phase === 'TURN' ? 'pick' : 'wait';
}

/** Quem pode agir agora (um jogador nos turnos; varios nas fases simultaneas). */
export function actingPlayers(s: ComTerraState): string[] {
  return (s.order || []).filter((pid) => {
    const st = playerStage(s, pid);
    return st !== 'wait' && st !== 'done';
  });
}

export function boardFor(s: ComTerraState, pid: string): CTBoard {
  if (s.mode === 'arquiteto') return s.boards.find((b) => b.owner === pid) || s.boards[0];
  return s.boards[0];
}

function ownsAnyTile(b: CTBoard, pid: string): boolean {
  return b.cells.some((c) => c.o === pid);
}

export interface CTPlaceCheck {
  ok: boolean;
  reason?: string;
}

interface Fit {
  ok: boolean;
  reason?: string;
  touchesOwn: boolean;
  touchesBase: boolean;
}

const N4: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

/** Regras fisicas do encaixe (terreno, ocupacao, arvore no furo, bases) e se encosta em peca sua. */
function fit(s: ComTerraState, b: CTBoard, pid: string, m: number[][], x: number, y: number): Fit {
  let touchesBase = false;
  let touchesOwn = false;
  for (const pc of shapeCells(m)) {
    const cx = x + pc.dx;
    const cy = y + pc.dy;
    const c = cellAt(b, cx, cy);
    if (!c || c.t === 0) return { ok: false, reason: 'Fora do tabuleiro', touchesOwn, touchesBase };
    if (c.t === 2 && pc.k !== 3) return { ok: false, reason: 'Não dá para construir na água', touchesOwn, touchesBase };
    if (c.o) return { ok: false, reason: 'Já tem peça aqui', touchesOwn, touchesBase };
    if (c.tree && pc.k !== 2) return { ok: false, reason: 'Árvore só passa pelo furo', touchesOwn, touchesBase };
    if (s.mode === 'fronteiras') {
      if (c.z !== pid && c.z !== 'ilha') return { ok: false, reason: 'Base de outro jogador', touchesOwn, touchesBase };
      if (c.z === pid) touchesBase = true;
    }
    if (!touchesOwn && N4.some(([dx, dy]) => cellAt(b, cx + dx, cy + dy)?.o === pid)) touchesOwn = true;
  }
  return { ok: true, touchesOwn, touchesBase };
}

/** Cache por tabuleiro (tabuleiros sao imutaveis): existe encaixe desta forma encostado em peca sua? */
const touchCache = new WeakMap<CTBoard, Map<string, boolean>>();

function canTouchOwn(s: ComTerraState, b: CTBoard, pid: string, m: number[][]): boolean {
  const orients = allOrientations(m);
  const key = pid + '|' + orients.map((o) => JSON.stringify(o)).sort()[0];
  let memo = touchCache.get(b);
  if (!memo) {
    memo = new Map();
    touchCache.set(b, memo);
  }
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  let found = false;
  outer: for (const o of orients) {
    for (let y = -o.length + 1; y < b.h; y++)
      for (let x = -o[0].length + 1; x < b.w; x++) {
        const f = fit(s, b, pid, o, x, y);
        if (f.ok && f.touchesOwn) {
          found = true;
          break outer;
        }
      }
  }
  memo.set(key, found);
  return found;
}

/**
 * Pode por a matriz `m` com o canto superior esquerdo em (x, y)?
 * `piece` e a peca que sera colocada (padrao: a da mao). No Plano do Diabo a peca precisa encostar numa
 * peca sua quando isso for possivel; a Peca do Diabo vai em qualquer casa livre.
 */
export function canPlaceAt(
  s: ComTerraState,
  pid: string,
  m: number[][],
  x: number,
  y: number,
  piece: CTPiece | undefined = (s.hand || {})[pid]
): CTPlaceCheck {
  const b = boardFor(s, pid);
  const f = fit(s, b, pid, m, x, y);
  if (!f.ok) return { ok: false, reason: f.reason };
  if (s.mode === 'fronteiras') {
    if (!ownsAnyTile(b, pid)) {
      if (!f.touchesBase) return { ok: false, reason: 'A primeira peça começa na sua base' };
    } else if (!f.touchesOwn) {
      return { ok: false, reason: 'Encoste em uma peça sua: a trilha é contínua' };
    }
  }
  if (s.mode === 'diabo' && !piece?.devil && !f.touchesOwn && ownsAnyTile(b, pid) && canTouchOwn(s, b, pid, m)) {
    return { ok: false, reason: 'Encoste em uma peça sua' };
  }
  return { ok: true };
}

export function hasAnyPlacement(s: ComTerraState, pid: string, piece: CTPiece): boolean {
  const b = boardFor(s, pid);
  for (const m of allOrientations(piece.shape)) {
    for (let y = -m.length + 1; y < b.h; y++)
      for (let x = -m[0].length + 1; x < b.w; x++) {
        if (canPlaceAt(s, pid, m, x, y, piece).ok) return true;
      }
  }
  return false;
}

/** Pode plantar arvore / por ficha nesta casa? */
export function canTarget(s: ComTerraState, pid: string, x: number, y: number): boolean {
  const b = boardFor(s, pid);
  const c = cellAt(b, x, y);
  if (!c || !isFree(c)) return false;
  if (s.mode === 'fronteiras' && c.z !== pid && c.z !== 'ilha') return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Jogadas                                                             */
/* ------------------------------------------------------------------ */

function withLog(s: ComTerraState, text: string, playerId: string, delta: number): ComTerraState {
  const seq = (s.seq || 0) + 1;
  return {
    ...s,
    seq,
    log: [{ id: seq, playerId, text, delta }, ...(s.log || [])].slice(0, 8)
  };
}

function addPoints(s: ComTerraState, pid: string, delta: number): ComTerraState {
  return { ...s, pointsAwarded: { ...s.pointsAwarded, [pid]: (s.pointsAwarded[pid] || 0) + delta } };
}

/** Fim de partida: no Plano do Diabo entra o bonus do maior territorio continuo. */
function toSummary(s: ComTerraState): ComTerraState {
  let next: ComTerraState = { ...s, phase: 'SUMMARY', queue: [], turnIdx: 0, hand: {}, pending: [] };
  if (s.mode === 'diabo' && !s.territoryWinners) {
    const b = s.boards[0];
    const territory: Record<string, number> = {};
    s.order.forEach((pid) => (territory[pid] = largestTerritory(b, pid)));
    const best = Math.max(0, ...Object.values(territory));
    const winners = best > 0 ? s.order.filter((pid) => territory[pid] === best) : [];
    const bonus = winners.length > 1 ? Math.floor(DIABO_TERRITORY_BONUS / 2) : DIABO_TERRITORY_BONUS;
    next = { ...next, territory, territoryWinners: winners };
    winners.forEach((pid) => {
      next = addPoints(next, pid, bonus);
      next = withLog(next, `maior território (${best} casas) +${bonus}`, pid, bonus);
    });
  }
  return next;
}

function startRound(s: ComTerraState, round: number): ComTerraState {
  if (round > s.totalRounds) return toSummary({ ...s, round: s.totalRounds });
  let base = s;
  if (s.mode === 'diabo' && s.variants?.mare && round > 1) {
    const b = s.boards[0];
    const nb: CTBoard = { ...b, cells: b.cells.map((c) => ({ ...c })) };
    const n = raiseTide(nb, mulberry32(s.seed + round * 1013));
    if (n > 0) base = withLog(replaceBoard(s, nb), `A maré subiu: ${n} casas viraram água`, '', 0);
  }
  const shift = (round - 1) % Math.max(1, s.order.length);
  const queue = [...s.order.slice(shift), ...s.order.slice(0, shift)];
  return refill({ ...base, phase: 'TURN', round, queue, turnIdx: 0, hand: {}, pending: [], sabotaged: [] });
}

/** Plano do Diabo: ninguem consegue encaixar nenhuma peca da loja, e a partida acaba. */
export function isStuck(s: ComTerraState): boolean {
  return !s.order.some((pid) => (s.shop || []).some((p) => hasAnyPlacement(s, pid, p)));
}

function endTurn(s: ComTerraState): ComTerraState {
  const cleared = s.mode === 'diabo' ? { ...s, sabotaged: [] } : s;
  if (s.mode === 'diabo' && isStuck(cleared)) return toSummary(cleared);
  const next = s.turnIdx + 1;
  if (next >= (s.queue || []).length) return startRound(cleared, s.round + 1);
  return { ...cleared, turnIdx: next };
}

function afterPlacement(s: ComTerraState, pid: string): ComTerraState {
  if (pendingFor(s, pid)) return s;
  return endTurn(s);
}

/** Compra irreversivel: a peca sai da loja e vai para a mao (so depois da para testar no tabuleiro). */
export function pickPiece(s: ComTerraState, pid: string, uid: string): ComTerraState {
  if (playerStage(s, pid) !== 'pick') return s;
  const piece = (s.shop || []).find((p) => p.uid === uid);
  if (!piece) return s;
  let next: ComTerraState = {
    ...s,
    shop: s.shop.filter((p) => p.uid !== uid),
    hand: { ...(s.hand || {}), [pid]: piece },
    pickSeq: { ...(s.pickSeq || {}), [pid]: (s.seq || 0) + 1 }
  };
  next = withLog(next, piece.devil ? 'pegou a Peça do Diabo' : `pegou a peça ${piece.size}`, pid, 0);
  return refill(next);
}

function replaceBoard(s: ComTerraState, b: CTBoard): ComTerraState {
  return { ...s, boards: s.boards.map((x) => (x.id === b.id ? b : x)) };
}

function sameShape(a: number[][], b: number[][]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface CTPlacementResult {
  board: CTBoard;
  delta: number;
  notes: string[];
  pending: ComTerraState['pending'];
  /** lado do quadrado novo que deu bonus (0 = nenhum) */
  square: number;
}

/** Calcula o efeito de um encaixe sem mudar o estado (a IA usa para comparar jogadas). */
export function previewPlacement(s: ComTerraState, pid: string, m: number[][], x: number, y: number): CTPlacementResult | null {
  if (playerStage(s, pid) !== 'place') return null;
  const piece = s.hand[pid];
  if (!piece) return null;
  if (!allOrientations(piece.shape).some((o) => sameShape(o, m))) return null;
  if (!canPlaceAt(s, pid, m, x, y).ok) return null;

  const board = boardFor(s, pid);
  const cells = board.cells.map((c) => ({ ...c }));
  const b: CTBoard = { ...board, cells };
  let delta = piece.pts;
  const notes: string[] = [];
  const pending = [...(s.pending || [])];
  const touchedRows = new Set<number>();
  const touchedCols = new Set<number>();
  const fresh = new Set<number>();
  const owner = piece.devil ? DEVIL_OWNER : pid;

  shapeCells(m).forEach((pc) => {
    const cx = x + pc.dx;
    const cy = y + pc.dy;
    const i = idx(b, cx, cy);
    const c = cells[i];
    c.o = owner;
    c.k = pc.k;
    c.p = piece.uid;
    fresh.add(i);
    touchedRows.add(cy);
    touchedCols.add(cx);
    if (piece.devil) {
      // a Peca do Diabo so ocupa: o que estava embaixo se perde
      delete c.tok;
      delete c.act;
    } else if (pc.k === 2) {
      if (c.tree) {
        delta += CT_TREE_BONUS;
        notes.push(`árvore no furo +${CT_TREE_BONUS}`);
      }
      // ficha ou icone dentro do furo ficam a mostra e nao valem nada
    } else if (c.t === 1) {
      // bloco solido (ou ponte sobre a terra) recolhe ficha e icone
      if (c.tok !== undefined) {
        delta += c.tok;
        notes.push(`ficha ${c.tok > 0 ? '+' : ''}${c.tok}`);
        delete c.tok;
      }
      if (c.act) {
        pending.push({ playerId: pid, kind: c.act });
        delete c.act;
      }
    }
  });

  if (s.mode === 'arquiteto') {
    const full = (list: CTCell[]) => list.every((c) => c.t !== 1 || !!c.o);
    let lines = 0;
    touchedRows.forEach((ry) => {
      if (full(cells.slice(ry * b.w, ry * b.w + b.w))) lines++;
    });
    touchedCols.forEach((rx) => {
      const col: CTCell[] = [];
      for (let yy = 0; yy < b.h; yy++) col.push(cells[idx(b, rx, yy)]);
      if (full(col)) lines++;
    });
    if (lines > 0) {
      delta += lines * CT_LINE_BONUS;
      notes.push(`${lines} linha${lines > 1 ? 's' : ''} cheia${lines > 1 ? 's' : ''} +${lines * CT_LINE_BONUS}`);
    }
  }

  let square = 0;
  if (s.mode === 'diabo' && !piece.devil) {
    square = newSquare(b, pid, fresh);
    if (square) {
      const v = squareBonus(square);
      delta += v;
      notes.push(`quadrado ${square}×${square} +${v}`);
    }
  }
  return { board: b, delta, notes, pending, square };
}

/** Contratos do Diabo: quem cumpre primeiro ganha +8, o segundo +4. */
function checkContracts(s: ComTerraState, pid: string): ComTerraState {
  if (!s.contracts?.length) return s;
  const b = s.boards[0];
  const gains: Array<{ label: string; reward: number }> = [];
  const contracts = s.contracts.map((c) => {
    if (c.done.includes(pid) || c.done.length >= DIABO_CONTRACT_REWARD.length) return c;
    const def = contractDef(c.id);
    if (!def || !def.check(b, pid, s.bestSq?.[pid] || 0)) return c;
    gains.push({ label: def.label, reward: DIABO_CONTRACT_REWARD[c.done.length] });
    return { ...c, done: [...c.done, pid] };
  });
  let next: ComTerraState = { ...s, contracts };
  gains.forEach((g) => {
    next = addPoints(next, pid, g.reward);
    next = withLog(next, `cumpriu o contrato "${g.label}" +${g.reward}`, pid, g.reward);
  });
  return next;
}

/** Confirma a peca da mao na posicao (x, y), com a matriz ja girada/espelhada. */
export function placePiece(s: ComTerraState, pid: string, m: number[][], x: number, y: number): ComTerraState {
  const r = previewPlacement(s, pid, m, x, y);
  if (!r) return s;
  const piece = s.hand[pid];
  const hand = { ...s.hand };
  delete hand[pid];
  let next = replaceBoard({ ...s, hand, pending: r.pending }, r.board);
  next = addPoints(next, pid, r.delta);
  if (r.square) next = { ...next, bestSq: { ...(next.bestSq || {}), [pid]: Math.max(next.bestSq?.[pid] || 0, r.square) } };
  const what = piece.devil ? 'soltou a Peça do Diabo' : `encaixou a peça ${piece.size}`;
  next = withLog(next, `${what}${r.notes.length ? ' (' + r.notes.join(', ') + ')' : ''}`, pid, r.delta);
  next = checkContracts(next, pid);
  return afterPlacement(next, pid);
}

/** Errou no olhometro: a peca vai embora e custa pontos. */
export function discardPiece(s: ComTerraState, pid: string): ComTerraState {
  if (playerStage(s, pid) !== 'place') return s;
  const piece = s.hand[pid];
  if (!piece) return s;
  const hand = { ...s.hand };
  delete hand[pid];
  const penalty = s.mode === 'diabo' ? DIABO_DISCARD_PENALTY : CT_DISCARD_PENALTY;
  let next = addPoints({ ...s, hand }, pid, -penalty);
  next = withLog(next, `descartou a peça ${piece.size}`, pid, -penalty);
  return afterPlacement(next, pid);
}

function applyFeature(
  s: ComTerraState,
  pid: string,
  kind: CTPendingKind,
  x: number,
  y: number,
  tokValue: 1 | -1
): ComTerraState | null {
  if (!canTarget(s, pid, x, y)) return null;
  const board = boardFor(s, pid);
  const cells = board.cells.map((c) => ({ ...c }));
  const c = cells[idx(board, x, y)];
  if (kind === 'tree') c.tree = true;
  else c.tok = tokValue === -1 ? -1 : 1;
  return replaceBoard(s, { ...board, cells });
}

/** Resolve a acao ganha ao cobrir um icone (plantar arvore ou por ficha). */
export function resolveAction(s: ComTerraState, pid: string, x: number, y: number, tokValue: 1 | -1 = 1): ComTerraState {
  if (playerStage(s, pid) !== 'action') return s;
  const kind = pendingFor(s, pid)!;
  const applied = applyFeature(s, pid, kind, x, y, tokValue);
  if (!applied) return s;
  const i = applied.pending.findIndex((p) => p.playerId === pid);
  let next: ComTerraState = { ...applied, pending: applied.pending.filter((_, k) => k !== i) };
  next = withLog(next, kind === 'tree' ? 'plantou uma árvore' : `pôs uma ficha ${tokValue > 0 ? '+1' : '-1'}`, pid, 0);
  return afterPlacement(next, pid);
}

export function skipAction(s: ComTerraState, pid: string): ComTerraState {
  if (playerStage(s, pid) !== 'action') return s;
  const i = s.pending.findIndex((p) => p.playerId === pid);
  return afterPlacement({ ...s, pending: s.pending.filter((_, k) => k !== i) }, pid);
}

/** Pode usar um diabinho agora? So na sua vez, antes de pegar a peca, um por vez, 3 por partida. */
export function canSabotage(s: ComTerraState, pid: string): boolean {
  return (
    s.mode === 'diabo' &&
    playerStage(s, pid) === 'pick' &&
    (s.devils?.[pid] || 0) > 0 &&
    !(s.sabotaged || []).includes(pid)
  );
}

/** Diabinho do Plano do Diabo: uma arvore, uma ficha -1 ou uma ficha +1 numa casa livre do mapa. */
export function sabotage(
  s: ComTerraState,
  pid: string,
  kind: CTPendingKind,
  x: number,
  y: number,
  tokValue: 1 | -1 = -1
): ComTerraState {
  if (!canSabotage(s, pid)) return s;
  const applied = applyFeature(s, pid, kind, x, y, tokValue);
  if (!applied) return s;
  const next: ComTerraState = {
    ...applied,
    sabotaged: [...(applied.sabotaged || []), pid],
    devils: { ...(applied.devils || {}), [pid]: (applied.devils?.[pid] || 0) - 1 }
  };
  return withLog(
    next,
    kind === 'tree' ? 'usou um diabinho: árvore no mapa' : `usou um diabinho: ficha ${tokValue > 0 ? '+1' : '-1'}`,
    pid,
    0
  );
}

/**
 * Diretor destrava a partida quando alguem sumiu: quem esta na vez perde a vez sem penalidade.
 */
export function forceAdvance(s: ComTerraState): ComTerraState {
  if (s.phase === 'SUMMARY') return s;
  const pid = currentPlayerId(s);
  if (!pid) return startRound(s, s.round + 1);
  const hand = { ...s.hand };
  delete hand[pid];
  const cleared = { ...s, hand, pending: s.pending.filter((p) => p.playerId !== pid) };
  return endTurn(withLog(cleared, 'perdeu a vez', pid, 0));
}

/** Encerra a partida agora (o diretor decide parar antes do fim). */
export function finishNow(s: ComTerraState): ComTerraState {
  if (s.phase === 'SUMMARY') return s;
  return toSummary(s);
}

export function ranking(s: ComTerraState): Array<{ playerId: string; points: number }> {
  return [...(s.order || [])]
    .map((playerId) => ({ playerId, points: s.pointsAwarded[playerId] || 0 }))
    .sort((a, b) => b.points - a.points);
}
