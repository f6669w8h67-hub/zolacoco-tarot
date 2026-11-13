import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Home page: 牠們的故事 and 內在探索 in the pearl Rococo look (2026-11-13).
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/home-pearl.css", import.meta.url), "utf8");

test("the cat photos stay the same two portraits, now in arched gold-framed windows", () => {
  assert.match(page, /<img src="\/ryan-portrait\.jpeg"/);
  assert.match(page, /<img src="\/shrimp-portrait\.jpeg"/);
  assert.match(css, /#cat-story \.cat-photo \{[^}]*border-radius: 999px 999px 18px 18px !important;/);
  assert.match(page, /import "\.\/styles\/home-pearl\.css";/);
});

test("the three practices that open here are tabs right above their panel", () => {
  const ids = [...page.matchAll(/\{ id: "(archetype|intuition|journal)", number: "0[1-3]"/g)].map((match) => match[1]);
  assert.deepEqual(ids, ["archetype", "intuition", "journal"]);
  assert.match(page, /<div className="ex-tabs" role="tablist"/);
  assert.match(page, /role="tab" aria-selected=\{exploreTool === tool\.id\} aria-controls="ex-panel"/);
  assert.match(page, /tabIndex=\{exploreTool === tool\.id \? 0 : -1\}/, "roving tabindex");
  assert.match(page, /event\.key === "ArrowRight" \? 1 : event\.key === "ArrowLeft" \? -1 : 0/);
  assert.match(page, /<div className="tool-stage" id="ex-panel" role="tabpanel"/);
});

test("the pendulum and the astro dice are links to their own pages, not tabs that jump away", () => {
  assert.match(page, /\{ href: "\/pendulum", number: "04"/);
  assert.match(page, /\{ href: "\/astro-dice", number: "05"/);
  assert.match(page, /<a key=\{tool\.href\} className="ex-more-card" href=\{tool\.href\}>/);
  assert.doesNotMatch(page, /window\.location\.assign\("\/pendulum"\)/);
  assert.doesNotMatch(page, /className="tool-tabs"/);
});

test("pearl palette: no browns, khaki, deep purple or dark buttons", () => {
  const hsl = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  const ornamentGold = new Set(["#c5a46f", "#d8be8a"]);
  for (const hex of (css.match(/#[0-9a-fA-F]{6}\b/g) || []).map((value) => value.toLowerCase())) {
    if (ornamentGold.has(hex)) continue;
    const [h, s, l] = hsl(hex);
    assert.ok(!(h >= 15 && h <= 55 && s >= .12 && (l < .55 || (s < .45 && l < .9))), `earthy ${hex}`);
    assert.ok(!(h >= 230 && h <= 335 && s >= .12 && l <= .38), `deep purple ${hex}`);
  }
  assert.match(css, /background: linear-gradient\(180deg, #fff2f8 0%, #f4dfe9 100%\) !important;/, "pearl primary buttons");
});

test("headings break after the comma, never leaving one character alone", () => {
  assert.match(page, /<h2>抽完牌，<span className="keep-line">再認識陪你讀牌的牠們<\/span><\/h2>/);
  assert.match(page, /<h2>用塔羅，<span className="keep-line">更靠近內在的自己<\/span><\/h2>/);
  assert.match(css, /h2 \.keep-line \{ display: inline-block; \}/);
});

test("on a phone the cat cards read centred: photo on top, title and story centred (PR #26 review B1)", () => {
  const phone = css.slice(css.indexOf("@media (max-width: 760px) {\n  html body #cat-story"));
  assert.match(phone, /#cat-story \.cat-profile \{[^}]*text-align: center;/);
  assert.match(phone, /#cat-story \.cat-profile p \{ text-align: center !important;/);
  assert.doesNotMatch(css, /\.cat-profile p \{ text-align: left/);
});

test("roses in all four corners of both sections, behind the content and never in the way (PR #26 review B2)", () => {
  assert.equal(page.match(/<span className="pearl-corners" aria-hidden="true" \/>/g)?.length, 2);
  assert.match(css, /:is\(#cat-story, #explore\)::before \{ left: 6px !important; \}/, "top left");
  assert.match(css, /:is\(#cat-story, #explore\)::after \{ right: 6px !important; transform: scaleX\(-1\) !important; \}/, "top right");
  assert.match(css, /> \.pearl-corners::before \{ left: 6px; transform: scaleY\(-1\); \}/, "bottom left");
  assert.match(css, /> \.pearl-corners::after \{ right: 6px; transform: scale\(-1, -1\); \}/, "bottom right");
  assert.match(css, /> \.pearl-corners \{ position: absolute; inset: 0; z-index: 0; pointer-events: none; \}/);
  assert.match(css, /> :not\(\.pearl-corners\) \{ position: relative; z-index: 1; \}/);
});
