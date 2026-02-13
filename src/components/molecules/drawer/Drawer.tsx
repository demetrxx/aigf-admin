import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import type { ReactNode } from 'react';

import { IconButton, Typography } from '@/atoms';
import { cn } from '@/common/utils';

import s from './Drawer.module.scss';

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
};

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  ariaLabel,
  className,
  children,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          className={cn(s.content, [className])}
          aria-label={ariaLabel}
        >
          <div className={s.header}>
            {title ? (
              <Dialog.Title asChild>
                <Typography variant="h2">{title}</Typography>
              </Dialog.Title>
            ) : null}
            <Dialog.Close asChild>
              <IconButton
                icon={<Cross2Icon />}
                aria-label="Close"
                variant="text"
                size="md"
                className={s.close}
              />
            </Dialog.Close>
          </div>

          {description ? (
            <Dialog.Description className={s.description} asChild>
              <Typography variant="body" tone="muted">
                {description}
              </Typography>
            </Dialog.Description>
          ) : null}
          <div className={s.body}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
