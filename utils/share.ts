// utils/share.ts
import { Share } from "react-native";

type QuakeData = {
  magnitude: string | number;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  latitude: number;
  longitude: number;
  description?: string;
};

type QuakeType = "dirasakan" | "terdeteksi";

export async function shareQuake(
  data: QuakeData | null,
  type: QuakeType = "dirasakan",
): Promise<void> {
  if (!data) return;

  const typeLabel = type === "dirasakan" ? "Dirasakan" : "Terdeteksi";

  const baseMessage =
    data.description ||
    `📍 Gempa ${typeLabel}
    
Magnitudo: ${data.magnitude}
Kedalaman: ${data.kedalaman}
Lokasi: ${data.wilayah}
Waktu: ${data.tanggal}, ${data.jam}
Koordinat: ${data.latitude.toFixed(4)}°, ${data.longitude.toFixed(4)}°`;

  const shareMessage = baseMessage + `\n\nInformasi selengkapnya lihat di https://bmkg.go.id`;

  try {
    await Share.share({
      message: shareMessage,
      title: `Bagikan Informasi Gempa ${typeLabel}`,
    });
  } catch {}
}