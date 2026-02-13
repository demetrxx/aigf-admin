import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

import s from './Button.module.scss';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonTone = 'accent' | 'success' | 'warning' | 'danger';

export type ButtonProps<T extends ElementType> = {
  as?: T;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

const variantClassMap: Record<ButtonVariant, string> = {
  primary: s.variantPrimary,
  secondary: s.variantSecondary,
  ghost: s.variantGhost,
  outline: s.variantOutline,
  text: s.variantText,
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: s.sizeSm,
  md: s.sizeMd,
  lg: s.sizeLg,
};

const toneClassMap: Record<ButtonTone, string> = {
  accent: s.toneAccent,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
};

export function Button<T extends ElementType = 'button'>({
  as,
  variant = 'primary',
  size = 'md',
  tone = 'accent',
  fullWidth = false,
  loading = false,
  iconLeft,
  iconRight,
  className,
  disabled,
  children,
  ...props
}: ButtonProps<T>) {
  const Component = as || 'button';
  const isButton = Component === 'button';
  const isDisabled = Boolean(disabled || loading);
  const isIconOnly = !children && iconLeft && !iconRight;
  const classes = [
    s.button,
    variantClassMap[variant],
    sizeClassMap[size],
    toneClassMap[tone],
    fullWidth && s.fullWidth,
    loading && s.loading,
    isDisabled && !isButton && s.disabled,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const sharedProps = {
    className: classes,
    'aria-busy': loading || undefined,
  };

  if (isButton) {
    const buttonProps = props as ComponentPropsWithoutRef<'button'>;
    return (
      <button
        type={buttonProps.type ?? 'button'}
        disabled={isDisabled}
        {...buttonProps}
        {...sharedProps}
      >
        <span className={s.content}>
          {loading ? <span className={s.loader} aria-hidden="true" /> : null}
          {iconLeft && !(loading && isIconOnly) ? (
            <span className={s.icon}>{iconLeft}</span>
          ) : null}
          {children ? <span className={s.label}>{children}</span> : null}
          {iconRight && !(loading && isIconOnly) ? (
            <span className={s.icon}>{iconRight}</span>
          ) : null}
        </span>
      </button>
    );
  }

  const elementProps = props as ComponentPropsWithoutRef<T>;

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    <Component
      {...elementProps}
      {...sharedProps}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : elementProps.tabIndex}
      role={(elementProps as { role?: string }).role ?? 'button'}
    >
      <span className={s.content}>
        {loading ? <span className={s.loader} aria-hidden="true" /> : null}
        {iconLeft && !(loading && isIconOnly) ? (
          <span className={s.icon}>{iconLeft}</span>
        ) : null}
        {children ? <span className={s.label}>{children}</span> : null}
        {iconRight && !(loading && isIconOnly) ? (
          <span className={s.icon}>{iconRight}</span>
        ) : null}
      </span>
    </Component>
  );
}
