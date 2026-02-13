import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { usePrompts } from '@/app/prompts';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import { type IPrompt, PromptType } from '@/common/types';
import { capitalize } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './PromptsPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  isActive?: string;
  type?: string;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'ASC';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_ACTIVE_FILTER = 'all';
const DEFAULT_TYPE_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 400;

const ACTIVE_FILTER_OPTIONS = [
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
  { label: 'All', value: 'all' },
];

const TYPE_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Chat', value: PromptType.Chat },
  { label: 'Image', value: PromptType.Image },
];

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

function resolveActiveFilter(value: string | null) {
  if (value === 'true' || value === 'false' || value === 'all') return value;
  return DEFAULT_ACTIVE_FILTER;
}

function resolveTypeFilter(value: string | null) {
  if (value === PromptType.Chat || value === PromptType.Image) return value;
  return DEFAULT_TYPE_FILTER;
}

export function PromptsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawIsActive = searchParams.get('isActive');
  const rawType = searchParams.get('type');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
  const activeFilter = resolveActiveFilter(rawIsActive);
  const typeFilter = resolveTypeFilter(rawType);

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.search !== undefined) {
        const nextSearch = update.search.trim();
        if (nextSearch) {
          next.set('search', nextSearch);
        } else {
          next.delete('search');
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

      if (update.isActive !== undefined) {
        if (update.isActive && update.isActive !== DEFAULT_ACTIVE_FILTER) {
          next.set('isActive', update.isActive);
        } else {
          next.delete('isActive');
        }
      }

      if (update.type !== undefined) {
        if (update.type && update.type !== DEFAULT_TYPE_FILTER) {
          next.set('type', update.type);
        } else {
          next.delete('type');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    setSearchInput(rawSearch);
  }, [rawSearch]);

  useEffect(() => {
    if (normalizedSearch === rawSearch) return;
    updateSearchParams({ search: normalizedSearch, page: 1 }, true);
  }, [normalizedSearch, rawSearch, updateSearchParams]);

  const queryParams = useMemo(() => {
    const isActive =
      activeFilter === 'all' ? undefined : activeFilter === 'true';
    const type = typeFilter === 'all' ? undefined : (typeFilter as PromptType);
    return {
      search: normalizedSearch || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
      isActive,
      type,
    };
  }, [activeFilter, normalizedSearch, order, page, pageSize, typeFilter]);

  const { data, error, isLoading, refetch } = usePrompts(queryParams);

  const prompts = data?.data ?? [];
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
      { key: 'prompt', label: 'Prompt' },
      { key: 'type', label: 'Type' },
      { key: 'version', label: 'Version' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      prompts.map((prompt) => ({
        prompt: (
          <div className={s.promptCell}>
            <Typography variant="body">{prompt.name}</Typography>
            <Typography variant="caption" tone="muted">
              {prompt.id}
            </Typography>
          </div>
        ),
        type: (
          <Typography variant="body" tone="muted">
            {capitalize(prompt.type)}
          </Typography>
        ),
        version: (
          <Typography variant="body" tone="muted">
            {prompt.version}
          </Typography>
        ),
        status: prompt.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="warning" outline>
            Inactive
          </Badge>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(prompt.updatedAt)}
          </Typography>
        ),
      })),
    [prompts],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        prompt: (
          <div className={s.promptCell} key={`prompt-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        type: <Skeleton width={80} height={12} />,
        version: <Skeleton width={60} height={12} />,
        status: <Skeleton width={80} height={20} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && prompts.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const openEditPage = (prompt: IPrompt) => {
    navigate(`/prompts/${prompt.id}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Prompts</Typography>
          </div>
          <Button
            iconLeft={<PlusIcon />}
            onClick={() => navigate('/prompts/new')}
          >
            Create prompt
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="prompts-search"
            >
              <Input
                id="prompts-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Type" labelFor="prompts-type">
              <Select
                id="prompts-type"
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ type: value, page: 1 })
                }
              />
            </Field>
            <Field label="Status" labelFor="prompts-status">
              <Select
                id="prompts-status"
                options={ACTIVE_FILTER_OPTIONS}
                value={activeFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ isActive: value, page: 1 })
                }
              />
            </Field>
            <Field label="Order" labelFor="prompts-order">
              <Select
                id="prompts-order"
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
              title="Unable to load prompts"
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
            title="No prompts found"
            description="Create a prompt to get started."
            action={
              <Button onClick={() => navigate('/prompts/new')}>
                Create prompt
              </Button>
            }
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
                      const prompt = prompts[index];
                      if (!prompt) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openEditPage(prompt),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openEditPage(prompt);
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
