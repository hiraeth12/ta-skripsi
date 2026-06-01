import { XMLParser } from "fast-xml-parser";
import type {
  TsunamiMapSlide,
  TsunamiObsArea,
  TsunamiWzArea,
} from "../../../../components/modal-tsunami-info";

import {
  asRecord,
  buildAssetUrl,
  normalizeArray,
  parseObsAreas,
  parseWzAreas,
  rawText
} from "@/utils/tsunami-shared-utils";

const MAP_ASSET_BASE = "https://bmkg-content-inatews.storage.googleapis.com";
const xmlParser = new XMLParser({ ignoreAttributes: false });

export type TsunamiWarning = {
  id: string;
  subject: string;
  headline: string;
  description: string;
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

export type TsunamiEventGroup = {
  id: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  latestWarningIndex: number;
  warnings: TsunamiWarning[];
};

type ParsedTsunamiInfo = Omit<
  TsunamiEventGroup,
  "latestWarningIndex" | "warnings"
> & {
  groupKey: string;
  warning: TsunamiWarning;
};

export const EMPTY_WARNING: TsunamiWarning = {
  id: "empty",
  subject: "-",
  headline: "-",
  description: "-",
  timesent: "-",
  timesentMs: Number.NEGATIVE_INFINITY,
  shakemap: "",
  wzmap: "",
  ttmap: "",
  sshmap: "",
  wzAreas: [],
  obsAreas: [],
  rawIndex: 0,
};

export function safeText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function withCacheBuster(url: string): string {
  const base = url.trim();
  if (!base) return "";
  if (base.endsWith("=") || base.endsWith("?") || base.endsWith("&")) {
    return `${base}${Date.now()}`;
  }
  return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

export function getInfoItems(parsed: Record<string, unknown>): unknown[] {
  const alert = asRecord(parsed.alert);
  const root = Object.keys(alert).length > 0 ? alert : parsed;
  return normalizeArray<unknown>(root.info);
}

function parseCoordinates(value: unknown): {
  latitude: number;
  longitude: number;
} | null {
  const [lonText, latText] = rawText(value)
    .split(",")
    .map((part) => part.trim());
  const latitude = parseFloat(latText ?? "");
  const longitude = parseFloat(lonText ?? "");

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return { latitude, longitude };
}

function parseTimesent(value: unknown): number {
  const text = rawText(value)
    .replace(/\s*WIB$/i, "")
    .trim();
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
  );

  if (!match) return Number.NEGATIVE_INFINITY;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = Number.parseInt(match[6], 10);
  const timestamp = new Date(year, month, day, hour, minute, second).getTime();

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function getEventGroupKey(
  info: Record<string, unknown>,
  coordinates: string,
): string {
  const composite = [
    rawText(info.date),
    rawText(info.time),
    coordinates,
    rawText(info.magnitude),
  ]
    .map((part) => part.toLowerCase())
    .join("|");

  if (composite.replace(/\|/g, "")) return composite;

  return rawText(info.eventid) || `tsunami-${Date.now()}`;
}

export function buildTsunamiMapSlides(
  warning: TsunamiWarning,
): TsunamiMapSlide[] {
  return [
    {
      title: "Shakemap / Peta Guncangan",
      imageUrl: warning.shakemap,
    },
    {
      title: "WZMap / Peta Zona Peringatan",
      imageUrl: warning.wzmap,
    },
    {
      title: "TTMap / Peta Waktu Tiba Tsunami",
      imageUrl: warning.ttmap,
    },
    {
      title: "SSHMap / Peta Tinggi Muka Laut / Sea Surface Height",
      imageUrl: warning.sshmap,
    },
  ].filter((slide) => slide.imageUrl);
}

function parseTsunamiInfo(
  item: unknown,
  index: number,
): ParsedTsunamiInfo | null {
  const info = asRecord(item);
  const point = asRecord(info.point);
  const coordText = rawText(point.coordinates);
  const coordinates = parseCoordinates(coordText);

  if (!coordinates) return null;

  const groupKey = getEventGroupKey(info, coordText);
  const eventId = rawText(info.eventid) || `${groupKey}-${index}`;
  const timesent = safeText(info.timesent);
  const warning: TsunamiWarning = {
    id: `${eventId}-${index}`,
    subject: safeText(info.subject),
    headline: safeText(info.headline),
    description: safeText(info.description),
    timesent,
    timesentMs: parseTimesent(timesent),
    shakemap: buildAssetUrl(rawText(info.shakemap)),
    wzmap: buildAssetUrl(rawText(info.wzmap)),
    ttmap: buildAssetUrl(rawText(info.ttmap)),
    sshmap: buildAssetUrl(rawText(info.sshmap)),
    wzAreas: parseWzAreas(info.wzarea),
    obsAreas: parseObsAreas(info.obsarea),
    rawIndex: index,
  };

  return {
    id: groupKey,
    groupKey,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    magnitude: safeText(info.magnitude),
    kedalaman: safeText(info.depth),
    latText: safeText(info.latitude),
    lonText: safeText(info.longitude),
    wilayah: safeText(info.area),
    tanggal: safeText(info.date),
    jam: safeText(info.time),
    warning,
  };
}

function getLatestWarningIndex(warnings: TsunamiWarning[]): number {
  if (warnings.length === 0) return 0;

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

function sortWarnings(warnings: TsunamiWarning[]): TsunamiWarning[] {
  const hasValidTimesent = warnings.some(
    (warning) => warning.timesentMs !== Number.NEGATIVE_INFINITY,
  );

  if (!hasValidTimesent) return warnings;

  return [...warnings].sort((a, b) => {
    if (a.timesentMs !== b.timesentMs) return a.timesentMs - b.timesentMs;
    return a.rawIndex - b.rawIndex;
  });
}

export function normalizeTsunamiGroups(items: unknown[]): TsunamiEventGroup[] {
  const groupMap = new Map<
    string,
    ParsedTsunamiInfo & { warnings: TsunamiWarning[] }
  >();

  items.forEach((item, index) => {
    const parsed = parseTsunamiInfo(item, index);
    if (!parsed) return;

    const existing = groupMap.get(parsed.groupKey);
    if (existing) {
      existing.warnings.push(parsed.warning);
      return;
    }

    groupMap.set(parsed.groupKey, {
      ...parsed,
      warnings: [parsed.warning],
    });
  });

  return Array.from(groupMap.values())
    .map((group) => {
      const warnings = sortWarnings(group.warnings);
      const latestWarningIndex = getLatestWarningIndex(warnings);

      return {
        id: group.id,
        latitude: group.latitude,
        longitude: group.longitude,
        magnitude: group.magnitude,
        kedalaman: group.kedalaman,
        latText: group.latText,
        lonText: group.lonText,
        wilayah: group.wilayah,
        tanggal: group.tanggal,
        jam: group.jam,
        latestWarningIndex,
        warnings,
      };
    })
    .sort((a, b) => {
      const aLatest = a.warnings[a.latestWarningIndex] ?? EMPTY_WARNING;
      const bLatest = b.warnings[b.latestWarningIndex] ?? EMPTY_WARNING;
      if (aLatest.timesentMs !== bLatest.timesentMs) {
        return bLatest.timesentMs - aLatest.timesentMs;
      }
      return bLatest.rawIndex - aLatest.rawIndex;
    });
}

export function parseTsunamiGroups(raw: string): TsunamiEventGroup[] {
  const parsed = xmlParser.parse(raw) as Record<string, unknown>;
  return normalizeTsunamiGroups(getInfoItems(parsed));
}

export async function fetchTsunamiGroups(
  apiUrl: string,
  abortSignal: AbortSignal,
): Promise<TsunamiEventGroup[]> {
  const res = await fetch(withCacheBuster(apiUrl), {
    signal: abortSignal,
  });
  if (!res.ok) throw new Error(`tsunami fetch failed: ${res.status}`);

  const raw = await res.text();
  return parseTsunamiGroups(raw);
}

export function buildTsunamiGroupsSignature(
  groups: TsunamiEventGroup[],
): string {
  return groups
    .map((group) => {
      const warningSignature = group.warnings
        .map((warning) =>
          [
            warning.id,
            warning.subject,
            warning.headline,
            warning.timesent,
            warning.timesentMs,
          ].join("~"),
        )
        .join(",");

      return [
        group.id,
        group.latitude,
        group.longitude,
        group.magnitude,
        group.kedalaman,
        group.tanggal,
        group.jam,
        group.latestWarningIndex,
        warningSignature,
      ].join("|");
    })
    .join("||");
}
