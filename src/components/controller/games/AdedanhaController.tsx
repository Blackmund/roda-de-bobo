import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Hand, Play, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { AdedanhaState, GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import {
  allFilled,
  playerCanStop,
  requestStop,
  stopVotesCount,
  castVote,
  categoryResult,
  nextCategory,
  prevCategory,
  secondsLeft,
  startWriting,
  startsWithLetter,
  submitAnswers,
  voteKey
} from '../../../utils/adedanhaEngine';
import { useAdedanhaDriver, useLetterSpin, useNow } from '../../adedanha/useAdedanhaDriver';
import { LetterDrawOverlay } from '../../adedanha/LetterDrawOverlay';

interface AdedanhaControllerProps {
  room: GameRoom;
  player: Player;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (content: React.ReactNode) => React.ReactNode;
}

/**
 * Adedanha no celular: escrever as respostas, apertar STOP e votar nas respostas dos outros.
 *
 * O estado da sala e sincronizado inteiro (quem grava por ultimo vence). Para nao perder respostas e votos quando dois
 * celulares gravam ao mesmo tempo, cada celular guarda o que mandou e reenvia se nao enxergar isso na sala.
 */
export const AdedanhaController: React.FC<AdedanhaControllerProps> = ({ room, player, onUpdateRoom, wrapIfMultiMode }) => {
  const ad = room.adedanha;
  const roundKey = `${player.id}-${room.roundNumber}-${ad?.letter}-${ad?.categories.join("|")}`;
  const [drafts, setDrafts] = useState<string[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const sentRef = useRef<string[] | null>(null);

  // rodada nova: limpa tudo
  useEffect(() => {
    setDrafts([]);
    setMyVotes({});
    sentRef.current = null;
  }, [roundKey]);

  const isLeader =
    room.connectionMode === 'multi' &&
    (Boolean(player.isVip) || Boolean(player.isMasterControl) || room.players[0]?.id === player.id);

  const updateAd = useCallback(
    (updater: (prev: AdedanhaState) => AdedanhaState) =>
      onUpdateRoom((prev) => (prev.adedanha ? { ...prev, adedanha: updater(prev.adedanha) } : prev)),
    [onUpdateRoom]
  );
  useAdedanhaDriver(ad, updateAd, isLeader);
  const now = useNow(ad?.phase === 'WRITING' || ad?.phase === 'STOPPING');
  const spin = useLetterSpin(ad);

  const send = useCallback(
    (answers: string[]) => {
      sentRef.current = answers;
      updateAd((prev) => submitAnswers(prev, player.id, answers));
    },
    [updateAd, player.id]
  );

  // STOP de alguem (ou fim do tempo): manda o que escreveu, sem precisar apertar nada
  const phase = ad?.phase;
  useEffect(() => {
    if (phase !== 'STOPPING' || !ad || !ad.playerIds.includes(player.id)) return;
    if (!sentRef.current) send(ad.categories.map((_, i) => drafts[i] || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Reenvio: se a sala nao mostra o que este celular mandou (outro celular gravou por cima), manda de novo.
  const roomAnswers = ad?.answers[player.id];
  useEffect(() => {
    if (!ad || !sentRef.current || (phase !== 'STOPPING' && phase !== 'VOTING')) return;
    const same = roomAnswers && roomAnswers.join('\u0001') === sentRef.current.join('\u0001');
    if (same) return;
    // na validacao a resposta nao muda mais: so repoe se tiver sumido de vez
    if (phase === 'VOTING' && roomAnswers) return;
    const t = window.setTimeout(() => {
      onUpdateRoom((prev) => {
        if (!prev.adedanha) return prev;
        const a = prev.adedanha;
        return { ...prev, adedanha: { ...a, answers: { ...a.answers, [player.id]: sentRef.current! }, submitted: { ...a.submitted, [player.id]: true } } };
      });
    }, 400 + Math.random() * 900);
    return () => window.clearTimeout(t);
  }, [ad, phase, roomAnswers, onUpdateRoom, player.id]);

  // Mesmo cuidado com os votos
  useEffect(() => {
    if (!ad || phase !== 'VOTING') return;
    const missing = Object.entries(myVotes).filter(([k, v]) => ad.votes[k]?.[player.id] !== v);
    if (missing.length === 0) return;
    const t = window.setTimeout(() => {
      onUpdateRoom((prev) => {
        if (!prev.adedanha) return prev;
        const votes = { ...prev.adedanha.votes };
        missing.forEach(([k, v]) => (votes[k] = { ...(votes[k] || {}), [player.id]: v }));
        return { ...prev, adedanha: { ...prev.adedanha, votes } };
      });
    }, 500 + Math.random() * 900);
    return () => window.clearTimeout(t);
  }, [ad, phase, myVotes, onUpdateRoom, player.id]);

  if (!ad) return null;

  const playing = ad.playerIds.includes(player.id);
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name || '—';
  const left = secondsLeft(ad, now);

  let body: React.ReactNode;

  if (ad.phase === 'READY') {
    body = (
      <div className="rdb-adc-center">
        <span className="rdb-adc-kicker">Adedanha</span>
        <h2>Prepare-se</h2>
        <p>{ad.categories.length} categorias: {ad.categories.join(', ')}</p>
        <p className="rdb-adc-muted">A letra vai ser sorteada em instantes.</p>
      </div>
    );
  } else if (ad.phase === 'WRITING' || ad.phase === 'STOPPING') {
    const values = ad.categories.map((_, i) => drafts[i] || '');
    const full = allFilled(ad, values);
    const locked = ad.phase === 'STOPPING';
    body = (
      <>
        <div className="rdb-adc-top">
          <span className={'rdb-adc-letter' + (spin.spinning ? ' is-spin' : '')} data-testid="adc-letter">
            <span key={spin.letter + spin.spinning}>{spin.letter}</span>
          </span>
          <span className={'rdb-adc-time' + (left !== null && left <= 10 ? ' is-hot' : '')}>
            {locked ? `STOP! ${left ?? 0}s` : left === null ? 'Sem tempo' : `${left}s`}
          </span>
        </div>
        {!playing ? (
          <p className="rdb-adc-muted">Você está assistindo esta rodada.</p>
        ) : (
          <div className="rdb-adc-fields">
            {ad.categories.map((c, i) => {
              const v = values[i];
              const bad = v.trim().length > 0 && !startsWithLetter(v, ad.letter);
              return (
                <label key={c} className={'rdb-adc-field' + (bad ? ' is-bad' : v.trim() ? ' is-ok' : '')}>
                  <span>{c}</span>
                  <input
                    data-testid={`adc-input-${i}`}
                    value={v}
                    disabled={locked || spin.spinning}
                    autoComplete="off"
                    autoCapitalize="words"
                    placeholder={`${ad.letter}…`}
                    onChange={(e) => {
                      const next = [...values];
                      next[i] = e.target.value;
                      setDrafts(next);
                    }}
                  />
                </label>
              );
            })}
          </div>
        )}
        {playing && !locked && playerCanStop(ad) && (
          <button
            type="button"
            data-testid="adc-stop"
            className="rdb-adc-stop"
            disabled={!full || Boolean(ad.stopVotes?.[player.id])}
            onClick={() => {
              sounds.playBuzzer();
              sentRef.current = values;
              updateAd((prev) => requestStop(submitAnswers(prev, player.id, values), player.id));
            }}
          >
            <Hand size={20} />{' '}
            {!full
              ? `Preencha tudo para o STOP (${values.filter((x) => x.trim()).length}/${ad.categories.length})`
              : ad.stopRule === 'majority'
              ? ad.stopVotes?.[player.id]
                ? `STOP pedido · ${stopVotesCount(ad)}/${ad.playerIds.length}`
                : `Pedir STOP (${stopVotesCount(ad)}/${ad.playerIds.length})`
              : 'STOP!'}
          </button>
        )}
        {playing && !locked && !playerCanStop(ad) && (
          <p className="rdb-adc-muted">{ad.stopRule === 'host' ? 'Só o diretor pode pedir STOP nesta partida.' : 'A rodada para quando o tempo acabar.'}</p>
        )}
        {locked && (
          <p className="rdb-adc-muted" data-testid="adc-sent">
            {ad.submitted[player.id] ? 'Respostas enviadas. Agora a mesa valida.' : 'Enviando suas respostas…'}
          </p>
        )}
      </>
    );
  } else if (ad.phase === 'VOTING') {
    const i = ad.voteIndex;
    const cells = categoryResult(ad, i);
    body = (
      <>
        <div className="rdb-adc-top">
          <span className="rdb-adc-letter is-small">{ad.letter}</span>
          <div className="rdb-adc-cat">
            <span>
              Categoria {i + 1}/{ad.categories.length}
            </span>
            <strong data-testid="adc-vote-category">{ad.categories[i]}</strong>
          </div>
        </div>
        <p className="rdb-adc-muted">Vale ou não vale? Vote nas respostas dos outros.</p>
        <div className="rdb-adc-votes">
          {cells.map((c) => {
            const mine = c.playerId === player.id;
            const k = voteKey(i, c.playerId);
            const my = myVotes[k] ?? ad.votes[k]?.[player.id];
            return (
              <div key={c.playerId} className={'rdb-adc-vote' + (mine ? ' is-mine' : '')}>
                <span className="rdb-adc-vote-who">{mine ? 'Você' : nameOf(c.playerId)}</span>
                <strong>{c.answer || '—'}</strong>
                {!mine && c.answer && c.verdict !== 'wrong-letter' && playing && (
                  <span className="rdb-adc-vote-btns">
                    {([true, false] as const).map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        data-testid={`adc-vote-${c.playerId}-${val ? 'sim' : 'nao'}`}
                        aria-label={val ? 'Vale' : 'Não vale'}
                        className={my === val ? (val ? 'is-yes' : 'is-no') : ''}
                        onClick={() => {
                          sounds.playTick();
                          setMyVotes((prev) => ({ ...prev, [k]: val }));
                          updateAd((prev) => castVote(prev, i, c.playerId, player.id, val));
                        }}
                      >
                        {val ? <ThumbsUp size={18} /> : <ThumbsDown size={18} />}
                      </button>
                    ))}
                  </span>
                )}
                {c.verdict === 'wrong-letter' && <span className="rdb-adc-tag">outra letra</span>}
              </div>
            );
          })}
        </div>
        {isLeader && (
          <div className="rdb-adc-lead">
            <button type="button" disabled={i === 0} onClick={() => updateAd((prev) => prevCategory(prev))}>
              <ArrowLeft size={16} />
            </button>
            <button type="button" className="rdb-adc-main" data-testid="adc-next-category" onClick={() => updateAd((prev) => nextCategory(prev))}>
              {i + 1 >= ad.categories.length ? 'Ver resultado' : 'Próxima categoria'} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </>
    );
  } else {
    const pts = ad.pointsAwarded || {};
    const ranking = [...ad.playerIds].sort((a, b) => (pts[b] || 0) - (pts[a] || 0));
    body = (
      <div className="rdb-adc-center">
        <span className="rdb-adc-kicker">Letra {ad.letter}</span>
        <h2 data-testid="adc-my-points">+{pts[player.id] || 0} pontos</h2>
        <div className="rdb-adc-rank">
          {ranking.map((id, n) => (
            <div key={id} className={id === player.id ? 'is-me' : ''}>
              <span>{n + 1}º</span>
              <span>{nameOf(id)}</span>
              <strong>{pts[id] || 0}</strong>
            </div>
          ))}
        </div>
        {!isLeader && <p className="rdb-adc-muted">Aguarde a próxima rodada.</p>}
      </div>
    );
  }

  return wrapIfMultiMode(
    <div data-testid="controller-adedanha" className="rdb-adc">
      <LetterDrawOverlay letter={spin.letter} spinning={spin.spinning} compact />
      {body}
    </div>
  );
};
