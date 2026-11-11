import React from 'react';
import { GameRoom, Player } from '../../../types/game';
import { DrawingCanvas } from '../../DrawingCanvas';
import { PINTO_COLORS, addStroke as pintoAddStroke, clearDrawing as pintoClear, undoStroke as pintoUndo } from '../../../utils/comoEuPintoEngine';

interface ComoEuPintoControllerProps {
  room: GameRoom;
  player: Player;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (...args: any[]) => any;
  pintoColor: string;
  setPintoColor: React.Dispatch<React.SetStateAction<string>>;
}

export const ComoEuPintoController: React.FC<ComoEuPintoControllerProps> = ({
  room,
  player,
  onUpdateRoom,
  wrapIfMultiMode,
  pintoColor,
  setPintoColor
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'como-eu-pinto' && room.comoEuPinto)) return null;

    const c = room.comoEuPinto;
    const isDrawer = player.id === c.drawerPlayerId;
    const canDraw = isDrawer && c.phase === 'PLAYING';
    const mm = Math.floor(c.timerSeconds / 60);
    const ss = String(c.timerSeconds % 60).padStart(2, '0');
    const update = (fn: (prev: NonNullable<GameRoom['comoEuPinto']>) => NonNullable<GameRoom['comoEuPinto']>) =>
      onUpdateRoom((prev) => ({ ...prev, comoEuPinto: prev.comoEuPinto ? fn(prev.comoEuPinto) : undefined }));
    return wrapIfMultiMode(
      <div
        data-testid="controller-pinto-view"
        className="min-h-screen bg-[#07080d] p-3 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🎨 Como eu pinto</span>
          <span className="font-anton text-lg">{room.timerConfig === 0 ? 'LIVRE' : mm + ':' + ss}</span>
        </div>
        {isDrawer ? (
          <div className="border-2 border-cyan-400/60 bg-black p-2 text-center">
            <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">
              Desenhe (sem letras nem números, sem falar)
            </div>
            <div data-testid="controller-pinto-word" className="font-anton text-3xl uppercase leading-tight break-words">
              {c.phase === 'PLAYING' ? (c.wordHidden ? '🙈' : c.words[c.currentIndex]) : c.phase === 'READY' ? 'Aguarde o início' : 'Tempo encerrado'}
            </div>
          </div>
        ) : (
          <div className="border border-white/15 bg-black/50 p-2 text-center font-mono-code text-xs text-slate-300">
            {player.id === c.guesserPlayerId
              ? 'Olhe o desenho e chute a palavra em voz alta!'
              : 'Acompanhe o desenho. Você pode olhar, mas não pode ajudar.'}
          </div>
        )}
        <DrawingCanvas
          testId="controller-pinto-canvas"
          strokes={c.strokes}
          editable={canDraw}
          color={pintoColor}
          onStroke={(stroke) => update((prev) => pintoAddStroke(prev, stroke))}
        />
        {canDraw && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PINTO_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                aria-label={'Cor ' + col}
                onClick={() => setPintoColor(col)}
                style={{ backgroundColor: col }}
                className={'w-8 h-8 border-2 cursor-pointer ' + (pintoColor === col ? 'border-white scale-110' : 'border-black/60')}
              />
            ))}
            <button
              type="button"
              data-testid="controller-pinto-undo"
              onClick={() => update((prev) => pintoUndo(prev))}
              className="px-3 py-1.5 border border-white/25 text-slate-200 font-anton text-xs uppercase cursor-pointer"
            >
              Desfazer
            </button>
            <button
              type="button"
              data-testid="controller-pinto-clear"
              onClick={() => update((prev) => pintoClear(prev))}
              className="px-3 py-1.5 border border-white/25 text-slate-200 font-anton text-xs uppercase cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}
        <div className="font-mono-code text-[11px] text-slate-300 text-center">
          Quem confirma acerto, pulo e roubo é o diretor na TV.
        </div>
      </div>
    );
  };
