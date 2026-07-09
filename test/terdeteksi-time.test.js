import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTerdeteksiWibTime } from "../utils/terdeteksi-time.ts";

test("formats UTC Z time as WIB", () => {
  const result = normalizeTerdeteksiWibTime({
    waktu: "2026-07-06 07:35:00Z",
  });

  assert.equal(result?.tanggal, "2026-07-06");
  assert.equal(result?.jam, "14:35:00 WIB");
});

test("rolls UTC date over when converted to WIB", () => {
  const result = normalizeTerdeteksiWibTime({
    waktu: "2026-07-06 20:35:00Z",
  });

  assert.equal(result?.tanggal, "2026-07-07");
  assert.equal(result?.jam, "03:35:00 WIB");
});

test("does not shift an input already marked as WIB", () => {
  const result = normalizeTerdeteksiWibTime({
    waktu: "2026-07-06 14:35:00 WIB",
  });

  assert.equal(result?.tanggal, "2026-07-06");
  assert.equal(result?.jam, "14:35:00 WIB");
});

test("formats numeric eventTimeMs as WIB", () => {
  const result = normalizeTerdeteksiWibTime({
    eventTimeMs: Date.UTC(2026, 6, 6, 7, 35, 0),
  });

  assert.equal(result?.tanggal, "2026-07-06");
  assert.equal(result?.jam, "14:35:00 WIB");
});

test("formats slash source time with milliseconds as WIB", () => {
  const result = normalizeTerdeteksiWibTime({
    waktu: "2026/07/09 02:41:26.746",
  });

  assert.equal(result?.tanggal, "2026-07-09");
  assert.equal(result?.jam, "09:41:26 WIB");
  assert.equal(result?.waktu, "2026-07-09 09:41:26 WIB");
});
