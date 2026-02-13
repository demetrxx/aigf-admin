import type { ReactNode } from 'react'
import s from './Breadcrumbs.module.scss'

type BreadcrumbItem = {
  label: ReactNode
  href?: string
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
  separator?: ReactNode
}

export function Breadcrumbs({ items, separator = '/' }: BreadcrumbsProps) {
  return (
    <nav className={s.breadcrumbs} aria-label="Breadcrumbs">
      {items.map((item, index) => (
        <span key={index}>
          {item.href ? (
            <a className={s.link} href={item.href}>
              {item.label}
            </a>
          ) : (
            item.label
          )}
          {index < items.length - 1 ? (
            <span className={s.separator}>{separator}</span>
          ) : null}
        </span>
      ))}
    </nav>
  )
}
