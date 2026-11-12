import React, { useState } from 'react';
import { checkSpokenWord, radicalList } from '../../../utils/radicais';

/**
 * REG-06: o juiz digita a palavra que foi dita e ve se ela parece dividir o radical com a palavra-alvo ou com uma das
 * proibidas. E so uma ajuda (radical em portugues tem excecoes): quem decide e o juiz, que pode contestar a falta.
 */
export const RadicalCheck: React.FC<{ cardWords: string[] }> = ({ cardWords }) => {
  const [spoken, setSpoken] = useState('');
  const hits = spoken.trim().length >= 3 ? checkSpokenWord(spoken, cardWords) : [];
  const typed = spoken.trim().length >= 3;

  return (
    <div data-testid="proibido-radical-check" className="flex flex-col gap-0.5 min-w-[150px]">
      <input
        type="text"
        value={spoken}
        onChange={(e) => setSpoken(e.target.value)}
        placeholder="Checar palavra dita"
        aria-label="Checar palavra dita (radical)"
        autoComplete="off"
        className="px-2 py-1 bg-[#07080d] border border-white/20 text-[11px] text-white focus:outline-none focus:border-sky-400"
      />
      {typed && (
        <span
          data-testid="proibido-radical-result"
          className={`text-[10px] font-mono-code font-bold ${hits.length ? 'text-rose-300' : 'text-emerald-300'}`}
        >
          {hits.length
            ? `⚠️ parece o radical de ${hits.map((h) => h.cardWord).join(', ')} — o juiz decide`
            : '✅ nada suspeito (o juiz decide)'}
        </span>
      )}
      <span className="text-[9px] font-mono-code text-slate-500 truncate" title="Radicais aproximados da carta">
        Radicais: {radicalList(cardWords).join(' · ')}
      </span>
    </div>
  );
};
