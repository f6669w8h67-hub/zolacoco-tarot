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

test("after reading: every link to Zola's own LINE opens with the code and her pick typed in; another LINE opens as it is", () => {
  const message = quiz.quizMessage({ kind: "abc", code: "2026112201" }, "B");
  assert.equal(message, "我剛剛完成心理測驗 2026112201，選的是 B，想進一步聊聊我的狀況。");
  const sight = quiz.quizMessage({ kind: "first-sight", code: "F2026120201" }, "黑貓");
  assert.equal(sight, "我剛剛完成心理測驗 F2026120201，第一眼看到的是黑貓，想進一步聊聊我的狀況。", "the first-sight message names its code too");

  const typedIn = { href: `https://line.me/R/oaMessage/@903ijdgr/?${encodeURIComponent(message)}`, prefilled: true, open: "https://lin.ee/tchILJk" };
  for (const zola of ["https://lin.ee/tchILJk", "https://lin.ee/XIi2Nam", "https://lin.ee/sPw8XmU/", "https://line.me/R/ti/p/@903ijdgr", "https://line.me/ti/p/%40903ijdgr"]) {
    assert.deepEqual(plain(quiz.quizLineLink(zola, message)), typedIn, zola);
  }
  for (const other of ["https://lin.ee/6iPii8m", "https://lin.ee/tchILJkx", "https://line.me/R/ti/p/@someoneelse", "http://lin.ee/tchILJk", "https://evil.example/lin.ee/tchILJk"]) {
    assert.deepEqual(plain(quiz.quizLineLink(other, message)), { href: other, prefilled: false, open: other }, other);
  }

  const cta = read("app/quizzes/[code]/quiz-line-cta.tsx");
  return cta.then((source) => {
    assert.match(source, /prefilled \? `會帶上測驗代碼/, "only a typed-in message is described as typed in");
    assert.match(source, /不會自動帶入訊息/, "otherwise the page says so and shows the message to copy");
    assert.match(source, /複製這句話/);
  });
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
