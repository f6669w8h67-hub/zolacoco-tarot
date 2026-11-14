import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

// Step 10: 我的存檔 (/admin) and Zola's member backend (/zola-admin) in the pearl pink-blue Rococo look,
// and the Cloudflare-era D1 routes removed (they cannot run on Vercel; nothing read their tables and
// every record lives in the visitor's browser).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => access(new URL(`../${path}`, import.meta.url)).then(() => true, () => false);

const pearl = new Set(["#263449", "#33445f", "#843450", "#c5a46f", "#e4d6e0", "#e8f2fc", "#fceaf3", "#b9c7d8", "#b4405f", "#ffffff", "#fdfbfd", "#f0e6ec", "#f4f6fa", "#59657a", "#e8f5ee", "#2f6b4f", "#fff6dc", "#7a5b12"]);

test("both pages wear the pearl ground and their own pearl stylesheet", async () => {
  const archive = await read("app/admin/page.tsx");
  assert.match(archive, /<main className="admin-page pearl-page">/);
  assert.match(archive, /import "\.\.\/styles\/pearl-page\.css";\nimport "\.\/archive-pearl\.css";/);
  const backend = await read("app/zola-admin/admin-client.tsx");
  assert.match(backend, /<main className="zola-admin-page pearl-page">/);
  assert.match(backend, /import "\.\/zola-admin-pearl\.css";/);
  for (const file of ["app/admin/archive-pearl.css", "app/zola-admin/zola-admin-pearl.css"]) {
    const css = await read(file);
    for (const hex of css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) assert.ok(pearl.has(hex.toLowerCase()), `${file} ${hex}`);
    assert.doesNotMatch(css, /#f8ede3|#765064|#50394f|Georgia/i, "no beige, no deep purple");
  }
});

test("archive details: the title sits left on a phone, tarot thumbnails stay in a row, a journal note shows once", async () => {
  const css = await read("app/admin/archive-pearl.css");
  assert.match(css, /\.admin-page\.pearl-page \.admin-top \{ display: flex; flex-direction: row; flex-wrap: nowrap;/);
  assert.match(css, /\.admin-page\.pearl-page \.archive-list article > div:first-child \{ display: grid;/);
  const archive = await read("app/admin/page.tsx");
  assert.match(archive, /if \(typeof row\.question === "string" && \/\^DAY \\d\+\$\/\.test\(row\.question\)\) return "";/);
});

test("the D1 routes are gone and no page calls /api/activity any more", async () => {
  for (const route of ["activity", "journal", "pendulum", "astro-dice"]) assert.equal(await exists(`app/api/${route}/route.ts`), false, route);
  for (const page of ["app/awareness/page.tsx", "app/healing-room/page.tsx"]) assert.doesNotMatch(await read(page), /api\/activity/, page);
});

test("tab titles for 我的存檔, Zola 會員後台 and 覺察卡", async () => {
  assert.match(await read("app/admin/layout.tsx"), /title: "我的存檔｜Zolacoco Tarot"/);
  assert.match(await read("app/zola-admin/layout.tsx"), /title: "Zola 會員後台｜Zolacoco Tarot"/);
  assert.match(await read("app/awareness/layout.tsx"), /title: "Zolacoco 覺察卡｜Zolacoco Tarot"/);
});
