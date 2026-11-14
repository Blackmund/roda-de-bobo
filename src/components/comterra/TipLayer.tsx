import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Dicas (data-tip) desenhadas numa camada por cima da pagina, para nenhum painel com overflow cortar.
 * Vale so dentro de `scope`; la dentro o ::after de CSS fica desligado (ver .rdb-tip-scope no comterra.css).
 */
export const TipLayer: React.FC<{ scope: string }> = ({ scope }) => {
  const [tip, setTip] = useState<{ text: string; x: number; top: number; bottom: number } | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let current: Element | null = null;
    const show = (el: Element | null) => {
      current = el;
      const text = el?.getAttribute('data-tip');
      if (!el || !text) return setTip(null);
      const r = el.getBoundingClientRect();
      setTip({ text, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
    };
    const find = (t: EventTarget | null) => {
      const el = (t as Element | null)?.closest?.('[data-tip]') || null;
      return el && el.closest(scope) ? el : null;
    };
    const over = (e: Event) => {
      const el = find(e.target);
      if (el !== current) show(el);
    };
    const hide = () => {
      current = null;
      setTip(null);
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('focusin', over);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('focusin', over);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, [scope]);

  // posiciona depois de medir: abaixo do elemento (ou acima, se nao couber), sempre dentro da janela
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!tip || !box) return setPos(null);
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    const gap = 8;
    const left = Math.min(Math.max(8, tip.x - w / 2), window.innerWidth - w - 8);
    const below = tip.bottom + gap + h <= window.innerHeight - 8;
    setPos({ left, top: below ? tip.bottom + gap : Math.max(8, tip.top - gap - h) });
  }, [tip]);

  if (!tip || typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={boxRef}
      className="rdb-tip-layer"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      {tip.text}
    </div>,
    document.body
  );
};
