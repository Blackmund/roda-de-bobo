import { themeBadge } from '../../utils/themeUtils';
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
import { ArrowRight, RefreshCw } from 'lucide-react';
import { RodaDeBoboOfficialBadge } from '../RodaIcons';
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

  return (
    <div className="h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5 max-w-[1750px] w-full mx-auto px-2 sm:px-4">
      {/* Top Banner Header: CazéTV Roda de Bobo Logo + Round Score Counter */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#17B8B8] border border-white/40 flex items-center justify-center font-anton text-black text-sm">
            RB
          </div>
          <div>
            <span className="font-anton text-base md:text-lg text-white tracking-wider uppercase leading-none block">
              TEM OU NÃO TEM (TOP {tem.items.length})
            </span>
            <div
              data-testid="tem-respondents-subtitle"
              className="text-[10px] font-mono-code text-[#17B8B8] uppercase"
            >
              PESQUISA COM {totalRespondents} PESSOAS // SOMA = {totalRespondents} PONTOS
            </div>
          </div>
        </div>

        {/* Center Official Badge */}
        <div className="hidden md:flex items-center justify-center">
          <RodaDeBoboOfficialBadge size="sm" />
        </div>

        {/* Accumulated Round Score Box */}
        <div className="border border-[#17B8B8]/60 bg-white/[0.03] px-3 py-0.5 flex items-center gap-2.5">
          <div>
            <div className="text-[9px] font-mono-code text-[#17B8B8] font-bold uppercase tracking-wider">
              PONTOS NA RODADA
            </div>
            <div className="font-anton text-lg md:text-xl text-cyan-200 text-center leading-none">
              {totalRoundPoints}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic 1-line Action Guidance Banner ("O que eu faço agora?") */}
      <div className="shrink-0 px-3 py-1 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono-code mb-1">
        <div className="flex items-start sm:items-center gap-2 sm:truncate">
          <span className="w-2 h-2 rounded-full bg-[#17B8B8] animate-pulse shrink-0" />
          <span className="text-slate-300">
            {tem.phase === 'GUESSING' ? (
              <>
                🎯 🎤{' '}
                <strong className="text-white">
                  {tem.activeTeam === 'A' && isIndividualA
                    ? `VEZ DE ${playerAName.toUpperCase()}:`
                    : tem.activeTeam === 'B' && isIndividualB
                    ? `VEZ DE ${playerBName.toUpperCase()}:`
                    : `VEZ DA EQUIPE ${tem.activeTeam}:`}
                </strong>{' '}
                Digite o palpite falado ou clique na posição 1-{tem.items.length} para revelar
              </>
            ) : (
              <>🏆 <strong className="text-white">FIM DA RODADA:</strong> Revise os pontos acumulados e confirme o avanço da partida</>
            )}
          </span>
        </div>
        
      </div>

      {/* Main Arena Content: Responsive Stacked (< xl) vs Arena Widescreen (xl:grid xl:grid-cols-12) */}
      <div className="flex-1 min-h-0 xl:grid xl:grid-cols-12 xl:gap-6 xl:items-stretch flex flex-col justify-between overflow-hidden">
        {/* =========================================================================
            COLUNA ESQUERDA (xl:col-span-2) — Totem Vertical EQUIPE / JOGADOR A (Modo Widescreen)
           ========================================================================= */}
        <div
          data-testid="tem-totem-dupla-a"
          className={`hidden xl:flex xl:col-span-2 flex-col justify-between border p-3.5 bg-[#07080d]/90 transition-all duration-200 ${
            tem.activeTeam === 'A' && tem.phase === 'GUESSING'
              ? 'border-2 border-[#E6194B] shadow-[0_0_25px_rgba(230,25,75,0.45)] ring-2 ring-[#E6194B] bg-gradient-to-b from-[#E6194B]/20 via-[#07080d]/95 to-[#E6194B]/5'
              : 'border-white/10 bg-[#07080d]/80 opacity-70 hover:opacity-100 transition-opacity'
          }`}
        >
          {/* Topo do Totem A: Nome da Equipe / Jogador + Badge de Turno */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-anton text-lg tracking-wider uppercase text-rose-300 truncate" title={playerAName}>
                {playerAName}
              </span>
              <span className="font-mono-code text-[10px] text-white/50 uppercase">
                {isIndividualA ? 'JOGADOR' : 'EQUIPE A'}
              </span>
            </div>

            {tem.activeTeam === 'A' && tem.phase === 'GUESSING' ? (
              <div className="py-2 px-2 border-2 border-[#E6194B] bg-gradient-to-r from-[#E6194B]/30 via-[#E6194B]/20 to-[#E6194B]/30 text-white font-anton text-xs uppercase tracking-widest text-center shadow-[0_0_15px_rgba(230,25,75,0.5)] flex items-center justify-center gap-1.5 animate-pulse">
                <span>🎯</span>
                <span className="font-black text-rose-200">
                  {isIndividualA ? `VEZ DE ${playerAName.toUpperCase()}!` : 'VEZ DA EQUIPE A!'}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectActiveTeam('A')}
                className="w-full py-1.5 px-2 border border-white/10 bg-white/[0.02] hover:border-rose-400 hover:bg-rose-950/30 text-slate-500 hover:text-rose-300 font-mono-code text-[10px] uppercase tracking-wider text-center transition-colors cursor-pointer"
                title={`Clique para passar a vez para ${isIndividualA ? playerAName : 'a Equipe A'}`}
              >
                AGUARDANDO TURNO
              </button>
            )}

            {/* Integrantes da Equipe A / Perfil Individual */}
            <div className="pt-1">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                <span>{isIndividualA ? 'JOGADOR:' : 'INTEGRANTES:'}</span>
                <span className="text-[9px] text-rose-400 font-mono-code font-bold">
                  {isIndividualA ? 'DUELO 1x1' : 'JOGAM JUNTOS'}
                </span>
              </div>
              <div className="space-y-1">
                {teamAPlayers.length > 0 ? (
                  teamAPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="px-2.5 py-1.5 border border-white/10 bg-white/[0.03] font-mono-code text-xs text-slate-200 font-semibold flex items-center gap-2 truncate"
                    >
                      <span className="text-base shrink-0"><PlayerMark p={player} /></span>
                      <span className="truncate">{player.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono-code text-slate-500 italic">
                    {isIndividualA ? 'Jogador da Equipe A' : 'Integrantes da Equipe A'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Centro do Totem A: Placar Acumulado Gigante */}
          <div className="my-auto py-4 text-center border-y border-white/10 bg-white/[0.02]">
            <div className="text-[11px] font-mono-code text-[#17B8B8] font-bold uppercase tracking-widest mb-1">
              {isIndividualA ? `PONTOS DE ${playerAName.toUpperCase()}` : 'PONTOS DA EQUIPE'}
            </div>
            <div className="font-anton text-4xl xl:text-5xl text-rose-300 font-black tracking-normal leading-none">
              +{tem.roundScore.A} <span className="text-xl font-normal text-rose-400/80">PTS</span>
            </div>
            <div className="text-[10px] font-mono-code text-slate-400 mt-1">
              TOTAL GERAL: {room.teams.A.score} PTS
            </div>
          </div>

          {/* Base do Totem A: Blocos de Strike [ X ] + Atalho Rápido */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-code text-rose-400 uppercase font-bold tracking-wider">
                ERROS / STRIKES
              </span>
              <span className="font-mono-code text-[10px] text-slate-400">
                {tem.strikes.A} DE {maxStrikes}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {strikeNumbers.map((num) => (
                <div
                  key={num}
                  className={`h-11 border-2 flex items-center justify-center font-anton text-2xl transition-all ${
                    tem.strikes.A >= num
                      ? 'border-[#E6194B] bg-[#E6194B] text-white shadow-[0_0_15px_rgba(230,25,75,0.6)]'
                      : 'border-white/15 bg-[#07080d] text-slate-700'
                  }`}
                >
                  {tem.strikes.A >= num ? 'X' : ''}
                </div>
              ))}
            </div>

            {tem.eliminatedTeams.includes('A') ? (
              <div className="text-[10px] font-mono-code text-rose-400 font-bold uppercase text-center py-1 border border-rose-500/40 bg-rose-500/10">
                ELIMINADA DA RODADA
              </div>
            ) : (
              <button
                type="button"
                disabled={tem.phase === 'ROUND_END'}
                onClick={() => handleMarkStrikeDirectly('A')}
                className="w-full py-1.5 border border-[#E6194B] bg-[#E6194B]/20 hover:bg-[#E6194B] disabled:opacity-40 text-white font-anton text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                ❌ STRIKE EQUIPE A
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            COLUNA CENTRAL (xl:col-span-8) — O Painel Principal de Posições (Esticado)
           ========================================================================= */}
        <div className="flex-1 min-h-0 xl:col-span-8 flex flex-col justify-between gap-1.5 overflow-hidden">

          {/* Survey Question Header */}
          <div className="text-center space-y-0.5 shrink-0">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono-code text-[#17B8B8] uppercase tracking-widest">
              <span>
                TEMA CENTRAL: {room.theme} // PESQUISA COM {totalRespondents} RESPONDENTES
              </span>
              {tem.phase !== 'ROUND_END' && (
                <>
                  <button
                    type="button"
                    data-testid="tem-swap-question-btn"
                    disabled={isSwappingQuestion}
                    onClick={handleSwapQuestionWithAi}
                    className="px-2 py-0.5 border border-[#17B8B8]/50 bg-[#17B8B8]/10 hover:bg-[#17B8B8] hover:text-black text-cyan-200 font-mono-code text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={10} className={isSwappingQuestion ? 'animate-spin' : ''} />
                    <span>{isSwappingQuestion ? 'Gerando Nova...' : 'Trocar Pergunta (IA)'}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="tem-presenter-peek-btn"
                    onClick={() => {
                      sounds.playTick();
                      setPresenterPeek((prev) => !prev);
                    }}
                    className={`px-2 py-0.5 border font-mono-code text-[10px] font-bold uppercase inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      presenterPeek
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-white/15 bg-[#07080d] text-slate-300 hover:border-amber-400'
                    }`}
                  >
                    <span>{presenterPeek ? '🙈 Ocultar Gabarito' : '👁️ Espiar Gabarito'}</span>
                  </button>
                </>
              )}
            </div>

            <h2
              data-testid="tem-ou-nao-tem-question"
              className="text-base sm:text-lg md:text-xl xl:text-2xl font-black text-[#F5F2EB] uppercase leading-tight tracking-normal text-center max-w-4xl mx-auto py-1"
            >
              {displayQuestion}
            </h2>

            {tem.freeDomainTeam && tem.phase !== 'ROUND_END' && (
              <div className="inline-block px-3 py-0.5 bg-amber-400 text-black font-anton text-xs uppercase tracking-widest animate-pulse">
                ⭐ DOMÍNIO LIVRE! EQUIPE {tem.freeDomainTeam} JOGA SOZINHA SEM REVEZAR
              </div>
            )}
          </div>

          {/* Official Dynamic Block Panel Layout (3 to 10 positions — Elastic Stretched Grid) */}
          <div
            data-testid="tem-board-panel"
            data-items-count={tem.items.length}
            className={`flex-1 min-h-0 overflow-y-auto scrollbar-none w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-2 content-stretch py-1`}
          >
            {tem.items.map((item, idx) => {
              if (!item) return null;
              const isTop1 = idx === 0;
              const spanFullRow = isTop1 && isOddCount;
              const isCompactBoard = tem.items.length >= 7;

              return (
                <div
                  key={idx}
                  data-testid={`tem-slot-${idx + 1}`}
                  data-span-full={spanFullRow ? 'true' : 'false'}
                  onClick={() => !item.revealed && handleRevealItemDirectly(idx)}
                  className={`cursor-pointer relative border bg-[#07080d] overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                    spanFullRow ? 'md:col-span-2' : ''
                  } ${
                    isTop1
                      ? item.revealed
                        ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8]'
                        : 'border-[#17B8B8]/60 hover:border-[#17B8B8]'
                      : item.revealed
                      ? 'border-[#E6194B] bg-[#E6194B]/10'
                      : 'border-white/15 hover:border-[#E6194B]/70'
                  }`}
                >
                  {/* Header Bar: Cyan (#17B8B8) for Top 1, Red/Pink (#E6194B) for Positions 2..N */}
                  <div
                    className={`font-anton text-[10px] xl:text-xs uppercase tracking-widest px-2.5 py-0.5 flex items-center justify-between shrink-0 ${
                      isTop1 ? 'bg-[#17B8B8] text-black' : 'bg-[#E6194B] text-white'
                    }`}
                  >
                    <span>{isTop1 ? 'POSIÇÃO 1 // TOP 1 MAIS VOTADO' : `POSIÇÃO ${idx + 1}`}</span>
                    <span className="font-mono-code font-bold">{isTop1 ? 'TOP VOTOS' : 'VOTOS'}</span>
                  </div>

                  <div
                    className={`px-3 py-1.5 flex items-center justify-between gap-2 flex-1 ${
                      isCompactBoard ? 'min-h-[44px] xl:min-h-[54px]' : 'min-h-[50px] xl:min-h-[64px]'
                    }`}
                  >
                    {item.revealed ? (
                      <>
                        <div
                          className={`font-anton text-white uppercase tracking-wide leading-tight break-words flex-1 ${
                            isCompactBoard
                              ? 'text-sm md:text-base xl:text-xl'
                              : spanFullRow
                              ? 'text-base md:text-xl xl:text-2xl'
                              : 'text-sm md:text-lg xl:text-2xl'
                          }`}
                        >
                          {item.texto}
                        </div>
                        <div
                          className={`px-2.5 py-1 border font-anton ${
                            isCompactBoard ? 'text-lg md:text-xl xl:text-2xl' : 'text-xl md:text-2xl xl:text-3xl'
                          } shrink-0 ${
                            isTop1
                              ? 'border-[#17B8B8] bg-[#17B8B8]/20 text-cyan-200'
                              : 'border-[#E6194B] bg-[#E6194B]/20 text-rose-200'
                          }`}
                        >
                          {item.votos}
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex flex-col items-center justify-center text-center py-1">
                        <div
                          className={`font-anton text-[#F5F2EB]/80 leading-none ${
                            isCompactBoard ? 'text-xl md:text-2xl xl:text-3xl' : 'text-2xl md:text-3xl xl:text-4xl'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {presenterPeek && (
                          <div className="text-[10px] xl:text-xs font-mono-code text-amber-300/90 uppercase font-bold mt-0.5">
                            👁️ {item.texto} ({item.votos} pts)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Strike & Score Displays for all active teams (always shown when >2 teams, or < xl when 2 teams) */}
          <div
            className={`grid gap-2 max-w-4xl w-full mx-auto shrink-0 ${
              activeTeamIds.length > 2
                ? activeTeamIds.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-4'
                : 'grid-cols-2 xl:hidden'
            }`}
          >
            {activeTeamIds.map((tId) => {
              const meta = TEAM_META[tId];
              const isTurn = tem.activeTeam === tId && tem.phase === 'GUESSING';
              const teamStrikes = tem.strikes[tId] || 0;
              const teamRoundPts = tem.roundScore[tId] || 0;
              const isElim = tem.eliminatedTeams.includes(tId);
              const teamMembers = room.players.filter(
                (p) => p.team === tId || room.teams[tId]?.members?.includes(p.id)
              );
              const isSinglePlayer = teamMembers.length === 1;
              const displayLabel = isSinglePlayer
                ? teamMembers[0].name.toUpperCase()
                : meta.equipeLabel;

              return (
                <div
                  key={tId}
                  data-testid={`tem-compact-team-${tId}`}
                  className={`px-2.5 py-1.5 border transition-all ${
                    isTurn
                      ? `${meta.borderClass} ${meta.bgClass} ${meta.glowShadow}`
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-anton text-xs uppercase tracking-wide truncate ${meta.textClass}`}>
                      {displayLabel} {isTurn ? '• 🎤 VEZ' : ''}
                    </span>
                    <span className={`font-mono-code text-[11px] sm:text-xs font-bold shrink-0 ${meta.textClass}`}>
                      +{teamRoundPts} PTS <span className="opacity-75 font-normal">({room.teams[tId]?.score || 0} TOT)</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {strikeNumbers.map((num) => (
                      <div
                        key={num}
                        className={`flex-1 h-5 border flex items-center justify-center font-anton text-sm ${
                          teamStrikes >= num
                            ? 'border-[#E6194B] bg-[#E6194B] text-white'
                            : 'border-white/10 bg-[#07080d] text-slate-700'
                        }`}
                      >
                        {teamStrikes >= num ? 'X' : ''}
                      </div>
                    ))}
                  </div>

                  {isElim && (
                    <div className="text-[9px] font-mono-code text-rose-400 font-bold uppercase mt-0.5 text-center">
                      ELIMINADA ({maxStrikes} {maxStrikes === 1 ? 'STRIKE' : 'STRIKES'})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            COLUNA DIREITA (xl:col-span-2) — Totem Vertical EQUIPE / JOGADOR B (Modo Widescreen)
           ========================================================================= */}
        <div
          data-testid="tem-totem-dupla-b"
          className={`hidden xl:flex xl:col-span-2 flex-col justify-between border p-3.5 bg-[#07080d]/90 transition-all duration-200 ${
            tem.activeTeam === 'B' && tem.phase === 'GUESSING'
              ? 'border-2 border-[#17B8B8] shadow-[0_0_25px_rgba(23,184,184,0.45)] ring-2 ring-[#17B8B8] bg-gradient-to-b from-[#17B8B8]/20 via-[#07080d]/95 to-[#17B8B8]/5'
              : 'border-white/10 bg-[#07080d]/80 opacity-70 hover:opacity-100 transition-opacity'
          }`}
        >
          {/* Topo do Totem B: Nome da Equipe / Jogador + Badge de Turno */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-anton text-lg tracking-wider uppercase text-[#17B8B8] truncate" title={playerBName}>
                {playerBName}
              </span>
              <span className="font-mono-code text-[10px] text-white/50 uppercase">
                {isIndividualB ? 'JOGADOR' : 'EQUIPE B'}
              </span>
            </div>

            {tem.activeTeam === 'B' && tem.phase === 'GUESSING' ? (
              <div className="py-2 px-2 border-2 border-[#17B8B8] bg-gradient-to-r from-[#17B8B8]/30 via-[#17B8B8]/20 to-[#17B8B8]/30 text-white font-anton text-xs uppercase tracking-widest text-center shadow-[0_0_15px_rgba(23,184,184,0.5)] flex items-center justify-center gap-1.5 animate-pulse">
                <span>🎯</span>
                <span className="font-black text-cyan-200">
                  {isIndividualB ? `VEZ DE ${playerBName.toUpperCase()}!` : 'VEZ DA EQUIPE B!'}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectActiveTeam('B')}
                className="w-full py-1.5 px-2 border border-white/10 bg-white/[0.02] hover:border-cyan-400 hover:bg-cyan-950/30 text-slate-500 hover:text-cyan-300 font-mono-code text-[10px] uppercase tracking-wider text-center transition-colors cursor-pointer"
                title={`Clique para passar a vez para ${isIndividualB ? playerBName : 'a Equipe B'}`}
              >
                AGUARDANDO TURNO
              </button>
            )}

            {/* Integrantes da Equipe B / Perfil Individual */}
            <div className="pt-1">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                <span>{isIndividualB ? 'JOGADOR:' : 'INTEGRANTES:'}</span>
                <span className="text-[9px] text-[#17B8B8] font-mono-code font-bold">
                  {isIndividualB ? 'DUELO 1x1' : 'JOGAM JUNTOS'}
                </span>
              </div>
              <div className="space-y-1">
                {teamBPlayers.length > 0 ? (
                  teamBPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="px-2.5 py-1.5 border border-white/10 bg-white/[0.03] font-mono-code text-xs text-slate-200 font-semibold flex items-center gap-2 truncate"
                    >
                      <span className="text-base shrink-0"><PlayerMark p={player} /></span>
                      <span className="truncate">{player.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs font-mono-code text-slate-500 italic">
                    {isIndividualB ? 'Jogador da Equipe B' : 'Integrantes da Equipe B'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Centro do Totem B: Placar Acumulado Gigante */}
          <div className="my-auto py-4 text-center border-y border-white/10 bg-white/[0.02]">
            <div className="text-[11px] font-mono-code text-[#17B8B8] font-bold uppercase tracking-widest mb-1">
              {isIndividualB ? `PONTOS DE ${playerBName.toUpperCase()}` : 'PONTOS DA EQUIPE'}
            </div>
            <div className="font-anton text-4xl xl:text-5xl text-[#17B8B8] font-black tracking-normal leading-none">
              +{tem.roundScore.B} <span className="text-xl font-normal text-cyan-200/80">PTS</span>
            </div>
            <div className="text-[10px] font-mono-code text-slate-400 mt-1">
              TOTAL GERAL: {room.teams.B.score} PTS
            </div>
          </div>

          {/* Base do Totem B: Blocos de Strike [ X ] + Atalho Rápido */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-code text-rose-400 uppercase font-bold tracking-wider">
                ERROS / STRIKES
              </span>
              <span className="font-mono-code text-[10px] text-slate-400">
                {tem.strikes.B} DE {maxStrikes}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {strikeNumbers.map((num) => (
                <div
                  key={num}
                  className={`h-11 border-2 flex items-center justify-center font-anton text-2xl transition-all ${
                    tem.strikes.B >= num
                      ? 'border-[#E6194B] bg-[#E6194B] text-white shadow-[0_0_15px_rgba(230,25,75,0.6)]'
                      : 'border-white/15 bg-[#07080d] text-slate-700'
                  }`}
                >
                  {tem.strikes.B >= num ? 'X' : ''}
                </div>
              ))}
            </div>

            {tem.eliminatedTeams.includes('B') ? (
              <div className="text-[10px] font-mono-code text-[#17B8B8] font-bold uppercase text-center py-1 border border-[#17B8B8]/40 bg-[#17B8B8]/10">
                ELIMINADA DA RODADA
              </div>
            ) : (
              <button
                type="button"
                disabled={tem.phase === 'ROUND_END'}
                onClick={() => handleMarkStrikeDirectly('B')}
                className="w-full py-1.5 border border-[#E6194B] bg-[#E6194B]/20 hover:bg-[#E6194B] disabled:opacity-40 text-white font-anton text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                ❌ STRIKE EQUIPE B
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra Inferior de Ação: Host TV Assistant Input + Direct Strike Button + Explicit Commit CTA */}
      <div className="w-full mx-auto border border-white/10 bg-white/[0.03] p-1.5 flex flex-wrap items-center gap-2 shrink-0 mt-2">
        <label htmlFor="host-tv-guess-input" className="sr-only">
          Palpite falado pela equipe
        </label>
        <input
          id="host-tv-guess-input"
          name="hostTvGuess"
          aria-label="Palpite falado pela equipe"
          type="text"
          autoComplete="off"
          disabled={tem.phase === 'ROUND_END'}
          value={manualGuessText}
          onChange={(e) => setManualGuessText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleProcessGuess(manualGuessText, tem.activeTeam)}
          placeholder={`Digite o palpite falado pela Equipe ${tem.activeTeam} (ou clique nas posições 1-${tem.items.length})...`}
          className="flex-1 min-w-[180px] bg-[#07080d] border border-white/15 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#17B8B8]"
        />
        <button
          type="button"
          disabled={tem.phase === 'ROUND_END'}
          onClick={() => handleProcessGuess(manualGuessText, tem.activeTeam)}
          className="disabled:opacity-40 disabled:cursor-not-allowed px-3.5 py-1.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase cursor-pointer transition-colors"
        >
          VALIDAR PALPITE (EQUIPE {tem.activeTeam})
        </button>

        <button
          type="button"
          disabled={tem.phase === 'ROUND_END'}
          onClick={handleRevealAllRemaining}
          className="disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 border border-white/20 bg-[#07080d] hover:bg-white/10 text-slate-300 font-anton text-xs uppercase cursor-pointer transition-colors"
        >
          REVELAR TUDO
        </button>

        {/* Destructive Control (Strike) visually separated with margin and distinct red border */}
        <div className="pl-2 border-l border-white/20">
          <button
            type="button"
            data-testid="tem-strike-btn"
            disabled={tem.phase === 'ROUND_END'}
            onClick={() => handleMarkStrikeDirectly(tem.activeTeam)}
            className="px-3.5 py-1.5 border border-[#E6194B] bg-[#E6194B]/20 hover:bg-[#E6194B] disabled:opacity-40 text-rose-200 hover:text-white font-anton text-xs uppercase tracking-wider cursor-pointer transition-all"
            title="Atalho de teclado: Tecla X"
          >
            ❌ MARCAR ERRO (STRIKE)
          </button>
        </div>

        {tem.phase === 'ROUND_END' && (
          <button
            type="button"
            data-testid="tem-confirm-points-btn"
            onClick={onNextRound}
            className="ml-auto px-5 py-1.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs md:text-sm uppercase tracking-wider shadow-neon-cyan transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Confirmar Pontos e Avançar ➔</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
