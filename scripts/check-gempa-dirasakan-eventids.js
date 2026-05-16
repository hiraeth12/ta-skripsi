import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";

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
    eventid: String(candidate?.eventid ?? eventIdFallback),
    time: String(candidate?.time ?? ""),
    date: String(candidate?.date ?? ""),
    magnitude: String(candidate?.magnitude ?? ""),
    area: String(candidate?.area ?? ""),
    event: String(candidate?.event ?? ""),
  };
}

function getApiEventIds(items) {
  return [...items]
    .sort((a, b) => String(b.eventid).localeCompare(String(a.eventid)))
    .map((item) => String(item.eventid).trim())
    .filter(Boolean);
}

function getNodeEventIds(nodeData) {
  const root = nodeData?.gempa_dirasakan ?? nodeData ?? {};
  const items = root?.items ?? [];

  let records = [];

  if (Array.isArray(items)) {
    records = items;
  } else if (items && typeof items === "object") {
    records = Object.values(items);
  }

  return records
    .map((item) => String(item?.eventid ?? item?.eventId ?? "").trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
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

  const [apiRes, dbRes] = await Promise.all([
    fetch(withCacheBuster(apiUrl)),
    fetch(`${dbUrl}/gempa_dirasakan.json`),
  ]);

  if (!apiRes.ok) {
    throw new Error(
      `Failed to fetch API: ${apiRes.status} ${apiRes.statusText}`,
    );
  }

  if (!dbRes.ok) {
    throw new Error(
      `Failed to fetch DB node: ${dbRes.status} ${dbRes.statusText}`,
    );
  }

  const [apiRawText, dbNode] = await Promise.all([apiRes.text(), dbRes.json()]);

  const { candidates, globalIdentifier } = parseCandidates(apiRawText);
  const apiItems = candidates
    .map((candidate, index) =>
      normalizeQuakeItem(candidate, index, globalIdentifier),
    )
    .filter(Boolean);

  const apiEventIds = unique(getApiEventIds(apiItems));
  const nodeEventIds = unique(getNodeEventIds(dbNode));

  const nodeSet = new Set(nodeEventIds);
  const apiSet = new Set(apiEventIds);

  const missingInNode = apiEventIds.filter((eventid) => !nodeSet.has(eventid));
  const extraInNode = nodeEventIds.filter((eventid) => !apiSet.has(eventid));

  const dbRoot = dbNode?.gempa_dirasakan ?? dbNode ?? {};
  const apiLatest = apiEventIds[0] ?? null;
  const dbLastEventId = String(dbRoot?.lastEventId ?? "");

  const report = {
    apiCount: apiEventIds.length,
    nodeCount: nodeEventIds.length,
    apiLatest,
    dbLastEventId,
    missingInNodeCount: missingInNode.length,
    extraInNodeCount: extraInNode.length,
    missingInNode: missingInNode.slice(0, 50),
    extraInNode: extraInNode.slice(0, 50),
  };

  console.log(JSON.stringify(report, null, 2));

  if (missingInNode.length > 0) {
    if (dbLastEventId && dbLastEventId === apiLatest) {
      console.log(
        "[hint] DB already has the latest event, but older API eventids are missing. This usually means the incremental sync only appended the latest event and skipped intermediate events between runs.",
      );
    } else {
      console.log(
        "[hint] The DB lastEventId does not match the API latest eventid. This points to a stale sync or a latest-item selection/order issue.",
      );
    }
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("[check] Fatal error:", error.message);
  process.exit(1);
});