import React from 'react';
import { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { repetenteWriters, submitRepetenteAnswer } from '../../../utils/repetenteEngine';

interface RepetenteControllerProps {
  room: GameRoom;
  player: Player;
  repetenteDraft: string;
  setRepetenteDraft: React.Dispatch<React.SetStateAction<string>>;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (...args: any[]) => any;
}

export const RepetenteController: React.FC<RepetenteControllerProps> = ({
  room,
  player,
  repetenteDraft,
  setRepetenteDraft,
  onUpdateRoom,
  wrapIfMultiMode
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'repetente' && room.repetente)) return null;

    const r = room.repetente;
    const iWrite = repetenteWriters(r).includes(player.id);
    const mine = (r.answers[player.id] ?? '').trim();
    const myGroup = r.groups.find((g) => g.playerIds.includes(player.id));
    const myResult = r.result?.groups.find((g) => g.groupId === myGroup?.id);
    const sendWord = () => {
      const text = repetenteDraft.trim();
      if (!text) return;
      sounds.playTick();
      setRepetenteDraft('');
      onUpdateRoom((prev) => ({
        ...prev,
        repetente: prev.repetente ? submitRepetenteAnswer(prev.repetente, player.id, text) : undefined
      }));
    };
    return wrapIfMultiMode(
      <div
        data-testid="controller-rep-view"
        className="min-h-screen bg-[#07080d] p-4 flex flex-col gap-3 max-w-md mx-auto text-white"
      >
        <div className="font-anton text-lg uppercase">🖍️ Repetente</div>
        <div className="border-2 border-cyan-400/60 bg-black p-3 text-center">
          <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Tema</div>
          <div className="font-anton text-2xl uppercase leading-tight">{r.theme}</div>
        </div>
        {!iWrite ? (
          <div className="border border-white/15 bg-black/50 p-3 text-center font-mono-code text-xs text-slate-300">
            Você não está em nenhuma dupla nesta rodada. Acompanhe na TV.
          </div>
        ) : r.phase === 'READY' ? (
          <div className="border border-white/15 bg-black/50 p-3 text-center font-anton text-xl uppercase">
            Aguarde o início
          </div>
        ) : r.phase === 'WRITING' ? (
          <div className="space-y-2">
            <div className="font-mono-code text-[11px] text-amber-200">
              Escreva UMA palavra e tente bater com a do seu parceiro. Sem combinar!
            </div>
            <input
              data-testid="controller-rep-input"
              value={repetenteDraft}
              onChange={(e) => setRepetenteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendWord();
              }}
              placeholder="Sua palavra"
              className="w-full bg-black border border-cyan-400/60 px-3 py-2 text-base font-mono-code text-white"
            />
            <button
              type="button"
              data-testid="controller-rep-send"
              onClick={sendWord}
              className="w-full py-2.5 border border-cyan-300 bg-cyan-400 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
            >
              {mine ? 'ENVIAR OUTRA PALAVRA' : 'ENVIAR'}
            </button>
            {mine && (
              <div data-testid="controller-rep-sent" className="font-mono-code text-xs text-emerald-300 text-center">
                ✅ Enviado: <strong>{mine}</strong> (pode trocar até a revelação)
              </div>
            )}
          </div>
        ) : (
          <div
            data-testid="controller-rep-result"
            className={`border p-3 text-center ${myResult?.matched ? 'border-emerald-400 bg-emerald-950/40' : 'border-white/15 bg-black/50'}`}
          >
            <div className="font-anton text-xl uppercase">
              {myResult?.matched ? '✅ Vocês combinaram! +' + (myResult.points || 0) : '✖ Não combinou'}
            </div>
            <div className="font-mono-code text-[11px] text-slate-300 mt-1">
              {myGroup?.playerIds
                .map((id) => (room.players.find((p) => p.id === id)?.name || '—') + ': ' + (r.answers[id] || '—'))
                .join(' · ')}
            </div>
          </div>
        )}
      </div>
    );
  };
