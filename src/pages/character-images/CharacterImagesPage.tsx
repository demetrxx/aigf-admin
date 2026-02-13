import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  useCharacterImages,
  useCreateCharacterImage,
} from '@/app/character-images';
import { useCharacterDetails, useCharacters } from '@/app/characters';
import { notifyError } from '@/app/toast';
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
  Pagination,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Textarea,
  Typography,
} from '@/atoms';
import {
  FileDir,
  type IFile,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import { Drawer, FileUpload } from '@/components/molecules';
import { AppShell } from '@/components/templates';
import { SearchSelect } from '@/pages/generations/components/SearchSelect';

import s from './CharacterImagesPage.module.scss';

type QueryUpdate = {
  search?: string;
  order?: string;
  page?: number;
  pageSize?: number;
  isPregenerated?: string;
  isPromotional?: string;
  characterId?: string;
  scenarioId?: string;
  stage?: string;
};

const ORDER_OPTIONS = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' },
];

const ORDER_VALUES = new Set(ORDER_OPTIONS.map((option) => option.value));
const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_ORDER = 'DESC';
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PREG_FILTER = 'true';
const DEFAULT_PROMO_FILTER = 'all';
const DEFAULT_STAGE_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 400;

const PREG_FILTER_OPTIONS = [
  { label: 'Pregenerated', value: 'true' },
  { label: 'Generated', value: 'false' },
  { label: 'All', value: 'all' },
];

const PROMO_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Promotional', value: 'true' },
  { label: 'Regular', value: 'false' },
];

const STAGE_LABELS: Record<RoleplayStage, string> = {
  [RoleplayStage.Acquaintance]: 'Acquaintance',
  [RoleplayStage.Flirting]: 'Flirting',
  [RoleplayStage.Seduction]: 'Seduction',
  [RoleplayStage.Resistance]: 'Resistance',
  [RoleplayStage.Undressing]: 'Undressing',
  [RoleplayStage.Prelude]: 'Prelude',
  [RoleplayStage.Sex]: 'Sex',
  [RoleplayStage.Aftercare]: 'Aftercare',
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

function resolveBooleanFilter(value: string | null, fallback: string) {
  if (value === 'true' || value === 'false' || value === 'all') return value;
  return fallback;
}

function resolveStageFilter(value: string | null) {
  if (!value || value === DEFAULT_STAGE_FILTER) return DEFAULT_STAGE_FILTER;
  if (STAGES_IN_ORDER.includes(value as RoleplayStage)) {
    return value;
  }
  return DEFAULT_STAGE_FILTER;
}

function formatStage(value: RoleplayStage | null | undefined) {
  if (!value) return '-';
  return STAGE_LABELS[value] ?? value;
}

export function CharacterImagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSearch = searchParams.get('search') ?? '';
  const rawOrder = searchParams.get('order');
  const rawPage = searchParams.get('page');
  const rawPageSize = searchParams.get('pageSize');
  const rawIsPregenerated = searchParams.get('isPregenerated');
  const rawIsPromotional = searchParams.get('isPromotional');
  const rawCharacterId = searchParams.get('characterId') ?? '';
  const rawScenarioId = searchParams.get('scenarioId') ?? '';
  const rawStage = searchParams.get('stage');

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();

  const order = ORDER_VALUES.has(rawOrder ?? '') ? rawOrder! : DEFAULT_ORDER;
  const page = parsePositiveNumber(rawPage, 1);
  const pageSize = parsePageSize(rawPageSize);
  const pregFilter = resolveBooleanFilter(
    rawIsPregenerated,
    DEFAULT_PREG_FILTER,
  );
  const promoFilter = resolveBooleanFilter(
    rawIsPromotional,
    DEFAULT_PROMO_FILTER,
  );
  const characterFilter = rawCharacterId;
  const scenarioFilter = rawScenarioId;
  const stageFilter = resolveStageFilter(rawStage);

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

      if (update.isPregenerated !== undefined) {
        if (update.isPregenerated) {
          next.set('isPregenerated', update.isPregenerated);
        } else {
          next.delete('isPregenerated');
        }
      }

      if (update.isPromotional !== undefined) {
        if (
          update.isPromotional &&
          update.isPromotional !== DEFAULT_PROMO_FILTER
        ) {
          next.set('isPromotional', update.isPromotional);
        } else {
          next.delete('isPromotional');
        }
      }

      if (update.characterId !== undefined) {
        if (update.characterId) {
          next.set('characterId', update.characterId);
        } else {
          next.delete('characterId');
        }
      }

      if (update.scenarioId !== undefined) {
        if (update.scenarioId) {
          next.set('scenarioId', update.scenarioId);
        } else {
          next.delete('scenarioId');
        }
      }

      if (update.stage !== undefined) {
        if (update.stage && update.stage !== DEFAULT_STAGE_FILTER) {
          next.set('stage', update.stage);
        } else {
          next.delete('stage');
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

  useEffect(() => {
    if (rawIsPregenerated !== null) return;
    updateSearchParams({ isPregenerated: DEFAULT_PREG_FILTER }, true);
  }, [rawIsPregenerated, updateSearchParams]);

  const {
    data: filterCharacterDetails,
    isLoading: isFilterCharacterLoading,
  } = useCharacterDetails(characterFilter || null);

  useEffect(() => {
    if (!scenarioFilter) return;
    if (!characterFilter) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
      return;
    }
    if (!filterCharacterDetails) return;
    const exists = filterCharacterDetails.scenarios.some(
      (scenario) => scenario.id === scenarioFilter,
    );
    if (!exists) {
      updateSearchParams({ scenarioId: '', page: 1 }, true);
    }
  }, [
    characterFilter,
    filterCharacterDetails,
    scenarioFilter,
    updateSearchParams,
  ]);

  const queryParams = useMemo(() => {
    const isPregenerated =
      pregFilter === 'all' ? undefined : pregFilter === 'true';
    const isPromotional =
      promoFilter === 'all' ? undefined : promoFilter === 'true';
    const stage = stageFilter === DEFAULT_STAGE_FILTER ? undefined : stageFilter;
    return {
      search: normalizedSearch || undefined,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
      isPregenerated,
      isPromotional,
      characterId: characterFilter || undefined,
      scenarioId: scenarioFilter || undefined,
      stage: stage as RoleplayStage | undefined,
    };
  }, [
    characterFilter,
    normalizedSearch,
    order,
    page,
    pageSize,
    pregFilter,
    promoFilter,
    scenarioFilter,
    stageFilter,
  ]);

  const { data, error, isLoading, refetch } = useCharacterImages(queryParams);
  const createMutation = useCreateCharacterImage();

  const images = data?.data ?? [];
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

  const [characterSearch, setCharacterSearch] = useState('');
  const debouncedCharacterSearch = useDebouncedValue(characterSearch, 300);
  const [drawerCharacterSearch, setDrawerCharacterSearch] = useState('');
  const debouncedDrawerSearch = useDebouncedValue(drawerCharacterSearch, 300);

  const characterQueryParams = useMemo(
    () => ({
      search: debouncedCharacterSearch || undefined,
      order: 'ASC',
      skip: 0,
      take: 20,
    }),
    [debouncedCharacterSearch],
  );

  const drawerCharacterQueryParams = useMemo(
    () => ({
      search: debouncedDrawerSearch || undefined,
      order: 'ASC',
      skip: 0,
      take: 20,
    }),
    [debouncedDrawerSearch],
  );

  const { data: characterData, isLoading: isCharactersLoading } =
    useCharacters(characterQueryParams);
  const { data: drawerCharacterData, isLoading: isDrawerCharactersLoading } =
    useCharacters(drawerCharacterQueryParams);

  const characterOptions = useMemo(
    () =>
      (characterData?.data ?? []).map((character) => ({
        id: character.id,
        label: character.name,
        meta: character.id,
      })),
    [characterData?.data],
  );

  const drawerCharacterOptions = useMemo(
    () =>
      (drawerCharacterData?.data ?? []).map((character) => ({
        id: character.id,
        label: character.name,
        meta: character.id,
      })),
    [drawerCharacterData?.data],
  );

  const filterCharacterOptions = useMemo(
    () => [{ id: '', label: 'All characters' }, ...characterOptions],
    [characterOptions],
  );

  const filterScenarioOptions = useMemo(
    () => [
      { label: 'All scenarios', value: '' },
      ...(filterCharacterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name || 'Untitled',
        value: scenario.id,
      })),
    ],
    [filterCharacterDetails?.scenarios],
  );

  const filterStageOptions = useMemo(
    () => [
      { label: 'All stages', value: DEFAULT_STAGE_FILTER },
      ...STAGES_IN_ORDER.map((stage) => ({
        label: formatStage(stage),
        value: stage,
      })),
    ],
    [],
  );

  const columns = useMemo(
    () => [
      { key: 'image', label: 'Image' },
      { key: 'character', label: 'Character' },
      { key: 'flags', label: 'Flags' },
      { key: 'updated', label: <span className={s.alignRight}>Updated</span> },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      images.map((image) => ({
        image: (
          <div className={s.imageCell}>
            <Typography variant="body">
              {image.description || 'Untitled image'}
            </Typography>
            <Typography variant="caption" tone="muted">
              {image.scenario?.name || '-'} · {formatStage(image.stage)}
            </Typography>
          </div>
        ),
        character: (
          <div className={s.characterCell}>
            <Typography variant="body">{image.character?.name}</Typography>
            <Typography variant="caption" tone="muted">
              {image.character?.id}
            </Typography>
          </div>
        ),
        flags: (
          <div className={s.badges}>
            <Badge
              tone={image.isPregenerated ? 'accent' : 'warning'}
              outline={!image.isPregenerated}
            >
              {image.isPregenerated ? 'Pregenerated' : 'Generated'}
            </Badge>
            <Badge
              tone={image.isPromotional ? 'warning' : 'accent'}
              outline={!image.isPromotional}
            >
              {image.isPromotional ? 'Promotional' : 'Regular'}
            </Badge>
          </div>
        ),
        updated: (
          <Typography variant="caption" tone="muted" className={s.alignRight}>
            {formatDate(image.updatedAt)}
          </Typography>
        ),
      })),
    [images],
  );

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => ({
        image: (
          <div className={s.imageCell} key={`image-skel-${index}`}>
            <Skeleton width={180} height={12} />
            <Skeleton width={120} height={10} />
          </div>
        ),
        character: (
          <div className={s.characterCell}>
            <Skeleton width={140} height={12} />
            <Skeleton width={110} height={10} />
          </div>
        ),
        flags: (
          <div className={s.badges}>
            <Skeleton width={70} height={20} />
            <Skeleton width={90} height={20} />
            <Skeleton width={110} height={20} />
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
  const showEmpty = !showSkeleton && !error && images.length === 0;
  const showTable = !showEmpty && !error;
  const showFooter = showTable && !showSkeleton;

  const rangeStart = total === 0 ? 0 : effectiveSkip + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(effectiveSkip + effectiveTake, total);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [createValues, setCreateValues] = useState({
    characterId: '',
    scenarioId: '',
    stage: '' as RoleplayStage | '',
    description: '',
    isPromotional: false,
    fileId: '',
  });
  const [mainFile, setMainFile] = useState<IFile | null>(null);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const { data: selectedCharacterDetails } = useCharacterDetails(
    createValues.characterId || null,
  );

  const scenarioOptions = useMemo(
    () =>
      (selectedCharacterDetails?.scenarios ?? []).map((scenario) => ({
        label: scenario.name,
        value: scenario.id,
      })),
    [selectedCharacterDetails?.scenarios],
  );

  const stageOptions = useMemo(
    () =>
      STAGES_IN_ORDER.map((stage) => ({
        label: formatStage(stage),
        value: stage,
      })),
    [],
  );

  const openCreateDrawer = () => {
    setCreateValues({
      characterId: '',
      scenarioId: '',
      stage: '',
      description: '',
      isPromotional: false,
      fileId: '',
    });
    setMainFile(null);
    setCreateShowErrors(false);
    setIsDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    if (createMutation.isPending) return;
    setIsDrawerOpen(false);
  };

  const createErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: {
      characterId?: string;
      scenarioId?: string;
      stage?: string;
      description?: string;
      fileId?: string;
    } = {};
    if (!createValues.characterId) {
      errors.characterId = 'Select a character.';
    }
    if (!createValues.scenarioId) {
      errors.scenarioId = 'Select a scenario.';
    }
    if (!createValues.stage) {
      errors.stage = 'Select a stage.';
    }
    if (!createValues.description.trim()) {
      errors.description = 'Enter a description.';
    }
    if (!createValues.fileId) {
      errors.fileId = 'Upload an image.';
    }
    return errors;
  }, [
    createShowErrors,
    createValues.characterId,
    createValues.scenarioId,
    createValues.stage,
    createValues.description,
    createValues.fileId,
  ]);

  const createIsValid = useMemo(
    () =>
      Boolean(
        createValues.characterId &&
        createValues.scenarioId &&
        createValues.stage &&
        createValues.description.trim() &&
        createValues.fileId,
      ),
    [
      createValues.characterId,
      createValues.scenarioId,
      createValues.stage,
      createValues.description,
      createValues.fileId,
    ],
  );

  const handleCreate = async () => {
    const errors = {
      characterId: createValues.characterId ? undefined : 'Select a character.',
      scenarioId: createValues.scenarioId ? undefined : 'Select a scenario.',
      stage: createValues.stage ? undefined : 'Select a stage.',
      description: createValues.description.trim()
        ? undefined
        : 'Enter a description.',
      fileId: createValues.fileId ? undefined : 'Upload an image.',
    };
    if (
      errors.characterId ||
      errors.scenarioId ||
      errors.stage ||
      errors.description ||
      errors.fileId
    ) {
      setCreateShowErrors(true);
      return;
    }
    await createMutation.mutateAsync({
      characterId: createValues.characterId,
      scenarioId: createValues.scenarioId,
      stage: createValues.stage as RoleplayStage,
      description: createValues.description.trim(),
      isPregenerated: true,
      isPromotional: createValues.isPromotional,
      fileId: createValues.fileId,
    });
    setIsDrawerOpen(false);
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Images</Typography>
          </div>
          <Button iconLeft={<PlusIcon />} onClick={openCreateDrawer}>
            Add image
          </Button>
        </div>

        <div className={s.filters}>
          <div className={s.filterRow}>
            <Field
              className={s.filterField}
              label="Search"
              labelFor="images-search"
            >
              <Input
                id="images-search"
                placeholder="Search by description"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                iconLeft={<MagnifyingGlassIcon />}
                fullWidth
              />
            </Field>
            <Field label="Character" labelFor="images-character">
              <SearchSelect
                id="images-character"
                value={characterFilter}
                options={filterCharacterOptions}
                search={characterSearch}
                onSearchChange={setCharacterSearch}
                onSelect={(value) =>
                  updateSearchParams({
                    characterId: value,
                    scenarioId: '',
                    page: 1,
                  })
                }
                placeholder={
                  isCharactersLoading
                    ? 'Loading characters...'
                    : 'All characters'
                }
                loading={isCharactersLoading}
              />
            </Field>
            <Field label="Pregenerated" labelFor="images-pregenerated">
              <Select
                id="images-pregenerated"
                options={PREG_FILTER_OPTIONS}
                value={pregFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ isPregenerated: value, page: 1 })
                }
              />
            </Field>
            <Field label="Scenario" labelFor="images-scenario">
              <Select
                id="images-scenario"
                options={filterScenarioOptions}
                value={scenarioFilter}
                size="sm"
                variant="ghost"
                placeholder={
                  characterFilter
                    ? isFilterCharacterLoading
                      ? 'Loading scenarios...'
                      : 'All scenarios'
                    : 'Select character first'
                }
                disabled={!characterFilter || isFilterCharacterLoading}
                onChange={(value) =>
                  updateSearchParams({ scenarioId: value, page: 1 })
                }
              />
            </Field>
            <Field label="Stage" labelFor="images-stage">
              <Select
                id="images-stage"
                options={filterStageOptions}
                value={stageFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ stage: value, page: 1 })
                }
              />
            </Field>
            <Field label="Promotional" labelFor="images-promotional">
              <Select
                id="images-promotional"
                options={PROMO_FILTER_OPTIONS}
                value={promoFilter}
                size="sm"
                variant="ghost"
                onChange={(value) =>
                  updateSearchParams({ isPromotional: value, page: 1 })
                }
              />
            </Field>
            <Field label="Order" labelFor="images-order">
              <Select
                id="images-order"
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
              title="Unable to load images"
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
            title="No images found"
            description="Create an image to get started."
            action={<Button onClick={openCreateDrawer}>Add image</Button>}
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
                      const image = images[index];
                      if (!image) return {};
                      return {
                        className: s.clickableRow,
                        role: 'link',
                        tabIndex: 0,
                        onClick: () =>
                          navigate(`/character-images/${image.id}`),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/character-images/${image.id}`);
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
        open={isDrawerOpen}
        className={s.drawer}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateDrawer();
          } else {
            setIsDrawerOpen(true);
          }
        }}
        title="Add image"
      >
        <Stack gap="16px" className={s.drawerForm}>
          <Field
            label="Character"
            labelFor="images-create-character"
            error={createErrors.characterId}
          >
            <SearchSelect
              id="images-create-character"
              value={createValues.characterId}
              options={drawerCharacterOptions}
              search={drawerCharacterSearch}
              onSearchChange={setDrawerCharacterSearch}
              onSelect={(value) =>
                setCreateValues((prev) => ({
                  ...prev,
                  characterId: value,
                  scenarioId: '',
                }))
              }
              placeholder={
                isDrawerCharactersLoading
                  ? 'Loading characters...'
                  : 'Select character'
              }
              loading={isDrawerCharactersLoading}
              invalid={Boolean(createErrors.characterId)}
            />
          </Field>

          <FormRow columns={2}>
            <Field
              label="Scenario"
              labelFor="images-create-scenario"
              error={createErrors.scenarioId}
            >
              <Select
                id="images-create-scenario"
                size="sm"
                options={scenarioOptions}
                value={createValues.scenarioId}
                placeholder={
                  createValues.characterId
                    ? 'Select scenario'
                    : 'Select character first'
                }
                onChange={(value) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    scenarioId: value,
                  }))
                }
                fullWidth
                disabled={!createValues.characterId || createMutation.isPending}
                invalid={Boolean(createErrors.scenarioId)}
              />
            </Field>

            <Field
              label="Stage"
              labelFor="images-create-stage"
              error={createErrors.stage}
            >
              <Select
                id="images-create-stage"
                size="sm"
                options={stageOptions}
                value={createValues.stage}
                placeholder="Select stage"
                onChange={(value) =>
                  setCreateValues((prev) => ({
                    ...prev,
                    stage: value as RoleplayStage,
                  }))
                }
                fullWidth
                disabled={createMutation.isPending}
                invalid={Boolean(createErrors.stage)}
              />
            </Field>
          </FormRow>

          <Field
            label="Description"
            labelFor="images-create-description"
            error={createErrors.description}
          >
            <Textarea
              id="images-create-description"
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

          <div>
            <FileUpload
              label="Image file"
              folder={FileDir.Public}
              value={mainFile}
              onChange={(file) => {
                setMainFile(file);
                setCreateValues((prev) => ({
                  ...prev,
                  fileId: file?.id ?? '',
                }));
              }}
              onError={(message) =>
                notifyError(new Error(message), 'Unable to upload image.')
              }
            />
            {createErrors.fileId ? (
              <Typography
                variant="caption"
                tone="warning"
                className={s.fileError}
              >
                {createErrors.fileId}
              </Typography>
            ) : null}
          </div>

          <Field label="Flags">
            <div className={s.toggleGrid}>
              <div className={s.toggleRow}>
                <Typography variant="meta" tone="muted">
                  Promotional
                </Typography>
                <Switch
                  checked={createValues.isPromotional}
                  onChange={(event) =>
                    setCreateValues((prev) => ({
                      ...prev,
                      isPromotional: event.target.checked,
                    }))
                  }
                  aria-label="isPromotional"
                />
              </div>
            </div>
          </Field>

          <div className={s.drawerActions}>
            <Button
              variant="secondary"
              onClick={closeCreateDrawer}
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
                  createErrors.characterId ||
                  createErrors.scenarioId ||
                  createErrors.stage ||
                  createErrors.description ||
                  createErrors.fileId,
                )
              }
            >
              Create
            </Button>
          </div>
        </Stack>
      </Drawer>
    </AppShell>
  );
}
