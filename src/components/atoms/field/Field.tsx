import type { ReactNode } from 'react';

import { Typography } from '../typography/Typography';
import s from './Field.module.scss';

type FieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  labelFor?: string;
  layout?: 'stack' | 'inline';
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  hint,
  error,
  required,
  labelFor,
  layout = 'stack',
  className,
  children,
}: FieldProps) {
  return (
    <div
      className={[s.field, layout === 'inline' && s.inline, className]
        .filter(Boolean)
        .join(' ')}
    >
      {label ? (
        <div className={s.labelRow}>
          <Typography
            as="label"
            className={s.label}
            variant="meta"
            htmlFor={labelFor}
          >
            {label}
          </Typography>
          {required ? <span className={s.required}>Required</span> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <Typography className={s.error} variant="caption">
          {error}
        </Typography>
      ) : hint ? (
        <Typography className={s.hint} variant="caption">
          {hint}
        </Typography>
      ) : null}
    </div>
  );
}
