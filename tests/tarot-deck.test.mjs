import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { cardLabel, tarotCards } from "../app/tarot-data.ts";

const publicDir = new URL("../public", import.meta.url).pathname;

test("the deck has all 78 cards: 22 major and 14 per suit", () => {
  assert.equal(tarotCards.length, 78);
  const bySuit = Object.groupBy(tarotCards, (card) => card.suit);
  assert.equal(bySuit.major.length, 22);
  for (const suit of ["wands", "cups", "swords", "pentacles"]) assert.equal(bySuit[suit].length, 14, suit);
});

test("every card has unique id, name and art, and complete text", () => {
  for (const key of ["id", "name", "en", "art"]) assert.equal(new Set(tarotCards.map((card) => card[key])).size, 78, key);
  for (const card of tarotCards) {
    for (const field of ["name", "en", "numeral", "keywords", "scene", "truth", "blindSpot", "action"]) {
      assert.ok(String(card[field]).trim(), `${card.id}.${field}`);
    }
    assert.equal(card.keywords.split("・").length, 3, `${card.id} keywords`);
    assert.ok(existsSync(publicDir + card.art), `${card.id} image ${card.art}`);
    assert.equal(/你/.test(JSON.stringify(card)), false, `${card.id} uses 你`);
  }
});

test("card face labels do not repeat the court title", () => {
  const label = (id) => cardLabel(tarotCards.find((card) => card.id === id));
  assert.equal(label("major-08"), "VIII · STRENGTH");
  assert.equal(label("cups-13"), "QUEEN OF CUPS");
  assert.equal(label("pentacles-12"), "KNIGHT OF PENTACLES");
  assert.equal(label("swords-03"), "III · THREE OF SWORDS");
});
