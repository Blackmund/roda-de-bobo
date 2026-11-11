import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Clock, Infinity as InfinityIcon } from 'lucide-react';
import { GameRoom, RepetenteGameState } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { isShowRuleset } from '../../config/rulesets';
import { TEAM_META } from '../../utils/teamUtils';
import {
  allRepetenteSubmitted,
  revealRepetente,
  submitRepetenteAnswer,
  tickRepetenteTimer,
  toggleRepetenteOverride
} from '../../utils/repetenteEngine';

interface ScreenRepetenteProps {
  room: GameRoom;
  isTvMode?: boolean;
  onUpdateRepetenteState: (updater: (prev: RepetenteGameState) => RepetenteGameState) => void;
  onNextRound: () => void;
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export const ScreenRepetente: React.FC<ScreenRepetenteProps> = ({ room, onUpdateRepetenteState, onNextRound }) => {
  const rep = room.repetente;
  const updateRef = useRef(onUpdateRepetenteState);
  updateRef.current = onUpdateRepetenteState;
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!rep || room.timerConfig === 0 || rep.phase !== 'WRITING' || !rep.timerActive) return;
    const interval = setInterval(() => {
      updateRef.current((prev) => {
        const next = tickRepetenteTimer(prev);
        if (next.phase === 'REVEAL' && prev.phase === 'WRITING') sounds.playBuzzer();
        else if (next.timerSeconds <= 10 && next.timerSeconds > 0) sounds.playTick(next.timerSeconds);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [room.timerConfig, rep?.phase, rep?.timerActive]);

  // Nova rodada: limpa os rascunhos locais
  useEffect(() => {
    setDrafts({});
  }, [rep?.theme]);

  if (!rep) {
    return <div className="p-6 text-center font-mono-code text-slate-300">Carregando rodada do Repetente...</div>;
  }

  const isShow = isShowRuleset(room.customConfig);
  const free = room.timerConfig === 0;
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name || '—';
  const avatarOf = (id: string) => room.players.find((p) => p.id === id)?.avatar || '🙂';
  const done = allRepetenteSubmitted(rep);

  const start = () => {
    sounds.playPowerup();
    onUpdateRepetenteState((prev) => ({ ...prev, phase: 'WRITING', timerActive: room.timerConfig > 0 }));
  };
  const send = (playerId: string) => {
    const text = (drafts[playerId] || '').trim();
    if (!text) return;
    sounds.playTick();
    setDrafts((d) => ({ ...d, [playerId]: '' }));
    onUpdateRepetenteState((prev) => submitRepetenteAnswer(prev, playerId, text));
  };
  const reveal = () => {
    sounds.playFanfare();
    onUpdateRepetenteState((prev) => {
      const next = revealRepetente(prev);
      if (next.result && Object.values(next.result.pointsByTeam).some((p) => p > 0)) {
        confetti({ particleCount: 60, spread: 55 });
      }
      return next;
    });
  };
  const overrule = (groupId: string) => {
    sounds.playTick();
    onUpdateRepetenteState((prev) => toggleRepetenteOverride(prev, groupId));
  };

  return (
    <div data-testid="rep-screen" className="gap-2 h-full flex flex-col min-h-0 overflow-y-auto">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#07080d]/95 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-anton text-sm md:text-base text-white uppercase tracking-wider">🖍️ REPETENTE</span>
          {isShow && (
            <span
              data-testid="rep-show-ruleset-chip"
              className="px-2 py-0.5 border border-amber-400/60 bg-amber-950/40 text-amber-200 font-mono-code text-[10px] font-bold uppercase"
            >
              📺 Programa · só uma dupla combina = 2 pontos
            </span>
          )}
        </div>
        <div className="border border-[#E6194B]/70 bg-[#07080d] px-2.5 py-0.5 flex items-center gap-1.5">
          <Clock size={13} className="text-rose-400" />
          <div
            data-testid="rep-timer-display"
            className={`font-anton text-base md:text-lg leading-none ${
              free ? 'text-[#17B8B8]' : rep.timerSeconds <= 10 ? 'text-[#E6194B]' : 'text-[#F5F2EB]'
            }`}
          >
            {free ? (
              <span className="flex items-center gap-1 text-xs">
                <InfinityIcon className="w-3.5 h-3.5" />
                LIVRE
              </span>
            ) : (
              fmt(rep.timerSeconds)
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-2 border-cyan-400/50 bg-[#07080d] px-4 py-3 text-center">
        <div className="font-mono-code text-[10px] text-cyan-300 uppercase font-bold">
          Tema · {rep.category} · escreva UMA palavra e combine com o seu parceiro
        </div>
        <div data-testid="rep-theme" className="font-anton text-2xl md:text-4xl text-[#F5F2EB] uppercase leading-tight">
          {rep.theme}
        </div>
      </div>

      {rep.phase === 'READY' && (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 border border-white/10 bg-black/40 p-4 text-center">
          <p className="font-mono-code text-xs text-slate-300 max-w-xl">
            Cada jogador escreve, em segredo, a primeira palavra que vier à cabeça para o tema. Se a sua palavra for igual
            à do parceiro, a dupla pontua. Dá para escrever no celular ou aqui na TV, passando o teclado.
          </p>
          <button
            type="button"
            data-testid="rep-start-btn"
            onClick={start}
            className="px-6 py-2.5 border-2 border-[#E6194B] bg-[#E6194B] hover:bg-rose-500 text-white font-anton text-sm uppercase tracking-wider cursor-pointer"
          >
            {free ? '▶ COMEÇAR' : `▶ VALENDO (${room.timerConfig}S)`}
          </button>
        </div>
      )}

      {rep.phase === 'WRITING' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rep.groups.map((g) => {
              const meta = g.team ? TEAM_META[g.team] : null;
              return (
                <div key={g.id} className={`border bg-[#07080d] p-2 space-y-1.5 ${meta?.borderClass ?? 'border-white/20'}`}>
                  <div className="font-mono-code text-[10px] uppercase font-bold text-slate-300">
                    {meta ? `${meta.equipeLabel} · ${room.teams[g.team!]?.name || meta.defaultName}` : 'Dupla cooperativa'}
                  </div>
                  {g.playerIds.map((pid) => {
                    const sent = (rep.answers[pid] ?? '').trim().length > 0;
                    return (
                      <div key={pid} data-testid={`rep-player-${pid}`} className="flex items-center gap-2">
                        <span className="font-anton text-sm text-white uppercase w-32 truncate shrink-0">
                          {avatarOf(pid)} {nameOf(pid)}
                        </span>
                        <span
                          data-testid={`rep-status-${pid}`}
                          className={`font-mono-code text-[10px] uppercase font-bold ${sent ? 'text-emerald-300' : 'text-amber-300'}`}
                        >
                          {sent ? '✅ escreveu' : '✍️ escrevendo'}
                        </span>
                        <form
                          className="flex flex-1 gap-1 min-w-0"
                          onSubmit={(e) => {
                            e.preventDefault();
                            send(pid);
                          }}
                        >
                          <input
                            data-testid={`rep-input-${pid}`}
                            type="password"
                            autoComplete="off"
                            value={drafts[pid] || ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [pid]: e.target.value }))}
                            placeholder="escrever aqui (oculto)"
                            className="flex-1 min-w-0 bg-black border border-white/20 px-2 py-1 text-xs font-mono-code text-white placeholder:text-slate-600"
                          />
                          <button
                            type="submit"
                            data-testid={`rep-send-${pid}`}
                            className="px-2 py-1 border border-cyan-400/70 text-cyan-200 hover:bg-cyan-400 hover:text-black font-anton text-[11px] uppercase cursor-pointer"
                          >
                            OK
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="flex justify-center mt-auto pt-2">
            <button
              type="button"
              data-testid="rep-reveal-btn"
              onClick={reveal}
              className={`px-6 py-2.5 border-2 font-anton text-sm uppercase tracking-wider cursor-pointer ${
                done
                  ? 'border-emerald-400 bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'border-white/30 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {done ? '🎬 REVELAR AS PALAVRAS' : 'REVELAR MESMO ASSIM'}
            </button>
          </div>
        </div>
      )}

      {rep.phase === 'REVEAL' && rep.result && (
        <div data-testid="rep-reveal" className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rep.groups.map((g) => {
              const res = rep.result!.groups.find((x) => x.groupId === g.id)!;
              const meta = g.team ? TEAM_META[g.team] : null;
              return (
                <div
                  key={g.id}
                  data-testid={`rep-group-${g.id}`}
                  className={`border p-2 space-y-1.5 ${
                    res.matched ? 'border-emerald-400/70 bg-emerald-950/30' : 'border-white/15 bg-[#07080d]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-[10px] uppercase font-bold text-slate-300">
                      {meta ? `${meta.equipeLabel} · ${room.teams[g.team!]?.name || meta.defaultName}` : 'Dupla cooperativa'}
                    </span>
                    <span
                      data-testid={`rep-points-${g.id}`}
                      className={`font-anton text-lg ${res.matched ? 'text-emerald-300' : 'text-slate-500'}`}
                    >
                      {res.matched ? `+${res.points}` : '0'}
                    </span>
                  </div>
                  {g.playerIds.map((pid) => (
                    <div key={pid} className="flex items-center justify-between gap-2">
                      <span className="font-anton text-sm text-white uppercase truncate">
                        {avatarOf(pid)} {nameOf(pid)}
                      </span>
                      <span data-testid={`rep-word-${pid}`} className="font-anton text-xl text-[#F5F2EB] uppercase">
                        {rep.answers[pid] || '—'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <span className="font-anton text-sm uppercase">
                      {res.matched ? (res.overruled ? '⚖️ COMBINOU (JUIZ)' : '✅ COMBINOU!') : '✖ NÃO COMBINOU'}
                    </span>
                    <button
                      type="button"
                      data-testid={`rep-overrule-${g.id}`}
                      onClick={() => overrule(g.id)}
                      className="px-2 py-0.5 border border-sky-400/60 text-sky-200 hover:bg-sky-400 hover:text-black text-[10px] font-mono-code cursor-pointer"
                    >
                      ⚖️ {res.overruled ? 'DESFAZER' : 'JUIZ ACEITA'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-auto flex justify-center pt-2">
            <button
              type="button"
              data-testid="rep-next-round-btn"
              onClick={onNextRound}
              className="px-6 py-2.5 border-2 border-cyan-400 bg-cyan-400 hover:bg-cyan-300 text-black font-anton text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              CONFIRMAR PONTOS E AVANÇAR <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
