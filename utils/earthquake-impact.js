  const EARTH_RADIUS_KM = 6371;
  const ROMAN_TO_MMI = new Map([
    ["I", 1],
    ["II", 2],
    ["III", 3],
    ["IV", 4],
    ["V", 5],
    ["VI", 6],
    ["VII", 7],
    ["VIII", 8],
    ["IX", 9],
    ["X", 10],
  ]);

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function extractHighestRomanNumeral(value) {
  if (typeof value !== "string") return null;

  const matches = value
    .toUpperCase()
    .match(/\b(X|IX|VIII|VII|VI|V|IV|III|II|I)\b/g);
  if (!matches) return null;

  let highest = null;
  for (const match of matches) {
    const romanValue = ROMAN_TO_MMI.get(match) ?? null;
    if (romanValue === null) continue;
    highest = highest === null ? romanValue : Math.max(highest, romanValue);
  }

  return highest;
}

function parseOfficialFeltMmi(felt) {
  const parsed = extractHighestRomanNumeral(felt);
  return parsed === null ? 3 : parsed;
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
  // Convert the horizontal distance and depth to hypocentral distance.
  const hypocentralDistanceKm = Math.sqrt(
    distanceKm * distanceKm + depthKm * depthKm,
  );

  // Fukushima–Tanaka (1990) attenuation in logarithmic form.
  const log10PgaGal =
    1.3 +
    0.41 * magnitude -
    Math.log10(
      hypocentralDistanceKm + 0.032 * Math.pow(10, 0.41 * magnitude),
    ) -
    0.0034 * hypocentralDistanceKm;

  // Convert from log10(PGA) back to PGA in Gal.
  return Math.pow(10, log10PgaGal);
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

function getShakeRadiiWithTargetMmi({ magnitude, depthKm, targetMmi }) {
  const outerRadiusMeters = findRadiusForMmiThreshold({
    magnitude,
    depthKm,
    targetMmi,
    maxDistanceKm: 900,
  });

  // The inner ring is only used for animation, so keep it small and stable.
  const innerRadiusMeters = clamp(7_500, 5_000, outerRadiusMeters);

  return {
    outerRadiusMeters: clamp(outerRadiusMeters, 0, 900_000),
    innerRadiusMeters,
  };
}

export function getRealisticShakeRadiiMeters(magnitude, depthKm) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return {
      outerRadiusMeters: 0,
      innerRadiusMeters: 0,
    };
  }

  const safeDepthKm = Math.max(depthKm || 10, 1);

  return getShakeRadiiWithTargetMmi({
    magnitude,
    depthKm: safeDepthKm,
    targetMmi: 3,
  });
}

export function getRealisticShakeRadiiMetersFromFelt(
  magnitude,
  depthKm,
  felt,
) {
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return {
      outerRadiusMeters: 0,
      innerRadiusMeters: 0,
    };
  }

  const safeDepthKm = Math.max(depthKm || 10, 1);
  const targetMmi = parseOfficialFeltMmi(felt);

  return getShakeRadiiWithTargetMmi({
    magnitude,
    depthKm: safeDepthKm,
    targetMmi,
  });
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
