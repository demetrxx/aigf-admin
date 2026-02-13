import type { CSSProperties, HTMLAttributes } from 'react'
import s from './Grid.module.scss'

type GridProps = {
  columns?: number
  gap?: number | string
} & HTMLAttributes<HTMLDivElement>

export function Grid({ columns = 2, gap, className, style, ...props }: GridProps) {
  const classes = [s.grid, className].filter(Boolean).join(' ')
  const inlineStyle: CSSProperties = {
    ...style,
    ['--grid-columns' as string]: columns,
    ...(gap !== undefined
      ? { ['--grid-gap' as string]: typeof gap === 'number' ? `${gap}px` : gap }
      : null),
  }

  return <div {...props} className={classes} style={inlineStyle} />
}
