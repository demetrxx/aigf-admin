import type { ReactNode } from 'react';

import { Button, Modal, Typography } from '@/atoms';
import { cn } from '@/common/utils';

import s from './ConfirmModal.module.scss';

type ConfirmModalProps = {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  className?: string;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isConfirming = false,
  onConfirm,
  onClose,
  className,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      actions={
        <div className={s.actions}>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="md"
            tone={tone === 'danger' ? 'danger' : 'accent'}
            onClick={onConfirm}
            loading={isConfirming}
            disabled={isConfirming}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {description ? (
        <Typography className={cn(s.description, [className])} variant="body">
          {description}
        </Typography>
      ) : null}
    </Modal>
  );
}
