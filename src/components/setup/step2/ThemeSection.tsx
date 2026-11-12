import { POPULAR_THEMES } from './popularThemes';
import React from 'react';
import { sounds } from '../../../utils/soundEffects';
import { Sparkles, RefreshCw, Dices, Check, Search } from 'lucide-react';

interface ThemeSectionProps {
  isGeneralTheme: boolean;
  theme: string;
  onChangeTheme: (nextTheme: string) => void;
  onRollRandomTheme: () => void;
  isGeneratingThemes: boolean;
  onGenerateAiThemes: () => void;
  setIsAllThemesExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isAllThemesExpanded: boolean;
  dynamicThemes: string[];
}

export const ThemeSection: React.FC<ThemeSectionProps> = ({
  isGeneralTheme,
  theme,
  onChangeTheme,
  onRollRandomTheme,
  isGeneratingThemes,
  onGenerateAiThemes,
  setIsAllThemesExpanded,
  isAllThemesExpanded,
  dynamicThemes
}) => {
  return (
          <section
            data-testid="setup-theme-section"
            className="border-2 border-cyan-500/40 bg-[#090b14] p-2 sm:p-2.5 space-y-1.5 shadow-lg"
          >
            {/* Top Header: Título + Badge de Tema Ativo */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1">
              <div className="flex items-center gap-1.5">
                <div className="p-0.5 bg-cyan-950/70 border border-cyan-400/50 text-[#17B8B8]">
                  <Sparkles size={13} />
                </div>
                <div>
                  <h3
                    data-testid="setup-theme-heading"
                    className="font-anton text-xs sm:text-sm tracking-wider text-white uppercase leading-none"
                  >
                    1. TEMA CENTRAL DAS PERGUNTAS
                  </h3>
                  <span className="hidden sm:inline text-[9px] font-mono-code text-slate-400">
                    Defina o assunto que a IA usará para calibrar as perguntas da rodada
                  </span>
                </div>
              </div>

              {/* Badge Dinâmica de Status do Tema */}
              <div className="flex items-center gap-1 px-2 py-0.5 bg-black/80 border border-cyan-400/60 shadow-sm">
                <span className="text-[9px] font-mono-code text-slate-400 uppercase font-bold">
                  TEMA ATUAL:
                </span>
                <span className="font-anton text-[11px] sm:text-xs text-cyan-300 uppercase tracking-wide">
                  {isGeneralTheme ? '🌎 GERAL (ASSUNTOS DIVERSOS)' : `🎯 ${theme.toUpperCase()}`}
                </span>
              </div>
            </div>

            {/* Barra de Entrada de Tema Livre + Ações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center">
              {/* Campo de Texto Personalizado */}
              <div className="md:col-span-8 flex items-center bg-black/90 border border-slate-700 focus-within:border-cyan-400 px-2.5 py-1 transition-colors">
                <Search size={13} className="text-slate-500 mr-1.5 shrink-0" />
                <input
                  type="text"
                  data-testid="setup-custom-theme-input"
                  value={theme}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChangeTheme(e.target.value)}
                  placeholder="Digite qualquer tema livre (ex: Terror Gore, +18, Futebol, Anos 90)..."
                  className="w-full bg-transparent text-xs text-white font-mono-code placeholder-slate-500 focus:outline-none"
                />
                {theme ? (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTick();
                      onChangeTheme('');
                    }}
                    title="Limpar tema digitado"
                    className="ml-1.5 p-0.5 text-slate-400 hover:text-rose-400 uppercase shrink-0 transition-colors"
                  >
                    <span className="text-xs font-bold font-mono">✕</span>
                  </button>
                ) : null}
                {theme && !isGeneralTheme && (
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playTick();
                      onChangeTheme('Geral');
                    }}
                    className="ml-2 text-[9px] font-mono-code text-slate-400 hover:text-white uppercase shrink-0 underline"
                  >
                    Restaurar Geral
                  </button>
                )}
              </div>

              {/* Botões Utilitários Rápidos: Sortear e Sugerir IA */}
              <div className="md:col-span-4 flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="roll-random-theme-btn"
                  onClick={() => {
                    sounds.playPowerup();
                    onRollRandomTheme();
                  }}
                  className="flex-1 py-1 px-2.5 border border-amber-400/80 bg-amber-500/20 hover:bg-amber-400 hover:text-black text-amber-300 font-anton text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Sortear um tema aleatório da lista"
                >
                  <Dices size={13} />
                  <span>Sortear</span>
                </button>

                <button
                  type="button"
                  data-testid="generate-ai-themes-btn"
                  disabled={isGeneratingThemes}
                  onClick={() => {
                    sounds.playPowerup();
                    onGenerateAiThemes();
                    setIsAllThemesExpanded(true);
                  }}
                  className="flex-1 py-1 px-2.5 border border-cyan-400 bg-cyan-500/20 hover:bg-cyan-400 hover:text-black text-cyan-200 font-anton text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-60 shadow-sm"
                  title="Gerar sugestões inéditas com a IA"
                >
                  {isGeneratingThemes ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-cyan-300" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-cyan-300" />
                      <span>Sugerir IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Chips Rápidos: Temas Mais Populares (1 Clique) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[9px] font-mono-code text-slate-400 uppercase tracking-wider">
                <span>CATEGORIAS POPULARES RÁPIDAS:</span>
                <button
                  type="button"
                  data-testid="theme-dropdown-trigger"
                  onClick={() => {
                    sounds.playTick();
                    setIsAllThemesExpanded((prev) => !prev);
                  }}
                  className="text-cyan-300 hover:text-white uppercase font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{isAllThemesExpanded ? '▲ Recolher Lista' : `▼ Ver Todos (${dynamicThemes.length} Temas)`}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1">
                {POPULAR_THEMES.map((pt) => {
                  const isSelected = theme.trim().toLowerCase() === pt.name.toLowerCase();
                  return (
                    <button
                      key={pt.name}
                      type="button"
                      onClick={() => {
                        sounds.playTick();
                        onChangeTheme(pt.name);
                      }}
                      className={`px-1.5 py-1 border text-center transition-all cursor-pointer flex flex-row items-center justify-center gap-1 ${
                        isSelected
                          ? 'border-[#17B8B8] bg-[#17B8B8] text-black font-black shadow-neon-cyan scale-[1.02]'
                          : 'border-slate-800 bg-black/60 text-slate-300 hover:border-slate-600 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-xs leading-none shrink-0">{pt.icon}</span>
                      <span className="font-anton text-[11px] uppercase tracking-wider truncate">
                        {pt.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Acordeão Inline: Todos os 28 temas catalogados (sem sobrepor outros cards) */}
            {isAllThemesExpanded && (
              <div
                data-testid="theme-dropdown-panel"
                className="mt-1.5 p-2 bg-black/80 border border-cyan-500/40 space-y-1.5 animate-fadeIn"
              >
                <div className="text-[9px] font-mono-code text-cyan-300 uppercase font-bold tracking-wider flex items-center justify-between">
                  <span>CATÁLOGO COMPLETO DE TEMAS ({dynamicThemes.length} OPÇÕES):</span>
                  <span className="text-slate-400 font-normal">Clique para selecionar</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 max-h-40 overflow-y-auto pr-1">
                  {dynamicThemes.map((preset, idx) => {
                    const isSelected = theme.trim().toLowerCase() === preset.trim().toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        data-testid={`theme-option-${idx}`}
                        onClick={() => {
                          sounds.playTick();
                          onChangeTheme(preset);
                          setIsAllThemesExpanded(false);
                        }}
                        className={`px-2 py-1 border text-left text-[11px] font-mono-code font-bold transition-all cursor-pointer flex items-center justify-between gap-1 truncate ${
                          isSelected
                            ? 'border-[#17B8B8] bg-[#17B8B8] text-black shadow-neon-cyan'
                            : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-cyan-400 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{preset}</span>
                        {isSelected && <Check size={11} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
};
