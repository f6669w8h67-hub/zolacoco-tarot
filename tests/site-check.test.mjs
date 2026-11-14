import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Step 6 (whole-site iPhone check, PR #31).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the site speaks to her as 妳 everywhere, the brand line included", async () => {
  for (const file of ["app/page.tsx", "app/layout.tsx", "app/site-header.tsx", "app/admin/page.tsx"]) {
    assert.equal((await read(file)).includes("你"), false, file);
  }
  assert.match(await read("app/layout.tsx"), /title: "Zolacoco Tarot｜抽一張屬於妳的牌"/);
  assert.match(await read("app/page.tsx"), /<em>抽一張屬於妳的牌<\/em>/);
  // her own greeting to Zola in the LINE message is her words, not ours
  assert.match(await read("lib/tarot-reading.ts"), /"你好 Zola ✨"/);
});

test("every page has its own tab title (site check 2026-11-14)", async () => {
  const titles = {
    pendulum: "靈擺直覺問答", "astro-dice": "星骰此刻指引", "healing-room": "療癒小房間", account: "會員中心", "sign-in": "登入", "sign-up": "註冊",
    awareness: "Zolacoco 覺察卡", "astrology-exploration": "探索妳的星盤", journal: "七日陪跑筆記", practice: "學員練習室", admin: "我的存檔", "zola-admin": "Zola 會員後台",
  };
  for (const [dir, title] of Object.entries(titles)) assert.match(await read(`app/${dir}/layout.tsx`), new RegExp(`title: "${title}｜Zolacoco Tarot"`), dir);
});

test("the maintenance notice is gone (Zola, 2026-11-14): no banner, no leftover styles", async () => {
  await assert.rejects(read("app/site-notice.tsx"), "the component is removed");
  assert.doesNotMatch(await read("app/layout.tsx"), /SiteNotice/);
  for (const file of ["app/styles/rococo-tarot.css", "app/styles/pearl-page.css"]) assert.doesNotMatch(await read(file), /site-notice/, file);
});

test("header brand, menu links and the small links found in the check are 44px; menu text is readable", async () => {
  const globals = await read("app/globals.css");
  assert.match(globals, /\.global-brand\{min-height:44px;display:inline-flex;flex-direction:column;justify-content:center\}/);
  const tail = globals.slice(globals.lastIndexOf("/* Step 6 (iPhone check): menu text readable"));
  assert.match(tail, /\.global-menu-groups a small\{font-size:13px\}/);
  assert.match(tail, /\.global-function-menu \.global-menu-groups h3\{font-size:13px/);
  assert.match(tail, /\.global-function-menu \.global-account-panel a,\.global-function-menu \.global-admin-link\{min-height:44px/);
  assert.match(await read("app/pendulum/pendulum-v1.css"), /\.pendulum-page > footer a \{ min-height: 44px;/);
  assert.match(await read("app/styles/rococo-tarot.css"), /\.admin-page \.admin-empty a \{ min-height: 44px;/);
  const home = await read("app/styles/home-pearl.css");
  for (const rule of [/\.deck-note \{ font-size: 13px/, /\.tarot-question small \{ font-size: 12px/, /\.journal-lenses span \{ font-size: 12px/]) assert.match(home, rule);
});

test("SVG chart points are rounded, so server and phone render the same markup", async () => {
  assert.match(await read("app/healing-room/page.tsx"), /Math\.round\(\(60 \+ r \* f\(a\)\) \* 100\) \/ 100/);
  assert.match(await read("lib/natal-wheel.ts"), /const round = \(value: number\) => Math\.round\(value \* 100\) \/ 100;/);
});
