import type { ReactNode } from 'react';

import { Radio } from './Radio';
import s from './RadioGroup.module.scss';

type RadioGroupOption = {
  label: ReactNode;
  value: string;
};

type RadioGroupProps = {
  name: string;
  value: string;
  options: RadioGroupOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function RadioGroup({
  name,
  value,
  options,
  onChange,
  disabled = false,
}: RadioGroupProps) {
  return (
    <div className={s.group} role="radiogroup">
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={option.value === value}
          onChange={() => onChange(option.value)}
          disabled={disabled}
          label={option.label}
        />
      ))}
    </div>
  );
}
