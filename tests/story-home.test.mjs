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

test("everything the story starts comes down when it unmounts (ChatGPT review on #54)", async () => {
  const engine = await read("app/story/story-engine.js");
  const body = engine.slice(engine.indexOf("const onRootClick"));
  // frames, timers and observers only through the tracked helpers
  assert.equal(/requestAnimationFrame\(/.test(body), false, "frames go through RAF");
  assert.equal(/setTimeout\(/.test(body), false, "timers go through TO");
  assert.equal(/new (Intersection|Resize)Observer\(/.test(body), false, "observers go through IO / RO");
  assert.equal(/(?<![\w.])addEventListener\(/.test(engine), false, "window listeners go through ON");
  const teardown = engine.slice(engine.lastIndexOf("return () => {"));
  for (const step of ["alive = false", "window.removeEventListener(type, fn, o)", 'document.removeEventListener("visibilitychange", wake)', 'root.removeEventListener("click", onRootClick)', "observers.forEach(o => o.disconnect())", "timers.forEach(id => clearTimeout(id))", "cleanups.forEach(fn => fn())"]) assert.ok(teardown.includes(step), step);
  assert.match(engine, /cleanups\.push\(\(\) => \{ if \(storyUrl\) URL\.revokeObjectURL\(storyUrl\); \}\);/);
});

test("the story sleeps off screen, in a hidden tab, and redraws little with reduced motion", async () => {
  const engine = await read("app/story/story-engine.js");
  assert.match(engine, /if \(!canRun\(\)\) \{ parked\.add\(cb\); return; \}/);
  assert.match(engine, /const canRun = \(\) => awake && \(!reduceMotion \|\| performance\.now\(\) < busyUntil\);/);
  assert.match(engine, /const wake = \(\) => \{ awake = onScreen && !document\.hidden; resume\(\); \};/);
  assert.match(engine, /\["scroll", "resize", "pointerdown", "pointermove", "keydown", "click"\]\.forEach\(type => ON\(type, poke, \{ passive: true \}\)\)/);
  assert.equal(/if \(reduce\) pw \+=/.test(engine), false, "no swing with reduced motion");
  assert.match(engine, /host\.toggleAttribute\("data-away", !onScreen\)/);
  assert.match(engine, /if \(reduce\) \{ const key = `\$\{scrollY\}/);
  assert.match(engine, /if \(reduce && !asking && !\(pDrag && pDrag\.on\) && Math\.abs\(pw\) < 1e-4 && fxDirty\)/);
  const content = await read("app/story/story-content.ts");
  assert.match(content, /:host\(\[data-away\]\) :is\(#dust, \.sky, \.sparkles, \.chapters-nav\) \{ display: none; \}/);
});

test("the story image dialog keeps focus inside, makes the page behind it inert and gives focus back", async () => {
  const engine = await read("app/story/story-engine.js");
  assert.match(engine, /sheet\.addEventListener\("keydown", e => \{\n\s+if \(e\.key !== "Tab"\) return;/);
  assert.match(engine, /if \(e\.shiftKey && \(cur === first \|\| !sheet\.contains\(cur\)\)\) \{ e\.preventDefault\(\); last\.focus\(\); \}/);
  assert.match(engine, /sheet\.hidden = false; setBackgroundInert\(true\);/);
  assert.match(engine, /function closeSheet\(\) \{ sheet\.hidden = true; setBackgroundInert\(false\);[^}]*lastFocus\.focus/);
  assert.match(engine, /if \(e\.key === "Escape" && !sheet\.hidden\) closeSheet\(\);/);
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

test("on a wide screen the draw, the voices and the plan finder sit in the middle of the page (Zola 2026-11-24: 「歪掉」)", async () => {
  const css = (await read("app/story/story-content.ts")).split("export const STORY_HTML")[0];
  const wide = css.split("@media (min-width: 900px) {")[1].split("\n}\n")[0];
  // a 980px column placed at the start of a wider chapter pushed everything ~115px left at 1440px wide
  for (const chapter of ["finale", "after"]) {
    const rule = new RegExp(`\\.chapter\\.${chapter} \\{[^}]*\\}`).exec(wide)?.[0] ?? "";
    assert.match(rule, /grid-template-columns: minmax\(0, 980px\)/, chapter);
    assert.match(rule, /justify-content: center/, `${chapter}: the column itself is centred`);
  }
  // the stage still reaches both edges of the screen from the middle of its column
  assert.match(css, /\.stage \{\n\s*position: relative; width: 100vw; margin-inline: calc\(50% - 50vw\);/);
});
