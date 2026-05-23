// utils/geo.ts

const BBOX_DEG = 0.5; // ~55km bounding box

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  [key: string]: unknown; // field tambahan bebas
}

export function findNearestLocation<T extends GeoLocation>(
  gpsLat: number,
  gpsLon: number,
  locations: T[],
): T | null {
  if (!locations.length) return null;

  // Tahap 1: bounding-box pre-filter
  const candidates = locations.filter(
    (loc) =>
      Math.abs(loc.latitude - gpsLat) < BBOX_DEG &&
      Math.abs(loc.longitude - gpsLon) < BBOX_DEG,
  );

  // Fallback jika GPS di luar area data
  const pool = candidates.length > 0 ? candidates : locations;

  // Tahap 2: Haversine hanya pada pool
  return pool.reduce(
    (nearest, loc) => {
      const d = haversineDistanceKm(gpsLat, gpsLon, loc.latitude, loc.longitude);
      return d < nearest.dist ? { loc, dist: d } : nearest;
    },
    {
      loc: pool[0],
      dist: haversineDistanceKm(gpsLat, gpsLon, pool[0].latitude, pool[0].longitude),
    },
  ).loc;
}