import React, { useEffect, useState } from 'react';
import { Check, Play } from 'lucide-react';
import { SFX_EVENTS, SOUND_THEMES, SoundTheme, sounds } from '../../utils/soundEffects';

/** Escolha do tema sonoro (toca uma previa ao trocar) e uma fileira para ouvir cada som do tema. */
export const SoundThemePicker: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const [theme, setTheme] = useState<SoundTheme>(() => sounds.getTheme());
  useEffect(() => sounds.onThemeChange(setTheme), []);

  return (
    <div className="space-y-2" data-testid="sound-theme-picker">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SOUND_THEMES.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              data-testid={'sound-theme-btn-' + o.value}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => {
                sounds.setTheme(o.value);
                // previa: um pouco depois, para o tema novo ter tempo de carregar
                window.setTimeout(() => sounds.playSuccess(), 160);
              }}
              className={`p-2.5 border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                active ? 'border-[#17B8B8] bg-[#17B8B8]/15 ring-2 ring-[#17B8B8]' : 'border-white/10 bg-black/40 hover:border-[#17B8B8]/60 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-anton text-xs uppercase tracking-wide ${active ? 'text-[#17B8B8]' : 'text-white'}`}>{o.label}</span>
                {active && <Check size={13} className="text-[#17B8B8] shrink-0" />}
              </div>
              <p className="mt-1.5 text-[10px] font-mono-code text-slate-400 leading-snug">{o.hint}</p>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Ouvir cada som">
        {SFX_EVENTS.map((e) => (
          <button
            key={e.value}
            type="button"
            data-testid={'sound-preview-' + e.value}
            disabled={disabled}
            onClick={() => sounds.preview(e.value)}
            className="px-2 py-1 bg-white/[0.06] hover:bg-white/15 border border-white/10 text-slate-200 font-mono-code text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={10} />
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
};
