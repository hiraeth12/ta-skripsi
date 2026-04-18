import crypto from "crypto";
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

function parseDetectedFeatures(rawText) {
  try {
    const parsedJson = JSON.parse(rawText);
    return Array.isArray(parsedJson?.features) ? parsedJson.features : [];
  } catch {
    return [];
  }
}

function parseDetectedItem(feature, index, sourceName) {
  const props = feature?.properties ?? {};
  const coords = feature?.geometry?.coordinates;
  const longitude = parseFloat(coords?.[0] ?? "0");
  const latitude = parseFloat(coords?.[1] ?? "0");

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  const timeValue = String(props.time ?? "");
  const year = Number.parseInt(timeValue.slice(0, 4), 10);
  if (Number.isNaN(year) || year < 2023) {
    return null;
  }

  const eventId = String(
    props.eventid ?? props.identifier ?? `${timeValue}-${latitude}-${longitude}-${index}`,
  );
  const [tanggal, jamRaw] = timeValue.split(" ");
  const jam = String(jamRaw ?? "").split(".")[0];

  return {
    eventid: eventId,
    time: timeValue,
    tanggal: String(tanggal ?? ""),
    jam: String(jam ?? ""),
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    magnitude: parseFloat(props.mag ?? "0").toFixed(1),
    lokasi: String(props.place ?? ""),
    kedalaman: `${parseFloat(props.depth ?? "0").toFixed(1)} km`,
    felt: String(props.fase ?? ""),
    coordinates: {
      latitude,
      longitude,
    },
    source: {
      name: sourceName,
      id: feature?.id ?? null,
      type: feature?.type ?? null,
    },
  };
}

function dedupKeyForItem(item) {
  const eventId = String(item?.eventid ?? "").trim();
  if (eventId) return `eventid:${eventId}`;

  return [
    String(item?.time ?? ""),
    String(item?.latitude ?? ""),
    String(item?.longitude ?? ""),
    String(item?.magnitude ?? ""),
  ].join("|");
}

function createPayloadChecksum(itemsByKey) {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify(itemsByKey))
    .digest("hex");
}

async function syncOnce() {
  const envPath = path.resolve(process.cwd(), ".env");
  const env = readEnvFile(envPath);

  const historyApiUrl = env.EXPO_PUBLIC_GEMPA_TERDETEKSI_HISTORY;
  const latestApiUrl = env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL;
  const dbUrl = env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

  if (!historyApiUrl) {
    throw new Error("EXPO_PUBLIC_GEMPA_TERDETEKSI_HISTORY is not set in .env");
  }

  if (!latestApiUrl) {
    throw new Error("EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL is not set in .env");
  }

  if (!dbUrl) {
    throw new Error("EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set in .env");
  }

  const [historyRes, latestRes] = await Promise.all([
    fetch(withCacheBuster(historyApiUrl)),
    fetch(withCacheBuster(latestApiUrl)),
  ]);

  if (!historyRes.ok) {
    throw new Error(
      `Failed to fetch history API: ${historyRes.status} ${historyRes.statusText}`,
    );
  }

  if (!latestRes.ok) {
    throw new Error(
      `Failed to fetch latest API: ${latestRes.status} ${latestRes.statusText}`,
    );
  }

  const [historyRawText, latestRawText] = await Promise.all([
    historyRes.text(),
    latestRes.text(),
  ]);

  const historyFeatures = parseDetectedFeatures(historyRawText);
  const latestFeatures = parseDetectedFeatures(latestRawText);

  const mergedItems = [
    ...historyFeatures.map((feature, index) =>
      parseDetectedItem(feature, index, "histori"),
    ),
    ...latestFeatures.map((feature, index) =>
      parseDetectedItem(feature, index, "gempaQL"),
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => String(b.time).localeCompare(String(a.time)));

  const dedupMap = new Map();
  for (const item of mergedItems) {
    const key = dedupKeyForItem(item);
    if (!dedupMap.has(key)) {
      dedupMap.set(key, item);
    }
  }

  const uniqueItems = Array.from(dedupMap.values()).sort((a, b) =>
    String(b.time).localeCompare(String(a.time)),
  );

  const latestItem = uniqueItems[0] ?? null;

  const itemsByKey = {};
  for (const item of uniqueItems) {
    const key = dedupKeyForItem(item)
      .replace(/[.$#[\]/]/g, "_")
      .replace(/\s+/g, "_");
    itemsByKey[key] = item;
  }

  const payload = {
    sourceUrls: {
      history: historyApiUrl,
      latest: latestApiUrl,
    },
    filteredFromYear: 2023,
    syncedAt: new Date().toISOString(),
    totalItems: uniqueItems.length,
    lastEventId: latestItem?.eventid ?? null,
    items: itemsByKey,
    datasetChecksum: createPayloadChecksum(itemsByKey),
  };

  const currentMetaRes = await getDatabase()
    .ref("gempa_terdeteksi")
    .get();
  
  let currentData = {};
  if (currentMetaRes.exists()) {
    currentData = currentMetaRes.val();
  }
  const currentLastEventId = String(currentData?.lastEventId ?? "");
  const currentTotalItems = Number(currentData?.totalItems ?? 0);
  const currentChecksum = String(currentData?.datasetChecksum ?? "");
  const nextLastEventId = String(payload.lastEventId ?? "");

  if (
    currentLastEventId === nextLastEventId &&
    currentTotalItems === payload.totalItems &&
    currentChecksum === payload.datasetChecksum
  ) {
    return {
      ok: true,
      skipped: true,
      reason: "No new merged data",
      writePath: "/gempa_terdeteksi",
      totalItems: payload.totalItems,
      lastEventId: payload.lastEventId,
    };
  }

  // Write using Firebase Admin SDK
  try {
    const db = getDatabase();
    await db.ref("gempa_terdeteksi").set(payload);
    console.log("[Sync] Successfully wrote gempa_terdeteksi data using Firebase Admin SDK");
  } catch (error) {
    throw new Error(
      `Failed to write to Firebase Admin: ${error.message}`
    );
  }

  // Verify write using Admin SDK
  const verifySnapshot = await getDatabase()
    .ref("gempa_terdeteksi/totalItems")
    .get();
  
  const verifyTotalItems = verifySnapshot.exists() ? verifySnapshot.val() : null;

  return {
    ok: true,
    writePath: "/gempa_terdeteksi",
    filteredFromYear: 2023,
    mergedFrom: ["histori", "gempaQL"],
    writtenItems: uniqueItems.length,
    verifiedTotalItems: verifyTotalItems,
    lastEventId: payload.lastEventId,
  };
}

async function run() {
  const intervalArg = Number(process.argv[2] ?? 0);

  if (intervalArg > 0) {
    console.log(
      `[Gempa Terdeteksi Sync] watch mode every ${intervalArg} ms (Ctrl+C to stop)`,
    );

    const first = await syncOnce();
    console.log(JSON.stringify(first, null, 2));

    setInterval(async () => {
      try {
        const result = await syncOnce();
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(error?.stack || error?.message || String(error));
      }
    }, intervalArg);

    return;
  }

  const result = await syncOnce();
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
