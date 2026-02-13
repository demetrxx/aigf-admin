import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCreatePlan, usePlans, useUpdatePlanStatus } from '@/app/plans';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Typography,
} from '@/atoms';
import { type IPlan, PlanPeriod, PlanType } from '@/common/types';
import { capitalize } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './PlansPage.module.scss';

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
const DEFAULT_ORDER = 'ASC';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;
const CODE_PATTERN = /^[a-z0-9-]+$/;

const PERIOD_OPTIONS = [
  { label: 'Day', value: PlanPeriod.Day },
  { label: 'Month', value: PlanPeriod.Month },
  { label: 'Year', value: PlanPeriod.Year },
];

const PLAN_TYPE_OPTIONS = [
  { label: 'Subscription', value: PlanType.Subscription },
  { label: 'Air', value: PlanType.Air },
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

function parsePositiveInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

function formatPlanPeriod(plan: IPlan) {
  if (!plan.period || !plan.periodCount) return '-';
  const label = capitalize(plan.period);
  return `${plan.periodCount} ${plan.periodCount === 1 ? label : `${label}s`}`;
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString();
}

export function PlansPage() {
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

  const { data, error, isLoading, refetch } = usePlans(queryParams);
  const updateStatusMutation = useUpdatePlanStatus();
  const createMutation = useCreatePlan();

  const plans = data?.data ?? [];
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

  const [toggleTarget, setToggleTarget] = useState<{
    id: string;
    type: 'status' | 'recommended';
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState({
    code: '',
    type: PlanType.Subscription,
    period: PlanPeriod.Month,
    periodCount: '1',
    price: '',
    air: '',
    isActive: true,
    isRecommended: false,
  });
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const isAirPlan = createValues.type === PlanType.Air;

  const createErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: {
      code?: string;
      periodCount?: string;
      price?: string;
      air?: string;
    } = {};
    const code = createValues.code.trim();
    if (!code) {
      errors.code = 'Enter a code.';
    } else if (!CODE_PATTERN.test(code)) {
      errors.code = 'Use lowercase letters, numbers, and dashes only.';
    }
    if (!isAirPlan && !parsePositiveInteger(createValues.periodCount)) {
      errors.periodCount = 'Use a whole number greater than 0.';
    }
    if (!parsePositiveInteger(createValues.price)) {
      errors.price = 'Use a whole number greater than 0.';
    }
    if (!parsePositiveInteger(createValues.air)) {
      errors.air = 'Use a whole number greater than 0.';
    }
    return errors;
  }, [
    createShowErrors,
    createValues.code,
    createValues.type,
    createValues.periodCount,
    createValues.price,
    createValues.air,
  ]);

  const createIsValid = useMemo(() => {
    const code = createValues.code.trim();
    return Boolean(
      code &&
      CODE_PATTERN.test(code) &&
      (isAirPlan || parsePositiveInteger(createValues.periodCount)) &&
      parsePositiveInteger(createValues.price) &&
      parsePositiveInteger(createValues.air),
    );
  }, [
    createValues.air,
    createValues.code,
    createValues.type,
    createValues.periodCount,
    createValues.price,
  ]);

  const openCreateModal = () => {
    setCreateValues({
      code: '',
      type: PlanType.Subscription,
      period: PlanPeriod.Month,
      periodCount: '1',
      price: '',
      air: '',
      isActive: true,
      isRecommended: false,
    });
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const handleCreate = async () => {
    const code = createValues.code.trim();
    const periodCount = parsePositiveInteger(createValues.periodCount);
    const price = parsePositiveInteger(createValues.price);
    const air = parsePositiveInteger(createValues.air);
    const errors = {
      code: !code
        ? 'Enter a code.'
        : CODE_PATTERN.test(code)
          ? undefined
          : 'Use lowercase letters, numbers, and dashes only.',
      periodCount:
        isAirPlan || periodCount
          ? undefined
          : 'Use a whole number greater than 0.',
      price: price ? undefined : 'Use a whole number greater than 0.',
      air: air ? undefined : 'Use a whole number greater than 0.',
    };
    if (errors.code || errors.periodCount || errors.price || errors.air) {
      setCreateShowErrors(true);
      return;
    }
    await createMutation.mutateAsync({
      code,
      ...(isAirPlan
        ? { type: createValues.type }
        : {
            type: createValues.type,
            period: createValues.period,
            periodCount: periodCount!,
          }),
      price: price!,
      air: air!,
      isActive: createValues.isActive,
      isRecommended: createValues.isRecommended,
    });
    setIsCreateOpen(false);
  };

  const handleToggleStatus = async (plan: IPlan) => {
    const nextStatus = !plan.isActive;
    setToggleTarget({ id: plan.id, type: 'status' });
    try {
      await updateStatusMutation.mutateAsync({
        id: plan.id,
        payload: { isActive: nextStatus, isRecommended: plan.isRecommended },
      });
    } finally {
      setToggleTarget(null);
    }
  };

  const handleToggleRecommended = async (plan: IPlan) => {
    const nextRecommended = !plan.isRecommended;
    setToggleTarget({ id: plan.id, type: 'recommended' });
    try {
      await updateStatusMutation.mutateAsync({
        id: plan.id,
        payload: { isActive: plan.isActive, isRecommended: nextRecommended },
        successTitle: nextRecommended
          ? 'Plan recommended.'
          : 'Plan no longer recommended.',
        successDescription: 'Plan updated.',
      });
    } finally {
      setToggleTarget(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'plan', label: 'Plan' },
      { key: 'type', label: 'Type' },
      { key: 'period', label: 'Period' },
      { key: 'air', label: 'Air' },
      { key: 'price', label: 'Price' },
      { key: 'recommended', label: 'Recommended' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
      { key: 'actions', label: '' },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      plans.map((plan) => {
        const isTogglingStatus =
          updateStatusMutation.isPending &&
          toggleTarget?.id === plan.id &&
          toggleTarget.type === 'status';
        const isTogglingRecommended =
          updateStatusMutation.isPending &&
          toggleTarget?.id === plan.id &&
          toggleTarget.type === 'recommended';
        return {
          plan: (
            <div className={s.planCell}>
              <Typography variant="body">{plan.code}</Typography>
              <Typography variant="caption" tone="muted">
                {plan.id}
              </Typography>
            </div>
          ),
          type: (
            <Typography variant="body" tone="muted">
              {capitalize(plan.type)}
            </Typography>
          ),
          period: (
            <Typography variant="body" tone="muted">
              {formatPlanPeriod(plan)}
            </Typography>
          ),
          air: (
            <Typography variant="body" tone="muted">
              {formatPrice(plan.air)}
            </Typography>
          ),
          price: (
            <Typography variant="body" tone="muted">
              {formatPrice(plan.price)}
            </Typography>
          ),
          recommended: plan.isRecommended ? (
            <Badge>Recommended</Badge>
          ) : (
            <Badge outline>Standard</Badge>
          ),
          status: plan.isActive ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="warning" outline>
              Inactive
            </Badge>
          ),
          updated: (
            <Typography variant="caption" tone="muted" className={s.alignRight}>
              {formatDate(plan.updatedAt)}
            </Typography>
          ),
          actions: (
            <div className={s.actionsCell}>
              <Button
                size="sm"
                variant="outline"
                tone={plan.isActive ? 'warning' : 'success'}
                onClick={() => handleToggleStatus(plan)}
                loading={isTogglingStatus}
                disabled={updateStatusMutation.isPending}
              >
                {plan.isActive ? 'Make inactive' : 'Make active'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                tone={plan.isRecommended ? 'warning' : 'accent'}
                onClick={() => handleToggleRecommended(plan)}
                loading={isTogglingRecommended}
                disabled={updateStatusMutation.isPending}
              >
                {plan.isRecommended ? 'Unrecommend' : 'Recommend'}
              </Button>
            </div>
          ),
        };
      }),
    [
      plans,
      toggleTarget,
      updateStatusMutation.isPending,
      handleToggleRecommended,
      handleToggleStatus,
    ],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        plan: (
          <div className={s.planCell} key={`plan-skel-${index}`}>
            <Skeleton width={140} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        type: <Skeleton width={90} height={12} />,
        period: <Skeleton width={90} height={12} />,
        air: <Skeleton width={70} height={12} />,
        price: <Skeleton width={80} height={12} />,
        recommended: <Skeleton width={110} height={20} />,
        status: <Skeleton width={80} height={20} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
        actions: (
          <div className={s.actionsCell}>
            <Skeleton width={110} height={28} />
            <Skeleton width={110} height={28} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && plans.length === 0;
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
            <Typography variant="h2">Plans</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={openCreateModal}>
            Create plan
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="plans-search"
            >
              <Input
                id="plans-search"
                placeholder="Search by code"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="plans-order">
              <Select
                id="plans-order"
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
              title="Unable to load plans"
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
            title="No plans found"
            description="Create a plan to get started."
            action={<Button onClick={openCreateModal}>Create plan</Button>}
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
        open={isCreateOpen}
        title="Create plan"
        onClose={closeCreateModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeCreateModal}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMutation.isPending}
              disabled={
                !createIsValid ||
                createMutation.isPending ||
                Boolean(
                  createErrors.code ||
                    createErrors.periodCount ||
                    createErrors.price ||
                    createErrors.air,
                )
              }
            >
              Create
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field
              label="Code"
              labelFor="plan-create-code"
              hint={'* Letters, numbers, and dashes'}
              error={createErrors.code}
            >
              <Input
                id="plan-create-code"
                size="sm"
                value={createValues.code}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    code: event.target.value,
                  }))
                }
                placeholder="starter-month"
                fullWidth
              />
            </Field>
            <Field label="Type" labelFor="plan-create-type">
              <Select
                id="plan-create-type"
                size="sm"
                options={PLAN_TYPE_OPTIONS}
                value={createValues.type}
                onChange={(value) =>
                  setCreateValues((prev) => {
                    const nextType = value as PlanType;
                    return {
                      ...prev,
                      type: nextType,
                      periodCount:
                        nextType === PlanType.Air
                          ? ''
                          : prev.periodCount || '1',
                    };
                  })
                }
                fullWidth
              />
            </Field>
          </FormRow>

          {!isAirPlan ? (
            <FormRow columns={2}>
              <Field label="Period" labelFor="plan-create-period">
                <Select
                  id="plan-create-period"
                  size="sm"
                  options={PERIOD_OPTIONS}
                  value={createValues.period}
                  onChange={(value) =>
                    setCreateValues((prev) => ({
                      ...prev,
                      period: value as PlanPeriod,
                    }))
                  }
                  fullWidth
                />
              </Field>
              <Field
                label="Period count"
                labelFor="plan-create-period-count"
                error={createErrors.periodCount}
              >
                <Input
                  id="plan-create-period-count"
                  size="sm"
                  type="number"
                  min={1}
                  step={1}
                  value={createValues.periodCount}
                  onChange={(event) =>
                    setCreateValues((prev) => ({
                      ...prev,
                      periodCount: event.target.value,
                    }))
                  }
                  fullWidth
                />
              </Field>
            </FormRow>
          ) : null}

          <FormRow columns={2}>
            <Field
              label="Price"
              labelFor="plan-create-price"
              error={createErrors.price}
            >
              <Input
                id="plan-create-price"
                size="sm"
                type="number"
                min={1}
                step={1}
                value={createValues.price}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    price: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
            <Field
              label="Air"
              labelFor="plan-create-air"
              error={createErrors.air}
            >
              <Input
                id="plan-create-air"
                size="sm"
                type="number"
                min={1}
                step={1}
                value={createValues.air}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    air: event.target.value,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <FormRow columns={2}>
            <Field label="Recommended" labelFor="plan-create-recommended">
              <Switch
                id="plan-create-recommended"
                checked={createValues.isRecommended}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    isRecommended: event.target.checked,
                  }))
                }
                label={
                  createValues.isRecommended ? 'Recommended' : 'Not recommended'
                }
              />
            </Field>
            <Field label="Status" labelFor="plan-create-status">
              <Switch
                id="plan-create-status"
                checked={createValues.isActive}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
                label={createValues.isActive ? 'Active' : 'Inactive'}
              />
            </Field>
          </FormRow>
        </Stack>
      </Modal>
    </AppShell>
  );
}
