import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Clock, Eye, EyeOff, Info, Infinity as InfinityIcon, RotateCcw, Scale, Send, X as XIcon } from 'lucide-react';
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

  const clock = free ? 'Livre' : fmt(mega.timerSeconds);
  const clockHot = !free && mega.timerSeconds <= 10 && mega.phase === 'PLAYING';

  return (
    <div data-testid="mega-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Mega Resenha
          <span className="rdb-lim-round">{teamName}</span>
          {isShow && (
            <span data-testid="mega-show-ruleset-chip" className="rdb-nota-scale" data-tip="Regras do programa: uma palavra por dica">
              1 palavra
            </span>
          )}
        </span>
        <span className="rdb-lim-rule" tabIndex={0} data-tip="Quem dá as dicas vê a palavra e fala UMA palavra por dica, sem a própria palavra nem o mesmo radical. Quem chuta fica de olhos vendados.">
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="mega-timer-display" className={'rdb-lim-timer' + (clockHot ? ' is-hot' : '')} data-tip={free ? 'Sem limite de tempo' : 'Tempo da rodada'}>
            {free ? <InfinityIcon size={16} /> : <Clock size={16} />}
            {clock}
          </span>
          <button
            type="button"
            data-testid="mega-toggle-words-btn"
            className={'rdb-lim-icon' + (mega.wordsHidden ? ' is-on' : '')}
            aria-pressed={mega.wordsHidden}
            aria-label={mega.wordsHidden ? 'Mostrar a palavra' : 'Ocultar a palavra'}
            data-tip={mega.wordsHidden ? 'Mostrar a palavra na TV' : 'Ocultar a palavra na TV'}
            onClick={toggleHidden}
          >
            {mega.wordsHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>
      </header>
      <span className="sr-only">
        <span data-testid="mega-giver-name">{giver?.name || '—'}</span>
        <span data-testid="mega-guesser-name">{guesser?.name || '—'}</span>
      </span>

      {mega.phase === 'READY' && (
        <section className="rdb-pro-ready">
          <h2>{mega.words.length} palavras</h2>
          <p>
            {giver?.name} dá dicas de uma palavra por vez e {guesser?.name} chuta de olhos vendados. Vale tudo, menos a própria palavra e o mesmo radical.
          </p>
          <button type="button" data-testid="mega-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
            {free ? 'Começar' : `Iniciar cronômetro (${room.timerConfig}s)`}
          </button>
        </section>
      )}

      {mega.phase === 'PLAYING' && (
        <>
          <div className="rdb-pro-progress">
            <div className="rdb-pro-dots">
              {mega.words.map((_, i) => (
                <i key={i} className={mega.outcomes[i] === 'correct' ? 'is-hit' : i === mega.currentIndex ? 'is-now' : mega.outcomes[i] === 'skipped' ? 'is-skip' : ''}>
                  {mega.outcomes[i] === 'correct' ? <Check size={14} strokeWidth={4} /> : i + 1}
                </i>
              ))}
            </div>
            <div className="rdb-pro-counts" data-testid="mega-score">
              <span data-tip="Acertos">
                <Check size={16} /> {hits}
              </span>
              <span data-tip="Pontos nesta rodada">+{mega.roundScore}</span>
            </div>
          </div>

          <section className="rdb-word is-compact">
            {mega.wordsHidden ? (
              <span className="rdb-word-hidden">Palavra oculta</span>
            ) : (
              <div data-testid="mega-current-word" className="rdb-word-text">
                {current}
              </div>
            )}
          </section>

          <form
            className="rdb-clue-form"
            onSubmit={(e) => {
              e.preventDefault();
              submitClue();
            }}
          >
            <input data-testid="mega-clue-input" aria-label="Dica de uma palavra" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Digite a dica (uma palavra) e Enter" />
            <button type="submit" data-testid="mega-clue-send-btn" className="rdb-btn">
              <Send /> Dica
            </button>
          </form>
          {mega.lastEvent && (
            <div data-testid="mega-last-event" className="rdb-pro-note">
              {mega.lastEvent}
            </div>
          )}
          <div className="rdb-clues" data-testid="mega-clue-list">
            {currentClues.map((c, i) => (
              <span key={i} data-testid={`mega-clue-${i}`} className={c.valid ? 'is-ok' : 'is-bad'} data-tip={c.reason}>
                {c.text}
                {!c.valid && (
                  <button type="button" data-testid={`mega-overrule-${i}`} onClick={() => overrule(mega.currentIndex, i)} aria-label="O juiz aceita esta dica" data-tip="O juiz aceita esta dica">
                    <Scale size={14} />
                  </button>
                )}
              </span>
            ))}
            <em>{validCount} {validCount === 1 ? 'dica válida' : 'dicas válidas'}</em>
          </div>

          <footer className="rdb-pro-foot">
            <button type="button" data-testid="mega-hit-btn" className="rdb-btn rdb-pro-hit" onClick={hit}>
              <Check size={20} strokeWidth={3} /> Acertou (+1)
            </button>
            <button type="button" data-testid="mega-skip-btn" className="rdb-btn" onClick={skip} disabled={openCount <= 1}>
              <RotateCcw /> Pular
            </button>
            <div className="rdb-pro-foot-end">
              <button type="button" data-testid="mega-finish-btn" className="rdb-btn" onClick={finish}>
                Encerrar rodada
              </button>
            </div>
          </footer>
        </>
      )}

      {mega.phase === 'SUMMARY' && (
        <section data-testid="mega-summary" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Fim da rodada</span>
            <h2>
              {mega.roundScore > 0 ? `+${mega.roundScore}` : '0'} <small>pontos para {teamName}</small>
            </h2>
          </div>
          <div className="rdb-pro-sum-grid">
            {mega.words.map((w, i) => {
              const ok = mega.outcomes[i] === 'correct';
              return (
                <div key={i} className={'rdb-pro-sum-card' + (ok ? ' is-hit' : '')}>
                  <span className="rdb-pro-sum-top">
                    <strong>{w}</strong>
                    <span className="rdb-pro-sum-mark">{ok ? <Check size={18} strokeWidth={4} /> : <XIcon size={18} strokeWidth={4} />}</span>
                  </span>
                  {mega.clues[i].length > 0 && <span className="rdb-pro-sum-words">{mega.clues[i].map((c) => (c.valid ? c.text : `(${c.text})`)).join(' · ')}</span>}
                </div>
              );
            })}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="mega-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
