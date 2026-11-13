import React, { useState } from 'react';
import { Plus, RotateCcw, Shuffle, Trash2, X as XIcon } from 'lucide-react';
import {
  ADEDANHA_PADRAO,
  ADEDANHA_RESENHA,
  ADEDANHA_TEMATICAS,
  ADEDANHA_TODAS
} from '../../data/adedanhaCategorias';

export const ADEDANHA_MAX_CATEGORIES = 15;

interface Props {
  categories: string[];
  onChange: (next: string[]) => void;
}

const PRESETS: Array<{ id: string; label: string; make: () => string[] }> = [
  { id: 'classicas', label: 'Clássicas', make: () => [...ADEDANHA_PADRAO] },
  { id: 'tematicas', label: 'Temáticas', make: () => ADEDANHA_TEMATICAS.slice(0, 7) },
  { id: 'resenha', label: 'Com resenha', make: () => [...ADEDANHA_PADRAO.slice(0, 4), ...ADEDANHA_RESENHA.slice(0, 3)] }
];

/**
 * Categorias da Adedanha: comeca de um conjunto pronto, apaga o que nao quer, digita as suas e desfaz se apagou sem
 * querer (ou se trocou o conjunto inteiro).
 */
export const AdedanhaCategoryEditor: React.FC<Props> = ({ categories, onChange }) => {
  const [draft, setDraft] = useState('');
  const [history, setHistory] = useState<string[][]>([]);

  const commit = (next: string[]) => {
    setHistory((h) => [...h.slice(-19), categories]);
    onChange(next);
  };
  const add = () => {
    const t = draft.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!t) return;
    setDraft('');
    if (categories.some((c) => c.toLowerCase() === t.toLowerCase()) || categories.length >= ADEDANHA_MAX_CATEGORIES) return;
    commit([...categories, t]);
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    onChange(last);
  };

  return (
    <div className="rdb-opt rdb-adcat" data-testid="setup-ad-categories">
      <span className="rdb-opt-label">
        Categorias <small>({categories.length})</small>
      </span>
      <div className="rdb-adcat-body">
        <div className="rdb-adcat-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="rdb-seg"
              data-testid={`ad-cat-preset-${p.id}`}
              aria-pressed={categories.join() === p.make().join()}
              onClick={() => commit(p.make())}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="rdb-seg"
            data-testid="ad-cat-preset-sorteio"
            data-tip="Sorteia 7 categorias de todas as listas"
            onClick={() => commit([...ADEDANHA_TODAS].sort(() => Math.random() - 0.5).slice(0, 7))}
          >
            <Shuffle size={14} /> Sortear
          </button>
          <span className="rdb-adcat-tools">
            <button type="button" className="rdb-lim-icon" data-testid="ad-cat-undo" aria-label="Desfazer" data-tip="Desfazer a última mudança" disabled={history.length === 0} onClick={undo}>
              <RotateCcw size={16} />
            </button>
            <button type="button" className="rdb-lim-icon" data-testid="ad-cat-clear" aria-label="Apagar todas" data-tip="Apagar todas" disabled={categories.length === 0} onClick={() => commit([])}>
              <Trash2 size={16} />
            </button>
          </span>
        </div>
        <div className="rdb-adcat-chips">
          {categories.length === 0 && <span className="rdb-adcat-empty">Nenhuma categoria. Escolha um conjunto ou digite abaixo.</span>}
          {categories.map((c) => (
            <span key={c} className="rdb-adcat-chip">
              {c}
              <button type="button" aria-label={`Tirar ${c}`} data-testid={`ad-cat-remove-${c}`} onClick={() => commit(categories.filter((x) => x !== c))}>
                <XIcon size={12} strokeWidth={3} />
              </button>
            </span>
          ))}
        </div>
        <div className="rdb-adcat-add">
          <input
            data-testid="ad-cat-input"
            value={draft}
            maxLength={40}
            placeholder={categories.length >= ADEDANHA_MAX_CATEGORIES ? `Máximo de ${ADEDANHA_MAX_CATEGORIES}` : 'Nova categoria (ex.: Sobremesa)'}
            disabled={categories.length >= ADEDANHA_MAX_CATEGORIES}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
          />
          <button type="button" className="rdb-seg rdb-seg--action" data-testid="ad-cat-add" onClick={add} disabled={!draft.trim()}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};
