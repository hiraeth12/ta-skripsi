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

async function sortGempaDirasakan() {
  const envPath = path.resolve(process.cwd(), ".env");
  const env = readEnvFile(envPath);

  if (!env.EXPO_PUBLIC_FIREBASE_DATABASE_URL) {
    throw new Error("EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set in .env");
  }

  const db = getDatabase();

  console.log("[sort] Fetching gempa_dirasakan/items from DB...");
  const snapshot = await db.ref("gempa_dirasakan/items").get();

  if (!snapshot.exists()) {
    console.log("[sort] No items found. Nothing to sort.");
    return;
  }

  const rawData = snapshot.val();
  const items = Array.isArray(rawData) ? rawData : Object.values(rawData);

  console.log(`[sort] Found ${items.length} items. Sorting by date/time ascending...`);

  const sorted = [...items].sort((a, b) =>
    parseDirasakanDateTime(a) - parseDirasakanDateTime(b) ||
    String(a.eventid ?? "").localeCompare(String(b.eventid ?? "")),
  );

  console.log("[sort] Preview — first 3:");
  sorted.slice(0, 3).forEach((item, i) =>
    console.log(`  [${i}] eventid=${item.eventid}  date=${item.date}  time=${item.time}`),
  );
  console.log("[sort] Preview — last 3:");
  sorted.slice(-3).forEach((item, i) =>
    console.log(`  [${sorted.length - 3 + i}] eventid=${item.eventid}  date=${item.date}  time=${item.time}`),
  );

  console.log("[sort] Writing sorted items back to DB...");

  await db.ref().update({
    "gempa_dirasakan/items": sorted,
    "gempa_dirasakan/lastEventId": sorted[sorted.length - 1]?.eventid ?? null,
    "gempa_dirasakan/totalItems": sorted.length,
  });

  console.log(`[sort] Done. ${sorted.length} items are now sorted oldest → newest.`);
}

sortGempaDirasakan().catch((error) => {
  console.error("[sort] Fatal error:", error.message);
  process.exit(1);
});