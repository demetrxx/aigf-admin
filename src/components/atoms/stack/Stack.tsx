import type { CSSProperties, HTMLAttributes } from 'react';

import { cn } from '@/common/utils';

import s from './Stack.module.scss';

type StackProps = {
  direction?: 'vertical' | 'horizontal';
  gap?: number | string;
} & HTMLAttributes<HTMLDivElement>;

export function Stack({
  direction = 'vertical',
  gap,
  className,
  style,
  ...props
}: StackProps) {
  const classes = cn(s.stack, [className], {
    [s.horizontal]: direction === 'horizontal',
  });

  const inlineStyle: CSSProperties = {
    ...style,
    ...(gap !== undefined
      ? {
          ['--stack-gap' as string]: typeof gap === 'number' ? `${gap}px` : gap,
        }
      : null),
  };

  return <div {...props} className={classes} style={inlineStyle} />;
}
