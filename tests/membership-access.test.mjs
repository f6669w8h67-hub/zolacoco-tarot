import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTypescript } from "./helpers/load-typescript.mjs";

const configured = {
  NODE_ENV: "production", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_stub",
  CLERK_SECRET_KEY: "sk_test_stub", DATABASE_URL: "postgresql://stub",
};
const active = { role: "member", status: "active", effective_status: "active", access_expires_at: "2099-01-01" };
const publicPages = ["/account", "/account/", "/sign-in", "/sign-in/factor-one", "/sign-up", "/sign-up/verify-email-address"];
const protectedPaths = ["/", "/healing-room", "/zola-admin", "/api/journal", "/trpc/private", "/accounting", "/sign-in-extra", "/api/membership/me-extra", "/api/membership/admin/extra"];

async function boundary({ env = configured, userId = "user_1", member = active, databaseError = false } = {}) {
  let lookups = 0;
  let middlewareOptions;
  const mod = await loadTypescript("proxy.ts", { env, mocks: {
    "@clerk/nextjs/server": { clerkMiddleware: (callback, options) => { middlewareOptions = options; return (request) => callback(async () => ({
      // Like Clerk: the configured signInUrl, or the hosted Account Portal when none is set.
      userId, redirectToSignIn: ({ returnBackUrl }) => Response.redirect(`${new URL(options?.signInUrl ?? "https://accounts.example.dev/sign-in", "https://site.test")}?redirect_url=${encodeURIComponent(returnBackUrl)}`, 307),
    }), request); } },
    "@neondatabase/serverless": { neon: () => async () => {
      lookups++;
      if (databaseError) throw new Error("database unavailable");
      return member ? [member] : [];
    } },
    "next/server": { NextResponse: {
      next: () => new Response(null, { headers: { "x-middleware-next": "1" } }),
      redirect: (url) => Response.redirect(url, 307),
    } },
  } });
  return {
    request: (path) => mod.default({ url: `https://site.test${path}`, nextUrl: new URL(path, "https://site.test") }, {}),
    lookups: () => lookups,
    options: () => middlewareOptions,
  };
}
const passes = (response) => assert.equal(response.headers.get("x-middleware-next"), "1");

for (const keys of [{}, { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk" }, { CLERK_SECRET_KEY: "sk" }, { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: " ", CLERK_SECRET_KEY: "sk" }]) {
  test(`production fails closed for incomplete Clerk configuration: ${Object.keys(keys)}`, async () => {
    const gate = await boundary({ env: { NODE_ENV: "production", ...keys } });
    for (const path of protectedPaths) {
      const response = await gate.request(path);
      assert.equal(response.status, 503, path);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("location"), null);
    }
    for (const path of publicPages) passes(await gate.request(path));
    for (const path of ["/api/membership/me", "/api/membership/admin"]) {
      const response = await gate.request(path);
      assert.equal(response.status, 503);
      assert.equal((await response.json()).error, "MEMBERSHIP_NOT_CONFIGURED");
    }
    assert.equal(gate.lookups(), 0);
  });
}

test("development preview works; production cannot opt into the preview bypass", async () => {
  for (const env of [{ NODE_ENV: "development" }, { NODE_ENV: "test" }, { NODE_ENV: "production", VERCEL_ENV: "preview", MEMBERSHIP_PREVIEW: "true" }]) {
    const gate = await boundary({ env });
    passes(await gate.request("/"));
    assert.equal((await gate.request("/api/membership/admin")).status, 503);
  }
  for (const env of [{}, { NODE_ENV: "production", VERCEL_ENV: "preview" }, { NODE_ENV: "production", MEMBERSHIP_PREVIEW: "true" }, { NODE_ENV: "development", VERCEL_ENV: "production", MEMBERSHIP_PREVIEW: "true" }]) {
    assert.equal((await (await boundary({ env })).request("/")).status, 503);
  }
});

test("signed-out pages redirect to sign-in, APIs return JSON 401; public routes do not loop", async () => {
  const gate = await boundary({ userId: null });
  const response = await gate.request("/healing-room");
  assert.equal(new URL(response.headers.get("location")).pathname, "/sign-in");
  for (const path of ["/api/journal", "/trpc/private"]) {
    const response = await gate.request(path);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, "UNAUTHENTICATED");
  }
  for (const path of [...publicPages, "/api/membership/me", "/api/membership/admin"]) passes(await gate.request(path));
  assert.equal(gate.lookups(), 0);
});

for (const [label, member, allowed] of [
  ["active", active, true], ["admin", { role: "admin", status: "expired" }, true],
  ["expired", { ...active, access_expires_at: "2000-01-01" }, false],
  ["pending", { ...active, status: "pending" }, false],
  ["suspended", { ...active, status: "suspended" }, false],
  ["missing expiry", { ...active, access_expires_at: null }, false],
  ["invalid expiry", { ...active, access_expires_at: "invalid" }, false],
  ["missing member", undefined, false],
]) {
  test(`${label} membership is enforced on pages and APIs`, async () => {
    const gate = await boundary({ member: member ?? null });
    for (const path of ["/healing-room", "/api/journal"]) {
      const response = await gate.request(path);
      if (allowed) passes(response);
      else if (path.startsWith("/api")) assert.equal(response.status, 403);
      else {
        assert.equal(response.status, 307);
        assert.equal(new URL(response.headers.get("location")).pathname, "/account");
      }
    }
    passes(await gate.request("/account"));
  });
}

test("database configuration/lookup failures deny access without redirect loops", async () => {
  for (const options of [{ env: { ...configured, DATABASE_URL: "" } }, { databaseError: true }]) {
    const gate = await boundary(options);
    for (const path of ["/", "/api/journal"]) assert.equal((await gate.request(path)).status, 503);
    passes(await gate.request("/account"));
  }
});

test("expiry boundary is exclusive", async () => {
  const { hasMemberAccess } = await loadTypescript("lib/membership-access.ts");
  const now = Date.parse(active.access_expires_at);
  assert.equal(hasMemberAccess(active, now - 1), true);
  assert.equal(hasMemberAccess(active, now), false);
});

const uiMocks = (pathname) => ({
  "react/jsx-runtime": jsx,
  "react": { useState: React.useState, useEffect: React.useEffect },
  "@clerk/nextjs": { SignInButton: () => null, useAuth: () => { throw new Error("Clerk must not be used without keys"); } },
  "next/navigation": { usePathname: () => pathname },
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "./styles/pearl-page.css": {},
});

test("unconfigured layout fallback hides VIP children but renders public pages without Clerk hooks", async () => {
  for (const pathname of ["/healing-room", "/accounting", ...publicPages]) {
    const { UnconfiguredMembershipGate } = await loadTypescript("app/membership-gate.tsx", { mocks: uiMocks(pathname) });
    const html = renderToStaticMarkup(React.createElement(UnconfiguredMembershipGate, null, "VIP_SENTINEL"));
    assert.equal(html.includes("VIP_SENTINEL"), publicPages.includes(pathname), pathname);
  }
});

test("sign-in/sign-up render setup screens when only the public key exists", async () => {
  for (const page of ["sign-in", "sign-up"]) {
    const mod = await loadTypescript(`app/${page}/[[...${page}]]/page.tsx`, {
      env: { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk" },
      mocks: { "react/jsx-runtime": jsx, "../../styles/pearl-page.css": {}, "@clerk/nextjs": {
        SignIn: () => { throw new Error("missing provider"); }, SignUp: () => { throw new Error("missing provider"); },
      } },
    });
    assert.match(renderToStaticMarkup(React.createElement(mod.default)), /服務設定中/);
  }
});

async function membershipService({ env = configured, member = active, userId = "user_1", email = "admin@example.com", file = "lib/membership.ts" } = {}) {
  return loadTypescript(file, { env: { ...env, ADMIN_EMAIL: "admin@example.com" }, mocks: {
    "@clerk/nextjs/server": { auth: async () => ({ userId }), currentUser: async () => ({
      emailAddresses: [{ id: "primary", emailAddress: email, verification: { status: "verified" } }], primaryEmailAddressId: "primary",
    }) },
    "@neondatabase/serverless": { neon: () => async (strings) => strings.join("").includes("INSERT INTO members") ? [{ email, ...member }] : [] },
  } });
}

test("service identity checks fail closed even when the proxy is bypassed", async () => {
  const missing = await membershipService({ env: { NODE_ENV: "production" } });
  await assert.rejects(missing.requireIdentity(), (error) => error.status === 503);
  const signedOut = await membershipService({ userId: null });
  await assert.rejects(signedOut.requireIdentity(), (error) => error.status === 401);
});

test("active-member and admin service guards reject expired/ordinary members", async () => {
  for (const member of [active, { ...active, access_expires_at: null }, { ...active, access_expires_at: "2000-01-01", effective_status: "expired" }, { ...active, role: "admin" }]) {
    const service = await membershipService({ member });
    if (member.role === "admin" || member === active) await service.requireActiveMember();
    else await assert.rejects(service.requireActiveMember(), (error) => error.status === 403);
    if (member.role === "admin") await service.requireAdmin();
    else await assert.rejects(service.requireAdmin(), (error) => error.status === 403);
  }
  const wrongEmail = await membershipService({ member: { ...active, role: "admin" }, email: "other@example.com" });
  await assert.rejects(wrongEmail.requireAdmin(), (error) => error.status === 403);
});

test("root layout selects a closed fallback in production and retains development preview", async () => {
  for (const [env, expected] of [
    [{ NODE_ENV: "production" }, "closed"],
    [{ ...configured, CLERK_SECRET_KEY: "" }, "closed"],
    [configured, "authenticated"],
    [{ NODE_ENV: "development" }, "preview"],
  ]) {
    const wrapper = (label) => function TestGate({ children }) { return React.createElement("div", { "data-gate": label }, children); };
    let providerProps = null;
    const provider = (props) => { providerProps = props; return wrapper("provider")(props); };
    const mod = await loadTypescript("app/layout.tsx", { env, mocks: {
      "react/jsx-runtime": jsx,
      "@clerk/nextjs": { ClerkProvider: provider },
      "@clerk/localizations/zh-TW": { zhTW: { locale: "zh-TW", signIn: { password: { subtitle: "以繼續前往 {{applicationName}}" } } } },
      "next/font/google": { Geist: () => ({ variable: "sans" }), Geist_Mono: () => ({ variable: "mono" }) },
      "./globals.css": {},
      "./rococo-membership.css": {},
      "./styles/rococo-tokens.css": {},
      "./styles/rococo-tarot.css": {},
      "./styles/serif-all.css": {},
      "./styles/card-face.css": {},
      "./site-header": { default: () => null },
      "./site-notice": { default: () => null },
      "./pearl-fonts": { default: () => null },
      "./membership-gate": { default: wrapper("authenticated"), UnconfiguredMembershipGate: wrapper("closed") },
    } });
    const html = renderToStaticMarkup(React.createElement(mod.default, null, "VIP_SENTINEL"));
    if (expected === "preview") assert.doesNotMatch(html, /data-gate/);
    else assert.match(html, new RegExp(`data-gate="${expected}"`));
    assert.equal(html.includes('data-gate="provider"'), expected === "authenticated");
    if (expected === "authenticated") {
      // Clerk screens are in Traditional Chinese and name the site, not the Clerk app id.
      assert.equal(providerProps.localization.locale, "zh-TW");
      assert.equal(providerProps.localization.signIn.password.subtitle, "以繼續前往 Zolacoco Tarot");
    }
  }
});

test("subscription-exempt membership APIs retain their own server authorization", async () => {
  for (const file of ["app/api/membership/me/route.ts", "app/api/membership/admin/route.ts"]) {
    const missing = await membershipService({ file, env: { NODE_ENV: "production" } });
    assert.equal((await missing.GET()).status, 503);
    const signedOut = await membershipService({ file, userId: null });
    assert.equal((await signedOut.GET()).status, 401);
  }
  const admin = await membershipService({ file: "app/api/membership/admin/route.ts" });
  assert.equal((await admin.GET()).status, 403);
  const selfService = await membershipService({ file: "app/api/membership/me/route.ts", member: {
    ...active, access_expires_at: "2000-01-01", status: "expired", effective_status: "expired",
  } });
  assert.equal((await selfService.GET()).status, 200);
});

test("signed-out visitors go to the site's own /sign-in with a way back, never Clerk's hosted page", async () => {
  const gate = await boundary({ userId: null });
  assert.equal(gate.options().signInUrl, "/sign-in");
  assert.equal(gate.options().signUpUrl, "/sign-up");
  for (const path of ["/healing-room", "/astrology-exploration", "/pendulum"]) {
    const response = await gate.request(path);
    assert.equal(response.status, 307, path);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.origin + location.pathname, "https://site.test/sign-in", path);
    assert.equal(location.searchParams.get("redirect_url"), `https://site.test${path}`);
  }
  const api = await gate.request("/api/journal");
  assert.equal(api.status, 401, "APIs still answer 401 JSON, not a sign-in page");
  assert.equal((await api.json()).error, "UNAUTHENTICATED");
  assert.equal(gate.lookups(), 0);
});

test("sign-in and sign-up return her to where she was going, and fall back to /account", async () => {
  for (const page of ["sign-in", "sign-up"]) {
    const source = await readFile(new URL(`../app/${page}/[[...${page}]]/page.tsx`, import.meta.url), "utf8");
    assert.match(source, /fallbackRedirectUrl="\/account"/, page);
    assert.doesNotMatch(source, /forceRedirectUrl/, page);
  }
});
