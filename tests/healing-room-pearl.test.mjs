import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 療癒小房間 v2 · 珍珠白療癒沙龍 (ChatGPT spec, 2026-11-14).
const page = await readFile(new URL("../app/healing-room/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/healing-room/healing-room.css", import.meta.url), "utf8");

test("the page joins the pearl ground; the duplicate fixed nav, curtains and moon glow are gone", () => {
  assert.match(page, /<main className="healing-room pearl-page">/);
  assert.match(page, /import "\.\.\/styles\/pearl-page\.css";/);
  for (const gone of ["heal-nav", "curtain", "moon-glow"]) assert.ok(!page.includes(gone), `${gone} removed`);
  assert.match(page, /<nav className="heal-subnav" aria-label="療癒小房間"><Link href="\/">← 回到首頁<\/Link>/);
  assert.match(page, /aria-current=\{room==="records"\?"page":undefined\}/);
});

test("four arched doors with their own line icons, and 05 as a separate wide card that leaves for the astrology page", () => {
  assert.equal([...page.matchAll(/\{ id:"(emotion|relationship|sleep|strength)", no:"0[1-4]"/g)].length, 4);
  assert.match(page, /className=\{`room-door door-\$\{o\.id\}`\}/);
  assert.match(page, /<span className="door-arch" aria-hidden="true"><RoomIcon id=\{o\.id\}\/><\/span>/);
  assert.match(page, /<a className="astrology-door" href="\/astrology-exploration">/);
  assert.ok(page.indexOf('className="room-doors"') < page.indexOf('className="astrology-door"'), "05 sits after the four doors");
  assert.doesNotMatch(css, /scene-01\.webp/, "no dark starry photo");
});

test("copy works at any time of day, and addresses her as 妳; the bedtime room keeps its evening words", () => {
  assert.ok(!page.includes("你"), "妳 throughout");
  assert.ok(!page.includes("NIGHT RITUAL") && !page.includes("今晚，想讓心"));
  assert.match(page, /此刻，想讓心<br\/>停在哪裡？/);
  assert.match(page, /開始一段療癒練習/);
  assert.match(page, /今晚不需要解決所有事情。/);
  assert.match(page, /收好今天，準備休息/);
  assert.match(page, /選一段陪妳慢慢放鬆的聲音/);
});

test("records keep their storage key and fields; sounds stop when she leaves, restarts, saves or the page closes", () => {
  assert.match(page, /const STORE = "zolacoco-healing-records-v1";/);
  assert.match(page, /function go\(next:Room\)\{advancer\.newFlow\(\);stopAudio\(\);/);
  assert.match(page, /onClick=\{\(\)=>\{stopAudio\(\);setDuration\(n\)\}\}/, "changing the length clears the old timer");
  assert.match(page, /return\(\)=>\{clearTimeout\(load\);if\(audio\.current\)\{/, "unmount releases the audio");
  assert.match(page, /aria-pressed=\{playing===s\}/);
  assert.match(page, /role="progressbar" aria-valuemin=\{0\} aria-valuemax=\{total\} aria-valuenow=\{step\}/);
});

test("pearl palette only: no wine, night purple, parchment, browns or dark buttons", () => {
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
    assert.ok(l >= .3 || ["#263449", "#33445f"].includes(hex), `dark ${hex}`); // only the two text inks are dark
  }
  assert.match(css, /background: linear-gradient\(180deg, #fff2f8 0%, #f4dfe9 100%\) !important;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("the rain and the forest play: noise is filled 64 KB at a time (getRandomValues refuses more)", () => {
  assert.match(page, /for\(let o=0;o<noise\.length;o\+=16384\)crypto\.getRandomValues\(noise\.subarray\(o,o\+16384\)\);/);
  assert.doesNotMatch(page, /crypto\.getRandomValues\(noise\);/);
});
