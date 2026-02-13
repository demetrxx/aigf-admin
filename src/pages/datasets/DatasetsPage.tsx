import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCreateDataset, useDatasets } from '@/app/datasets';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
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
  Table,
  Textarea,
  Typography,
} from '@/atoms';
import { DatasetType, type IDatasetDetails } from '@/common/types';
import { capitalize } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './DatasetsPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  type?: string;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_TYPE_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 400;

const DATASET_TYPE_OPTIONS = [
  { label: 'All', value: 'all' },
  ...Object.values(DatasetType).map((value) => ({
    label: capitalize(value),
    value,
  })),
];

const CREATE_TYPE_OPTIONS = Object.values(DatasetType).map((value) => ({
  label: capitalize(value),
  value,
}));

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

function resolveTypeFilter(value: string | null) {
  if (value && Object.values(DatasetType).includes(value as DatasetType)) {
    return value;
  }
  return DEFAULT_TYPE_FILTER;
}

export function DatasetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawType = searchParams.get('type');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [createValues, setCreateValues] = useState({
    name: '',
    type: DatasetType.Character,
    description: '',
  });

  const createMutation = useCreateDataset();

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
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
    const type = typeFilter === 'all' ? undefined : (typeFilter as DatasetType);
    return {
      search: normalizedSearch || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
      type,
    };
  }, [normalizedSearch, order, page, pageSize, typeFilter]);

  const { data, error, isLoading, refetch } = useDatasets(queryParams);

  const datasets = data?.data ?? [];
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
      { key: 'dataset', label: 'Dataset' },
      { key: 'type', label: 'Type' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      datasets.map((dataset) => ({
        dataset: (
          <div className={s.datasetCell}>
            <Typography variant="body">{dataset.name}</Typography>
            <Typography variant="caption" tone="muted">
              {dataset.id}
            </Typography>
          </div>
        ),
        type: (
          <Typography variant="body" tone="muted">
            {capitalize(dataset.type)}
          </Typography>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(dataset.updatedAt)}
          </Typography>
        ),
      })),
    [datasets],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        dataset: (
          <div className={s.datasetCell} key={`dataset-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        type: <Skeleton width={80} height={12} />,
        updated: (
          <div className={s.alignRight}>
            <Skeleton width={120} height={12} />
          </div>
        ),
      })),
    [],
  );

  const showSkeleton = isLoading && !data;
  const showEmpty = !showSkeleton && !error && datasets.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: { name?: string; type?: string } = {};
    if (!createValues.name.trim()) {
      errors.name = 'Enter a name.';
    }
    if (!createValues.type) {
      errors.type = 'Select a type.';
    }
    return errors;
  }, [createShowErrors, createValues.name, createValues.type]);

  const createIsValid = useMemo(
    () => Boolean(createValues.name.trim() && createValues.type),
    [createValues.name, createValues.type],
  );

  const openCreateModal = () => {
    setCreateValues({
      name: '',
      type: DatasetType.Character,
      description: '',
    });
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const handleCreate = async () => {
    const errors = {
      name: createValues.name.trim() ? undefined : 'Enter a name.',
      type: createValues.type ? undefined : 'Select a type.',
    };
    if (errors.name || errors.type) {
      setCreateShowErrors(true);
      return;
    }
    const result = await createMutation.mutateAsync({
      name: createValues.name.trim(),
      type: createValues.type,
      description: createValues.description.trim() || undefined,
    });
    setIsCreateOpen(false);
    if (result?.id) {
      navigate(`/datasets/${result.id}`, { state: { dataset: result } });
    }
  };

  const openDetails = (dataset: IDatasetDetails) => {
    navigate(`/datasets/${dataset.id}`, { state: { dataset } });
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Datasets</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={openCreateModal}>
            New dataset
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="datasets-search"
            >
              <Input
                id="datasets-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Type" labelFor="datasets-type">
              <Select
                id="datasets-type"
                options={DATASET_TYPE_OPTIONS}
                value={typeFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ type: value, page: 1 })
                }
              />
            </Field>
            <Field label="Order" labelFor="datasets-order">
              <Select
                id="datasets-order"
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
              title="Unable to load datasets"
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
            title="No datasets found"
            description="Adjust your filters to see results."
            action={<Button onClick={openCreateModal}>New dataset</Button>}
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
                      const dataset = datasets[index];
                      if (!dataset) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openDetails(dataset),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(dataset);
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

      <Modal
        open={isCreateOpen}
        title="New dataset"
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
                  createValidationErrors.name || createValidationErrors.type,
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
              label="Name"
              labelFor="dataset-create-name"
              error={createValidationErrors.name}
            >
              <Input
                id="dataset-create-name"
                size="sm"
                value={createValues.name}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Dataset name"
                fullWidth
              />
            </Field>
            <Field
              label="Type"
              labelFor="dataset-create-type"
              error={createValidationErrors.type}
            >
              <Select
                id="dataset-create-type"
                size="sm"
                options={CREATE_TYPE_OPTIONS}
                value={createValues.type}
                onChange={(value) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    type: value as DatasetType,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <Field label="Description" labelFor="dataset-create-description">
            <Textarea
              id="dataset-create-description"
              value={createValues.description}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Optional description"
              rows={4}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>
    </AppShell>
  );
}
