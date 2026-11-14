import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 學員練習室 (step 8, PR A): Zola's students practise reading a card in four steps; answers live in
// Neon; Zola replies from /zola-admin/practice. ChatGPT spec review: student access separate from VIP
// (B1), audited student switch (B2), question versions (B3), feedback never overwritten and the
// server judges the answer (B4), unpublished questions never reach students (B5).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const access = await loadTypescript("lib/membership-access.ts");
const bank = await loadTypescript("lib/practice-bank.ts");
const input = await loadTypescript("lib/practice-input.ts");
const tarot = await loadTypescript("app/tarot-data.ts");

test("B1 student access is separate from VIP months: admin always, a student unless suspended", () => {
  const now = Date.parse("2026-11-14T10:00:00Z");
  const expiredStudent = { role: "member", status: "expired", is_student: true, access_expires_at: "2026-10-01T00:00:00Z" };
  assert.equal(access.hasStudentAccess({ role: "admin" }), true);
  assert.equal(access.hasStudentAccess(expiredStudent), true, "an expired VIP who is a student still practises");
  assert.equal(access.hasStudentAccess({ role: "member", status: "pending", is_student: true }), true);
  assert.equal(access.hasStudentAccess({ role: "member", status: "suspended", is_student: true }), false);
  assert.equal(access.hasStudentAccess({ role: "member", status: "active", is_student: false, access_expires_at: "2027-01-01T00:00:00Z" }), false, "VIP alone is not a student");
  assert.equal(access.hasStudentAccess(undefined), false);
  assert.equal(access.hasMemberAccess(expiredStudent, now), false, "the VIP rule itself is unchanged");
  for (const path of ["/practice", "/api/practice", "/api/practice/check", "/api/practice/admin"]) assert.equal(access.isStudentRoute(path), true, path);
  for (const path of ["/practiced", "/zola-admin/practice", "/api/journal"]) assert.equal(access.isStudentRoute(path), false, path);
});

test("B1 the proxy only asks students to sign in; the practice APIs check the student themselves", async () => {
  const proxy = await read("proxy.ts");
  const signIn = proxy.indexOf("return session.redirectToSignIn");
  const studentPass = proxy.indexOf("if (isStudentRoute(request.nextUrl.pathname)) return NextResponse.next();");
  const vipLookup = proxy.indexOf("SELECT role, status, access_expires_at");
  assert.ok(signIn > 0 && studentPass > signIn && vipLookup > studentPass, "signed in first, then students skip the VIP lookup");
  const gate = await read("app/membership-gate.tsx");
  assert.match(gate, /const isOpenPath = isPublicMembershipPage\(pathname\) \|\| isStudentRoute\(pathname\);/);
  const membership = await read("lib/membership.ts");
  assert.match(membership, /export async function requireStudent\(\) \{\n  const member = await syncCurrentMember\(\);\n  if \(!hasStudentAccess\(member\)\) throw new MembershipError\("NOT_STUDENT", 403\);/);
  for (const file of ["app/api/practice/route.ts", "app/api/practice/check/route.ts", "app/api/practice/seen/route.ts"]) {
    const source = await read(file);
    for (const handler of source.split("export async function").slice(1)) assert.match(handler, /await requireStudent\(\)/, file);
  }
  const admin = await read("app/api/practice/admin/route.ts");
  for (const handler of admin.split("export async function").slice(1)) assert.match(handler, /await requireAdmin\(\)/);
});

test("B2 schema: is_student defaults to false; the audit keeps the value before and after", async () => {
  const membership = await read("lib/membership.ts");
  assert.match(membership, /ALTER TABLE members ADD COLUMN IF NOT EXISTS is_student boolean NOT NULL DEFAULT false/);
  assert.match(membership, /ALTER TABLE member_access_audit ADD COLUMN IF NOT EXISTS previous_student boolean/);
  assert.match(membership, /ALTER TABLE member_access_audit ADD COLUMN IF NOT EXISTS new_student boolean/);
  const store = await read("lib/practice-store.ts");
  assert.match(store, /CONSTRAINT practice_answers_member_question UNIQUE \(member_id, question_id\)/);
  assert.match(store, /question_version integer NOT NULL/);
  assert.match(store, /reviewed_revision integer/);
});

function recordingSql(rowsFor) {
  const calls = [];
  const sql = (strings, ...values) => {
    const text = strings.join("?");
    calls.push({ text, values });
    return Promise.resolve(rowsFor(text, values));
  };
  sql.transaction = () => { throw new Error("the student switch must not use a two-step transaction"); };
  return { sql, calls };
}

async function adminRoute(rowsFor) {
  const recorder = recordingSql(rowsFor);
  const route = await loadTypescript("app/api/membership/admin/route.ts", {
    mocks: {
      "@/lib/membership": {
        getSql: () => recorder.sql,
        requireAdmin: async () => ({ id: "admin-1", email: "zola@example.com", role: "admin" }),
        membershipErrorResponse: () => Response.json({ error: "MEMBERSHIP_SERVICE_ERROR" }, { status: 500 }),
      },
    },
  });
  const post = (body) => route.POST(new Request("https://example.test/api/membership/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { post, calls: recorder.calls };
}

test("B2 the student switch: one statement changes and audits; the same value again changes nothing", async () => {
  const memberId = "11111111-2222-3333-4444-555555555555";
  const current = { id: memberId, role: "member", status: "expired", is_student: false, access_expires_at: "2026-10-01T00:00:00Z" };
  const on = await adminRoute((text) => (text.includes("SELECT * FROM members") ? [{ ...current, is_student: text.includes("role = 'member'") ? false : true }] : []));
  const response = await on.post({ memberId, action: "student", student: true });
  assert.equal(response.status, 200);
  const change = on.calls.find((call) => call.text.includes("UPDATE members SET is_student"));
  assert.ok(change, "the switch is written");
  assert.match(change.text, /WITH updated AS \(/);
  assert.match(change.text, /is_student IS DISTINCT FROM \?/);
  assert.match(change.text, /INSERT INTO member_access_audit \(member_id, admin_email, action, previous_status, new_status, previous_expires_at, new_expires_at, previous_student, new_student, note\)/);
  assert.deepEqual(change.values.slice(-2), [false, true], "audit: before false, after true");

  const same = await adminRoute(() => [{ ...current, is_student: true }]);
  const unchanged = await same.post({ memberId, action: "student", student: true });
  assert.equal((await unchanged.json()).unchanged, true);
  assert.equal(same.calls.some((call) => call.text.includes("UPDATE")), false, "no write, no audit row");

  const bad = await adminRoute(() => [current]);
  assert.equal((await bad.post({ memberId, action: "student", student: "yes" })).status, 400);
});

test("bank: real cards, unique ids, three options with one right answer, scenes from the site deck", () => {
  const cards = new Set(tarot.tarotCards.map((card) => card.id));
  const ids = new Set();
  for (const question of bank.PRACTICE_QUESTIONS) {
    assert.ok(cards.has(question.cardId), question.id);
    assert.ok(!ids.has(question.id), `id ${question.id} is unique`);
    ids.add(question.id);
    assert.ok(Number.isInteger(question.version) && question.version >= 1);
    assert.equal(question.options.length, 3, question.id);
    assert.equal(question.options.filter((option) => option.correct).length, 1, question.id);
    assert.ok(bank.PRACTICE_UNITS.some((unit) => unit.id === question.unit));
  }
  const hermit = bank.PRACTICE_QUESTIONS.find((question) => question.cardId === "major-09");
  assert.doesNotMatch(hermit.options[0].text, /獨自/, "the site's 隱者 has 蝦蝦 beside him");
  for (const unit of ["gateway", "spread"]) assert.equal(bank.PRACTICE_QUESTIONS.some((question) => question.unit === unit), false, `${unit} waits for Zola's material`);
});

test("B5 drafts never reach students; Zola sees them; the page gets no right answers", () => {
  assert.ok(bank.PRACTICE_QUESTIONS.every((question) => question.status === "draft"), "nothing is published before Zola confirms it");
  const student = bank.practiceCatalog(false);
  assert.equal(student.reduce((sum, unit) => sum + unit.questions.length, 0), 0);
  const admin = bank.practiceCatalog(true);
  assert.equal(admin.reduce((sum, unit) => sum + unit.questions.length, 0), bank.PRACTICE_QUESTIONS.length);
  const shown = admin.flatMap((unit) => unit.questions)[0];
  assert.equal(shown.draft, true);
  assert.equal(JSON.stringify(admin).includes("\"correct\""), false);
  assert.equal(JSON.stringify(admin).includes("\"note\""), false);
  assert.equal(bank.visibleQuestion("major-09-a", false), null);
  assert.ok(bank.visibleQuestion("major-09-a", true));
  const judged = bank.judgeChoice(bank.visibleQuestion("major-09-a", true), "b");
  assert.equal(judged.correct, false);
  assert.match(judged.note, /陷阱/);
  assert.equal(bank.judgeChoice(bank.visibleQuestion("major-09-a", true), "z"), null);
});

test("B4 the student's own fields only, checked and trimmed; feedback state for the page", () => {
  const ok = input.parseAnswerBody({ questionId: "major-09-a", observation: " 雪山\r\n提燈 ", reading: "先退一步", choice: "a", revisedReading: "", expectedRevision: null, correct: true, feedback: "hack", member_id: "x" });
  assert.equal(ok.ok, true);
  assert.deepEqual(Object.keys(ok.value).sort(), ["choice", "expectedRevision", "observation", "questionId", "reading", "revisedReading"]);
  assert.equal(ok.value.observation, "雪山\n提燈");
  assert.match(input.parseAnswerBody({ questionId: "q", reading: "  ", choice: "a" }).error, /請先寫下自己的解讀/);
  assert.match(input.parseAnswerBody({ questionId: "q", reading: "字".repeat(2001), choice: "a" }).error, /2000 字以內/);
  assert.equal(input.parseAnswerBody({ questionId: "q", reading: "x", choice: "a", expectedRevision: 0 }).ok, false);
  assert.equal(input.parseAnswerBody({ questionId: "q", reading: "x", choice: "a", expectedRevision: 1.5 }).ok, false);
  assert.equal(input.parseFeedbackBody({ answerId: "not-a-uuid", feedback: "好", expectedRevision: 1 }).ok, false);
  assert.equal(input.parseFeedbackBody({ answerId: "11111111-2222-3333-4444-555555555555", feedback: "好", expectedRevision: null }).ok, false, "a reply names the answer version it read");

  const row = { id: "a1", member_id: "m1", unit: "major", question_id: "major-09-a", question_version: 1, observation: "", reading: "r", choice: "a", correct: true, revised_reading: "", revision: 3, answered_at: "2026-11-14T01:00:00Z", updated_at: "2026-11-14T03:00:00Z", feedback: "很好", feedback_at: "2026-11-14T02:00:00Z", reviewed_revision: 2, feedback_seen_at: null };
  const shown = input.publicAnswer(row);
  assert.equal(shown.feedbackOutdated, true, "replied to revision 2, now at 3");
  assert.equal(shown.feedbackUnread, true);
  assert.equal("member_id" in shown, false);
  assert.equal(input.publicAnswer({ ...row, reviewed_revision: 3, feedback_seen_at: "2026-11-14T02:30:00Z" }).feedbackUnread, false);
});

async function practiceRoute({ member, saveResult, onSave }) {
  let schemaTouched = false;
  const route = await loadTypescript("app/api/practice/route.ts", {
    mocks: {
      "@/lib/membership": {
        requireStudent: async () => { if (!member) throw new Error("NOT_STUDENT"); return member; },
        membershipErrorResponse: (error) => Response.json({ error: error.message }, { status: error.message === "NOT_STUDENT" ? 403 : 500 }),
      },
      "@/lib/practice-store": {
        ensurePracticeSchema: async () => { schemaTouched = true; },
        listAnswers: async () => [],
        saveAnswer: async (...args) => { onSave?.(...args); return saveResult; },
      },
    },
  });
  const post = (body) => route.POST(new Request("https://example.test/api/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { route, post, touched: () => schemaTouched };
}

const savedRow = { id: "11111111-2222-3333-4444-555555555555", member_id: "m1", unit: "major", question_id: "major-09-a", question_version: 1, observation: "", reading: "r", choice: "b", correct: false, revised_reading: "", revision: 1, answered_at: "2026-11-14T01:00:00Z", updated_at: "2026-11-14T01:00:00Z", feedback: null, feedback_at: null, reviewed_revision: null, feedback_seen_at: null };

test("API: not a student → 403; a student cannot see or save a draft; nothing touches the database", async () => {
  const nobody = await practiceRoute({ member: null });
  assert.equal((await nobody.route.GET()).status, 403);
  const student = await practiceRoute({ member: { id: "m1", role: "member", is_student: true } });
  const list = await (await student.route.GET()).json();
  assert.equal(list.access, "student");
  assert.equal(list.units.reduce((sum, unit) => sum + unit.questions.length, 0), 0);
  const response = await student.post({ questionId: "major-09-a", reading: "x", choice: "a" });
  assert.equal(response.status, 404);
  assert.equal(student.touched(), true, "GET prepared the table; the refused POST did not save");
});

test("API B4: the server judges the choice (a page saying correct:true is ignored); a stale save is a 409", async () => {
  let saved;
  const zola = await practiceRoute({ member: { id: "admin-1", role: "admin" }, saveResult: { ok: true, answer: savedRow }, onSave: (memberId, value, expected) => { saved = { memberId, value, expected }; } });
  const response = await zola.post({ questionId: "major-09-a", reading: "  先退一步 ", choice: "b", correct: true, expectedRevision: null });
  assert.equal(response.status, 200);
  assert.equal(saved.memberId, "admin-1");
  assert.equal(saved.value.correct, false, "b is a trap; the server says so");
  assert.equal(saved.value.reading, "先退一步");
  assert.equal(saved.value.questionVersion, 1);
  assert.equal(saved.expected, null);

  const stale = await practiceRoute({ member: { id: "admin-1", role: "admin" }, saveResult: { ok: false, current: { ...savedRow, revision: 4 } } });
  const conflict = await stale.post({ questionId: "major-09-a", reading: "x", choice: "a", expectedRevision: 2 });
  assert.equal(conflict.status, 409);
  const body = await conflict.json();
  assert.equal(body.answer.revision, 4, "the page gets the newer answer back");
  assert.match(body.error, /另一個視窗/);
  assert.equal((await stale.post({ questionId: "major-09-a", reading: "x", choice: "z" })).status, 400);
});

test("feedback is Zola's: a reply records the answer revision it read; a changed answer is a 409", async () => {
  const store = await read("lib/practice-store.ts");
  assert.match(store, /SET feedback = \$\{feedback\}, feedback_at = now\(\), reviewed_revision = revision, feedback_seen_at = NULL\n        WHERE id = \$\{answerId\} AND revision = \$\{expectedRevision\}/);
  const save = store.slice(store.indexOf("export async function saveAnswer"), store.indexOf("/** Only the owner"));
  assert.doesNotMatch(save, /feedback/, "a student's save never writes Zola's feedback");
  assert.match(save, /AND revision = \$\{expectedRevision\}/);
  assert.match(save, /ON CONFLICT ON CONSTRAINT practice_answers_member_question DO NOTHING/);
  assert.match(store, /WHERE id = \$\{answerId\} AND member_id = \$\{memberId\} AND feedback_at IS NOT NULL/, "only the owner marks a reply as read");

  let conflictRow = { ...savedRow, revision: 5, feedback: "舊回覆", feedback_at: "2026-11-14T02:00:00Z", reviewed_revision: 4 };
  const route = await loadTypescript("app/api/practice/admin/route.ts", {
    mocks: {
      "@/lib/membership": { requireAdmin: async () => ({ id: "admin-1", role: "admin" }), membershipErrorResponse: () => Response.json({ error: "x" }, { status: 500 }) },
      "@/lib/practice-store": {
        ensurePracticeSchema: async () => {}, listMemberAnswers: async () => [], listStudents: async () => [],
        saveFeedback: async () => ({ ok: false, current: conflictRow }),
      },
    },
  });
  const post = (body) => route.POST(new Request("https://example.test/api/practice/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const response = await post({ answerId: savedRow.id, feedback: "很好", expectedRevision: 4 });
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.answer.changedAfterFeedback, true);
  conflictRow = null;
  assert.equal((await post({ answerId: savedRow.id, feedback: "很好", expectedRevision: 4 })).status, 404);
});

test("pages: /practice gets questions only from the API; account and admin show the way in", async () => {
  const page = await read("app/practice/page.tsx");
  assert.doesNotMatch(page, /practice-bank/, "the bank (drafts, right answers) is never in the page's code");
  assert.match(page, /fetch\("\/api\/practice", \{ cache: "no-store" \}\)/);
  assert.match(page, /postJson\("\/api\/practice\/check"/);
  assert.match(page, /expectedRevision/);
  assert.match(page, /Zola 示範解讀準備中。/);
  assert.match(page, /<PracticeRoom key=\{identityKey \?\? "loading"\}/, "a different account starts a fresh room");
  const account = await read("app/account/account-view.tsx");
  assert.match(account, /const student = stage === "admin" \|\| \(member\.is_student === true && stage !== "suspended"\);/);
  assert.match(account, /href="\/practice"/);
  const admin = await read("app/zola-admin/admin-client.tsx");
  assert.match(admin, /action: "student", student/);
  assert.match(admin, /href="\/zola-admin\/practice"/);
  const css = await read("app/practice/practice.css");
  const palette = new Set(["#263449", "#33445f", "#843450", "#c5a46f", "#e4d6e0", "#e8f2fc", "#fceaf3", "#b9c7d8", "#b4405f", "#ffffff", "#fffdf8"]);
  for (const hex of css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) assert.ok(palette.has(hex.toLowerCase()), hex);
});
