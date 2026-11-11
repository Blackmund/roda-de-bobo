import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eraser,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  RotateCcw,
  Undo2
} from 'lucide-react';
import { ComoEuPintoState, DrawStroke, GameRoom } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { TEAM_META } from '../../utils/teamUtils';
import { DrawingCanvas } from '../DrawingCanvas';
import {
  PINTO_COLORS,
  addStroke,
  clearDrawing,
  endDrawing,
  finishSteal,
  markDrawn,
  pintoRoundPoints,
  skipWord,
  stealWord,
  tickPintoTimer,
  undoStroke
} from '../../utils/comoEuPintoEngine';

interface ScreenComoEuPintoProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdatePintoState: (updater: (prev: ComoEuPintoState) => ComoEuPintoState) => void;
  onNextRound: () => void;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const ScreenComoEuPinto: React.FC<ScreenComoEuPintoProps> = ({ room, onUpdatePintoState, onNextRound }) => {
  const st = room.comoEuPinto;
  const updateRef = useRef(onUpdatePintoState);
  updateRef.current = onUpdatePintoState;
  const [color, setColor] = useState(PINTO_COLORS[0]);

  useEffect(() => {
    if (!st || room.timerConfig === 0 || st.phase !== 'PLAYING' || !st.timerActive) return;
    const interval = setInterval(() => {
      updateRef.current((prev) => {
        const next = tickPintoTimer(prev);
        if (next.phase !== 'PLAYING' && prev.phase === 'PLAYING') sounds.playBuzzer();
        else if (next.timerSeconds <= 10 && next.timerSeconds > 0) sounds.playTick(next.timerSeconds);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room.timerConfig, st?.phase, st?.timerActive]);

  if (!st) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada...</div>;
  }

  const drawer = room.players.find((p) => p.id === st.drawerPlayerId);
  const guesser = room.players.find((p) => p.id === st.guesserPlayerId);
  const teamMeta = TEAM_META[st.drawTeam];
  const teamName = room.teams[st.drawTeam]?.name || teamMeta.defaultName;
  const rivalMeta = st.rivalTeam ? TEAM_META[st.rivalTeam] : null;
  const rivalName = st.rivalTeam ? room.teams[st.rivalTeam]?.name || TEAM_META[st.rivalTeam].defaultName : '';
  const isShow = isShowRuleset(room.customConfig);
  const free = room.timerConfig === 0;
  const hits = st.outcomes.filter((o) => o === 'correct').length;
  const pts = pintoRoundPoints(st);
  const openCount = st.outcomes.filter((o) => o === 'pending').length;

  const start = () => {
    sounds.playPowerup();
    onUpdatePintoState((prev) => ({ ...prev, phase: 'PLAYING', timerActive: room.timerConfig > 0 }));
  };
  const onStroke = (s: DrawStroke) => onUpdatePintoState((prev) => addStroke(prev, s));
  const hit = () => {
    sounds.playSuccess();
    onUpdatePintoState((prev) => {
      const next = markDrawn(prev);
      if (next.phase === 'SUMMARY') confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };

  return (
    <div data-testid="pinto-screen" className="gap-2 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#07080d]/95 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-anton text-sm md:text-base text-white uppercase tracking-wider">🎨 COMO EU PINTO</span>
          <span className={`px-2 py-0.5 border font-mono-code text-[10px] font-bold uppercase ${teamMeta.borderClass}`}>
            {teamMeta.equipeLabel} · {teamName}
          </span>
          {isShow && (
            <span
              data-testid="pinto-show-ruleset-chip"
              className="px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase"
            >
              📺 Programa · sem letras nem números
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="pinto-toggle-word-btn"
            onClick={() => {
              sounds.playFlip();
              onUpdatePintoState((prev) => ({ ...prev, wordHidden: !prev.wordHidden }));
            }}
            className="px-2 py-1 border border-amber-400/60 bg-amber-950/60 text-amber-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
          >
            {st.wordHidden ? <Eye size={12} /> : <EyeOff size={12} />}
            {st.wordHidden ? 'MOSTRAR PALAVRA' : 'OCULTAR PALAVRA'}
          </button>
          <div className="border border-[#E6194B]/70 bg-[#07080d] px-2.5 py-0.5 flex items-center gap-1.5">
            <Clock size={13} className="text-rose-400" />
            <div
              data-testid="pinto-timer-display"
              className={`font-anton text-base md:text-lg leading-none ${
                free ? 'text-[#17B8B8]' : st.timerSeconds <= 10 ? 'text-[#E6194B]' : 'text-[#F5F2EB]'
              }`}
            >
              {free ? (
                <span className="flex items-center gap-1 text-xs">
                  <InfinityIcon className="w-3.5 h-3.5" />
                  LIVRE
                </span>
              ) : (
                fmt(st.timerSeconds)
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="border border-cyan-400/60 bg-cyan-950/30 px-3 py-1.5">
          <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">🎨 Desenha</div>
          <div data-testid="pinto-drawer-name" className="font-anton text-lg text-white uppercase leading-tight">
            {drawer?.name || '—'}
          </div>
          <div className="font-mono-code text-[10px] text-slate-300">Sem letras, sem números, sem falar</div>
        </div>
        <div className="border border-amber-400/60 bg-amber-950/30 px-3 py-1.5">
          <div className="font-mono-code text-[10px] text-amber-300 uppercase font-bold">🔎 Adivinha</div>
          <div data-testid="pinto-guesser-name" className="font-anton text-lg text-white uppercase leading-tight">
            {guesser?.name || '—'}
          </div>
          <div className="font-mono-code text-[10px] text-slate-300">Olha o desenho e chuta a palavra</div>
        </div>
      </div>

      {st.phase === 'READY' && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 p-4 text-center">
          <div className="font-anton text-2xl text-white uppercase">Rodada pronta · {st.words.length} palavras</div>
          <p className="font-mono-code text-xs text-slate-300 max-w-xl">
            {drawer?.name} desenha a palavra; {guesser?.name} adivinha. Quem desenha não pode escrever letras ou números
            nem falar da palavra. Quando o tempo acabar, a dupla rival tenta as palavras que faltarem.
          </p>
          <button
            type="button"
            data-testid="pinto-start-btn"
            onClick={start}
            className="px-6 py-2.5 border-2 border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer"
          >
            {free ? '▶ COMEÇAR' : `▶ INICIAR CRONÔMETRO (${room.timerConfig}S)`}
          </button>
        </div>
      )}

      {st.phase === 'PLAYING' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-mono-code text-[11px] text-slate-300 uppercase">
            <span>
              Palavra {Math.min(hits + 1, st.words.length)} de {st.words.length}
            </span>
            <span data-testid="pinto-score">
              ✅ {hits} acertos · +{pts.draw} pts nesta rodada
            </span>
          </div>
          <div className="shrink-0 border-2 border-cyan-400/50 bg-[#07080d] px-3 py-2 text-center">
            {st.wordHidden ? (
              <span className="font-anton text-2xl text-slate-500 uppercase">🙈 PALAVRA OCULTA</span>
            ) : (
              <span data-testid="pinto-current-word" className="font-anton text-3xl md:text-4xl text-[#F5F2EB] uppercase">
                {st.words[st.currentIndex]}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-full" style={{ maxWidth: "calc(44vh * 4 / 3)" }}>
              <DrawingCanvas
                testId="pinto-canvas"
                strokes={st.strokes}
                editable
                color={color}
                onStroke={onStroke}
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PINTO_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  data-testid={`pinto-color-${c.slice(1)}`}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 border-2 cursor-pointer ${color === c ? 'border-white scale-110' : 'border-black/60'}`}
                />
              ))}
              <button
                type="button"
                data-testid="pinto-undo-btn"
                onClick={() => onUpdatePintoState((prev) => undoStroke(prev))}
                className="px-2.5 py-1 border border-white/25 text-slate-200 hover:bg-white/10 font-anton text-xs uppercase flex items-center gap-1 cursor-pointer"
              >
                <Undo2 size={14} /> DESFAZER
              </button>
              <button
                type="button"
                data-testid="pinto-clear-btn"
                onClick={() => onUpdatePintoState((prev) => clearDrawing(prev))}
                className="px-2.5 py-1 border border-white/25 text-slate-200 hover:bg-white/10 font-anton text-xs uppercase flex items-center gap-1 cursor-pointer"
              >
                <Eraser size={14} /> LIMPAR
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
            <button
              type="button"
              data-testid="pinto-hit-btn"
              onClick={hit}
              className="px-5 py-2 border-2 border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={16} /> ACERTOU (+1)
            </button>
            <button
              type="button"
              data-testid="pinto-skip-btn"
              disabled={openCount <= 1}
              onClick={() => {
                sounds.playFlip();
                onUpdatePintoState((prev) => skipWord(prev));
              }}
              className="px-3.5 py-2 border border-white/20 bg-white/[0.04] hover:bg-white/10 disabled:opacity-40 text-slate-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} /> PULAR
            </button>
            <button
              type="button"
              data-testid="pinto-end-btn"
              onClick={() => {
                sounds.playFlip();
                onUpdatePintoState((prev) => endDrawing(prev));
              }}
              className="ml-auto px-3.5 py-2 border border-rose-400/60 bg-rose-950/60 hover:bg-rose-500 text-rose-200 hover:text-white font-anton text-xs md:text-sm uppercase tracking-wider cursor-pointer"
            >
              ENCERRAR TEMPO
            </button>
          </div>
        </div>
      )}

      {st.phase === 'STEAL' && (
        <div data-testid="pinto-steal" className="flex-1 min-h-0 flex flex-col gap-2 border border-amber-400/50 bg-amber-950/20 p-3">
          <div className="text-center">
            <div className="font-anton text-2xl text-amber-200 uppercase">
              Tempo esgotado! {rivalMeta?.equipeLabel} · {rivalName} pode roubar
            </div>
            <div className="font-mono-code text-xs text-slate-300">
              A dupla rival palpita as palavras que faltaram (1 ponto cada). Marque as que ela acertou.
            </div>
          </div>
          <ul className="space-y-1.5">
            {st.words.map((w, i) =>
              st.outcomes[i] === 'pending' ? (
                <li key={i} className="flex items-center justify-between gap-2 border border-white/15 px-3 py-1.5">
                  <span className="font-anton text-lg text-white uppercase">{w}</span>
                  <button
                    type="button"
                    data-testid={`pinto-steal-${i}`}
                    onClick={() => {
                      sounds.playSuccess();
                      onUpdatePintoState((prev) => stealWord(prev, i));
                    }}
                    className="px-3 py-1 border border-emerald-400 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-xs uppercase cursor-pointer"
                  >
                    ✅ A RIVAL ACERTOU
                  </button>
                </li>
              ) : null
            )}
          </ul>
          <div className="mt-auto flex justify-center">
            <button
              type="button"
              data-testid="pinto-finish-steal-btn"
              onClick={() => onUpdatePintoState((prev) => finishSteal(prev))}
              className="px-5 py-2 border border-white/30 text-slate-100 hover:bg-white/10 font-anton text-sm uppercase tracking-wider cursor-pointer"
            >
              FINALIZAR ROUBO
            </button>
          </div>
        </div>
      )}

      {st.phase === 'SUMMARY' && (
        <div data-testid="pinto-summary" className="flex-1 min-h-0 flex flex-col gap-2 border border-white/10 bg-black/40 p-3">
          <div className="font-anton text-2xl text-white uppercase text-center">
            {teamName.toUpperCase()} +{pts.draw}
            {st.rivalTeam ? ` · ${rivalName.toUpperCase()} +${pts.rival}` : ''}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {st.words.map((w, i) => (
              <div key={i} className="border border-white/10 p-1.5 space-y-1">
                <DrawingCanvas testId={`pinto-thumb-${i}`} strokes={st.drawings[i] ?? []} aspect={4 / 3} />
                <div
                  className={`font-mono-code text-xs uppercase text-center ${
                    st.outcomes[i] === 'correct'
                      ? 'text-emerald-300'
                      : st.outcomes[i] === 'stolen'
                      ? 'text-amber-300'
                      : 'text-slate-500'
                  }`}
                >
                  {st.outcomes[i] === 'correct' ? '✅' : st.outcomes[i] === 'stolen' ? '🏴‍☠️ roubada' : '✖'} {w}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto flex justify-center">
            <button
              type="button"
              data-testid="pinto-next-round-btn"
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
