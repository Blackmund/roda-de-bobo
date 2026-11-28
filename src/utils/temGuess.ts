import type { GameRoom, TeamId, TemOuNaoTemGameState } from '../types/game';
import { getActiveTeamIds, getNextTeamId } from './teamUtils';
import { checkAnswerFuzzyMatch, normalizeFuzzyString } from './fuzzyMatch';

/** Qual item (ainda escondido) do painel o palpite acerta; -1 = nenhum. */
export function findTemMatch(room: GameRoom, guessText: string): number {
  return room.temOuNaoTem ? findTemItemMatch(room.temOuNaoTem.items, guessText) : -1;
}

export function findTemItemMatch(items: TemOuNaoTemGameState['items'], guessText: string): number {
  const guess = normalizeFuzzyString(guessText);
  if (!guess) return -1;
  // Uma resposta exata, mesmo já revelada, tem precedência sobre um palpite aproximado.
  const exact = items.findIndex((item) => normalizeFuzzyString(item.texto) === guess);
  if (exact !== -1) return items[exact].revealed ? -1 : exact;

  const aliases = items.flatMap((item, index) =>
    item.sinonimos_aceitos?.some((alias) => normalizeFuzzyString(alias) === guess) ? [index] : []
  );
  if (aliases.length) return aliases.length === 1 && !items[aliases[0]].revealed ? aliases[0] : -1;

  const matches = items.flatMap((item, index) =>
    checkAnswerFuzzyMatch(guess, item.texto, item.sinonimos_aceitos) ? [index] : []
  );
  return matches.length === 1 && !items[matches[0]].revealed ? matches[0] : -1;
}

/**
 * Aplica um palpite da equipe no Tem ou Nao Tem (acerto revela o item e passa a vez; erro marca falta e pode eliminar).
 * Mesma regra do celular e do jogador IA.
 */
export function applyTemGuess(prev: GameRoom, team: TeamId, guessText: string, matchedIndex = findTemMatch(prev, guessText)): GameRoom {
  if (!prev.temOuNaoTem) return prev;
  if (matchedIndex !== -1) {
    if (!prev.temOuNaoTem) return prev;
    const activeTeams = getActiveTeamIds(prev);
    const updatedItems = [...prev.temOuNaoTem.items];
    updatedItems[matchedIndex] = {
      ...updatedItems[matchedIndex],
      revealed: true,
      revealedByTeam: team
    };
    const addedScore = updatedItems[matchedIndex].votos;
    const newRoundScore = {
      ...prev.temOuNaoTem.roundScore,
      [team]: (prev.temOuNaoTem.roundScore[team] || 0) + addedScore
    };
    const allRevealed = updatedItems.every((it) => it.revealed);
    const nextActiveTeam = prev.temOuNaoTem.freeDomainTeam
      ? prev.temOuNaoTem.freeDomainTeam
      : getNextTeamId(team, activeTeams, prev.temOuNaoTem.eliminatedTeams);

    return {
      ...prev,
      temOuNaoTem: {
        ...prev.temOuNaoTem,
        items: updatedItems,
        roundScore: newRoundScore,
        activeTeam: nextActiveTeam,
        turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
        phase: allRevealed ? 'ROUND_END' : 'GUESSING',
        lastGuessFeedback: {
          text: guessText,
          hit: true,
          itemIndex: matchedIndex,
          team
        }
      }
    };
  }

    if (!prev.temOuNaoTem) return prev;
    const activeTeams = getActiveTeamIds(prev);
    const currentStrikes = (prev.temOuNaoTem.strikes[team] || 0) + 1;
    const updatedStrikes = { ...prev.temOuNaoTem.strikes, [team]: currentStrikes };
    const updatedEliminated = [...prev.temOuNaoTem.eliminatedTeams];
    let freeDomain = prev.temOuNaoTem.freeDomainTeam;
    let nextTeam = prev.temOuNaoTem.activeTeam;
    const maxStrikes = prev.temOuNaoTem.maxStrikes || 2;

    if (currentStrikes >= maxStrikes && !updatedEliminated.includes(team)) {
      updatedEliminated.push(team);
    }

    const survivingTeams = activeTeams.filter((t) => !updatedEliminated.includes(t));
    if (survivingTeams.length === 1) {
      freeDomain = survivingTeams[0];
      nextTeam = survivingTeams[0];
    } else if (survivingTeams.length > 1) {
      nextTeam = getNextTeamId(team, activeTeams, updatedEliminated);
    }

    const allEliminated = survivingTeams.length === 0;

    return {
      ...prev,
      temOuNaoTem: {
        ...prev.temOuNaoTem,
        strikes: updatedStrikes,
        eliminatedTeams: updatedEliminated,
        freeDomainTeam: freeDomain,
        activeTeam: nextTeam,
        turnStepIndex: (prev.temOuNaoTem.turnStepIndex || 0) + 1,
        phase: allEliminated ? 'ROUND_END' : 'GUESSING',
        lastGuessFeedback: {
          text: guessText,
          hit: false,
          team
        }
      }
    };
}
