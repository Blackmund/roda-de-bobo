import React, { useState, useEffect } from 'react';
import {
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
}

const TIMER_OPTIONS: Array<{ value: number; label: string; desc: string }> = [
  { value: 30, label: '30s', desc: 'Rápido' },
  { value: 60, label: '60s', desc: 'Padrão Oficial' },
  { value: 90, label: '90s', desc: 'Com calma' },
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

const DIFFICULTY_LIST: GameDifficulty[] = ['facil', 'medio', 'dificil', 'impossivel'];


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
  connectedPlayersCount
}) => {
  const isPV = activeGame === 'perguntas-e-verdades';
  const isIndividualMode =
    activeGame === 'limite' ||
    activeGame === 'nota' ||
    activeGame === 'quem-sou-eu' ||
    activeGame === 'onde-estou' ||
    activeGame === 'respostas-sem-perguntas' ||
    activeGame === 'estadios' ||
    activeGame === 'perguntas-e-verdades';

  const [isAllThemesExpanded, setIsAllThemesExpanded] = useState(false);

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

  return (
    <div
      data-testid="step2-configure-game"
      className="flex-1 min-h-0 flex flex-col justify-between gap-1.5 sm:gap-2 overflow-y-auto scrollbar-none p-1.5 sm:p-2 text-[#F5F2EB] select-none"
    >
      <div className="space-y-1.5 sm:space-y-2 flex-1 min-h-0 overflow-y-auto scrollbar-none pr-0.5">

                {/* MODO DE REGRAS: casa x programa (so para jogos que existem no programa) */}
        {hasShowRuleset(activeGame) && (
          <section
            data-testid="ruleset-selector"
            className="border-2 border-amber-400/40 bg-[#090b14] p-2 space-y-1.5 shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-anton text-xs sm:text-sm text-white uppercase tracking-wider leading-none">
                📺 MODO DE REGRAS
              </h4>
              <div className="flex gap-1">
                {(['home', 'show'] as const).map((rs) => (
                  <button
                    key={rs}
                    type="button"
                    data-testid={'ruleset-btn-' + rs}
                    aria-pressed={ruleset === rs}
                    onClick={() => handleSelectRuleset(rs)}
                    className={
                      'px-2.5 py-1 border font-anton text-xs uppercase tracking-wider cursor-pointer transition-all ' +
                      (ruleset === rs
                        ? 'border-amber-400 bg-amber-400 text-black font-black'
                        : 'border-slate-800 bg-black/60 text-slate-300 hover:border-amber-400/50 hover:text-white')
                    }
                  >
                    {RULESET_LABELS[rs]}
                  </button>
                ))}
              </div>
            </div>
            {ruleset === 'show' && showPreset && (
              <ul
                data-testid="ruleset-notes"
                className="list-disc pl-4 text-[10px] sm:text-xs font-mono-code text-amber-200/90 space-y-0.5"
              >
                {showPreset.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
          </section>
        )}

{/* =========================================================================
            CARD 1: TEMA CENTRAL DA PARTIDA (Estruturado, sem sobreposições)
           ========================================================================= */}
        {!isPV && <ThemeSection isGeneralTheme={isGeneralTheme} theme={theme} onChangeTheme={onChangeTheme} onRollRandomTheme={onRollRandomTheme} isGeneratingThemes={isGeneratingThemes} onGenerateAiThemes={onGenerateAiThemes} setIsAllThemesExpanded={setIsAllThemesExpanded} isAllThemesExpanded={isAllThemesExpanded} dynamicThemes={dynamicThemes} />}

        {/* =========================================================================
            CARD 2: PARÂMETROS DA PARTIDA (Grid Perfeita: Dificuldade + Tempo + Rodadas)
           ========================================================================= */}
        <section className={`grid grid-cols-1 ${isPV ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-1.5 sm:gap-2`}>

          {/* 1. NÍVEL DE DIFICULDADE (Omitido no Perguntas e Verdades) */}
          {!isPV && (
            <div className="border-2 border-rose-500/40 bg-[#090b14] p-2 space-y-1 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-1">
                <div className="flex items-center gap-1.5">
                  <Flame size={14} className="text-[#E6194B]" />
                  <h4 className="font-anton text-xs sm:text-sm text-white uppercase tracking-wider leading-none">
                    DIFICULDADE
                  </h4>
                </div>
                <span className="text-[9px] font-mono-code text-rose-300 font-bold uppercase">
                  {DIFFICULTY_META[difficulty].badge}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 flex-1 content-center">
                {DIFFICULTY_LIST.map((diffKey) => {
                  const meta = DIFFICULTY_META[diffKey];
                  const isSelected = difficulty === diffKey;
                  return (
                    <button
                      key={diffKey}
                      type="button"
                      data-testid={`difficulty-btn-${diffKey}`}
                      onClick={() => {
                        sounds.playTick();
                        onChangeDifficulty(diffKey);
                      }}
                      className={`px-2 py-1 border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#E6194B] bg-[#E6194B] text-white font-black shadow-[0_0_12px_rgba(230,25,75,0.4)]'
                          : 'border-slate-800 bg-black/60 text-slate-300 hover:border-rose-400/50 hover:text-white'
                      }`}
                    >
                      <span className="font-anton text-xs uppercase tracking-wide truncate">
                        {meta.label}
                      </span>
                      {isSelected && <Check size={12} className="text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. TEMPO POR RODADA (CRONÔMETRO) */}
          <div className="border-2 border-cyan-500/40 bg-[#090b14] p-2 space-y-1 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-1">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#17B8B8]" />
                <h4 className="font-anton text-xs sm:text-sm text-white uppercase tracking-wider leading-none">
                  TEMPO POR RODADA
                </h4>
              </div>
              <span className="text-[9px] font-mono-code text-cyan-300 font-bold uppercase flex items-center gap-1">
                {timer === 0 ? (
                  <>
                    <InfinityIcon className="w-3 h-3" />
                    <span>LIVRE</span>
                  </>
                ) : (
                  `${timer} SEGUNDOS`
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 flex-1 content-center">
              {TIMER_OPTIONS.map((opt) => {
                const isSelected = timer === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`timer-btn-${opt.value}`}
                    onClick={() => {
                      sounds.playTick();
                      onChangeTimer(opt.value);
                    }}
                    className={`px-2 py-1 border font-anton transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#17B8B8] bg-[#17B8B8] text-black font-black shadow-neon-cyan'
                        : 'border-slate-800 bg-black/60 text-slate-300 hover:border-cyan-400/50 hover:text-white'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider truncate">
                      {opt.value === 0 ? '∞ LIVRE' : opt.label}
                    </span>
                    {isSelected && <Check size={12} className="text-black shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. DURAÇÃO DA PARTIDA (RODADAS) */}
          <div className="border-2 border-amber-400/40 bg-[#090b14] p-2 space-y-1 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-1">
              <div className="flex items-center gap-1.5">
                <Target size={14} className="text-amber-400" />
                <h4 className="font-anton text-xs sm:text-sm text-white uppercase tracking-wider leading-none">
                  {isPV ? 'SÉRIE DE JOGOS' : 'TOTAL DE RODADAS'}
                </h4>
              </div>
              <span className="text-[9px] font-mono-code text-amber-300 font-bold uppercase">
                {isPV
                  ? rounds === 1
                    ? '1 JOGO'
                    : `MD${rounds}`
                  : `${rounds} RODADAS`}
              </span>
            </div>

            <div className={`grid ${isPV ? 'grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'} gap-1 flex-1 content-center`}>
              {(isPV ? PV_ROUND_OPTIONS : roundOptions).map((opt) => {
                const isSelected = rounds === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`rounds-btn-${opt.value}`}
                    onClick={() => {
                      sounds.playTick();
                      onChangeRounds(opt.value);
                    }}
                    className={`px-1.5 py-1 border text-center flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400 text-black font-black shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                        : 'border-slate-800 bg-black/60 text-slate-300 hover:border-amber-400/50 hover:text-white'
                    }`}
                  >
                    <span className="font-anton text-xs uppercase tracking-wide">
                      {isPV ? opt.label : `${opt.value}R`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            CARD 3: REGRAS ESPECÍFICAS DA MODALIDADE (Modular & Bem Espaçado)
           ========================================================================= */}
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

              <div className="p-2 bg-black/70 border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-anton text-xs text-amber-300 uppercase">
                    Bônus por Palpite Exato
                  </div>
                  <div className="text-[9px] font-mono-code text-slate-400">
                    Quem cravar exatamente o valor oficial leva 2 pontos em vez de 1
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-amber-400 text-black font-anton text-[11px] uppercase font-bold shrink-0">
                  🎯 2 PONTOS
                </span>
              </div>
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

      {/* =========================================================================
          BARRA DE AÇÕES INFERIOR (Hierarquia Limpa e Ações Evidentes)
         ========================================================================= */}
      <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          {onBackToLobby && (
            <button
              type="button"
              data-testid="setup-back-btn"
              onClick={() => {
                sounds.playFlip();
                onBackToLobby();
              }}
              className="px-3 py-1.5 border border-slate-700 bg-black/60 hover:border-slate-500 text-slate-300 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>⬅ VOLTAR AO CATÁLOGO</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão de Avanço para Jogadores ou Equipes */}
          {onProceedToTeams && (
            <button
              type="button"
              data-testid="step2-proceed-to-teams-btn"
              onClick={() => {
                sounds.playTick();
                onProceedToTeams();
              }}
              className="px-3 py-1.5 border border-cyan-400/80 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isIndividualMode ? <User size={13} /> : <Users size={13} />}
              <span>
                {isIndividualMode
                  ? `JOGADORES (${connectedPlayersCount ?? '—'})`
                  : `DEFINIR EQUIPES (${connectedPlayersCount ?? '—'} JOGADORES)`}
              </span>
              <ArrowRight size={13} />
            </button>
          )}

          {/* Botão de Regras & Tutorial */}
          {onGoToRules && (
            <button
              type="button"
              data-testid="step2-continue-to-mode-btn"
              onClick={() => {
                sounds.playTick();
                onGoToRules();
              }}
              className="px-3 py-1.5 border border-slate-700 bg-black/60 hover:border-slate-500 text-slate-300 font-anton text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen size={13} />
              <span>REGRAS & TUTORIAL</span>
            </button>
          )}

          {/* Botão Primário: Iniciar Jogo Agora */}
          {onStartDirectly && (
            <button
              type="button"
              data-testid="setup-start-direct-btn"
              onClick={() => {
                sounds.playPowerup();
                onStartDirectly();
              }}
              style={{ backgroundColor: '#E6194B', color: '#FFFFFF' }}
              className="px-5 py-1.5 bg-[#E6194B] hover:bg-rose-500 active:bg-rose-700 text-white font-anton font-black text-xs md:text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(230,25,75,0.5)] border border-rose-400/80 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Play size={14} className="fill-white text-white" />
              <span className="text-white font-black">INICIAR JOGO AGORA</span>
              <ArrowRight size={14} className="text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
