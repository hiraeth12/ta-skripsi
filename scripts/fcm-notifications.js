import { XMLParser } from "fast-xml-parser";
import { booleanPointInPolygon, point } from "@turf/turf";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import {
  haversineDistanceKm,
  isUserInsideShakeRadius,
  parseCoordinate,
  parseDepthKm,
} from "../utils/earthquake-impact.js";

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};

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
const envDevelopmentPath = path.resolve(process.cwd(), ".env.development");
const envVars = {
  ...readEnvFile(envDevelopmentPath),
  ...readEnvFile(envPath),
  ...process.env,
};
const TSUNAMI_NOTIFICATION_LOG_PREFIX = "[tsunami-notification]";
const KABKOTA_GEOJSON_PATH = path.resolve(
  process.cwd(),
  "assets/geojson/all_kabkota_ind_reduce.geojson",
);
let kabkotaGeoFeaturesCache = null;

function parsePointCoordinates(pointCoordinates) {
  const [lonRaw, latRaw] = String(pointCoordinates ?? "").split(",");
  const longitude = parseCoordinate(lonRaw);
  const latitude = parseCoordinate(latRaw);

  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value) {
  return String(value ?? "").trim();
}

function hasAnyText(record, keys) {
  return keys.some((key) => text(record?.[key]));
}

function sanitizeFirebaseKey(value) {
  const sanitized = text(value)
    .replace(/[.#$\[\]\/]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return sanitized || "unknown";
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
  const timestamp = Date.UTC(year, month, day, hour - 7, minute, second);

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function extractWarningId(subject, identifier, timesent, index) {
  const match = text(subject).match(/\bPD[-\s]*([0-9]+(?:\.[0-9]+)?)\b/i);
  if (match) return `PD-${match[1].replace(/\./g, "-")}`;

  return text(identifier) || `warning_${index}`;
}

function getAlertRoot(parsed) {
  if (parsed?.alert && typeof parsed.alert === "object") return parsed.alert;
  return parsed ?? {};
}

function normalizeWzAreaRecords(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeWzAreaRecords(item));
  }
  if (typeof value !== "object") return [];

  const record = value;
  const directKeys = [
    "province",
    "provinsi",
    "district",
    "kabupaten",
    "kota",
    "city",
    "regency",
    "level",
    "date",
    "time",
  ];

  if (hasAnyText(record, directKeys)) return [record];

  return Object.values(record).flatMap((item) => normalizeWzAreaRecords(item));
}

function parseWzAreas(value) {
  return normalizeWzAreaRecords(value)
    .map((area) => ({
      province: text(area.province ?? area.provinsi),
      district: text(
        area.district ??
          area.kabupaten ??
          area.kota ??
          area.city ??
          area.regency,
      ),
      level: text(area.level),
      date: text(area.date),
      time: text(area.time),
    }))
    .filter((area) => area.province || area.district || area.level);
}

function normalizeRegionName(value, options = {}) {
  let normalized = text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/.,()]+/g, " ")
    .replace(/\b(kabupaten|kab|kota|city|regency)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (options.stripDirectionalSuffix) {
    normalized = normalized
      .replace(/\s+bagian\s+(selatan|utara|timur|barat)$/i, "")
      .trim();
  }

  return normalized;
}

function addRegionKey(keys, value, options = {}) {
  const normalized = normalizeRegionName(value, options);
  if (!normalized) return;

  keys.add(normalized);

  const compact = normalized.replace(/\s+/g, "");
  if (compact) keys.add(compact);

  const withoutTrailingKepulauan = normalized.replace(/\s+kepulauan$/, "").trim();
  if (withoutTrailingKepulauan && withoutTrailingKepulauan !== normalized) {
    keys.add(withoutTrailingKepulauan);

    const compactWithoutTrailingKepulauan = withoutTrailingKepulauan.replace(/\s+/g, "");
    if (compactWithoutTrailingKepulauan) {
      keys.add(compactWithoutTrailingKepulauan);
    }
  }
}

function extendBboxFromCoordinates(coordinates, bbox) {
  if (!Array.isArray(coordinates)) return bbox;

  if (
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    const longitude = coordinates[0];
    const latitude = coordinates[1];

    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      bbox[0] = Math.min(bbox[0], longitude);
      bbox[1] = Math.min(bbox[1], latitude);
      bbox[2] = Math.max(bbox[2], longitude);
      bbox[3] = Math.max(bbox[3], latitude);
    }

    return bbox;
  }

  for (const item of coordinates) {
    extendBboxFromCoordinates(item, bbox);
  }

  return bbox;
}

function getGeometryBbox(geometry) {
  const bbox = extendBboxFromCoordinates(
    geometry?.coordinates,
    [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  );

  return bbox.every(Number.isFinite) ? bbox : null;
}

function isPointInBbox(latitude, longitude, bbox) {
  return (
    bbox &&
    longitude >= bbox[0] &&
    latitude >= bbox[1] &&
    longitude <= bbox[2] &&
    latitude <= bbox[3]
  );
}

function getGeoFeatureNames(feature) {
  const properties = feature?.properties ?? {};
  return [
    properties.alt_name,
    properties.name,
    properties.NAME_2,
    properties.NAMOBJ,
    properties.kabupaten,
    properties.kota,
    properties.city,
    properties.regency,
  ].filter((value) => text(value));
}

function buildGeoFeatureRecord(feature) {
  const bbox = getGeometryBbox(feature?.geometry);
  const displayDistricts = getGeoFeatureNames(feature);
  const districtKeys = new Set();

  for (const name of displayDistricts) {
    addRegionKey(districtKeys, name);
    addRegionKey(districtKeys, name, { stripDirectionalSuffix: true });
  }

  if (!bbox || districtKeys.size === 0) return null;

  return {
    feature,
    bbox,
    districtKeys,
    displayDistricts,
  };
}

function getKabkotaGeoFeatures() {
  if (kabkotaGeoFeaturesCache) return kabkotaGeoFeaturesCache;

  try {
    const raw = fs.readFileSync(KABKOTA_GEOJSON_PATH, "utf8");
    const geojson = JSON.parse(raw);
    kabkotaGeoFeaturesCache = (geojson.features ?? [])
      .map((feature) => buildGeoFeatureRecord(feature))
      .filter(Boolean);
  } catch (error) {
    console.warn(
      `${TSUNAMI_NOTIFICATION_LOG_PREFIX} failedToLoadKabkotaGeoJson=${error?.message || error}`,
    );
    kabkotaGeoFeaturesCache = [];
  }

  return kabkotaGeoFeaturesCache;
}

function findKabkotaByCoordinate(latitude, longitude) {
  if (latitude === null || longitude === null) return null;

  const userPoint = point([longitude, latitude]);

  for (const record of getKabkotaGeoFeatures()) {
    if (!isPointInBbox(latitude, longitude, record.bbox)) continue;

    try {
      if (booleanPointInPolygon(userPoint, record.feature)) return record;
    } catch {
      continue;
    }
  }

  return null;
}

function buildWzAreaIndex(wzAreas) {
  const districtToProvinceKeys = new Map();
  const districtKeyToDistrict = new Map();

  for (const area of wzAreas) {
    const provinceKeys = new Set();
    addRegionKey(provinceKeys, area.province);

    const districtKeys = new Set();
    addRegionKey(districtKeys, area.district);
    addRegionKey(districtKeys, area.district, { stripDirectionalSuffix: true });

    for (const districtKey of districtKeys) {
      const existing = districtToProvinceKeys.get(districtKey) ?? new Set();
      if (provinceKeys.size === 0) existing.add("");
      for (const provinceKey of provinceKeys) existing.add(provinceKey);
      districtToProvinceKeys.set(districtKey, existing);
      if (!districtKeyToDistrict.has(districtKey)) {
        districtKeyToDistrict.set(districtKey, area.district || districtKey);
      }
    }
  }

  return {
    districtToProvinceKeys,
    districtKeyToDistrict,
    hasWzAreas: districtToProvinceKeys.size > 0,
  };
}

function buildLocationRecords(locationsData) {
  return Object.entries(locationsData ?? {})
    .map(([id, raw]) => {
      if (!raw || typeof raw !== "object") return null;
      const latitude = parseCoordinate(raw.latitude);
      const longitude = parseCoordinate(raw.longitude);
      return {
        id,
        raw,
        latitude,
        longitude,
        names: [
          raw.name,
          raw.alt_name,
          raw.locationName,
          raw.district,
          raw.kabupaten,
          raw.kota,
          raw.city,
          raw.regency,
        ].filter((value) => text(value)),
      };
    })
    .filter(Boolean);
}

function findLocationByName(locationName, locationRecords) {
  const locationKey = normalizeRegionName(locationName);
  if (!locationKey) return null;

  return (
    locationRecords.find((location) =>
      location.names.some((name) => normalizeRegionName(name) === locationKey),
    ) ?? null
  );
}

function addDisplayDistrict(displayDistricts, value) {
  const display = text(value);
  if (display && !displayDistricts.includes(display)) {
    displayDistricts.push(display);
  }
}

function addLocationRegionKeys(location, provinceKeys, districtKeys, displayDistricts) {
  const raw = location?.raw ?? {};

  [
    raw.province,
    raw.provinsi,
    raw.state,
  ].forEach((value) => addRegionKey(provinceKeys, value));

  [
    raw.name,
    raw.alt_name,
    raw.locationName,
    raw.district,
    raw.kabupaten,
    raw.kota,
    raw.city,
    raw.regency,
  ].forEach((value) => {
    addRegionKey(districtKeys, value);
    addRegionKey(districtKeys, value, { stripDirectionalSuffix: true });
    addDisplayDistrict(displayDistricts, value);
  });
}

function resolveUserRegion(userData, locationRecords) {
  if (!userData || typeof userData !== "object") return null;

  const latitude = parseCoordinate(userData.latitude);
  const longitude = parseCoordinate(userData.longitude);
  const locationName = text(userData.locationName);
  const locationFromName = findLocationByName(locationName, locationRecords);
  const geoFeature = findKabkotaByCoordinate(latitude, longitude);
  const provinceKeys = new Set();
  const districtKeys = new Set();
  const displayDistricts = [];

  [
    userData.province,
    userData.provinsi,
    userData.state,
  ].forEach((value) => addRegionKey(provinceKeys, value));

  [
    userData.district,
    userData.kabupaten,
    userData.kota,
    userData.city,
    userData.regency,
  ].forEach((value) => {
    addRegionKey(districtKeys, value);
    addRegionKey(districtKeys, value, { stripDirectionalSuffix: true });
    addDisplayDistrict(displayDistricts, value);
  });

  if (geoFeature) {
    for (const districtKey of geoFeature.districtKeys) {
      districtKeys.add(districtKey);
    }
    for (const district of geoFeature.displayDistricts) {
      addDisplayDistrict(displayDistricts, district);
    }
  } else {
    addRegionKey(districtKeys, locationName);
    addRegionKey(districtKeys, locationName, { stripDirectionalSuffix: true });
    addDisplayDistrict(displayDistricts, locationName);
    addLocationRegionKeys(locationFromName, provinceKeys, districtKeys, displayDistricts);
  }

  if (districtKeys.size === 0) return null;

  return {
    provinceKeys,
    districtKeys,
    displayDistricts,
    source: geoFeature ? "geoJson" : locationFromName ? "locationName" : "user",
  };
}

function getWzAreaMatch(userRegion, wzAreaIndex) {
  if (!userRegion || !wzAreaIndex.hasWzAreas) {
    return { matches: false, matchedWzDistrict: "" };
  }

  for (const districtKey of userRegion.districtKeys) {
    const wzProvinceKeys = wzAreaIndex.districtToProvinceKeys.get(districtKey);
    if (!wzProvinceKeys) continue;
    const matchedWzDistrict =
      wzAreaIndex.districtKeyToDistrict.get(districtKey) || districtKey;

    if (userRegion.source === "geoJson") {
      return { matches: true, matchedWzDistrict };
    }

    const hasWzProvince = Array.from(wzProvinceKeys).some(Boolean);
    if (!hasWzProvince || userRegion.provinceKeys.size === 0) {
      return { matches: true, matchedWzDistrict };
    }

    for (const provinceKey of userRegion.provinceKeys) {
      if (wzProvinceKeys.has(provinceKey)) {
        return { matches: true, matchedWzDistrict };
      }
    }
  }

  return { matches: false, matchedWzDistrict: "" };
}

function logTsunamiDryRunDecision(userId, userRegion, match) {
  const source = userRegion?.source || "-";
  const district =
    userRegion?.displayDistricts?.join(" | ") ||
    Array.from(userRegion?.districtKeys ?? []).join(" | ") ||
    "-";
  const result = match?.matches
    ? `matched:${match.matchedWzDistrict || "-"}`
    : "areaMismatch";

  console.log(
    `${TSUNAMI_NOTIFICATION_LOG_PREFIX} user=${userId} source=${source} district=${district} match=${result}`,
  );
}

function logTsunamiNotificationResult(eventId, result, options = {}) {
  console.log(
    `${TSUNAMI_NOTIFICATION_LOG_PREFIX} dryRun=${Boolean(options.dryRun)} event=${eventId || "-"}`,
  );
  console.log(
    `${TSUNAMI_NOTIFICATION_LOG_PREFIX} totalUserToken=${result.totalTokenCount ?? 0}`,
  );
  console.log(
    `${TSUNAMI_NOTIFICATION_LOG_PREFIX} eligibleByWzArea=${result.eligibleCount ?? 0}`,
  );
  console.log(
    `${TSUNAMI_NOTIFICATION_LOG_PREFIX} skippedNoToken=${result.skippedCounts?.noToken ?? 0}`,
  );
  console.log(
    `${TSUNAMI_NOTIFICATION_LOG_PREFIX} skippedNoLocation=${result.skippedCounts?.noLocation ?? 0}`,
  );
  console.log(
    `${TSUNAMI_NOTIFICATION_LOG_PREFIX} skippedAreaMismatch=${result.skippedCounts?.areaMismatch ?? 0}`,
  );
  console.log(`${TSUNAMI_NOTIFICATION_LOG_PREFIX} success=${result.successCount ?? 0}`);
  console.log(`${TSUNAMI_NOTIFICATION_LOG_PREFIX} failure=${result.failureCount ?? 0}`);
}

export async function fetchTsunamiWarnings(apiUrl) {
  const res = await fetch(`${apiUrl.trim()}${apiUrl.includes("?") ? "&" : "?"}t=${Date.now()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch tsunami API: ${res.status}`);
  }

  const raw = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(raw);
  const alert = getAlertRoot(parsed);
  const infoItems = normalizeArray(alert.info);

  const warnings = infoItems
    .map((info, index) => {
      const warningId = extractWarningId(
        info?.subject,
        info?.identifier ?? alert?.identifier,
        info?.timesent,
        index,
      );
      const eventId = text(
        info?.eventid ||
          info?.identifier ||
          alert?.identifier ||
          `${info?.date ?? ""}-${info?.time ?? ""}-${warningId}`,
      );
      const subject = text(info?.subject);
      const headline = text(info?.headline);
      const description = text(info?.description);
      const date = text(info?.date);
      const time = text(info?.time);
      const pointCoordinates = text(info?.point?.coordinates);
      const location = text(info?.area);
      const magnitude = text(info?.magnitude);
      const timestamp =
        text(info?.timesent) || `${date} ${time}`.trim();
      const wzAreas = parseWzAreas(info?.wzarea);

      return {
        eventId: eventId || warningId,
        warningId,
        subject,
        headline,
        description,
        date,
        time,
        pointCoordinates,
        location,
        magnitude,
        timestamp,
        wzAreas,
        timesentMs: parseTimesent(info?.timesent),
        rawIndex: index,
      };
    })
    .filter((item) => item.eventId || item.warningId);

  return warnings.sort((a, b) => {
    if (b.timesentMs !== a.timesentMs) return b.timesentMs - a.timesentMs;
    return b.rawIndex - a.rawIndex;
  });
}

export async function fetchLatestTsunamiWarning(apiUrl) {
  const warnings = await fetchTsunamiWarnings(apiUrl);
  if (warnings.length === 0) return null;

  const latest = warnings[0];
  if (latest.wzAreas?.length > 0) return latest;

  const fallback = warnings.find(
    (w) =>
      w.pointCoordinates === latest.pointCoordinates &&
      w.magnitude === latest.magnitude &&
      w.wzAreas?.length > 0,
  );

  return fallback ?? latest;
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

function tsunamiDeliveryPathFor(eventId, userId) {
  return `notification_deliveries/tsunami/${sanitizeFirebaseKey(eventId)}/${userId}`;
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

function normalizeTsunamiNotificationInput(input) {
  const eventId = text(input?.eventId ?? input?.event_id);
  const warningId = text(input?.warningId ?? input?.warning_id);
  const subject = text(input?.subject);
  const headline = text(input?.headline);
  const description = text(input?.description);
  const location = text(input?.location ?? input?.area);
  const magnitude = text(input?.magnitude);
  const timestamp = text(input?.timestamp);
  const wzAreas = parseWzAreas(input?.wzAreas ?? input?.wzareas ?? input?.wzarea);
  const title = text(input?.title) || subject || "Peringatan Tsunami";
  const body =
    text(input?.body ?? input?.message) ||
    description ||
    headline ||
    location ||
    "Peringatan tsunami terbaru";
  const level = text(input?.level) || subject || headline || "Peringatan Tsunami";

  return {
    eventId: eventId || warningId || `tsunami_${Date.now()}`,
    warningId,
    subject,
    headline,
    description,
    location,
    magnitude,
    timestamp,
    wzAreas,
    title,
    body,
    level,
  };
}

/**
 * Send push notification for tsunami warning using Firebase Cloud Messaging.
 * @param {object} input - Tsunami notification payload
 * @param {{skipDedupe?: boolean, dryRun?: boolean, debugRecipients?: boolean}} options
 */
export async function sendTsunamiNotification(input, options = {}) {
  try {
    const payload = normalizeTsunamiNotificationInput(input);
    const dryRun = Boolean(options.dryRun);
    const debugRecipients = dryRun || Boolean(options.debugRecipients);
    const skippedCounts = {
      noToken: 0,
      noLocation: 0,
      areaMismatch: 0,
      duplicate: 0,
      duplicateToken: 0,
      noWzArea: 0,
    };

    if (!payload.eventId) {
      const result = {
        successCount: 0,
        failureCount: 0,
        skippedCounts,
        eligibleCount: 0,
        totalTokenCount: 0,
        dryRun,
      };
      logTsunamiNotificationResult(payload.eventId, result, { dryRun });
      return result;
    }

    const db = admin.database();
    const deliveryPath = `notification_deliveries/tsunami/${sanitizeFirebaseKey(payload.eventId)}`;
    const [tokensSnapshot, usersSnapshot, locationsSnapshot, deliveriesSnapshot] = await Promise.all([
      db.ref("user_fcm_tokens").get(),
      db.ref("users").get(),
      db.ref("locations").get(),
      options.skipDedupe ? Promise.resolve(null) : db.ref(deliveryPath).get(),
    ]);

    const tokenData = tokensSnapshot.exists() ? tokensSnapshot.val() : {};
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
    const locationsData = locationsSnapshot.exists() ? locationsSnapshot.val() : {};
    const deliveryData = deliveriesSnapshot?.exists?.()
      ? deliveriesSnapshot.val()
      : {};
    const totalTokenCount = Object.keys(tokenData ?? {}).length;
    const tokenUserIds = new Set(Object.keys(tokenData ?? {}));
    const userIds = Object.keys(usersData ?? {});
    skippedCounts.noToken = userIds.filter((userId) => !tokenUserIds.has(userId)).length;

    const wzAreaIndex = buildWzAreaIndex(payload.wzAreas);
    if (!wzAreaIndex.hasWzAreas) {
      skippedCounts.noWzArea = 1;
    }

    const locationRecords = buildLocationRecords(locationsData);
    const tokenPathByValue = {};
    const usedTokens = new Set();
    const messages = [];

    for (const [userId, entry] of Object.entries(tokenData ?? {})) {
      const token = getTokenValue(entry);
      if (!token) {
        skippedCounts.noToken += 1;
        continue;
      }

      tokenPathByValue[token] = `user_fcm_tokens/${userId}`;

      if (!options.skipDedupe && deliveryData?.[userId]) {
        skippedCounts.duplicate += 1;
        continue;
      }

      const userRegion = resolveUserRegion(usersData?.[userId], locationRecords);
      if (!userRegion) {
        skippedCounts.noLocation += 1;
        if (debugRecipients) {
          console.log(
            `${TSUNAMI_NOTIFICATION_LOG_PREFIX} user=${userId} source=- district=- match=noLocation`,
          );
        }
        continue;
      }

      const wzAreaMatch = getWzAreaMatch(userRegion, wzAreaIndex);
      if (debugRecipients) {
        logTsunamiDryRunDecision(userId, userRegion, wzAreaMatch);
      }

      if (!wzAreaMatch.matches) {
        skippedCounts.areaMismatch += 1;
        continue;
      }

      if (usedTokens.has(token)) {
        skippedCounts.duplicateToken += 1;
        continue;
      }
      usedTokens.add(token);

      messages.push({
        android: {
          priority: "high",
        },
        data: {
          type: "tsunami_alert",
          event_id: payload.eventId,
          warning_id: payload.warningId,
          title: payload.title,
          body: payload.body,
          message: payload.body,
          level: payload.level,
          subject: payload.subject,
          headline: payload.headline,
          description: payload.description,
          magnitude: payload.magnitude,
          location: payload.location,
          timestamp: payload.timestamp,
          send_timestamp: String(Date.now()),
        },
        token,
        __meta: {
          userId,
          tokenPrefix: token.slice(0, 20),
        },
      });
    }

    if (messages.length === 0) {
      const result = {
        successCount: 0,
        failureCount: 0,
        skippedCounts,
        eligibleCount: 0,
        totalTokenCount,
        dryRun,
      };
      logTsunamiNotificationResult(payload.eventId, result, { dryRun });
      return result;
    }

    if (dryRun) {
      const result = {
        successCount: 0,
        failureCount: 0,
        skippedCounts,
        eligibleCount: messages.length,
        totalTokenCount,
        dryRun,
      };
      logTsunamiNotificationResult(payload.eventId, result, { dryRun });
      return result;
    }

    const batchSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];
    const deliveryUpdates = {};

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const sendBatch = batch.map(({ __meta, ...message }) => message);
      const response = await admin.messaging().sendEach(sendBatch);

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp, index) => {
        const message = batch[index];
        if (!resp.success) {
          const error = resp.error;
          if (
            error?.code === "messaging/invalid-argument" ||
            error?.code === "messaging/registration-token-not-registered" ||
            error?.code === "messaging/mismatched-credential"
          ) {
            failedTokens.push(message.token);
          }
          return;
        }

        if (!options.skipDedupe) {
          deliveryUpdates[tsunamiDeliveryPathFor(payload.eventId, message.__meta.userId)] = {
            sentAt: admin.database.ServerValue.TIMESTAMP,
            warningId: payload.warningId,
            tokenPrefix: message.__meta.tokenPrefix,
          };
        }
      });
    }

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

    const result = {
      successCount,
      failureCount,
      skippedCounts,
      eligibleCount: messages.length,
      totalTokenCount,
      dryRun,
    };
    logTsunamiNotificationResult(payload.eventId, result, { dryRun });
    return result;
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

/**
 * Parse tsunami API response and send notification if the latest warning is new.
 * @param {string | null} lastKnownWarningId
 * @returns {Promise<{warningId: string, result: object} | null>}
 */
export async function checkAndNotifyNewTsunami(lastKnownWarningId) {
  try {
    const apiUrl =
      envVars.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ||
      envVars.PERINGATAN_TSUNAMI_API_URL;
    if (!apiUrl) {
      throw new Error("EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL not configured");
    }

    const latest = await fetchLatestTsunamiWarning(apiUrl);
    if (!latest?.eventId) return null;

    const notificationId = latest.warningId || latest.eventId;
    if (notificationId && notificationId === lastKnownWarningId) {
      return null;
    }

    const result = await sendTsunamiNotification({
      eventId: latest.eventId,
      warningId: latest.warningId,
      subject: latest.subject,
      headline: latest.headline,
      description: latest.description,
      location: latest.location,
      magnitude: latest.magnitude,
      timestamp: latest.timestamp,
      wzAreas: latest.wzAreas,
    });

    return { warningId: notificationId, result };
  } catch (error) {
    throw error;
  }
}
