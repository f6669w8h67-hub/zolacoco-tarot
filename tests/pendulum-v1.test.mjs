import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { choicesFromQuestion, questionQuality, QUALITY_TEXT } from "../app/pendulum/question-quality.ts";

// 靈擺互動 v1 (ChatGPT spec, 2026-11-13) and the pearl Rococo pendulum.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const page = await read("app/pendulum/page.tsx");
const css = await read("app/pendulum/pendulum-v1.css");

test("only an empty question is blocked; other questions get a hint, never a dead end", () => {
  for (const blank of ["", "   ", "？？", "嗎"]) assert.equal(questionQuality(blank, "yesno").canAsk, false, blank);
  assert.equal(questionQuality("", "yesno").text, QUALITY_TEXT.empty);
  const cases = [
    ["他喜歡我嗎", "good", null],
    ["我該去嗎？", "good", null],
    ["我該去台北還是台中", "hint", "choices"],
    ["為什麼他不回我", "hint", "custom"],
    ["我適合換工作嗎？他會支持嗎？", "hint", null],
    ["我這幾天適合休息嗎", "good", null],
  ];
  for (const [question, tone, suggest] of cases) {
    const quality = questionQuality(question, "yesno");
    assert.equal(quality.canAsk, true, question);
    assert.equal(quality.tone, tone, question);
    assert.equal(quality.suggest, suggest, question);
  }
  // the custom mode is for open questions and never gets yes/no advice
  assert.deepEqual(questionQuality("為什麼他不回我", "custom"), { canAsk: true, tone: "good", text: QUALITY_TEXT.ready, suggest: null });
  assert.deepEqual(choicesFromQuestion("我該去台北還是台中？"), ["A 我該去台北", "B 台中"]);
  assert.deepEqual(choicesFromQuestion("他喜歡我嗎"), []);
});

test("the ritual is one block: way to play, question, stage, result; calibration is optional", () => {
  assert.doesNotMatch(page, /premium-room|id="membership"|#membership|divination-centre/);
  assert.match(page, /role="group" aria-label="常用玩法"/);
  assert.doesNotMatch(page, /你/, "the site speaks to members as 妳");
  assert.match(page, /全部 23 種玩法/);
  assert.match(page, /const startDisabled=moving\|\|calibrating\|\|\(needsQuestion&&!quality\.canAsk\)/);
  assert.doesNotMatch(page, /calibrated&&actionDisabled|calibrated\?ask:calibrate/);
  assert.match(page, /runNaturalMotion\("unclear",1800,done\)/);
  assert.match(page, /想先熟悉靈擺？開始校準/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  // the stage comes on screen before the swing starts
  assert.match(page, /const wait=fullyVisible\(stageRef\.current\)\?0:scrollToTop\(stageRef\.current\);/);
  // one save per result, then a way to the record
  assert.match(page, /if\(!outcome\|\|savedId!==null\)return;/);
  assert.match(page, /查看我的靈擺紀錄/);
  assert.match(page, /id=\{`pendulum-entry-\$\{entry\.id\}`\}/);
  // library dialog: focus starts inside, Tab stays inside, closing gives focus back to the trigger
  assert.match(page, /role="dialog" aria-modal="true" aria-labelledby="pv-library-title"/);
  assert.match(page, /function closeLibrary\(\)\{setLibraryOpen\(false\);later\(\(\)=>libraryTriggerRef\.current\?\.focus/);
  assert.match(page, /if\(event\.key!=="Tab"\|\|!dialog\)return;/);
  // soundscape iframe exists only while playing
  assert.match(page, /\{soundEnabled&&<div className="audio-only-player"/);
});

test("the Rococo pendulum hangs from the stage ring, crystal and gold in separate layers", () => {
  for (const file of ["crystal.webp", "metal.webp", "stage.webp", "stage-800.webp", "hero-desktop.webp", "hero-mobile.webp", "shell-crest.webp", "rose-corner.webp", "gold-scroll.webp", "wallpaper-tile.webp"]) {
    assert.ok(existsSync(new URL(`../public/pendulum/${file}`, import.meta.url)), file);
  }
  assert.match(page, /const PENDULUM_TOP=\.105;/);
  assert.match(css, /\.pendulum-page \.pv-pendulum \{[^}]*top: 10\.5%;/);
  assert.match(page, /<img className="pv-crystal" src="\/pendulum\/crystal\.webp"[^>]*\/><img className="pv-metal" src="\/pendulum\/metal\.webp"/);
  // materials recolour the crystal; only brass, silver and walnut touch the metal
  const metalRules = css.match(/material-[a-z]+ \.pv-metal/g) ?? [];
  assert.deepEqual(metalRules.map((rule) => rule.split(" ")[0]).sort(), ["material-brass", "material-silver", "material-wood"]);
});

test("pearl palette: no browns, khaki or parchment in the pendulum styles", () => {
  const earthy = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return false;
    const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    // browns and khaki: orange-yellow hues that are dull or dark
    return h >= 15 && h <= 55 && s >= .12 && (l < .55 || (s < .45 && l < .9));
  };
  const ornamentGold = new Set(["#c5a46f", "#d8be8a"]); // design system v1 §1.1 gold ornaments
  const found = (css.match(/#[0-9a-fA-F]{6}\b/g) || []).filter((hex) => !ornamentGold.has(hex.toLowerCase())).filter(earthy);
  assert.deepEqual(found, []);
  assert.doesNotMatch(css, /parchment/);
});

test("background v2: salon hero, damask wallpaper, ornaments only on hero, ritual and result", async () => {
  assert.match(page, /<source media="\(max-width: 700px\)" srcSet="\/pendulum\/hero-mobile\.webp"\/><img src="\/pendulum\/hero-desktop\.webp" alt=""\/>/);
  assert.match(css, /\.pendulum-page \.pv-hero \{[^}]*height: clamp\(380px, 58svh, 440px\);/);
  const ground = await read("app/styles/pearl-page.css");
  assert.match(ground, /background-image: url\('\/pendulum\/wallpaper-tile\.webp'\);/);
  // the pearl ground belongs to pages that opt in, until the rest of the site is restyled
  assert.match(ground, /html body:has\(main\.pearl-page\)::after \{[^}]*\}/);
  assert.doesNotMatch(ground, /^html body(::(before|after))? \{/m);
  assert.match(page, /<main className="pendulum-page pearl-page">/);
  assert.doesNotMatch(css, /^html body(::(before|after))? \{/m);
  // the wallpaper never sits inside cards: cards keep a solid white surface
  assert.match(css, /--pv-surface: #ffffff;/);
  // ornaments are decoration only
  assert.match(css, /\.pendulum-page \.pv-hero-crest \{\n[^}]*pointer-events: none;/);
  assert.match(css, /\.pendulum-page \.pv-ritual::after \{\n[^}]*pointer-events: none;/);
  assert.match(css, /display: block; position: absolute; top: 110px;[^}]*pointer-events: none;/);
  assert.match(page, /<span className="pv-scroll left" aria-hidden="true"\/>/);
});
