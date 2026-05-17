export type ShakeRadiiMeters = {
  outerRadiusMeters: number;
  innerRadiusMeters: number;
};

export type ShakeRadiusCheck = ShakeRadiiMeters & {
  inside: boolean;
  distanceKm: number;
};

export function parseCoordinate(value: unknown): number | null;
export function parseDepthKm(value: unknown): number | null;
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number;
export function getRealisticShakeRadiiMeters(
  magnitude: number,
  depthKm: number,
): ShakeRadiiMeters;
export function isUserInsideShakeRadius(input: {
  quakeLat: number;
  quakeLon: number;
  userLat: number;
  userLon: number;
  magnitude: number;
  depthKm: number;
}): ShakeRadiusCheck;
