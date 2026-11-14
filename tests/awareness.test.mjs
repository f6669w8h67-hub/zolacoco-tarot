import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

// Zolacoco 覺察卡 (/awareness): 50 cards, 蝦蝦 art, shuffle and flip, member-only answers.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const deck = JSON.parse(await read("app/awareness/awareness-cards.json"));
const records = await import("../lib/awareness-records.ts");
const data = await import("../lib/awareness-lines.ts");

test("50 cards in seven groups (8×6 + 2), each with a line, reading, question and practice", () => {
  assert.equal(deck.cards.length, 50);
  assert.equal(new Set(deck.cards.map((card) => card.id)).size, 50);
  const counts = Object.fromEntries(deck.themes.map((theme) => [theme.key, deck.cards.filter((card) => card.theme === theme.key).length]));
  assert.deepEqual(counts, { acceptance: 8, defusion: 8, present: 8, self: 8, values: 8, action: 8, pearl: 2 });
  deck.cards.forEach((card, index) => {
    assert.equal(card.number, String(index + 1).padStart(2, "0"));
    for (const field of ["name", "line", "reading", "question", "practice"]) assert.ok(card[field]?.trim(), `${card.id} ${field}`);
    assert.ok(card.reading.length >= 70 && card.reading.length <= 130, `${card.id} reading length ${card.reading.length}`);
    assert.equal(card.reading.includes("你"), false, card.id);
  });
});

test("every card has its 蝦蝦 art and the shared back, as small webp files", async () => {
  for (const name of [...deck.cards.map((card) => card.number), "back", "entry"]) {
    const info = await stat(new URL(`../public/awareness/${name}.webp`, import.meta.url));
    assert.ok(info.size > 5_000 && info.size < 120_000, `${name}.webp ${info.size}`);
  }
});

test("who may write: admin, or active with time left; pending, expired and signed-out only read", () => {
  const now = Date.parse("2026-11-14T08:00:00Z");
  assert.equal(records.awarenessAccess({ role: "admin" }, now), "member");
  assert.equal(records.awarenessAccess({ role: "member", effective_status: "active", access_expires_at: "2026-11-20T00:00:00Z" }, now), "member");
  assert.equal(records.awarenessAccess({ role: "member", effective_status: "active", access_expires_at: "2026-11-01T00:00:00Z" }, now), "expired");
  assert.equal(records.awarenessAccess({ role: "member", effective_status: "active", access_expires_at: null }, now), "expired");
  assert.equal(records.awarenessAccess({ role: "member", effective_status: "pending" }, now), "pending");
  assert.equal(records.awarenessAccess({ role: "member", effective_status: "suspended" }, now), "expired");
  assert.equal(records.awarenessAccess(null, now), "guest");
});

test("records: one list per member id, no duplicates when saving the same draw again, unreadable data ignored", () => {
  assert.equal(records.recordsKey("m-1"), "zolacoco-awareness-records-v1:m-1");
  const base = { deck: "zolacoco-awareness", cardId: "awareness-01", cardNumber: "01", theme: "acceptance", name: "留一張椅子", line: "x", question: "q", practice: "p" };
  const first = { ...base, id: "d1", createdAt: "2026-11-14T01:00:00Z", answer: "a", completed: false };
  let list = records.upsertRecord([], first);
  list = records.upsertRecord(list, { ...first, answer: "改過", completed: true });
  assert.equal(list.length, 1);
  assert.equal(list[0].answer, "改過");
  list = records.upsertRecord(list, { ...first, id: "d2" });
  assert.deepEqual(list.map((item) => item.id), ["d2", "d1"]);
  assert.deepEqual(records.removeRecord(list, "d2").map((item) => item.id), ["d1"]);
  assert.deepEqual(records.parseRecords("not json"), []);
  assert.deepEqual(records.parseRecords(JSON.stringify([{ nope: 1 }, first])).map((item) => item.id), ["d1"]);
});

test("share file name uses the Taiwan date", () => {
  assert.equal(records.shareFileName("07", new Date("2026-11-14T17:30:00Z")), "zolacoco-awareness-07-2026-11-15.png");
});

test("page: public, shuffle then flip one card, no fan; the face shows the ACT line, not a name or number", async () => {
  const page = await read("app/awareness/page.tsx");
  const membership = await read("lib/membership-access.ts");
  assert.match(membership, /\["\/account", "\/sign-in", "\/sign-up", "\/awareness"\]/);
  assert.match(page, /洗牌，抽一張/);
  assert.doesNotMatch(page, /DrawFan|draw-fan/);
  assert.match(page, /const lines = breakLines\(card\.line, 12\);/);
  assert.match(page, /<span className=\{`aw-ribbon lines-\$\{lines\.length\}`\}>/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /aria-live="polite"/);
  // members write and keep; everyone else gets a note, never the form
  assert.match(page, /access === "member" \? <>\s*<h3>寫下這次的覺察<\/h3>/);
  assert.match(page, /會員尚待 Zola 開通/);
  assert.match(page, /想把這份覺察留下來嗎？/);
  assert.match(page, /href="\/sign-in\?redirect_url=%2Fawareness"/);
  assert.match(page, /我的覺察紀錄/);
  assert.match(page, /type: "awareness_card"/);
});

test("share image: 1080×1920 with the brand handle; 我的存檔 lists 覺察卡 records for the signed-in member", async () => {
  const share = await read("app/awareness/share-card.ts");
  assert.match(share, /SHARE_WIDTH = 1080/);
  assert.match(share, /SHARE_HEIGHT = 1920/);
  assert.match(share, /BRAND_HANDLE = "@zolacoco_tarot"/);
  const admin = await read("app/admin/page.tsx");
  assert.match(admin, /\{ key: AWARENESS_RECORDS_PREFIX, title: "Zolacoco 覺察卡紀錄", href: "\/awareness"/);
  assert.match(admin, /source\.key === AWARENESS_RECORDS_PREFIX \? \(memberId \? recordsKey\(memberId\) : null\) : source\.key/);
  const header = await read("app/site-header.tsx");
  assert.match(header, /\{ href: "\/awareness", title: "Zolacoco 覺察卡"/);
});

test("覺察卡 page colours stay pearl: only the site palette, no browns or dark grounds", async () => {
  const css = await read("app/awareness/awareness.css");
  const palette = new Set(["#263449", "#33445f", "#843450", "#c5a46f", "#e4d6e0", "#e8f2fc", "#fceaf3", "#b9c7d8", "#b4405f", "#ffffff"]);
  for (const hex of css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) assert.ok(palette.has(hex.toLowerCase()), hex);
  assert.match(css, /\.aw-foot \{[^}]*background: none;/, "the global beige footer is not used here");
});

test("card sentences break into balanced lines: after a comma when possible, never inside 「」, no line starts with 。」", () => {
  assert.deepEqual(data.breakLines("撐傘不是為了讓雨停，是為了繼續走。", 12), ["撐傘不是為了讓雨停，", "是為了繼續走。"]);
  assert.deepEqual(data.breakLines("妳是天空，情緒只是天氣。", 12), ["妳是天空，情緒只是天氣。"]);
  assert.deepEqual(data.breakLines("說「不」，是為了對真正重要的事說「好」。", 12), ["說「不」，是為了", "對真正重要的事說「好」。"]);
  assert.deepEqual(data.breakLines("在關係裡想成為怎樣的人，由妳決定。", 12), ["在關係裡想成為", "怎樣的人，由妳決定。"]);
  for (const max of [12, 13]) {
    for (const card of deck.cards) {
      const lines = data.breakLines(card.line, max);
      assert.equal(lines.join(""), card.line, card.id);
      for (const line of lines) {
        assert.ok(line.length <= max || lines.length === 1, `${card.id} ${line}`);
        assert.doesNotMatch(line, /^[，、。：；？！」』）]/, `${card.id} ${line}`);
        assert.equal((line.match(/「/g) || []).length, (line.match(/」/g) || []).length, `${card.id} ${line}`);
      }
      if (lines.length > 1) assert.ok(lines.at(-1).length >= 3, `${card.id} short last line ${lines.at(-1)}`);
    }
  }
});
