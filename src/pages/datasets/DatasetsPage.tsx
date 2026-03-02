import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Cross1Icon } from '@radix-ui/react-icons';
import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { isApiRequestError } from '@/app/api/apiErrors';
import { useCreateDataset, useDatasets } from '@/app/datasets';
import { markFileUploaded, signUpload } from '@/app/files/filesApi';
import { notifyError } from '@/app/toast';
import { PlusIcon } from '@/assets/icons';
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Field,
  FormRow,
  IconButton,
  Input,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Textarea,
  Typography,
} from '@/atoms';
import {
  DatasetResolution,
  DatasetStyle,
  FileDir,
  FileStatus,
  type IDataset,
  type IFile,
} from '@/common/types';
import { Drawer } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './DatasetsPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

type CreateDatasetValues = {
  name: string;
  description: string;
  itemsCount: string;
  loraTriggerWord: string;
  resolution: DatasetResolution;
  style: DatasetStyle;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const RESOLUTION_OPTIONS = [
  { label: 'Low (1K)', value: DatasetResolution.low },
  { label: 'Medium (2K)', value: DatasetResolution.medium },
  { label: 'High (4K)', value: DatasetResolution.high },
];
const STYLE_OPTIONS = [
  { label: 'Photorealistic', value: DatasetStyle.Photorealistic },
  { label: 'Anime', value: DatasetStyle.Anime },
];
const DATASET_RESOLUTION_VALUES = new Set(Object.values(DatasetResolution));
const DATASET_STYLE_VALUES = new Set(Object.values(DatasetStyle));
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
const ACCEPTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);
const EXTENSION_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
} as const;
const MIN_ITEMS_COUNT = 1;
const MAX_ITEMS_COUNT = 100;
const MIN_REF_IMAGES = 1;
const MAX_REF_IMAGES = 5;

const EMPTY_CREATE_VALUES: CreateDatasetValues = {
  name: '',
  description: '',
  itemsCount: String(MIN_ITEMS_COUNT),
  loraTriggerWord: '',
  resolution: DatasetResolution.low,
  style: DatasetStyle.Photorealistic,
};

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

function formatStyle(value: string | null | undefined) {
  if (!value) return '-';
  return value
    .split(/[_-]/g)
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

function parseItemsCount(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

function getFileExtension(name: string) {
  const parts = name.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function isAcceptedImageFile(file: File) {
  if (ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }
  const extension = getFileExtension(file.name);
  return extension in EXTENSION_TO_MIME;
}

function resolveMimeType(file: File) {
  if (file.type) {
    return file.type;
  }
  const extension = getFileExtension(file.name);
  return (
    EXTENSION_TO_MIME[extension as keyof typeof EXTENSION_TO_MIME] ??
    'application/octet-stream'
  );
}

function resolveUploadErrorMessage(error: unknown) {
  if (isApiRequestError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Upload failed.';
}

async function uploadToPresigned(
  presigned: { url: string; fields: Record<string, string> },
  file: File,
) {
  const formData = new FormData();
  Object.entries(presigned.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  const uploadRes = await fetch(presigned.url, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    throw new Error('Upload failed.');
  }
}

function isDatasetResolution(value: string): value is DatasetResolution {
  return DATASET_RESOLUTION_VALUES.has(value as DatasetResolution);
}

function isDatasetStyle(value: string): value is DatasetStyle {
  return DATASET_STYLE_VALUES.has(value as DatasetStyle);
}

export function DatasetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [createValues, setCreateValues] =
    useState<CreateDatasetValues>(EMPTY_CREATE_VALUES);
  const [refImages, setRefImages] = useState<IFile[]>([]);
  const [isRefImageUploading, setIsRefImageUploading] = useState(false);
  const [refImageInputKey, setRefImageInputKey] = useState(0);
  const refImageInputId = useId();

  const createMutation = useCreateDataset();

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

  const { data, error, isLoading, refetch } = useDatasets(queryParams);

  const datasets = useMemo(() => data?.data ?? [], [data]);
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
      { key: 'style', label: 'Style' },
      { key: 'resolution', label: 'Resolution' },
      { key: 'items', label: <span className={s.alignRight}>Items</span> },
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
            <Typography variant="caption" tone="muted">
              {dataset.loraTriggerWord || '-'}
            </Typography>
          </div>
        ),
        style: (
          <Typography variant="body" tone="muted">
            {formatStyle(dataset.style)}
          </Typography>
        ),
        resolution: (
          <Typography variant="body" tone="muted">
            {dataset.resolution || '-'}
          </Typography>
        ),
        items: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {dataset.itemsCount.toLocaleString()}
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
        style: <Skeleton width={90} height={12} />,
        resolution: <Skeleton width={90} height={12} />,
        items: (
          <div className={s.alignRight}>
            <Skeleton width={48} height={12} />
          </div>
        ),
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

  const refImageIds = useMemo(
    () => refImages.map((file) => file.id),
    [refImages],
  );
  const parsedItemsCount = parseItemsCount(createValues.itemsCount);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: {
      name?: string;
      description?: string;
      itemsCount?: string;
      loraTriggerWord?: string;
      style?: string;
      resolution?: string;
      refImgIds?: string;
    } = {};

    if (!createValues.name.trim()) {
      errors.name = 'Enter a name.';
    }

    if (!createValues.description.trim()) {
      errors.description = 'Enter a description.';
    }

    if (
      parsedItemsCount === null ||
      parsedItemsCount < MIN_ITEMS_COUNT ||
      parsedItemsCount > MAX_ITEMS_COUNT
    ) {
      errors.itemsCount = `Enter a value between ${MIN_ITEMS_COUNT} and ${MAX_ITEMS_COUNT}.`;
    }

    if (!createValues.loraTriggerWord.trim()) {
      errors.loraTriggerWord = 'Enter a LoRA trigger word.';
    }

    if (!isDatasetStyle(createValues.style)) {
      errors.style = 'Select a style.';
    }

    if (!isDatasetResolution(createValues.resolution)) {
      errors.resolution = 'Select a resolution.';
    }

    if (
      refImageIds.length < MIN_REF_IMAGES ||
      refImageIds.length > MAX_REF_IMAGES
    ) {
      errors.refImgIds = `Upload ${MIN_REF_IMAGES}-${MAX_REF_IMAGES} reference images.`;
    }

    return errors;
  }, [
    createShowErrors,
    createValues.name,
    createValues.description,
    parsedItemsCount,
    createValues.loraTriggerWord,
    createValues.style,
    createValues.resolution,
    refImageIds.length,
  ]);

  const createIsValid = useMemo(
    () =>
      Boolean(
        createValues.name.trim() &&
        createValues.description.trim() &&
        createValues.loraTriggerWord.trim() &&
        isDatasetStyle(createValues.style) &&
        isDatasetResolution(createValues.resolution) &&
        parsedItemsCount !== null &&
        parsedItemsCount >= MIN_ITEMS_COUNT &&
        parsedItemsCount <= MAX_ITEMS_COUNT &&
        refImageIds.length >= MIN_REF_IMAGES &&
        refImageIds.length <= MAX_REF_IMAGES,
      ),
    [
      createValues.name,
      createValues.description,
      createValues.loraTriggerWord,
      createValues.style,
      createValues.resolution,
      parsedItemsCount,
      refImageIds.length,
    ],
  );

  const openCreateModal = () => {
    setCreateValues(EMPTY_CREATE_VALUES);
    setRefImages([]);
    setRefImageInputKey((prev) => prev + 1);
    setCreateShowErrors(false);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const removeRefImage = (id: string) => {
    setRefImages((prev) => prev.filter((file) => file.id !== id));
  };

  const handleAddRefImageClick = () => {
    if (
      isRefImageUploading ||
      createMutation.isPending ||
      refImages.length >= MAX_REF_IMAGES
    ) {
      return;
    }

    const element = document.getElementById(refImageInputId);
    if (element instanceof HTMLInputElement) {
      element.click();
    }
  };

  const handleRefImageFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    setRefImageInputKey((prev) => prev + 1);

    if (!file) return;
    if (refImages.length >= MAX_REF_IMAGES || isRefImageUploading) return;

    if (!isAcceptedImageFile(file)) {
      notifyError(
        new Error('Only PNG, JPG, JPEG, or WEBP files are allowed.'),
        'Unable to upload reference image.',
      );
      return;
    }

    try {
      setIsRefImageUploading(true);
      const mime = resolveMimeType(file);
      const { presigned, file: signedFile } = await signUpload({
        fileName: file.name,
        mime,
        folder: FileDir.Public,
      });

      await uploadToPresigned(presigned, file);
      const success = await markFileUploaded(signedFile.id);
      if (!success) {
        throw new Error('Unable to finalize upload.');
      }

      setRefImages((prev) => [
        ...prev,
        { ...signedFile, status: FileStatus.UPLOADED },
      ]);
    } catch (error) {
      const message = resolveUploadErrorMessage(error);
      notifyError(new Error(message), 'Unable to upload reference image.');
    } finally {
      setIsRefImageUploading(false);
    }
  };

  const handleCreate = async () => {
    const errors = {
      name: createValues.name.trim() ? undefined : 'Enter a name.',
      description: createValues.description.trim()
        ? undefined
        : 'Enter a description.',
      itemsCount:
        parsedItemsCount !== null &&
        parsedItemsCount >= MIN_ITEMS_COUNT &&
        parsedItemsCount <= MAX_ITEMS_COUNT
          ? undefined
          : `Enter a value between ${MIN_ITEMS_COUNT} and ${MAX_ITEMS_COUNT}.`,
      loraTriggerWord: createValues.loraTriggerWord.trim()
        ? undefined
        : 'Enter a LoRA trigger word.',
      style: isDatasetStyle(createValues.style) ? undefined : 'Select a style.',
      resolution: isDatasetResolution(createValues.resolution)
        ? undefined
        : 'Select a resolution.',
      refImgIds:
        refImageIds.length >= MIN_REF_IMAGES &&
        refImageIds.length <= MAX_REF_IMAGES
          ? undefined
          : `Upload ${MIN_REF_IMAGES}-${MAX_REF_IMAGES} reference images.`,
    };

    if (
      errors.name ||
      errors.description ||
      errors.itemsCount ||
      errors.loraTriggerWord ||
      errors.style ||
      errors.resolution ||
      errors.refImgIds
    ) {
      setCreateShowErrors(true);
      return;
    }

    const result = await createMutation.mutateAsync({
      name: createValues.name.trim(),
      description: createValues.description.trim(),
      itemsCount: parsedItemsCount!,
      loraTriggerWord: createValues.loraTriggerWord.trim(),
      style: createValues.style,
      resolution: createValues.resolution,
      refImgIds: refImageIds,
    });

    setIsCreateOpen(false);
    if (result?.id) {
      navigate(`/datasets/${result.id}`);
    }
  };

  const openDetails = (dataset: IDataset) => {
    navigate(`/datasets/${dataset.id}`);
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
                placeholder="Search by name or trigger word"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
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

      <Drawer
        open={isCreateOpen}
        title="New dataset"
        className={s.createDrawer}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateModal();
          } else {
            setIsCreateOpen(true);
          }
        }}
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
              label="Items count"
              labelFor="dataset-create-items-count"
              error={createValidationErrors.itemsCount}
            >
              <Input
                id="dataset-create-items-count"
                type="number"
                min={MIN_ITEMS_COUNT}
                max={MAX_ITEMS_COUNT}
                size="sm"
                value={createValues.itemsCount}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    itemsCount: event.target.value,
                  }))
                }
                placeholder={String(MIN_ITEMS_COUNT)}
                fullWidth
              />
            </Field>
          </FormRow>

          <FormRow columns={2}>
            <Field
              label="LoRA trigger word"
              labelFor="dataset-create-lora-trigger-word"
              error={createValidationErrors.loraTriggerWord}
            >
              <Input
                id="dataset-create-lora-trigger-word"
                size="sm"
                value={createValues.loraTriggerWord}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    loraTriggerWord: event.target.value,
                  }))
                }
                placeholder="char123"
                fullWidth
              />
            </Field>
            <Field
              label="Resolution"
              labelFor="dataset-create-resolution"
              error={createValidationErrors.resolution}
            >
              <Select
                id="dataset-create-resolution"
                size="sm"
                options={RESOLUTION_OPTIONS}
                value={createValues.resolution}
                onChange={(value) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    resolution: value as DatasetResolution,
                  }))
                }
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Style"
            labelFor="dataset-create-style"
            error={createValidationErrors.style}
          >
            <Select
              id="dataset-create-style"
              size="sm"
              options={STYLE_OPTIONS}
              value={createValues.style}
              onChange={(value) =>
                setCreateValues((prev) => ({
                  ...prev,
                  style: value as DatasetStyle,
                }))
              }
              fullWidth
            />
          </Field>

          <Field
            label="Description"
            labelFor="dataset-create-description"
            error={createValidationErrors.description}
          >
            <Textarea
              id="dataset-create-description"
              value={createValues.description}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Young woman, casual everyday style"
              rows={4}
              fullWidth
            />
          </Field>

          <Field
            label="Reference images"
            hint={`${refImageIds.length}/${MAX_REF_IMAGES} uploaded`}
            error={createValidationErrors.refImgIds}
          >
            <Stack gap="12px">
              <div className={s.refImageActions}>
                <IconButton
                  aria-label="Add reference image"
                  tooltip="Add reference image"
                  variant="secondary"
                  size="sm"
                  icon={<PlusIcon />}
                  onClick={handleAddRefImageClick}
                  disabled={
                    createMutation.isPending ||
                    isRefImageUploading ||
                    refImages.length >= MAX_REF_IMAGES
                  }
                />
                <Typography variant="meta" tone="muted">
                  {isRefImageUploading ? 'Uploading image...' : `Add reference`}
                </Typography>
              </div>

              {refImages.length === 0 ? (
                <div className={s.refImageEmpty}>
                  <Typography variant="caption" tone="muted">
                    No images uploaded yet.
                  </Typography>
                </div>
              ) : (
                <div className={s.refImageGrid}>
                  {refImages.map((file) => (
                    <div key={file.id} className={s.refImageCard}>
                      <div className={s.refImagePreview}>
                        {file.url ? (
                          <img
                            className={s.refImageImage}
                            src={file.url}
                            alt={file.name}
                            loading="lazy"
                          />
                        ) : (
                          <Typography variant="caption" tone="muted">
                            No preview
                          </Typography>
                        )}
                        <div className={s.refImageCardActions}>
                          <IconButton
                            aria-label="Remove reference image"
                            tooltip="Remove"
                            variant="ghost"
                            tone="danger"
                            size="sm"
                            icon={<Cross1Icon />}
                            onClick={() => removeRefImage(file.id)}
                          />
                        </div>
                      </div>
                      <Typography
                        variant="caption"
                        tone="muted"
                        className={s.refImageName}
                      >
                        {file.name}
                      </Typography>
                    </div>
                  ))}
                </div>
              )}

              <Input
                key={refImageInputKey}
                id={refImageInputId}
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={handleRefImageFileChange}
                disabled={
                  createMutation.isPending ||
                  isRefImageUploading ||
                  refImages.length >= MAX_REF_IMAGES
                }
                wrapperClassName={s.hiddenInputWrapper}
                className={s.hiddenInput}
              />
            </Stack>
          </Field>

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
              disabled={!createIsValid || createMutation.isPending}
            >
              Create
            </Button>
          </div>
        </Stack>
      </Drawer>
    </AppShell>
  );
}
