import React from 'react';
import { ConfirmSendButton } from '../ConfirmSendButton';
import { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { applyTemGuess, findTemMatch } from '../../../utils/temGuess';

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

      const matchedIndex = findTemMatch(room, guessText);
      if (matchedIndex !== -1) sounds.playSuccess();
      else sounds.playBuzzer();
      onUpdateRoom((prev) => applyTemGuess(prev, team, guessText, matchedIndex));
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
