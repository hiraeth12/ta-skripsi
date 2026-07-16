import assert from "node:assert/strict";
import test from "node:test";
import {
  getRealisticShakeRadiiMeters,
  getRealisticShakeRadiiMetersFromFelt,
  isUserInsideShakeRadius,
  parseDepthKm,
} from "../utils/earthquake-impact.js";

test("parses depth strings with km suffix", () => {
  assert.equal(parseDepthKm("10 km"), 10);
  assert.equal(parseDepthKm("Kedalaman: 12.5 Km"), 12.5);
});

test("felt strings map to the highest Roman numeral", () => {
  const low = getRealisticShakeRadiiMetersFromFelt(5.2, 10, "II Berau");
  const high = getRealisticShakeRadiiMetersFromFelt(
    5.2,
    10,
    "III-IV Kolaka Timur",
  );

  assert.ok(high.outerRadiusMeters < low.outerRadiusMeters);
  assert.equal(
    getRealisticShakeRadiiMetersFromFelt(5.2, 10, "V-VI").innerRadiusMeters,
    7500,
  );
});

test("invalid felt strings fall back to MMI 3", () => {
  const fallback = getRealisticShakeRadiiMetersFromFelt(5.2, 10, "Tidak ada felt");
  const defaultRadii = getRealisticShakeRadiiMeters(5.2, 10);

  assert.deepEqual(fallback, defaultRadii);
});

test("user at epicenter is inside shake radius", () => {
  const result = isUserInsideShakeRadius({
    quakeLat: -6.9,
    quakeLon: 107.6,
    userLat: -6.9,
    userLon: 107.6,
    magnitude: 5.2,
    depthKm: 10,
  });

  assert.equal(result.inside, true);
  assert.equal(result.distanceKm, 0);
  assert.ok(result.outerRadiusMeters > 0);
});

test("far away user is outside shake radius", () => {
  const result = isUserInsideShakeRadius({
    quakeLat: -6.9,
    quakeLon: 107.6,
    userLat: 1.3,
    userLon: 124.8,
    magnitude: 5.2,
    depthKm: 10,
  });

  assert.equal(result.inside, false);
});

test("invalid magnitude produces no radius and no match", () => {
  const radii = getRealisticShakeRadiiMeters(0, 10);
  const result = isUserInsideShakeRadius({
    quakeLat: -6.9,
    quakeLon: 107.6,
    userLat: -6.9,
    userLon: 107.6,
    magnitude: 0,
    depthKm: 10,
  });

  assert.deepEqual(radii, { outerRadiusMeters: 0, innerRadiusMeters: 0 });
  assert.equal(result.inside, false);
});
