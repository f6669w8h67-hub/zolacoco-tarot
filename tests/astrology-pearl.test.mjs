import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 探索妳的星盤 · 珍珠星象沙龍 (ChatGPT spec, 2026-11-14).
const page = await readFile(new URL("../app/astrology-exploration/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/astrology-exploration/astrology-exploration.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/astrology-exploration/layout.tsx", import.meta.url), "utf8");

test("no scene photos any more: one gold chart in line decorates every view", () => {
  assert.doesNotMatch(page, /scene-0\d/);
  assert.doesNotMatch(page, /sceneStyle|--scene/);
  assert.doesNotMatch(css, /scene-0\d|--scene/);
  assert.match(page, /function AstroChart\(/);
  for (const use of ["astro-chart-hero", "astro-chart-side", "astro-chart-watermark", "astro-chart-service", "astro-chart-empty"]) assert.ok(page.includes(use), use);
  assert.match(page, /<main className=\{`astro-page pearl-page astro-view-\$\{view\}`\}>/);
});

test("music never starts by itself, loads only after a tap, and says so when the browser blocks it", () => {
  const begin = page.slice(page.indexOf("function beginJourney()"), page.indexOf("const music ="));
  assert.doesNotMatch(begin, /setMusic|toggleMusic|startMusic/);
  assert.match(page, /\{player\.mounted \? <div className="astro-audio-only" aria-hidden="true"><iframe key=\{player\.frame\}/, "no YouTube request before the first tap");
  assert.doesNotMatch(page, /autoplay=1/, "the player never starts on its own; play is sent once it is ready");
  assert.match(page, /event\.source !== musicFrame\.current\.contentWindow/, "only the current player may change the button");
  assert.match(page, /musicStep\(before, event\)/, "rules from lib/astro-music.ts (tested in astro-music.test.mjs)");
  assert.match(page, /aria-pressed=\{player\.phase === "playing"\} aria-busy=\{player\.phase === "loading"\}/);
  assert.match(page, /window\.clearTimeout\(musicWait\.current\);\s*window\.clearInterval\(musicHello\.current\);/, "timers cleared when she leaves");
  assert.doesNotMatch(css, /\.astro-music-toggle \{[^}]*position: fixed/);
});

test("steps keep their choices, say where she is, and mark the chosen answer with more than colour", () => {
  assert.match(page, /role="progressbar" aria-label="探索進度" aria-valuemin=\{0\} aria-valuemax=\{4\} aria-valuenow=\{step\}/);
  assert.match(page, /aria-pressed=\{value\?\.id === choice\.id\}/);
  assert.match(page, /"✓ 已選擇"/);
  assert.match(page, /maxLength=\{120\}/);
  assert.match(css, /\.astro-note textarea \{[^}]*font: 16px/);
});

test("the result stays an exploration, not a calculated natal chart", () => {
  assert.match(page, /這是依照妳的回答整理出的自我探索方向，不是本命盤計算結果。/);
  assert.match(page, /這是自我探索引導，不是實際的本命盤計算。/);
  assert.match(page, /function makeResult\(theme: Choice, state: Choice, need: Choice, focus: Choice, note: string\): Result \{/);
});

test("records: same key, read after mounting, old ones still show; LINE link kept; 妳 throughout", () => {
  assert.match(page, /const STORE = "zolacoco-astrology-exploration-records-v1";/);
  assert.match(page, /const \[records, setRecords\] = useState<RecordItem\[\]>\(\[\]\);/);
  assert.match(page, /localStorage\.getItem\(STORE\)/);
  assert.match(page, /href=\{ZOLA_LINE_URL\}/);
  assert.match(page, /type: "astrology_exploration"/);
  assert.ok(!page.includes("你") && !layout.includes("你"), "妳 throughout");
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
  for (const hex of (css.match(/#[0-9a-fA-F]{6}\b/g) || []).map((value) => value.toLowerCase())) {
    if (["#c5a46f", "#d8be8a", "#263449", "#33445f"].includes(hex)) continue; // gold line work and the ink used for text
    const [h, s, l] = hsl(hex);
    assert.ok(!(h >= 15 && h <= 55 && s >= .12 && (l < .55 || (s < .45 && l < .9))), `earthy ${hex}`);
    assert.ok(!(h >= 200 && h <= 335 && s >= .12 && l <= .3), `night navy or purple ${hex}`);
  }
  assert.match(css, /\.astro-page \.astro-footer \{[^}]*background: transparent !important;/, "the global footer rule no longer paints it beige");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
