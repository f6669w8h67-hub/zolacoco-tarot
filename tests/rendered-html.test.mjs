import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async (t) => {
  // A production-mode build is not implicitly a keyless preview. Opt in for
  // this fixture only, leaving real production requests fail-closed.
  const previous = { VERCEL_ENV: process.env.VERCEL_ENV, MEMBERSHIP_PREVIEW: process.env.MEMBERSHIP_PREVIEW };
  process.env.VERCEL_ENV = "preview";
  process.env.MEMBERSHIP_PREVIEW = "true";
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("built worker denies keyless production while keeping auth/account pages reachable", async (t) => {
  const keys = ["VERCEL_ENV", "MEMBERSHIP_PREVIEW", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.VERCEL_ENV = "production";
  // Even a mistakenly retained preview switch must not open production.
  process.env.MEMBERSHIP_PREVIEW = "true";
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  delete process.env.CLERK_SECRET_KEY;
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const { default: worker } = await import("../dist/server/index.js");
  const fetch = (path, headers = {}) => worker.fetch(new Request(`http://localhost${path}`, { headers }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });

  for (const path of ["/", "/healing-room", "/api/journal", "/api/membership/me", "/api/membership/admin"]) {
    const response = await fetch(path);
    assert.equal(response.status, 503, path);
    assert.equal(response.headers.get("location"), null);
    if (path.startsWith("/api/")) assert.equal((await response.json()).error, "MEMBERSHIP_NOT_CONFIGURED");
  }
  // RSC requests must be denied by the same server boundary.
  assert.equal((await fetch("/healing-room?_rsc=test", { RSC: "1" })).status, 503);
  for (const path of ["/account", "/sign-in", "/sign-up"]) {
    const response = await fetch(path, { accept: "text/html" });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("location"), null);
  }
});
