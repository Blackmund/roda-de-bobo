import { themeBadge } from '../../utils/themeUtils';
import React, { useEffect, useState } from 'react';
import { GameRoom, DuvidoGameState, TeamId } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset, DUVIDO_SHOW_THEMES, DUVIDO_SHOW_WIN_TARGET } from '../../config/rulesets';
import { generateRoundContent, generateThemeStrictFallbackRound, sanitizeCleanGameText } from '../../utils/aiGameGenerator';
import { ActiveTurnBanner } from '../ActiveTurnBanner';
import { TEAM_META, getActiveTeamIds, getNextTeamId } from '../../utils/teamUtils';
import confetti from 'canvas-confetti';
import { Check, Clock, XCircle, ArrowRight, RotateCcw, Infinity, Minus, Eye, EyeOff, Info, Lightbulb, ListChecks, Scale, Siren, X as XIcon } from 'lucide-react';
import { DuvidoAnswerCheck, type DuvidoCheckVerdict } from './duvido/DuvidoAnswerCheck';

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
  const [checkQuery, setCheckQuery] = useState<string>('');
  const [checkResult, setCheckResult] = useState<DuvidoCheckVerdict | null>(null);

  // Automatically keep answers hidden by default when round/category/phase changes
  useEffect(() => {
    setShowTvAnswers(false);
  }, [duvido?.roundData?.categoria_secreta, duvido?.phase]);

  // Clear check state only when the category/round changes (keep it across EXECUTION -> RESULT)
  useEffect(() => {
    setCheckQuery('');
    setCheckResult(null);
  }, [duvido?.roundData?.categoria_secreta]);

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

  const phase = duvido.phase;
  const inAuction = phase === 'AUCTION' || phase === 'BLINDFOLD' || phase === 'SECRET_CATEGORY';
  const category = sanitizeCleanGameText(duvido.roundData.categoria_secreta, 'duvido');
  const show = isShowRuleset(room.customConfig);
  const clock = room.timerConfig === 0 ? 'Livre' : `${String(Math.floor(duvido.timerSeconds / 60)).padStart(2, '0')}:${String(duvido.timerSeconds % 60).padStart(2, '0')}`;
  const clockHot = room.timerConfig !== 0 && duvido.timerSeconds <= 10 && duvido.timerActive;
  const teamLabel = (tId: TeamId) => room.teams[tId]?.name || TEAM_META[tId].defaultName;

  return (
    <div className="rdb-duv">
      {/* Barra: o essencial aparece, o resto vira icone com dica */}
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Duvido
          {show && (
            <span data-testid="duvido-show-ruleset-chip" className="rdb-lim-round">
              Tema {Math.min(room.roundNumber, DUVIDO_SHOW_THEMES)}/{DUVIDO_SHOW_THEMES}
            </span>
          )}
        </span>
        <span
          className="rdb-lim-rule"
          tabIndex={0}
          data-tip={
            show
              ? `Regras do programa: ${DUVIDO_SHOW_THEMES} temas, vence quem chegar a ${DUVIDO_SHOW_WIN_TARGET}. Quem aposta mais itens sobre o tema é desafiado a citá-los; se falhar, o rival ganha o ponto.`
              : 'Quem aposta mais itens sobre o tema é desafiado a citá-los; se falhar, o rival ganha o ponto.'
          }
        >
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          {phase === 'EXECUTION' && (
            <button
              type="button"
              data-testid="duvido-toggle-tv-answers-btn"
              className={'rdb-lim-icon' + (showTvAnswers ? ' is-on' : '')}
              aria-pressed={showTvAnswers}
              aria-label="Gabarito do árbitro"
              data-tip={showTvAnswers ? 'Esconder o gabarito' : 'Mostrar o gabarito (aparece na TV)'}
              onClick={() => {
                sounds.playTick();
                setShowTvAnswers((prev) => !prev);
              }}
            >
              {showTvAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {phase !== 'RESULT' && (
            <button
              type="button"
              data-testid="duvido-reroll-theme-btn"
              className="rdb-lim-icon"
              aria-label="Sortear outro tema"
              data-tip="Sortear outro tema"
              onClick={handleRerollCategory}
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Placar das equipes */}
      <div className="rdb-tem-strip rdb-duv-teams">
        {activeTeamIds.map((tId) => {
          const meta = TEAM_META[tId];
          const isTurn = (phase === 'AUCTION' && duvido.activeTurnTeam === tId) || (phase === 'EXECUTION' && duvido.challengedTeam === tId);
          const state = phase === 'EXECUTION' ? (duvido.challengedTeam === tId ? 'Na berlinda' : 'Fiscaliza') : isTurn ? 'Aposta agora' : '';
          return (
            <div
              key={tId}
              className={'rdb-tem-team is-strip' + (isTurn ? ' is-turn' : '')}
              style={{ ['--team' as string]: meta.hex }}
              aria-label={`${teamLabel(tId)}: ${room.teams[tId]?.score || 0} pontos`}
            >
              <span className="rdb-tem-team-name">{teamLabel(tId)}</span>
              {state && <span className="rdb-duv-state">{state}</span>}
              <span className="rdb-tem-team-pts">
                {room.teams[tId]?.score || 0}
                <small>pts</small>
              </span>
            </div>
          );
        })}
      </div>

      <div className="rdb-tem-turn">
        <ActiveTurnBanner
          room={room}
          onSelectActiveTeam={(nextTeam) =>
            onUpdateDuvidoState((prev) => ({
              ...prev,
              activeTurnTeam: nextTeam,
              activePlayerId: undefined
            }))
          }
        />
      </div>

      {/* O tema da rodada: o que importa para quem aposta */}
      {phase !== 'RESULT' && (
        <section data-testid="duvido-theme-banner" className="rdb-duv-theme">
          <span className="rdb-pro-label">Tema</span>
          <h2 data-testid="duvido-secret-category-title" className="rdb-duv-category" data-len={category.length > 70 ? 'l' : category.length > 40 ? 'm' : 's'}>
            {category}
          </h2>
          <div className="rdb-duv-meta">
            {duvido.roundData.total_itens_possiveis > 0 && (
              <span data-testid="duvido-total-items-badge" data-tip="Quantidade aproximada de itens que existem no tema">
                <ListChecks size={16} /> até ~{duvido.roundData.total_itens_possiveis}
              </span>
            )}
            {duvido.roundData.dica_arbitro && (
              <span data-testid="duvido-referee-tip" className="rdb-duv-tip">
                <Lightbulb size={16} /> {duvido.roundData.dica_arbitro}
              </span>
            )}
          </div>
        </section>
      )}

      <div className="rdb-duv-stage">
        {/* Fase 1: leilao */}
        {inAuction && (
          <>
            <div className="rdb-duv-bid">
              <span className="rdb-duv-bid-label">
                {duvido.currentBid > 0 ? `Lance de ${teamLabel(duvido.currentBidTeam as TeamId)}` : 'Nenhum lance ainda'}
              </span>
              <div
                data-testid="duvido-current-bid-display"
                className={'rdb-duv-bid-value' + (duvido.currentBid > 0 ? '' : ' is-text')}
              >
                {duvido.currentBid > 0 ? (
                  <>
                    {duvido.currentBid} <small>itens</small>
                  </>
                ) : (
                  'Faça o lance inicial'
                )}
              </div>
            </div>

            <div className="rdb-duv-controls">
              <div className="rdb-duv-free">
                <input
                  type="number"
                  data-testid="duvido-free-bid-input"
                  aria-label="Valor do lance"
                  min={duvido.currentBid + 1}
                  value={freeBidInput}
                  onChange={(e) => setFreeBidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && freeBidInput) handleHostBid(Number(freeBidInput));
                  }}
                  placeholder={`Ex: ${Math.max(5, duvido.currentBid + 3)}`}
                />
                <button
                  type="button"
                  data-testid="duvido-free-bid-submit-btn"
                  className="rdb-btn"
                  onClick={() => handleHostBid(Number(freeBidInput))}
                  disabled={!freeBidInput || Number(freeBidInput) <= duvido.currentBid}
                >
                  Apostar
                </button>
              </div>
              <button type="button" data-testid="duvido-bid-plus-1-btn" className="rdb-btn" onClick={() => handleHostBid(duvido.currentBid + 1)}>
                +1 <small>({duvido.currentBid + 1})</small>
              </button>
              <button type="button" data-testid="duvido-bid-plus-2-btn" className="rdb-btn" onClick={() => handleHostBid(duvido.currentBid + 2)}>
                +2 <small>({duvido.currentBid + 2})</small>
              </button>
            </div>

            <button
              type="button"
              data-testid="duvido-call-btn"
              className="rdb-btn rdb-duv-call"
              onClick={handleHostCallDuvido}
              disabled={duvido.currentBid <= 0}
            >
              <Siren /> Duvido!
              <small>
                {duvido.currentBid > 0 ? `${teamLabel(duvido.currentBidTeam as TeamId)} tem que falar ${duvido.currentBid}` : 'faça um lance primeiro'}
              </small>
            </button>
          </>
        )}

        {/* Fase 2: execucao */}
        {phase === 'EXECUTION' && (
          <>
            <div className="rdb-duv-exec">
              <div className="rdb-duv-panel">
                <span className="rdb-duv-panel-label">
                  {room.timerConfig === 0 ? <Infinity size={16} /> : <Clock size={16} />} Tempo
                </span>
                <div data-testid="duvido-timer-display" className={'rdb-duv-panel-value' + (clockHot ? ' is-hot' : '')}>
                  {clock}
                </div>
                {room.timerConfig > 0 && !duvido.timerActive && (
                  <button type="button" className="rdb-btn" onClick={handleStartTimer}>
                    Disparar ({room.timerConfig}s)
                  </button>
                )}
              </div>
              <div className="rdb-duv-panel is-count">
                <span className="rdb-duv-panel-label">Itens citados</span>
                <div data-testid="duvido-valid-counter" className="rdb-duv-panel-value">
                  {duvido.validCount} <small>/ {duvido.currentBid}</small>
                </div>
                <span className="rdb-duv-panel-sub">{teamLabel(duvido.challengedTeam as TeamId)} na berlinda</span>
              </div>
            </div>

            {showTvAnswers && (
              <div data-testid="duvido-tv-answers-list" className="rdb-duv-answers">
                {duvido.roundData.exemplos_validos?.slice(0, 20).map((ex, idx) => (
                  <span key={idx}>{ex}</span>
                ))}
              </div>
            )}

            <DuvidoAnswerCheck
              category={category}
              ruleTip={duvido.roundData.dica_arbitro}
              examples={duvido.roundData.exemplos_validos}
              query={checkQuery}
              onChangeQuery={setCheckQuery}
              result={checkResult}
              onResult={setCheckResult}
              compact
            />

            <div className="rdb-pro-foot rdb-duv-actions">
              <button type="button" data-testid="duvido-add-valid-btn" className="rdb-btn rdb-pro-hit" onClick={handleManualAddValid}>
                <Check size={20} strokeWidth={3} /> +1 item válido
              </button>
              {room.timerConfig > 0 && (
                <button
                  type="button"
                  data-testid="duvido-undo-valid-btn"
                  className="rdb-btn"
                  onClick={handleManualDecrementValid}
                  disabled={duvido.validCount <= 0}
                  data-tip="Desfazer um clique sem querer"
                >
                  <Minus /> 1
                </button>
              )}
              <div className="rdb-pro-foot-end">
                {room.timerConfig > 0 ? (
                  <button
                    type="button"
                    data-testid="duvido-give-up-btn"
                    className="rdb-btn rdb-tem-strike"
                    data-tip="Encerrar: o ponto vai para quem gritou Duvido"
                    onClick={() => handleManualInvalidOrGiveUp('TEMPO ENCERRADO / DESISTÊNCIA! Ponto para a equipe que gritou Duvido.')}
                  >
                    <XCircle /> Desistiu
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="duvido-invalid-item-btn"
                    className="rdb-btn rdb-tem-strike"
                    data-tip="Item inválido ou repetido: fim da rodada, ponto para quem gritou Duvido"
                    onClick={() => handleManualInvalidOrGiveUp('ITEM INVÁLIDO OU REPETIDO! Ponto para a equipe que gritou Duvido.')}
                  >
                    <XCircle /> Item inválido
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Fase 3: resultado */}
        {phase === 'RESULT' && (
          <div className="rdb-duv-result">
            <span className="rdb-lim-round">Resultado</span>
            <h2>
              {teamLabel(duvido.resultWinnerTeam as TeamId)} <small>leva o ponto</small>
            </h2>
            <p>{duvido.resultReason}</p>

            <DuvidoAnswerCheck
              category={category}
              ruleTip={duvido.roundData.dica_arbitro}
              examples={duvido.roundData.exemplos_validos}
              query={checkQuery}
              onChangeQuery={setCheckQuery}
              result={checkResult}
              onResult={setCheckResult}
            />

            <div className="rdb-tem-strip rdb-duv-pick">
              {activeTeamIds.map((teamKey) => {
                const isSelected = duvido.resultWinnerTeam === teamKey;
                return (
                  <button
                    key={teamKey}
                    type="button"
                    data-testid={`duvido-select-winner-${teamKey}`}
                    aria-pressed={isSelected}
                    className={'rdb-pro-sum-card' + (isSelected ? ' is-hit' : '')}
                    onClick={() => {
                      sounds.playTick();
                      onUpdateDuvidoState((prev) => ({ ...prev, resultWinnerTeam: teamKey }));
                    }}
                  >
                    <span className="rdb-pro-sum-top">
                      <strong>{teamLabel(teamKey)}</strong>
                      <span className="rdb-pro-sum-mark">{isSelected ? <Check size={18} strokeWidth={4} /> : <XIcon size={18} strokeWidth={4} />}</span>
                    </span>
                    <span className="rdb-pro-sum-words">{isSelected ? '+1 ponto' : 'sem ponto'}</span>
                  </button>
                );
              })}
            </div>

            <div className="rdb-duv-result-foot">
              {duvido.challengedTeam && duvido.resultWinnerTeam !== duvido.challengedTeam && (
                <button
                  type="button"
                  data-testid="duvido-contest-btn"
                  className="rdb-btn"
                  data-tip="O juiz aceita: a equipe desafiada volta a tentar, com a contagem preservada"
                  onClick={handleContestResult}
                >
                  <Scale /> Contestar
                </button>
              )}
              <button type="button" data-testid="duvido-confirm-points-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
                Confirmar pontos e avançar
                <ArrowRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
