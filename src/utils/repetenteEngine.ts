import type {
  Player,
  RepetenteGameState,
  RepetenteGroup,
  RepetenteGroupResult,
  TeamId
} from '../types/game';

const ARTICLES = new Set(['o', 'a', 'os', 'as', 'um', 'uma']);

/**
 * Normaliza a palavra para comparar: sem acento, caixa ou pontuacao, espacos colapsados e sem artigo inicial
 * ("O Neymar" = "neymar"). Plural e apelidos continuam diferentes: quem decide e o juiz.
 */
export function normalizeAnswer(raw: string): string {
  const words = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  while (words.length > 1 && ARTICLES.has(words[0])) words.shift();
  return words.join(' ');
}

/**
 * Monta as duplas. Cada equipe com 2 ou mais jogadores forma uma dupla (com 3+, todos precisam combinar).
 * Sem nenhuma equipe com 2+ jogadores (ex.: 2 jogadores na sala), todos formam uma dupla cooperativa.
 */
export function buildRepetenteGroups(players: Pick<Player, 'id' | 'team'>[], teamIds: TeamId[]): RepetenteGroup[] {
  const groups: RepetenteGroup[] = [];
  for (const team of teamIds) {
    const ids = players.filter((p) => p.team === team).map((p) => p.id);
    if (ids.length >= 2) groups.push({ id: `team-${team}`, team, playerIds: ids });
  }
  if (groups.length === 0 && players.length >= 2) {
    groups.push({ id: 'coop', playerIds: players.map((p) => p.id) });
  }
  return groups;
}

export function buildRepetenteState(input: {
  theme: string;
  category: string;
  groups: RepetenteGroup[];
  timerSeconds: number;
}): RepetenteGameState {
  return {
    phase: 'READY',
    theme: input.theme,
    category: input.category,
    groups: input.groups,
    answers: {},
    timerSeconds: input.timerSeconds,
    timerActive: false,
    overrides: {}
  };
}

/** Todos que precisam escrever (quem esta em alguma dupla). */
export const repetenteWriters = (s: RepetenteGameState): string[] => s.groups.flatMap((g) => g.playerIds);

export function allRepetenteSubmitted(s: RepetenteGameState): boolean {
  return repetenteWriters(s).every((id) => (s.answers[id] ?? '').trim().length > 0);
}

/** Guarda a palavra do jogador (so na fase de escrita; vazia nao vale). */
export function submitRepetenteAnswer(prev: RepetenteGameState, playerId: string, text: string): RepetenteGameState {
  if (prev.phase !== 'WRITING') return prev;
  if (!repetenteWriters(prev).includes(playerId)) return prev;
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return prev;
  return { ...prev, answers: { ...prev.answers, [playerId]: clean } };
}

/** Uma dupla combinou quando todas as palavras dela, normalizadas, sao iguais (ou o juiz aceitou). */
export function groupMatched(s: RepetenteGameState, g: RepetenteGroup): boolean {
  if (s.overrides[g.id]) return true;
  const words = g.playerIds.map((id) => normalizeAnswer(s.answers[id] ?? ''));
  return words.every((w) => w.length > 0 && w === words[0]);
}

/**
 * Pontos: dupla que combinou = 1; se so uma dupla combinou (havendo 2 ou mais duplas), ela leva 2
 * (leitura da regra do programa: "a dupla que bateu leva 2 pontos"). Modo cooperativo: 1 ponto para as duas equipes.
 */
export function computeRepetenteResult(s: RepetenteGameState): NonNullable<RepetenteGameState['result']> {
  const matches = s.groups.map((g) => groupMatched(s, g));
  const matchedCount = matches.filter(Boolean).length;
  const soloBonus = s.groups.length >= 2 && matchedCount === 1;
  const pointsByTeam: Record<TeamId, number> = { A: 0, B: 0, C: 0, D: 0 };
  const groups: RepetenteGroupResult[] = s.groups.map((g, i) => {
    const matched = matches[i];
    const points = matched ? (soloBonus ? 2 : 1) : 0;
    if (points > 0) {
      if (g.team) pointsByTeam[g.team] += points;
      else {
        pointsByTeam.A += points;
        pointsByTeam.B += points;
      }
    }
    return { groupId: g.id, matched, overruled: Boolean(s.overrides[g.id]) || undefined, points };
  });
  return { groups, pointsByTeam };
}

/** Revela as palavras e fecha a conta. Quem nao escreveu fica com palavra vazia (nao combina). */
export function revealRepetente(prev: RepetenteGameState): RepetenteGameState {
  if (prev.phase === 'REVEAL') return prev;
  const next = { ...prev, phase: 'REVEAL' as const, timerActive: false };
  return { ...next, result: computeRepetenteResult(next) };
}

/** O juiz aceita (ou desfaz) uma dupla como combinada; depois da revelacao o resultado e recalculado. */
export function toggleRepetenteOverride(prev: RepetenteGameState, groupId: string): RepetenteGameState {
  const overrides = { ...prev.overrides, [groupId]: !prev.overrides[groupId] };
  const next = { ...prev, overrides };
  return prev.phase === 'REVEAL' ? { ...next, result: computeRepetenteResult(next) } : next;
}

/** Passa um segundo; ao zerar, revela com o que ja foi escrito. */
export function tickRepetenteTimer(prev: RepetenteGameState): RepetenteGameState {
  if (prev.phase !== 'WRITING' || !prev.timerActive) return prev;
  const next = prev.timerSeconds - 1;
  if (next <= 0) return revealRepetente({ ...prev, timerSeconds: 0 });
  return { ...prev, timerSeconds: next };
}
