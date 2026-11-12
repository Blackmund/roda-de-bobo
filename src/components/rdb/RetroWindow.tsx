import React from 'react';
import { motion } from 'motion/react';
import { X } from './rdbIcons';

/**
 * ART-06: moldura "Retro OS" reutilizavel: barra de titulo com os 3 botoes (minimizar, maximizar, fechar),
 * borda crimson (ou ciano, `tone`), sombra dura e rolagem lateral estilizada no corpo.
 * Usada nos modais; a janela principal do app (WindowWrapper) segue o mesmo desenho.
 */
export interface RetroWindowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Icone ao lado do titulo. */
  icon?: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  tone?: 'crimson' | 'cyan';
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Anima a entrada/saida (dentro de AnimatePresence). */
  animated?: boolean;
  'data-testid'?: string;
  titleId?: string;
  closeTestId?: string;
}

export const RetroWindow: React.FC<RetroWindowProps> = ({
  title,
  subtitle,
  icon,
  onClose,
  onMinimize,
  onMaximize,
  tone = 'crimson',
  children,
  className = '',
  bodyClassName = '',
  animated = true,
  titleId,
  closeTestId,
  ...rest
}) => {
  const border = tone === 'crimson' ? 'border-[#E6194B]' : 'border-[#17B8B8]';
  const bar = tone === 'crimson' ? 'bg-[#E6194B]' : 'bg-[#17B8B8]';
  const btn =
    'w-7 h-7 flex items-center justify-center border-2 border-[#120A16] bg-[#F5F2EB] text-[#120A16] hover:bg-white disabled:opacity-40';

  const Frame: any = animated ? motion.div : 'div';
  const motionProps = animated
    ? {
        initial: { opacity: 0, scale: 0.96, y: 14 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 14 },
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
      }
    : {};

  return (
    <Frame
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid={rest['data-testid']}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className={`rb-retro-window relative flex flex-col bg-[#07080d] border-4 ${border} shadow-[6px_6px_0_#120A16] ${className}`}
      {...motionProps}
    >
      <div className={`flex items-center justify-between gap-3 px-2.5 py-1.5 ${bar} border-b-4 border-[#120A16] shrink-0`}>
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="w-7 h-7 flex items-center justify-center bg-[#120A16] text-[#F5F2EB] shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h2 id={titleId} className="font-anton text-sm sm:text-base uppercase tracking-wider leading-none text-[#120A16] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-[#120A16]/80 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" aria-label="Minimizar" onClick={onMinimize} disabled={!onMinimize} className={btn}>
            <span className="block w-3 border-b-[3px] border-[#120A16] translate-y-1" />
          </button>
          <button type="button" aria-label="Maximizar" onClick={onMaximize} disabled={!onMaximize} className={btn}>
            <span className="block w-3 h-3 border-[3px] border-[#120A16]" />
          </button>
          <button
            type="button"
            aria-label="Fechar"
            data-testid={closeTestId}
            onClick={onClose}
            disabled={!onClose}
            className={`${btn} !bg-[#120A16] !text-[#F5F2EB] hover:!bg-black`}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className={`rb-retro-scroll min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
    </Frame>
  );
};
