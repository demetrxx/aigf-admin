import type { ComponentPropsWithoutRef } from 'react'
import s from './Checkbox.module.scss'

type CheckboxProps = {
  label?: string
} & ComponentPropsWithoutRef<'input'>

export function Checkbox({ label, className, disabled, ...props }: CheckboxProps) {
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
        disabled={disabled}
      />
      {label}
    </label>
  )
}
