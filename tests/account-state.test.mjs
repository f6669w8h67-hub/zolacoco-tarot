import assert from "node:assert/strict";
import test from "node:test";
import {
  accountStage,
  activationRequestMessage,
  daysLeft,
  formatTaipeiDate,
  isValidBirthday,
  remainingLabel,
  renewalRequestMessage,
  supportRequestMessage,
  validateProfileInput,
} from "../lib/account-state.ts";
import { lineMessageUrl } from "../lib/contact.ts";

// 2026-11-12 10:00 in Taipei.
const now = Date.parse("2026-11-12T10:00:00+08:00");
const inDays = (days, hour = "10:00") => new Date(Date.parse(`2026-11-12T${hour}:00+08:00`) + days * 86_400_000).toISOString();

const base = {
  email: "member@example.com",
  full_name: "林小晴",
  line_id: "xiaoqing",
  birthday: "1994-04-09",
  role: "member",
  effective_status: "pending",
  access_expires_at: null,
};

test("pending members are split by whether the profile is complete", () => {
  assert.equal(accountStage(base, now), "pending-ready");
  assert.equal(accountStage({ ...base, line_id: "  " }, now), "pending-incomplete");
  assert.equal(accountStage({ ...base, birthday: null }, now), "pending-incomplete");
});

test("active access follows the server rule: a future expiry is required", () => {
  assert.equal(accountStage({ ...base, effective_status: "active", access_expires_at: inDays(30) }, now), "active");
  assert.equal(accountStage({ ...base, effective_status: "active", access_expires_at: inDays(8) }, now), "active");
  assert.equal(accountStage({ ...base, effective_status: "active", access_expires_at: inDays(7) }, now), "expiring");
  assert.equal(accountStage({ ...base, effective_status: "active", access_expires_at: inDays(0, "23:00") }, now), "expiring");
  // The server refuses these, so the page must not promise access.
  assert.equal(accountStage({ ...base, effective_status: "active", access_expires_at: null }, now), "expired");
  assert.equal(accountStage({ ...base, effective_status: "active", access_expires_at: inDays(-1) }, now), "expired");
});

test("other states and admin", () => {
  assert.equal(accountStage({ ...base, effective_status: "expired", access_expires_at: inDays(-3) }, now), "expired");
  assert.equal(accountStage({ ...base, effective_status: "suspended", access_expires_at: inDays(20) }, now), "suspended");
  assert.equal(accountStage({ ...base, role: "admin", effective_status: "active", full_name: null }, now), "admin");
});

test("days left are Taipei calendar days", () => {
  assert.equal(daysLeft(inDays(0, "23:30"), now), 0);
  assert.equal(remainingLabel(inDays(0, "23:30"), now), "今天到期");
  // 01:00 tomorrow in Taipei is still "1 day" even though fewer than 24 hours remain.
  assert.equal(daysLeft(new Date(Date.parse("2026-11-13T01:00:00+08:00")).toISOString(), now), 1);
  assert.equal(remainingLabel(inDays(30), now), "還有 30 天");
  assert.equal(daysLeft(inDays(-1), now), null);
  assert.equal(daysLeft("not a date", now), null);
});

test("dates are shown in Taipei time", () => {
  // 16:30 UTC on Dec 11 is already Dec 12 in Taipei.
  assert.equal(formatTaipeiDate("2026-12-11T16:30:00Z"), "2026年12月12日");
  assert.equal(formatTaipeiDate(null), null);
});

test("LINE messages carry what Zola needs and never the birthday", () => {
  const active = { ...base, effective_status: "active", access_expires_at: "2026-12-12T02:00:00Z" };
  for (const message of [activationRequestMessage(base), renewalRequestMessage(active), supportRequestMessage(base)]) {
    assert.match(message, /member@example\.com/);
    assert.match(message, /林小晴/);
    assert.equal(message.includes("1994"), false);
  }
  assert.match(renewalRequestMessage(active), /目前期限：2026年12月12日/);
  assert.equal(activationRequestMessage({ ...base, full_name: null }).includes("姓名"), false);
});

test("LINE link opens the official account chat with the message typed in", () => {
  const url = new URL(lineMessageUrl("你好\n姓名：A&B"));
  assert.equal(url.origin, "https://line.me");
  assert.match(url.pathname, /^\/R\/oaMessage\/%40[^/]+\/$/);
  assert.equal(decodeURIComponent(url.search.slice(1)), "你好\n姓名：A&B");
});

test("birthdays must be real past dates", () => {
  assert.equal(isValidBirthday("1994-04-09", now), true);
  assert.equal(isValidBirthday("2026-11-12", now), true);
  assert.equal(isValidBirthday("2026-11-13", now), false);
  assert.equal(isValidBirthday("2026-02-31", now), false);
  assert.equal(isValidBirthday("1899-12-31", now), false);
  assert.equal(isValidBirthday("1994/04/09", now), false);
});

test("profile validation returns member-facing messages instead of throwing", () => {
  assert.deepEqual(validateProfileInput({ fullName: " 林小晴 ", lineId: "xiaoqing ", birthday: "1994-04-09" }, now), {
    ok: true,
    value: { fullName: "林小晴", lineId: "xiaoqing", birthday: "1994-04-09" },
  });
  for (const bad of [null, "text", [], { fullName: 1, lineId: {}, birthday: [] }, {}]) {
    const result = validateProfileInput(bad, now);
    assert.equal(result.ok, false);
    assert.match(result.error, /請完整填寫/);
  }
  assert.match(validateProfileInput({ fullName: "字".repeat(41), lineId: "a", birthday: "1994-04-09" }, now).error, /40 個字/);
  assert.equal(validateProfileInput({ fullName: "字".repeat(40), lineId: "a", birthday: "1994-04-09" }, now).ok, true);
  assert.match(validateProfileInput({ fullName: "a", lineId: "b".repeat(51), birthday: "1994-04-09" }, now).error, /50 個字/);
  assert.match(validateProfileInput({ fullName: "a\nb", lineId: "b", birthday: "1994-04-09" }, now).error, /換行/);
  assert.match(validateProfileInput({ fullName: "a", lineId: "b", birthday: "2026-02-31" }, now).error, /正確的生日/);
});
