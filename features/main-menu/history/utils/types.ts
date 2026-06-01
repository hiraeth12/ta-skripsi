// ─── Core list item ───────────────────────────────────────────────────────────

export type ListItem = {
  id: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  lokasi: string;
  waktu: string;
  jarak: string;
  distanceKm: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  felt: string;
  shakemap?: string | null;
  eventType?: "quake" | "tsunami";
  status?: string;
  headline?: string;
  latestWarningId?: string;
};

// ─── Tab ──────────────────────────────────────────────────────────────────────

export const HISTORY_TABS = [
  "GEMPA DIRASAKAN",
  "GEMPA TERDETEKSI",
  "RIWAYAT TSUNAMI",
] as const;

export type HistoryEarthquakeTab = (typeof HISTORY_TABS)[number];

// ─── External selection (dari URL params) ─────────────────────────────────────

export type ExternalSelection = {
  eventId: string;
  latitude: number;
  longitude: number;
  magnitude: string;
  lokasi: string;
  tanggal: string;
  jam: string;
  distanceKm: string;
  kedalaman: string;
  felt: string;
  shakemap: string | null;
  status: string;
  headline: string;
  latestWarningId: string;
};