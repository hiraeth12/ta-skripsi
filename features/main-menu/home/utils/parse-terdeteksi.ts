type TerdeteksiRawPayload = {
  longitude: number;
  latitude: number;
  tanggal: string;
  jam: string;
  magnitude: string;
  kedalaman: string;
  wilayah: string;
  fase: string;
};

/**
 * Sanitasi dan ekstrak field dari satu GeoJSON feature gempa terdeteksi.
 * Mengembalikan null jika data tidak valid atau koordinat tidak bisa di-parse.
 */
export function parseTerdeteksiPayload(
  feature: unknown,
): TerdeteksiRawPayload | null {
  if (!feature || typeof feature !== "object") return null;
  const f = feature as Record<string, unknown>;
  const props = (f.properties ?? {}) as Record<string, unknown>;
  const coords = (f.geometry as Record<string, unknown>)?.coordinates;

  if (!Array.isArray(coords)) return null;

  const longitude = parseFloat(String(coords[0] ?? ""));
  const latitude = parseFloat(String(coords[1] ?? ""));
  if (isNaN(latitude) || isNaN(longitude)) return null;

  const [tanggal, jamRaw] = String(props.time ?? "").split(" ");
  const jam = (jamRaw ?? "").split(".")[0];

  return {
    longitude,
    latitude,
    tanggal: tanggal ?? "",
    jam: jam ?? "",
    magnitude: parseFloat(String(props.mag ?? "0")).toFixed(1),
    kedalaman: `${parseFloat(String(props.depth ?? "0")).toFixed(1)} km`,
    wilayah: String(props.place ?? "-"),
    fase: String(props.fase ?? ""),
  };
}