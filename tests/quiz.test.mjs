import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 心理測驗 on the site (Zola 2026-11-22): every IG quiz goes up here at its IG time; each keeps its own look;
// a quiz is free for its first 24 hours (今天的三篇), older ones need a free account; after reading, LINE.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const quiz = await loadTypescript("lib/quiz.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));

test("三選一 codes are the file name, and each opens at its IG time (01 07:00, 02 11:20, 03 17:20)", () => {
  assert.deepEqual(plain(quiz.abcCodeInfo("2026112201")), { ymd: "2026-11-22", slot: 1, publishAt: "2026-11-21T23:00:00.000Z" });
  assert.equal(quiz.abcCodeInfo("2026112202").publishAt, "2026-11-22T03:20:00.000Z");
  assert.equal(quiz.abcCodeInfo("2026112203").publishAt, "2026-11-22T09:20:00.000Z");
  assert.equal(quiz.abcCodeInfo("2026112204").publishAt, null, "a fourth of the day has no set time: Zola picks one");
  assert.equal(quiz.abcCodeInfo("2026113201"), null, "no 32 November");
  assert.equal(quiz.abcCodeInfo("20261122"), null);
});

test("第一眼 quizzes are named by month/day and serial; the year is the nearest one", () => {
  const late = new Date("2026-11-22T06:00:00Z");
  assert.deepEqual(plain(quiz.firstSightCode("12/2", 1, late)), { code: "F2026120201", ymd: "2026-12-02", slot: 1, publishAt: "2026-12-01T23:00:00.000Z" });
  assert.equal(quiz.firstSightCode("1/5", 2, new Date("2026-12-28T06:00:00Z")).code, "F2027010502", "a January quiz made in December is next year's");
  assert.equal(quiz.firstSightCode("13/1", 1, late), null);
  assert.equal(quiz.isQuizCode("F2026120201"), true);
  assert.equal(quiz.isQuizCode("2026112201"), true);
  assert.equal(quiz.isQuizCode("X2026112201"), false);
});

test("the A～D text gives the title, the three readings and the hook", () => {
  const text = [
    "【A｜IG貼文文案】", "他最近忽冷忽熱", "妳該｜主動｜還是等？", "", "共鳴引言。", "", "直覺選一組", "留言我傳解析給你！", "", "#感情 #塔羅", "",
    "【B｜完整解析（LINE）】", "A. 第一段 🌙", "收尾。", "", "B. 第二段。", "", "C. 第三段。", "",
    "想知道他接下來怎麼做，歡迎留言告訴我妳的困擾和年齡，我會再補充給妳看。", "",
    "【C｜留言後自動私訊（GoSky，代碼：2026112201）】", "追蹤後…", "", "【D｜公開留言回覆（5則）】", "1. …",
  ].join("\n");
  const parsed = plain(quiz.parseAbcCaption(text));
  assert.equal(parsed.title, "他最近忽冷忽熱 妳該主動還是等？");
  assert.deepEqual(parsed.analysis, { A: "第一段 🌙\n收尾。", B: "第二段。", C: "第三段。" });
  assert.equal(parsed.hook, "想知道他接下來怎麼做，歡迎留言告訴我妳的困擾和年齡，我會再補充給妳看。");
});

const DOT = "data:image/png;base64,iVBORw0KGgo=";
const firstSightHtml = `<html><script>window.EMBED=${JSON.stringify({
  main: DOT, blur: DOT, ratio: 1.2496,
  state: { theme: "letter", date: "12/2", serial: 1, c1title: "妳｜第一眼｜看到什麼？", c1sub: "那就是妳 12 月最需要的訊息", lineUrl: "https://lin.ee/6iPii8m",
    objs: ["月亮", "黑貓", "提燈", "鑰匙"].map((name, i) => ({ name, x: 20 + i * 20, y: 30, s: 20, hint: `${name}提示`, text: `🌙 這代表\n${name}的解析`, line: `${name}金句` })) },
})};</script>
<script>const LETTER_BG="${DOT}";
const DEFAULT = {
  theme:"letter", date:"12/1", serial:1,
  hook:"💬 想知道這件事接下來會怎麼走？\\n直接回覆我這三件事", capTags:"#塔羅占卜",
};</script></html>`;

test("a 第一眼測驗 HTML file carries the whole quiz, the template's default hook included", () => {
  const found = quiz.readGeneratorHtml(firstSightHtml);
  assert.equal(found.kind, "first-sight");
  assert.equal(found.paper, DOT);
  const state = plain(quiz.firstSightFromState(found.state, found.embed.ratio));
  assert.equal(state.ok, true);
  assert.equal(state.title, "妳第一眼看到什麼？");
  assert.equal(state.theme, "letter");
  assert.equal(state.hook, "💬 想知道這件事接下來會怎麼走？\n直接回覆我這三件事", "a hook left at the default still comes along");
  assert.equal(state.lineUrl, "https://lin.ee/6iPii8m", "each quiz keeps its own LINE");
  assert.deepEqual(state.objects.map((o) => o.name), ["月亮", "黑貓", "提燈", "鑰匙"]);
  assert.equal(quiz.firstSightFromState({ ...found.state, objs: found.state.objs.slice(0, 3) }, 1.25).ok, false, "four things or nothing");
});

test("a 三選一 generator HTML gives its code, rainbow colour and A～D text", () => {
  const html = `<script>const DL_CONFIG = { prefix: '2026112202', zip: true };\nlet COLOR = 'navygold';</script>
    <textarea id="i_caption">【A｜IG貼文文案】\n標題一\n標題｜二｜\n\n【B｜完整解析（LINE）】\nA. 甲 &amp; 乙\n\nB. 丙\n\nC. 丁</textarea>`;
  const found = plain(quiz.readGeneratorHtml(html));
  assert.deepEqual({ kind: found.kind, code: found.code, color: found.color }, { kind: "abc", code: "2026112202", color: "indigo" });
  assert.equal(quiz.parseAbcCaption(found.caption).analysis.A, "甲 & 乙");
  assert.equal(quiz.readGeneratorHtml("<html>nothing</html>"), null);
});

test("the round close-up shows the same piece of the painting as the generator's circle()", () => {
  // generator (D=120): background-size 600×749.76px at -459px -116.2px for the cat at x 86.5, y 23.5, s 20
  const D = 120, ratio = 1.2496, o = { x: 86.5, y: 23.5, s: 20 };
  const got = quiz.lens(o, ratio);
  const [w, h] = got.backgroundSize.split(" ").map(parseFloat);
  const [px, py] = got.backgroundPosition.split(" ").map(parseFloat);
  const W = D * w / 100, H = D * h / 100;
  assert.ok(Math.abs(W - 600) < 0.5 && Math.abs(H - 749.76) < 0.5);
  assert.ok(Math.abs((D - W) * px / 100 - -459) < 0.5);
  assert.ok(Math.abs((D - H) * py / 100 - -116.2) < 0.6);
});

test("a quiz is free for its first 24 hours, then needs a free account; drafts and future ones never show", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  assert.equal(quiz.isFreeQuiz("2026-11-22T03:20:00Z", now), true);
  assert.equal(quiz.isFreeQuiz("2026-11-21T12:00:01Z", now), true);
  assert.equal(quiz.isFreeQuiz("2026-11-21T11:59:59Z", now), false);
  assert.equal(quiz.isPublished({ status: "scheduled", publishAt: "2026-11-22T13:00:00Z" }, now), false, "not before its time");
  assert.equal(quiz.isPublished({ status: "draft", publishAt: "2026-11-20T00:00:00Z" }, now), false);
});

test("after reading: the LINE message carries the whole title, the pick and what it said (Zola 2026-11-22)", () => {
  const abc = { kind: "abc", code: "2026112201", title: "他最近忽冷忽熱 妳該主動還是等？", data: { analysis: {
    A: "a", C: "c",
    B: "這段關係還差一個對的時機 ⏳ 妳的心已經往前走了一步。\n\n先照顧好自己的生活。想知道他接下來會怎麼做，歡迎留言告訴我妳的困擾和年齡。",
  } } };
  assert.equal(quiz.quizMessage(abc, "B"), [
    "我剛剛在網站完成心理測驗 2026112201",
    "題目：他最近忽冷忽熱 妳該主動還是等？",
    "我選到：B｜這段關係還差一個對的時機 ⏳ 妳的心已經往前走了一步。\n先照顧好自己的生活。",
    "想進一步聊聊我的狀況。",
  ].join("\n"), "the hook that speaks to her is left out");

  const sight = { kind: "first-sight", code: "F2026120201", title: "妳第一眼看到什麼？", data: {
    subtitle: "那就是妳 12 月最需要的訊息",
    objects: [{ name: "黑貓", hint: "有個秘密在等妳揭開", line: "真相不可怕，猜測才累人。", text: "…" }],
  } };
  assert.equal(quiz.quizMessage(sight, "黑貓"), [
    "我剛剛在網站完成心理測驗 F2026120201",
    "題目：妳第一眼看到什麼？那就是妳 12 月最需要的訊息",
    "我第一眼看到：黑貓｜有個秘密在等妳揭開。真相不可怕，猜測才累人。",
    "想進一步聊聊我的狀況。",
  ].join("\n"));

  const long = "今天的妳值得被好好對待。".repeat(30);
  const cut = quiz.messageContent(long);
  assert.ok(cut.endsWith("。…") && Array.from(cut).length <= 181, "a long reading stops at a sentence end");
  const moons = quiz.messageContent("🌙".repeat(200));
  assert.equal(Array.from(moons).length, 181);
  assert.doesNotMatch(moons, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/, "no emoji is cut in half");
});

test("on the site the hook asks her to message Zola, not to comment (Zola 2026-11-23); the stored IG text is untouched", async () => {
  const hook = "想知道他接下來會不會鼓起勇氣，歡迎留言告訴我妳的困擾和年齡，我會再針對妳的狀況補充給妳看。";
  assert.equal(quiz.siteWording(hook), "想知道他接下來會不會鼓起勇氣，歡迎私訊告訴我妳的困擾和年齡，我會再針對妳的狀況補充給妳看。");
  assert.equal(quiz.siteWording("留言跟我說，也可以留言給我。\n再留言告訴我一次"), "私訊跟我說，也可以私訊給我。\n再私訊告訴我一次", "every ask on the page");
  assert.equal(quiz.siteWording("👉 直覺選一組\n留言我傳解析給你！"), "👉 直覺選一組\n留言我傳解析給你！", "other uses of 留言 stay as written");
  assert.equal(quiz.siteWording("在留言區告訴我"), "在留言區告訴我");
  assert.equal(quiz.siteWording(""), "");

  // the LINE message still leaves the hook out, whichever way it is worded
  const reading = "他刪掉的訊息，可能是想約妳出來。\n說開的話，才不會一直卡在心裡。\n想知道他什麼時候會真的約妳，歡迎私訊告訴我妳的困擾和年齡，我會再針對妳的狀況補充給妳看。";
  assert.equal(quiz.messageContent(reading), "他刪掉的訊息，可能是想約妳出來。\n說開的話，才不會一直卡在心裡。");

  // where the page shows the reading and the hook, it goes through siteWording
  const abc = await read("app/quizzes/[code]/abc-quiz.tsx");
  assert.match(abc, /function paragraphs\(text: string\) \{\n\s*return siteWording\(text\)/);
  const sight = await read("app/quizzes/[code]/first-sight-quiz.tsx");
  assert.match(sight, /function sections\(text: string\) \{\n\s*return siteWording\(text\)/);
  const cta = await read("app/quizzes/[code]/quiz-line-cta.tsx");
  assert.match(cta, /<p className="qz-cta-hook">\{siteWording\(hook\)\}<\/p>/);
});

test("after reading: every link to Zola's own LINE opens with the message typed in; another LINE opens as it is", async () => {
  const message = "我剛剛在網站完成心理測驗 2026112201";
  const typedIn = { href: `https://line.me/R/oaMessage/@903ijdgr/?${encodeURIComponent(message)}`, prefilled: true, open: "https://lin.ee/tchILJk" };
  for (const zola of ["https://lin.ee/tchILJk", "https://lin.ee/XIi2Nam", "https://lin.ee/sPw8XmU/", "https://lin.ee/6iPii8m", "https://line.me/R/ti/p/@903ijdgr", "https://line.me/ti/p/%40903ijdgr"]) {
    assert.deepEqual(plain(quiz.quizLineLink(zola, message)), typedIn, zola);
  }
  for (const other of ["https://lin.ee/6iPii8mx", "https://lin.ee/tchILJkx", "https://line.me/R/ti/p/@someoneelse", "http://lin.ee/tchILJk", "https://evil.example/lin.ee/tchILJk"]) {
    assert.deepEqual(plain(quiz.quizLineLink(other, message)), { href: other, prefilled: false, open: other }, other);
  }
  const cta = await read("app/quizzes/[code]/quiz-line-cta.tsx");
  assert.match(cta, /prefilled \? `會帶上題目/, "only a typed-in message is described as typed in");
  assert.match(cta, /不會自動帶入訊息/, "otherwise the page says so and shows the message to copy");
  assert.match(cta, /複製這段訊息/);
});

test("what the admin page sends is checked before it is saved", () => {
  const img = (n) => `https://abc.public.blob.vercel-storage.com/quizzes/x/${n}.webp`;
  const base = { code: "2026112201", title: "標題", publishAt: "2026-11-21T23:00:00.000Z", status: "scheduled" };
  const abc = { ...base, kind: "abc", tone: "red", data: { cards: [1, 2, 3, 4, 5].map(img), choices: [], analysis: { A: "a", B: "b", C: "c" }, hook: "h" } };
  const ok = quiz.parseQuizInput(abc);
  assert.equal(ok.ok, true);
  assert.equal(ok.quiz.data.lineUrl, "https://lin.ee/tchILJk");
  assert.match(quiz.parseQuizInput({ ...abc, data: { ...abc.data, cards: [img(1)] } }).error, /五張/);
  assert.match(quiz.parseQuizInput({ ...abc, data: { ...abc.data, analysis: { A: "a", B: "", C: "c" } } }).error, /三段解析/);
  assert.equal(quiz.parseQuizInput({ ...abc, status: "draft", data: { ...abc.data, analysis: { A: "a", B: "", C: "c" } } }).ok, true, "a draft may be unfinished");
  assert.match(quiz.parseQuizInput({ ...abc, data: { ...abc.data, cards: [1, 2, 3, 4, 5].map(() => "javascript:alert(1)") } }).error, /五張/);
  assert.match(quiz.parseQuizInput({ ...abc, code: "123" }).error, /代碼/);
  const fs = { ...base, code: "F2026120201", kind: "first-sight", tone: "dark", data: { painting: img("p"), ratio: 1.25, subtitle: "s", hook: "h", lineUrl: "https://evil.example/x",
    objects: ["a", "b", "c", "d"].map((name) => ({ name, x: 10, y: 10, s: 20, hint: "h", text: "t", line: "l" })) } };
  const fsOk = quiz.parseQuizInput(fs);
  assert.equal(fsOk.ok, true);
  assert.equal(fsOk.quiz.data.lineUrl, "https://lin.ee/tchILJk", "only a LINE address is kept");
  assert.match(quiz.parseQuizInput({ ...fs, code: "2026120201" }).error, /F/);
});

test("the quiz pages are open to everyone; older readings never leave the server for someone signed out", async () => {
  const access = await loadTypescript("lib/membership-access.ts");
  assert.equal(access.isPublicMembershipPage("/quizzes"), true);
  assert.equal(access.isPublicMembershipPage("/quizzes/2026112201"), true);
  for (const path of ["/api/quizzes", "/api/quizzes/admin", "/api/quizzes/admin/image"]) assert.equal(access.isMembershipServiceRoute(path), true, path);
  const page = await read("app/quizzes/[code]/page.tsx");
  assert.match(page, /if \(!isFreeQuiz\(quiz\.publishAt\) && !\(await isSignedIn\(\)\)\) return <QuizLocked quiz=\{quizSummary\(quiz\)\} \/>;/);
  const store = await read("lib/quiz-store.ts");
  assert.equal((store.match(/status = 'scheduled' AND publish_at <= now\(\)/g) ?? []).length, 3, "every public read checks the time on the server");
  assert.match(store, /process\.env\.NODE_ENV !== "development" \|\| !file/, "the preview file is never read in production");
  for (const route of ["app/api/quizzes/admin/route.ts", "app/api/quizzes/admin/image/route.ts"]) {
    const source = await read(route);
    assert.equal((source.match(/await requireAdmin\(\);/g) ?? []).length >= 1, true, route);
  }
  const image = await read("app/api/quizzes/admin/image/route.ts");
  assert.match(image, /const SLOTS = \/\^\(card\[1-5\]\|choice\[ABC\]\|painting\|blur\|paper\)\$\//);
  assert.match(image, /const MAX_BYTES = 4 \* 1024 \* 1024;/);
});

test("每一篇的美編不一樣: a first-sight quiz takes its backdrop, paper and accent from itself", async () => {
  const view = await read("app/quizzes/[code]/first-sight-quiz.tsx");
  assert.match(view, /className=\{`quiz-page quiz-one qz-fs fs-\$\{quiz\.tone\}`\}/);
  assert.match(view, /"--fs-accent": theme\.accent, "--fs-paper": quiz\.data\.paper/);
  assert.match(view, /backgroundImage: `url\("\$\{quiz\.data\.blur \?\? quiz\.data\.painting\}"\)`/);
  const css = await read("app/quizzes/quizzes.css");
  for (const theme of [".fs-letter", ".fs-light", ".fs-dark"]) assert.ok(css.includes(theme), theme);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

/* ---------- 心理測驗統計 (Zola 2026-11-26: 有多少人做完測驗，後台也要顯示) ---------- */

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600e3).toISOString();
const abcQuiz = (publishAt) => ({ code: "2026112601", kind: "abc", title: "t", tone: "purple", publishAt, status: "scheduled", data: {} });
const sightQuiz = (publishAt) => ({ code: "F2026120201", kind: "first-sight", title: "t", tone: "letter", publishAt, status: "scheduled",
  data: { objects: ["月亮", "花", "鑰匙", "貓"].map((name) => ({ name })) } });

test("統計: only a known quiz, a known kind of count and one of its picks get through; totals add up by quiz and pick", () => {
  assert.deepEqual(plain(quiz.parseQuizCount({ code: "2026112601", event: "read", choice: "B" })), { code: "2026112601", event: "read", choice: "B" });
  assert.deepEqual(plain(quiz.parseQuizCount({ code: "F2026120201", event: "line", choice: "月亮" })), { code: "F2026120201", event: "line", choice: "月亮" });
  for (const bad of [null, "x", {}, { code: "20261126", event: "read", choice: "A" }, { code: "2026112601", event: "view", choice: "A" },
    { code: "2026112601", event: "read", choice: "" }, { code: "2026112601", event: "read", choice: "x".repeat(41) }, { code: "2026112601", event: "read", choice: 1 }]) {
    assert.equal(quiz.parseQuizCount(bad), null, JSON.stringify(bad));
  }
  assert.deepEqual(plain(quiz.quizChoiceKeys(abcQuiz(hoursAgo(1)))), ["A", "B", "C"]);
  assert.deepEqual(plain(quiz.quizChoiceKeys(sightQuiz(hoursAgo(1)))), ["月亮", "花", "鑰匙", "貓"]);

  const stats = plain(quiz.tallyQuizCounts([
    { code: "2026112601", event: "read", choice: "A", n: 5, created_at: "2026-11-26T03:00:00Z" },
    { code: "2026112601", event: "read", choice: "B", n: "4", created_at: "2026-11-26T02:00:00Z" },
    { code: "2026112601", event: "line", choice: "B", n: 2, created_at: "2026-11-26T04:00:00Z" },
    { code: "F2026120201", event: "read", choice: "貓", n: 1, created_at: "2026-11-27T01:00:00Z" },
    { code: "2026112601", event: "other", choice: "A", n: 9 },
    { code: "2026112601", event: "read", choice: "C", n: 0 },
  ]));
  assert.equal(stats.since, "2026-11-26T02:00:00.000Z", "since the first count");
  assert.deepEqual(stats.quizzes["2026112601"], { read: 9, line: 2, reads: { A: 5, B: 4 }, lines: { B: 2 } });
  assert.deepEqual(stats.quizzes.F2026120201, { read: 1, line: 0, reads: { 貓: 1 }, lines: {} });
  assert.deepEqual(plain(quiz.tallyQuizCounts([])), { since: null, quizzes: {} });
});

async function countRoute({ quiz: found = abcQuiz(hoursAgo(2)), userId = null, role = "member", clerk = true, fail = false } = {}) {
  const counted = [];
  const route = await loadTypescript("app/api/quizzes/count/route.ts", { mocks: {
    "@clerk/nextjs/server": { auth: async () => ({ userId }) },
    "@/lib/quiz-store": {
      getPublishedQuiz: async (code) => (found && found.code === code ? found : null),
      countQuizEvent: async (count) => { if (fail) throw new Error("db down"); counted.push(plain(count)); },
    },
    "@/lib/membership": { getSql: () => async () => [{ role }] },
    "@/lib/membership-access": { isClerkConfigured: () => clerk },
  } });
  return { route, counted };
}
const send = (body) => ({ text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

test("統計 /api/quizzes/count: a visitor's reading or LINE tap adds one; nothing else does", async () => {
  let { route, counted } = await countRoute();
  let response = await route.POST(send({ code: "2026112601", event: "read", choice: "B" }));
  assert.equal(response.status, 200);
  assert.deepEqual(plain(await response.json()), { counted: true });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await route.POST(send({ code: "2026112601", event: "line", choice: "B" }))).status, 200);
  assert.deepEqual(counted, [{ code: "2026112601", event: "read", choice: "B" }, { code: "2026112601", event: "line", choice: "B" }]);

  for (const [body, status] of [
    [{ code: "2026112601", event: "read", choice: "D" }, 400],
    [{ code: "2026112602", event: "read", choice: "A" }, 404],
    [{ code: "2026112601", event: "view", choice: "A" }, 400],
    ["not json", 400],
    ["", 400],
    [JSON.stringify({ code: "2026112601", event: "read", choice: "A", pad: "x".repeat(700) }), 400],
  ]) {
    ({ route, counted } = await countRoute());
    assert.equal((await route.POST(send(body))).status, status, String(body).slice(0, 60));
    assert.equal(counted.length, 0, "turned away before the database");
  }

  // an older quiz: a visitor could not have opened it, someone signed in could
  ({ route, counted } = await countRoute({ quiz: abcQuiz(hoursAgo(30)) }));
  assert.equal((await route.POST(send({ code: "2026112601", event: "read", choice: "A" }))).status, 403);
  assert.equal(counted.length, 0);
  ({ route, counted } = await countRoute({ quiz: abcQuiz(hoursAgo(30)), userId: "user_1" }));
  assert.equal((await route.POST(send({ code: "2026112601", event: "read", choice: "A" }))).status, 200);
  assert.equal(counted.length, 1);

  // Zola's own visits are not counted
  ({ route, counted } = await countRoute({ userId: "user_zola", role: "admin" }));
  response = await route.POST(send({ code: "2026112601", event: "read", choice: "C" }));
  assert.deepEqual([response.status, plain(await response.json())], [200, { counted: false }]);
  assert.equal(counted.length, 0);

  // a 第一眼 quiz counts by the thing she saw first
  ({ route, counted } = await countRoute({ quiz: sightQuiz(hoursAgo(1)) }));
  assert.equal((await route.POST(send({ code: "F2026120201", event: "read", choice: "鑰匙" }))).status, 200);
  assert.equal((await route.POST(send({ code: "F2026120201", event: "read", choice: "A" }))).status, 400);
  assert.deepEqual(counted, [{ code: "F2026120201", event: "read", choice: "鑰匙" }]);

  ({ route } = await countRoute({ fail: true }));
  assert.equal((await route.POST(send({ code: "2026112601", event: "read", choice: "A" }))).status, 503);
});

test("統計 on the page: once per phone per quiz, only when she opens a reading or taps 私訊; never her identity", async () => {
  const counter = await loadTypescript("app/quizzes/[code]/quiz-count.ts");
  const stored = new Map();
  const sent = [];
  const deps = { storage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) }, send: async (body) => sent.push(JSON.parse(body)) };
  counter.countOnce("2026112601", "read", "A", deps);
  counter.countOnce("2026112601", "read", "B", deps);
  counter.countOnce("2026112601", "line", "A", deps);
  assert.deepEqual(sent, [{ code: "2026112601", event: "read", choice: "A" }, { code: "2026112601", event: "line", choice: "A" }], "a second reading of the same quiz is not counted");
  const again = await loadTypescript("app/quizzes/[code]/quiz-count.ts"); // a new visit, same phone
  again.countOnce("2026112601", "read", "C", deps);
  assert.equal(sent.length, 2, "the phone remembers");
  const blocked = await loadTypescript("app/quizzes/[code]/quiz-count.ts");
  blocked.countOnce("2026112602", "read", "A", { storage: { getItem() { throw new Error("blocked"); }, setItem() {} }, send: async (body) => sent.push(JSON.parse(body)) });
  blocked.countOnce("2026112602", "read", "A", { storage: undefined, send: async (body) => sent.push(JSON.parse(body)) });
  assert.equal(sent.length, 3, "blocked storage still counts this visit once");
  blocked.countOnce("2026112603", "read", "A", { storage: undefined, send: async () => { throw new Error("offline"); } });
  blocked.countOnce("2026112603", "line", "A", { storage: undefined, send: () => { throw new Error("no fetch here"); } });
  assert.equal(sent.length, 3, "a failed send is quiet and never breaks the page");

  const abc = await read("app/quizzes/[code]/abc-quiz.tsx");
  assert.equal((abc.match(/countOnce\(/g) ?? []).length, 1);
  assert.match(abc, /setRevealed\(choice\);\n\s*countOnce\(quiz\.code, "read", choice\);/, "counted when she opens the reading, not for a shared ?choice= link");
  const sight = await read("app/quizzes/[code]/first-sight-quiz.tsx");
  assert.equal((sight.match(/countOnce\(/g) ?? []).length, 1);
  assert.match(sight, /setPicked\(index\);\n\s*countOnce\(quiz\.code, "read", objects\[index\]\.name\);/);
  const cta = await read("app/quizzes/[code]/quiz-line-cta.tsx");
  assert.match(cta, /const counted = \(\) => countOnce\(code, "line", choice\);/);
  assert.equal((cta.match(/onClick=\{counted\}/g) ?? []).length, 2, "both ways to LINE are counted");
  const helper = await read("app/quizzes/[code]/quiz-count.ts");
  assert.match(helper, /keepalive: true/);
  assert.equal(/cookie|userId|email/i.test(helper.replace(/^\/\/.*$/gm, "")), false, "nothing about the visitor is sent");

  const access = await loadTypescript("lib/membership-access.ts");
  assert.equal(access.isMembershipServiceRoute("/api/quizzes/count"), true, "visitors reach it; it checks everything itself");
  const store = await read("lib/quiz-store.ts");
  assert.match(store, /CREATE TABLE IF NOT EXISTS quiz_counts \(\n\s*code text NOT NULL REFERENCES quizzes \(code\) ON DELETE CASCADE,/);
  assert.match(store, /ON CONFLICT \(code, event, choice\) DO UPDATE SET n = quiz_counts\.n \+ 1, updated_at = now\(\)/);
});

test("統計 in Zola's list: the admin list carries every quiz's numbers; each public quiz shows them", async () => {
  const stats = { since: "2026-11-26T02:00:00.000Z", quizzes: { "2026112601": { read: 3, line: 1, reads: { A: 2, C: 1 }, lines: { A: 1 } } } };
  const route = await loadTypescript("app/api/quizzes/admin/route.ts", { mocks: {
    "@vercel/blob": { del: async () => {} },
    "@/lib/quiz-store": { listAllQuizzes: async () => [abcQuiz(hoursAgo(2))], quizStats: async () => stats, deleteQuiz: async () => null, quizImages: () => [], saveQuiz: async () => null },
    "@/lib/membership": { requireAdmin: async () => ({ role: "admin" }), membershipErrorResponse: () => Response.json({ error: "FORBIDDEN" }, { status: 403 }) },
  } });
  const body = plain(await (await route.GET()).json());
  assert.equal(body.quizzes.length, 1);
  assert.deepEqual(body.stats, stats);

  const page = await read("app/zola-admin/quizzes/page.tsx");
  assert.match(page, /setStats\(data\.stats \?\? null\);/);
  assert.match(page, /\{live && stats \? <QuizNumbers quiz=\{quiz\} tally=\{stats\.quizzes\[quiz\.code\]\} \/> : null\}/);
  assert.match(page, /看完 <b>\{tally\.read\}<\/b> 人<\/span>・\{picks\}・<span className="qa-nowrap">按私訊 <b>\{tally\.line\}<\/b> 人/);
  assert.match(page, /同一支手機看同一篇只算一次；妳自己登入時看的不算。/);
});
