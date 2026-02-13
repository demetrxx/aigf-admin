import { apiFetch } from '@/app/api';
import { buildApiError } from '@/app/api/apiErrors';
import type {
  ICharacter,
  ICharacterDetails,
  RoleplayStage,
  StageDirectives,
} from '@/common/types';

import type { PaginatedResponse } from '../paginated-response.type.ts';

export type CharactersListParams = {
  search?: string;
  order?: string;
  skip?: number;
  take?: number;
};

const fallbackError = 'Unable to load characters.';
const createFallbackError = 'Unable to create the character.';
const updateFallbackError = 'Unable to update the character.';
const deleteFallbackError = 'Unable to delete the character.';
const createScenarioFallbackError = 'Unable to create the scenario.';
const createScenarioGiftFallbackError = 'Unable to add the gift.';
const updateScenarioGiftFallbackError = 'Unable to update the gift.';
const deleteScenarioGiftFallbackError = 'Unable to delete the gift.';

export type CharacterUpdateDto = {
  name: string;
  emoji: string;
  loraId: string;
  gender: string;
  isActive: boolean;
  description: string;
  avatarId: string;
};

export type CharacterCreateDto = {
  name: string;
  emoji: string;
  loraId: string;
  gender: string;
  description: string;
  avatarId: string;
};

export type ScenarioCreateDto = {
  name: string;
  emoji: string;
  description: string;
  personality: string;
  messagingStyle: string;
  appearance: string;
  situation: string;
  openingMessage: string;
  openingImageId: string;
};

export type ScenarioUpdateDto = ScenarioCreateDto;
export type StageUpdateDto = StageDirectives;
export type StageGiftCreateDto = {
  giftId: string;
  reason: string;
  buyText: string;
};
export type StageGiftUpdateDto = {
  reason: string;
  buyText: string;
};

async function parseJsonIfPresent(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export async function getCharacters(params: CharactersListParams) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.order) query.set('order', params.order);
  if (typeof params.skip === 'number') query.set('skip', String(params.skip));
  if (typeof params.take === 'number') query.set('take', String(params.take));

  const suffix = query.toString();
  const res = await apiFetch(`/admin/characters${suffix ? `?${suffix}` : ''}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as PaginatedResponse<ICharacter>;
}

export async function getCharacterDetails(id: string) {
  const res = await apiFetch(`/admin/characters/${id}`);
  if (!res.ok) {
    throw await buildApiError(res, fallbackError);
  }
  return (await res.json()) as ICharacterDetails;
}

export async function createCharacter(payload: CharacterCreateDto) {
  const res = await apiFetch('/admin/characters', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createFallbackError);
  }
  return (await res.json()) as ICharacterDetails;
}

export async function createScenario(
  characterId: string,
  payload: ScenarioCreateDto,
) {
  const res = await apiFetch(`/admin/characters/${characterId}/scenarios`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, createScenarioFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
}

export async function updateScenario(
  characterId: string,
  scenarioId: string,
  payload: ScenarioUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
}

export async function updateScenarioStage(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  payload: StageUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ICharacterDetails['scenarios'][number];
}

export async function addScenarioStageGift(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  payload: StageGiftCreateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}/gifts`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, createScenarioGiftFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function updateScenarioStageGift(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  characterGiftId: string,
  payload: StageGiftUpdateDto,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}/gifts/${characterGiftId}`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, updateScenarioGiftFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function deleteScenarioStageGift(
  characterId: string,
  scenarioId: string,
  stage: RoleplayStage,
  characterGiftId: string,
) {
  const res = await apiFetch(
    `/admin/characters/${characterId}/scenarios/${scenarioId}/stages/${stage}/gifts/${characterGiftId}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    throw await buildApiError(res, deleteScenarioGiftFallbackError);
  }
  return await parseJsonIfPresent(res);
}

export async function updateCharacter(id: string, payload: CharacterUpdateDto) {
  const res = await apiFetch(`/admin/characters/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw await buildApiError(res, updateFallbackError);
  }
  return (await res.json()) as ICharacterDetails;
}

export async function deleteCharacter(id: string) {
  const res = await apiFetch(`/admin/characters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw await buildApiError(res, deleteFallbackError);
  }
}
