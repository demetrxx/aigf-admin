import type { ReactNode } from 'react'
import s from './Alert.module.scss'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

type AlertProps = {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  tone?: AlertTone
}

const toneClassMap: Record<AlertTone, string | null> = {
  info: null,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
}

export function Alert({ title, description, icon, tone = 'info' }: AlertProps) {
  return (
    <div className={[s.alert, toneClassMap[tone]].filter(Boolean).join(' ')}>
      {icon ? <span className={s.icon}>{icon}</span> : null}
      <div className={s.content}>
        {title ? <div className={s.title}>{title}</div> : null}
        {description ? <div>{description}</div> : null}
      </div>
    </div>
  )
}
