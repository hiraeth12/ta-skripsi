export type HistoryTabKey = "dirasakan" | "terdeteksi" | "tsunami";

export type YearMonthFilter = {
  year: number;
  month: number; // 1-12
};

export const EARLIEST_YEAR = 2024;
export const DIRASAKAN_FIRST = { year: 2026, month: 4 } as const;
export const TERDETEKSI_FIRST = { year: 2024, month: 1 } as const;
export const TSUNAMI_FIRST = { year: 2019, month: 1 } as const;

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

export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value?: string | null): Date | null {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

export function getLast7DayRange(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = new Date(now);
  to.setHours(0, 0, 0, 0);

  const from = new Date(to);
  from.setDate(from.getDate() - 6);

  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

export function resolveIsoDateRange(
  fromIso?: string | null,
  toIso?: string | null,
  now: Date = new Date(),
): { from: string; to: string; fromDate: Date; toDate: Date } {
  const fallback = getLast7DayRange(now);
  const fallbackFrom = parseIsoDate(fallback.from)!;
  const fallbackTo = parseIsoDate(fallback.to)!;

  let fromDate = parseIsoDate(fromIso) ?? fallbackFrom;
  let toDate = parseIsoDate(toIso) ?? fallbackTo;

  if (fromDate.getTime() > toDate.getTime()) {
    const temp = fromDate;
    fromDate = toDate;
    toDate = temp;
  }

  return {
    from: toIsoDate(fromDate),
    to: toIsoDate(toDate),
    fromDate,
    toDate,
  };
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstAvailableMonth(tab: HistoryTabKey): YearMonthFilter {
  if (tab === "dirasakan") return DIRASAKAN_FIRST;
  if (tab === "terdeteksi") return TERDETEKSI_FIRST;
  if (tab === "tsunami") return TSUNAMI_FIRST;
  return { year: EARLIEST_YEAR, month: 1 };
}

export function clampYearMonth(
  input: YearMonthFilter,
  tab: HistoryTabKey,
  now: Date = new Date(),
): YearMonthFilter {
  const current = getNowYearMonth(now);
  const first = getFirstAvailableMonth(tab);
  let year = input.year;
  let month = input.month;

  if (!Number.isFinite(year) || year < first.year) year = first.year;
  if (!Number.isFinite(month) || month < 1) month = 1;
  if (month > 12) month = 12;

  if (year === first.year && month < first.month) {
    month = first.month;
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
  const first = getFirstAvailableMonth(tab);
  if (year < first.year) return true;
  if (year > current.year) return true;
  return false;
}

export function isMonthDisabled(
  year: number,
  month: number,
  tab: HistoryTabKey,
  now: Date = new Date(),
): boolean {
  const current = getNowYearMonth(now);
  const first = getFirstAvailableMonth(tab);
  if (year === current.year && month > current.month) return true;
  if (year < first.year) return true;
  if (year === first.year && month < first.month) return true;
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

export function buildTerdeteksiEventTimeMsRange(year: number, month: number): {
  start: number;
  end: number;
} {
  return {
    start: Date.UTC(year, month - 1, 1, 0, 0, 0, 0),
    end: Date.UTC(year, month, 0, 23, 59, 59, 999),
  };
}

export function buildTerdeteksiEventTimeMsRangeFromIsoDates(
  fromIso?: string | null,
  toIso?: string | null,
  now: Date = new Date(),
): { start: number; end: number; from: string; to: string } {
  const range = resolveIsoDateRange(fromIso, toIso, now);
  return {
    from: range.from,
    to: range.to,
    start: Date.UTC(
      range.fromDate.getFullYear(),
      range.fromDate.getMonth(),
      range.fromDate.getDate(),
      0,
      0,
      0,
      0,
    ),
    end: Date.UTC(
      range.toDate.getFullYear(),
      range.toDate.getMonth(),
      range.toDate.getDate(),
      23,
      59,
      59,
      999,
    ),
  };
}

export function buildDirasakanDateRangesForIsoRange(
  fromIso?: string | null,
  toIso?: string | null,
  now: Date = new Date(),
): Array<{ year: number; month: number; start: string; end: string }> {
  const range = resolveIsoDateRange(fromIso, toIso, now);
  const ranges: Array<{
    year: number;
    month: number;
    start: string;
    end: string;
  }> = [];

  const cursor = new Date(
    range.fromDate.getFullYear(),
    range.fromDate.getMonth(),
    1,
  );

  while (cursor.getTime() <= range.toDate.getTime()) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const isFromMonth =
      year === range.fromDate.getFullYear() &&
      month === range.fromDate.getMonth() + 1;
    const isToMonth =
      year === range.toDate.getFullYear() &&
      month === range.toDate.getMonth() + 1;
    const startDay = isFromMonth ? range.fromDate.getDate() : 1;
    const endDay = isToMonth
      ? range.toDate.getDate()
      : lastDayOfMonth(year, month);
    const yy = String(year).slice(-2);
    const mm = pad2(month);

    ranges.push({
      year,
      month,
      start: `${pad2(startDay)}-${mm}-${yy}`,
      end: `${pad2(endDay)}-${mm}-${yy}`,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return ranges;
}

function getTextField(item: unknown, ...keys: string[]): string {
  const record =
    item && typeof item === "object" ? (item as Record<string, unknown>) : {};

  for (const key of keys) {
    const value = String(record[key] ?? "").trim();
    if (value) return value;
  }

  return "";
}

export function getDirasakanEventTimeMs(item: unknown): number {
  const dateText = getTextField(item, "tanggal", "date");
  const timeText = getTextField(item, "jam", "time");
  const dateMatch = dateText.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (!dateMatch) return Number.NEGATIVE_INFINITY;

  const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const yearRaw = Number.parseInt(dateMatch[3], 10);
  const year = dateMatch[3].length === 2 ? 2000 + yearRaw : yearRaw;
  const month = Number.parseInt(dateMatch[2], 10) - 1;
  const day = Number.parseInt(dateMatch[1], 10);
  const hour = timeMatch ? Number.parseInt(timeMatch[1], 10) : 0;
  const minute = timeMatch ? Number.parseInt(timeMatch[2], 10) : 0;
  const second = timeMatch?.[3] ? Number.parseInt(timeMatch[3], 10) : 0;

  const timestamp = Date.UTC(year, month, day, hour, minute, second, 0);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function isDirasakanInDateRange(
  item: unknown,
  fromIso?: string | null,
  toIso?: string | null,
  now: Date = new Date(),
): boolean {
  const range = buildTerdeteksiEventTimeMsRangeFromIsoDates(
    fromIso,
    toIso,
    now,
  );
  const eventTimeMs = getDirasakanEventTimeMs(item);
  return eventTimeMs >= range.start && eventTimeMs <= range.end;
}

export function sortDirasakanNewestFirst<T>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const timeA = getDirasakanEventTimeMs(a);
    const timeB = getDirasakanEventTimeMs(b);
    if (timeA !== timeB) return timeB - timeA;
    return String(
      getTextField(b, "eventid", "eventId", "timesent"),
    ).localeCompare(String(getTextField(a, "eventid", "eventId", "timesent")));
  });
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
