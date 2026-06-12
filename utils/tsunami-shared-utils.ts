import type {
  TsunamiMapSlide,
  TsunamiObsArea,
  TsunamiWzArea,
} from "@/components/modal-tsunami-info";

export const MAP_ASSET_BASE =
  "https://bmkg-content-inatews.storage.googleapis.com";

export type TsunamiWarningMapFields = {
  shakemap: string;
  wzmap: string;
  ttmap: string;
  sshmap: string;
};

export type TsunamiMapSlideTitles = {
  shakemap: string;
  wzmap: string;
  ttmap: string;
  sshmap: string;
};

export function rawText(value: unknown): string {
  return String(value ?? "").trim();
}

export function safeText(value: unknown, fallback = "-"): string {
  const text = rawText(value);
  return text || fallback;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function hasAnyRecordValue(
  record: Record<string, unknown>,
  keys: string[],
): boolean {
  return keys.some((key) => rawText(record[key]) !== "");
}

export function buildAssetUrl(path: unknown): string {
  const value = rawText(path);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${MAP_ASSET_BASE}/${value}`;
}

export function buildTsunamiMapSlides(
  warning?: TsunamiWarningMapFields | null,
  titles: TsunamiMapSlideTitles = {
    shakemap: "Shakemap / Peta Guncangan",
    wzmap: "WZMap / Peta Zona Peringatan",
    ttmap: "TTMap / Peta Waktu Tiba Tsunami",
    sshmap: "SSHMap / Peta Tinggi Muka Laut / Sea Surface Height",
  },
): TsunamiMapSlide[] {
  if (!warning) return [];

  return [
    { title: titles.shakemap, imageUrl: warning.shakemap },
    { title: titles.wzmap, imageUrl: warning.wzmap },
    { title: titles.ttmap, imageUrl: warning.ttmap },
    {
      title: titles.sshmap,
      imageUrl: warning.sshmap,
    },
  ].filter((slide) => rawText(slide.imageUrl));
}

export function parseWzAreas(value: unknown): TsunamiWzArea[] {
  return normalizeArray<unknown>(value).reduce<TsunamiWzArea[]>((acc, item) => {
    const area = asRecord(item);
    if (
      !hasAnyRecordValue(area, [
        "province",
        "district",
        "level",
        "date",
        "time",
      ])
    ) {
      return acc;
    }

    acc.push({
      province: safeText(area.province),
      district: safeText(area.district),
      level: safeText(area.level),
      date: safeText(area.date),
      time: safeText(area.time),
    });
    return acc;
  }, []);
}

export function parseObsAreas(value: unknown): TsunamiObsArea[] {
  return normalizeArray<unknown>(value).reduce<TsunamiObsArea[]>(
    (acc, item) => {
      const area = asRecord(item);
      if (
        !hasAnyRecordValue(area, [
          "location",
          "loclatitude",
          "loclongitude",
          "height",
          "date",
          "time",
        ])
      ) {
        return acc;
      }

      acc.push({
        location: safeText(area.location),
        loclatitude: safeText(area.loclatitude),
        loclongitude: safeText(area.loclongitude),
        height: safeText(area.height),
        date: safeText(area.date),
        time: safeText(area.time),
      });
      return acc;
    },
    [],
  );
}
