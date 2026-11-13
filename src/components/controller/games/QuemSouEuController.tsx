import React from 'react';
import { GameRoom, Player } from '../../../types/game';

interface QuemSouEuControllerProps {
  room: GameRoom;
  player: Player;
  wrapIfMultiMode: (...args: any[]) => any;
}

export const QuemSouEuController: React.FC<QuemSouEuControllerProps> = ({
  room,
  player,
  wrapIfMultiMode
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!((room.activeGame === 'quem-sou-eu' || room.activeGame === 'onde-estou') && room.quemSouEu)) return null;

    const q = room.quemSouEu;
    const isMomentGame = room.activeGame === 'onde-estou';
    const mine = q.entries.find((e) => e.playerId === player.id);
    const turnName = room.players.find((p) => p.id === q.turnPlayerId)?.name || '—';
    const isMyTurn = q.phase === 'PLAYING' && q.turnPlayerId === player.id;
    return wrapIfMultiMode(
      <div
        data-testid="controller-qse-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="font-anton text-lg uppercase">{isMomentGame ? '📍 Onde estou' : '🪪 Quem sou eu'}</div>
        <div
          className={'border p-3 text-center ' + (isMyTurn ? 'border-cyan-300 bg-cyan-950/40' : 'border-white/15 bg-black/50')}
        >
          <div className="font-anton text-xl uppercase">
            {q.phase === 'READY'
              ? 'Aguarde o início'
              : q.phase === 'SUMMARY'
              ? 'Rodada encerrada'
              : isMyTurn
              ? 'É a sua vez! Pergunte ou chute'
              : 'Vez de ' + turnName}
          </div>
          {mine && (
            <div className="font-mono-code text-[11px] text-slate-300 mt-1">
              {mine.status === 'found'
                ? 'Você descobriu! Era ' + mine.identity
                : mine.status === 'out'
                ? 'Você ficou de fora'
                : 'Você: ' + mine.questions + '/' + q.maxQuestions + ' perguntas'}
            </div>
          )}
        </div>
        <div className="font-mono-code text-[10px] text-amber-200 uppercase font-bold">
          {isMomentGame ? 'Quem tem qual momento (o seu fica escondido)' : 'Quem é quem (a sua fica escondida)'}
        </div>
        <ul className="space-y-1">
          {q.entries.map((e) => {
            const self = e.playerId === player.id;
            const name = room.players.find((p) => p.id === e.playerId)?.name || '—';
            return (
              <li
                key={e.playerId}
                className="flex items-center justify-between gap-2 border border-white/10 px-2 py-1.5 font-mono-code text-xs"
              >
                <span className="uppercase text-slate-300">{self ? 'Você' : name}</span>
                <span
                  data-testid={'controller-qse-identity-' + e.playerId}
                  className="font-anton text-base uppercase text-[#F5F2EB]"
                >
                  {self && e.status !== 'found' && q.phase !== 'SUMMARY' ? (
                    '❓'
                  ) : (
                    <span className="flex items-center gap-2">
                      {e.image && (
                        <img
                          src={e.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-10 w-14 shrink-0 object-cover"
                          onError={(ev) => {
                            ev.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span>{e.identity}</span>
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };
