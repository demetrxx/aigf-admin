import { TrashIcon } from '@/assets/icons';
import { Badge, IconButton, Skeleton, Typography } from '@/atoms';
import type { ICharacterDetails } from '@/common/types';

import s from '../CharacterDetailsPage.module.scss';

type CharacterHeaderProps = {
  data: ICharacterDetails | undefined;
  isLoading: boolean;
  onDelete: () => void;
  canDelete: boolean;
  isDeleting: boolean;
};

export function CharacterHeader({
  data,
  isLoading,
  onDelete,
  canDelete,
  isDeleting,
}: CharacterHeaderProps) {
  return (
    <div className={s.header}>
      <div className={s.titleBlock}>
        {isLoading && !data ? (
          <Skeleton width={260} height={24} />
        ) : (
          <div className={s.titleRow}>
            <Typography variant="h2">
              {data?.emoji ? (
                <span className={s.emoji}>{data.emoji}</span>
              ) : null}
              {data?.name ?? 'Character'}
            </Typography>
            {data ? (
              <Badge tone={data.isActive ? 'success' : 'warning'}>
                {data.isActive ? 'Active' : 'Inactive'}
              </Badge>
            ) : null}
          </div>
        )}
        {isLoading && !data ? (
          <Skeleton width={320} height={12} />
        ) : (
          <Typography variant="meta" tone="muted">
            {data?.id ?? '-'}
          </Typography>
        )}
      </div>
      <div className={s.actions}>
        <IconButton
          aria-label="Delete character"
          icon={<TrashIcon />}
          tooltip="Delete character"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={!canDelete || isDeleting}
        />
      </div>
    </div>
  );
}
