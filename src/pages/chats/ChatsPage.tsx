import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCharacters, useCharacterDetails } from '@/app/characters';
import { useChats } from '@/app/chats';
import { useUsers } from '@/app/users';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { ITgUser, RoleplayStage } from '@/common/types';
import { STAGES_IN_ORDER } from '@/common/types';
import { AppShell } from '@/components/templates';

import { SearchSelect } from './components/SearchSelect';
import s from './ChatsPage.module.scss';

type QueryUpdate = {
  userId?: string;
  characterId?: string;
  scenarioId?: string;
  stage?: RoleplayStage | '';
  order?: string;
  page?: number;
  pageSize?: number;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const stageValues = new Set(STAGES_IN_ORDER);

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

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

function parsePositiveNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parsePageSize(value: string | null) {
  const parsed = parsePositiveNumber(value, DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
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

export function ChatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawUserId = searchParams.get('userId') ?? '';
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawStage = searchParams.get('stage');
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const userId = rawUserId.trim();
  const characterId = rawCharacterId.trim();
  const scenarioId = rawScenarioId.trim();
  const stage = stageValues.has(rawStage as RoleplayStage)
    ? (rawStage as RoleplayStage)
    : undefined;

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

  const [userSearch, setUserSearch] = useState('');
  const [characterSearch, setCharacterSearch] = useState('');
  const debouncedUserSearch = useDebouncedValue(userSearch, SEARCH_DEBOUNCE_MS);
  const debouncedCharacterSearch = useDebouncedValue(
    characterSearch,
    SEARCH_DEBOUNCE_MS,
  );

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.userId !== undefined) {
        const nextUserId = update.userId.trim();
        if (nextUserId) {
          next.set('userId', nextUserId);
        } else {
          next.delete('userId');
        }
      }

      if (update.characterId !== undefined) {
        const nextCharacterId = update.characterId.trim();
        if (nextCharacterId) {
          next.set('characterId', nextCharacterId);
        } else {
          next.delete('characterId');
        }
      }

      if (update.scenarioId !== undefined) {
        const nextScenarioId = update.scenarioId.trim();
        if (nextScenarioId) {
          next.set('scenarioId', nextScenarioId);
        } else {
          next.delete('scenarioId');
        }
      }

      if (update.stage !== undefined) {
        if (update.stage) {
          next.set('stage', update.stage);
        } else {
          next.delete('stage');
        }
      }

      if (update.order !== undefined) {
        if (update.order && update.order !== DEFAULT_ORDER) {
          next.set('order', update.order);
        } else {
          next.delete('order');
        }
      }

      if (update.page !== undefined) {
        if (update.page > 1) {
          next.set('page', String(update.page));
        } else {
          next.delete('page');
        }
      }

      if (update.pageSize !== undefined) {
        if (update.pageSize !== DEFAULT_PAGE_SIZE) {
          next.set('pageSize', String(update.pageSize));
        } else {
          next.delete('pageSize');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  const userQueryParams = useMemo(
    () => ({
      search: debouncedUserSearch || undefined,
      order: 'DESC',
      skip: 0,
      take: 20,
    }),
    [debouncedUserSearch],
  );
  const { data: usersData, isLoading: isUsersLoading } = useUsers(
    userQueryParams,
  );

  const characterQueryParams = useMemo(
    () => ({
      search: debouncedCharacterSearch || undefined,
      order: 'ASC',
      skip: 0,
      take: 20,
    }),
    [debouncedCharacterSearch],
  );
  const { data: charactersData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);

  const { data: characterDetails, isLoading: isScenariosLoading } =
    useCharacterDetails(characterId || null);

  const userOptions = useMemo(
    () =>
      (usersData?.data ?? []).map((user) => ({
        id: user.id,
        label: formatUserName(user),
        meta: formatUserMeta(user),
      })),
    [usersData?.data],
  );

  const characterOptions = useMemo(
    () =>
      (charactersData?.data ?? []).map((character) => ({
        id: character.id,
        label: character.name,
        meta: character.id,
      })),
    [charactersData?.data],
  );

  const scenarioOptions = useMemo(
    () =>
      (characterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name || scenario.id,
        value: scenario.id,
      })),
    [characterDetails?.scenarios],
  );

  const scenarioSelectOptions = useMemo(() => {
    if (!characterId) {
      return [{ label: 'Select character first', value: '', disabled: true }];
    }
    if (isScenariosLoading) {
      return [{ label: 'Loading scenarios...', value: '', disabled: true }];
    }
    return [{ label: 'Any', value: '' }, ...scenarioOptions];
  }, [characterId, isScenariosLoading, scenarioOptions]);

  useEffect(() => {
    if (!scenarioId) return;
    if (!characterId) {
      updateSearchParams({ scenarioId: '' }, true);
      return;
    }
    const stillExists = scenarioOptions.some(
      (scenario) => scenario.value === scenarioId,
    );
    if (!stillExists) {
      updateSearchParams({ scenarioId: '' }, true);
    }
  }, [characterId, scenarioId, scenarioOptions, updateSearchParams]);

  const queryParams = useMemo(
    () => ({
      userId: userId || undefined,
      characterId: characterId || undefined,
      scenarioId: scenarioId || undefined,
      stage: stage || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [userId, characterId, scenarioId, stage, order, page, pageSize],
  );

  const { data, error, isLoading, refetch } = useChats(queryParams);

  const chats = data?.data ?? [];
  const total = data?.total ?? 0;
  const effectiveTake = data?.take ?? pageSize;
  const effectiveSkip = data?.skip ?? (page - 1) * pageSize;
  const totalPages = total > 0 ? Math.ceil(total / effectiveTake) : 1;

  useEffect(() => {
    if (!data || total === 0) return;
    if (page > totalPages) {
      updateSearchParams({ page: totalPages }, true);
    }
  }, [data, page, total, totalPages, updateSearchParams]);

  const columns = useMemo(
    () => [
      { key: 'chat', label: 'Chat' },
      { key: 'user', label: 'User' },
      { key: 'context', label: 'Character / Scenario' },
      { key: 'stage', label: 'Stage' },
      { key: 'history', label: 'History' },
      { key: 'photos', label: 'Photos' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      chats.map((chat) => ({
        chat: (
          <div className={s.chatCell}>
            <Typography variant="body">{chat.id}</Typography>
            <Typography variant="caption" tone="muted">
              {formatDate(chat.createdAt)}
            </Typography>
          </div>
        ),
        user: (
          <div className={s.userCell}>
            <Typography variant="body">{formatUserName(chat.user)}</Typography>
            <Typography variant="caption" tone="muted">
              {formatUserMeta(chat.user)}
            </Typography>
          </div>
        ),
        context: (
          <div className={s.contextCell}>
            <Typography variant="body">{chat.character?.name ?? '-'}</Typography>
            <Typography variant="caption" tone="muted">
              {chat.scenario?.name ?? chat.scenario?.id ?? '-'}
            </Typography>
          </div>
        ),
        stage: (
          <Badge tone="accent" outline>
            {formatStage(chat.stage)}
          </Badge>
        ),
        history: (
          <Typography variant="body" tone="muted">
            {Number.isFinite(chat.historyLength) ? chat.historyLength : '-'}
          </Typography>
        ),
        photos: (
          <Typography variant="body" tone="muted">
            {Number.isFinite(chat.photosSent) ? chat.photosSent : '-'}
          </Typography>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(chat.updatedAt)}
          </Typography>
        ),
      })),
    [chats],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        chat: (
          <div className={s.chatCell} key={`chat-skel-${index}`}>
            <Skeleton width={180} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        user: (
          <div className={s.userCell}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        context: (
          <div className={s.contextCell}>
            <Skeleton width={140} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        stage: <Skeleton width={90} height={20} />,
        history: <Skeleton width={40} height={12} />,
        photos: <Skeleton width={40} height={12} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && chats.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const selectedUserLabel = useMemo(() => {
    const selected = userOptions.find((option) => option.id === userId);
    return selected?.label ?? '';
  }, [userId, userOptions]);

  const selectedCharacterLabel = useMemo(() => {
    const selected = characterOptions.find((option) => option.id === characterId);
    return selected?.label ?? '';
  }, [characterId, characterOptions]);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Chats</Typography>
          </div>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field className={s.filterField} label="User" labelFor="chat-user">
              <SearchSelect
                id="chat-user"
                value={userId}
                valueLabel={selectedUserLabel}
                options={userOptions}
                search={userSearch}
                onSearchChange={setUserSearch}
                onSelect={(value) =>
                  updateSearchParams({ userId: value, page: 1 })
                }
                placeholder={isUsersLoading ? 'Loading users...' : 'Select user'}
                loading={isUsersLoading}
                disabled={isUsersLoading}
                emptyLabel="No users found."
              />
            </Field>
            <Field
              className={s.filterField}
              label="Character"
              labelFor="chat-character"
            >
              <SearchSelect
                id="chat-character"
                value={characterId}
                valueLabel={selectedCharacterLabel}
                options={characterOptions}
                search={characterSearch}
                onSearchChange={setCharacterSearch}
                onSelect={(value) =>
                  updateSearchParams({
                    characterId: value,
                    scenarioId: '',
                    page: 1,
                  })
                }
                placeholder={
                  isCharactersLoading
                    ? 'Loading characters...'
                    : 'Select character'
                }
                loading={isCharactersLoading}
                disabled={isCharactersLoading}
                emptyLabel="No characters found."
              />
            </Field>
            <Field
              className={s.filterField}
              label="Scenario"
              labelFor="chat-scenario"
            >
              <Select
                id="chat-scenario"
                options={scenarioSelectOptions}
                value={characterId ? scenarioId : ''}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ scenarioId: value, page: 1 })
                }
                disabled={!characterId || isScenariosLoading}
              />
            </Field>
            <Field className={s.filterFieldSm} label="Stage" labelFor="chat-stage">
              <Select
                id="chat-stage"
                options={[
                  { label: 'Any', value: '' },
                  ...STAGES_IN_ORDER.map((item) => ({
                    label: formatStage(item),
                    value: item,
                  })),
                ]}
                value={stage ?? ''}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({
                    stage: value ? (value as RoleplayStage) : '',
                    page: 1,
                  })
                }
              />
            </Field>
            <Field className={s.filterFieldSm} label="Order" labelFor="chat-order">
              <Select
                id="chat-order"
                options={ORDER_OPTIONS}
                value={order}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ order: value, page: 1 })
                }
              />
            </Field>
          </div>
        </div>

        {error ? (
          <Stack className={s.state} gap="12px">
            <Alert
              title="Unable to load chats"
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
            title="No chats found"
            description="Try adjusting your filters."
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : rows}
              getRowProps={
                showSkeleton
                  ? undefined
                  : (_, index) => {
                      const chat = chats[index];
                      if (!chat) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => navigate(`/chats/${chat.id}`),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/chats/${chat.id}`);
                          }
                        },
                      };
                    }
              }
            />

            {showFooter ? (
              <div className={s.footer}>
                <Typography variant="meta" tone="muted">
                  {total === 0
                    ? 'No results'
                    : `Showing ${rangeStart}-${rangeEnd} of ${total.toLocaleString()}`}
                </Typography>
                <div className={s.paginationRow}>
                  <Select
                    options={PAGE_SIZE_OPTIONS.map((size) => ({
                      label: `${size} / page`,
                      value: String(size),
                    }))}
                    size="sm"
                    variant="ghost"
                    value={String(pageSize)}
                    onChange={(value) =>
                      updateSearchParams({
                        pageSize: Number(value),
                        page: 1,
                      })
                    }
                    fitContent
                  />
                  {totalPages > 1 ? (
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onChange={(nextPage) =>
                        updateSearchParams({ page: nextPage })
                      }
                    />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Container>
    </AppShell>
  );
}
