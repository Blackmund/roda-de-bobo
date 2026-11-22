import React, { useEffect, useRef, useState } from 'react';
import { Check, Send, X } from 'lucide-react';
import type { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { GEO_PERGUNTA_TEXTO, geoSolved, geoValue, submitGeoGuess } from '../../../utils/geoguessEngine';

interface GeoGuessControllerProps {
  room: GameRoom;
  player: Player;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (content: React.ReactNode) => React.ReactNode;
}

/**
 * GeoGuess no celular: escrever o palpite da imagem que esta na TV. Pode trocar ate o diretor julgar.
 * O estado da sala e sincronizado inteiro (quem grava por ultimo vence): se a sala nao mostrar o palpite enviado,
 * o celular reenvia.
 */
export const GeoGuessController: React.FC<GeoGuessControllerProps> = ({ room, player, onUpdateRoom, wrapIfMultiMode }) => {
  const g = room.geoguess;
  const [draft, setDraft] = useState('');
  const sentRef = useRef<{ text: string; stage: number } | null>(null);
  const roundKey = `${room.roundNumber}-${g?.localId}-${player.id}`;

  useEffect(() => {
    setDraft('');
    sentRef.current = null;
  }, [roundKey]);

  const stage = g?.stage ?? 0;
  const mine = g?.guesses[player.id];
  const mineNow = mine && mine.stage === stage ? mine : undefined;

  // nova imagem: limpa o rascunho de quem errou
  useEffect(() => {
    if (sentRef.current && sentRef.current.stage !== stage) {
      sentRef.current = null;
      setDraft('');
    }
  }, [stage]);

  // reenvio quando outro celular gravou por cima
  useEffect(() => {
    const sent = sentRef.current;
    if (!g || g.phase !== 'PLAYING' || !sent || sent.stage !== g.stage || geoSolved(g, player.id)) return;
    if (mineNow && mineNow.text === sent.text) return;
    if (mineNow?.verdict) return;
    const t = window.setTimeout(() => {
      onUpdateRoom((prev) => (prev.geoguess ? { ...prev, geoguess: submitGeoGuess(prev.geoguess, player.id, sent.text) } : prev));
    }, 400 + Math.random() * 800);
    return () => window.clearTimeout(t);
  }, [g, mineNow, onUpdateRoom, player.id]);

  if (!g) return null;
  const solved = geoSolved(g, player.id);
  const judgedWrong = mineNow?.verdict === 'wrong';
  const canSend = g.phase === 'PLAYING' && !solved && !judgedWrong;

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !canSend) return;
    sounds.playTick();
    sentRef.current = { text, stage: g.stage };
    onUpdateRoom((prev) => (prev.geoguess ? { ...prev, geoguess: submitGeoGuess(prev.geoguess, player.id, text) } : prev));
  };

  const status =
    g.phase === 'READY'
      ? 'Aguarde a primeira imagem na TV'
      : g.phase === 'REVEAL'
      ? `Era ${g.nome}`
      : solved
      ? `Você acertou! +${g.pointsAwarded[player.id] ?? ''}`
      : judgedWrong
      ? 'Errou. Chute de novo na próxima imagem'
      : mineNow
      ? 'Palpite enviado. Pode trocar até o diretor julgar'
      : 'Olhe a TV e escreva seu palpite';

  return wrapIfMultiMode(
    <div data-testid="controller-geo-view" className="rdb-geo-ctl">
      <div className="rdb-geo-ctl-top">
        <span className="rdb-geo-ctl-title">GeoGuess</span>
        {g.phase === 'PLAYING' && (
          <span className="rdb-geo-ctl-value" data-testid="controller-geo-value">
            Imagem {g.stage + 1}/{g.etapas.length} · vale {geoValue(g)}
          </span>
        )}
      </div>

      {g.phase === 'PLAYING' && g.stage >= 2 && <div className="rdb-geo-ctl-hint">
        <span>Dica</span>
        <strong>{g.dica}</strong>
      </div>}

      <p
        data-testid="controller-geo-status"
        className={'rdb-geo-ctl-status' + (solved ? ' is-right' : judgedWrong ? ' is-wrong' : '')}
      >
        {solved ? <Check size={20} strokeWidth={3} /> : judgedWrong ? <X size={20} strokeWidth={3} /> : null}
        {status}
      </p>

      {g.phase === 'REVEAL' ? (
        <p className="rdb-geo-ctl-answer">{g.lugar}</p>
      ) : (
        <form className="rdb-geo-ctl-form" onSubmit={send}>
          <label htmlFor="geo-guess-input">{GEO_PERGUNTA_TEXTO[g.pergunta]}</label>
          <input
            id="geo-guess-input"
            data-testid="controller-geo-input"
            value={solved ? mine?.text || '' : draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={canSend ? 'Seu palpite' : ''}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="send"
            disabled={!canSend}
          />
          <button type="submit" data-testid="controller-geo-send" className="rdb-geo-ctl-send" disabled={!canSend || !draft.trim()}>
            <Send size={18} />
            {mineNow && !mineNow.verdict ? 'Trocar palpite' : 'Chutar'}
          </button>
          {mineNow && !mineNow.verdict && (
            <p className="rdb-geo-ctl-sent" data-testid="controller-geo-sent">
              Seu palpite: <strong>{mineNow.text}</strong>
            </p>
          )}
        </form>
      )}
    </div>
  );
};
