import React, { useEffect, useMemo, useState } from 'react';
import type { CTPendingKind, ComTerraState, Player } from '../../types/game';
import {
  CT_DISCARD_PENALTY,
  CT_MODE_LABEL,
  boardFor,
  canPlaceAt,
  canTarget,
  currentPlayerId,
  discardPiece,
  flipH,
  flipV,
  hasAnyPlacement,
  pendingFor,
  pickPiece,
  placePiece,
  playerStage,
  ranking,
  resolveAction,
  rotateCCW,
  rotateCW,
  sabotage,
  skipAction,
  skipSabotage
} from '../../utils/comTerraEngine';
import { sounds } from '../../utils/soundEffects';
import { PlayerMark } from '../rdb/PlayerMark';
import { CTBoardView, CTPieceView, ctColor } from './CTBoardView';
import './comterra.css';

/**
 * Lugar de um jogador no Com Terra: tabuleiro, loja e adversarios.
 * No celular vira tres abas; em tela larga (TV / mesa) os tres paineis aparecem lado a lado.
 * A posicao da peca na mao e a pre-escolha ficam so neste aparelho; o estado da sala so muda nas jogadas confirmadas.
 */

type Tab = 'board' | 'shop' | 'rivals';

export interface CTSeatProps {
  state: ComTerraState;
  players: Player[];
  playerId: string;
  onUpdate: (updater: (prev: ComTerraState) => ComTerraState) => void;
}

interface Pose {
  uid: string;
  m: number[][];
  x: number;
  y: number;
}

export const CTSeat: React.FC<CTSeatProps> = ({ state: s, players, playerId, onUpdate }) => {
  const stage = playerStage(s, playerId);
  const board = boardFor(s, playerId);
  const hand = (s.hand || {})[playerId] || null;
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name || 'Jogador';
  const me = players.find((p) => p.id === playerId);
  const myColor = ctColor(s.order, playerId);

  const [tab, setTab] = useState<Tab>('board');
  const [wish, setWish] = useState<string | null>(null);
  const [stolen, setStolen] = useState(false);
  const [shopSel, setShopSel] = useState<string | null>(null);
  const [pose, setPose] = useState<Pose | null>(null);
  const [locked, setLocked] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [sabKind, setSabKind] = useState<'tree' | 'plus' | 'minus'>('tree');
  const [tokValue, setTokValue] = useState<1 | -1>(1);

  // a aba acompanha o que o jogador precisa fazer
  useEffect(() => {
    if (stage === 'pick') setTab('shop');
    else if (stage === 'place' || stage === 'action' || stage === 'sabotage') setTab('board');
    setTarget(null);
    setLocked(false);
    setAskDiscard(false);
  }, [stage]);

  // pre-escolha: se outro jogador levou a peca, avisa para pensar no plano B
  const shopIds = (s.shop || []).map((p) => p.uid).join('|');
  useEffect(() => {
    if (wish && !(s.shop || []).some((p) => p.uid === wish)) {
      if (hand?.uid !== wish) setStolen(true);
      setWish(null);
    }
    if (shopSel && !(s.shop || []).some((p) => p.uid === shopSel)) setShopSel(null);
  }, [shopIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // na sua vez, a loja ja abre com a pre-escolhida marcada
  useEffect(() => {
    if (stage === 'pick' && wish) setShopSel(wish);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // peca nova na mao: comeca no meio do tabuleiro
  const clamp = (m: number[][], x: number, y: number) => ({
    x: Math.max(0, Math.min(board.w - m[0].length, x)),
    y: Math.max(0, Math.min(board.h - m.length, y))
  });
  const boardCenter = useMemo(() => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    board.cells.forEach((c, i) => {
      const mine = s.mode === 'fronteiras' ? c.z === playerId : c.t === 1;
      if (!mine) return;
      sx += i % board.w;
      sy += Math.floor(i / board.w);
      n++;
    });
    return n ? { x: Math.round(sx / n), y: Math.round(sy / n) } : { x: Math.floor(board.w / 2), y: Math.floor(board.h / 2) };
  }, [board.id, board.w, board.h, s.mode, playerId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hand) {
      setPose(null);
      return;
    }
    if (pose?.uid === hand.uid) return;
    const m = hand.shape;
    const p = clamp(m, boardCenter.x - Math.floor(m[0].length / 2), boardCenter.y - Math.floor(m.length / 2));
    setPose({ uid: hand.uid, m, ...p });
  }, [hand?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = pose && stage === 'place' ? canPlaceAt(s, playerId, pose.m, pose.x, pose.y) : null;
  const fits = useMemo(() => (hand && stage === 'place' ? hasAnyPlacement(s, playerId, hand) : true), [hand?.uid, stage, s.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const transform = (fn: (m: number[][]) => number[][]) => {
    if (!pose || locked) return;
    sounds.playTick();
    const m = fn(pose.m);
    setPose({ ...pose, m, ...clamp(m, pose.x, pose.y) });
  };
  const nudge = (dx: number, dy: number) => {
    if (!pose || locked) return;
    setPose({ ...pose, ...clamp(pose.m, pose.x + dx, pose.y + dy) });
  };
  const moveTo = (cx: number, cy: number) => {
    if (!pose || locked) return;
    setPose({ ...pose, ...clamp(pose.m, cx - Math.floor(pose.m[0].length / 2), cy - Math.floor(pose.m.length / 2)) });
  };

  const pendingKind = stage === 'action' ? pendingFor(s, playerId) : null;
  const targeting = stage === 'action' || stage === 'sabotage';
  const targetKind: CTPendingKind = stage === 'action' ? pendingKind || 'tree' : sabKind === 'tree' ? 'tree' : 'tok';
  const targetTok: 1 | -1 = stage === 'action' ? tokValue : sabKind === 'minus' ? -1 : 1;

  const confirmTarget = () => {
    if (!target) return;
    sounds.playSuccess();
    const { x, y } = target;
    if (stage === 'action') onUpdate((prev) => resolveAction(prev, playerId, x, y, targetTok));
    else onUpdate((prev) => sabotage(prev, playerId, targetKind, x, y, targetTok));
    setTarget(null);
  };

  const turnId = currentPlayerId(s);
  const statusText = (() => {
    if (stage === 'done') return 'Partida encerrada';
    if (stage === 'pick') return 'Sua vez: escolha uma peça na loja';
    if (stage === 'place') return 'Posicione a peça no tabuleiro';
    if (stage === 'action') return pendingKind === 'tree' ? 'Ação ganha: plante uma árvore' : 'Ação ganha: ponha uma ficha no mapa';
    if (stage === 'sabotage') return 'Sabotagem: uma árvore ou uma ficha no mapa';
    if (s.phase === 'PICK') return 'Peça escolhida. Aguarde os outros';
    if (s.phase === 'SABOTAGE') return 'Aguarde a sabotagem dos outros';
    return turnId ? `Vez de ${nameOf(turnId)}` : 'Aguarde';
  })();

  const rank = ranking(s);

  return (
    <div className="ct-seat" data-testid={'ct-seat-' + playerId} data-stage={stage}>
      <header className="ct-seat-head">
        <span className="ct-seat-me">
          <PlayerMark p={me} />
          <span className="ct-seat-name">{me?.name || 'Jogador'}</span>
          <span className="ct-swatch" style={{ background: myColor.top }} aria-hidden="true" />
        </span>
        <span className="ct-seat-pts" data-testid="ct-my-points">
          {s.pointsAwarded[playerId] || 0} pts
        </span>
        <span className="ct-seat-round">
          {CT_MODE_LABEL[s.mode]} · Rodada {s.round}/{s.totalRounds}
        </span>
        <p className={'ct-seat-status' + (stage !== 'wait' && stage !== 'done' ? ' is-live' : '')} data-testid="ct-status" aria-live="polite">
          {statusText}
        </p>
      </header>

      {stolen && (
        <button type="button" className="ct-alert" data-testid="ct-stolen-alert" onClick={() => setStolen(false)}>
          Roubaram sua peça pré-escolhida! Escolha outra. <span>Fechar</span>
        </button>
      )}

      <nav className="ct-tabs" aria-label="Telas do jogo">
        {(
          [
            ['board', 'Tabuleiro'],
            ['shop', 'Loja'],
            ['rivals', 'Adversários']
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button key={id} type="button" className="rdb-seg" aria-pressed={tab === id} data-testid={'ct-tab-' + id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      <div className="ct-panels">
        {/* TABULEIRO */}
        <section className={'ct-panel ct-panel--board' + (tab === 'board' ? ' is-active' : '')} aria-label="Tabuleiro">
          <div className="ct-board-wrap">
            <CTBoardView
              board={board}
              order={s.order}
              label={`Tabuleiro de ${me?.name || 'jogador'}`}
              testid="ct-my-board"
              ghost={pose && stage === 'place' ? { m: pose.m, x: pose.x, y: pose.y, ok: !!check?.ok, playerId, locked } : null}
              canTarget={targeting ? (x, y) => canTarget(s, playerId, x, y) : undefined}
              selected={targeting ? target : null}
              onCell={
                stage === 'place'
                  ? moveTo
                  : targeting
                  ? (x, y) => {
                      if (canTarget(s, playerId, x, y)) {
                        sounds.playTick();
                        setTarget({ x, y });
                      }
                    }
                  : undefined
              }
            />
          </div>

          {stage === 'place' && pose && (
            <div className="ct-tools" data-testid="ct-place-tools">
              {!fits && (
                <p className="ct-warn" data-testid="ct-no-fit">
                  Esta peça não cabe em nenhum lugar. Descarte para seguir.
                </p>
              )}
              <div className="ct-tools-row">
                <button type="button" className="rdb-seg" data-testid="ct-rot-ccw" onClick={() => transform(rotateCCW)}>
                  Girar ↺
                </button>
                <button type="button" className="rdb-seg" data-testid="ct-rot-cw" onClick={() => transform(rotateCW)}>
                  Girar ↻
                </button>
                <button type="button" className="rdb-seg" data-testid="ct-flip-x" onClick={() => transform(flipH)}>
                  Espelhar ↔
                </button>
                <button type="button" className="rdb-seg" data-testid="ct-flip-y" onClick={() => transform(flipV)}>
                  Espelhar ↕
                </button>
              </div>
              <div className="ct-tools-row ct-tools-row--pad">
                <div className="ct-dpad" aria-label="Mover a peça">
                  <button type="button" className="rdb-seg" aria-label="Mover para cima" data-testid="ct-move-up" onClick={() => nudge(0, -1)}>
                    ↑
                  </button>
                  <button type="button" className="rdb-seg" aria-label="Mover para a esquerda" data-testid="ct-move-left" onClick={() => nudge(-1, 0)}>
                    ←
                  </button>
                  <button type="button" className="rdb-seg" aria-label="Mover para baixo" data-testid="ct-move-down" onClick={() => nudge(0, 1)}>
                    ↓
                  </button>
                  <button type="button" className="rdb-seg" aria-label="Mover para a direita" data-testid="ct-move-right" onClick={() => nudge(1, 0)}>
                    →
                  </button>
                </div>
                <div className="ct-commit">
                  <p className={'ct-fit ' + (check?.ok ? 'is-ok' : 'is-bad')} data-testid="ct-fit-msg">
                    {check?.ok ? 'Posição válida' : check?.reason || 'Posição inválida'}
                  </p>
                  <button
                    type="button"
                    className="rdb-btn rdb-setup-start"
                    data-testid="ct-place-btn"
                    disabled={!check?.ok}
                    onClick={() => {
                      sounds.playFlip();
                      setLocked(true);
                    }}
                  >
                    Posicionar peça
                  </button>
                  <button type="button" className="rdb-btn" data-testid="ct-discard-btn" onClick={() => setAskDiscard(true)}>
                    Descartar peça (-{CT_DISCARD_PENALTY} pts)
                  </button>
                </div>
              </div>
            </div>
          )}

          {targeting && (
            <div className="ct-tools" data-testid="ct-target-tools">
              {stage === 'sabotage' && (
                <div className="ct-tools-row">
                  {(
                    [
                      ['tree', 'Árvore'],
                      ['plus', 'Ficha +1'],
                      ['minus', 'Ficha -1']
                    ] as Array<['tree' | 'plus' | 'minus', string]>
                  ).map(([k, label]) => (
                    <button key={k} type="button" className="rdb-seg" aria-pressed={sabKind === k} data-testid={'ct-sab-' + k} onClick={() => setSabKind(k)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {stage === 'action' && pendingKind === 'tok' && (
                <div className="ct-tools-row">
                  <button type="button" className="rdb-seg" aria-pressed={tokValue === 1} data-testid="ct-tok-plus" onClick={() => setTokValue(1)}>
                    Ficha +1
                  </button>
                  <button type="button" className="rdb-seg" aria-pressed={tokValue === -1} data-testid="ct-tok-minus" onClick={() => setTokValue(-1)}>
                    Ficha -1
                  </button>
                </div>
              )}
              <p className="ct-hint">Toque em uma casa livre do mapa e confirme.</p>
              <div className="ct-tools-row">
                <button type="button" className="rdb-btn rdb-setup-start" data-testid="ct-target-confirm" disabled={!target} onClick={confirmTarget}>
                  {targetKind === 'tree' ? 'Plantar árvore aqui' : `Pôr ficha ${targetTok > 0 ? '+1' : '-1'} aqui`}
                </button>
                <button
                  type="button"
                  className="rdb-btn"
                  data-testid="ct-target-skip"
                  onClick={() => onUpdate((prev) => (stage === 'action' ? skipAction(prev, playerId) : skipSabotage(prev, playerId)))}
                >
                  {stage === 'action' ? 'Pular ação' : 'Não sabotar'}
                </button>
              </div>
            </div>
          )}

          {stage === 'wait' && hand && (
            <div className="ct-tools ct-tools--hand">
              <CTPieceView shape={hand.shape} color={myColor} label={`Sua peça ${hand.size}`} />
              <p className="ct-hint">
                Sua peça: número {hand.size}, vale {hand.pts} pts. Você coloca quando chegar a sua vez.
              </p>
            </div>
          )}
        </section>

        {/* LOJA */}
        <section className={'ct-panel ct-panel--shop' + (tab === 'shop' ? ' is-active' : '')} aria-label="Loja de peças">
          <h3 className="ct-panel-title">Loja de peças</h3>
          <p className="ct-hint">
            {stage === 'pick'
              ? 'Escolha no olho: só dá para testar no tabuleiro depois de pegar.'
              : 'Fora da sua vez: toque para deixar uma peça pré-escolhida.'}
          </p>
          <ul className="ct-shop" data-testid="ct-shop">
            {(s.shop || []).map((p) => {
              const isWish = wish === p.uid;
              const isSel = stage === 'pick' && shopSel === p.uid;
              return (
                <li key={p.uid}>
                  <button
                    type="button"
                    className={'ct-shop-card' + (isSel ? ' is-sel' : '') + (isWish ? ' is-wish' : '')}
                    aria-pressed={isSel || isWish}
                    data-testid={'ct-shop-' + p.uid}
                    onClick={() => {
                      sounds.playTick();
                      if (stage === 'pick') setShopSel(p.uid);
                      else if (stage !== 'done') setWish(isWish ? null : p.uid);
                    }}
                  >
                    <span className="ct-shop-num">{p.size}</span>
                    <CTPieceView shape={p.shape} label={`Peça ${p.size}`} />
                    <span className="ct-shop-pts">{p.pts} pts</span>
                    {isWish && <span className="rdb-tag ct-shop-tag">Pré-escolhida</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {stage === 'pick' && (
            <button
              type="button"
              className="rdb-btn rdb-setup-start ct-shop-take"
              data-testid="ct-take-btn"
              disabled={!shopSel}
              onClick={() => {
                if (!shopSel) return;
                sounds.playPowerup();
                const uid = shopSel;
                onUpdate((prev) => pickPiece(prev, playerId, uid));
              }}
            >
              {shopSel ? `Pegar peça ${(s.shop || []).find((p) => p.uid === shopSel)?.size || ''}` : 'Toque em uma peça'}
            </button>
          )}
        </section>

        {/* ADVERSARIOS */}
        <section className={'ct-panel ct-panel--rivals' + (tab === 'rivals' ? ' is-active' : '')} aria-label="Adversários">
          <h3 className="ct-panel-title">Placar</h3>
          <ol className="ct-rank" data-testid="ct-rank">
            {rank.map((r) => {
              const p = players.find((x) => x.id === r.playerId);
              const piece = (s.hand || {})[r.playerId];
              return (
                <li key={r.playerId} className={r.playerId === turnId ? 'is-turn' : ''}>
                  <span className="ct-swatch" style={{ background: ctColor(s.order, r.playerId).top }} aria-hidden="true" />
                  <PlayerMark p={p} />
                  <span className="ct-rank-name">{p?.name || 'Jogador'}</span>
                  {piece && <span className="ct-rank-piece">peça {piece.size}</span>}
                  <span className="ct-rank-pts">{r.points}</span>
                </li>
              );
            })}
          </ol>
          {s.mode === 'arquiteto' && (
            <div className="ct-rival-boards">
              {s.boards
                .filter((b) => b.owner !== playerId)
                .map((b) => (
                  <figure key={b.id} className="ct-rival">
                    <figcaption>{nameOf(b.owner)}</figcaption>
                    <CTBoardView board={b} order={s.order} label={`Tabuleiro de ${nameOf(b.owner)}`} />
                  </figure>
                ))}
            </div>
          )}
          <ul className="ct-log" data-testid="ct-log">
            {(s.log || []).slice(0, 5).map((e) => (
              <li key={e.id}>
                <strong>{nameOf(e.playerId)}</strong> {e.text}
                {e.delta !== 0 && <span className={e.delta > 0 ? 'is-plus' : 'is-minus'}> {e.delta > 0 ? '+' + e.delta : e.delta}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* passo 2 da dupla confirmacao */}
      {locked && pose && (
        <div className="ct-veil" data-testid="ct-confirm-modal">
          <div className="ct-modal" role="dialog" aria-modal="true" aria-labelledby="ct-confirm-title">
            <h3 id="ct-confirm-title">Você realmente deseja confirmar a peça nesta posição?</h3>
            <p>Depois de confirmar, a peça não sai mais do lugar.</p>
            <div className="ct-modal-actions">
              <button type="button" className="rdb-btn" data-testid="ct-confirm-back" onClick={() => setLocked(false)}>
                Voltar e ajustar
              </button>
              <button
                type="button"
                className="rdb-btn rdb-setup-start"
                data-testid="ct-confirm-final"
                onClick={() => {
                  sounds.playSuccess();
                  const { m, x, y } = pose;
                  onUpdate((prev) => placePiece(prev, playerId, m, x, y));
                  setLocked(false);
                }}
              >
                Confirmar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {askDiscard && (
        <div className="ct-veil" data-testid="ct-discard-modal">
          <div className="ct-modal" role="dialog" aria-modal="true" aria-labelledby="ct-discard-title">
            <h3 id="ct-discard-title">Descartar a peça e perder {CT_DISCARD_PENALTY} pontos?</h3>
            <p>A peça sai do jogo e a sua vez termina.</p>
            <div className="ct-modal-actions">
              <button type="button" className="rdb-btn" data-testid="ct-discard-back" onClick={() => setAskDiscard(false)}>
                Voltar
              </button>
              <button
                type="button"
                className="rdb-btn rdb-setup-start"
                data-testid="ct-discard-final"
                onClick={() => {
                  sounds.playBuzzer();
                  onUpdate((prev) => discardPiece(prev, playerId));
                  setAskDiscard(false);
                }}
              >
                Descartar (-{CT_DISCARD_PENALTY} pts)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
