import type { ReactNode } from 'react'
import s from './Badge.module.scss'

type BadgeTone = 'accent' | 'success' | 'warning' | 'danger'

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  outline?: boolean
}

const toneClassMap: Record<BadgeTone, string | null> = {
  accent: null,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
}

export function Badge({ children, tone = 'accent', outline = false }: BadgeProps) {
  return (
    <span
      className={[
        s.badge,
        toneClassMap[tone],
        outline && s.outline,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
