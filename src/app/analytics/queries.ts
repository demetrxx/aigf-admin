import { useQuery } from '@tanstack/react-query';

import {
  getAnalyticsDeeplinks,
  getAnalyticsDaily,
  getAnalyticsMainRange,
  getAnalyticsMetrics,
  getPaymentsConversionBreakdown,
  getPaymentsRevenueBreakdown,
  type DeeplinkAnalyticsItem,
  type DailyAnalyticsItem,
  type AnalyticsMainRangeResponse,
  type AnalyticsMetricsResponse,
  type PaymentsConversionBreakdownItem,
  type PaymentsConversionGroupBy,
  type PaymentsRevenueBreakdownItem,
  type PaymentsRevenueGroupBy,
} from './analyticsApi';
import type { AnalyticsMetricKey, AnalyticsSection } from './metricRegistry';

const analyticsKeys = {
  mainRange: (params: {
    section: AnalyticsSection;
    startMonth: string;
    endMonth: string;
  }) => ['analytics', 'main-range', params] as const,
  metrics: (params: {
    section: AnalyticsSection;
    metrics: AnalyticsMetricKey[];
    startMonth: string;
    endMonth: string;
  }) => ['analytics', 'metrics', params] as const,
  paymentsConversionBreakdown: (params: {
    groupBy: PaymentsConversionGroupBy;
    month: string;
  }) => ['analytics', 'payments', 'conversion-breakdown', params] as const,
  paymentsRevenueBreakdown: (params: {
    groupBy: PaymentsRevenueGroupBy;
    month: string;
  }) => ['analytics', 'payments', 'revenue-breakdown', params] as const,
  deeplinks: (params: {
    startDate: string;
    endDate: string;
    ref?: string;
    characterId?: string;
    scenarioId?: string;
  }) => ['analytics', 'deeplinks', params] as const,
  daily: (params: { startDate: string; endDate: string }) =>
    ['analytics', 'daily', params] as const,
};

type AnalyticsQueryOptions<T> = {
  enabled?: boolean;
  staleTime?: number;
  placeholderData?: (previous: T | undefined) => T | undefined;
};

const DEFAULT_STALE_TIME = 15 * 60 * 1000;

export function useAnalyticsMainRange(
  params: {
    section: AnalyticsSection;
    startMonth: string;
    endMonth: string;
  },
  options: AnalyticsQueryOptions<AnalyticsMainRangeResponse> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.mainRange(params),
    queryFn: () => getAnalyticsMainRange(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsMetrics(
  params: {
    section: AnalyticsSection;
    metrics: AnalyticsMetricKey[];
    startMonth: string;
    endMonth: string;
  },
  options: AnalyticsQueryOptions<AnalyticsMetricsResponse> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.metrics(params),
    queryFn: () => getAnalyticsMetrics(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function usePaymentsConversionBreakdown(
  params: { groupBy: PaymentsConversionGroupBy; month: string },
  options: AnalyticsQueryOptions<PaymentsConversionBreakdownItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.paymentsConversionBreakdown(params),
    queryFn: () => getPaymentsConversionBreakdown(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function usePaymentsRevenueBreakdown(
  params: { groupBy: PaymentsRevenueGroupBy; month: string },
  options: AnalyticsQueryOptions<PaymentsRevenueBreakdownItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.paymentsRevenueBreakdown(params),
    queryFn: () => getPaymentsRevenueBreakdown(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsDeeplinks(
  params: {
    startDate: string;
    endDate: string;
    ref?: string;
    characterId?: string;
    scenarioId?: string;
  },
  options: AnalyticsQueryOptions<DeeplinkAnalyticsItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.deeplinks(params),
    queryFn: () => getAnalyticsDeeplinks(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useAnalyticsDaily(
  params: { startDate: string; endDate: string },
  options: AnalyticsQueryOptions<DailyAnalyticsItem[]> = {},
) {
  return useQuery({
    queryKey: analyticsKeys.daily(params),
    queryFn: () => getAnalyticsDaily(params),
    placeholderData: options.placeholderData ?? ((previous) => previous),
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    enabled: options.enabled ?? true,
  });
}
