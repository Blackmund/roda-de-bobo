import React, { useState } from 'react';
import { Check, X, Search } from 'lucide-react';
import { sounds } from '../../../utils/soundEffects';

export interface DuvidoCheckVerdict {
  answer: string;
  verdict: 'valid' | 'invalid' | 'uncertain';
  explanation: string;
}

interface DuvidoAnswerCheckProps {
  category: string;
  ruleTip?: string;
  examples?: string[];
  query: string;
  onChangeQuery: (val: string) => void;
  result: DuvidoCheckVerdict | null;
  onResult: (res: DuvidoCheckVerdict | null) => void;
  compact?: boolean;
}

const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const DuvidoAnswerCheck: React.FC<DuvidoAnswerCheckProps> = ({
  category,
  ruleTip,
  examples = [],
  query,
  onChangeQuery,
  result,
  onResult,
  compact = false
}) => {
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    const clean = query.trim();
    if (!clean || checking) return;

    const normAnswer = normalizeText(clean);
    const localMatch = examples.find((ex) => {
      const normEx = normalizeText(ex);
      return normEx === normAnswer || (normAnswer.length >= 4 && normEx.includes(normAnswer));
    });

    if (localMatch) {
      sounds.playSuccess();
      onResult({
        answer: clean,
        verdict: 'valid',
        explanation: `Válido — consta no gabarito (${localMatch}).`
      });
      return;
    }

    setChecking(true);
    try {
      const res = await fetch('/api/duvido-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, ruleTip, examples, answer: clean })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const verdict: DuvidoCheckVerdict['verdict'] =
        data?.verdict === 'valid' || data?.verdict === 'invalid' ? data.verdict : 'uncertain';
      if (verdict === 'valid') sounds.playSuccess();
      else if (verdict === 'invalid') sounds.playBuzzer();
      else sounds.playTick();

      onResult({
        answer: clean,
        verdict,
        explanation: String(data?.explanation || 'O árbitro decide.')
      });
    } catch {
      sounds.playTick();
      onResult({
        answer: clean,
        verdict: 'uncertain',
        explanation: 'Não consta no gabarito da rodada — o árbitro decide.'
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      data-testid="duvido-answer-check"
      className={'rdb-duv-check' + (compact ? ' is-compact' : '')}
    >
      <div className="rdb-duv-check-row">
        <input
          type="text"
          data-testid="duvido-check-input"
          value={query}
          onChange={(e) => {
            onChangeQuery(e.target.value);
            if (!e.target.value.trim()) onResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCheck();
            }
          }}
          placeholder="Checar item citado (ex.: filósofo, país...)"
          aria-label="Checar item citado no Duvido"
          autoComplete="off"
        />
        <button
          type="button"
          data-testid="duvido-check-btn"
          className="rdb-btn rdb-duv-check-btn"
          onClick={handleCheck}
          disabled={!query.trim() || checking}
        >
          <Search size={14} />
          <span>{checking ? 'Checando...' : 'Checar'}</span>
        </button>
      </div>
      {result && (
        <div
          data-testid="duvido-check-result"
          className={`rdb-duv-check-res is-${result.verdict}`}
        >
          <span className="rdb-duv-check-badge">
            {result.verdict === 'valid' ? (
              <Check size={13} strokeWidth={3} />
            ) : result.verdict === 'invalid' ? (
              <X size={13} strokeWidth={3} />
            ) : null}
            {result.verdict === 'valid'
              ? 'Válido'
              : result.verdict === 'invalid'
              ? 'Inválido'
              : 'Dúvida'}
          </span>
          <span className="rdb-duv-check-msg">
            <strong>{result.answer}:</strong> {result.explanation}
          </span>
        </div>
      )}
    </div>
  );
};
