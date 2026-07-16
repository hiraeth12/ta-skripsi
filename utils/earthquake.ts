// ─── Types ────────────────────────────────────────────────────────────────────

import {
  getRealisticShakeRadiiMeters,
  parseDepthKm,
} from "./earthquake-impact.js";

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

/**
 * Menghitung status wilayah berdasarkan apakah pengguna berada di dalam atau
 * di luar radius notifikasi gempa yang diperkirakan.
 * @returns { label: "Aman" | "Terdampak", color: string }
 */
export function computeStatus(
  data: QuakeInput | null,
  t?: (key: string) => string,
): StatusResult {
  if (!data) return { label: "-", color: "#1E6F9F" };

  const magnitude = Number.parseFloat(String(data.magnitude));
  const depthKm = parseDepthKm(data.kedalaman);
  const distanceKm = Number.parseFloat(String(data.distanceKm));

  if (
    !Number.isFinite(magnitude) ||
    magnitude <= 0 ||
    depthKm === null ||
    depthKm < 0 ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0
  ) {
    return { label: "-", color: "#1E6F9F" };
  }

  const { outerRadiusMeters } = getRealisticShakeRadiiMeters(magnitude, depthKm);
  const outerRadiusKm = outerRadiusMeters / 1000;

  if (distanceKm <= outerRadiusKm) {
    return {
      label: t ? t("homeScreen.status.affected") : "Terdampak",
      color: "#FF9800",
    };
  }
  return { label: t ? t("homeScreen.status.safe") : "Aman", color: "#4CAF50" };
}
