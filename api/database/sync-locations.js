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

  const writeResponse = await fetch(`${dbUrl}/locations.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(locationsById),
  });

  if (!writeResponse.ok) {
    const errText = await writeResponse.text();
    throw new Error(`Failed to write locations: ${writeResponse.status} ${errText}`);
  }

  const verifyResponse = await fetch(`${dbUrl}/locations.json`);
  if (!verifyResponse.ok) {
    throw new Error(
      `Failed to verify locations: ${verifyResponse.status} ${verifyResponse.statusText}`,
    );
  }

  const verifiedLocations = await verifyResponse.json();
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