import {
  AnimatedAxis,
  AnimatedGrid,
  AnimatedLineSeries,
  Tooltip as ChartTooltip,
  XYChart,
} from '@visx/xychart';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  addMonths,
  compareMonthIds,
  formatCount,
  formatMetricDelta,
  formatMetricValue,
  formatMonthLabel,
  getCurrentMonthId,
  getLastFullMonthId,
  getMetricDefinition,
  getMetricOptions,
  getMonthRange,
  getSectionConfig,
  getSectionOptions,
  isMetricForSection,
  isValidMonthId,
  isValidSection,
  normalizeRange,
  type PaymentsConversionGroupBy,
  type PaymentsRevenueGroupBy,
  useAnalyticsDaily,
  useAnalyticsDeeplinks,
  useAnalyticsMainRange,
  useAnalyticsMetrics,
  usePaymentsConversionBreakdown,
  usePaymentsRevenueBreakdown,
} from '@/app/analytics';
import { useAuth } from '@/app/auth';
import { useCharacters } from '@/app/characters';
import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Container,
  EmptyState,
  Field,
  FormRow,
  Grid,
  Input,
  Section,
  Select,
  Skeleton,
  Stack,
  Table,
  Tooltip,
  Typography,
} from '@/atoms';
import { UserRole } from '@/common/types';
import { cn } from '@/common/utils';
import { AppShell } from '@/components/templates';

import s from './AnalyticsPage.module.scss';

type QueryUpdate = {
  section?: string;
  start?: string;
  end?: string;
  metric?: string;
  kpi?: string;
  startDate?: string;
  endDate?: string;
  ref?: string;
  characterId?: string;
  scenarioId?: string;
  sort?: string;
  dailyMetric?: string;
};

type ChartDatum = {
  month: string;
  value: number;
};

type DailyMetricKey =
  | 'total'
  | 'unique'
  | 'customers'
  | 'revenue'
  | 'conversion'
  | 'arpu'
  | 'arpc';

type DailyChartDatum = {
  day: string;
  value: number;
};

type DeeplinkSortKey =
  | 'total'
  | 'revenue'
  | 'transactions'
  | 'visits'
  | 'unique'
  | 'customers'
  | 'conversion';

const MAX_RANGE_MONTHS = 24;
const DEFAULT_DEEPLINK_RANGE_DAYS = 30;
const DEFAULT_DAILY_RANGE_DAYS = 30;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function useElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!node) return;

    const measure = () => {
      const nextWidth = node.getBoundingClientRect().width ?? 0;
      setWidth(nextWidth);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) setWidth(entry.contentRect.width);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    let frame = 0;
    const handleResize = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [node]);

  return { ref: setNode, width };
}

function toUtcDateId(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseUtcDateId(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isValidDateId(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = parseUtcDateId(value);
  return toUtcDateId(parsed) === value;
}

function addDaysToDateId(value: string, delta: number) {
  const date = parseUtcDateId(value);
  date.setUTCDate(date.getUTCDate() + delta);
  return toUtcDateId(date);
}

function normalizeDateRange(
  rawStart: string | null,
  rawEnd: string | null,
  fallbackStart: string,
  fallbackEnd: string,
) {
  let start = isValidDateId(rawStart) ? rawStart : fallbackStart;
  let end = isValidDateId(rawEnd) ? rawEnd : fallbackEnd;
  let adjusted = false;

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
    adjusted = true;
  }

  return { start, end, adjusted };
}

function formatDeeplinkConversion(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return `${formatCount(value, 1)}%`;
}

function formatDayLabel(value: string, variant: 'short' | 'long' = 'short') {
  if (!ISO_DATE_PATTERN.test(value)) return value;
  const date = parseUtcDateId(value);
  const options: Intl.DateTimeFormatOptions =
    variant === 'short'
      ? { month: 'short', day: '2-digit', timeZone: 'UTC' }
      : { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

function isValidDeeplinkSort(
  value: string | null | undefined,
): value is DeeplinkSortKey {
  return (
    value === 'total' ||
    value === 'revenue' ||
    value === 'transactions' ||
    value === 'visits' ||
    value === 'unique' ||
    value === 'customers' ||
    value === 'conversion'
  );
}

function isValidDailyMetric(
  value: string | null | undefined,
): value is DailyMetricKey {
  return (
    value === 'total' ||
    value === 'unique' ||
    value === 'customers' ||
    value === 'revenue' ||
    value === 'conversion' ||
    value === 'arpu' ||
    value === 'arpc'
  );
}

const DAILY_METRIC_OPTIONS: Array<{
  value: DailyMetricKey;
  label: string;
  description: string;
}> = [
  {
    value: 'total',
    label: 'Total',
    description: 'Distinct users with at least one chat session in the day.',
  },
  {
    value: 'unique',
    label: 'Unique',
    description: 'Users whose first user message happened in the day.',
  },
  {
    value: 'customers',
    label: 'Customers',
    description: 'Distinct users with at least one payment in the day.',
  },
  {
    value: 'revenue',
    label: 'Revenue',
    description: 'Sum of payment amount for the day, in USD.',
  },
  {
    value: 'conversion',
    label: 'Conversion',
    description: 'Customers divided by total users.',
  },
  {
    value: 'arpu',
    label: 'ARPU',
    description: 'Revenue divided by total users.',
  },
  {
    value: 'arpc',
    label: 'ARPC',
    description: 'Revenue divided by customers.',
  },
];

export function AnalyticsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSection = searchParams.get('section');
  const rawStart = searchParams.get('start');
  const rawEnd = searchParams.get('end');
  const rawMetric = searchParams.get('metric');
  const rawKpi = searchParams.get('kpi');
  const rawStartDate = searchParams.get('startDate');
  const rawEndDate = searchParams.get('endDate');
  const rawRef = searchParams.get('ref');
  const rawCharacterId = searchParams.get('characterId');
  const rawScenarioId = searchParams.get('scenarioId');
  const rawSort = searchParams.get('sort');
  const rawDailyMetric = searchParams.get('dailyMetric');

  const [conversionGroupBy, setConversionGroupBy] =
    useState<PaymentsConversionGroupBy>('character');
  const [revenueGroupBy, setRevenueGroupBy] =
    useState<PaymentsRevenueGroupBy>('character');
  const isTargetUser = user?.role === UserRole.Target;
  const section = isTargetUser
    ? 'deeplinks'
    : isValidSection(rawSection)
      ? rawSection
      : 'main';
  const isDeeplinksSection = section === 'deeplinks';
  const isDailySection = section === 'daily';
  const isMonthlySection = !isDeeplinksSection && !isDailySection;
  const usesCurrentMonthDefault = section === 'main' || section === 'payments';
  const fallbackRange = useMemo(() => {
    const end = usesCurrentMonthDefault
      ? getCurrentMonthId()
      : getLastFullMonthId();
    return { start: addMonths(end, -11), end };
  }, [usesCurrentMonthDefault]);
  const {
    start: startMonth,
    end: endMonth,
    adjusted,
  } = normalizeRange(rawStart, rawEnd, fallbackRange, MAX_RANGE_MONTHS);
  const sectionConfig = getSectionConfig(section);
  const metricKey = isMetricForSection(rawMetric, section)
    ? rawMetric
    : (sectionConfig.defaultMetric ?? sectionConfig.metrics[0]?.key ?? null);
  const selectedMetric = getMetricDefinition(metricKey);
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const metricOptions = useMemo(() => getMetricOptions(section), [section]);
  const defaultKpiMonth = useMemo(
    () =>
      usesCurrentMonthDefault ? getCurrentMonthId() : getLastFullMonthId(),
    [usesCurrentMonthDefault],
  );
  const kpiMonth = isValidMonthId(rawKpi) ? rawKpi : defaultKpiMonth;

  const defaultDateEnd = useMemo(() => toUtcDateId(new Date()), []);
  const defaultDeeplinkStart = useMemo(
    () => addDaysToDateId(defaultDateEnd, -(DEFAULT_DEEPLINK_RANGE_DAYS - 1)),
    [defaultDateEnd],
  );
  const defaultDailyStart = useMemo(
    () => addDaysToDateId(defaultDateEnd, -(DEFAULT_DAILY_RANGE_DAYS - 1)),
    [defaultDateEnd],
  );
  const { start: deeplinkStart, end: deeplinkEnd } = useMemo(
    () =>
      normalizeDateRange(
        rawStartDate,
        rawEndDate,
        defaultDeeplinkStart,
        defaultDateEnd,
      ),
    [rawStartDate, rawEndDate, defaultDeeplinkStart, defaultDateEnd],
  );
  const { start: dailyStart, end: dailyEnd } = useMemo(
    () =>
      normalizeDateRange(
        rawStartDate,
        rawEndDate,
        defaultDailyStart,
        defaultDateEnd,
      ),
    [rawStartDate, rawEndDate, defaultDailyStart, defaultDateEnd],
  );
  const dailyMetricKey = isValidDailyMetric(rawDailyMetric)
    ? rawDailyMetric
    : 'total';
  const deeplinkRef = rawRef ?? '';
  const deeplinkCharacterId = rawCharacterId ?? '';
  const deeplinkScenarioId = rawScenarioId ?? '';
  const deeplinkSort = isValidDeeplinkSort(rawSort) ? rawSort : 'total';

  const updateSearchParams = useCallback(
    (update: QueryUpdate, replace = false) => {
      const next = new URLSearchParams(searchParams);

      if (update.section !== undefined) {
        if (update.section) {
          next.set('section', update.section);
        } else {
          next.delete('section');
        }
      }

      if (update.start !== undefined) {
        if (update.start) {
          next.set('start', update.start);
        } else {
          next.delete('start');
        }
      }

      if (update.end !== undefined) {
        if (update.end) {
          next.set('end', update.end);
        } else {
          next.delete('end');
        }
      }

      if (update.metric !== undefined) {
        if (update.metric) {
          next.set('metric', update.metric);
        } else {
          next.delete('metric');
        }
      }

      if (update.kpi !== undefined) {
        if (update.kpi) {
          next.set('kpi', update.kpi);
        } else {
          next.delete('kpi');
        }
      }

      if (update.startDate !== undefined) {
        if (update.startDate) {
          next.set('startDate', update.startDate);
        } else {
          next.delete('startDate');
        }
      }

      if (update.endDate !== undefined) {
        if (update.endDate) {
          next.set('endDate', update.endDate);
        } else {
          next.delete('endDate');
        }
      }

      if (update.ref !== undefined) {
        if (update.ref) {
          next.set('ref', update.ref);
        } else {
          next.delete('ref');
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

      if (update.sort !== undefined) {
        if (update.sort) {
          next.set('sort', update.sort);
        } else {
          next.delete('sort');
        }
      }

      if (update.dailyMetric !== undefined) {
        if (update.dailyMetric) {
          next.set('dailyMetric', update.dailyMetric);
        } else {
          next.delete('dailyMetric');
        }
      }

      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const updates: QueryUpdate = {};
    if (rawSection !== section) updates.section = section;
    if (isMonthlySection) {
      if (rawStart !== startMonth) updates.start = startMonth;
      if (rawEnd !== endMonth) updates.end = endMonth;
      if (metricKey && rawMetric !== metricKey) updates.metric = metricKey;
      if (!metricKey && rawMetric) updates.metric = '';
      if (rawKpi !== kpiMonth) updates.kpi = kpiMonth;
    } else {
      const nextStart = isDailySection ? dailyStart : deeplinkStart;
      const nextEnd = isDailySection ? dailyEnd : deeplinkEnd;
      if (rawStartDate !== nextStart) updates.startDate = nextStart;
      if (rawEndDate !== nextEnd) updates.endDate = nextEnd;
      if (isDeeplinksSection && rawSort !== deeplinkSort) {
        updates.sort = deeplinkSort;
      }
      if (isDailySection && rawDailyMetric !== dailyMetricKey) {
        updates.dailyMetric = dailyMetricKey;
      }
    }
    if (Object.keys(updates).length > 0) {
      updateSearchParams(updates, true);
    }
  }, [
    rawSection,
    rawStart,
    rawEnd,
    rawMetric,
    rawKpi,
    rawStartDate,
    rawEndDate,
    rawSort,
    section,
    startMonth,
    endMonth,
    metricKey,
    kpiMonth,
    deeplinkStart,
    deeplinkEnd,
    deeplinkSort,
    isDeeplinksSection,
    isDailySection,
    isMonthlySection,
    dailyStart,
    dailyEnd,
    dailyMetricKey,
    rawDailyMetric,
    updateSearchParams,
  ]);

  const rangeMonths = useMemo(
    () => getMonthRange(startMonth, endMonth),
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    [startMonth, endMonth],
  );

  const isSectionAvailable = sectionConfig.available;

  const {
    data: mainRange,
    isLoading: isMainLoading,
    error: mainError,
  } = useAnalyticsMainRange(
    {
      section,
      startMonth,
      endMonth,
    },
    {
      enabled: isSectionAvailable && isMonthlySection,
    },
  );

  const kpiRangeStart = addMonths(kpiMonth, -1);
  const {
    data: kpiRange,
    isLoading: isKpiLoading,
    error: kpiError,
  } = useAnalyticsMainRange(
    {
      section,
      startMonth: kpiRangeStart,
      endMonth: kpiMonth,
    },
    {
      enabled:
        isSectionAvailable && isMonthlySection && isValidMonthId(kpiMonth),
    },
  );

  const {
    data: metricsRange,
    isLoading: isMetricsLoading,
    error: metricsError,
  } = useAnalyticsMetrics(
    {
      section,
      metrics: metricKey ? [metricKey] : [],
      startMonth,
      endMonth,
    },
    {
      enabled: isSectionAvailable && isMonthlySection && Boolean(metricKey),
    },
  );

  const dataByMonth = useMemo(() => {
    const entries = mainRange?.data ?? [];
    return new Map(entries.map((row) => [row.month, row]));
  }, [mainRange]);

  const kpiDataByMonth = useMemo(() => {
    const entries = kpiRange?.data ?? [];
    return new Map(entries.map((row) => [row.month, row]));
  }, [kpiRange]);

  const currentRow = kpiDataByMonth.get(kpiMonth);
  const previousRow = kpiDataByMonth.get(addMonths(kpiMonth, -1));

  const {
    data: conversionBreakdown,
    isLoading: isConversionLoading,
    error: conversionError,
  } = usePaymentsConversionBreakdown(
    { groupBy: conversionGroupBy, month: kpiMonth },
    { enabled: section === 'payments' && isValidMonthId(kpiMonth) },
  );

  const {
    data: revenueBreakdown,
    isLoading: isRevenueLoading,
    error: revenueError,
  } = usePaymentsRevenueBreakdown(
    { groupBy: revenueGroupBy, month: kpiMonth },
    { enabled: section === 'payments' && isValidMonthId(kpiMonth) },
  );

  const { data: characterData } = useCharacters(
    {
      order: 'ASC',
      skip: 0,
      take: 200,
    },
    { enabled: isDeeplinksSection },
  );

  const {
    data: deeplinkData,
    isLoading: isDeeplinksLoading,
    error: deeplinksError,
  } = useAnalyticsDeeplinks(
    {
      startDate: deeplinkStart,
      endDate: deeplinkEnd,
      ref: deeplinkRef.trim() || undefined,
      characterId: deeplinkCharacterId || undefined,
      scenarioId: deeplinkScenarioId || undefined,
    },
    {
      enabled:
        isDeeplinksSection &&
        isValidDateId(deeplinkStart) &&
        isValidDateId(deeplinkEnd),
    },
  );

  const { data: deeplinkScenarioData } = useAnalyticsDeeplinks(
    {
      startDate: deeplinkStart,
      endDate: deeplinkEnd,
      ref: deeplinkRef.trim() || undefined,
    },
    {
      enabled:
        isDeeplinksSection &&
        isValidDateId(deeplinkStart) &&
        isValidDateId(deeplinkEnd),
    },
  );

  const {
    data: dailyData,
    isLoading: isDailyLoading,
    error: dailyError,
  } = useAnalyticsDaily(
    {
      startDate: dailyStart,
      endDate: dailyEnd,
    },
    {
      enabled:
        isDailySection && isValidDateId(dailyStart) && isValidDateId(dailyEnd),
    },
  );

  const kpiCards = sectionConfig.metrics.map((metric) => {
    const value = currentRow?.[metric.key] ?? null;
    const previous = previousRow?.[metric.key] ?? null;
    const delta = formatMetricDelta(metric, value, previous);

    return (
      <Card key={metric.key} className={s.kpiCard} padding="md">
        <div className={s.kpiHeader}>
          <Tooltip content={metric.description}>
            <Typography variant="meta" as="span" className={s.kpiLabel}>
              {metric.label}
            </Typography>
          </Tooltip>
        </div>
        <Typography variant="h2">
          {formatMetricValue(metric, value, 'card')}
        </Typography>
        <Typography variant="caption" tone="muted" className={s.deltaRow}>
          {delta ? `Δ ${delta.label} vs prev.` : 'Δ —'}
        </Typography>
      </Card>
    );
  });

  const tableColumns = useMemo(() => {
    return [
      {
        key: 'month',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ minWidth: 60, fontSize: 12 }}
          >
            Month
          </Typography>
        ),
      },
      ...sectionConfig.metrics.map((metric) => ({
        key: metric.key,
        label: (
          <Tooltip content={metric.description}>
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              {metric.tableLabel ?? metric.label}
            </Typography>
          </Tooltip>
        ),
      })),
    ];
  }, [sectionConfig.metrics]);

  const tableRows = useMemo(() => {
    return rangeMonths
      .sort((a, b) => compareMonthIds(b, a))
      .map((month) => {
        const row = dataByMonth.get(month);
        return sectionConfig.metrics.reduce(
          (acc, metric) => {
            const value = row?.[metric.key] ?? null;
            acc[metric.key] = (
              <Typography
                variant="body"
                as="span"
                style={{ fontSize: 14 }}
                className={s.alignRight}
              >
                {formatMetricValue(metric, value, 'table')}
              </Typography>
            );
            return acc;
          },
          {
            month: (
              <Typography variant="caption" tone="muted" as="span">
                {formatMonthLabel(month, 'short')}
              </Typography>
            ),
          } as Record<string, ReactNode>,
        );
      });
  }, [rangeMonths, dataByMonth, sectionConfig.metrics]);

  const chartSeries = useMemo(() => {
    if (!metricKey) return null;
    return (
      metricsRange?.metrics.find((metric) => metric.metric === metricKey) ??
      null
    );
  }, [metricsRange, metricKey]);

  const chartData = useMemo(() => {
    return (
      chartSeries?.data
        .filter((point): point is { month: string; value: number } =>
          Number.isFinite(point.value),
        )
        .map((point) => ({
          month: point.month,
          value: point.value,
        })) ?? []
    );
  }, [chartSeries]);

  const sectionOptions = useMemo(() => {
    const options = getSectionOptions();
    if (!isTargetUser) return options;
    return options.filter((option) => option.value === 'deeplinks');
  }, [isTargetUser]);
  const conversionMetric = useMemo(
    () => getMetricDefinition('conversionRate'),
    [],
  );
  const paymentsRevenueMetric = useMemo(
    () => getMetricDefinition('averagePurchaseValue'),
    [],
  );
  const dailyRevenueMetric = useMemo(() => getMetricDefinition('revenue'), []);
  const dailyArpuMetric = useMemo(
    () => getMetricDefinition('averageRevenuePerUser'),
    [],
  );
  const dailyArpcMetric = useMemo(
    () => getMetricDefinition('averageRevenuePerCustomer'),
    [],
  );
  const dailyMetricOptions = useMemo(
    () =>
      DAILY_METRIC_OPTIONS.map((metric) => ({
        value: metric.value,
        label: metric.label,
      })),
    [],
  );
  const dailyMetricMeta = useMemo(
    () =>
      DAILY_METRIC_OPTIONS.find((metric) => metric.value === dailyMetricKey) ??
      DAILY_METRIC_OPTIONS[0],
    [dailyMetricKey],
  );

  const conversionColumns = useMemo(
    () => [
      {
        key: 'name',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ minWidth: 120, fontSize: 12 }}
          >
            Name
          </Typography>
        ),
      },
      {
        key: 'activeUsers',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Active users
          </Typography>
        ),
      },
      {
        key: 'payingUsers',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Customers
          </Typography>
        ),
      },
      {
        key: 'conversionRate',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Conversion
          </Typography>
        ),
      },
    ],
    [],
  );

  const conversionRows = useMemo(() => {
    const entries = conversionBreakdown ?? [];
    return entries.map((item) => ({
      name: (
        <Typography variant="body" as="span" className={s.breakdownName}>
          {item.name || item.id || 'Unknown'}
        </Typography>
      ),
      activeUsers: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {Number.isFinite(item.activeUsers)
            ? formatCount(item.activeUsers)
            : '—'}
        </Typography>
      ),
      payingUsers: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {Number.isFinite(item.payingUsers)
            ? formatCount(item.payingUsers)
            : '—'}
        </Typography>
      ),
      conversionRate: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {conversionMetric && Number.isFinite(item.conversionRate)
            ? formatMetricValue(conversionMetric, item.conversionRate, 'table')
            : '—'}
        </Typography>
      ),
    }));
  }, [conversionBreakdown, conversionMetric]);

  const revenueColumns = useMemo(
    () => [
      {
        key: 'name',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ minWidth: 120, fontSize: 12 }}
          >
            Source
          </Typography>
        ),
      },
      {
        key: 'revenue',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Revenue
          </Typography>
        ),
      },
      {
        key: 'transactions',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Transactions
          </Typography>
        ),
      },
    ],
    [],
  );

  const revenueRows = useMemo(() => {
    const entries = revenueBreakdown ?? [];
    return entries.map((item) => {
      const label = item.name || item.deeplink || 'Unknown';
      return {
        name: (
          <Typography variant="body" as="span" className={s.breakdownName}>
            {label}
          </Typography>
        ),
        revenue: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {paymentsRevenueMetric && Number.isFinite(item.revenue)
              ? formatMetricValue(paymentsRevenueMetric, item.revenue, 'table')
              : '—'}
          </Typography>
        ),
        transactions: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {Number.isFinite(item.transactions)
              ? formatCount(item.transactions)
              : '—'}
          </Typography>
        ),
      };
    });
  }, [revenueBreakdown, paymentsRevenueMetric]);

  const deeplinkSortOptions = useMemo(
    () => [
      { value: 'total', label: 'Total' },
      { value: 'revenue', label: 'Revenue' },
      { value: 'transactions', label: 'Transactions' },
      { value: 'visits', label: 'Visits' },
      { value: 'customers', label: 'Customers' },
      { value: 'unique', label: 'Unique' },
      { value: 'conversion', label: 'Conversion' },
    ],
    [],
  );

  const characters = characterData?.data ?? [];
  const characterOptions = useMemo(() => {
    const options = characters.map((character) => ({
      value: character.id,
      label: character.name,
    }));
    if (
      deeplinkCharacterId &&
      !options.some((option) => option.value === deeplinkCharacterId)
    ) {
      options.unshift({
        value: deeplinkCharacterId,
        label: deeplinkCharacterId,
      });
    }
    return [{ value: '', label: 'All characters' }, ...options];
  }, [characters, deeplinkCharacterId]);

  const scenarioOptions = useMemo(() => {
    const baseLabel = 'All scenarios';
    const scenarioMap = new Map<
      string,
      { id: string; name?: string | null; slug?: string | null }
    >();
    const source = deeplinkScenarioData ?? [];
    source.forEach((item) => {
      const scenario = item.scenario;
      if (!scenario?.id) return;
      if (!scenarioMap.has(scenario.id)) {
        scenarioMap.set(scenario.id, {
          id: scenario.id,
          name: scenario.name,
          slug: scenario.slug,
        });
      }
    });
    const options = Array.from(scenarioMap.values())
      .map((scenario) => {
        const baseLabelText =
          scenario.name || scenario.slug || scenario.id || 'Unknown';
        const label =
          scenario.name && scenario.slug
            ? `${scenario.name} · ${scenario.slug}`
            : baseLabelText;
        return {
          value: scenario.id,
          label,
        };
      })
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    if (
      deeplinkScenarioId &&
      !options.some((option) => option.value === deeplinkScenarioId)
    ) {
      options.unshift({
        value: deeplinkScenarioId,
        label: deeplinkScenarioId,
      });
    }
    return [{ value: '', label: baseLabel }, ...options];
  }, [deeplinkScenarioData, deeplinkScenarioId]);

  const sortedDeeplinkRows = useMemo(() => {
    const entries = deeplinkData ?? [];
    const valueForSort = (item: (typeof entries)[number]) => {
      const value = item?.[deeplinkSort];
      if (!Number.isFinite(value)) return Number.NEGATIVE_INFINITY;
      return value as number;
    };
    return [...entries].sort((a, b) => valueForSort(b) - valueForSort(a));
  }, [deeplinkData, deeplinkSort]);

  const deeplinkTotals = useMemo(() => {
    const entries = deeplinkData ?? [];
    if (!entries.length) return null;
    const totals = entries.reduce(
      (acc, item) => {
        acc.total += Number.isFinite(item.total) ? item.total : 0;
        acc.unique += Number.isFinite(item.unique) ? item.unique : 0;
        acc.visits += Number.isFinite(item.visits) ? item.visits : 0;
        acc.customers += Number.isFinite(item.customers) ? item.customers : 0;
        acc.transactions += Number.isFinite(item.transactions)
          ? item.transactions
          : 0;
        acc.revenue += Number.isFinite(item.revenue) ? item.revenue : 0;
        return acc;
      },
      {
        total: 0,
        unique: 0,
        visits: 0,
        customers: 0,
        transactions: 0,
        revenue: 0,
      },
    );

    const conversion =
      totals.total > 0 ? (totals.customers / totals.total) * 100 : null;

    return { ...totals, conversion };
  }, [deeplinkData]);

  const deeplinkColumns = useMemo(
    () => [
      {
        key: 'ref',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ minWidth: 100, fontSize: 12 }}
          >
            Ref
          </Typography>
        ),
      },
      {
        key: 'character',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ minWidth: 90, fontSize: 12 }}
          >
            Character
          </Typography>
        ),
      },
      {
        key: 'scenario',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ minWidth: 160, fontSize: 12 }}
          >
            Scenario
          </Typography>
        ),
      },
      {
        key: 'visits',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Visits
          </Typography>
        ),
      },
      {
        key: 'unique',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Unique
          </Typography>
        ),
      },
      {
        key: 'total',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Total
          </Typography>
        ),
      },
      {
        key: 'customers',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Customers
          </Typography>
        ),
      },
      {
        key: 'transactions',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Transactions
          </Typography>
        ),
      },
      {
        key: 'revenue',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Revenue
          </Typography>
        ),
      },
      {
        key: 'conversion',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ fontSize: 12 }}
            className={s.alignRight}
          >
            Conversion
          </Typography>
        ),
      },
    ],
    [],
  );

  const deeplinkRows = useMemo(() => {
    return sortedDeeplinkRows.map((item) => ({
      ref: (
        <Tooltip content={item.deeplink}>
          <Typography variant="body" as="span">
            {item.ref || '—'}
          </Typography>
        </Tooltip>
      ),
      character: (
        <Typography variant="body" as="span">
          {item.character?.name || '—'}
        </Typography>
      ),
      scenario: item.scenario ? (
        <div className={s.scenarioCell}>
          <Typography variant="body" as="span">
            {item.scenario.name}
          </Typography>
          {item.scenario.slug ? (
            <Typography variant="caption" tone="muted" as="span">
              {item.scenario.slug}
            </Typography>
          ) : null}
        </div>
      ) : (
        <Typography variant="body" as="span">
          —
        </Typography>
      ),
      visits: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {Number.isFinite(item.visits) ? formatCount(item.visits) : '—'}
        </Typography>
      ),
      unique: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {Number.isFinite(item.unique) ? formatCount(item.unique) : '—'}
        </Typography>
      ),
      total: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {Number.isFinite(item.total) ? formatCount(item.total) : '—'}
        </Typography>
      ),
      customers: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {Number.isFinite(item.customers) ? formatCount(item.customers) : '—'}
        </Typography>
      ),
      transactions: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {Number.isFinite(item.transactions)
            ? formatCount(item.transactions)
            : '—'}
        </Typography>
      ),
      revenue: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {paymentsRevenueMetric && Number.isFinite(item.revenue)
            ? formatMetricValue(paymentsRevenueMetric, item.revenue, 'table')
            : '—'}
        </Typography>
      ),
      conversion: (
        <Typography
          variant="body"
          as="span"
          className={s.alignRight}
          style={{ fontSize: 14 }}
        >
          {formatDeeplinkConversion(item.conversion)}
        </Typography>
      ),
    }));
  }, [sortedDeeplinkRows, paymentsRevenueMetric]);

  const dailyTotals = useMemo(() => {
    const entries = dailyData ?? [];
    if (!entries.length) return null;
    const totals = entries.reduce(
      (acc, item) => {
        acc.total += Number.isFinite(item.total) ? item.total : 0;
        acc.unique += Number.isFinite(item.unique) ? item.unique : 0;
        acc.customers += Number.isFinite(item.customers) ? item.customers : 0;
        acc.revenue += Number.isFinite(item.revenue) ? item.revenue : 0;
        return acc;
      },
      {
        total: 0,
        unique: 0,
        customers: 0,
        revenue: 0,
      },
    );

    const conversion =
      totals.total > 0 ? totals.customers / totals.total : null;
    const arpu = totals.total > 0 ? totals.revenue / totals.total : null;
    const arpc =
      totals.customers > 0 ? totals.revenue / totals.customers : null;

    return { ...totals, conversion, arpu, arpc };
  }, [dailyData]);

  const dailyColumns = useMemo(
    () => [
      {
        key: 'day',
        label: (
          <Typography
            variant="meta"
            tone="muted"
            as="div"
            style={{ minWidth: 90, fontSize: 12 }}
          >
            Day
          </Typography>
        ),
      },
      {
        key: 'total',
        label: (
          <Tooltip content="Distinct users with at least one chat session in the day.">
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              Total
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'unique',
        label: (
          <Tooltip content="Users whose first user message happened in the day.">
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              Unique
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'customers',
        label: (
          <Tooltip content="Distinct users with at least one payment in the day.">
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              Customers
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'revenue',
        label: (
          <Tooltip content="Sum of payment amount for the day, in USD.">
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              Revenue
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'conversion',
        label: (
          <Tooltip content="Customers divided by total users.">
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              Conversion
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'arpu',
        label: (
          <Tooltip content="Revenue divided by total users.">
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              ARPU
            </Typography>
          </Tooltip>
        ),
      },
      {
        key: 'arpc',
        label: (
          <Tooltip content="Revenue divided by customers.">
            <Typography
              variant="meta"
              as="span"
              tone="muted"
              className={cn(s.tableHeader, [s.alignRight])}
            >
              ARPC
            </Typography>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  const dailyRows = useMemo(() => {
    const entries = dailyData ?? [];
    return [...entries]
      .sort((a, b) => String(b.day).localeCompare(String(a.day)))
      .map((item) => ({
        day: (
          <Typography variant="body" as="span">
            {item.day ? formatDayLabel(item.day, 'long') : '—'}
          </Typography>
        ),
        total: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {Number.isFinite(item.total) ? formatCount(item.total) : '—'}
          </Typography>
        ),
        unique: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {Number.isFinite(item.unique) ? formatCount(item.unique) : '—'}
          </Typography>
        ),
        customers: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {Number.isFinite(item.customers)
              ? formatCount(item.customers)
              : '—'}
          </Typography>
        ),
        revenue: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {dailyRevenueMetric && Number.isFinite(item.revenue)
              ? formatMetricValue(dailyRevenueMetric, item.revenue, 'table')
              : '—'}
          </Typography>
        ),
        conversion: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {conversionMetric && Number.isFinite(item.conversion)
              ? formatMetricValue(conversionMetric, item.conversion, 'table')
              : '—'}
          </Typography>
        ),
        arpu: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {dailyArpuMetric && Number.isFinite(item.arpu)
              ? formatMetricValue(dailyArpuMetric, item.arpu, 'table')
              : '—'}
          </Typography>
        ),
        arpc: (
          <Typography
            variant="body"
            as="span"
            className={s.alignRight}
            style={{ fontSize: 14 }}
          >
            {dailyArpcMetric && Number.isFinite(item.arpc)
              ? formatMetricValue(dailyArpcMetric, item.arpc, 'table')
              : '—'}
          </Typography>
        ),
      }));
  }, [
    dailyData,
    conversionMetric,
    dailyRevenueMetric,
    dailyArpuMetric,
    dailyArpcMetric,
  ]);

  const dailyChartData = useMemo(() => {
    const entries = dailyData ?? [];
    return [...entries]
      .sort((a, b) => String(a.day).localeCompare(String(b.day)))
      .map((item) => ({
        day: item.day,
        value: item[dailyMetricKey],
      }))
      .filter((item) => Number.isFinite(item.value));
  }, [dailyData, dailyMetricKey]);

  const formatDailyChartValue = useCallback(
    (value: number, variant: 'chart' | 'tooltip') => {
      if (!Number.isFinite(value)) return '—';
      switch (dailyMetricKey) {
        case 'revenue':
          return dailyRevenueMetric
            ? formatMetricValue(dailyRevenueMetric, value, variant)
            : formatCount(value);
        case 'conversion':
          return conversionMetric
            ? formatMetricValue(conversionMetric, value, variant)
            : formatCount(value, 2);
        case 'arpu':
          return dailyArpuMetric
            ? formatMetricValue(dailyArpuMetric, value, variant)
            : formatCount(value, 2);
        case 'arpc':
          return dailyArpcMetric
            ? formatMetricValue(dailyArpcMetric, value, variant)
            : formatCount(value, 2);
        default:
          return formatCount(value);
      }
    },
    [
      dailyMetricKey,
      dailyRevenueMetric,
      conversionMetric,
      dailyArpuMetric,
      dailyArpcMetric,
    ],
  );

  const conversionGroupOptions = useMemo(
    () => [
      { value: 'character', label: 'Character' },
      { value: 'scenario', label: 'Scenario' },
      { value: 'deeplink', label: 'Deeplink' },
    ],
    [],
  );

  const revenueGroupOptions = useMemo(
    () => [
      { value: 'character', label: 'Character' },
      { value: 'scenario', label: 'Scenario' },
      { value: 'deeplink', label: 'Deeplink' },
    ],
    [],
  );

  const { ref: chartRef, width: chartWidth } =
    useElementWidth<HTMLDivElement>();

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <div className={s.titleBlock}>
            <Typography variant="h2">Analytics</Typography>
          </div>
          <div className={s.headerActions}>
            <ButtonGroup>
              {sectionOptions.map((item) => {
                const isActive = item.value === section;
                const isDisabled = Boolean(item.disabled);
                return (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={'ghost'}
                    onClick={() => updateSearchParams({ section: item.value })}
                    disabled={isActive || isDisabled}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </ButtonGroup>
          </div>
        </div>

        <Stack gap="24px">
          {!isSectionAvailable ? (
            <EmptyState
              title="Section not available yet"
              description="The backend does not provide this section yet."
            />
          ) : isDeeplinksSection ? (
            <>
              {deeplinksError ? (
                <Alert
                  tone="danger"
                  title="Unable to load deeplinks"
                  description="Please retry or adjust the filters."
                />
              ) : null}

              <div className={s.filters}>
                <FormRow columns={3}>
                  <Field label="Start date" className={s.filterField}>
                    <Input
                      type="date"
                      size="sm"
                      value={deeplinkStart}
                      onChange={(event) =>
                        updateSearchParams({ startDate: event.target.value })
                      }
                      fullWidth
                    />
                  </Field>
                  <Field label="End date" className={s.filterField}>
                    <Input
                      type="date"
                      size="sm"
                      value={deeplinkEnd}
                      onChange={(event) =>
                        updateSearchParams({ endDate: event.target.value })
                      }
                      fullWidth
                    />
                  </Field>
                  <Field label="Sort by" className={s.filterField}>
                    <Select
                      options={deeplinkSortOptions}
                      value={deeplinkSort}
                      onChange={(value) => updateSearchParams({ sort: value })}
                      size="sm"
                      fullWidth
                    />
                  </Field>
                </FormRow>
                <FormRow columns={3}>
                  <Field label="Ref" className={s.filterField}>
                    <Input
                      type="text"
                      size="sm"
                      value={deeplinkRef}
                      onChange={(event) =>
                        updateSearchParams({ ref: event.target.value })
                      }
                      placeholder="All refs"
                      fullWidth
                    />
                  </Field>
                  <Field label="Character" className={s.filterField}>
                    <Select
                      options={characterOptions}
                      value={deeplinkCharacterId}
                      onChange={(value) =>
                        updateSearchParams({
                          characterId: value,
                        })
                      }
                      size="sm"
                      fullWidth
                    />
                  </Field>
                  <Field label="Scenario" className={s.filterField}>
                    <Select
                      options={scenarioOptions}
                      value={deeplinkScenarioId}
                      onChange={(value) =>
                        updateSearchParams({ scenarioId: value })
                      }
                      size="sm"
                      fullWidth
                    />
                  </Field>
                </FormRow>
                <Typography
                  variant="caption"
                  tone="muted"
                  className={s.filterNote}
                >
                  UTC dates. Revenue in USD.
                </Typography>
              </div>

              <Section title="Totals">
                {isDeeplinksLoading ? (
                  <Grid columns={7} gap={16}>
                    {Array.from({ length: 7 }).map((_, index) => (
                      <Skeleton key={index} height={88} />
                    ))}
                  </Grid>
                ) : (
                  <>
                    <Grid columns={7} gap={16}>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Visits
                        </Typography>
                        <Typography variant="h3">
                          {deeplinkTotals
                            ? formatCount(deeplinkTotals.visits)
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Unique
                        </Typography>
                        <Typography variant="h3">
                          {deeplinkTotals
                            ? formatCount(deeplinkTotals.unique)
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Total
                        </Typography>
                        <Typography variant="h3">
                          {deeplinkTotals
                            ? formatCount(deeplinkTotals.total)
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Customers
                        </Typography>
                        <Typography variant="h3">
                          {deeplinkTotals
                            ? formatCount(deeplinkTotals.customers)
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Transactions
                        </Typography>
                        <Typography variant="h3">
                          {deeplinkTotals
                            ? formatCount(deeplinkTotals.transactions)
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Revenue
                        </Typography>
                        <Typography variant="h3">
                          {deeplinkTotals && paymentsRevenueMetric
                            ? formatMetricValue(
                                paymentsRevenueMetric,
                                deeplinkTotals.revenue,
                                'card',
                              )
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Conversion
                        </Typography>
                        <Typography variant="h3">
                          {deeplinkTotals
                            ? formatDeeplinkConversion(
                                deeplinkTotals.conversion,
                              )
                            : '—'}
                        </Typography>
                      </Card>
                    </Grid>
                    <Typography
                      variant="caption"
                      tone="muted"
                      className={s.totalsNote}
                    >
                      Totals are sums across rows.
                    </Typography>
                  </>
                )}
              </Section>

              <Section title="Deeplinks">
                <Card className={s.panel} padding="md">
                  {isDeeplinksLoading ? (
                    <Skeleton height={240} />
                  ) : deeplinkRows.length ? (
                    <div className={s.tableWrap}>
                      <Table columns={deeplinkColumns} rows={deeplinkRows} />
                    </div>
                  ) : (
                    <EmptyState
                      title="No data for this period"
                      description="Try adjusting the filters."
                    />
                  )}
                </Card>
              </Section>
            </>
          ) : isDailySection ? (
            <>
              {dailyError ? (
                <Alert
                  tone="danger"
                  title="Unable to load daily analytics"
                  description="Please retry or adjust the filters."
                />
              ) : null}

              <div className={s.filters}>
                <FormRow columns={2}>
                  <Field label="Start date" className={s.filterField}>
                    <Input
                      type="date"
                      size="sm"
                      value={dailyStart}
                      onChange={(event) =>
                        updateSearchParams({ startDate: event.target.value })
                      }
                      fullWidth
                    />
                  </Field>
                  <Field label="End date" className={s.filterField}>
                    <Input
                      type="date"
                      size="sm"
                      value={dailyEnd}
                      onChange={(event) =>
                        updateSearchParams({ endDate: event.target.value })
                      }
                      fullWidth
                    />
                  </Field>
                </FormRow>
                <Typography
                  variant="caption"
                  tone="muted"
                  className={s.filterNote}
                >
                  UTC dates. Revenue in USD. Current day is partial.
                </Typography>
              </div>

              <Section title="Totals">
                {isDailyLoading ? (
                  <Grid columns={7} gap={16}>
                    {Array.from({ length: 7 }).map((_, index) => (
                      <Skeleton key={index} height={88} />
                    ))}
                  </Grid>
                ) : (
                  <>
                    <Grid columns={7} gap={16}>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Total
                        </Typography>
                        <Typography variant="h3">
                          {dailyTotals ? formatCount(dailyTotals.total) : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Unique
                        </Typography>
                        <Typography variant="h3">
                          {dailyTotals ? formatCount(dailyTotals.unique) : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Customers
                        </Typography>
                        <Typography variant="h3">
                          {dailyTotals
                            ? formatCount(dailyTotals.customers)
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Revenue
                        </Typography>
                        <Typography variant="h3">
                          {dailyTotals && dailyRevenueMetric
                            ? formatMetricValue(
                                dailyRevenueMetric,
                                dailyTotals.revenue,
                                'card',
                              )
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          Conversion
                        </Typography>
                        <Typography variant="h3">
                          {dailyTotals && conversionMetric
                            ? formatMetricValue(
                                conversionMetric,
                                dailyTotals.conversion,
                                'card',
                              )
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          ARPU
                        </Typography>
                        <Typography variant="h3">
                          {dailyTotals && dailyArpuMetric
                            ? formatMetricValue(
                                dailyArpuMetric,
                                dailyTotals.arpu,
                                'card',
                              )
                            : '—'}
                        </Typography>
                      </Card>
                      <Card className={s.kpiCard} padding="md">
                        <Typography variant="meta" tone="muted">
                          ARPC
                        </Typography>
                        <Typography variant="h3">
                          {dailyTotals && dailyArpcMetric
                            ? formatMetricValue(
                                dailyArpcMetric,
                                dailyTotals.arpc,
                                'card',
                              )
                            : '—'}
                        </Typography>
                      </Card>
                    </Grid>
                    <Typography
                      variant="caption"
                      tone="muted"
                      className={s.totalsNote}
                    >
                      Totals are sums across rows.
                    </Typography>
                  </>
                )}
              </Section>

              <Section
                title="Trend"
                description={dailyMetricMeta?.description}
                actions={
                  <Field
                    label="Metric"
                    layout="inline"
                    className={s.breakdownField}
                  >
                    <Select
                      options={dailyMetricOptions}
                      value={dailyMetricKey}
                      onChange={(value) =>
                        updateSearchParams({ dailyMetric: value })
                      }
                      size="sm"
                      fitContent
                    />
                  </Field>
                }
              >
                <Card className={s.panel} padding="md">
                  {isDailyLoading ? (
                    <Skeleton height={260} />
                  ) : dailyChartData.length ? (
                    <div ref={chartRef} className={s.chart}>
                      {chartWidth > 0 ? (
                        <XYChart
                          width={chartWidth}
                          height={260}
                          xScale={{ type: 'point' }}
                          yScale={{ type: 'linear', nice: true }}
                        >
                          <AnimatedGrid columns={false} numTicks={4} />
                          <AnimatedAxis
                            orientation="bottom"
                            tickFormat={(value) =>
                              formatDayLabel(String(value), 'short')
                            }
                            numTicks={Math.min(6, dailyChartData.length)}
                          />
                          <AnimatedAxis
                            orientation="left"
                            numTicks={4}
                            tickFormat={(value) =>
                              formatDailyChartValue(Number(value), 'chart')
                            }
                          />
                          <AnimatedLineSeries
                            dataKey={dailyMetricMeta?.label ?? 'Daily'}
                            data={dailyChartData}
                            xAccessor={(datum) => datum.day}
                            yAccessor={(datum) => datum.value}
                          />
                          <ChartTooltip
                            showVerticalCrosshair
                            showSeriesGlyphs
                            renderTooltip={({ tooltipData }) => {
                              const nearest = tooltipData?.nearestDatum;
                              if (!nearest) return null;
                              const datum = nearest.datum as DailyChartDatum;
                              return (
                                <div className={s.chartTooltip}>
                                  <Typography variant="meta" as="div">
                                    {formatDayLabel(datum.day, 'long')}
                                  </Typography>
                                  <Typography variant="body" as="div">
                                    {formatDailyChartValue(
                                      datum.value,
                                      'tooltip',
                                    )}
                                  </Typography>
                                </div>
                              );
                            }}
                          />
                        </XYChart>
                      ) : (
                        <Skeleton height={260} />
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      title="No data for this period"
                      description="Try adjusting the date range."
                    />
                  )}
                </Card>
              </Section>

              <Section title="Daily">
                <Card className={s.panel} padding="md">
                  {isDailyLoading ? (
                    <Skeleton height={240} />
                  ) : dailyRows.length ? (
                    <div className={s.tableWrap}>
                      <Table columns={dailyColumns} rows={dailyRows} />
                    </div>
                  ) : (
                    <EmptyState
                      title="No data for this period"
                      description="Try adjusting the filters."
                    />
                  )}
                </Card>
              </Section>
            </>
          ) : (
            <>
              {mainError ? (
                <Alert
                  tone="danger"
                  title="Unable to load analytics"
                  description="Please retry or adjust the range."
                />
              ) : null}

              <Section
                title="Metrics"
                actions={
                  <div className={s.kpiActions}>
                    <Typography variant="meta" tone="muted">
                      KPI month
                    </Typography>
                    <Input
                      type="month"
                      size="sm"
                      value={kpiMonth}
                      onChange={(event) =>
                        updateSearchParams({ kpi: event.target.value })
                      }
                      wrapperClassName={s.kpiMonthInput}
                      aria-label="KPI month"
                    />
                  </div>
                }
              >
                {kpiError ? (
                  <Alert
                    tone="danger"
                    title="Unable to load KPI data"
                    description="Please retry or choose another month."
                  />
                ) : null}
                {isKpiLoading ? (
                  <Grid columns={4} gap={16}>
                    {Array.from({ length: sectionConfig.metrics.length }).map(
                      (_, index) => (
                        <Skeleton key={index} height={96} />
                      ),
                    )}
                  </Grid>
                ) : (
                  <div className={s.kpiGrid}>{kpiCards}</div>
                )}
              </Section>

              {section === 'payments' ? (
                <Section
                  title="Breakdowns"
                  description={`Top sources for ${formatMonthLabel(
                    kpiMonth,
                    'long',
                  )}.`}
                >
                  <Grid columns={2} gap={16} className={s.breakdownGrid}>
                    <Card className={s.panel} padding="md">
                      <div className={s.breakdownHeader}>
                        <div className={s.breakdownTitle}>
                          <Typography variant="h3">
                            Conversion breakdown
                          </Typography>
                          <Typography variant="caption" tone="muted">
                            {formatMonthLabel(kpiMonth, 'short')}
                          </Typography>
                        </div>
                        <Field
                          label="Group by"
                          layout="inline"
                          className={s.breakdownField}
                        >
                          <Select
                            options={conversionGroupOptions}
                            value={conversionGroupBy}
                            onChange={(value) =>
                              setConversionGroupBy(
                                value as PaymentsConversionGroupBy,
                              )
                            }
                            size="sm"
                            fitContent
                          />
                        </Field>
                      </div>
                      {conversionError ? (
                        <Alert
                          tone="danger"
                          title="Unable to load conversion breakdown"
                          description="Please retry or select another month."
                        />
                      ) : null}
                      {isConversionLoading ? (
                        <Skeleton height={180} />
                      ) : conversionRows.length ? (
                        <div className={s.tableWrap}>
                          <Table
                            columns={conversionColumns}
                            rows={conversionRows}
                          />
                        </div>
                      ) : (
                        <EmptyState
                          title="No conversion data"
                          description="Try another month."
                        />
                      )}
                    </Card>

                    <Card className={s.panel} padding="md">
                      <div className={s.breakdownHeader}>
                        <div className={s.breakdownTitle}>
                          <Typography variant="h3">
                            Revenue breakdown
                          </Typography>
                          <Typography variant="caption" tone="muted">
                            {formatMonthLabel(kpiMonth, 'short')}
                          </Typography>
                        </div>
                        <Field
                          label="Group by"
                          layout="inline"
                          className={s.breakdownField}
                        >
                          <Select
                            options={revenueGroupOptions}
                            value={revenueGroupBy}
                            onChange={(value) =>
                              setRevenueGroupBy(value as PaymentsRevenueGroupBy)
                            }
                            size="sm"
                            fitContent
                          />
                        </Field>
                      </div>
                      {revenueError ? (
                        <Alert
                          tone="danger"
                          title="Unable to load revenue breakdown"
                          description="Please retry or select another month."
                        />
                      ) : null}
                      {isRevenueLoading ? (
                        <Skeleton height={180} />
                      ) : revenueRows.length ? (
                        <div className={s.tableWrap}>
                          <Table columns={revenueColumns} rows={revenueRows} />
                        </div>
                      ) : (
                        <EmptyState
                          title="No revenue data"
                          description="Try another month."
                        />
                      )}
                    </Card>
                  </Grid>
                </Section>
              ) : null}

              <div className={s.filters}>
                <div className={s.filterRow}>
                  <Field label="Start month" className={s.filterField}>
                    <Input
                      type="month"
                      size="sm"
                      value={startMonth}
                      onChange={(event) =>
                        updateSearchParams({ start: event.target.value })
                      }
                      fullWidth
                    />
                  </Field>
                  <Field label="End month" className={s.filterField}>
                    <Input
                      type="month"
                      size="sm"
                      value={endMonth}
                      onChange={(event) =>
                        updateSearchParams({ end: event.target.value })
                      }
                      fullWidth
                    />
                  </Field>
                  <Field label="Metric" className={s.filterField}>
                    <Select
                      options={metricOptions}
                      value={metricKey ?? ''}
                      onChange={(value) =>
                        updateSearchParams({ metric: value })
                      }
                      placeholder="Select metric"
                      fullWidth
                      disabled={metricOptions.length === 0}
                    />
                  </Field>
                </div>
                <Typography
                  variant="caption"
                  tone="muted"
                  className={s.filterNote}
                >
                  {adjusted
                    ? `Range limited to ${MAX_RANGE_MONTHS} months. Start month adjusted to ${formatMonthLabel(
                        startMonth,
                        'long',
                      )}.`
                    : `UTC months. Max range ${MAX_RANGE_MONTHS} months.`}
                </Typography>
              </div>

              <Section
                title="Trend"
                description={
                  selectedMetric
                    ? selectedMetric.description
                    : 'Select a metric to see the trend.'
                }
              >
                <Card className={s.panel} padding="md">
                  {metricsError ? (
                    <Alert
                      tone="danger"
                      title="Unable to load chart"
                      description="Please select another metric or retry."
                    />
                  ) : null}
                  {isMetricsLoading ? (
                    <Skeleton height={260} />
                  ) : chartData.length === 0 || !selectedMetric ? (
                    <EmptyState
                      title="No data for this period"
                      description="Try adjusting the date range."
                    />
                  ) : (
                    <div ref={chartRef} className={s.chart}>
                      {chartWidth > 0 ? (
                        <XYChart
                          width={chartWidth}
                          height={260}
                          xScale={{ type: 'point' }}
                          yScale={{ type: 'linear', nice: true }}
                        >
                          <AnimatedGrid columns={false} numTicks={4} />
                          <AnimatedAxis
                            orientation="bottom"
                            tickFormat={(value) =>
                              formatMonthLabel(String(value), 'short')
                            }
                            numTicks={Math.min(6, chartData.length)}
                          />
                          <AnimatedAxis
                            orientation="left"
                            numTicks={4}
                            tickFormat={(value) =>
                              selectedMetric
                                ? formatMetricValue(
                                    selectedMetric,
                                    Number(value),
                                    'chart',
                                  )
                                : String(value)
                            }
                          />
                          <AnimatedLineSeries
                            dataKey={selectedMetric.label}
                            data={chartData}
                            xAccessor={(datum) => datum.month}
                            yAccessor={(datum) => datum.value}
                          />
                          <ChartTooltip
                            showVerticalCrosshair
                            showSeriesGlyphs
                            renderTooltip={({ tooltipData }) => {
                              const nearest = tooltipData?.nearestDatum;
                              if (!nearest || !selectedMetric) return null;
                              const datum = nearest.datum as ChartDatum;
                              return (
                                <div className={s.chartTooltip}>
                                  <Typography variant="meta" as="div">
                                    {formatMonthLabel(datum.month, 'long')}
                                  </Typography>
                                  <Typography variant="body" as="div">
                                    {formatMetricValue(
                                      selectedMetric,
                                      datum.value,
                                      'tooltip',
                                    )}
                                  </Typography>
                                </div>
                              );
                            }}
                          />
                        </XYChart>
                      ) : (
                        <Skeleton height={260} />
                      )}
                    </div>
                  )}
                </Card>
              </Section>

              <Section title="Monthly">
                <Card className={s.panel} padding="md">
                  {isMainLoading ? (
                    <Skeleton height={240} />
                  ) : mainRange?.data.length ? (
                    <div className={s.tableWrap}>
                      <Table columns={tableColumns} rows={tableRows} />
                    </div>
                  ) : (
                    <EmptyState
                      title="No data for this period"
                      description="Try adjusting the date range."
                    />
                  )}
                </Card>
              </Section>
            </>
          )}
        </Stack>
      </Container>
    </AppShell>
  );
}
