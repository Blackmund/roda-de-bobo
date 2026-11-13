import React from 'react';
import { PlayerMark } from '../../rdb/PlayerMark';
import { GameRoom, Player } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { ensureStrictForbiddenWordsCount } from '../../../utils/proibidoGoldenDatabase';
import { applyProibidoCardOutcome, getProibidoPlayerRole, getNextProibidoTurnInfo } from '../../host/ScreenProibido';

interface ProibidoControllerProps {
  room: GameRoom;
  player: Player;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  wrapIfMultiMode: (...args: any[]) => any;
  renderMobileTurnSpotlightBanner: (...args: any[]) => any;
  renderMobileTimerBanner: (...args: any[]) => any;
  onNextRound?: () => void;
}

export const ProibidoController: React.FC<ProibidoControllerProps> = ({
  room,
  player,
  onUpdateRoom,
  wrapIfMultiMode,
  renderMobileTurnSpotlightBanner,
  renderMobileTimerBanner,
  onNextRound
}) => {
  // Mantem o estreitamento de tipos que o bloco tinha dentro do componente original.
  if (!(room.activeGame === 'proibido' && room.proibido)) return null;

    const proibido = room.proibido;
    const currentCard = proibido.cards[proibido.currentCardIndex];
    const roleInfo = getProibidoPlayerRole(proibido, player, room.players);
    const { isSpeaker, isGuesser, isReferee, speakerPlayer, guesserPlayer } = roleInfo;
    const nextTurn = getNextProibidoTurnInfo(room);
    const is2Player = Boolean(proibido.is2PlayerMode || room.players.length === 2);

    const updateProibidoCircular = (outcome: 'correct' | 'foul' | 'skipped') => {
      onUpdateRoom((prev) => {
        if (!prev.proibido || prev.proibido.phase === 'SUMMARY') return prev;
        const { nextState } = applyProibidoCardOutcome(prev.proibido, outcome);
        return {
          ...prev,
          proibido: nextState
        };
      });
    };

    const handleHitCard = () => {
      sounds.playSuccess();
      updateProibidoCircular('correct');
    };

    const handleSkipCard = () => {
      sounds.playFlip();
      updateProibidoCircular('skipped');
    };

    const handleFoulCard = () => {
      sounds.playBuzzer();
      updateProibidoCircular('foul');
    };

    const handleStartTimerFromMobile = () => {
      sounds.playPowerup();
      onUpdateRoom((prev) => {
        if (!prev.proibido) return prev;
        return {
          ...prev,
          proibido: {
            ...prev.proibido,
            phase: 'PLAYING',
            timerActive: room.timerConfig > 0
          }
        };
      });
    };

    return wrapIfMultiMode(
      <div className="bg-[#07080d] p-4 flex flex-col justify-between max-w-md mx-auto space-y-4">
        <div className="space-y-4">
          {renderMobileTurnSpotlightBanner()}
          {renderMobileTimerBanner()}

          {/* Role Badge Indicator */}
          <div
            data-testid="controller-proibido-role-badge"
            className={`p-2.5 border-2 text-center space-y-0.5 ${
              isGuesser
                ? 'border-amber-400 bg-amber-950/70 text-amber-200'
                : isSpeaker
                ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200'
                : isReferee
                ? 'border-rose-500 bg-rose-950/70 text-rose-200'
                : 'border-slate-700 bg-black/60 text-slate-300'
            }`}
          >
            <div className="font-anton text-base uppercase tracking-wider">
              {isGuesser
                ? '🙈 VOCÊ É O ADIVINHADOR (DE OLHO FECHADO)'
                : isSpeaker
                ? '🗣️ VOCÊ É O ORADOR (QUEM FALA E DÁ PISTAS)'
                : isReferee
                ? '🚨 VOCÊ É O FISCAL (ÁRBITRO ADVERSÁRIO)'
                : '👀 ESPECTADOR'}
            </div>
            <div className="text-[10px] font-mono-code opacity-90">
              {isGuesser
                ? `Feche os olhos ou fique de costas! Ouça as pistas de ${speakerPlayer?.name}.`
                : isSpeaker
                ? `Explique as palavras para ${guesserPlayer?.name} sem falar as proibidas!`
                : isReferee
                ? `Fiscalize se ${speakerPlayer?.name} pronuncia alguma palavra proibida.`
                : `Aguarde a sua vez na roda.`}
            </div>
          </div>

          {/* PHASE 1: READY */}
          {proibido.phase === 'READY' && (
            <div className="border-2 border-cyan-400 bg-[#090b14] p-5 text-center space-y-3">
              <div className="text-xl font-anton text-white uppercase">
                RODADA PRONTA // {proibido.cards.length} CARTAS
              </div>
              <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                {isGuesser
                  ? `Você vai adivinhar! Feche os olhos ou fique de costas para a TV. As palavras não vão aparecer na sua tela para não dar spoiler.`
                  : isSpeaker
                  ? `Você vai falar! Assim que o tempo começar, descreva cada carta para ${guesserPlayer?.name} sem pronunciar as 5 palavras proibidas.`
                  : `Prepare-se para fiscalizar com o botão de falta.`}
              </p>
              {(isSpeaker || player.isVip || player.id === room.hostId) && (
                <button
                  type="button"
                  data-testid="controller-proibido-start-timer-btn"
                  onClick={handleStartTimerFromMobile}
                  className="w-full py-3.5 border-2 border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base uppercase tracking-wider cursor-pointer shadow-neon-cyan"
                >
                  {room.timerConfig === 0
                    ? 'INICIAR RODADA (TEMPO LIVRE)'
                    : `INICIAR CRONÔMETRO (${room.timerConfig}S) ➔`}
                </button>
              )}
            </div>
          )}

          {/* PHASE 2: SUMMARY (WHEN TIMER ENDS OR ALL CARDS COMPLETED) */}
          {proibido.phase === 'SUMMARY' && (
            <div
              data-testid="controller-proibido-summary-panel"
              className="border-2 border-[#17B8B8] bg-[#07080d] p-4 text-center space-y-3 shadow-neon-cyan"
            >
              <div className="inline-block px-3 py-0.5 bg-[#E6194B] text-white font-anton text-xs uppercase tracking-widest">
                ⏰ TEMPO ESGOTADO!
              </div>
              <div className="font-anton text-2xl text-white uppercase">
                PONTUAÇÃO: <span className="text-[#17B8B8]">+{proibido.roundScore} PONTOS</span>
              </div>
              <p className="text-xs font-mono-code text-slate-300">
                {is2Player
                  ? `${proibido.roundScore} de ${proibido.cards.length} palavras acertadas em equipe cooperativa!`
                  : `${proibido.roundScore} de ${proibido.cards.length} palavras acertadas pela Equipe ${proibido.speakerTeam}!`}
              </p>

              {/* Next player notice */}
              <div className="p-2.5 border border-white/10 bg-white/[0.03] space-y-1">
                <div className="text-[10px] font-mono-code text-cyan-300 font-bold uppercase">
                  {nextTurn.isGameOver ? '🏁 PARTIDA FINALIZADA' : '👉 PRÓXIMA VEZ / PRÓXIMO A FALAR:'}
                </div>
                <div className="font-anton text-base text-white uppercase flex items-center justify-center gap-1.5">
                  <PlayerMark p={{ name: nextTurn.nextSpeakerName }} />
                  <span className="text-amber-300">{nextTurn.nextSpeakerName}</span>
                  <span className="text-slate-400 text-xs font-mono-code">
                    ({nextTurn.nextTeamName})
                  </span>
                </div>
              </div>

              {onNextRound && (
                <button
                  type="button"
                  data-testid="controller-proibido-next-turn-btn"
                  onClick={onNextRound}
                  className="w-full py-3.5 border-2 border-[#17B8B8] bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-base uppercase tracking-wider cursor-pointer shadow-neon-cyan flex items-center justify-center gap-2"
                >
                  <span>
                    {nextTurn.isGameOver
                      ? '🏆 VER PLACAR FINAL ➔'
                      : `AVANÇAR PARA ${nextTurn.nextSpeakerName.toUpperCase()} ➔`}
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          )}

          {/* PHASE 3: PLAYING */}
          {proibido.phase === 'PLAYING' && (
            <>
              {/* GUESSER BLINDFOLD VIEW: ZERO SPOILERS / NO WORDS EVER */}
              {isGuesser ? (
                <div
                  data-testid="controller-proibido-guesser-blindfold"
                  className="border-2 border-amber-400 bg-[#0d0d16] p-6 text-center space-y-4 shadow-lg"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl">
                    🙈
                  </div>
                  <div className="space-y-1">
                    <div className="font-anton text-2xl text-amber-300 uppercase">
                      VOCÊ ESTÁ ADIVINHANDO!
                    </div>
                    <div className="text-xs font-mono-code text-rose-300 uppercase font-bold">
                      FECHE OS OLHOS OU FIQUE DE COSTAS PARA A TELA
                    </div>
                  </div>
                  <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                    Ouça atentamente as pistas de <strong className="text-cyan-300 font-anton">{speakerPlayer?.name}</strong> e
                    tente adivinhar a palavra-alvo antes do tempo acabar!
                  </p>
                  <div className="p-2 border border-white/10 bg-black/50 text-[11px] font-mono-code text-cyan-200">
                    Carta {proibido.currentCardIndex + 1} de {proibido.cards.length} · Acertos: <strong className="text-emerald-400">+{proibido.roundScore}</strong>
                  </div>
                  <div className="text-[10px] font-mono-code text-amber-400/80 font-bold uppercase">
                    🔒 Palavras secretas ocultadas no seu celular para não estragar o jogo
                  </div>
                </div>
              ) : (
                /* SPEAKER OR REFEREE VIEW (SHOWS CARD & WORDS) */
                <div className="border-2 border-rose-500 bg-[#090b14] p-4 space-y-3">
                  <div className="bg-rose-600 text-white p-3 text-center">
                    <span className="text-[10px] font-mono-code uppercase block">PALAVRA-ALVO</span>
                    <div className="font-anton text-3xl uppercase">{currentCard?.palavra_alvo}</div>
                  </div>

                  <div className="border border-rose-500/40 bg-black/60 p-3 space-y-1">
                    <span className="text-[10px] font-mono-code uppercase text-rose-400 block text-center font-bold">
                      PALAVRAS PROIBIDAS (NÃO PODE FALAR):
                    </span>
                    {ensureStrictForbiddenWordsCount(
                      currentCard?.palavra_alvo,
                      currentCard?.palavras_proibidas,
                      5,
                      room.theme
                    ).map((w, idx) => (
                      <div key={idx} className="font-anton text-lg text-rose-300 text-center uppercase">
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons based on role */}
              {isSpeaker && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleHitCard}
                    data-testid="controller-proibido-hit-btn"
                    className="py-4 border border-emerald-400 bg-emerald-600 text-white font-anton text-base uppercase cursor-pointer"
                  >
                    ACERTOU! (+1)
                  </button>
                  <button
                    onClick={handleSkipCard}
                    data-testid="controller-proibido-skip-btn"
                    className="py-4 border border-slate-600 bg-slate-800 text-slate-300 font-anton text-base uppercase cursor-pointer"
                  >
                    PULAR CARTA
                  </button>
                </div>
              )}

              {isReferee && (
                <button
                  onClick={handleFoulCard}
                  data-testid="controller-proibido-foul-btn"
                  className="w-full py-5 border-2 border-rose-500 bg-rose-600 text-white font-anton text-2xl uppercase tracking-widest shadow-neon-rose flex items-center justify-center gap-2 cursor-pointer"
                >
                  <AlertTriangle size={24} />
                  <span>🚨 FALTA! (FALOU PROIBIDA)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
