import React from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Eye, EyeOff, Info, X } from 'lucide-react';
import type { GameRoom, GeoGuessGameState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import {
  GEO_PERGUNTA_TEXTO,
  GEO_TILE_SOURCE,
  geoLocalTurn,
  geoPlayersWithGuess,
  geoSolved,
  geoValue,
  geoValueAt,
  judgeGeoGuess,
  nextGeoStage,
  pendingGeoGuesses,
  revealGeo,
  submitGeoGuess
} from '../../utils/geoguessEngine';
import { PlayerMark } from '../rdb/PlayerMark';
import { SatView } from '../geoguess/SatView';
import { GeoClueView, useGeoPhotos } from '../geoguess/GeoClueView';

interface ScreenGeoGuessProps {
  room: GameRoom;
  onUpdateGeoState: (updater: (prev: GeoGuessGameState) => GeoGuessGameState) => void;
  onNextRound: () => void;
}

const ETAPA_NOME = ['Detalhe', 'Outro ângulo', 'Nova pista', 'Contexto', 'Vista geral'];

/**
 * GeoGuess na TV: a dica, a imagem da etapa, quem ja chutou (ou os palpites) e o julgamento do diretor.
 * Cinco pistas visuais sobre o mesmo lugar, valendo 5, 4, 3, 2 e 1 ponto.
 */
export const ScreenGeoGuess: React.FC<ScreenGeoGuessProps> = ({ room, onUpdateGeoState, onNextRound }) => {
  const g = room.geoguess;
  const { photos, loading } = useGeoPhotos(g?.localId);
  const [usingPhoto, setUsingPhoto] = React.useState(false);
  if (!g) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando lugar...</div>;
  }
  const players = room.players;
  const ids = players.map((p) => p.id);
  const total = g.etapas.length;
  const value = geoValue(g);
  const reveal = g.phase === 'REVEAL';
  const guessed = geoPlayersWithGuess(g, players);
  const isLast = g.stage >= total - 1;
  const localPlay = (room.connectionMode || room.customConfig?.connectionMode || 'local') === 'local';
  const turnId = localPlay ? geoLocalTurn(g, players) : undefined;
  const turn = players.find(player => player.id === turnId);
  const localReview = localPlay && g.phase === 'PLAYING' && !turnId;
  const waitingForJudgment = localReview && pendingGeoGuesses(g).length > 0;

  const sendLocalGuess = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get('guess') || '').trim();
    if (!turnId || !text) return;
    sounds.playTick();
    onUpdateGeoState(prev => prev.localId === g.localId && prev.stage === g.stage && geoLocalTurn(prev, players) === turnId
      ? submitGeoGuess(prev, turnId, text)
      : prev);
  };

  const passLocalTurn = () => {
    if (!turnId) return;
    onUpdateGeoState(prev => prev.localId === g.localId && prev.stage === g.stage && geoLocalTurn(prev, players) === turnId
      ? judgeGeoGuess(prev, turnId, false, ids)
      : prev);
  };

  const start = () => {
    sounds.playPowerup();
    onUpdateGeoState((prev) => ({ ...prev, phase: 'PLAYING' }));
  };
  const judge = (pid: string, correct: boolean) => {
    if (correct) sounds.playSuccess();
    else sounds.playBuzzer();
    onUpdateGeoState((prev) => {
      const next = judgeGeoGuess(prev, pid, correct, ids);
      if (next.phase === 'REVEAL') confetti({ particleCount: 70, spread: 60 });
      return next;
    });
  };
  const advance = () => {
    sounds.playFlip();
    onUpdateGeoState((prev) => nextGeoStage(prev));
  };
  const doReveal = () => {
    sounds.playPowerup();
    onUpdateGeoState((prev) => revealGeo(prev));
  };
  const toggle = (key: 'showGuesses' | 'answerVisible') => {
    sounds.playTick();
    onUpdateGeoState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div data-testid="geo-screen" className={'rdb-pro rdb-geo' + (reveal ? ' is-reveal' : '')}>
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          GeoGuess
          <span className="rdb-lim-round">
            {Math.min(room.roundNumber, room.maxRounds)}/{room.maxRounds}
          </span>
          <span className="rdb-nota-scale" data-tip="Acertou na 1ª imagem: 5 pontos; na 2ª: 4; e assim por diante">
            5-4-3-2-1
          </span>
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip={localPlay ? 'Cada jogador digita na sua vez. Depois dos palpites, marque os acertos.' : 'Todos chutam pelo celular. Abra os palpites e marque quem acertou.'}
        >
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          {g.phase === 'PLAYING' && (
            <span data-testid="geo-value" className="rdb-lim-timer" data-tip="Quanto vale acertar nesta imagem">
              Vale {value}
            </span>
          )}
          <button
            type="button"
            data-testid="geo-toggle-answer-btn"
            className={'rdb-lim-icon' + (g.answerVisible ? ' is-on' : '')}
            aria-pressed={g.answerVisible}
            aria-label="Resposta do diretor"
            data-tip={g.answerVisible ? 'Esconder a resposta' : 'Mostrar a resposta (só o diretor)'}
            onClick={() => toggle('answerVisible')}
          >
            {g.answerVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </header>

      {g.answerVisible && !reveal && (
        <div data-testid="geo-answer" className="rdb-pro-note">
          <strong>{g.nome}</strong> · {g.lugar}
        </div>
      )}

      <div className="rdb-geo-body">
        {/* PALCO: dica + imagem da etapa (ou a revelacao) */}
        <section className="rdb-geo-stage" data-testid="geo-stage">
          {reveal ? (
            <div className="rdb-geo-reveal" data-testid="geo-reveal">
              <h2>{g.nome}</h2>
              <p>{g.lugar}</p>
              <div className="rdb-geo-reveal-photo">
                <SatView lat={g.lat} lon={g.lon} etapa={g.revelacao} label={`Foto aérea: ${g.nome}`} />
              </div>
            </div>
          ) : (
            <>
              <div className="rdb-geo-hint">
                {g.phase === 'PLAYING' && g.stage >= 2 && <>
                  <span className="rdb-tag">Dica</span>
                  <strong data-testid="geo-dica">{g.dica}</strong>
                </>}
                <span className="rdb-geo-q">{GEO_PERGUNTA_TEXTO[g.pergunta]}</span>
              </div>
              {g.phase === 'READY' ? (
                <div className="rdb-geo-ready">
                  <p>
                    Cinco pistas visuais sobre o mesmo lugar. Quanto antes acertar, mais pontos.
                  </p>
                  <button type="button" data-testid="geo-start-btn" className="rdb-btn rdb-setup-start" onClick={start} disabled={loading}>
                    {loading ? 'Preparando imagens…' : 'Mostrar a 1ª imagem'}
                  </button>
                </div>
              ) : (
                <div className="rdb-geo-frame">
                  {loading ? <div className="rdb-geo-photo is-loading" role="status">Preparando imagens…</div> : <GeoClueView
                    key={`${g.localId}:${g.stage}`}
                    lat={g.lat}
                    lon={g.lon}
                    etapa={g.etapas[g.stage]}
                    prefetch={isLast ? g.revelacao : g.etapas[g.stage + 1]}
                    photo={photos[g.stage]}
                    stage={g.stage}
                    nextPhoto={photos[g.stage + 1]}
                    onSourceChange={setUsingPhoto}
                    label={`Imagem ${g.stage + 1} de ${total}`}
                  />}
                  <ol className="rdb-geo-pips" aria-label={`Imagem ${g.stage + 1} de ${total}`}>
                    {g.etapas.map((_, i) => (
                      <li key={i} className={i < g.stage ? 'is-past' : i === g.stage ? 'is-now' : ''}>
                        <b>{i + 1}</b>
                        {i === g.stage && <span>{ETAPA_NOME[i] || 'Imagem'}</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
          {(reveal || (g.phase === 'PLAYING' && !usingPhoto)) && <small className="rdb-geo-credit">{GEO_TILE_SOURCE.attribution}</small>}
          {reveal && photos.some(Boolean) && (
            <details className="rdb-geo-photo-credits">
              <summary>Fontes das fotos recortadas</summary>
              {photos.map((photo, index) => photo && (
                <a key={photo.source} href={photo.source} target="_blank" rel="noreferrer"
                  title={`${photo.author} · ${photo.license}`}>Foto {index + 1} · {photo.author} · {photo.license}</a>
              ))}
            </details>
          )}
        </section>

        {/* JOGADORES: quem chutou, palpites e o julgamento */}
        <aside className="rdb-geo-side" data-testid="geo-players">
          <div className="rdb-geo-side-head">
            <span>Palpites</span>
            {g.phase === 'PLAYING' && (
              <span data-testid="geo-guess-count">
                {guessed}/{players.length} chutaram
              </span>
            )}
          </div>
          {turn && (
            <form key={`${room.roundNumber}:${g.stage}:${turn.id}`} className="rdb-geo-turn" onSubmit={sendLocalGuess}>
              <label htmlFor="geo-local-guess" aria-live="polite">Vez de <strong>{turn.name}</strong></label>
              <input id="geo-local-guess" name="guess" data-testid="geo-local-input" placeholder="Digite seu palpite"
                maxLength={60} autoFocus autoComplete="off" enterKeyHint="send" required />
              <div className="rdb-geo-turn-actions">
                <button className="rdb-btn rdb-pro-hit" type="submit">Enviar palpite</button>
                <button className="rdb-btn" type="button" onClick={passLocalTurn}>Passar</button>
              </div>
            </form>
          )}
          {waitingForJudgment && <p className="rdb-geo-judge-note">Marque quem acertou antes da próxima imagem.</p>}
          <ul>
            {players.map((p) => {
              const solved = geoSolved(g, p.id);
              const guess = g.guesses[p.id];
              const now = guess && guess.stage === g.stage ? guess : undefined;
              const wrongNow = now?.verdict === 'wrong';
              const canJudge = g.phase === 'PLAYING' && !solved && !wrongNow && (!localPlay || (localReview && !!now));
              const showText = reveal || localReview || g.showGuesses || solved || wrongNow;
              return (
                <li
                  key={p.id}
                  data-testid={`geo-row-${p.id}`}
                  aria-current={turnId === p.id ? 'true' : undefined}
                  className={'rdb-geo-row' + (solved ? ' is-right' : wrongNow ? ' is-wrong' : now ? ' is-sent' : '') +
                    (turnId === p.id ? ' is-current' : turnId ? ' is-waiting' : '')}
                >
                  <PlayerMark p={p} />
                  <div className="rdb-geo-row-main">
                    <span className="rdb-geo-row-name">{p.name}</span>
                    <span className="rdb-geo-row-guess" data-testid={`geo-guess-${p.id}`}>
                      {solved
                        ? `Acertou na ${g.solvedAt[p.id] + 1}ª${guess?.text ? ': ' + guess.text : ''}`
                        : now
                        ? showText
                          ? (localPlay && wrongNow && !now.text ? 'Passou' : (wrongNow ? 'Errou: ' : '') + (now.text || 'chute falado'))
                          : 'Já chutou'
                        : reveal
                        ? 'Não acertou'
                        : turnId === p.id ? 'Sua vez' : turnId ? 'Aguardando' : 'Pensando...'}
                    </span>
                  </div>
                  {solved ? (
                    <span className="rdb-geo-pts">+{g.pointsAwarded[p.id] ?? geoValueAt(g, g.solvedAt[p.id])}</span>
                  ) : canJudge ? (
                    <span className="rdb-geo-judge">
                      <button
                        type="button"
                        data-testid={`geo-right-${p.id}`}
                        aria-label={`${p.name} acertou`}
                        className={'rdb-geo-jbtn is-right' + (now ? '' : ' is-quiet')}
                        onClick={() => judge(p.id, true)}
                      >
                        <Check size={18} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        data-testid={`geo-wrong-${p.id}`}
                        aria-label={`${p.name} errou`}
                        className={'rdb-geo-jbtn is-wrong' + (now ? '' : ' is-quiet')}
                        onClick={() => judge(p.id, false)}
                      >
                        <X size={18} strokeWidth={3} />
                      </button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {g.phase === 'PLAYING' && (
        <footer className="rdb-pro-foot">
          <button
            type="button"
            data-testid="geo-show-guesses-btn"
            className={'rdb-btn' + (g.showGuesses ? ' rdb-btn--solid' : '')}
            aria-pressed={g.showGuesses}
            onClick={() => toggle('showGuesses')}
          >
            {g.showGuesses ? <EyeOff size={18} /> : <Eye size={18} />}
            {g.showGuesses ? 'Esconder palpites' : 'Mostrar palpites'}
          </button>
          <div className="rdb-pro-foot-end">
            <button type="button" data-testid="geo-reveal-btn" className="rdb-btn" onClick={doReveal}>
              Revelar
            </button>
            <button type="button" data-testid="geo-next-btn" className="rdb-btn rdb-pro-hit" onClick={advance} disabled={Boolean(turnId || waitingForJudgment)}>
              {isLast ? 'Revelar o lugar' : `Próxima imagem (vale ${geoValueAt(g, g.stage + 1)})`}
              <ArrowRight size={18} />
            </button>
          </div>
        </footer>
      )}

      {reveal && (
        <footer className="rdb-pro-foot">
          <span className="rdb-est-attempts" data-testid="geo-summary">
            {Object.keys(g.solvedAt).length === 0
              ? 'Ninguém acertou'
              : Object.keys(g.solvedAt).length === 1
              ? '1 acertou'
              : `${Object.keys(g.solvedAt).length} acertaram`}
          </span>
          <div className="rdb-pro-foot-end">
            <button type="button" data-testid="geo-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
