import {
  FileDir,
  FileStatus,
  type IGiftDetails,
} from '@/common/types';

const GIFTS_TRANSFER_SCHEMA = 'aigf-gifts';
const GIFTS_TRANSFER_VERSION = 1;

export type GiftTransferFile = {
  id: string;
  name: string;
  path: string;
  dir: FileDir;
  status: FileStatus;
  mime: string;
  url?: string | null;
};

export type GiftTransferItem = {
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  img: GiftTransferFile;
};

export type GiftsTransferPayload = {
  schema: typeof GIFTS_TRANSFER_SCHEMA;
  version: typeof GIFTS_TRANSFER_VERSION;
  exportedAt: string;
  gifts: GiftTransferItem[];
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

function ensurePositiveNumber(value: unknown, path: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Invalid import file: "${path}" must be a positive number.`,
    );
  }
  return value;
}

function ensureBoolean(value: unknown, path: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid import file: "${path}" must be a boolean.`);
  }
  return value;
}

function parseTransferFile(value: unknown, path: string): GiftTransferFile {
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

function parseTransferGift(value: unknown, path: string): GiftTransferItem {
  const obj = ensureRecord(value, path);
  return {
    name: ensureNonEmptyString(obj.name, `${path}.name`),
    description: ensureNonEmptyString(obj.description, `${path}.description`),
    price: ensurePositiveNumber(obj.price, `${path}.price`),
    isActive: ensureBoolean(obj.isActive, `${path}.isActive`),
    img: parseTransferFile(obj.img, `${path}.img`),
  };
}

function ensureUniqueGiftNames(gifts: GiftTransferItem[], path: string) {
  const counts = new Map<string, number>();
  for (const gift of gifts) {
    counts.set(gift.name, (counts.get(gift.name) ?? 0) + 1);
  }
  const duplicates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  if (duplicates.length > 0) {
    throw new Error(
      `Invalid import file: duplicate gift names in "${path}": ${duplicates.join(', ')}.`,
    );
  }
}

export function buildGiftsTransferPayload(gifts: IGiftDetails[]) {
  const mapped = gifts.map((gift, index) => {
    const name = gift.name?.trim();
    const description = gift.description?.trim();
    if (!name) {
      throw new Error(
        `Unable to export gifts: gift #${index + 1} has empty name.`,
      );
    }
    if (!description) {
      throw new Error(
        `Unable to export gifts: gift "${name}" has empty description.`,
      );
    }
    if (!Number.isFinite(gift.price) || gift.price <= 0) {
      throw new Error(
        `Unable to export gifts: gift "${name}" has invalid price.`,
      );
    }
    if (!gift.img?.id || !gift.img?.name || !gift.img?.path || !gift.img?.mime) {
      throw new Error(
        `Unable to export gifts: gift "${name}" has incomplete image metadata.`,
      );
    }

    return {
      name,
      description,
      price: gift.price,
      isActive: Boolean(gift.isActive),
      img: {
        id: gift.img.id,
        name: gift.img.name,
        path: gift.img.path,
        dir: gift.img.dir,
        status: gift.img.status,
        mime: gift.img.mime,
        url: gift.img.url ?? undefined,
      },
    } satisfies GiftTransferItem;
  });

  ensureUniqueGiftNames(mapped, 'gifts');

  return {
    schema: GIFTS_TRANSFER_SCHEMA,
    version: GIFTS_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    gifts: mapped,
  } satisfies GiftsTransferPayload;
}

export function buildGiftsTransferFileName() {
  return 'gifts.json';
}

export function downloadGiftsTransferFile(
  payload: GiftsTransferPayload,
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

export async function parseGiftsTransferFile(file: File) {
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
  if (schema !== GIFTS_TRANSFER_SCHEMA) {
    throw new Error(
      `Invalid import file: unsupported schema "${schema}". Expected "${GIFTS_TRANSFER_SCHEMA}".`,
    );
  }
  if (version !== GIFTS_TRANSFER_VERSION) {
    throw new Error(
      `Invalid import file: unsupported version "${String(version)}".`,
    );
  }

  const giftsValue = payloadObj.gifts;
  if (!Array.isArray(giftsValue)) {
    throw new Error('Invalid import file: "gifts" must be an array.');
  }

  const gifts = giftsValue.map((gift, index) =>
    parseTransferGift(gift, `gifts[${index}]`),
  );
  ensureUniqueGiftNames(gifts, 'gifts');

  return {
    schema: GIFTS_TRANSFER_SCHEMA,
    version: GIFTS_TRANSFER_VERSION,
    exportedAt: ensureString(payloadObj.exportedAt, 'exportedAt'),
    gifts,
  } satisfies GiftsTransferPayload;
}
