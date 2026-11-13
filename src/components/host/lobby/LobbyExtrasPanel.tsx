import React from 'react';
import { VisualTheme } from '../../../types/game';
import { themeBadge } from '../../../utils/themeUtils';
import { sounds } from '../../../utils/soundEffects';
import { Check, Sparkles, RotateCcw } from 'lucide-react';
import { clearUsedRoundSignatures } from '../../../utils/aiGameGenerator';

interface LobbyExtrasPanelProps {
  visualTheme: VisualTheme;
  onSetVisualTheme: ((theme: VisualTheme) => void) | undefined;
  aiStatusLabel: string;
  setClearedMemoryNotice: React.Dispatch<React.SetStateAction<boolean>>;
  clearedMemoryNotice: boolean;
}

export const LobbyExtrasPanel: React.FC<LobbyExtrasPanelProps> = ({
  visualTheme,
  onSetVisualTheme,
  aiStatusLabel,
  setClearedMemoryNotice,
  clearedMemoryNotice
}) => {
  return (
                <div className="space-y-4">
                  {/* Theme Selector Section */}
                  <div className="bg-white/[0.03] border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-anton text-sm uppercase text-white flex items-center gap-2">
                          <Sparkles size={16} className="text-[#17B8B8]" />
                          <span>TEMA VISUAL DA INTERFACE</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                          Escolha entre Neon, Clean, Modo 2 (broadcast) e Modo 3 (Original CazéTV)
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                          visualTheme === 'neon'
                            ? 'bg-[#17B8B8] text-black shadow-neon-cyan'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {themeBadge(visualTheme)} ATIVO
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1" data-theme-grid="4">
                      <button
                        type="button"
                        data-testid="lobby-config-theme-neon-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('neon');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          visualTheme === 'neon'
                            ? 'border-[#17B8B8] bg-[#17B8B8]/15 shadow-neon-cyan ring-1 ring-[#17B8B8]'
                            : 'border-white/10 bg-white/[0.02] hover:border-[#17B8B8]/60 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
                            <span>VERSÃO NEON</span>
                            <span className="text-[10px] font-mono-code bg-black/60 px-1.5 py-0.5 text-[#17B8B8]">PADRÃO</span>
                          </span>
                          {visualTheme === 'neon' && <Check size={16} className="text-[#17B8B8]" />}
                        </div>
                        <p className="text-[11px] font-mono-code text-slate-300 mt-2 leading-relaxed">
                          Estética Retro OS / Cyber Arcade: bordas neon brilhantes (Cyan/Rose), scanlines CRT de fliperama na TV e glow nos botões.
                        </p>
                      </button>

                      <button
                        type="button"
                        data-testid="lobby-config-theme-clean-btn"
                        onClick={() => {
                          sounds.playTick();
                          onSetVisualTheme?.('clean');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          visualTheme === 'clean'
                            ? 'border-white/40 bg-white/10 ring-1 ring-white/60'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-white flex items-center gap-1.5">
                            <span>VERSÃO CLEAN</span>
                            <span className="text-[10px] font-mono-code bg-white/10 px-1.5 py-0.5 text-slate-300">MINIMAL</span>
                          </span>
                          {visualTheme === 'clean' && <Check size={16} className="text-white" />}
                        </div>
                        <p className="text-[11px] font-mono-code text-slate-300 mt-2 leading-relaxed">
                          Visual moderno de estúdio: bordas finas sutis, tema escuro flat e sem efeito de scanlines.
                        </p>
                      </button>
                      {([['cazetv','MODO 2','Broadcast CazéTV: navy, moldura crimson, cartelas de auditório.'],['original','MODO 3 · ORIGINAL','Réplica do Roda de Bobo original: janela retrô, logo oficial e ilustrações flat.']] as const).map(([tid, label, desc]) => (
                        <button
                          key={tid}
                          type="button"
                          data-testid={`lobby-config-theme-${tid}-btn`}
                          onClick={() => {
                            sounds.playPowerup();
                            onSetVisualTheme?.(tid);
                          }}
                          className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            visualTheme === tid
                              ? 'border-[#E6194B] bg-[#E6194B]/15 ring-1 ring-[#E6194B]'
                              : 'border-white/10 bg-white/[0.02] hover:border-[#E6194B]/60 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-anton text-sm uppercase tracking-wide text-rose-300">{label}</span>
                            {visualTheme === tid && <Check size={16} className="text-rose-300" />}
                          </div>
                          <p className="text-[11px] font-mono-code text-slate-300 mt-2 leading-relaxed">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 border-l-4 border-emerald-400 p-4 space-y-2">
                    <div className="text-[10px] font-mono-code text-emerald-300 font-bold uppercase tracking-widest">
                      MOTOR GENERATIVO DE PERGUNTAS E TEMAS
                    </div>
                    <div
                      data-testid="config-ai-status-badge"
                      className="font-anton text-base md:text-lg text-white uppercase tracking-wide"
                    >
                      {aiStatusLabel}
                    </div>
                    <p className="text-xs font-mono-code text-slate-300 leading-relaxed">
                      Todas as perguntas do Jogo da Nota, Jogo do Duvido, Jogo do Limite, Jogo do Proibido e Tem ou Não Tem são geradas de forma limpa, curta e fiel ao tema escolhido (sem templates repetitivos).
                    </p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 p-4 space-y-3">
                    <div className="font-anton text-sm text-[#17B8B8] uppercase tracking-wider">
                      MEMÓRIA ANTI-REPETIÇÃO DE PERGUNTAS
                    </div>
                    <p className="text-xs font-mono-code text-slate-400">
                      O sistema guarda as perguntas e palavras já sorteadas para não repetir durante a sessão.
                    </p>
                    <button
                      type="button"
                      data-testid="config-clear-memory-btn"
                      onClick={() => {
                        clearUsedRoundSignatures();
                        sounds.playSuccess();
                        setClearedMemoryNotice(true);
                        setTimeout(() => setClearedMemoryNotice(false), 2500);
                      }}
                      className="px-4 py-2 bg-[#17B8B8] hover:bg-cyan-300 text-black font-anton text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>
                        {clearedMemoryNotice
                          ? 'MEMÓRIA DE PERGUNTAS REINICIADA!'
                          : 'LIMPAR HISTÓRICO DE PERGUNTAS USADAS'}
                      </span>
                    </button>
                  </div>
                </div>
              );
};
