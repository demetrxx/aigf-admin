import type { ReactNode } from 'react'
import s from './EmptyState.module.scss'

type EmptyStateProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={[s.empty, className].filter(Boolean).join(' ')}>
      <div className={s.title}>{title}</div>
      {description ? <div className={s.description}>{description}</div> : null}
      {action ? <div className={s.actions}>{action}</div> : null}
    </div>
  )
}
