import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCharacterImageDetails } from '@/app/character-images';
import {
  Alert,
  Badge,
  Button,
  Container,
  Field,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import { AppShell } from '@/components/templates';

import s from './CharacterImageDetailsPage.module.scss';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return dateTimeFormatter.format(parsed);
}

function formatStage(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function CharacterImageDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const imageId = id ?? '';
  const { data, error, isLoading, refetch } = useCharacterImageDetails(imageId);

  const flags = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: data.isPregenerated ? 'Pregenerated' : 'Generated',
        tone: data.isPregenerated ? 'accent' : 'warning',
        outline: !data.isPregenerated,
      },
      {
        label: data.isPromotional ? 'Promotional' : 'Regular',
        tone: data.isPromotional ? 'warning' : 'accent',
        outline: !data.isPromotional,
      },
    ];
  }, [data]);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Image details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/character-images')}
          >
            Back to images
          </Button>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load image"
              description={
                error instanceof Error ? error.message : 'Please try again.'
              }
              tone="warning"
            />
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {isLoading && !data ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <Skeleton width={240} height={16} />
              <div className={s.previewFrame}>
                <Skeleton width="100%" height="100%" />
              </div>
              <Skeleton width={200} height={16} />
              <div className={s.previewFrame}>
                <Skeleton width="100%" height="100%" />
              </div>
            </div>
            <div className={s.detailsColumn}>
              <Skeleton width={220} height={16} />
              <Skeleton width={320} height={20} />
              <Skeleton width={180} height={16} />
              <Skeleton width={160} height={16} />
            </div>
          </div>
        ) : data ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <Typography variant="meta" tone="muted">
                Image
              </Typography>
              <div className={s.previewFrame}>
                {data.file?.url ? (
                  <img
                    className={s.preview}
                    src={data.file.url}
                    alt={data.file.name}
                  />
                ) : (
                  <Typography variant="caption" tone="muted">
                    No image available.
                  </Typography>
                )}
              </div>
              {data.blurredFile?.url ? (
                <>
                  <Typography variant="meta" tone="muted">
                    Blurred
                  </Typography>
                  <div className={s.previewFrame}>
                    <img
                      className={s.preview}
                      src={data.blurredFile.url}
                      alt={data.blurredFile.name}
                    />
                  </div>
                </>
              ) : null}
            </div>
            <div className={s.detailsColumn}>
              <Field label="Description">
                <Typography variant="body">
                  {data.description || '-'}
                </Typography>
              </Field>
              <Field label="Character">
                <Typography variant="body">{data.character?.name}</Typography>
                <Typography variant="caption" tone="muted">
                  {data.character?.id}
                </Typography>
              </Field>
              <Field label="Scenario">
                <Typography variant="body">{data.scenario?.name || '-'}</Typography>
                <Typography variant="caption" tone="muted">
                  {data.scenario?.id || '-'}
                </Typography>
              </Field>
              <Field label="Stage">
                <Typography variant="body">{formatStage(data.stage)}</Typography>
              </Field>
              <Field label="Flags">
                <div className={s.badges}>
                  {flags.map((flag) => (
                    <Badge
                      key={flag.label}
                      tone={flag.tone as any}
                      outline={flag.outline}
                    >
                      {flag.label}
                    </Badge>
                  ))}
                </div>
              </Field>
              <Field label="Updated">
                <Typography variant="body">
                  {formatDate(data.updatedAt)}
                </Typography>
              </Field>
              <Field label="Created">
                <Typography variant="body">
                  {formatDate(data.createdAt)}
                </Typography>
              </Field>
            </div>
          </div>
        ) : null}
      </Container>
    </AppShell>
  );
}
