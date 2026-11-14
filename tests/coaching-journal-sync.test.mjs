import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 七日塔羅筆記 × 陪跑, PR B (ChatGPT spec v1 §7): the home journal and /journal switch between notes on
// this device and a round shared with Zola. Consent per round, nothing uploaded by itself, Zola's
// replies shown and marked read, a second tab never silently overwritten, account switches start fresh.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const access = await loadTypescript("lib/membership-access.ts");
const tool = await read("app/journal/journal-tool.tsx");

test("/journal is open like /practice: signed out it shows a note; its data needs the coaching APIs", async () => {
  assert.equal(access.isCoachingPage("/journal"), true);
  assert.equal(access.isCoachingPage("/journal/x"), false);
  assert.equal(access.isCoachingPage("/api/coaching/journal"), false);
  assert.equal(access.isCoachingRoute("/journal"), true, "signed in, /journal skips the VIP lookup");
  const proxy = await read("proxy.ts");
  const pagePass = proxy.indexOf("if (isCoachingPage(request.nextUrl.pathname)) return NextResponse.next();");
  const signIn = proxy.indexOf("return session.redirectToSignIn");
  assert.ok(pagePass > 0 && pagePass < signIn);
  assert.match(proxy, /\|\| isCoachingPage\(request\.nextUrl\.pathname\)\) return NextResponse\.next\(\);/, "also without Clerk (local preview)");
  const gate = await read("app/membership-gate.tsx");
  assert.match(gate, /const isOpenPath = isPublicMembershipPage\(pathname\) \|\| isStudentRoute\(pathname\) \|\| isCoachingRoute\(pathname\);/);
  const page = await read("app/journal/page.tsx");
  assert.match(page, /<JournalTool place="page" \/>/);
  assert.doesNotMatch(page, /coaching-store|getSql/, "the page reads nothing on the server");
  assert.match(tool, /"signed-out": \["這裡是七日陪跑筆記", "由 Zola 開通陪跑後才能使用。已經在陪跑中的話，請先登入。"\]/);
  assert.match(tool, /href="\/sign-in\?redirect_url=%2Fjournal"/);
});

test("consent: a round starts only from the ticked box; nothing on this device is uploaded by itself", () => {
  const start = tool.slice(tool.indexOf("async function startRound()"), tool.indexOf("async function saveSynced()"));
  assert.match(start, /if \(!consent \|\| busy\) return;/);
  assert.match(start, /\{ action: "start", consent: true \}/);
  assert.match(tool, /<input type="checkbox" checked=\{consent\} onChange=\{\(event\) => setConsent\(event\.target\.checked\)\} \/><span>我同意把這一輪的七日筆記同步給 Zola<\/span>/);
  assert.match(tool, /disabled=\{!consent \|\| Boolean\(busy\)\}/);
  // The only writes to the coaching API: start, save (one day, by the member's tap) and stop.
  const posts = [...tool.matchAll(/postJson\("\/api\/coaching\/journal", \{ action: "(\w+)"/g)].map((match) => match[1]);
  assert.deepEqual(posts.sort(), ["save", "start", "stop"]);
  assert.equal((tool.match(/localStorage\.getItem/g) ?? []).length, 1, "local notes are read in one place");
  // A local note reaches a shared round only through 帶入 (into the box, not saved) and then 儲存.
  assert.match(tool, /onClick=\{\(\) => setDrafts\(\(current\) => \(\{ \.\.\.current, \[key\]: \(localNotes\[day\] \?\? ""\)\.trim\(\) \}\)\)\}>帶入這台裝置上的第 \{day \+ 1\} 天筆記<\/button>/);
  assert.match(tool, /這台裝置上原本的筆記不會自動上傳/);
  const save = tool.slice(tool.indexOf("async function saveSynced()"), tool.indexOf("async function stopRound()"));
  assert.match(save, /if \(!round \|\| !editable \|\| busy\) return;/);
  assert.match(tool, /const editable = Boolean\(ready\?\.canWrite && round\?\.shared\);/, "only 陪跑中, only a shared round");
});

test("saving: names the revision it started from; another tab's version is shown, her words kept", () => {
  const save = tool.slice(tool.indexOf("async function saveSynced()"), tool.indexOf("async function stopRound()"));
  assert.match(save, /expectedRevision: entry\?\.revision \?\? null/);
  assert.match(save, /if \(status === 409 && saved\) \{/);
  assert.match(save, /setDrafts\(\(current\) => \(\{ \.\.\.current, \[draftKey\]: syncedText \}\)\);/, "the draft stays");
  assert.match(save, /setConflicts\(\(current\) => \(\{ \.\.\.current, \[draftKey\]: saved\.content \}\)\);/);
  assert.match(tool, /<b>另一個視窗存的版本<\/b>/);
  assert.match(tool, />改用這個版本<\/button>/);
  assert.match(save, /putCycle\(\{ \.\.\.round, shared: false \}\);/, "a round taken back elsewhere turns read-only here");
});

test("replies: shown under the day, 新回覆 while reading, marked read by the owner; outdated replies say so", () => {
  assert.match(tool, /postJson\("\/api\/coaching\/journal\/seen", \{ entryId: unreadId \}\)/);
  assert.match(tool, /const unreadId = mode === "synced" && entry\?\.feedback && entry\.feedbackUnread \? entry\.id : null;/);
  assert.match(tool, /freshReplies\.has\(entry\.id\) \? <i className="js-new">新回覆<\/i>/);
  assert.match(tool, /這則回覆寫於妳修改這一天的筆記之前。/);
  assert.match(tool, /，有新回覆/, "the day buttons say which day has a new reply");
});

test("stopping: a confirm that says what it can and cannot take back; no browser dialog", () => {
  assert.match(tool, /停止同步後，Zola 就看不到這一輪的筆記，也不能再回覆；她先前已經讀過的內容無法收回。妳自己仍看得到這一輪。確定停止嗎？/);
  assert.match(tool, /\{ action: "stop", cycleId: round\.id \}/);
  assert.doesNotMatch(tool, /window\.confirm|confirm\(/);
});

test("account switches start fresh; the home page keeps its device notes under the same key", async () => {
  assert.match(tool, /return <JournalBody key=\{identityKey \?\? "loading"\} place=\{place\} waiting=\{identityKey === null\} \/>;/);
  assert.match(tool, /export const JOURNAL_STORAGE_KEY = "zolacoco-journal-notes-v1";/);
  const home = await read("app/page.tsx");
  assert.match(home, /\{exploreTool === "journal" && <JournalTool place="home" \/>\}/);
  assert.doesNotMatch(home, /JOURNAL_STORAGE_KEY|saveJournal|journalNotes/, "the journal lives in one component");
  assert.match(tool, /筆記會保存在目前使用的手機或電腦瀏覽器中，重新開啟網站仍可繼續查看，不會公開顯示。/, "the device note is unchanged");
  assert.match(tool, /同步的筆記存在 Zolacoco 的會員資料庫，只有妳和 Zola 看得到；這台裝置上的筆記不會自動上傳。/);
  assert.match(tool, /\["同步給 Zola", "只存在這台裝置"\]|>同步給 Zola<\/button>[\s\S]*>只存在這台裝置<\/button>/);
});

test("where notes live is said plainly: 我的存檔 and the member centre", async () => {
  const archive = await read("app/admin/page.tsx");
  assert.match(archive, /title: "七日內在筆記（這台裝置）"/);
  assert.match(archive, /唯一的例外是陪跑筆記：妳在陪跑中勾選「同步給 Zola」的那幾輪，存在 Zolacoco 的會員資料庫，只有妳和 Zola 看得到，不在這份備份裡/);
  assert.match(archive, /<Link href="\/journal">七日陪跑筆記<\/Link>/);
  const account = await read("app/account/account-view.tsx");
  assert.match(account, /const coaching = stage === "admin" \|\| \(member\.is_coaching === true && stage !== "suspended"\);/);
  assert.match(account, /href="\/journal"><b>七日陪跑筆記<\/b>/);
});

test("phones: the journal fits 320px; colours stay pearl", async () => {
  const css = await read("app/journal/journal-sync.css");
  assert.match(css, /\.tool-stage:has\(> \.journal-tool\) \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(css, /\.day-picker button \{ flex: 1 1 0; min-width: 0; max-width: 34px; height: auto; aspect-ratio: 1 \/ 1; padding: 0; \}/);
  for (const selector of [".js-mode button {", ".js-link {", ".js-danger {", ".js-round select {", ".js-check {"]) {
    const rule = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)));
    assert.match(rule, /min-height: 44px/, `${selector} is a 44px target`);
  }
  const palette = new Set(["#263449", "#33445f", "#843450", "#c5a46f", "#e4d6e0", "#e8f2fc", "#fceaf3", "#b9c7d8", "#b4405f", "#ffffff", "#fdf8fb", "#f3f8fd"]);
  for (const hex of css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) assert.ok(palette.has(hex.toLowerCase()), hex);
});
