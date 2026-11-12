import {
  formatLimiteExpectedUnitLabel,
  isLimiteGuessExact,
  computeLimiteWinnerPoints,
  LIMITE_POWER_CARD_META
} from '../ScreenLimite';
import React from 'react';
import { createPortal } from 'react-dom';
import { GameRoom, LimiteGameState, LimitePowerCardType, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { sanitizeCleanGameText } from '../../../utils/aiGameGenerator';
import { PhoneCall, ArrowRight, RotateCcw, Trophy, Zap, X, Clock, Infinity as InfinityIcon, Lock } from 'lucide-react';
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
  return (
    <div className="h-full flex flex-col justify-between min-h-0 overflow-hidden gap-1.5">
      {/* Main Stage Container */}
      <div
        data-testid="limite-main-stage-container"
        className={`relative shadow-2xl flex-1 min-h-0 flex flex-col justify-between overflow-hidden transition-all duration-500 ${
          limite.phase === 'SCORING'
            ? 'border-2 border-amber-400/80 bg-gradient-to-b from-[#181105] via-[#090b14] to-[#040508] shadow-[0_0_40px_rgba(251,191,36,0.3)]'
            : 'border border-white/10 bg-white/[0.03]'
        }`}
      >
        {/* Arcade Marquee Sub-Header (py-1.5 px-4 shrink-0) */}
        <div
          className={`py-1.5 px-4 flex flex-wrap items-center justify-between gap-2 border-b shrink-0 transition-colors ${
            limite.phase === 'SCORING'
              ? 'border-amber-400/30 bg-[#120e06]/95'
              : 'border-white/10 bg-[#07080d]/90'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{limite.phase === 'SCORING' ? '🌟' : '🕹️'}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-anton text-lg md:text-xl tracking-wider uppercase leading-none ${
                  limite.phase === 'SCORING'
                    ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'text-orange-400'
                }`}
              >
                {limite.phase === 'SCORING'
                  ? 'PALCO DE REVELAÇÃO: JOGO DO LIMITE'
                  : 'FLIPERAMA: JOGO DO LIMITE'}
              </span>
              <span className="hidden lg:inline text-[10px] font-mono-code text-slate-300 uppercase">
                {limite.phase === 'SCORING'
                  ? '• REVELAÇÃO OFICIAL DOS PALPITES E PONTUAÇÃO FINAL'
                  : `• QUEM CHEGAR MAIS PERTO DO NÚMERO EXATO SEM PASSAR!${(limite.exactBonus ?? 2) > 1 ? ` (CRAVOU EXATO = ${limite.exactBonus ?? 2} PTS)` : ''}`}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Synchronized Automatic Countdown Timer Badge on TV */}
            <div
              data-testid="limite-tv-timer-badge"
              className={`px-2.5 py-0.5 border font-mono-code text-xs font-bold flex items-center gap-1.5 ${
                room.timerConfig === 0
                  ? 'border-cyan-500/40 bg-[#07080d] text-cyan-300'
                  : isTimeExpired && limite.phase === 'SECRET_GUESS'
                  ? 'border-rose-500 bg-rose-950/80 text-rose-300 animate-pulse'
                  : limite.timerSeconds <= 5 && limite.phase === 'SECRET_GUESS'
                  ? 'border-rose-500 bg-rose-950/80 text-rose-300 animate-pulse'
                  : 'border-cyan-400/60 bg-cyan-950/30 text-cyan-200'
              }`}
            >
              <Clock size={12} />
              {room.timerConfig === 0 ? (
                <span className="flex items-center gap-1">
                  <InfinityIcon size={13} />
                  <span>LIVRE</span>
                </span>
              ) : (
                <span>
                  {limite.timerSeconds > 0 ? `${limite.timerSeconds}s` : '0s (ESGOTADO)'}
                </span>
              )}
            </div>

            {/* Hybrid Play Mode Toggle: Mesa/Voz vs Digital */}
            <div className="flex items-center border border-white/10 bg-[#07080d] p-0.5 text-[10px] font-mono-code font-bold uppercase">
              <button
                type="button"
                data-testid="limite-mode-mesa-btn"
                onClick={() => handleTogglePlayMode('mesa')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  playMode === 'mesa'
                    ? 'bg-amber-400 text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗣️ Mesa / Voz
              </button>
              <button
                type="button"
                data-testid="limite-mode-digital-btn"
                onClick={() => handleTogglePlayMode('digital')}
                className={`px-2 py-0.5 transition-colors cursor-pointer ${
                  playMode === 'digital'
                    ? 'bg-[#17B8B8] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Digital
              </button>
            </div>

            {room.customConfig?.limiteEnablePowerCards !== false && (
              <button
                type="button"
                data-testid="limite-open-power-cards-btn"
                onClick={() => {
                  sounds.playTick();
                  if (!selectedPowerPlayerId && room.players[0]) {
                    setSelectedPowerPlayerId(room.players[0].id);
                  }
                  setIsPowerModalOpen(true);
                }}
                className="px-2.5 py-1 border border-amber-400/60 bg-amber-950/60 hover:bg-amber-400 text-amber-200 hover:text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Zap size={12} />
                <span>⚡ Cartas de Poder</span>
              </button>
            )}

            <button
              type="button"
              data-testid="limite-reroll-question-btn"
              onClick={handleRerollLimiteQuestion}
              className="px-2.5 py-1 border border-[#17B8B8]/60 bg-[#17B8B8]/10 hover:bg-[#17B8B8] text-cyan-200 hover:text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>🔄 Outra Pergunta</span>
            </button>

            <span className="text-xs font-mono-code text-[#17B8B8] font-bold bg-[#07080d] border border-white/10 px-2.5 py-0.5">
              R{room.roundNumber}/{room.maxRounds}
            </span>
          </div>
        </div>

        {/* Central Monitor (flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col justify-between p-2 sm:p-2.5 md:p-3) */}
        <div className="relative bg-[#07080d]/90 p-2 sm:p-2.5 md:p-3 overflow-y-auto scrollbar-none arcade-screen-lines flex-1 min-h-0 flex flex-col justify-between gap-1 sm:gap-1.5">
          {/* Question Box - Compact in SCORING phase, prominent during guessing */}
          <div className="text-center space-y-0.5 shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.2 border font-mono-code text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                limite.phase === 'SCORING'
                  ? 'border-amber-400/40 bg-amber-950/30 text-amber-300'
                  : 'border-orange-400/40 bg-orange-950/30 text-orange-300'
              }`}
            >
              <span>{limite.phase === 'SCORING' ? '🎯 PERGUNTA DA RODADA' : 'PERGUNTA OFICIAL'}</span>
              {limite.roundData.category && (
                <span className="text-[#17B8B8]">· {limite.roundData.category}</span>
              )}
            </div>
            <h2
              data-testid="limite-question-text"
              className={`${
                limite.phase === 'SCORING'
                  ? 'text-xs sm:text-sm font-bold text-slate-300 line-clamp-4 sm:line-clamp-2 max-w-2xl py-0.5'
                  : 'text-base md:text-xl lg:text-2xl font-black text-[#F5F2EB]'
              } uppercase leading-snug tracking-normal text-center mx-auto transition-all`}
            >
              {sanitizeCleanGameText(limite.roundData.pergunta, 'limite')}
            </h2>

            {limite.phase !== 'SCORING' && (
              /* Prominent Unit Calibration Badge below the Question */
              <div className="pt-0.5 flex justify-center">
                <div
                  data-testid="limite-unit-badge"
                  className="inline-flex items-center gap-2 px-3 py-0.5 border border-amber-400/70 bg-amber-950/60 text-amber-200 font-anton text-xs tracking-wider uppercase"
                >
                  <span className="text-amber-400">📏</span>
                  <span>{formatLimiteExpectedUnitLabel(limite.roundData.unidade)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Central Target Display (Big '?' vs Suspense Countdown vs Giant Official Value) */}
          <div className="my-auto flex flex-col items-center justify-center shrink-0 py-0.5">
            {limite.phase === 'SCORING' ? (
              <div className="text-center space-y-1 max-w-3xl mx-auto my-auto py-0.5">
                <div className="inline-block px-2.5 py-0.2 border border-amber-400/70 bg-amber-400/15 text-[10px] font-mono-code text-amber-300 uppercase font-black tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                  ✨ VALOR REAL OFICIAL ✨
                </div>
                <div
                  data-testid="limite-exact-value-display"
                  className="font-anton text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-amber-300 leading-tight drop-shadow-[0_0_25px_rgba(251,191,36,0.6)] tracking-wider"
                >
                  {limite.roundData.valor_exato.toLocaleString('pt-BR')}
                </div>
                <div className="flex justify-center">
                  <div
                    data-testid="limite-unit-badge"
                    className="inline-flex items-center gap-1 px-2.5 py-0.2 border border-amber-400/60 bg-amber-950/70 text-amber-200 font-anton text-xs tracking-wider uppercase"
                  >
                    <span>📏 {formatLimiteExpectedUnitLabel(limite.roundData.unidade)}</span>
                  </div>
                </div>
                {limite.roundData.curiosidade_explicacao && (
                  <div
                    data-testid="limite-curiosity-card"
                    className="px-3 py-1 border border-amber-400/30 bg-[#090b14]/90 text-[11px] sm:text-xs text-slate-200 max-w-2xl mx-auto font-medium space-y-0 shadow-md"
                  >
                    <div className="text-[9px] font-mono-code font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1">
                      <span>💡 CURIOSIDADE OFICIAL // FATOR UAU</span>
                    </div>
                    <p className="leading-snug text-white font-semibold text-[11px] sm:text-xs line-clamp-2">
                      {limite.roundData.curiosidade_explicacao}
                    </p>
                  </div>
                )}
              </div>
            ) : limite.revealCountdown !== null &&
              limite.revealCountdown !== undefined &&
              limite.revealCountdown > 0 ? (
              <div
                data-testid="limite-reveal-countdown-overlay"
                className="text-center space-y-1.5 bg-[#0d0902]/95 border-2 border-amber-400 p-3 sm:p-4 max-w-sm mx-auto shadow-[0_0_25px_rgba(251,191,36,0.5)] my-auto"
              >
                <div className="font-anton text-xs text-amber-300 uppercase tracking-widest animate-pulse">
                  ⏳ PREPAREM OS CORAÇÕES! REVELANDO EM...
                </div>
                <div
                  data-testid="limite-reveal-countdown-number"
                  className="font-anton text-5xl sm:text-6xl md:text-7xl text-amber-400 animate-bounce leading-none drop-shadow-[0_0_24px_rgba(251,191,36,0.7)]"
                >
                  {limite.revealCountdown}
                </div>
                <div className="text-[10px] font-mono-code text-slate-300">
                  🔔 Bips sonoros da revelação ativos
                </div>
                <button
                  type="button"
                  data-testid="limite-reveal-now-btn"
                  onClick={handleImmediateReveal}
                  className="px-3 py-1 border border-amber-400 bg-amber-400 hover:bg-amber-300 text-black font-anton text-[11px] uppercase tracking-wider cursor-pointer shadow-md transition-transform active:scale-95"
                >
                  ⚡ Revelar Agora (Pular)
                </button>
              </div>
            ) : drumrolling ? (
              <div className="text-center space-y-1.5">
                <div className="font-anton text-4xl md:text-5xl text-amber-400 animate-spin">
                  ⏳
                </div>
                <div className="font-anton text-lg text-amber-300 tracking-wider uppercase animate-pulse">
                  APURANDO PALPITES NA MESA...
                </div>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <div className="font-anton text-4xl md:text-5xl text-orange-400/90 leading-none">
                  ?
                </div>
                <div className="text-[11px] font-mono-code text-slate-300 uppercase">
                  {playMode === 'mesa'
                    ? 'Modo Mesa/Voz: Os jogadores falam seus palpites ou digitam direto abaixo e você revela a resposta!'
                    : 'Aguardando envio das lousas pelos celulares...'}
                </div>
              </div>
            )}
          </div>

          {/* Emergency Call Timeout Overlay */}
          {limite.phase === 'CALL_TIMEOUT' && (
            <div className="my-1 border border-amber-400 bg-amber-950/80 p-2 text-center space-y-0.5 animate-pulse shrink-0">
              <div className="flex items-center justify-center gap-2 text-amber-300 font-anton text-sm uppercase">
                <PhoneCall size={16} />
                <span>CARTA LIGAÇÃO ATIVADA! PESQUISA DE 30S LIBERADA</span>
              </div>
              <div className="font-anton text-2xl text-amber-200">
                00:{String(limite.callTimerRemaining).padStart(2, '0')}
              </div>
            </div>
          )}

          {/* Guesses Board (Auto-Fit Grid for 2 to 8+ Players) */}
          <div className="pt-1 sm:pt-1.5 border-t border-white/10 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`font-anton text-[11px] sm:text-xs tracking-wider uppercase ${
                    limite.phase === 'SCORING' ? 'text-amber-300' : 'text-orange-300'
                  }`}
                >
                  {limite.phase === 'SCORING'
                    ? `🏆 BANCADA DE PALPITES REVELADOS (${Object.keys(limite.guesses).length} PALPITES)`
                    : `BANCADA DE JOGADORES (${Object.keys(limite.guesses).length} / ${room.players.length} PALPITES)`}
                </span>
                {limite.phase === 'SCORING' && (
                  <span
                    data-testid="limite-multi-winner-hint"
                    className="text-[9px] font-mono-code text-[#17B8B8] font-bold"
                  >
                    💡 Mais próximo ganha +1 pt{(limite.exactBonus ?? 2) > 1 ? ` • Cravou exato ganha +${limite.exactBonus ?? 2} pts` : ''} • Clique novamente para desmarcar
                  </span>
                )}
              </div>
              {limite.phase !== 'SCORING' && (
                <button
                  type="button"
                  data-testid="limite-reveal-answer-btn"
                  onClick={handleTriggerReveal}
                  className="px-3 py-1 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider shadow-neon-cyan transition-colors cursor-pointer"
                >
                  {limite.revealCountdown ? '⚡ REVELAR AGORA (PULAR CONTAGEM)' : '🎯 REVELAR RESPOSTA EXATA AGORA'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-1.5">
              {room.players.map((p) => {
                const guess = limite.guesses[p.id];
                const hasGuessed = guess !== undefined;
                const isExactGuess = isLimiteGuessExact(guess, limite.roundData.valor_exato);
                const isWinner =
                  Boolean(limite.winners?.includes(p.id)) ||
                  (limite.pointsAwarded?.[p.id] || 0) > 0;
                const isBusted = limite.bustedPlayers?.includes(p.id);
                const cardPlayed = limite.powerCardsPlayed?.[p.id];
                const liveDelta =
                  limite.phase === 'SCORING' ? limite.pointsAwarded?.[p.id] || 0 : 0;
                const totalPts = Math.max(0, (p.score || 0) + liveDelta);
                const pointValueIfAwarded = computeLimiteWinnerPoints(limite, p.id);
                const exactPointValueIfAwarded = computeLimiteWinnerPoints(limite, p.id, true);
                const isScoredAsExact = isWinner && liveDelta >= exactPointValueIfAwarded;

                return <LimitePlayerGuessCard key={p.id} p={p} limite={limite} isWinner={isWinner} handleAwardDirectMesaVictory={handleAwardDirectMesaVictory} isBusted={isBusted} hasGuessed={hasGuessed} cardPlayed={cardPlayed} totalPts={totalPts} liveDelta={liveDelta} guess={guess} isExactGuess={isExactGuess} exactPointValueIfAwarded={exactPointValueIfAwarded} pointValueIfAwarded={pointValueIfAwarded} isScoredAsExact={isScoredAsExact} editingSecretPlayers={editingSecretPlayers} playMode={playMode} isTimeExpired={isTimeExpired} setEditingSecretPlayers={setEditingSecretPlayers} setTvDraftGuesses={setTvDraftGuesses} tvDraftGuesses={tvDraftGuesses} handleSubmitSecretTvGuess={handleSubmitSecretTvGuess} />;
              })}
            </div>
          </div>
        </div>

        {/* Arcade Console Bottom Controls / Explicit Commit CTA (shrink-0 h-10 sm:h-11 px-3) */}
        <div className="shrink-0 h-10 sm:h-11 px-3 flex items-center justify-between bg-slate-950 border-t border-slate-800 z-20 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full bg-[#E6194B] border border-white/40 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-mono-code text-slate-400 truncate">
              CONTROLE ARCADE RODA DE BOBO • TEMA: {room.theme}
            </span>
          </div>

          {limite.phase === 'SCORING' && (
            <button
              type="button"
              data-testid="limite-next-round-btn"
              onClick={onNextRound}
              className="px-4 py-1.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs md:text-sm uppercase tracking-wider shadow-neon-cyan transition-all flex items-center gap-1.5 cursor-pointer shrink-0 font-bold hover:scale-[1.02]"
            >
              <span>Confirmar Pontos e Avançar ➔</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

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
                  🎲 Cada jogador recebe 1 poder sorteado para usar 1 única vez durante todo o jogo.
                </span>
                <button
                  type="button"
                  onClick={handleRedrawPowerCardsOnTV}
                  className="px-2 py-1 border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-400 hover:text-black text-cyan-300 font-bold uppercase text-[10px] shrink-0 cursor-pointer"
                >
                  🔄 Ressortear
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
                        : `⚡ ATIVAR ${selectedPlayerCardMeta.title.toUpperCase()} AGORA`}
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
