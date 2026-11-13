import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Regression guard for PR #10 review: every way of starting a new reading must go
// through clearReading(), which also resets the save and copy states.
const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

function body(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`unterminated ${name}`);
}

test("clearReading resets the selection and both status flags", () => {
  const clear = body("clearReading");
  for (const call of ["setSelected([])", "setRevealed(false)", "setSpreadCards([])", 'setTarotSaveState("idle")', 'setConsultCopy("idle")']) {
    assert.ok(clear.includes(call), `clearReading calls ${call}`);
  }
});

test("topic, spread, shuffle and redraw all start a fresh reading", () => {
  for (const name of ["changeTopic", "changeSpread", "shuffleDeck", "reset"]) {
    assert.ok(body(name).includes("clearReading()"), `${name} calls clearReading()`);
  }
  // Nothing else empties the selection on its own (that is how the old bug crept in).
  assert.equal(source.split("setSelected([])").length - 1, 1);
});

test("LINE opens from a real link that only appears after copying finished or failed", () => {
  assert.match(source, /consultCopy === "done" \|\| consultCopy === "failed" \? <li>\s*<a className="flow-button primary-flow" href=\{lineMessageUrl\(consultText\)\}/);
  assert.match(source, /async function copyConsult\(\) \{\s*setConsultCopy\("copying"\);\s*try \{\s*await navigator\.clipboard\.writeText\(consultText\);\s*setConsultCopy\("done"\);/);
});

test("only one soundscape player exists and an unmounted one is not treated as loaded", () => {
  assert.match(source, /loadedSoundscapes\.current\.clear\(\);\s*setMountedSoundscapes\(\[nextSoundscape\]\);/);
  assert.match(source, /if \(!node\) loadedSoundscapes\.current\.delete\(item\);/);
  assert.equal(source.includes("setMountedSoundscapes((current) => [...current"), false);
});

test("draw v4: timers are cancelled on every restart and a pick waits for the fan", async () => {
  const { readFile } = await import("node:fs/promises");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const clear = page.slice(page.indexOf("function clearReading()"), page.indexOf("function shuffleDeck()"));
  assert.ok(clear.includes("drawTimers.current.forEach((timer) => window.clearTimeout(timer));"));
  assert.ok(clear.includes("setFanReady(false);"));
  const pick = page.slice(page.indexOf("function commitPick("), page.indexOf("function reset()"));
  assert.ok(pick.includes("if (!fanReady || selected.length >= activeSpread.positions.length) return;"));
  assert.ok(pick.includes("MOTION.lastPickPauseMs"), "the last card rests in its slot before the spread turns over");
  assert.equal(/window\.setTimeout/.test(page.slice(page.indexOf("function shuffleDeck()"), page.indexOf("function reset()"))), false, "draw flow uses the cancellable later()");
  assert.ok(page.includes("<DrawFan key={seed} cards={spreadCards} positions={activeSpread.positions} pickedCount={selected.length} ready={fanReady} deal={seed} onPick={commitPick} />"));
  for (const gone of ["chooseCard", "exitingCardId", "mobileFanStyle", "selection-progress", "pick-card"]) assert.ok(!page.includes(gone), `${gone} is gone`);
});

test("reading v4: written readings up front, the three-card message by position, details folded", async () => {
  const { readFile } = await import("node:fs/promises");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(page.includes('className="synthesis core-message synthesis-v4"'));
  assert.ok(page.includes("synthesisParts(synthesisCards, spreadId, topic, activeSpread.positions)"));
  assert.ok(page.includes('<details className="reading-more">'));
  assert.ok(page.includes('className="reading-actions-list"'));
  const unit = page.slice(page.indexOf('<div className="position-reading">'), page.indexOf('<details className="reading-more">'));
  assert.ok(unit.includes("topicReading(reading, topic)"), "the topic reading is open by default");
  assert.ok(unit.includes("reading.outward"), "the card that stands for someone else shows only what can be seen");
  assert.ok(unit.includes("{single ? energy : null}") && unit.includes("{single ? blind : null}"), "one card: energy and blind spot open");
  const folded = page.slice(page.indexOf('<details className="reading-more">'), page.indexOf("</details>", page.indexOf('<details className="reading-more">')));
  for (const part of ["{!single ? energy : null}", "{!single ? blind : null}", "card.scene", "topicLens[topic][card.suit]"]) assert.ok(folded.includes(part), `${part} is folded for three cards`);
});

test("the time-flow overall message names the topic and reads well with any keyword (reading check 2026-11-13)", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const TOPIC_OPENING: Record<string, string> = \{\n  感情: "在這段感情裡",\n  工作: "在工作上",\n  人際: "在人際互動裡",\n  金錢: "在金錢與資源上",\n  創業: "在創業這條路上",\n  今日指引: "今天",\n\};/);
  assert.match(page, /\$\{TOPIC_OPENING\[topic\] \?\? "此刻"\}，過去的「\$\{firstKey\}」可能仍在影響妳；現在最需要看見的是「\$\{secondKey\}」。接下來不必急著得到所有答案，「\$\{third\.name\}」提醒妳留意「\$\{thirdKey\}」，先踏出一小步就好。/);
  assert.doesNotMatch(page, /從 \$\{third\.name\} 的/, "no stray spaces around the card name");
});
