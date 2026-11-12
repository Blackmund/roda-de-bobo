import { themeBadge } from '../../utils/themeUtils';
import React, { useEffect, useState } from 'react';
import { GameRoom, DuvidoGameState, TeamId } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset, DUVIDO_SHOW_THEMES, DUVIDO_SHOW_WIN_TARGET } from '../../config/rulesets';
import { generateRoundContent, generateThemeStrictFallbackRound, sanitizeCleanGameText } from '../../utils/aiGameGenerator';
import { ActiveTurnBanner } from '../ActiveTurnBanner';
import { TEAM_META, getActiveTeamIds, getNextTeamId } from '../../utils/teamUtils';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  RotateCcw,
  Infinity,
  Minus,
  Eye,
  EyeOff
} from 'lucide-react';

interface ScreenDuvidoProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateDuvidoState: (updater: (prev: DuvidoGameState) => DuvidoGameState) => void;
  onNextRound: () => void;
  onRerollTheme?: () => void;
}

/**
 * UX-10: contestar. No programa o diretor arbitra polemicas (ex.: um item aceito ou recusado por engano). Se o juiz aceita a
 * contestacao depois que a equipe desafiada perdeu, a rodada volta para a execucao (sem tempo correndo) com a contagem de
 * itens preservada, e o juiz segue a partir dali. Nao faz nada se a equipe desafiada ganhou ou fora do resultado.
 */
export function contestDuvidoResult(prev: DuvidoGameState): DuvidoGameState {
  if (prev.phase !== 'RESULT') return prev;
  if (!prev.challengedTeam || prev.resultWinnerTeam === prev.challengedTeam) return prev;
  return {
    ...prev,
    phase: 'EXECUTION',
    timerActive: false,
    resultWinnerTeam: null,
    resultReason: ''
  };
}

export const ScreenDuvido: React.FC<ScreenDuvidoProps> = ({
  room,
  isTvMode = false,
  onUpdateDuvidoState,
  onNextRound,
  onRerollTheme
}) => {
  const duvido = room.duvido;
  const [freeBidInput, setFreeBidInput] = useState<string>('');
  const [showTvAnswers, setShowTvAnswers] = useState<boolean>(false);

  // Automatically keep answers hidden by default when round/category/phase changes
  useEffect(() => {
    setShowTvAnswers(false);
  }, [duvido?.roundData?.categoria_secreta, duvido?.phase]);

  const activeTeamIds = getActiveTeamIds(room);

  // Timer countdown during EXECUTION phase — strictly disabled when room.timerConfig === 0
  useEffect(() => {
    if (
      room.timerConfig === 0 ||
      !duvido ||
      duvido.phase !== 'EXECUTION' ||
      !duvido.timerActive
    ) {
      return;
    }

    const interval = setInterval(() => {
      onUpdateDuvidoState((prev) => {
        if (room.timerConfig === 0 || !prev.timerActive) {
          return { ...prev, timerActive: false };
        }
        if (prev.timerSeconds <= 1) {
          sounds.playBuzzer();
          const winningTeam = getNextTeamId(prev.challengedTeam || 'A', activeTeamIds);
          return {
            ...prev,
            phase: 'RESULT',
            timerActive: false,
            timerSeconds: 0,
            resultWinnerTeam: winningTeam,
            resultReason: 'TEMPO ESGOTADO! Não conseguiu atingir a meta apostada.'
          };
        }
        const nextSec = prev.timerSeconds - 1;
        if (nextSec <= 10) {
          sounds.playTick(nextSec);
        }
        return {
          ...prev,
          timerSeconds: nextSec
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room.timerConfig, duvido?.phase, duvido?.timerActive, onUpdateDuvidoState, activeTeamIds.length]);

  if (!duvido) {
    return (
      <div className="p-8 text-center font-mono-code text-cyan-300">
        Carregando rodada do Jogo do Duvido...
      </div>
    );
  }

  const handleRerollCategory = async () => {
    sounds.playPowerup();
    if (onRerollTheme) {
      onRerollTheme();
      return;
    }
    try {
      const generated = await generateRoundContent('duvido', room.theme, room.customConfig, [
        duvido.roundData.categoria_secreta
      ]);
      const data = generated.data as any;
      if (data && data.categoria_secreta) {
        onUpdateDuvidoState((prev) => ({
          ...prev,
          phase: 'AUCTION',
          roundData: {
            categoria_secreta: sanitizeCleanGameText(data.categoria_secreta, 'duvido'),
            dica_arbitro: data.dica_arbitro || prev.roundData.dica_arbitro,
            exemplos_validos: Array.isArray(data.exemplos_validos)
              ? data.exemplos_validos.slice(
                  0,
                  Math.max(20, room.customConfig?.duvidoExamplesCount || 20)
                )
              : prev.roundData.exemplos_validos,
            total_itens_possiveis:
              Number(data.total_itens_possiveis) || prev.roundData.total_itens_possiveis || 30
          },
          currentBid: 0,
          currentBidTeam: null,
          validCount: 0,
          timerActive: false,
          timerSeconds: room.timerConfig
        }));
        return;
      }
    } catch {
      // fallback below
    }
    onUpdateDuvidoState((prev) => {
      const fb = generateThemeStrictFallbackRound(
        'duvido',
        room.theme,
        room.theme,
        room.customConfig,
        [...(room.usedRoundSignatures || []), prev.roundData.categoria_secreta]
      );
      const picked = (fb.data as any) || prev.roundData;
      return {
        ...prev,
        phase: 'AUCTION',
        roundData: {
          ...picked,
          exemplos_validos: Array.isArray(picked.exemplos_validos)
            ? picked.exemplos_validos.slice(
                0,
                Math.max(20, room.customConfig?.duvidoExamplesCount || 20)
              )
            : prev.roundData.exemplos_validos
        },
        currentBid: 0,
        currentBidTeam: null,
        validCount: 0,
        timerActive: false,
        timerSeconds: room.timerConfig
      };
    });
  };

  const handleStartTimer = () => {
    if (room.timerConfig === 0) return;
    sounds.playPowerup();
    onUpdateDuvidoState((prev) => ({
      ...prev,
      timerActive: true
    }));
  };

  const handleManualAddValid = () => {
    sounds.playSuccess();
    onUpdateDuvidoState((prev) => {
      const targetMeta = Math.max(1, prev.currentBid);
      const nextCount = prev.validCount + 1;
      if (nextCount >= targetMeta) {
        confetti({ particleCount: 70, spread: 60 });
        return {
          ...prev,
          validCount: nextCount,
          phase: 'RESULT',
          timerActive: false,
          resultWinnerTeam: prev.challengedTeam,
          resultReason: `META DE ${targetMeta} ITENS ALCANÇADA COM SUCESSO!`
        };
      }
      return {
        ...prev,
        validCount: nextCount
      };
    });
  };

  const handleManualDecrementValid = () => {
    sounds.playTick();
    onUpdateDuvidoState((prev) => ({
      ...prev,
      validCount: Math.max(0, prev.validCount - 1)
    }));
  };

  const handleManualInvalidOrGiveUp = (reasonText: string) => {
    sounds.playBuzzer();
    onUpdateDuvidoState((prev) => {
      const winningTeam = getNextTeamId(prev.challengedTeam || 'A', activeTeamIds);
      return {
        ...prev,
        phase: 'RESULT',
        timerActive: false,
        resultWinnerTeam: winningTeam,
        resultReason: reasonText
      };
    });
  };

  const handleContestResult = () => {
    sounds.playFlip();
    onUpdateDuvidoState((prev) => contestDuvidoResult(prev));
  };

  const handleHostBid = (amount: number) => {
    const cleanAmount = Math.floor(amount);
    if (isNaN(cleanAmount) || cleanAmount <= duvido.currentBid) {
      sounds.playBuzzer();
      return;
    }
    sounds.playPowerup();
    setFreeBidInput('');
    onUpdateDuvidoState((prev) => {
      const nextTurnTeam = getNextTeamId(prev.activeTurnTeam, activeTeamIds);
      return {
        ...prev,
        phase: 'AUCTION',
        currentBid: cleanAmount,
        currentBidTeam: prev.activeTurnTeam,
        activeTurnTeam: nextTurnTeam
      };
    });
  };

  const handleHostCallDuvido = () => {
    if (duvido.currentBid <= 0) {
      sounds.playBuzzer();
      return;
    }
    sounds.playBuzzer();
    onUpdateDuvidoState((prev) => {
      const callingTeam = prev.activeTurnTeam;
      const challengedTeam = prev.currentBidTeam || getNextTeamId(callingTeam, activeTeamIds);
      return {
        ...prev,
        phase: 'EXECUTION',
        challengedTeam,
        validCount: 0,
        timerActive: room.timerConfig > 0,
        timerSeconds: room.timerConfig
      };
    });
  };

  const handleRotateDuvidoPlayer = () => {
    onUpdateDuvidoState((prev) => {
      const targetTeam = prev.phase === 'EXECUTION' ? prev.challengedTeam || prev.activeTurnTeam : prev.activeTurnTeam;
      const teamMembers = room.players.filter((p) => p.team === targetTeam);
      if (teamMembers.length <= 1) return prev;
      const curId = prev.activePlayerId || prev.negotiators?.[targetTeam] || teamMembers[0]?.id;
      const curIdx = teamMembers.findIndex((p) => p.id === curId);
      const nextMember = teamMembers[(curIdx + 1) % teamMembers.length];
      return {
        ...prev,
        activePlayerId: nextMember?.id
      };
    });
  };

  return (
    <div className="gap-1.5 h-full flex flex-col justify-between min-h-0 overflow-hidden">
      {/* REG-01: regras do programa — 9 temas, vence quem chegar a 5 */}
      {isShowRuleset(room.customConfig) && (
        <div
          data-testid="duvido-show-ruleset-chip"
          className="shrink-0 px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase tracking-wider text-center"
        >
          📺 Regras do programa · tema {Math.min(room.roundNumber, DUVIDO_SHOW_THEMES)} de {DUVIDO_SHOW_THEMES} · vence quem chegar a {DUVIDO_SHOW_WIN_TARGET} temas
        </div>
      )}

      {/* Top Header: Multi-Team Scoreboard Strip (2, 3, or 4 Teams) */}
      <div
        className={`grid gap-2 shrink-0 ${
          activeTeamIds.length === 2
            ? 'grid-cols-2'
            : activeTeamIds.length === 3
            ? 'grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        {activeTeamIds.map((tId) => {
          const meta = TEAM_META[tId];
          const tName = room.teams[tId]?.name || meta.defaultName;
          const tScore = room.teams[tId]?.score || 0;
          const isTurn =
            (duvido.phase === 'AUCTION' && duvido.activeTurnTeam === tId) ||
            (duvido.phase === 'EXECUTION' && duvido.challengedTeam === tId);
          return (
            <div
              key={tId}
              className={`px-3 py-1.5 border transition-all ${
                isTurn
                  ? `${meta.borderClass} ${meta.bgClass} ${meta.glowShadow}`
                  : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className={`font-anton text-sm md:text-base uppercase tracking-wide leading-none block truncate ${meta.textClass}`}>
                    {meta.equipeLabel}: {tName}
                  </span>
                  <div className="text-[10px] font-mono-code text-slate-300 truncate">
                    {duvido.phase === 'EXECUTION'
                      ? duvido.challengedTeam === tId
                        ? '🔥 DESAFIADA AGORA!'
                        : 'Fiscalizando'
                      : isTurn
                      ? '👉 APOSTANDO AGORA'
                      : 'Aguardando'}
                  </div>
                </div>
                <div className={`font-anton text-xl md:text-2xl leading-none shrink-0 ${meta.textClass}`}>
                  {tScore} PTS
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Turn Spotlight Banner */}
      <div className="shrink-0">
        <ActiveTurnBanner
          room={room}
          compact
          onRotateActivePlayer={handleRotateDuvidoPlayer}
          onSelectActiveTeam={(nextTeam) =>
            onUpdateDuvidoState((prev) => ({
              ...prev,
              activeTurnTeam: nextTeam,
              activePlayerId: undefined
            }))
          }
        />
      </div>

      {/* Dynamic 1-line Action Guidance Banner ("O que eu faço agora?") */}
      <div className="shrink-0 px-3 py-1 bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono-code">
        <div className="flex items-start sm:items-center gap-2 sm:truncate">
          <span className="w-2 h-2 rounded-full bg-[#17B8B8] animate-pulse shrink-0" />
          <span className="text-slate-300">
            {duvido.phase === 'BLINDFOLD' || duvido.phase === 'SECRET_CATEGORY' ? (
              <>🙈 <strong className="text-white">PREPARAÇÃO:</strong> Jogadores vendados • O árbitro confirma e inicia o leilão.</>
            ) : duvido.phase === 'AUCTION' ? (
              <>🚨 🎤 <strong className="text-white">VEZ DE APOSTAR: EQUIPE {duvido.activeTurnTeam}</strong> • Aumente o lance ou grite DUVIDO!</>
            ) : duvido.phase === 'EXECUTION' ? (
              <>⚡ 🎤 <strong className="text-white">BERLINDA: EQUIPE {duvido.challengedTeam}</strong> deve citar {duvido.currentBid} itens antes do cronômetro zerar!</>
            ) : (
              <>🏆 <strong className="text-white">FIM DA RODADA:</strong> Selecione a equipe vencedora (+1 ponto) e confirme os pontos.</>
            )}
          </span>
        </div>
        
      </div>

      {/* PERMANENT TOP THEME BANNER (shrink-0, Visible in AUCTION, BLINDFOLD & EXECUTION) */}
      {duvido.phase !== 'RESULT' && (
        <div
          data-testid="duvido-theme-banner"
          className="border border-[#17B8B8]/50 bg-white/[0.03] px-3 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0"
        >
          <div className="text-center sm:text-left space-y-0.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-mono-code text-[#17B8B8] font-bold uppercase tracking-widest">
                🎯 TEMA DA RODADA
              </span>
              {duvido.roundData.total_itens_possiveis > 0 && (
                <span
                  data-testid="duvido-total-items-badge"
                  className="px-2 py-0.5 bg-amber-950/60 border border-amber-400/50 text-[10px] font-mono-code font-bold text-amber-300 uppercase"
                >
                  📊 TETO OFICIAL: ~{duvido.roundData.total_itens_possiveis} ITENS POSSÍVEIS
                </span>
              )}
            </div>
            <h2
              data-testid="duvido-secret-category-title"
              className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[#17B8B8] uppercase leading-tight tracking-normal text-center sm:text-left max-w-4xl"
            >
              {sanitizeCleanGameText(duvido.roundData.categoria_secreta, 'duvido')}
            </h2>
            {duvido.roundData.dica_arbitro && (
              <div
                data-testid="duvido-referee-tip"
                className="text-[10px] font-mono-code text-amber-200/95 font-medium"
              >
                ⚠️ <strong className="text-amber-300 uppercase">Dica do Árbitro:</strong>{' '}
                {duvido.roundData.dica_arbitro}
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="duvido-reroll-theme-btn"
            onClick={handleRerollCategory}
            className="px-3 py-1 border border-amber-400/60 bg-amber-950/60 hover:bg-amber-400 text-amber-200 hover:text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw size={13} />
            <span>🔄 Sortear Outro Tema</span>
          </button>
        </div>
      )}

      {/* Main Central Stage (flex-1 min-h-0 overflow-y-auto scrollbar-none) */}
      <div className="border border-white/10 bg-white/[0.03] p-3 md:p-4 shadow-2xl relative flex-1 min-h-0 overflow-y-auto scrollbar-none flex flex-col justify-between gap-2">
        {/* Phase: Live Auction of Bluffs */}
        {(duvido.phase === 'AUCTION' || duvido.phase === 'BLINDFOLD' || duvido.phase === 'SECRET_CATEGORY') && (
          <div className="flex-1 min-h-0 flex flex-col justify-between text-center max-w-3xl mx-auto w-full gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
              <span className="px-3 py-0.5 border border-[#E6194B]/60 bg-[#E6194B]/15 text-rose-300 font-mono-code text-xs font-bold uppercase tracking-widest">
                FASE 1: LEILÃO DE APOSTAS
              </span>
              <span className="px-3 py-0.5 border border-amber-400/50 bg-amber-950/50 text-amber-300 font-mono-code text-xs font-bold uppercase">
                VEZ DE APOSTAR: EQUIPE {duvido.activeTurnTeam}
              </span>
            </div>

            {/* Central Current Bid Display (flex-1 min-h-0) */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-1 space-y-1">
              <div className="text-xs font-mono-code text-slate-400 uppercase">
                {duvido.currentBid > 0
                  ? `LANCE ATUAL NA MESA (EQUIPE ${duvido.currentBidTeam})`
                  : 'NENHUM LANCE AINDA — FAÇA O LANCE INICIAL'}
              </div>
              <div
                data-testid="duvido-current-bid-display"
                className="font-anton text-3xl sm:text-4xl md:text-5xl text-white leading-none"
              >
                {duvido.currentBid > 0 ? `${duvido.currentBid} ITENS` : 'FAÇA O LANCE INICIAL'}
              </div>
            </div>

            {/* Bottom Controls: [Input +1 +2] + Giant Red DUVIDO! Button (shrink-0) */}
            <div className="space-y-2 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-stretch">
                {/* 1. Free Numeric Input + Apostar Valor Button (spans 2 cols on md) */}
                <div className="md:col-span-2 flex items-stretch gap-1.5 bg-[#07080d] border border-[#17B8B8]/60 p-1">
                  <input
                    type="number"
                    data-testid="duvido-free-bid-input"
                    min={duvido.currentBid + 1}
                    value={freeBidInput}
                    onChange={(e) => setFreeBidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && freeBidInput) {
                        handleHostBid(Number(freeBidInput));
                      }
                    }}
                    placeholder={`Ex: ${Math.max(5, duvido.currentBid + 3)}`}
                    className="w-24 sm:w-28 bg-black border border-white/15 px-3 py-1 text-white font-anton text-lg text-center focus:outline-none focus:border-[#17B8B8]"
                  />
                  <button
                    type="button"
                    data-testid="duvido-free-bid-submit-btn"
                    onClick={() => handleHostBid(Number(freeBidInput))}
                    disabled={!freeBidInput || Number(freeBidInput) <= duvido.currentBid}
                    className="flex-1 px-3 py-1 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-anton text-sm uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    APOSTAR VALOR
                  </button>
                </div>

                {/* 2. Quick Button [+1] */}
                <button
                  type="button"
                  data-testid="duvido-bid-plus-1-btn"
                  onClick={() => handleHostBid(duvido.currentBid + 1)}
                  className="py-2 px-4 border border-[#17B8B8] bg-[#17B8B8]/15 hover:bg-[#17B8B8] text-cyan-200 hover:text-black font-anton text-lg md:text-xl uppercase tracking-wider transition-colors cursor-pointer"
                >
                  +1 ({duvido.currentBid + 1})
                </button>

                {/* 3. Quick Button [+2] */}
                <button
                  type="button"
                  data-testid="duvido-bid-plus-2-btn"
                  onClick={() => handleHostBid(duvido.currentBid + 2)}
                  className="py-2 px-4 border border-[#17B8B8] bg-[#17B8B8]/15 hover:bg-[#17B8B8] text-cyan-200 hover:text-black font-anton text-lg md:text-xl uppercase tracking-wider transition-colors cursor-pointer"
                >
                  +2 ({duvido.currentBid + 2})
                </button>
              </div>

              {/* Full-Width Giant Red DUVIDO! Button (shrink-0 py-3 md:py-3.5) */}
              <button
                type="button"
                data-testid="duvido-call-btn"
                onClick={handleHostCallDuvido}
                disabled={duvido.currentBid <= 0}
                className="w-full shrink-0 py-3 md:py-3.5 border border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-anton text-lg md:text-xl uppercase tracking-wider transition-all cursor-pointer"
              >
                🚨 DUVIDO! {duvido.currentBid > 0 ? `(DESAFIAR EQUIPE ${duvido.currentBidTeam} A FALAR ${duvido.currentBid} ITENS)` : '(FAÇA UM LANCE PRIMEIRO)'}
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Execution & Validation */}
        {duvido.phase === 'EXECUTION' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 w-full">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1 shrink-0">
              <div className="text-xs font-mono-code text-[#17B8B8] font-bold uppercase">
                EQUIPE DESAFIADA NA BERLINDA: <strong className="text-white">EQUIPE {duvido.challengedTeam}</strong>
              </div>
              <div className="text-xs font-mono-code text-amber-300 font-bold uppercase">
                META PARA VENCER: <strong className="text-white">{duvido.currentBid} ITENS</strong>
              </div>
            </div>

            {/* Giant Countdown & Hit Counter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch my-auto">
              {/* Countdown Timer or Free Mode Badge */}
              <div className="p-2.5 border border-[#E6194B]/60 bg-[#07080d] text-center flex flex-col items-center justify-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-rose-400 font-mono-code text-xs uppercase font-bold">
                  <Clock size={14} />
                  <span>{room.timerConfig === 0 ? 'MODO DE TEMPO' : 'CRONÔMETRO REGRESSIVO'}</span>
                </div>
                <div
                  data-testid="duvido-timer-display"
                  className={`font-anton text-3xl sm:text-4xl tracking-wide leading-none flex items-center justify-center gap-2 ${
                    room.timerConfig === 0
                      ? 'text-[#17B8B8]'
                      : duvido.timerSeconds <= 10
                      ? 'text-[#E6194B] animate-ping'
                      : 'text-white'
                  }`}
                >
                  {room.timerConfig === 0 ? (
                    <>
                      <Infinity className="w-7 h-7 stroke-[2.25] shrink-0 aspect-square text-[#17B8B8]" />
                      <span>LIVRE</span>
                    </>
                  ) : (
                    `${String(Math.floor(duvido.timerSeconds / 60)).padStart(2, '0')}:${String(duvido.timerSeconds % 60).padStart(2, '0')}`
                  )}
                </div>
                {room.timerConfig > 0 && !duvido.timerActive && (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="px-4 py-1 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    DISPARAR CRONÔMETRO ({room.timerConfig}S)
                  </button>
                )}
              </div>

              {/* Giant Hit Counter (X / Meta) */}
              <div className="p-2.5 border border-[#17B8B8]/60 bg-[#07080d] text-center flex flex-col items-center justify-center space-y-1">
                <div className="text-[#17B8B8] font-mono-code text-xs uppercase font-bold">
                  ITENS CITADOS / META DO LANCE
                </div>
                <div
                  data-testid="duvido-valid-counter"
                  className="font-anton text-3xl sm:text-4xl leading-none text-cyan-200"
                >
                  {duvido.validCount} / {duvido.currentBid}
                </div>
              </div>
            </div>

            {/* Conditional Execution Action Controls: Timed Mode vs Free Time Mode (shrink-0) */}
            <div className="space-y-2 shrink-0">
              {room.timerConfig > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      data-testid="duvido-add-valid-btn"
                      onClick={handleManualAddValid}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-base md:text-lg py-2 px-5 border border-emerald-300 uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={18} />
                      <span>✅ +1 ITEM VÁLIDO</span>
                    </button>

                    <button
                      type="button"
                      data-testid="duvido-undo-valid-btn"
                      onClick={handleManualDecrementValid}
                      disabled={duvido.validCount <= 0}
                      title="Desfazer clique acidental (-1)"
                      className="px-4 py-2 border border-white/20 bg-[#07080d] hover:bg-white/10 disabled:opacity-40 text-slate-200 font-anton text-sm uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Minus size={15} />
                      <span>-1</span>
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      data-testid="duvido-give-up-btn"
                      onClick={() =>
                        handleManualInvalidOrGiveUp(
                          'TEMPO ENCERRADO / DESISTÊNCIA! Ponto para a equipe que gritou Duvido.'
                        )
                      }
                      className="text-xs font-mono-code text-slate-400 hover:text-rose-400 underline cursor-pointer"
                    >
                      Encerrar Tempo (Desistiu)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    data-testid="duvido-add-valid-btn"
                    onClick={handleManualAddValid}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-anton text-base md:text-lg py-2 px-5 border border-emerald-300 uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={18} />
                    <span>✅ +1 ITEM VÁLIDO</span>
                  </button>

                  <button
                    type="button"
                    data-testid="duvido-invalid-item-btn"
                    onClick={() =>
                      handleManualInvalidOrGiveUp(
                        'ITEM INVÁLIDO OU REPETIDO! Ponto para a equipe que gritou Duvido.'
                      )
                    }
                    className="bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm md:text-base py-2 px-4 border border-rose-400 uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <XCircle size={18} />
                    <span>❌ ERROU / ITEM INVÁLIDO (FIM DA RODADA)</span>
                  </button>
                </div>
              )}

              {/* AI Examples for Referee Reference with Toggleable Eye (Hidden by Default) */}
              <div className="p-2 border border-white/10 bg-[#07080d] space-y-1.5 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold truncate">
                      Gabarito de apoio para o Árbitro ({duvido.roundData.exemplos_validos?.length || 0} respostas oficiais):
                    </span>
                    <span className="text-[9px] font-mono-code text-amber-300 font-semibold shrink-0">
                      {showTvAnswers ? '• Visível na TV' : '• Ocultado (Sem Spoilers)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-testid="duvido-toggle-tv-answers-btn"
                    onClick={() => {
                      sounds.playTick();
                      setShowTvAnswers((prev) => !prev);
                    }}
                    className="px-2.5 py-0.5 border border-cyan-400/50 bg-cyan-950/40 hover:bg-cyan-500 hover:text-black text-cyan-200 text-xs font-anton uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title={showTvAnswers ? 'Ocultar respostas na TV' : 'Revelar respostas na TV'}
                  >
                    {showTvAnswers ? (
                      <>
                        <EyeOff size={13} />
                        <span>Ocultar Gabarito</span>
                      </>
                    ) : (
                      <>
                        <Eye size={13} />
                        <span>Revelar Gabarito</span>
                      </>
                    )}
                  </button>
                </div>

                {showTvAnswers ? (
                  <div
                    data-testid="duvido-tv-answers-list"
                    className="flex flex-wrap gap-1 text-[11px] text-slate-300 pt-0.5"
                  >
                    {duvido.roundData.exemplos_validos?.slice(0, 20).map((ex, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-white/[0.04] border border-white/10 rounded-sm font-medium"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div
                    data-testid="duvido-tv-answers-hidden-notice"
                    className="py-1.5 px-3 border border-dashed border-white/10 bg-black/40 text-center flex items-center justify-center gap-2 text-slate-400 text-[11px] font-mono-code"
                  >
                    <span>🔒 Respostas ocultadas na TV para evitar cola dos participantes. Clique no botão de olho acima para espiar ou use o celular da equipe que duvida.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Result & Reversible Points Confirmation */}
        {duvido.phase === 'RESULT' && (
          <div className="my-auto py-2 text-center space-y-3 w-full max-w-2xl mx-auto">
            <div className="flex justify-center">
              <Trophy size={38} className="text-amber-400 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono-code text-[#17B8B8] font-bold uppercase tracking-widest">
                REVISÃO & CONFIRMAÇÃO DE PONTO DA RODADA
              </div>
              <h2 className="font-anton text-2xl md:text-4xl text-white uppercase">
                VENCEDOR: EQUIPE {duvido.resultWinnerTeam} (+1 PONTO)
              </h2>
              <p className="text-xs font-mono-code text-amber-200 font-semibold">
                {duvido.resultReason}
              </p>
            </div>

            {/* Reversible Winner Toggle (2, 3, or 4 teams) */}
            <div
              className={`grid gap-2.5 max-w-2xl mx-auto ${
                activeTeamIds.length === 2
                  ? 'grid-cols-2'
                  : activeTeamIds.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              {activeTeamIds.map((teamKey) => {
                const isSelected = duvido.resultWinnerTeam === teamKey;
                const meta = TEAM_META[teamKey];
                const tName = room.teams[teamKey]?.name || meta.defaultName;
                return (
                  <button
                    key={teamKey}
                    type="button"
                    data-testid={`duvido-select-winner-${teamKey}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      sounds.playTick();
                      onUpdateDuvidoState((prev) => ({
                        ...prev,
                        resultWinnerTeam: teamKey
                      }));
                    }}
                    className={`p-3 border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? `ring-2 ring-[#17B8B8] bg-[#17B8B8]/10 border-[#17B8B8] text-white`
                        : 'border-white/10 bg-[#07080d] text-slate-400 hover:border-white/30'
                    }`}
                  >
                    <span className="font-anton text-base uppercase truncate">
                      {meta.equipeLabel} ({tName})
                    </span>
                    <span className="font-mono-code text-xs font-bold text-[#17B8B8] shrink-0">
                      {isSelected ? '+1 PT ✓' : '+0'}
                    </span>
                  </button>
                );
              })}
            </div>

            {duvido.challengedTeam && duvido.resultWinnerTeam !== duvido.challengedTeam && (
              <div className="flex justify-center shrink-0">
                <button
                  type="button"
                  data-testid="duvido-contest-btn"
                  onClick={handleContestResult}
                  title="O juiz aceita a contestação: a equipe desafiada volta a tentar, com a contagem preservada"
                  className="px-4 py-1.5 border border-amber-400 bg-amber-400/10 hover:bg-amber-400 hover:text-black text-amber-300 font-anton text-xs uppercase tracking-wider cursor-pointer"
                >
                  ⚖️ Contestar: devolver a vez à equipe desafiada
                </button>
              </div>
            )}

            <div className="flex justify-center pt-1 shrink-0">
              <button
                type="button"
                data-testid="duvido-confirm-points-btn"
                onClick={onNextRound}
                className="px-8 py-2.5 border border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base uppercase tracking-wider shadow-neon-cyan transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Confirmar Pontos e Avançar ➔</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

