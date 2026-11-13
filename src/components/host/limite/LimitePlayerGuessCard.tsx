import React from 'react';
import { LimiteGameState, LimitePowerCardType, Player } from '../../../types/game';
import { Check, Lock, Pencil, Phone, RefreshCw, Target, X as XIcon } from 'lucide-react';
import { PlayerMark } from '../../rdb/PlayerMark';

interface LimitePlayerGuessCardProps {
  p: Player;
  limite: LimiteGameState;
  isWinner: boolean;
  handleAwardDirectMesaVictory: (winnerId: string, forceExact?: boolean) => void;
  isBusted: boolean;
  hasGuessed: boolean;
  cardPlayed: LimitePowerCardType;
  totalPts: number;
  liveDelta: number;
  guess: number;
  isExactGuess: boolean;
  exactPointValueIfAwarded: number;
  pointValueIfAwarded: number;
  isScoredAsExact: boolean;
  editingSecretPlayers: Record<string, boolean>;
  playMode: 'mesa' | 'digital';
  isTimeExpired: boolean;
  setEditingSecretPlayers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTvDraftGuesses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  tvDraftGuesses: Record<string, string>;
  handleSubmitSecretTvGuess: (playerId: string) => void;
}

const CARD_LABEL: Record<string, string> = {
  ligacao: 'Ligação',
  troca: 'Troca de palpite',
  x2: 'Dobra os pontos',
  menos1: 'Menos um'
};

export const LimitePlayerGuessCard: React.FC<LimitePlayerGuessCardProps> = ({
  p,
  limite,
  isWinner,
  handleAwardDirectMesaVictory,
  isBusted,
  hasGuessed,
  cardPlayed,
  totalPts,
  liveDelta,
  guess,
  isExactGuess,
  exactPointValueIfAwarded,
  pointValueIfAwarded,
  isScoredAsExact,
  editingSecretPlayers,
  playMode,
  isTimeExpired,
  setEditingSecretPlayers,
  setTvDraftGuesses,
  tvDraftGuesses,
  handleSubmitSecretTvGuess
}) => {
  const scoring = limite.phase === 'SCORING';
  const exact = limite.roundData.valor_exato;
  const state = scoring ? (isWinner ? 'win' : isBusted ? 'bust' : hasGuessed ? 'in' : 'out') : hasGuessed ? 'in' : 'wait';
  const award = limite.pointsAwarded[p.id] || pointValueIfAwarded;

  return (
    <div
      data-testid={`limite-player-card-${p.id}`}
      aria-pressed={scoring ? isWinner : undefined}
      onClick={() => {
        if (scoring) handleAwardDirectMesaVictory(p.id);
      }}
      className={`rdb-lim-card is-${state}${scoring ? ' is-click' : ''}`}
    >
      <div className="rdb-lim-card-head">
        <PlayerMark p={p} />
        <span className="rdb-lim-card-name">{p.name}</span>
        {cardPlayed && (
          <span className="rdb-lim-card-power" data-tip={`Carta usada: ${CARD_LABEL[cardPlayed] || cardPlayed}`}>
            {cardPlayed === 'ligacao' ? <Phone size={14} /> : cardPlayed === 'troca' ? <RefreshCw size={14} /> : cardPlayed === 'x2' ? '×2' : '−1'}
          </span>
        )}
        <span data-testid={`limite-player-score-${p.id}`} className="rdb-lim-card-pts">
          {totalPts}
          {liveDelta > 0 && <em>+{liveDelta}</em>}
        </span>
      </div>

      {scoring ? (
        <div className="rdb-lim-card-body">
          <div className="rdb-lim-card-guess">{hasGuessed ? guess.toLocaleString('pt-BR') : '—'}</div>
          {hasGuessed && (
            <div className="rdb-lim-card-diff">
              {guess === exact ? (
                <span className="is-exact">
                  <Target size={14} /> Exato
                </span>
              ) : guess < exact ? (
                <span>Faltou {(exact - guess).toLocaleString('pt-BR')}</span>
              ) : (
                <span className="is-over">Passou {(guess - exact).toLocaleString('pt-BR')}</span>
              )}
            </div>
          )}
          {isExactGuess && (
            <span data-testid={`limite-exact-hit-badge-${p.id}`} className="rdb-lim-card-flag">
              Cravou +{exactPointValueIfAwarded}
            </span>
          )}
          <div className="rdb-lim-card-actions">
            <button
              type="button"
              data-testid={`limite-award-point-${p.id}`}
              aria-pressed={isWinner}
              data-tip={isWinner ? 'Tirar o ponto' : 'Dar o ponto'}
              className="rdb-seg"
              onClick={(e) => {
                e.stopPropagation();
                handleAwardDirectMesaVictory(p.id);
              }}
            >
              {isWinner ? <Check size={14} /> : null}+{award}
            </button>
            {!isExactGuess && (
              <button
                type="button"
                data-testid={`limite-award-exact-${p.id}`}
                aria-pressed={isScoredAsExact}
                data-tip={`Cravou o número exato (+${Math.max(1, limite.exactBonus ?? 2)})`}
                aria-label="Cravou o número exato"
                className="rdb-seg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAwardDirectMesaVictory(p.id, true);
                }}
              >
                <Target size={14} />+{exactPointValueIfAwarded}
              </button>
            )}
          </div>
          {isBusted && !isWinner && <span className="rdb-lim-card-flag is-bad">Estourou</span>}
        </div>
      ) : hasGuessed && !editingSecretPlayers[p.id] ? (
        <div className="rdb-lim-card-body">
          <div data-testid={`limite-secret-locked-${p.id}`} className="rdb-lim-card-locked">
            <Lock size={16} /> Palpite dado
          </div>
          {playMode === 'mesa' && !isTimeExpired && (
            <button
              type="button"
              className="rdb-lim-card-edit"
              data-tip="Alterar o palpite"
              aria-label="Alterar o palpite"
              onClick={(e) => {
                e.stopPropagation();
                setEditingSecretPlayers((prev) => ({ ...prev, [p.id]: true }));
                setTvDraftGuesses((prev) => ({ ...prev, [p.id]: '' }));
              }}
            >
              <Pencil size={14} />
            </button>
          )}
          {playMode === 'mesa' && isTimeExpired && <span data-testid={`limite-tv-expired-badge-${p.id}`} className="rdb-lim-card-note">Fechado</span>}
        </div>
      ) : playMode === 'mesa' ? (
        isTimeExpired ? (
          <div className="rdb-lim-card-body">
            <span data-testid={`limite-tv-expired-badge-${p.id}`} className="rdb-lim-card-note">
              <Lock size={14} /> Palpites fechados
            </span>
          </div>
        ) : (
          <div className="rdb-lim-card-body rdb-lim-card-input">
            <input
              type="password"
              inputMode="numeric"
              data-testid={`limite-tv-guess-input-${p.id}`}
              aria-label={`Palpite de ${p.name}`}
              value={tvDraftGuesses[p.id] ?? ''}
              onChange={(e) => setTvDraftGuesses((prev) => ({ ...prev, [p.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitSecretTvGuess(p.id);
              }}
              placeholder="Palpite"
            />
            <button
              type="button"
              aria-label="Guardar o palpite"
              data-tip="Guardar o palpite"
              onClick={(e) => {
                e.stopPropagation();
                handleSubmitSecretTvGuess(p.id);
              }}
            >
              <Check size={16} />
            </button>
          </div>
        )
      ) : (
        <div className="rdb-lim-card-body">
          <span className="rdb-lim-card-note">{isTimeExpired ? 'Fechado' : 'No celular...'}</span>
        </div>
      )}
      {scoring && isBusted && !isWinner && <XIcon className="rdb-lim-card-x" size={0} aria-hidden="true" />}
    </div>
  );
};
