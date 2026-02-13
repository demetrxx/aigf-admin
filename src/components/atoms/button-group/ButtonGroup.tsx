import type { HTMLAttributes, ReactNode } from 'react'
import s from './ButtonGroup.module.scss'

type ButtonGroupProps = {
  children: ReactNode
  orientation?: 'horizontal' | 'vertical'
  attached?: boolean
  fullWidth?: boolean
} & HTMLAttributes<HTMLDivElement>

export function ButtonGroup({
  children,
  orientation = 'horizontal',
  attached = false,
  fullWidth = false,
  className,
  ...props
}: ButtonGroupProps) {
  const classes = [
    s.group,
    orientation === 'vertical' ? s.vertical : s.horizontal,
    attached && s.attached,
    fullWidth && s.fullWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      {...props}
      className={classes}
      role="group"
      aria-orientation={orientation}
    >
      {children}
    </div>
  )
}
