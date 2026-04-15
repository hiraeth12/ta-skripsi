const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");

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

async function run() {
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
    throw new Error(`Failed to fetch API: ${response.status} ${response.statusText}`);
  }

  const rawText = await response.text();
  const { candidates, globalIdentifier } = parseCandidates(rawText);
  const normalizedItems = candidates
    .map((candidate, index) => normalizeQuakeItem(candidate, index, globalIdentifier))
    .filter(Boolean);

  const payload = {
    sourceUrl: apiUrl,
    sourceIdentifier: globalIdentifier,
    totalItems: normalizedItems.length,
    syncedAt: new Date().toISOString(),
    items: normalizedItems,
  };

  const writeResponse = await fetch(`${dbUrl}/gempa_dirasakan_history.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!writeResponse.ok) {
    const errText = await writeResponse.text();
    throw new Error(`Failed to write DB: ${writeResponse.status} ${errText}`);
  }

  const verifyResponse = await fetch(
    `${dbUrl}/gempa_dirasakan_history/totalItems.json`,
  );
  const verifyTotalItems = await verifyResponse.json();

  console.log(
    JSON.stringify(
      {
        ok: true,
        writePath: "/gempa_dirasakan_history",
        writtenItems: normalizedItems.length,
        verifiedTotalItems: verifyTotalItems,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
