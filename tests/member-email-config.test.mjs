import assert from "node:assert/strict";
import { test } from "node:test";
import { notifyPendingMember } from "../lib/member-activation-email.ts";

test("enabled notifications with missing configuration are logged by name and not sent", async (t) => {
  const keys = ["MEMBERSHIP_EMAIL_ENABLED", "RESEND_API_KEY", "MEMBERSHIP_EMAIL_FROM", "MEMBERSHIP_EMAIL_TO", "MEMBERSHIP_ADMIN_ORIGIN"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.MEMBERSHIP_EMAIL_ENABLED = "true";
  process.env.MEMBERSHIP_EMAIL_FROM = "sender@example.com";
  process.env.MEMBERSHIP_EMAIL_TO = "admin@example.com";
  process.env.MEMBERSHIP_ADMIN_ORIGIN = "https://example.com";
  delete process.env.RESEND_API_KEY;

  const logged = [];
  let sent = 0;
  t.mock.method(console, "error", (...args) => logged.push(args));
  t.mock.method(globalThis, "fetch", async () => { sent++; return new Response(null, { status: 200 }); });

  await notifyPendingMember(async () => [], "member-1");

  assert.equal(sent, 0);
  assert.deepEqual(logged, [["member_activation_email_misconfigured", { missing: ["RESEND_API_KEY"] }]]);
});

test("disabled notifications stay silent by design", async (t) => {
  const previous = process.env.MEMBERSHIP_EMAIL_ENABLED;
  t.after(() => {
    if (previous === undefined) delete process.env.MEMBERSHIP_EMAIL_ENABLED;
    else process.env.MEMBERSHIP_EMAIL_ENABLED = previous;
  });
  delete process.env.MEMBERSHIP_EMAIL_ENABLED;
  const logged = [];
  t.mock.method(console, "error", (...args) => logged.push(args));
  await notifyPendingMember(async () => [], "member-1");
  assert.deepEqual(logged, []);
});
