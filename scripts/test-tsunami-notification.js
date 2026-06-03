/**
 * Test script untuk mengirim notifikasi tsunami dari BMKG API.
 * Usage: npm run test:tsunami-notification
 */

import fs from "fs";
import path from "path";
import {
  fetchLatestTsunamiWarning,
  sendTsunamiNotification,
} from "./fcm-notifications.js";
import { initializeAdmin } from "./firebase-admin-config.js";

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
  const envPath = path.resolve(process.cwd(), ".env");
  const envDevelopmentPath = path.resolve(process.cwd(), ".env.development");

  return {
    ...readEnvFileIfExists(envDevelopmentPath),
    ...readEnvFileIfExists(envPath),
    ...process.env,
  };
}

async function testTsunamiNotification() {
  try {
    console.log("[test-tsunami-notification] Initializing Firebase Admin...");
    await initializeAdmin();

    const env = loadEnv();
    const apiUrl =
      env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ||
      env.PERINGATAN_TSUNAMI_API_URL;

    if (!apiUrl) {
      throw new Error(
        "EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL not configured in .env or .env.development",
      );
    }

    const latest = await fetchLatestTsunamiWarning(apiUrl);
    if (!latest?.eventId) {
      throw new Error("No tsunami warning data available from BMKG API");
    }

    const testEventId = `${latest.eventId}_test_${Date.now()}`;

    console.log("[test-tsunami-notification] Sending test push...");
    const result = await sendTsunamiNotification(
      {
        eventId: testEventId,
        warningId: latest.warningId,
        subject: latest.subject,
        headline: latest.headline,
        description: latest.description,
        location: latest.location,
        magnitude: latest.magnitude,
        timestamp: latest.timestamp,
      },
      { skipDedupe: true },
    );

    if (!result || result.eligibleCount === 0) {
      throw new Error(
        "No recipient tokens found in user_fcm_tokens. Aktifkan notifikasi push di aplikasi lalu login ulang atau toggle OFF/ON agar token tersimpan.",
      );
    }

    console.log(
      `[test-tsunami-notification] Done. success=${result.successCount}, failure=${result.failureCount}, eligible=${result.eligibleCount}`,
    );
    console.log("[test-tsunami-notification] Skipped:", result.skippedCounts);

    process.exit(0);
  } catch (error) {
    console.error("[test-tsunami-notification] Failed:", error?.message || error);
    process.exit(1);
  }
}

testTsunamiNotification();
