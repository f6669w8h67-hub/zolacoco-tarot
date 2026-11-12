import assert from "node:assert/strict";
import test from "node:test";
import {
  QUESTION_LIMIT, SPREADS, cleanQuestion, consultMessage, memberExpiryLabel, newRecordId,
  recommendedSpread, spreadAfterTopicChange, spreadsForTopic, tarotRecord,
} from "../lib/tarot-reading.ts";

test("relationship spread is offered only for 感情 and 人際", () => {
  for (const topic of ["感情", "人際"]) assert.deepEqual(spreadsForTopic(topic).map((s) => s.id), ["healing", "timeline", "relationship"]);
  for (const topic of ["工作", "金錢", "創業", "今日指引"]) assert.deepEqual(spreadsForTopic(topic).map((s) => s.id), ["healing", "timeline"]);
  assert.equal(SPREADS.find((s) => s.id === "relationship").name, "關係探索牌陣");
});

test("each topic has the spread ChatGPT recommended", () => {
  assert.equal(recommendedSpread("感情"), "relationship");
  assert.equal(recommendedSpread("人際"), "relationship");
  for (const topic of ["工作", "金錢", "創業"]) assert.equal(recommendedSpread(topic), "timeline");
  assert.equal(recommendedSpread("今日指引"), "healing");
});

test("changing topic keeps a member's own choice only while it is still offered", () => {
  assert.equal(spreadAfterTopicChange("工作", "healing", false), "timeline");
  assert.equal(spreadAfterTopicChange("工作", "healing", true), "healing");
  // The relationship spread disappears for 金錢, so fall back to the recommendation.
  assert.equal(spreadAfterTopicChange("金錢", "relationship", true), "timeline");
  assert.equal(spreadAfterTopicChange("感情", "timeline", true), "timeline");
});

test("questions are trimmed and capped at 200 characters without rewriting", () => {
  assert.equal(cleanQuestion("  他最近忽冷忽熱？ "), "他最近忽冷忽熱？");
  assert.equal([...cleanQuestion("問".repeat(250))].length, QUESTION_LIMIT);
});

test("consult message follows the agreed template and carries no contact data", () => {
  const text = consultMessage({
    topic: "感情", spreadName: "關係探索牌陣", question: "",
    cards: [{ id: "cups-13", name: "聖杯皇后", position: "我的內在狀態" }, { id: "cups-08", name: "聖杯八", position: "對方目前的狀態" }],
  });
  assert.match(text, /^你好 Zola ✨/);
  assert.match(text, /我的問題：尚未填寫/);
  assert.match(text, /我的內在狀態｜聖杯皇后\n對方目前的狀態｜聖杯八/);
  assert.match(text, /請問目前可以如何預約呢？$/);
  assert.equal(/@|Email|ID：/.test(text), false);
});

test("records get a unique id, the question and card ids", () => {
  const now = Date.parse("2026-11-12T10:00:00+08:00");
  const record = tarotRecord({ question: " 我該怎麼面對？ ", topic: "感情", spread: "關係探索牌陣", cards: [{ id: "cups-13", name: "聖杯皇后", position: "我的內在狀態", keywords: "", truth: "", action: "" }] }, now, () => 0.5);
  assert.match(record.id, /^tarot-/);
  assert.equal(record.question, "我該怎麼面對？");
  assert.equal(record.cards[0].id, "cups-13");
  assert.equal(record.created_at, "2026-11-12T02:00:00.000Z");
  assert.notEqual(newRecordId(now, () => 0.1), newRecordId(now, () => 0.2));
});

test("member expiry is shown as YYYY/MM/DD in Taipei", () => {
  assert.equal(memberExpiryLabel("2026-12-11T16:30:00Z"), "2026/12/12");
  assert.equal(memberExpiryLabel(null), null);
  assert.equal(memberExpiryLabel("nope"), null);
});
