import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Clock, Eye, EyeOff, Infinity as InfinityIcon, RotateCcw, ArrowRight, Undo2 } from 'lucide-react';
import { GameRoom, MimicaGameState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { TEAM_META } from '../../utils/teamUtils';
import {
  applyMimicaOutcome,
  finishMimicaRound,
  tickMimicaTimer,
  undoMimicaCorrect
} from '../../utils/mimicaEngine';

interface ScreenMimicaProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateMimicaState: (updater: (prev: MimicaGameState) => MimicaGameState) => void;
  onNextRound: () => void;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const ScreenMimica: React.FC<ScreenMimicaProps> = ({ room, onUpdateMimicaState, onNextRound }) => {
  const mimica = room.mimica;
  const updateRef = useRef(onUpdateMimicaState);
  updateRef.current = onUpdateMimicaState;

  // Cronometro: desligado no modo livre (timerConfig === 0).
  useEffect(() => {
    if (!mimica || room.timerConfig === 0 || mimica.phase !== 'PLAYING' || !mimica.timerActive) return;
    const interval = setInterval(() => {
      updateRef.current((prev) => {
        const next = tickMimicaTimer(prev);
        if (next.phase === 'SUMMARY' && prev.phase === 'PLAYING') sounds.playBuzzer();
        else if (next.timerSeconds <= 10 && next.timerSeconds > 0) sounds.playTick(next.timerSeconds);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room.timerConfig, mimica?.phase, mimica?.timerActive]);

  if (!mimica) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada da Mímica...</div>;
  }

  const mime = room.players.find((p) => p.id === mimica.mimePlayerId);
  const guesser = room.players.find((p) => p.id === mimica.guesserPlayerId);
  const teamMeta = TEAM_META[mimica.mimeTeam];
  const teamName = room.teams[mimica.mimeTeam]?.name || teamMeta.defaultName;
  const isShow = isShowRuleset(room.customConfig);
  const free = room.timerConfig === 0;
  const current = mimica.words[mimica.currentIndex];
  const hits = mimica.outcomes.filter((o) => o === 'correct').length;
  const openCount = mimica.outcomes.length - hits;

  const start = () => {
    sounds.playPowerup();
    onUpdateMimicaState((prev) => ({ ...prev, phase: 'PLAYING', timerActive: room.timerConfig > 0 }));
  };
  const hit = () => {
    sounds.playSuccess();
    onUpdateMimicaState((prev) => {
      const next = applyMimicaOutcome(prev, 'correct');
      if (next.phase === 'SUMMARY') confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const skip = () => {
    sounds.playFlip();
    onUpdateMimicaState((prev) => applyMimicaOutcome(prev, 'skipped'));
  };
  const finish = () => {
    sounds.playFlip();
    onUpdateMimicaState((prev) => finishMimicaRound(prev));
  };
  const undo = (index: number) => {
    sounds.playTick();
    onUpdateMimicaState((prev) => undoMimicaCorrect(prev, index));
  };
  const toggleHidden = () => {
    sounds.playFlip();
    onUpdateMimicaState((prev) => ({ ...prev, wordsHidden: !prev.wordsHidden }));
  };

  return (
    <div data-testid="mimica-screen" className="gap-2 h-full flex flex-col min-h-0 overflow-y-auto">
      {/* Cabecalho: equipe, papeis e cronometro */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#07080d]/95 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-anton text-sm md:text-base text-white uppercase tracking-wider">🎭 JOGO DA MÍMICA</span>
          <span
            className={`px-2 py-0.5 border font-mono-code text-[10px] font-bold uppercase ${teamMeta.borderClass}`}
          >
            {teamMeta.equipeLabel} · {teamName}
          </span>
          {isShow && (
            <span
              data-testid="mimica-show-ruleset-chip"
              className="px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase"
            >
              📺 Programa · rodada {room.roundNumber} vale {mimica.roundValue} por palavra
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="mimica-toggle-words-btn"
            onClick={toggleHidden}
            className="px-2 py-1 border border-amber-400/60 bg-amber-950/60 text-amber-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
          >
            {mimica.wordsHidden ? <Eye size={12} /> : <EyeOff size={12} />}
            {mimica.wordsHidden ? 'MOSTRAR PALAVRAS' : 'OCULTAR PALAVRAS'}
          </button>
          <div className="border border-[#E6194B]/70 bg-[#07080d] px-2.5 py-0.5 flex items-center gap-1.5">
            <Clock size={13} className="text-rose-400" />
            <div
              data-testid="mimica-timer-display"
              className={`font-anton text-base md:text-lg leading-none ${
                free ? 'text-[#17B8B8]' : mimica.timerSeconds <= 10 ? 'text-[#E6194B]' : 'text-[#F5F2EB]'
              }`}
            >
              {free ? (
                <span className="flex items-center gap-1 text-xs">
                  <InfinityIcon className="w-3.5 h-3.5" />
                  LIVRE
                </span>
              ) : (
                fmt(mimica.timerSeconds)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Papeis */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="border border-cyan-400/60 bg-cyan-950/30 px-3 py-1.5">
          <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">🎭 Faz a mímica</div>
          <div data-testid="mimica-mime-name" className="font-anton text-lg text-white uppercase leading-tight">
            {mime?.name || '—'}
          </div>
          <div className="font-mono-code text-[10px] text-slate-300">Vê as palavras e não pode falar</div>
        </div>
        <div className="border border-amber-400/60 bg-amber-950/30 px-3 py-1.5">
          <div className="font-mono-code text-[10px] text-amber-300 uppercase font-bold">🙈 Adivinha (olhos vendados)</div>
          <div data-testid="mimica-guesser-name" className="font-anton text-lg text-white uppercase leading-tight">
            {guesser?.name || '—'}
          </div>
          <div className="font-mono-code text-[10px] text-slate-300">Não olha a tela; o adversário vê, mas não ajuda</div>
        </div>
      </div>

      {mimica.phase === 'READY' && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 p-4 text-center">
          <div className="font-anton text-2xl text-white uppercase">Rodada pronta · {mimica.words.length} palavras</div>
          <p className="font-mono-code text-xs text-slate-300 max-w-xl">
            {mime?.name} faz a mímica; {guesser?.name} adivinha de olhos vendados. Vale gesto e expressão, sem falar nem apontar.
          </p>
          <button
            type="button"
            data-testid="mimica-start-btn"
            onClick={start}
            className="px-6 py-2.5 border-2 border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer"
          >
            {free ? '▶ COMEÇAR' : `▶ INICIAR CRONÔMETRO (${room.timerConfig}S)`}
          </button>
        </div>
      )}

      {mimica.phase === 'PLAYING' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono-code text-[11px] text-slate-300 uppercase">
            <span>
              Palavra {hits + 1 > mimica.words.length ? mimica.words.length : hits + 1} de {mimica.words.length}
            </span>
            <span data-testid="mimica-score">
              ✅ {hits} acertos · +{mimica.roundScore} pts nesta rodada
            </span>
          </div>
          <div className="flex-1 min-h-[140px] border-2 border-cyan-400/50 bg-[#07080d] flex items-center justify-center p-4">
            {mimica.wordsHidden ? (
              <div className="font-anton text-3xl text-slate-500 uppercase">🙈 PALAVRA OCULTA</div>
            ) : (
              <div
                data-testid="mimica-current-word"
                className="font-anton text-4xl md:text-6xl text-[#F5F2EB] uppercase text-center leading-tight break-words"
              >
                {current}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mimica.words.map((w, i) => (
              <span
                key={i}
                data-testid={`mimica-word-chip-${i}`}
                className={`px-2 py-0.5 border font-mono-code text-[10px] uppercase ${
                  mimica.outcomes[i] === 'correct'
                    ? 'border-emerald-400 bg-emerald-950/50 text-emerald-200 line-through'
                    : i === mimica.currentIndex
                    ? 'border-cyan-300 text-cyan-100'
                    : mimica.outcomes[i] === 'skipped'
                    ? 'border-amber-400/60 text-amber-200'
                    : 'border-white/15 text-slate-400'
                }`}
              >
                {mimica.wordsHidden && mimica.outcomes[i] !== 'correct' ? `Palavra ${i + 1}` : w}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
            <button
              type="button"
              data-testid="mimica-hit-btn"
              onClick={hit}
              className="px-5 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} /> ACERTOU (+{mimica.roundValue})
            </button>
            <button
              type="button"
              data-testid="mimica-skip-btn"
              onClick={skip}
              disabled={openCount <= 1}
              className="px-3.5 py-2 border border-white/20 bg-white/[0.04] hover:bg-white/10 disabled:opacity-40 text-slate-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} /> PULAR
            </button>
            <button
              type="button"
              data-testid="mimica-finish-btn"
              onClick={finish}
              className="ml-auto px-3.5 py-2 border border-rose-400/60 bg-rose-950/60 hover:bg-rose-500 text-rose-200 hover:text-white font-anton text-xs md:text-sm uppercase tracking-wider cursor-pointer"
            >
              ENCERRAR RODADA
            </button>
          </div>
        </div>
      )}

      {mimica.phase === 'SUMMARY' && (
        <div data-testid="mimica-summary" className="flex-1 min-h-0 flex flex-col gap-2 border border-white/10 bg-black/40 p-3">
          <div className="font-anton text-2xl text-white uppercase text-center">
            {mimica.roundScore > 0 ? `+${mimica.roundScore} PONTOS PARA ${teamName.toUpperCase()}` : 'NENHUM PONTO NESTA RODADA'}
          </div>
          <p className="text-center font-mono-code text-xs text-slate-300">
            {hits} de {mimica.words.length} palavras acertadas · cada uma valeu {mimica.roundValue}
          </p>
          <ul className="space-y-1">
            {mimica.words.map((w, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 border border-white/10 px-2 py-1 font-mono-code text-xs uppercase"
              >
                <span className={mimica.outcomes[i] === 'correct' ? 'text-emerald-300' : 'text-slate-400'}>
                  {mimica.outcomes[i] === 'correct' ? '✅' : '✖'} {w}
                </span>
                {mimica.outcomes[i] === 'correct' && (
                  <button
                    type="button"
                    data-testid={`mimica-undo-${i}`}
                    onClick={() => undo(i)}
                    className="px-2 py-0.5 border border-sky-400/60 text-sky-200 hover:bg-sky-400 hover:text-black text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Undo2 size={11} /> CONTESTAR
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex justify-center">
            <button
              type="button"
              data-testid="mimica-next-round-btn"
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
