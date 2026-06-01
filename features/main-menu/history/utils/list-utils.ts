import type { ListItem } from "./types";

// ─── Equality ─────────────────────────────────────────────────────────────────

export function isSameListItem(a: ListItem, b: ListItem): boolean {
  return (
    a.id === b.id &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.magnitude === b.magnitude &&
    a.lokasi === b.lokasi &&
    a.waktu === b.waktu &&
    a.jarak === b.jarak &&
    a.distanceKm === b.distanceKm &&
    a.tanggal === b.tanggal &&
    a.jam === b.jam &&
    a.kedalaman === b.kedalaman &&
    a.felt === b.felt &&
    (a.shakemap ?? null) === (b.shakemap ?? null) &&
    a.eventType === b.eventType &&
    a.status === b.status &&
    a.headline === b.headline &&
    a.latestWarningId === b.latestWarningId
  );
}

export function areSameListItems(a: ListItem[], b: ListItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!isSameListItem(a[i], b[i])) return false;
  }
  return true;
}

// ─── Tsunami sort ─────────────────────────────────────────────────────────────

/**
 * Parse event key format: YYYYMMDDHHMMSS → timestamp ms.
 * Digunakan untuk mengurutkan item tsunami dari terbaru ke terlama.
 */
export function parseTsunamiListIdTime(value: unknown): number {
  const match = String(value ?? "").match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
  );
  if (!match) return Number.NEGATIVE_INFINITY;

  const timestamp = new Date(
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2], 10) - 1,
    Number.parseInt(match[3], 10),
    Number.parseInt(match[4], 10),
    Number.parseInt(match[5], 10),
    Number.parseInt(match[6], 10),
  ).getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

export function sortTsunamiListItems(items: ListItem[]): ListItem[] {
  return [...items].sort((a, b) => {
    const aTime = parseTsunamiListIdTime(a.id);
    const bTime = parseTsunamiListIdTime(b.id);
    if (aTime !== bTime) return bTime - aTime;
    return String(b.id).localeCompare(String(a.id));
  });
}