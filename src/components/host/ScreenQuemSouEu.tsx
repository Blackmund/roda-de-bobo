import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, CheckCircle2, Eye, EyeOff, HelpCircle, Info, X as XIcon, XCircle } from 'lucide-react';
import { GameRoom, QuemSouEuGameState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import {
  finishQuemSouEuRound,
  recordCorrectGuess,
  recordQuestion,
  recordWrongGuess
} from '../../utils/quemSouEuEngine';
import { PlayerMark } from '../rdb/PlayerMark';

interface ScreenQuemSouEuProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateQuemSouEuState: (updater: (prev: QuemSouEuGameState) => QuemSouEuGameState) => void;
  onNextRound: () => void;
}

/** Foto real do momento com a legenda embaixo; se o link falhar, fica so a legenda. */
const MomentPhoto: React.FC<{ src: string; credit?: string; caption: string }> = ({ src, credit, caption }) => {
  const [failed, setFailed] = React.useState(false);
  return (
    <figure className="rdb-qse-photo">
      {!failed && (
        <img src={src} alt={caption} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
      <figcaption>{caption}</figcaption>
      {!failed && credit && <small>Foto: {credit}</small>}
    </figure>
  );
};

export const ScreenQuemSouEu: React.FC<ScreenQuemSouEuProps> = ({ room, onUpdateQuemSouEuState, onNextRound }) => {
  const qse = room.quemSouEu;
  if (!qse) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada do Quem sou eu...</div>;
  }
  const isShow = isShowRuleset(room.customConfig);
  // NOV-06: o 'Onde estou' usa a mesma dinamica, com grandes momentos do esporte no lugar das identidades.
  const moment = room.activeGame === 'onde-estou';
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name || '—';
  const avatarOf = (id: string) => <PlayerMark p={room.players.find((p) => p.id === id)} />;
  const turn = qse.entries.find((e) => e.playerId === qse.turnPlayerId);
  const left = qse.entries.filter((e) => e.status === 'searching').length;

  const start = () => {
    sounds.playPowerup();
    onUpdateQuemSouEuState((prev) => ({ ...prev, phase: 'PLAYING' }));
  };
  const toggle = () => {
    sounds.playFlip();
    onUpdateQuemSouEuState((prev) => ({ ...prev, identitiesVisible: !prev.identitiesVisible }));
  };
  const question = () => {
    sounds.playTick();
    onUpdateQuemSouEuState((prev) => recordQuestion(prev));
  };
  const wrong = () => {
    sounds.playBuzzer();
    onUpdateQuemSouEuState((prev) => recordWrongGuess(prev));
  };
  const right = () => {
    sounds.playSuccess();
    onUpdateQuemSouEuState((prev) => {
      const next = recordCorrectGuess(prev);
      if (next.phase === 'SUMMARY') confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const finish = () => {
    sounds.playFlip();
    onUpdateQuemSouEuState((prev) => finishQuemSouEuRound(prev));
  };

  const label = moment ? 'momentos' : 'identidades';

  return (
    <div data-testid="qse-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          {moment ? 'Onde estou' : 'Quem sou eu'}
          {isShow && (
            <span data-testid="qse-show-ruleset-chip" className="rdb-nota-scale" data-tip="Regras do programa: os outros só respondem sim ou não">
              sim ou não
            </span>
          )}
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip={
            moment
              ? 'Cada um tem um grande momento na testa: todos veem, menos o dono. Na vez, faça uma pergunta de sim ou não ou chute. Quem descobre primeiro ganha mais pontos.'
              : 'Cada um tem uma identidade na testa: todos veem, menos o dono. Na vez, faça uma pergunta de sim ou não ou chute. Quem descobre primeiro ganha mais pontos.'
          }
        >
          <Info size={16} />
        </span>
        <span className="rdb-qse-left">
          {left} {left === 1 ? 'ainda procura' : 'ainda procuram'}
        </span>
        <div className="rdb-lim-tools">
          <button
            type="button"
            data-testid="qse-toggle-identities-btn"
            className={'rdb-lim-icon' + (qse.identitiesVisible ? ' is-on' : '')}
            aria-pressed={qse.identitiesVisible}
            aria-label={qse.identitiesVisible ? `Ocultar os ${label}` : `Mostrar os ${label}`}
            data-tip={qse.identitiesVisible ? `Ocultar os ${label}` : `Mostrar os ${label} (quem joga não pode olhar!)`}
            onClick={toggle}
          >
            {qse.identitiesVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </header>

      {/* Na testa: a identidade so aparece quando o diretor libera */}
      <div className={'rdb-qse-cards' + (moment ? ' is-moment' : '')}>
        {qse.entries.map((e) => {
          const isTurn = qse.phase === 'PLAYING' && e.playerId === qse.turnPlayerId;
          const showIdentity = qse.identitiesVisible || qse.phase === 'SUMMARY' || e.status === 'found';
          return (
            <div key={e.playerId} data-testid={`qse-card-${e.playerId}`} className={'rdb-qse-card' + (isTurn ? ' is-turn' : '') + (e.status === 'found' ? ' is-found' : '') + (e.status === 'out' ? ' is-out' : '')}>
              <span className="rdb-qse-name">
                {avatarOf(e.playerId)} {nameOf(e.playerId)}
              </span>
              <div data-testid={`qse-identity-${e.playerId}`} className="rdb-qse-identity">
                {showIdentity ? (
                  e.image ? (
                    <MomentPhoto src={e.image} credit={e.imageCredit} caption={e.identity} />
                  ) : (
                    e.identity
                  )
                ) : (
                  <HelpCircle size={40} aria-label="Escondido" />
                )}
              </div>
              <span className="rdb-qse-meta">
                {showIdentity ? e.category + ' · ' : ''}
                {e.status === 'found' ? `${e.foundOrder}º a acertar` : e.status === 'out' ? 'ficou de fora' : `${e.questions}/${qse.maxQuestions} perguntas`}
              </span>
            </div>
          );
        })}
      </div>

      {qse.phase === 'READY' && (
        <section className="rdb-pro-ready">
          <h2>{moment ? 'Um grande momento na testa' : 'Uma identidade na testa'}</h2>
          <p>Todos veem, menos o dono. Os outros só respondem sim ou não. Quem descobre primeiro ganha mais pontos.</p>
          <button type="button" data-testid="qse-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
            Começar
          </button>
        </section>
      )}

      {qse.phase === 'PLAYING' && turn && (
        <>
          <div className="rdb-qse-event">
            {qse.lastEvent && (
              <span data-testid="qse-last-event" className="rdb-pro-note">
                {qse.lastEvent}
              </span>
            )}
          </div>
          <footer className="rdb-pro-foot">
            <button type="button" data-testid="qse-question-btn" className="rdb-btn" onClick={question}>
              <HelpCircle /> Pergunta feita
            </button>
            <button type="button" data-testid="qse-right-btn" className="rdb-btn rdb-pro-hit" onClick={right}>
              <CheckCircle2 /> Chutou e acertou
            </button>
            <button type="button" data-testid="qse-wrong-btn" className="rdb-btn rdb-tem-strike" onClick={wrong}>
              <XCircle /> Chutou e errou
            </button>
            <div className="rdb-pro-foot-end">
              <button type="button" data-testid="qse-finish-btn" className="rdb-btn" onClick={finish}>
                Encerrar rodada
              </button>
            </div>
          </footer>
        </>
      )}

      {qse.phase === 'SUMMARY' && (
        <section data-testid="qse-summary" className="rdb-pro-sum">
          <div className="rdb-pro-sum-head">
            <span className="rdb-lim-round">Fim da rodada</span>
            <h2>{moment ? 'Momentos revelados' : 'Identidades reveladas'}</h2>
          </div>
          <div className="rdb-pro-sum-grid">
            {[...qse.entries]
              .sort((a, b) => (a.foundOrder ?? 99) - (b.foundOrder ?? 99))
              .map((e) => (
                <div key={e.playerId} className={'rdb-pro-sum-card' + (e.status === 'found' ? ' is-hit' : '')}>
                  <span className="rdb-pro-sum-top">
                    <strong>{e.identity}</strong>
                    <span className="rdb-pro-sum-mark">{e.status === 'found' ? <Check size={18} strokeWidth={4} /> : <XIcon size={18} strokeWidth={4} />}</span>
                  </span>
                  <span className="rdb-pro-sum-words">
                    {nameOf(e.playerId)} · {e.status === 'found' ? `${e.foundOrder}º` : 'não descobriu'} · +{qse.pointsAwarded[e.playerId] || 0} pts
                  </span>
                </div>
              ))}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="qse-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
