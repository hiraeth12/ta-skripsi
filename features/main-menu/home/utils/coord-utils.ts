// safeText dan parseCoordinates sudah ada di tsunami-content-utils — tidak perlu duplikasi.
// File ini hanya berisi helper yang benar-benar spesifik untuk home screen.

const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

/**
 * Format angka koordinat menjadi teks derajat + label arah (LU/LS/BT/BB).
 */
export function formatCoord(value: number): {
  text: string;
  latLabel: string;
  lonLabel: string;
} {
  const abs = Math.abs(value).toFixed(2);
  return {
    text: abs,
    latLabel: value < 0 ? "LS" : "LU",
    lonLabel: value >= 0 ? "BT" : "BB",
  };
}

/**
 * Lengkapi URL shakemap dengan base URL jika belum absolut.
 */
export function buildShakemapUrl(shakemap: string): string {
  const value = shakemap.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SHAKEMAP_BASE}/${value}`;
}