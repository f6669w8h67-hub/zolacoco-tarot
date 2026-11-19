import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTypescript } from "./helpers/load-typescript.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));
const trial = await loadTypescript("lib/visitor-trial.ts");

test("three uses for a registered account Zola has not activated; never for others", () => {
  assert.equal(trial.TRIAL_LIMIT, 3);
  assert.equal(trial.MEMBERSHIP_KEYWORD, "申請會員", "Zola's LINE auto-reply keyword");
  assert.equal(trial.hasTrialAccess({ role: "member", status: "pending" }), true);
  for (const member of [null, undefined, {}, { role: "admin", status: "pending" }, { role: "member", status: "active" }, { role: "member", status: "expired" }, { role: "member", status: "suspended" }]) {
    assert.equal(trial.hasTrialAccess(member), false, JSON.stringify(member));
  }
  assert.deepEqual([0, 1, 2, 3, 7, -2].map((used) => trial.trialRemaining(used)), [3, 2, 1, 0, 0, 3]);
  for (const odd of [undefined, null, "1", Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(trial.trialRemaining(odd), 0, `${odd} counts as used up`);
  assert.equal(trial.trialRemaining(1.7), 2);
  for (const id of ["tarot", "pendulum", "astro-dice"]) assert.equal(trial.isTrialFeature(id), true);
  for (const id of ["", "journal", "TAROT", null, 1]) assert.equal(trial.isTrialFeature(id), false);
  assert.deepEqual(plain(trial.TRIAL_FEATURES.map((feature) => [feature.id, feature.href])), [["tarot", "/#draw"], ["pendulum", "/pendulum"], ["astro-dice", "/astro-dice"]]);
});

test("only the homepage, 靈擺 and 星骰 open for the trial, exactly; no API, no sub-page", () => {
  for (const path of ["/", "/pendulum", "/pendulum/", "/astro-dice", "/astro-dice/"]) assert.equal(trial.isVisitorTrialPage(path), true, path);
  for (const path of ["", "//", "/pendulum/x", "/pendulum-x", "/astro-dice/a", "/api/practice", "/api", "/healing-room", "/astrology-exploration", "/journal", "/admin", "/zola-admin", "/tarot-readings", "/practice"]) {
    assert.equal(trial.isVisitorTrialPage(path), false, path);
  }
});

async function proxy(userId, member = { role: "member", status: "pending", access_expires_at: null }) {
  let lookups = 0;
  const env = { NODE_ENV: "production", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk", CLERK_SECRET_KEY: "sk", DATABASE_URL: "postgresql://stub" };
  const mod = await loadTypescript("proxy.ts", { env, mocks: {
    "@clerk/nextjs/server": { clerkMiddleware: (callback) => (request) => callback(async () => ({
      userId, redirectToSignIn: ({ returnBackUrl }) => Response.redirect(`https://site.test/sign-in?redirect_url=${encodeURIComponent(returnBackUrl)}`, 307),
    }), request) },
    "@neondatabase/serverless": { neon: () => async () => { lookups++; return member ? [member] : []; } },
    "next/server": { NextResponse: {
      next: () => new Response(null, { headers: { "x-middleware-next": "1" } }),
      redirect: (url) => Response.redirect(url, 307),
    } },
  } });
  return { request: (path) => mod.default({ url: `https://site.test${path}`, nextUrl: new URL(path, "https://site.test") }, {}), lookups: () => lookups };
}

test("proxy: signed out may look at the three pages; unactivated accounts may play there; nothing else changes", async () => {
  const out = await proxy(null);
  for (const path of ["/", "/pendulum", "/astro-dice"]) assert.equal((await out.request(path)).headers.get("x-middleware-next"), "1", path);
  for (const path of ["/healing-room", "/astrology-exploration", "/pendulum/extra", "/tarot-readings"]) {
    const response = await out.request(path);
    assert.equal(new URL(response.headers.get("location")).pathname, "/sign-in", path);
  }
  for (const path of ["/api/journal", "/api/practice", "/api/membership/admin/x"]) assert.equal((await out.request(path)).status, 401, path);
  // /api/trial checks the account itself (like /api/membership/me), so the proxy lets it through.
  assert.equal((await out.request("/api/trial")).headers.get("x-middleware-next"), "1");
  assert.equal(out.lookups(), 0);

  const pending = await proxy("user_1");
  for (const path of ["/", "/pendulum", "/astro-dice"]) assert.equal((await pending.request(path)).headers.get("x-middleware-next"), "1", `pending ${path}`);
  assert.equal(new URL((await pending.request("/healing-room")).headers.get("location")).pathname, "/account");
  assert.equal((await pending.request("/api/journal")).status, 403);
  // Just signed up, no member row yet: the trial pages open (the page's first check creates the row).
  const fresh = await proxy("user_new", null);
  for (const path of ["/", "/pendulum"]) assert.equal((await fresh.request(path)).headers.get("x-middleware-next"), "1", `new ${path}`);
  assert.equal(new URL((await fresh.request("/healing-room")).headers.get("location")).pathname, "/account");
  for (const status of ["expired", "suspended"]) {
    const other = await proxy("user_2", { role: "member", status, access_expires_at: "2000-01-01" });
    assert.equal(new URL((await other.request("/")).headers.get("location")).pathname, "/account", status);
  }
});

function trialService(member, { updated = [{ trial_used: (member.trial_used ?? 0) + 1 }] } = {}) {
  const queries = [];
  return loadTypescript("app/api/trial/route.ts", { mocks: {
    "@/lib/membership": {
      syncCurrentMember: async () => member,
      getSql: () => async (strings, ...values) => { queries.push({ text: strings.join("?"), values }); return updated; },
      membershipErrorResponse: () => Response.json({ error: "x" }, { status: 500 }),
    },
  } }).then((route) => ({ route, queries }));
}
const post = (body) => ({ json: async () => body });

test("/api/trial: reads and spends the account's three uses, in one guarded statement", async () => {
  const pendingMember = { id: "m1", role: "member", status: "pending", access_expires_at: null, trial_used: 1 };
  let { route, queries } = await trialService(pendingMember);
  assert.deepEqual(plain(await (await route.GET()).json()), { mode: "trial", used: 1, remaining: 2 });
  assert.equal((await route.POST(post({ feature: "journal" }))).status, 400);
  assert.equal((await route.POST(post(null))).status, 400);
  assert.equal(queries.length, 0, "a bad request touches nothing");
  const spent = await route.POST(post({ feature: "pendulum" }));
  assert.deepEqual(plain(await spent.json()), { mode: "trial", used: 2, remaining: 1 });
  assert.match(queries[0].text, /UPDATE members SET trial_used = trial_used \+ 1\s+WHERE id = \? AND role = 'member' AND status = 'pending' AND trial_used < \?\s+RETURNING trial_used/);
  assert.deepEqual(queries[0].values, ["m1", 3]);

  ({ route } = await trialService({ ...pendingMember, trial_used: 3 }, { updated: [] }));
  assert.deepEqual(plain(await (await route.GET()).json()), { mode: "trial", used: 3, remaining: 0 });
  const full = await route.POST(post({ feature: "tarot" }));
  assert.equal(full.status, 409);
  assert.equal((await full.json()).remaining, 0);

  ({ route, queries } = await trialService({ id: "m2", role: "member", status: "active", access_expires_at: "2099-01-01" }));
  assert.deepEqual(plain(await (await route.GET()).json()), { mode: "member" });
  assert.deepEqual(plain(await (await route.POST(post({ feature: "tarot" }))).json()), { mode: "member" });
  assert.equal(queries.length, 0, "members are never counted");
  for (const status of ["expired", "suspended"]) {
    ({ route, queries } = await trialService({ id: "m3", role: "member", status, access_expires_at: "2000-01-01" }));
    assert.deepEqual(plain(await (await route.GET()).json()), { mode: "none" }, status);
    assert.equal((await route.POST(post({ feature: "tarot" }))).status, 403, status);
    assert.equal(queries.length, 0);
  }
  const schema = await read("lib/membership.ts");
  assert.match(schema, /ALTER TABLE members ADD COLUMN IF NOT EXISTS trial_used integer NOT NULL DEFAULT 0/);
});

const gateMocks = (pathname, auth) => ({
  "react/jsx-runtime": jsx,
  "react": { useState: React.useState, useEffect: React.useEffect },
  "@clerk/nextjs": { SignInButton: ({ children }) => children, useAuth: () => auth },
  "next/navigation": { usePathname: () => pathname },
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "./styles/pearl-page.css": {},
  "./visitor-trial": { TrialProvider: ({ mode, children }) => React.createElement("div", { "data-trial": mode }, children) },
});

test("page gate: signed out on a trial page shows it (to register); an unactivated account plays there", async () => {
  for (const [pathname, auth, mode] of [
    ["/", { isLoaded: true, isSignedIn: false }, "signed-out"],
    ["/pendulum", { isLoaded: true, isSignedIn: false }, "signed-out"],
    ["/astro-dice", { isLoaded: true, isSignedIn: false }, "signed-out"],
    ["/healing-room", { isLoaded: true, isSignedIn: false }, null],
    ["/astrology-exploration", { isLoaded: true, isSignedIn: false }, null],
    ["/", { isLoaded: false, isSignedIn: false }, null],
  ]) {
    const { default: Gate } = await loadTypescript("app/membership-gate.tsx", { mocks: gateMocks(pathname, auth) });
    const html = renderToStaticMarkup(React.createElement(Gate, null, "PAGE_SENTINEL"));
    assert.equal(html.match(/data-trial="([^"]+)"/)?.[1] ?? null, mode, `${pathname} ${JSON.stringify(auth)}`);
    assert.equal(html.includes("PAGE_SENTINEL"), Boolean(mode), pathname);
  }
  const { default: Gate } = await loadTypescript("app/membership-gate.tsx", { mocks: gateMocks("/", { isLoaded: true, isSignedIn: true }) });
  const html = renderToStaticMarkup(React.createElement(Gate, null, "PAGE_SENTINEL"));
  assert.doesNotMatch(html, /data-trial|PAGE_SENTINEL/, "signed in: waits for the member check first");
  const gate = await read("app/membership-gate.tsx");
  assert.match(gate, /if \(access\.status === "allowed"\) return children;\n[^\n]*\n  if \(access\.status === "pending" && isVisitorTrialPage\(pathname\)\) return <TrialProvider mode="account">/);
  // Pending elsewhere: registering is not applying — play first, apply through LINE when ready.
  assert.match(gate, /pending: \["這裡是會員專屬空間", `開通前，可以先免費體驗 \$\{TRIAL_LIMIT\} 次抽牌、靈擺或星骰；想成為會員，按「申請成為會員」就會打開 Zola 的官方 LINE。`\]/);
  assert.match(gate, /<Link className="gate-primary" href="\/#trial">先免費體驗 \{TRIAL_LIMIT\} 次<\/Link>\n\s+<a className="gate-secondary" href=\{lineMessageUrl\(MEMBERSHIP_KEYWORD\)\}[^>]*>申請成為會員<\/a>/);
  assert.doesNotMatch(gate, /申請已收到/);
});

const componentMocks = {
  "react/jsx-runtime": jsx,
  "react": React,
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "./styles/visitor-trial.css": {},
};

test("members see nothing; signed out sees 免費註冊; the account's count comes from /api/trial", async () => {
  const ui = await loadTypescript("app/visitor-trial.tsx", { mocks: componentMocks });
  const source0 = await read("app/visitor-trial.tsx");
  const both = (provider) => renderToStaticMarkup(provider(React.createElement(React.Fragment, null, React.createElement(ui.TrialMeter), React.createElement(ui.TrialLimitCard))));
  assert.equal(both((children) => children), "", "no provider = member");
  const signedOut = both((children) => React.createElement(ui.TrialProvider, { mode: "signed-out" }, children));
  assert.match(signedOut, /<h3 id="[^"]+">免費註冊，就能體驗 3 次<\/h3>/);
  assert.match(signedOut, /<a class="trial-apply" href="\/sign-up">免費註冊<\/a>/);
  assert.match(signedOut, /<a class="trial-sign-in" href="\/sign-in">已經有帳號？登入<\/a>/);
  assert.doesNotMatch(signedOut, /trial-meter/);
  const loading = both((children) => React.createElement(ui.TrialProvider, { mode: "account" }, children));
  assert.match(loading, /正在確認妳的體驗次數/, "nothing to play until the account's count is read");
  assert.deepEqual([
    { mode: "member" }, { mode: "trial", remaining: 2 }, { mode: "trial", remaining: 9 }, { mode: "trial", remaining: -1 },
    { mode: "trial", remaining: "2" }, { mode: "none" }, {},
  ].map((data) => ui.remainingFrom(data)), [Number.POSITIVE_INFINITY, 2, 3, 0, 0, 0, 0]);
  // A spend that is not clearly answered stops the trial (ChatGPT review #51): refused, server error,
  // unreadable or a network failure; 409 (used up) and a normal answer give the server's count.
  assert.deepEqual([
    [200, { mode: "trial", remaining: 2 }], [409, { mode: "trial", remaining: 0 }], [200, { mode: "member" }],
    [403, { error: "TRIAL_NOT_AVAILABLE" }], [500, { error: "x" }], [401, null], [200, null], [200, { mode: "trial" }], [200, { mode: "none" }],
  ].map(([status, data]) => ui.spendOutcome(status, data)), [2, 0, Number.POSITIVE_INFINITY, "failed", "failed", "failed", "failed", "failed", "failed"]);
  assert.match(source0, /if \(outcome === "failed"\) setFailed\(true\); else setRemaining\(outcome\);\n\s+\}\)\n\s+\.catch\(\(\) => \{ setFailed\(true\); \}\);/, "network failure stops too");
  assert.equal(ui.membershipApplyUrl, `https://line.me/R/oaMessage/${encodeURIComponent("@903ijdgr")}/?${encodeURIComponent("申請會員")}`);
  const source = await read("app/visitor-trial.tsx");
  assert.match(source, /fetch\("\/api\/trial", \{ cache: "no-store" \}\)/);
  assert.match(source, /fetch\("\/api\/trial", \{ method: "POST", headers: \{ "content-type": "application\/json" \}, body: JSON\.stringify\(\{ feature \}\) \}\)/);
  assert.match(source, /canPlay: ready && !failed && left > 0/);
  assert.match(source, /抽牌、靈擺、星骰不再限制次數，也能保存紀錄；還有星盤探索、療癒室、直覺練習和七日內在筆記。/);
  assert.doesNotMatch(source, /全站|練習室|陪跑|localStorage/);
  assert.match(source, /<a className="trial-apply" href=\{membershipApplyUrl\} target="_blank" rel="noreferrer">申請成為會員<\/a>/);
});

test("each feature spends one use when it completes, and cannot start once none are left", async () => {
  const home = await read("app/page.tsx");
  assert.match(home, /function shuffleDeck\(\) \{\n    if \(shuffling \|\| !trial\.canPlay\) return;/);
  assert.match(home, /setRevealed\(true\); if \(trial\.visitor\) trial\.spend\("tarot"\);/);
  assert.match(home, /\{spreadCards\.length === 0 && !trial\.canPlay \? <TrialLimitCard \/>/);
  assert.match(home, /<h2 id="trial-title">我想玩玩看<\/h2>/);
  assert.match(home, /\? <a className="primary" href="#trial">我想玩玩看/);
  assert.match(home, /trial\.visitor\n\s+\? <a className="flow-button secondary-flow" href=\{membershipApplyUrl\}[^>]*>加入會員就能保存紀錄<\/a>/, "visitors cannot save to the member archive");
  assert.match(home, /\{trial\.visitor \? <div className="visitor-locked">/, "直覺練習 and 七日筆記 stay member-only");
  assert.match(home, /if \(trial\.visitor\) return;\n    let active = true;\n    void loadMemberProfile/, "no member lookup for visitors");

  const pendulum = await read("app/pendulum/page.tsx");
  assert.match(pendulum, /if\(moving\|\|calibrating\|\|!trial\.canPlay\)return;/);
  assert.match(pendulum, /navigator\.vibrate\?\.\(18\);if\(trial\.visitor\)trial\.spend\("pendulum"\);revealResult\(\)/);
  assert.match(pendulum, /:trial\.canPlay\?<button type="button" className="pv-start"[^]*?:<TrialLimitCard\/>\}/);
  // Saving is a member benefit on all three pages: visitors get the 申請 link and no record list.
  assert.match(pendulum, /\{trial\.visitor\?<a className="pv-save" href=\{membershipApplyUrl\}[^>]*>加入會員就能保存紀錄<\/a>:<button type="button" className="pv-save"/);
  assert.match(pendulum, /\{!trial\.visitor&&<section className="pv-history" id="pendulum-records">/);

  const dice = await read("app/astro-dice/page.tsx");
  assert.match(dice, /if\(!question\.trim\(\)\|\|busyRef\.current\|\|!trial\.canPlay\)return;/);
  assert.match(dice, /navigator\.vibrate\?\.\(18\);if\(trial\.visitor\)trial\.spend\("astro-dice"\);/);
  assert.match(dice, /\{trial\.canPlay\|\|busy\?<button type="button" className="ad2-cast"[^]*?:<TrialLimitCard\/>\}/);
  assert.match(dice, /\{trial\.visitor\?<a className="ad2-save" href=\{membershipApplyUrl\}[^>]*>加入會員就能保存紀錄<\/a>:<button type="button" className="ad2-save"/);
  assert.match(dice, /\{!trial\.visitor&&<details className="ad2-fold" id="astro-records"/);

  for (const [name, source] of [["home", home], ["pendulum", pendulum], ["dice", dice]]) {
    // The pages themselves call no API for the trial; only app/visitor-trial.tsx talks to /api/trial.
    assert.doesNotMatch(source, /fetch\(\s*["'`]\/api\/(?!membership\/me)/, `${name}: no API call from the page`);
  }
});

test("signed out is asked to register; the account page and Zola's admin show the count", async () => {
  const home = await read("app/page.tsx");
  assert.match(home, /<b>免費註冊，就能體驗 \{TRIAL_LIMIT\} 次<\/b>/);
  assert.match(home, /\{trial\.mode === "signed-out" \? "用 Email 免費註冊後，" : ""\}下面三種體驗合計可以玩/);
  assert.match(home, /\{trial\.canPlay \|\| trial\.mode === "signed-out" \? <div className="visitor-trial-grid">/, "signed out still sees what there is to try");
  assert.match(home, /\{trial\.mode === "signed-out"\n\s+\? <Link href="\/sign-up">先免費註冊<\/Link>/);
  assert.doesNotMatch(home, /不用註冊/);
  const account = await read("app/account/account-view.tsx");
  assert.match(account, /function TrialInvite\(\{ member \}: \{ member: ClientMember \}\) \{\n  const left = trialRemaining\(member\.trial_used \?\? 0\);/);
  assert.equal((account.match(/<TrialInvite member=\{member\} \/>/g) || []).length, 2, "both pending stages");
  assert.match(account, /<Link href="\/#trial">現在還剩 \{left\} 次 →<\/Link>/);
  const admin = await read("app/zola-admin/admin-client.tsx");
  assert.match(admin, /member\.effective_status === "pending" \? <small className="member-admin-trial">免費體驗：已用 \{Math\.min\(3, member\.trial_used \?\? 0\)\}／3 次<\/small>/);
});

test("我想玩玩看 cards show the pendulum and the die in their rooms, not empty rooms (Zola 2026-11-19)", async () => {
  const home = await read("app/page.tsx");
  assert.match(home, /pendulum: \{ room: "\/pendulum\/hero-desktop\.webp", charm: \["\/pendulum\/metal\.webp", "\/pendulum\/crystal\.webp"\] \}/);
  assert.match(home, /"astro-dice": \{ room: "\/astro-dice\/hero-desktop\.webp", charm: \["\/astro-dice\/die\.webp"\] \}/);
  assert.match(home, /<span className="visitor-trial-charm">\{trialArt\[feature\.id\]\.charm\.map/);
  const css = await read("app/styles/visitor-trial.css");
  assert.match(css, /\[data-feature="pendulum"\] \.visitor-trial-charm \{ top: -18px;/);
  assert.match(css, /\[data-feature="astro-dice"\] \.visitor-trial-charm \{ top: 50%;/);
  const { existsSync } = await import("node:fs");
  for (const file of ["pendulum/metal.webp", "pendulum/crystal.webp", "astro-dice/die.webp", "tarot-scenes/major-17.webp"]) assert.ok(existsSync(new URL(`../public/${file}`, import.meta.url)), file);
});

test("development preview can show the trial screens; production never takes that branch", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /process\.env\.MEMBERSHIP_PREVIEW_AS === "signed-out" \|\| process\.env\.MEMBERSHIP_PREVIEW_AS === "account"\n\s+\? <TrialProvider mode=\{process\.env\.MEMBERSHIP_PREVIEW_AS\}>/);
  const { allowsMembershipPreview } = await loadTypescript("lib/membership-access.ts");
  assert.equal(allowsMembershipPreview({ NODE_ENV: "production", VERCEL_ENV: "production", MEMBERSHIP_PREVIEW: "true" }), false);
});

test("trial styles stay in the pearl palette (no earth tones, no deep purple)", async () => {
  const css = await read("app/styles/visitor-trial.css");
  const hsl = (hex) => {
    const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  const ornamentGold = new Set(["#c5a46f", "#d8be8a"]);
  for (const hex of (css.match(/#[0-9a-fA-F]{6}\b/g) || []).map((value) => value.toLowerCase())) {
    if (ornamentGold.has(hex)) continue;
    const [h, s, l] = hsl(hex);
    assert.ok(!(h >= 15 && h <= 55 && s >= .12 && (l < .55 || (s < .45 && l < .9))), `earthy ${hex}`);
    assert.ok(!(h >= 230 && h <= 335 && s >= .12 && l <= .38), `deep purple ${hex}`);
  }
});
