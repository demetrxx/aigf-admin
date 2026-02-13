import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useUpdateUser, useUsers } from '@/app/users';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { ITgUser } from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import s from './UsersPage.module.scss';

type QueryUpdate = {
  search?: string;
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

function getSubscriptionStatus(user: ITgUser) {
  if (!user.subscribedUntil) {
    return {
      label: 'None',
      tone: 'accent' as const,
      outline: true,
      dateLabel: null,
    };
  }
  const parsed = new Date(user.subscribedUntil);
  if (Number.isNaN(parsed.getTime())) {
    return {
      label: 'Unknown',
      tone: 'warning' as const,
      outline: true,
      dateLabel: '-',
    };
  }
  const isActive = parsed.getTime() > Date.now();
  return {
    label: isActive ? 'Active' : 'Expired',
    tone: isActive ? ('success' as const) : ('warning' as const),
    outline: !isActive,
    dateLabel: `${isActive ? 'Until' : 'Ended'} ${formatDate(user.subscribedUntil)}`,
  };
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

function parseFuelValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed < 0 || parsed > 100) return null;
  return parsed;
}

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);

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

  const queryParams = useMemo(
    () => ({
      search: normalizedSearch || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    [normalizedSearch, order, page, pageSize],
  );

  const { data, error, isLoading, refetch } = useUsers(queryParams);
  const updateUserMutation = useUpdateUser();

  const users = data?.data ?? [];
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

  const [confirmTarget, setConfirmTarget] = useState<{
    user: ITgUser;
    nextBlocked: boolean;
  } | null>(null);
  const [subscriptionTarget, setSubscriptionTarget] = useState<ITgUser | null>(
    null,
  );
  const [subscriptionValue, setSubscriptionValue] = useState('');
  const [subscriptionShowErrors, setSubscriptionShowErrors] = useState(false);
  const [fuelTarget, setFuelTarget] = useState<ITgUser | null>(null);
  const [fuelValue, setFuelValue] = useState('');
  const [fuelShowErrors, setFuelShowErrors] = useState(false);
  const [actionTarget, setActionTarget] = useState<string | null>(null);

  const openSubscriptionModal = (user: ITgUser) => {
    setSubscriptionTarget(user);
    setSubscriptionValue(toLocalInputValue(user.subscribedUntil));
    setSubscriptionShowErrors(false);
  };

  const closeSubscriptionModal = () => {
    if (updateUserMutation.isPending) return;
    setSubscriptionTarget(null);
    setSubscriptionValue('');
  };

  const openFuelModal = (user: ITgUser) => {
    setFuelTarget(user);
    setFuelValue(String(user.fuel ?? 0));
    setFuelShowErrors(false);
  };

  const closeFuelModal = () => {
    if (updateUserMutation.isPending) return;
    setFuelTarget(null);
    setFuelValue('');
  };

  const subscriptionErrors = useMemo(() => {
    if (!subscriptionShowErrors) return {};
    const errors: { date?: string } = {};
    if (!subscriptionValue) {
      errors.date = 'Set a date.';
    } else if (!toIsoString(subscriptionValue)) {
      errors.date = 'Enter a valid date.';
    }
    return errors;
  }, [subscriptionShowErrors, subscriptionValue]);

  const subscriptionIsValid = useMemo(
    () => Boolean(subscriptionValue && toIsoString(subscriptionValue)),
    [subscriptionValue],
  );

  const handleSubscriptionSave = async () => {
    if (!subscriptionTarget) return;
    if (!subscriptionIsValid) {
      setSubscriptionShowErrors(true);
      return;
    }
    const nextValue = toIsoString(subscriptionValue);
    if (!nextValue) return;
    setActionTarget(subscriptionTarget.id);
    try {
      await updateUserMutation.mutateAsync({
        id: subscriptionTarget.id,
        payload: { subscribedUntil: nextValue },
      });
      closeSubscriptionModal();
    } finally {
      setActionTarget(null);
    }
  };

  const fuelErrors = useMemo(() => {
    if (!fuelShowErrors) return {};
    const errors: { fuel?: string } = {};
    if (parseFuelValue(fuelValue) === null) {
      errors.fuel = 'Enter a number between 0 and 100.';
    }
    return errors;
  }, [fuelShowErrors, fuelValue]);

  const fuelIsValid = useMemo(
    () => parseFuelValue(fuelValue) !== null,
    [fuelValue],
  );

  const handleFuelSave = async () => {
    if (!fuelTarget) return;
    const nextFuel = parseFuelValue(fuelValue);
    if (nextFuel === null) {
      setFuelShowErrors(true);
      return;
    }
    setActionTarget(fuelTarget.id);
    try {
      await updateUserMutation.mutateAsync({
        id: fuelTarget.id,
        payload: { fuel: nextFuel },
      });
      closeFuelModal();
    } finally {
      setActionTarget(null);
    }
  };

  const handleConfirmBlock = async () => {
    if (!confirmTarget) return;
    setActionTarget(confirmTarget.user.id);
    try {
      await updateUserMutation.mutateAsync({
        id: confirmTarget.user.id,
        payload: { isBlocked: confirmTarget.nextBlocked },
      });
      setConfirmTarget(null);
    } finally {
      setActionTarget(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'user', label: 'User' },
      { key: 'status', label: 'Status' },
      { key: 'subscription', label: 'Subscription' },
      { key: 'fuel', label: 'Fuel' },
      {
        key: 'lastActivity',
        label: <span className={s.alignRight}>Last activity</span>,
      },
      { key: 'actions', label: '' },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      users.map((user) => {
        const subscription = getSubscriptionStatus(user);
        const isUpdating =
          updateUserMutation.isPending && actionTarget === user.id;
        return {
          user: (
            <div className={s.userCell}>
              <Typography variant="body">{formatUserName(user)}</Typography>
              <Typography variant="caption" tone="muted">
                {formatUserMeta(user)}
              </Typography>
            </div>
          ),
          status: user.isBlocked ? (
            <Badge tone="danger" outline>
              Blocked
            </Badge>
          ) : (
            <Badge tone="success">Active</Badge>
          ),
          subscription: (
            <div className={s.subscriptionCell}>
              <Badge tone={subscription.tone} outline={subscription.outline}>
                {subscription.label}
              </Badge>
              {subscription.dateLabel && (
                <Typography variant="caption" tone="muted">
                  {subscription.dateLabel}
                </Typography>
              )}
            </div>
          ),
          fuel: (
            <Typography variant="body" tone="muted">
              {Number.isFinite(user.fuel) ? user.fuel : '-'}
            </Typography>
          ),
          lastActivity: (
            <Typography variant="caption" tone="muted" className={s.alignRight}>
              {formatDate(user.lastActivityAt)}
            </Typography>
          ),
          actions: (
            <div className={s.actionsCell}>
              <Button
                size="sm"
                variant="outline"
                tone={user.isBlocked ? 'success' : 'warning'}
                onClick={() =>
                  setConfirmTarget({ user, nextBlocked: !user.isBlocked })
                }
                loading={isUpdating && confirmTarget?.user.id === user.id}
                disabled={updateUserMutation.isPending}
              >
                {user.isBlocked ? 'Unblock' : 'Block'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openFuelModal(user)}
                loading={isUpdating && fuelTarget?.id === user.id}
                disabled={updateUserMutation.isPending}
              >
                Fuel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openSubscriptionModal(user)}
                loading={isUpdating && subscriptionTarget?.id === user.id}
                disabled={updateUserMutation.isPending}
              >
                Subscription
              </Button>
            </div>
          ),
        };
      }),
    [
      actionTarget,
      confirmTarget?.user.id,
      fuelTarget?.id,
      subscriptionTarget?.id,
      updateUserMutation.isPending,
      users,
    ],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        user: (
          <div className={s.userCell} key={`user-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        status: <Skeleton width={80} height={20} />,
        subscription: (
          <div className={s.subscriptionCell}>
            <Skeleton width={90} height={20} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        fuel: <Skeleton width={40} height={12} />,
        lastActivity: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
        actions: (
          <div className={s.actionsCell}>
            <Skeleton width={70} height={28} />
            <Skeleton width={90} height={28} />
            <Skeleton width={90} height={28} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && users.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Users</Typography>
          </div>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="users-search"
            >
              <Input
                id="users-search"
                placeholder="Search by name or username"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="users-order">
              <Select
                id="users-order"
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
              title="Unable to load users"
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
            title="No users found"
            description="Try adjusting your search or order."
          />
        ) : null}

        {showTable ? (
          <div className={s.tableWrap}>
            <Table
              columns={columns}
              rows={showSkeleton ? skeletonRows : rows}
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

      <Modal
        open={Boolean(subscriptionTarget)}
        title="Manage subscription"
        onClose={closeSubscriptionModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeSubscriptionModal}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscriptionSave}
              loading={
                updateUserMutation.isPending && Boolean(subscriptionTarget)
              }
              disabled={!subscriptionIsValid || updateUserMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Field
            label="Subscribed until"
            labelFor="user-subscription"
            error={subscriptionErrors.date}
          >
            <Input
              id="user-subscription"
              type="datetime-local"
              value={subscriptionValue}
              onChange={(event) => setSubscriptionValue(event.target.value)}
              fullWidth
            />
          </Field>
          <Typography variant="caption" tone="muted" className={s.helperText}>
            Set a past date to expire the subscription.
          </Typography>
        </Stack>
      </Modal>

      <Modal
        open={Boolean(fuelTarget)}
        title="Update fuel"
        onClose={closeFuelModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeFuelModal}
              disabled={updateUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFuelSave}
              loading={updateUserMutation.isPending && Boolean(fuelTarget)}
              disabled={!fuelIsValid || updateUserMutation.isPending}
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Field
            label="Fuel"
            labelFor="user-fuel"
            error={fuelErrors.fuel}
          >
            <Input
              id="user-fuel"
              type="number"
              min={0}
              max={100}
              step={1}
              value={fuelValue}
              onChange={(event) => setFuelValue(event.target.value)}
              fullWidth
            />
          </Field>
          <Typography variant="caption" tone="muted" className={s.helperText}>
            Set a value from 0 to 100.
          </Typography>
        </Stack>
      </Modal>

      <ConfirmModal
        open={Boolean(confirmTarget)}
        title={confirmTarget?.nextBlocked ? 'Block user' : 'Unblock user'}
        description={
          confirmTarget
            ? confirmTarget.nextBlocked
              ? `Block ${formatUserName(confirmTarget.user)}? User will lose access.`
              : `Unblock ${formatUserName(confirmTarget.user)}? User can access again.`
            : undefined
        }
        confirmLabel={confirmTarget?.nextBlocked ? 'Block' : 'Unblock'}
        tone={confirmTarget?.nextBlocked ? 'danger' : 'default'}
        isConfirming={updateUserMutation.isPending && Boolean(confirmTarget)}
        onConfirm={handleConfirmBlock}
        onClose={() => setConfirmTarget(null)}
      />
    </AppShell>
  );
}
