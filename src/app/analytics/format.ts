import type { AnalyticsMetricDefinition } from './metricRegistry';

export type FormatVariant = 'card' | 'table' | 'chart' | 'tooltip' | 'delta';
type DurationUnit = 's' | 'ms';

type DeltaResult = {
  label: string;
  isPositive: boolean | null;
};

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const STAR_SUFFIX = ' ⭐️';
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(options: Intl.NumberFormatOptions) {
  const key = JSON.stringify(options);
  const existing = numberFormatCache.get(key);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat(undefined, options);
  numberFormatCache.set(key, formatter);
  return formatter;
}

export function formatCount(value: number, precision = 0) {
  const formatter = getNumberFormatter({
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  });
  return formatter.format(value);
}

export function formatStars(value: number, precision = 2) {
  return `${formatCount(value, precision)}${STAR_SUFFIX}`;
}

function formatUsd(value: number, precision = 2) {
  const key = `usd-${precision}`;
  const existing = currencyFormatterCache.get(key);
  if (existing) return existing.format(value);
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  currencyFormatterCache.set(key, formatter);
  return formatter.format(value);
}

function formatPercent(value: number, precision = 1) {
  const formatter = getNumberFormatter({
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  });
  return `${formatter.format(value * 100)}%`;
}

function formatDurationShort(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatDurationClock(value: number) {
  const totalSeconds = Math.max(0, Math.round(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDurationMs(value: number, variant: FormatVariant) {
  const ms = Math.max(0, value);
  if (variant === 'tooltip') {
    return `${Math.round(ms)} ms`;
  }

  const seconds = ms / 1000;
  if (variant === 'card' || variant === 'delta') {
    if (seconds >= 60) return formatDurationClock(seconds);
    if (seconds >= 1) return `${seconds.toFixed(1)}s`;
    return `${Math.round(ms)} ms`;
  }

  if (seconds >= 60) return formatDurationClock(seconds);
  if (seconds >= 1) return `${seconds.toFixed(2)}s`;
  return `${Math.round(ms)} ms`;
}

function formatDuration(
  value: number,
  variant: FormatVariant,
  unit: DurationUnit = 's',
) {
  if (unit === 'ms') {
    return formatDurationMs(value, variant);
  }
  if (variant === 'tooltip') {
    return `${Math.round(value)} sec`;
  }
  if (variant === 'card' || variant === 'delta') {
    return formatDurationShort(value);
  }
  return formatDurationClock(value);
}

export function formatMetricValue(
  metric: AnalyticsMetricDefinition,
  value: number | null | undefined,
  variant: FormatVariant,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  switch (metric.format) {
    case 'percent':
      return formatPercent(value, metric.precision ?? 1);
    case 'duration':
      return formatDuration(value, variant, metric.durationUnit ?? 's');
    case 'currency':
      return metric.currency === 'usd'
        ? formatUsd(value, metric.precision ?? 2)
        : formatStars(value, metric.precision ?? 2);
    default:
      return formatCount(value, metric.precision ?? 0);
  }
}

export function formatMetricDelta(
  metric: AnalyticsMetricDefinition,
  current: number | null | undefined,
  previous: number | null | undefined,
): DeltaResult | null {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;

  const diff = current - previous;
  if (diff === 0) {
    return { label: 'No change', isPositive: null };
  }

  const sign = diff > 0 ? '+' : '−';

  if (metric.format === 'percent') {
    const points = Math.abs(diff) * 100;
    const formatter = getNumberFormatter({
      maximumFractionDigits: metric.precision ?? 1,
      minimumFractionDigits: metric.precision ?? 1,
    });
    return { label: `${sign}${formatter.format(points)} pp`, isPositive: diff > 0 };
  }

  if (metric.format === 'duration') {
    return {
      label: `${sign}${formatDuration(Math.abs(diff), 'delta', metric.durationUnit ?? 's')}`,
      isPositive: diff > 0,
    };
  }

  if (metric.format === 'currency') {
    const formatted =
      metric.currency === 'usd'
        ? formatUsd(Math.abs(diff), metric.precision ?? 2)
        : formatStars(Math.abs(diff), metric.precision ?? 2);
    return {
      label: `${sign}${formatted}`,
      isPositive: diff > 0,
    };
  }

  const formatter = getNumberFormatter({
    maximumFractionDigits: metric.precision ?? 0,
    minimumFractionDigits: metric.precision ?? 0,
  });
  return {
    label: `${sign}${formatter.format(Math.abs(diff))}`,
    isPositive: diff > 0,
  };
}
