import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Eye, EyeOff, Info, XCircle } from 'lucide-react';
import { GameRoom, RespostasSemPerguntasState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { currentValue, giveUpRound, judgeGuess, pickPosition } from '../../utils/respostasEngine';
import { PlayerMark } from '../rdb/PlayerMark';

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
  const avatarOf = (id: string) => <PlayerMark p={room.players.find((p) => p.id === id)} />;
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
    <div data-testid="rsp-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Respostas sem perguntas
          {isShow && (
            <span data-testid="rsp-show-ruleset-chip" className="rdb-nota-scale" data-tip="Regras do programa: cada erro tira 1 ponto do valor">
              programa
            </span>
          )}
        </span>
        <span className="rdb-lim-rule" tabIndex={0} data-tip="A pergunta existe, mas ninguém sabe qual é: só a quantidade de palavras. Na vez, escolha UMA palavra para revelar e chute a resposta. Acertar vale tantos pontos quanto palavras; cada erro tira 1.">
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="rsp-value" className="rdb-lim-timer" data-tip="Quanto vale acertar agora">
            Vale {done && !rsp.winnerPlayerId ? 0 : value}
          </span>
          <button
            type="button"
            data-testid="rsp-toggle-answer-btn"
            className={'rdb-lim-icon' + (rsp.answerVisible ? ' is-on' : '')}
            aria-pressed={rsp.answerVisible}
            aria-label="Resposta do diretor"
            data-tip={rsp.answerVisible ? 'Esconder a resposta' : 'Mostrar a resposta (só o diretor)'}
            onClick={toggleAnswer}
          >
            {rsp.answerVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </header>

      {rsp.answerVisible && (
        <div data-testid="rsp-answer" className="rdb-pro-note">
          Resposta: <strong>{rsp.answer}</strong>
        </div>
      )}

      {rsp.phase === 'READY' && (
        <section className="rdb-pro-ready">
          <h2>{rsp.words.length} palavras</h2>
          <p>Na sua vez, escolha UMA palavra para revelar e depois chute a resposta.</p>
          <button type="button" data-testid="rsp-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
            Começar
          </button>
        </section>
      )}

      {rsp.phase === 'PLAYING' && (
        <>
          <section className="rdb-rsp-step">
            <h2>{rsp.step === 'pick' ? 'Escolha uma palavra para revelar' : 'Agora chute a resposta!'}</h2>
            <p>
              {rsp.attempts.length > 0 ? `${rsp.attempts.length} tentativa(s) · ${rsp.attempts.filter((a) => !a.correct).length} erro(s)` : 'Primeira tentativa'}
            </p>
          </section>
          <footer className="rdb-pro-foot">
            <button type="button" data-testid="rsp-right-btn" className="rdb-btn rdb-pro-hit" disabled={rsp.step !== 'guess'} onClick={() => judge(true)}>
              <Check size={20} strokeWidth={3} /> Acertou (+{value})
            </button>
            <button type="button" data-testid="rsp-wrong-btn" className="rdb-btn rdb-tem-strike" disabled={rsp.step !== 'guess'} onClick={() => judge(false)}>
              <XCircle /> Errou
            </button>
            <div className="rdb-pro-foot-end">
              <button type="button" data-testid="rsp-giveup-btn" className="rdb-btn" onClick={giveUp}>
                Encerrar rodada
              </button>
            </div>
          </footer>
        </>
      )}

      {done && (
        <section data-testid="rsp-summary" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Fim da rodada</span>
            <h2>
              {rsp.winnerPlayerId ? (
                <>
                  {nameOf(rsp.winnerPlayerId)} <small>acertou! +{rsp.pointsAwarded[rsp.winnerPlayerId]} pontos</small>
                </>
              ) : (
                'Ninguém acertou'
              )}
            </h2>
            <p>Pergunta: {rsp.words.join(' ')}?</p>
            <p>
              Resposta: <strong>{rsp.answer}</strong>
            </p>
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="rsp-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}

      {/* Faixa inferior no estilo do programa: selo do jogo | palavras numeradas | contador */}
      <div
        data-testid="rsp-strip"
        className="shrink-0 mt-auto grid grid-cols-2 sm:grid-cols-[auto_1fr_auto] items-stretch border-2 border-[#E6194B]/80 bg-[#0b0e24] shadow-[0_0_18px_rgba(230,25,75,0.25)]"
      >
        <div className="flex flex-col justify-center gap-1.5 px-2 py-2 border-r-2 border-[#E6194B]/80 w-auto sm:w-28 md:w-44">
          <div className="font-anton text-[11px] md:text-sm text-white uppercase tracking-wider leading-none">
            RODA <span className="text-[#E6194B]">DE</span> BOBO
          </div>
          <div className="bg-[#E6194B] px-1.5 py-1.5 font-anton text-[10px] md:text-xs text-white uppercase leading-tight tracking-wide">
            Respostas sem perguntas
          </div>
        </div>

        <div className="col-span-2 order-3 sm:col-span-1 sm:order-none border-t-2 sm:border-t-0 border-[#E6194B]/80 px-2 py-2 flex flex-wrap items-center justify-center gap-1.5 md:gap-2" data-testid="rsp-words">
          {rsp.words.map((w, i) => {
            const shown = rsp.revealed[i] || done;
            const canPick = rsp.phase === 'PLAYING' && rsp.step === 'pick' && !rsp.revealed[i];
            const last = i === rsp.words.length - 1;
            return (
              <button
                key={i}
                type="button"
                data-testid={`rsp-word-${i}`}
                aria-label={shown ? `Palavra ${i + 1}: ${w}` : `Revelar a palavra ${i + 1}`}
                disabled={!canPick}
                onClick={() => pick(i)}
                className={`relative min-w-[3.6rem] md:min-w-[5.2rem] h-10 md:h-12 px-2 border text-center transition-colors ${
                  shown
                    ? 'border-white/10 bg-[#141a40]'
                    : canPick
                    ? 'border-cyan-400/80 bg-[#141a40] hover:bg-cyan-500/20 cursor-pointer'
                    : 'border-white/10 bg-[#101534]'
                }`}
              >
                {/* numero pequeno: mostra qual posicao pedir */}
                <span
                  className={`absolute top-0.5 left-1 font-mono-code text-[8px] md:text-[10px] leading-none ${
                    shown ? 'text-slate-500' : canPick ? 'text-cyan-300' : 'text-slate-500'
                  }`}
                >
                  {i + 1}
                </span>
                {shown ? (
                  <span
                    className={`font-anton text-base md:text-xl text-white uppercase tracking-wide border-b-2 ${
                      rsp.revealed[i] ? 'border-[#17B8B8]' : 'border-transparent'
                    }`}
                  >
                    {w}
                  </span>
                ) : (
                  <span className="inline-block w-8 md:w-12 h-[3px] bg-[#F5F2EB]/90 align-middle" />
                )}
                {last && <span className="absolute -right-0.5 -bottom-0.5 font-anton text-lg text-white leading-none">?</span>}
              </button>
            );
          })}
        </div>

        <div
          data-testid="rsp-counter"
          className="order-2 sm:order-none flex items-center justify-center px-3 border-l-2 border-[#E6194B]/80 font-anton text-xl md:text-3xl text-[#17B8B8] tracking-wide min-w-[4.5rem]"
        >
          {rsp.revealed.filter(Boolean).length}/{rsp.words.length}
        </div>
      </div>
    </div>
  );
};
