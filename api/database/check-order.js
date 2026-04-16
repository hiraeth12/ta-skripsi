/**
 * Verify items order (ascending: oldest first)
 * Run: node api/database/check-order.js
 */

const fs = require("fs");
const path = require("path");

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

async function checkOrder() {
  const envPath = path.resolve(process.cwd(), ".env");
  const env = readEnvFile(envPath);
  const dbUrl = env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

  if (!dbUrl) {
    throw new Error("EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set");
  }

  console.log("[Check] Fetching items order from database...\n");

  const res = await fetch(`${dbUrl}/gempa_dirasakan/items.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }

  const items = await res.json();

  if (!Array.isArray(items)) {
    console.log("❌ Items is not an array!");
    return;
  }

  console.log(`Total items: ${items.length}\n`);
  console.log("📊 Sample items (checking ascending order):\n");

  // Display first 3, middle one, last 3
  const indices = [0, 1, 2, Math.floor(items.length / 2), items.length - 3, items.length - 2, items.length - 1];
  const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);

  for (const idx of uniqueIndices) {
    const item = items[idx];
    if (!item) continue;

    const indicator = idx === 0 ? "� OLDEST" : idx === items.length - 1 ? "🔴 NEWEST" : "";
    
    console.log(
      `[${idx}] ${item.eventid} | ${item.date} ${item.time} | Mag: ${item.magnitude} | Area: ${item.area} ${indicator}`
    );
  }

  // Verify ascending order
  console.log("\n✅ Verification:");
  let isAscending = true;
  for (let i = 0; i < items.length - 1; i++) {
    const curr = String(items[i]?.eventid ?? "");
    const next = String(items[i + 1]?.eventid ?? "");
    if (curr.localeCompare(next) > 0) {
      isAscending = false;
      console.log(`❌ NOT ascending at index ${i}: ${curr} > ${next}`);
      break;
    }
  }

  if (isAscending) {
    console.log("✅ Order is ASCENDING (oldest at index 0, newest at last index)");
  }

  console.log("\n");
}

checkOrder().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
