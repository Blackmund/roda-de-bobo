import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Eye, EyeOff, Info, Lock, XCircle } from 'lucide-react';
import { EstadiosGameState, GameRoom } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { estadiosCluesShown, estadiosValue, giveUpEstadio, judgeEstadio, pontinhoDetalhe } from '../../utils/estadiosEngine';
import { PlayerMark } from '../rdb/PlayerMark';

interface ScreenPontinhosProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdatePontinhosState: (updater: (prev: EstadiosGameState) => EstadiosGameState) => void;
  onNextRound: () => void;
}

/** Jogo dos Pontinhos: descubra a resposta com dicas em etapas; cada erro libera mais uma e tira 1 ponto. */
export const ScreenPontinhos: React.FC<ScreenPontinhosProps> = ({ room, onUpdatePontinhosState, onNextRound }) => {
  const est = room.pontinhos;
  if (!est) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando...</div>;
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
    onUpdatePontinhosState((prev) => ({ ...prev, phase: 'PLAYING' }));
  };
  const judge = (correct: boolean) => {
    if (correct) sounds.playSuccess();
    else sounds.playBuzzer();
    onUpdatePontinhosState((prev) => {
      const next = judgeEstadio(prev, correct, playerIds);
      if (next.winnerPlayerId) confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const toggleAnswer = () => {
    sounds.playTick();
    onUpdatePontinhosState((prev) => ({ ...prev, answerVisible: !prev.answerVisible }));
  };
  const giveUp = () => {
    sounds.playFlip();
    onUpdatePontinhosState((prev) => giveUpEstadio(prev));
  };

  return (
    <div data-testid="pon-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Pontinhos
          <span className="rdb-lim-round">
            {Math.min(room.roundNumber, room.maxRounds)}/{room.maxRounds}
          </span>
          {isShow && (
            <span className="rdb-nota-scale" data-testid="pon-show-ruleset-chip" data-tip="Regras do programa: 5, 4, 3, 2, 1 pontos">
              5-4-3-2-1
            </span>
          )}
        </span>
        <span className="rdb-lim-rule" tabIndex={0} data-tip="Descubra a resposta. Começa só com a dica 1; cada erro libera mais uma dica, passa a vez e tira 1 ponto do valor.">
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="pon-value" className="rdb-lim-timer" data-tip="Quanto vale acertar agora">
            Vale {done && !est.winnerPlayerId ? 0 : value}
          </span>
          <button
            type="button"
            data-testid="pon-toggle-answer-btn"
            className={'rdb-lim-icon' + (est.answerVisible ? ' is-on' : '')}
            aria-pressed={est.answerVisible}
            aria-label="Resposta do diretor"
            data-tip={est.answerVisible ? 'Esconder a resposta' : 'Mostrar a resposta (só o diretor)'}
            onClick={toggleAnswer}
          >
            {est.answerVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </header>

      {est.tema && (
        <div className="rdb-pon-tema" data-testid="pon-tema">
          <span className="rdb-tag">Tema</span>
          <strong>{est.tema}</strong>
        </div>
      )}

      {est.answerVisible && (
        <div data-testid="pon-answer" className="rdb-pro-note">
          <strong>{est.nome}</strong>
          {pontinhoDetalhe(est) && <> · {pontinhoDetalhe(est)}</>}
        </div>
      )}

      {est.foto && (
        <div className="rdb-est-photo">
          <img src={est.foto} alt={done ? est.nome : 'Foto misteriosa'} />
        </div>
      )}

      {/* Pistas: so aparecem as liberadas pelos erros */}
      <div className="rdb-est-clues" data-testid="pon-clues">
        {est.pistas.map((p, i) => {
          const visible = i < shown;
          return (
            <div key={i} data-testid={`pon-clue-${i}`} className={'rdb-est-clue' + (visible ? ' is-open' : '')}>
              <span className="rdb-est-clue-n">{i + 1}</span>
              {visible ? <span className="rdb-est-clue-text">{p}</span> : <Lock size={18} aria-label="Dica bloqueada" />}
            </div>
          );
        })}
      </div>

      {est.phase === 'READY' && (
        <section className="rdb-pro-ready">
          <p>Quem acerta de primeira leva 5 pontos. Cada erro libera mais uma dica, passa a vez e tira 1 ponto.</p>
          <button type="button" data-testid="pon-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
            Começar
          </button>
        </section>
      )}

      {est.phase === 'PLAYING' && (
        <footer className="rdb-pro-foot">
          <span className="rdb-est-attempts">
            {est.attempts.length > 0 ? `${est.attempts.length} erro(s)` : 'Primeira tentativa'}
          </span>
          <button type="button" data-testid="pon-right-btn" className="rdb-btn rdb-pro-hit" onClick={() => judge(true)}>
            <Check size={20} strokeWidth={3} /> Acertou (+{value})
          </button>
          <button type="button" data-testid="pon-wrong-btn" className="rdb-btn rdb-tem-strike" onClick={() => judge(false)}>
            <XCircle /> Errou
          </button>
          <div className="rdb-pro-foot-end">
            <button type="button" data-testid="pon-giveup-btn" className="rdb-btn" onClick={giveUp}>
              Pular
            </button>
          </div>
        </footer>
      )}

      {done && (
        <section data-testid="pon-summary" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Fim da rodada</span>
            <h2>
              {est.winnerPlayerId ? (
                <>
                  {nameOf(est.winnerPlayerId)} <small>acertou! +{est.pointsAwarded[est.winnerPlayerId]} pontos</small>
                </>
              ) : (
                'Ninguém acertou'
              )}
            </h2>
            <p>
              <strong>{est.nome}</strong>
              {pontinhoDetalhe(est) && <> · {pontinhoDetalhe(est)}</>}
            </p>
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="pon-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
