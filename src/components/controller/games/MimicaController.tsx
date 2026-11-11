import React from 'react';
import { GameRoom, Player } from '../../../types/game';

interface MimicaControllerProps {
  room: GameRoom;
  player: Player;
  wrapIfMultiMode: (...args: any[]) => any;
}

export const MimicaController: React.FC<MimicaControllerProps> = ({
  room,
  player,
  wrapIfMultiMode
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'mimica' && room.mimica)) return null;

    const m = room.mimica;
    const isMime = player.id === m.mimePlayerId;
    const isGuesser = player.id === m.guesserPlayerId;
    const mm = Math.floor(m.timerSeconds / 60);
    const ss = String(m.timerSeconds % 60).padStart(2, '0');
    return wrapIfMultiMode(
      <div
        data-testid="controller-mimica-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-4 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🎭 Mímica</span>
          <span className="font-anton text-lg">{room.timerConfig === 0 ? 'LIVRE' : mm + ':' + ss}</span>
        </div>
        {isGuesser ? (
          <div className="border border-amber-400/60 bg-amber-950/30 p-4 text-center space-y-2">
            <div className="text-4xl">🙈</div>
            <div className="font-anton text-xl uppercase">Você adivinha!</div>
            <p className="font-mono-code text-xs text-slate-200">
              Não olhe a tela nem o celular de ninguém. Fale o que você acha que é.
            </p>
          </div>
        ) : isMime ? (
          m.phase === 'PLAYING' ? (
            <div className="border-2 border-cyan-400/60 bg-black p-4 text-center space-y-2">
              <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Sua palavra (só mímica!)</div>
              <div data-testid="controller-mimica-word" className="font-anton text-4xl uppercase leading-tight break-words">
                {m.wordsHidden ? '🙈' : m.words[m.currentIndex]}
              </div>
              <p className="font-mono-code text-[10px] text-slate-300">
                Acertos: {m.outcomes.filter((o) => o === 'correct').length} de {m.words.length}. Quem confirma é o diretor na TV.
              </p>
            </div>
          ) : (
            <div className="border border-cyan-400/60 bg-cyan-950/30 p-4 text-center">
              <div className="font-anton text-xl uppercase">
                {m.phase === 'READY' ? 'Você faz a mímica! Aguarde o início.' : 'Rodada encerrada'}
              </div>
            </div>
          )
        ) : (
          <div className="border border-white/15 bg-black/50 p-4 text-center space-y-1">
            <div className="font-anton text-xl uppercase">Acompanhe na TV</div>
            <p className="font-mono-code text-xs text-slate-300">
              {room.players.find((p) => p.id === m.mimePlayerId)?.name || 'Alguém'} faz a mímica. Você pode olhar, mas não pode dar dicas.
            </p>
          </div>
        )}
        <div className="font-mono-code text-[11px] text-slate-300 text-center">
          +{m.roundScore} pts nesta rodada · cada palavra vale {m.roundValue}
        </div>
      </div>
    );
  };
