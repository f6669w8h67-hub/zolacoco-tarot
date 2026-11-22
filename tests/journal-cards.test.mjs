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
  assert.match(tool, /try \{ return deviceDeckSeed\(localStorage\); \} catch \{ return ORIGINAL_DECK; \}/, "someone part-way through keeps her cards (see deviceDeckSeed)");
  assert.match(tool, /這台裝置上的七天筆記和七日回顧會清空，換七張新的牌重新開始。確定嗎？/);
});

// PR #55 review: starting a new round on a device must never lose notes or put them under new cards, even when
// storage keeps failing. Notes and 回顧 live under the round's own keys, so the switch is one write.
function fakeStore(initial, failOn = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem(key) { if (failOn.get?.(key)) throw new Error("blocked"); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { if (failOn.set?.(key)) throw new Error("full"); data.set(key, String(value)); },
    removeItem(key) { if (failOn.remove?.(key)) throw new Error("blocked"); data.delete(key); },
  };
}
const DECK = "zolacoco-journal-deck-v1", REVIEW = "zolacoco-journal-review-v1";
const OLD_SEED = "device:old";
const OLD = {
  [DECK]: OLD_SEED,
  [`zolacoco-journal-notes-v1:${OLD_SEED}`]: JSON.stringify({ 0: "第一天", 6: "第七天" }),
  [REVIEW]: JSON.stringify({ [`local:${OLD_SEED}`]: { a: 1 }, "round-1": { b: 2 } }),
};
// what the journal shows after a reload: the round on the device, and that round's notes and 回顧
function reload(store) {
  const seed = cards.deviceDeckSeed(store, () => "device:fresh");
  const notes = JSON.parse(store.getItem(cards.notesKeyFor(seed)) ?? "{}");
  const review = (JSON.parse(store.getItem(REVIEW) ?? "{}") ?? {})[cards.reviewSlotFor(seed)] ?? null;
  return { seed, notes, review };
}

test("each round keeps its notes and 回顧 under its own keys; the original round keeps the old key", () => {
  assert.equal(cards.notesKeyFor(cards.ORIGINAL_DECK), "zolacoco-journal-notes-v1");
  assert.equal(cards.notesKeyFor("device:x"), "zolacoco-journal-notes-v1:device:x");
  assert.equal(cards.reviewSlotFor(cards.ORIGINAL_DECK), "local");
  assert.equal(cards.reviewSlotFor("device:x"), "local:device:x");
});

test("someone part-way through keeps the original seven; a first visit gets a fresh round; a blocked store stays original", () => {
  const started = fakeStore({ "zolacoco-journal-notes-v1": JSON.stringify({ 0: "寫過了" }) });
  assert.equal(cards.deviceDeckSeed(started, () => "device:fresh"), cards.ORIGINAL_DECK);
  assert.equal(started.data.get(DECK), cards.ORIGINAL_DECK);
  const fresh = fakeStore({});
  assert.equal(cards.deviceDeckSeed(fresh, () => "device:fresh"), "device:fresh");
  assert.equal(cards.deviceDeckSeed(fakeStore({}, { set: () => true }), () => "device:fresh"), cards.ORIGINAL_DECK);
  assert.equal(cards.deviceDeckSeed(fakeStore(OLD), () => "device:fresh"), OLD_SEED, "a kept round is kept");
});

test("a new round: one write switches it, then the old round's notes and 回顧 are tidied away", () => {
  const store = fakeStore(OLD);
  assert.equal(cards.restartDeviceRound(store, OLD_SEED, "device:new", REVIEW), true);
  assert.deepEqual(reload(store), { seed: "device:new", notes: {}, review: null });
  assert.equal(store.data.has(`zolacoco-journal-notes-v1:${OLD_SEED}`), false);
  assert.deepEqual(JSON.parse(store.data.get(REVIEW)), { "round-1": { b: 2 } }, "other rounds' 回顧 stay");
});

test("storage that keeps failing: nothing changes, and after a reload the old notes, 回顧 and cards are all there", () => {
  for (const failOn of [
    { set: () => true },                          // every write fails (storage full), the rollback could not write either
    { set: (key) => key === DECK },               // the round pointer cannot be written
    { get: (key) => key === DECK },               // the pointer cannot be read back
  ]) {
    const store = fakeStore(OLD, failOn);
    assert.equal(cards.restartDeviceRound(store, OLD_SEED, "device:new", REVIEW), false);
    assert.deepEqual(Object.fromEntries(store.data), OLD, "nothing was removed");
    assert.deepEqual(reload(fakeStore(Object.fromEntries(store.data))), { seed: OLD_SEED, notes: { 0: "第一天", 6: "第七天" }, review: { a: 1 } });
  }
});

test("a write that does not read back leaves the old round in place", () => {
  const store = fakeStore(OLD);
  store.setItem = function (key, value) { if (key !== DECK) this.data.set(key, String(value)); };   // silently dropped
  assert.equal(cards.restartDeviceRound(store, OLD_SEED, "device:new", REVIEW), false);
  assert.deepEqual(Object.fromEntries(store.data), OLD);
});

test("if tidying the old round fails, the new round still starts clean and the leftovers are never shown", () => {
  const store = fakeStore(OLD, { remove: () => true, set: (key) => key === REVIEW });
  assert.equal(cards.restartDeviceRound(store, OLD_SEED, "device:new", REVIEW), true);
  assert.deepEqual(reload(store), { seed: "device:new", notes: {}, review: null });
});

test("the journal only shows a new round when the device kept it, and 我的存檔 reads the round she is on", async () => {
  const tool = await read("app/journal/journal-tool.tsx");
  assert.match(tool, /kept = restartDeviceRound\(localStorage, deviceSeed, seed, JOURNAL_REVIEW_KEY\)/);
  assert.match(tool, /if \(!kept\) \{ setRestartFailed\(true\); return; \}\n    setLocalNotes\(\{\}\); setSavedLocal\(\{\}\); setDeviceSeed\(seed\);/);
  assert.match(tool, /無法開始新的一輪，原有的筆記和牌都沒有變更。/);
  assert.match(tool, /localStorage\.setItem\(notesKeyFor\(deviceSeed\), JSON\.stringify\(next\)\)/);
  assert.match(tool, /storeKey=\{synced && round \? round\.id : reviewSlotFor\(deviceSeed\)\}/);
  const admin = await read("app/admin/page.tsx");
  assert.match(admin, /source\.key === JOURNAL_NOTES_KEY \? notesKeyFor\(currentDeckSeed\(\)\) : source\.key/);
  assert.doesNotMatch(admin, /deviceDeckSeed/, "opening the archive never starts a round");
  assert.equal(cards.roundDeckSeed({ id: "x", startedAt: null }), cards.ORIGINAL_DECK, "no start time: keep the original seven");
  assert.ok(cards.DRAWN_CARDS_FROM >= Date.parse("2026-11-23T00:00:00+08:00"), "new cards start no earlier than the deploy");
});
