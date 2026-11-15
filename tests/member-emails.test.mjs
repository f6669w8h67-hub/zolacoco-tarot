// Zola 2026-11-15: member emails from her Gmail (開通／延長通知、到期前 7 天提醒), notes and search in
// the member admin. The mail library itself is never loaded here: sending is injected or mocked.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));
const emails = await loadTypescript("lib/member-emails.ts");
const ENV = { MEMBERSHIP_EMAIL_ENABLED: "true", GMAIL_USER: "zola@gmail.example", GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop", MEMBERSHIP_ADMIN_ORIGIN: "https://zolacoco-tarot.vercel.app" };

function fakeSql(responses) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const query = strings.join("?");
    calls.push({ query, values });
    const next = responses.find((item) => item.match.test(query));
    if (next?.error) throw new Error(next.error);
    return next ? (typeof next.rows === "function" ? next.rows(values) : next.rows) : [];
  };
  return { sql, calls };
}

test("settings: nothing is sent unless enabled, with Gmail and an https site origin", () => {
  assert.equal(emails.memberEmailSettings({}), null);
  assert.equal(emails.memberEmailSettings({ ...ENV, MEMBERSHIP_EMAIL_ENABLED: "false" }), null);
  assert.equal(emails.memberEmailSettings({ ...ENV, GMAIL_APP_PASSWORD: " " }), null);
  assert.equal(emails.memberEmailSettings({ ...ENV, MEMBERSHIP_ADMIN_ORIGIN: "http://zolacoco-tarot.vercel.app" }), null);
  assert.equal(emails.memberEmailSettings({ ...ENV, MEMBERSHIP_ADMIN_ORIGIN: "https://zolacoco-tarot.vercel.app/account" }), null);
  assert.deepEqual(plain(emails.memberEmailSettings(ENV)), { gmail: { user: "zola@gmail.example", pass: "abcdefghijklmnop" }, origin: "https://zolacoco-tarot.vercel.app" });
});

test("email texts: Taiwan date, links to the site and 會員中心, LINE, signed Zola, always 妳", () => {
  const member = { full_name: "小美", access_expires_at: "2026-12-14T16:30:00Z" };
  const origin = "https://zolacoco-tarot.vercel.app";
  assert.equal(emails.taipeiDate("2026-12-14T16:30:00Z"), "2026年12月15日", "16:30 UTC is already the 15th in Taipei");
  const activated = emails.memberEmail("activated", member, origin);
  assert.equal(activated.subject, "Zolacoco Tarot｜妳的會員已開通");
  assert.match(activated.text, /^小美 妳好：/);
  assert.match(activated.text, /已經開通，可以使用到 2026年12月15日。/);
  const extended = emails.memberEmail("extended", member, origin);
  assert.equal(extended.subject, "Zolacoco Tarot｜妳的會員已延長");
  assert.match(extended.text, /已經延長，現在可以使用到 2026年12月15日。/);
  const reminder = emails.memberEmail("expiry_reminder", { ...member, full_name: "  " }, origin);
  assert.equal(reminder.subject, "Zolacoco Tarot｜會員將在 2026年12月15日 到期");
  assert.match(reminder.text, /^妳好：/, "no name, no stray space");
  assert.match(reminder.text, /妳存下的紀錄不會因為到期而刪除。/);
  for (const mail of [activated, extended, reminder]) {
    assert.match(mail.text, /https:\/\/zolacoco-tarot\.vercel\.app\/account/);
    assert.match(mail.text, /https:\/\/lin\.ee\/tchILJk/);
    assert.match(mail.text, /\nZola$/);
    assert.doesNotMatch(mail.text + mail.subject, /你/);
  }
});

test("activation email: claimed once per period, the result is recorded, nothing ever throws", async () => {
  assert.equal(await emails.notifyMemberAccess(async () => { throw new Error("no database"); }, "m1", "activated", {}), "disabled", "not set up: no query at all");

  const sent = [];
  const send = async (config, message) => { sent.push(plain({ config, message })); return "sent"; };
  const member = { id: "m1", email: "member@example.com", full_name: "小美", access_expires_at: "2026-12-14T16:30:00Z", period_key: "1797265800" };
  const first = fakeSql([{ match: /INSERT INTO member_email_log/, rows: [member] }]);
  assert.equal(await emails.notifyMemberAccess(first.sql, "m1", "activated", ENV, send), "sent");
  assert.match(first.calls[0].query, /role = 'member' AND status = 'active' AND access_expires_at > now\(\)/);
  assert.match(first.calls[0].query, /ON CONFLICT \(member_id, kind, period_key\) DO NOTHING/);
  assert.deepEqual(first.calls[0].values, ["m1", "activated"]);
  assert.match(first.calls[1].query, /UPDATE member_email_log SET status = \?, finished_at = now\(\)/);
  assert.deepEqual(first.calls[1].values, ["sent", "m1", "activated", "1797265800"]);
  assert.equal(sent[0].message.to, "member@example.com");
  assert.equal(sent[0].message.subject, "Zolacoco Tarot｜妳的會員已開通");

  const again = fakeSql([{ match: /INSERT INTO member_email_log/, rows: [] }]);
  assert.equal(await emails.notifyMemberAccess(again.sql, "m1", "activated", ENV, send), "skipped", "the same period was already claimed: no second email");
  assert.equal(sent.length, 1);

  const failing = fakeSql([{ match: /INSERT INTO member_email_log/, rows: [member] }]);
  assert.equal(await emails.notifyMemberAccess(failing.sql, "m1", "extended", ENV, async () => "failed"), "failed");
  assert.deepEqual(failing.calls[1].values, ["failed", "m1", "extended", "1797265800"]);

  const broken = fakeSql([{ match: /INSERT INTO member_email_log/, error: "database unavailable" }]);
  assert.equal(await emails.notifyMemberAccess(broken.sql, "m1", "activated", ENV, send), "failed", "a database error does not throw into the admin action");
});

test("expiry reminders: members ending within 7 days, at most 20 a run, each period once", async () => {
  assert.deepEqual(plain(await emails.sendExpiryReminders(async () => [], {}, async () => "sent")), { status: "disabled", sent: 0, failed: 0 });
  const due = [
    { id: "a", email: "a@example.com", full_name: "A", access_expires_at: "2026-11-20T00:00:00Z", period_key: "1" },
    { id: "b", email: "b@example.com", full_name: "B", access_expires_at: "2026-11-21T00:00:00Z", period_key: "2" },
  ];
  const run = fakeSql([{ match: /INSERT INTO member_email_log/, rows: due }]);
  const to = [];
  const result = await emails.sendExpiryReminders(run.sql, ENV, async (config, message) => { to.push(message.to); return message.to.startsWith("b") ? "failed" : "sent"; });
  assert.deepEqual(plain(result), { status: "done", sent: 1, failed: 1 });
  assert.deepEqual(to, ["a@example.com", "b@example.com"]);
  assert.match(run.calls[0].query, /access_expires_at > now\(\) AND access_expires_at <= now\(\) \+ make_interval\(days => \?\)/);
  assert.match(run.calls[0].query, /LIMIT \?/);
  assert.deepEqual(run.calls[0].values, [7, 20]);
  assert.match(run.calls[0].query, /SELECT id, 'expiry_reminder', period_key, 'sending' FROM due\s+ON CONFLICT \(member_id, kind, period_key\) DO NOTHING/);
  assert.deepEqual(run.calls.slice(1).map((call) => call.values[0]), ["sent", "failed"]);
});

test("daily route: refuses without the exact CRON_SECRET, then sends the reminders", async () => {
  const env = {};
  let runs = 0;
  const route = await loadTypescript("app/api/cron/membership-reminders/route.ts", {
    env,
    mocks: {
      "@/lib/membership": { ensureMembershipSchema: async () => {}, getSql: () => async () => [] },
      "@/lib/member-emails": { sendExpiryReminders: async () => { runs += 1; return { status: "done", sent: 2, failed: 0 }; } },
    },
  });
  const call = (authorization) => route.GET(new Request("https://example.test/api/cron/membership-reminders", { headers: authorization ? { authorization } : {} }));
  assert.equal((await call("Bearer anything")).status, 401, "no secret configured: refused");
  assert.equal((await call("Bearer ")).status, 401);
  env.CRON_SECRET = "s3cret-value";
  assert.equal((await call()).status, 401);
  assert.equal((await call("Bearer wrong")).status, 401);
  assert.equal((await call("Bearer s3cret-value-and-more")).status, 401);
  assert.equal(runs, 0);
  const ok = await call("Bearer s3cret-value");
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { status: "done", sent: 2, failed: 0 });
  assert.equal(runs, 1);
});

test("Vercel runs it daily and the proxy lets only that route through without a login", async () => {
  const vercel = JSON.parse(await read("vercel.json"));
  assert.deepEqual(vercel.crons, [{ path: "/api/cron/membership-reminders", schedule: "0 1 * * *" }], "09:00 in Taipei");
  assert.equal(vercel.buildCommand, "npm run build:vercel", "keeps the Vercel build command");
  assert.equal(vercel.git?.deploymentEnabled?.["pr-assets"], false, "pr-assets still never deploys");
  const access = await loadTypescript("lib/membership-access.ts");
  assert.equal(access.isMembershipServiceRoute("/api/cron/membership-reminders"), true);
  assert.equal(access.isMembershipServiceRoute("/api/cron/other"), false);
});

async function adminRoute(rows = []) {
  const calls = [];
  const notified = [];
  const sql = async (strings, ...values) => { calls.push({ query: strings.join("?"), values }); return rows; };
  sql.transaction = async (build) => build((strings, ...values) => ({ strings, values })).map((item) => { calls.push({ query: item.strings.join("?"), values: item.values }); return [{ id: "m1", status: "active" }]; });
  const route = await loadTypescript("app/api/membership/admin/route.ts", {
    mocks: {
      "@/lib/membership": {
        getSql: () => sql,
        requireAdmin: async () => ({ id: "admin-1", email: "zola@example.com", role: "admin" }),
        membershipErrorResponse: () => Response.json({ error: "MEMBERSHIP_SERVICE_ERROR" }, { status: 500 }),
      },
      "@/lib/member-emails": { notifyMemberAccess: async (_sql, memberId, kind) => { notified.push([memberId, kind]); return "sent"; } },
    },
  });
  const post = (body) => route.POST(new Request("https://example.test/api/membership/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { route, post, calls, notified };
}

test("admin notes: plain text up to 500 characters, kept in their own table, upserted by Zola", async () => {
  const admin = await adminRoute([{ id: "m1", role: "member", status: "active", note: "已付款\n下次提醒續約" }]);
  assert.equal((await admin.post({ memberId: "m1", action: "note", note: 12 })).status, 400);
  assert.equal((await admin.post({ memberId: "m1", action: "note", note: "字".repeat(501) })).status, 400);
  const saved = await admin.post({ memberId: "m1", action: "note", note: "  已付款\r\n下次提醒續約\u0007  " });
  assert.equal(saved.status, 200);
  const upsert = admin.calls.find((call) => /INSERT INTO member_admin_notes/.test(call.query));
  assert.deepEqual(upsert.values, ["m1", "已付款\n下次提醒續約", "zola@example.com"], "CRLF becomes a line break, control characters go, spaces trimmed");
  assert.match(upsert.query, /ON CONFLICT \(member_id\) DO UPDATE SET note = EXCLUDED\.note/);
  assert.equal(admin.notified.length, 0, "a note sends no email");
});

test("開通／增加月份 sends the member email after the change and reports it; the list carries notes and the last email", async () => {
  const admin = await adminRoute([{ id: "m1", role: "member", status: "pending", access_expires_at: null }]);
  const response = await admin.post({ memberId: "m1", action: "activate", months: 3 });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).email, "sent");
  assert.deepEqual(admin.notified, [["m1", "activated"]]);
  const route = await read("app/api/membership/admin/route.ts");
  assert.ok(route.indexOf("sql.transaction") < route.indexOf("notifyMemberAccess(sql, memberId"), "the email goes out only after the change is saved");
  assert.match(route, /LEFT JOIN member_admin_notes n ON n\.member_id = m\.id/);
  assert.match(route, /SELECT kind, status, finished_at, attempted_at FROM member_email_log\s+WHERE member_id = m\.id ORDER BY attempted_at DESC LIMIT 1/);
});

test("the member's own pages never see Zola's note", async () => {
  for (const file of ["app/api/membership/me/route.ts", "lib/membership.ts", "app/account/account-view.tsx", "lib/member-client.ts"]) {
    const source = await read(file);
    assert.doesNotMatch(source.replace(/CREATE TABLE IF NOT EXISTS member_admin_notes[\s\S]*?`;/, ""), /member_admin_notes|admin_note/, file);
  }
  const schema = await read("lib/membership.ts");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS member_admin_notes/);
  assert.doesNotMatch(schema, /ALTER TABLE members ADD COLUMN IF NOT EXISTS admin_note/, "not a members column: the member's own API returns that row");
});

test("admin page: search over name, Email, LINE ID and note; sort by status, expiry or sign-up; email outcome in the notice", async () => {
  const page = await read("app/zola-admin/admin-client.tsx");
  assert.match(page, /placeholder="姓名、Email、LINE ID 或備註"/);
  assert.match(page, /\[member\.full_name, member\.email, member\.line_id, member\.admin_note\]/);
  assert.match(page, /<option value="expiry">依到期日（最近的在前）<\/option>/);
  assert.match(page, /備註（只有妳看得到）/);
  assert.match(page, /maxLength=\{ADMIN_NOTE_LIMIT\}/);
  assert.match(page, /if \(outcome === "sent"\) return "已寄 Email 通知對方。";/);
  assert.match(page, /if \(outcome === "failed"\) return "Email 通知沒有寄出，請用 LINE 告訴對方。";/);
  const load = page.slice(page.indexOf("const load = useCallback"), page.indexOf("useEffect(() => {"));
  assert.doesNotMatch(load, /setNotice\(""\)/, "reloading after an action keeps its message");
});

test("new-member notices to Zola go through Gmail when it is set up", async (t) => {
  const env = { MEMBERSHIP_EMAIL_ENABLED: "true", GMAIL_USER: "zola@gmail.example", GMAIL_APP_PASSWORD: "abcd", MEMBERSHIP_EMAIL_TO: "zola@gmail.example", MEMBERSHIP_ADMIN_ORIGIN: "https://zolacoco-tarot.vercel.app" };
  const gmailSent = [];
  const activation = await loadTypescript("lib/member-activation-email.ts", { env });
  const fakeMailer = async () => ({ gmailConfig: () => ({ user: "zola@gmail.example", pass: "abcd" }), sendGmail: async (config, message) => { gmailSent.push(plain(message)); return "sent"; } });
  let fetched = 0;
  t.mock.method(globalThis, "fetch", async () => { fetched += 1; return new Response(null, { status: 200 }); });
  const updates = [];
  const sql = async (strings, ...values) => {
    const query = strings.join("?");
    if (query.includes("ON CONFLICT (member_id) DO NOTHING")) return [{ full_name: "新會員", email: "new@example.com" }];
    if (query.includes("UPDATE member_activation_notifications")) updates.push(values[0]);
    return [];
  };
  await activation.notifyPendingMember(sql, "m9", fakeMailer);
  assert.equal(fetched, 0, "no Resend call");
  assert.equal(gmailSent.length, 1);
  assert.equal(gmailSent[0].to, "zola@gmail.example");
  assert.equal(gmailSent[0].subject, "Zolacoco Tarot｜有新會員待開通");
  assert.deepEqual(updates, ["sent"]);
});

test("runMemberAction passes back the email outcome and the saved note", async () => {
  const client = await loadTypescript("lib/member-client.ts");
  const respond = (body) => async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  assert.deepEqual(plain(await client.runMemberAction({ memberId: "m1", action: "activate", months: 1 }, respond({ member: {}, email: "failed" }))), { ok: true, email: "failed" });
  assert.deepEqual(plain(await client.runMemberAction({ memberId: "m1", action: "activate", months: 1 }, respond({ member: {}, email: "surprise" }))), { ok: true });
  assert.deepEqual(plain(await client.runMemberAction({ memberId: "m1", action: "note", note: "x" }, respond({ note: "x" }))), { ok: true, note: "x" });
});
