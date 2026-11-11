import { GameId, GameRoom, Player, Team, TeamId } from '../types/game';

export interface TeamVisualMeta {
  id: TeamId;
  name: string;
  defaultName: string;
  shortName: string;
  duplaLabel: string;
  equipeLabel: string;
  hexColor: string;
  hex: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  glowClass: string;
  glowShadow: string;
}

export const ALL_TEAM_IDS: readonly TeamId[] = ['A', 'B', 'C', 'D'] as const;

export const TEAM_META: Record<TeamId, TeamVisualMeta> = {
  A: {
    id: 'A',
    name: 'Equipe Alfa',
    defaultName: 'Equipe Alfa',
    shortName: 'Alfa',
    duplaLabel: 'EQUIPE A',
    equipeLabel: 'EQUIPE A (ALFA)',
    hexColor: '#E6194B',
    hex: '#E6194B',
    borderClass: 'border-[#E6194B]',
    bgClass: 'bg-[#E6194B]/15',
    textClass: 'text-rose-300',
    badgeClass: 'bg-[#E6194B] text-white border-[#E6194B]',
    glowClass: 'shadow-[0_0_24px_rgba(230,25,75,0.45)] ring-1 ring-[#E6194B]',
    glowShadow: 'shadow-[0_0_24px_rgba(230,25,75,0.45)] ring-1 ring-[#E6194B]'
  },
  B: {
    id: 'B',
    name: 'Equipe Bravo',
    defaultName: 'Equipe Bravo',
    shortName: 'Bravo',
    duplaLabel: 'EQUIPE B',
    equipeLabel: 'EQUIPE B (BRAVO)',
    hexColor: '#17B8B8',
    hex: '#17B8B8',
    borderClass: 'border-[#17B8B8]',
    bgClass: 'bg-[#17B8B8]/15',
    textClass: 'text-cyan-300',
    badgeClass: 'bg-[#17B8B8] text-black border-[#17B8B8]',
    glowClass: 'shadow-[0_0_24px_rgba(23,184,184,0.45)] ring-1 ring-[#17B8B8]',
    glowShadow: 'shadow-[0_0_24px_rgba(23,184,184,0.45)] ring-1 ring-[#17B8B8]'
  },
  C: {
    id: 'C',
    name: 'Equipe Charlie',
    defaultName: 'Equipe Charlie',
    shortName: 'Charlie',
    duplaLabel: 'EQUIPE C',
    equipeLabel: 'EQUIPE C (CHARLIE)',
    hexColor: '#F59E0B',
    hex: '#F59E0B',
    borderClass: 'border-amber-400',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-300',
    badgeClass: 'bg-amber-400 text-black border-amber-400',
    glowClass: 'shadow-[0_0_24px_rgba(245,158,11,0.45)] ring-1 ring-amber-400',
    glowShadow: 'shadow-[0_0_24px_rgba(245,158,11,0.45)] ring-1 ring-amber-400'
  },
  D: {
    id: 'D',
    name: 'Equipe Delta',
    defaultName: 'Equipe Delta',
    shortName: 'Delta',
    duplaLabel: 'EQUIPE D',
    equipeLabel: 'EQUIPE D (DELTA)',
    hexColor: '#10B981',
    hex: '#10B981',
    borderClass: 'border-emerald-400',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-300',
    badgeClass: 'bg-emerald-400 text-black border-emerald-400',
    glowClass: 'shadow-[0_0_24px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400',
    glowShadow: 'shadow-[0_0_24px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400'
  }
};

export function isTeamBasedGame(gameId: GameId | null | undefined): boolean {
  return gameId === 'tem-ou-nao-tem' || gameId === 'proibido' || gameId === 'duvido' || gameId === 'mimica' || gameId === 'mega-resenha' || gameId === 'repetente';
}

export function getTeamCount(
  roomOrCount?: Pick<GameRoom, 'teamCount' | 'customConfig' | 'players'> | number | null,
  overrideCount?: number | null
): 2 | 3 | 4 {
  const playerCount =
    typeof roomOrCount === 'object' && roomOrCount !== null && Array.isArray(roomOrCount.players)
      ? roomOrCount.players.length
      : undefined;

  let count: 2 | 3 | 4 = 2;

  if (typeof overrideCount === 'number' && (overrideCount === 2 || overrideCount === 3 || overrideCount === 4)) {
    count = overrideCount;
  } else if (typeof roomOrCount === 'number') {
    if (roomOrCount === 3) count = 3;
    else if (roomOrCount === 4) count = 4;
    else count = 2;
  } else {
    const explicit = roomOrCount?.teamCount || roomOrCount?.customConfig?.teamCount;
    if (explicit === 3 || explicit === 4) count = explicit;
    else if (roomOrCount?.players?.some((p) => p.team === 'D')) count = 4;
    else if (roomOrCount?.players?.some((p) => p.team === 'C')) count = 3;
    else count = 2;
  }

  // Safety clamp: If there are 2 players, the match is strictly 1x1 (2 teams max).
  // If there are 3 players, max 3 teams.
  if (playerCount !== undefined && playerCount > 0) {
    if (playerCount <= 2 && count > 2) {
      count = 2;
    } else if (playerCount === 3 && count > 3) {
      count = 3;
    }
  }

  return count;
}

export function getActiveTeamIds(
  roomOrCount?: Pick<GameRoom, 'teamCount' | 'customConfig' | 'players'> | number | null,
  overrideCount?: number | null
): TeamId[] {
  const count = getTeamCount(roomOrCount, overrideCount);
  return ALL_TEAM_IDS.slice(0, count);
}

export function getTeamObject(room: Pick<GameRoom, 'teams'> | null | undefined, teamId: TeamId): Team {
  const existing = room?.teams?.[teamId];
  if (existing) return existing;
  return {
    id: teamId,
    name: TEAM_META[teamId].name,
    score: 0,
    members: []
  };
}

export function getTeamDisplayName(
  room: Pick<GameRoom, 'teams'> | null | undefined,
  teamId: TeamId
): string {
  return room?.teams?.[teamId]?.name || TEAM_META[teamId]?.name || `Equipe ${teamId}`;
}

export function getNextTeamId(
  currentTeam: TeamId,
  activeTeamIds: ReadonlyArray<TeamId> = ['A', 'B'],
  eliminatedTeams: ReadonlyArray<TeamId> = []
): TeamId {
  const validTeams = activeTeamIds.length > 0 ? activeTeamIds : (['A', 'B'] as TeamId[]);
  const startIdx = Math.max(0, validTeams.indexOf(currentTeam));
  for (let offset = 1; offset <= validTeams.length; offset++) {
    const candidate = validTeams[(startIdx + offset) % validTeams.length];
    if (!eliminatedTeams.includes(candidate)) {
      return candidate;
    }
  }
  return validTeams[(startIdx + 1) % validTeams.length] || 'A';
}

export function cyclePlayerTeamId(
  currentTeam: TeamId,
  activeTeamIds: ReadonlyArray<TeamId> = ['A', 'B']
): TeamId {
  return getNextTeamId(currentTeam, activeTeamIds, []);
}

export function pickLeastPopulatedTeam(
  players: ReadonlyArray<Pick<Player, 'team'>>,
  activeTeamIds: ReadonlyArray<TeamId> = ['A', 'B']
): TeamId {
  const validTeams = activeTeamIds.length > 0 ? activeTeamIds : (['A', 'B'] as TeamId[]);
  let bestTeam: TeamId = validTeams[0];
  let bestCount = Number.POSITIVE_INFINITY;
  for (const tid of validTeams) {
    const count = players.filter((p) => p.team === tid).length;
    if (count < bestCount) {
      bestCount = count;
      bestTeam = tid;
    }
  }
  return bestTeam;
}

export function syncTeamsRecordFromPlayers(
  arg1: GameRoom['teams'] | ReadonlyArray<Player> | undefined,
  arg2: ReadonlyArray<Player> | GameRoom['teams'] | undefined,
  resetScores: boolean = false
): GameRoom['teams'] {
  const isArg1Players = Array.isArray(arg1);
  const players: ReadonlyArray<Player> = isArg1Players
    ? (arg1 as ReadonlyArray<Player>)
    : Array.isArray(arg2)
    ? (arg2 as ReadonlyArray<Player>)
    : [];
  const prevTeams: GameRoom['teams'] | undefined = isArg1Players
    ? (arg2 as GameRoom['teams'] | undefined)
    : (arg1 as GameRoom['teams'] | undefined);

  const buildTeam = (tid: TeamId): Team => {
    const existing = prevTeams?.[tid];
    return {
      id: tid,
      name: existing?.name || TEAM_META[tid].name,
      score: resetScores ? 0 : existing?.score || 0,
      members: players.filter((p) => p.team === tid).map((p) => p.id)
    };
  };
  return {
    A: buildTeam('A'),
    B: buildTeam('B'),
    C: buildTeam('C'),
    D: buildTeam('D')
  };
}

export function normalizePlayersToTeamCount(
  players: ReadonlyArray<Player>,
  teamCount: 2 | 3 | 4
): Player[] {
  const activeIds = getActiveTeamIds(teamCount);
  const result: Player[] = [];
  for (const p of players) {
    if (activeIds.includes(p.team)) {
      result.push(p);
    } else {
      const targetTeam = pickLeastPopulatedTeam(result, activeIds);
      result.push({ ...p, team: targetTeam });
    }
  }
  return result;
}

export interface TurnSpotlightDescriptor {
  gameId: GameId;
  isTeamGame: boolean;
  activeTeamId: TeamId | null;
  activeTeamName: string | null;
  activeTeamMeta: TeamVisualMeta | null;
  activePlayer: Player | null;
  secondaryPlayer: Player | null;
  secondaryRoleLabel: string | null;
  roleBadge: string;
  headline: string;
  actionInstruction: string;
  teammates: Player[];
  nextInQueueLabel: string | null;
  canRotatePlayer: boolean;
}

/**
 * Resolves the exact active player and team for the current phase of any game,
 * so the UI can display an unmistakable, high-contrast "JOGADOR DA VEZ" spotlight.
 */
export function resolveCurrentTurnSpotlight(room: GameRoom): TurnSpotlightDescriptor | null {
  const gameId = room.activeGame;
  if (!gameId || room.screen !== 'playing') return null;

  const activeTeamIds = getActiveTeamIds(room);
  const players = room.players || [];

  const getTeamMembers = (tid: TeamId): Player[] => {
    const matching = players.filter((p) => p.team === tid);
    return matching.length > 0 ? matching : players;
  };

  // 1. TEM OU NÃO TEM
  if (gameId === 'tem-ou-nao-tem' && room.temOuNaoTem) {
    const tem = room.temOuNaoTem;
    const tid = activeTeamIds.includes(tem.activeTeam) ? tem.activeTeam : activeTeamIds[0];
    const meta = TEAM_META[tid];
    const teamMembers = getTeamMembers(tid);
    const stepIdx = tem.turnStepIndex ?? Math.max(0, room.roundNumber - 1);
    const explicitPlayer = tem.activePlayerId
      ? teamMembers.find((p) => p.id === tem.activePlayerId)
      : null;
    const activePlayer =
      explicitPlayer || teamMembers[stepIdx % Math.max(1, teamMembers.length)] || players[0] || null;
    const teammates = teamMembers.filter((p) => p.id !== activePlayer?.id);
    const nextTeamId = getNextTeamId(tid, activeTeamIds, tem.eliminatedTeams || []);
    const nextTeamMembers = getTeamMembers(nextTeamId);
    const nextPlayer = nextTeamMembers[0];

    return {
      gameId,
      isTeamGame: true,
      activeTeamId: tid,
      activeTeamName: getTeamDisplayName(room, tid),
      activeTeamMeta: meta,
      activePlayer,
      secondaryPlayer: null,
      secondaryRoleLabel: null,
      roleBadge: tem.freeDomainTeam
        ? `⭐ DOMÍNIO LIVRE — ${meta.equipeLabel}`
        : `🎤 RESPONDENTE DA VEZ (${meta.equipeLabel})`,
      headline: activePlayer
        ? `VEZ DE: ${activePlayer.name.toUpperCase()} (${meta.equipeLabel})`
        : `VEZ DA ${getTeamDisplayName(room, tid).toUpperCase()} (${meta.equipeLabel})`,
      actionInstruction:
        tem.phase === 'ROUND_END'
          ? 'Rodada concluída! Confira o painel e clique em Confirmar Pontos.'
          : tem.freeDomainTeam
          ? `${activePlayer?.name || meta.equipeLabel} tem Domínio Livre para revelar o restante do painel!`
          : `${activePlayer?.name || 'O jogador da vez'} deve falar uma resposta do painel agora!`,
      teammates,
      nextInQueueLabel:
        tem.freeDomainTeam || tem.phase === 'ROUND_END'
          ? null
          : `Próxima equipe: ${getTeamDisplayName(room, nextTeamId)} (${nextPlayer?.name || nextTeamId})`,
      canRotatePlayer: teamMembers.length > 1 && tem.phase !== 'ROUND_END'
    };
  }

  // 2. JOGO DO PROIBIDO
  if (gameId === 'proibido' && room.proibido) {
    const proibido = room.proibido;
    const tid = activeTeamIds.includes(proibido.speakerTeam)
      ? proibido.speakerTeam
      : activeTeamIds[0];
    const refTid = activeTeamIds.includes(proibido.refereeTeam)
      ? proibido.refereeTeam
      : getNextTeamId(tid, activeTeamIds);
    const meta = TEAM_META[tid];
    const teamMembers = getTeamMembers(tid);
    const refMembers = getTeamMembers(refTid);

    const activePlayer =
      players.find((p) => p.id === proibido.speakerPlayerId) ||
      teamMembers[0] ||
      players[0] ||
      null;
    const teammates = teamMembers.filter((p) => p.id !== activePlayer?.id);
    const refereePlayer = refMembers[0] || null;

    return {
      gameId,
      isTeamGame: true,
      activeTeamId: tid,
      activeTeamName: getTeamDisplayName(room, tid),
      activeTeamMeta: meta,
      activePlayer,
      secondaryPlayer: refereePlayer,
      secondaryRoleLabel: `🚨 FISCAL (${TEAM_META[refTid].equipeLabel})`,
      roleBadge: `🗣️ ORADOR DA VEZ (${meta.equipeLabel})`,
      headline: activePlayer
        ? `ORADOR: ${activePlayer.name.toUpperCase()} (${meta.equipeLabel})`
        : `VEZ DA ${getTeamDisplayName(room, tid).toUpperCase()}`,
      actionInstruction:
        proibido.phase === 'READY'
          ? `${activePlayer?.name || 'O Orador'} vai dar dicas para ${
              teammates.map((t) => t.name).join(', ') || 'sua equipe'
            } adivinhar sem falar as palavras proibidas!`
          : proibido.phase === 'SUMMARY'
          ? 'Tempo encerrado! Revise as cartas acertadas e confirme os pontos.'
          : `${activePlayer?.name || 'Orador'} descreve a palavra-alvo! ${
              teammates.map((t) => t.name).join(', ') || 'Parceiro'
            } adivinha!`,
      teammates,
      nextInQueueLabel: refereePlayer
        ? `Fiscalizando faltas: ${refereePlayer.name} (${TEAM_META[refTid].equipeLabel})`
        : `Fiscalizando: ${TEAM_META[refTid].equipeLabel}`,
      canRotatePlayer: teamMembers.length > 1 && proibido.phase !== 'SUMMARY'
    };
  }

  // 3. JOGO DO DUVIDO
  if (gameId === 'duvido' && room.duvido) {
    const duvido = room.duvido;
    const isExecution = duvido.phase === 'EXECUTION';
    const focusTeamId: TeamId =
      isExecution && duvido.challengedTeam
        ? duvido.challengedTeam
        : activeTeamIds.includes(duvido.activeTurnTeam)
        ? duvido.activeTurnTeam
        : activeTeamIds[0];
    const meta = TEAM_META[focusTeamId];
    const teamMembers = getTeamMembers(focusTeamId);
    const explicitPlayerId = isExecution
      ? duvido.challengedPlayerId || duvido.negotiators?.[focusTeamId]
      : duvido.activePlayerId || duvido.negotiators?.[focusTeamId];
    const activePlayer =
      (explicitPlayerId ? teamMembers.find((p) => p.id === explicitPlayerId) : null) ||
      teamMembers[(Math.max(1, room.roundNumber) - 1) % Math.max(1, teamMembers.length)] ||
      players[0] ||
      null;
    const teammates = teamMembers.filter((p) => p.id !== activePlayer?.id);
    const nextTeamId = getNextTeamId(focusTeamId, activeTeamIds);

    return {
      gameId,
      isTeamGame: true,
      activeTeamId: focusTeamId,
      activeTeamName: getTeamDisplayName(room, focusTeamId),
      activeTeamMeta: meta,
      activePlayer,
      secondaryPlayer: null,
      secondaryRoleLabel: null,
      roleBadge: isExecution
        ? `🔥 NA BERLINDA (${meta.equipeLabel})`
        : duvido.phase === 'RESULT'
        ? `🏆 FIM DA RODADA`
        : `🎙️ VEZ NO LEILÃO (${meta.equipeLabel})`,
      headline: isExecution
        ? `NA BERLINDA: ${(activePlayer?.name || getTeamDisplayName(room, focusTeamId)).toUpperCase()} (${meta.equipeLabel})`
        : `VEZ DE APOSTAR: ${(activePlayer?.name || getTeamDisplayName(room, focusTeamId)).toUpperCase()} (${meta.equipeLabel})`,
      actionInstruction: isExecution
        ? `Cite ${duvido.currentBid} itens válidos da categoria antes do tempo acabar!`
        : duvido.phase === 'RESULT'
        ? 'Confirme a equipe vencedora da rodada para avançar.'
        : duvido.currentBid > 0
        ? `Aumente o lance para ${duvido.currentBid + 1}+ itens ou grite 🚨 DUVIDO contra a ${
            duvido.currentBidTeam ? TEAM_META[duvido.currentBidTeam].equipeLabel : 'rival'
          }!`
        : 'Faça o lance inicial de quantos itens sua equipe consegue citar!',
      teammates,
      nextInQueueLabel:
        !isExecution && duvido.phase !== 'RESULT'
          ? `Próxima no leilão: ${getTeamDisplayName(room, nextTeamId)}`
          : null,
      canRotatePlayer: teamMembers.length > 1 && duvido.phase !== 'RESULT'
    };
  }

  // 4. JOGO DA NOTA
  if (gameId === 'nota' && room.nota) {
    const nota = room.nota;
    const speaker = players.find((p) => p.id === nota.speakerPlayerId) || players[0] || null;
    const speakerIdx = speaker ? players.findIndex((p) => p.id === speaker.id) : 0;
    const nextSpeaker =
      players.length > 1 ? players[(speakerIdx + 1) % players.length] : null;

    return {
      gameId,
      isTeamGame: false,
      activeTeamId: null,
      activeTeamName: 'Modalidade Individual',
      activeTeamMeta: null,
      activePlayer: speaker,
      secondaryPlayer: null,
      secondaryRoleLabel: null,
      roleBadge: '🎤 NARRADOR DA RODADA (NOTA SECRETA)',
      headline: `NARRADOR DA VEZ: ${(speaker?.name || 'JOGADOR').toUpperCase()}`,
      actionInstruction:
        nota.phase === 'STEP_1_DRAW' || nota.phase === 'DRAW'
          ? `Apenas ${speaker?.name || 'o Narrador'} olha para a TV e sorteia sua nota secreta!`
          : nota.phase === 'STEP_2_CLUE_1' || nota.phase === 'CLUES'
          ? `${speaker?.name || 'O Narrador'} responde à 1ª Pista calibrando na nota secreta!`
          : nota.phase === 'STEP_3_CLUE_2' || nota.phase === 'VOTING'
          ? `A mesa faz uma pergunta livre para ${speaker?.name || 'o Narrador'} e todos dão seus palpites!`
          : 'Nota revelada! Marque quem acertou na mesa.',
      teammates: [],
      nextInQueueLabel: nextSpeaker ? `Próximo Narrador: ${nextSpeaker.name}` : null,
      canRotatePlayer: players.length > 1 && (nota.phase === 'STEP_1_DRAW' || nota.phase === 'DRAW')
    };
  }

  // 5. JOGO DO LIMITE
  // No Jogo do Limite NÃO existe jogador da vez — todos os jogadores jogam simultaneamente
  if (gameId === 'limite') {
    return null;
  }

  // 6. PERGUNTAS E VERDADES
  if (gameId === 'perguntas-e-verdades' && room.perguntasEVerdades) {
    const pv = room.perguntasEVerdades;
    const activePlayer =
      players.find((p) => p.id === pv.activeTurnPlayerId) || players[0] || null;
    const targetPlayer =
      players.find((p) => p.id === pv.targetOpponentId) ||
      players.find((p) => p.id !== activePlayer?.id) ||
      null;

    return {
      gameId,
      isTeamGame: false,
      activeTeamId: null,
      activeTeamName: 'Dedução Individual',
      activeTeamMeta: null,
      activePlayer,
      secondaryPlayer: targetPlayer,
      secondaryRoleLabel: '🎯 ALVO DA PERGUNTA',
      roleBadge:
        pv.phase === 'DECK_SETUP'
          ? '🃏 PREPARAÇÃO DE MÃO'
          : pv.phase === 'TOKEN_AUCTION'
          ? '🪙 LEILÃO DE TOKENS'
          : '🔍 INVESTIGADOR DA VEZ',
      headline: activePlayer
        ? `VEZ DE AGIR: ${activePlayer.name.toUpperCase()}`
        : 'PERGUNTAS E VERDADES',
      actionInstruction:
        pv.phase === 'DECK_SETUP'
          ? 'Cada jogador registra suas 8 cartas secretas em ordem crescente por naipe.'
          : pv.phase === 'TOKEN_AUCTION'
          ? 'Apostem seus tokens em segredo para conquistar o direito de perguntar!'
          : `${activePlayer?.name || 'O jogador da vez'} escolhe uma das 11 perguntas oficiais ou Declara a Verdade!`,
      teammates: [],
      nextInQueueLabel: targetPlayer ? `Respondendo: ${targetPlayer.name}` : null,
      canRotatePlayer: players.length > 1 && pv.phase === 'PLAYER_ACTION'
    };
  }

  return null;
}
