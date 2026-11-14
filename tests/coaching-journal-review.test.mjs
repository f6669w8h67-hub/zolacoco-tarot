import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 七日塔羅筆記 × 陪跑, PR C (ChatGPT spec v1 §6): after seven written days (any order, any dates) a
// 七日回顧 with her answers, two boxes of her own and a LINE message that carries her notes only when
// she ticks 附上 and has read the summary.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const review = await loadTypescript("lib/journal-review.ts");
const tool = await read("app/journal/journal-tool.tsx");

test("seven days means seven different days with words, not seven calendar days in a row", () => {
  assert.equal(review.isSevenDaysWritten(["a", "b", "c", "d", "e", "f", "g"]), true);
  assert.equal(review.isSevenDaysWritten(["a", "b", "c", "d", "e", "f", "  "]), false, "a blank day does not count");
  assert.equal(review.isSevenDaysWritten(["a", "b", "c", "d", "e", "f"]), false);
  assert.equal(review.isSevenDaysWritten(["a", "b", undefined, "d", "e", "f", "g"]), false);
  // the journal checks saved notes (device) or the round's notes (synced), never dates
  assert.match(tool, /const complete = \(!synced \|\| Boolean\(round\)\) && isSevenDaysWritten\(reviewDays\.map\(\(item\) => item\.answer\)\);/);
  assert.match(tool, /answer: synced \? item\?\.content \?\? "" : savedLocal\[index\] \?\? "",/, "unsaved words in the box do not count");
});

test("LINE: the wish to book by default; her notes only when ticked, only the summary she can read", () => {
  const plain = review.reviewMessage({ coaching: false, attach: false, highlights: "我最常注意到的事情：忍耐" });
  assert.equal(plain, "Zola 妳好 ✨\n我剛剛完成了 Zolacoco Tarot 的七日內在筆記，想了解正式陪跑的內容與安排方式。\n\n想請問目前有哪些陪跑方案，以及適合怎麼開始，謝謝妳。");
  assert.doesNotMatch(plain, /忍耐/, "nothing private unless ticked");
  const attached = review.reviewMessage({ coaching: false, attach: true, highlights: " 我最常注意到的事情：忍耐 " });
  assert.match(attached, /\n\n我的筆記重點：\n我最常注意到的事情：忍耐\n\n想請問/);
  assert.equal(review.reviewMessage({ coaching: false, attach: true, highlights: "  " }), plain, "ticked but empty adds nothing");
  const coaching = review.reviewMessage({ coaching: true, attach: false, highlights: "" });
  assert.match(coaching, /我完成了這一輪的七日陪跑筆記，想和妳約下一次的陪跑時間。/);
  const long = review.reviewMessage({ coaching: false, attach: true, highlights: "字".repeat(900) });
  assert.ok(long.length < 800, "the summary is capped, so the LINE link stays short");
  assert.equal(review.defaultHighlights({ noticed: " 忍耐 ", direction: "" }), "我最常注意到的事情：忍耐");
  assert.equal(review.defaultHighlights({ noticed: "", direction: "說出需要" }), "我想繼續探索的方向：說出需要");
  assert.equal(review.defaultHighlights({ noticed: "", direction: "" }), "");
});

test("the review: answers, two boxes of her own words, 附上 unticked each time, a preview before LINE", () => {
  const part = tool.slice(tool.indexOf("function SevenDayReview("));
  assert.match(part, /const \[attach, setAttach\] = useState\(false\);/);
  assert.match(tool, /<SevenDayReview key=\{synced && round \? round\.id : "local"\}/, "opened fresh for each round");
  assert.match(part, /<span>我最常注意到的事情<\/span>/);
  assert.match(part, /<span>我想繼續探索的方向<\/span>/);
  assert.match(part, /用妳自己的話寫下來就好/, "guided, never filled in for her");
  assert.match(part, /<span>附上我的筆記重點<\/span>/);
  assert.match(part, /\{attach \? <label className="js-field"><span>要附上的重點（可以修改）<\/span>/);
  assert.match(part, /<pre className="js-preview">\{message\}<\/pre>/);
  assert.match(part, /href=\{lineMessageUrl\(message\)\} target="_blank" rel="noreferrer"/);
  assert.match(part, /七天的筆記原文不會附上/);
  assert.match(part, /這兩欄只存在這台裝置。/);
  assert.doesNotMatch(part, /fetch\(|postJson\(/, "the review sends nothing to the server");
  assert.match(tool, /localStorage\.setItem\(JOURNAL_REVIEW_KEY,/);
  assert.match(tool, /\{complete \? <CompleteBanner onOpen=\{\(\) => setView\("review"\)\} \/> : null\}/);
});

test("the way on fits who she is: 陪跑 rounds offer the next round and the next session", () => {
  assert.match(tool, /coaching=\{synced && Boolean\(ready\?\.canWrite\)\}/);
  const part = tool.slice(tool.indexOf("function SevenDayReview("));
  assert.match(part, /想繼續陪跑，可以在上方開始新的一輪，也可以傳 LINE 和 Zola 約下一次陪跑。/);
  assert.match(part, /\{coaching \? "傳 LINE 約下一次陪跑" : "傳 LINE 預約 Zola 陪跑"\}/);
  // A finished shared round leaves no open round, so the consent card for the next one shows above.
  assert.match(tool, /const showConsent = mode === "synced" && Boolean\(ready\?\.canWrite\) && !openRound;/);
});

test("pearl and phone-sized", async () => {
  const css = await read("app/journal/journal-sync.css");
  for (const selector of [".js-complete {", ".js-review {", ".js-next {", ".js-preview {"]) assert.ok(css.includes(selector), selector);
  assert.match(css, /\.js-preview \{[^}]*white-space: pre-wrap; overflow-wrap: anywhere;/);
  const palette = new Set(["#263449", "#33445f", "#843450", "#c5a46f", "#e4d6e0", "#e8f2fc", "#fceaf3", "#b9c7d8", "#b4405f", "#ffffff", "#fdf8fb", "#f3f8fd"]);
  for (const hex of css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) assert.ok(palette.has(hex.toLowerCase()), hex);
});
