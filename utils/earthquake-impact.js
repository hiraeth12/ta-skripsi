const EARTH_RADIUS_KM = 6371;
const GRAVITY_CM_PER_S2 = 980.665;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function parseCoordinate(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number.parseFloat(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDepthKm(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number.parseFloat(value.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const values = [lat1, lon1, lat2, lon2];
  if (!values.every((value) => Number.isFinite(value))) return Infinity;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function estimatePgaGal({ magnitude, distanceKm, depthKm }) {
  const hypocentralDistanceKm = Math.sqrt(
    distanceKm * distanceKm + depthKm * depthKm,
  );
  const r = Math.max(hypocentralDistanceKm, 1);

  const a = -1.2;
  const b = 0.55;
  const c = 1.15;
  const d = 0.003;

  const log10PgaG = a + b * magnitude - c * Math.log10(r) - d * r;
  return Math.pow(10, log10PgaG) * GRAVITY_CM_PER_S2;
}

function pgaGalToMmi(pgaGal) {
  if (pgaGal <= 0) return 0;
  return clamp(3.66 * Math.log10(pgaGal) - 1.66, 1, 10);
}

function findRadiusForMmiThreshold({
  magnitude,
  depthKm,
  targetMmi,
  maxDistanceKm = 700,
}) {
  let low = 0;
  let high = maxDistanceKm;

  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    const mmi = pgaGalToMmi(
      estimatePgaGal({
        magnitude,
        distanceKm: mid,
        depthKm,
      }),
    );

    if (mmi >= targetMmi) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low * 1000;
}

export function getRealisticShakeRadiiMeters(magnitude, depthKm) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return {
      outerRadiusMeters: 0,
      innerRadiusMeters: 0,
    };
  }

  const safeDepthKm = Math.max(depthKm || 10, 1);
  const outerRadiusMeters = findRadiusForMmiThreshold({
    magnitude,
    depthKm: safeDepthKm,
    targetMmi: 3,
    maxDistanceKm: 900,
  });
  const innerRadiusMeters = findRadiusForMmiThreshold({
    magnitude,
    depthKm: safeDepthKm,
    targetMmi: 5,
    maxDistanceKm: 500,
  });

  return {
    outerRadiusMeters: clamp(outerRadiusMeters, 20_000, 900_000),
    innerRadiusMeters: clamp(innerRadiusMeters, 5_000, outerRadiusMeters),
  };
}

export function isUserInsideShakeRadius({
  quakeLat,
  quakeLon,
  userLat,
  userLon,
  magnitude,
  depthKm,
}) {
  const values = [quakeLat, quakeLon, userLat, userLon, magnitude, depthKm];
  if (!values.every((value) => Number.isFinite(value))) {
    return {
      inside: false,
      distanceKm: Infinity,
      outerRadiusMeters: 0,
      innerRadiusMeters: 0,
    };
  }

  const { outerRadiusMeters, innerRadiusMeters } = getRealisticShakeRadiiMeters(
    magnitude,
    depthKm,
  );
  const distanceKm = haversineDistanceKm(userLat, userLon, quakeLat, quakeLon);

  return {
    inside: outerRadiusMeters > 0 && distanceKm * 1000 <= outerRadiusMeters,
    distanceKm,
    outerRadiusMeters,
    innerRadiusMeters,
  };
}
