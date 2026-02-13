import { useEffect, useMemo, useState } from 'react';

import { Input, Popover, Typography } from '@/atoms';
import { cn } from '@/common/utils';

import s from './SearchSelect.module.scss';

type SearchSelectOption = {
  id: string;
  label: string;
  meta?: string;
};

type SearchSelectProps = {
  id?: string;
  value: string;
  options: SearchSelectOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
};

export function SearchSelect({
  id,
  value,
  options,
  search,
  onSearchChange,
  onSelect,
  placeholder = 'Select',
  disabled = false,
  loading = false,
  invalid = false,
  emptyLabel = 'No results found.',
  loadingLabel = 'Loading...',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (selected) {
      setSelectedLabel(selected.label);
    }
  }, [selected]);

  useEffect(() => {
    if (!open) {
      onSearchChange('');
    }
  }, [open, onSearchChange]);

  const inputValue = open ? search : selectedLabel || selected?.label || '';

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      disableTriggerToggle
      content={
        <div className={s.menu}>
          {loading ? (
            <Typography variant="caption" tone="muted">
              {loadingLabel}
            </Typography>
          ) : options.length === 0 ? (
            <Typography variant="caption" tone="muted">
              {emptyLabel}
            </Typography>
          ) : (
            <div className={s.menuList}>
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(s.optionButton, [], {
                    [s.optionActive]: option.id === value,
                  })}
                  onClick={() => {
                    setSelectedLabel(option.label);
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <span className={s.optionLabel}>{option.label}</span>
                  {option.meta ? (
                    <span className={s.optionMeta}>{option.meta}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      }
      trigger={
        <div className={s.trigger}>
          <Input
            id={id}
            size="sm"
            value={inputValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            fullWidth
            disabled={disabled}
            invalid={invalid}
          />
        </div>
      }
    />
  );
}
