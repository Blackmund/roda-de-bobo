import type { GameId, GameRoom, TeamId } from '../types/game';

/**
 * Numeros proprios de cada jogo para a tela de vitoria ("palavras acertadas", "cravadas"...).
 * O estado de cada jogo e refeito a cada rodada, entao no fim de cada rodada lemos o que ela produziu
 * e somamos em `room.matchExtras`. Dono = id do jogador ou `team:X` para jogos de equipe.
 */
export type MatchExtras = Record<string, Record<string, number>>;

export type ExtraAgg = 'sum' | 'max' | 'min';

export interface ExtraDef {
  key: string;
  label: string;
  /** como juntar as rodadas: soma, maior valor ou menor valor */
  agg: ExtraAgg;
  /** de quem e o numero: do jogador ou da equipe */
  owner: 'player' | 'team';
}

/** Extras de cada jogo (a tela mostra no maximo dois). */
export const GAME_EXTRAS: Record<GameId, ExtraDef[]> = {
  limite: [
    { key: 'cravadas', label: 'Cravadas', agg: 'sum', owner: 'player' },
    { key: 'estouros', label: 'Estouros', agg: 'sum', owner: 'player' }
  ],
  nota: [{ key: 'notaExata', label: 'Notas exatas', agg: 'sum', owner: 'player' }],
  duvido: [{ key: 'maiorLance', label: 'Maior lance', agg: 'max', owner: 'team' }],
  proibido: [
    { key: 'palavras', label: 'Palavras acertadas', agg: 'sum', owner: 'team' },
    { key: 'faltas', label: 'Faltas', agg: 'sum', owner: 'team' }
  ],
  mimica: [{ key: 'palavras', label: 'Palavras acertadas', agg: 'sum', owner: 'team' }],
  'mega-resenha': [
    { key: 'palavras', label: 'Palavras acertadas', agg: 'sum', owner: 'team' },
    { key: 'dicas', label: 'Dicas dadas', agg: 'sum', owner: 'team' }
  ],
  repetente: [{ key: 'combinadas', label: 'Combinaram', agg: 'sum', owner: 'team' }],
  'tem-ou-nao-tem': [
    { key: 'respostas', label: 'Respostas achadas', agg: 'sum', owner: 'team' },
    { key: 'erros', label: 'Erros', agg: 'sum', owner: 'team' }
  ],
  'perguntas-e-verdades': [{ key: 'perguntas', label: 'Perguntas feitas', agg: 'sum', owner: 'player' }],
  'quem-sou-eu': [
    { key: 'descobertas', label: 'Descobriu quem era', agg: 'sum', owner: 'player' },
    { key: 'perguntas', label: 'Perguntas usadas', agg: 'sum', owner: 'player' }
  ],
  'onde-estou': [
    { key: 'descobertas', label: 'Descobriu onde estava', agg: 'sum', owner: 'player' },
    { key: 'perguntas', label: 'Perguntas usadas', agg: 'sum', owner: 'player' }
  ],
  'respostas-sem-perguntas': [
    { key: 'menosPalavras', label: 'Menos palavras para acertar', agg: 'min', owner: 'player' }
  ],
  estadios: [{ key: 'menosImagens', label: 'Menos imagens para acertar', agg: 'min', owner: 'player' }],
  pontinhos: [{ key: 'menosPistas', label: 'Menos dicas para acertar', agg: 'min', owner: 'player' }],
  'como-eu-pinto': [
    { key: 'desenhos', label: 'Desenhos acertados', agg: 'sum', owner: 'team' },
    { key: 'roubadas', label: 'Roubadas', agg: 'sum', owner: 'team' }
  ],
  'com-terra': [{ key: 'maiorJogada', label: 'Maior jogada', agg: 'max', owner: 'player' }],
  adedanha: [{ key: 'stops', label: 'Stops pedidos', agg: 'sum', owner: 'player' }]
};

export const teamOwner = (t: TeamId) => `team:${t}`;

type Entry = { owner: string; key: string; value: number };

const count = <T,>(arr: T[] | undefined, pred: (x: T) => boolean) => (arr || []).filter(pred).length;

/** O que a rodada que acabou de terminar produziu, jogo a jogo. */
export function collectRoundExtras(room: GameRoom): Entry[] {
  const out: Entry[] = [];
  const add = (owner: string | null | undefined, key: string, value: number) => {
    if (!owner || !Number.isFinite(value)) return;
    out.push({ owner, key, value });
  };

  switch (room.activeGame) {
    case 'limite': {
      const s = room.limite;
      if (!s) break;
      const exact = s.roundData?.valor_exato;
      Object.entries(s.guesses || {}).forEach(([pid, g]) => {
        if (typeof exact === 'number' && g === exact) add(pid, 'cravadas', 1);
      });
      (s.bustedPlayers || []).forEach((pid) => add(pid, 'estouros', 1));
      break;
    }
    case 'nota': {
      const s = room.nota;
      if (!s) break;
      Object.entries(s.votes || {}).forEach(([pid, v]) => {
        if (pid !== s.speakerPlayerId && v === s.secretScore) add(pid, 'notaExata', 1);
      });
      break;
    }
    case 'duvido': {
      const s = room.duvido;
      if (!s) break;
      Object.entries(s.teamBids || {}).forEach(([t, bid]) => add(teamOwner(t as TeamId), 'maiorLance', bid || 0));
      if (s.currentBidTeam) add(teamOwner(s.currentBidTeam), 'maiorLance', s.currentBid || 0);
      break;
    }
    case 'proibido': {
      const s = room.proibido;
      if (!s) break;
      add(teamOwner(s.speakerTeam), 'palavras', count(s.cardOutcomes, (o) => o === 'correct'));
      add(teamOwner(s.speakerTeam), 'faltas', count(s.cardOutcomes, (o) => o === 'foul'));
      break;
    }
    case 'mimica': {
      const s = room.mimica;
      if (!s) break;
      add(teamOwner(s.mimeTeam), 'palavras', count(s.outcomes, (o) => o === 'correct'));
      break;
    }
    case 'mega-resenha': {
      const s = room.megaResenha;
      if (!s) break;
      add(teamOwner(s.team), 'palavras', count(s.outcomes, (o) => o === 'correct'));
      add(
        teamOwner(s.team),
        'dicas',
        (s.clues || []).reduce((n, list) => n + count(list, (c) => c.valid || !!c.overruled), 0)
      );
      break;
    }
    case 'repetente': {
      const s = room.repetente;
      if (!s?.result) break;
      s.result.groups.forEach((r) => {
        if (!r.matched) return;
        const g = s.groups.find((x) => x.id === r.groupId);
        if (g?.team) add(teamOwner(g.team), 'combinadas', 1);
        else (['A', 'B'] as TeamId[]).forEach((t) => add(teamOwner(t), 'combinadas', 1));
      });
      break;
    }
    case 'tem-ou-nao-tem': {
      const s = room.temOuNaoTem;
      if (!s) break;
      (s.items || []).forEach((it) => {
        if (it.revealed && it.revealedByTeam) add(teamOwner(it.revealedByTeam), 'respostas', 1);
      });
      Object.entries(s.strikes || {}).forEach(([t, n]) => add(teamOwner(t as TeamId), 'erros', n || 0));
      break;
    }
    case 'perguntas-e-verdades': {
      const s = room.perguntasEVerdades;
      if (!s) break;
      (s.questionHistory || []).forEach((q) => add(q.askerPlayerId, 'perguntas', 1));
      break;
    }
    case 'quem-sou-eu':
    case 'onde-estou': {
      const s = room.quemSouEu;
      if (!s) break;
      (s.entries || []).forEach((e) => {
        if (e.status === 'found') add(e.playerId, 'descobertas', 1);
        add(e.playerId, 'perguntas', e.questions || 0);
      });
      break;
    }
    case 'respostas-sem-perguntas': {
      const s = room.respostasSemPerguntas;
      if (!s?.winnerPlayerId) break;
      add(s.winnerPlayerId, 'menosPalavras', count(s.revealed, Boolean));
      break;
    }
    case 'estadios': {
      const g = room.geoguess;
      if (!g) break;
      // imagem em que acertou (1 = de primeira)
      Object.entries(g.solvedAt || {}).forEach(([pid, st]) => add(pid, 'menosImagens', st + 1));
      break;
    }
    case 'pontinhos': {
      const s = room.pontinhos;
      if (!s?.winnerPlayerId) break;
      // 1a pista + uma a mais por erro antes do acerto
      add(s.winnerPlayerId, 'menosPistas', 1 + count(s.attempts, (a) => !a.correct));
      break;
    }
    case 'como-eu-pinto': {
      const s = room.comoEuPinto;
      if (!s) break;
      add(teamOwner(s.drawTeam), 'desenhos', count(s.outcomes, (o) => o === 'correct'));
      if (s.rivalTeam) add(teamOwner(s.rivalTeam), 'roubadas', count(s.outcomes, (o) => o === 'stolen'));
      break;
    }
    case 'com-terra': {
      const s = room.comTerra;
      if (!s) break;
      (s.log || []).forEach((l) => {
        if (l.delta > 0) add(l.playerId, 'maiorJogada', l.delta);
      });
      break;
    }
    case 'adedanha': {
      const s = room.adedanha;
      if (s?.stopBy) add(s.stopBy, 'stops', 1);
      break;
    }
    default:
      break;
  }
  return out;
}

/** Junta a rodada no acumulado da partida, respeitando a regra de cada numero (soma, maior, menor). */
export function mergeRoundExtras(room: GameRoom): MatchExtras {
  const prev = room.matchExtras || {};
  const defs = room.activeGame ? GAME_EXTRAS[room.activeGame] || [] : [];
  const aggOf = (key: string): ExtraAgg => defs.find((d) => d.key === key)?.agg || 'sum';
  const next: MatchExtras = {};
  Object.entries(prev).forEach(([o, rec]) => (next[o] = { ...rec }));

  // max/min: primeiro o melhor valor da propria rodada, depois contra o acumulado
  const round: MatchExtras = {};
  collectRoundExtras(room).forEach(({ owner, key, value }) => {
    const rec = (round[owner] = round[owner] || {});
    const agg = aggOf(key);
    if (rec[key] === undefined) rec[key] = value;
    else if (agg === 'sum') rec[key] += value;
    else if (agg === 'max') rec[key] = Math.max(rec[key], value);
    else rec[key] = Math.min(rec[key], value);
  });

  Object.entries(round).forEach(([owner, rec]) => {
    const target = (next[owner] = next[owner] || {});
    Object.entries(rec).forEach(([key, value]) => {
      const agg = aggOf(key);
      if (target[key] === undefined) target[key] = value;
      else if (agg === 'sum') target[key] += value;
      else if (agg === 'max') target[key] = Math.max(target[key], value);
      else target[key] = Math.min(target[key], value);
    });
  });
  return next;
}

/**
 * Resultado da rodada para a tela de vitoria: sequencias (jogador que pontuou em rodadas seguidas,
 * equipe que venceu rodadas seguidas) e rodadas vencidas por equipe. Chaves internas comecam com `_`.
 */
export function applyRoundResults(
  extras: MatchExtras,
  playerGains: Record<string, number>,
  teamPoints: Partial<Record<TeamId, number>>
): MatchExtras {
  const next: MatchExtras = {};
  Object.entries(extras).forEach(([o, rec]) => (next[o] = { ...rec }));
  const bump = (owner: string, won: boolean) => {
    const rec = (next[owner] = next[owner] || {});
    rec._played = (rec._played || 0) + 1;
    if (won) {
      rec._won = (rec._won || 0) + 1;
      rec._seq = (rec._seq || 0) + 1;
      rec._maxSeq = Math.max(rec._maxSeq || 0, rec._seq);
    } else {
      rec._seq = 0;
      rec._maxSeq = rec._maxSeq || 0;
    }
  };
  Object.entries(playerGains).forEach(([pid, gain]) => bump(pid, gain > 0));
  const entries = Object.entries(teamPoints) as Array<[TeamId, number]>;
  const top = Math.max(0, ...entries.map(([, v]) => v || 0));
  entries.forEach(([t, v]) => bump(teamOwner(t), top > 0 && (v || 0) === top));
  return next;
}
