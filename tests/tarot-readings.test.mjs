import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tarotCards } from "../app/tarot-data.ts";
import { READING_TOPICS, othersLine, speaksForOthers, synthesisOpening, synthesisParts, topicReading } from "../lib/tarot-synthesis.ts";

// Reading v4 (ChatGPT spec, 2026-11-13): 78 cards × 6 topics of written readings, plus an
// energy note and an outward line per card, stored as JSON in batches.
const FILES = ["major-00-12", "major-13-21", "wands", "cups", "swords", "pentacles"];
const readings = (await Promise.all(FILES.map(async (name) => JSON.parse(await readFile(new URL(`../app/tarot-readings/${name}.json`, import.meta.url), "utf8"))))).flat();
const byId = new Map(readings.map((reading) => [reading.id, reading]));
const length = (text) => text.replace(/\s/g, "").length;
const CONNECTIVES = ["因此", "所以", "這時", "這也", "而這", "而且", "但這", "這樣", "於是", "此外", "同時", "然而", "不過"];
// a card is not a promise: no "the worst is over", no "most people don't really mind" (PR #24 review B2)
const CERTAINTIES = ["正在過去", "大部分的人其實", "一定會好轉", "注定"];

test("every one of the 78 cards has exactly one reading, and nothing else does", () => {
  assert.equal(readings.length, 78);
  assert.equal(byId.size, 78, "no duplicate ids");
  for (const card of tarotCards) assert.ok(byId.has(card.id), `${card.id} has a reading`);
});

// Lengths count every character but whitespace, punctuation included (spec v4: energy 65–90,
// other and outward 45–70, three sentences 110–150). The bounds are exact (PR #24 review B1).
test("energy, other and outward lines are within the agreed lengths; the last two never speak for her", () => {
  for (const reading of readings) {
    assert.ok(length(reading.energy) >= 65 && length(reading.energy) <= 90, `${reading.id} energy ${length(reading.energy)}`);
    for (const field of ["other", "outward"]) {
      assert.ok(length(reading[field]) >= 45 && length(reading[field]) <= 70, `${reading.id} ${field} ${length(reading[field])}`);
      assert.ok(!reading[field].includes("妳"), `${reading.id} ${field} describes what can be seen, not her`);
    }
  }
});

test("each topic reading is three whole sentences of 110–150 characters that can stand alone, never a certainty about others", () => {
  for (const reading of readings) {
    assert.deepEqual(Object.keys(reading.topicReadings).sort(), [...READING_TOPICS].sort(), reading.id);
    for (const topic of READING_TOPICS) {
      const sentences = reading.topicReadings[topic];
      assert.equal(sentences.length, 3, `${reading.id} ${topic}`);
      const total = sentences.reduce((sum, sentence) => sum + length(sentence), 0);
      assert.ok(total >= 110 && total <= 150, `${reading.id} ${topic} is ${total} characters`);
      for (const sentence of sentences) {
        assert.ok(sentence.endsWith("。"), `${reading.id} ${topic} ends with 。: ${sentence}`);
        assert.ok(!CONNECTIVES.some((word) => sentence.startsWith(word)), `${reading.id} ${topic} stands alone: ${sentence}`);
        assert.ok(!CERTAINTIES.some((phrase) => sentence.includes(phrase)), `${reading.id} ${topic} reads a symbol as a certainty: ${sentence}`);
      }
    }
  }
});

test("no sentence is reused anywhere in the deck", () => {
  // every energy, other, outward and topic sentence is unique across all 78 cards
  const seen = new Set();
  for (const reading of readings) {
    for (const text of [reading.energy, reading.other, reading.outward, ...Object.values(reading.topicReadings).flat()]) {
      assert.ok(!seen.has(text), `repeated: ${text}`);
      seen.add(text);
    }
  }
});

const fake = (id) => ({
  id, energy: `${id} energy`, other: `${id} other`, outward: `${id} outward`,
  topicReadings: Object.fromEntries(READING_TOPICS.map((topic) => [topic, [`${id}-${topic}-情境。`, `${id}-${topic}-課題。`, `${id}-${topic}-下一步。`]])),
});
const three = [{ name: "愚人", reading: fake("a") }, { name: "魔術師", reading: fake("b") }, { name: "女祭司", reading: fake("c") }];

test("time flow: past situation, present lesson, next step — whole sentences by position", () => {
  const parts = synthesisParts(three, "timeline", "工作", ["過去留下的影響", "現在需要看見的事", "接下來可以走的一步"]);
  assert.deepEqual(parts.map((part) => part.text), ["a-工作-情境。", "b-工作-課題。", "c-工作-下一步。"]);
  assert.deepEqual(parts.map((part) => part.card), ["愚人", "魔術師", "女祭司"]);
  assert.deepEqual(parts.map((part) => part.label), ["過去留下的影響", "現在需要看見的事", "接下來可以走的一步"]);
});

test("relationship: the second card only describes what can be seen, never another person's heart", () => {
  const parts = synthesisParts(three, "relationship", "感情", ["我的狀態", "對方的狀態", "關係課題"]);
  assert.deepEqual(parts.map((part) => part.text), ["a-感情-情境。", "b other", "c-感情-課題。c-感情-下一步。"]);
  assert.equal(synthesisParts(three, "relationship", "金錢", ["我的資源與選擇", "外部條件", "資源平衡課題"])[1].text, "b outward", "money names outside conditions, not a person");
  assert.deepEqual(["感情", "人際", "工作", "金錢", "創業", "今日指引"].map((topic) => othersLine(fake("x"), topic)), ["x other", "x other", "x other", "x outward", "x outward", "x outward"]);
  assert.equal(speaksForOthers("relationship", 1), true);
  assert.equal(speaksForOthers("relationship", 0), false);
  assert.equal(speaksForOthers("timeline", 1), false);
});

test("one card gets no stitched message, an unknown topic falls back to 今日指引, and openings name the topic", () => {
  assert.deepEqual(synthesisParts(three.slice(0, 1), "healing", "感情", ["此刻的療癒訊息"]), []);
  assert.equal(topicReading(fake("a"), "不存在"), "a-今日指引-情境。a-今日指引-課題。a-今日指引-下一步。");
  assert.match(synthesisOpening("金錢", "timeline"), /^在金錢與資源上/);
  assert.match(synthesisOpening("感情", "relationship"), /^在這段感情裡/);
});

test("the readings load on demand when she shuffles, not with the page", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(!/from "\.\/tarot-readings"/.test(page), "no static import of the readings");
  assert.ok(page.includes('import("./tarot-readings")'), "dynamic import");
  const shuffle = page.slice(page.indexOf("function shuffleDeck("), page.indexOf("function chooseCard("));
  assert.ok(shuffle.includes("loadReadings()"), "shuffleDeck starts loading the readings");
});
