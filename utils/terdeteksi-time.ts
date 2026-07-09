const WIB_OFFSET_MINUTES = 7 * 60;
const WIB_OFFSET_MS = WIB_OFFSET_MINUTES * 60 * 1000;

export type TerdeteksiWibTimeInput = {
  eventTimeMs?: unknown;
  waktu?: unknown;
  tanggal?: unknown;
  jam?: unknown;
};

export type NormalizedTerdeteksiWibTime = {
  eventTimeMs: number;
  tanggal: string;
  jam: string;
  waktu: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function pad3(value: number): string {
  return String(value).padStart(3, "0");
}

function parseTimezoneOffsetMinutes(value: string): number | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized === "Z" || normalized === "UTC") return 0;
  if (normalized === "WIB" || normalized === "UTC+7") return WIB_OFFSET_MINUTES;

  const offsetText = normalized.startsWith("UTC")
    ? normalized.slice(3)
    : normalized;
  const match = offsetText.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return sign * (hours * 60 + minutes);
}

function parseDateTimeText(value: unknown): number | null {
  const raw = text(value).replace(",", " ");
  const match = raw.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?\s*(Z|UTC(?:[+-]\d{1,2}(?::?\d{2})?)?|WIB|[+-]\d{1,2}:?\d{2})?$/i,
  );
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = match[6] ? Number.parseInt(match[6], 10) : 0;
  const millisecond = match[7]
    ? Number.parseInt(match[7].padEnd(3, "0").slice(0, 3), 10)
    : 0;
  const offsetMinutes = parseTimezoneOffsetMinutes(match[8] ?? "");

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second) ||
    !Number.isFinite(millisecond) ||
    offsetMinutes === null
  ) {
    return null;
  }

  const timestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  ) - offsetMinutes * 60 * 1000;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function getInputEventTimeMs(input: TerdeteksiWibTimeInput): number | null {
  const rawEventTimeMs = input.eventTimeMs;
  if (
    typeof rawEventTimeMs === "number" ||
    (typeof rawEventTimeMs === "string" && rawEventTimeMs.trim())
  ) {
    const parsed = Number(rawEventTimeMs);
    if (Number.isFinite(parsed)) return parsed;
  }

  const waktu = text(input.waktu);
  if (waktu) {
    const parsed = parseDateTimeText(waktu);
    if (parsed !== null) return parsed;
  }

  const tanggal = text(input.tanggal);
  const jam = text(input.jam);
  if (tanggal || jam) {
    const parsed = parseDateTimeText(`${tanggal} ${jam}`.trim());
    if (parsed !== null) return parsed;
  }

  return null;
}

export function ensureTerdeteksiWibSuffix(jam: string): string {
  const cleaned = text(jam)
    .replace(/\s*(WIB|UTC(?:[+-]\d{1,2}(?::?\d{2})?)?|Z|[+-]\d{1,2}:?\d{2})$/i, "")
    .trim();

  return cleaned ? `${cleaned} WIB` : "";
}

export function normalizeTerdeteksiWibTime(
  input: TerdeteksiWibTimeInput,
): NormalizedTerdeteksiWibTime | null {
  const eventTimeMs = getInputEventTimeMs(input);
  if (eventTimeMs === null) return null;

  const wibDate = new Date(eventTimeMs + WIB_OFFSET_MS);
  const tanggal = [
    wibDate.getUTCFullYear(),
    pad2(wibDate.getUTCMonth() + 1),
    pad2(wibDate.getUTCDate()),
  ].join("-");
  const jam = [
    pad2(wibDate.getUTCHours()),
    pad2(wibDate.getUTCMinutes()),
    pad2(wibDate.getUTCSeconds()),
  ].join(":");
  const jamWib = `${jam} WIB`;

  return {
    eventTimeMs,
    tanggal,
    jam: jamWib,
    waktu: `${tanggal} ${jamWib}`,
  };
}
