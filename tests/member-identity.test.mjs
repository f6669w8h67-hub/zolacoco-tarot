import assert from "node:assert/strict";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

const env = {
  NODE_ENV: "production",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_stub",
  CLERK_SECRET_KEY: "sk_test_stub",
  DATABASE_URL: "postgresql://stub",
};

function clerkUser({ verified = true, primary = true, email = "Member@Example.com" } = {}) {
  const address = { id: "e1", emailAddress: email, verification: { status: verified ? "verified" : "unverified" } };
  return { primaryEmailAddressId: primary ? "e1" : null, firstName: "測", lastName: "試", emailAddresses: [address] };
}

async function load({ user, insertRows = [] }) {
  const queries = [];
  const mod = await loadTypescript("lib/membership.ts", {
    env,
    mocks: {
      "@clerk/nextjs/server": {
        auth: async () => ({ userId: "user_1" }),
        currentUser: async () => user,
      },
      "@neondatabase/serverless": {
        neon: () => async (strings) => {
          const text = strings.join("?");
          queries.push(text);
          return text.includes("INSERT INTO members") ? insertRows : [];
        },
      },
    },
  });
  return { mod, queries };
}

test("an unverified primary email never identifies a member", async () => {
  const { mod, queries } = await load({ user: clerkUser({ verified: false }) });
  await assert.rejects(mod.syncCurrentMember(), (error) => error.status === 403 && error.message === "EMAIL_NOT_VERIFIED");
  assert.equal(queries.some((query) => query.includes("INSERT INTO members")), false);
});

test("the non-primary fallback address must also be verified", async () => {
  const { mod } = await load({ user: clerkUser({ verified: false, primary: false }) });
  await assert.rejects(mod.requireIdentity(), (error) => error.status === 403);
});

test("an email already linked to another Clerk user is refused, not re-linked", async () => {
  const { mod, queries } = await load({ user: clerkUser(), insertRows: [] });
  await assert.rejects(mod.syncCurrentMember(), (error) => error.status === 409 && error.message === "EMAIL_ALREADY_LINKED");
  const upsert = queries.find((query) => query.includes("INSERT INTO members"));
  assert.match(upsert, /WHERE members\.clerk_user_id IS NULL OR members\.clerk_user_id = EXCLUDED\.clerk_user_id/);
});

test("a verified email for an unlinked or same Clerk user syncs the member", async () => {
  const row = { id: "m1", clerk_user_id: "user_1", email: "member@example.com", role: "member", status: "pending", effective_status: "pending" };
  const { mod } = await load({ user: clerkUser(), insertRows: [row] });
  const member = await mod.syncCurrentMember();
  assert.equal(member.id, "m1");
  assert.equal(member.status, "pending");
});
