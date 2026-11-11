import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, Eye, EyeOff, HelpCircle, XCircle } from 'lucide-react';
import { GameRoom, QuemSouEuGameState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import {
  finishQuemSouEuRound,
  recordCorrectGuess,
  recordQuestion,
  recordWrongGuess
} from '../../utils/quemSouEuEngine';

interface ScreenQuemSouEuProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateQuemSouEuState: (updater: (prev: QuemSouEuGameState) => QuemSouEuGameState) => void;
  onNextRound: () => void;
}

export const ScreenQuemSouEu: React.FC<ScreenQuemSouEuProps> = ({ room, onUpdateQuemSouEuState, onNextRound }) => {
  const qse = room.quemSouEu;
  if (!qse) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada do Quem sou eu...</div>;
  }
  const isShow = isShowRuleset(room.customConfig);
  // NOV-06: o 'Onde estou' usa a mesma dinamica, com grandes momentos do esporte no lugar das identidades.
  const moment = room.activeGame === 'onde-estou';
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name || '—';
  const avatarOf = (id: string) => room.players.find((p) => p.id === id)?.avatar || '🙂';
  const turn = qse.entries.find((e) => e.playerId === qse.turnPlayerId);
  const left = qse.entries.filter((e) => e.status === 'searching').length;

  const start = () => {
    sounds.playPowerup();
    onUpdateQuemSouEuState((prev) => ({ ...prev, phase: 'PLAYING' }));
  };
  const toggle = () => {
    sounds.playFlip();
    onUpdateQuemSouEuState((prev) => ({ ...prev, identitiesVisible: !prev.identitiesVisible }));
  };
  const question = () => {
    sounds.playTick();
    onUpdateQuemSouEuState((prev) => recordQuestion(prev));
  };
  const wrong = () => {
    sounds.playBuzzer();
    onUpdateQuemSouEuState((prev) => recordWrongGuess(prev));
  };
  const right = () => {
    sounds.playSuccess();
    onUpdateQuemSouEuState((prev) => {
      const next = recordCorrectGuess(prev);
      if (next.phase === 'SUMMARY') confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const finish = () => {
    sounds.playFlip();
    onUpdateQuemSouEuState((prev) => finishQuemSouEuRound(prev));
  };

  return (
    <div data-testid="qse-screen" className="gap-2 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#07080d]/95 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-anton text-sm md:text-base text-white uppercase tracking-wider">{moment ? '📍 ONDE ESTOU' : '🪪 QUEM SOU EU'}</span>
          {isShow && (
            <span
              data-testid="qse-show-ruleset-chip"
              className="px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase"
            >
              📺 Programa · só sim ou não
            </span>
          )}
          <span className="font-mono-code text-[10px] text-slate-300 uppercase">
            {left} {left === 1 ? 'jogador ainda procura' : 'jogadores ainda procuram'}
          </span>
        </div>
        <button
          type="button"
          data-testid="qse-toggle-identities-btn"
          onClick={toggle}
          className="px-2 py-1 border border-amber-400/60 bg-amber-950/60 text-amber-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
        >
          {qse.identitiesVisible ? <EyeOff size={12} /> : <Eye size={12} />}
          {qse.identitiesVisible
            ? moment
              ? 'OCULTAR MOMENTOS'
              : 'OCULTAR IDENTIDADES'
            : moment
            ? 'MOSTRAR MOMENTOS (quem joga não olha!)'
            : 'MOSTRAR IDENTIDADES (quem joga não olha!)'}
        </button>
      </div>

      {/* "Na testa": todos os cartoes; a identidade so aparece quando o diretor libera */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2">
        {qse.entries.map((e) => {
          const isTurn = qse.phase === 'PLAYING' && e.playerId === qse.turnPlayerId;
          const showIdentity = qse.identitiesVisible || qse.phase === 'SUMMARY' || e.status === 'found';
          return (
            <div
              key={e.playerId}
              data-testid={`qse-card-${e.playerId}`}
              className={`border px-2 py-2 text-center ${
                isTurn
                  ? 'border-cyan-300 bg-cyan-950/40 shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                  : e.status === 'found'
                  ? 'border-emerald-400/70 bg-emerald-950/30'
                  : e.status === 'out'
                  ? 'border-white/10 bg-black/40 opacity-70'
                  : 'border-white/15 bg-[#07080d]'
              }`}
            >
              <div className="font-anton text-sm text-white uppercase truncate">
                {avatarOf(e.playerId)} {nameOf(e.playerId)}
              </div>
              <div
                data-testid={`qse-identity-${e.playerId}`}
                className={`font-anton leading-tight text-[#F5F2EB] uppercase flex items-center justify-center break-words ${
                  moment ? 'text-xs md:text-sm min-h-[4.2rem]' : 'text-lg md:text-xl min-h-[2.6rem]'
                }`}
              >
                {showIdentity ? e.identity : '❓'}
              </div>
              <div className="font-mono-code text-[10px] text-slate-400 uppercase">
                {showIdentity ? e.category + ' · ' : ''}
                {e.status === 'found'
                  ? `✅ ${e.foundOrder}º a acertar`
                  : e.status === 'out'
                  ? 'ficou de fora'
                  : `${e.questions}/${qse.maxQuestions} perguntas`}
              </div>
            </div>
          );
        })}
      </div>

      {qse.phase === 'READY' && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 p-4 text-center">
          <div className="font-anton text-2xl text-white uppercase">{moment ? 'Cada um tem um grande momento na testa' : 'Cada um tem uma identidade na testa'}</div>
          <p className="font-mono-code text-xs text-slate-300 max-w-xl">
            {moment
              ? 'Todos veem, menos o dono. Na sua vez, o jogador faz uma pergunta de sim ou não para descobrir qual é o momento (ou chuta). Os outros só respondem sim ou não. Quem descobre primeiro ganha mais pontos.'
              : 'Todos veem, menos o dono. Na sua vez, o jogador faz uma pergunta de sim ou não ou chuta quem é. Os outros só respondem sim ou não. Quem descobre primeiro ganha mais pontos.'}
          </p>
          <button
            type="button"
            data-testid="qse-start-btn"
            onClick={start}
            className="px-6 py-2.5 border-2 border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer"
          >
            ▶ COMEÇAR
          </button>
        </div>
      )}

      {qse.phase === 'PLAYING' && turn && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 border border-cyan-400/40 bg-[#07080d] p-3">
          <div className="text-center">
            <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Vez de</div>
            <div data-testid="qse-turn-name" className="font-anton text-3xl text-white uppercase">
              {avatarOf(turn.playerId)} {nameOf(turn.playerId)}
            </div>
            {qse.lastEvent && (
              <div data-testid="qse-last-event" className="font-mono-code text-[11px] text-amber-200 mt-1">
                {qse.lastEvent}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-auto">
            <button
              type="button"
              data-testid="qse-question-btn"
              onClick={question}
              className="px-4 py-2 border-2 border-cyan-400 bg-cyan-950/60 hover:bg-cyan-400 hover:text-black text-cyan-100 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle size={15} /> PERGUNTA FEITA (SIM/NÃO)
            </button>
            <button
              type="button"
              data-testid="qse-right-btn"
              onClick={right}
              className="px-4 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} /> CHUTOU E ACERTOU
            </button>
            <button
              type="button"
              data-testid="qse-wrong-btn"
              onClick={wrong}
              className="px-4 py-2 border-2 border-[#E6194B] bg-[#E6194B]/20 hover:bg-[#E6194B] text-rose-200 hover:text-white font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle size={15} /> CHUTOU E ERROU
            </button>
            <button
              type="button"
              data-testid="qse-finish-btn"
              onClick={finish}
              className="px-3 py-2 border border-white/20 text-slate-300 hover:bg-white/10 font-anton text-xs uppercase tracking-wider cursor-pointer"
            >
              ENCERRAR RODADA
            </button>
          </div>
        </div>
      )}

      {qse.phase === 'SUMMARY' && (
        <div data-testid="qse-summary" className="flex-1 min-h-0 flex flex-col gap-2 border border-white/10 bg-black/40 p-3">
          <div className="font-anton text-2xl text-white uppercase text-center">{moment ? 'Momentos revelados' : 'Identidades reveladas'}</div>
          <ul className="space-y-1">
            {[...qse.entries]
              .sort((a, b) => (a.foundOrder ?? 99) - (b.foundOrder ?? 99))
              .map((e) => (
                <li
                  key={e.playerId}
                  className="flex items-center justify-between gap-2 border border-white/10 px-2 py-1 font-mono-code text-xs uppercase"
                >
                  <span className={e.status === 'found' ? 'text-emerald-300' : 'text-slate-400'}>
                    {e.status === 'found' ? `${e.foundOrder}º ✅` : '✖'} {nameOf(e.playerId)} era {e.identity}
                  </span>
                  <span className="text-amber-200">+{qse.pointsAwarded[e.playerId] || 0} pts</span>
                </li>
              ))}
          </ul>
          <div className="mt-auto flex justify-center">
            <button
              type="button"
              data-testid="qse-next-round-btn"
              onClick={onNextRound}
              className="px-6 py-2.5 border-2 border-cyan-400 bg-cyan-400 hover:bg-cyan-300 text-black font-anton text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              CONFIRMAR PONTOS E AVANÇAR <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
