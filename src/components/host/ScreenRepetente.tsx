import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Clock, Infinity as InfinityIcon, Info, Pencil, Scale, X as XIcon } from 'lucide-react';
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
import { PlayerMark } from '../rdb/PlayerMark';

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
  const avatarOf = (id: string) => <PlayerMark p={room.players.find((p) => p.id === id)} />;
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

  const clock = free ? 'Livre' : fmt(rep.timerSeconds);
  const clockHot = !free && rep.timerSeconds <= 10 && rep.phase === 'WRITING';
  const groupName = (g: { team?: any }) => (g.team ? room.teams[g.team as keyof typeof room.teams]?.name || TEAM_META[g.team as keyof typeof TEAM_META].defaultName : 'Dupla');

  return (
    <div data-testid="rep-screen" className="rdb-pro">
      <header className="rdb-lim-bar">
        <span className="rdb-lim-title">
          Repetente
          {isShow && (
            <span data-testid="rep-show-ruleset-chip" className="rdb-nota-scale" data-tip="Regras do programa: se só uma dupla combina, ela leva 2 pontos">
              programa
            </span>
          )}
        </span>
        <span className="rdb-lim-rule" tabIndex={0} data-tip="Cada um escreve, em segredo, a primeira palavra que vier à cabeça para o tema. Se a sua for igual à do parceiro, a dupla pontua. Dá para escrever no celular ou aqui, passando o teclado.">
          <Info size={16} />
        </span>
        <div className="rdb-lim-tools">
          <span data-testid="rep-timer-display" className={'rdb-lim-timer' + (clockHot ? ' is-hot' : '')} data-tip={free ? 'Sem limite de tempo' : 'Tempo para escrever'}>
            {free ? <InfinityIcon size={16} /> : <Clock size={16} />}
            {clock}
          </span>
        </div>
      </header>

      <section className="rdb-rep-theme">
        <span className="rdb-pro-label">{rep.category}</span>
        <h2 data-testid="rep-theme" className="rdb-rep-theme-text">
          {rep.theme}
        </h2>
        <p>Escreva UMA palavra e combine com o seu parceiro.</p>
      </section>

      {rep.phase === 'READY' && (
        <section className="rdb-pro-ready">
          <p>Cada jogador escreve, em segredo, a primeira palavra que vier à cabeça. Se a sua for igual à do parceiro, a dupla pontua.</p>
          <button type="button" data-testid="rep-start-btn" className="rdb-btn rdb-setup-start" onClick={start}>
            {free ? 'Começar' : `Valendo (${room.timerConfig}s)`}
          </button>
        </section>
      )}

      {rep.phase === 'WRITING' && (
        <>
          <div className="rdb-rep-groups">
            {rep.groups.map((g) => {
              const meta = g.team ? TEAM_META[g.team] : null;
              return (
                <div key={g.id} className="rdb-rep-group" style={{ ['--team' as string]: meta?.hex || '#17b8b8' }}>
                  <span className="rdb-rep-group-name">{groupName(g)}</span>
                  {g.playerIds.map((pid) => {
                    const sent = (rep.answers[pid] ?? '').trim().length > 0;
                    return (
                      <div key={pid} data-testid={`rep-player-${pid}`} className="rdb-rep-row">
                        <span className="rdb-rep-who">
                          {avatarOf(pid)} {nameOf(pid)}
                        </span>
                        <span data-testid={`rep-status-${pid}`} className={'rdb-rep-state' + (sent ? ' is-ok' : '')} data-tip={sent ? 'Já escreveu' : 'Ainda escrevendo'}>
                          {sent ? <Check size={16} strokeWidth={4} /> : <Pencil size={16} />}
                        </span>
                        <form
                          className="rdb-rep-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            send(pid);
                          }}
                        >
                          <input
                            data-testid={`rep-input-${pid}`}
                            type="password"
                            autoComplete="off"
                            aria-label={`Palavra de ${nameOf(pid)}`}
                            value={drafts[pid] || ''}
                            onChange={(e) => setDrafts((d) => ({ ...d, [pid]: e.target.value }))}
                            placeholder="escreva (oculto)"
                          />
                          <button type="submit" data-testid={`rep-send-${pid}`} aria-label="Guardar a palavra" data-tip="Guardar a palavra">
                            <Check size={16} />
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <footer className="rdb-pro-foot">
            <div className="rdb-pro-foot-end">
              <button type="button" data-testid="rep-reveal-btn" className={'rdb-btn' + (done ? ' rdb-pro-hit' : '')} onClick={reveal}>
                {done ? 'Revelar as palavras' : 'Revelar mesmo assim'}
              </button>
            </div>
          </footer>
        </>
      )}

      {rep.phase === 'REVEAL' && rep.result && (
        <section data-testid="rep-reveal" className="rdb-pro-sum">
          <div className="rdb-rep-groups is-reveal">
            {rep.groups.map((g) => {
              const res = rep.result!.groups.find((x) => x.groupId === g.id)!;
              const meta = g.team ? TEAM_META[g.team] : null;
              return (
                <div key={g.id} data-testid={`rep-group-${g.id}`} className={'rdb-rep-group' + (res.matched ? ' is-match' : '')} style={{ ['--team' as string]: meta?.hex || '#17b8b8' }}>
                  <span className="rdb-rep-group-head">
                    <span className="rdb-rep-group-name">{groupName(g)}</span>
                    <span data-testid={`rep-points-${g.id}`} className="rdb-rep-pts">
                      {res.matched ? `+${res.points}` : '0'}
                    </span>
                  </span>
                  {g.playerIds.map((pid) => (
                    <div key={pid} className="rdb-rep-row is-word">
                      <span className="rdb-rep-who">
                        {avatarOf(pid)} {nameOf(pid)}
                      </span>
                      <strong data-testid={`rep-word-${pid}`}>{rep.answers[pid] || '—'}</strong>
                    </div>
                  ))}
                  <span className="rdb-rep-verdict">
                    {res.matched ? (
                      <>
                        <Check size={18} strokeWidth={4} /> {res.overruled ? 'Combinou (juiz)' : 'Combinou!'}
                      </>
                    ) : (
                      <>
                        <XIcon size={18} strokeWidth={4} /> Não combinou
                      </>
                    )}
                    <button type="button" data-testid={`rep-overrule-${g.id}`} className="rdb-btn" onClick={() => overrule(g.id)} data-tip={res.overruled ? 'Desfazer a decisão do juiz' : 'O juiz aceita: contam como combinadas'}>
                      <Scale /> {res.overruled ? 'Desfazer' : 'Juiz aceita'}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="rdb-pro-sum-foot">
            <span />
            <button type="button" data-testid="rep-next-round-btn" className="rdb-btn rdb-setup-start" onClick={onNextRound}>
              Confirmar pontos e avançar
              <ArrowRight />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
