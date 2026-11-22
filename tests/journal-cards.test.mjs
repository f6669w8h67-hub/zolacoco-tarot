import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 七日塔羅筆記 draws new cards every round (Zola 2026-11-22: 「七日塔羅日記記得要換牌 不要都一樣」).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const cards = await loadTypescript("lib/journal-cards.ts");
const prompts = await loadTypescript("lib/journal-prompts.ts");
const responses = await loadTypescript("lib/journal-responses.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));
const ALL = Array.from({ length: 78 }, (_, index) => `card-${index}`);

test("a round draws seven different cards, and keeps them", () => {
  const first = plain(cards.drawJournalCards("round:a", ALL));
  assert.equal(first.length, 7);
  assert.equal(new Set(first).size, 7, "no card twice in one round");
  assert.deepEqual(plain(cards.drawJournalCards("round:a", ALL)), first, "the same round always shows the same seven");
});

test("different rounds draw different cards", () => {
  const rounds = Array.from({ length: 30 }, (_, index) => plain(cards.drawJournalCards(`round:${index}`, ALL)).join(","));
  assert.ok(new Set(rounds).size >= 29, "rounds are not all the same");
  const firstDays = new Set(Array.from({ length: 30 }, (_, index) => plain(cards.drawJournalCards(`round:${index}`, ALL))[0]));
  assert.ok(firstDays.size >= 15, "day 1 is not always the same card");
});

test("rounds begun before the change keep the original seven", () => {
  assert.deepEqual(plain(cards.drawJournalCards(cards.ORIGINAL_DECK, ALL)), plain(prompts.journalCardIds));
  assert.equal(cards.roundDeckSeed({ id: "old", startedAt: "2026-11-20T08:00:00Z" }), cards.ORIGINAL_DECK);
  assert.equal(cards.roundDeckSeed({ id: "new", startedAt: "2026-11-23T02:00:00Z" }), "round:new");
  assert.match(cards.newDeviceDeckSeed(), /^device:/);
});

test("the reply that names the original card is only used with that card", () => {
  const none = Array(7).fill(false);
  const original = responses.journalResponse(1, "今天很平靜", [true, ...none.slice(1)], 1, true);
  const drawn = responses.journalResponse(1, "今天很平靜", [true, ...none.slice(1)], 1, false);
  assert.equal(drawn.reply, responses.JOURNAL_RESPONSES[0].replies[1]);
  for (const day of [1, 2, 3, 4, 5, 6, 7]) {
    const reply = responses.journalResponse(day, `第${day}天`, Array(7).fill(false), 1, false).reply;
    for (const name of ["聖杯皇后", "寶劍八", "力量牌", "聖杯六", "錢幣四", "星星在", "世界牌"]) assert.equal(reply.includes(name), false, `${day} ${name}`);
  }
  assert.ok(original.reply === responses.JOURNAL_RESPONSES[0].replies[0] || original.reply === responses.JOURNAL_RESPONSES[0].replies[1]);
  assert.equal(cards.isOriginalCard(1, "cups-13"), true);
  assert.equal(cards.isOriginalCard(1, "major-00"), false);
});

test("the journal tool uses the round's cards, and a device can start a new round", async () => {
  const tool = await read("app/journal/journal-tool.tsx");
  assert.match(tool, /const deck = drawJournalCards\(mode === "synced" \? round \? roundDeckSeed\(round\) : ORIGINAL_DECK : deviceSeed, ALL_CARD_IDS\);/);
  assert.match(tool, /const card = tarotCards\.find\(\(item\) => item\.id === deck\[day\]\)/);
  assert.match(tool, /isOriginalCard\(day \+ 1, deck\[day\]\)/);
  assert.equal(tool.includes("journalCardIds"), false);
  assert.match(tool, /const seed = started \? ORIGINAL_DECK : newDeviceDeckSeed\(\);/, "someone part-way through keeps her cards");
  assert.match(tool, /這台裝置上的七天筆記和七日回顧會清空，換七張新的牌重新開始。確定嗎？/);
  assert.match(tool, /localStorage\.setItem\(JOURNAL_DECK_KEY, seed\);/);
});

// PR #55 review (Blocking 3): starting a new round on a device is all or nothing.
function fakeStore(initial, failOn = {}) {
  const data = new Map(Object.entries(initial));
  let calls = 0;
  return {
    data,
    getItem(key) { if (failOn.get?.(key)) throw new Error("blocked"); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { calls++; if (failOn.set?.(key, calls)) throw new Error("full"); data.set(key, String(value)); },
    removeItem(key) { if (failOn.remove?.(key)) throw new Error("blocked"); data.delete(key); },
  };
}
const KEYS = { notes: "n", review: "r", deck: "d" };
const OLD = { n: JSON.stringify({ 0: "第一天" }), r: JSON.stringify({ local: { a: 1 }, "member:x": { b: 2 } }), d: "device:old" };

test("a new device round clears the notes and this device's 回顧, keeps other 回顧, and stores the new seed", () => {
  const store = fakeStore(OLD);
  assert.equal(cards.restartDeviceRound(store, "device:new", KEYS), true);
  assert.equal(store.data.has("n"), false);
  assert.deepEqual(JSON.parse(store.data.get("r")), { "member:x": { b: 2 } });
  assert.equal(store.data.get("d"), "device:new");
});

test("if any step fails, notes, 回顧 and cards are all put back and nothing changes", () => {
  for (const failOn of [
    { set: (key) => key === "d" },                 // the new seed cannot be stored
    { set: (key) => key === "r" },                 // the 回顧 cannot be rewritten
    { remove: (key) => key === "n" },              // the notes cannot be removed
  ]) {
    const store = fakeStore(OLD, failOn);
    assert.equal(cards.restartDeviceRound(store, "device:new", KEYS), false);
    assert.deepEqual(Object.fromEntries(store.data), OLD);
  }
  const unreadable = fakeStore(OLD, { get: () => true });
  assert.equal(cards.restartDeviceRound(unreadable, "device:new", KEYS), false);
  assert.deepEqual(Object.fromEntries(unreadable.data), OLD);
});

test("a write that does not read back counts as a failure", () => {
  const store = fakeStore(OLD);
  store.setItem = function (key, value) { if (key !== "d") this.data.set(key, String(value)); };   // the seed is silently dropped
  assert.equal(cards.restartDeviceRound(store, "device:new", KEYS), false);
  assert.deepEqual(Object.fromEntries(store.data), OLD);
});

test("an unreadable 回顧 store does not block a new round", () => {
  const store = fakeStore({ ...OLD, r: "{broken" });
  assert.equal(cards.restartDeviceRound(store, "device:new", KEYS), true);
  assert.equal(store.data.get("r"), "{broken");
  assert.equal(store.data.has("n"), false);
});

test("the journal only shows a new round when the device kept it, and says so when it did not", async () => {
  const tool = await read("app/journal/journal-tool.tsx");
  assert.match(tool, /if \(!kept\) \{ setRestartFailed\(true\); return; \}\n    setLocalNotes\(\{\}\); setSavedLocal\(\{\}\); setDeviceSeed\(seed\);/);
  assert.match(tool, /無法開始新的一輪，原有的筆記和牌都沒有變更。/);
  assert.equal(cards.roundDeckSeed({ id: "x", startedAt: null }), cards.ORIGINAL_DECK, "no start time: keep the original seven");
  assert.ok(cards.DRAWN_CARDS_FROM >= Date.parse("2026-11-23T00:00:00+08:00"), "new cards start no earlier than the deploy");
});
