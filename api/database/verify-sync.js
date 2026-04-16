/**
 * Verify data in Firebase database
 * Run: node api/database/verify-sync.js
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

async function verify() {
  const envPath = path.resolve(process.cwd(), ".env");
  const env = readEnvFile(envPath);
  const dbUrl = env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

  if (!dbUrl) {
    throw new Error("EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set");
  }

  console.log("[Verify] Checking database structure...\n");

  // Check gempa_dirasakan node
  console.log("📍 Checking /gempa_dirasakan:");
  try {
    const dirasakan = await fetch(`${dbUrl}/gempa_dirasakan.json`);
    if (dirasakan.ok) {
      const data = await dirasakan.json();
      console.log(`  ✅ Node exists`);
      console.log(`  - totalItems: ${data.totalItems || "NOT SET"}`);
      console.log(`  - lastEventId: ${data.lastEventId || "NOT SET"}`);
      console.log(`  - syncedAt: ${data.syncedAt || "NOT SET"}`);
      console.log(
        `  - Items in array: ${data.items ? data.items.length : 0}`
      );
      if (data.latestItem) {
        console.log(
          `  - latestItem: ${data.latestItem.eventid} (${data.latestItem.date} ${data.latestItem.time})`
        );
      }
    } else {
      console.log(`  ❌ Not found (${dirasakan.status})`);
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }

  console.log("\n📍 Checking /gempa_terdeteksi:");
  try {
    const terdeteksi = await fetch(`${dbUrl}/gempa_terdeteksi.json`);
    if (terdeteksi.ok) {
      const data = await terdeteksi.json();
      console.log(`  ✅ Node exists`);
      console.log(`  - totalItems: ${data.totalItems || "NOT SET"}`);
      console.log(`  - lastEventId: ${data.lastEventId || "NOT SET"}`);
      console.log(`  - syncedAt: ${data.syncedAt || "NOT SET"}`);
      console.log(
        `  - Items in object: ${data.items ? Object.keys(data.items).length : 0}`
      );
    } else {
      console.log(`  ❌ Not found (${terdeteksi.status})`);
    }
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }

  // Check old deprecated nodes
  console.log("\n⚠️  Checking for deprecated nodes:");
  const deprecated = [
    "gempa_dirasakan_history",
    "gempa_dirasakan_latest",
    "gempa_terdeteksi_history",
  ];

  for (const nodeName of deprecated) {
    try {
      const res = await fetch(`${dbUrl}/${nodeName}.json`);
      if (res.ok) {
        console.log(`  ⚠️  ${nodeName}: EXISTS (should be deleted)`);
      } else if (res.status === 404) {
        console.log(`  ✅ ${nodeName}: Not found (good)`);
      }
    } catch (e) {
      console.log(`  ? ${nodeName}: Error checking`);
    }
  }

  console.log("\n✅ Verification complete\n");
}

verify().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
