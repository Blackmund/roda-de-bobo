import type { GameRoom } from '../types/game';
import { MVPStats } from './sessionTypes';

/**
 * Formats the match results summary text including the MVP player's name, total points,
 * and individual performance metrics.
 */
export function formatMatchResultsShareText(room: GameRoom, mvp: MVPStats): string {
  const teamAName = room.teams?.A?.name || 'Equipe Alfa';
  const teamBName = room.teams?.B?.name || 'Equipe Bravo';
  const scoreA = room.teams?.A?.score ?? 0;
  const scoreB = room.teams?.B?.score ?? 0;

  const outcomeLine =
    scoreA > scoreB
      ? `Vitória: ${teamAName} (${scoreA} PTS x ${scoreB} PTS ${teamBName})`
      : scoreB > scoreA
      ? `Vitória: ${teamBName} (${scoreB} PTS x ${scoreA} PTS ${teamAName})`
      : `Empate: ${teamAName} ${scoreA} PTS x ${scoreB} PTS ${teamBName}`;

  return [
    `🏆 RODA DE BOBO — Resultado da Partida (Sala ${room.roomId})`,
    outcomeLine,
    `👑 MVP: ${mvp.name} (${mvp.teamName}) — ${mvp.score} PTS`,
    `📊 Performance: Accuracy ${mvp.accuracy}% | Rounds Played: ${mvp.roundsPlayed}`
  ].join('\n');
}/**
 * Shares or copies the match results summary using the Web Share API (`navigator.share`)
 * with automatic clipboard write (`navigator.clipboard.writeText`) so the summary text
 * is always copied/shared across mobile and desktop browsers.
 */
export async function shareMatchResults(
  room: GameRoom,
  mvp: MVPStats,
  nav?: {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    clipboard?: { writeText?: (text: string) => Promise<void> };
  }
): Promise<{ success: boolean; method: 'web-share' | 'clipboard'; text: string }> {
  const text = formatMatchResultsShareText(room, mvp);
  const targetNav =
    nav ??
    (typeof navigator !== 'undefined'
      ? (navigator as unknown as {
          share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
          clipboard?: { writeText?: (text: string) => Promise<void> };
        })
      : undefined);

  let copiedToClipboard = false;
  if (targetNav?.clipboard && typeof targetNav.clipboard.writeText === 'function') {
    try {
      await targetNav.clipboard.writeText(text);
      copiedToClipboard = true;
    } catch {
      // Ignore clipboard write errors when permissions are restricted
    }
  }

  if (targetNav && typeof targetNav.share === 'function') {
    try {
      await targetNav.share({
        title: `Roda de Bobo — Resultado da Partida (${room.roomId})`,
        text
      });
      return { success: true, method: 'web-share', text };
    } catch {
      if (copiedToClipboard) {
        return { success: true, method: 'clipboard', text };
      }
    }
  }

  return {
    success: copiedToClipboard,
    method: 'clipboard',
    text
  };
}