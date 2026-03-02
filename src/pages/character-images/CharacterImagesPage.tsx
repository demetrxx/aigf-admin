import { Cross1Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { isApiRequestError } from '@/app/api/apiErrors';
import {
  createCharacterImage as createCharacterImageApi,
  getCharacterImageDetails,
  getCharacterImages,
  useCharacterImages,
} from '@/app/character-images';
import { useCharacterDetails, useCharacters } from '@/app/characters';
import { getCharacterDetails, getCharacters } from '@/app/characters/charactersApi';
import { copyFile, markFileUploaded, signUpload } from '@/app/files/filesApi';
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
  FileStatus,
  type ICharacterDetails,
  type IFile,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';
import { Drawer } from '@/components/molecules';
import { AppShell } from '@/components/templates';
import { SearchSelect } from '@/pages/generations/components/SearchSelect';

import s from './CharacterImagesPage.module.scss';
import {
  buildCharacterImagesTransferFileName,
  buildCharacterImagesTransferPayload,
  type CharacterImageTransferFile,
  downloadCharacterImagesTransferFile,
  parseCharacterImagesTransferFile,
} from './characterImagesTransfer';

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

type CreateImageUploadItem = {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'uploading' | 'uploaded' | 'error';
  uploadedFile: IFile | null;
  message?: string;
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

function normalizeEntityName(value: string) {
  return value.trim();
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function resolveErrorMessage(error: unknown) {
  if (isApiRequestError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Request failed.';
}

function createUploadItemId() {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.randomUUID === 'function'
  ) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

export function CharacterImagesPage() {
  const queryClient = useQueryClient();
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
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const normalizedSearch = debouncedSearch.trim();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const images = useMemo(() => data?.data ?? [], [data?.data]);
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
  const [isCreating, setIsCreating] = useState(false);
  const [createValues, setCreateValues] = useState({
    characterId: '',
    scenarioId: '',
    stage: '' as RoleplayStage | '',
    description: '',
    isPromotional: false,
  });
  const [createFiles, setCreateFiles] = useState<CreateImageUploadItem[]>([]);
  const createFilesInputId = useId();
  const [createFilesInputKey, setCreateFilesInputKey] = useState(0);
  const [createShowErrors, setCreateShowErrors] = useState(false);
  const isUploadingFiles = useMemo(
    () => createFiles.some((item) => item.status === 'uploading'),
    [createFiles],
  );
  const uploadedCreateFiles = useMemo(
    () =>
      createFiles.filter(
        (item) => item.status === 'uploaded' && Boolean(item.uploadedFile?.id),
      ),
    [createFiles],
  );
  const isCreateBusy = isCreating || isUploadingFiles;
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
    });
    setCreateFiles([]);
    setCreateFilesInputKey((prev) => prev + 1);
    setCreateShowErrors(false);
    setIsCreating(false);
    setIsDrawerOpen(true);
  };

  const closeCreateDrawer = () => {
    if (isCreateBusy) return;
    setIsDrawerOpen(false);
  };

  const createErrors = useMemo(() => {
    if (!createShowErrors) return {};
    const errors: {
      characterId?: string;
      scenarioId?: string;
      stage?: string;
      description?: string;
      files?: string;
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
    if (uploadedCreateFiles.length === 0) {
      errors.files = isUploadingFiles
        ? 'Wait for uploads to finish.'
        : 'Upload at least one image.';
    }
    return errors;
  }, [
    createShowErrors,
    createValues.characterId,
    createValues.scenarioId,
    createValues.stage,
    createValues.description,
    isUploadingFiles,
    uploadedCreateFiles.length,
  ]);

  const createIsValid = useMemo(
    () =>
      Boolean(
        createValues.characterId &&
        createValues.scenarioId &&
        createValues.stage &&
        createValues.description.trim() &&
        !isUploadingFiles &&
        uploadedCreateFiles.length > 0,
      ),
    [
      createValues.characterId,
      createValues.scenarioId,
      createValues.stage,
      createValues.description,
      isUploadingFiles,
      uploadedCreateFiles.length,
    ],
  );

  const updateCreateFile = useCallback(
    (
      id: string,
      updater: (item: CreateImageUploadItem) => CreateImageUploadItem,
    ) => {
      setCreateFiles((prev) =>
        prev.map((item) => (item.id === id ? updater(item) : item)),
      );
    },
    [],
  );

  const handleAddCreateFilesClick = () => {
    if (isCreateBusy) return;
    const element = document.getElementById(createFilesInputId);
    if (element instanceof HTMLInputElement) {
      element.click();
    }
  };

  const handleCreateFilesChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setCreateFilesInputKey((prev) => prev + 1);

    if (files.length === 0 || isCreateBusy) {
      return;
    }

    const queuedItems = files.map((file) => ({
      id: createUploadItemId(),
      fileName: file.name,
      fileSize: file.size,
      status: 'uploading',
      uploadedFile: null,
    })) satisfies CreateImageUploadItem[];
    setCreateFiles((prev) => [...prev, ...queuedItems]);

    let failedUploads = 0;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const queuedItem = queuedItems[index];
      if (!queuedItem) continue;

      if (!isAcceptedImageFile(file)) {
        failedUploads += 1;
        updateCreateFile(queuedItem.id, (item) => ({
          ...item,
          status: 'error',
          message: 'Only PNG, JPG, JPEG, or WEBP files are allowed.',
        }));
        continue;
      }

      try {
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

        updateCreateFile(queuedItem.id, (item) => ({
          ...item,
          status: 'uploaded',
          uploadedFile: { ...signedFile, status: FileStatus.UPLOADED },
          message: undefined,
        }));
      } catch (error) {
        failedUploads += 1;
        updateCreateFile(queuedItem.id, (item) => ({
          ...item,
          status: 'error',
          message: resolveErrorMessage(error),
        }));
      }
    }

    if (failedUploads > 0) {
      const failedLabel = failedUploads === 1 ? 'file failed' : 'files failed';
      notifyError(
        new Error(`${failedUploads} ${failedLabel} to upload.`),
        'Unable to upload some images.',
      );
    }
  };

  const handleRemoveCreateFile = (id: string) => {
    if (isCreating) return;
    setCreateFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCreate = async () => {
    const errors = {
      characterId: createValues.characterId ? undefined : 'Select a character.',
      scenarioId: createValues.scenarioId ? undefined : 'Select a scenario.',
      stage: createValues.stage ? undefined : 'Select a stage.',
      description: createValues.description.trim()
        ? undefined
        : 'Enter a description.',
      files:
        uploadedCreateFiles.length > 0
          ? undefined
          : isUploadingFiles
            ? 'Wait for uploads to finish.'
            : 'Upload at least one image.',
    };
    if (
      errors.characterId ||
      errors.scenarioId ||
      errors.stage ||
      errors.description ||
      errors.files
    ) {
      setCreateShowErrors(true);
      return;
    }

    setIsCreating(true);
    try {
      const retainedFiles = createFiles.filter(
        (item) => item.status !== 'uploaded' || !item.uploadedFile?.id,
      );
      const failedCreateFiles: CreateImageUploadItem[] = [];
      let createdCount = 0;

      for (const item of createFiles) {
        if (item.status !== 'uploaded' || !item.uploadedFile?.id) {
          continue;
        }

        try {
          await createCharacterImageApi({
            characterId: createValues.characterId,
            scenarioId: createValues.scenarioId,
            stage: createValues.stage as RoleplayStage,
            description: createValues.description.trim(),
            isPregenerated: true,
            isPromotional: createValues.isPromotional,
            fileId: item.uploadedFile.id,
          });
          createdCount += 1;
        } catch (error) {
          failedCreateFiles.push({
            ...item,
            status: 'uploaded',
            message: resolveErrorMessage(error),
          });
        }
      }

      if (createdCount > 0) {
        await queryClient.invalidateQueries({ queryKey: ['character-images'] });
      }

      const nextFiles = [...retainedFiles, ...failedCreateFiles];
      setCreateFiles(nextFiles);

      if (failedCreateFiles.length > 0) {
        const totalAttempted = createdCount + failedCreateFiles.length;
        notifyError(
          new Error(`Created ${createdCount} of ${totalAttempted} images.`),
          'Unable to create some images.',
        );
        setCreateShowErrors(true);
        return;
      }

      const createdLabel =
        createdCount === 1 ? 'image created.' : 'images created.';
      notifySuccess('Images created.', `${createdCount} ${createdLabel}`);
      if (nextFiles.length === 0) {
        setIsDrawerOpen(false);
      }
    } catch (error) {
      notifyError(error, 'Unable to create images.');
    } finally {
      setIsCreating(false);
    }
  };

  const fetchAllImageSummaries = useCallback(async () => {
    const allImages: Awaited<ReturnType<typeof getCharacterImages>>['data'] = [];
    let skip = 0;
    const take = 200;

    while (true) {
      const pageData = await getCharacterImages({
        order: 'ASC',
        skip,
        take,
      });
      allImages.push(...pageData.data);
      skip += pageData.data.length;
      if (skip >= pageData.total || pageData.data.length === 0) {
        break;
      }
    }

    return allImages;
  }, []);

  const fetchAllCharacters = useCallback(async () => {
    const allCharacters: Awaited<ReturnType<typeof getCharacters>>['data'] = [];
    let skip = 0;
    const take = 200;

    while (true) {
      const pageData = await getCharacters({
        order: 'ASC',
        skip,
        take,
      });
      allCharacters.push(...pageData.data);
      skip += pageData.data.length;
      if (skip >= pageData.total || pageData.data.length === 0) {
        break;
      }
    }

    return allCharacters;
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const imagesList = await fetchAllImageSummaries();
      const details = await Promise.all(
        imagesList.map((image) => getCharacterImageDetails(image.id)),
      );
      const payload = buildCharacterImagesTransferPayload(details);
      downloadCharacterImagesTransferFile(
        payload,
        buildCharacterImagesTransferFileName(),
      );
      notifySuccess('Images exported.', 'Images exported.');
    } catch (error) {
      notifyError(error, 'Unable to export images.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportButtonClick = () => {
    if (isImporting || isExporting || isCreateBusy) return;
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const imported = await parseCharacterImagesTransferFile(file);

      const allCharacters = await fetchAllCharacters();
      const requiredCharacterNames = new Set(
        imported.images.map((item) => normalizeEntityName(item.characterName)),
      );

      const characterNameToIds = new Map<string, string[]>();
      for (const name of requiredCharacterNames) {
        characterNameToIds.set(name, []);
      }
      for (const character of allCharacters) {
        const name = normalizeEntityName(character.name);
        if (!name || !characterNameToIds.has(name)) continue;
        characterNameToIds.get(name)?.push(character.id);
      }

      const missingCharacters: string[] = [];
      const ambiguousCharacters: string[] = [];
      const resolvedCharacterIdsByName = new Map<string, string>();

      for (const name of requiredCharacterNames) {
        const ids = characterNameToIds.get(name) ?? [];
        if (ids.length === 0) {
          missingCharacters.push(name);
          continue;
        }
        if (ids.length > 1) {
          ambiguousCharacters.push(name);
          continue;
        }
        resolvedCharacterIdsByName.set(name, ids[0]);
      }

      if (missingCharacters.length > 0) {
        throw new Error(
          `Missing characters in target environment: ${missingCharacters.join(', ')}.`,
        );
      }
      if (ambiguousCharacters.length > 0) {
        throw new Error(
          `Character names are not unique in target environment: ${ambiguousCharacters.join(', ')}.`,
        );
      }

      const requiredScenarioNamesByCharacterId = new Map<string, Set<string>>();
      for (const item of imported.images) {
        const characterName = normalizeEntityName(item.characterName);
        const scenarioName = normalizeEntityName(item.scenarioName);
        const characterId = resolvedCharacterIdsByName.get(characterName);
        if (!characterId) {
          throw new Error(`Character "${characterName}" was not resolved.`);
        }
        const currentSet =
          requiredScenarioNamesByCharacterId.get(characterId) ?? new Set<string>();
        currentSet.add(scenarioName);
        requiredScenarioNamesByCharacterId.set(characterId, currentSet);
      }

      const characterDetailsEntries = await Promise.all(
        Array.from(requiredScenarioNamesByCharacterId.keys()).map(async (id) => [
          id,
          await getCharacterDetails(id),
        ] as const),
      );
      const characterDetailsById = new Map<string, ICharacterDetails>(
        characterDetailsEntries,
      );

      const resolvedScenarioIds = new Map<string, string>();
      for (const [characterId, requiredScenarioNames] of requiredScenarioNamesByCharacterId.entries()) {
        const details = characterDetailsById.get(characterId);
        if (!details) {
          throw new Error(`Character "${characterId}" details were not loaded.`);
        }

        const scenarioNameToIds = new Map<string, string[]>();
        for (const name of requiredScenarioNames) {
          scenarioNameToIds.set(name, []);
        }

        for (const scenario of details.scenarios) {
          const scenarioName = normalizeEntityName(scenario.name);
          if (!scenarioNameToIds.has(scenarioName)) continue;
          scenarioNameToIds.get(scenarioName)?.push(scenario.id);
        }

        const missingScenarios: string[] = [];
        const ambiguousScenarios: string[] = [];
        for (const scenarioName of requiredScenarioNames) {
          const ids = scenarioNameToIds.get(scenarioName) ?? [];
          if (ids.length === 0) {
            missingScenarios.push(scenarioName);
            continue;
          }
          if (ids.length > 1) {
            ambiguousScenarios.push(scenarioName);
            continue;
          }
          resolvedScenarioIds.set(`${characterId}::${scenarioName}`, ids[0]);
        }

        if (missingScenarios.length > 0) {
          throw new Error(
            `Missing scenarios for character "${details.name}": ${missingScenarios.join(', ')}.`,
          );
        }
        if (ambiguousScenarios.length > 0) {
          throw new Error(
            `Scenario names are not unique for character "${details.name}": ${ambiguousScenarios.join(', ')}.`,
          );
        }
      }

      const filesById = new Map<string, CharacterImageTransferFile>();
      const registerFile = (transferFile: CharacterImageTransferFile) => {
        const existingFile = filesById.get(transferFile.id);
        if (
          existingFile &&
          (existingFile.path !== transferFile.path ||
            existingFile.name !== transferFile.name ||
            existingFile.mime !== transferFile.mime ||
            existingFile.dir !== transferFile.dir ||
            existingFile.status !== transferFile.status)
        ) {
          throw new Error(
            `Conflicting file metadata for image id "${transferFile.id}" in import file.`,
          );
        }
        filesById.set(transferFile.id, transferFile);
      };

      for (const item of imported.images) {
        registerFile(item.file);
        if (item.blurredFile) {
          registerFile(item.blurredFile);
        }
      }

      for (const transferFile of filesById.values()) {
        await copyFile({
          id: transferFile.id,
          name: transferFile.name,
          path: transferFile.path,
          dir: transferFile.dir,
          status: transferFile.status,
          mime: transferFile.mime,
          url: transferFile.url ?? undefined,
        });
      }

      for (const item of imported.images) {
        const characterName = normalizeEntityName(item.characterName);
        const scenarioName = normalizeEntityName(item.scenarioName);
        const characterId = resolvedCharacterIdsByName.get(characterName);
        if (!characterId) {
          throw new Error(`Character "${characterName}" was not resolved.`);
        }
        const scenarioId = resolvedScenarioIds.get(
          `${characterId}::${scenarioName}`,
        );
        if (!scenarioId) {
          throw new Error(
            `Scenario "${scenarioName}" for character "${characterName}" was not resolved.`,
          );
        }

        await createCharacterImageApi({
          characterId,
          scenarioId,
          stage: item.stage,
          description: item.description.trim(),
          isPregenerated: item.isPregenerated,
          isPromotional: item.isPromotional,
          fileId: item.file.id,
          blurredFileId: item.blurredFile?.id || undefined,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ['character-images'],
      });
      notifySuccess('Images imported.', 'Images imported.');
    } catch (error) {
      notifyError(error, 'Unable to import images.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppShell>
      <Container size="wide" className={s.page}>
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Images</Typography>
          </div>
          <ButtonGroup>
            <IconButton
              aria-label="Export images"
              tooltip="Export images"
              icon={<DownloadIcon />}
              variant="ghost"
              onClick={handleExport}
              loading={isExporting}
              disabled={isImporting || isCreateBusy}
            />
            <IconButton
              aria-label="Import images"
              tooltip="Import images"
              icon={<UploadIcon />}
              variant="ghost"
              onClick={handleImportButtonClick}
              loading={isImporting}
              disabled={isExporting || isCreateBusy}
            />
            <Button
              iconLeft={<PlusIcon />}
              onClick={openCreateDrawer}
              disabled={isImporting}
            >
              Add image
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
                disabled={!createValues.characterId || isCreating}
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
                disabled={isCreating}
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

          <Field label="Image files" error={createErrors.files}>
            <Stack gap="12px">
              <div className={s.uploadActions}>
                <Button
                  variant="secondary"
                  onClick={handleAddCreateFilesClick}
                  disabled={isCreateBusy}
                >
                  Choose images
                </Button>
                <Typography variant="meta" tone="muted">
                  {isUploadingFiles
                    ? 'Uploading images...'
                    : `${uploadedCreateFiles.length} uploaded`}
                </Typography>
              </div>

              {createFiles.length === 0 ? (
                <div className={s.uploadEmpty}>
                  <Typography variant="caption" tone="muted">
                    No images uploaded yet.
                  </Typography>
                </div>
              ) : (
                <div className={s.uploadList}>
                  {createFiles.map((item) => (
                    <div key={item.id} className={s.uploadItem}>
                      <div className={s.uploadItemRow}>
                        <div className={s.uploadItemMeta}>
                          <Typography variant="body" truncate>
                            {item.fileName}
                          </Typography>
                          <Typography variant="caption" tone="muted">
                            {formatFileSize(item.fileSize)}
                          </Typography>
                        </div>
                        <div className={s.uploadItemActions}>
                          {item.status === 'uploaded' ? (
                            <Badge tone="success">Uploaded</Badge>
                          ) : item.status === 'uploading' ? (
                            <Badge tone="accent">Uploading</Badge>
                          ) : (
                            <Badge tone="warning">Failed</Badge>
                          )}
                          <IconButton
                            aria-label="Remove image file"
                            tooltip="Remove"
                            variant="ghost"
                            tone="danger"
                            size="sm"
                            icon={<Cross1Icon />}
                            disabled={isCreating || item.status === 'uploading'}
                            onClick={() => handleRemoveCreateFile(item.id)}
                          />
                        </div>
                      </div>
                      {item.message ? (
                        <Typography variant="caption" tone="warning">
                          {item.message}
                        </Typography>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <Input
                key={createFilesInputKey}
                id={createFilesInputId}
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                disabled={isCreateBusy}
                onChange={handleCreateFilesChange}
                wrapperClassName={s.hiddenInputWrapper}
                className={s.hiddenInput}
              />
            </Stack>
          </Field>

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
              disabled={isCreateBusy}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={isCreating}
              disabled={
                !createIsValid ||
                isCreateBusy ||
                Boolean(
                  createErrors.characterId ||
                  createErrors.scenarioId ||
                  createErrors.stage ||
                  createErrors.description ||
                  createErrors.files,
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
