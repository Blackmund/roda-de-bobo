import React from 'react';
import type { GameCustomConfig } from '../../../types/game';
import { sounds } from '../../../utils/soundEffects';

/**
 * DAD-05: o host escolhe de onde vem o conteudo das perguntas.
 * - `auto` (padrao): mistura banco pronto e IA, sem repetir.
 * - `bank`: so o banco pronto (os itens do programa e os revisados), sem chamar a IA.
 * - `ai`: so conteudo gerado pela IA (cai no banco se a IA estiver fora do ar).
 */
const OPTIONS: Array<{ value: NonNullable<GameCustomConfig['contentSource']>; label: string; hint: string }> = [
  { value: 'auto', label: 'MISTO', hint: 'Banco de perguntas + IA, sem repetir' },
  { value: 'bank', label: 'BANCO DE PERGUNTAS', hint: 'Só perguntas do acervo, sem chamar a IA' },
  { value: 'ai', label: 'SÓ IA', hint: 'Conteúdo novo gerado na hora' }
];

export const ContentSourceSelector: React.FC<{
  customConfig: GameCustomConfig;
  onChangeCustomConfig: React.Dispatch<React.SetStateAction<GameCustomConfig>>;
}> = ({ customConfig, onChangeCustomConfig }) => {
  const current = customConfig.contentSource ?? 'auto';
  return (
    <section
      data-testid="content-source-selector"
      className="border-2 border-cyan-400/30 bg-[#090b14] p-2 space-y-1.5 shadow-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-anton text-xs sm:text-sm text-white uppercase tracking-wider leading-none">
          📚 ORIGEM DO CONTEÚDO
        </h4>
        <div className="flex gap-1 flex-wrap">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              data-testid={'content-source-btn-' + o.value}
              aria-pressed={current === o.value}
              title={o.hint}
              onClick={() => {
                sounds.playTick();
                onChangeCustomConfig((prev) => ({ ...prev, contentSource: o.value }));
              }}
              className={
                'px-2.5 py-1 border font-anton text-xs uppercase tracking-wider cursor-pointer transition-all ' +
                (current === o.value
                  ? 'border-cyan-400 bg-cyan-400 text-black font-black'
                  : 'border-slate-800 bg-black/60 text-slate-300 hover:border-cyan-400/50 hover:text-white')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[10px] font-mono-code text-slate-400">{OPTIONS.find((o) => o.value === current)?.hint}</p>
    </section>
  );
};
