import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// The bottom dock + 全部功能 tray (Zola picked the G layout on 2026-11-22: 放大 Dock + 玻璃分頁,
// dock = 抽牌・靈擺・星骰・問 Zola, phone and desktop alike, all nine features kept; 心理測驗 added 2026-11-23).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const features = await loadTypescript("lib/site-features.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));

test("all nine features keep their pages, in three groups, with 心理測驗 first in 內在探索", () => {
  const groups = plain(features.FEATURE_GROUPS);
  assert.deepEqual(groups.map((group) => group.label), ["占卜工具", "內在探索", "療癒空間"]);
  assert.deepEqual(groups.flatMap((group) => group.items.map((item) => [item.title, item.href])), [
    ["塔羅抽牌", "/#draw"], ["靈擺占卜", "/pendulum"], ["星骰指引", "/astro-dice"],
    ["心理測驗", "/quizzes"], ["Zolacoco 覺察卡", "/awareness"], ["直覺練習", "/?tool=intuition#explore"], ["七日塔羅筆記", "/?tool=journal#explore"],
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
  assert.match(dock, /setFontTier\(readFontTier\(browserStore\(\)\)\)/, "the reading size moved here and keeps its saved choice");
  assert.match(await read("lib/font-tier.ts"), /export const FONT_TIER_KEY = "zolacoco-font-tier";/);
  assert.match(dock, /role="tablist"/);
  const header = await read("app/site-header.tsx");
  assert.doesNotMatch(header, /全部功能|global-function-menu|use client/);
  assert.match(header, /href="\/account"/);
});

test("the story's chapter dots sit above the dock on phones", async () => {
  const story = await read("app/story/story-content.ts");
  assert.match(story, /\.chapters-nav \{ top: auto; bottom: calc\(112px \+ env\(safe-area-inset-bottom\)\);/);
});

// PR #55 review (Blocking 1 and 2)
const fontTier = await loadTypescript("lib/font-tier.ts");

test("a saved 小 or 大 is read back, and reading never writes", () => {
  for (const saved of ["small", "large"]) {
    const writes = [];
    const store = { getItem: () => saved, setItem: (...args) => writes.push(args) };
    assert.equal(fontTier.readFontTier(store), saved);
    assert.deepEqual(writes, []);
  }
  assert.equal(fontTier.readFontTier({ getItem: () => "huge", setItem() {} }), "medium");
  assert.equal(fontTier.readFontTier(null), "medium");
});

test("blocked or full storage never throws: the size still applies for this visit", () => {
  assert.equal(fontTier.readFontTier({ getItem() { throw new Error("blocked"); }, setItem() {} }), "medium");
  assert.equal(fontTier.writeFontTier({ getItem: () => null, setItem() { throw new Error("full"); } }, "large"), false);
  assert.equal(fontTier.writeFontTier(null, "large"), false);
  const kept = [];
  assert.equal(fontTier.writeFontTier({ getItem: () => null, setItem: (...args) => kept.push(args) }, "small"), true);
  assert.deepEqual(kept, [["zolacoco-font-tier", "small"]]);
});

test("the dock writes the size only when she picks one, and never moves buttons under a finger", async () => {
  const dock = await read("app/site-dock.tsx");
  assert.match(dock, /useState<FontTier \| null>\(null\)/, "no default is assumed before the saved size is read");
  assert.match(dock, /function chooseFont\(next: FontTier\) \{\n    setFontTier\(next\);\n    writeFontTier\(browserStore\(\), next\);/);
  assert.equal((dock.match(/writeFontTier\(/g) ?? []).length, 1, "the only write is her own choice");
  assert.match(dock, /event\.pointerType === "mouse" && window\.innerWidth >= MAGNIFY_MIN_WIDTH/, "only a mouse on a wide screen resizes buttons");
  assert.match(dock, /setTouchAt\(itemAt\(event\.currentTarget, event\.clientX\)\)/);
  const css = await read("app/styles/site-dock.css");
  assert.match(css, /--dock-size: clamp\(44px, calc\(\(100vw - 96px\) \/ 5\), 50px\);/);
  assert.match(css, /\.dock-item\.touched svg \{ transform: scale\(1\.3\); \}/);
  assert.match(css, /max-height: calc\(100svh - 110px/);
});
