import { parseCoordinateText } from "@/utils/geo";

type UnknownRecord = Record<string, unknown>;

export type NormalizedTerdeteksiHistoryItem = {
  eventid: string;
  eventTimeMs: number;
  tanggal: string;
  jam: string;
  waktu: string;
  magnitude: string;
  kedalaman: string;
  lokasi: string;
  latitude: number;
  longitude: number;
  felt: string;
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function splitWaktu(value: unknown): { tanggal: string; jam: string } {
  const [tanggal = "", jamRaw = ""] = String(value ?? "").trim().split(/\s+/);
  return {
    tanggal,
    jam: jamRaw.split(".")[0] ?? "",
  };
}

function parseDateTimeMs(value: unknown): number {
  const raw = String(value ?? "").trim();
  const match = raw.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!match) return Number.NEGATIVE_INFINITY;

  const timestamp = Date.UTC(
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10) - 1,
    Number.parseInt(match[3], 10),
    Number.parseInt(match[4], 10),
    Number.parseInt(match[5], 10),
    match[6] ? Number.parseInt(match[6], 10) : 0,
  );

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function toTerdeteksiHistoryArray(rawData: unknown): unknown[] {
  const root = asRecord(rawData);
  const itemsNode = root.items ?? rawData;

  if (Array.isArray(itemsNode)) return itemsNode.filter(Boolean);

  if (itemsNode && typeof itemsNode === "object") {
    return Object.values(itemsNode).filter(Boolean);
  }

  return [];
}

export function getTerdeteksiEventTimeMs(item: unknown): number {
  const root = asRecord(item);
  const props = asRecord(root.properties ?? root);
  const rawEventTimeMs = Number(props.eventTimeMs);

  if (Number.isFinite(rawEventTimeMs)) return rawEventTimeMs;

  const fallbackWaktu = firstText(
    props.waktu,
    props.time,
    `${firstText(props.tanggal)} ${firstText(props.jam)}`.trim(),
  );

  return parseDateTimeMs(fallbackWaktu);
}

export function isTerdeteksiInMonth(
  item: unknown,
  year: number,
  month: number,
): boolean {
  const eventTimeMs = getTerdeteksiEventTimeMs(item);

  if (Number.isFinite(eventTimeMs)) {
    const eventDate = new Date(eventTimeMs);
    return (
      eventDate.getUTCFullYear() === year &&
      eventDate.getUTCMonth() + 1 === month
    );
  }

  const root = asRecord(item);
  const props = asRecord(root.properties ?? root);
  const tanggal = firstText(props.tanggal, splitWaktu(props.waktu).tanggal);
  const match = tanggal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return false;

  return (
    Number.parseInt(match[1], 10) === year &&
    Number.parseInt(match[2], 10) === month
  );
}

export function sortTerdeteksiNewestFirst<T>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => getTerdeteksiEventTimeMs(b) - getTerdeteksiEventTimeMs(a),
  );
}

export function normalizeTerdeteksiHistoryItem(
  item: unknown,
): NormalizedTerdeteksiHistoryItem | null {
  const root = asRecord(item);
  const props = asRecord(root.properties ?? root);
  const coordinates = asRecord(props.coordinates);
  const geometry = asRecord(root.geometry);
  const geometryCoordinates = Array.isArray(geometry.coordinates)
    ? geometry.coordinates
    : [];

  const eventid = firstText(props.eventid);
  if (!eventid) return null;

  const latitude = parseCoordinateText(
    props.latitude ?? props.lat ?? coordinates.latitude ?? geometryCoordinates[1],
  );
  const longitude = parseCoordinateText(
    props.longitude ?? props.lon ?? coordinates.longitude ?? geometryCoordinates[0],
  );
  if (latitude === null || longitude === null) return null;

  const eventTimeMs = getTerdeteksiEventTimeMs(props);
  if (!Number.isFinite(eventTimeMs)) return null;

  const waktuParts = splitWaktu(firstText(props.waktu, props.time));
  const tanggal = firstText(props.tanggal, waktuParts.tanggal);
  const jam = firstText(props.jam, waktuParts.jam);
  const waktu = firstText(props.waktu, props.time, `${tanggal} ${jam}`.trim());

  return {
    eventid,
    eventTimeMs,
    tanggal,
    jam,
    waktu,
    magnitude: firstText(props.magnitude, props.mag, "0.0"),
    kedalaman: firstText(props.kedalaman, props.depth),
    lokasi: firstText(props.lokasi, props.place, props.area),
    latitude,
    longitude,
    felt: firstText(props.felt, props.fase),
  };
}
