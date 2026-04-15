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

function getLatestItem(items) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return [...items].sort((a, b) =>
    String(b?.eventid ?? "").localeCompare(String(a?.eventid ?? "")),
  )[0];
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

  const lastEventRes = await fetch(
    `${dbUrl}/gempa_dirasakan_latest/lastEventId.json`,
  );

  if (!lastEventRes.ok) {
    throw new Error(
      `Failed to read DB lastEventId: ${lastEventRes.status} ${lastEventRes.statusText}`,
    );
  }

  const lastEventId = await lastEventRes.json();

  if (String(lastEventId ?? "") === String(latest.eventid)) {
    return {
      ok: true,
      skipped: true,
      reason: "No new event",
      eventid: latest.eventid,
    };
  }

  const payload = {
    sourceUrl: apiUrl,
    sourceIdentifier: globalIdentifier,
    syncedAt: new Date().toISOString(),
    lastEventId: latest.eventid,
    item: latest,
  };

  const writeRes = await fetch(`${dbUrl}/gempa_dirasakan_latest.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`Failed to write latest data: ${writeRes.status} ${errText}`);
  }

  return {
    ok: true,
    skipped: false,
    writtenEventId: latest.eventid,
    writePath: "/gempa_dirasakan_latest",
  };
}

async function run() {
  const intervalArg = Number(process.argv[2] ?? 0);

  if (intervalArg > 0) {
    console.log(
      `[Gempa Latest Sync] running every ${intervalArg} ms (Ctrl+C to stop)`,
    );

    await syncLatestOnce().then((result) => {
      console.log(JSON.stringify(result, null, 2));
    });

    setInterval(async () => {
      try {
        const result = await syncLatestOnce();
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(error?.stack || error?.message || String(error));
      }
    }, intervalArg);

    return;
  }

  const result = await syncLatestOnce();
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
