import React from 'react';
import type { CTPiece, ComTerraState, GameRoom } from '../../types/game';
import { ranking } from '../../utils/comTerraEngine';
import { contractDef } from '../../utils/diaboMap';
import { PlayerMark } from '../rdb/PlayerMark';
import { ctColor } from './CTBoardView';

/** Pedacinhos do Plano do Diabo usados na TV e no celular. */

export function pieceTitle(p: CTPiece | null | undefined): string {
  if (!p) return 'peça';
  if (p.devil) return 'Peça do Diabo';
  const flat = p.shape.flat();
  if (flat.includes(3)) return `ponte ${p.size}`;
  return `peça ${p.size}`;
}

/** Chifrinhos: marca do diabinho e da Peca do Diabo (chapado, sem emoji). */
export const DevilGlyph: React.FC<{ size?: string; title?: string }> = ({ size = '1em', title }) => (
  <svg className="ct-devil-glyph" viewBox="0 0 16 16" width={size} height={size} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
    {title && <title>{title}</title>}
    <path d="M2 1 L6 6 L10 6 L14 1 L13 8 Q13 14 8 14 Q3 14 3 8 Z" fill="currentColor" />
    <rect x="5" y="8" width="2" height="2" fill="var(--rdb-navy, #0a0b1e)" />
    <rect x="9" y="8" width="2" height="2" fill="var(--rdb-navy, #0a0b1e)" />
  </svg>
);

/** Etiquetas curtas: furo, ponte, diabo. */
export const CTPieceBadges: React.FC<{ piece: CTPiece }> = ({ piece }) => {
  const flat = piece.shape.flat();
  const tags: string[] = [];
  if (piece.devil) tags.push('solta');
  if (flat.includes(2)) tags.push(flat.filter((v) => v === 2).length > 1 ? '2 furos' : 'furo');
  if (flat.includes(3)) tags.push('ponte');
  if (!tags.length) return null;
  return (
    <span className="ct-badges">
      {tags.map((t) => (
        <span key={t} className={'ct-badge ct-badge--' + t.replace(/\s/g, '')}>
          {t}
        </span>
      ))}
    </span>
  );
};

/** Recorde de quadrado: um quadradinho com "3×3" (ou traco se ainda nao fechou nenhum). */
export const CTSquareMark: React.FC<{ k: number }> = ({ k }) => (
  <span className={'ct-sq' + (k >= 2 ? ' is-on' : '')} title={k >= 2 ? `Maior quadrado: ${k}×${k}` : 'Ainda sem quadrado'}>
    <span className="ct-sq-box" aria-hidden="true" />
    {k >= 2 ? `${k}×${k}` : '–'}
  </span>
);

export const DiaboRank: React.FC<{ state: ComTerraState; players: GameRoom['players']; turnId: string | null }> = ({ state: s, players, turnId }) => (
  <ol className="ct-rank dbt-rank" data-testid="ct-tv-queue">
    {ranking(s).map((r) => {
      const p = players.find((x) => x.id === r.playerId);
      return (
        <li key={r.playerId} className={r.playerId === turnId ? 'is-turn' : ''}>
          <span className="ct-swatch" style={{ background: ctColor(s.order, r.playerId).top }} aria-hidden="true" />
          <PlayerMark p={p} />
          <span className="ct-rank-name">{p?.name || 'Jogador'}</span>
          <CTSquareMark k={s.bestSq?.[r.playerId] || 0} />
          <span className="dbt-devils" title="Diabinhos restantes">
            <DevilGlyph /> {s.devils?.[r.playerId] ?? 0}
          </span>
          <span className="ct-rank-pts">{r.points}</span>
        </li>
      );
    })}
  </ol>
);

export const ContractList: React.FC<{ state: ComTerraState; nameOf: (id: string) => string }> = ({ state: s, nameOf }) => (
  <ul className="ct-contracts" data-testid="ct-contracts">
    {(s.contracts || []).map((c) => (
      <li key={c.id} className={c.done.length >= 2 ? 'is-closed' : ''}>
        <span className="ct-contract-label">{contractDef(c.id)?.label}</span>
        <span className="ct-contract-pay">
          {c.done.length === 0 ? '+8' : c.done.length === 1 ? `+4 · ${nameOf(c.done[0])} levou +8` : 'fechado'}
        </span>
      </li>
    ))}
  </ul>
);
