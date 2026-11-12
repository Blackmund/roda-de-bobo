import React, { useEffect, useRef, useState } from 'react';

interface ConfirmSendButtonProps {
  /** Chamado no segundo toque (confirmacao). */
  onConfirm: () => void;
  disabled?: boolean;
  label: React.ReactNode;
  /** Texto mostrado depois do primeiro toque (ex.: o valor que vai ser enviado). */
  confirmLabel: React.ReactNode;
  className?: string;
  /** Quanto tempo o botao fica "armado" esperando a confirmacao. */
  armedMs?: number;
}

/**
 * UX-11: palpite no celular em dois toques. O primeiro toque mostra o que vai ser enviado e arma o botao;
 * o segundo, em ate `armedMs`, confirma. Evita enviar sem querer um numero ou resposta digitado errado.
 */
export const ConfirmSendButton: React.FC<ConfirmSendButtonProps> = ({
  onConfirm,
  disabled,
  label,
  confirmLabel,
  className = '',
  armedMs = 4000
}) => {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disarm = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setArmed(false);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // se o campo mudou ou o botao foi desativado, volta ao estado normal
  useEffect(() => {
    if (disabled) disarm();
  }, [disabled]);

  const handleClick = () => {
    if (disabled) return;
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), armedMs);
      return;
    }
    disarm();
    onConfirm();
  };

  return (
    <button
      type="button"
      data-testid="confirm-send-button"
      data-armed={armed ? 'true' : 'false'}
      onClick={handleClick}
      disabled={disabled}
      className={`${className} ${armed ? 'ring-4 ring-amber-300 !bg-amber-300 animate-pulse' : ''}`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
};
