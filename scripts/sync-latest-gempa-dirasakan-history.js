import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { getDatabase } from "./firebase-admin-config.js";

const FETCH_TIMEOUT_MS = 30_000;

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};

  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function loadEnv() {
  const cwd = process.cwd();
  return {
    ...readEnvFile(path.resolve(cwd, ".env.development")),
    ...readEnvFile(path.resolve(cwd, ".env")),
    ...process.env,
  };
}

function withCacheBuster(url) {
  const base = String(url ?? "").trim();
  const separator = base.includes("?")
    ? base.endsWith("?") || base.endsWith("&") ? "" : "&"
    : "?";
  return `${base}${separator}t=${Date.now()}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(withCacheBuster(url), { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const eventIdFallback = String(
    candidate?.identifier ??
      `${globalIdentifier}-${candidate?.time ?? ""}-${candidate?.date ?? ""}-${index}`,
  );

  return {
    event: String(candidate?.event ?? ""),
    date: String(candidate?.date ?? ""),
    time: String(candidate?.time ?? ""),
    point: { coordinates: coordStr },
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

function getLatestItem(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return [...items].sort((a, b) =>
    String(b?.eventid ?? "").localeCompare(String(a?.eventid ?? "")),
  )[0];
}

async function syncLatestOnce() {
  const env = loadEnv();
  const apiUrl = env.EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY;

  if (!apiUrl) {
    throw new Error("EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY is not set in .env");
  }

  const response = await fetchWithTimeout(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${response.status} ${response.statusText}`);
  }

  const rawText = await response.text();
  const { candidates, globalIdentifier } = parseCandidates(rawText);
  const normalizedItems = candidates
    .map((candidate, index) => normalizeQuakeItem(candidate, index, globalIdentifier))
    .filter(Boolean);

  const latest = getLatestItem(normalizedItems);
  if (!latest) {
    return {
      ok: false,
      skipped: true,
      reason: "No valid quake item found",
    };
  }

  const db = getDatabase();

  const [lastEventIdSnap, eventIdsSnap] = await Promise.all([
    db.ref("gempa_dirasakan/lastEventId").get(),
    db.ref("gempa_dirasakan/eventIds").get(),
  ]);

  const currentLastEventId = lastEventIdSnap.exists()
    ? String(lastEventIdSnap.val() ?? "")
    : "";

  const existingIds = eventIdsSnap.exists()
    ? new Set(Object.keys(eventIdsSnap.val() ?? {}))
    : new Set();
  const missingItems = normalizedItems.filter((item) => {
    const eventId = String(item?.eventid ?? "").trim();
    return eventId && !existingIds.has(eventId);
  });

  if (missingItems.length === 0 && currentLastEventId === String(latest.eventid)) {
    return {
      ok: true,
      skipped: true,
      reason: "No new items",
      lastEventId: currentLastEventId,
    };
  }

  const newLastEventId = String(latest.eventid);
  const updates = {
    "gempa_dirasakan/sourceUrl": apiUrl,
    "gempa_dirasakan/sourceIdentifier": globalIdentifier,
    "gempa_dirasakan/syncedAt": new Date().toISOString(),
    "gempa_dirasakan/lastEventId": newLastEventId,
  };

  for (const item of missingItems) {
    const eventId = String(item.eventid ?? "").trim();
    if (!eventId) continue;
    updates[`gempa_dirasakan/items/${eventId}`] = item;
    updates[`gempa_dirasakan/eventIds/${eventId}`] = true;
  }

  await db.ref().update(updates);

  console.log("[sync] Gempa dirasakan synced:", {
    writePath: "/gempa_dirasakan",
    addedCount: missingItems.length,
    addedEventIds: missingItems.map((item) => item.eventid),
    lastEventId: newLastEventId,
  });

  return {
    ok: true,
    skipped: false,
    writePath: "/gempa_dirasakan",
    addedItems: missingItems.length,
    lastEventId: newLastEventId,
  };
}

async function run() {
  const intervalArg = Number(process.argv[2] ?? 0);

  if (intervalArg > 0) {
    try {
      const firstResult = await syncLatestOnce();
      console.log("[sync] Initial run:", firstResult);
    } catch (error) {
      console.error("[sync] Initial run failed:", error.message);
    }

    setInterval(async () => {
      try {
        const result = await syncLatestOnce();
        console.log("[sync] Interval run:", result);
      } catch (error) {
        console.error("[sync] Interval run failed:", error.message);
      }
    }, intervalArg);

    return;
  }

  try {
    const result = await syncLatestOnce();
    console.log("[sync] Done:", JSON.stringify(result));
  } catch (error) {
    console.error("[sync] Fatal error:", error.message);
    process.exit(1);
  }
}

run().finally(() => {
  process.exit(0);
});