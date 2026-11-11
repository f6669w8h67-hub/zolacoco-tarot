import assert from "node:assert/strict";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

const configured = {
  NODE_ENV: "production",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_stub",
  CLERK_SECRET_KEY: "sk_test_stub",
  DATABASE_URL: "postgresql://stub",
};
const headerUser = { displayName: "Member", email: "Member@Example.com", fullName: "Member" };
const activeMember = { id: "m1", email: "member@example.com", role: "member", status: "active", effective_status: "active" };

// Mirrors membershipErrorResponse() so status mapping is exercised without a database.
function membershipErrorResponse(error) {
  if (error.status) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: "MEMBERSHIP_SERVICE_ERROR" }, { status: 500 });
}

async function load({ env = configured, header = headerUser, member = activeMember, rejection } = {}) {
  const calls = { lookups: 0 };
  const mod = await loadTypescript("lib/member-data-auth.ts", {
    env,
    mocks: {
      "@/app/chatgpt-auth": { getChatGPTUser: async () => header },
      "@/lib/membership": {
        requireActiveMember: async () => {
          calls.lookups++;
          if (rejection) throw rejection;
          return member;
        },
        membershipErrorResponse,
      },
    },
  });
  return { mod, calls };
}

test("unconfigured Clerk fails closed before any identity or database work", async () => {
  const { mod, calls } = await load({ env: { NODE_ENV: "production" } });
  const access = await mod.authorizeMemberData();
  assert.equal(access.ok, false);
  assert.equal(access.response.status, 503);
  assert.equal((await access.response.json()).error, "MEMBERSHIP_NOT_CONFIGURED");
  assert.equal(calls.lookups, 0);
});

test("a request without an identity header is unauthenticated", async () => {
  const { mod, calls } = await load({ header: null });
  const access = await mod.authorizeMemberData();
  assert.equal(access.ok, false);
  assert.equal(access.response.status, 401);
  assert.equal(calls.lookups, 0);
});

test("a header for someone else's email is refused even for an active member", async () => {
  const { mod } = await load({ header: { ...headerUser, email: "victim@example.com" } });
  const access = await mod.authorizeMemberData();
  assert.equal(access.ok, false);
  assert.equal(access.response.status, 403);
  assert.equal((await access.response.json()).error, "EMAIL_MISMATCH");
});

test("the member's own email matches case-insensitively and is allowed", async () => {
  const { mod } = await load();
  const access = await mod.authorizeMemberData();
  assert.equal(access.ok, true);
  assert.equal(access.user.email, headerUser.email);
});

test("membership status failures keep their 403 status", async () => {
  const rejection = Object.assign(new Error("EXPIRED"), { status: 403 });
  const { mod } = await load({ rejection });
  const access = await mod.authorizeMemberData();
  assert.equal(access.ok, false);
  assert.equal(access.response.status, 403);
  assert.equal((await access.response.json()).error, "EXPIRED");
});

test("unexpected lookup errors become a generic 500", async () => {
  const { mod } = await load({ rejection: new Error("connection reset") });
  const access = await mod.authorizeMemberData();
  assert.equal(access.ok, false);
  assert.equal(access.response.status, 500);
  assert.equal((await access.response.json()).error, "MEMBERSHIP_SERVICE_ERROR");
});
