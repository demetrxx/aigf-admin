import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useChatDetails } from '@/app/chats';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Grid,
  Section,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { IChatMessage, ITgUser, RoleplayStage } from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './ChatDetailsPage.module.scss';

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

function formatStage(stage: RoleplayStage) {
  return stage
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatUserName(user: ITgUser) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  if (fullName) return fullName;
  const username = user.username?.trim();
  if (username) return `@${username}`;
  return 'Unknown user';
}

function formatUserMeta(user: ITgUser) {
  const username = user.username?.trim();
  if (username) {
    return `@${username} / ${user.id}`;
  }
  return user.id;
}

function formatRoleLabel(role: IChatMessage['role']) {
  return (role.charAt(0).toUpperCase() + role.slice(1)).replace('_', ' ');
}

function getRoleTone(role: IChatMessage['role']) {
  if (role === 'assistant') return 'success' as const;
  if (role === 'system') return 'warning' as const;
  return 'accent' as const;
}

export function ChatDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chatId = id ?? '';
  const { data, error, isLoading, refetch } = useChatDetails(chatId || null);

  const history = data?.history?.filter((message) => message.content) ?? [];

  const historyColumns = useMemo(
    () => [
      { key: 'role', label: 'Role' },
      { key: 'content', label: 'Message' },
    ],
    [],
  );

  const historyRows = useMemo(
    () =>
      history.map((message) => ({
        role: (
          <div style={{ minWidth: 110 }}>
            <Badge tone={getRoleTone(message.role)} outline>
              {formatRoleLabel(message.role)}
            </Badge>
          </div>
        ),
        content: (
          <Typography variant="body" className={s.messageContent}>
            {message.content || '—'}
          </Typography>
        ),
      })),
    [history],
  );

  const historySkeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        role: <Skeleton width={80} height={20} key={`role-${index}`} />,
        content: (
          <div className={s.messageSkeleton}>
            <Skeleton width="90%" height={12} />
            <Skeleton width="70%" height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && !data;

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Chat details</Typography>
            {data ? (
              <Typography variant="caption" tone="muted">
                {data.id}
              </Typography>
            ) : null}
          </div>
          <div className={s.headerActions}>
            <Button variant="secondary" onClick={() => navigate('/chats')}>
              Back to chats
            </Button>
            {data?.character?.id ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/characters/${data.character.id}`)}
              >
                Open character
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load chat"
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
          <EmptyState title="Chat not found" description="Check the ID." />
        ) : null}

        <Section
          title="Overview"
          description={data ? `${history.length} messages` : undefined}
        >
          {showSkeleton ? (
            <Grid columns={3} className={s.overviewGrid}>
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={`overview-${index}`} width={180} height={14} />
              ))}
            </Grid>
          ) : data ? (
            <Grid columns={3} className={s.overviewGrid}>
              <Field label="User">
                <Typography variant="body">
                  {formatUserName(data.user)}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {formatUserMeta(data.user)}
                </Typography>
              </Field>
              <Field label="Character">
                <Typography variant="body">
                  {data.character?.name ?? '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.character?.id ?? '-'}
                </Typography>
              </Field>
              <Field label="Scenario">
                <Typography variant="body">
                  {data.scenario?.name ?? '-'}
                </Typography>
                <Typography variant="caption" tone="muted">
                  {data.scenario?.id ?? '-'}
                </Typography>
              </Field>
              <Field label="Stage">
                <div>
                  <Badge tone="accent" outline>
                    {formatStage(data.stage)}
                  </Badge>
                </div>
              </Field>
              <Field label="History length">
                <Typography variant="body">
                  {Number.isFinite(data.historyLength)
                    ? data.historyLength
                    : '-'}
                </Typography>
              </Field>
              <Field label="Photos sent">
                <Typography variant="body">
                  {Number.isFinite(data.photosSent) ? data.photosSent : '-'}
                </Typography>
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
            </Grid>
          ) : null}
        </Section>

        <Section
          title="History"
          description={
            data && history.length > 0
              ? `Showing ${history.length} messages`
              : undefined
          }
        >
          {showSkeleton ? (
            <Table columns={historyColumns} rows={historySkeletonRows} />
          ) : history.length === 0 ? (
            <EmptyState
              title="No messages"
              description="This chat has no history yet."
            />
          ) : (
            <Table columns={historyColumns} rows={historyRows} />
          )}
        </Section>
      </Container>
    </AppShell>
  );
}
