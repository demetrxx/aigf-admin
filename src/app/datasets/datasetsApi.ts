import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CreateDatasetDto,
  IDataset,
  IDatasetDetails,
  UpdateDatasetDto,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type DatasetsListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const listFallbackError = 'Unable to load datasets.';
const createFallbackError = 'Unable to create the dataset.';
const updateFallbackError = 'Unable to update the dataset.';
const deleteFallbackError = 'Unable to delete the dataset.';
const createItemFallbackError = 'Unable to add dataset item.';
const regenerateItemFallbackError = 'Unable to regenerate dataset item.';
const deleteItemFallbackError = 'Unable to delete dataset item.';
const downloadZipFallbackError = 'Unable to download dataset ZIP.';

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<{
    createWritable: () => Promise<WritableStream<Uint8Array>>;
  }>;
};

function getFileNameFromDisposition(value: string | null) {
  if (!value) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const simpleMatch = /filename="?([^";]+)"?/i.exec(value);
  return simpleMatch?.[1] ?? null;
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

async function parseJsonIfPresent(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function getDatasets(params: DatasetsListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/datasets${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }
  return (await res.json()) as PaginatedResponse<IDataset>;
}

export async function getDatasetDetails(id: string) {
  const res = await apiFetch(`/admin/datasets/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, listFallbackError);
  }
  return (await res.json()) as IDatasetDetails;
}

export async function createDataset(payload: CreateDatasetDto) {
  const res = await apiFetch('/admin/datasets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as IDatasetDetails;
}

export async function updateDataset(id: string, payload: UpdateDatasetDto) {
  const res = await apiFetch(`/admin/datasets/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteDataset(id: string) {
  const res = await apiFetch(`/admin/datasets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function createDatasetItem(id: string) {
  const res = await apiFetch(`/admin/datasets/${id}/items`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, createItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function regenerateDatasetItem(id: string, itemId: string) {
  const res = await apiFetch(`/admin/datasets/${id}/items/${itemId}/regenerate`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw await buildApiError(res, regenerateItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteDatasetItem(id: string, itemId: string) {
  const res = await apiFetch(`/admin/datasets/${id}/items/${itemId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteItemFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function downloadDatasetZip(id: string, fallbackName?: string) {
  const res = await apiFetch(`/admin/datasets/${id}/download`);
  if (!res.ok) {
    throw await buildApiError(res, downloadZipFallbackError);
  }

  const headerName = getFileNameFromDisposition(
    res.headers.get('content-disposition'),
  );
  const fileName = headerName ?? fallbackName ?? `dataset-${id}.zip`;
  const pickerWindow = window as SavePickerWindow;

  if (res.body && pickerWindow.showSaveFilePicker) {
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'ZIP archive',
            accept: { 'application/zip': ['.zip'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await res.body.pipeTo(writable);
      return true;
    } catch (error) {
      if (isAbortError(error)) {
        await res.body.cancel();
        return false;
      }
      throw error;
    }
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
}
