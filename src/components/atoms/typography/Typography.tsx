import type { ComponentProps, ElementType } from 'react';

import s from './Typography.module.scss';

type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'meta'
  | 'caption'
  | 'control'
  | 'prose'
  | 'proseCompact';

type TypographyTone =
  | 'default'
  | 'muted'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

type TypographyAlign = 'left' | 'center' | 'right';

type TypographyProps<T extends ElementType> = {
  as?: T;
  variant?: TypographyVariant;
  tone?: TypographyTone;
  align?: TypographyAlign;
  truncate?: boolean;
  readingWidth?: boolean;
} & Omit<ComponentProps<T>, 'as' | 'color'>;

const variantClassMap: Record<TypographyVariant, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'body',
  meta: 'meta',
  caption: 'caption',
  control: 'control',
  prose: 'prose',
  proseCompact: 'proseCompact',
};

const defaultTagMap: Record<TypographyVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  meta: 'p',
  caption: 'p',
  control: 'span',
  prose: 'p',
  proseCompact: 'p',
};

const toneClassMap: Record<TypographyTone, string | null> = {
  default: null,
  muted: s.toneMuted,
  accent: s.toneAccent,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
};

const alignClassMap: Record<TypographyAlign, string> = {
  left: s.alignLeft,
  center: s.alignCenter,
  right: s.alignRight,
};

export function Typography<T extends ElementType = 'p'>({
  as,
  variant = 'body',
  tone = 'default',
  align = 'left',
  truncate = false,
  readingWidth = false,
  className,
  ...props
}: TypographyProps<T>) {
  const Component = (as || defaultTagMap[variant]) as ElementType;
  const classes = [
    s.root,
    variantClassMap[variant],
    toneClassMap[tone],
    alignClassMap[align],
    truncate && s.truncate,
    readingWidth && s.readingWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Component className={classes} {...props} />;
}
