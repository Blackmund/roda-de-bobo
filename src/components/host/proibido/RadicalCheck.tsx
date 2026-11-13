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
    <div data-testid="proibido-radical-check" className="rdb-pro-radical">
      <input
        type="text"
        value={spoken}
        onChange={(e) => setSpoken(e.target.value)}
        placeholder="Checar palavra dita"
        aria-label="Checar palavra dita (radical)"
        autoComplete="off"
        title={`Radicais da carta: ${radicalList(cardWords).join(' · ')}`}
      />
      {typed && (
        <span
          data-testid="proibido-radical-result"
          className={hits.length ? 'is-warn' : 'is-ok'}
        >
          {hits.length
            ? `Parece o radical de ${hits.map((h) => h.cardWord).join(', ')}. O juiz decide.`
            : 'Nada suspeito. O juiz decide.'}
        </span>
      )}
    </div>
  );
};
