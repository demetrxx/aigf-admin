import { TrashIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useDeleteImgGeneration,
  useImgGenerationDetails,
} from '@/app/img-generations';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@/atoms';
import { ImgGenerationStatus } from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import s from './GenerationDetailsPage.module.scss';

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

function formatLatency(value: number | undefined) {
  if (value === undefined || value === null) return '-';
  const seconds = value / 1000;
  return `${seconds.toFixed(2)}s`;
}

function formatStage(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function GenerationDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, refetch } = useImgGenerationDetails(
    id ?? null,
  );
  const deleteMutation = useDeleteImgGeneration();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;
  const hasImage = Boolean(
    data?.status === ImgGenerationStatus.Ready && data.file?.url,
  );
  const isGenerating = data?.status === ImgGenerationStatus.Generating;
  const isFailed = data?.status === ImgGenerationStatus.Failed;
  const showLatency =
    data?.status === ImgGenerationStatus.Ready && data?.latency;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Generation</Typography>
          </div>
          <div className={s.headerActions}>
            <IconButton
              aria-label="Delete generation"
              icon={<TrashIcon />}
              tooltip="Delete generation"
              variant="ghost"
              tone="danger"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!id || deleteMutation.isPending}
            />
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load generation"
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

        {showEmpty ? (
          <EmptyState
            title="Generation not found"
            description="Check the ID."
          />
        ) : null}

        {showSkeleton ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <Skeleton height={360} />
            </div>
            <div className={s.detailsColumn}>
              <Stack gap="16px">
                <Skeleton width={160} height={12} />
                <Skeleton width={140} height={12} />
                <Skeleton width={180} height={12} />
                <Skeleton width={120} height={12} />
              </Stack>
            </div>
          </div>
        ) : null}

        {data ? (
          <div className={s.content}>
            <div className={s.mediaColumn}>
              <div className={s.previewFrame}>
                {hasImage ? (
                  <img
                    className={s.preview}
                    src={data.file?.url ?? ''}
                    alt="Generated image"
                  />
                ) : isGenerating ? (
                  <Skeleton height="100%" />
                ) : isFailed ? (
                  <EmptyState
                    title="Generation failed"
                    description="No image was produced."
                  />
                ) : (
                  <EmptyState
                    title="No image yet"
                    description="Image pending."
                  />
                )}
              </div>
              <Stack gap="12px">
                <div>
                  <Typography variant="meta" tone="muted">
                    Request
                  </Typography>
                  <Typography variant="body">{data.userRequest}</Typography>
                </div>
                {data.prompt ? (
                  <div>
                    <Typography variant="meta" tone="muted">
                      Prompt
                    </Typography>
                    <Typography variant="body">{data.prompt}</Typography>
                  </div>
                ) : null}
              </Stack>
            </div>
            <div className={s.detailsColumn}>
              <Stack gap="16px">
                <div>
                  <Typography variant="meta" tone="muted">
                    Character
                  </Typography>
                  <Typography variant="body">{data.character.name}</Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Scenario
                  </Typography>
                  <Typography variant="body">{data.scenario.name}</Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Stage
                  </Typography>
                  <Typography variant="body">{formatStage(data.stage)}</Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    LoRA
                  </Typography>
                  <Typography variant="body">{data.lora.fileName}</Typography>
                  <Typography variant="caption" tone="muted">
                    {data.lora.id}
                  </Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Seed
                  </Typography>
                  <Typography variant="body">{data.seed}</Typography>
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Status
                  </Typography>
                  {data.status === ImgGenerationStatus.Ready ? (
                    <Badge tone="success">Ready</Badge>
                  ) : data.status === ImgGenerationStatus.Failed ? (
                    <Badge tone="danger">Failed</Badge>
                  ) : (
                    <Badge tone="warning" outline>
                      Generating
                    </Badge>
                  )}
                </div>
                <div>
                  <Typography variant="meta" tone="muted">
                    Created
                  </Typography>
                  <Typography variant="body">
                    {formatDate(data.createdAt)}
                  </Typography>
                </div>
                {showLatency ? (
                  <div>
                    <Typography variant="meta" tone="muted">
                      Latency
                    </Typography>
                    <div className={s.latencyGrid}>
                      <Typography variant="caption" tone="muted">
                        Prompt generation
                      </Typography>
                      <Typography variant="body">
                        {formatLatency(data.latency?.promptGeneration)}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        Image generation
                      </Typography>
                      <Typography variant="body">
                        {formatLatency(data.latency?.imageGeneration)}
                      </Typography>
                      <Typography variant="caption" tone="muted">
                        Image upload
                      </Typography>
                      <Typography variant="body">
                        {formatLatency(data.latency?.imageUpload)}
                      </Typography>
                    </div>
                  </div>
                ) : null}
                <div>
                  <Typography variant="meta" tone="muted">
                    Requested by
                  </Typography>
                  <Typography variant="body">
                    {data.madeBy?.firstName} {data.madeBy?.lastName}
                  </Typography>
                  <Typography variant="caption" tone="muted">
                    {data.madeBy?.email}
                  </Typography>
                </div>
              </Stack>
            </div>
          </div>
        ) : null}
      </Container>

      <ConfirmModal
        open={isDeleteOpen}
        title="Delete generation"
        description="Delete this generation? This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={async () => {
          if (!id) return;
          await deleteMutation.mutateAsync(id);
          setIsDeleteOpen(false);
          navigate('/generations');
        }}
        onClose={() => setIsDeleteOpen(false)}
      />
    </AppShell>
  );
}
