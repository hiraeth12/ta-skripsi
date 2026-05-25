import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabase } from "./firebase-admin-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TSUNAMI_EVENTS_PATH = "tsunamiEvents";
const FETCH_TIMEOUT_MS = 30_000;

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
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function loadEnv() {
  const merged = { ...process.env };
  const envFiles = [
    path.resolve(PROJECT_ROOT, ".env"),
    path.resolve(PROJECT_ROOT, ".env.development"),
  ];

  for (const file of envFiles) {
    const parsed = readEnvFileIfExists(file);
    for (const [key, value] of Object.entries(parsed)) {
      if (merged[key] === undefined) {
        merged[key] = value;
        process.env[key] = value;
      }
    }
  }

  return merged;
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

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value) {
  return String(value ?? "").trim();
}

function sanitizeFirebaseKey(value) {
  const sanitized = text(value)
    .replace(/[.#$\[\]\/]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || "unknown";
}

function parsePointCoordinates(coordStr) {
  const [lonStr, latStr] = text(coordStr).split(",").map((part) => part.trim());
  const longitude = Number.parseFloat(lonStr);
  const latitude = Number.parseFloat(latStr);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}

function formatKeyNumber(value) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 10000) / 10000);
}

function parseDateTimeKey(dateValue, timeValue) {
  const dateText = text(dateValue);
  const timeText = text(timeValue);
  const dateMatch = dateText.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  const timeMatch = timeText.match(/^(\d{1,2}):(\d{2}):(\d{2})/);

  if (!dateMatch || !timeMatch) {
    return sanitizeFirebaseKey(`${dateText}_${timeText}`);
  }

  const day = dateMatch[1].padStart(2, "0");
  const month = dateMatch[2].padStart(2, "0");
  const rawYear = dateMatch[3];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  const hour = timeMatch[1].padStart(2, "0");
  const minute = timeMatch[2];
  const second = timeMatch[3];

  return `${year}${month}${day}${hour}${minute}${second}`;
}

function parseTimesent(value) {
  const valueText = text(value).replace(/\s*WIB$/i, "").trim();
  const match = valueText.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
  );

  if (!match) return Number.NEGATIVE_INFINITY;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const year = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = Number.parseInt(match[6], 10);
  const timestamp = new Date(year, month, day, hour, minute, second).getTime();

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function extractWarningId(subject, identifier, timesent, index) {
  const match = text(subject).match(/\bPD[-\s]*([0-9]+(?:\.[0-9]+)?)\b/i);
  if (match) return sanitizeFirebaseKey(`PD-${match[1].replace(/\./g, "-")}`);

  const fallback = text(identifier) || text(timesent) || `warning_${index}`;
  return sanitizeFirebaseKey(fallback);
}

function normalizeNestedList(value) {
  return normalizeArray(value).map((item) => cleanFirebaseValue(item));
}

function cleanFirebaseValue(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.map((item) => cleanFirebaseValue(item));
  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      acc[key] = cleanFirebaseValue(entry);
      return acc;
    }, {});
  }
  return value;
}

function getAlertRoot(parsed) {
  if (parsed?.alert && typeof parsed.alert === "object") return parsed.alert;
  return parsed ?? {};
}

function normalizeInfoCandidate(info, index, alertMeta) {
  const coordStr = text(info?.point?.coordinates);
  const coordinates = parsePointCoordinates(coordStr);
  if (!coordinates) return null;

  const warningIdentifier = text(info?.identifier) || alertMeta.identifier;
  const timesent = text(info?.timesent);
  const warningId = extractWarningId(
    info?.subject,
    warningIdentifier,
    timesent,
    index,
  );

  const eventSignature = [
    text(info?.date),
    text(info?.time),
    coordStr,
    text(info?.magnitude),
  ]
    .map((part) => part.toLowerCase())
    .join("|");

  const warning = {
    warningId,
    identifier: warningIdentifier,
    subject: text(info?.subject),
    headline: text(info?.headline),
    description: text(info?.description),
    instruction: text(info?.instruction),
    potential: text(info?.potential),
    timesent,
    shakemap: text(info?.shakemap),
    wzmap: text(info?.wzmap),
    ttmap: text(info?.ttmap),
    sshmap: text(info?.sshmap),
    wzarea: normalizeNestedList(info?.wzarea),
    obsarea: normalizeNestedList(info?.obsarea),
    raw: cleanFirebaseValue(info),
    rawIndex: index,
    timesentMs: parseTimesent(timesent),
    eventid: text(info?.eventid),
  };

  return {
    eventSignature,
    eventid: text(info?.eventid),
    event: text(info?.event),
    date: text(info?.date),
    time: text(info?.time),
    coordinates: coordStr,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    magnitude: text(info?.magnitude),
    depth: text(info?.depth),
    area: text(info?.area),
    warning,
  };
}

function compositeEventKey(candidate) {
  const dateTimeKey = parseDateTimeKey(candidate.date, candidate.time);
  return sanitizeFirebaseKey(
    [
      dateTimeKey,
      formatKeyNumber(candidate.latitude),
      formatKeyNumber(candidate.longitude),
      `M${candidate.magnitude}`,
    ].join("_"),
  );
}

function latestWarningFrom(warnings) {
  const hasValidTimesent = warnings.some(
    (warning) => warning.timesentMs !== Number.NEGATIVE_INFINITY,
  );

  if (!hasValidTimesent) return warnings[warnings.length - 1] ?? null;

  return [...warnings].sort((a, b) => {
    if (b.timesentMs !== a.timesentMs) return b.timesentMs - a.timesentMs;
    return b.rawIndex - a.rawIndex;
  })[0] ?? null;
}

function groupCandidates(candidates, alertMeta) {
  const grouped = new Map();

  for (const candidate of candidates) {
    const group = grouped.get(candidate.eventSignature);
    if (group) {
      group.candidates.push(candidate);
      group.warnings.push(candidate.warning);
      continue;
    }

    grouped.set(candidate.eventSignature, {
      candidates: [candidate],
      warnings: [candidate.warning],
      alertMeta,
    });
  }

  return Array.from(grouped.values()).map((group) => {
    const base = group.candidates[0];
    const eventIds = new Set(
      group.candidates.map((item) => item.eventid).filter(Boolean),
    );
    const latestWarning = latestWarningFrom(group.warnings);
    const eventKey =
      eventIds.size === 1
        ? sanitizeFirebaseKey(Array.from(eventIds)[0])
        : compositeEventKey(base);

    return {
      eventKey,
      base,
      warnings: group.warnings,
      latestWarning,
      alertMeta: group.alertMeta,
    };
  });
}

function buildWarningPayload(warning) {
  return {
    warningId: warning.warningId,
    identifier: warning.identifier,
    subject: warning.subject,
    headline: warning.headline,
    description: warning.description,
    instruction: warning.instruction,
    potential: warning.potential,
    timesent: warning.timesent,
    shakemap: warning.shakemap,
    wzmap: warning.wzmap,
    ttmap: warning.ttmap,
    sshmap: warning.sshmap,
    wzarea: warning.wzarea,
    obsarea: warning.obsarea,
    raw: warning.raw,
  };
}

function comparablePayload(value) {
  return JSON.stringify(cleanFirebaseValue(value));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(withCacheBuster(url), { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function upsertEvent(db, group, nowIso, stats) {
  const eventRef = db.ref(`${TSUNAMI_EVENTS_PATH}/${group.eventKey}`);
  const snapshot = await eventRef.get();
  const existing = snapshot.exists() ? snapshot.val() : {};
  const latest = group.latestWarning ?? group.warnings[group.warnings.length - 1];

  if (!latest) return;

  const warningsUpdates = {};
  const existingWarnings = existing?.warnings ?? {};

  for (const warning of group.warnings) {
    const payload = buildWarningPayload(warning);
    const current = existingWarnings?.[warning.warningId];

    if (!current) {
      console.log(`New tsunami warning saved: ${warning.warningId}`);
      stats.newWarnings += 1;
      warningsUpdates[`warnings/${warning.warningId}`] = payload;
      continue;
    }

    if (comparablePayload(current) !== comparablePayload(payload)) {
      stats.updatedWarnings += 1;
      warningsUpdates[`warnings/${warning.warningId}`] = payload;
    }
  }

  const rootPayload = {
    eventKey: group.eventKey,
    identifier: group.alertMeta.identifier,
    sender: group.alertMeta.sender,
    sent: group.alertMeta.sent,
    status: group.alertMeta.status,
    msgType: group.alertMeta.msgType,
    scope: group.alertMeta.scope,
    code: group.alertMeta.code,
    event: group.base.event,
    eventid: latest.eventid || group.base.eventid,
    latitude: group.base.latitude,
    longitude: group.base.longitude,
    coordinates: group.base.coordinates,
    magnitude: group.base.magnitude,
    depth: group.base.depth,
    area: group.base.area,
    date: group.base.date,
    time: group.base.time,
    latestWarningId: latest.warningId,
    latestSubject: latest.subject,
    latestHeadline: latest.headline,
    latestTimesent: latest.timesent,
    createdAt: text(existing?.createdAt) || nowIso,
    updatedAt: nowIso,
  };

  const updates = { ...rootPayload };
  for (const [key, value] of Object.entries(warningsUpdates)) {
    updates[key] = value;
  }

  if (Object.keys(warningsUpdates).length === 0) {
    const rootChanged = Object.entries(rootPayload).some(
      ([key, value]) => comparablePayload(existing?.[key]) !== comparablePayload(value),
    );
    if (!rootChanged) return;
  }

  await eventRef.update(updates);
  console.log(`Tsunami event synced: ${group.eventKey}`);
  stats.syncedEvents += 1;
}

export async function syncTsunamiEvents(options = {}) {
  const env = loadEnv();
  const apiUrl =
    options.apiUrl ||
    env.PERINGATAN_TSUNAMI_API_URL ||
    env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL;

  if (!text(apiUrl)) {
    return {
      ok: false,
      skipped: true,
      reason:
        "PERINGATAN_TSUNAMI_API_URL or EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL is not set",
    };
  }

  console.log("Checking tsunami warning API...");

  try {
    const response = await fetchWithTimeout(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch tsunami API: ${response.status}`);
    }

    const raw = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(raw);
    const alert = getAlertRoot(parsed);
    const alertMeta = {
      identifier: text(alert.identifier),
      sender: text(alert.sender),
      sent: text(alert.sent),
      status: text(alert.status),
      msgType: text(alert.msgType),
      scope: text(alert.scope),
      code: text(alert.code),
    };

    const infoItems = normalizeArray(alert.info);
    const candidates = infoItems
      .map((info, index) => normalizeInfoCandidate(info, index, alertMeta))
      .filter(Boolean);

    if (candidates.length === 0) {
      return {
        ok: true,
        skipped: true,
        reason: "No valid tsunami warning info found",
        eventCount: 0,
        warningCount: 0,
      };
    }

    const groups = groupCandidates(candidates, alertMeta);
    const db = options.db || getDatabase();
    const nowIso = new Date().toISOString();
    const stats = {
      syncedEvents: 0,
      newWarnings: 0,
      updatedWarnings: 0,
    };

    for (const group of groups) {
      await upsertEvent(db, group, nowIso, stats);
    }

    if (stats.newWarnings === 0 && stats.updatedWarnings === 0) {
      console.log("No new tsunami warning");
    }

    return {
      ok: true,
      skipped: stats.syncedEvents === 0,
      writePath: `/${TSUNAMI_EVENTS_PATH}`,
      eventCount: groups.length,
      warningCount: candidates.length,
      syncedEvents: stats.syncedEvents,
      newWarnings: stats.newWarnings,
      updatedWarnings: stats.updatedWarnings,
    };
  } catch (error) {
    console.error(`Failed to sync tsunami warning: ${error.message}`);
    return {
      ok: false,
      skipped: true,
      reason: error.message,
    };
  }
}

async function runCli() {
  const result = await syncTsunamiEvents();
  console.log(JSON.stringify(result));
  if (!result.ok && !result.skipped) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli().finally(() => {
    process.exit();
  });
}
