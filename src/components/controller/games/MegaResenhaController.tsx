import React from 'react';
import { GameRoom, Player } from '../../../types/game';

interface MegaResenhaControllerProps {
  room: GameRoom;
  player: Player;
  wrapIfMultiMode: (...args: any[]) => any;
}

export const MegaResenhaController: React.FC<MegaResenhaControllerProps> = ({
  room,
  player,
  wrapIfMultiMode
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'mega-resenha' && room.megaResenha)) return null;

    const g = room.megaResenha;
    const isGiver = player.id === g.giverPlayerId;
    const isGuesser = player.id === g.guesserPlayerId;
    const mm = Math.floor(g.timerSeconds / 60);
    const ss = String(g.timerSeconds % 60).padStart(2, '0');
    return wrapIfMultiMode(
      <div
        data-testid="controller-mega-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-4 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🗣️ Mega Resenha</span>
          <span className="font-anton text-lg">{room.timerConfig === 0 ? 'LIVRE' : mm + ':' + ss}</span>
        </div>
        {isGuesser ? (
          <div className="border border-amber-400/60 bg-amber-950/30 p-4 text-center space-y-2">
            <div className="text-4xl">🙈</div>
            <div className="font-anton text-xl uppercase">Você chuta!</div>
            <p className="font-mono-code text-xs text-slate-200">Não olhe a tela. Ouça as dicas (uma palavra cada) e arrisque.</p>
          </div>
        ) : isGiver ? (
          g.phase === 'PLAYING' ? (
            <div className="border-2 border-cyan-400/60 bg-black p-4 text-center space-y-2">
              <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Faça seu parceiro acertar (UMA palavra por dica)</div>
              <div data-testid="controller-mega-word" className="font-anton text-4xl uppercase leading-tight break-words">
                {g.wordsHidden ? '🙈' : g.words[g.currentIndex]}
              </div>
              <p className="font-mono-code text-[10px] text-slate-300">
                Acertos: {g.outcomes.filter((o) => o === 'correct').length} de {g.words.length}. Quem confirma é o diretor na TV.
              </p>
            </div>
          ) : (
            <div className="border border-cyan-400/60 bg-cyan-950/30 p-4 text-center">
              <div className="font-anton text-xl uppercase">{g.phase === 'READY' ? 'Você dá as dicas! Aguarde o início.' : 'Rodada encerrada'}</div>
            </div>
          )
        ) : (
          <div className="border border-white/15 bg-black/50 p-4 text-center space-y-1">
            <div className="font-anton text-xl uppercase">Acompanhe na TV</div>
            <p className="font-mono-code text-xs text-slate-300">
              {room.players.find((p) => p.id === g.giverPlayerId)?.name || 'Alguém'} dá as dicas. Você pode olhar, mas não pode ajudar.
            </p>
          </div>
        )}
        <div className="font-mono-code text-[11px] text-slate-300 text-center">+{g.roundScore} pts nesta rodada</div>
      </div>
    );
  };
