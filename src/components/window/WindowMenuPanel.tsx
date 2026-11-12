import React from 'react';
import { RotateCcw, Volume2, VolumeX, Check, Sparkles } from 'lucide-react';
import { VisualTheme } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import { clearUsedRoundSignatures } from '../../utils/aiGameGenerator';

interface WindowMenuPanelProps {
  visualTheme: VisualTheme;
  onSetVisualTheme: ((theme: VisualTheme) => void) | undefined;
  muted: boolean;
  handleToggleMute: () => void;
  setClearedMemoryNotice: React.Dispatch<React.SetStateAction<boolean>>;
  clearedMemoryNotice: boolean;
}

export const WindowMenuPanel: React.FC<WindowMenuPanelProps> = ({
  visualTheme,
  onSetVisualTheme,
  muted,
  handleToggleMute,
  setClearedMemoryNotice,
  clearedMemoryNotice
}) => {
  return (
                <div className="space-y-4">
                  {/* Seção 1: Seletor de Modo Visual (4 Temas em Grid Horizontal que verticaliza conforme a tela diminui) */}
                  <div className="bg-white/[0.03] border border-white/10 p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-cyan-950/70 border border-cyan-400/50 text-[#17B8B8]">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <h3 className="font-anton text-sm sm:text-base uppercase tracking-wider text-white leading-none">
                            VISUAL DO SISTEMA
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono-code mt-0.5">
                            Escolha a skin dessa bagaça
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-mono-code font-bold uppercase ${
                          visualTheme === 'original'
                            ? 'bg-[#E6194B] text-white shadow-[0_0_12px_rgba(230,25,75,0.5)] border border-rose-300/40'
                            : visualTheme === 'cazetv'
                            ? 'bg-[#E6194B] text-white shadow-[0_0_12px_rgba(230,25,75,0.5)]'
                            : visualTheme === 'neon'
                            ? 'bg-[#17B8B8] text-black shadow-neon-cyan'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {visualTheme === 'original'
                          ? '🔴 CAZETV ATIVO'
                          : visualTheme === 'cazetv'
                          ? '📺 BROAD ATIVO'
                          : visualTheme === 'neon'
                          ? '⚡ NEON ATIVO'
                          : '✨ CLEAN ATIVO'}
                      </span>
                    </div>

                    {/* 4 Cards de Tema: Horizontal no Desktop (4 cols), 2 cols em tablet, 1 col no mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {/* CARD 1: NEON */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-neon-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('neon');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'neon'
                            ? 'border-[#17B8B8] bg-[#17B8B8]/15 shadow-neon-cyan ring-2 ring-[#17B8B8]'
                            : 'border-white/10 bg-black/40 hover:border-[#17B8B8]/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
                            <span>⚡ NEON</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-black/80 px-1.5 py-0.5 text-[#17B8B8] border border-cyan-500/40 font-bold">
                            PADRÃO
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#17B8B8] shadow-neon-cyan" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E6194B] shadow-neon-rose" />
                          </div>
                          {visualTheme === 'neon' ? (
                            <span className="font-bold text-cyan-300 flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>

                      {/* CARD 2: CLEAN */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-clean-btn"
                        onClick={() => {
                          sounds.playTick();
                          onSetVisualTheme?.('clean');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'clean'
                            ? 'border-white bg-white/10 ring-2 ring-white/60 shadow-lg'
                            : 'border-white/10 bg-black/40 hover:border-white/40 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-white flex items-center gap-1.5">
                            <span>✨ CLEAN</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-white/10 px-1.5 py-0.5 text-slate-200 border border-white/20 font-bold">
                            MINIMAL
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                          </div>
                          {visualTheme === 'clean' ? (
                            <span className="font-bold text-white flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>

                      {/* CARD 3: BROAD */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-cazetv-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('cazetv');
                        }}
                        className={`p-3 border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'cazetv'
                            ? 'border-[#E6194B] bg-[#E6194B]/20 shadow-[0_0_20px_rgba(230,25,75,0.4)] ring-2 ring-[#E6194B]'
                            : 'border-white/10 bg-black/40 hover:border-[#E6194B]/60 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-rose-300 flex items-center gap-1.5">
                            <span>📺 BROAD</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-[#E6194B] text-white px-1.5 py-0.5 font-bold">
                            BROADCAST
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E6194B]" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#080b16] border border-white/40" />
                          </div>
                          {visualTheme === 'cazetv' ? (
                            <span className="font-bold text-rose-300 flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>

                      {/* CARD 4: CAZETV */}
                      <button
                        type="button"
                        data-testid="dock-config-theme-original-btn"
                        onClick={() => {
                          sounds.playPowerup();
                          onSetVisualTheme?.('original');
                        }}
                        className={`p-3 border-2 text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                          visualTheme === 'original'
                            ? 'border-[#E6194B] bg-[#0a0b1e] ring-2 ring-[#17B8B8] shadow-[0_0_20px_rgba(23,184,184,0.35)]'
                            : 'border-[#E6194B]/50 bg-[#0a0b1e]/70 hover:border-[#E6194B] hover:bg-[#0a0b1e]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-anton text-sm uppercase tracking-wide text-[#F5F2EB] flex items-center gap-1.5">
                            <span>🔴 CAZETV</span>
                          </span>
                          <span className="text-[9px] font-mono-code bg-[#17B8B8] text-black px-1.5 py-0.5 font-bold">
                            OFICIAL
                          </span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E6194B] border border-white" />
                            <span className="w-2.5 h-2.5 rounded-full bg-[#17B8B8]" />
                          </div>
                          {visualTheme === 'original' ? (
                            <span className="font-bold text-[#17B8B8] flex items-center gap-1">
                              <Check size={13} /> ATIVO
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-slate-300">Selecionar</span>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Seção 2: Linha Horizontal de Áudio e Memória de IA (Grid 2 Colunas no Desktop) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Painel de Áudio */}
                    <div className="bg-white/[0.03] border border-white/10 p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="font-anton text-sm uppercase text-white flex items-center gap-1.5">
                            {muted ? (
                              <VolumeX size={16} className="text-rose-400" />
                            ) : (
                              <Volume2 size={16} className="text-[#17B8B8]" />
                            )}
                            <span>EFEITOS SONOROS DE AUDITÓRIO</span>
                          </div>
                          <span
                            className={`text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 ${
                              muted
                                ? 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                                : 'bg-cyan-950/80 border border-cyan-400/50 text-cyan-300'
                            }`}
                          >
                            {muted ? 'MUDO' : 'ATIVO'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono-code mt-1">
                          Alterna os sons retrô de TV, sirenes, buzinas de erro, roleta e alertas sonoros do cronômetro.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          className={`flex-1 py-2 px-3 font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            muted
                              ? 'bg-[#E6194B] hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(230,25,75,0.4)]'
                              : 'bg-[#17B8B8] hover:bg-cyan-300 text-black shadow-neon-cyan'
                          }`}
                        >
                          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          <span>{muted ? 'ATIVAR ÁUDIO' : 'MUTAR ÁUDIO'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => sounds.playPowerup()}
                          className="px-3 py-2 bg-white/[0.06] hover:bg-white/15 border border-white/10 text-slate-200 font-anton text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                          title="Tocar som de teste"
                        >
                          <span>TESTAR</span>
                        </button>
                      </div>
                    </div>

                    {/* Painel de Memória IA */}
                    <div className="bg-white/[0.03] border border-white/10 p-3.5 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="font-anton text-sm uppercase text-[#17B8B8] flex items-center gap-1.5">
                            <RotateCcw size={15} className="text-[#17B8B8]" />
                            <span>MEMÓRIA ANTI-REPETIÇÃO (IA)</span>
                          </div>
                          <span className="text-[9px] font-mono-code font-bold uppercase px-2 py-0.5 bg-black/60 border border-white/10 text-slate-300">
                            GEMINI 2.5
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono-code mt-1">
                          Histórico local de perguntas e cartas já geradas na sessão para garantir rodadas 100% inéditas.
                        </p>
                      </div>

                      <div className="pt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            clearUsedRoundSignatures();
                            sounds.playSuccess();
                            setClearedMemoryNotice(true);
                            window.setTimeout(() => setClearedMemoryNotice(false), 2500);
                          }}
                          className={`w-full py-2 px-3 font-anton text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            clearedMemoryNotice
                              ? 'bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                              : 'bg-white/[0.06] hover:bg-[#17B8B8] text-white hover:text-black border border-white/15'
                          }`}
                        >
                          <RotateCcw size={14} className={clearedMemoryNotice ? 'animate-spin' : ''} />
                          <span>
                            {clearedMemoryNotice
                              ? '✓ MEMÓRIA REINICIADA COM SUCESSO!'
                              : 'REINICIAR MEMÓRIA DE PERGUNTAS'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
};
