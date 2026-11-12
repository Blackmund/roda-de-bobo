import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, XCircle } from 'lucide-react';
import { EstadiosGameState, GameRoom } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { estadiosCluesShown, estadiosValue, giveUpEstadio, judgeEstadio } from '../../utils/estadiosEngine';
import { PlayerMark } from '../rdb/PlayerMark';

interface ScreenEstadiosProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateEstadiosState: (updater: (prev: EstadiosGameState) => EstadiosGameState) => void;
  onNextRound: () => void;
}

export const ScreenEstadios: React.FC<ScreenEstadiosProps> = ({ room, onUpdateEstadiosState, onNextRound }) => {
  const est = room.estadios;
  if (!est) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando estádio...</div>;
  }
  const isShow = isShowRuleset(room.customConfig);
  const playerIds = room.players.map((p) => p.id);
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name || '—';
  const avatarOf = (id: string) => <PlayerMark p={room.players.find((p) => p.id === id)} />;
  const shown = estadiosCluesShown(est);
  const value = estadiosValue(est);
  const done = est.phase === 'SUMMARY';

  const start = () => {
    sounds.playPowerup();
    onUpdateEstadiosState((prev) => ({ ...prev, phase: 'PLAYING' }));
  };
  const judge = (correct: boolean) => {
    if (correct) sounds.playSuccess();
    else sounds.playBuzzer();
    onUpdateEstadiosState((prev) => {
      const next = judgeEstadio(prev, correct, playerIds);
      if (next.winnerPlayerId) confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const toggleAnswer = () => {
    sounds.playTick();
    onUpdateEstadiosState((prev) => ({ ...prev, answerVisible: !prev.answerVisible }));
  };
  const giveUp = () => {
    sounds.playFlip();
    onUpdateEstadiosState((prev) => giveUpEstadio(prev));
  };

  return (
    <div data-testid="est-screen" className="gap-2 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#07080d]/95 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-anton text-sm md:text-base text-white uppercase tracking-wider">🏟️ ESTÁDIOS</span>
          <span className="font-mono-code text-[10px] text-slate-300 uppercase">
            Estádio {Math.min(room.roundNumber, room.maxRounds)} de {room.maxRounds}
          </span>
          {isShow && (
            <span
              data-testid="est-show-ruleset-chip"
              className="px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase"
            >
              📺 Programa · 5, 4, 3, 2, 1
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="est-value"
            className="px-3 py-1 border-2 border-amber-400 bg-amber-950/50 text-amber-200 font-anton text-base uppercase"
          >
            Vale {done && !est.winnerPlayerId ? 0 : value} pts
          </span>
          <button
            type="button"
            data-testid="est-toggle-answer-btn"
            onClick={toggleAnswer}
            className="px-2 py-1 border border-amber-400/60 bg-amber-950/60 text-amber-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
          >
            {est.answerVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            {est.answerVisible ? 'OCULTAR RESPOSTA' : 'RESPOSTA (só o diretor)'}
          </button>
        </div>
      </div>

      {est.answerVisible && (
        <div data-testid="est-answer" className="shrink-0 border border-amber-400/60 bg-amber-950/30 px-3 py-1.5 text-center">
          <span className="font-mono-code text-[10px] text-amber-300 uppercase font-bold">Estádio: </span>
          <span className="font-anton text-xl text-white uppercase">{est.nome}</span>
          <span className="font-mono-code text-[11px] text-slate-300"> · {est.cidade}, {est.pais}</span>
        </div>
      )}

      {est.foto && (
        <div className="shrink-0 flex justify-center">
          <img
            src={est.foto}
            alt={done ? est.nome : 'Foto do estádio misterioso'}
            className="max-h-48 object-cover border border-white/15"
          />
        </div>
      )}

      {/* Pistas: so aparecem as liberadas pelos erros */}
      <div className="shrink-0 space-y-1.5" data-testid="est-clues">
        {est.pistas.map((p, i) => {
          const visible = i < shown;
          return (
            <div
              key={i}
              data-testid={`est-clue-${i}`}
              className={`flex items-center gap-2 border px-3 py-2 ${
                visible ? 'border-cyan-400/60 bg-[#07101c]' : 'border-white/10 bg-black/40'
              }`}
            >
              <span
                className={`font-anton text-lg w-7 shrink-0 text-center ${visible ? 'text-cyan-300' : 'text-slate-600'}`}
              >
                {i + 1}
              </span>
              {visible ? (
                <span className="font-mono-code text-sm md:text-base text-[#F5F2EB]">{p}</span>
              ) : (
                <span className="font-mono-code text-xs text-slate-600 flex items-center gap-1.5">
                  <Lock size={12} /> pista bloqueada (libera a cada erro)
                </span>
              )}
            </div>
          );
        })}
      </div>

      {est.phase === 'READY' && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 p-4 text-center">
          <p className="font-mono-code text-xs text-slate-300 max-w-xl">
            Descubra o estádio! Começa só com a pista 1. Quem acerta de primeira leva 5 pontos; cada erro libera mais uma
            pista, passa a vez e tira 1 ponto.
          </p>
          <button
            type="button"
            data-testid="est-start-btn"
            onClick={start}
            className="px-6 py-2.5 border-2 border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer"
          >
            ▶ COMEÇAR
          </button>
        </div>
      )}

      {est.phase === 'PLAYING' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 border border-cyan-400/40 bg-[#07080d] p-3">
          <div className="text-center">
            <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">Chute o estádio, na sua vez</div>
            <div data-testid="est-turn-name" className="font-anton text-3xl text-white uppercase">
              {avatarOf(est.turnPlayerId)} {nameOf(est.turnPlayerId)}
            </div>
            <div className="font-mono-code text-[11px] text-slate-400">
              {est.attempts.length > 0 ? `${est.attempts.length} tentativa(s) errada(s)` : 'Primeira tentativa'}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-auto">
            <button
              type="button"
              data-testid="est-right-btn"
              onClick={() => judge(true)}
              className="px-5 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} /> ACERTOU (+{value})
            </button>
            <button
              type="button"
              data-testid="est-wrong-btn"
              onClick={() => judge(false)}
              className="px-5 py-2 border-2 border-[#E6194B] bg-[#E6194B]/20 hover:bg-[#E6194B] text-rose-200 hover:text-white font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle size={16} /> ERROU
            </button>
            <button
              type="button"
              data-testid="est-giveup-btn"
              onClick={giveUp}
              className="px-3 py-2 border border-white/20 text-slate-300 hover:bg-white/10 font-anton text-xs uppercase tracking-wider cursor-pointer"
            >
              PULAR ESTÁDIO
            </button>
          </div>
        </div>
      )}

      {done && (
        <div data-testid="est-summary" className="flex-1 min-h-0 flex flex-col gap-2 border border-white/10 bg-black/40 p-3">
          <div className="font-anton text-2xl text-white uppercase text-center">
            {est.winnerPlayerId
              ? `${avatarOf(est.winnerPlayerId)} ${nameOf(est.winnerPlayerId)} ACERTOU! +${est.pointsAwarded[est.winnerPlayerId]} PONTOS`
              : 'NINGUÉM ACERTOU'}
          </div>
          <div className="text-center font-anton text-xl text-amber-200 uppercase">
            {est.nome} <span className="font-mono-code text-xs text-slate-300 normal-case">· {est.cidade}, {est.pais}</span>
          </div>
          <div className="mt-auto flex justify-center">
            <button
              type="button"
              data-testid="est-next-round-btn"
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
