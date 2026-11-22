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
