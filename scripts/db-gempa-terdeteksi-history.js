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
    props.eventid ??
      props.identifier ??
      `${timeValue}-${latitude}-${longitude}-${index}`,
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

  // Merge kedua API dan dedup berdasarkan eventid
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

  if (uniqueItems.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "No valid items from API",
      writePath: "/gempa_terdeteksi",
      lastEventId: null,
    };
  }

  const latestItem = uniqueItems[0];
  const latestEventId = latestItem.eventid;

  const db = getDatabase();

  // 1 read ringan — hanya ambil lastEventId yang tersimpan
  const lastEventIdSnap = await db.ref("gempa_terdeteksi/lastEventId").get();
  const storedLastEventId = lastEventIdSnap.exists()
    ? String(lastEventIdSnap.val())
    : null;

  // Filter: hanya item yang eventid-nya lebih baru dari yang tersimpan
  // eventid format YYYYMMDDHHmmss — aman dibandingkan sebagai string
  const newItems = storedLastEventId
    ? uniqueItems.filter((item) => String(item.eventid) > storedLastEventId)
    : uniqueItems;

  if (newItems.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "No new items from API",
      writePath: "/gempa_terdeteksi",
      lastEventId: latestEventId,
    };
  }

  // Bangun updates — hanya item baru
  const updates = {};
  for (const item of newItems) {
    const key = dedupKeyForItem(item)
      .replace(/[.$#[\]/]/g, "_")
      .replace(/\s+/g, "_");
    updates[`gempa_terdeteksi/items/${key}`] = item;
  }

  // Update metadata
  updates["gempa_terdeteksi/lastEventId"] = latestEventId;
  updates["gempa_terdeteksi/syncedAt"] = new Date().toISOString();
  updates["gempa_terdeteksi/sourceUrls"] = {
    history: historyApiUrl,
    latest: latestApiUrl,
  };
  updates["gempa_terdeteksi/filteredFromYear"] = 2023;

  await db.ref().update(updates);

  return {
    ok: true,
    skipped: false,
    writePath: "/gempa_terdeteksi",
    filteredFromYear: 2023,
    mergedFrom: ["histori", "gempaQL"],
    newItems: newItems.length,
    lastEventId: latestEventId,
  };
}

async function run() {
  const intervalArg = Number(process.argv[2] ?? 0);

  if (intervalArg > 0) {
    try {
      const first = await syncOnce();
      console.log("[sync] Initial run:", first);
    } catch (error) {
      console.error("[sync] Initial run failed:", error.message);
    }

    setInterval(async () => {
      try {
        const result = await syncOnce();
        console.log("[sync] Interval run:", result);
      } catch (error) {
        console.error("[sync] Interval run failed:", error.message);
      }
    }, intervalArg);

    return;
  }

  try {
    const result = await syncOnce();
    console.log("[sync] Done:", JSON.stringify(result));
  } catch (error) {
    console.error("[sync] Fatal error:", error.message);
    process.exit(1);
  }
}

run().finally(() => {
  process.exit(0);
});