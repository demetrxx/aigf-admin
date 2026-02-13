import { Cross2Icon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/common/utils';

import { Typography } from '../typography/Typography';
import s from './Modal.module.scss';

type ModalProps = {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Modal({
  open,
  title,
  children,
  actions,
  onClose,
  className,
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const closeDelay = 220;

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setIsClosing(false);
      return undefined;
    }
    if (!isMounted) return undefined;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, closeDelay);
    return () => window.clearTimeout(timer);
  }, [open, isMounted]);

  useEffect(() => {
    if (!isMounted) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMounted, onClose]);

  if (!isMounted) return null;

  const overlayClassName = [
    s.overlay,
    open && !isClosing ? s.overlayOpen : s.overlayClose,
  ]
    .filter(Boolean)
    .join(' ');
  const modalClassName = cn(s.modal, [className], {
    [s.modalOpen]: open && !isClosing,
    [s.modalClose]: !open || isClosing,
  });

  return createPortal(
    <div
      className={overlayClassName}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={modalClassName}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={s.header}>
          {title ? <Typography variant="h3">{title}</Typography> : null}
          <button
            className={s.close}
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <Cross2Icon />
          </button>
        </div>
        <div>{children}</div>
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
