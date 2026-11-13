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
  return gameId === 'tem-ou-nao-tem' || gameId === 'proibido' || gameId === 'duvido' || gameId === 'mimica' || gameId === 'mega-resenha' || gameId === 'repetente' || gameId === 'como-eu-pinto';
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
  /** Texto do bloco colorido da faixa (padrao: "Vez de"). */
  flagLabel?: string;
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
    const partnerNames =
      teammates.map((t) => t.name).join(', ') ||
      (players.length === 2 ? players.find((p) => p.id !== activePlayer?.id)?.name || '' : '');

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
          ? `${activePlayer?.name || 'O Orador'} vai dar dicas para ${partnerNames || 'a equipe'} adivinhar, sem falar as palavras proibidas.`
          : proibido.phase === 'SUMMARY'
          ? 'Rodada encerrada. Revise as cartas e confirme os pontos.'
          : `${activePlayer?.name || 'Orador'} descreve a palavra-alvo e ${partnerNames || 'a equipe'} adivinha.`,
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
        : duvido.phase === 'BLINDFOLD' || duvido.phase === 'SECRET_CATEGORY'
        ? 'Jogadores vendados. O árbitro confirma e inicia o leilão.'
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

  const byId = (id?: string | null) => players.find((p) => p.id === id) || null;
  const solo = (
    activePlayer: Player | null,
    roleBadge: string,
    actionInstruction: string,
    extra: Partial<TurnSpotlightDescriptor> = {}
  ): TurnSpotlightDescriptor => ({
    gameId,
    isTeamGame: false,
    activeTeamId: null,
    activeTeamName: null,
    activeTeamMeta: null,
    activePlayer,
    secondaryPlayer: null,
    secondaryRoleLabel: null,
    roleBadge,
    headline: activePlayer ? `VEZ DE: ${activePlayer.name.toUpperCase()}` : roleBadge,
    actionInstruction,
    teammates: [],
    nextInQueueLabel: null,
    canRotatePlayer: false,
    ...extra
  });
  const duo = (
    tid: TeamId,
    activePlayer: Player | null,
    partner: Player | null,
    partnerLabel: string,
    roleBadge: string,
    actionInstruction: string
  ): TurnSpotlightDescriptor => {
    const team = activeTeamIds.includes(tid) ? tid : activeTeamIds[0];
    return {
      gameId,
      isTeamGame: true,
      activeTeamId: team,
      activeTeamName: getTeamDisplayName(room, team),
      activeTeamMeta: TEAM_META[team],
      activePlayer,
      secondaryPlayer: partner,
      secondaryRoleLabel: partner ? partnerLabel : null,
      roleBadge,
      headline: activePlayer ? `VEZ DE: ${activePlayer.name.toUpperCase()}` : roleBadge,
      actionInstruction,
      teammates: [],
      nextInQueueLabel: null,
      canRotatePlayer: false
    };
  };
  const READY_TEXT = 'Tudo pronto. O diretor inicia a rodada.';
  const DONE_TEXT = 'Rodada encerrada. Confira os pontos e avance.';

  // 5. JOGO DO LIMITE: nao ha jogador da vez, todos dao o palpite ao mesmo tempo
  if (gameId === 'limite' && room.limite) {
    const l = room.limite;
    const missing = players.length - (l.submittedPlayers || []).length;
    return solo(
      null,
      'Palpite secreto',
      l.phase === 'CALL_TIMEOUT'
        ? 'Poder de ligação: 30 segundos de ajuda de fora.'
        : l.phase === 'REVEAL' || l.phase === 'SCORING'
        ? 'Palpites revelados. Clique em um jogador para ajustar os pontos e confirme.'
        : missing > 0 && (l.submittedPlayers || []).length > 0
        ? `Faltam ${missing} palpite${missing > 1 ? 's' : ''}.`
        : 'Cada um dá o seu palpite em segredo, sem estourar o número.',
      { activeTeamName: 'Todos jogam', flagLabel: 'Agora' }
    );
  }

  // MIMICA
  if (gameId === 'mimica' && room.mimica) {
    const m = room.mimica;
    const mime = byId(m.mimePlayerId);
    return duo(
      m.mimeTeam,
      mime,
      byId(m.guesserPlayerId),
      'Adivinha',
      'Faz a mímica',
      m.phase === 'READY' ? READY_TEXT : m.phase === 'SUMMARY' ? DONE_TEXT : `${mime?.name || 'O mímico'} faz a mímica sem falar e sem apontar objetos.`
    );
  }

  // QUEM SOU EU / ONDE ESTOU
  if ((gameId === 'quem-sou-eu' || gameId === 'onde-estou') && room.quemSouEu) {
    const q = room.quemSouEu;
    const p = byId(q.turnPlayerId);
    return solo(
      p,
      'Pergunta ou chuta',
      q.phase === 'READY'
        ? READY_TEXT
        : q.phase === 'SUMMARY'
        ? DONE_TEXT
        : `${p?.name || 'O jogador'} faz uma pergunta de sim ou não, ou arrisca a resposta.`
    );
  }

  // MEGA RESENHA
  if (gameId === 'mega-resenha' && room.megaResenha) {
    const g = room.megaResenha;
    const giver = byId(g.giverPlayerId);
    return duo(
      g.team,
      giver,
      byId(g.guesserPlayerId),
      'Adivinha sem olhar',
      'Dá as dicas',
      g.phase === 'READY' ? READY_TEXT : g.phase === 'SUMMARY' ? DONE_TEXT : `${giver?.name || 'Quem dá as dicas'} fala uma palavra por dica.`
    );
  }

  // REPETENTE: todos escrevem ao mesmo tempo
  if (gameId === 'repetente' && room.repetente) {
    const r = room.repetente;
    return solo(
      null,
      'Palavra secreta',
      r.phase === 'READY'
        ? READY_TEXT
        : r.phase === 'REVEAL'
        ? 'Palavras reveladas. Quem combinou com o parceiro pontua.'
        : 'Cada um escreve uma palavra em segredo, tentando bater com a do parceiro.',
      { activeTeamName: 'Todos jogam', flagLabel: 'Agora' }
    );
  }

  // RESPOSTAS SEM PERGUNTAS
  if (gameId === 'respostas-sem-perguntas' && room.respostasSemPerguntas) {
    const r = room.respostasSemPerguntas;
    const p = byId(r.turnPlayerId);
    return solo(
      p,
      'Revela e chuta',
      r.phase === 'READY'
        ? READY_TEXT
        : r.phase === 'SUMMARY'
        ? DONE_TEXT
        : `${p?.name || 'O jogador'} escolhe uma palavra da pergunta para revelar e chuta a pergunta.`
    );
  }

  // ESTADIOS
  if (gameId === 'estadios' && room.estadios) {
    const e = room.estadios;
    const p = byId(e.turnPlayerId);
    return solo(
      p,
      'Chuta o estádio',
      e.phase === 'READY' ? READY_TEXT : e.phase === 'SUMMARY' ? DONE_TEXT : `${p?.name || 'O jogador'} diz o nome do estádio em voz alta.`
    );
  }

  // COM TERRA
  if (gameId === 'com-terra' && room.comTerra) {
    const ct = room.comTerra;
    if (ct.phase === 'PICK' || ct.phase === 'SABOTAGE') {
      return solo(
        null,
        ct.phase === 'PICK' ? 'Fase 1 · escolha da peça' : 'Fase 2 · sabotagem',
        ct.phase === 'PICK'
          ? 'Cada um escolhe uma peça na loja, sem testar no mapa.'
          : 'Cada um planta uma árvore ou põe uma ficha no mapa de todos.',
        { activeTeamName: 'Todos jogam', flagLabel: 'Agora' }
      );
    }
    if (ct.phase === 'SUMMARY') return solo(null, 'Fim da partida', DONE_TEXT, { activeTeamName: 'Resultado', flagLabel: 'Agora' });
    const p = byId(ct.queue[ct.turnIdx]);
    const piece = p ? ct.hand[p.id] : undefined;
    return solo(
      p,
      ct.phase === 'PLACE' ? 'Fase 3 · colocação' : piece ? 'Posiciona a peça' : 'Escolhe na loja',
      piece
        ? `${p?.name || 'O jogador'} encaixa a peça ${piece.size} no tabuleiro.`
        : `${p?.name || 'O jogador'} pega uma peça na loja, sem testar antes.`
    );
  }

  // COMO EU PINTO
  if (gameId === 'como-eu-pinto' && room.comoEuPinto) {
    const c = room.comoEuPinto;
    if (c.phase === 'STEAL' && c.rivalTeam) {
      const rivals = players.filter((p) => p.team === c.rivalTeam);
      return {
        ...duo(c.rivalTeam, rivals[0] || null, null, '', 'Tenta roubar', 'A dupla rival tenta adivinhar as palavras que faltaram.'),
        activePlayer: rivals.length === 1 ? rivals[0] : null
      };
    }
    const drawer = byId(c.drawerPlayerId);
    const instruction =
      c.phase === 'READY'
        ? room.connectionMode === 'local'
          ? 'Escolha jogar com 1 celular como prancheta (estilo Gartic TV) ou só pela TV.'
          : READY_TEXT
        : c.phase === 'SUMMARY'
        ? DONE_TEXT
        : c.tvRevealGate
        ? `Todos fechem os olhos para ${drawer?.name || 'quem desenha'} ver a palavra.`
        : c.padPassGate
        ? `Passe o celular da prancheta para ${drawer?.name || 'quem desenha'} iniciar.`
        : c.inputMode === 'pad'
        ? `${drawer?.name || 'Quem desenha'} desenha no celular enquanto a TV mostra ao vivo.`
        : `${drawer?.name || 'Quem desenha'} desenha sem letras e sem números.`;
    return duo(
      c.drawTeam,
      drawer,
      byId(c.guesserPlayerId),
      'Adivinha',
      'Desenha',
      instruction
    );
  }

  // 6. PERGUNTAS E VERDADES
  if (gameId === 'perguntas-e-verdades' && room.perguntasEVerdades) {
    const pv = room.perguntasEVerdades;
    const playerCount = Math.max(1, players.length);
    const activePlayer =
      players.find((p) => p.id === pv.activeTurnPlayerId) || players[0] || null;
    const targetPlayer =
      players.find((p) => p.id === pv.targetOpponentId && p.id !== activePlayer?.id) ||
      players.find((p) => p.id !== activePlayer?.id) ||
      null;

    if (pv.phase === 'DECK_SETUP') {
      const setupIdx = Math.min(Math.max(0, pv.setupPlayerIndex ?? 0), playerCount - 1);
      const setupPlayer = players[setupIdx] || players[0] || null;
      return solo(
        setupPlayer,
        `Preparação da mão (${setupIdx + 1}/${playerCount})`,
        'Monte suas 8 cartas em ordem crescente por naipe.',
        { flagLabel: 'Montagem' }
      );
    }

    if (pv.phase === 'TOKEN_AUCTION') {
      if (pv.auctionRevealPending) {
        const winner =
          players.find((p) => p.id === (pv.auctionWinnerId || pv.activeTurnPlayerId)) ||
          activePlayer;
        const winnerTarget =
          players.find((p) => p.id === pv.targetOpponentId && p.id !== winner?.id) ||
          players.find((p) => p.id !== winner?.id) ||
          null;
        const bidLabel =
          pv.auctionOutcomeType === 'NO_BIDS'
            ? 'Sem lances · Vez definida'
            : `Ganhou o leilão (${pv.auctionWinningBid} ${pv.auctionWinningBid === 1 ? 'ficha' : 'fichas'})`;
        return {
          gameId,
          isTeamGame: false,
          activeTeamId: null,
          activeTeamName: 'Dedução Individual',
          activeTeamMeta: null,
          activePlayer: winner,
          secondaryPlayer: winnerTarget,
          secondaryRoleLabel: winnerTarget ? 'Alvo' : null,
          roleBadge: bidLabel,
          headline: winner ? `VENCEU O LEILÃO: ${winner.name.toUpperCase()}` : 'RESULTADO DO LEILÃO',
          actionInstruction: `${winner?.name || 'O vencedor'} conquistou a vez de perguntar!`,
          teammates: [],
          nextInQueueLabel: winnerTarget ? `Alvo: ${winnerTarget.name}` : null,
          canRotatePlayer: false,
          flagLabel: 'Venceu'
        };
      }

      const allBidsSubmitted =
        players.length > 0 && players.every((p) => Boolean(pv.bidSubmitted?.[p.id]));
      if (allBidsSubmitted) {
        return solo(
          null,
          'Pronto para revelar',
          'Todas as apostas registradas. Clique em Revelar resultado.',
          {
            activeTeamName: 'Apostas fechadas',
            flagLabel: 'Leilão',
            headline: 'APOSTAS REGISTRADAS'
          }
        );
      }

      const betIdx = Math.min(Math.max(0, pv.bettingPlayerIndex ?? 0), playerCount - 1);
      const bidder = players[betIdx] || players[0] || null;
      return solo(
        bidder,
        `Leilão de fichas (${betIdx + 1}/${playerCount})`,
        `${bidder?.name || 'Jogador'} aposta suas fichas em segredo.`,
        { flagLabel: 'Aposta' }
      );
    }

    if (pv.phase === 'VICTORY' || pv.phase === 'FINISHED') {
      const winner =
        players.find((p) => p.id === pv.winnerPlayerId) || activePlayer;
      return solo(
        winner,
        'Venceu a rodada',
        'Cartas reveladas! Confirme para avançar.',
        { flagLabel: 'Vencedor' }
      );
    }

    return {
      gameId,
      isTeamGame: false,
      activeTeamId: null,
      activeTeamName: 'Dedução Individual',
      activeTeamMeta: null,
      activePlayer,
      secondaryPlayer: targetPlayer,
      secondaryRoleLabel: targetPlayer ? 'Alvo' : null,
      roleBadge: 'Investigador',
      headline: activePlayer
        ? `VEZ DE: ${activePlayer.name.toUpperCase()}`
        : 'PERGUNTAS E VERDADES',
      actionInstruction: 'Escolha 1 das 11 perguntas oficiais ou declare a verdade.',
      teammates: [],
      nextInQueueLabel: targetPlayer ? `Respondendo: ${targetPlayer.name}` : null,
      canRotatePlayer: false,
      flagLabel: 'Vez de'
    };
  }

  return null;
}
