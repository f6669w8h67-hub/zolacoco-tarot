import assert from "node:assert/strict";
import test from "node:test";
import { loadMemberProfile, runMemberAction, saveMemberProfile } from "../lib/member-client.ts";

const member = { email: "member@example.com", full_name: "測試", line_id: "line", birthday: "1990-01-01", role: "member", effective_status: "pending", access_expires_at: null };

function respond(status, body, { text = false } = {}) {
  return async () => new Response(text ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": text ? "text/html" : "application/json" },
  });
}
const unreachable = async () => { throw new TypeError("Failed to fetch"); };

test("a failed profile load is reported as a failure, never as a member", async () => {
  assert.deepEqual(await loadMemberProfile(respond(500, { error: "MEMBERSHIP_SERVICE_ERROR" })), { ok: false, failure: "UNAVAILABLE" });
  assert.deepEqual(await loadMemberProfile(respond(401, { error: "UNAUTHENTICATED" })), { ok: false, failure: "UNAUTHENTICATED" });
  assert.deepEqual(await loadMemberProfile(respond(200, "<html>proxy</html>", { text: true })), { ok: false, failure: "UNAVAILABLE" });
  assert.deepEqual(await loadMemberProfile(unreachable), { ok: false, failure: "UNAVAILABLE" });
});

test("account problems that need their own screen are recognised only with the matching code", async () => {
  assert.deepEqual(await loadMemberProfile(respond(403, { error: "EMAIL_NOT_VERIFIED" })), { ok: false, failure: "EMAIL_NOT_VERIFIED" });
  assert.deepEqual(await loadMemberProfile(respond(409, { error: "EMAIL_ALREADY_LINKED" })), { ok: false, failure: "EMAIL_ALREADY_LINKED" });
  assert.deepEqual(await loadMemberProfile(respond(503, { error: "MEMBERSHIP_NOT_CONFIGURED" })), { ok: false, failure: "MEMBERSHIP_NOT_CONFIGURED" });
  // Same status, different or missing code (e.g. a proxy page): treated as temporary.
  assert.deepEqual(await loadMemberProfile(respond(403, { error: "FORBIDDEN" })), { ok: false, failure: "UNAVAILABLE" });
  assert.deepEqual(await loadMemberProfile(respond(503, "<html>busy</html>", { text: true })), { ok: false, failure: "UNAVAILABLE" });
});

test("a successful profile load returns the member", async () => {
  const result = await loadMemberProfile(respond(200, { member }));
  assert.equal(result.ok, true);
  assert.equal(result.member.email, member.email);
});

test("profile save hides server codes and reports unreachable servers honestly", async () => {
  const serverError = await saveMemberProfile({ fullName: "a", lineId: "b", birthday: "1990-01-01" }, respond(500, { error: "MEMBERSHIP_SERVICE_ERROR" }));
  assert.equal(serverError.ok, false);
  assert.equal(serverError.message.includes("MEMBERSHIP_SERVICE_ERROR"), false);

  const validation = await saveMemberProfile({ fullName: "", lineId: "", birthday: "" }, respond(400, { error: "請完整填寫真實姓名、LINE 名稱／ID 與生日。" }));
  assert.equal(validation.message, "請完整填寫真實姓名、LINE 名稱／ID 與生日。");

  const offline = await saveMemberProfile({ fullName: "a", lineId: "b", birthday: "1990-01-01" }, unreachable);
  assert.match(offline.message, /尚未確認儲存/);

  const html = await saveMemberProfile({ fullName: "a", lineId: "b", birthday: "1990-01-01" }, respond(200, "<html>", { text: true }));
  assert.equal(html.ok, false);
});

test("admin actions never leak codes and say when an outcome is unconfirmed", async () => {
  const body = { memberId: "m1", action: "activate", months: 1 };
  assert.deepEqual(await runMemberAction(body, respond(200, { member: {} })), { ok: true });

  const forbidden = await runMemberAction(body, respond(403, { error: "FORBIDDEN" }));
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.message.includes("FORBIDDEN"), false);

  const rejected = await runMemberAction({ ...body, months: 13 }, respond(400, { error: "請選擇 1～12 個月。" }));
  assert.equal(rejected.message, "請選擇 1～12 個月。");

  const offline = await runMemberAction(body, unreachable);
  assert.equal(offline.ok, false);
  assert.match(offline.message, /尚未確認完成/);
});
