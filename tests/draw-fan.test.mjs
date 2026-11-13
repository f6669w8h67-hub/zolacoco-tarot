import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DESK, MOTION, PHONE, flingTarget, openRank, placeCard, rubberBand } from "../lib/draw-fan-math.ts";

// Draw interaction v4 (ChatGPT spec, 2026-11-13).
const fan = await readFile(new URL("../app/draw-fan.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/draw-fan.css", import.meta.url), "utf8");

test("phone fan: one row, the middle card lifted 14px and 1.12×, tilt 2.5° a card up to 12°, drop up to 25px", () => {
  assert.deepEqual({ ...PHONE }, { width: 76, height: 122, step: 34, lift: 14, grow: 0.12, tilt: 2.5, maxTilt: 12, drop: 5, maxDrop: 25 });
  const middle = placeCard(6, 13, 6, "phone", 390);
  assert.deepEqual(middle, { x: 0, y: -14, rotate: 0, scale: 1.12, z: 100 });
  const next = placeCard(7, 13, 6, "phone", 390);
  assert.deepEqual(next, { x: 34, y: 5, rotate: 2.5, scale: 1, z: 96 });
  const far = placeCard(0, 13, 12, "phone", 390);
  assert.equal(far.rotate, -12);
  assert.equal(far.y, 25);
  // the middle card is always on top
  for (let i = 0; i < 13; i += 1) if (i !== 6) assert.ok(placeCard(i, 13, 6, "phone", 390).z < middle.z);
});

test("desktop fan: every card on one arc that fits the table", () => {
  const first = placeCard(0, 13, 6, "desk", 900);
  const last = placeCard(12, 13, 6, "desk", 900);
  assert.equal(first.x, -last.x);
  assert.ok(last.x + DESK.width / 2 <= 900 / 2, "the last card stays on the table");
  assert.ok(first.rotate < 0 && last.rotate > 0 && placeCard(6, 13, 6, "desk", 900).rotate === 0);
});

test("swipe: rubber band at the ends, a fling carries at most four cards, then it settles on a card", () => {
  assert.equal(rubberBand(3.4, 13), 3.4);
  assert.ok(rubberBand(-5, 13) > -MOTION.rubberBand / PHONE.step - 1e-9 && rubberBand(-5, 13) < 0);
  assert.ok(rubberBand(17, 13) < 12 + MOTION.rubberBand / PHONE.step + 1e-9 && rubberBand(17, 13) > 12);
  assert.equal(flingTarget(6, 0, 13), 6);
  assert.equal(flingTarget(6, -10, 13), 10, "a hard fling to the left moves four cards on");
  assert.equal(flingTarget(6, 10, 13), 2);
  assert.equal(flingTarget(11.6, -10, 13), 12, "never past the last card");
  assert.equal(Number.isInteger(flingTarget(5.3, -0.4, 13)), true);
});

test("timings: 8px before a swipe, 220ms snap, 420ms flight, 240ms pause, 840ms shuffle, 35ms open stagger", () => {
  assert.equal(MOTION.dragThreshold, 8);
  assert.equal(MOTION.snapMs, 220);
  assert.equal(MOTION.momentumMs, 180);
  assert.equal(MOTION.maxFling, 4);
  assert.equal(MOTION.flightMs, 420);
  assert.equal(MOTION.flightEase, "cubic-bezier(.25,.8,.25,1)");
  assert.equal(MOTION.lastPickPauseMs, 240);
  assert.equal(MOTION.shuffleMs, 840);
  assert.equal(MOTION.openStaggerMs, 35);
  assert.deepEqual([0, 6, 12].map((i) => openRank(i, 13)), [6, 0, 6]);
  assert.match(css, /fan4CutLeft 840ms/);
});

test("tap a side card to bring it to the middle; tap the middle card or press Enter to pick", () => {
  assert.match(fan, /if \(mode === "phone" && event\.detail !== 0 && index !== Math\.round\(centre\.current\)\) \{ glideTo\(index\); return; \}/);
  assert.match(fan, /if \(swallowClick\.current\) \{ swallowClick\.current = false; return; \}/, "a swipe never picks");
  assert.match(fan, /tabIndex=\{index === activeIndex \? 0 : -1\}/, "roving tabindex");
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) assert.ok(fan.includes(key), key);
  assert.match(fan, /aria-live="polite"/);
  assert.match(fan, /navigator\.vibrate\?\.\(10\)/);
});

test("the picked card flies into its slot; reduced motion skips the flight and every animation", () => {
  assert.match(fan, /createPortal\(/);
  assert.match(fan, /duration: MOTION\.flightMs, easing: MOTION\.flightEase/);
  assert.match(fan, /if \(reducedMotion\(\)\) \{ setLanded\(next\); onPick\(card\); return; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /touch-action: pan-y/, "vertical page scrolling still works over the fan");
});

test("no double picks: the next pick waits for the flight and for the gap to close (PR #25 review)", () => {
  assert.equal(MOTION.settleMs, 300);
  assert.match(fan, /setMotion\("settling"\);\s*const done = window\.setTimeout\(\(\) => \{ setMotion\(""\); busy\.current = false; \}, MOTION\.settleMs\);/);
  assert.match(fan, /if \(!card \|\| !el \|\| !slot \|\| busy\.current \|\| filled >= positions\.length\) return;\s*busy\.current = true;/);
  assert.match(fan, /onPointerCancel=\{onPointerCancel\}/, "a cancelled swipe settles without a fling");
  assert.match(fan, /swallowClick\.current = true;\s*window\.setTimeout\(\(\) => \{ swallowClick\.current = false; \}, 0\);/, "only the click that ends a swipe is swallowed");
});

test("the fan uses the two-cat back, never the old lattice back-frame", () => {
  assert.ok(!fan.includes('"back-frame"'));
  assert.match(css, /\.fan4-back \{[^}]*url\("\/textures\/card-back\.webp"\)/);
});
