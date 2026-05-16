import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { getDatabase } from "./firebase-admin-config.js";

function readEnvFile(envPath) {
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const env = {};

  for (const line of lines) {
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

function parseDirasakanDateTime(item) {
  const rawDate = String(item?.date ?? "").trim();
  const rawTime = String(item?.time ?? "").trim();
  const match = rawDate.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);

  if (!match) {
    return Number.NEGATIVE_INFINITY;
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const yearRaw = Number.parseInt(match[3], 10);
  const year = match[3].length === 2 ? 2000 + yearRaw : yearRaw;

  const timeParts = rawTime.match(/^(\d{1,2}):(\d{2}):(\d{2})/);
  const hours = timeParts ? Number.parseInt(timeParts[1], 10) : 0;
  const minutes = timeParts ? Number.parseInt(timeParts[2], 10) : 0;
  const seconds = timeParts ? Number.parseInt(timeParts[3], 10) : 0;

  const timestamp = new Date(year, month, day, hours, minutes, seconds).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function getLatestItem(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return [...items].sort((a, b) =>
    String(b?.eventid ?? "").localeCompare(String(a?.eventid ?? "")),
  )[0];
}

function sortItemsAscendingByDate(items) {
  return [...items].sort((a, b) => {
    const dateCompare = parseDirasakanDateTime(a) - parseDirasakanDateTime(b);
    if (dateCompare !== 0) return dateCompare;

    return String(a?.eventid ?? "").localeCompare(String(b?.eventid ?? ""));
  });
}

function normalizeExistingItems(nodeData) {
  const root = nodeData?.gempa_dirasakan ?? nodeData ?? {};
  const items = root?.items ?? [];

  if (Array.isArray(items)) {
    return items.filter(Boolean);
  }

  if (items && typeof items === "object") {
    return Object.values(items).filter(Boolean);
  }

  return [];
}

function dedupeItemsByEventId(items) {
  const dedupMap = new Map();

  for (const item of items) {
    const eventId = String(item?.eventid ?? "").trim();
    if (!eventId) continue;

    if (!dedupMap.has(eventId)) {
      dedupMap.set(eventId, item);
    }
  }

  return Array.from(dedupMap.values());
}

async function syncLatestOnce() {
  const envPath = path.resolve(process.cwd(), ".env");
  const env = readEnvFile(envPath);

  const apiUrl = env.EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY;
  const dbUrl = env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

  if (!apiUrl) {
    throw new Error("EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY is not set in .env");
  }

  if (!dbUrl) {
    throw new Error("EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set in .env");
  }

  const response = await fetch(withCacheBuster(apiUrl));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch API: ${response.status} ${response.statusText}`,
    );
  }

  const rawText = await response.text();
  const { candidates, globalIdentifier } = parseCandidates(rawText);
  const normalizedItems = candidates
    .map((candidate, index) =>
      normalizeQuakeItem(candidate, index, globalIdentifier),
    )
    .filter(Boolean);

  const latest = getLatestItem(normalizedItems);
  if (!latest) {
    return {
      ok: false,
      skipped: true,
      reason: "No valid quake item found",
    };
  }

  const currentRes = await fetch(`${dbUrl}/gempa_dirasakan.json`);
  if (!currentRes.ok) {
    throw new Error(
      `Failed to read DB node: ${currentRes.status} ${currentRes.statusText}`,
    );
  }

  const currentNode = await currentRes.json();
  const currentItems = normalizeExistingItems(currentNode);
  const currentLastEventId = String(currentNode?.lastEventId ?? "");

  const mergedItems = dedupeItemsByEventId([
    ...currentItems,
    ...normalizedItems,
  ]);

  const updatedItems = sortItemsAscendingByDate(mergedItems);
  const updatedLastEventId = updatedItems[updatedItems.length - 1]?.eventid ?? null;

  const apiEventIds = new Set(normalizedItems.map((item) => String(item?.eventid ?? "").trim()).filter(Boolean));
  const nodeEventIds = new Set(currentItems.map((item) => String(item?.eventid ?? "").trim()).filter(Boolean));
  const missingInNode = normalizedItems.filter((item) => {
    const eventId = String(item?.eventid ?? "").trim();
    return eventId && !nodeEventIds.has(eventId);
  });

  if (missingInNode.length === 0 && currentLastEventId === String(latest.eventid)) {
    return {
      ok: true,
      skipped: true,
      reason: "No missing API items",
      eventid: latest.eventid,
      totalItems: updatedItems.length,
    };
  }

  console.log("[sync] Backfilling gempa data:", {
    apiLatestEventId: latest.eventid,
    currentLastEventId,
    missingCount: missingInNode.length,
    addedEventIds: missingInNode.map((item) => item.eventid),
  });

  try {
    const db = getDatabase();

    const updates = {
      "gempa_dirasakan/sourceUrl": apiUrl,
      "gempa_dirasakan/sourceIdentifier": globalIdentifier,
      "gempa_dirasakan/syncedAt": new Date().toISOString(),
      "gempa_dirasakan/lastEventId": updatedLastEventId,
      "gempa_dirasakan/totalItems": updatedItems.length,
      "gempa_dirasakan/items": updatedItems,
    };

    await db.ref().update(updates);

    console.log("[sync] Gempa data written to database:", {
      writePath: "/gempa_dirasakan",
      addedCount: missingInNode.length,
      totalItemsAfterUpdate: updatedItems.length,
      lastEventId: updatedLastEventId,
    });
  } catch (error) {
    throw new Error(`Failed to write to Firebase Admin: ${error.message}`);
  }

  return {
    ok: true,
    skipped: false,
    writtenEventId: updatedLastEventId,
    writePath: "/gempa_dirasakan",
    addedItems: missingInNode.length,
    totalItemsAfterUpdate: updatedItems.length,
  };
}

async function run() {
  const intervalArg = Number(process.argv[2] ?? 0);

  if (intervalArg > 0) {
    const firstResult = await syncLatestOnce();
    console.log("[sync] Initial run:", firstResult);

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

  const result = await syncLatestOnce();
  console.log("[sync] Done:", result);
}

run().catch((error) => {
  console.error("[sync] Fatal error:", error.message);
  process.exit(1);
});
