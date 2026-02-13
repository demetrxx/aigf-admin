import { ChevronDownIcon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { Popover } from '../popover/Popover';
import s from './Select.module.scss';

type SelectSize = 'sm' | 'md' | 'lg';
type SelectVariant = 'default' | 'ghost';

type SelectOption = {
  label: ReactNode;
  value: string;
  disabled?: boolean;
  dividerBefore?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: SelectSize;
  variant?: SelectVariant;
  invalid?: boolean;
  fullWidth?: boolean;
  fitContent?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  triggerClassName?: string;
  itemClassName?: string;
};

const sizeClassMap: Record<SelectSize, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
};

const itemSizeClassMap: Record<SelectSize, string> = {
  sm: s.itemSizeSm,
  md: s.itemSizeMd,
  lg: s.itemSizeLg,
};

const variantClassMap: Record<SelectVariant, string | null> = {
  default: null,
  ghost: s.variantGhost,
};

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select',
  size = 'md',
  variant = 'default',
  invalid = false,
  fullWidth = false,
  fitContent = false,
  disabled = false,
  triggerClassName,
  itemClassName,
  id,
  name,
}: SelectProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const currentValue = isControlled ? value : internalValue;
  const selectedOption = useMemo(
    () => options.find((option) => option.value === currentValue),
    [options, currentValue],
  );

  const triggerClasses = [
    s.trigger,
    triggerClassName,
    sizeClassMap[size],
    variantClassMap[variant],
    invalid && s.invalid,
    disabled && s.disabled,
    fullWidth && s.fullWidth,
    fitContent && s.fitContent,
  ]
    .filter(Boolean)
    .join(' ');

  const menuClasses = [s.menu, variant === 'ghost' && s.menuGhost]
    .filter(Boolean)
    .join(' ');

  const handleSelect = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={
          <button
            id={id}
            type="button"
            className={triggerClasses}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={invalid || undefined}
            disabled={disabled}
          >
            <span className={!selectedOption ? s.placeholder : undefined}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDownIcon />
          </button>
        }
        content={
          <div className={menuClasses} role="listbox" aria-labelledby={id}>
            {options.map((option) => {
              const isActive = option.value === currentValue;
              const needDivider = Boolean(option.dividerBefore);
              return (
                <button
                  key={option.value}
                  className={[
                    s.item,
                    itemClassName,
                    itemSizeClassMap[size],
                    variant === 'ghost' && s.itemGhost,
                    needDivider && s.itemDivider,
                    isActive && s.itemActive,
                    isActive && variant === 'ghost' && s.itemGhostActive,
                    option.disabled && s.itemDisabled,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={option.disabled}
                  onClick={() => {
                    if (!option.disabled) handleSelect(option.value);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        }
      />
    </>
  );
}
