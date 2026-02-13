import type { ElementType, ReactNode } from 'react';

import { Button, type ButtonProps } from '../button/Button';
import s from '../button/Button.module.scss';
import { Tooltip } from '../tooltip/Tooltip';

type IconButtonProps<T extends ElementType> = Omit<
  ButtonProps<T>,
  'iconLeft' | 'iconRight' | 'children'
> & {
  icon: ReactNode;
  'aria-label': string;
  tooltip?: ReactNode;
};

export function IconButton<T extends ElementType = 'button'>({
  icon,
  className,
  tooltip,
  ...props
}: IconButtonProps<T>) {
  const content = (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    <Button
      {...props}
      className={[s.iconOnly, className].filter(Boolean).join(' ')}
      iconLeft={icon}
    />
  );

  return <Tooltip content={tooltip}>{content}</Tooltip>;
}
