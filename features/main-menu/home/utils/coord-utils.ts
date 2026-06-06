const SHAKEMAP_BASE = "https://bmkg-content-inatews.storage.googleapis.com";

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

export function buildShakemapUrl(shakemap: string): string {
  const value = shakemap.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SHAKEMAP_BASE}/${value}`;
}

export function buildNarasiUrl(shakemap: string): string | null {
  const value = shakemap.trim();
  if (!value) return null;

  const filename = value.split("/").pop() ?? "";
  const eventId = filename.split(".")[0];

  if (!eventId) return null;

  return `${SHAKEMAP_BASE}/${eventId}_narasi.txt`;
}

export function buildHistoryUrl(eventId: string): string | null {
  const id = eventId.trim();
  if (!id) return null;
  return `${SHAKEMAP_BASE}/history.${id}.txt`;
}
