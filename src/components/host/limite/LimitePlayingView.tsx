import {
  formatLimiteExpectedUnitLabel,
  isLimiteGuessExact,
  computeLimiteWinnerPoints,
  LIMITE_POWER_CARD_META
} from '../ScreenLimite';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GameRoom, LimiteGameState, LimitePowerCardType, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { sanitizeCleanGameText } from '../../../utils/aiGameGenerator';
import { PhoneCall, ArrowRight, RotateCcw, Zap, X, Clock, Infinity as InfinityIcon, Info, Mic, Smartphone } from 'lucide-react';
import { LimitePlayerGuessCard } from './LimitePlayerGuessCard';
import { PlayerMark } from '../../rdb/PlayerMark';

interface LimitePlayingViewProps {
  limite: LimiteGameState;
  room: GameRoom;
  isTimeExpired: boolean;
  handleTogglePlayMode: (mode: "mesa" | "digital") => void;
  playMode: "mesa" | "digital";
  selectedPowerPlayerId: string;
  setSelectedPowerPlayerId: React.Dispatch<React.SetStateAction<string>>;
  setIsPowerModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleRerollLimiteQuestion: () => Promise<void>;
  handleImmediateReveal: () => void;
  drumrolling: boolean;
  handleTriggerReveal: () => void;
  handleAwardDirectMesaVictory: (winnerId: string, forceExact?: boolean) => void;
  editingSecretPlayers: Record<string, boolean>;
  setEditingSecretPlayers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTvDraftGuesses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  tvDraftGuesses: Record<string, string>;
  handleSubmitSecretTvGuess: (playerId: string) => void;
  onNextRound: () => void;
  isPowerModalOpen: boolean;
  handleRedrawPowerCardsOnTV: () => void;
  selectedModalPlayer: Player;
  selectedPlayerCardMeta: { id: LimitePowerCardType; icon: string; title: string; shortBadge: string; description: string; borderClass: string; bgClass: string; textClass: string; };
  isSelectedPlayerCardUsed: boolean;
  handleActivatePowerCardOnTV: (playerId: string, card: LimitePowerCardType) => void;
  selectedPlayerAssignedCard: LimitePowerCardType;
}

export const LimitePlayingView: React.FC<LimitePlayingViewProps> = ({
  limite,
  room,
  isTimeExpired,
  handleTogglePlayMode,
  playMode,
  selectedPowerPlayerId,
  setSelectedPowerPlayerId,
  setIsPowerModalOpen,
  handleRerollLimiteQuestion,
  handleImmediateReveal,
  drumrolling,
  handleTriggerReveal,
  handleAwardDirectMesaVictory,
  editingSecretPlayers,
  setEditingSecretPlayers,
  setTvDraftGuesses,
  tvDraftGuesses,
  handleSubmitSecretTvGuess,
  onNextRound,
  isPowerModalOpen,
  handleRedrawPowerCardsOnTV,
  selectedModalPlayer,
  selectedPlayerCardMeta,
  isSelectedPlayerCardUsed,
  handleActivatePowerCardOnTV,
  selectedPlayerAssignedCard
}) => {
  const scoring = limite.phase === 'SCORING';
  const bonus = limite.exactBonus ?? 2;
  const guessed = Object.keys(limite.guesses).length;
  const countdown = limite.revealCountdown !== null && limite.revealCountdown !== undefined && limite.revealCountdown > 0;
  const timerLabel = room.timerConfig === 0 ? 'Livre' : limite.timerSeconds > 0 ? `${limite.timerSeconds}s` : 'Esgotado';
  const timerHot = room.timerConfig !== 0 && limite.phase === 'SECRET_GUESS' && (isTimeExpired || limite.timerSeconds <= 5);
  const unitText = formatLimiteExpectedUnitLabel(limite.roundData.unidade).replace(/^RESPONDA EM:\s*/i, '');
  const questionText = sanitizeCleanGameText(limite.roundData.pergunta, 'limite');
  const questionLen = questionText.length <= 50 ? 'xs' : questionText.length <= 80 ? 's' : questionText.length <= 105 ? 'm' : questionText.length <= 130 ? 'l' : 'xl';
  const exactValue = limite.roundData.valor_exato;
  const [animatedValue, setAnimatedValue] = useState<number>(exactValue);
  const [revealLanded, setRevealLanded] = useState<boolean>(false);
  // Etapa 1: só o número gigante contando no centro. Etapa 2 (settled): ele encolhe e o resto entra no layout.
  const [revealSettled, setRevealSettled] = useState<boolean>(false);

  useEffect(() => {
    if (!scoring) {
      setAnimatedValue(0);
      setRevealLanded(false);
      setRevealSettled(false);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || exactValue === 0) {
      setAnimatedValue(exactValue);
      setRevealLanded(true);
      setRevealSettled(true);
      return;
    }

    setAnimatedValue(0);
    setRevealLanded(false);
    setRevealSettled(false);

    const durationMs = 1150;
    const holdAfterLandMs = 650;
    const decimals = Number.isInteger(exactValue) ? 0 : (exactValue.toString().split('.')[1]?.length ?? 1);
    let rafId = 0;
    let settleTimer = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      // Começa muito rápido e desacelera forte ao se aproximar do número exato
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = exactValue * eased;
      const rounded = decimals === 0 ? Math.round(current) : Number(current.toFixed(decimals));

      if (progress >= 1) {
        setAnimatedValue(exactValue);
        setRevealLanded(true);
        settleTimer = window.setTimeout(() => setRevealSettled(true), holdAfterLandMs);
        return;
      }
      setAnimatedValue(rounded);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(settleTimer);
    };
  }, [scoring, exactValue, room.roundNumber]);

  return (
    <div
      className={'rdb-lim' + (scoring && !revealSettled ? ' is-reveal-stage' : '')}
      data-testid="limite-main-stage-container"
    >
      {/* Barra: o essencial aparece, o resto vira icone com dica ao passar o mouse */}
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Limite
          <span className="rdb-lim-round">
            R{room.roundNumber}/{room.maxRounds}
          </span>
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip={`Quem chegar mais perto do número sem passar leva 1 ponto${bonus > 1 ? `; cravar o número vale ${bonus}` : ''}`}
        >
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          {!scoring && (
            <span
              data-testid="limite-tv-timer-badge"
              className={'rdb-lim-timer' + (timerHot ? ' is-hot' : '')}
              data-tip={room.timerConfig === 0 ? 'Sem limite de tempo' : isTimeExpired ? 'Tempo esgotado: palpites fechados' : 'Tempo para os palpites'}
            >
              {room.timerConfig === 0 ? <InfinityIcon size={16} /> : <Clock size={16} />}
              {timerLabel}
            </span>
          )}
          <div className="rdb-lim-seg" role="group" aria-label="Como os palpites entram">
            <button
              type="button"
              data-testid="limite-mode-mesa-btn"
              aria-pressed={playMode === 'mesa'}
              data-tip="Mesa: os jogadores falam e você digita aqui"
              aria-label="Palpites na mesa"
              onClick={() => handleTogglePlayMode('mesa')}
            >
              <Mic size={16} />
            </button>
            <button
              type="button"
              data-testid="limite-mode-digital-btn"
              aria-pressed={playMode === 'digital'}
              data-tip="Celular: cada um digita no próprio aparelho"
              aria-label="Palpites no celular"
              onClick={() => handleTogglePlayMode('digital')}
            >
              <Smartphone size={16} />
            </button>
          </div>
          {room.customConfig?.limiteEnablePowerCards !== false && (
            <button
              type="button"
              data-testid="limite-open-power-cards-btn"
              className="rdb-lim-icon"
              data-tip="Cartas de poder"
              aria-label="Cartas de poder"
              onClick={() => {
                sounds.playTick();
                if (!selectedPowerPlayerId && room.players[0]) {
                  setSelectedPowerPlayerId(room.players[0].id);
                }
                setIsPowerModalOpen(true);
              }}
            >
              <Zap size={16} />
            </button>
          )}
          <button
            type="button"
            data-testid="limite-reroll-question-btn"
            className="rdb-lim-icon"
            data-tip="Trocar a pergunta"
            aria-label="Trocar a pergunta"
            onClick={handleRerollLimiteQuestion}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* Palco: a pergunta e o numero sao o que importa */}
      <section className={'rdb-lim-stage' + (scoring ? ' is-scoring' : '')}>
        <h2 data-testid="limite-question-text" className="rdb-lim-question" data-len={questionLen} title={questionText}>
          {questionText}
        </h2>
        {!scoring && limite.roundData.category && <span className="rdb-lim-cat">{limite.roundData.category}</span>}

        {/* Antes da revelação o palco é só a pergunta: sem "?" gigante e sem unidade solta (ela vai junto dos palpites) */}
        {(scoring || countdown || drumrolling) && (
        <div className="rdb-lim-center">
          {scoring ? (
            <>
              <div className="rdb-lim-answer-row">
                <div
                  data-testid="limite-exact-value-display"
                  className={'rdb-lim-value' + (revealLanded ? ' is-landed' : '')}
                >
                  {animatedValue.toLocaleString('pt-BR')}
                </div>
                <span
                  data-testid="limite-unit-badge"
                  className={'rdb-lim-unit' + (revealSettled ? ' is-visible' : '')}
                >
                  {unitText}
                </span>
              </div>
              {limite.roundData.curiosidade_explicacao && (
                <p
                  data-testid="limite-curiosity-card"
                  className={'rdb-lim-fact' + (revealSettled ? ' is-visible' : '')}
                >
                  <span>{limite.roundData.curiosidade_explicacao}</span>
                </p>
              )}
            </>
          ) : countdown ? (
            <div data-testid="limite-reveal-countdown-overlay" className="rdb-lim-countdown">
              <span className="rdb-lim-count-label">Revelando em</span>
              <span data-testid="limite-reveal-countdown-number" className="rdb-lim-count">
                {limite.revealCountdown}
              </span>
            </div>
          ) : (
            <div className="rdb-lim-wait">Apurando os palpites...</div>
          )}
        </div>
        )}

        {limite.phase === 'CALL_TIMEOUT' && (
          <div className="rdb-lim-call">
            <PhoneCall size={18} />
            <span>Ligação para ajuda</span>
            <strong>00:{String(limite.callTimerRemaining).padStart(2, '0')}</strong>
          </div>
        )}
      </section>

      {/* Jogadores */}
      <section className="rdb-lim-players" aria-label="Palpites">
        <div className="rdb-lim-players-head">
          <span>
            {scoring ? 'Palpites' : 'Quem já palpitou'} <b>{guessed}/{room.players.length}</b>
          </span>
          {!scoring && (
            <span data-testid="limite-unit-badge" className="rdb-lim-unit-hint">
              Responda em <b>{unitText}</b>
            </span>
          )}
          {scoring && (
            <span data-testid="limite-multi-winner-hint" className="rdb-lim-score-hint">
              Clique no jogador para pontuar{bonus > 1 ? ` · Exato: +${bonus}` : ''}
            </span>
          )}
        </div>
        <div className="rdb-lim-grid">
          {room.players.map((p) => {
            const guess = limite.guesses[p.id];
            const hasGuessed = guess !== undefined;
            const isExactGuess = isLimiteGuessExact(guess, limite.roundData.valor_exato);
            const isWinner = Boolean(limite.winners?.includes(p.id)) || (limite.pointsAwarded?.[p.id] || 0) > 0;
            const isBusted = limite.bustedPlayers?.includes(p.id);
            const cardPlayed = limite.powerCardsPlayed?.[p.id];
            const liveDelta = scoring ? limite.pointsAwarded?.[p.id] || 0 : 0;
            const totalPts = Math.max(0, (p.score || 0) + liveDelta);
            const pointValueIfAwarded = computeLimiteWinnerPoints(limite, p.id);
            const exactPointValueIfAwarded = computeLimiteWinnerPoints(limite, p.id, true);
            const isScoredAsExact = isWinner && liveDelta >= exactPointValueIfAwarded;

            return <LimitePlayerGuessCard key={p.id} p={p} limite={limite} isWinner={isWinner} handleAwardDirectMesaVictory={handleAwardDirectMesaVictory} isBusted={isBusted} hasGuessed={hasGuessed} cardPlayed={cardPlayed} totalPts={totalPts} liveDelta={liveDelta} guess={guess} isExactGuess={isExactGuess} exactPointValueIfAwarded={exactPointValueIfAwarded} pointValueIfAwarded={pointValueIfAwarded} isScoredAsExact={isScoredAsExact} unitText={unitText} editingSecretPlayers={editingSecretPlayers} playMode={playMode} isTimeExpired={isTimeExpired} setEditingSecretPlayers={setEditingSecretPlayers} setTvDraftGuesses={setTvDraftGuesses} tvDraftGuesses={tvDraftGuesses} handleSubmitSecretTvGuess={handleSubmitSecretTvGuess} />;
          })}
        </div>
      </section>

      {/* A unica acao principal da tela */}
      <footer className="rdb-lim-foot">
        {scoring ? (
          <button type="button" data-testid="limite-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
            Confirmar pontos e avançar
            <ArrowRight />
          </button>
        ) : (
          <button type="button" data-testid="limite-reveal-answer-btn" className="rdb-btn rdb-setup-start" onClick={handleTriggerReveal}>
            {limite.revealCountdown ? 'Revelar agora' : 'Revelar a resposta'}
          </button>
        )}
      </footer>

      {/* Standardized z-[999] Power Cards Modal */}
      {isPowerModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="limite-power-cards-modal-backdrop"
            onClick={() => setIsPowerModalOpen(false)}
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full max-h-[85dvh] overflow-y-auto bg-[#07080d] border border-white/15 p-6 relative shadow-2xl text-[#F5F2EB] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-amber-300 font-anton text-xl uppercase tracking-wider">
                  <Zap size={20} />
                  <span>PODER ESPECIAL SORTEADO (1 POR JOGADOR)</span>
                </div>
                <button
                  type="button"
                  data-testid="close-limite-power-modal-btn"
                  aria-label="Fechar modal de Cartas de Poder"
                  onClick={() => setIsPowerModalOpen(false)}
                  className="min-w-[44px] min-h-[44px] px-3 py-1 border border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X size={16} />
                  <span>FECHAR</span>
                </button>
              </div>

              <div className="p-2.5 bg-slate-900/80 border border-slate-700 text-[11px] font-mono-code text-slate-300 flex items-center justify-between gap-2">
                <span>
                  Cada jogador recebe 1 poder sorteado para usar 1 única vez durante todo o jogo.
                </span>
                <button
                  type="button"
                  onClick={handleRedrawPowerCardsOnTV}
                  className="px-2 py-1 border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-400 hover:text-black text-cyan-300 font-bold uppercase text-[10px] shrink-0 cursor-pointer"
                >
                  Ressortear
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono-code text-[#17B8B8] font-bold uppercase">
                  1. Escolha o jogador:
                </label>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
                  {room.players.map((p) => {
                    const pCard =
                      limite.assignedPowerCards?.[p.id] || p.assignedPowerCard || 'x2';
                    const pUsed = Boolean(
                      limite.usedPowerCardsByPlayer?.[p.id] || p.powerCardUsed
                    );
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPowerPlayerId(p.id)}
                        className={`p-2 border text-left font-anton text-xs uppercase flex items-center justify-between gap-2 cursor-pointer ${
                          selectedPowerPlayerId === p.id
                            ? 'ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8] text-cyan-200'
                            : 'border-white/10 bg-white/[0.03] text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span><PlayerMark p={p} /></span>
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span
                          className={`text-[10px] font-mono-code px-1 ${
                            pUsed ? 'text-slate-500 line-through' : 'text-amber-300'
                          }`}
                        >
                          {LIMITE_POWER_CARD_META[pCard].icon}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedModalPlayer && (
                <div className="space-y-2">
                  <label className="block text-xs font-mono-code text-amber-300 font-bold uppercase">
                    2. Poder sorteado de {selectedModalPlayer.name}:
                  </label>
                  <div
                    className={`p-4 border-2 ${selectedPlayerCardMeta.borderClass} ${selectedPlayerCardMeta.bgClass} space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`font-anton text-lg uppercase ${selectedPlayerCardMeta.textClass}`}>
                        {selectedPlayerCardMeta.icon} {selectedPlayerCardMeta.title}
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                          isSelectedPlayerCardUsed
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-emerald-400 text-black'
                        }`}
                      >
                        {isSelectedPlayerCardUsed ? 'JÁ UTILIZADO (0/1)' : 'DISPONÍVEL (1/1)'}
                      </span>
                    </div>
                    <p className="text-xs font-mono-code text-slate-200">
                      {selectedPlayerCardMeta.description}
                    </p>
                    <button
                      type="button"
                      disabled={isSelectedPlayerCardUsed}
                      onClick={() =>
                        handleActivatePowerCardOnTV(
                          selectedModalPlayer.id,
                          selectedPlayerAssignedCard
                        )
                      }
                      className="w-full py-2.5 border border-amber-300 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
                    >
                      {isSelectedPlayerCardUsed
                        ? '✓ PODER JÁ UTILIZADO NESTA PARTIDA'
                        : `ATIVAR ${selectedPlayerCardMeta.title.toUpperCase()} AGORA`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
