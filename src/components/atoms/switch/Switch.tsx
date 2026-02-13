import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import s from './Switch.module.scss'

type SwitchProps = {
  label?: ReactNode
} & ComponentPropsWithoutRef<'input'>

export function Switch({ label, className, disabled, ...props }: SwitchProps) {
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
        type="checkbox"
        role="switch"
        disabled={disabled}
      />
      {label}
    </label>
  )
}
