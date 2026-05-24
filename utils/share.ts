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

function safeText(value: unknown): string {
  const text = String(value ?? "").trim();
  return text || "-";
}

function formatCoordinate(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(4)
    : "-";
}

function getTypeLabel(type: QuakeType): string {
  if (type === "dirasakan") return "Dirasakan";
  if (type === "terdeteksi") return "Terdeteksi";
  return "Tsunami";
}

export async function shareQuake(
  data: QuakeData | null,
  type: QuakeType = "dirasakan",
): Promise<void> {
  if (!data) return;

  const typeLabel = getTypeLabel(type);
  const coordinates = `${formatCoordinate(data.latitude)}, ${formatCoordinate(
    data.longitude,
  )}`;

  const baseMessage =
    type === "tsunami"
      ? `${safeText(data.subject)}

${safeText(data.headline || data.description)}

Magnitudo: ${safeText(data.magnitude)}
Kedalaman: ${safeText(data.kedalaman)}
Lokasi: ${safeText(data.wilayah)}
Waktu: ${safeText(data.tanggal)}, ${safeText(data.jam)}
Koordinat: ${coordinates}`
      : data.description ||
        `Gempa ${typeLabel}

Magnitudo: ${safeText(data.magnitude)}
Kedalaman: ${safeText(data.kedalaman)}
Lokasi: ${safeText(data.wilayah)}
Waktu: ${safeText(data.tanggal)}, ${safeText(data.jam)}
Koordinat: ${coordinates}`;

  const shareMessage = `${baseMessage}\n\nInformasi selengkapnya lihat di https://bmkg.go.id`;

  try {
    await Share.share({
      message: shareMessage,
      title: `Bagikan Informasi ${type === "tsunami" ? "Tsunami" : `Gempa ${typeLabel}`}`,
    });
  } catch {}
}
