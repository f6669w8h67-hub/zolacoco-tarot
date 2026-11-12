import assert from "node:assert/strict";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// PATCH /api/membership/me with Clerk/Neon stubbed: invalid input must be a 400 with a
// member-facing message, and must never reach the database.
let databaseTouched = false;
const route = await loadTypescript("app/api/membership/me/route.ts", {
  mocks: {
    "@/lib/membership": {
      syncCurrentMember: async () => ({ id: "member-1", role: "member", status: "pending" }),
      membershipErrorResponse: () => Response.json({ error: "MEMBERSHIP_SERVICE_ERROR" }, { status: 500 }),
      getSql() { databaseTouched = true; throw new Error("database must not be reached"); },
    },
    "@/lib/member-activation-email": { notifyPendingMember: async () => {} },
  },
});

function patch(body, { raw = false } = {}) {
  return route.PATCH(new Request("https://example.test/api/membership/me", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: raw ? body : JSON.stringify(body),
  }));
}

test("rejects malformed and invalid profiles with 400 before any database work", async () => {
  const cases = [
    [patch("{not json", { raw: true }), /資料格式不正確/],
    [patch({ fullName: "林小晴", lineId: "xiaoqing", birthday: "2026-02-31" }), /正確的生日/],
    [patch({ fullName: "林小晴", lineId: "xiaoqing", birthday: "2999-01-01" }), /正確的生日/],
    [patch({ fullName: "字".repeat(41), lineId: "xiaoqing", birthday: "1994-04-09" }), /40 個字/],
    [patch({ fullName: ["array"], lineId: "xiaoqing", birthday: "1994-04-09" }), /請完整填寫/],
    [patch(null), /請完整填寫/],
  ];
  for (const [pending, message] of cases) {
    const response = await pending;
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, message);
  }
  assert.equal(databaseTouched, false);
});
