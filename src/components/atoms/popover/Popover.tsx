import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cn } from '@/common/utils';

import s from './Popover.module.scss';

type PopoverProps = {
  trigger: ReactNode;
  content: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  disableTriggerToggle?: boolean;
};

export function Popover({
  trigger,
  content,
  open,
  onOpenChange,
  placement = 'bottom',
  disableTriggerToggle = false,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        if (isControlled) {
          onOpenChange?.(false);
        } else {
          setInternalOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isControlled, onOpenChange]);

  const toggle = () => {
    const next = !isOpen;
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const triggerNode = isValidElement(trigger) ? (
    cloneElement(trigger as any, {
      onClick: (event: ReactMouseEvent) => {
        const original = (trigger.props as any)?.onClick;
        if (typeof original === 'function') original(event);
        if (!disableTriggerToggle) toggle();
      },
    })
  ) : (
    <button type="button" onClick={disableTriggerToggle ? undefined : toggle}>
      {trigger}
    </button>
  );

  return (
    <div className={s.wrapper} ref={wrapperRef}>
      {triggerNode}
      {isOpen ? (
        <div className={cn(s.panel, [s[placement]])}>{content}</div>
      ) : null}
    </div>
  );
}
