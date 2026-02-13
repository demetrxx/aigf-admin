import type { ReactNode } from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import s from './Tag.module.scss'

type TagTone = 'accent' | 'success' | 'warning' | 'danger'

type TagProps = {
  children: ReactNode
  tone?: TagTone
  onRemove?: () => void
}

const toneClassMap: Record<TagTone, string | null> = {
  accent: null,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
}

export function Tag({ children, tone = 'accent', onRemove }: TagProps) {
  return (
    <span className={[s.tag, toneClassMap[tone]].filter(Boolean).join(' ')}>
      {children}
      {onRemove ? (
        <button className={s.remove} type="button" onClick={onRemove} aria-label="Remove">
          <Cross2Icon />
        </button>
      ) : null}
    </span>
  )
}
