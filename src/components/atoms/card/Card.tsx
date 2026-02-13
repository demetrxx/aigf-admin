import type { ComponentPropsWithoutRef, ElementType } from 'react'
import s from './Card.module.scss'

type CardPadding = 'sm' | 'md' | 'lg'
type CardVariant = 'default' | 'muted' | 'ghost'

type CardProps<T extends ElementType> = {
  as?: T
  padding?: CardPadding
  variant?: CardVariant
} & ComponentPropsWithoutRef<T>

const paddingClassMap: Record<CardPadding, string> = {
  sm: s.paddingSm,
  md: s.paddingMd,
  lg: s.paddingLg,
}

const variantClassMap: Record<CardVariant, string | null> = {
  default: null,
  muted: s.muted,
  ghost: s.ghost,
}

export function Card<T extends ElementType = 'div'>({
  as,
  padding = 'md',
  variant = 'default',
  className,
  ...props
}: CardProps<T>) {
  const Component = as || 'div'
  const classes = [
    s.card,
    paddingClassMap[padding],
    variantClassMap[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <Component {...props} className={classes} />
}
