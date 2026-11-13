import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Check, Clock, Eye, EyeOff, Info, Infinity as InfinityIcon, RotateCcw, ArrowRight, Undo2, X as XIcon } from 'lucide-react';
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

  const clock = free ? 'Livre' : fmt(mimica.timerSeconds);
  const clockHot = !free && mimica.timerSeconds <= 10 && mimica.phase === 'PLAYING';

  return (
    <div data-testid="mimica-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Mímica
          <span className="rdb-lim-round">{teamName}</span>
          {isShow && (
            <span data-testid="mimica-show-ruleset-chip" className="rdb-nota-scale" data-tip={`Regras do programa: a rodada ${room.roundNumber} vale ${mimica.roundValue} por palavra`}>
              vale {mimica.roundValue}
            </span>
          )}
        </span>
        <span className="rdb-lim-rule" tabIndex={0} data-tip="Quem faz a mímica vê as palavras e não pode falar nem apontar. Quem adivinha fica de olhos vendados. O adversário pode ver, mas não ajuda.">
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="mimica-timer-display" className={'rdb-lim-timer' + (clockHot ? ' is-hot' : '')} data-tip={free ? 'Sem limite de tempo' : 'Tempo da rodada'}>
            {free ? <InfinityIcon size={16} /> : <Clock size={16} />}
            {clock}
          </span>
          <button
            type="button"
            data-testid="mimica-toggle-words-btn"
            className={'rdb-lim-icon' + (mimica.wordsHidden ? ' is-on' : '')}
            aria-pressed={mimica.wordsHidden}
            aria-label={mimica.wordsHidden ? 'Mostrar as palavras' : 'Ocultar as palavras'}
            data-tip={mimica.wordsHidden ? 'Mostrar as palavras na TV' : 'Ocultar as palavras na TV'}
            onClick={toggleHidden}
          >
            {mimica.wordsHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </header>
      <span className="sr-only">
        <span data-testid="mimica-mime-name">{mime?.name || '—'}</span>
        <span data-testid="mimica-guesser-name">{guesser?.name || '—'}</span>
      </span>

      {mimica.phase === 'READY' && (
        <section className="rdb-pro-ready">
          <h2>{mimica.words.length} palavras</h2>
          <p>
            {mime?.name} faz a mímica e {guesser?.name} adivinha de olhos vendados. Vale gesto e expressão, sem falar nem apontar.
          </p>
          <button type="button" data-testid="mimica-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
            {free ? 'Começar' : `Iniciar cronômetro (${room.timerConfig}s)`}
          </button>
        </section>
      )}

      {mimica.phase === 'PLAYING' && (
        <>
          <div className="rdb-pro-progress">
            <div className="rdb-pro-dots">
              {mimica.words.map((w, i) => (
                <i
                  key={i}
                  data-testid={`mimica-word-chip-${i}`}
                  data-tip={mimica.wordsHidden && mimica.outcomes[i] !== 'correct' ? `Palavra ${i + 1}` : w}
                  className={mimica.outcomes[i] === 'correct' ? 'is-hit' : i === mimica.currentIndex ? 'is-now' : mimica.outcomes[i] === 'skipped' ? 'is-skip' : ''}
                >
                  {mimica.outcomes[i] === 'correct' ? <Check size={14} strokeWidth={4} /> : i + 1}
                </i>
              ))}
            </div>
            <div className="rdb-pro-counts" data-testid="mimica-score">
              <span data-tip="Acertos">
                <Check size={16} /> {hits}
              </span>
              <span data-tip="Pontos nesta rodada">+{mimica.roundScore}</span>
            </div>
          </div>

          <section className="rdb-word">
            {mimica.wordsHidden ? (
              <span className="rdb-word-hidden">Palavra oculta</span>
            ) : (
              <div data-testid="mimica-current-word" className="rdb-word-text">
                {current}
              </div>
            )}
          </section>

          <footer className="rdb-pro-foot">
            <button type="button" data-testid="mimica-hit-btn" className="rdb-btn rdb-pro-hit" onClick={hit}>
              <Check size={20} strokeWidth={3} /> Acertou (+{mimica.roundValue})
            </button>
            <button type="button" data-testid="mimica-skip-btn" className="rdb-btn" onClick={skip} disabled={openCount <= 1}>
              <RotateCcw /> Pular
            </button>
            <div className="rdb-pro-foot-end">
              <button type="button" data-testid="mimica-finish-btn" className="rdb-btn" onClick={finish}>
                Encerrar rodada
              </button>
            </div>
          </footer>
        </>
      )}

      {mimica.phase === 'SUMMARY' && (
        <section data-testid="mimica-summary" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Fim da rodada</span>
            <h2>
              {mimica.roundScore > 0 ? `+${mimica.roundScore}` : '0'} <small>pontos para {teamName}</small>
            </h2>
            <p>
              {hits} de {mimica.words.length} palavras acertadas, cada uma valeu {mimica.roundValue}.
            </p>
          </div>
          <div className="rdb-pro-sum-grid">
            {mimica.words.map((w, i) => {
              const ok = mimica.outcomes[i] === 'correct';
              return (
                <div key={i} className={'rdb-pro-sum-card' + (ok ? ' is-hit' : '')}>
                  <span className="rdb-pro-sum-top">
                    <strong>{w}</strong>
                    <span className="rdb-pro-sum-mark">{ok ? <Check size={18} strokeWidth={4} /> : <XIcon size={18} strokeWidth={4} />}</span>
                  </span>
                  {ok && (
                    <button type="button" data-testid={`mimica-undo-${i}`} className="rdb-btn" onClick={() => undo(i)} data-tip="O juiz aceita a contestação: a palavra deixa de contar">
                      <Undo2 /> Contestar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="mimica-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
