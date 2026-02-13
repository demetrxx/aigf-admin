import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { copyFile } from '@/app/files/filesApi';
import {
  createGift as createGiftApi,
  deleteGift as deleteGiftApi,
  getGiftDetails,
  getGifts,
  updateGift as updateGiftApi,
  useCreateGift,
  useGifts,
} from '@/app/gifts';
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
  Textarea,
  Typography,
} from '@/atoms';
import { FileDir, type IFile,type IGift } from '@/common/types';
import { FileUpload } from '@/components/molecules';
import { AppShell } from '@/components/templates';

import s from './GiftsPage.module.scss';
import {
  buildGiftsTransferFileName,
  buildGiftsTransferPayload,
  downloadGiftsTransferFile,
  type GiftTransferItem,
  parseGiftsTransferFile,
} from './giftTransfer';

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

function normalizeGiftName(value: string) {
  return value.trim();
}

export function GiftsPage() {
  const queryClient = useQueryClient();
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
  const [createFile, setCreateFile] = useState<IFile | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [createValues, setCreateValues] = useState({
    name: '',
    description: '',
    price: '',
    isActive: true,
    imgId: '',
  });

  const createMutation = useCreateGift();

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

  const { data, error, isLoading, refetch } = useGifts(queryParams);

  const gifts = data?.data ?? [];
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
      { key: 'gift', label: 'Gift' },
      { key: 'price', label: 'Price' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      gifts.map((gift) => ({
        gift: (
          <div className={s.giftCell}>
            <Typography variant="body">{gift.name}</Typography>
            <Typography variant="caption" tone="muted">
              {gift.id}
            </Typography>
          </div>
        ),
        price: (
          <Typography variant="body" tone="muted">
            {gift.price.toLocaleString()}
          </Typography>
        ),
        status: gift.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="warning" outline>
            Inactive
          </Badge>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(gift.updatedAt)}
          </Typography>
        ),
      })),
    [gifts],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        gift: (
          <div className={s.giftCell} key={`gift-skel-${index}`}>
            <Skeleton width={160} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        price: <Skeleton width={80} height={12} />,
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
  const showEmpty = !showSkeleton && !error && gifts.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: { name?: string; description?: string; price?: string; imgId?: string } = {};
    if (!createValues.name.trim()) {
      errors.name = 'Enter a name.';
    }
    if (!createValues.description.trim()) {
      errors.description = 'Enter a description.';
    }
    if (!createValues.price.trim()) {
      errors.price = 'Enter a price.';
    } else if (!Number.isFinite(Number(createValues.price)) || Number(createValues.price) <= 0) {
      errors.price = 'Enter a positive number.';
    }
    if (!createValues.imgId) {
      errors.imgId = 'Upload an image.';
    }
    return errors;
  }, [createShowErrors, createValues.description, createValues.imgId, createValues.name, createValues.price]);

  const createIsValid = useMemo(
    () =>
      Boolean(
        createValues.name.trim() &&
          createValues.description.trim() &&
          createValues.imgId &&
          createValues.price.trim() &&
          Number(createValues.price) > 0,
      ),
    [createValues.description, createValues.imgId, createValues.name, createValues.price],
  );

  const openCreateModal = () => {
    setCreateValues({
      name: '',
      description: '',
      price: '',
      isActive: true,
      imgId: '',
    });
    setCreateFile(null);
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
      description: createValues.description.trim()
        ? undefined
        : 'Enter a description.',
      price: createValues.price.trim()
        ? Number(createValues.price) > 0
          ? undefined
          : 'Enter a positive number.'
        : 'Enter a price.',
      imgId: createValues.imgId ? undefined : 'Upload an image.',
    };
    if (errors.name || errors.description || errors.price || errors.imgId) {
      setCreateShowErrors(true);
      return;
    }

    const result = await createMutation.mutateAsync({
      name: createValues.name.trim(),
      description: createValues.description.trim(),
      price: Number(createValues.price),
      imgId: createValues.imgId,
      isActive: createValues.isActive,
    });

    setIsCreateOpen(false);
    if (result?.id) {
      navigate(`/gifts/${result.id}`);
    }
  };

  const fetchAllGiftSummaries = useCallback(async () => {
    const all: IGift[] = [];
    let skip = 0;
    const take = 200;

    while (true) {
      const pageData = await getGifts({
        order: 'ASC',
        skip,
        take,
      });
      all.push(...pageData.data);
      skip += pageData.data.length;
      if (skip >= pageData.total || pageData.data.length === 0) {
        break;
      }
    }

    return all;
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const allGifts = await fetchAllGiftSummaries();
      const details = await Promise.all(
        allGifts.map((gift) => getGiftDetails(gift.id)),
      );
      const payload = buildGiftsTransferPayload(details);
      downloadGiftsTransferFile(payload, buildGiftsTransferFileName());
      notifySuccess('Gifts exported.', 'Gifts exported.');
    } catch (error) {
      notifyError(error, 'Unable to export gifts.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportButtonClick = () => {
    if (isImporting || isExporting) return;
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const imported = await parseGiftsTransferFile(file);

      const importedByName = new Map<string, GiftTransferItem>();
      for (const gift of imported.gifts) {
        const name = normalizeGiftName(gift.name);
        importedByName.set(name, gift);
      }

      const existing = await fetchAllGiftSummaries();
      const existingByName = new Map<string, string[]>();
      for (const gift of existing) {
        const name = normalizeGiftName(gift.name);
        if (!name) continue;
        const ids = existingByName.get(name) ?? [];
        ids.push(gift.id);
        existingByName.set(name, ids);
      }

      const ambiguousNames: string[] = [];
      for (const name of importedByName.keys()) {
        const ids = existingByName.get(name) ?? [];
        if (ids.length > 1) {
          ambiguousNames.push(name);
        }
      }
      if (ambiguousNames.length > 0) {
        throw new Error(
          `Gift names are not unique in target environment: ${ambiguousNames.join(', ')}.`,
        );
      }

      const toUpdate: Array<{ id: string; gift: GiftTransferItem }> = [];
      const toCreate: GiftTransferItem[] = [];
      for (const [name, gift] of importedByName.entries()) {
        const ids = existingByName.get(name) ?? [];
        if (ids.length === 1) {
          toUpdate.push({ id: ids[0], gift });
        } else {
          toCreate.push(gift);
        }
      }

      const importedNames = new Set(importedByName.keys());
      const toDelete = existing
        .filter((gift) => !importedNames.has(normalizeGiftName(gift.name)))
        .map((gift) => gift.id);

      const fileById = new Map<string, GiftTransferItem['img']>();
      for (const gift of imported.gifts) {
        const existingFile = fileById.get(gift.img.id);
        if (
          existingFile &&
          (existingFile.path !== gift.img.path ||
            existingFile.name !== gift.img.name ||
            existingFile.mime !== gift.img.mime ||
            existingFile.dir !== gift.img.dir)
        ) {
          throw new Error(
            `Conflicting file metadata for image id "${gift.img.id}" in import file.`,
          );
        }
        fileById.set(gift.img.id, gift.img);
      }

      for (const img of fileById.values()) {
        await copyFile({
          id: img.id,
          name: img.name,
          path: img.path,
          dir: img.dir,
          status: img.status,
          mime: img.mime,
          url: img.url ?? undefined,
        });
      }

      for (const item of toUpdate) {
        await updateGiftApi(item.id, {
          name: item.gift.name,
          description: item.gift.description,
          price: item.gift.price,
          isActive: item.gift.isActive,
          imgId: item.gift.img.id,
        });
      }

      for (const gift of toCreate) {
        await createGiftApi({
          name: gift.name,
          description: gift.description,
          price: gift.price,
          isActive: gift.isActive,
          imgId: gift.img.id,
        });
      }

      for (const id of toDelete) {
        await deleteGiftApi(id);
      }

      await queryClient.invalidateQueries({ queryKey: ['gifts'] });
      notifySuccess('Gifts imported.', 'Gifts imported.');
    } catch (error) {
      notifyError(error, 'Unable to import gifts.');
    } finally {
      setIsImporting(false);
    }
  };

  const openDetails = (gift: IGift) => {
    navigate(`/gifts/${gift.id}`);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Gifts</Typography>
          </div>
          <ButtonGroup>
            <IconButton
              aria-label="Export gifts"
              tooltip="Export gifts"
              icon={<DownloadIcon />}
              variant="ghost"
              onClick={handleExport}
              loading={isExporting}
              disabled={isImporting || createMutation.isPending}
            />
            <IconButton
              aria-label="Import gifts"
              tooltip="Import gifts"
              icon={<UploadIcon />}
              variant="ghost"
              onClick={handleImportButtonClick}
              loading={isImporting}
              disabled={isExporting || createMutation.isPending}
            />
            <Button iconLeft={<PlusIcon />} onClick={openCreateModal}>
              New gift
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
              labelFor="gifts-search"
            >
              <Input
                id="gifts-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="gifts-order">
              <Select
                id="gifts-order"
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
              title="Unable to load gifts"
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
            title="No gifts found"
            description="Create a gift to get started."
            action={<Button onClick={openCreateModal}>New gift</Button>}
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
                      const gift = gifts[index];
                      if (!gift) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => openDetails(gift),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openDetails(gift);
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
        title="New gift"
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
                  createValidationErrors.name ||
                    createValidationErrors.description ||
                    createValidationErrors.price ||
                    createValidationErrors.imgId,
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
              labelFor="gift-create-name"
              error={createValidationErrors.name}
            >
              <Input
                id="gift-create-name"
                size="sm"
                value={createValues.name}
                onChange={(event) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="Gift name"
                fullWidth
              />
            </Field>
            <Field
              label="Price"
              labelFor="gift-create-price"
              error={createValidationErrors.price}
            >
              <Input
                id="gift-create-price"
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
                placeholder="0"
                fullWidth
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="gift-create-description"
            error={createValidationErrors.description}
          >
            <Textarea
              id="gift-create-description"
              value={createValues.description}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={4}
              fullWidth
            />
          </Field>

          <Field label="Status">
            <Switch
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

          <div>
            <FileUpload
              label="Image file"
              folder={FileDir.Public}
              value={createFile}
              onChange={(file) => {
                setCreateFile(file);
                setCreateValues((prev) => ({
                  ...prev,
                  imgId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {createValidationErrors.imgId ? (
              <Typography
                variant="caption"
                tone="warning"
                className={s.fileError}
              >
                {createValidationErrors.imgId}
              </Typography>
            ) : null}
          </div>
        </Stack>
      </Modal>
    </AppShell>
  );
}
