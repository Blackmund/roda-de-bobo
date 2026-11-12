import React from 'react';
import { ConfirmSendButton } from '../ConfirmSendButton';
import { GameRoom, Player, LimitePowerCardType } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { Lock } from 'lucide-react';
import { LIMITE_POWER_CARD_META } from '../../host/ScreenLimite';
import { resolveSwapPair } from '../../../utils/limiteSwap';

interface LimiteControllerProps {
  room: GameRoom;
  player: Player;
  selectedSwapTarget: string;
  selectedSwapTarget2: string;
  limiteGuess: string;
  setLimiteGuess: React.Dispatch<React.SetStateAction<string>>;
  setIsEditingLimiteGuess: React.Dispatch<React.SetStateAction<boolean>>;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (...args: any[]) => any;
  renderMobileTurnSpotlightBanner: (...args: any[]) => any;
  renderMobileTimerBanner: (...args: any[]) => any;
  isEditingLimiteGuess: boolean;
  setSelectedSwapTarget: React.Dispatch<React.SetStateAction<string>>;
  setSelectedSwapTarget2: React.Dispatch<React.SetStateAction<string>>;
}

export const LimiteController: React.FC<LimiteControllerProps> = ({
  room,
  player,
  selectedSwapTarget,
  selectedSwapTarget2,
  limiteGuess,
  setLimiteGuess,
  setIsEditingLimiteGuess,
  onUpdateRoom,
  wrapIfMultiMode,
  renderMobileTurnSpotlightBanner,
  renderMobileTimerBanner,
  isEditingLimiteGuess,
  setSelectedSwapTarget,
  setSelectedSwapTarget2
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'limite' && room.limite)) return null;

    const limite = room.limite;
    const myGuess = limite.guesses[player.id];
    const myAssignedCard: LimitePowerCardType =
      limite.assignedPowerCards?.[player.id] || player.assignedPowerCard || 'x2';
    const myCardMeta = LIMITE_POWER_CARD_META[myAssignedCard];
    const isMyPowerCardUsed = Boolean(
      limite.usedPowerCardsByPlayer?.[player.id] ||
        player.powerCardUsed ||
        limite.powerCardsPlayed?.[player.id]
    );
    const otherPlayers = room.players.filter((p) => p.id !== player.id);
    const swapPairView = resolveSwapPair(
      [...otherPlayers.map((p) => p.id), player.id],
      selectedSwapTarget,
      selectedSwapTarget2
    );
    const isTimeExpired =
      (room.timerConfig > 0 && (limite.timerSeconds ?? 0) <= 0) ||
      (limite.revealCountdown !== null && limite.revealCountdown !== undefined);

    const handleSendGuess = () => {
      if (isTimeExpired) return;
      const normalized = limiteGuess.replace(',', '.');
      const num = parseFloat(normalized);
      if (isNaN(num)) return;
      sounds.playSuccess();
      setLimiteGuess('');
      setIsEditingLimiteGuess(false);
      onUpdateRoom((prev) => ({
        ...prev,
        limite: prev.limite
          ? {
              ...prev.limite,
              guesses: { ...prev.limite.guesses, [player.id]: num },
              submittedPlayers: Array.from(new Set([...prev.limite.submittedPlayers, player.id]))
            }
          : undefined
      }));
    };

    const handlePlayCard = (card: LimitePowerCardType) => {
      if (isMyPowerCardUsed || isTimeExpired) {
        sounds.playBuzzer();
        return;
      }
      sounds.playPowerup();
      onUpdateRoom((prev) => {
        const updatedCards = { ...player.powerCards, [card]: true };
        const updatedPlayers = prev.players.map((p) =>
          p.id === player.id
            ? { ...p, powerCards: updatedCards, powerCardUsed: true }
            : p
        );

        let newPhase = prev.limite?.phase;
        let callTimer = prev.limite?.callTimerRemaining || 0;

        if (card === 'ligacao') {
          newPhase = 'CALL_TIMEOUT';
          callTimer = prev.customConfig?.limiteCallTimeoutSeconds || 30;
        }

        // REG-05: Reverse troca os palpites de dois jogadores escolhidos (adversarios primeiro).
        const swapPair = resolveSwapPair(
          [...prev.players.filter((p) => p.id !== player.id).map((p) => p.id), player.id],
          selectedSwapTarget,
          selectedSwapTarget2
        );

        return {
          ...prev,
          players: updatedPlayers,
          limite: prev.limite
            ? {
                ...prev.limite,
                activePowerCard: card,
                phase: newPhase || prev.limite.phase,
                callTimerRemaining: callTimer,
                powerCardsPlayed: { ...prev.limite.powerCardsPlayed, [player.id]: card },
                usedPowerCardsByPlayer: {
                  ...(prev.limite.usedPowerCardsByPlayer || {}),
                  [player.id]: true
                },
                swapTarget: card === 'troca' && swapPair ? swapPair : prev.limite.swapTarget
              }
            : undefined
        };
      });
    };

    const powerCardsEnabled = room.customConfig?.limiteEnablePowerCards !== false;
    const callTimeoutSec = room.customConfig?.limiteCallTimeoutSeconds || 30;
    const isScoringPhase = limite.phase === 'SCORING';
    const isMyWinner = Boolean(limite.winners?.includes(player.id));
    const isMyBusted = Boolean(limite.bustedPlayers?.includes(player.id));

    return wrapIfMultiMode(
      <div className="min-h-screen bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* Neutral Question Box with Fliperama: Jogo do Limite on top */}
          <div
            data-testid="controller-limite-question-box"
            className="border border-slate-700/80 bg-slate-900/60 p-3.5 text-center space-y-1.5"
          >
            <span className="block font-anton text-sm text-slate-400 uppercase tracking-widest">
              🕹️ FLIPERAMA: JOGO DO LIMITE
            </span>
            <p className="text-sm font-semibold text-slate-100 leading-snug">
              {limite.roundData.pergunta}
            </p>
          </div>

          {/* Suspense Countdown Banner before reveal */}
          {limite.revealCountdown !== null &&
            limite.revealCountdown !== undefined &&
            limite.revealCountdown > 0 && (
              <div
                data-testid="controller-limite-suspense-countdown"
                className="border-2 border-amber-400 bg-amber-950/80 p-4 text-center space-y-2 animate-pulse shadow-[0_0_25px_rgba(251,191,36,0.5)]"
              >
                <div className="text-xs font-mono-code text-amber-300 font-bold uppercase tracking-widest">
                  ⏳ ATENÇÃO! REVELANDO A RESPOSTA EM:
                </div>
                <div
                  data-testid="controller-limite-countdown-number"
                  className="font-anton text-6xl text-amber-300 leading-none"
                >
                  {limite.revealCountdown}
                </div>
                <div className="text-[11px] font-mono-code text-amber-200">
                  🔔 Olhe para a tela da TV!
                </div>
              </div>
            )}

          {/* Guess Section: Secret until SCORING phase */}
          {isScoringPhase ? (
            <div
              data-testid="controller-limite-reveal-box"
              className="border-2 border-cyan-400 bg-[#090b14] p-4 text-center space-y-2 shadow-neon-cyan"
            >
              <div className="text-[10px] font-mono-code text-cyan-300 font-bold uppercase tracking-widest">
                RESPOSTA OFICIAL REVELADA
              </div>
              <div className="font-anton text-3xl text-cyan-300">
                {limite.roundData.valor_exato.toLocaleString('pt-BR')} {limite.roundData.unidade}
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono-code text-slate-200">
                Seu palpite revelado:{' '}
                <span className="font-bold text-white">
                  {myGuess !== undefined ? myGuess.toLocaleString('pt-BR') : 'Não enviado'}
                </span>
              </div>
              {isMyWinner && (
                <div className="text-xs font-anton text-emerald-400 uppercase tracking-wider">
                  🏆 VOCÊ PONTUOU NESTA RODADA! (+{limite.pointsAwarded?.[player.id] || 1} PTS)
                </div>
              )}
              {isMyBusted && !isMyWinner && (
                <div className="text-xs font-anton text-rose-400 uppercase tracking-wider">
                  💥 SEU PALPITE PASSOU DO VALOR EXATO!
                </div>
              )}
            </div>
          ) : myGuess !== undefined && !isEditingLimiteGuess ? (
            <div
              data-testid="controller-limite-secret-locked"
              className="border-2 border-emerald-400/70 bg-emerald-950/20 p-5 text-center space-y-3"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                <Lock size={24} />
              </div>
              <div className="font-anton text-xl text-emerald-300 uppercase tracking-wider">
                🔒 PALPITE SECRETO ENVIADO!
              </div>
              <p className="text-xs font-mono-code text-slate-300">
                Seu palpite está guardado em segredo até a hora de revelar a resposta do jogo total.
              </p>
              {isTimeExpired ? (
                <div
                  data-testid="controller-limite-time-expired-lock"
                  className="p-2.5 border-2 border-rose-500/60 bg-rose-950/50 text-rose-300 font-mono-code text-xs font-bold uppercase tracking-wider text-center"
                >
                  🔒 TEMPO ESGOTADO — PALPITE BLOQUEADO!
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="controller-limite-edit-secret-btn"
                  onClick={() => {
                    sounds.playTick();
                    setLimiteGuess('');
                    setIsEditingLimiteGuess(true);
                  }}
                  className="w-full py-2.5 border border-slate-600 bg-slate-900 hover:border-cyan-400 text-slate-200 font-anton text-xs uppercase tracking-wider cursor-pointer"
                >
                  ✏️ ALTERAR MEU PALPITE SECRETO
                </button>
              )}
            </div>
          ) : isTimeExpired ? (
            <div
              data-testid="controller-limite-time-expired-unsubmitted"
              className="border-2 border-rose-500/70 bg-rose-950/30 p-5 text-center space-y-2 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300">
                <Lock size={24} />
              </div>
              <div className="font-anton text-xl text-rose-300 uppercase tracking-wider">
                ⏰ TEMPO ESGOTADO!
              </div>
              <p className="text-xs font-mono-code text-rose-200">
                {myGuess !== undefined
                  ? `Seu palpite anterior foi mantido e bloqueado. Aguarde a revelação na tela!`
                  : `O prazo para enviar palpites encerrou. Aguarde a revelação na tela!`}
              </p>
            </div>
          ) : (
            <div className="border-2 border-cyan-400 bg-black p-4 space-y-3 shadow-neon-cyan">
              <label
                htmlFor="controller-limite-guess"
                className="block text-xs font-mono-code text-cyan-300 font-bold"
              >
                DIGITE SEU PALPITE SECRETO ({limite.roundData.unidade}):
              </label>
              <input
                id="controller-limite-guess"
                name="controllerLimiteGuess"
                type="number"
                step="any"
                autoComplete="off"
                value={limiteGuess}
                onChange={(e) => setLimiteGuess(e.target.value)}
                placeholder="Ex: 485"
                className="w-full bg-black border-2 border-cyan-400 p-3 text-white font-anton text-3xl text-center focus:outline-none"
              />
              <ConfirmSendButton
                onConfirm={handleSendGuess}
                disabled={!limiteGuess}
                label="🔒 ENVIAR PALPITE SECRETO"
                confirmLabel={`⚠️ ENVIAR ${limiteGuess} ${limite.roundData.unidade}? TOQUE DE NOVO`}
                className="w-full py-3 border-2 border-cyan-300 bg-cyan-400 disabled:opacity-50 text-black font-anton text-base uppercase tracking-wider cursor-pointer"
              />
              {isEditingLimiteGuess && (
                <button
                  type="button"
                  onClick={() => setIsEditingLimiteGuess(false)}
                  className="w-full py-1.5 text-xs font-mono-code text-slate-400 hover:text-white uppercase cursor-pointer"
                >
                  Cancelar alteração
                </button>
              )}
            </div>
          )}

          {/* 1 Drawn Power Card per Player (Single-Use in the Match) */}
          {powerCardsEnabled && (
            <div
              data-testid="controller-limite-power-card-box"
              className="border border-slate-700 bg-[#0c0d16] p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-anton text-amber-300 uppercase tracking-wider">
                  🎲 SEU PODER SORTEADO NO JOGO:
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                    isMyPowerCardUsed
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-emerald-400 text-black'
                  }`}
                >
                  {isMyPowerCardUsed ? 'JÁ USADO (0/1)' : 'USO ÚNICO (1/1)'}
                </span>
              </div>

              <div
                className={`p-3 border ${myCardMeta.borderClass} ${myCardMeta.bgClass} space-y-2`}
              >
                <div className={`font-anton text-base uppercase ${myCardMeta.textClass}`}>
                  {myCardMeta.icon}{' '}
                  {myAssignedCard === 'ligacao'
                    ? `Carta Ligação (${callTimeoutSec}s)`
                    : myCardMeta.title}
                </div>
                <p className="text-xs font-mono-code text-slate-200 leading-relaxed">
                  {myCardMeta.description}
                </p>

                {myAssignedCard === 'troca' && !isMyPowerCardUsed && room.players.length >= 2 && (
                  <div className="pt-1 space-y-1" data-testid="limite-swap-picker">
                    <label className="block text-[10px] font-mono-code text-cyan-300 uppercase font-bold">
                      Trocar os palpites de quais dois jogadores?
                    </label>
                    {[0, 1].map((slot) => (
                      <select
                        key={slot}
                        data-testid={`limite-swap-select-${slot + 1}`}
                        value={slot === 0 ? swapPairView?.player1 || '' : swapPairView?.player2 || ''}
                        onChange={(e) =>
                          slot === 0 ? setSelectedSwapTarget(e.target.value) : setSelectedSwapTarget2(e.target.value)
                        }
                        className="w-full bg-black border border-cyan-400/60 px-2.5 py-1.5 text-xs font-mono-code text-white"
                      >
                        {[...otherPlayers, player].map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.avatar} {op.name}
                            {op.id === player.id ? ' (você)' : ''}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  data-testid="controller-limite-use-power-btn"
                  onClick={() => handlePlayCard(myAssignedCard)}
                  disabled={isMyPowerCardUsed || isScoringPhase || (myAssignedCard === 'troca' && !swapPairView)}
                  className="w-full py-2.5 border border-amber-300 bg-amber-400 hover:bg-amber-300 disabled:opacity-35 text-black font-anton text-sm uppercase tracking-wider cursor-pointer"
                >
                  {isMyPowerCardUsed
                    ? '✓ PODER JÁ UTILIZADO NESTE JOGO'
                    : `⚡ USAR ${myCardMeta.title.toUpperCase()} AGORA`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
