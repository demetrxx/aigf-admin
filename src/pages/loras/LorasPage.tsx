import { DownloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  downloadLora,
  uploadLora,
  useDeleteLora,
  useLoras,
  useUpdateLoraSeed,
} from '@/app/loras';
import { notifyError, notifySuccess } from '@/app/toast';
import { PencilLineIcon, PlusIcon } from '@/assets/icons';
import {
  Button,
  Container,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Stack,
  Table,
  Typography,
} from '@/atoms';
import type { ILora } from '@/common/types';
import { ConfirmModal } from '@/components/molecules/confirm-modal/ConfirmModal';
import { AppShell } from '@/components/templates';

import s from './LorasPage.module.scss';

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

function resolveSeed(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.floor(parsed);
}

export function LorasPage() {
  const queryClient = useQueryClient();
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

  const { data, error, isLoading, refetch } = useLoras(queryParams);
  const updateSeedMutation = useUpdateLoraSeed();
  const deleteMutation = useDeleteLora();

  const loras = data?.data ?? [];
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

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [seedInput, setSeedInput] = useState('123456');
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const resetUpload = () => {
    setUploadFile(null);
    setSeedInput('');
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const closeUploadModal = () => {
    setIsUploadOpen(false);
    resetUpload();
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    const seedValue = resolveSeed(seedInput);
    if (seedValue === null) return;

    setIsUploading(true);
    try {
      await uploadLora(
        {
          fileName: uploadFile.name,
          seed: seedValue,
        },
        uploadFile,
      );
      queryClient.invalidateQueries({ queryKey: ['loras'] });
      notifySuccess('LoRA uploaded.', 'LoRA uploaded.');
      closeUploadModal();
    } catch (uploadError) {
      notifyError(uploadError, 'Unable to upload the LoRA.');
    } finally {
      setIsUploading(false);
    }
  };

  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [seedTarget, setSeedTarget] = useState<ILora | null>(null);
  const [seedValue, setSeedValue] = useState('');

  const openSeedModal = (lora: ILora) => {
    setSeedTarget(lora);
    setSeedValue(String(lora.seed));
    setSeedModalOpen(true);
  };

  const closeSeedModal = () => {
    setSeedModalOpen(false);
    setSeedTarget(null);
    setSeedValue('');
  };

  const handleSeedSave = async () => {
    if (!seedTarget) return;
    const nextSeed = resolveSeed(seedValue);
    if (nextSeed === null) return;
    await updateSeedMutation.mutateAsync({ id: seedTarget.id, seed: nextSeed });
    closeSeedModal();
  };

  const [deleteTarget, setDeleteTarget] = useState<ILora | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const columns = useMemo(
    () => [
      { key: 'file', label: 'File' },
      { key: 'seed', label: 'Seed' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
      { key: 'actions', label: '' },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      loras.map((lora) => ({
        file: (
          <div className={s.fileCell}>
            <Typography variant="body">{lora.fileName}</Typography>
            <Typography variant="caption" tone="muted">
              {lora.id}
            </Typography>
          </div>
        ),
        seed: (
          <Typography variant="body" tone="muted">
            {lora.seed}
          </Typography>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(lora.updatedAt)}
          </Typography>
        ),
        actions: (
          <div className={s.actionsCell}>
            <IconButton
              aria-label="Download LoRA"
              icon={<DownloadIcon />}
              tooltip="Download LoRA"
              variant="ghost"
              size="sm"
              loading={downloadingId === lora.id}
              disabled={downloadingId === lora.id}
              onClick={async () => {
                if (downloadingId) return;
                setDownloadingId(lora.id);
                try {
                  await downloadLora(lora.id, lora.fileName);
                } catch (downloadError) {
                  notifyError(downloadError, 'Unable to download the LoRA.');
                } finally {
                  setDownloadingId((current) =>
                    current === lora.id ? null : current,
                  );
                }
              }}
            />
            <IconButton
              aria-label="Edit seed"
              icon={<PencilLineIcon />}
              tooltip="Edit seed"
              variant="ghost"
              size="sm"
              onClick={() => openSeedModal(lora)}
            />
            <IconButton
              aria-label="Delete LoRA"
              icon={<TrashIcon />}
              tooltip="Delete LoRA"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(lora)}
            />
          </div>
        ),
      })),
    [downloadingId, loras],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        file: (
          <div className={s.fileCell} key={`lora-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={90} height={10} />
          </div>
        ),
        seed: <Skeleton width={60} height={12} />,
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
  const showEmpty = !showSkeleton && !error && loras.length === 0;
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
            <Typography variant="h2">LoRAs</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={() => setIsUploadOpen(true)}>
            Upload LoRA
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              label="Search"
              labelFor="loras-search"
              className={s.filterField}
            >
              <Input
                id="loras-search"
                placeholder="Search by file name"
                value={searchInput}
                size="sm"
                onChange={(event) => setSearchInput(event.target.value)}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="loras-order">
              <Select
                id="loras-order"
                options={ORDER_OPTIONS}
                value={order}
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
            <Typography variant="body" tone="muted">
              {error instanceof Error ? error.message : 'Unable to load LoRAs.'}
            </Typography>
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : null}

        {showEmpty ? (
          <EmptyState
            title="No LoRAs yet"
            description="Upload a LoRA to start using it."
            action={
              <Button onClick={() => setIsUploadOpen(true)}>Upload LoRA</Button>
            }
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
                    value={String(pageSize)}
                    onChange={(value) =>
                      updateSearchParams({ pageSize: Number(value), page: 1 })
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
        open={isUploadOpen}
        title="Upload LoRA"
        onClose={closeUploadModal}
        actions={
          <div className={s.modalActions}>
            <Button
              variant="secondary"
              onClick={closeUploadModal}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              loading={isUploading}
              disabled={
                isUploading || !uploadFile || resolveSeed(seedInput) === null
              }
            >
              Upload
            </Button>
          </div>
        }
      >
        <Stack gap="16px">
          <Field label="File">
            <div className={s.filePicker}>
              <Input
                value={uploadFile?.name ?? ''}
                placeholder="No file selected"
                readOnly
                fullWidth
                size="sm"
              />
              <Button
                variant="secondary"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isUploading}
                className={s.chooseFileButton}
              >
                Choose file
              </Button>
              <input
                ref={uploadInputRef}
                type="file"
                className={s.hiddenInput}
                accept=".safetensors"
                onChange={(event) =>
                  setUploadFile(event.target.files?.[0] ?? null)
                }
              />
            </div>
          </Field>
          <Field label="Seed">
            <Input
              type="number"
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              placeholder="Enter seed"
              fullWidth
              disabled={isUploading}
            />
          </Field>
          {isUploading ? (
            <Typography variant="caption" tone="muted">
              Uploading...
            </Typography>
          ) : null}
        </Stack>
      </Modal>

      <Modal
        open={seedModalOpen}
        title="Edit seed"
        onClose={closeSeedModal}
        actions={
          <div className={s.modalActions}>
            <Button variant="secondary" onClick={closeSeedModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSeedSave}
              loading={updateSeedMutation.isPending}
              disabled={
                resolveSeed(seedValue) === null || updateSeedMutation.isPending
              }
            >
              Save
            </Button>
          </div>
        }
      >
        <Stack gap="12px">
          <Field label="Seed">
            <Input
              type="number"
              value={seedValue}
              onChange={(event) => setSeedValue(event.target.value)}
              fullWidth
            />
          </Field>
        </Stack>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete LoRA"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.fileName}? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
