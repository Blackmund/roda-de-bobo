import { themeBadge } from '../../utils/themeUtils';
import { ActiveTurnBanner } from '../ActiveTurnBanner';
import React, { useState } from 'react';
import { GameRoom, TemOuNaoTemGameState, TeamId } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import {
  getTemTotalRespondents,
  normalizeTemVotesTo100,
  stripPerguntamosPrefix,
  sanitizeCleanGameText,
  generateProceduralGameContent
} from '../../utils/aiGameGenerator';
import confetti from 'canvas-confetti';
import { ArrowRight, Eye, EyeOff, Info, ListChecks, RefreshCw, X } from 'lucide-react';
import {
  TEAM_META,
  getActiveTeamIds,
  getNextTeamId
} from '../../utils/teamUtils';
import { checkAnswerFuzzyMatch } from '../../utils/fuzzyMatch';
import { PlayerMark } from '../rdb/PlayerMark';

interface ScreenTemOuNaoTemProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateTemOuNaoTemState: (updater: (prev: TemOuNaoTemGameState) => TemOuNaoTemGameState) => void;
  onNextRound: () => void;
}

export const ScreenTemOuNaoTem: React.FC<ScreenTemOuNaoTemProps> = ({
  room,
  isTvMode = false,
  onUpdateTemOuNaoTemState,
  onNextRound
}) => {
  const tem = room.temOuNaoTem;
  const [manualGuessText, setManualGuessText] = useState('');
  const [isSwappingQuestion, setIsSwappingQuestion] = useState(false);

  if (!tem) {
    return (
      <div className="p-8 text-center font-mono-code text-cyan-300">
        Carregando rodada do Tem ou Não Tem...
      </div>
    );
  }

  const handleSwapQuestionWithAi = async () => {
    if (isSwappingQuestion) return;
    sounds.playPowerup();
    setIsSwappingQuestion(true);
    try {
      const generated = await generateProceduralGameContent(
        'tem-ou-nao-tem',
        room.theme,
        'normal',
        [tem.roundData.pergunta, ...(room.usedRoundSignatures || [])],
        undefined,
        room.customConfig
      );
      const data = generated.data as any;
      if (data && data.pergunta && Array.isArray(data.respostas)) {
        const targetTemCount = Math.min(
          10,
          Math.max(3, Number(room.customConfig?.temItemsCount) || 5)
        );
        const rawSource =
          Array.isArray(data?.rawRespostas) &&
          data.rawRespostas.length >= (data?.respostas?.length || 0)
            ? data.rawRespostas
            : data.respostas;
        const normalizedRespostas = normalizeTemVotesTo100(
          rawSource,
          targetTemCount,
          undefined,
          room.theme
        );
        onUpdateTemOuNaoTemState((prev) => ({
          ...prev,
          roundData: {
            ...data,
            respostas: normalizedRespostas
          },
          items: normalizedRespostas.map((r: any) => ({
            texto: r.texto,
            sinonimos_aceitos: r.sinonimos_aceitos || [],
            votos: r.votos,
            revealed: false
          })),
          strikes: { A: 0, B: 0, C: 0, D: 0 },
          eliminatedTeams: [],
          freeDomainTeam: null,
          roundScore: { A: 0, B: 0, C: 0, D: 0 },
          turnStepIndex: 0,
          lastGuessFeedback: undefined
        }));
      }
    } finally {
      setIsSwappingQuestion(false);
    }
  };

  const activeTeamIds = getActiveTeamIds(room);

  // Check if string matches answer or any of its synonyms with full PT-BR fuzzy tolerance
  const checkAnswerMatch = (input: string, itemText: string, synonyms: string[] = []) => {
    return checkAnswerFuzzyMatch(input, itemText, synonyms);
  };

  const handleProcessGuess = (guessText: string, team: TeamId) => {
    if (!guessText.trim()) return;

    let matchedIndex = -1;
    for (let i = 0; i < tem.items.length; i++) {
      if (!tem.items[i].revealed && checkAnswerMatch(guessText, tem.items[i].texto, tem.items[i].sinonimos_aceitos)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex !== -1) {
      // Correct!
      sounds.playSuccess();
      sounds.playFlip();

      onUpdateTemOuNaoTemState((prev) => {
        const updatedItems = [...prev.items];
        updatedItems[matchedIndex] = {
          ...updatedItems[matchedIndex],
          revealed: true,
          revealedByTeam: team
        };

        const addedScore = updatedItems[matchedIndex].votos;
        const newRoundScore = {
          ...prev.roundScore,
          [team]: (prev.roundScore[team] || 0) + addedScore
        };

        // Check if all items revealed
        const allRevealed = updatedItems.every((item) => item.revealed);
        if (allRevealed) {
          confetti({ particleCount: 80, spread: 70 });
        }

        // Alternate turn unless in Free Domain!
        const nextActiveTeam = prev.freeDomainTeam
          ? prev.freeDomainTeam
          : getNextTeamId(team, activeTeamIds, prev.eliminatedTeams);

        return {
          ...prev,
          items: updatedItems,
          roundScore: newRoundScore,
          activeTeam: nextActiveTeam,
          turnStepIndex: (prev.turnStepIndex || 0) + 1,
          phase: allRevealed ? 'ROUND_END' : 'GUESSING',
          lastGuessFeedback: {
            text: guessText,
            hit: true,
            itemIndex: matchedIndex,
            team
          }
        };
      });
    } else {
      // Strike!
      sounds.playBuzzer();

      onUpdateTemOuNaoTemState((prev) => {
        const currentStrikes = (prev.strikes[team] || 0) + 1;
        const updatedStrikes = { ...prev.strikes, [team]: currentStrikes };
        const updatedEliminated = [...prev.eliminatedTeams];
        let freeDomain = prev.freeDomainTeam;
        let nextTeam = prev.activeTeam;

        const maxStrikes = prev.maxStrikes || 2;
        if (currentStrikes >= maxStrikes && !updatedEliminated.includes(team)) {
          updatedEliminated.push(team);
        }

        const survivingTeams = activeTeamIds.filter((t) => !updatedEliminated.includes(t));
        if (survivingTeams.length === 1) {
          freeDomain = survivingTeams[0];
          nextTeam = survivingTeams[0];
        } else if (survivingTeams.length > 1) {
          nextTeam = getNextTeamId(team, activeTeamIds, updatedEliminated);
        }

        const allEliminated = survivingTeams.length === 0;

        return {
          ...prev,
          strikes: updatedStrikes,
          eliminatedTeams: updatedEliminated,
          freeDomainTeam: freeDomain,
          activeTeam: nextTeam,
          turnStepIndex: (prev.turnStepIndex || 0) + 1,
          phase: allEliminated ? 'ROUND_END' : 'GUESSING',
          lastGuessFeedback: {
            text: guessText,
            hit: false,
            team
          }
        };
      });
    }

    setManualGuessText('');
  };

  const handleRevealItemDirectly = (index: number) => {
    sounds.playSuccess();
    onUpdateTemOuNaoTemState((prev) => {
      if (prev.items[index]?.revealed) return prev;
      const team = prev.activeTeam;
      const updated = [...prev.items];
      const addedVotes = updated[index].votos;
      updated[index] = {
        ...updated[index],
        revealed: true,
        revealedByTeam: team
      };

      const newRoundScore = {
        ...prev.roundScore,
        [team]: (prev.roundScore[team] || 0) + addedVotes
      };
      const allRevealed = updated.every((it) => it.revealed);
      const nextActiveTeam = prev.freeDomainTeam
        ? prev.freeDomainTeam
        : getNextTeamId(team, activeTeamIds, prev.eliminatedTeams);

      return {
        ...prev,
        items: updated,
        roundScore: newRoundScore,
        activeTeam: nextActiveTeam,
        turnStepIndex: (prev.turnStepIndex || 0) + 1,
        phase: allRevealed ? 'ROUND_END' : prev.phase,
        lastGuessFeedback: {
          text: updated[index].texto,
          hit: true,
          itemIndex: index,
          team
        }
      };
    });
  };

  const [presenterPeek, setPresenterPeek] = useState(false);

  const handleMarkStrikeDirectly = (team: TeamId = tem.activeTeam) => {
    if (tem.phase === 'ROUND_END') return;
    sounds.playBuzzer();
    onUpdateTemOuNaoTemState((prev) => {
      const currentStrikes = (prev.strikes[team] || 0) + 1;
      const updatedStrikes = { ...prev.strikes, [team]: currentStrikes };
      const updatedEliminated = [...prev.eliminatedTeams];
      let freeDomain = prev.freeDomainTeam;
      let nextTeam = prev.activeTeam;

      const maxStrikesCfg = prev.maxStrikes || 2;
      if (currentStrikes >= maxStrikesCfg && !updatedEliminated.includes(team)) {
        updatedEliminated.push(team);
      }

      const survivingTeams = activeTeamIds.filter((t) => !updatedEliminated.includes(t));
      if (survivingTeams.length === 1) {
        freeDomain = survivingTeams[0];
        nextTeam = survivingTeams[0];
      } else if (survivingTeams.length > 1) {
        nextTeam = getNextTeamId(team, activeTeamIds, updatedEliminated);
      }

      const allEliminated = survivingTeams.length === 0;

      return {
        ...prev,
        strikes: updatedStrikes,
        eliminatedTeams: updatedEliminated,
        freeDomainTeam: freeDomain,
        activeTeam: nextTeam,
        turnStepIndex: (prev.turnStepIndex || 0) + 1,
        phase: allEliminated ? 'ROUND_END' : 'GUESSING',
        lastGuessFeedback: {
          text: 'STRIKE DIRETO',
          hit: false,
          team
        }
      };
    });
  };

  const handleSelectActiveTeam = (nextTeam: TeamId) => {
    onUpdateTemOuNaoTemState((prev) => ({
      ...prev,
      activeTeam: nextTeam,
      turnStepIndex: (prev.turnStepIndex || 0) + 1
    }));
  };

  const handleRevealAllRemaining = () => {
    sounds.playSuccess();
    onUpdateTemOuNaoTemState((prev) => ({
      ...prev,
      items: prev.items.map((it) => ({ ...it, revealed: true })),
      phase: 'ROUND_END'
    }));
  };

  // Dynamic Items definition (supports 3 to 10 items seamlessly)
  const isOddCount = tem.items.length % 2 === 1;
  const totalRespondents =
    tem.items.reduce((acc, it) => acc + (it.votos || 0), 0) ||
    getTemTotalRespondents(tem.items.length);
  const displayQuestion = sanitizeCleanGameText(
    stripPerguntamosPrefix(tem.roundData.pergunta),
    'tem-ou-nao-tem'
  );
  const maxStrikes = tem.maxStrikes || 2;
  const strikeNumbers = Array.from({ length: maxStrikes }, (_, i) => i + 1);
  const totalRoundPoints =
    (tem.roundScore.A || 0) +
    (tem.roundScore.B || 0) +
    (tem.roundScore.C || 0) +
    (tem.roundScore.D || 0);

  const teamAPlayers = room.players.filter(
    (p) => p.team === 'A' || room.teams.A.members?.includes(p.id)
  );
  const teamBPlayers = room.players.filter(
    (p) => p.team === 'B' || room.teams.B.members?.includes(p.id)
  );

  const isIndividualA = teamAPlayers.length === 1;
  const isIndividualB = teamBPlayers.length === 1;
  const isDuel1x1 = isIndividualA && isIndividualB;

  const playerAName = isIndividualA ? teamAPlayers[0].name : (room.teams.A.name || 'EQUIPE A');
  const playerBName = isIndividualB ? teamBPlayers[0].name : (room.teams.B.name || 'EQUIPE B');

  const ended = tem.phase === 'ROUND_END';
  const teamColor = (tId: TeamId) => TEAM_META[tId].hex;
  const teamName = (tId: TeamId) => {
    const members = room.players.filter((p) => p.team === tId || room.teams[tId]?.members?.includes(p.id));
    return members.length === 1 ? members[0].name : room.teams[tId]?.name || TEAM_META[tId].equipeLabel;
  };

  /** Painel de uma equipe (ou jogador): nome, quem joga, pontos e erros. Clicar passa a vez para ela. */
  const renderTeam = (tId: TeamId, side: 'left' | 'right' | 'strip') => {
    const meta = TEAM_META[tId];
    const isTurn = tem.activeTeam === tId && tem.phase === 'GUESSING';
    const isElim = tem.eliminatedTeams.includes(tId);
    const members = room.players.filter((p) => p.team === tId || room.teams[tId]?.members?.includes(p.id));
    const strikes = tem.strikes[tId] || 0;
    return (
      <button
        type="button"
        key={tId}
        data-testid={side === 'strip' ? `tem-compact-team-${tId}` : `tem-totem-dupla-${tId.toLowerCase()}`}
        className={`rdb-tem-team is-${side}${isTurn ? ' is-turn' : ''}${isElim ? ' is-out' : ''}`}
        style={{ ['--team' as string]: teamColor(tId) }}
        data-tip={isTurn ? 'Está na vez' : `Passar a vez para ${teamName(tId)}`}
        aria-label={`${teamName(tId)}: ${room.teams[tId]?.score || 0} pontos, ${strikes} de ${maxStrikes} erros`}
        onClick={() => !isTurn && handleSelectActiveTeam(tId)}
      >
        <span className="rdb-tem-team-name">{teamName(tId)}</span>
        <span className="rdb-tem-team-members">
          {members.map((m) => (
            <PlayerMark key={m.id} p={m} />
          ))}
        </span>
        <span className="rdb-tem-team-pts">
          {room.teams[tId]?.score || 0}
          <small>pts</small>
        </span>
        <span className="rdb-tem-strikes" aria-hidden="true">
          {strikeNumbers.map((num) => (
            <i key={num} className={strikes >= num ? 'is-on' : ''}>
              {strikes >= num ? <X size={16} strokeWidth={4} /> : null}
            </i>
          ))}
        </span>
        {isElim && <span className="rdb-tem-team-flag">Eliminada</span>}
      </button>
    );
  };

  const twoTeams = activeTeamIds.length === 2;

  return (
    <div className="rdb-tem">
      {/* Barra: o essencial aparece, o resto vira icone com dica */}
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Tem ou não tem
          <span className="rdb-lim-round">Top {tem.items.length}</span>
        </span>
        <span
          data-testid="tem-respondents-subtitle"
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip={`Pesquisa com ${totalRespondents} pessoas. Os votos somam ${totalRespondents}. Tema: ${room.theme}`}
        >
          <Info size={16} />
        </span>
        {!ended && (
          <div className="rdb-lim-tools">
            <button
              type="button"
              data-testid="tem-presenter-peek-btn"
              className={'rdb-lim-icon' + (presenterPeek ? ' is-on' : '')}
              aria-pressed={presenterPeek}
              aria-label="Espiar o gabarito"
              data-tip={presenterPeek ? 'Esconder o gabarito' : 'Espiar o gabarito (só o diretor)'}
              onClick={() => {
                sounds.playTick();
                setPresenterPeek((prev) => !prev);
              }}
            >
              {presenterPeek ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              data-testid="tem-swap-question-btn"
              className="rdb-lim-icon"
              disabled={isSwappingQuestion}
              aria-label="Trocar a pergunta"
              data-tip={isSwappingQuestion ? 'Gerando uma pergunta nova...' : 'Trocar a pergunta (IA)'}
              onClick={handleSwapQuestionWithAi}
            >
              <RefreshCw size={16} className={isSwappingQuestion ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              className="rdb-lim-icon"
              aria-label="Revelar tudo"
              data-tip="Revelar todas as respostas e encerrar a rodada"
              onClick={handleRevealAllRemaining}
            >
              <ListChecks size={16} />
            </button>
          </div>
        )}
      </header>

      <div className="rdb-tem-turn">
        <ActiveTurnBanner room={room} />
      </div>

      <div className={'rdb-tem-arena' + (twoTeams ? ' has-sides' : '')}>
        {twoTeams && renderTeam(activeTeamIds[0], 'left')}

        <section className="rdb-tem-main">
          <h2 data-testid="tem-ou-nao-tem-question" className="rdb-tem-question" data-len={displayQuestion.length > 110 ? 'l' : displayQuestion.length > 80 ? 'm' : 's'}>
            {displayQuestion}
          </h2>
          {tem.freeDomainTeam && !ended && (
            <span className="rdb-tem-free">Domínio livre: {teamName(tem.freeDomainTeam)} joga sozinha</span>
          )}

          <div data-testid="tem-board-panel" data-items-count={tem.items.length} className="rdb-tem-board">
            {tem.items.map((item, idx) => {
              if (!item) return null;
              const top = idx === 0;
              const wide = top && isOddCount;
              return (
                <div
                  key={idx}
                  data-testid={`tem-slot-${idx + 1}`}
                  data-span-full={wide ? 'true' : 'false'}
                  role="button"
                  tabIndex={0}
                  aria-label={item.revealed ? `${idx + 1}º: ${item.texto}, ${item.votos} votos` : `Revelar a posição ${idx + 1}`}
                  onClick={() => !item.revealed && handleRevealItemDirectly(idx)}
                  onKeyDown={(e) => e.key === 'Enter' && !item.revealed && handleRevealItemDirectly(idx)}
                  className={`rdb-tem-slot${top ? ' is-top' : ''}${wide ? ' is-wide' : ''}${item.revealed ? ' is-open' : ''}`}
                >
                  <span className="rdb-tem-slot-n">{idx + 1}</span>
                  {item.revealed ? (
                    <>
                      <span className="rdb-tem-slot-text">{item.texto}</span>
                      <span className="rdb-tem-slot-votes">{item.votos}</span>
                    </>
                  ) : presenterPeek ? (
                    <span className="rdb-tem-slot-peek">
                      {item.texto} <small>({item.votos})</small>
                    </span>
                  ) : (
                    <span className="rdb-tem-slot-closed" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>

          {!twoTeams && (
            <div className="rdb-tem-strip">{activeTeamIds.map((tId) => renderTeam(tId, 'strip'))}</div>
          )}
        </section>

        {twoTeams && renderTeam(activeTeamIds[1], 'right')}
      </div>

      {/* Palpite e a acao principal */}
      <footer className="rdb-tem-foot">
        <label htmlFor="host-tv-guess-input" className="sr-only">
          Palpite falado pela equipe
        </label>
        <input
          id="host-tv-guess-input"
          name="hostTvGuess"
          aria-label="Palpite falado pela equipe"
          type="text"
          autoComplete="off"
          disabled={ended}
          value={manualGuessText}
          onChange={(e) => setManualGuessText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleProcessGuess(manualGuessText, tem.activeTeam)}
          placeholder={`Palpite de ${teamName(tem.activeTeam)}, ou clique numa posição`}
        />
        <button type="button" className="rdb-btn" disabled={ended} onClick={() => handleProcessGuess(manualGuessText, tem.activeTeam)}>
          Validar
        </button>
        <button
          type="button"
          data-testid="tem-strike-btn"
          className="rdb-btn rdb-tem-strike"
          disabled={ended}
          data-tip="Marcar erro para quem está na vez (tecla X)"
          onClick={() => handleMarkStrikeDirectly(tem.activeTeam)}
        >
          <X size={18} strokeWidth={3} /> Erro
        </button>
        {ended && (
          <button type="button" data-testid="tem-confirm-points-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
            Confirmar pontos e avançar
            <ArrowRight />
          </button>
        )}
      </footer>
    </div>
  );
};
