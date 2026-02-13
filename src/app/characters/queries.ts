import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { RoleplayStage } from '@/common/types';
import {
  addScenarioStageGift,
  deleteScenarioStageGift,
  type CharacterUpdateDto,
  type CharactersListParams,
  type ScenarioCreateDto,
  type ScenarioUpdateDto,
  type StageGiftCreateDto,
  type StageGiftUpdateDto,
  type StageUpdateDto,
  createCharacter,
  createScenario,
  deleteCharacter,
  getCharacterDetails,
  getCharacters,
  updateCharacter,
  updateScenario,
  updateScenarioStage,
  updateScenarioStageGift,
} from './charactersApi';

const characterKeys = {
  list: (params: CharactersListParams) => ['characters', params] as const,
  details: (id: string) => ['character', id] as const,
};

export function useCharacters(params: CharactersListParams) {
  return useQuery({
    queryKey: characterKeys.list(params),
    queryFn: () => getCharacters(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCharacterDetails(id: string | null) {
  return useQuery({
    queryKey: characterKeys.details(id ?? ''),
    queryFn: () => getCharacterDetails(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCharacter,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.setQueryData(characterKeys.details(data.id), data);
      notifySuccess('Character created.', 'Character created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the character.');
    },
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      payload,
    }: {
      characterId: string;
      payload: ScenarioCreateDto;
    }) => createScenario(characterId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Scenario created.', 'Scenario created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the scenario.');
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      payload: ScenarioUpdateDto;
    }) => updateScenario(characterId, scenarioId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Scenario updated.', 'Scenario updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the scenario.');
    },
  });
}

export function useUpdateScenarioStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      payload: StageUpdateDto;
    }) => updateScenarioStage(characterId, scenarioId, stage, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Stage updated.', 'Stage updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the stage.');
    },
  });
}

export function useCreateScenarioStageGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      payload: StageGiftCreateDto;
    }) => addScenarioStageGift(characterId, scenarioId, stage, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Gift added.', 'Gift added.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to add the gift.');
    },
  });
}

export function useUpdateScenarioStageGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      characterGiftId,
      payload,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      characterGiftId: string;
      payload: StageGiftUpdateDto;
    }) =>
      updateScenarioStageGift(
        characterId,
        scenarioId,
        stage,
        characterGiftId,
        payload,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Gift updated.', 'Gift updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the gift.');
    },
  });
}

export function useDeleteScenarioStageGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      scenarioId,
      stage,
      characterGiftId,
    }: {
      characterId: string;
      scenarioId: string;
      stage: RoleplayStage;
      characterGiftId: string;
    }) =>
      deleteScenarioStageGift(characterId, scenarioId, stage, characterGiftId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: characterKeys.details(variables.characterId),
      });
      notifySuccess('Gift deleted.', 'Gift deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the gift.');
    },
  });
}

export function useUpdateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CharacterUpdateDto }) =>
      updateCharacter(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(characterKeys.details(data.id), data);
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      notifySuccess('Character updated.', 'Character updated.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the character.');
    },
  });
}

export function useDeleteCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCharacter(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: characterKeys.details(id) });
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      notifySuccess('Character deleted.', 'Character deleted.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to delete the character.');
    },
  });
}
