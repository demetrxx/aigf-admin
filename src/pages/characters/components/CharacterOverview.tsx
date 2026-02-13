import { PencilLineIcon } from '@/assets/icons';
import { Avatar, Badge, Field, FormRow, IconButton, Typography } from '@/atoms';
import type { ICharacterDetails } from '@/common/types';

import s from '../CharacterDetailsPage.module.scss';

type CharacterOverviewProps = {
  data: ICharacterDetails | undefined;
  formatDate: (value: string | null | undefined) => string;
  formatValue: (value: string | null | undefined) => string;
  loraLabel: string;
  onEdit: () => void;
  canEdit: boolean;
};

export function CharacterOverview({
  data,
  formatDate,
  formatValue,
  loraLabel,
  onEdit,
  canEdit,
}: CharacterOverviewProps) {
  const description = data?.description?.trim() ?? '';
  const avatarName = data?.name ?? 'Character';
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <Typography variant="h3">Overview</Typography>
        <span className={s.sectionEdit}>
          <IconButton
            aria-label="Edit overview"
            icon={<PencilLineIcon />}
            tooltip="Edit"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={!canEdit}
          />
        </span>
      </div>
      <FormRow columns={3}>
        <Field label="Name" labelFor="character-name">
          <Typography id="character-name" variant="body">
            {data?.name ?? '-'}
          </Typography>
        </Field>
        <Field label="Emoji" labelFor="character-emoji">
          <Typography id="character-emoji" variant="body">
            {data?.emoji || '-'}
          </Typography>
        </Field>

        <Field
          className={s.statusField}
          label="Status"
          labelFor="character-status"
        >
          {data ? (
            <Badge tone={data.isActive ? 'success' : 'warning'}>
              {data.isActive ? 'Active' : 'Inactive'}
            </Badge>
          ) : (
            <Typography id="character-status" variant="body">
              -
            </Typography>
          )}
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field label="LoRA" labelFor="character-lora">
          <Typography id="character-lora" variant="body">
            {loraLabel}
          </Typography>
        </Field>

        <Field label="Gender" labelFor="character-gender">
          <Typography id="character-gender" variant="body">
            {formatValue(data?.gender)}
          </Typography>
        </Field>

        <Field label="Updated at" labelFor="character-updated">
          <Typography id="character-updated" variant="body">
            {formatDate(data?.updatedAt)}
          </Typography>
        </Field>
      </FormRow>

      <FormRow columns={3}>
        <Field labelFor="character-avatar">
          {data ? (
            <div id="character-avatar" className={s.avatarRow}>
              <Avatar
                size="xl"
                src={data?.avatar?.url ?? undefined}
                fallback={avatarName}
              />
            </div>
          ) : (
            <Typography id="character-avatar" variant="body">
              -
            </Typography>
          )}
        </Field>
        <Field label="Description" labelFor="character-description">
          <Typography
            id="character-description"
            variant="body"
            className={s.multiline}
          >
            {description || '-'}
          </Typography>
        </Field>
      </FormRow>
    </div>
  );
}
