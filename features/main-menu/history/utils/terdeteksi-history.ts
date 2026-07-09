import { parseCoordinateText } from "@/utils/geo";
import { normalizeTerdeteksiWibTime } from "@/utils/terdeteksi-time";

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
  const eventTime = normalizeTerdeteksiWibTime({
    eventTimeMs: props.eventTimeMs,
    waktu: firstText(props.waktu, props.time),
    tanggal: props.tanggal,
    jam: props.jam,
  });

  return eventTime?.eventTimeMs ?? Number.NEGATIVE_INFINITY;
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
  const eventTime = normalizeTerdeteksiWibTime({
    waktu: firstText(props.waktu, props.time),
    tanggal: props.tanggal,
    jam: props.jam,
  });
  return (
    eventTime?.tanggal.startsWith(
      `${year}-${String(month).padStart(2, "0")}`,
    ) ?? false
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

  const eventTime = normalizeTerdeteksiWibTime({
    eventTimeMs: props.eventTimeMs,
    waktu: firstText(props.waktu, props.time),
    tanggal: props.tanggal,
    jam: props.jam,
  });
  if (!eventTime) return null;

  return {
    eventid,
    eventTimeMs: eventTime.eventTimeMs,
    tanggal: eventTime.tanggal,
    jam: eventTime.jam,
    waktu: eventTime.waktu,
    magnitude: firstText(props.magnitude, props.mag, "0.0"),
    kedalaman: firstText(props.kedalaman, props.depth),
    lokasi: firstText(props.lokasi, props.place, props.area),
    latitude,
    longitude,
    felt: firstText(props.felt, props.fase),
  };
}
