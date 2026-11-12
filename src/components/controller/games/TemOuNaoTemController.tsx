import React from 'react';
import { ConfirmSendButton } from '../ConfirmSendButton';
import { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { getActiveTeamIds, getNextTeamId } from '../../../utils/teamUtils';
import { checkAnswerFuzzyMatch } from '../../../utils/fuzzyMatch';

interface TemOuNaoTemControllerProps {
  room: GameRoom;
  player: Player;
  temGuess: string;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  setTemGuess: React.Dispatch<React.SetStateAction<string>>;
  wrapIfMultiMode: (...args: any[]) => any;
  renderMobileTurnSpotlightBanner: (...args: any[]) => any;
}

export const TemOuNaoTemController: React.FC<TemOuNaoTemControllerProps> = ({
  room,
  player,
  temGuess,
  onUpdateRoom,
  setTemGuess,
  wrapIfMultiMode,
  renderMobileTurnSpotlightBanner
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem)) return null;

    const tem = room.temOuNaoTem;
    const isMyTeamTurn = tem.activeTeam === player.team;

    const normalizeStr = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const handleSendTemGuess = () => {
      const guessText = temGuess.trim();
      if (!guessText || !isMyTeamTurn) return;

      const team = player.team;

      let matchedIndex = -1;
      for (let i = 0; i < tem.items.length; i++) {
        const item = tem.items[i];
        if (item.revealed) continue;
        if (checkAnswerFuzzyMatch(guessText, item.texto, item.sinonimos_aceitos)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        sounds.playSuccess();
        onUpdateRoom((prev) => {
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
        });
      } else {
        sounds.playBuzzer();
        onUpdateRoom((prev) => {
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
        });
      }

      setTemGuess('');
    };

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          <div className="border border-cyan-400/60 bg-cyan-950/30 p-3 text-center">
            <span className="font-anton text-base text-cyan-300 uppercase block">
              TEM OU NÃO TEM (TOP {tem.items.length})
            </span>
            <p className="text-xs text-white font-medium">
              "{tem.roundData.pergunta}"
            </p>
          </div>

          <div className="border-2 border-rose-500 bg-black p-4 space-y-3">
            <label htmlFor="controller-tem-guess" className="text-xs font-anton text-rose-300 uppercase block">
              {isMyTeamTurn ? '👉 VEZ DA SUA EQUIPE PALPITAR!' : 'Vez da outra equipe...'}
            </label>
            <input
              id="controller-tem-guess"
              name="controllerTemGuess"
              type="text"
              autoComplete="off"
              value={temGuess}
              onChange={(e) => setTemGuess(e.target.value)}
              placeholder="Digite o palpite da sua equipe..."
              className="w-full bg-black border border-cyan-400 p-3 text-white text-sm focus:outline-none"
            />
            <ConfirmSendButton
              onConfirm={handleSendTemGuess}
              disabled={!isMyTeamTurn || !temGuess.trim()}
              label="ENVIAR PALPITE"
              confirmLabel={`⚠️ ENVIAR "${temGuess.trim()}"? TOQUE DE NOVO`}
              className="w-full py-3 border-2 border-cyan-300 bg-cyan-400 disabled:opacity-40 text-black font-anton text-sm uppercase cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  };
