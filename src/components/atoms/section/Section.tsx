import type { ReactNode } from 'react'
import { Typography } from '../typography/Typography'
import s from './Section.module.scss'

type SectionProps = {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function Section({ title, description, actions, children }: SectionProps) {
  return (
    <section className={s.section}>
      {(title || description || actions) && (
        <div className={s.header}>
          <div>
            {title ? <Typography variant="h3">{title}</Typography> : null}
            {description ? (
              <Typography className={s.description} variant="meta">
                {description}
              </Typography>
            ) : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
