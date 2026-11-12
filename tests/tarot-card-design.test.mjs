import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Static guards for the bright card design (Issue #12, ChatGPT spec v2).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const css = await read("app/styles/rococo-tarot.css");
const component = await read("app/tarot-card.tsx");
const page = await read("app/page.tsx");
const healing = await read("app/healing-room/page.tsx");
const globals = await read("app/globals.css");

function rule(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `${selector} is styled`);
  return css.slice(start, css.indexOf("}", start));
}

test("the card face is label, art window, name plate, in that order", () => {
  const face = component.slice(component.indexOf("export function TarotCardFace"), component.indexOf("export function TarotCardBack"));
  const order = ["rc-card-face__label", "rc-card-face__art", "rc-card-face__name"].map((name) => face.indexOf(name));
  assert.ok(order.every((index) => index > 0), "all three parts render");
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("text never floats over the art and the art is never cropped", () => {
  assert.match(rule(".rc-card-face"), /grid-template-rows: 40px minmax\(0, 1fr\) 48px/);
  assert.match(css, /\.rc-card-face > \* \{ position: relative !important; inset: auto !important;/);
  assert.match(rule(".rc-card-face__art img"), /object-fit: contain !important/);
  assert.match(rule(".rc-card-face__art"), /background: #f3e9da/);
  assert.match(rule(".rc-card-face__label"), /11px/);
  assert.equal(/\.rc-card-face__label[^{]*\{[^}]*font-size: ?[0-9](\.[0-9]+)?px/.test(css), false, "label never below 10px");
});

test("the reading-size setting leaves the fixed card geometry alone", () => {
  for (const tier of ["small", "medium", "large"]) {
    const line = globals.split("\n").find((row) => row.startsWith(`html[data-font-tier="${tier}"] main :where(p`));
    assert.ok(line?.includes(':not([class*="rc-card-face"])'), tier);
  }
});

test("every card back uses the shared TarotCardBack; the deck stays lazy", () => {
  for (const className of ["card-back", "tarot-back", "practice-tarot-back"]) {
    assert.ok(page.includes(`<TarotCardBack className="${className}"`) || page.includes(`className="${className}" style`), className);
    assert.equal(page.includes(`<div className="${className}"><div className="back-frame" />`), false, `${className} is not hand-built`);
  }
  assert.ok(healing.includes('<TarotCardBack className="card-back-art"/>'));
  assert.match(css, /\.back-frame::before \{[^}]*pointer-events: none/);
  assert.match(css, /\.back-frame::after \{[^}]*pointer-events: none/);
  // Faces are only rendered for cards that were drawn; never the whole 78-card deck.
  assert.equal(/tarotCards\.map\([^)]*TarotCardFace/.test(page), false);
});

test("the relationship spread board is a triangle on desktop and a column on phones", () => {
  assert.match(css, /\.spread-board--relationship \.spread-slot--3 \{ grid-row: 1; grid-column: 1 \/ -1; \}/);
  assert.match(css, /\.spread-board--relationship \{ grid-template-columns: repeat\(2, auto\); column-gap: 40px; row-gap: 32px; \}/);
  assert.match(css, /\.spread-board--timeline \.tarot-card \{ width: clamp\(160px, 18vw, 220px\) !important; \}/);
  assert.ok(page.includes("spread-motif motif-${item.id}"), "spread choices draw their own position diagram");
});
