import React, { useState, useEffect } from 'react';
import { CTMode,
  GameId,
  GameCustomConfig,
  GameDifficulty
} from '../../types/game';
import { DIFFICULTY_META } from '../../utils/multiplayerRoomEngine';
import { getTemTotalRespondents } from '../../utils/aiGameGenerator';
import { sounds } from '../../utils/soundEffects';
import {
  RULESET_LABELS,
  applyRuleset,
  getRulesetPreset,
  hasShowRuleset,
  limiteExactBonusFor,
  resolveRuleset,
  type GameRuleset
} from '../../config/rulesets';
import {
  Sparkles,
  RefreshCw,
  Dices,
  Clock,
  Target,
  Sliders,
  Infinity as InfinityIcon,
  ArrowRight,
  Play,
  Flame,
  Check,
  Search,
  BookOpen,
  User,
  Users
} from 'lucide-react';
import { ThemeSection } from './step2/ThemeSection';
import { POPULAR_THEMES } from './step2/popularThemes';
import { GameCardArt } from '../art/GameCardArt';
import { CT_MODE_LABEL } from '../../utils/comTerraEngine';
import { usesLocalContent } from '../../config/localGames';

export interface Step2ConfigureGameProps {
  activeGame: GameId;
  theme: string;
  onChangeTheme: (nextTheme: string) => void;
  dynamicThemes: string[];
  isGeneratingThemes: boolean;
  onGenerateAiThemes: () => void;
  onRollRandomTheme: () => void;
  difficulty: GameDifficulty;
  onChangeDifficulty: (nextDifficulty: GameDifficulty) => void;
  timer: number;
  onChangeTimer: (nextTimer: number) => void;
  rounds: number;
  onChangeRounds: (nextRounds: number) => void;
  customConfig: GameCustomConfig;
  onChangeCustomConfig: React.Dispatch<React.SetStateAction<GameCustomConfig>>;
  onContinueToMode?: () => void;
  onProceedToTeams?: () => void;
  onStartDirectly?: () => void;
  onGoToRules?: () => void;
  onBackToLobby?: () => void;
  onToggleTeamsDrawer?: () => void;
  connectedPlayersCount?: number;
  connectionMode?: string;
  /** Nome do jogo, mostrado no cartaz. */
  gameTitle?: string;
}

const TIMER_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 30, label: '30 s', desc: 'Rápido' },
  { value: 60, label: '60 s', desc: 'Padrão Oficial' },
  { value: 90, label: '90 s', desc: 'Com calma' },
  { value: 0, label: 'Livre', desc: 'Sem limite' }
];

const ROUND_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 3, label: '3 Rodadas', desc: 'Partida Rápida' },
  { value: 5, label: '5 Rodadas', desc: 'Padrão Oficial' },
  { value: 7, label: '7 Rodadas', desc: 'Desafio Longo' },
  { value: 10, label: '10 Rodadas', desc: 'Maratona' }
];

const PV_ROUND_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 1, label: '1 Jogo', desc: 'Morte Súbita' },
  { value: 3, label: 'MD3', desc: 'Primeiro a 2' },
  { value: 5, label: 'MD5', desc: 'Primeiro a 3' },
  { value: 7, label: 'MD7', desc: 'Primeiro a 4' },
  { value: 9, label: 'MD9', desc: 'Primeiro a 5' }
];

const CT_MODES: CTMode[] = ['arquiteto', 'diabo', 'fronteiras'];
const CT_MODE_NOTES: Record<CTMode, string[]> = {
  arquiteto: [
    'Cada jogador monta o próprio tabuleiro 8x8; na TV aparecem todos',
    'Turnos em rodízio: pegue uma peça da loja e encaixe',
    'Linha ou coluna cheia vale +2'
  ],
  diabo: [
    'Um mapa só para todos, diferente a cada partida',
    'Rodada em 3 fases: escolher a peça, sabotar o mapa e colocar',
    'Quem pega a menor peça joga primeiro; a maior vale mais e joga por último'
  ],
  fronteiras: [
    'Cada um começa na própria base 5x5, ligada a uma ilha central',
    'As peças crescem em trilha contínua até a ilha',
    'A ilha tem as fichas de maior valor (e as armadilhas)'
  ]
};

const DIFFICULTY_LIST: GameDifficulty[] = ['facil', 'medio', 'dificil', 'impossivel'];

/** Jogos que tem ajustes exclusivos (abrem na janela "Mais ajustes deste jogo"). */
const GAMES_WITH_SPECIFIC_RULES: GameId[] = ['limite', 'nota', 'tem-ou-nao-tem', 'proibido', 'duvido', 'perguntas-e-verdades'];

/** DAD-05: de onde vem o conteudo das perguntas. */
const CONTENT_SOURCES: Array<{ value: NonNullable<GameCustomConfig['contentSource']>; label: string; hint: string }> = [
  { value: 'auto', label: 'Misto', hint: 'Banco pronto + IA, sem repetir' },
  { value: 'bank', label: 'Só banco pronto', hint: 'Itens do programa e revisados; não chama a IA' },
  { value: 'ai', label: 'Só IA', hint: 'Conteúdo novo gerado na hora' }
];


export const Step2ConfigureGame: React.FC<Step2ConfigureGameProps> = React.memo(({
  activeGame,
  theme,
  onChangeTheme,
  dynamicThemes,
  isGeneratingThemes,
  onGenerateAiThemes,
  onRollRandomTheme,
  difficulty,
  onChangeDifficulty,
  timer,
  onChangeTimer,
  rounds,
  onChangeRounds,
  customConfig,
  onChangeCustomConfig,
  onProceedToTeams,
  onStartDirectly,
  onGoToRules,
  onBackToLobby,
  connectedPlayersCount,
  gameTitle
}) => {
  const isPV = activeGame === 'perguntas-e-verdades';
  const isCT = activeGame === 'com-terra';
  const ctMode: CTMode = customConfig.ctMode || 'arquiteto';
  const isIndividualMode =
    isCT ||
    activeGame === 'limite' ||
    activeGame === 'nota' ||
    activeGame === 'quem-sou-eu' ||
    activeGame === 'onde-estou' ||
    activeGame === 'respostas-sem-perguntas' ||
    activeGame === 'estadios' ||
    activeGame === 'perguntas-e-verdades';

  const [isAllThemesExpanded, setIsAllThemesExpanded] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const hasSpecificRules = GAMES_WITH_SPECIFIC_RULES.includes(activeGame);

  // Esc fecha a janela aberta
  useEffect(() => {
    if (!isThemeOpen && !isMoreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsThemeOpen(false);
        setIsMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isThemeOpen, isMoreOpen]);

  // UX-09: modo de regras (casa x programa). O preset ajusta rodadas, tempo e parametros; o host ainda pode mexer depois.
  const ruleset = resolveRuleset(customConfig);
  const showPreset = getRulesetPreset(activeGame, 'show');
  const handleSelectRuleset = (next: GameRuleset) => {
    sounds.playTick();
    onChangeCustomConfig((prev) => applyRuleset(activeGame, prev, next));
    if (next === 'show') {
      if (showPreset?.rounds !== undefined) onChangeRounds(showPreset.rounds);
      if (showPreset?.timer !== undefined) onChangeTimer(showPreset.timer);
    }
  };
  // Garante que o numero de rodadas vindo do preset (ex.: 9 no Duvido) apareca como opcao.
  const roundOptions = ROUND_OPTIONS.some((o) => o.value === rounds)
    ? ROUND_OPTIONS
    : [...ROUND_OPTIONS, { value: rounds, label: rounds + ' Rodadas', desc: 'Regras do programa' }].sort(
        (a, b) => a.value - b.value
      );

  // For Perguntas e Verdades, rounds must be [1, 3, 5, 7, 9] (defaults to 3 if outside)
  useEffect(() => {
    if (isPV && ![1, 3, 5, 7, 9].includes(rounds)) {
      onChangeRounds(3);
    }
  }, [isPV, rounds, onChangeRounds]);

  const isGeneralTheme = !theme || theme.trim().toLowerCase() === 'geral';

  const Seg = (p: { testid: string; on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      data-testid={p.testid}
      aria-pressed={p.on}
      title={p.title}
      onClick={() => {
        sounds.playTick();
        p.onClick();
      }}
      className="rdb-seg"
    >
      {p.children}
    </button>
  );

  return (
    <div data-testid="step2-configure-game" className="rdb-setup">
      <div className="rdb-setup-body">
        {/* CARTAZ DO JOGO: vinheta, nome e o resumo das regras do modo escolhido */}
        <aside className="rdb-setup-poster" data-testid="setup-poster">
          <div className="rdb-setup-poster-art">
            <GameCardArt gameId={activeGame} />
          </div>
          <div className="rdb-setup-poster-text">
            <span className="rdb-tag">{isIndividualMode ? 'Individual' : 'Em equipes'}</span>
            <h2 className="rdb-setup-title">{gameTitle || 'Jogo'}</h2>
            {ruleset === 'show' && showPreset ? (
              <ul data-testid="ruleset-notes" className="rdb-setup-notes">
                {showPreset.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : isCT ? (
              <ul data-testid="ct-mode-notes" className="rdb-setup-notes">
                {CT_MODE_NOTES[ctMode].map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="rdb-setup-notes">Regras da casa: ajuste o ritmo ao lado do jeito que a roda preferir.</p>
            )}
          </div>
        </aside>

        {/* ESCOLHAS: uma linha por decisao, rotulo a esquerda e opcoes a direita */}
        <div className="rdb-setup-rows">
          {hasShowRuleset(activeGame) && (
            <div className="rdb-opt" data-testid="ruleset-selector">
              <span className="rdb-opt-label">Regras</span>
              <div className="rdb-opt-choices">
                {(['home', 'show'] as const).map((rs) => (
                  <Seg key={rs} testid={'ruleset-btn-' + rs} on={ruleset === rs} onClick={() => handleSelectRuleset(rs)}>
                    {RULESET_LABELS[rs]}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {isCT && (
            <div className="rdb-opt" data-testid="ct-mode-selector">
              <span className="rdb-opt-label">Modo</span>
              <div className="rdb-opt-choices">
                {CT_MODES.map((m) => (
                  <Seg
                    key={m}
                    testid={'ct-mode-btn-' + m}
                    on={ctMode === m}
                    onClick={() => onChangeCustomConfig((prev) => ({ ...prev, ctMode: m }))}
                  >
                    {CT_MODE_LABEL[m]}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {!isPV && !isCT && (
            <div className="rdb-opt" data-testid="setup-theme-row">
              <span className="rdb-opt-label">Tema</span>
              <div className="rdb-opt-choices">
                <span className="rdb-opt-value" data-testid="setup-theme-current">
                  {isGeneralTheme ? 'Geral (assuntos diversos)' : theme}
                </span>
                <button
                  type="button"
                  data-testid="setup-theme-open-btn"
                  className="rdb-seg rdb-seg--action"
                  onClick={() => {
                    sounds.playTick();
                    setIsThemeOpen(true);
                  }}
                >
                  Trocar tema
                </button>
              </div>
            </div>
          )}

          {!isPV && !isCT && (
            <div className="rdb-opt">
              <span className="rdb-opt-label">Dificuldade</span>
              <div className="rdb-opt-choices">
                {DIFFICULTY_LIST.map((diffKey) => (
                  <Seg
                    key={diffKey}
                    testid={`difficulty-btn-${diffKey}`}
                    on={difficulty === diffKey}
                    onClick={() => onChangeDifficulty(diffKey)}
                    title={DIFFICULTY_META[diffKey].description}
                  >
                    {DIFFICULTY_META[diffKey].shortLabel || DIFFICULTY_META[diffKey].label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {!isCT && (
            <div className="rdb-opt">
              <span className="rdb-opt-label">Tempo por rodada</span>
              <div className="rdb-opt-choices">
                {TIMER_OPTIONS.map((opt) => (
                  <Seg key={opt.value} testid={`timer-btn-${opt.value}`} on={timer === opt.value} onClick={() => onChangeTimer(opt.value)} title={opt.desc}>
                    {opt.label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          <div className="rdb-opt">
            <span className="rdb-opt-label">{isPV ? 'Série de jogos' : 'Rodadas'}</span>
            <div className="rdb-opt-choices">
              {(isPV ? PV_ROUND_OPTIONS : roundOptions).map((opt) => (
                <Seg key={opt.value} testid={`rounds-btn-${opt.value}`} on={rounds === opt.value} onClick={() => onChangeRounds(opt.value)} title={opt.desc}>
                  {isPV ? opt.label : opt.value}
                </Seg>
              ))}
            </div>
          </div>

          {!usesLocalContent(activeGame) && !isPV && (
            <div className="rdb-opt" data-testid="content-source-selector">
              <span className="rdb-opt-label">Perguntas</span>
              <div className="rdb-opt-choices">
                {CONTENT_SOURCES.map((o) => (
                  <Seg
                    key={o.value}
                    testid={'content-source-btn-' + o.value}
                    on={(customConfig.contentSource ?? 'auto') === o.value}
                    onClick={() => onChangeCustomConfig((prev) => ({ ...prev, contentSource: o.value }))}
                    title={o.hint}
                  >
                    {o.label}
                  </Seg>
                ))}
              </div>
            </div>
          )}

          {hasSpecificRules && (
            <button
              type="button"
              data-testid="setup-more-settings-btn"
              className="rdb-setup-more"
              onClick={() => {
                sounds.playTick();
                setIsMoreOpen(true);
              }}
            >
              Mais ajustes deste jogo
            </button>
          )}
        </div>
      </div>

      {/* JANELA: escolha do tema (busca, sortear, sugerir com IA e todas as categorias) */}
      {isThemeOpen && !isPV && (
        <div className="rdb-sheet-backdrop" data-testid="setup-theme-sheet" onClick={() => setIsThemeOpen(false)}>
          <div className="rdb-sheet" role="dialog" aria-modal="true" aria-label="Escolher tema" onClick={(e) => e.stopPropagation()}>
            <div className="rdb-sheet-head">
              <h3>Escolher tema</h3>
              <button type="button" className="rdb-seg rdb-seg--action" data-testid="setup-theme-close-btn" onClick={() => setIsThemeOpen(false)}>
                Pronto
              </button>
            </div>
            <div className="rdb-sheet-body">
              <ThemeSection isGeneralTheme={isGeneralTheme} theme={theme} onChangeTheme={onChangeTheme} onRollRandomTheme={onRollRandomTheme} isGeneratingThemes={isGeneratingThemes} onGenerateAiThemes={onGenerateAiThemes} setIsAllThemesExpanded={setIsAllThemesExpanded} isAllThemesExpanded={isAllThemesExpanded} dynamicThemes={dynamicThemes} />
            </div>
          </div>
        </div>
      )}

      {/* JANELA: ajustes exclusivos do jogo */}
      {isMoreOpen && hasSpecificRules && (
        <div className="rdb-sheet-backdrop" data-testid="setup-more-sheet" onClick={() => setIsMoreOpen(false)}>
          <div className="rdb-sheet" role="dialog" aria-modal="true" aria-label="Mais ajustes deste jogo" onClick={(e) => e.stopPropagation()}>
            <div className="rdb-sheet-head">
              <h3>Mais ajustes deste jogo</h3>
              <button type="button" className="rdb-seg rdb-seg--action" data-testid="setup-more-close-btn" onClick={() => setIsMoreOpen(false)}>
                Pronto
              </button>
            </div>
            <div className="rdb-sheet-body">
        <section className="border-2 border-white/15 bg-[#090b14] p-2 sm:p-2.5 space-y-1.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-1">
            <div className="flex items-center gap-1.5">
              <Sliders size={14} className="text-[#17B8B8]" />
              <h4 className="font-anton text-xs sm:text-sm text-white uppercase tracking-wider leading-none">
                REGRAS ESPECÍFICAS DO JOGO
              </h4>
            </div>
            <span className="text-[9px] font-mono-code text-slate-400">
              Parâmetros exclusivos desta dinâmica
            </span>
          </div>

          {/* JOGO DO LIMITE */}
          {activeGame === 'limite' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-black/70 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-anton text-xs text-white uppercase">
                    4 Cartas Especiais de Poder
                  </div>
                  <div className="text-[9px] font-mono-code text-slate-400">
                    Ligação para Universitário, Troca de Palpite, X2 e -1
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTick();
                    onChangeCustomConfig((prev) => ({
                      ...prev,
                      limiteEnablePowerCards: !prev.limiteEnablePowerCards
                    }));
                  }}
                  className={`px-2.5 py-1 font-anton text-[11px] uppercase tracking-wider border cursor-pointer transition-all ${
                    customConfig.limiteEnablePowerCards
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400'
                  }`}
                >
                  {customConfig.limiteEnablePowerCards ? '✓ ATIVADAS' : 'DESATIVADAS'}
                </button>
              </div>

              {ruleset === 'home' && (
                <div className="p-2 bg-black/70 border border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-anton text-xs text-amber-300 uppercase">
                      Bônus por Palpite Exato
                    </div>
                    <div className="text-[9px] font-mono-code text-slate-400">
                      Quem cravar exatamente o valor oficial leva {limiteExactBonusFor(customConfig)} pontos em vez de 1
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-400 text-black font-anton text-[11px] uppercase font-bold shrink-0">
                    🎯 {limiteExactBonusFor(customConfig)} PONTOS
                  </span>
                </div>
              )}
            </div>
          )}

          {/* JOGO DA NOTA */}
          {activeGame === 'nota' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Escala da Roleta Numérica
                  </span>
                  <span className="text-[9px] font-mono-code text-cyan-300 font-bold">
                    {customConfig.notaScaleMin ?? 1} a {customConfig.notaScaleMax ?? 10}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { min: 1, max: 5, label: '1 a 5' },
                    { min: 1, max: 10, label: '1 a 10 (Padrão)' },
                    { min: 0, max: 10, label: '0 a 10' },
                    { min: 1, max: 20, label: '1 a 20' }
                  ].map((sc) => {
                    const active =
                      (customConfig.notaScaleMin ?? 1) === sc.min &&
                      customConfig.notaScaleMax === sc.max;
                    return (
                      <button
                        key={sc.label}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({
                            ...prev,
                            notaScaleMin: sc.min,
                            notaScaleMax: sc.max
                          }));
                        }}
                        className={`py-0.5 px-1 text-[9px] font-mono-code font-bold uppercase border cursor-pointer text-center ${
                          active
                            ? 'border-cyan-400 bg-cyan-400 text-black font-black'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 bg-black/70 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-anton text-xs text-amber-300 uppercase">
                    Pontuação da Rodada
                  </div>
                  <div className="text-[9px] font-mono-code text-slate-400">
                    +1 ponto para quem acertar o número secreto; Narrador soma acertos
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-400 text-cyan-300 font-anton text-[11px] uppercase shrink-0">
                  +1 PT
                </span>
              </div>
            </div>
          )}

          {/* TEM OU NÃO TEM */}
          {activeGame === 'tem-ou-nao-tem' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Respostas no Painel
                  </span>
                  <span className="text-[9px] font-mono-code text-cyan-300 font-bold">
                    {getTemTotalRespondents(customConfig.temItemsCount)} Pontos Totais
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[5, 6, 8, 10].map((cnt) => {
                    const isSelected = customConfig.temItemsCount === cnt;
                    return (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({ ...prev, temItemsCount: cnt }));
                        }}
                        className={`py-0.5 px-1 text-[11px] font-anton uppercase border cursor-pointer text-center ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400 text-black font-black'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        Top {cnt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Limite de Erros (Strikes X)
                  </span>
                  <span className="text-[9px] font-mono-code text-rose-300 font-bold">
                    {customConfig.temMaxStrikes} Erros para passar a vez
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((st) => {
                    const isSelected = customConfig.temMaxStrikes === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({ ...prev, temMaxStrikes: st }));
                        }}
                        className={`py-0.5 px-1 text-[11px] font-anton uppercase border cursor-pointer text-center ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500 text-white font-black'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {st} Strike{st > 1 ? 's' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* JOGO DO PROIBIDO */}
          {activeGame === 'proibido' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Cartas na Rodada
                  </span>
                  <span className="text-[9px] font-mono-code text-cyan-300 font-bold">
                    {customConfig.proibidoCardsCount} Cartas
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[3, 5, 7, 10].map((cnt) => {
                    const isSelected = customConfig.proibidoCardsCount === cnt;
                    return (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({ ...prev, proibidoCardsCount: cnt }));
                        }}
                        className={`py-0.5 px-1 text-[11px] font-anton uppercase border cursor-pointer text-center ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400 text-black font-black'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {cnt} Cartas
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Palavras Proibidas por Carta
                  </span>
                  <span className="text-[9px] font-mono-code text-rose-300 font-bold">
                    {customConfig.proibidoForbiddenCount} Palavras
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[3, 5, 6].map((fc) => {
                    const isSelected = customConfig.proibidoForbiddenCount === fc;
                    return (
                      <button
                        key={fc}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({ ...prev, proibidoForbiddenCount: fc }));
                        }}
                        className={`py-0.5 px-1 text-[11px] font-anton uppercase border cursor-pointer text-center ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500 text-white font-black'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {fc} Proibidas
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* JOGO DO DUVIDO */}
          {activeGame === 'duvido' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Lance Inicial do Leilão
                  </span>
                  <span className="text-[9px] font-mono-code text-cyan-300 font-bold">
                    Começa em {customConfig.duvidoStartingBid}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((bid) => {
                    const isSelected = customConfig.duvidoStartingBid === bid;
                    return (
                      <button
                        key={bid}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({ ...prev, duvidoStartingBid: bid }));
                        }}
                        className={`py-0.5 px-1 text-[11px] font-anton uppercase border cursor-pointer text-center ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400 text-black font-black'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {bid} Item{bid > 1 ? 's' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 bg-black/70 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-anton text-xs text-white uppercase">
                    Gabarito de Apoio ao Árbitro
                  </div>
                  <div className="text-[9px] font-mono-code text-slate-400">
                    A IA gera uma lista detalhada de exemplos válidos para consulta durante as respostas
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-black/80 border border-slate-700 text-cyan-300 font-anton text-[11px] uppercase shrink-0">
                  ✓ OFICIAL
                </span>
              </div>
            </div>
          )}

          {/* PERGUNTAS E VERDADES */}
          {activeGame === 'perguntas-e-verdades' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Aparência do Baralho
                  </span>
                  <span className="text-[9px] font-mono-code text-cyan-300 font-bold">
                    {customConfig.pvDeckStyle === 'compacto'
                      ? 'Compacto'
                      : customConfig.pvDeckStyle === 'holografico'
                      ? 'Holográfico'
                      : 'Padrão CazéTV'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'padrao' as const, label: 'Padrão CazéTV' },
                    { id: 'compacto' as const, label: 'Compacto' },
                    { id: 'holografico' as const, label: 'Holográfico' }
                  ].map((ds) => {
                    const isSelected = (customConfig.pvDeckStyle || 'padrao') === ds.id;
                    return (
                      <button
                        key={ds.id}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({ ...prev, pvDeckStyle: ds.id }));
                        }}
                        className={`py-1 px-1 text-[11px] font-anton uppercase border cursor-pointer text-center ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400 text-black font-black shadow-sm'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {ds.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 bg-black/70 border border-slate-800 flex flex-col justify-between gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-anton text-xs text-white uppercase">
                    Modo de Cartas (8 Cartas)
                  </span>
                  <span className="text-[9px] font-mono-code text-cyan-300 font-bold">
                    {customConfig.pvDeckMode === 'physical' ? 'Físico' : 'Digital'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'assisted' as const, label: 'Digital na TV' },
                    { id: 'physical' as const, label: 'Baralho Físico' }
                  ].map((dm) => {
                    const isSelected = customConfig.pvDeckMode === dm.id;
                    return (
                      <button
                        key={dm.id}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          onChangeCustomConfig((prev) => ({ ...prev, pvDeckMode: dm.id }));
                        }}
                        className={`py-1 px-1.5 text-xs font-anton uppercase border cursor-pointer text-center ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-400 text-black font-black'
                            : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {dm.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2 bg-black/70 border border-slate-800 flex items-center justify-between gap-2 sm:col-span-2">
                <div>
                  <div className="font-anton text-xs text-amber-300 uppercase">
                    Fichas Iniciais
                  </div>
                  <div className="text-[9px] font-mono-code text-slate-400">
                    Cada participante recebe 10 tokens para fazer perguntas e blefar
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-amber-400 text-black font-anton text-[11px] uppercase font-bold shrink-0">
                  🪙 10 TOKENS
                </span>
              </div>
            </div>
          )}
        </section>
            </div>
          </div>
        </div>
      )}

      <div className="rdb-setup-foot">
        {onBackToLobby ? (
          <button
            type="button"
            data-testid="setup-back-btn"
            className="rdb-btn"
            onClick={() => {
              sounds.playFlip();
              onBackToLobby();
            }}
          >
            Voltar ao catálogo
          </button>
        ) : (
          <span />
        )}
        <div className="rdb-setup-foot-actions">
          {onProceedToTeams && (
            <button
              type="button"
              data-testid="step2-proceed-to-teams-btn"
              className="rdb-btn"
              onClick={() => {
                sounds.playTick();
                onProceedToTeams();
              }}
            >
              {isIndividualMode ? `Jogadores (${connectedPlayersCount ?? '—'})` : `Equipes (${connectedPlayersCount ?? '—'} jogadores)`}
            </button>
          )}
          {onGoToRules && (
            <button
              type="button"
              data-testid="step2-continue-to-mode-btn"
              className="rdb-btn"
              onClick={() => {
                sounds.playTick();
                onGoToRules();
              }}
            >
              Como jogar
            </button>
          )}
          {onStartDirectly && (
            <button
              type="button"
              data-testid="setup-start-direct-btn"
              className="rdb-btn rdb-setup-start"
              onClick={() => {
                sounds.playPowerup();
                onStartDirectly();
              }}
            >
              Iniciar jogo
              <ArrowRight />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
