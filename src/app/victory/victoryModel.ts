import type { GameId, GameRoom, Player, TeamId } from '../../types/game';
import { GAME_NAMES } from '../gameNames';
import { TEAM_META, getActiveTeamIds } from '../../utils/teamUtils';
import { GAME_EXTRAS, teamOwner, type ExtraDef } from '../../utils/matchExtras';

/** Jogos em que cada um joga por si (os demais pontuam por equipe). */
export const INDIVIDUAL_GAMES: GameId[] = [
  'nota',
  'limite',
  'quem-sou-eu',
  'onde-estou',
  'respostas-sem-perguntas',
  'estadios',
  'pontinhos',
  'com-terra',
  'perguntas-e-verdades'
];

export const isIndividualGame = (g: GameId | null | undefined) => !!g && INDIVIDUAL_GAMES.includes(g);

export interface VictoryEntry {
  /** id do jogador ou `team:X` */
  id: string;
  name: string;
  score: number;
  rank: number;
  isWinner: boolean;
  /** jogadores representados (1 no individual, a equipe inteira no modo equipe) */
  members: Player[];
  teamId?: TeamId;
  teamColor?: string;
}

export interface VictoryStat {
  key: string;
  label: string;
  value: string;
  /** numero proprio do jogo (os outros sao a base comum) */
  gameExtra?: boolean;
}

export interface VictoryMedal {
  id: 'destaque' | 'quase-la' | 'pipoca';
  title: string;
  name: string;
  detail: string;
}

export interface VictoryModel {
  gameId: GameId | null;
  gameName: string;
  mode: 'individual' | 'team';
  tie: boolean;
  /** quem esta no topo (mais de um quando empata) */
  champions: VictoryEntry[];
  /** todo mundo, do 1o ao ultimo */
  ranking: VictoryEntry[];
  kicker: string;
  watermark: string;
  /** frase curta do jogo sob o nome do campeao */
  line: string;
  stats: VictoryStat[];
  medals: VictoryMedal[];
  totalRounds: number;
}

const pct = (won: number, played: number) => (played > 0 ? Math.round((won / played) * 100) : 0);

/** Texto curto de um extra ("3 cravadas", "acertou com 2 pistas"). */
export function formatExtraLine(def: ExtraDef, value: number): string {
  if (def.key === 'menosPistas') return value === 1 ? 'acertou com 1 pista' : `acertou com ${value} pistas`;
  if (def.key === 'menosPalavras') return value === 1 ? 'acertou vendo 1 palavra' : `acertou vendo ${value} palavras`;
  if (def.key === 'maiorJogada') return `maior jogada: +${value}`;
  if (def.key === 'maiorLance') return `maior lance: ${value}`;
  return `${value} ${def.label.toLowerCase()}`;
}

/** Pontuacao final por jogador ou equipe, ja ordenada e com posicao (empate divide a posicao). */
function rankEntries(list: Omit<VictoryEntry, 'rank' | 'isWinner'>[]): VictoryEntry[] {
  const sorted = [...list].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const top = sorted[0]?.score ?? 0;
  let lastScore = Number.NaN;
  let lastRank = 0;
  return sorted.map((e, i) => {
    const rank = e.score === lastScore ? lastRank : i + 1;
    lastScore = e.score;
    lastRank = rank;
    return { ...e, rank, isWinner: top > 0 && e.score === top };
  });
}

export function buildVictoryModel(room: GameRoom): VictoryModel {
  const gameId = room.activeGame;
  const gameName = gameId ? GAME_NAMES[gameId] : 'PARTIDA';
  const individual = isIndividualGame(gameId);
  const extras = room.matchExtras || {};
  const defs = gameId ? GAME_EXTRAS[gameId] || [] : [];
  const players = room.players || [];

  let ranking: VictoryEntry[];
  if (individual) {
    ranking = rankEntries(
      players.map((p) => ({ id: p.id, name: p.name, score: p.score || 0, members: [p] }))
    );
  } else {
    const teamIds = getActiveTeamIds(room);
    ranking = rankEntries(
      teamIds.map((t) => {
        const members = players.filter((p) => p.team === t);
        const teamName = room.teams[t]?.name || TEAM_META[t].defaultName;
        return {
          id: teamOwner(t),
          // equipe de uma pessoa so: mostra a pessoa
          name: members.length === 1 ? members[0].name : teamName,
          score: room.teams[t]?.score || 0,
          members,
          teamId: t,
          teamColor: TEAM_META[t].hex
        };
      })
    );
  }

  const champions = ranking.filter((e) => e.isWinner);
  const tie = champions.length !== 1;
  const champ = champions[0] || ranking[0];
  const champSize = champ?.members.length || 0;

  const kicker = tie
    ? 'Empate no topo'
    : individual || champSize <= 1
    ? 'Campeão da partida'
    : champSize === 2
    ? 'Dupla campeã'
    : 'Equipe campeã';
  const watermark = tie ? 'EMPATE' : individual || champSize <= 1 ? 'CAMPEÃO' : 'CAMPEÕES';

  // Numeros: do campeao (ou do primeiro, no empate)
  const rec = (champ && extras[champ.id]) || {};
  const champPlayer = individual ? champ?.members[0] : undefined;
  const played = individual
    ? champPlayer?.roundsPlayed || rec._played || 0
    : rec._played || room.roundLog?.length || 0;
  const won = individual ? champPlayer?.roundsWon ?? rec._won ?? 0 : rec._won ?? 0;

  const stats: VictoryStat[] = [
    { key: 'pontos', label: 'Pontos', value: String(champ?.score ?? 0) },
    { key: 'rodadas', label: individual ? 'Rodadas pontuando' : 'Rodadas vencidas', value: `${won}/${played}` },
    { key: 'aproveitamento', label: 'Aproveitamento', value: `${pct(won, played)}%` },
    { key: 'sequencia', label: 'Maior sequência', value: String(rec._maxSeq ?? 0) }
  ];
  const shownDefs = defs.slice(0, 2);
  shownDefs.forEach((d) => {
    const v = rec[d.key];
    stats.push({ key: d.key, label: d.label, value: v === undefined ? '0' : String(v), gameExtra: true });
  });

  const primary = shownDefs[0];
  const primaryVal = primary ? rec[primary.key] : undefined;
  const line =
    !tie && primary && primaryVal !== undefined && primaryVal > 0 ? formatExtraLine(primary, primaryVal) : '';

  // Medalhas da resenha
  const medals: VictoryMedal[] = [];
  if (primary) {
    const candidates = ranking
      .map((e) => ({ e, v: extras[e.id]?.[primary.key] }))
      .filter((x): x is { e: VictoryEntry; v: number } => typeof x.v === 'number' && x.v > 0);
    if (candidates.length > 0) {
      const best = candidates.sort((a, b) => (primary.agg === 'min' ? a.v - b.v : b.v - a.v))[0];
      medals.push({
        id: 'destaque',
        title: 'Destaque',
        name: best.e.name,
        detail: formatExtraLine(primary, best.v)
      });
    }
  }
  if (!tie) {
    const second = ranking.find((e) => !e.isWinner);
    if (second && champ) {
      const gap = champ.score - second.score;
      medals.push({
        id: 'quase-la',
        title: 'Quase lá',
        name: second.name,
        detail: gap === 1 ? 'ficou a 1 ponto' : `ficou a ${gap} pontos`
      });
    }
  }
  const last = ranking[ranking.length - 1];
  if (ranking.length >= 3 && last && !last.isWinner && last.rank > (ranking[1]?.rank ?? 1)) {
    medals.push({ id: 'pipoca', title: 'Troféu pipoca', name: last.name, detail: 'assistiu de camarote' });
  }

  return {
    gameId,
    gameName,
    mode: individual ? 'individual' : 'team',
    tie,
    champions,
    ranking,
    kicker,
    watermark,
    line,
    stats,
    medals,
    totalRounds: played
  };
}
