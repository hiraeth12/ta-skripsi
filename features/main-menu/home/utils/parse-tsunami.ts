// ─── Fungsi dari tsunami-content-utils dipakai langsung — tidak ada duplikasi ─
//
//   getInfoItems      → menggantikan getTsunamiInfoItems (home-screen.tsx:203)
//   safeText          → menggantikan safeText lokal (home-screen.tsx:127)
//
// parseTsunamiTimesent (home-screen.tsx:215) dihapus karena identik dengan
// parseTimesent yang sudah dipakai secara internal di tsunami-content-utils.
// Di sini kita pakai normalizeTsunamiGroups untuk mendapatkan item terbaru
// secara konsisten.

import {
  getInfoItems,
  normalizeTsunamiGroups,
  safeText,
} from "@/features/main-menu/earthquake/utils/tsunami-content-utils";
import type { TsunamiQuake } from "../components/tsunami-card";
import { buildShakemapUrl } from "./coord-utils";

/**
 * Dari XML tsunami yang sudah di-parse, ambil satu item terbaru dan bentuk
 * menjadi TsunamiQuake untuk ditampilkan di home card.
 *
 * Menggunakan normalizeTsunamiGroups agar urutan "terbaru" konsisten
 * dengan logika di halaman detail tsunami.
 */
export function getLatestTsunamiQuake(
  parsed: Record<string, unknown>,
): TsunamiQuake | null {
  const items = getInfoItems(parsed);
  const groups = normalizeTsunamiGroups(items);

  // groups sudah diurutkan: index 0 = grup paling baru
  const latestGroup = groups[0];
  if (!latestGroup) return null;

  const latestWarning = latestGroup.warnings[latestGroup.latestWarningIndex];
  if (!latestWarning) return null;

  return {
    magnitude: latestGroup.magnitude,
    kedalaman: latestGroup.kedalaman,
    latText: latestGroup.latText,
    lonText: latestGroup.lonText,
    wilayah: latestGroup.wilayah,
    tanggal: latestGroup.tanggal,
    jam: latestGroup.jam,
    subject: safeText(latestWarning.subject),
    headline: safeText(latestWarning.headline),
    shakemap: buildShakemapUrl(latestWarning.shakemap),
    latitude: latestGroup.latitude,
    longitude: latestGroup.longitude,
  };
}