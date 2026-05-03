import { XMLParser } from "fast-xml-parser";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

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

// Load environment variables
const envPath = path.resolve(process.cwd(), ".env");
const envVars = readEnvFile(envPath);

/**
 * Send push notification for new gempa dirasakan using Firebase Cloud Messaging API (HTTP v1)
 * @param {string} headline - The headline from BMKG API (gempa description)
 * @param {string} magnitude - Earthquake magnitude
 * @param {string} location - Earthquake location
 * @param {string} depth - Earthquake depth
 * @param {string} timestamp - Earthquake timestamp
 * @returns {Promise<{successCount: number, failureCount: number}>}
 */
export async function sendGempaDirasakanNotification(
  headline,
  magnitude,
  location,
  depth,
  timestamp,
) {
  try {
    const db = admin.database();

    // Get all user tokens from database
    const tokensSnapshot = await db.ref("user_fcm_tokens").get();
    const tokens = [];
    const tokenPathByValue = {};

    if (tokensSnapshot.exists()) {
      const tokenData = tokensSnapshot.val();
      // Support both legacy token object shape and plain string token value.
      for (const userId in tokenData) {
        const entry = tokenData[userId];
        const tokenValue =
          typeof entry === "string"
            ? entry
            : typeof entry?.token === "string"
              ? entry.token
              : null;

        if (tokenValue) {
          tokens.push(tokenValue);
          tokenPathByValue[tokenValue] = `user_fcm_tokens/${userId}`;
        }
      }
    }

    if (tokens.length === 0) {
      return;
    }

    // Deduplicate tokens (same device with multiple accounts)
    const uniqueTokens = Array.from(new Set(tokens));
    const duplicateCount = tokens.length - uniqueTokens.length;

    // Use Firebase Cloud Messaging API (HTTP v1)
    const messages = uniqueTokens.map((token) => ({
      android: {
        priority: "high"
      },
      data: {
        type: "gempa_dirasakan",
        magnitude: magnitude || "",
        location: location || "",
        depth: depth || "",
        timestamp: timestamp || "",
        headline: headline || "",
        title: "Peringatan Gempa Bumi !",
        body: headline || `Gempa M${magnitude} di ${location}`,
      },
      token,
    }));

    // Send messages in batches to avoid rate limiting
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      // Use sendEach for HTTP v1 API (recommended)
      const response = await admin.messaging().sendEach(batch);

      successCount += response.successCount;
      failureCount += response.failureCount;

      // Collect failed tokens for removal
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          const error = resp.error;
          // Remove token if it's invalid or unregistered
          if (
            error?.code === "messaging/invalid-argument" ||
            error?.code === "messaging/registration-token-not-registered" ||
            error?.code === "messaging/mismatched-credential"
          ) {
            failedTokens.push(batch[index].token);
          }
        }
      });
    }

    // Remove invalid tokens from database
    if (failedTokens.length > 0) {
      const updates = {};
      for (const token of failedTokens) {
        try {
          if (tokenPathByValue[token]) {
            updates[tokenPathByValue[token]] = null;
          }
        } catch {
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
      }
    }

    return { successCount, failureCount };
  } catch (error) {
    throw error;
  }
}

/**
 * Save user FCM token to database
 * @param {string} userId - User ID
 * @param {string} token - FCM Token
 * @returns {Promise<void>}
 */
export async function saveUserFcmToken(userId, token) {
  try {
    const db = admin.database();
    await db.ref(`user_fcm_tokens/${userId}`).set({
      token,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Parse gempa dirasakan API response and send notification if new
 * @param {string | null} lastKnownEventId - Previous event ID to detect new events
 * @returns {Promise<string | null>} - New event ID if found, null otherwise
 */
export async function checkAndNotifyNewGempaDirasakan(lastKnownEventId) {
  try {
    const apiUrl = envVars.EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL;
    if (!apiUrl) {
      throw new Error("EXPO_PUBLIC_GEMPA_DIRASAKAN_API_URL not configured");
    }

    const res = await fetch(`${apiUrl.trim()}${Date.now()}`);
    const raw = await res.text();

    let latest = null;
    let globalIdentifier = "";

    try {
      const parsedJson = JSON.parse(raw);
      const infoRaw = parsedJson?.info;
      latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
      globalIdentifier = String(parsedJson?.identifier ?? "");
    } catch {
      const parser = new XMLParser({ ignoreAttributes: false });
      const parsedXml = parser.parse(raw);
      const infoRaw = parsedXml?.alert?.info;
      latest = Array.isArray(infoRaw) ? infoRaw[0] : infoRaw;
      globalIdentifier = String(parsedXml?.alert?.identifier ?? "");
    }

    if (!latest) {
      return null;
    }

    const eventId = String(latest.eventid ?? latest.identifier ?? globalIdentifier);

    // Check if this is a new event
    if (eventId && eventId === lastKnownEventId) {
      return null;
    }

    // Extract headline from the API response
    const headline = String(latest.headline ?? latest.description ?? "");
    const magnitude = String(latest.magnitude ?? "");
    const area = String(latest.area ?? latest.location ?? "");
    const depth = String(latest.depth ?? "");
    const timestamp =
      String(latest.date ?? "") + " " + String(latest.time ?? "");

    if (!headline && !magnitude) {
      return null;
    }

    // Send notification
    await sendGempaDirasakanNotification(
      headline,
      magnitude,
      area,
      depth,
      timestamp,
    );

    return eventId;
  } catch (error) {
    throw error;
  }
}