import React, { useCallback, useEffect, useRef } from 'react';
import type { DrawStroke } from '../types/game';

interface DrawingCanvasProps {
  strokes: DrawStroke[];
  /** quando true, aceita desenho com mouse/toque/caneta */
  editable?: boolean;
  color?: string;
  /** espessura relativa a largura (ex.: 0.008) */
  lineWidth?: number;
  onStroke?: (stroke: DrawStroke) => void;
  className?: string;
  /** proporcao largura/altura da area de desenho */
  aspect?: number;
  testId?: string;
}

const BACKGROUND = '#0b0e24';

function paintStroke(ctx: CanvasRenderingContext2D, s: DrawStroke, w: number, h: number) {
  if (s.points.length === 0) return;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = Math.max(1, s.width * w);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (s.points.length === 1) {
    const [x, y] = s.points[0];
    ctx.beginPath();
    ctx.arc(x * w, y * h, Math.max(1, (s.width * w) / 2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(s.points[0][0] * w, s.points[0][1] * h);
  for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0] * w, s.points[i][1] * h);
  ctx.stroke();
}

/**
 * Area de desenho compartilhada pela TV e pelos celulares. Os tracos sao guardados com coordenadas normalizadas
 * (0 a 1), entao o mesmo desenho aparece igual em telas de tamanhos diferentes.
 */
export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  strokes,
  editable = false,
  color = '#F5F2EB',
  lineWidth = 0.008,
  onStroke,
  className = '',
  aspect = 4 / 3,
  testId = 'drawing-canvas'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<DrawStroke | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, w, h);
    strokesRef.current.forEach((s) => paintStroke(ctx, s, w, h));
    if (liveRef.current) paintStroke(ctx, liveRef.current, w, h);
  }, []);

  // Ajusta a resolucao interna ao tamanho exibido
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      redraw();
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(canvas);
    return () => ro?.disconnect();
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  const norm = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width))),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / Math.max(1, rect.height)))
    ];
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editable) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    liveRef.current = { points: [norm(e)], color, width: lineWidth };
    redraw();
  };
  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const live = liveRef.current;
    if (!editable || !live) return;
    const p = norm(e);
    const last = live.points[live.points.length - 1];
    // descarta pontos muito proximos: o desenho fica leve para sincronizar
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.003) return;
    live.points.push(p);
    redraw();
  };
  const finish = () => {
    const live = liveRef.current;
    liveRef.current = null;
    if (live && live.points.length > 0) onStroke?.(live);
    redraw();
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid={testId}
      style={{ aspectRatio: String(aspect), touchAction: 'none' }}
      className={`w-full block border border-white/15 ${editable ? 'cursor-crosshair' : ''} ${className}`}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    />
  );
};
