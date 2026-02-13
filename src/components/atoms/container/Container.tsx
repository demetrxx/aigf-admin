import type { HTMLAttributes } from 'react';

import s from './Container.module.scss';

type ContainerSize = 'default' | 'wide' | 'narrow';

type ContainerProps = {
  size?: ContainerSize;
} & HTMLAttributes<HTMLDivElement>;

const sizeClassMap: Record<ContainerSize, string | null> = {
  default: null,
  wide: s.wide,
  narrow: s.narrow,
};

export function Container({
  size = 'default',
  className,
  ...props
}: ContainerProps) {
  const classes = [s.container, sizeClassMap[size], className]
    .filter(Boolean)
    .join(' ');
  return <div {...props} className={classes} />;
}
