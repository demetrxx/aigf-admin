import { useEffect, useMemo, useState } from 'react';

import { Input, Popover, Typography } from '@/atoms';
import { cn } from '@/common/utils';

import s from '../CharacterDetailsPage.module.scss';

type LoraOption = {
  id: string;
  fileName: string;
};

type LoraSelectProps = {
  id?: string;
  value: string;
  options: LoraOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
};

export function LoraSelect({
  id,
  value,
  options,
  search,
  onSearchChange,
  onSelect,
  placeholder = 'Select LoRA',
  disabled = false,
  loading = false,
}: LoraSelectProps) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (selected) {
      setSelectedLabel(selected.fileName);
    }
  }, [selected]);

  useEffect(() => {
    if (!open) {
      onSearchChange('');
    }
  }, [open, onSearchChange]);

  const inputValue = open ? search : selectedLabel || selected?.fileName || '';

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      disableTriggerToggle
      content={
        <div className={s.loraMenu}>
          {loading ? (
            <Typography variant="caption" tone="muted">
              Loading LoRAs...
            </Typography>
          ) : options.length === 0 ? (
            <Typography variant="caption" tone="muted">
              No LoRAs found.
            </Typography>
          ) : (
            <div className={s.loraMenuList}>
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(s.loraOptionButton, [], {
                    [s.loraOptionActive]: option.id === value,
                  })}
                  onClick={() => {
                    setSelectedLabel(option.fileName);
                    onSelect(option.id);
                    setOpen(false);
                  }}
                >
                  <span className={s.loraOptionName}>{option.fileName}</span>
                  <span className={s.loraOptionMeta}>{option.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      }
      trigger={
        <div className={s.loraTrigger}>
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
          />
        </div>
      }
    />
  );
}
