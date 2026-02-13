import type { HTMLAttributes } from 'react';

import s from './FormRow.module.scss';

type FormRowProps = {
  columns?: 1 | 2 | 3;
} & HTMLAttributes<HTMLDivElement>;

export function FormRow({
  columns = 2,
  className,
  style,
  ...props
}: FormRowProps) {
  return (
    <div
      {...props}
      className={[s.row, className].filter(Boolean).join(' ')}
      style={{ ...style, ['--columns' as string]: columns }}
    />
  );
}
