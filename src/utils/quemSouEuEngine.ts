import type { Player, QuemSouEuEntry, QuemSouEuGameState } from '../types/game';
import { QUEM_SOU_EU_IDENTITIES, normalizeIdentity, type QuemSouEuIdentity } from '../data/quemSouEuIdentities';

/** Perguntas de sim/nao por jogador antes de ficar de fora (padrao da casa; o programa nao definiu). */
export const QSE_DEFAULT_MAX_QUESTIONS = 10;

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sorteia `count` identidades diferentes, de preferencia de categorias diferentes e ainda nao usadas. */
export function drawIdentities(
  count: number,
  used: Set<string> = new Set(),
  rng: () => number = Math.random
): QuemSouEuIdentity[] {
  let pool = QUEM_SOU_EU_IDENTITIES.filter((i) => !used.has(normalizeIdentity(i.nome)));
  if (pool.length < count) pool = [...QUEM_SOU_EU_IDENTITIES];
  const shuffled = shuffle(pool, rng);
  const picked: QuemSouEuIdentity[] = [];
  const cats = new Set<string>();
  // 1a passada: uma por categoria; 2a: completa com o que sobrar
  for (const it of shuffled) {
    if (picked.length >= count) break;
    if (!cats.has(it.categoria)) {
      picked.push(it);
      cats.add(it.categoria);
    }
  }
  for (const it of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(it)) picked.push(it);
  }
  return shuffle(picked, rng);
}

export function buildQuemSouEuState(
  players: Pick<Player, 'id'>[],
  identities: QuemSouEuIdentity[],
  firstPlayerIndex = 0,
  maxQuestions = QSE_DEFAULT_MAX_QUESTIONS
): QuemSouEuGameState {
  const entries: QuemSouEuEntry[] = players.map((p, i) => ({
    playerId: p.id,
    identity: identities[i % identities.length].nome,
    category: identities[i % identities.length].categoria,
    ...(identities[i % identities.length].imagem ? { image: identities[i % identities.length].imagem, imageCredit: identities[i % identities.length].credito } : {}),
    status: 'searching',
    questions: 0,
    wrongGuesses: 0
  }));
  return {
    phase: 'READY',
    entries,
    turnPlayerId: players[((firstPlayerIndex % players.length) + players.length) % players.length]?.id ?? '',
    maxQuestions,
    pointsAwarded: {},
    identitiesVisible: false
  };
}

const searching = (s: QuemSouEuGameState) => s.entries.filter((e) => e.status === 'searching');

/** Proximo jogador que ainda procura, depois de `fromId` (rodizio na ordem da sala). */
export function nextSearchingPlayer(s: QuemSouEuGameState, fromId: string): string | null {
  const n = s.entries.length;
  const start = s.entries.findIndex((e) => e.playerId === fromId);
  for (let step = 1; step <= n; step++) {
    const e = s.entries[(start + step + n) % n];
    if (e.status === 'searching') return e.playerId;
  }
  return null;
}

/** Fecha a rodada quando ninguem mais procura. */
function settle(s: QuemSouEuGameState): QuemSouEuGameState {
  if (searching(s).length === 0) return { ...s, phase: 'SUMMARY' };
  const turn = s.entries.find((e) => e.playerId === s.turnPlayerId);
  if (turn && turn.status === 'searching') return s;
  return { ...s, turnPlayerId: nextSearchingPlayer(s, s.turnPlayerId) ?? s.turnPlayerId };
}

/** Pontos de quem descobre em `order`-esimo lugar numa sala de `n` jogadores (1o = n pontos, ate o minimo de 1). */
export function pointsForFoundOrder(order: number, n: number): number {
  return Math.max(1, n - order + 1);
}

/** O jogador da vez fez uma pergunta de sim/nao (ja respondida pelo grupo): a vez passa. */
export function recordQuestion(prev: QuemSouEuGameState): QuemSouEuGameState {
  if (prev.phase !== 'PLAYING') return prev;
  const entries = prev.entries.map((e) => {
    if (e.playerId !== prev.turnPlayerId) return e;
    const questions = e.questions + 1;
    return { ...e, questions, status: questions >= prev.maxQuestions ? ('out' as const) : e.status };
  });
  const me = entries.find((e) => e.playerId === prev.turnPlayerId);
  const out = me?.status === 'out';
  const next = settle({
    ...prev,
    entries,
    lastEvent: out ? 'Acabaram as perguntas: ficou de fora.' : 'Pergunta feita.'
  });
  if (next.phase === 'SUMMARY') return next;
  return { ...next, turnPlayerId: nextSearchingPlayer(next, prev.turnPlayerId) ?? next.turnPlayerId };
}

/** O jogador da vez chutou e errou: gasta a vez. */
export function recordWrongGuess(prev: QuemSouEuGameState): QuemSouEuGameState {
  if (prev.phase !== 'PLAYING') return prev;
  const entries = prev.entries.map((e) =>
    e.playerId === prev.turnPlayerId ? { ...e, wrongGuesses: e.wrongGuesses + 1 } : e
  );
  const next = { ...prev, entries, lastEvent: 'Chute errado.' };
  return { ...next, turnPlayerId: nextSearchingPlayer(next, prev.turnPlayerId) ?? next.turnPlayerId };
}

/** O jogador da vez acertou a identidade: marca a ordem, soma pontos e passa a vez. */
export function recordCorrectGuess(prev: QuemSouEuGameState): QuemSouEuGameState {
  if (prev.phase !== 'PLAYING') return prev;
  const n = prev.entries.length;
  const order = prev.entries.filter((e) => e.status === 'found').length + 1;
  const entries = prev.entries.map((e) =>
    e.playerId === prev.turnPlayerId ? { ...e, status: 'found' as const, foundOrder: order } : e
  );
  const pointsAwarded = {
    ...prev.pointsAwarded,
    [prev.turnPlayerId]: pointsForFoundOrder(order, n)
  };
  const base = { ...prev, entries, pointsAwarded, lastEvent: `Acertou em ${order}º lugar!` };
  if (searching(base).length === 0) return { ...base, phase: 'SUMMARY' };
  return { ...base, turnPlayerId: nextSearchingPlayer(base, prev.turnPlayerId) ?? base.turnPlayerId };
}

/** O diretor encerra a rodada: quem nao descobriu fica sem pontos. */
export function finishQuemSouEuRound(prev: QuemSouEuGameState): QuemSouEuGameState {
  if (prev.phase === 'SUMMARY') return prev;
  return {
    ...prev,
    phase: 'SUMMARY',
    entries: prev.entries.map((e) => (e.status === 'searching' ? { ...e, status: 'out' as const } : e))
  };
}
