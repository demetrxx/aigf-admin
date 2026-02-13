import {
  FileDir,
  FileStatus,
  type ICharacterImageDetails,
  RoleplayStage,
  STAGES_IN_ORDER,
} from '@/common/types';

const CHARACTER_IMAGES_TRANSFER_SCHEMA = 'aigf-character-images';
const CHARACTER_IMAGES_TRANSFER_VERSION = 1;

export type CharacterImageTransferFile = {
  id: string;
  name: string;
  path: string;
  dir: FileDir;
  status: FileStatus;
  mime: string;
  url?: string | null;
};

export type CharacterImageTransferItem = {
  description: string;
  stage: RoleplayStage;
  isPregenerated: boolean;
  isPromotional: boolean;
  characterName: string;
  scenarioName: string;
  file: CharacterImageTransferFile;
  blurredFile?: CharacterImageTransferFile | null;
};

export type CharacterImagesTransferPayload = {
  schema: typeof CHARACTER_IMAGES_TRANSFER_SCHEMA;
  version: typeof CHARACTER_IMAGES_TRANSFER_VERSION;
  exportedAt: string;
  images: CharacterImageTransferItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureRecord(value: unknown, path: string) {
  if (!isRecord(value)) {
    throw new Error(`Invalid import file: "${path}" must be an object.`);
  }
  return value;
}

function ensureString(value: unknown, path: string) {
  if (typeof value !== 'string') {
    throw new Error(`Invalid import file: "${path}" must be a string.`);
  }
  return value;
}

function ensureNonEmptyString(value: unknown, path: string) {
  const parsed = ensureString(value, path).trim();
  if (!parsed) {
    throw new Error(`Invalid import file: "${path}" must not be empty.`);
  }
  return parsed;
}

function ensureBoolean(value: unknown, path: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid import file: "${path}" must be a boolean.`);
  }
  return value;
}

function ensureStage(value: unknown, path: string): RoleplayStage {
  const stage = ensureString(value, path);
  if (!STAGES_IN_ORDER.includes(stage as RoleplayStage)) {
    throw new Error(`Invalid import file: "${path}" has unknown stage "${stage}".`);
  }
  return stage as RoleplayStage;
}

function parseTransferFile(
  value: unknown,
  path: string,
): CharacterImageTransferFile {
  const obj = ensureRecord(value, path);
  const dir = ensureString(obj.dir, `${path}.dir`);
  const status = ensureString(obj.status, `${path}.status`);

  if (!Object.values(FileDir).includes(dir as FileDir)) {
    throw new Error(`Invalid import file: "${path}.dir" has unsupported value.`);
  }
  if (!Object.values(FileStatus).includes(status as FileStatus)) {
    throw new Error(`Invalid import file: "${path}.status" has unsupported value.`);
  }

  const urlValue = obj.url;
  if (
    urlValue !== undefined &&
    urlValue !== null &&
    typeof urlValue !== 'string'
  ) {
    throw new Error(
      `Invalid import file: "${path}.url" must be a string, null, or omitted.`,
    );
  }

  return {
    id: ensureNonEmptyString(obj.id, `${path}.id`),
    name: ensureNonEmptyString(obj.name, `${path}.name`),
    path: ensureNonEmptyString(obj.path, `${path}.path`),
    dir: dir as FileDir,
    status: status as FileStatus,
    mime: ensureNonEmptyString(obj.mime, `${path}.mime`),
    url: (urlValue as string | null | undefined) ?? undefined,
  };
}

function parseTransferItem(
  value: unknown,
  path: string,
): CharacterImageTransferItem {
  const obj = ensureRecord(value, path);

  let blurredFile: CharacterImageTransferFile | null | undefined;
  if (obj.blurredFile === null || obj.blurredFile === undefined) {
    blurredFile = obj.blurredFile as null | undefined;
  } else {
    blurredFile = parseTransferFile(obj.blurredFile, `${path}.blurredFile`);
  }

  return {
    description: ensureNonEmptyString(obj.description, `${path}.description`),
    stage: ensureStage(obj.stage, `${path}.stage`),
    isPregenerated: ensureBoolean(obj.isPregenerated, `${path}.isPregenerated`),
    isPromotional: ensureBoolean(obj.isPromotional, `${path}.isPromotional`),
    characterName: ensureNonEmptyString(obj.characterName, `${path}.characterName`),
    scenarioName: ensureNonEmptyString(obj.scenarioName, `${path}.scenarioName`),
    file: parseTransferFile(obj.file, `${path}.file`),
    blurredFile,
  };
}

function toTransferFile(file: ICharacterImageDetails['file']) {
  if (!file?.id || !file?.name || !file?.path || !file?.mime) {
    throw new Error('Unable to export images: file metadata is incomplete.');
  }
  return {
    id: file.id,
    name: file.name,
    path: file.path,
    dir: file.dir,
    status: file.status,
    mime: file.mime,
    url: file.url ?? undefined,
  } satisfies CharacterImageTransferFile;
}

export function buildCharacterImagesTransferPayload(
  images: ICharacterImageDetails[],
) {
  const mapped = images.map((image, index) => {
    const characterName = image.character?.name?.trim();
    const scenarioName = image.scenario?.name?.trim();
    const description = image.description?.trim();

    if (!characterName) {
      throw new Error(
        `Unable to export images: image #${index + 1} has empty character name.`,
      );
    }
    if (!scenarioName) {
      throw new Error(
        `Unable to export images: image #${index + 1} has empty scenario name.`,
      );
    }
    if (!description) {
      throw new Error(
        `Unable to export images: image #${index + 1} has empty description.`,
      );
    }
    if (!STAGES_IN_ORDER.includes(image.stage)) {
      throw new Error(
        `Unable to export images: image #${index + 1} has unsupported stage.`,
      );
    }

    return {
      description,
      stage: image.stage,
      isPregenerated: Boolean(image.isPregenerated),
      isPromotional: Boolean(image.isPromotional),
      characterName,
      scenarioName,
      file: toTransferFile(image.file),
      blurredFile: image.blurredFile ? toTransferFile(image.blurredFile) : null,
    } satisfies CharacterImageTransferItem;
  });

  return {
    schema: CHARACTER_IMAGES_TRANSFER_SCHEMA,
    version: CHARACTER_IMAGES_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    images: mapped,
  } satisfies CharacterImagesTransferPayload;
}

export function buildCharacterImagesTransferFileName() {
  return 'character-images.json';
}

export function downloadCharacterImagesTransferFile(
  payload: CharacterImagesTransferPayload,
  fileName: string,
) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function parseCharacterImagesTransferFile(file: File) {
  const text = await file.text();
  let rawPayload: unknown;

  try {
    rawPayload = JSON.parse(text) as unknown;
  } catch (_error) {
    throw new Error('Invalid JSON file.');
  }

  const payloadObj = ensureRecord(rawPayload, 'root');
  const schema = ensureString(payloadObj.schema, 'schema');
  const version = payloadObj.version;

  if (schema !== CHARACTER_IMAGES_TRANSFER_SCHEMA) {
    throw new Error(
      `Invalid import file: unsupported schema "${schema}". Expected "${CHARACTER_IMAGES_TRANSFER_SCHEMA}".`,
    );
  }
  if (version !== CHARACTER_IMAGES_TRANSFER_VERSION) {
    throw new Error(
      `Invalid import file: unsupported version "${String(version)}".`,
    );
  }

  const imagesValue = payloadObj.images;
  if (!Array.isArray(imagesValue)) {
    throw new Error('Invalid import file: "images" must be an array.');
  }

  const images = imagesValue.map((item, index) =>
    parseTransferItem(item, `images[${index}]`),
  );

  return {
    schema: CHARACTER_IMAGES_TRANSFER_SCHEMA,
    version: CHARACTER_IMAGES_TRANSFER_VERSION,
    exportedAt: ensureString(payloadObj.exportedAt, 'exportedAt'),
    images,
  } satisfies CharacterImagesTransferPayload;
}
