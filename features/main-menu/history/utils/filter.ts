export type HistoryTabKey = "dirasakan" | "terdeteksi";

export type YearMonthFilter = {
  year: number;
  month: number; // 1-12
};

export const EARLIEST_YEAR = 2023;
export const DIRASAKAN_FIRST = { year: 2026, month: 4 } as const;

export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function getNowYearMonth(now: Date = new Date()): YearMonthFilter {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function clampYearMonth(
  input: YearMonthFilter,
  tab: HistoryTabKey,
  now: Date = new Date(),
): YearMonthFilter {
  const current = getNowYearMonth(now);
  let year = input.year;
  let month = input.month;

  if (!Number.isFinite(year) || year < EARLIEST_YEAR) year = EARLIEST_YEAR;
  if (!Number.isFinite(month) || month < 1) month = 1;
  if (month > 12) month = 12;

  if (tab === "dirasakan") {
    if (year < DIRASAKAN_FIRST.year) {
      year = DIRASAKAN_FIRST.year;
      month = DIRASAKAN_FIRST.month;
    } else if (year === DIRASAKAN_FIRST.year && month < DIRASAKAN_FIRST.month) {
      month = DIRASAKAN_FIRST.month;
    }
  }

  if (year > current.year) {
    year = current.year;
    month = current.month;
  } else if (year === current.year && month > current.month) {
    month = current.month;
  }

  return { year, month };
}

export function isYearDisabled(
  year: number,
  tab: HistoryTabKey,
  now: Date = new Date(),
): boolean {
  const current = getNowYearMonth(now);
  if (year < EARLIEST_YEAR) return true;
  if (year > current.year) return true;
  if (tab === "dirasakan" && year < DIRASAKAN_FIRST.year) return true;
  return false;
}

export function isMonthDisabled(
  year: number,
  month: number,
  tab: HistoryTabKey,
  now: Date = new Date(),
): boolean {
  const current = getNowYearMonth(now);
  if (year === current.year && month > current.month) return true;
  if (tab === "dirasakan") {
    if (year < DIRASAKAN_FIRST.year) return true;
    if (year === DIRASAKAN_FIRST.year && month < DIRASAKAN_FIRST.month) return true;
  }
  if (year < EARLIEST_YEAR) return true;
  return false;
}

export function buildDirasakanDateRange(year: number, month: number): {
  start: string;
  end: string;
} {
  const dayEnd = lastDayOfMonth(year, month);
  const mm = pad2(month);
  const yy = String(year).slice(-2);
  return {
    start: `01-${mm}-${yy}`,
    end: `${pad2(dayEnd)}-${mm}-${yy}`,
  };
}

export function buildTerdeteksiTimeRange(year: number, month: number): {
  start: string;
  end: string;
} {
  const dayEnd = lastDayOfMonth(year, month);
  const mm = pad2(month);
  const endDay = pad2(dayEnd);
  return {
    start: `${year}-${mm}-01 00:00:00`,
    end: `${year}-${mm}-${endDay} 23:59:59`,
  };
}

export function matchesDirasakanMonth(
  value: unknown,
  year: number,
  month: number,
): boolean {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (!match) return false;

  const parsedMonth = Number.parseInt(match[2], 10);
  const parsedYearRaw = Number.parseInt(match[3], 10);
  const parsedYear = match[3].length === 2 ? 2000 + parsedYearRaw : parsedYearRaw;
  return parsedYear === year && parsedMonth === month;
}

export function matchesTerdeteksiMonth(
  value: unknown,
  year: number,
  month: number,
): boolean {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return false;

  const parsedYear = Number.parseInt(match[1], 10);
  const parsedMonth = Number.parseInt(match[2], 10);
  return parsedYear === year && parsedMonth === month;
}

export function parseFilterMonthsParam(value?: string | null): number[] {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12);
}

export function serializeFilterMonths(months: number[]): string {
  return [...new Set(months)]
    .filter((month) => Number.isFinite(month) && month >= 1 && month <= 12)
    .sort((a, b) => a - b)
    .map((month) => String(month))
    .join(",");
}

export function normalizeFilterMonths(
  months: number[],
  year: number,
  tab: HistoryTabKey,
  now: Date = new Date(),
): number[] {
  const unique = [...new Set(months)]
    .filter((month) => !isMonthDisabled(year, month, tab, now))
    .sort((a, b) => a - b);

  if (unique.length > 0) return unique;

  const fallback = clampYearMonth({ year, month: getNowYearMonth(now).month }, tab, now);
  return [fallback.month];
}
