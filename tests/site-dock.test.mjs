import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// The bottom dock + 全部功能 tray (Zola picked the G layout on 2026-11-22: 放大 Dock + 玻璃分頁,
// dock = 抽牌・靈擺・星骰・問 Zola, phone and desktop alike, all nine features kept).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const features = await loadTypescript("lib/site-features.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));

test("all nine features keep their pages, in three groups", () => {
  const groups = plain(features.FEATURE_GROUPS);
  assert.deepEqual(groups.map((group) => group.label), ["占卜工具", "內在探索", "療癒空間"]);
  assert.deepEqual(groups.flatMap((group) => group.items.map((item) => [item.title, item.href])), [
    ["塔羅抽牌", "/#draw"], ["靈擺占卜", "/pendulum"], ["星骰指引", "/astro-dice"],
    ["Zolacoco 覺察卡", "/awareness"], ["直覺練習", "/?tool=intuition#explore"], ["七日塔羅筆記", "/?tool=journal#explore"],
    ["療癒小房間", "/healing-room"], ["探索妳的星盤", "/astrology-exploration"], ["問問 Zola", "/#consult"],
  ]);
});

test("the dock holds 抽牌・靈擺・星骰・問 Zola, the rest wait behind ＋", () => {
  assert.deepEqual(plain(features.DOCK_FEATURES), ["tarot", "pendulum", "dice", "zola"]);
  assert.equal(features.findFeature("zola").href, "/#consult");
});

test("the dock grows under the pointer and settles back", () => {
  assert.deepEqual(plain(features.dockSizes(5, null)), [50, 50, 50, 50, 50]);
  const atMiddle = plain(features.dockSizes(5, 0));
  assert.equal(atMiddle[2], Math.round(50 * 1.55), "the item under the pointer is the largest");
  assert.ok(atMiddle[1] > 50 && atMiddle[1] < atMiddle[2], "its neighbours grow a little");
  assert.equal(atMiddle[1], atMiddle[3], "both sides grow alike");
  assert.equal(atMiddle[0], 50, "far items stay as they are");
  assert.deepEqual(plain(features.dockSizes(5, 600)), [50, 50, 50, 50, 50]);
});

test("the dock marks the page she is on; home-page features are never marked", () => {
  const pendulum = features.findFeature("pendulum");
  assert.equal(features.isCurrentFeature(pendulum, "/pendulum"), true);
  assert.equal(features.isCurrentFeature(pendulum, "/"), false);
  assert.equal(features.isCurrentFeature(features.findFeature("tarot"), "/"), false);
  assert.equal(features.groupIndexFor("/healing-room"), 2);
  assert.equal(features.groupIndexFor("/awareness"), 1);
  assert.equal(features.groupIndexFor("/"), 0);
});

test("the dock is on every page but the immersive ones; the header keeps only the brand and 會員中心", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /import "\.\/styles\/site-dock\.css";\nimport "\.\/styles\/serif-all\.css";/, "serif-all stays last");
  assert.match(layout, /<SiteDock \/>/);
  const dock = await read("app/site-dock.tsx");
  assert.match(dock, /\/\^\\\/healing-room\\\/yuanchen/);
  assert.match(dock, /\/\^\\\/zola-admin/);
  assert.match(dock, /aria-expanded=\{open\} aria-controls="dock-tray"/);
  assert.match(dock, /localStorage\.getItem\("zolacoco-font-tier"\)/, "the reading size moved here and keeps its saved choice");
  assert.match(dock, /role="tablist"/);
  const header = await read("app/site-header.tsx");
  assert.doesNotMatch(header, /全部功能|global-function-menu|use client/);
  assert.match(header, /href="\/account"/);
});

test("the story's chapter dots sit above the dock on phones", async () => {
  const story = await read("app/story/story-content.ts");
  assert.match(story, /\.chapters-nav \{ top: auto; bottom: calc\(112px \+ env\(safe-area-inset-bottom\)\);/);
});
