import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, Clock, Eye, EyeOff, Infinity as InfinityIcon, RotateCcw, Send } from 'lucide-react';
import { GameRoom, MegaResenhaGameState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { TEAM_META } from '../../utils/teamUtils';
import {
  addClue,
  applyMegaOutcome,
  finishMegaRound,
  overruleClue,
  tickMegaTimer
} from '../../utils/megaResenhaEngine';

interface ScreenMegaResenhaProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateMegaState: (updater: (prev: MegaResenhaGameState) => MegaResenhaGameState) => void;
  onNextRound: () => void;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const ScreenMegaResenha: React.FC<ScreenMegaResenhaProps> = ({ room, onUpdateMegaState, onNextRound }) => {
  const mega = room.megaResenha;
  const updateRef = useRef(onUpdateMegaState);
  updateRef.current = onUpdateMegaState;
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!mega || room.timerConfig === 0 || mega.phase !== 'PLAYING' || !mega.timerActive) return;
    const interval = setInterval(() => {
      updateRef.current((prev) => {
        const next = tickMegaTimer(prev);
        if (next.phase === 'SUMMARY' && prev.phase === 'PLAYING') sounds.playBuzzer();
        else if (next.timerSeconds <= 10 && next.timerSeconds > 0) sounds.playTick(next.timerSeconds);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room.timerConfig, mega?.phase, mega?.timerActive]);

  if (!mega) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada da Mega Resenha...</div>;
  }

  const giver = room.players.find((p) => p.id === mega.giverPlayerId);
  const guesser = room.players.find((p) => p.id === mega.guesserPlayerId);
  const teamMeta = TEAM_META[mega.team];
  const teamName = room.teams[mega.team]?.name || teamMeta.defaultName;
  const isShow = isShowRuleset(room.customConfig);
  const free = room.timerConfig === 0;
  const hits = mega.outcomes.filter((o) => o === 'correct').length;
  const openCount = mega.outcomes.length - hits;
  const current = mega.words[mega.currentIndex];
  const currentClues = mega.clues[mega.currentIndex] || [];
  const validCount = currentClues.filter((c) => c.valid).length;

  const start = () => {
    sounds.playPowerup();
    onUpdateMegaState((prev) => ({ ...prev, phase: 'PLAYING', timerActive: room.timerConfig > 0 }));
  };
  const submitClue = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    sounds.playTick();
    onUpdateMegaState((prev) => addClue(prev, text));
  };
  const hit = () => {
    sounds.playSuccess();
    onUpdateMegaState((prev) => {
      const next = applyMegaOutcome(prev, 'correct');
      if (next.phase === 'SUMMARY') confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const skip = () => {
    sounds.playFlip();
    onUpdateMegaState((prev) => applyMegaOutcome(prev, 'skipped'));
  };
  const finish = () => {
    sounds.playFlip();
    onUpdateMegaState((prev) => finishMegaRound(prev));
  };
  const overrule = (wi: number, ci: number) => {
    sounds.playTick();
    onUpdateMegaState((prev) => overruleClue(prev, wi, ci));
  };
  const toggleHidden = () => {
    sounds.playFlip();
    onUpdateMegaState((prev) => ({ ...prev, wordsHidden: !prev.wordsHidden }));
  };

  return (
    <div data-testid="mega-screen" className="gap-2 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#07080d]/95 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-anton text-sm md:text-base text-white uppercase tracking-wider">🗣️ MEGA RESENHA</span>
          <span className={`px-2 py-0.5 border font-mono-code text-[10px] font-bold uppercase ${teamMeta.borderClass}`}>
            {teamMeta.equipeLabel} · {teamName}
          </span>
          {isShow && (
            <span
              data-testid="mega-show-ruleset-chip"
              className="px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase"
            >
              📺 Programa · 1 palavra por dica
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="mega-toggle-words-btn"
            onClick={toggleHidden}
            className="px-2 py-1 border border-amber-400/60 bg-amber-950/60 text-amber-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
          >
            {mega.wordsHidden ? <Eye size={12} /> : <EyeOff size={12} />}
            {mega.wordsHidden ? 'MOSTRAR PALAVRA' : 'OCULTAR PALAVRA'}
          </button>
          <div className="border border-[#E6194B]/70 bg-[#07080d] px-2.5 py-0.5 flex items-center gap-1.5">
            <Clock size={13} className="text-rose-400" />
            <div
              data-testid="mega-timer-display"
              className={`font-anton text-base md:text-lg leading-none ${
                free ? 'text-[#17B8B8]' : mega.timerSeconds <= 10 ? 'text-[#E6194B]' : 'text-[#F5F2EB]'
              }`}
            >
              {free ? (
                <span className="flex items-center gap-1 text-xs">
                  <InfinityIcon className="w-3.5 h-3.5" />
                  LIVRE
                </span>
              ) : (
                fmt(mega.timerSeconds)
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="border border-cyan-400/60 bg-cyan-950/30 px-3 py-1.5">
          <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">🗣️ Dá as dicas</div>
          <div data-testid="mega-giver-name" className="font-anton text-lg text-white uppercase leading-tight">
            {giver?.name || '—'}
          </div>
          <div className="font-mono-code text-[10px] text-slate-300">Vê a palavra · uma palavra por dica</div>
        </div>
        <div className="border border-amber-400/60 bg-amber-950/30 px-3 py-1.5">
          <div className="font-mono-code text-[10px] text-amber-300 uppercase font-bold">🙈 Chuta (olhos vendados)</div>
          <div data-testid="mega-guesser-name" className="font-anton text-lg text-white uppercase leading-tight">
            {guesser?.name || '—'}
          </div>
          <div className="font-mono-code text-[10px] text-slate-300">Não olha a tela</div>
        </div>
      </div>

      {mega.phase === 'READY' && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 p-4 text-center">
          <div className="font-anton text-2xl text-white uppercase">Rodada pronta · {mega.words.length} palavras</div>
          <p className="font-mono-code text-xs text-slate-300 max-w-xl">
            {giver?.name} dá dicas de UMA palavra por vez; {guesser?.name} chuta de olhos vendados. Vale tudo menos a
            própria palavra e o mesmo radical.
          </p>
          <button
            type="button"
            data-testid="mega-start-btn"
            onClick={start}
            className="px-6 py-2.5 border-2 border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer"
          >
            {free ? '▶ COMEÇAR' : `▶ INICIAR CRONÔMETRO (${room.timerConfig}S)`}
          </button>
        </div>
      )}

      {mega.phase === 'PLAYING' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono-code text-[11px] text-slate-300 uppercase">
            <span>
              Palavra {Math.min(hits + 1, mega.words.length)} de {mega.words.length}
            </span>
            <span data-testid="mega-score">
              ✅ {hits} acertos · +{mega.roundScore} pts nesta rodada
            </span>
          </div>
          <div className="min-h-[110px] border-2 border-cyan-400/50 bg-[#07080d] flex items-center justify-center p-3">
            {mega.wordsHidden ? (
              <div className="font-anton text-3xl text-slate-500 uppercase">🙈 PALAVRA OCULTA</div>
            ) : (
              <div
                data-testid="mega-current-word"
                className="font-anton text-4xl md:text-5xl text-[#F5F2EB] uppercase text-center leading-tight break-words"
              >
                {current}
              </div>
            )}
          </div>

          {/* Dicas */}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submitClue();
            }}
          >
            <input
              data-testid="mega-clue-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Digite a dica (UMA palavra) e Enter"
              className="flex-1 bg-black border border-cyan-400/50 px-3 py-2 text-sm font-mono-code text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              data-testid="mega-clue-send-btn"
              className="px-3 py-2 border border-cyan-400 bg-cyan-950/60 hover:bg-cyan-400 hover:text-black text-cyan-100 font-anton text-xs uppercase flex items-center gap-1 cursor-pointer"
            >
              <Send size={14} /> DICA
            </button>
          </form>
          {mega.lastEvent && (
            <div data-testid="mega-last-event" className="font-mono-code text-[11px] text-rose-300 font-bold">
              ⚠️ {mega.lastEvent}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]" data-testid="mega-clue-list">
            {currentClues.map((c, i) => (
              <span
                key={i}
                data-testid={`mega-clue-${i}`}
                className={`px-2 py-0.5 border font-mono-code text-[11px] uppercase flex items-center gap-1.5 ${
                  c.valid ? 'border-emerald-400/70 text-emerald-200' : 'border-rose-400/70 text-rose-200 line-through'
                }`}
                title={c.reason}
              >
                {c.text}
                {!c.valid && (
                  <button
                    type="button"
                    data-testid={`mega-overrule-${i}`}
                    onClick={() => overrule(mega.currentIndex, i)}
                    className="no-underline px-1 border border-sky-400/60 text-sky-200 hover:bg-sky-400 hover:text-black text-[9px] cursor-pointer"
                  >
                    ⚖️ JUIZ ACEITA
                  </button>
                )}
              </span>
            ))}
            <span className="font-mono-code text-[10px] text-slate-400 self-center">{validCount} dicas válidas</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
            <button
              type="button"
              data-testid="mega-hit-btn"
              onClick={hit}
              className="px-5 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} /> ACERTOU (+1)
            </button>
            <button
              type="button"
              data-testid="mega-skip-btn"
              onClick={skip}
              disabled={openCount <= 1}
              className="px-3.5 py-2 border border-white/20 bg-white/[0.04] hover:bg-white/10 disabled:opacity-40 text-slate-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} /> PULAR
            </button>
            <button
              type="button"
              data-testid="mega-finish-btn"
              onClick={finish}
              className="ml-auto px-3.5 py-2 border border-rose-400/60 bg-rose-950/60 hover:bg-rose-500 text-rose-200 hover:text-white font-anton text-xs md:text-sm uppercase tracking-wider cursor-pointer"
            >
              ENCERRAR RODADA
            </button>
          </div>
        </div>
      )}

      {mega.phase === 'SUMMARY' && (
        <div data-testid="mega-summary" className="flex-1 min-h-0 flex flex-col gap-2 border border-white/10 bg-black/40 p-3">
          <div className="font-anton text-2xl text-white uppercase text-center">
            {mega.roundScore > 0 ? `+${mega.roundScore} PONTOS PARA ${teamName.toUpperCase()}` : 'NENHUM PONTO NESTA RODADA'}
          </div>
          <ul className="space-y-1">
            {mega.words.map((w, i) => (
              <li key={i} className="border border-white/10 px-2 py-1 font-mono-code text-xs uppercase">
                <span className={mega.outcomes[i] === 'correct' ? 'text-emerald-300' : 'text-slate-400'}>
                  {mega.outcomes[i] === 'correct' ? '✅' : '✖'} {w}
                </span>
                {mega.clues[i].length > 0 && (
                  <span className="text-slate-400 normal-case">
                    {' '}
                    · dicas: {mega.clues[i].map((c) => (c.valid ? c.text : `(${c.text})`)).join(', ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex justify-center">
            <button
              type="button"
              data-testid="mega-next-round-btn"
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
