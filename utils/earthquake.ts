// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusResult = {
  label: string;
  color: string;
};

type QuakeInput = {
  magnitude: string | number;
  kedalaman: string;
  distanceKm: string | number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Menghitung status wilayah berdasarkan magnitudo, kedalaman, dan jarak gempa.
 * Menggunakan model zona dampak berbasis energi seismik.
 * @returns { label: "Aman" | "Terdampak" | "Bahaya", color: string }
 */
export function computeStatus(data: QuakeInput | null): StatusResult {
  if (!data) return { label: "-", color: "#1E6F9F" };

  const M = parseFloat(String(data.magnitude));
  const D = parseFloat(String(data.kedalaman).replace(/[^0-9.]/g, ""));
  const jarak = parseFloat(String(data.distanceKm));

  if (isNaN(M) || isNaN(D) || isNaN(jarak)) return { label: "-", color: "#1E6F9F" };

  const s = clamp(Math.pow(10, 0.5 * (M - 5)), 0.05, 3.5);
  const fd = clamp(1 / (1 + D / 200), 0.35, 1);
  const Router_km = Math.max((100_000 + 240_000 * s) * fd, 1) / 1000;
  const Rinner_km = Math.max((35_000 + 80_000 * s) * fd, 1) / 1000;

  if (jarak <= Rinner_km) return { label: "Bahaya", color: "#F44336" };
  if (jarak <= Router_km) return { label: "Terdampak", color: "#FF9800" };
  return { label: "Aman", color: "#4CAF50" };
}