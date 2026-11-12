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
