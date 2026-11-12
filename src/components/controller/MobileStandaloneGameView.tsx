import React from 'react';
import { GameRoom, Player } from '../../types/game';
import { SpinningNumberWheel } from '../SpinningNumberWheel';
import { evaluateLimiteRoundReveal } from '../host/ScreenLimite';
import { sounds } from '../../utils/soundEffects';
import {
  Crown,
  Clock,
  Infinity as InfinityIcon,
  Trophy,
  Sparkles,
  ArrowRight,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { PlayerMark } from '../rdb/PlayerMark';

export interface MobileStandaloneGameViewProps {
  room: GameRoom;
  player: Player;
  isLeader: boolean;
  activeTimerSeconds: number | null;
  isInfiniteTimer: boolean;
  onSyncState: () => void;
  onLeaveRoom: () => void;
  onLeaderNextRound?: () => void;
  onUpdateRoom: (updater: (prev: GameRoom) => GameRoom) => void;
  children: React.ReactNode;
}

const GAME_TITLES: Record<string, string> = {
  limite: '🎯 JOGO DO LIMITE',
  duvido: '🚨 JOGO DO DUVIDO',
  proibido: '🚫 JOGO DO PROIBIDO',
  nota: '🔟 JOGO DA NOTA',
  'tem-ou-nao-tem': '📊 TEM OU NÃO TEM',
  'perguntas-e-verdades': '🃏 PERGUNTAS E VERDADES'
};

export const MobileStandaloneGameView: React.FC<MobileStandaloneGameViewProps> = React.memo(({
  room,
  player,
  isLeader,
  activeTimerSeconds,
  isInfiniteTimer,
  onSyncState,
  onLeaveRoom,
  onLeaderNextRound,
  onUpdateRoom,
  children
}) => {
  const isIndividual =
    room.activeGame === 'limite' ||
    room.activeGame === 'nota' ||
    room.activeGame === 'perguntas-e-verdades';

  const currentQuestionHeadline = (() => {
    if (room.activeGame === 'limite' && room.limite?.roundData) {
      return room.limite.roundData.pergunta;
    }
    if (room.activeGame === 'duvido' && room.duvido?.roundData) {
      return room.duvido.roundData.categoria_secreta;
    }
    if (room.activeGame === 'proibido' && room.proibido) {
      const card = room.proibido.cards[room.proibido.currentCardIndex];
      return room.proibido.speakerPlayerId === player.id
        ? `Palavra-Alvo: ${card?.palavra_alvo || ''}`
        : `Doador da vez: ${
            room.players.find((p) => p.id === room.proibido?.speakerPlayerId)?.name || 'Equipe'
          }`;
    }
    if (room.activeGame === 'nota' && room.nota?.roundData) {
      return room.nota.roundData.pergunta;
    }
    if (room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem?.roundData) {
      return room.temOuNaoTem.roundData.pergunta;
    }
    if (room.activeGame === 'perguntas-e-verdades') {
      return 'Deduza os 8 números secretos da mão do oponente!';
    }
    return room.theme;
  })();

  return (
    <div
      data-testid="mobile-standalone-game-view"
      className="min-h-[100dvh] bg-[#07080d] text-white flex flex-col justify-between max-w-md mx-auto p-3 gap-3 select-none"
    >
      {/* 1. TOPO COMPACTO: SALA + PLACAR AO VIVO + CRONÔMETRO + PERGUNTA ATUAL */}
      <header className="bg-slate-900/95 border-2 border-amber-400/60 rounded-2xl p-3 space-y-2.5 shadow-xl shrink-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-mono-code text-[10px] font-black uppercase shrink-0">
              📱 MULTI #{room.roomId}
            </span>
            <span className="font-anton text-sm text-white uppercase truncate">
              {GAME_TITLES[room.activeGame || 'limite']}
            </span>
            <span className="text-[10px] font-mono-code text-cyan-300 font-bold shrink-0">
              R{room.roundNumber}/{room.maxRounds}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Cronômetro Compacto */}
            <div className="px-2 py-0.5 rounded bg-slate-950 border border-cyan-500/40 font-mono-code text-xs font-bold text-cyan-300 flex items-center gap-1">
              <Clock size={11} />
              {isInfiniteTimer ? (
                <InfinityIcon className="w-3.5 h-3.5 shrink-0 aspect-square" />
              ) : (
                <span>{activeTimerSeconds ?? room.timerConfig}s</span>
              )}
            </div>

            <button aria-label="Sincronizar"
              type="button"
              onClick={onSyncState}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer"
              title="Sincronizar"
            >
              <RefreshCw size={12} />
            </button>

            <button aria-label="Sair"
              type="button"
              onClick={onLeaveRoom}
              className="p-1.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 cursor-pointer"
              title="Sair"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>

        {/* Placar Ao Vivo Compacto (Todos os Jogadores ou Dupla A x Dupla B) */}
        <div
          data-testid="mobile-standalone-scoreboard"
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5"
        >
          {!isIndividual ? (
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/50 flex items-center justify-between">
                <span className="font-anton text-xs text-rose-200 uppercase">
                  EQUIPE A ({room.teams.A.name})
                </span>
                <span className="font-anton text-sm text-white">{room.teams.A.score} PTS</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-between">
                <span className="font-anton text-xs text-cyan-200 uppercase">
                  EQUIPE B ({room.teams.B.name})
                </span>
                <span className="font-anton text-sm text-white">{room.teams.B.score} PTS</span>
              </div>
            </div>
          ) : (
            room.players.map((p, idx) => {
              const isMe = p.id === player.id;
              return (
                <div
                  key={p.id}
                  className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 text-xs ${
                    isMe
                      ? 'border-cyan-400 bg-cyan-950/60 text-white'
                      : 'border-slate-800 bg-slate-950 text-slate-300'
                  }`}
                >
                  <span><PlayerMark p={p} /></span>
                  <span className="font-bold truncate max-w-[75px]">{p.name}</span>
                  {(idx === 0 || p.isVip) && (
                    <Crown size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                  )}
                  <span className="font-mono-code font-bold text-amber-300">{p.score}p</span>
                </div>
              );
            })
          )}
        </div>

        {/* Tema e Pergunta Atual Sempre Visível (Exceto Limite, que exibe o box neutro Fliperama logo abaixo) */}
        {room.activeGame !== 'limite' && (
          <div
            data-testid="mobile-standalone-question-banner"
            className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-1"
          >
            <div className="flex items-center justify-between text-[10px] font-mono-code text-cyan-400 uppercase font-bold">
              <span className="flex items-center gap-1">
                <Sparkles size={10} />
                <span>TEMA: {room.theme}</span>
              </span>
              <span>MODO 3 · 100% NO CELULAR</span>
            </div>
            <div className="font-anton text-base sm:text-lg text-white uppercase leading-snug">
              {currentQuestionHeadline}
            </div>
          </div>
        )}
      </header>

      {/* 2. CENTRO: MONITOR SINCRONIZADO DO TABULEIRO / ROLETA / PAINEL + CONTROLES DO JOGADOR */}
      <main className="flex-1 flex flex-col justify-between gap-3">
        {/* Painel Sincronizado de Tem ou Não Tem direto no Celular (Modo Multi) */}
        {room.activeGame === 'tem-ou-nao-tem' && room.temOuNaoTem && (
          <div
            data-testid="mobile-standalone-tem-board"
            className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between text-[10px] font-mono-code text-cyan-300 font-bold uppercase">
              <span>PAINEL AO VIVO (VEZ DA EQUIPE {room.temOuNaoTem.activeTeam})</span>
              <span className="text-rose-400">
                STRIKES: A({room.temOuNaoTem.strikes.A}) | B({room.temOuNaoTem.strikes.B})
              </span>
            </div>
            <div className="space-y-1">
              {room.temOuNaoTem.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`px-2.5 py-1.5 rounded border flex items-center justify-between text-xs font-mono-code ${
                    item.revealed
                      ? 'border-emerald-400/60 bg-emerald-950/40 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-500'
                  }`}
                >
                  <span>
                    #{idx + 1}{' '}
                    {item.revealed ? item.texto.toUpperCase() : '••••••••••••••••'}
                  </span>
                  <span className={item.revealed ? 'text-amber-300 font-black' : 'text-slate-600'}>
                    {item.revealed ? `${item.votos} PTS` : '??'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roleta Sincronizada do Jogo da Nota no Modo Multi (Quando em revelação) */}
        {room.activeGame === 'nota' &&
          room.nota &&
          (room.nota.phase === 'STEP_4_REVEAL' || room.nota.phase === 'REVEAL') && (
            <div className="bg-slate-900/90 border border-amber-400/50 rounded-xl p-3 text-center space-y-2">
              <div className="text-[10px] font-mono-code text-amber-300 font-bold uppercase">
                🎡 ROLETA DE REVELAÇÃO SINCRONIZADA
              </div>
              <div className="flex justify-center">
                <SpinningNumberWheel
                  targetNumber={room.nota.secretScore}
                  scaleMin={room.nota.scaleMin ?? 1}
                  scaleMax={room.nota.scaleMax || 10}
                  isSpinning={false}
                />
              </div>
            </div>
          )}

        {/* Controles do Turno do Jogador */}
        <div className="flex-1 flex flex-col justify-between gap-3">{children}</div>
      </main>

      {/* 3. BASE: CONTROLES EXCLUSIVOS DO LÍDER DA SALA (👑 VIP) PARA AVANÇAR RODADAS NO MODO MULTI */}
      {isLeader && (
        <footer
          data-testid="mobile-standalone-leader-bar"
          className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-400/70 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <Crown size={15} className="text-amber-400 fill-amber-400 shrink-0" />
            <div>
              <div className="font-anton text-xs uppercase text-amber-300 tracking-wider">
                VOCÊ É O LÍDER DA SALA (#1 VIP)
              </div>
              <div className="text-[10px] font-mono-code text-slate-300">
                Controle o avanço das rodadas pelo seu celular
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {room.activeGame === 'limite' &&
              room.limite &&
              room.limite.phase !== 'SCORING' && (
                <button
                  type="button"
                  data-testid="leader-reveal-limite-btn"
                  onClick={() => {
                    sounds.playPowerup();
                    onUpdateRoom((prev) =>
                      prev.limite
                        ? {
                            ...prev,
                            limite: evaluateLimiteRoundReveal({
                              ...prev.limite,
                              timerActive: false
                            })
                          }
                        : prev
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-400 text-black font-anton text-xs uppercase cursor-pointer"
                >
                  Revelar Resposta
                </button>
              )}

            {onLeaderNextRound && (
              <button
                type="button"
                data-testid="leader-next-round-btn"
                onClick={() => {
                  sounds.playPowerup();
                  onLeaderNextRound();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-anton text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <Trophy size={12} />
                <span>Próxima Rodada</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
});
