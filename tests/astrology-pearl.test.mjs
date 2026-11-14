import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 探索妳的星盤 v2 (Zola, 2026-11-14: a real natal chart, plain readings, booking on LINE; an engraved
// champagne-gold armillary sphere). ChatGPT spec review: own place list (B1), Swiss Ephemeris checks
// (B2, tests/natal-chart.test.mjs), honest results without a birth time (B3), birth data in the LINE
// message only by choice (B4).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const page = await read("app/astrology-exploration/page.tsx");
const css = await read("app/astrology-exploration/astrology-exploration.css");
const layout = await read("app/astrology-exploration/layout.tsx");
const readingsSource = await read("lib/natal-readings.ts");
const readings = await import("../lib/natal-readings.ts");
const places = await import("../lib/birth-places.ts");
const wheel = await import("../lib/natal-wheel.ts");
const booking = await import("../lib/natal-booking.ts");

test("the old four questions are gone; the armillary sphere opens the page; old records stay readable", () => {
  for (const gone of ["function makeResult", "function ChoicePage", "astro-progress", "scene-0"]) assert.equal(page.includes(gone), false, gone);
  assert.match(page, /src="\/astrology-exploration\/armillary\.webp"/);
  assert.match(page, /alt="香檳金色的天球儀/);
  assert.match(page, /<main className=\{`astro-page pearl-page astro-view-\$\{view\}`\}>/);
  assert.match(page, /const OLD_RECORDS = "zolacoco-astrology-exploration-records-v1";/);
  assert.doesNotMatch(page, /removeItem\(OLD_RECORDS\)|setItem\(OLD_RECORDS/, "the old records are only read, never changed");
  assert.match(page, /<Link href="\/admin">我的存檔<\/Link>/);
  assert.doesNotMatch(page, /api\/activity/, "nothing about the chart is sent to the site");
});

test("the chart is computed in the browser; birth data is kept only when she ticks 記住, and can be cleared", () => {
  assert.match(page, /import\("@\/lib\/natal-chart"\)/, "the calculation loads on demand, in the browser");
  assert.doesNotMatch(page, /fetch\(/, "no request carries birth data");
  assert.match(page, /const BIRTH_STORE = "zolacoco-natal-birth-v1";/);
  assert.match(page, /if \(remember\) \{ localStorage\.setItem\(BIRTH_STORE, JSON\.stringify\(birth\)\); setSaved\(birth\); \}/);
  assert.match(page, /setRemember\(false\);/, "the box starts unticked every time");
  assert.match(page, /勾選後，會取代之前記住的 \{saved\?\.date\} 出生資料。/, "a different birth never silently replaces the kept one");
  assert.match(page, /localStorage\.removeItem\(BIRTH_STORE\)/);
  assert.match(page, /清除記住的出生資料/);
  assert.match(page, /出生資料只在妳的裝置上用來排盤，不會傳到網站；只有勾選「附上我的出生資料」時，才會放進 LINE 預填訊息。背景音樂由 YouTube 播放。/);
});

test("B3 without a birth time: no Ascendant, Midheaven or houses, and uncertain signs show both", () => {
  assert.match(page, /不知道出生時間（不會顯示上升星座和宮位）/);
  assert.match(page, /time: timeUnknown \? null : time/);
  assert.match(page, /上升星座需要準確的出生時間/);
  assert.match(page, /const unsure = chart\.uncertain\[id\];/);
  assert.match(page, /可能在 \{SIGN_NAMES\[unsure\[0\]\]\} 或 \{SIGN_NAMES\[unsure\[1\]\]\}/);
  assert.match(page, /\{chart\.timeKnown \? <th scope="col">宮位<\/th> : null\}/);
  assert.match(page, /Placidus 宮位在這個時刻無法計算，這裡改用從上升起算的等宮制。/);
});

test("B4 LINE: no birth data unless she ticks it, and she sees the exact text first", () => {
  const plain = booking.bookingMessage({ date: "1990-04-09", time: "14:30", place: "台北市" }, false);
  assert.doesNotMatch(plain, /1990|14:30|台北市/);
  assert.match(plain, /^Zola 妳好 ✨\n/);
  const attached = booking.bookingMessage({ date: "1990-04-09", time: null, place: "台北市" }, true);
  assert.match(attached, /出生日期：1990-04-09\n出生時間：不確定\n出生地點：台北市/);
  assert.match(page, /const \[attachBirth, setAttachBirth\] = useState\(false\);/);
  assert.match(page, /setAttachBirth\(false\);\n      setView\("result"\);/, "every new chart starts without it");
  assert.match(page, /<pre className="astro-preview">\{message\}<\/pre>/);
  assert.match(page, /href=\{lineMessageUrl\(message\)\}/);
  assert.doesNotMatch(page, /價格|NT\$/, "no prices: Zola has no public price list");
});

test("72 readings: six modules × 12 signs, gentle and specific, no fatalistic words", () => {
  const modules = { SUN_READINGS: [79, 120], MOON_READINGS: [79, 120], ASCENDANT_READINGS: [79, 120], MERCURY_LINES: [70, 110], VENUS_LINES: [70, 110], MARS_LINES: [70, 110] };
  for (const [name, [min, max]] of Object.entries(modules)) {
    const values = Object.values(readings[name]);
    assert.equal(values.length, 12, name);
    for (const text of values) {
      const length = [...text].length;
      assert.ok(length >= min && length <= max, `${name} ${length}: ${text}`);
      assert.doesNotMatch(text, /妳一定|注定|永遠|這輩子/, text);
      assert.doesNotMatch(text.replace(/「[^」]*」/g, ""), /你/, `妳 throughout, except words she says to someone else: ${text}`);
    }
  }
  assert.doesNotMatch(readingsSource, /婚姻|懷孕|疾病|財運|花心/);
  assert.ok(!page.includes("你") && !layout.includes("你"), "妳 throughout");
});

test("places: our own list, real time zones, unique ids; Taiwan's 22 counties and cities", () => {
  const ids = new Set(places.BIRTH_PLACES.map((place) => place.id));
  assert.equal(ids.size, places.BIRTH_PLACES.length);
  assert.equal(places.BIRTH_PLACES.filter((place) => place.group === "台灣").length, 22);
  for (const place of places.BIRTH_PLACES) {
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: place.timeZone }), place.timeZone);
    assert.ok(Math.abs(place.latitude) < 70 && Math.abs(place.longitude) <= 180, place.id);
  }
  assert.doesNotMatch(page, /open-meteo|geocoding/i, "no outside place-search service");
});

test("the wheel: Ascendant on the left, rounded points, planets fanned out so marks never overlap", () => {
  assert.deepEqual(wheel.pointAt(100, 50, 100), { x: 150, y: 200 }, "the Ascendant sits on the left");
  assert.deepEqual(wheel.pointAt(190, 50, 100), { x: 200, y: 250 }, "longitudes run counter-clockwise: 90° later is at the bottom");
  for (const set of [[10, 11, 12, 13, 200, 359.5], [358, 359, 0, 1, 2, 3, 120], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]) {
    const fanned = wheel.spreadLongitudes(set);
    const ordered = [...fanned].sort((a, b) => a - b);
    for (let i = 0; i < ordered.length; i++) {
      const next = ordered[(i + 1) % ordered.length] + (i + 1 === ordered.length ? 360 : 0);
      assert.ok(next - ordered[i] >= 9 - 1e-6, `${set}: gap ${next - ordered[i]}`);
    }
  }
  const spread = wheel.spreadLongitudes([10, 11, 12, 13, 200, 359.5]);
  const sorted = [...spread].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const next = sorted[(i + 1) % sorted.length] + (i + 1 === sorted.length ? 360 : 0);
    assert.ok(next - sorted[i] >= 9 - 1e-6, `gap ${next - sorted[i]}`);
  }
  assert.ok(Math.abs(spread[4] - 200) < 1e-9, "a planet with room keeps its place");
  assert.match(page, /aria-label="本命盤圖：外圈十二星座、內圈宮位與各星體位置，詳細數值見下方表格"/);
  assert.equal(Object.values(wheel.PLANET_MARKS).join(""), "日月水金火木土天海冥北", "Chinese marks, never emoji glyphs");
});

test("music never starts by itself, loads only after a tap, and says so when the browser blocks it", () => {
  assert.match(page, /\{player\.mounted \? <div className="astro-audio-only" aria-hidden="true"><iframe key=\{player\.frame\}/, "no YouTube request before the first tap");
  assert.doesNotMatch(page, /autoplay=1/, "the player never starts on its own; play is sent once it is ready");
  assert.match(page, /event\.source !== musicFrame\.current\.contentWindow/, "only the current player may change the button");
  assert.match(page, /musicStep\(before, event\)/, "rules from lib/astro-music.ts (tested in astro-music.test.mjs)");
  assert.match(page, /aria-pressed=\{player\.phase === "playing"\} aria-busy=\{player\.phase === "loading"\}/);
  assert.match(page, /window\.clearTimeout\(musicWait\.current\);\s*window\.clearInterval\(musicHello\.current\);/, "timers cleared when she leaves");
  assert.doesNotMatch(css, /\.astro-music-toggle \{[^}]*position: fixed/);
});

test("pearl palette only: no night navy, purple, parchment or browns", () => {
  const hsl = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  for (const hex of [...(css.match(/#[0-9a-fA-F]{6}\b/g) || []), ...(page.match(/#[0-9a-fA-F]{6}\b/g) || [])].map((value) => value.toLowerCase())) {
    if (["#c5a46f", "#d8be8a", "#263449", "#33445f"].includes(hex)) continue; // gold line work and the ink used for text
    const [h, s, l] = hsl(hex);
    assert.ok(!(h >= 15 && h <= 55 && s >= .12 && (l < .55 || (s < .45 && l < .9))), `earthy ${hex}`);
    assert.ok(!(h >= 200 && h <= 335 && s >= .12 && l <= .3), `night navy or purple ${hex}`);
  }
  assert.match(css, /\.astro-page \.astro-footer \{[^}]*background: transparent !important;/, "the global footer rule no longer paints it beige");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
