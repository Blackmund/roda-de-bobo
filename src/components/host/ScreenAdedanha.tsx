import React, { useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, Hand, Info, Infinity, Play, ThumbsDown, ThumbsUp, X as XIcon } from 'lucide-react';
import type { AdedanhaState, GameRoom } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import {
  categoryResult,
  nextCategory,
  prevCategory,
  secondsLeft,
  setOverride,
  startWriting,
  stopVotesCount,
  voteKey
} from '../../utils/adedanhaEngine';
import { useAdedanhaDriver, useLetterSpin, useNow } from '../adedanha/useAdedanhaDriver';
import { PlayerMark } from '../rdb/PlayerMark';
import { LetterDrawOverlay } from '../adedanha/LetterDrawOverlay';

interface ScreenAdedanhaProps {
  room: GameRoom;
  onUpdateAdedanhaState: (updater: (prev: AdedanhaState) => AdedanhaState) => void;
  onNextRound: () => void;
}

const VERDICT_TIP: Record<string, string> = {
  empty: 'Sem resposta',
  'wrong-letter': 'Não começa com a letra',
  'voted-out': 'A mesa recusou',
  valid: 'Vale'
};

export const ScreenAdedanha: React.FC<ScreenAdedanhaProps> = ({ room, onUpdateAdedanhaState, onNextRound }) => {
  const ad = room.adedanha;
  const update = useCallback(
    (updater: (prev: AdedanhaState) => AdedanhaState) => onUpdateAdedanhaState(updater),
    [onUpdateAdedanhaState]
  );
  // No modo so celulares quem roda o relogio e o celular do lider; aqui so na TV.
  useAdedanhaDriver(ad, update, room.connectionMode !== 'multi');
  const now = useNow(ad?.phase === 'WRITING' || ad?.phase === 'STOPPING');
  const spin = useLetterSpin(ad);

  if (!ad) return null;

  const playerOf = (id: string) => room.players.find((p) => p.id === id);
  const nameOf = (id: string) => playerOf(id)?.name || '—';
  const left = secondsLeft(ad, now);
  const clock = ad.timerSeconds === 0 && ad.phase === 'WRITING' ? 'Livre' : left === null ? '—' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const clockHot = left !== null && left <= 10;

  const start = () => {
    sounds.playPowerup();
    update((prev) => startWriting(prev));
  };

  const bar = (
    <header className="rdb-lim-bar">
      <span className="rdb-lim-title">
        Adedanha
        <span className="rdb-lim-round">Rodada {room.roundNumber}</span>
      </span>
      <span
        className="rdb-lim-rule"
        tabIndex={0}
        data-tip="Cada um escreve, no celular, uma palavra com a letra para cada categoria. Quem preencher tudo aperta STOP. Resposta só sua vale 10, repetida 5, inválida 0."
      >
        <Info size={16} />
      </span>
      <div className="rdb-lim-tools">
        {(ad.phase === 'WRITING' || ad.phase === 'STOPPING') && (
          <span data-testid="ad-timer" className={'rdb-lim-timer' + (clockHot ? ' is-hot' : '')} data-tip={ad.phase === 'STOPPING' ? 'Tempo para mandar as respostas' : 'Tempo da rodada'}>
            {ad.timerSeconds === 0 && ad.phase === 'WRITING' ? <Infinity size={16} /> : <Clock size={16} />}
            {clock}
          </span>
        )}
        {ad.phase === 'WRITING' && (
          <button
            type="button"
            data-testid="ad-force-stop"
            className="rdb-lim-icon"
            aria-label="Parar a rodada"
            data-tip="Parar a rodada agora (STOP do diretor)"
            onClick={() => {
              sounds.playBuzzer();
              update((prev) => (prev.phase === 'WRITING' ? { ...prev, phase: 'STOPPING', stopBy: null, stopAt: Date.now() } : prev));
            }}
          >
            <Hand size={16} />
          </button>
        )}
      </div>
    </header>
  );

  // ---------------- Escrevendo ----------------
  if (ad.phase === 'READY' || ad.phase === 'WRITING' || ad.phase === 'STOPPING') {
    const sent = ad.playerIds.filter((id) => ad.submitted[id]).length;
    return (
      <div data-testid="screen-adedanha" className="rdb-pro rdb-ade">
        {bar}
        <LetterDrawOverlay letter={spin.letter} spinning={spin.spinning} />
        <div className="rdb-ade-stage">
          <div className={'rdb-ade-letter' + (ad.phase === 'READY' ? ' is-hidden' : '') + (spin.spinning ? ' is-waiting' : '')} data-testid="ad-letter">
            {ad.phase === 'READY' || spin.spinning ? '?' : <span key={ad.letter}>{ad.letter}</span>}
          </div>
          <div className="rdb-ade-cats" data-tip={`${ad.categories.length} categorias`}>
            {ad.categories.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        </div>

        {ad.phase === 'STOPPING' && (
          <div data-testid="ad-stop-banner" className="rdb-ade-stop">
            <strong>STOP!</strong>
            <span>
              {ad.stopBy ? `${nameOf(ad.stopBy)} terminou` : 'Acabou o tempo'} · mandem as respostas
            </span>
          </div>
        )}

        <div className="rdb-ade-players">
          {ad.playerIds.map((id) => {
            const p = playerOf(id);
            const done = ad.submitted[id];
            return (
              <div key={id} className={'rdb-ade-player' + (done ? ' is-done' : '') + (ad.stopBy === id ? ' is-stop' : '')}>
                {p && <PlayerMark p={p} />}
                <span className="rdb-ade-player-name">{nameOf(id)}</span>
                <span className="rdb-ade-player-state">
                  {ad.stopBy === id ? 'STOP' : done ? <Check size={16} strokeWidth={3} /> : ad.phase === 'READY' ? '' : '…'}
                </span>
              </div>
            );
          })}
        </div>

        <footer className="rdb-pro-foot">
          {ad.phase === 'READY' ? (
            <>
              <span className="rdb-ade-hint">
                {room.connectionMode === 'local'
                  ? 'Cada jogador entra pelo celular (QR no topo) para escrever as respostas.'
                  : 'Os celulares mostram as categorias assim que a letra sair.'}
              </span>
              <div className="rdb-pro-foot-end">
                <button type="button" data-testid="ad-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
                  <Play /> Sortear a letra e começar
                </button>
              </div>
            </>
          ) : (
            <span className="rdb-ade-hint">
              {sent}/{ad.playerIds.length} mandaram as respostas
              {ad.stopRule === 'majority' && ad.phase === 'WRITING'
                ? ` · STOP pedido por ${stopVotesCount(ad)} de ${ad.playerIds.length} (precisa da maioria)`
                : ad.stopRule === 'host'
                ? ' · só o diretor pede STOP (mão na barra)'
                : ad.stopRule === 'none'
                ? ' · a rodada para quando o tempo acabar'
                : ''}
            </span>
          )}
        </footer>
      </div>
    );
  }

  // ---------------- Validacao ----------------
  if (ad.phase === 'VOTING') {
    const i = ad.voteIndex;
    const cells = categoryResult(ad, i);
    const last = i + 1 >= ad.categories.length;
    return (
      <div data-testid="screen-adedanha" className="rdb-pro rdb-ade">
        {bar}
        <div className="rdb-ade-vote-head">
          <span className="rdb-ade-letter is-small">{ad.letter}</span>
          <div>
            <span className="rdb-ade-step">
              Categoria {i + 1} de {ad.categories.length}
            </span>
            <h2 data-testid="ad-vote-category">{ad.categories[i]}</h2>
          </div>
        </div>
        <div className="rdb-ade-answers">
          {cells.map((c) => {
            const k = voteKey(i, c.playerId);
            const votes = Object.values(ad.votes[k] || {});
            const yes = votes.filter(Boolean).length;
            const no = votes.length - yes;
            const forced = k in ad.overrides;
            const state = c.verdict === 'valid' ? (c.repeated ? 'is-rep' : 'is-ok') : 'is-bad';
            return (
              <div key={c.playerId} data-testid={`ad-answer-${c.playerId}`} className={'rdb-ade-answer ' + state}>
                <span className="rdb-ade-answer-who">{nameOf(c.playerId)}</span>
                <strong className="rdb-ade-answer-text">{c.answer || '—'}</strong>
                <span className="rdb-ade-answer-foot">
                  <span data-tip={VERDICT_TIP[c.verdict] + (c.repeated ? ' · repetida' : '')}>
                    {c.points > 0 ? `+${c.points}` : '0'}
                  </span>
                  {c.answer && (
                    <span className="rdb-ade-votes" data-tip="Votos da mesa">
                      <ThumbsUp size={14} /> {yes} <ThumbsDown size={14} /> {no}
                    </span>
                  )}
                  <span className="rdb-ade-judge">
                    <button
                      type="button"
                      aria-label="Diretor: vale"
                      data-tip="Diretor: vale"
                      className={forced && ad.overrides[k] ? 'is-on' : ''}
                      onClick={() => update((prev) => setOverride(prev, i, c.playerId, forced && prev.overrides[k] ? null : true))}
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      aria-label="Diretor: não vale"
                      data-tip="Diretor: não vale"
                      className={forced && !ad.overrides[k] ? 'is-on is-no' : ''}
                      onClick={() => update((prev) => setOverride(prev, i, c.playerId, forced && !prev.overrides[k] ? null : false))}
                    >
                      <XIcon size={14} strokeWidth={3} />
                    </button>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <footer className="rdb-pro-foot">
          <button type="button" className="rdb-btn" disabled={i === 0} onClick={() => update((prev) => prevCategory(prev))}>
            <ArrowLeft /> Anterior
          </button>
          <span className="rdb-ade-hint">Os celulares votam se cada resposta vale. Empate: vale.</span>
          <div className="rdb-pro-foot-end">
            <button
              type="button"
              data-testid="ad-next-category"
              className="rdb-btn rdb-pro-hit"
              onClick={() => {
                sounds.playTick();
                update((prev) => nextCategory(prev));
              }}
            >
              {last ? 'Ver resultado' : 'Próxima categoria'} <ArrowRight />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // ---------------- Resultado ----------------
  const pts = ad.pointsAwarded || {};
  const ranking = [...ad.playerIds].sort((a, b) => (pts[b] || 0) - (pts[a] || 0));
  return (
    <div data-testid="screen-adedanha" className="rdb-pro rdb-ade">
      {bar}
      <section data-testid="ad-summary" className="rdb-pro-sum">
        <div className="rdb-pro-sum-head">
          <span className="rdb-lim-round">Letra {ad.letter}</span>
          <h2>Resultado da rodada</h2>
        </div>
        <div className="rdb-ade-table" style={{ ['--cols' as string]: ad.categories.length }}>
          <div className="rdb-ade-row is-head">
            <span />
            {ad.categories.map((c) => (
              <span key={c}>{c}</span>
            ))}
            <span>Pts</span>
          </div>
          {ranking.map((id) => (
            <div key={id} className="rdb-ade-row">
              <span className="rdb-ade-row-who">{nameOf(id)}</span>
              {ad.categories.map((_, ci) => {
                const cell = categoryResult(ad, ci).find((x) => x.playerId === id);
                return (
                  <span key={ci} title={cell?.answer || undefined} className={cell?.points === 10 ? 'is-ok' : cell?.points === 5 ? 'is-rep' : 'is-bad'}>
                    {cell?.answer || '—'}
                  </span>
                );
              })}
              <strong>{pts[id] || 0}</strong>
            </div>
          ))}
        </div>
        <div className="rdb-pro-sum-foot">
          <span />
          <button type="button" data-testid="ad-next-round" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
            Confirmar pontos e avançar <ArrowRight />
          </button>
        </div>
      </section>
    </div>
  );
};
