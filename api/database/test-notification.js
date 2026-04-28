/**
 * Test script untuk mengirim notifikasi gempa dari BMKG API
 * Usage: npm run test:notification
 */

import fs from "fs";
import path from "path";
import { sendGempaDirasakanNotification } from "./fcm-notifications.js";
import { initializeAdmin } from "./firebase-admin-config.js";

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

async function testNotification() {
  try {
    console.log("🔧 Initializing Firebase Admin...");
    await initializeAdmin();
    
    // Load env variables
    const envPath = path.resolve(process.cwd(), ".env");
    const envVars = readEnvFile(envPath);
    
    const apiUrl = envVars.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL;
    if (!apiUrl) {
      throw new Error("EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL not configured in .env");
    }

    console.log("🌍 Fetching latest gempa data from BMKG...");
    const res = await fetch(`${apiUrl.trim()}${Date.now()}`);
    const data = await res.json();
    
    if (!data.info || data.info.length === 0) {
      throw new Error("No gempa data available from BMKG API");
    }

    const gempaData = Array.isArray(data.info) ? data.info[0] : data.info;
    const headline = String(gempaData.headline || gempaData.description || "Gempa dirasakan");
    
    console.log(`📱 Sending test notification with headline: "${headline}"`);
    const result = await sendGempaDirasakanNotification(
      headline,                                 // headline from BMKG
      String(gempaData.magnitude || ""),        // magnitude
      String(gempaData.area || gempaData.location || ""), // location
      String(gempaData.depth || ""),            // depth
      new Date().toISOString()                  // timestamp
    );

    console.log("✅ Notification test completed!");
    console.log("Result:", result);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    process.exit(1);
  }
}

testNotification();
