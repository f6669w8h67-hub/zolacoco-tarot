import assert from "node:assert/strict";
import test from "node:test";
import {
  QUESTION_LIMIT, SPREADS, cleanQuestion, consultMessage, memberExpiryLabel, newRecordId,
  recommendedSpread, relationshipLens, spreadAfterTopicChange, spreadForTopic, spreadsForTopic, tarotRecord,
} from "../lib/tarot-reading.ts";

const TOPICS = ["感情", "人際", "工作", "金錢", "創業", "今日指引"];

test("every topic offers all three spreads, including 關係探索牌陣 (owner decision, #12)", () => {
  for (const topic of ["感情", "人際", "工作", "金錢", "創業", "今日指引"]) assert.deepEqual(spreadsForTopic(topic).map((s) => s.id), ["healing", "timeline", "relationship"]);
  assert.equal(SPREADS.find((s) => s.id === "relationship").name, "關係探索牌陣");
});

test("all 18 topic × spread combinations have named positions (spec v2 acceptance)", () => {
  const expected = {
    感情: ["我的狀態", "對方的狀態", "關係課題"],
    人際: ["我的狀態", "對方的狀態", "關係課題"],
    工作: ["我的立場", "相關人物或環境", "合作課題"],
    金錢: ["我的資源與選擇", "外部條件", "資源平衡課題"],
    創業: ["我的準備", "市場與合作因素", "發展課題"],
    今日指引: ["我的內在狀態", "外界的影響", "今天的核心課題"],
  };
  let combos = 0;
  for (const topic of TOPICS) {
    for (const { id } of spreadsForTopic(topic)) {
      const spread = spreadForTopic(id, topic);
      combos += 1;
      assert.equal(spread.positions.length, id === "healing" ? 1 : 3, `${topic} ${id}`);
      for (const position of spread.positions) assert.ok(position.trim(), `${topic} ${id} position`);
      if (id === "relationship") {
        assert.deepEqual(spread.positions, expected[topic], topic);
        assert.equal(spread.sub, expected[topic].join("・"));
      }
    }
  }
  assert.equal(combos, 18);
});

test("relationship readings never claim to know the other person's mind", () => {
  for (const topic of TOPICS) {
    for (const index of [0, 1, 2]) {
      const lens = relationshipLens(topic, index);
      assert.ok(lens.trim(), `${topic} ${index}`);
      assert.equal(/其實(想|愛|在乎)|心裡(想|在)|真正的心意是|一定會/.test(lens), false, `${topic} ${index}: ${lens}`);
    }
  }
  assert.equal(relationshipLens("未知主題", 0), relationshipLens("今日指引", 0));
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
  // A member who picked the relationship spread keeps it on any topic.
  assert.equal(spreadAfterTopicChange("金錢", "relationship", true), "relationship");
  assert.equal(spreadAfterTopicChange("金錢", "relationship", false), "timeline");
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
  assert.equal(tarotRecord({ question: "", topic: "工作", spread: "關係探索牌陣", spreadId: "relationship", cards: [] }, now, () => 0.5).spread_id, "relationship");
  assert.equal(record.created_at, "2026-11-12T02:00:00.000Z");
  assert.notEqual(newRecordId(now, () => 0.1), newRecordId(now, () => 0.2));
});

test("member expiry is shown as YYYY/MM/DD in Taipei", () => {
  assert.equal(memberExpiryLabel("2026-12-11T16:30:00Z"), "2026/12/12");
  assert.equal(memberExpiryLabel(null), null);
  assert.equal(memberExpiryLabel("nope"), null);
});
