import type {
  ComponentPropsWithoutRef,
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useRef } from 'react';

import s from './Input.module.scss';

type InputSize = 'sm' | 'md' | 'lg';

type InputProps = {
  size?: InputSize;
  invalid?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  wrapperClassName?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'size'>;

const pickerInputTypes = new Set([
  'date',
  'month',
  'time',
  'week',
  'datetime-local',
]);

const sizeClassMap: Record<InputSize, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
};

export function Input({
  size = 'md',
  invalid = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  wrapperClassName,
  className,
  disabled,
  autoComplete = 'off',
  type = 'text',
  onPointerDown,
  onFocus,
  ...props
}: InputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPickerType = pickerInputTypes.has(type);
  const wrapperClasses = [
    s.wrapper,
    sizeClassMap[size],
    invalid && s.invalid,
    disabled && s.disabled,
    fullWidth && s.fullWidth,
    wrapperClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const handleWrapperPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    if (isPickerType) {
      event.preventDefault();
      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker();
        } catch {
          // Ignore browsers that block picker calls.
        }
      }
      return;
    }
    if (document.activeElement !== input) {
      input.focus();
    }
  };

  const handleInputPointerDown = (
    event: ReactPointerEvent<HTMLInputElement>,
  ) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || !isPickerType || disabled) return;
    event.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Ignore browsers that block picker calls.
      }
    }
  };

  const handleInputFocus = () => {
    if (!isPickerType) return;
    const input = inputRef.current;
    if (!input) return;
    try {
      input.setSelectionRange(0, 0);
    } catch {
      // Some input types don't support selection ranges.
    }
  };

  return (
    <div className={wrapperClasses} onPointerDown={handleWrapperPointerDown}>
      {iconLeft ? <span className={s.icon}>{iconLeft}</span> : null}
      <input
        {...props}
        type={type}
        autoComplete={autoComplete}
        className={[s.input, className].filter(Boolean).join(' ')}
        disabled={disabled}
        ref={inputRef}
        aria-invalid={invalid || undefined}
        onPointerDown={handleInputPointerDown}
        onFocus={(event) => {
          onFocus?.(event);
          handleInputFocus();
        }}
      />
      {iconRight ? <span className={s.icon}>{iconRight}</span> : null}
    </div>
  );
}
