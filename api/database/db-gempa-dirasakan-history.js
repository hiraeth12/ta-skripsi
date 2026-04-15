import { getApp } from "@react-native-firebase/app";
import { getDatabase, ref, set } from "@react-native-firebase/database";
import { XMLParser } from "fast-xml-parser";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY;
const DATABASE_URL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

function withCacheBuster(url) {
  const base = String(url ?? "").trim();
  const separator = base.includes("?")
    ? base.endsWith("?") || base.endsWith("&")
      ? ""
      : "&"
    : "?";
  return `${base}${separator}t=${Date.now()}`;
}

function parseCandidates(rawText) {
  let candidates = [];
  let globalIdentifier = "";

  try {
    const parsedJson = JSON.parse(rawText);
    const infoRaw = parsedJson?.info;
    candidates = Array.isArray(infoRaw) ? infoRaw : infoRaw ? [infoRaw] : [];
    globalIdentifier = String(parsedJson?.identifier ?? "");
  } catch {
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsedXml = parser.parse(rawText);
    const infoRaw = parsedXml?.alert?.info;
    candidates = Array.isArray(infoRaw) ? infoRaw : infoRaw ? [infoRaw] : [];
    globalIdentifier = String(parsedXml?.alert?.identifier ?? "");
  }

  return { candidates, globalIdentifier };
}

function normalizeQuakeItem(candidate, index, globalIdentifier) {
  const coordStr = String(candidate?.point?.coordinates ?? "");
  const [lonStr, latStr] = coordStr.split(",");
  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lonStr);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  const eventIdFallback = String(
    candidate?.identifier ??
      `${globalIdentifier}-${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`,
  );

  return {
    event: String(candidate?.event ?? ""),
    date: String(candidate?.date ?? ""),
    time: String(candidate?.time ?? ""),
    point: {
      coordinates: coordStr,
    },
    latitude: String(candidate?.latitude ?? latitude),
    longitude: String(candidate?.longitude ?? longitude),
    magnitude: String(candidate?.magnitude ?? ""),
    depth: String(candidate?.depth ?? ""),
    area: String(candidate?.area ?? ""),
    eventid: String(candidate?.eventid ?? eventIdFallback),
    potential: String(candidate?.potential ?? ""),
    subject: String(candidate?.subject ?? ""),
    headline: String(candidate?.headline ?? ""),
    description: String(candidate?.description ?? ""),
    instruction: String(candidate?.instruction ?? ""),
    shakemap: candidate?.shakemap ? String(candidate.shakemap) : "",
    felt: String(candidate?.felt ?? ""),
    timesent: String(candidate?.timesent ?? ""),
  };
}

export async function syncGempaDirasakanHistoryToRealtimeDb() {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY is not set");
  }

  if (!DATABASE_URL) {
    throw new Error("EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set");
  }

  const response = await fetch(withCacheBuster(API_URL));
  const rawText = await response.text();

  const { candidates, globalIdentifier } = parseCandidates(rawText);
  const normalizedItems = candidates
    .map((candidate, index) => normalizeQuakeItem(candidate, index, globalIdentifier))
    .filter(Boolean);

  const app = getApp();
  const db = getDatabase(app, DATABASE_URL);
  const writePath = "/gempa_dirasakan_history";

  await set(ref(db, writePath), {
    sourceUrl: API_URL,
    sourceIdentifier: globalIdentifier,
    totalItems: normalizedItems.length,
    syncedAt: new Date().toISOString(),
    items: normalizedItems,
  });

  console.log(
    `[Gempa Dirasakan Sync] Wrote ${normalizedItems.length} records to ${writePath}`,
  );

  return {
    ok: true,
    writePath,
    totalItems: normalizedItems.length,
    sourceUrl: API_URL,
  };
}
