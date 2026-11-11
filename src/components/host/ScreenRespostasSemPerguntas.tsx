import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, Eye, EyeOff, XCircle } from 'lucide-react';
import { GameRoom, RespostasSemPerguntasState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { currentValue, giveUpRound, judgeGuess, pickPosition } from '../../utils/respostasEngine';

interface ScreenRespostasProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateRespostasState: (updater: (prev: RespostasSemPerguntasState) => RespostasSemPerguntasState) => void;
  onNextRound: () => void;
}

export const ScreenRespostasSemPerguntas: React.FC<ScreenRespostasProps> = ({
  room,
  onUpdateRespostasState,
  onNextRound
}) => {
  const rsp = room.respostasSemPerguntas;
  if (!rsp) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada...</div>;
  }
  const isShow = isShowRuleset(room.customConfig);
  const playerIds = room.players.map((p) => p.id);
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name || '—';
  const avatarOf = (id: string) => room.players.find((p) => p.id === id)?.avatar || '🙂';
  const value = currentValue(rsp);
  const done = rsp.phase === 'SUMMARY';

  const start = () => {
    sounds.playPowerup();
    onUpdateRespostasState((prev) => ({ ...prev, phase: 'PLAYING' }));
  };
  const pick = (i: number) => {
    sounds.playFlip();
    onUpdateRespostasState((prev) => pickPosition(prev, i));
  };
  const judge = (correct: boolean) => {
    if (correct) sounds.playSuccess();
    else sounds.playBuzzer();
    onUpdateRespostasState((prev) => {
      const next = judgeGuess(prev, correct, playerIds);
      if (next.winnerPlayerId) confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const toggleAnswer = () => {
    sounds.playTick();
    onUpdateRespostasState((prev) => ({ ...prev, answerVisible: !prev.answerVisible }));
  };
  const giveUp = () => {
    sounds.playFlip();
    onUpdateRespostasState((prev) => giveUpRound(prev));
  };

  return (
    <div data-testid="rsp-screen" className="gap-2 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#07080d]/95 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-anton text-sm md:text-base text-white uppercase tracking-wider">❓ RESPOSTAS SEM PERGUNTAS</span>
          {isShow && (
            <span
              data-testid="rsp-show-ruleset-chip"
              className="px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase"
            >
              📺 Programa · cada erro tira 1 ponto
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="rsp-value"
            className="px-3 py-1 border-2 border-amber-400 bg-amber-950/50 text-amber-200 font-anton text-base uppercase"
          >
            Vale {done && !rsp.winnerPlayerId ? 0 : value} pts
          </span>
          <button
            type="button"
            data-testid="rsp-toggle-answer-btn"
            onClick={toggleAnswer}
            className="px-2 py-1 border border-amber-400/60 bg-amber-950/60 text-amber-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
          >
            {rsp.answerVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            {rsp.answerVisible ? 'OCULTAR RESPOSTA' : 'RESPOSTA (só o diretor)'}
          </button>
        </div>
      </div>

      {rsp.answerVisible && (
        <div data-testid="rsp-answer" className="shrink-0 border border-amber-400/60 bg-amber-950/30 px-3 py-1.5 text-center">
          <span className="font-mono-code text-[10px] text-amber-300 uppercase font-bold">Resposta: </span>
          <span className="font-anton text-xl text-white uppercase">{rsp.answer}</span>
        </div>
      )}

      {/* A pergunta, palavra por palavra: so aparecem as reveladas */}
      <div className="shrink-0 border-2 border-cyan-400/50 bg-[#07080d] p-3">
        <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold text-center mb-2">
          A pergunta tem {rsp.words.length} palavras{done ? ` · tema: ${rsp.category}` : ''}
        </div>
        <div className="flex flex-wrap justify-center gap-1.5" data-testid="rsp-words">
          {rsp.words.map((w, i) => {
            const shown = rsp.revealed[i] || done;
            const canPick = rsp.phase === 'PLAYING' && rsp.step === 'pick' && !rsp.revealed[i];
            return (
              <button
                key={i}
                type="button"
                data-testid={`rsp-word-${i}`}
                disabled={!canPick}
                onClick={() => pick(i)}
                className={`min-w-[3.2rem] px-2.5 py-1.5 border font-anton text-lg md:text-2xl uppercase ${
                  rsp.revealed[i]
                    ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200'
                    : done
                    ? 'border-white/20 text-slate-400'
                    : canPick
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-400 hover:text-black cursor-pointer'
                    : 'border-white/15 bg-black/50 text-slate-600'
                }`}
              >
                {shown ? w : i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {rsp.phase === 'READY' && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 p-4 text-center">
          <p className="font-mono-code text-xs text-slate-300 max-w-xl">
            A pergunta existe, mas ninguém sabe qual é: só a quantidade de palavras. Na sua vez, escolha UMA palavra para
            revelar e depois chute a resposta. Acertar vale tantos pontos quanto palavras; cada erro tira 1.
          </p>
          <button
            type="button"
            data-testid="rsp-start-btn"
            onClick={start}
            className="px-6 py-2.5 border-2 border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer"
          >
            ▶ COMEÇAR
          </button>
        </div>
      )}

      {rsp.phase === 'PLAYING' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 border border-cyan-400/40 bg-[#07080d] p-3">
          <div className="text-center">
            <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">
              {rsp.step === 'pick' ? 'Escolha uma palavra para revelar' : 'Agora chute a resposta!'}
            </div>
            <div data-testid="rsp-turn-name" className="font-anton text-3xl text-white uppercase">
              {avatarOf(rsp.turnPlayerId)} {nameOf(rsp.turnPlayerId)}
            </div>
            <div className="font-mono-code text-[11px] text-slate-400">
              {rsp.attempts.length > 0
                ? `${rsp.attempts.length} tentativa(s) · ${rsp.attempts.filter((a) => !a.correct).length} erro(s)`
                : 'Primeira tentativa'}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-auto">
            <button
              type="button"
              data-testid="rsp-right-btn"
              disabled={rsp.step !== 'guess'}
              onClick={() => judge(true)}
              className="px-5 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-35 text-slate-950 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} /> ACERTOU (+{value})
            </button>
            <button
              type="button"
              data-testid="rsp-wrong-btn"
              disabled={rsp.step !== 'guess'}
              onClick={() => judge(false)}
              className="px-5 py-2 border-2 border-[#E6194B] bg-[#E6194B]/20 hover:bg-[#E6194B] disabled:opacity-35 text-rose-200 hover:text-white font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle size={16} /> ERROU
            </button>
            <button
              type="button"
              data-testid="rsp-giveup-btn"
              onClick={giveUp}
              className="px-3 py-2 border border-white/20 text-slate-300 hover:bg-white/10 font-anton text-xs uppercase tracking-wider cursor-pointer"
            >
              ENCERRAR RODADA
            </button>
          </div>
        </div>
      )}

      {done && (
        <div data-testid="rsp-summary" className="flex-1 min-h-0 flex flex-col gap-2 border border-white/10 bg-black/40 p-3">
          <div className="font-anton text-2xl text-white uppercase text-center">
            {rsp.winnerPlayerId
              ? `${avatarOf(rsp.winnerPlayerId)} ${nameOf(rsp.winnerPlayerId)} ACERTOU! +${rsp.pointsAwarded[rsp.winnerPlayerId]} PONTOS`
              : 'NINGUÉM ACERTOU'}
          </div>
          <div className="text-center font-mono-code text-sm text-slate-200">
            <span className="text-slate-400">Pergunta: </span>
            {rsp.words.join(' ')}?
          </div>
          <div className="text-center font-anton text-xl text-amber-200 uppercase">Resposta: {rsp.answer}</div>
          <div className="mt-auto flex justify-center">
            <button
              type="button"
              data-testid="rsp-next-round-btn"
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
