import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notifyError, notifySuccess } from '@/app/toast';
import type { PlanCreateDto, PlanUpdateDto } from '@/common/types';

import { createPlan, getPlans, type PlansListParams, updatePlan } from './plansApi';

const planKeys = {
  list: (params: PlansListParams) => ['plans', params] as const,
};

export function usePlans(params: PlansListParams) {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: () => getPlans(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PlanCreateDto) => createPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      notifySuccess('Plan created.', 'Plan created.');
    },
    onError: (error) => {
      notifyError(error, 'Unable to create the plan.');
    },
  });
}

type PlanUpdateOptions = {
  id: string;
  payload: PlanUpdateDto;
  successTitle?: string;
  successDescription?: string;
};

export function useUpdatePlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: PlanUpdateOptions) => updatePlan(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      const title =
        variables.successTitle ??
        (variables.payload.isActive ? 'Plan activated.' : 'Plan deactivated.');
      const description =
        variables.successDescription ?? 'Plan status updated.';
      notifySuccess(title, description);
    },
    onError: (error) => {
      notifyError(error, 'Unable to update the plan.');
    },
  });
}
