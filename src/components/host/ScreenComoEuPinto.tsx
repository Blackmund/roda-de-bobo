import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Clock, Eraser, Eye, EyeOff, Infinity as InfinityIcon, Info, RotateCcw, Swords, Undo2, X as XIcon } from 'lucide-react';
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

  const clock = free ? 'Livre' : fmt(st.timerSeconds);
  const clockHot = !free && st.timerSeconds <= 10 && st.phase === 'PLAYING';

  return (
    <div data-testid="pinto-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Como eu pinto
          <span className="rdb-lim-round">{teamName}</span>
          {isShow && (
            <span data-testid="pinto-show-ruleset-chip" className="rdb-nota-scale" data-tip="Regras do programa: sem letras nem números">
              programa
            </span>
          )}
        </span>
        <span className="rdb-lim-rule" tabIndex={0} data-tip="Quem desenha não pode escrever letras ou números nem falar da palavra. Quando o tempo acaba, a dupla rival tenta as palavras que faltaram.">
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="pinto-timer-display" className={'rdb-lim-timer' + (clockHot ? ' is-hot' : '')} data-tip={free ? 'Sem limite de tempo' : 'Tempo da rodada'}>
            {free ? <InfinityIcon size={16} /> : <Clock size={16} />}
            {clock}
          </span>
          <button
            type="button"
            data-testid="pinto-toggle-word-btn"
            className={'rdb-lim-icon' + (st.wordHidden ? ' is-on' : '')}
            aria-pressed={st.wordHidden}
            aria-label={st.wordHidden ? 'Mostrar a palavra' : 'Ocultar a palavra'}
            data-tip={st.wordHidden ? 'Mostrar a palavra na TV' : 'Ocultar a palavra na TV'}
            onClick={() => {
              sounds.playFlip();
              onUpdatePintoState((prev) => ({ ...prev, wordHidden: !prev.wordHidden }));
            }}
          >
            {st.wordHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </header>
      <span className="sr-only">
        <span data-testid="pinto-drawer-name">{drawer?.name || '—'}</span>
        <span data-testid="pinto-guesser-name">{guesser?.name || '—'}</span>
      </span>

      {st.phase === 'READY' && (
        <section className="rdb-pro-ready">
          <h2>{st.words.length} palavras</h2>
          <p>
            {drawer?.name} desenha e {guesser?.name} adivinha. Sem letras, sem números e sem falar da palavra. Quando o tempo acabar, a dupla rival tenta as que faltarem.
          </p>
          <button type="button" data-testid="pinto-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
            {free ? 'Começar' : `Iniciar cronômetro (${room.timerConfig}s)`}
          </button>
        </section>
      )}

      {st.phase === 'PLAYING' && (
        <>
          <div className="rdb-pro-progress">
            <div className="rdb-pro-dots">
              {st.words.map((_, i) => (
                <i key={i} className={st.outcomes[i] === 'correct' ? 'is-hit' : i === st.currentIndex ? 'is-now' : ''}>
                  {st.outcomes[i] === 'correct' ? <Check size={14} strokeWidth={4} /> : i + 1}
                </i>
              ))}
            </div>
            <div className="rdb-pro-counts" data-testid="pinto-score">
              <span data-tip="Acertos">
                <Check size={16} /> {hits}
              </span>
              <span data-tip="Pontos nesta rodada">+{pts.draw}</span>
            </div>
          </div>

          <section className="rdb-word is-slim">
            {st.wordHidden ? (
              <span className="rdb-word-hidden">Palavra oculta</span>
            ) : (
              <div data-testid="pinto-current-word" className="rdb-word-text">
                {st.words[st.currentIndex]}
              </div>
            )}
          </section>

          <div className="rdb-pinto-board">
            <div className="rdb-pinto-canvas">
              <DrawingCanvas testId="pinto-canvas" strokes={st.strokes} editable color={color} onStroke={onStroke} />
            </div>
            <div className="rdb-pinto-tools">
              {PINTO_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  data-testid={`pinto-color-${c.slice(1)}`}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={color === c ? 'is-on' : ''}
                />
              ))}
              <button type="button" data-testid="pinto-undo-btn" className="rdb-lim-icon" aria-label="Desfazer" data-tip="Desfazer o último traço" onClick={() => onUpdatePintoState((prev) => undoStroke(prev))}>
                <Undo2 size={16} />
              </button>
              <button type="button" data-testid="pinto-clear-btn" className="rdb-lim-icon" aria-label="Limpar" data-tip="Limpar o desenho" onClick={() => onUpdatePintoState((prev) => clearDrawing(prev))}>
                <Eraser size={16} />
              </button>
            </div>
          </div>

          <footer className="rdb-pro-foot">
            <button type="button" data-testid="pinto-hit-btn" className="rdb-btn rdb-pro-hit" onClick={hit}>
              <Check size={20} strokeWidth={3} /> Acertou (+1)
            </button>
            <button
              type="button"
              data-testid="pinto-skip-btn"
              className="rdb-btn"
              disabled={openCount <= 1}
              onClick={() => {
                sounds.playFlip();
                onUpdatePintoState((prev) => skipWord(prev));
              }}
            >
              <RotateCcw /> Pular
            </button>
            <div className="rdb-pro-foot-end">
              <button
                type="button"
                data-testid="pinto-end-btn"
                className="rdb-btn"
                onClick={() => {
                  sounds.playFlip();
                  onUpdatePintoState((prev) => endDrawing(prev));
                }}
              >
                Encerrar tempo
              </button>
            </div>
          </footer>
        </>
      )}

      {st.phase === 'STEAL' && (
        <section data-testid="pinto-steal" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Tempo esgotado</span>
            <h2>
              {rivalName} <small>pode roubar</small>
            </h2>
            <p>A dupla rival palpita as palavras que faltaram (1 ponto cada). Marque as que ela acertou.</p>
          </div>
          <div className="rdb-pro-sum-grid">
            {st.words.map((w, i) =>
              st.outcomes[i] === 'pending' ? (
                <div key={i} className="rdb-pro-sum-card">
                  <span className="rdb-pro-sum-top">
                    <strong>{w}</strong>
                  </span>
                  <button
                    type="button"
                    data-testid={`pinto-steal-${i}`}
                    className="rdb-btn rdb-pro-hit"
                    onClick={() => {
                      sounds.playSuccess();
                      onUpdatePintoState((prev) => stealWord(prev, i));
                    }}
                  >
                    <Check /> A rival acertou
                  </button>
                </div>
              ) : null
            )}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="pinto-finish-steal-btn" className="rdb-btn rdb-setup-start" onClick={() => onUpdatePintoState((prev) => finishSteal(prev))}>
              Finalizar o roubo
              <ArrowRight />
            </button>
          </div>
        </section>
      )}

      {st.phase === 'SUMMARY' && (
        <section data-testid="pinto-summary" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Fim da rodada</span>
            <h2>
              {teamName} +{pts.draw}
              {st.rivalTeam ? <small> · {rivalName} +{pts.rival}</small> : null}
            </h2>
          </div>
          <div className="rdb-pinto-thumbs">
            {st.words.map((w, i) => (
              <div key={i} className={'rdb-pinto-thumb' + (st.outcomes[i] === 'correct' ? ' is-hit' : st.outcomes[i] === 'stolen' ? ' is-stolen' : '')}>
                <DrawingCanvas testId={`pinto-thumb-${i}`} strokes={st.drawings[i] ?? []} aspect={4 / 3} />
                <span>
                  {st.outcomes[i] === 'correct' ? <Check size={16} strokeWidth={4} /> : st.outcomes[i] === 'stolen' ? <Swords size={16} /> : <XIcon size={16} strokeWidth={4} />} {w}
                  {st.outcomes[i] === 'stolen' ? ' (roubada)' : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="pinto-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
