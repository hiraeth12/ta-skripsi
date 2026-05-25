import type {
  TsunamiMapSlide,
  TsunamiObsArea,
  TsunamiWzArea,
} from "@/features/main-menu/earthquake/components/modal-tsunami-info";

const MAP_ASSET_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

export type TsunamiHistoryFilters = {
  year?: number;
};

export type TsunamiHistoryWarning = {
  id: string;
  warningId: string;
  subject: string;
  headline: string;
  description: string;
  instruction: string;
  timesent: string;
  timesentMs: number;
  shakemap: string;
  wzmap: string;
  ttmap: string;
  sshmap: string;
  wzAreas: TsunamiWzArea[];
  obsAreas: TsunamiObsArea[];
  rawIndex: number;
};

export type TsunamiHistoryEvent = {
  id: string;
  eventKey: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  depth: string;
  area: string;
  date: string;
  time: string;
  latText: string;
  lonText: string;
  latestWarningId: string;
  latestSubject: string;
  latestHeadline: string;
  latestTimesent: string;
  latestWarningIndex: number;
  warnings: TsunamiHistoryWarning[];
  createdAt: string;
  updatedAt: string;
  sortTimeMs: number;
};

const MONTH_ALIASES: Record<string, number> = {
  jan: 1,
  januari: 1,
  january: 1,
  feb: 2,
  februari: 2,
  february: 2,
  mar: 3,
  maret: 3,
  march: 3,
  apr: 4,
  april: 4,
  mei: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  aug: 8,
  ags: 8,
  agu: 8,
  agustus: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  okt: 10,
  oktober: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  des: 12,
  desember: 12,
  december: 12,
};

export function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function rawText(value: unknown): string {
  return String(value ?? "").trim();
}

function safeText(value: unknown, fallback = "-"): string {
  const text = rawText(value);
  return text || fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeYear(value: number): number {
  if (value < 100) return 2000 + value;
  return value;
}

function parseClock(value: unknown): { hour: number; minute: number; second: number } {
  const match = rawText(value)
    .replace(/\s*WIB$/i, "")
    .match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return { hour: 0, minute: 0, second: 0 };

  return {
    hour: Number.parseInt(match[1], 10),
    minute: Number.parseInt(match[2], 10),
    second: Number.parseInt(match[3] ?? "0", 10),
  };
}

function buildTimestamp(
  year: number,
  month: number,
  day: number,
  timeValue?: unknown,
): number {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return Number.NEGATIVE_INFINITY;
  }

  const { hour, minute, second } = parseClock(timeValue);
  const timestamp = new Date(
    normalizeYear(year),
    month - 1,
    day,
    hour,
    minute,
    second,
  ).getTime();

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function parseTsunamiDateTime(
  dateValue: unknown,
  timeValue?: unknown,
): number {
  const raw = rawText(dateValue)
    .replace(/\s*WIB$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return Number.NEGATIVE_INFINITY;

  let match = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]+(\d{1,2}:\d{2}(?::\d{2})?))?/,
  );
  if (match) {
    return buildTimestamp(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10),
      Number.parseInt(match[3], 10),
      match[4] ?? timeValue,
    );
  }

  match = raw.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/,
  );
  if (match) {
    return buildTimestamp(
      Number.parseInt(match[3], 10),
      Number.parseInt(match[2], 10),
      Number.parseInt(match[1], 10),
      match[4] ?? timeValue,
    );
  }

  match = raw.match(
    /^(\d{1,2})-([A-Za-z]+)-(\d{2}|\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/,
  );
  if (match) {
    const month = MONTH_ALIASES[match[2].toLowerCase()];
    if (!month) return Number.NEGATIVE_INFINITY;

    return buildTimestamp(
      Number.parseInt(match[3], 10),
      month,
      Number.parseInt(match[1], 10),
      match[4] ?? timeValue,
    );
  }

  return Number.NEGATIVE_INFINITY;
}

function parseNumber(value: unknown): number {
  const parsed = Number.parseFloat(
    rawText(value)
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseCoordinate(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = rawText(value);
  const parsed = parseNumber(raw);
  if (!Number.isFinite(parsed)) return Number.NaN;

  const upper = raw.toUpperCase();
  if (upper.includes("LS") || upper.includes("BB")) return -Math.abs(parsed);
  if (upper.includes("LU") || upper.includes("BT")) return Math.abs(parsed);
  return parsed;
}

function formatLat(value: number): string {
  return `${Math.abs(value).toFixed(2)}°${value < 0 ? "LS" : "LU"}`;
}

function formatLon(value: number): string {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? "BT" : "BB"}`;
}

function buildAssetUrl(path: unknown): string {
  const value = rawText(path);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${MAP_ASSET_BASE}/${value}`;
}

function hasAnyRecordValue(
  record: Record<string, unknown>,
  keys: string[],
): boolean {
  return keys.some((key) => rawText(record[key]) !== "");
}

function normalizeNestedRecords(value: unknown, directKeys: string[]): Record<string, unknown>[] {
  const direct = asRecord(value);

  if (hasAnyRecordValue(direct, directKeys)) {
    return [direct];
  }

  if (Array.isArray(value)) {
    return value.map((item) => asRecord(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map((item) =>
      asRecord(item),
    );
  }

  return normalizeArray(value).map((item) => asRecord(item));
}

function parseWzAreas(value: unknown): TsunamiWzArea[] {
  return normalizeNestedRecords(value, ["province", "district", "level", "date", "time"])
    .filter((area) =>
      hasAnyRecordValue(area, ["province", "district", "level", "date", "time"]),
    )
    .map((area) => ({
      province: safeText(area.province),
      district: safeText(area.district),
      level: safeText(area.level),
      date: safeText(area.date),
      time: safeText(area.time),
    }));
}

function parseObsAreas(value: unknown): TsunamiObsArea[] {
  return normalizeNestedRecords(value, [
    "location",
    "loclatitude",
    "loclongitude",
    "height",
    "date",
    "time",
  ])
    .filter((area) =>
      hasAnyRecordValue(area, [
        "location",
        "loclatitude",
        "loclongitude",
        "height",
        "date",
        "time",
      ]),
    )
    .map((area) => ({
      location: safeText(area.location),
      loclatitude: safeText(area.loclatitude),
      loclongitude: safeText(area.loclongitude),
      height: safeText(area.height),
      date: safeText(area.date),
      time: safeText(area.time),
    }));
}

function normalizeWarningEntries(value: unknown): Array<{
  key: string;
  value: Record<string, unknown>;
}> {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      key: String(index),
      value: asRecord(item),
    }));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([key, item]) => ({
      key,
      value: asRecord(item),
    }));
  }

  return [];
}

function normalizeWarning(
  entry: { key: string; value: Record<string, unknown> },
  index: number,
): TsunamiHistoryWarning {
  const warningId = rawText(entry.value.warningId) || entry.key || `warning-${index + 1}`;
  const timesent = safeText(entry.value.timesent);

  return {
    id: warningId,
    warningId,
    subject: safeText(entry.value.subject),
    headline: safeText(entry.value.headline),
    description: safeText(entry.value.description),
    instruction: safeText(entry.value.instruction),
    timesent,
    timesentMs: parseTsunamiDateTime(timesent),
    shakemap: buildAssetUrl(entry.value.shakemap),
    wzmap: buildAssetUrl(entry.value.wzmap),
    ttmap: buildAssetUrl(entry.value.ttmap),
    sshmap: buildAssetUrl(entry.value.sshmap),
    wzAreas: parseWzAreas(entry.value.wzarea),
    obsAreas: parseObsAreas(entry.value.obsarea),
    rawIndex: index,
  };
}

function sortWarnings(warnings: TsunamiHistoryWarning[]): TsunamiHistoryWarning[] {
  const hasValidTimesent = warnings.some(
    (warning) => warning.timesentMs !== Number.NEGATIVE_INFINITY,
  );

  if (!hasValidTimesent) return warnings;

  return [...warnings].sort((a, b) => {
    if (a.timesentMs !== b.timesentMs) return a.timesentMs - b.timesentMs;
    return a.rawIndex - b.rawIndex;
  });
}

function getLatestWarningIndex(
  warnings: TsunamiHistoryWarning[],
  latestWarningId: string,
  latestTimesent: string,
): number {
  if (warnings.length === 0) return 0;

  const matchingIdIndex = warnings.findIndex(
    (warning) => warning.warningId === latestWarningId || warning.id === latestWarningId,
  );
  if (matchingIdIndex >= 0) return matchingIdIndex;

  const latestTimesentMs = parseTsunamiDateTime(latestTimesent);
  if (latestTimesentMs !== Number.NEGATIVE_INFINITY) {
    const matchingTimesentIndex = warnings.findIndex(
      (warning) => warning.timesentMs === latestTimesentMs,
    );
    if (matchingTimesentIndex >= 0) return matchingTimesentIndex;
  }

  const hasValidTimesent = warnings.some(
    (warning) => warning.timesentMs !== Number.NEGATIVE_INFINITY,
  );
  if (!hasValidTimesent) return warnings.length - 1;

  return warnings.reduce((latestIndex, warning, index) => {
    const latest = warnings[latestIndex];
    if (warning.timesentMs > latest.timesentMs) return index;
    if (
      warning.timesentMs === latest.timesentMs &&
      warning.rawIndex > latest.rawIndex
    ) {
      return index;
    }
    return latestIndex;
  }, 0);
}

function resolveEventCoordinates(event: Record<string, unknown>): {
  latitude: number;
  longitude: number;
} | null {
  let latitude = parseCoordinate(event.latitude);
  let longitude = parseCoordinate(event.longitude);

  if ((!Number.isFinite(latitude) || !Number.isFinite(longitude)) && event.coordinates) {
    const [lonText, latText] = rawText(event.coordinates)
      .split(",")
      .map((part) => part.trim());
    latitude = parseCoordinate(latText);
    longitude = parseCoordinate(lonText);
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function eventSortTime(event: Record<string, unknown>, latestTimesent: string): number {
  const fromLatestTimesent = parseTsunamiDateTime(latestTimesent);
  if (fromLatestTimesent !== Number.NEGATIVE_INFINITY) return fromLatestTimesent;

  const fromDateTime = parseTsunamiDateTime(event.date, event.time);
  if (fromDateTime !== Number.NEGATIVE_INFINITY) return fromDateTime;

  const fromUpdatedAt = Date.parse(rawText(event.updatedAt));
  if (Number.isFinite(fromUpdatedAt)) return fromUpdatedAt;

  const fromCreatedAt = Date.parse(rawText(event.createdAt));
  if (Number.isFinite(fromCreatedAt)) return fromCreatedAt;

  return Number.NEGATIVE_INFINITY;
}

function normalizeEvent(
  entry: { key: string; value: Record<string, unknown> },
): TsunamiHistoryEvent | null {
  const coords = resolveEventCoordinates(entry.value);
  if (!coords) return null;

  const warnings = sortWarnings(
    normalizeWarningEntries(entry.value.warnings).map((warningEntry, index) =>
      normalizeWarning(warningEntry, index),
    ),
  );
  const latestWarningId = rawText(entry.value.latestWarningId);
  const latestTimesent = rawText(entry.value.latestTimesent);
  const latestWarningIndex = getLatestWarningIndex(
    warnings,
    latestWarningId,
    latestTimesent,
  );
  const latestWarning = warnings[latestWarningIndex];
  const resolvedLatestTimesent = latestTimesent || rawText(latestWarning?.timesent);
  const eventKey = rawText(entry.value.eventKey) || entry.key;

  return {
    id: eventKey,
    eventKey,
    latitude: coords.latitude,
    longitude: coords.longitude,
    magnitude: safeText(entry.value.magnitude),
    depth: safeText(entry.value.depth),
    area: safeText(entry.value.area),
    date: safeText(entry.value.date),
    time: safeText(entry.value.time),
    latText: formatLat(coords.latitude),
    lonText: formatLon(coords.longitude),
    latestWarningId: latestWarningId || rawText(latestWarning?.warningId),
    latestSubject: safeText(entry.value.latestSubject || latestWarning?.subject),
    latestHeadline: safeText(entry.value.latestHeadline || latestWarning?.headline),
    latestTimesent: safeText(resolvedLatestTimesent),
    latestWarningIndex,
    warnings,
    createdAt: rawText(entry.value.createdAt),
    updatedAt: rawText(entry.value.updatedAt),
    sortTimeMs: eventSortTime(entry.value, resolvedLatestTimesent),
  };
}

export function normalizeTsunamiHistoryEvents(rawData: unknown): TsunamiHistoryEvent[] {
  const entries = Array.isArray(rawData)
    ? rawData.map((value, index) => ({ key: String(index), value: asRecord(value) }))
    : rawData && typeof rawData === "object"
      ? Object.entries(rawData as Record<string, unknown>).map(([key, value]) => ({
          key,
          value: asRecord(value),
        }))
      : [];

  return entries
    .map(normalizeEvent)
    .filter((event): event is TsunamiHistoryEvent => Boolean(event))
    .sort((a, b) => b.sortTimeMs - a.sortTimeMs);
}

export function buildTsunamiMapSlides(
  warning?: TsunamiHistoryWarning | null,
): TsunamiMapSlide[] {
  if (!warning) return [];

  return [
    { title: "Shakemap / Peta Guncangan", imageUrl: warning.shakemap },
    { title: "WZMap / Peta Zona Peringatan", imageUrl: warning.wzmap },
    { title: "TTMap / Peta Waktu Tiba Tsunami", imageUrl: warning.ttmap },
    {
      title: "SSHMap / Peta Tinggi Muka Laut / Sea Surface Height",
      imageUrl: warning.sshmap,
    },
  ].filter((slide) => rawText(slide.imageUrl));
}

export function getWarningTabLabel(subject: string, index: number): string {
  const match = subject.match(/\bPD[-\s]*([0-9]+(?:\.[0-9]+)?)\b/i);
  return match ? `PD-${match[1]}` : `Update ${index + 1}`;
}

export function eventMatchesTsunamiYear(
  event: TsunamiHistoryEvent,
  year: number,
): boolean {
  const timestampCandidates = [
    parseTsunamiDateTime(event.latestTimesent),
    parseTsunamiDateTime(event.date, event.time),
    Date.parse(event.updatedAt),
    Date.parse(event.createdAt),
  ];

  return timestampCandidates.some((timestamp) => {
    if (!Number.isFinite(timestamp) || timestamp === Number.NEGATIVE_INFINITY) {
      return false;
    }

    const parsed = new Date(timestamp);
    return parsed.getFullYear() === year;
  });
}

export function applyTsunamiHistoryFilters(
  events: TsunamiHistoryEvent[],
  filters: TsunamiHistoryFilters,
): TsunamiHistoryEvent[] {
  return events.filter((event) => {
    if (
      Number.isFinite(filters.year) &&
      !eventMatchesTsunamiYear(event, filters.year!)
    ) {
      return false;
    }

    return true;
  });
}
