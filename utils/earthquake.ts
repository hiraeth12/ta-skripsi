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
 * Menghitung status wilayah berdasarkan magnitudo, kedalaman, dan jarak gempa.
 * Menggunakan radius MMI yang sama dengan outer/inner ring pada peta.
 * @returns { label: "Aman" | "Terdampak" | "Bahaya", color: string }
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

  const { outerRadiusMeters, innerRadiusMeters } =
    getRealisticShakeRadiiMeters(magnitude, depthKm);
  const outerRadiusKm = outerRadiusMeters / 1000;
  const innerRadiusKm = innerRadiusMeters / 1000;

  if (distanceKm <= innerRadiusKm) {
    return {
      label: t ? t("homeScreen.status.danger") : "Bahaya",
      color: "#F44336",
    };
  }
  if (distanceKm <= outerRadiusKm) {
    return {
      label: t ? t("homeScreen.status.affected") : "Terdampak",
      color: "#FF9800",
    };
  }
  return { label: t ? t("homeScreen.status.safe") : "Aman", color: "#4CAF50" };
}
