import { useCallback } from "react";
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

export const useEarthquakeShare = () => {
  const shareQuake = useCallback(
    async (data: QuakeData | null, type: QuakeType = "dirasakan") => {
      if (!data) return;

      const typeLabel = type === "dirasakan" ? "Dirasakan" : "Terdeteksi";
      
      // Use description if available, otherwise format message
      const baseMessage =
        data.description ||
        `📍 Gempa ${typeLabel}
    
Magnitudo: ${data.magnitude}
Kedalaman: ${data.kedalaman}
Lokasi: ${data.wilayah}
Waktu: ${data.tanggal}, ${data.jam}
Koordinat: ${data.latitude.toFixed(4)}°, ${data.longitude.toFixed(4)}°`;

      const shareMessage =
        baseMessage + `\n\nInformasi selengkapnya lihat di https://bmkg.go.id`;

      try {
        await Share.share({
          message: shareMessage,
          title: `Bagikan Informasi Gempa ${typeLabel}`,
        });
      } catch (error) {
        console.error("Share error:", error);
      }
    },
    [],
  );

  return { shareQuake };
};
