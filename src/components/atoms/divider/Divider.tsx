import type { HTMLAttributes } from 'react'
import s from './Divider.module.scss'

type DividerProps = {
  orientation?: 'horizontal' | 'vertical'
} & HTMLAttributes<HTMLHRElement>

export function Divider({ orientation = 'horizontal', className, ...props }: DividerProps) {
  const classes = [
    s.divider,
    orientation === 'vertical' && s.vertical,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <hr
      {...props}
      className={classes}
      role="separator"
      aria-orientation={orientation}
    />
  )
}
