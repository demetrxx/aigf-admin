import {
  type IPlan,
  type PlanItem,
  PlanPeriod,
  PlanType,
} from '@/common/types';

const PLANS_TRANSFER_SCHEMA = 'aera-plans';
const PLANS_TRANSFER_VERSION = 1;

const PLAN_CODE_PATTERN = /^[a-z0-9-]+$/;

export type PlanTransferItem = {
  code: string;
  type: PlanType;
  period?: PlanPeriod;
  periodCount?: number;
  price: number;
  air: number;
  isActive: boolean;
  isRecommended: boolean;
  items?: PlanItem[];
};

export type PlansTransferPayload = {
  schema: typeof PLANS_TRANSFER_SCHEMA;
  version: typeof PLANS_TRANSFER_VERSION;
  exportedAt: string;
  plans: PlanTransferItem[];
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

function ensureBoolean(value: unknown, path: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid import file: "${path}" must be a boolean.`);
  }
  return value;
}

function ensurePositiveInteger(value: unknown, path: string) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isInteger(value)
  ) {
    throw new Error(
      `Invalid import file: "${path}" must be a whole number greater than 0.`,
    );
  }
  return value;
}

function ensurePlanType(value: unknown, path: string) {
  const planType = ensureString(value, path);
  if (!Object.values(PlanType).includes(planType as PlanType)) {
    throw new Error(`Invalid import file: "${path}" has unsupported value.`);
  }
  return planType as PlanType;
}

function ensurePlanPeriod(value: unknown, path: string) {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  const period = ensureString(value, path);
  if (!Object.values(PlanPeriod).includes(period as PlanPeriod)) {
    throw new Error(`Invalid import file: "${path}" has unsupported value.`);
  }
  return period as PlanPeriod;
}

function parsePlanItems(value: unknown, path: string): PlanItem[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`Invalid import file: "${path}" must be an array.`);
  }
  return value.map((item, index) => {
    const itemObj = ensureRecord(item, `${path}[${index}]`);
    return {
      emoji: ensureNonEmptyString(itemObj.emoji, `${path}[${index}].emoji`),
      value: ensureNonEmptyString(itemObj.value, `${path}[${index}].value`),
    };
  });
}

function validateTransferPlan(plan: PlanTransferItem, path: string) {
  if (!PLAN_CODE_PATTERN.test(plan.code)) {
    throw new Error(
      `Invalid import file: "${path}.code" must contain lowercase letters, numbers, and dashes only.`,
    );
  }
  if (plan.type === PlanType.Subscription) {
    if (!plan.period) {
      throw new Error(
        `Invalid import file: "${path}.period" is required for subscription plans.`,
      );
    }
    if (!plan.periodCount) {
      throw new Error(
        `Invalid import file: "${path}.periodCount" is required for subscription plans.`,
      );
    }
  }
}

function parseTransferPlan(value: unknown, path: string): PlanTransferItem {
  const obj = ensureRecord(value, path);
  const code = ensureNonEmptyString(obj.code, `${path}.code`);
  const type = ensurePlanType(obj.type, `${path}.type`);
  const periodRaw = obj.period;
  const periodCountRaw = obj.periodCount;
  const period =
    periodRaw === undefined
      ? undefined
      : ensurePlanPeriod(periodRaw, `${path}.period`);
  const periodCount =
    periodCountRaw === undefined
      ? undefined
      : periodCountRaw === null
        ? undefined
        : ensurePositiveInteger(periodCountRaw, `${path}.periodCount`);

  const parsed: PlanTransferItem = {
    code,
    type,
    period,
    periodCount,
    price: ensurePositiveInteger(obj.price, `${path}.price`),
    air: ensurePositiveInteger(obj.air, `${path}.air`),
    isActive: ensureBoolean(obj.isActive, `${path}.isActive`),
    isRecommended: ensureBoolean(obj.isRecommended, `${path}.isRecommended`),
    items: parsePlanItems(obj.items, `${path}.items`),
  };

  validateTransferPlan(parsed, path);
  return parsed;
}

function sanitizeItems(items: IPlan['items']) {
  const next = (items ?? [])
    .map((item) => ({
      emoji: item.emoji?.trim() ?? '',
      value: item.value?.trim() ?? '',
    }))
    .filter((item) => item.emoji && item.value);
  return next.length > 0 ? next : undefined;
}

function ensureUniquePlanCodes(plans: PlanTransferItem[], path: string) {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    counts.set(plan.code, (counts.get(plan.code) ?? 0) + 1);
  }
  const duplicates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([code]) => code);
  if (duplicates.length > 0) {
    throw new Error(
      `Invalid import file: duplicate plan codes in "${path}": ${duplicates.join(', ')}.`,
    );
  }
}

export function buildPlansTransferPayload(plans: IPlan[]) {
  const mapped = plans.map((plan, index) => {
    const code = plan.code?.trim();
    if (!code) {
      throw new Error(
        `Unable to export plans: plan #${index + 1} has empty code.`,
      );
    }

    const mappedPlan: PlanTransferItem = {
      code,
      type: plan.type,
      period: plan.period,
      periodCount: plan.periodCount,
      price: ensurePositiveInteger(plan.price, `plans[${index}].price`),
      air: ensurePositiveInteger(plan.air, `plans[${index}].air`),
      isActive: Boolean(plan.isActive),
      isRecommended: Boolean(plan.isRecommended),
      items: sanitizeItems(plan.items),
    };
    validateTransferPlan(mappedPlan, `plans[${index}]`);
    return mappedPlan;
  });

  ensureUniquePlanCodes(mapped, 'plans');

  return {
    schema: PLANS_TRANSFER_SCHEMA,
    version: PLANS_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    plans: mapped,
  } satisfies PlansTransferPayload;
}

export function buildPlansTransferFileName() {
  return 'plans.json';
}

export function downloadPlansTransferFile(
  payload: PlansTransferPayload,
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

export async function parsePlansTransferFile(file: File) {
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

  if (schema !== PLANS_TRANSFER_SCHEMA) {
    throw new Error(
      `Invalid import file: unsupported schema "${schema}". Expected "${PLANS_TRANSFER_SCHEMA}".`,
    );
  }
  if (version !== PLANS_TRANSFER_VERSION) {
    throw new Error(
      `Invalid import file: unsupported version "${String(version)}".`,
    );
  }

  const plansValue = payloadObj.plans;
  if (!Array.isArray(plansValue)) {
    throw new Error('Invalid import file: "plans" must be an array.');
  }

  const plans = plansValue.map((plan, index) =>
    parseTransferPlan(plan, `plans[${index}]`),
  );
  ensureUniquePlanCodes(plans, 'plans');

  return {
    schema: PLANS_TRANSFER_SCHEMA,
    version: PLANS_TRANSFER_VERSION,
    exportedAt: ensureString(payloadObj.exportedAt, 'exportedAt'),
    plans,
  } satisfies PlansTransferPayload;
}
