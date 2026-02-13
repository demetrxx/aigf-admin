import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  CreateCharacterImageDto,
  ICharacterImage,
  ICharacterImageDetails,
  RoleplayStage,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type';

export type CharacterImagesListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
  isPregenerated?: boolean;
  isPromotional?: boolean;
  characterId?: string;
  scenarioId?: string;
  stage?: RoleplayStage;
};

const fallbackError = 'Unable to load images.';
const createFallbackError = 'Unable to create the image.';
const detailsFallbackError = 'Unable to load the image details.';

export async function getCharacterImages(params: CharacterImagesListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));
  if (typeof params.isPregenerated === 'boolean') {
    query.set('isPregenerated', String(params.isPregenerated));
  }
  if (typeof params.isPromotional === 'boolean') {
    query.set('isPromotional', String(params.isPromotional));
  }
  if (params.characterId) query.set('characterId', params.characterId);
  if (params.scenarioId) query.set('scenarioId', params.scenarioId);
  if (params.stage) query.set('stage', params.stage);

  const suffix = query.toString();
  const res = await apiFetch(
    `/admin/character-images${suffix ? `?${suffix}` : ''}`,
  );
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<ICharacterImage>;
}

export async function getCharacterImageDetails(id: string) {
  const res = await apiFetch(`/admin/character-images/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, detailsFallbackError);
  }
  return (await res.json()) as ICharacterImageDetails;
}

export async function createCharacterImage(payload: CreateCharacterImageDto) {
  const res = await apiFetch('/admin/character-images', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as ICharacterImageDetails;
}
