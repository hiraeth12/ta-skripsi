import assert from "node:assert/strict";
import test from "node:test";
import { getRealisticShakeRadiiMeters } from "../utils/earthquake-impact.js";
import { computeStatus } from "../utils/earthquake.ts";

const magnitude = 5.2;
const depthKm = 10;
const radii = getRealisticShakeRadiiMeters(magnitude, depthKm);
const outerRadiusKm = radii.outerRadiusMeters / 1000;

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

test("user inside the outer radius is impacted", () => {
  assert.equal(statusAt(Math.max(0, outerRadiusKm - 0.1)).label, "Terdampak");
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
