import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 探索妳的星盤 v2: the natal chart is computed in the browser. Every planet, the mean node, the
// Ascendant, the Midheaven and all 12 Placidus cusps are checked against Swiss Ephemeris for 16
// charts (ChatGPT review B2): Taiwan, southern hemisphere, 64°N, the date line, a leap day, a sign
// change of the Moon, and Mercury on both sides of its August 2023 station.
const chart = await import("../lib/natal-chart.ts");
const reference = JSON.parse(await readFile(new URL("./fixtures/natal-reference.json", import.meta.url), "utf8"));

const gap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const ARCMIN = 1 / 60;

test("planets and the mean node match Swiss Ephemeris within 1′ for every reference chart", () => {
  assert.equal(reference.cases.length, 16);
  for (const item of reference.cases) {
    const result = chart.computeNatalChart({ date: item.date, time: item.time, latitude: item.latitude, longitude: item.longitude, timeZone: "UTC" });
    for (const placement of result.placements) {
      const expected = item.planets[placement.id];
      assert.ok(gap(placement.longitude, expected.lon) < ARCMIN, `${item.name} ${placement.id}: ${placement.longitude} vs ${expected.lon}`);
      assert.equal(placement.sign, chart.signOf(expected.lon), `${item.name} ${placement.id} sign`);
      if (placement.id !== "sun" && placement.id !== "moon" && placement.id !== "node") {
        assert.equal(placement.retrograde, expected.speed < 0, `${item.name} ${placement.id} retrograde (speed ${expected.speed})`);
      }
    }
  }
});

test("Ascendant, Midheaven and the 12 Placidus cusps match within 1′; planets fall in the same houses", () => {
  for (const item of reference.cases) {
    const result = chart.computeNatalChart({ date: item.date, time: item.time, latitude: item.latitude, longitude: item.longitude, timeZone: "UTC" });
    assert.equal(result.houseSystem, "placidus", item.name);
    assert.ok(gap(result.ascendant, item.ascendant) < ARCMIN, `${item.name} ASC ${result.ascendant} vs ${item.ascendant}`);
    assert.ok(gap(result.midheaven, item.midheaven) < ARCMIN, `${item.name} MC`);
    item.cusps.forEach((cusp, index) => assert.ok(gap(result.cusps[index], cusp) < ARCMIN, `${item.name} cusp ${index + 1}: ${result.cusps[index]} vs ${cusp}`));
    for (const placement of result.placements) {
      assert.equal(placement.house, chart.houseOf(item.planets[placement.id].lon, item.cusps), `${item.name} ${placement.id} house`);
    }
  }
});

test("Mercury's station: direct before, retrograde after", () => {
  const at = (date, time) => chart.computeNatalChart({ date, time, latitude: 25.033, longitude: 121.5654, timeZone: "UTC" }).placements.find((item) => item.id === "mercury");
  assert.equal(at("2023-08-23", "12:00").retrograde, false);
  assert.equal(at("2023-08-24", "06:00").retrograde, true);
});

test("near the poles, when Placidus has no solution, the chart says so and uses equal houses", () => {
  const day = (latitude) => Array.from({ length: 48 }, (_, half) => chart.computeNatalChart({
    date: "1990-06-21", time: `${String(Math.floor(half / 2)).padStart(2, "0")}:${half % 2 ? "30" : "00"}`, latitude, longitude: 18.9553, timeZone: "UTC",
  }));
  // Just inside the Arctic Circle Placidus works for most of the day and fails only when a cusp falls
  // near the solstice points; it is decided by whether the semi-arcs exist, not by a latitude threshold.
  const edge = day(67);
  const equal = edge.filter((item) => item.houseSystem === "equal");
  assert.ok(equal.length > 0 && equal.length < edge.length, `at 67°N some half-hours fall back (${equal.length} of ${edge.length})`);
  for (const item of equal) item.cusps.forEach((cusp, index) => assert.ok(gap(cusp, item.ascendant + index * 30) < 1e-9));
  assert.ok(day(69.6492).every((item) => item.houseSystem === "equal"), "Tromsø: Placidus never has a solution");
  assert.ok(day(64.1466).every((item) => item.houseSystem === "placidus"), "Reykjavik: always Placidus");
  assert.equal(chart.placidusCusps(0, 89, 23.44), null);
});

test("local birth time → UTC with the place's time zone, past daylight-saving years included", () => {
  const utc = (date, time, zone) => chart.localToUtc(date, time, zone).toISOString();
  assert.equal(utc("1975-07-01", "12:00", "Asia/Taipei"), "1975-07-01T03:00:00.000Z", "Taiwan daylight saving 1975");
  assert.equal(utc("1980-07-01", "12:00", "Asia/Taipei"), "1980-07-01T04:00:00.000Z");
  assert.equal(utc("2024-07-01", "12:00", "America/Los_Angeles"), "2024-07-01T19:00:00.000Z");
  assert.equal(utc("2024-01-15", "12:00", "Australia/Sydney"), "2024-01-15T01:00:00.000Z");
  assert.equal(utc("2000-01-01", "00:30", "Asia/Taipei"), "1999-12-31T16:30:00.000Z", "the date changes in UTC");
});

test("without a birth time: no Ascendant, Midheaven or houses; signs that change that day are uncertain", () => {
  const result = chart.computeNatalChart({ date: "2000-01-08", time: null, latitude: 25.033, longitude: 121.5654, timeZone: "Asia/Taipei" });
  assert.equal(result.timeKnown, false);
  assert.equal(result.ascendant, null);
  assert.equal(result.midheaven, null);
  assert.equal(result.cusps, null);
  assert.equal(result.houseSystem, null);
  assert.ok(result.placements.every((item) => item.house === null));
  assert.deepEqual(result.uncertain.moon, ["capricorn", "aquarius"], "the Moon entered Aquarius that day in Taipei");
  assert.equal(result.uncertain.sun, undefined);
  const counts = chart.elementCounts(result);
  assert.equal(counts.火 + counts.土 + counts.風 + counts.水, 9, "ten bodies minus the uncertain Moon; the node is not counted");
  const known = chart.computeNatalChart({ date: "2000-01-08", time: "12:00", latitude: 25.033, longitude: 121.5654, timeZone: "Asia/Taipei" });
  assert.deepEqual(known.uncertain, {});
  const all = chart.elementCounts(known);
  assert.equal(all.火 + all.土 + all.風 + all.水, 10);
});

test("review #34 B1: a birth time skipped or repeated by a daylight-saving change is never guessed", () => {
  const iso = (resolved) => resolved.kind === "exact" ? resolved.utc.toISOString() : resolved.kind === "repeated" ? resolved.options.map((option) => `${option.utc.toISOString()} ${option.offsetMinutes}`) : resolved.kind;
  assert.equal(iso(chart.resolveLocalTime("2024-03-10", "02:30", "America/Los_Angeles")), "gap", "spring forward: 02:30 never happened in LA");
  assert.deepEqual(iso(chart.resolveLocalTime("2024-11-03", "01:30", "America/Los_Angeles")), ["2024-11-03T08:30:00.000Z -420", "2024-11-03T09:30:00.000Z -480"], "fall back: 01:30 happened twice");
  assert.equal(iso(chart.resolveLocalTime("1974-04-01", "00:30", "Asia/Taipei")), "gap", "Taiwan 1974: clocks jumped from 00:00 to 01:00");
  assert.deepEqual(iso(chart.resolveLocalTime("1974-09-30", "23:30", "Asia/Taipei")), ["1974-09-30T14:30:00.000Z 540", "1974-09-30T15:30:00.000Z 480"], "Taiwan 1974: 23:00–23:59 twice");
  assert.equal(iso(chart.resolveLocalTime("2024-03-31", "02:30", "Europe/London")), "2024-03-31T01:30:00.000Z", "London switches at 01:00, so 02:30 BST exists");
  assert.equal(iso(chart.resolveLocalTime("2024-03-31", "01:30", "Europe/London")), "gap");
  assert.equal(iso(chart.resolveLocalTime("1990-04-09", "14:30", "Asia/Taipei")), "1990-04-09T06:30:00.000Z");
  const place = { latitude: 25.033, longitude: 121.5654, timeZone: "Asia/Taipei" };
  assert.throws(() => chart.computeNatalChart({ ...place, date: "1974-04-01", time: "00:30" }), /BIRTH_TIME_SKIPPED/);
  assert.throws(() => chart.computeNatalChart({ ...place, date: "1974-09-30", time: "23:30" }), /BIRTH_TIME_REPEATED/);
  const second = chart.computeNatalChart({ ...place, date: "1974-09-30", time: "23:30", utc: "1974-09-30T15:30:00.000Z" });
  assert.equal(second.utc, "1974-09-30T15:30:00.000Z", "her choice is used as given");
  // A given instant must really be that local time at the place (review #34 non-blocking).
  assert.throws(() => chart.computeNatalChart({ ...place, date: "1974-09-30", time: "23:30", utc: "1974-09-30T12:00:00.000Z" }), /BIRTH_TIME_MISMATCH/);
  assert.throws(() => chart.computeNatalChart({ ...place, date: "1974-09-30", time: "23:30", utc: "not a date" }), /BIRTH_TIME_MISMATCH/);
  const noTime = chart.computeNatalChart({ ...place, date: "1974-04-01", time: null });
  assert.equal(noTime.timeKnown, false, "a day that starts inside the gap still works without a birth time");
});
