import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";
import { getDatabase } from "./firebase-admin-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const NODE_PATH = "gempa_terdeteksi";
const FILTERED_FROM_YEAR = 2024;
const FETCH_TIMEOUT_MS = 30_000;
const SOURCE_KEYS = ["history", "latest", "live30event"];

function text(value) {
  return String(value ?? "").trim();
}

function firstText(...values) {
  for (const value of values) {
    const valueText = text(value);
    if (valueText) return valueText;
  }
  return "";
}

function readEnvFileIfExists(envPath) {
  if (!fs.existsSync(envPath)) return {};

  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnv() {
  const merged = { ...process.env };

  for (const file of [
    path.resolve(PROJECT_ROOT, ".env"),
    path.resolve(PROJECT_ROOT, ".env.development"),
  ]) {
    const envFile = readEnvFileIfExists(file);
    for (const [key, value] of Object.entries(envFile)) {
      if (merged[key] === undefined) {
        merged[key] = value;
        process.env[key] = value;
      }
    }
  }

  if (
    !text(merged.FIREBASE_DATABASE_URL) &&
    text(merged.EXPO_PUBLIC_FIREBASE_DATABASE_URL)
  ) {
    merged.FIREBASE_DATABASE_URL = merged.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
    process.env.FIREBASE_DATABASE_URL = merged.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  }

  return merged;
}

function requireSourceUrls(env) {
  const sourceUrls = {
    history: text(env.EXPO_PUBLIC_GEMPA_TERDETEKSI_HISTORY),
    latest: text(env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL),
    live30event: text(env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL_FAST),
  };

  const missing = Object.entries(sourceUrls)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing gempa_terdeteksi source URL env: ${missing.join(", ")}`,
    );
  }

  return sourceUrls;
}

function withCacheBuster(url) {
  const base = text(url);
  if (!base) return "";
  if (base.endsWith("=")) return `${base}${Date.now()}`;
  if (base.endsWith("?") || base.endsWith("&")) {
    return `${base}t=${Date.now()}`;
  }
  return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

async function fetchText(sourceKey, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(withCacheBuster(url), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `${sourceKey} fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseNumber(value) {
  const parsed = Number.parseFloat(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function parseEventDateTime(value) {
  const raw = text(value).replace(/\s*(WIB|UTC)$/i, "").trim();
  const match = raw.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:\s*(Z|[+-]\d{2}:?\d{2}))?/i,
  );

  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = match[6] ? Number.parseInt(match[6], 10) : 0;
  const millisecond = match[7]
    ? Number.parseInt(match[7].padEnd(3, "0").slice(0, 3), 10)
    : 0;
  const timezone = text(match[8]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second) ||
    !Number.isFinite(millisecond)
  ) {
    return null;
  }

  const tanggal = `${year}-${pad2(month)}-${pad2(day)}`;
  const jam = `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  const waktu = `${tanggal} ${jam}`;
  let eventTimeMs = Number.NaN;

  if (timezone) {
    const normalizedTimezone =
      timezone.length === 5 && timezone !== "Z"
        ? `${timezone.slice(0, 3)}:${timezone.slice(3)}`
        : timezone;
    eventTimeMs = Date.parse(
      `${tanggal}T${jam}.${pad3(millisecond)}${normalizedTimezone}`,
    );
  } else {
    eventTimeMs = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      millisecond,
    );
  }

  if (!Number.isFinite(eventTimeMs)) return null;
  return { eventTimeMs, jam, tanggal, waktu, year };
}

function formatMagnitude(value) {
  const magnitude = parseNumber(value);
  return magnitude === null ? "" : magnitude.toFixed(1);
}

function formatDepth(value) {
  const valueText = text(value);
  if (!valueText) return "";
  if (/km/i.test(valueText)) return valueText;

  const depth = parseNumber(valueText);
  return depth === null ? valueText : `${depth.toFixed(1)} km`;
}

function emptySources() {
  return {
    history: false,
    latest: false,
    live30event: false,
  };
}

function sourceMarker(sourceKey) {
  return {
    ...emptySources(),
    [sourceKey]: true,
  };
}

function isValidFirebaseKey(value) {
  return Boolean(value) && !/[.#$\[\]/]/.test(value);
}

function looksLikeBmkgEventId(value) {
  return /^bmg\d{4}[a-z0-9]+$/i.test(text(value));
}

function getJsonEventId(feature, props) {
  const explicitEventId = firstText(
    props.eventid,
    props.eventId,
    props.eventID,
    feature?.eventid,
    feature?.eventId,
  );

  if (explicitEventId) return explicitEventId;

  const idCandidate = firstText(props.id, feature?.id);
  return looksLikeBmkgEventId(idCandidate) ? idCandidate : "";
}

function makeStats() {
  return {
    sourceItems: {
      history: 0,
      latest: 0,
      live30event: 0,
    },
    acceptedItems: {
      history: 0,
      latest: 0,
      live30event: 0,
    },
    skippedItems: 0,
    skippedBeforeYear: 0,
    duplicateMerged: 0,
    suppressedWarnings: 0,
    warnings: [],
  };
}

function recordSkip(stats, sourceKey, index, reason, shouldWarn = true) {
  stats.skippedItems += 1;

  if (!shouldWarn) return;

  const warning = `[skip:${sourceKey}:${index}] ${reason}`;
  if (stats.warnings.length < 20) {
    stats.warnings.push(warning);
    console.warn(warning);
    return;
  }

  stats.suppressedWarnings += 1;
  if (stats.suppressedWarnings === 1) {
    console.warn("[skip] Additional warnings suppressed; see skippedItems counts");
  }
}

function normalizeJsonFeature(feature, index, sourceKey, syncedAt, stats) {
  const props = feature?.properties ?? {};
  const eventid = getJsonEventId(feature, props);

  if (!eventid) {
    recordSkip(
      stats,
      sourceKey,
      index,
      "missing original API eventid; generated fallback is not used as key",
    );
    return null;
  }

  if (!isValidFirebaseKey(eventid)) {
    recordSkip(stats, sourceKey, index, `invalid Firebase key eventid=${eventid}`);
    return null;
  }

  const parsedTime = parseEventDateTime(
    firstText(props.time, props.waktu, feature?.time, feature?.waktu),
  );

  if (!parsedTime) {
    recordSkip(stats, sourceKey, index, `missing or invalid event time for ${eventid}`);
    return null;
  }

  if (parsedTime.year < FILTERED_FROM_YEAR) {
    stats.skippedBeforeYear += 1;
    recordSkip(
      stats,
      sourceKey,
      index,
      `event before ${FILTERED_FROM_YEAR}: ${eventid}`,
      false,
    );
    return null;
  }

  const coords = feature?.geometry?.coordinates ?? {};
  const longitude = parseNumber(
    firstText(props.longitude, props.lon, props.bujur, coords?.[0], coords?.longitude),
  );
  const latitude = parseNumber(
    firstText(props.latitude, props.lat, props.lintang, coords?.[1], coords?.latitude),
  );

  if (latitude === null || longitude === null) {
    recordSkip(stats, sourceKey, index, `missing coordinates for ${eventid}`);
    return null;
  }

  const rawEventIdFallback = firstText(
    props.identifier,
    props.generatedId,
    looksLikeBmkgEventId(props.id) ? "" : props.id,
    looksLikeBmkgEventId(feature?.id) ? "" : feature?.id,
  );

  stats.acceptedItems[sourceKey] += 1;

  return {
    eventid,
    status: firstText(props.status),
    waktu: parsedTime.waktu,
    time: parsedTime.waktu,
    tanggal: parsedTime.tanggal,
    jam: parsedTime.jam,
    eventTimeMs: parsedTime.eventTimeMs,
    magnitude: formatMagnitude(firstText(props.mag, props.magnitude)),
    kedalaman: formatDepth(firstText(props.depth, props.kedalaman, props.dalam)),
    lokasi: firstText(props.place, props.lokasi, props.area, props.wilayah),
    latitude,
    longitude,
    coordinates: {
      latitude,
      longitude,
    },
    felt: firstText(props.fase, props.felt),
    sources: sourceMarker(sourceKey),
    rawEventIdFallback:
      rawEventIdFallback && rawEventIdFallback !== eventid
        ? rawEventIdFallback
        : "",
    updatedAt: syncedAt,
  };
}

function normalizeXmlGempa(gempa, index, syncedAt, stats) {
  const sourceKey = "live30event";
  const eventid = firstText(gempa?.eventid, gempa?.eventId, gempa?.eventID);

  if (!eventid) {
    recordSkip(
      stats,
      sourceKey,
      index,
      "missing original API eventid; generated fallback is not used as key",
    );
    return null;
  }

  if (!isValidFirebaseKey(eventid)) {
    recordSkip(stats, sourceKey, index, `invalid Firebase key eventid=${eventid}`);
    return null;
  }

  const parsedTime = parseEventDateTime(firstText(gempa?.waktu, gempa?.time));

  if (!parsedTime) {
    recordSkip(stats, sourceKey, index, `missing or invalid event time for ${eventid}`);
    return null;
  }

  if (parsedTime.year < FILTERED_FROM_YEAR) {
    stats.skippedBeforeYear += 1;
    recordSkip(
      stats,
      sourceKey,
      index,
      `event before ${FILTERED_FROM_YEAR}: ${eventid}`,
      false,
    );
    return null;
  }

  const latitude = parseNumber(firstText(gempa?.lintang, gempa?.latitude));
  const longitude = parseNumber(firstText(gempa?.bujur, gempa?.longitude));

  if (latitude === null || longitude === null) {
    recordSkip(stats, sourceKey, index, `missing coordinates for ${eventid}`);
    return null;
  }

  stats.acceptedItems[sourceKey] += 1;

  return {
    eventid,
    status: firstText(gempa?.status),
    waktu: parsedTime.waktu,
    time: parsedTime.waktu,
    tanggal: parsedTime.tanggal,
    jam: parsedTime.jam,
    eventTimeMs: parsedTime.eventTimeMs,
    magnitude: formatMagnitude(firstText(gempa?.mag, gempa?.magnitude)),
    kedalaman: formatDepth(firstText(gempa?.dalam, gempa?.depth)),
    lokasi: firstText(gempa?.area, gempa?.lokasi, gempa?.place),
    latitude,
    longitude,
    coordinates: {
      latitude,
      longitude,
    },
    felt: firstText(gempa?.felt, gempa?.fase),
    sources: sourceMarker(sourceKey),
    rawEventIdFallback: "",
    updatedAt: syncedAt,
  };
}

function parseJsonFeatures(rawText, sourceKey, syncedAt, stats) {
  const parsed = JSON.parse(rawText);
  const features = Array.isArray(parsed?.features) ? parsed.features : [];
  stats.sourceItems[sourceKey] = features.length;

  if (features.length === 0) {
    console.warn(`[parse:${sourceKey}] JSON has no features array`);
    return [];
  }

  return features
    .map((feature, index) =>
      normalizeJsonFeature(feature, index, sourceKey, syncedAt, stats),
    )
    .filter(Boolean);
}

function parseLive30EventXml(rawText, syncedAt, stats) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(rawText);
  const root = parsed?.Infogempa ?? parsed;
  const candidates = asArray(root?.gempa ?? parsed?.gempa);
  stats.sourceItems.live30event = candidates.length;

  if (candidates.length === 0) {
    console.warn("[parse:live30event] XML has no gempa node");
    return [];
  }

  return candidates
    .map((gempa, index) => normalizeXmlGempa(gempa, index, syncedAt, stats))
    .filter(Boolean);
}

function mergeItem(existing, incoming) {
  const merged = { ...existing };

  for (const key of [
    "status",
    "waktu",
    "time",
    "tanggal",
    "jam",
    "magnitude",
    "kedalaman",
    "lokasi",
    "felt",
    "rawEventIdFallback",
  ]) {
    if (!text(merged[key]) && text(incoming[key])) {
      merged[key] = incoming[key];
    }
  }

  if (!Number.isFinite(merged.eventTimeMs) && Number.isFinite(incoming.eventTimeMs)) {
    merged.eventTimeMs = incoming.eventTimeMs;
  }

  if (!Number.isFinite(merged.latitude) && Number.isFinite(incoming.latitude)) {
    merged.latitude = incoming.latitude;
  }

  if (!Number.isFinite(merged.longitude) && Number.isFinite(incoming.longitude)) {
    merged.longitude = incoming.longitude;
  }

  merged.coordinates = {
    latitude: merged.latitude,
    longitude: merged.longitude,
  };

  merged.sources = {
    ...emptySources(),
    ...existing.sources,
    ...incoming.sources,
  };
  merged.updatedAt = incoming.updatedAt || existing.updatedAt;

  return merged;
}

function dedupeByEventId(items, stats) {
  const byEventId = new Map();

  for (const item of items) {
    const existing = byEventId.get(item.eventid);
    if (existing) {
      byEventId.set(item.eventid, mergeItem(existing, item));
      stats.duplicateMerged += 1;
      continue;
    }
    byEventId.set(item.eventid, item);
  }

  return Array.from(byEventId.values()).sort(
    (a, b) => b.eventTimeMs - a.eventTimeMs,
  );
}

function cleanFirebaseValue(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map(cleanFirebaseValue);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        cleanFirebaseValue(entry),
      ]),
    );
  }
  return value;
}

function checksumForItems(items) {
  const checksumItems = [...items]
    .sort((a, b) => String(a.eventid).localeCompare(String(b.eventid)))
    .map(({ updatedAt, ...item }) => item);

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(checksumItems))
    .digest("hex");
}

function buildPayload(items, sourceUrls, syncedAt) {
  const datasetChecksum = checksumForItems(items);
  const itemsNode = {};

  for (const item of items) {
    itemsNode[item.eventid] = cleanFirebaseValue(item);
  }

  return {
    metadata: {
      datasetChecksum,
      filteredFromYear: FILTERED_FROM_YEAR,
      sourceUrls,
      syncedAt,
      totalItems: items.length,
    },
    items: itemsNode,
  };
}

function makeBackupTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function writeWithBackup(payload, syncedAt) {
  const db = getDatabase();
  const currentSnapshot = await db.ref(NODE_PATH).get();
  const backupPath = `${NODE_PATH}_backup_${makeBackupTimestamp(new Date(syncedAt))}`;
  const backupValue = currentSnapshot.exists()
    ? currentSnapshot.val()
    : {
        __empty: true,
        backedUpAt: syncedAt,
        backupOf: NODE_PATH,
      };

  await db.ref(backupPath).set(backupValue);
  await db.ref(NODE_PATH).set(payload);

  return backupPath;
}

async function buildRestructurePayload() {
  const env = loadEnv();
  const sourceUrls = requireSourceUrls(env);
  const syncedAt = new Date().toISOString();
  const stats = makeStats();

  const [historyRaw, latestRaw, live30eventRaw] = await Promise.all([
    fetchText("history", sourceUrls.history),
    fetchText("latest", sourceUrls.latest),
    fetchText("live30event", sourceUrls.live30event),
  ]);

  const parsedItems = [
    ...parseJsonFeatures(historyRaw, "history", syncedAt, stats),
    ...parseJsonFeatures(latestRaw, "latest", syncedAt, stats),
    ...parseLive30EventXml(live30eventRaw, syncedAt, stats),
  ];
  const items = dedupeByEventId(parsedItems, stats);
  const payload = buildPayload(items, sourceUrls, syncedAt);

  return {
    items,
    payload,
    sourceUrls,
    stats,
    syncedAt,
  };
}

export async function restructureGempaTerdeteksi({ dryRun = false } = {}) {
  const { items, payload, stats, syncedAt } = await buildRestructurePayload();

  if (items.length === 0) {
    return {
      ok: false,
      skipped: true,
      dryRun,
      reason: "No valid gempa_terdeteksi items found; database was not changed",
      ...stats,
      totalItems: 0,
      datasetChecksum: payload.metadata.datasetChecksum,
    };
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      writePath: `/${NODE_PATH}`,
      ...stats,
      totalItems: items.length,
      datasetChecksum: payload.metadata.datasetChecksum,
      sampleItemPaths: items.slice(0, 3).map((item) => `${NODE_PATH}/items/${item.eventid}`),
    };
  }

  const backupPath = await writeWithBackup(payload, syncedAt);

  return {
    ok: true,
    dryRun: false,
    writePath: `/${NODE_PATH}`,
    backupPath: `/${backupPath}`,
    ...stats,
    totalItems: items.length,
    writtenItems: items.length,
    datasetChecksum: payload.metadata.datasetChecksum,
  };
}

async function runCli() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await restructureGempaTerdeteksi({ dryRun });
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli().catch((error) => {
    console.error("[restructure:gempa-terdeteksi] Fatal:", error.message);
    process.exitCode = 1;
  });
}
