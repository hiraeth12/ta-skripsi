type TerdeteksiRawPayload = {
  eventId: string;
  status: string;
  longitude: number;
  latitude: number;
  tanggal: string;
  jam: string;
  magnitude: string;
  kedalaman: string;
  wilayah: string;
};

function getText(source: Record<string, unknown>, key: string): string {
  return String(source[key] ?? "").trim();
}

function splitWaktu(value: string): { tanggal: string; jam: string } {
  const [tanggal = "", jamRaw = ""] = value.trim().split(/\s+/);
  return {
    tanggal,
    jam: jamRaw.split(".")[0] ?? "",
  };
}

export function getLatestTerdeteksiGempa(parsedXml: unknown): unknown | null {
  if (!parsedXml || typeof parsedXml !== "object") return null;

  const xml = parsedXml as Record<string, unknown>;
  const root =
    xml.Infogempa && typeof xml.Infogempa === "object"
      ? (xml.Infogempa as Record<string, unknown>)
      : xml;
  const gempa = root.gempa;

  if (Array.isArray(gempa)) return gempa[0] ?? null;
  return gempa ?? null;
}

export function parseTerdeteksiPayload(
  gempa: unknown,
): TerdeteksiRawPayload | null {
  if (!gempa || typeof gempa !== "object") return null;
  const g = gempa as Record<string, unknown>;

  const longitude = parseFloat(getText(g, "bujur"));
  const latitude = parseFloat(getText(g, "lintang"));
  if (isNaN(latitude) || isNaN(longitude)) return null;

  const { tanggal, jam } = splitWaktu(getText(g, "waktu"));

  return {
    eventId: getText(g, "eventid"),
    status: getText(g, "status"),
    longitude,
    latitude,
    tanggal,
    jam,
    magnitude: parseFloat(getText(g, "mag") || "0").toFixed(1),
    kedalaman: `${parseFloat(getText(g, "dalam") || "0").toFixed(1)} km`,
    wilayah: getText(g, "area") || "-",
  };
}
