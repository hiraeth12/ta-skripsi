import { XMLParser } from "fast-xml-parser";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import {
  haversineDistanceKm,
  isUserInsideShakeRadius,
  parseCoordinate,
  parseDepthKm,
} from "../utils/earthquake-impact.js";

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

function parsePointCoordinates(pointCoordinates) {
  const [lonRaw, latRaw] = String(pointCoordinates ?? "").split(",");
  const longitude = parseCoordinate(lonRaw);
  const latitude = parseCoordinate(latRaw);

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

function normalizeNotificationInput(inputOrHeadline, ...legacyArgs) {
  if (
    inputOrHeadline &&
    typeof inputOrHeadline === "object" &&
    !Array.isArray(inputOrHeadline)
  ) {
    return inputOrHeadline;
  }

  const [magnitude, location, depth, timestamp] = legacyArgs;
  return {
    headline: inputOrHeadline,
    magnitude,
    location,
    depth,
    timestamp,
  };
}

function getTokenValue(entry) {
  if (typeof entry === "string") return entry;
  if (typeof entry?.token === "string") return entry.token;
  return null;
}

function deliveryPathFor(eventId, userId) {
  return `notification_deliveries/gempa_dirasakan/${eventId}/${userId}`;
}

/**
 * Send push notification for new gempa dirasakan using Firebase Cloud Messaging API (HTTP v1)
 * @param {object|string} inputOrHeadline - Notification payload or legacy headline
 * @returns {Promise<{successCount: number, failureCount: number}>}
 */
export async function sendGempaDirasakanNotification(
  inputOrHeadline,
  ...legacyArgs
) {
  try {
    const input = normalizeNotificationInput(inputOrHeadline, ...legacyArgs);
    const eventId = String(input.eventId ?? input.eventid ?? "").trim();
    const headline = String(input.headline ?? input.description ?? "");
    const magnitudeText = String(input.magnitude ?? "");
    const location = String(input.location ?? input.area ?? "");
    const depth = String(input.depth ?? input.depthKm ?? "");
    const timestamp = String(input.timestamp ?? "");
    const magnitude = Number.parseFloat(magnitudeText.replace(",", ".")) || 0;
    const depthKm = parseDepthKm(input.depthKm ?? input.depth) ?? 0;
    const quakeLat = parseCoordinate(input.latitude ?? input.quakeLat);
    const quakeLon = parseCoordinate(input.longitude ?? input.quakeLon);
    const skippedCounts = {
      noToken: 0,
      noLocation: 0,
      outsideRadius: 0,
      duplicate: 0,
      duplicateToken: 0,
      invalidQuake: 0,
    };

    if (
      !eventId ||
      !Number.isFinite(magnitude) ||
      magnitude <= 0 ||
      quakeLat === null ||
      quakeLon === null
    ) {
      skippedCounts.invalidQuake = 1;
      return {
        successCount: 0,
        failureCount: 0,
        skippedCounts,
        eligibleCount: 0,
      };
    }

    const db = admin.database();

    const [tokensSnapshot, usersSnapshot, deliveriesSnapshot] =
      await Promise.all([
        db.ref("user_fcm_tokens").get(),
        db.ref("users").get(),
        db.ref(`notification_deliveries/gempa_dirasakan/${eventId}`).get(),
      ]);

    const tokenData = tokensSnapshot.exists() ? tokensSnapshot.val() : {};
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
    const deliveryData = deliveriesSnapshot.exists()
      ? deliveriesSnapshot.val()
      : {};
    const tokenUserIds = new Set(Object.keys(tokenData ?? {}));
    const userIds = Object.keys(usersData ?? {});
    skippedCounts.noToken = userIds.filter((userId) => !tokenUserIds.has(userId)).length;

    const tokenPathByValue = {};
    const usedTokens = new Set();
    const messages = [];

    for (const [userId, entry] of Object.entries(tokenData ?? {})) {
      const token = getTokenValue(entry);
      if (!token) continue;

      tokenPathByValue[token] = `user_fcm_tokens/${userId}`;

      if (deliveryData?.[userId]) {
        skippedCounts.duplicate += 1;
        continue;
      }

      const userData = usersData?.[userId];
      const userLat = parseCoordinate(userData?.latitude);
      const userLon = parseCoordinate(userData?.longitude);
      if (userLat === null || userLon === null) {
        skippedCounts.noLocation += 1;
        continue;
      }

      const impact = isUserInsideShakeRadius({
        quakeLat,
        quakeLon,
        userLat,
        userLon,
        magnitude,
        depthKm,
      });

      if (!impact.inside) {
        skippedCounts.outsideRadius += 1;
        continue;
      }

      if (usedTokens.has(token)) {
        skippedCounts.duplicateToken += 1;
        continue;
      }
      usedTokens.add(token);

      const distanceKm = haversineDistanceKm(userLat, userLon, quakeLat, quakeLon);
      messages.push({
        android: {
          priority: "high",
        },
        data: {
          type: "gempa_dirasakan",
          event_id: eventId,
          magnitude: magnitudeText || String(magnitude),
          location: location || "",
          depth: depth || "",
          timestamp: timestamp || "",
          headline: headline || "",
          title: "Peringatan Gempa Bumi !",
          body: headline || `Gempa M${magnitudeText || magnitude} di ${location}`,
          quake_latitude: String(quakeLat),
          quake_longitude: String(quakeLon),
          distance_km: distanceKm.toFixed(2),
          outer_radius_meters: String(Math.round(impact.outerRadiusMeters)),
          send_timestamp: String(Date.now()),
        },
        token,
        __meta: {
          userId,
          distanceKm,
          outerRadiusMeters: impact.outerRadiusMeters,
          tokenPrefix: token.slice(0, 20),
        },
      });
    }

    if (messages.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        skippedCounts,
        eligibleCount: 0,
      };
    }

    // Send messages in batches to avoid rate limiting
    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];
    const deliveryUpdates = {};

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const sendBatch = batch.map(({ __meta, ...message }) => message);

      // Use sendEach for HTTP v1 API (recommended)
      const response = await admin.messaging().sendEach(sendBatch);

      successCount += response.successCount;
      failureCount += response.failureCount;

      // Collect failed tokens for removal
      response.responses.forEach((resp, index) => {
        const message = batch[index];
        if (!resp.success) {
          const error = resp.error;
          // Remove token if it's invalid or unregistered
          if (
            error?.code === "messaging/invalid-argument" ||
            error?.code === "messaging/registration-token-not-registered" ||
            error?.code === "messaging/mismatched-credential"
          ) {
            failedTokens.push(message.token);
          }
          return;
        }

        deliveryUpdates[deliveryPathFor(eventId, message.__meta.userId)] = {
          sentAt: admin.database.ServerValue.TIMESTAMP,
          distanceKm: Number(message.__meta.distanceKm.toFixed(3)),
          outerRadiusMeters: Math.round(message.__meta.outerRadiusMeters),
          tokenPrefix: message.__meta.tokenPrefix,
        };
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
        } catch {}
      }

      if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
      }
    }

    if (Object.keys(deliveryUpdates).length > 0) {
      await db.ref().update(deliveryUpdates);
    }

    return {
      successCount,
      failureCount,
      skippedCounts,
      eligibleCount: messages.length,
    };
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

    const eventId = String(
      latest.eventid ?? latest.identifier ?? globalIdentifier,
    );

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
    const coordinates =
      parsePointCoordinates(latest?.point?.coordinates) ??
      (() => {
        const latitude = parseCoordinate(latest?.latitude);
        const longitude = parseCoordinate(latest?.longitude);
        return latitude === null || longitude === null
          ? null
          : { latitude, longitude };
      })();

    if (!eventId || (!headline && !magnitude) || !coordinates) {
      return null;
    }

    // Send notification
    await sendGempaDirasakanNotification({
      eventId,
      headline,
      magnitude,
      location: area,
      depth,
      timestamp,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });

    return eventId;
  } catch (error) {
    throw error;
  }
}
