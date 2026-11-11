import React from 'react';
import { GameRoom, Player } from '../../../types/game';
import { estadiosCluesShown, estadiosValue } from '../../../utils/estadiosEngine';

interface EstadiosControllerProps {
  room: GameRoom;
  player: Player;
  wrapIfMultiMode: (...args: any[]) => any;
}

export const EstadiosController: React.FC<EstadiosControllerProps> = ({
  room,
  player,
  wrapIfMultiMode
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'estadios' && room.estadios)) return null;

    const e = room.estadios;
    const shown = estadiosCluesShown(e);
    const isMyTurn = e.phase === 'PLAYING' && e.turnPlayerId === player.id;
    const turnName = room.players.find((p) => p.id === e.turnPlayerId)?.name || '—';
    const done = e.phase === 'SUMMARY';
    return wrapIfMultiMode(
      <div
        data-testid="controller-est-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="flex items-center justify-between">
          <span className="font-anton text-lg uppercase">🏟️ Estádios</span>
          <span className="font-anton text-base text-amber-200">Vale {estadiosValue(e)} pts</span>
        </div>
        <div className="border border-white/15 bg-black/50 p-3 text-center">
          <div className="font-anton text-xl uppercase">
            {e.phase === 'READY'
              ? 'Aguarde o início'
              : done
              ? e.winnerPlayerId
                ? (room.players.find((p) => p.id === e.winnerPlayerId)?.name || '—') + ' acertou!'
                : 'Ninguém acertou'
              : isMyTurn
              ? 'Sua vez: diga o estádio em voz alta!'
              : 'Vez de ' + turnName}
          </div>
          {done && (
            <div className="font-mono-code text-xs text-amber-200 mt-1">
              {e.nome} · {e.cidade}, {e.pais}
            </div>
          )}
        </div>
        <ul className="space-y-1.5">
          {e.pistas.map((p, i) => (
            <li
              key={i}
              data-testid={'controller-est-clue-' + i}
              className={
                'border px-2 py-1.5 font-mono-code text-xs ' +
                (i < shown ? 'border-cyan-400/60 text-[#F5F2EB]' : 'border-white/10 text-slate-600')
              }
            >
              <span className="font-anton text-sm mr-1.5">{i + 1}</span>
              {i < shown ? p : '🔒 bloqueada'}
            </li>
          ))}
        </ul>
      </div>
    );
  };
