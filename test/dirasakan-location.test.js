import assert from "node:assert/strict";
import test from "node:test";
import { getDirasakanDisplayLocation } from "../features/main-menu/history/utils/dirasakan-location.ts";

test("extracts a multi-word region after a two-word direction", () => {
  assert.equal(
    getDirasakanDisplayLocation(
      "Pusat gempa berada di laut 25 km Barat Laut Tojo Una-Una",
    ),
    "Tojo Una-Una",
  );
});

test("supports land locations, one-word directions, and decimal distances", () => {
  assert.equal(
    getDirasakanDisplayLocation(
      "Pusat gempa berada di darat 12,5 km Selatan Bolaang Mongondow",
    ),
    "Bolaang Mongondow",
  );
});

test("matches case-insensitively with variable whitespace", () => {
  assert.equal(
    getDirasakanDisplayLocation(
      "  pusat   GEMPA berada di LAUT 7.25KM timur   laut   Kepulauan Mentawai  ",
    ),
    "Kepulauan Mentawai",
  );
});

test("keeps the original location when the complete pattern does not match", () => {
  const location = "25 km Barat Laut Tojo Una-Una";
  assert.equal(getDirasakanDisplayLocation(location), location);
});

test("keeps the original location when the region is empty", () => {
  const location = "Pusat gempa berada di laut 25 km Barat Laut";
  assert.equal(getDirasakanDisplayLocation(location), location);
});
