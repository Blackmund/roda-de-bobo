import React from 'react';
import { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { currentValue as respostasValue, pickPosition as respostasPick } from '../../../utils/respostasEngine';

interface RespostasSemPerguntasControllerProps {
  room: GameRoom;
  player: Player;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (...args: any[]) => any;
}

export const RespostasSemPerguntasController: React.FC<RespostasSemPerguntasControllerProps> = ({
  room,
  player,
  onUpdateRoom,
  wrapIfMultiMode
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'respostas-sem-perguntas' && room.respostasSemPerguntas)) return null;

    const r = room.respostasSemPerguntas;
    const isMyTurn = r.phase === 'PLAYING' && r.turnPlayerId === player.id;
    const turnName = room.players.find((p) => p.id === r.turnPlayerId)?.name || '—';
    const done = r.phase === 'SUMMARY';
    const pick = (i: number) => {
      sounds.playFlip();
      onUpdateRoom((prev) => ({
        ...prev,
        respostasSemPerguntas: prev.respostasSemPerguntas ? respostasPick(prev.respostasSemPerguntas, i) : undefined
      }));
    };
    return wrapIfMultiMode(
      <div
        data-testid="controller-rsp-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">❓ Respostas sem perguntas</span>
          <span className="font-anton text-base text-amber-200">Vale {respostasValue(r)} pts</span>
        </div>
        <div className="border border-cyan-400/50 bg-black p-3 flex flex-wrap gap-1.5 justify-center">
          {r.words.map((w, i) => {
            const canPick = isMyTurn && r.step === 'pick' && !r.revealed[i];
            return (
              <button
                key={i}
                type="button"
                data-testid={'controller-rsp-word-' + i}
                disabled={!canPick}
                onClick={() => pick(i)}
                className={
                  'min-w-[2.8rem] px-2 py-1.5 border font-anton text-lg uppercase ' +
                  (r.revealed[i] || done
                    ? 'border-emerald-400 text-emerald-200'
                    : canPick
                    ? 'border-cyan-300 bg-cyan-950/50 text-cyan-100 cursor-pointer'
                    : 'border-white/15 text-slate-600')
                }
              >
                {r.revealed[i] || done ? w : i + 1}
              </button>
            );
          })}
        </div>
        <div className="border border-white/15 bg-black/50 p-3 text-center">
          <div className="font-anton text-xl uppercase">
            {r.phase === 'READY'
              ? 'Aguarde o início'
              : done
              ? r.winnerPlayerId
                ? (room.players.find((p) => p.id === r.winnerPlayerId)?.name || '—') + ' acertou!'
                : 'Ninguém acertou'
              : isMyTurn
              ? r.step === 'pick'
                ? 'Sua vez: toque numa palavra'
                : 'Agora chute a resposta em voz alta!'
              : 'Vez de ' + turnName}
          </div>
          {done && <div className="font-mono-code text-xs text-amber-200 mt-1">Resposta: {r.answer}</div>}
        </div>
      </div>
    );
  };
