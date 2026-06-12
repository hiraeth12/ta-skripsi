// utils/share.ts
import { Share } from "react-native";

type QuakeData = {
  magnitude: string | number;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  subject?: string;
  headline?: string;
};

type QuakeType = "dirasakan" | "terdeteksi" | "tsunami";

export type ShareQuakeLabels = {
  eventLabels: Record<QuakeType, string>;
  titles: Record<QuakeType, string>;
  magnitude: string;
  depth: string;
  location: string;
  time: string;
  coordinates: string;
  moreInfo: string;
};

const DEFAULT_SHARE_QUAKE_LABELS: ShareQuakeLabels = {
  eventLabels: {
    dirasakan: "Gempa Dirasakan",
    terdeteksi: "Gempa Terdeteksi",
    tsunami: "Tsunami",
  },
  titles: {
    dirasakan: "Bagikan Informasi Gempa Dirasakan",
    terdeteksi: "Bagikan Informasi Gempa Terdeteksi",
    tsunami: "Bagikan Informasi Tsunami",
  },
  magnitude: "Magnitudo",
  depth: "Kedalaman",
  location: "Lokasi",
  time: "Waktu",
  coordinates: "Koordinat",
  moreInfo: "Informasi selengkapnya lihat di https://bmkg.go.id",
};

function safeText(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "-";
}

function formatCoordinate(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(4)
    : "-";
}

export function getShareQuakeLabels(
  t: (key: string) => string,
): ShareQuakeLabels {
  return {
    eventLabels: {
      dirasakan: t("shareQuake.event.felt"),
      terdeteksi: t("shareQuake.event.detected"),
      tsunami: t("shareQuake.event.tsunami"),
    },
    titles: {
      dirasakan: t("shareQuake.title.felt"),
      terdeteksi: t("shareQuake.title.detected"),
      tsunami: t("shareQuake.title.tsunami"),
    },
    magnitude: t("shareQuake.magnitude"),
    depth: t("shareQuake.depth"),
    location: t("shareQuake.location"),
    time: t("shareQuake.time"),
    coordinates: t("shareQuake.coordinates"),
    moreInfo: t("shareQuake.moreInfo"),
  };
}

export async function shareQuake(
  data: QuakeData | null,
  type: QuakeType = "dirasakan",
  labels: ShareQuakeLabels = DEFAULT_SHARE_QUAKE_LABELS,
): Promise<void> {
  if (!data) return;

  const coordinates = `${formatCoordinate(data.latitude)}, ${formatCoordinate(
    data.longitude,
  )}`;

  const baseMessage =
    type === "tsunami"
      ? `${safeText(data.subject)}

${safeText(data.headline || data.description)}

${labels.magnitude}: ${safeText(data.magnitude)}
${labels.depth}: ${safeText(data.kedalaman)}
${labels.location}: ${safeText(data.wilayah)}
${labels.time}: ${safeText(data.tanggal)}, ${safeText(data.jam)}
${labels.coordinates}: ${coordinates}`
      : data.description ||
        `${labels.eventLabels[type]}

${labels.magnitude}: ${safeText(data.magnitude)}
${labels.depth}: ${safeText(data.kedalaman)}
${labels.location}: ${safeText(data.wilayah)}
${labels.time}: ${safeText(data.tanggal)}, ${safeText(data.jam)}
${labels.coordinates}: ${coordinates}`;

  const shareMessage = `${baseMessage}\n\n${labels.moreInfo}`;

  try {
    await Share.share({
      message: shareMessage,
      title: labels.titles[type],
    });
  } catch {}
}
