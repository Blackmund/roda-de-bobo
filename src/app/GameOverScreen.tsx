import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'motion/react';
import { GameRoom } from '../types/game';
import { sounds } from '../utils/soundEffects';
import { ComparePlayersModal } from './lazyScreens';
import { GlobalStats } from '../components/GlobalStats';
import { PartyAchievements } from '../components/PartyAchievements';
import { FixedPlayersHallOfFame } from '../components/FixedPlayersHallOfFame';
import { computePartyAchievements } from '../utils/achievements';
import {
  computeMatchMVP,
  computeMatchPlayerComparison,
  shareMatchResults,
  getMatchRoundActivityLog
} from '../utils/sessionPersistence';
import { GameCardArt } from '../components/art/GameCardArt';
import { PlayerMark } from '../components/rdb/PlayerMark';
import { Check, ChevronDown, Copy, Dice, History, RotateCcw, Settings, Swords, Trophy, X } from '../components/rdb/rdbIcons';
import { buildVictoryModel, type VictoryEntry } from './victory/victoryModel';
import '../styles/victory.css';

type ExtraPanel = 'achievements' | 'hall-of-fame' | 'activity-log' | 'history';

interface GameOverScreenProps {
  room: GameRoom;
  setShareFeedback: React.Dispatch<React.SetStateAction<{ status: 'idle' | 'shared'; text?: string }>>;
  setActiveGameOverPanel: React.Dispatch<React.SetStateAction<ExtraPanel | null>>;
  setIsCompareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shareFeedback: { status: 'idle' | 'shared'; text?: string };
  isCompareModalOpen: boolean;
  activeGameOverPanel: ExtraPanel | null;
  handleReturnToLobby: () => void;
  handleRematch?: () => void;
  handleRematchSetup?: () => void;
  handleResetSessionStats: () => void;
}

/** Fases da entrada: caixas cinza -> faisca no vencedor -> a caixa estoura -> tela montada. */
type Phase = 'pile' | 'spark' | 'burst' | 'done';

const PANEL_TITLES: Record<ExtraPanel, string> = {
  achievements: 'Conquistas da partida',
  'hall-of-fame': 'Hall da Fama',
  'activity-log': 'Rodada a rodada',
  history: 'Histórico da sessão'
};

/** Marca(s) de quem esta na entrada: ilustracao quando houver, senao o bloco com iniciais. */
const EntryMarks: React.FC<{ entry: VictoryEntry; max?: number }> = ({ entry, max = 4 }) => {
  const shown = entry.members.slice(0, max);
  if (shown.length === 0) return <PlayerMark p={{ name: entry.name }} />;
  return (
    <>
      {shown.map((m) =>
        m.winnerSpriteUrl ? (
          <img key={m.id} className="vic-sprite" src={m.winnerSpriteUrl} alt="" />
        ) : (
          <PlayerMark key={m.id} p={m} />
        )
      )}
    </>
  );
};

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  room,
  setShareFeedback,
  setActiveGameOverPanel,
  setIsCompareModalOpen,
  shareFeedback,
  isCompareModalOpen,
  activeGameOverPanel,
  handleReturnToLobby,
  handleRematch,
  handleRematchSetup,
  handleResetSessionStats
}) => {
  const reduceMotion = useReducedMotion();
  const model = useMemo(() => buildVictoryModel(room), [room]);
  const [phase, setPhase] = useState<Phase>(reduceMotion ? 'done' : 'pile');
  const [statsOpen, setStatsOpen] = useState(false);

  const mvp = computeMatchMVP(room);
  const playerComparison = computeMatchPlayerComparison(room);
  const roundActivityLog = getMatchRoundActivityLog(room);
  const partyAchievements = computePartyAchievements(room);

  const hero = model.champions[0] || model.ranking[0];
  const heroes = model.champions.length > 0 ? model.champions.slice(0, 3) : hero ? [hero] : [];
  const heroIds = new Set(heroes.map((h) => h.id));
  const others = model.ranking.filter((e) => !heroIds.has(e.id));
  const individual = model.mode === 'individual';

  // Entrada em quatro tempos (pulada para quem pede menos movimento)
  useEffect(() => {
    if (reduceMotion) {
      setPhase('done');
      sounds.playFanfare();
      return;
    }
    const t1 = window.setTimeout(() => setPhase('spark'), 600);
    const t2 = window.setTimeout(() => {
      setPhase('burst');
      sounds.playFanfare();
    }, 1100);
    const t3 = window.setTimeout(() => setPhase('done'), 1750);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduceMotion]);

  const handleShareMatchResults = async () => {
    sounds.playSuccess();
    const payload = individual
      ? mvp
      : {
          ...mvp,
          name: `${hero?.name ?? ''} (${hero?.members.map((m) => m.name).join(' & ') ?? ''})`,
          teamName: 'Pontuação em equipe',
          score: hero?.score ?? 0
        };
    const result = await shareMatchResults(room, payload);
    setShareFeedback({ status: 'shared', text: result.text });
    window.setTimeout(() => {
      setShareFeedback((prev) => (prev.status === 'shared' ? { status: 'idle' } : prev));
    }, 4000);
  };

  const openPanel = (panel: ExtraPanel) => {
    sounds.playFlip();
    setActiveGameOverPanel((prev) => (prev === panel ? null : panel));
  };

  const toggleStats = () => {
    sounds.playFlip();
    setStatsOpen((v) => !v);
  };

  const heroName = hero?.name ?? '';
  const heroMarkCount = Math.min(
    4,
    model.tie ? heroes.length : heroes.reduce((n, h) => n + Math.min(h.members.length, 4), 0)
  );
  const membersLine =
    !individual && hero && hero.members.length > 1 && !model.tie ? hero.members.map((m) => m.name).join(' & ') : '';
  const settled = phase === 'done';
  const burst = phase === 'burst' || phase === 'done';
  const bigRanking = others.length > 6;

  return (
    <motion.div
      key="screen-game-over"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="vic"
      data-phase={phase}
      data-testid="gameover-screen"
    >
      {/* Fundo: raios chapados que giram devagar a partir do campeao */}
      <motion.div
        className="vic-bg"
        aria-hidden="true"
        initial={false}
        animate={{ opacity: burst ? 1 : 0, scale: burst ? 1 : 0.4 }}
        transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="vic-bg-rays" />
      </motion.div>
      <div className="vic-dots" aria-hidden="true" />

      {/* Marca d'agua gigante */}
      <motion.div
        className="vic-watermark"
        aria-hidden="true"
        initial={false}
        animate={settled ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.25 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 22, delay: 0.1 }}
      >
        {model.watermark}
      </motion.div>

      <LayoutGroup id="vic">
        {/* Entrada: a pilha de caixas cinza; a faisca cai na caixa do campeao */}
        <AnimatePresence>
          {!settled && (
            <motion.div
              key="pile"
              className="vic-pile"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              {model.ranking.slice(0, 10).map((e) => {
                const isHero = e.id === hero?.id;
                return (
                  <motion.div
                    key={e.id}
                    layoutId={isHero ? 'vic-hero' : undefined}
                    className={`vic-box${isHero && burst ? ' is-lit' : ''}`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <EntryMarks entry={e} max={2} />
                    {isHero && phase !== 'pile' && <span className="vic-spark" />}
                    {isHero && burst && <span className="vic-burst" />}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`vic-stage${statsOpen ? ' is-compact' : ''}`}>
          {/* Carta do campeao */}
          <motion.section
            className="vic-card"
            data-testid="gameover-winner-centerpiece"
            initial={false}
            animate={settled ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
          >
            <div className="vic-art">
              <div className="vic-art-rays" aria-hidden="true" />
              {model.gameId && (
                <div className="vic-art-game" aria-hidden="true">
                  <GameCardArt gameId={model.gameId} />
                </div>
              )}
              {settled && hero && (
                <motion.div
                  layoutId="vic-hero"
                  className={`vic-hero-marks n${heroMarkCount}`}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                >
                  {heroes.map((h) => (
                    <EntryMarks key={h.id} entry={h} max={model.tie ? 1 : 4} />
                  ))}
                </motion.div>
              )}
            </div>

            <div className="vic-card-foot">
              <span className="vic-kicker">{model.kicker}</span>
              <h1 data-testid="gameover-winner-name" className={`vic-name${model.tie ? ' is-tie' : ''}`}>
                {model.tie
                  ? heroes.map((h) => (
                      <span key={h.id} className="vic-name-line">
                        {h.name}
                      </span>
                    ))
                  : heroName}
              </h1>
              <div className="vic-scoreline">
                <span className="vic-score">
                  {hero?.score ?? 0}
                  <small>pts</small>
                </span>
                {(membersLine || model.line) && (
                  <span className="vic-line">
                    {membersLine && <span>{membersLine}</span>}
                    {model.line && <span>{model.line}</span>}
                  </span>
                )}
              </div>
            </div>
          </motion.section>

          {/* Classificacao (perdedores em cinza) + acoes */}
          <motion.aside
            className="vic-side"
            initial={false}
            animate={settled ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1], delay: reduceMotion ? 0 : 0.15 }}
          >
            {others.length > 0 && (
              <ol className={`vic-rank${bigRanking ? ' is-two-col' : ''}`} aria-label="Classificação">
                {others.map((e) => (
                  <li key={e.id} className="vic-row" data-testid={`vic-rank-row-${e.id}`}>
                    <span className="vic-row-pos" aria-label={`${e.rank}º lugar`}>
                      {e.rank}
                    </span>
                    <span className="vic-row-marks">
                      <EntryMarks entry={e} max={3} />
                    </span>
                    <span className="vic-row-name">{e.name}</span>
                    <span className="vic-row-pts">{e.score}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="vic-actions">
              <button type="button" className="rdb-btn rdb-btn--lg" onClick={handleReturnToLobby}>
                <Dice />
                <span>Trocar de jogo</span>
              </button>
              {handleRematchSetup && (
                <button type="button" className="rdb-btn rdb-btn--lg rdb-btn--cream" onClick={handleRematchSetup}>
                  <Settings />
                  <span>Ajustar regras</span>
                </button>
              )}
              {handleRematch && (
                <button
                  type="button"
                  className="rdb-btn rdb-btn--lg rdb-btn--solid"
                  data-testid="gameover-rematch-btn"
                  onClick={handleRematch}
                  autoFocus
                >
                  <RotateCcw />
                  <span>Revanche</span>
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      </LayoutGroup>

      {/* Numeros da partida: faixa recolhivel no rodape */}
      <motion.section
        className={`vic-stats${statsOpen ? ' is-open' : ''}`}
        data-testid="mvp-performance-metrics"
        initial={false}
        animate={settled ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.3 }}
      >
        <button
          type="button"
          className="vic-stats-toggle"
          aria-expanded={statsOpen}
          aria-controls="vic-stats-body"
          onClick={toggleStats}
        >
          <ChevronDown className="vic-chev" />
          <span>Números da partida</span>
          <span className="vic-stats-hint">
            {statsOpen
              ? `${model.tie ? '1º colocado' : 'Campeão'}: ${hero?.name ?? ''}`
              : `${model.totalRounds} ${model.totalRounds === 1 ? 'rodada' : 'rodadas'}${
                  model.medals.length > 0 ? ` · ${model.medals.length} medalhas` : ''
                }`}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {statsOpen && (
            <motion.div
              id="vic-stats-body"
              key="body"
              className="vic-stats-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="vic-cells">
                {model.stats.map((s) => (
                  <div key={s.key} className={`vic-cell${s.gameExtra ? ' is-extra' : ''}`} data-testid={`vic-stat-${s.key}`}>
                    <span className="vic-cell-label">{s.label}</span>
                    <span className="vic-cell-value">{s.value}</span>
                  </div>
                ))}
                {model.medals.length > 0 && (
                  <div className="vic-cell vic-cell--medals">
                    <span className="vic-cell-label">Medalhas da resenha</span>
                    <ul className="vic-medals">
                      {model.medals.map((m) => (
                        <li key={m.id} className={`vic-medal vic-medal--${m.id}`}>
                          <b>{m.title}</b>
                          <span>
                            {m.name} <i>{m.detail}</i>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="vic-more" data-testid="gameover-extras-dock">
                <button type="button" className="rdb-btn" data-testid="toggle-achievements-btn" onClick={() => openPanel('achievements')}>
                  <Trophy />
                  <span>Conquistas ({partyAchievements.length})</span>
                </button>
                <button type="button" className="rdb-btn" data-testid="toggle-activity-log-btn" onClick={() => openPanel('activity-log')}>
                  <span>Rodada a rodada</span>
                </button>
                <button type="button" className="rdb-btn" data-testid="toggle-hall-of-fame-btn" onClick={() => openPanel('hall-of-fame')}>
                  <span>Hall da Fama</span>
                </button>
                <button type="button" className="rdb-btn" data-testid="toggle-history-btn" onClick={() => openPanel('history')}>
                  <History />
                  <span>Histórico ({room.sessionStats.totalMatches})</span>
                </button>
                {individual && (
                  <button
                    type="button"
                    className="rdb-btn"
                    data-testid="compare-players-btn"
                    onClick={() => {
                      sounds.playTick();
                      setIsCompareModalOpen(true);
                    }}
                  >
                    <Swords />
                    <span>Comparar</span>
                  </button>
                )}
                <button
                  type="button"
                  className="rdb-btn rdb-btn--cream"
                  data-testid="share-match-results-btn"
                  aria-pressed={shareFeedback.status === 'shared'}
                  onClick={handleShareMatchResults}
                >
                  {shareFeedback.status === 'shared' ? <Check /> : <Copy />}
                  <span>{shareFeedback.status === 'shared' ? 'Resumo copiado' : 'Copiar resumo'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <Suspense fallback={null}>
        <ComparePlayersModal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          comparison={playerComparison}
        />
      </Suspense>

      {/* Paineis extras (conquistas, hall da fama, rodada a rodada, historico) */}
      <AnimatePresence>
        {activeGameOverPanel && (
          <div
            data-testid="gameover-extra-modal-backdrop"
            onClick={() => setActiveGameOverPanel(null)}
            className="vic-modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="vic-modal"
              role="region"
              aria-label={PANEL_TITLES[activeGameOverPanel]}
            >
              <div className="vic-modal-head">
                <span>{PANEL_TITLES[activeGameOverPanel]}</span>
                <button
                  type="button"
                  className="rdb-btn rdb-btn--crimson"
                  data-testid="gameover-extra-modal-close"
                  aria-label="Fechar"
                  onClick={() => setActiveGameOverPanel(null)}
                >
                  <X />
                  <span>Fechar</span>
                </button>
              </div>
              <div className="vic-modal-body">
                {activeGameOverPanel === 'achievements' && <PartyAchievements achievements={partyAchievements} />}
                {activeGameOverPanel === 'hall-of-fame' && <FixedPlayersHallOfFame currentMatchPlayers={room.players} />}
                {activeGameOverPanel === 'activity-log' && (
                  <ol data-testid="round-activity-log" className="vic-log">
                    {roundActivityLog.map((event, idx) => (
                      <li key={event.id || idx} data-testid={`round-activity-item-${idx}`}>
                        <b>Rodada {event.roundNumber}</b>
                        <span data-testid={`round-activity-headline-${idx}`}>{event.subheadline}</span>
                        <i>
                          {event.cumulativeScoreA} × {event.cumulativeScoreB}
                        </i>
                      </li>
                    ))}
                  </ol>
                )}
                {activeGameOverPanel === 'history' && (
                  <div data-testid="gameover-history-panel">
                    <GlobalStats
                      stats={room.sessionStats}
                      teamAName={room.teams.A.name}
                      teamBName={room.teams.B.name}
                      players={room.players}
                      onResetStats={handleResetSessionStats}
                      defaultExpanded={true}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
