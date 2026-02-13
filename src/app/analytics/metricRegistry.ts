export type AnalyticsSection = 'main' | 'payments' | 'technical';

export type AnalyticsMetricKey =
  | 'bounceRate'
  | 'retentionRate'
  | 'churnRate'
  | 'uniqueUsers'
  | 'activeUsers'
  | 'newUsers'
  | 'stickinessRatio'
  | 'avgSessionDurationSec'
  | 'avgMessagesPerSession'
  | 'chatRecoveryRate'
  | 'conversionRate'
  | 'repeatPurchaseRate'
  | 'averagePurchaseValue'
  | 'cohortLtvM0'
  | 'averageRevenuePerUser'
  | 'totalTransactions'
  | 'errorRate'
  | 'avgResponseTime'
  | 'totalLlmCost'
  | 'imgGenTotalAvg'
  | 'imgGenGenerationAvg'
  | 'imgGenerationTotal'
  | 'imgGenerationPerChat';

export type MetricFormat = 'percent' | 'count' | 'duration' | 'currency';

export type AnalyticsMetricDefinition = {
  key: AnalyticsMetricKey;
  label: string;
  description: string;
  format: MetricFormat;
  section: AnalyticsSection;
  precision?: number;
  currency?: 'stars' | 'usd';
  durationUnit?: 's' | 'ms';
};

export type AnalyticsSectionConfig = {
  key: AnalyticsSection;
  label: string;
  available: boolean;
  metrics: AnalyticsMetricDefinition[];
  defaultMetric: AnalyticsMetricKey | null;
};

const MAIN_METRICS: AnalyticsMetricDefinition[] = [
  {
    key: 'bounceRate',
    label: 'Bounce rate',
    description:
      'Users whose total number of messages is exactly 1 and whose first message was in the month / new users in the month.',
    format: 'percent',
    section: 'main',
    precision: 1,
  },
  {
    key: 'retentionRate',
    label: 'Retention rate',
    description:
      'Active users this month minus new users this month, divided by active users last month.',
    format: 'percent',
    section: 'main',
    precision: 1,
  },
  {
    key: 'churnRate',
    label: 'Churn rate',
    description: 'One minus retention rate.',
    format: 'percent',
    section: 'main',
    precision: 1,
  },
  {
    key: 'uniqueUsers',
    label: 'Unique users',
    description: 'Users with at least one session in the month.',
    format: 'count',
    section: 'main',
  },
  {
    key: 'activeUsers',
    label: 'Active users',
    description: 'Users with more than 2 sessions in the month.',
    format: 'count',
    section: 'main',
  },
  {
    key: 'newUsers',
    label: 'New users',
    description: 'Users whose first-ever message was in the month.',
    format: 'count',
    section: 'main',
  },
  {
    key: 'stickinessRatio',
    label: 'Stickiness ratio',
    description: 'Average DAU divided by MAU.',
    format: 'percent',
    section: 'main',
    precision: 1,
  },
  {
    key: 'avgSessionDurationSec',
    label: 'Avg session duration',
    description: 'Average duration of sessions in seconds.',
    format: 'duration',
    section: 'main',
  },
  {
    key: 'avgMessagesPerSession',
    label: 'Avg messages per session',
    description: 'Average number of user messages in a session.',
    format: 'count',
    section: 'main',
    precision: 1,
  },
  {
    key: 'chatRecoveryRate',
    label: 'Recovery rate',
    description: 'Unblocked events divided by blocked events in the month.',
    format: 'percent',
    section: 'main',
    precision: 1,
  },
];

const PAYMENTS_METRICS: AnalyticsMetricDefinition[] = [
  {
    key: 'conversionRate',
    label: 'Conversion rate',
    description:
      'Unique users with at least one payment in month / active users in month.',
    format: 'percent',
    section: 'payments',
    precision: 1,
  },
  {
    key: 'repeatPurchaseRate',
    label: 'Repeat purchase rate',
    description:
      'Users with at least 2 payments by month-end / users with at least 1 payment by month-end.',
    format: 'percent',
    section: 'payments',
    precision: 1,
  },
  {
    key: 'averagePurchaseValue',
    label: 'Average purchase value',
    description: 'Total revenue in month / number of payments in month.',
    format: 'currency',
    section: 'payments',
    precision: 2,
    currency: 'usd',
  },
  {
    key: 'cohortLtvM0',
    label: 'Cohort LTV M0',
    description:
      'Average revenue in the first month from users whose first payment is in that month.',
    format: 'currency',
    section: 'payments',
    precision: 2,
    currency: 'usd',
  },
  {
    key: 'averageRevenuePerUser',
    label: 'ARPU',
    description: 'Total revenue in month / active users in month.',
    format: 'currency',
    section: 'payments',
    precision: 2,
    currency: 'usd',
  },
  {
    key: 'totalTransactions',
    label: 'Total transactions',
    description: 'Number of payments in month.',
    format: 'count',
    section: 'payments',
  },
];

const TECHNICAL_METRICS: AnalyticsMetricDefinition[] = [
  {
    key: 'errorRate',
    label: 'Error rate',
    description: 'Errors divided by responses plus errors.',
    format: 'percent',
    section: 'technical',
    precision: 1,
  },
  {
    key: 'avgResponseTime',
    label: 'Avg response time',
    description: 'Average of chat response total latency.',
    format: 'duration',
    section: 'technical',
    durationUnit: 'ms',
  },
  {
    key: 'totalLlmCost',
    label: 'Total LLM cost',
    description: 'Sum of llm_call.price.',
    format: 'currency',
    section: 'technical',
    precision: 2,
    currency: 'usd',
  },
  {
    key: 'imgGenTotalAvg',
    label: 'Img response avg',
    description:
      'Average of image response total latency (prompt generation + image generation + image upload).',
    format: 'duration',
    section: 'technical',
    durationUnit: 'ms',
  },
  {
    key: 'imgGenGenerationAvg',
    label: 'Img generation avg',
    description: 'Average of image generation latency.',
    format: 'duration',
    section: 'technical',
    durationUnit: 'ms',
  },
  {
    key: 'imgGenerationTotal',
    label: 'Img generation total',
    description: 'Count of image generation events.',
    format: 'count',
    section: 'technical',
  },
  {
    key: 'imgGenerationPerChat',
    label: 'Img generation per chat',
    description: 'Image generations per distinct chat.',
    format: 'count',
    section: 'technical',
    precision: 2,
  },
];

const SECTIONS: AnalyticsSectionConfig[] = [
  {
    key: 'main',
    label: 'Main',
    available: true,
    metrics: MAIN_METRICS,
    defaultMetric: 'retentionRate',
  },
  {
    key: 'payments',
    label: 'Payments',
    available: true,
    metrics: PAYMENTS_METRICS,
    defaultMetric: 'conversionRate',
  },
  {
    key: 'technical',
    label: 'Technical',
    available: true,
    metrics: TECHNICAL_METRICS,
    defaultMetric: 'errorRate',
  },
];

const METRIC_MAP = new Map(
  [...MAIN_METRICS, ...PAYMENTS_METRICS, ...TECHNICAL_METRICS].map((metric) => [
    metric.key,
    metric,
  ]),
);

export function getSectionConfig(
  section: AnalyticsSection,
): AnalyticsSectionConfig {
  return SECTIONS.find((item) => item.key === section) ?? SECTIONS[0];
}

export function getMetricDefinition(
  key: AnalyticsMetricKey | null,
): AnalyticsMetricDefinition | null {
  if (!key) return null;
  return METRIC_MAP.get(key) ?? null;
}

export function isValidSection(
  value: string | null | undefined,
): value is AnalyticsSection {
  return value === 'main' || value === 'payments' || value === 'technical';
}

export function isMetricForSection(
  value: string | null | undefined,
  section: AnalyticsSection,
): value is AnalyticsMetricKey {
  if (!value) return false;
  const config = getSectionConfig(section);
  return config.metrics.some((metric) => metric.key === value);
}

export function getSectionOptions() {
  return SECTIONS.map((section) => ({
    value: section.key,
    label: section.label,
    disabled: !section.available,
  }));
}

export function getMetricOptions(section: AnalyticsSection) {
  return getSectionConfig(section).metrics.map((metric) => ({
    value: metric.key,
    label: metric.label,
  }));
}
