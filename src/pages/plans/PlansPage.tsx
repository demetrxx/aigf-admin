import { MagnifyingGlassIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  createPlan as createPlanApi,
  getPlans,
  useCreatePlan,
  useDeletePlan,
  usePlans,
  useUpdatePlanStatus,
} from '@/app/plans';
import { notifyError, notifySuccess } from '@/app/toast';
import { DownloadIcon, PlusIcon, UploadIcon } from '@/assets/icons';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Container,
  EmptyState,
  Field,
  FormRow,
  IconButton,
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
import { type IPlan, type PlanItem, PlanPeriod, PlanType } from '@/common/types';
import { capitalize } from '@/common/utils';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import s from './PlansPage.module.scss';
import {
  buildPlansTransferFileName,
  buildPlansTransferPayload,
  downloadPlansTransferFile,
  parsePlansTransferFile,
} from './plansTransfer';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

type PlanItemDraft = {
  emoji: string;
  value: string;
};

type CreatePlanValues = {
  code: string;
  type: PlanType;
  period: PlanPeriod;
  periodCount: string;
  price: string;
  air: string;
  isActive: boolean;
  isRecommended: boolean;
  items: PlanItemDraft[];
};

type EditPlanValues = {
  isActive: boolean;
  isRecommended: boolean;
  items: PlanItemDraft[];
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

function getInitialCreateValues(): CreatePlanValues {
  return {
    code: '',
    type: PlanType.Subscription,
    period: PlanPeriod.Month,
    periodCount: '1',
    price: '',
    air: '',
    isActive: true,
    isRecommended: false,
    items: [],
  };
}

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

function normalizePlanItems(items: PlanItemDraft[]) {
  const normalized = items.map((item) => ({
    emoji: item.emoji.trim(),
    value: item.value.trim(),
  }));
  const hasIncomplete = normalized.some(
    (item) => (item.emoji && !item.value) || (!item.emoji && item.value),
  );
  const completeItems: PlanItem[] = normalized.filter(
    (item): item is PlanItem => Boolean(item.emoji && item.value),
  );
  return { completeItems, hasIncomplete };
}

function toPlanItemDrafts(items: IPlan['items']) {
  return (items ?? []).map((item) => ({
    emoji: item.emoji ?? '',
    value: item.value ?? '',
  }));
}

function formatPlanItemsCount(items: IPlan['items']) {
  const count = items?.length ?? 0;
  if (count === 0) return '-';
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

function normalizePlanCode(value: string) {
  return value.trim();
}

export function PlansPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
  const deleteMutation = useDeletePlan();

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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IPlan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IPlan | null>(null);
  const [createValues, setCreateValues] =
    useState<CreatePlanValues>(getInitialCreateValues);
  const [editValues, setEditValues] = useState<EditPlanValues>({
    isActive: false,
    isRecommended: false,
    items: [],
  });
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [editShowErrors, setEditShowErrors] = useState(false);
  const isAirPlan = createValues.type === PlanType.Air;
  const isEditAirPlan = editTarget?.type === PlanType.Air;
  const createItemsHasIncomplete = useMemo(
    () =>
      isAirPlan ? false : normalizePlanItems(createValues.items).hasIncomplete,
    [isAirPlan, createValues.items],
  );
  const createItemErrors = useMemo(
    () =>
      createValues.items.map((item) => {
        const emoji = item.emoji.trim();
        const value = item.value.trim();
        return {
          emoji:
            createShowErrors && !emoji && value ? 'Enter an emoji.' : undefined,
          value: createShowErrors && emoji && !value ? 'Enter text.' : undefined,
        };
      }),
    [createShowErrors, createValues.items],
  );
  const editItemsHasIncomplete = useMemo(
    () =>
      !editTarget || isEditAirPlan
        ? false
        : normalizePlanItems(editValues.items).hasIncomplete,
    [editTarget, isEditAirPlan, editValues.items],
  );
  const editItemErrors = useMemo(
    () =>
      editValues.items.map((item) => {
        const emoji = item.emoji.trim();
        const value = item.value.trim();
        return {
          emoji: editShowErrors && !emoji && value ? 'Enter an emoji.' : undefined,
          value: editShowErrors && emoji && !value ? 'Enter text.' : undefined,
        };
      }),
    [editShowErrors, editValues.items],
  );

  const createErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: {
      code?: string;
      periodCount?: string;
      price?: string;
      air?: string;
      items?: string;
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
    if (createItemsHasIncomplete) {
      errors.items = 'Complete or remove partially filled plan items.';
    }
    return errors;
  }, [
    createShowErrors,
    createValues.code,
    createValues.periodCount,
    createValues.price,
    createValues.air,
    isAirPlan,
    createItemsHasIncomplete,
  ]);

  const createIsValid = useMemo(() => {
    const code = createValues.code.trim();
    return Boolean(
      code &&
      CODE_PATTERN.test(code) &&
      (isAirPlan || parsePositiveInteger(createValues.periodCount)) &&
      parsePositiveInteger(createValues.price) &&
      parsePositiveInteger(createValues.air) &&
      !createItemsHasIncomplete,
    );
  }, [
    createValues.air,
    createValues.code,
    createValues.periodCount,
    createValues.price,
    isAirPlan,
    createItemsHasIncomplete,
  ]);
  const editErrors = useMemo(() => {
    if (!editShowErrors || isEditAirPlan || !editTarget) return {};
    return {
      items: editItemsHasIncomplete
        ? 'Complete or remove partially filled plan items.'
        : undefined,
    };
  }, [editShowErrors, isEditAirPlan, editTarget, editItemsHasIncomplete]);

  const editIsValid = useMemo(
    () => Boolean(editTarget && !editItemsHasIncomplete),
    [editTarget, editItemsHasIncomplete],
  );

  const openCreateModal = () => {
    setCreateValues(getInitialCreateValues());
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const openEditModal = useCallback((plan: IPlan) => {
    setEditTarget(plan);
    setEditValues({
      isActive: plan.isActive,
      isRecommended: plan.isRecommended,
      items: toPlanItemDrafts(plan.items),
    });
    setEditShowErrors(false);
  }, []);

  const closeEditModal = () => {
    if (updateStatusMutation.isPending) return;
    setEditTarget(null);
    setEditShowErrors(false);
  };

  const handleAddCreateItem = () => {
    setCreateValues((prev) => ({
      ...prev,
      items: [...prev.items, { emoji: '', value: '' }],
    }));
  };

  const handleRemoveCreateItem = (index: number) => {
    setCreateValues((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleChangeCreateItem = (
    index: number,
    key: keyof PlanItemDraft,
    value: string,
  ) => {
    setCreateValues((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const handleAddEditItem = () => {
    setEditValues((prev) => ({
      ...prev,
      items: [...prev.items, { emoji: '', value: '' }],
    }));
  };

  const handleRemoveEditItem = (index: number) => {
    setEditValues((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleChangeEditItem = (
    index: number,
    key: keyof PlanItemDraft,
    value: string,
  ) => {
    setEditValues((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const handleCreate = async () => {
    const code = createValues.code.trim();
    const periodCount = parsePositiveInteger(createValues.periodCount);
    const price = parsePositiveInteger(createValues.price);
    const air = parsePositiveInteger(createValues.air);
    const { completeItems, hasIncomplete } = isAirPlan
      ? { completeItems: [] as PlanItem[], hasIncomplete: false }
      : normalizePlanItems(createValues.items);
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
      items: hasIncomplete
        ? 'Complete or remove partially filled plan items.'
        : undefined,
    };
    if (errors.code || errors.periodCount || errors.price || errors.air || errors.items) {
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
      ...(completeItems.length > 0 ? { items: completeItems } : {}),
    });
    setIsCreateOpen(false);
  };

  const handleUpdatePlan = async () => {
    if (!editTarget) return;
    const { completeItems, hasIncomplete } = isEditAirPlan
      ? { completeItems: [] as PlanItem[], hasIncomplete: false }
      : normalizePlanItems(editValues.items);
    if (hasIncomplete) {
      setEditShowErrors(true);
      return;
    }

    await updateStatusMutation.mutateAsync({
      id: editTarget.id,
      payload: {
        isActive: editValues.isActive,
        isRecommended: editValues.isRecommended,
        ...(isEditAirPlan ? {} : { items: completeItems }),
      },
      successTitle: 'Plan updated.',
      successDescription: 'Plan updated.',
    });
    setEditTarget(null);
  };

  const handleDeletePlan = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
    setEditTarget((current) =>
      current?.id === deleteTarget.id ? null : current,
    );
  };

  const fetchAllPlans = useCallback(async () => {
    const allPlans: IPlan[] = [];
    let skip = 0;
    const take = 200;

    while (true) {
      const pageData = await getPlans({
        order: 'ASC',
        skip,
        take,
      });
      allPlans.push(...pageData.data);
      skip += pageData.data.length;
      if (skip >= pageData.total || pageData.data.length === 0) {
        break;
      }
    }

    return allPlans;
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const allPlans = await fetchAllPlans();
      const payload = buildPlansTransferPayload(allPlans);
      downloadPlansTransferFile(payload, buildPlansTransferFileName());
      notifySuccess('Plans exported.', 'Plans exported.');
    } catch (error) {
      notifyError(error, 'Unable to export plans.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportButtonClick = () => {
    if (isImporting || isExporting || createMutation.isPending) return;
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const imported = await parsePlansTransferFile(file);
      const existingPlans = await fetchAllPlans();

      const existingCodes = new Set(
        existingPlans.map((plan) => normalizePlanCode(plan.code)),
      );
      const conflictingCodes = imported.plans
        .map((plan) => normalizePlanCode(plan.code))
        .filter((code) => existingCodes.has(code));

      if (conflictingCodes.length > 0) {
        throw new Error(
          `Plan codes already exist in target environment: ${Array.from(new Set(conflictingCodes)).join(', ')}.`,
        );
      }

      for (const plan of imported.plans) {
        await createPlanApi({
          code: normalizePlanCode(plan.code),
          type: plan.type,
          ...(plan.type === PlanType.Air
            ? {}
            : {
                period: plan.period!,
                periodCount: plan.periodCount!,
              }),
          price: plan.price,
          air: plan.air,
          isActive: plan.isActive,
          isRecommended: plan.isRecommended,
          ...(plan.type === PlanType.Air
            ? {}
            : plan.items && plan.items.length > 0
              ? { items: plan.items }
              : {}),
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      notifySuccess('Plans imported.', 'Plans imported.');
    } catch (error) {
      notifyError(error, 'Unable to import plans.');
    } finally {
      setIsImporting(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'plan', label: 'Plan' },
      { key: 'type', label: 'Type' },
      { key: 'period', label: 'Period' },
      { key: 'items', label: 'Items' },
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
        const isUpdatingPlan =
          updateStatusMutation.isPending && editTarget?.id === plan.id;
        const isDeletingPlan =
          deleteMutation.isPending && deleteTarget?.id === plan.id;
        const isActionPending =
          updateStatusMutation.isPending || deleteMutation.isPending;
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
          items: (
            <Typography variant="body" tone="muted">
              {formatPlanItemsCount(plan.items)}
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
              <IconButton
                size="sm"
                variant="ghost"
                icon={<Pencil1Icon />}
                aria-label={`Update ${plan.code}`}
                tooltip="Update plan"
                onClick={() => openEditModal(plan)}
                loading={isUpdatingPlan}
                disabled={isActionPending}
              />
              <IconButton
                size="sm"
                variant="ghost"
                icon={<TrashIcon />}
                aria-label={`Delete ${plan.code}`}
                tooltip="Delete plan"
                onClick={() => setDeleteTarget(plan)}
                loading={isDeletingPlan}
                disabled={isActionPending}
              />
            </div>
          ),
        };
      }),
    [
      plans,
      editTarget,
      deleteTarget,
      deleteMutation.isPending,
      updateStatusMutation.isPending,
      openEditModal,
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
        items: <Skeleton width={70} height={12} />,
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
            <Skeleton width={28} height={28} />
            <Skeleton width={28} height={28} />
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
          <ButtonGroup>
            <IconButton
              aria-label="Export plans"
              tooltip="Export plans"
              icon={<DownloadIcon />}
              variant="ghost"
              onClick={handleExport}
              loading={isExporting}
              disabled={isImporting || createMutation.isPending}
            />
            <IconButton
              aria-label="Import plans"
              tooltip="Import plans"
              icon={<UploadIcon />}
              variant="ghost"
              onClick={handleImportButtonClick}
              loading={isImporting}
              disabled={isExporting || createMutation.isPending}
            />
            <Button
              iconLeft={<PlusIcon />}
              onClick={openCreateModal}
              disabled={isImporting}
            >
              Create plan
            </Button>
          </ButtonGroup>
          <input
            ref={importInputRef}
            className={s.hiddenInput}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFileChange}
          />
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
                    createErrors.air ||
                    createErrors.items,
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
                      items: nextType === PlanType.Air ? [] : prev.items,
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

          {!isAirPlan ? (
            <div className={s.itemsSection}>
              <div className={s.itemsHeader}>
                <Typography variant="meta">Plan items</Typography>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddCreateItem}
                  disabled={createMutation.isPending}
                >
                  Add item
                </Button>
              </div>

              {createValues.items.length > 0 ? (
                <div className={s.itemsList}>
                  {createValues.items.map((item, index) => (
                    <div className={s.itemRow} key={`plan-item-${index}`}>
                      <Field
                        label="Emoji"
                        labelFor={`plan-create-item-emoji-${index}`}
                        error={createItemErrors[index]?.emoji}
                      >
                        <Input
                          id={`plan-create-item-emoji-${index}`}
                          size="sm"
                          placeholder=":sparkles:"
                          value={item.emoji}
                          onChange={(event) =>
                            handleChangeCreateItem(
                              index,
                              'emoji',
                              event.target.value,
                            )
                          }
                          fullWidth
                        />
                      </Field>
                      <Field
                        label="Text"
                        labelFor={`plan-create-item-text-${index}`}
                        error={createItemErrors[index]?.value}
                      >
                        <Input
                          id={`plan-create-item-text-${index}`}
                          size="sm"
                          placeholder="Unlimited chats"
                          value={item.value}
                          onChange={(event) =>
                            handleChangeCreateItem(
                              index,
                              'value',
                              event.target.value,
                            )
                          }
                          fullWidth
                        />
                      </Field>
                      <div className={s.itemAction}>
                        <Button
                          size="sm"
                          variant="outline"
                          tone="warning"
                          onClick={() => handleRemoveCreateItem(index)}
                          disabled={createMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Typography
                  variant="caption"
                  tone="muted"
                  className={s.itemsEmptyHint}
                >
                  Optional. Add short plan highlights for client display.
                </Typography>
              )}

              {createErrors.items ? (
                <Typography variant="caption" tone="warning">
                  {createErrors.items}
                </Typography>
              ) : null}
            </div>
          ) : null}

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

      <Modal
        open={Boolean(editTarget)}
        title="Update plan"
        onClose={closeEditModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeEditModal}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePlan}
              loading={updateStatusMutation.isPending}
              disabled={
                !editIsValid ||
                updateStatusMutation.isPending ||
                Boolean(editErrors.items)
              }
            >
              Update
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <FormRow columns={2}>
            <Field label="Recommended" labelFor="plan-edit-recommended">
              <Switch
                id="plan-edit-recommended"
                checked={editValues.isRecommended}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    isRecommended: event.target.checked,
                  }))
                }
                label={editValues.isRecommended ? 'Recommended' : 'Not recommended'}
              />
            </Field>
            <Field label="Status" labelFor="plan-edit-status">
              <Switch
                id="plan-edit-status"
                checked={editValues.isActive}
                onChange={(event) =>
                  setEditValues((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }))
                }
                label={editValues.isActive ? 'Active' : 'Inactive'}
              />
            </Field>
          </FormRow>

          {!isEditAirPlan ? (
            <div className={s.itemsSection}>
              <div className={s.itemsHeader}>
                <Typography variant="meta">Plan items</Typography>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddEditItem}
                  disabled={updateStatusMutation.isPending}
                >
                  Add item
                </Button>
              </div>

              {editValues.items.length > 0 ? (
                <div className={s.itemsList}>
                  {editValues.items.map((item, index) => (
                    <div className={s.itemRow} key={`plan-edit-item-${index}`}>
                      <Field
                        label="Emoji"
                        labelFor={`plan-edit-item-emoji-${index}`}
                        error={editItemErrors[index]?.emoji}
                      >
                        <Input
                          id={`plan-edit-item-emoji-${index}`}
                          size="sm"
                          placeholder=":sparkles:"
                          value={item.emoji}
                          onChange={(event) =>
                            handleChangeEditItem(index, 'emoji', event.target.value)
                          }
                          fullWidth
                        />
                      </Field>
                      <Field
                        label="Text"
                        labelFor={`plan-edit-item-text-${index}`}
                        error={editItemErrors[index]?.value}
                      >
                        <Input
                          id={`plan-edit-item-text-${index}`}
                          size="sm"
                          placeholder="Unlimited chats"
                          value={item.value}
                          onChange={(event) =>
                            handleChangeEditItem(index, 'value', event.target.value)
                          }
                          fullWidth
                        />
                      </Field>
                      <div className={s.itemAction}>
                        <Button
                          size="sm"
                          variant="outline"
                          tone="warning"
                          onClick={() => handleRemoveEditItem(index)}
                          disabled={updateStatusMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Typography
                  variant="caption"
                  tone="muted"
                  className={s.itemsEmptyHint}
                >
                  Optional. Add short plan highlights for client display.
                </Typography>
              )}

              {editErrors.items ? (
                <Typography variant="caption" tone="warning">
                  {editErrors.items}
                </Typography>
              ) : null}
            </div>
          ) : (
            <Typography variant="caption" tone="muted" className={s.itemsEmptyHint}>
              Items are available for subscription plans only.
            </Typography>
          )}
        </Stack>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete plan?"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.code}? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDeletePlan}
        onClose={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
