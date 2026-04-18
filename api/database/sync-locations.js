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

function readLocationsFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("jabar_only.json must contain an array of locations");
  }

  return parsed;
}

async function syncLocationsOnce() {
  const envPath = path.resolve(process.cwd(), ".env");
  const env = readEnvFile(envPath);
  const dbUrl = env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

  if (!dbUrl) {
    throw new Error("EXPO_PUBLIC_FIREBASE_DATABASE_URL is not set in .env");
  }

  const locationsPath = path.resolve(
    process.cwd(),
    "assets/geojson/jabar_only.json",
  );
  const locations = readLocationsFile(locationsPath);

  // Transform array into object keyed by id for better query performance
  const locationsById = {};
  for (const location of locations) {
    const id = String(location.id ?? "").trim();
    if (id) {
      locationsById[id] = location;
    }
  }

  // Write using Firebase Admin SDK
  try {
    const db = getDatabase();
    await db.ref("locations").set(locationsById);
    console.log("[Sync] Successfully wrote locations using Firebase Admin SDK");
  } catch (error) {
    throw new Error(
      `Failed to write to Firebase Admin: ${error.message}`
    );
  }

  // Verify write using Admin SDK
  const verifySnapshot = await getDatabase().ref("locations").get();
  let verifiedLocations = {};
  if (verifySnapshot.exists()) {
    verifiedLocations = verifySnapshot.val();
  }
  const totalLocations = Object.keys(verifiedLocations || {}).length;

  return {
    ok: true,
    writePath: "/locations",
    totalLocations: totalLocations,
    format: "object keyed by id",
  };
}

async function run() {
  try {
    const result = await syncLocationsOnce();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

run();