/**
 * Test script untuk mengirim notifikasi gempa dari BMKG API
 * Usage: npm run test:notification
 */

import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { sendGempaDirasakanNotification } from "./fcm-notifications.js";
import { initializeAdmin } from "./firebase-admin-config.js";
import { parseCoordinate } from "../utils/earthquake-impact.js";

/**
 * Load environment variables from .env file
 */
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

function parsePointCoordinates(pointCoordinates) {
  const [lonRaw, latRaw] = String(pointCoordinates ?? "").split(",");
  const longitude = parseCoordinate(lonRaw);
  const latitude = parseCoordinate(latRaw);

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

async function fetchLatestGempaDirasakan(apiUrl) {
  const res = await fetch(`${apiUrl.trim()}${Date.now()}`);
  const raw = await res.text();
  let latest = null;
  let globalIdentifier = "";

  try {
    const data = JSON.parse(raw);
    const infoRaw = data?.info;
    latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
    globalIdentifier = String(data?.identifier ?? "");
  } catch {
    const parser = new XMLParser({ ignoreAttributes: false });
    const data = parser.parse(raw);
    const infoRaw = data?.alert?.info;
    latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
    globalIdentifier = String(data?.alert?.identifier ?? "");
  }

  if (!latest) return null;

  const coordinates =
    parsePointCoordinates(latest?.point?.coordinates) ??
    (() => {
      const latitude = parseCoordinate(latest?.latitude);
      const longitude = parseCoordinate(latest?.longitude);
      return latitude === null || longitude === null
        ? null
        : { latitude, longitude };
    })();

  if (!coordinates) return null;

  return {
    eventId: String(
      latest.eventid ?? latest.identifier ?? globalIdentifier ?? "",
    ),
    headline: String(
      latest.headline || latest.description || "Gempa dirasakan",
    ),
    magnitude: String(latest.magnitude || ""),
    location: String(latest.area || latest.location || ""),
    depth: String(latest.depth || ""),
    timestamp: `${String(latest.date ?? "")} ${String(latest.time ?? "")}`,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}

async function testNotification() {
  try {
    console.log("[test-notification] Initializing Firebase Admin...");
    await initializeAdmin();
    
    // Load env variables
    const envPath = path.resolve(process.cwd(), ".env");
    const envVars = readEnvFile(envPath);
    
    const apiUrl = envVars.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL;
    if (!apiUrl) {
      throw new Error("EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL not configured in .env");
    }

    const gempaData = await fetchLatestGempaDirasakan(apiUrl);
    if (!gempaData?.eventId) {
      throw new Error("No gempa data available from BMKG API");
    }

    console.log("[test-notification] Sending test push...");
    const result = await sendGempaDirasakanNotification(gempaData);

    if (!result) {
      throw new Error(
        "No recipient tokens found in user_fcm_tokens. Aktifkan notifikasi push di aplikasi lalu login ulang atau toggle OFF/ON agar token tersimpan.",
      );
    }

    console.log(
      `[test-notification] Done. success=${result.successCount}, failure=${result.failureCount}, eligible=${result.eligibleCount}`,
    );
    console.log("[test-notification] Skipped:", result.skippedCounts);

    process.exit(0);
  } catch (error) {
    console.error("[test-notification] Failed:", error?.message || error);
    process.exit(1);
  }
}

testNotification();
