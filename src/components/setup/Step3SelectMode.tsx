import React from 'react';
import { ConnectionMode } from '../../types/game';
import { sounds } from '../../utils/soundEffects';
import {
  Monitor,
  Tv,
  Smartphone,
  QrCode,
  Users,
  Crown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export interface Step3SelectModeProps {
  selectedMode: ConnectionMode;
  onSelectModeAndContinue: (mode: ConnectionMode) => void;
  onBackToStep2: () => void;
}

const MODE_CARDS: Array<{
  mode: ConnectionMode;
  badge: string;
  title: string;
  subtitle: string;
  headline: string;
  description: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  ctaLabel: string;
}> = [
  {
    mode: 'local',
    badge: 'MODO 1 · PASS & PLAY',
    title: '🖥️ MODO LOCAL',
    subtitle: 'Mesma Tela / Sem Celulares Extras',
    headline: 'A TV/PC é a tela principal e única.',
    description:
      'Todos jogam juntos olhando e interagindo na mesma tela (ou passando o dispositivo de mão em mão). Adicione e selecione os jogadores diretamente aqui, sem precisar de celulares extras.',
    accentBorder: 'border-cyan-400',
    accentBg: 'bg-cyan-500/15',
    accentText: 'text-cyan-300',
    ctaLabel: 'ESCOLHER MODO LOCAL'
  },
  {
    mode: 'host',
    badge: 'MODO 2 · TV PALCO & CONTROLES INDIVIDUAIS',
    title: '📺 MODO HOST',
    subtitle: 'TV como Palco + Celulares como Controle',
    headline: 'A TV é o Host visual e os celulares são os controles.',
    description:
      'A TV exibe o palco da partida e gera um QR Code único. Cada jogador escaneia o QR Code no seu celular para digitar palpites secretos, ver cartas ocultas e apertar botões na palma da mão.',
    accentBorder: 'border-rose-500',
    accentBg: 'bg-rose-500/15',
    accentText: 'text-rose-300',
    ctaLabel: 'GERAR SALA TV + CELULARES'
  },
  {
    mode: 'multi',
    badge: 'MODO 3 · ESTILO STOPOTS & GARTIC',
    title: '📱 MODO MULTI',
    subtitle: 'Cada Jogador 100% no seu Celular',
    headline: 'Sem tela de TV. Cada jogador joga unicamente pelo próprio celular.',
    description:
      'Cria uma sala com código/QR Code único onde tudo (perguntas, roleta, cartas, tabuleiro e botões de resposta) aparece diretamente na tela do celular de cada participante em tempo real!',
    accentBorder: 'border-amber-400',
    accentBg: 'bg-amber-500/15',
    accentText: 'text-amber-300',
    ctaLabel: 'CRIAR SALA 100% MOBILE'
  }
];

export const Step3SelectMode: React.FC<Step3SelectModeProps> = React.memo(({
  selectedMode,
  onSelectModeAndContinue,
  onBackToStep2
}) => {
  return (
    <div
      data-testid="step3-select-mode"
      className="flex-1 min-h-0 flex flex-col justify-between gap-3 overflow-y-auto scrollbar-none p-2 md:p-3 border border-white/10 bg-white/[0.02]"
    >
      {/* Cabeçalho da Etapa 3 */}
      <div className="text-center space-y-1 shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 font-mono-code text-[11px] font-bold uppercase tracking-widest">
          <span>ETAPA 3 DE 6 · ARQUITETURA DE CONEXÃO</span>
        </div>
        <h2 className="font-anton text-2xl sm:text-3xl text-white uppercase tracking-wider">
          COMO VOCÊS VÃO JOGAR HOJE?
        </h2>
        <p className="text-xs font-mono-code text-slate-300 max-w-2xl mx-auto">
          Escolha se vão jogar todos na mesma tela, usar a TV com celulares como controle ou jogar 100% pelo celular de cada participante.
        </p>
      </div>

      {/* 3 Cards Grandes Visuais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 items-stretch my-auto">
        {MODE_CARDS.map((card) => {
          const isSelected = selectedMode === card.mode;
          return (
            <div
              key={card.mode}
              data-testid={`mode-card-${card.mode}`}
              onClick={() => {
                sounds.playPowerup();
                onSelectModeAndContinue(card.mode);
              }}
              className={`group relative border-2 p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                isSelected
                  ? `${card.accentBorder} bg-[#0b0e1a] shadow-[0_0_28px_rgba(23,184,184,0.3)]`
                  : 'border-slate-800 bg-[#090b14] hover:border-cyan-400/70 hover:bg-[#0c101d]'
              }`}
            >
              <div className="space-y-3">
                {/* Top Badge & Selected Check */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono-code font-bold uppercase border ${card.accentBorder} ${card.accentBg} ${card.accentText}`}
                  >
                    {card.badge}
                  </span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono-code text-emerald-300 font-bold">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      <span>ATIVO</span>
                    </span>
                  )}
                </div>

                {/* Ilustração Visual do Modo */}
                <div className="h-20 rounded-xl bg-black/70 border border-white/10 flex items-center justify-center gap-3 px-4">
                  {card.mode === 'local' && (
                    <div className="flex items-center gap-3 text-cyan-300">
                      <Monitor size={34} className="shrink-0" />
                      <span className="font-mono-code text-xs text-slate-500">+</span>
                      <div className="flex items-center gap-1 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1.5 rounded-lg">
                        <Users size={20} />
                        <span className="font-mono-code text-[11px] font-bold">SOFÁ</span>
                      </div>
                    </div>
                  )}

                  {card.mode === 'host' && (
                    <div className="flex items-center gap-2.5 text-rose-300">
                      <Tv size={34} className="shrink-0" />
                      <QrCode size={22} className="text-cyan-300 animate-pulse shrink-0" />
                      <div className="flex items-center gap-1">
                        <Smartphone size={22} className="text-cyan-300" />
                        <Smartphone size={22} className="text-amber-300" />
                      </div>
                    </div>
                  )}

                  {card.mode === 'multi' && (
                    <div className="flex items-center gap-2 text-amber-300">
                      <div className="relative p-1.5 rounded-lg bg-amber-500/20 border border-amber-400">
                        <Smartphone size={24} />
                        <Crown
                          size={12}
                          className="absolute -top-1.5 -right-1.5 text-amber-300 fill-amber-300"
                        />
                      </div>
                      <Smartphone size={22} className="text-cyan-300" />
                      <Smartphone size={22} className="text-rose-300" />
                      <Smartphone size={22} className="text-emerald-300" />
                    </div>
                  )}
                </div>

                {/* Títulos e Descrição */}
                <div className="space-y-1">
                  <h3 className="font-anton text-xl md:text-2xl text-white uppercase tracking-wide">
                    {card.title}
                  </h3>
                  <div className={`text-xs font-mono-code font-bold uppercase ${card.accentText}`}>
                    {card.subtitle}
                  </div>
                </div>

                <div className="p-2.5 bg-black/50 border-l-2 border-cyan-400 text-xs font-bold text-white">
                  “{card.headline}”
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {card.description}
                </p>
              </div>

              {/* Botão de Seleção do Card */}
              <button
                type="button"
                data-testid={`select-mode-btn-${card.mode}`}
                onClick={(e) => {
                  e.stopPropagation();
                  sounds.playPowerup();
                  onSelectModeAndContinue(card.mode);
                }}
                className={`w-full py-2.5 px-3 font-anton text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#17B8B8] text-black shadow-neon-cyan'
                    : 'bg-white/[0.06] group-hover:bg-[#17B8B8] text-white group-hover:text-black border border-white/15'
                }`}
              >
                <span>{card.ctaLabel}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Rodapé com botão Voltar para Etapa 2 */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          data-testid="step3-back-to-step2-btn"
          onClick={() => {
            sounds.playTick();
            onBackToStep2();
          }}
          className="px-4 py-2 border border-slate-700 bg-black/70 hover:border-cyan-400 text-slate-200 font-anton text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>VOLTAR PARA CONFIGURAÇÃO</span>
        </button>

        <div className="text-[11px] font-mono-code text-slate-400 hidden sm:block">
          Clique em qualquer um dos 3 modos acima para abrir a Sala de Jogadores
        </div>
      </div>
    </div>
  );
});
