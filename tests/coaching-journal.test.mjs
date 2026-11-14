import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 七日塔羅筆記 × 陪跑, PR A (ChatGPT spec v1, step 6): Zola marks members 陪跑中 (is_coaching, separate
// from VIP months and is_student); a member's notes reach Neon only after they consent per round;
// Zola reads shared rounds and replies day by day from /zola-admin/coaching.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const access = await loadTypescript("lib/membership-access.ts");
const input = await loadTypescript("lib/coaching-input.ts");
const prompts = await loadTypescript("lib/journal-prompts.ts");

// Values made inside the vm context have that context's Object prototype; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));

const CYCLE = "11111111-2222-3333-4444-555555555555";
const ENTRY = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

test("access: 陪跑中 is separate from VIP months and from being a student", () => {
  const now = Date.parse("2026-11-14T10:00:00Z");
  assert.equal(access.hasCoachingAccess({ role: "admin" }), true);
  assert.equal(access.hasCoachingAccess({ role: "member", status: "expired", is_coaching: true }), true, "an expired VIP who is 陪跑中 still writes");
  assert.equal(access.hasCoachingAccess({ role: "member", status: "pending", is_coaching: true }), true);
  assert.equal(access.hasCoachingAccess({ role: "member", status: "suspended", is_coaching: true }), false, "suspended: no new or synced notes");
  assert.equal(access.hasCoachingAccess({ role: "member", status: "active", access_expires_at: "2027-01-01T00:00:00Z" }), false, "VIP alone is not 陪跑");
  assert.equal(access.hasCoachingAccess({ role: "member", status: "active", is_student: true }), false, "a student is not 陪跑 by that alone");
  assert.equal(access.hasStudentAccess({ role: "member", status: "active", is_coaching: true }), false, "and 陪跑 does not open the practice room");
  assert.equal(access.hasCoachingAccess(undefined), false);
  assert.equal(access.hasMemberAccess({ role: "member", status: "expired", is_coaching: true, access_expires_at: "2026-10-01T00:00:00Z" }, now), false, "the VIP rule itself is unchanged");
  for (const path of ["/journal", "/api/coaching", "/api/coaching/journal", "/api/coaching/journal/seen", "/api/coaching/admin"]) assert.equal(access.isCoachingRoute(path), true, path);
  for (const path of ["/api/coachingx", "/journals", "/zola-admin/coaching", "/api/journal", "/"]) assert.equal(access.isCoachingRoute(path), false, path);
});

test("proxy: signed in first; coaching APIs then skip the VIP lookup and check the person themselves", async () => {
  const proxy = await read("proxy.ts");
  const signIn = proxy.indexOf("return session.redirectToSignIn");
  const pass = proxy.indexOf("if (isCoachingRoute(request.nextUrl.pathname)) return NextResponse.next();");
  const vipLookup = proxy.indexOf("SELECT role, status, access_expires_at");
  assert.ok(signIn > 0 && pass > signIn && vipLookup > pass);
  const membership = await read("lib/membership.ts");
  assert.match(membership, /export async function requireCoaching\(\) \{\n  const member = await syncCurrentMember\(\);\n  if \(!hasCoachingAccess\(member\)\) throw new MembershipError\("NOT_COACHING", 403\);/);
  const admin = await read("app/api/coaching/admin/route.ts");
  for (const handler of admin.split("export async function").slice(1)) assert.match(handler, /await requireAdmin\(\)/);
  for (const file of ["app/api/coaching/journal/route.ts", "app/api/coaching/journal/seen/route.ts"]) {
    const source = await read(file);
    assert.doesNotMatch(source, /memberId|member_id/, `${file}: the member is always the signed-in person`);
    for (const handler of source.split("export async function").slice(1)) assert.match(handler, /await syncCurrentMember\(\)/, file);
  }
});

test("schema: is_coaching defaults to false, audited before/after; one note per round and day", async () => {
  const membership = await read("lib/membership.ts");
  assert.match(membership, /ALTER TABLE members ADD COLUMN IF NOT EXISTS is_coaching boolean NOT NULL DEFAULT false/);
  assert.match(membership, /ALTER TABLE member_access_audit ADD COLUMN IF NOT EXISTS previous_coaching boolean/);
  assert.match(membership, /ALTER TABLE member_access_audit ADD COLUMN IF NOT EXISTS new_coaching boolean/);
  const store = await read("lib/coaching-store.ts");
  assert.match(store, /CREATE TABLE IF NOT EXISTS journal_cycles/);
  assert.match(store, /share_with_zola boolean NOT NULL DEFAULT false/, "nothing is shared unless the member said so");
  assert.match(store, /CONSTRAINT journal_cycles_member_number UNIQUE \(member_id, cycle_number\)/);
  assert.match(store, /CREATE TABLE IF NOT EXISTS journal_entries/);
  assert.match(store, /day smallint NOT NULL CHECK \(day BETWEEN 1 AND 7\)/);
  assert.match(store, /CONSTRAINT journal_entries_cycle_day UNIQUE \(cycle_id, day\)/);
  for (const column of ["prompt_version integer NOT NULL", "revision integer NOT NULL DEFAULT 1", "reviewed_revision integer", "feedback_seen_at timestamptz"]) assert.ok(store.includes(column), column);
  assert.doesNotMatch(await read("lib/membership.ts"), /journal_entries/, "the coaching tables live in their own module");
});

function recordingSql(rowsFor) {
  const calls = [];
  const sql = (strings, ...values) => {
    const text = strings.join("?");
    calls.push({ text, values });
    return Promise.resolve(rowsFor(text, values));
  };
  sql.transaction = () => { throw new Error("the coaching switch must not use a two-step transaction"); };
  return { sql, calls };
}

async function membershipAdmin(rowsFor) {
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

test("the 陪跑中 switch: one statement changes and audits; the same value again changes nothing", async () => {
  const memberId = "99999999-2222-3333-4444-555555555555";
  const current = { id: memberId, role: "member", status: "expired", is_student: false, is_coaching: false };
  const on = await membershipAdmin((text) => (text.includes("SELECT * FROM members") ? [current] : []));
  assert.equal((await on.post({ memberId, action: "coaching", coaching: true })).status, 200);
  const change = on.calls.find((call) => call.text.includes("UPDATE members SET is_coaching"));
  assert.ok(change);
  assert.match(change.text, /WITH updated AS \(/);
  assert.match(change.text, /is_coaching IS DISTINCT FROM \?/);
  assert.match(change.text, /previous_coaching, new_coaching, note\)/);
  assert.deepEqual(change.values.slice(-2), [false, true], "audit: before false, after true");
  assert.equal(on.calls.some((call) => call.text.includes("is_student =")), false, "the student mark is untouched");

  const same = await membershipAdmin(() => [{ ...current, is_coaching: true }]);
  assert.equal((await (await same.post({ memberId, action: "coaching", coaching: true })).json()).unchanged, true);
  assert.equal(same.calls.some((call) => call.text.includes("UPDATE")), false, "no write, no audit row");

  const bad = await membershipAdmin(() => [current]);
  assert.equal((await bad.post({ memberId, action: "coaching", coaching: "yes" })).status, 400);
});

test("requests: a round starts only with consent; a save carries the member's own fields only", () => {
  assert.match(input.parseJournalBody({ action: "start" }).error, /勾選同意/);
  assert.match(input.parseJournalBody({ action: "start", consent: "true" }).error, /勾選同意/, "only a real true counts");
  assert.deepEqual(plain(input.parseJournalBody({ action: "start", consent: true }).value), { action: "start" });
  const ok = input.parseJournalBody({ action: "save", cycleId: CYCLE, day: 3, content: " 想被支持\r\n也想支持人 ", expectedRevision: null, member_id: "x", feedback: "hack", prompt_version: 9 });
  assert.equal(ok.ok, true);
  assert.deepEqual(Object.keys(ok.value).sort(), ["action", "content", "cycleId", "day", "expectedRevision"]);
  assert.equal(ok.value.content, "想被支持\n也想支持人");
  assert.match(input.parseJournalBody({ action: "save", cycleId: CYCLE, day: 3, content: "   " }).error, /請先寫下今天的筆記/);
  assert.match(input.parseJournalBody({ action: "save", cycleId: CYCLE, day: 3, content: "字".repeat(4001) }).error, /4000 字以內/);
  for (const day of [0, 8, 2.5, "3"]) assert.equal(input.parseJournalBody({ action: "save", cycleId: CYCLE, day, content: "x" }).ok, false, `day ${day}`);
  assert.equal(input.parseJournalBody({ action: "save", cycleId: "nope", day: 1, content: "x" }).ok, false);
  assert.equal(input.parseJournalBody({ action: "save", cycleId: CYCLE, day: 1, content: "x", expectedRevision: 0 }).ok, false);
  assert.deepEqual(plain(input.parseJournalBody({ action: "stop", cycleId: CYCLE }).value), { action: "stop", cycleId: CYCLE });
  assert.equal(input.parseJournalBody({ action: "delete", cycleId: CYCLE }).ok, false);
  assert.equal(input.parseCoachingFeedbackBody({ entryId: ENTRY, feedback: "好", expectedRevision: null }).ok, false, "a reply names the note version it read");
  assert.match(input.parseCoachingFeedbackBody({ entryId: ENTRY, feedback: "字".repeat(2001), expectedRevision: 1 }).error, /2000 字以內/);
});

const cycleRow = { id: CYCLE, member_id: "m1", cycle_number: 1, started_at: "2026-11-14T01:00:00Z", completed_at: null, share_with_zola: true, shared_at: "2026-11-14T01:00:00Z", created_at: "2026-11-14T01:00:00Z" };
const entryRow = { id: ENTRY, cycle_id: CYCLE, member_id: "m1", day: 2, prompt_version: 1, content: "c", revision: 3, feedback: "看見了", feedback_at: "2026-11-14T02:00:00Z", reviewed_revision: 2, feedback_seen_at: null, created_at: "2026-11-14T01:00:00Z", updated_at: "2026-11-14T03:00:00Z" };

test("shapes: the member's page never gets member ids; reply state is worked out on the server", () => {
  const shown = input.publicEntry(entryRow);
  assert.equal("member_id" in shown || "memberId" in shown, false);
  assert.equal(shown.feedbackOutdated, true, "replied to revision 2, now at 3");
  assert.equal(shown.feedbackUnread, true);
  assert.equal(input.publicEntry({ ...entryRow, reviewed_revision: 3, feedback_seen_at: "2026-11-14T02:30:00Z" }).feedbackUnread, false);
  const admin = input.adminEntry(entryRow);
  assert.equal(admin.changedAfterFeedback, true);
  assert.equal(admin.waiting, false);
  assert.equal(input.adminEntry({ ...entryRow, feedback: null, feedback_at: null, reviewed_revision: null }).waiting, true);
  assert.equal("member_id" in input.publicCycle(cycleRow), false);
});

class MembershipError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function journalRoute({ member, store = {} }) {
  const calls = [];
  const spy = (name, result) => async (...args) => { calls.push({ name, args }); return typeof result === "function" ? result(...args) : result; };
  const route = await loadTypescript("app/api/coaching/journal/route.ts", {
    mocks: {
      "@/lib/membership": {
        MembershipError,
        syncCurrentMember: async () => { if (!member) throw new MembershipError("UNAUTHENTICATED", 401); return member; },
        membershipErrorResponse: (error) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
      },
      "@/lib/coaching-store": {
        ensureCoachingSchema: spy("schema", undefined),
        listOwnJournal: spy("list", { cycles: [cycleRow], entries: [entryRow] }),
        startSharedCycle: spy("start", store.start ?? { cycle: cycleRow, created: true }),
        stopSharingCycle: spy("stop", store.stop ?? { ...cycleRow, share_with_zola: false }),
        saveEntry: spy("save", store.save ?? { ok: true, entry: entryRow, cycle: cycleRow }),
      },
    },
  });
  const post = (body) => route.POST(new Request("https://example.test/api/coaching/journal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { route, post, calls };
}

test("member API: reading is the owner's own data; only 陪跑中 can start or save; nothing is written unasked", async () => {
  assert.equal((await (await journalRoute({ member: null })).route.GET()).status, 401);
  const suspended = await journalRoute({ member: { id: "m1", role: "member", status: "suspended", is_coaching: true } });
  assert.equal((await suspended.route.GET()).status, 403);

  const former = await journalRoute({ member: { id: "m1", role: "member", status: "active", is_coaching: false } });
  const list = await (await former.route.GET()).json();
  assert.equal(list.canWrite, false, "a former 陪跑 member can read their notes and Zola's replies, not add");
  assert.equal(list.cycles[0].shared, true);
  assert.deepEqual(former.calls.find((call) => call.name === "list").args, ["m1"]);
  assert.equal((await former.post({ action: "start", consent: true })).status, 403);
  assert.equal((await former.post({ action: "save", cycleId: CYCLE, day: 1, content: "x" })).status, 403);
  assert.equal(former.calls.some((call) => call.name === "start" || call.name === "save"), false);
  const stop = await former.post({ action: "stop", cycleId: CYCLE });
  assert.equal(stop.status, 200, "taking consent back always works for the owner");
  assert.equal((await stop.json()).cycle.shared, false);
  assert.deepEqual(former.calls.find((call) => call.name === "stop").args, ["m1", CYCLE]);

  const coaching = await journalRoute({ member: { id: "m2", role: "member", status: "expired", is_coaching: true } });
  assert.equal((await coaching.post({ action: "start" })).status, 400, "no consent, no round");
  assert.equal(coaching.calls.some((call) => call.name === "start"), false);
  assert.equal((await coaching.post({ action: "start", consent: true })).status, 200);
  assert.deepEqual(coaching.calls.find((call) => call.name === "start").args, ["m2"]);
  const saved = await coaching.post({ action: "save", cycleId: CYCLE, day: 2, content: " 今天 ", expectedRevision: 2, prompt_version: 99 });
  assert.equal(saved.status, 200);
  const [memberId, value, expected] = coaching.calls.find((call) => call.name === "save").args;
  assert.equal(memberId, "m2");
  assert.deepEqual(plain(value), { cycleId: CYCLE, day: 2, content: "今天", promptVersion: prompts.JOURNAL_PROMPT_VERSION }, "the server decides the prompt version");
  assert.equal(expected, 2);
});

test("member API: a stale save is a 409 with the newer note; a round no longer shared is not written", async () => {
  const stale = await journalRoute({ member: { id: "m2", role: "member", status: "active", is_coaching: true }, store: { save: { ok: false, reason: "conflict", current: { ...entryRow, revision: 5 } } } });
  const conflict = await stale.post({ action: "save", cycleId: CYCLE, day: 2, content: "x", expectedRevision: 3 });
  assert.equal(conflict.status, 409);
  const body = await conflict.json();
  assert.equal(body.entry.revision, 5);
  assert.match(body.error, /另一個視窗/);
  const stopped = await journalRoute({ member: { id: "m2", role: "member", status: "active", is_coaching: true }, store: { save: { ok: false, reason: "cycle" } } });
  const refused = await stopped.post({ action: "save", cycleId: CYCLE, day: 2, content: "x" });
  assert.equal(refused.status, 409);
  assert.match((await refused.json()).error, /停止同步/);
});

test("store: saves never touch Zola's reply; only shared rounds are written or shown to Zola", async () => {
  const store = await read("lib/coaching-store.ts");
  const save = store.slice(store.indexOf("export async function saveEntry"), store.indexOf("/** Only the owner, and only a note"));
  assert.doesNotMatch(save, /feedback/, "a member's save never writes the reply");
  assert.match(save, /ON CONFLICT ON CONSTRAINT journal_entries_cycle_day DO NOTHING/);
  assert.match(save, /AND e\.revision = \$\{expectedRevision\}/);
  assert.equal((save.match(/c\.share_with_zola/g) ?? []).length, 2, "both the first save and later saves need a shared round");
  assert.match(save, /c\.member_id = \$\{memberId\}/);
  assert.match(save, /content <> ''\) = 7/, "complete = all seven days written, on any dates");
  const start = store.slice(store.indexOf("export async function startSharedCycle"), store.indexOf("/** The member takes a round back"));
  assert.match(start, /share_with_zola, shared_at\)/);
  assert.match(start, /WHERE member_id = \$\{memberId\} AND share_with_zola AND completed_at IS NULL/, "an open round comes back instead of a second one");
  assert.match(store, /WHERE id = \$\{entryId\} AND member_id = \$\{memberId\} AND feedback_at IS NOT NULL/, "only the owner marks a reply as read");
  const feedback = store.slice(store.indexOf("export async function saveEntryFeedback"));
  assert.match(feedback, /SET feedback = \$\{feedback\}, feedback_at = now\(\), reviewed_revision = e\.revision, feedback_seen_at = NULL/);
  assert.match(feedback, /c\.share_with_zola AND e\.revision = \$\{expectedRevision\}/);
  const members = store.slice(store.indexOf("export async function listCoachingMembers"), store.indexOf("/** One member's shared rounds"));
  assert.match(members, /LEFT JOIN journal_cycles c ON c\.member_id = m\.id AND c\.share_with_zola/);
  assert.doesNotMatch(store, /DELETE FROM/, "ending 陪跑 or stopping a round deletes nothing");
});

test("review #36 B1: Zola's read of a member's rounds is one snapshot; a round taken back never leaks its notes", async () => {
  // A tiny database: one shared round with two notes. The member takes the round back right after
  // Zola's first statement runs. Whatever the store does, nothing it returns may come from a round
  // that was no longer shared when that part was read.
  const db = { shared: true };
  const round = { ...cycleRow };
  const notes = [{ ...entryRow, day: 1, id: "e1" }, { ...entryRow, day: 2, id: "e2" }];
  const calls = [];
  const sql = (strings, ...values) => {
    const text = strings.join("?");
    calls.push(text);
    let rows = [];
    if (/FROM journal_cycles c\s+WHERE c\.member_id = \? AND c\.share_with_zola/.test(text)) {
      rows = db.shared && values[0] === "m1" ? [{ ...round, entries: /json_agg\(e ORDER BY e\.day\)[\s\S]*WHERE e\.cycle_id = c\.id/.test(text) ? notes : null }] : [];
    } else if (/FROM journal_entries/.test(text)) {
      // A second statement would read notes by ids fetched earlier, after the member said stop.
      rows = text.includes("share_with_zola") && !db.shared ? [] : notes;
    }
    db.shared = false; // the member taps 停止同步 right after the first statement
    return Promise.resolve(rows);
  };
  const store = await loadTypescript("lib/coaching-store.ts", { mocks: { "@/lib/membership": { getSql: () => sql } } });
  const first = await store.listSharedJournal("m1");
  assert.equal(calls.length, 1, "rounds and notes come from one statement");
  assert.deepEqual(first.cycles.map((cycle) => cycle.id), [CYCLE]);
  assert.equal("entries" in first.cycles[0], false, "rounds are plain rounds again");
  assert.deepEqual(first.entries.map((entry) => entry.id), ["e1", "e2"], "read while still shared: round and notes together");
  const after = await store.listSharedJournal("m1");
  assert.equal(after.cycles.length + after.entries.length, 0, "after taking it back, neither the round nor its notes come back");
  const source = await read("lib/coaching-store.ts");
  const shared = source.slice(source.indexOf("export async function listSharedJournal"), source.indexOf("/**\n * Zola's reply"));
  assert.equal((shared.match(/await sql`/g) ?? []).length, 1);
  assert.match(shared, /WHERE c\.member_id = \$\{memberId\} AND c\.share_with_zola/);
  const members = source.slice(source.indexOf("export async function listCoachingMembers"), source.indexOf("/**\n * One member's shared rounds"));
  assert.match(members, /e\.feedback_seen_at IS NULL OR e\.feedback_seen_at < e\.feedback_at/, "unread counts follow publicEntry().feedbackUnread");
});

test("admin API: a reply to a note changed meanwhile is a 409; an unshared or missing note is a 404", async () => {
  let conflictRow = { ...entryRow, revision: 5, reviewed_revision: 4 };
  const route = await loadTypescript("app/api/coaching/admin/route.ts", {
    mocks: {
      "@/lib/membership": { requireAdmin: async () => ({ id: "admin-1", role: "admin" }), membershipErrorResponse: () => Response.json({ error: "x" }, { status: 500 }) },
      "@/lib/coaching-store": {
        ensureCoachingSchema: async () => {}, listCoachingMembers: async () => [], listSharedJournal: async () => ({ cycles: [cycleRow], entries: [entryRow] }),
        saveEntryFeedback: async () => ({ ok: false, current: conflictRow }),
      },
    },
  });
  const post = (body) => route.POST(new Request("https://example.test/api/coaching/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  const response = await post({ entryId: ENTRY, feedback: "很好", expectedRevision: 4 });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).entry.changedAfterFeedback, true);
  conflictRow = null;
  assert.equal((await post({ entryId: ENTRY, feedback: "很好", expectedRevision: 4 })).status, 404);
  assert.equal((await route.GET(new Request("https://example.test/api/coaching/admin?memberId=nope"))).status, 400);
  const one = await (await route.GET(new Request(`https://example.test/api/coaching/admin?memberId=${CYCLE}`))).json();
  assert.equal(one.entries[0].changedAfterFeedback, true);
});

test("admin page: a slow reply for member A never shows under B; filters, switch and links are in place", async () => {
  const page = await read("app/zola-admin/coaching/page.tsx");
  const open = page.slice(page.indexOf("async function open("), page.indexOf("function closeMember()"));
  assert.match(open, /const request = memberRequest\.current\.start\(\);/);
  assert.match(open, /signal: request\.signal/);
  assert.match(open, /if \(!request\.isCurrent\(\)\) return;\n      setCycles\(data\.cycles\);/);
  assert.match(open, /catch \{\n      if \(!request\.isCurrent\(\)\) return;/);
  assert.match(page, /function closeMember\(\) \{\n    memberRequest\.current\.cancel\(\);/);
  assert.match(page, /return \(\) => requests\.cancel\(\);/);
  for (const label of ["全部", "尚未回覆", "回覆後已修改", "對方未讀"]) assert.ok(page.includes(`"${label}"`), label);
  assert.match(page, /maxLength=\{COACHING_FEEDBACK_LIMIT\}/);
  assert.match(page, /journalPromptFor\(entry\.promptVersion, entry\.day\)/, "each day shows the question it answered");
  const admin = await read("app/zola-admin/admin-client.tsx");
  assert.match(admin, /action: "coaching", coaching/);
  assert.match(admin, /\{member\.is_coaching \? "結束陪跑" : "設為陪跑中"\}/);
  assert.match(admin, /href="\/zola-admin\/coaching"/);
  const css = await read("app/zola-admin/coaching/coaching-admin.css");
  const palette = new Set(["#263449", "#33445f", "#843450", "#c5a46f", "#e4d6e0", "#e8f2fc", "#fceaf3", "#b9c7d8", "#b4405f", "#ffffff", "#fffdf8"]);
  for (const hex of css.match(/#[0-9a-fA-F]{6}\b/g) ?? []) assert.ok(palette.has(hex.toLowerCase()), hex);
});

test("prompts: the home journal and Zola's page read the same seven questions", async () => {
  assert.equal(prompts.journalPrompts.length, 7);
  assert.equal(prompts.journalCardIds.length, 7);
  assert.equal(prompts.journalPromptFor(1, 1), "我現在真正的情緒是什麼？");
  assert.equal(prompts.journalPromptFor(1, 7), "這一週，我最想帶走的核心提醒是什麼？");
  assert.equal(prompts.journalPromptFor(99, 3), prompts.journalPrompts[2], "an unknown version falls back to today's questions");
  const home = await read("app/page.tsx");
  assert.doesNotMatch(home, /const journalPrompts = \[/);
  const tool = await read("app/journal/journal-tool.tsx");
  assert.match(tool, /from "@\/lib\/journal-prompts";/);
});
