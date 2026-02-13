import type { ComponentPropsWithoutRef } from 'react'
import s from './Textarea.module.scss'

type TextareaSize = 'sm' | 'md' | 'lg'

type TextareaProps = {
  size?: TextareaSize
  invalid?: boolean
  fullWidth?: boolean
} & ComponentPropsWithoutRef<'textarea'>

const sizeClassMap: Record<TextareaSize, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
}

export function Textarea({
  size = 'md',
  invalid = false,
  fullWidth = false,
  className,
  disabled,
  autoComplete = 'off',
  ...props
}: TextareaProps) {
  const wrapperClasses = [
    s.wrapper,
    sizeClassMap[size],
    invalid && s.invalid,
    disabled && s.disabled,
    fullWidth && s.fullWidth,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClasses}>
      <textarea
        {...props}
        autoComplete={autoComplete}
        className={[s.textarea, className].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-invalid={invalid || undefined}
      />
    </div>
  )
}
