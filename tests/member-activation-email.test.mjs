import assert from "node:assert/strict";
import { test } from "node:test";
import { notifyPendingMember } from "../lib/member-activation-email.ts";

test("activation email uses an atomic claim and isolates delivery errors", async (t) => {
  const keys = {
    MEMBERSHIP_EMAIL_ENABLED: "true",
    RESEND_API_KEY: "test",
    MEMBERSHIP_EMAIL_FROM: "sender@example.com",
    MEMBERSHIP_EMAIL_TO: "admin@example.com",
    MEMBERSHIP_ADMIN_ORIGIN: "https://example.com",
  };
  const previous = Object.fromEntries(Object.keys(keys).map((key) => [key, process.env[key]]));
  Object.assign(process.env, keys);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const records = new Map();
  const sent = [];
  let databaseError = false;
  const sql = async (strings, ...values) => {
    const query = strings.join("?");
    if (query.includes("CREATE TABLE")) return [];
    if (databaseError) throw new Error("database unavailable");
    if (query.includes("ON CONFLICT (member_id) DO NOTHING")) {
      assert.match(query, /role = 'member' AND status = 'pending'/);
      assert.match(query, /btrim\(full_name\).*btrim\(line_id\).*birthday IS NOT NULL/);
      const [id] = values;
      if (id === "ineligible" || records.has(id)) return [];
      records.set(id, "sending");
      return [{ full_name: "測試會員", email: "member@example.com" }];
    }
    assert.match(query, /UPDATE member_activation_notifications/);
    const [status, , id] = values;
    records.set(id, status);
    return [];
  };
  t.mock.method(console, "error", () => {});
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const id = options.headers["Idempotency-Key"];
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(options.body);
    assert.deepEqual(body.to, ["admin@example.com"]);
    assert.match(body.text, /測試會員.*\nEmail：member@example.com/);
    assert.match(body.text, /https:\/\/example.com\/zola-admin/);
    sent.push(id);
    if (id.endsWith("/timeout")) throw new Error("timeout");
    return new Response(null, { status: id.endsWith("/rejected") ? 403 : 200 });
  });

  delete process.env.MEMBERSHIP_EMAIL_ENABLED;
  await notifyPendingMember(sql, "disabled");
  process.env.MEMBERSHIP_EMAIL_ENABLED = "true";
  await notifyPendingMember(sql, "ineligible");
  await Promise.all([notifyPendingMember(sql, "eligible"), notifyPendingMember(sql, "eligible")]);
  await notifyPendingMember(sql, "eligible");
  await notifyPendingMember(sql, "rejected");
  await notifyPendingMember(sql, "timeout");
  await notifyPendingMember(sql, "timeout");
  databaseError = true;
  await notifyPendingMember(sql, "database-error");

  assert.deepEqual(sent, ["member-activation/eligible", "member-activation/rejected", "member-activation/timeout"]);
  assert.deepEqual([...records], [["eligible", "sent"], ["rejected", "failed"], ["timeout", "unknown"]]);
});
