import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 首頁故事版 (Zola, 2026-11-20): the storybook opens the home page and the full draw follows it.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the storybook opens the home page and the full site follows it", async () => {
  const page = await read("app/page.tsx");
  assert.ok(page.indexOf("<StoryHome />") > -1 && page.indexOf("<StoryHome />") < page.indexOf('id="top"'));
  assert.match(page, /<h1><span>想看得更完整<\/span><em>從這裡開始<\/em><\/h1>/);
  assert.match(page, /import "\.\/styles\/story-host\.css";/);
});

test("the story runs in a shadow root, and its ids never clash with the home page's", async () => {
  const home = await read("app/story/story-home.tsx");
  assert.match(home, /attachShadow\(\{ mode: "open" \}\)/);
  const html = (await read("app/story/story-content.ts")).split("export const STORY_HTML")[1];
  assert.match(html, /id="story-draw"/);
  for (const id of ["draw", "top", "trial", "consult", "explore", "about", "cat-story"]) assert.equal(html.includes(`id="${id}"`), false, id);
  // the reading hands over to the full draw below, outside the shadow root
  assert.match(html, /href="#draw" data-page-link/);
});

test("the story's little plays are free and never touch the 3 free uses", async () => {
  const engine = await read("app/story/story-engine.js");
  assert.equal(/useTrial|\.spend\(|visitor-trial/.test(engine), false);
});

test("every frame loop and window listener comes down when the story unmounts", async () => {
  const engine = await read("app/story/story-engine.js");
  assert.equal(/(?<![\w.])requestAnimationFrame\(/.test(engine.replace("const RAF = cb => requestAnimationFrame(", "")), false);
  assert.equal(/(?<![\w.])addEventListener\(/.test(engine), false);
  assert.match(engine, /listeners\.forEach\(\(\[type, fn, o\]\) => window\.removeEventListener\(type, fn, o\)\);/);
});

test("pictures come from the site's own folders; only the cloud sea is new", async () => {
  const content = await read("app/story/story-content.ts");
  assert.equal(content.includes('"img/'), false);
  for (const src of ["/pendulum/metal.webp", "/pendulum/crystal.webp", "/astro-dice/die.webp", "/tarot-scenes/major-17.webp", "/story/cloud-sea.webp"]) assert.ok(content.includes(src), src);
});

test("plans are written as 體驗／單次正式／4 週／8 週, with no prices on the page", async () => {
  const engine = await read("app/story/story-engine.js");
  for (const name of ["體驗諮詢", "單次正式諮詢", "4 週陪跑", "8 週陪跑"]) assert.ok(engine.includes(`name: "${name}"`), name);
  assert.equal(/NT\$|元/.test(engine.split("const PLANS")[1].split("const QS")[0]), false);
});
