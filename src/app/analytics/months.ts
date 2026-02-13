const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export type MonthId = string;

type MonthParts = {
  year: number;
  monthIndex: number;
};

export function isValidMonthId(value: string | null | undefined): value is MonthId {
  if (!value || !MONTH_PATTERN.test(value)) return false;
  const month = Number(value.slice(5));
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

export function parseMonthId(value: MonthId): MonthParts {
  const year = Number(value.slice(0, 4));
  const monthIndex = Number(value.slice(5)) - 1;
  return { year, monthIndex };
}

export function toMonthId(year: number, monthIndex: number): MonthId {
  const month = monthIndex + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function compareMonthIds(a: MonthId, b: MonthId): number {
  const aParts = parseMonthId(a);
  const bParts = parseMonthId(b);
  if (aParts.year !== bParts.year) return aParts.year - bParts.year;
  return aParts.monthIndex - bParts.monthIndex;
}

export function addMonths(month: MonthId, delta: number): MonthId {
  const { year, monthIndex } = parseMonthId(month);
  const total = year * 12 + monthIndex + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonthIndex = ((total % 12) + 12) % 12;
  return toMonthId(nextYear, nextMonthIndex);
}

export function diffInMonths(start: MonthId, end: MonthId): number {
  const startParts = parseMonthId(start);
  const endParts = parseMonthId(end);
  return endParts.year * 12 + endParts.monthIndex - (startParts.year * 12 + startParts.monthIndex);
}

export function getMonthRange(start: MonthId, end: MonthId): MonthId[] {
  const range: MonthId[] = [];
  if (compareMonthIds(start, end) > 0) return range;
  let current = start;
  while (compareMonthIds(current, end) <= 0) {
    range.push(current);
    current = addMonths(current, 1);
  }
  return range;
}

export function getLastFullMonthId(): MonthId {
  const now = new Date();
  let year = now.getUTCFullYear();
  let monthIndex = now.getUTCMonth() - 1;
  if (monthIndex < 0) {
    monthIndex = 11;
    year -= 1;
  }
  return toMonthId(year, monthIndex);
}

export function getDefaultRange(): { start: MonthId; end: MonthId } {
  const end = getLastFullMonthId();
  const start = addMonths(end, -11);
  return { start, end };
}

export function normalizeRange(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined,
  fallback: { start: MonthId; end: MonthId },
  maxMonths: number,
): { start: MonthId; end: MonthId; adjusted: boolean } {
  let start = isValidMonthId(startRaw) ? startRaw : fallback.start;
  let end = isValidMonthId(endRaw) ? endRaw : fallback.end;
  if (compareMonthIds(start, end) > 0) {
    end = start;
  }
  let adjusted = false;
  const diff = diffInMonths(start, end);
  if (diff >= maxMonths) {
    start = addMonths(end, -(maxMonths - 1));
    adjusted = true;
  }
  return { start, end, adjusted };
}

export function formatMonthLabel(month: MonthId, variant: 'short' | 'long' = 'short') {
  const { year, monthIndex } = parseMonthId(month);
  const date = new Date(Date.UTC(year, monthIndex, 1));
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: variant === 'short' ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return formatter.format(date);
}
