import assert from "node:assert/strict";
import test from "node:test";
import { computeStatus } from "../utils/earthquake.ts";
import { getRealisticShakeRadiiMeters } from "../utils/earthquake-impact.js";

const magnitude = 5.2;
const depthKm = 10;
const radii = getRealisticShakeRadiiMeters(magnitude, depthKm);
const outerRadiusKm = radii.outerRadiusMeters / 1000;
const innerRadiusKm = radii.innerRadiusMeters / 1000;

function statusAt(distanceKm) {
  return computeStatus({
    magnitude,
    kedalaman: `${depthKm} km`,
    distanceKm,
  });
}

test("user outside the map outer ring is safe", () => {
  assert.equal(statusAt(outerRadiusKm + 0.1).label, "Aman");
});

test("user between the inner and outer rings is impacted", () => {
  const distanceKm = (innerRadiusKm + outerRadiusKm) / 2;
  assert.equal(statusAt(distanceKm).label, "Terdampak");
});

test("user inside the inner ring is in danger", () => {
  assert.equal(statusAt(innerRadiusKm / 2).label, "Bahaya");
});

test("invalid inputs do not produce an impacted status", () => {
  assert.equal(
    computeStatus({
      magnitude: "invalid",
      kedalaman: "10 km",
      distanceKm: 100,
    }).label,
    "-",
  );
  assert.equal(
    computeStatus({
      magnitude,
      kedalaman: "invalid",
      distanceKm: 100,
    }).label,
    "-",
  );
  assert.equal(
    computeStatus({
      magnitude,
      kedalaman: "10 km",
      distanceKm: "invalid",
    }).label,
    "-",
  );
});
