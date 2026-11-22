import type { GeoEtapa, GeoGuessGameState, Player } from '../types/game';
import type { GeoLocal } from '../data/geoguessBank';

/**
 * GeoGuess: cinco pistas visuais sobre o mesmo lugar. Acertar na 1a imagem
 * vale 5, na 2a vale 4, e assim por diante (como no quadro "Desafio de hoje: GeoGuessr" do programa).
 *
 * Todos chutam ao mesmo tempo pelo celular; o diretor marca acertou/errou na TV. Quem acerta fica travado com os
 * pontos da imagem em que chutou; quem erra chuta de novo na proxima imagem.
 */

/** Fonte dos tiles. Trocar aqui muda o jogo inteiro (ver docs/geoguess.md para licenca e alternativas). */
export const GEO_TILE_SOURCE = {
  url: (z: number, x: number, y: number) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  attribution: 'Powered by Esri · Imagens: Esri, Maxar, Earthstar Geographics e comunidade GIS'
};

/** Enquadramentos aéreos de apoio, com centros diferentes nas pistas intermediárias. */
export const GEO_ETAPAS_PADRAO: GeoEtapa[] = [
  { z: 19, span: 0.85, dx: 35, dy: -27 },
  { z: 19, span: 1.4, dx: -85, dy: 62 },
  { z: 18, span: 3.5, dx: 90, dy: -105 },
  { z: 15, span: 3.5, dx: -360, dy: 230 },
  { z: 13, span: 3.5 }
];
export const GEO_REVELACAO_PADRAO: GeoEtapa = { z: 17, span: 3 };

export const GEO_MAX_POINTS = GEO_ETAPAS_PADRAO.length;

const shiftEtapa = (e: GeoEtapa, escala: number): GeoEtapa => ({
  z: e.z + escala,
  span: e.span,
  // um zoom a menos cobre o dobro do chao: o deslocamento acompanha
  dx: e.dx === undefined ? undefined : e.dx * Math.pow(2, -escala),
  dy: e.dy === undefined ? undefined : e.dy * Math.pow(2, -escala)
});

export function geoEtapasDo(local: Pick<GeoLocal, 'escala' | 'etapas' | 'close'>): { etapas: GeoEtapa[]; revelacao: GeoEtapa } {
  const escala = local.escala || 0;
  const base = local.close ? [{ ...GEO_ETAPAS_PADRAO[0], ...local.close }, ...GEO_ETAPAS_PADRAO.slice(1)] : GEO_ETAPAS_PADRAO;
  return {
    etapas: local.etapas?.length ? local.etapas : base.map((e) => shiftEtapa(e, escala)),
    revelacao: shiftEtapa(GEO_REVELACAO_PADRAO, escala)
  };
}

export function buildGeoGuessState(local: GeoLocal): GeoGuessGameState {
  const { etapas, revelacao } = geoEtapasDo(local);
  return {
    phase: 'READY',
    localId: local.id,
    nome: local.nome,
    lugar: local.lugar,
    pergunta: local.pergunta,
    dica: local.dica,
    lat: local.lat,
    lon: local.lon,
    etapas,
    revelacao,
    stage: 0,
    guesses: {},
    solvedAt: {},
    history: [],
    pointsAwarded: {},
    showGuesses: false,
    answerVisible: false
  };
}

export const GEO_PERGUNTA_TEXTO: Record<GeoGuessGameState['pergunta'], string> = {
  local: 'Que lugar é esse?',
  cidade: 'Que cidade é essa?',
  pais: 'Que país é esse?'
};

/** Quanto vale acertar na etapa (0-based): 5, 4, 3, 2, 1. */
export const geoValueAt = (s: Pick<GeoGuessGameState, 'etapas'>, stage: number): number => Math.max(1, s.etapas.length - stage);
export const geoValue = (s: GeoGuessGameState): number => geoValueAt(s, s.stage);

export const geoSolved = (s: GeoGuessGameState, playerId: string): boolean => s.solvedAt[playerId] !== undefined;

export function geoLocalTurn(s: GeoGuessGameState, players: Pick<Player, 'id'>[]) {
  if (s.phase !== 'PLAYING') return undefined;
  return players.find(player => !geoSolved(s, player.id) && s.guesses[player.id]?.stage !== s.stage)?.id;
}

/** Jogador manda (ou troca) o palpite da etapa atual. Quem ja acertou ou ja foi julgado nesta etapa nao muda. */
export function submitGeoGuess(prev: GeoGuessGameState, playerId: string, text: string, now = Date.now()): GeoGuessGameState {
  const clean = text.trim().slice(0, 60);
  if (prev.phase !== 'PLAYING' || !clean || geoSolved(prev, playerId)) return prev;
  const cur = prev.guesses[playerId];
  if (cur && cur.stage === prev.stage && cur.verdict) return prev;
  return { ...prev, guesses: { ...prev.guesses, [playerId]: { text: clean, stage: prev.stage, at: now } } };
}

/**
 * Diretor julga. Com palpite escrito, julga o texto; sem palpite (jogo numa tela so, chute falado), registra o chute
 * oral. Acertou: ganha o valor da etapa e fica travado. Se todos acertaram, a rodada vai para a revelacao.
 */
export function judgeGeoGuess(prev: GeoGuessGameState, playerId: string, correct: boolean, playerIds: string[]): GeoGuessGameState {
  if (prev.phase !== 'PLAYING' || geoSolved(prev, playerId)) return prev;
  const g = prev.guesses[playerId];
  const guess = g && g.stage === prev.stage ? g : { text: '', stage: prev.stage, at: Date.now() };
  const judged = { ...guess, verdict: correct ? ('right' as const) : ('wrong' as const) };
  const next: GeoGuessGameState = {
    ...prev,
    guesses: { ...prev.guesses, [playerId]: judged },
    history: [...prev.history, { playerId, text: judged.text, stage: prev.stage, correct }]
  };
  if (!correct) return next;
  const solved = { ...prev.solvedAt, [playerId]: prev.stage };
  const withPts: GeoGuessGameState = {
    ...next,
    solvedAt: solved,
    pointsAwarded: { ...prev.pointsAwarded, [playerId]: geoValueAt(prev, prev.stage) }
  };
  return playerIds.length > 0 && playerIds.every((id) => solved[id] !== undefined) ? revealGeo(withPts) : withPts;
}

/** Proxima imagem: vale 1 a menos; palpites de quem nao acertou sao descartados. Depois da ultima, revela. */
export function nextGeoStage(prev: GeoGuessGameState): GeoGuessGameState {
  if (prev.phase !== 'PLAYING') return prev;
  if (prev.stage >= prev.etapas.length - 1) return revealGeo(prev);
  const guesses: GeoGuessGameState['guesses'] = {};
  Object.entries(prev.guesses).forEach(([pid, g]) => {
    if (geoSolved(prev, pid)) guesses[pid] = g;
  });
  return { ...prev, stage: prev.stage + 1, guesses, showGuesses: false };
}

export function revealGeo(prev: GeoGuessGameState): GeoGuessGameState {
  if (prev.phase === 'REVEAL') return prev;
  return { ...prev, phase: 'REVEAL', answerVisible: true };
}

/** Palpites aguardando o diretor na etapa atual. */
export function pendingGeoGuesses(s: GeoGuessGameState): string[] {
  return Object.entries(s.guesses)
    .filter(([pid, g]) => g.stage === s.stage && !g.verdict && !geoSolved(s, pid))
    .map(([pid]) => pid);
}

export const geoPlayersWithGuess = (s: GeoGuessGameState, players: Pick<Player, 'id'>[]): number =>
  players.filter((p) => geoSolved(s, p.id) || s.guesses[p.id]?.stage === s.stage).length;

/* ---- Tiles: recorte de satelite em volta de um ponto ---- */

const TILE = 256;

/** Pixel global (no zoom z) de uma coordenada, projecao Web Mercator. */
export function geoPixel(lat: number, lon: number, z: number): { x: number; y: number } {
  const n = TILE * Math.pow(2, z);
  const r = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  };
}

export const metersPerPixel = (lat: number, z: number): number => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, z);

export interface GeoTile {
  key: string;
  url: string;
  /** posicao e tamanho em pixels da area de exibicao */
  left: number;
  top: number;
  size: number;
}

/**
 * Tiles que cobrem uma area de `width` x `height` pixels centrada no ponto (mais o deslocamento da etapa).
 * `span` = quantos tiles cabem na largura: o tile e esticado para `width / span` pixels.
 */
export function geoTilesFor(lat: number, lon: number, etapa: GeoEtapa, width: number, height: number): GeoTile[] {
  if (width <= 0 || height <= 0) return [];
  const { z, span } = etapa;
  const size = width / span;
  const k = size / TILE;
  const mpp = metersPerPixel(lat, z);
  const c = geoPixel(lat, lon, z);
  const cx = (c.x + (etapa.dx || 0) / mpp) * k;
  const cy = (c.y - (etapa.dy || 0) / mpp) * k;
  const x0 = cx - width / 2;
  const y0 = cy - height / 2;
  const n = Math.pow(2, z);
  const tiles: GeoTile[] = [];
  for (let ty = Math.floor(y0 / size); ty * size < y0 + height; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(x0 / size); tx * size < x0 + width; tx++) {
      const wx = ((tx % n) + n) % n;
      tiles.push({ key: `${z}/${tx}/${ty}`, url: GEO_TILE_SOURCE.url(z, wx, ty), left: tx * size - x0, top: ty * size - y0, size });
    }
  }
  return tiles;
}
