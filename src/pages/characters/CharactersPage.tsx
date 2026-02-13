import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useCharacters, useCreateCharacter } from '@/app/characters';
import { notifyError } from '@/app/toast';
import { useLoras } from '@/app/loras';
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
  Table,
  Textarea,
  Typography,
} from '@/atoms';
import { FileUpload } from '@/components/molecules';
import { AppShell } from '@/components/templates';
import { FileDir, type IFile } from '@/common/types';

import s from './CharactersPage.module.scss';
import { LoraSelect } from './components/LoraSelect';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
};

const ORDER = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'ASC';
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

export function CharactersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();
  const createMutation = useCreateCharacter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState({
    name: '',
    emoji: '',
    gender: 'female',
    loraId: '',
    description: '',
    avatarId: '',
  });
  const [avatarFile, setAvatarFile] = useState<IFile | null>(null);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const [loraSearch, setLoraSearch] = useState('');
  const debouncedLoraSearch = useDebouncedValue(loraSearch, 300);

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

  const { data, error, isLoading, refetch } = useCharacters(queryParams);
  const loraQueryParams = useMemo(
    () => ({
      search: debouncedLoraSearch || undefined,
      order: 'DESC',
      skip: 0,
      take: 50,
    }),
    [debouncedLoraSearch],
  );
  const { data: loraData, isLoading: isLoraLoading } =
    useLoras(loraQueryParams);

  const characters = data?.data ?? [];
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
      { key: 'character', label: 'Character' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      characters.map((character) => {
        const emoji = character.emoji?.trim();
        return {
          character: (
            <div className={s.characterCell}>
              <Typography
                as="span"
                variant="control"
                tone={emoji ? 'default' : 'muted'}
                className={s.emoji}
              >
                {emoji || '-'}
              </Typography>
              <div className={s.characterInfo}>
                <Typography variant="body">{character.name}</Typography>
                <Typography variant="caption" tone="muted">
                  {character.id}
                </Typography>
              </div>
            </div>
          ),
          status: character.isActive ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="warning" outline>
              Inactive
            </Badge>
          ),
          updated: (
            <Typography variant="caption" tone="muted" className={s.alignRight}>
              {formatDate(character.updatedAt)}
            </Typography>
          ),
        };
      }),
    [characters],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        character: (
          <div className={s.characterCell} key={`character-skel-${index}`}>
            <Skeleton width={20} height={20} circle />
            <div className={s.characterInfo}>
              <Skeleton width={160} height={12} />
              <Skeleton width={90} height={10} />
            </div>
          </div>
        ),
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
  const showEmpty = !showSkeleton && !error && characters.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const loraOptions = useMemo(() => loraData?.data ?? [], [loraData?.data]);

  const createValidationErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: { name?: string; loraId?: string } = {};
    if (!createValues.name.trim()) {
      errors.name = 'Enter a name.';
    }
    if (!createValues.loraId) {
      errors.loraId = 'Select a LoRA.';
    }
    return errors;
  }, [createShowErrors, createValues.loraId, createValues.name]);

  const createIsValid = useMemo(
    () => Boolean(createValues.name.trim() && createValues.loraId),
    [createValues.loraId, createValues.name],
  );

  const openCreateModal = () => {
    setCreateValues({
      name: '',
      emoji: '',
      gender: 'female',
      loraId: '',
      description: '',
      avatarId: '',
    });
    setAvatarFile(null);
    setCreateShowErrors(false);
    setLoraSearch('');
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (createMutation.isPending) return;
    setIsCreateOpen(false);
  };

  const handleCreate = async () => {
    const errors = {
      name: createValues.name.trim() ? undefined : 'Enter a name.',
      loraId: createValues.loraId ? undefined : 'Select a LoRA.',
    };
    if (errors.name || errors.loraId) {
      setCreateShowErrors(true);
      return;
    }
    const result = await createMutation.mutateAsync({
      name: createValues.name.trim(),
      emoji: createValues.emoji.trim(),
      gender: createValues.gender.trim(),
      loraId: createValues.loraId,
      description: createValues.description.trim(),
      avatarId: createValues.avatarId,
    });
    setIsCreateOpen(false);
    if (result?.id) {
      navigate(`/characters/${result.id}`);
    }
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Characters</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={openCreateModal}>
            Create character
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="characters-search"
            >
              <Input
                id="characters-search"
                placeholder="Search by name"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Order" labelFor="characters-order">
              <Select
                id="characters-order"
                options={ORDER}
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
              title="Unable to load characters"
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
            title="No characters found"
            description="Try adjusting your search or order."
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
                      const character = characters[index];
                      if (!character) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () => navigate(`/characters/${character.id}`),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/characters/${character.id}`);
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

        <Modal
          open={isCreateOpen}
          title="Create character"
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
                      createValidationErrors.loraId,
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
                labelFor="character-create-name"
                error={createValidationErrors.name}
              >
                <Input
                  id="character-create-name"
                  size="sm"
                  value={createValues.name}
                  onChange={(event) =>
                    setCreateValues((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  fullWidth
                />
              </Field>
              <Field label="Emoji" labelFor="character-create-emoji">
                <Input
                  id="character-create-emoji"
                  size="sm"
                  value={createValues.emoji}
                  onChange={(event) =>
                    setCreateValues((prev) => ({
                      ...prev,
                      emoji: event.target.value,
                    }))
                  }
                  fullWidth
                />
              </Field>
            </FormRow>

            <FormRow columns={2}>
              <Field label="Gender" labelFor="character-create-gender">
                <Select
                  id="character-create-gender"
                  size="sm"
                  options={[
                    { label: 'Female', value: 'female' },
                    { label: 'Male', value: 'male' },
                  ]}
                  value={createValues.gender}
                  onChange={(value) =>
                    setCreateValues((prev) => ({ ...prev, gender: value }))
                  }
                  fullWidth
                />
              </Field>
            </FormRow>

            <Field
              label="LoRA"
              labelFor="character-create-lora"
              error={createValidationErrors.loraId}
            >
              <LoraSelect
                id="character-create-lora"
                value={createValues.loraId}
                options={loraOptions.map((lora) => ({
                  id: lora.id,
                  fileName: lora.fileName,
                }))}
                search={loraSearch}
                onSearchChange={setLoraSearch}
                onSelect={(value) =>
                  setCreateValues((prev) => ({ ...prev, loraId: value }))
                }
                placeholder={isLoraLoading ? 'Loading LoRAs...' : 'Select LoRA'}
                disabled={isLoraLoading}
                loading={isLoraLoading}
              />
            </Field>

            <Field label="Description" labelFor="character-create-description">
              <Textarea
                id="character-create-description"
                size="sm"
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
            <FileUpload
              label="Avatar"
              folder={FileDir.Public}
              value={avatarFile}
              onChange={(file) => {
                setAvatarFile(file);
                setCreateValues((prev) => ({
                  ...prev,
                  avatarId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload avatar.')
              }
            />
          </Stack>
        </Modal>
      </Container>
    </AppShell>
  );
}
