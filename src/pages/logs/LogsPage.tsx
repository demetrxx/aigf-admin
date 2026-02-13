import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  useChatResponseLogs,
  useErrorLogs,
  useImageGenLogs,
  useLlmCalls,
} from '@/app/logs';
import {
  Alert,
  Container,
  EmptyState,
  Field,
  Input,
  Pagination,
  Section,
  Select,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from '@/atoms';
import type {
  ErrorCode,
  LlmCallType,
  LogOrder,
  LogOrderBy,
} from '@/common/types';
import { AppShell } from '@/components/templates';

import s from './LogsPage.module.scss';

type LogTab = 'chat-response' | 'llm-calls' | 'img-gen' | 'errors';

type QueryUpdate = {
  tab?: LogTab;
  chatId?: string;
  model?: string;
  type?: LlmCallType | '';
  code?: ErrorCode | '';
  startAt?: string;
  endAt?: string;
  orderBy?: LogOrderBy;
  order?: LogOrder;
  page?: number;
  pageSize?: number;
};

const TAB_ITEMS = [
  { value: 'chat-response', label: 'Chat response' },
  { value: 'llm-calls', label: 'LLM calls' },
  { value: 'img-gen', label: 'Image generation' },
  { value: 'errors', label: 'Errors' },
] as const;

const TAB_VALUES = new Set(TAB_ITEMS.map((item) => item.value));

const ORDER_BY_OPTIONS = [
  { label: 'Created at', value: 'createdAt' },
  { label: 'Updated at', value: 'updatedAt' },
] as const;

const ORDER_OPTIONS = [
  { label: 'Descending', value: 'DESC' },
  { label: 'Ascending', value: 'ASC' },
] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const DEFAULT_ORDER_BY: LogOrderBy = 'createdAt';
const DEFAULT_ORDER: LogOrder = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;
const LLM_TYPE_VALUES = new Set(['tool_planner', 'chat', 'image']);
const ERROR_CODE_VALUES = new Set(['telegram', 'llm', 'runpod', 'be', 'other']);

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const centsFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
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
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateTimeFormatter.format(parsed);
}

function formatLatency(value: number | null | undefined) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value!)} ms`;
}

function formatNumber(value: number | null | undefined) {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value!).toLocaleString();
}

function formatPrice(value: number | null | undefined) {
  if (!Number.isFinite(value)) return '—';

  return centsFormatter.format(value! * 100);
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

function toLocalInputValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (segment: number) => String(segment).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoString(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function truncate(value: string, max = 80) {
  if (!value) return '—';
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab') ?? 'chat-response';
  const tab = TAB_VALUES.has(rawTab as any)
    ? (rawTab as LogTab)
    : 'chat-response';
  const rawChatId = searchParams.get('chatId') ?? '';
  const rawModel = searchParams.get('model') ?? '';
  const rawType = searchParams.get('type');
  const rawCode = searchParams.get('code');
  const llmType = LLM_TYPE_VALUES.has(rawType ?? '')
    ? (rawType as LlmCallType)
    : null;
  const errorCode = ERROR_CODE_VALUES.has(rawCode ?? '')
    ? (rawCode as ErrorCode)
    : null;
  const rawStartAt = searchParams.get('startAt');
  const rawEndAt = searchParams.get('endAt');
  const rawOrderBy = searchParams.get('orderBy') as LogOrderBy | null;
  const rawOrder = searchParams.get('order') as LogOrder | null;
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [chatIdInput, setChatIdInput] = useState(rawChatId);
  const [modelInput, setModelInput] = useState(rawModel);
  const debouncedChatId = useDebouncedValue(chatIdInput, SEARCH_DEBOUNCE_MS);
  const debouncedModel = useDebouncedValue(modelInput, SEARCH_DEBOUNCE_MS);

  const chatId = debouncedChatId.trim();
  const model = debouncedModel.trim();

  const orderBy = ORDER_BY_OPTIONS.some((option) => option.value === rawOrderBy)
    ? (rawOrderBy as LogOrderBy)
    : DEFAULT_ORDER_BY;
  const order = ORDER_OPTIONS.some((option) => option.value === rawOrder)
    ? (rawOrder as LogOrder)
    : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

  const startAtInput = toLocalInputValue(rawStartAt);
  const endAtInput = toLocalInputValue(rawEndAt);

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.tab !== undefined) {
        next.set('tab', update.tab);
      }

      if (update.chatId !== undefined) {
        const nextChatId = update.chatId.trim();
        if (nextChatId) {
          next.set('chatId', nextChatId);
        } else {
          next.delete('chatId');
        }
      }

      if (update.model !== undefined) {
        const nextModel = update.model.trim();
        if (nextModel) {
          next.set('model', nextModel);
        } else {
          next.delete('model');
        }
      }

      if (update.type !== undefined) {
        if (update.type) {
          next.set('type', update.type);
        } else {
          next.delete('type');
        }
      }

      if (update.code !== undefined) {
        if (update.code) {
          next.set('code', update.code);
        } else {
          next.delete('code');
        }
      }

      if (update.startAt !== undefined) {
        if (update.startAt) {
          next.set('startAt', update.startAt);
        } else {
          next.delete('startAt');
        }
      }

      if (update.endAt !== undefined) {
        if (update.endAt) {
          next.set('endAt', update.endAt);
        } else {
          next.delete('endAt');
        }
      }

      if (update.orderBy !== undefined) {
        if (update.orderBy !== DEFAULT_ORDER_BY) {
          next.set('orderBy', update.orderBy);
        } else {
          next.delete('orderBy');
        }
      }

      if (update.order !== undefined) {
        if (update.order !== DEFAULT_ORDER) {
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

  useEffect(() => {
    const updates: QueryUpdate = {};
    if (rawTab !== tab) updates.tab = tab;
    if (rawChatId !== chatId) updates.chatId = chatId;
    if (rawModel !== model) updates.model = model;
    if ((rawChatId !== chatId || rawModel !== model) && page !== 1) {
      updates.page = 1;
    }
    if (Object.keys(updates).length > 0) {
      updateSearchParams(updates, true);
    }
  }, [
    rawTab,
    rawChatId,
    rawModel,
    tab,
    chatId,
    model,
    page,
    updateSearchParams,
  ]);

  const baseParams = useMemo(
    () => ({
      startAt: rawStartAt ?? undefined,
      endAt: rawEndAt ?? undefined,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      order,
    }),
    [rawStartAt, rawEndAt, page, pageSize, orderBy, order],
  );

  const chatResponseQuery = useChatResponseLogs(
    {
      ...baseParams,
      chatId: chatId || undefined,
    },
    { enabled: tab === 'chat-response' },
  );

  const llmCallsQuery = useLlmCalls(
    {
      ...baseParams,
      chatId: chatId || undefined,
      type: llmType || undefined,
      model: model || undefined,
    },
    { enabled: tab === 'llm-calls' },
  );

  const imageGenQuery = useImageGenLogs(
    {
      ...baseParams,
      chatId: chatId || undefined,
    },
    { enabled: tab === 'img-gen' },
  );

  const errorLogsQuery = useErrorLogs(
    {
      ...baseParams,
      code: errorCode || undefined,
    },
    { enabled: tab === 'errors' },
  );

  const chatResponseColumns = useMemo(
    () => [
      {
        key: 'chatId',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Chat ID
          </Typography>
        ),
      },
      {
        key: 'toolsUsed',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Tools
          </Typography>
        ),
      },
      {
        key: 'totalLatency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Total latency
          </Typography>
        ),
      },
      {
        key: 'toolRouterLatency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Router latency
          </Typography>
        ),
      },
      {
        key: 'textGenerationLatency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Text latency
          </Typography>
        ),
      },
      {
        key: 'createdAt',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Created
          </Typography>
        ),
      },
    ],
    [],
  );

  const chatResponseRows = useMemo(() => {
    return (chatResponseQuery.data?.data ?? []).map((item) => ({
      chatId: (
        <Typography variant="body" as="span" className={s.mono}>
          {item.chatId}
        </Typography>
      ),
      toolsUsed: (
        <Typography variant="body" as="span" className={s.wrap}>
          {item.toolsUsed?.length ? item.toolsUsed.join(', ') : '—'}
        </Typography>
      ),
      totalLatency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.totalLatency)}
        </Typography>
      ),
      toolRouterLatency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.toolRouterLatency)}
        </Typography>
      ),
      textGenerationLatency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.textGenerationLatency)}
        </Typography>
      ),
      createdAt: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatDate(item.createdAt)}
        </Typography>
      ),
    }));
  }, [chatResponseQuery.data]);

  const llmColumns = useMemo(
    () => [
      {
        key: 'chatId',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Chat ID
          </Typography>
        ),
      },
      {
        key: 'type',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Type
          </Typography>
        ),
      },
      {
        key: 'model',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Model
          </Typography>
        ),
      },
      {
        key: 'inputTokens',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Input
          </Typography>
        ),
      },
      {
        key: 'outputTokens',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Output
          </Typography>
        ),
      },
      {
        key: 'price',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Cost
          </Typography>
        ),
      },
      {
        key: 'latency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Latency
          </Typography>
        ),
      },
      {
        key: 'createdAt',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="span"
            className={s.alignRight}
          >
            Date
          </Typography>
        ),
      },
    ],
    [],
  );

  const llmRows = useMemo(() => {
    return (llmCallsQuery.data?.data ?? []).map((item) => ({
      chatId: (
        <Typography variant="body" as="span" className={s.mono}>
          {item.chatId}
        </Typography>
      ),
      type: (
        <Typography variant="body" as="span">
          {item.type}
        </Typography>
      ),
      model: (
        <Typography variant="body" as="span" className={s.wrap}>
          {item.model || '—'}
        </Typography>
      ),
      inputTokens: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatNumber(item.inputTokens)}
        </Typography>
      ),
      outputTokens: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatNumber(item.outputTokens)}
        </Typography>
      ),
      price: (
        <Typography variant="body" as="span" className={s.alignRight}>
          ¢{formatPrice(item.price)}
        </Typography>
      ),
      latency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.latency)}
        </Typography>
      ),
      createdAt: (
        <Typography variant="caption" as="span" className={s.alignRight}>
          {formatDate(item.createdAt)}
        </Typography>
      ),
    }));
  }, [llmCallsQuery.data]);

  const imageGenColumns = useMemo(
    () => [
      {
        key: 'chatId',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Chat ID
          </Typography>
        ),
      },
      {
        key: 'promptLatency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Prompt latency
          </Typography>
        ),
      },
      {
        key: 'generationLatency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Generation latency
          </Typography>
        ),
      },
      {
        key: 'uploadLatency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Upload latency
          </Typography>
        ),
      },
      {
        key: 'totalLatency',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Total latency
          </Typography>
        ),
      },
      {
        key: 'createdAt',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Created
          </Typography>
        ),
      },
    ],
    [],
  );

  const imageGenRows = useMemo(() => {
    return (imageGenQuery.data?.data ?? []).map((item) => ({
      chatId: (
        <Typography variant="body" as="span" className={s.mono}>
          {item.chatId}
        </Typography>
      ),
      promptLatency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.promptLatency)}
        </Typography>
      ),
      generationLatency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.generationLatency)}
        </Typography>
      ),
      uploadLatency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.uploadLatency)}
        </Typography>
      ),
      totalLatency: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatLatency(item.totalLatency)}
        </Typography>
      ),
      createdAt: (
        <Typography variant="body" as="span" className={s.alignRight}>
          {formatDate(item.createdAt)}
        </Typography>
      ),
    }));
  }, [imageGenQuery.data]);

  const errorColumns = useMemo(
    () => [
      {
        key: 'code',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Code
          </Typography>
        ),
      },
      {
        key: 'message',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Message
          </Typography>
        ),
      },
      {
        key: 'details',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Details
          </Typography>
        ),
      },
      {
        key: 'createdAt',
        label: (
          <Typography variant="meta" tone="muted" as="span">
            Created
          </Typography>
        ),
      },
    ],
    [],
  );

  const errorRows = useMemo(() => {
    return (errorLogsQuery.data?.data ?? []).map((item) => {
      const detailsText = item.details ? JSON.stringify(item.details) : '';
      const truncated = truncate(detailsText, 80);
      const detailsCell = detailsText ? (
        <Tooltip content={detailsText}>
          <Typography variant="body" as="span" className={s.truncate}>
            {truncated}
          </Typography>
        </Tooltip>
      ) : (
        <Typography variant="body" as="span">
          —
        </Typography>
      );

      return {
        code: (
          <Typography variant="body" as="span">
            {item.code}
          </Typography>
        ),
        message: (
          <Tooltip content={item.message}>
            <Typography variant="body" as="span" className={s.truncate}>
              {truncate(item.message, 120)}
            </Typography>
          </Tooltip>
        ),
        details: detailsCell,
        createdAt: (
          <Typography variant="body" as="span" className={s.alignRight}>
            {formatDate(item.createdAt)}
          </Typography>
        ),
      };
    });
  }, [errorLogsQuery.data]);

  const activeConfig = useMemo(() => {
    if (tab === 'chat-response') {
      return {
        columns: chatResponseColumns,
        rows: chatResponseRows,
        total: chatResponseQuery.data?.total ?? 0,
        isLoading: chatResponseQuery.isLoading,
        error: chatResponseQuery.error,
        emptyTitle: 'No chat responses',
      } as const;
    }

    if (tab === 'llm-calls') {
      return {
        columns: llmColumns,
        rows: llmRows,
        total: llmCallsQuery.data?.total ?? 0,
        isLoading: llmCallsQuery.isLoading,
        error: llmCallsQuery.error,
        emptyTitle: 'No LLM calls',
      } as const;
    }

    if (tab === 'img-gen') {
      return {
        columns: imageGenColumns,
        rows: imageGenRows,
        total: imageGenQuery.data?.total ?? 0,
        isLoading: imageGenQuery.isLoading,
        error: imageGenQuery.error,
        emptyTitle: 'No image generations',
      } as const;
    }

    return {
      columns: errorColumns,
      rows: errorRows,
      total: errorLogsQuery.data?.total ?? 0,
      isLoading: errorLogsQuery.isLoading,
      error: errorLogsQuery.error,
      emptyTitle: 'No errors',
    } as const;
  }, [
    tab,
    chatResponseColumns,
    chatResponseRows,
    chatResponseQuery.data?.total,
    chatResponseQuery.error,
    chatResponseQuery.isLoading,
    llmColumns,
    llmRows,
    llmCallsQuery.data?.total,
    llmCallsQuery.error,
    llmCallsQuery.isLoading,
    imageGenColumns,
    imageGenRows,
    imageGenQuery.data?.total,
    imageGenQuery.error,
    imageGenQuery.isLoading,
    errorColumns,
    errorRows,
    errorLogsQuery.data?.total,
    errorLogsQuery.error,
    errorLogsQuery.isLoading,
  ]);

  const totalPages = Math.max(1, Math.ceil(activeConfig.total / pageSize));

  const llmTypeOptions = useMemo(
    () => [
      { label: 'All types', value: '' },
      { label: 'tool_planner', value: 'tool_planner' },
      { label: 'chat', value: 'chat' },
      { label: 'image', value: 'image' },
    ],
    [],
  );

  const errorCodeOptions = useMemo(
    () => [
      { label: 'All codes', value: '' },
      { label: 'telegram', value: 'telegram' },
      { label: 'llm', value: 'llm' },
      { label: 'runpod', value: 'runpod' },
      { label: 'be', value: 'be' },
      { label: 'other', value: 'other' },
    ],
    [],
  );

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Logs</Typography>
            <Typography variant="body" tone="muted">
              Query system events and request traces.
            </Typography>
          </div>
        </div>

        <Stack gap="24px">
          <Tabs
            // @ts-expect-error: mismatch between Select and LogTab
            items={TAB_ITEMS}
            value={tab}
            onChange={(value) => {
              updateSearchParams({ tab: value as LogTab, page: 1 });
            }}
          />

          <div className={s.filters}>
            <div className={s.filterRow}>
              {(tab === 'chat-response' ||
                tab === 'llm-calls' ||
                tab === 'img-gen') && (
                <Field label="Chat ID" className={s.filterField}>
                  <Input
                    value={chatIdInput}
                    onChange={(event) => setChatIdInput(event.target.value)}
                    placeholder="uuid"
                    size="sm"
                    fullWidth
                  />
                </Field>
              )}

              {tab === 'llm-calls' && (
                <Field label="Type" className={s.filterField}>
                  <Select
                    options={llmTypeOptions}
                    value={llmType ?? ''}
                    onChange={(value) =>
                      updateSearchParams({
                        type: value as LlmCallType,
                        page: 1,
                      })
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
              )}

              {tab === 'llm-calls' && (
                <Field label="Model" className={s.filterField}>
                  <Input
                    value={modelInput}
                    onChange={(event) => setModelInput(event.target.value)}
                    placeholder="gpt-4"
                    size="sm"
                    fullWidth
                  />
                </Field>
              )}

              {tab === 'errors' && (
                <Field label="Code" className={s.filterField}>
                  <Select
                    options={errorCodeOptions}
                    value={errorCode ?? ''}
                    onChange={(value) =>
                      updateSearchParams({ code: value as ErrorCode, page: 1 })
                    }
                    size="sm"
                    fullWidth
                  />
                </Field>
              )}
            </div>

            <div className={s.filterRow}>
              <Field label="Start" className={s.filterField}>
                <Input
                  type="datetime-local"
                  size="sm"
                  value={startAtInput}
                  onChange={(event) => {
                    const next = event.target.value;
                    const iso = next ? toIsoString(next) : null;
                    updateSearchParams({ startAt: iso ?? '', page: 1 });
                  }}
                  fullWidth
                />
              </Field>
              <Field label="End" className={s.filterField}>
                <Input
                  type="datetime-local"
                  size="sm"
                  value={endAtInput}
                  onChange={(event) => {
                    const next = event.target.value;
                    const iso = next ? toIsoString(next) : null;
                    updateSearchParams({ endAt: iso ?? '', page: 1 });
                  }}
                  fullWidth
                />
              </Field>
              <Field label="Order by" className={s.filterField}>
                <Select
                  // @ts-expect-error: mismatch between Select and LogOrderBy
                  options={ORDER_BY_OPTIONS}
                  value={orderBy}
                  onChange={(value) =>
                    updateSearchParams({
                      orderBy: value as LogOrderBy,
                      page: 1,
                    })
                  }
                  size="sm"
                  fullWidth
                />
              </Field>
              <Field label="Order" className={s.filterField}>
                <Select
                  // @ts-expect-error: mismatch between Select and LogOrder
                  options={ORDER_OPTIONS}
                  value={order}
                  onChange={(value) =>
                    updateSearchParams({ order: value as LogOrder, page: 1 })
                  }
                  size="sm"
                  fullWidth
                />
              </Field>
              <Field label="Page size" className={s.filterField}>
                <Select
                  options={PAGE_SIZE_OPTIONS.map((value) => ({
                    label: String(value),
                    value: String(value),
                  }))}
                  value={String(pageSize)}
                  onChange={(value) =>
                    updateSearchParams({ pageSize: Number(value), page: 1 })
                  }
                  size="sm"
                  fullWidth
                />
              </Field>
            </div>
          </div>

          {activeConfig.error ? (
            <Alert
              tone="danger"
              title="Unable to load logs"
              description="Please retry or adjust the filters."
            />
          ) : null}

          <Section title="Results">
            <div className={s.tableWrap}>
              {activeConfig.isLoading ? (
                <Skeleton height={240} />
              ) : activeConfig.rows.length ? (
                <Table
                  columns={activeConfig.columns}
                  rows={activeConfig.rows}
                />
              ) : (
                <EmptyState
                  title={activeConfig.emptyTitle}
                  description="Adjust filters or try another period."
                />
              )}
            </div>
            <div className={s.footer}>
              <Typography variant="caption" tone="muted">
                {activeConfig.total
                  ? `Total ${activeConfig.total} records`
                  : 'No records'}
              </Typography>
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
          </Section>
        </Stack>
      </Container>
    </AppShell>
  );
}
