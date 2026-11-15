import type { GameRoom, TeamId } from '../types/game';
import { pintoRoundPoints } from './comoEuPintoEngine';

/**
 * Pontos que cada equipe ganhou na rodada que acabou de terminar (um unico lugar para a regra de cada jogo).
 * Usado ao avancar a rodada (placar das equipes) e no calculo dos pontos de cada jogador.
 */
export function computeRoundTeamPoints(room: GameRoom): Record<TeamId, number> {
  const roundPts: Record<TeamId, number> = { A: 0, B: 0, C: 0, D: 0 };


  if (room.activeGame === 'proibido' && room.proibido) {
    if (room.proibido.is2PlayerMode || room.players.length === 2) {
      // In 2-player cooperative mode, both players score together!
      roundPts.A += room.proibido.roundScore || 0;
      roundPts.B += room.proibido.roundScore || 0;
    } else {
      const spkTeam = room.proibido.speakerTeam;
      roundPts[spkTeam] = (roundPts[spkTeam] || 0) + room.proibido.roundScore;
    }
  } else if (room.activeGame === 'como-eu-pinto' && room.comoEuPinto) {
    const r = pintoRoundPoints(room.comoEuPinto);
    if (room.players.length === 2) {
      // cooperativo: os dois formam a dupla e somam juntos
      roundPts.A += r.draw;
      roundPts.B += r.draw;
    } else {
      roundPts[room.comoEuPinto.drawTeam] = (roundPts[room.comoEuPinto.drawTeam] || 0) + r.draw;
      if (room.comoEuPinto.rivalTeam) {
        roundPts[room.comoEuPinto.rivalTeam] = (roundPts[room.comoEuPinto.rivalTeam] || 0) + r.rival;
      }
    }
  } else if (room.activeGame === 'com-terra' && room.comTerra) {
    Object.entries(room.comTerra.pointsAwarded || {}).forEach(([pid, pts]) => {
      const p = room.players.find((pl) => pl.id === pid);
      if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
    });
  } else if (room.activeGame === 'adedanha' && room.adedanha) {
    Object.entries(room.adedanha.pointsAwarded || {}).forEach(([pid, pts]) => {
      const p = room.players.find((pl) => pl.id === pid);
      if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
    });
  } else if (room.activeGame === 'estadios' && room.estadios) {
    Object.entries(room.estadios.pointsAwarded || {}).forEach(([pid, pts]) => {
      const p = room.players.find((pl) => pl.id === pid);
      if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
    });
  } else if (room.activeGame === 'respostas-sem-perguntas' && room.respostasSemPerguntas) {
    Object.entries(room.respostasSemPerguntas.pointsAwarded || {}).forEach(([pid, pts]) => {
      const p = room.players.find((pl) => pl.id === pid);
      if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
    });
  } else if (room.activeGame === 'repetente' && room.repetente) {
    const pts = room.repetente.result?.pointsByTeam;
    if (pts) {
      roundPts.A += pts.A || 0;
      roundPts.B += pts.B || 0;
      roundPts.C += pts.C || 0;
      roundPts.D += pts.D || 0;
    }
  } else if (room.activeGame === 'mega-resenha' && room.megaResenha) {
    // Pontos da rodada para a equipe que jogou; com 2 jogadores (cooperativo) as duas equipes somam.
    if (room.players.length === 2) {
      roundPts.A += room.megaResenha.roundScore || 0;
      roundPts.B += room.megaResenha.roundScore || 0;
    } else {
      roundPts[room.megaResenha.team] = (roundPts[room.megaResenha.team] || 0) + (room.megaResenha.roundScore || 0);
    }
  } else if ((room.activeGame === 'quem-sou-eu' || room.activeGame === 'onde-estou') && room.quemSouEu) {
    Object.entries(room.quemSouEu.pointsAwarded || {}).forEach(([pid, pts]) => {
      const p = room.players.find((pl) => pl.id === pid);
      if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
    });
  } else if (room.activeGame === 'mimica' && room.mimica) {
    // Pontos da rodada para a equipe do mimico; com 2 jogadores (cooperativo) as duas equipes somam.
    if (room.players.length === 2) {
      roundPts.A += room.mimica.roundScore || 0;
      roundPts.B += room.mimica.roundScore || 0;
    } else {
      roundPts[room.mimica.mimeTeam] = (roundPts[room.mimica.mimeTeam] || 0) + (room.mimica.roundScore || 0);
    }
  } else if (room.activeGame === 'duvido' && room.duvido) {
    const winTeam = room.duvido.resultWinnerTeam;
    if (winTeam) {
      roundPts[winTeam] = (roundPts[winTeam] || 0) + 1;
    }
  } else if (room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem) {
    roundPts.A += room.temOuNaoTem.roundScore.A || 0;
    roundPts.B += room.temOuNaoTem.roundScore.B || 0;
    roundPts.C += room.temOuNaoTem.roundScore.C || 0;
    roundPts.D += room.temOuNaoTem.roundScore.D || 0;
  } else if (room.activeGame === 'limite' && room.limite) {
    Object.entries(room.limite.pointsAwarded || {}).forEach(([pid, pts]) => {
      const p = room.players.find((pl) => pl.id === pid);
      if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
    });
  } else if (room.activeGame === 'nota' && room.nota) {
    Object.entries(room.nota.pointsAwarded || {}).forEach(([pid, pts]) => {
      const p = room.players.find((pl) => pl.id === pid);
      if (p?.team) roundPts[p.team] = (roundPts[p.team] || 0) + pts;
    });
  } else if (room.activeGame === 'perguntas-e-verdades' && room.perguntasEVerdades) {
    const winId = room.perguntasEVerdades.winnerPlayerId;
    const winPlayer = room.players.find((pl) => pl.id === winId);
    if (winPlayer?.team) roundPts[winPlayer.team] = (roundPts[winPlayer.team] || 0) + 100;
  }

  return roundPts;
}
