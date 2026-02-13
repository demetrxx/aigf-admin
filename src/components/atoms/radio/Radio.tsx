import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import s from './Radio.module.scss'

type RadioProps = {
  label?: ReactNode
} & ComponentPropsWithoutRef<'input'>

export function Radio({ label, className, disabled, ...props }: RadioProps) {
  return (
    <label
      className={[
        s.label,
        disabled && s.disabled,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        {...props}
        className={s.input}
        type="radio"
        disabled={disabled}
      />
      {label}
    </label>
  )
}
