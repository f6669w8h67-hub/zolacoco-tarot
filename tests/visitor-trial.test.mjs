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

test("three uses in all, counted on the visitor's device; unreadable values never give more", () => {
  assert.equal(trial.TRIAL_LIMIT, 3);
  assert.equal(trial.MEMBERSHIP_KEYWORD, "申請會員", "Zola's LINE auto-reply keyword");
  assert.deepEqual(plain(trial.parseTrial(null)), { used: 0, last: null });
  for (const raw of ["", "not json", "[]", '{"used":"2"}', '{"used":-4}', '{"used":null}']) assert.equal(trial.parseTrial(raw).used, 0, raw);
  assert.equal(trial.parseTrial('{"used":2.9}').used, 2);
  assert.equal(trial.parseTrial('{"used":99}').used, 3, "never past the limit");
  let raw = null;
  const steps = [];
  for (const feature of ["tarot", "pendulum", "astro-dice", "tarot"]) {
    const next = trial.spendTrial(raw, feature, new Date("2026-11-19T10:00:00Z"));
    raw = next.value;
    steps.push(next.used);
  }
  assert.deepEqual(steps, [1, 2, 3, 3]);
  assert.equal(JSON.parse(raw).last, "tarot@2026-11-19T10:00:00.000Z");
  assert.deepEqual([0, 1, 2, 3, 4].map((used) => trial.trialRemaining(used)), [3, 2, 1, 0, 0]);
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
    "@neondatabase/serverless": { neon: () => async () => { lookups++; return [member]; } },
    "next/server": { NextResponse: {
      next: () => new Response(null, { headers: { "x-middleware-next": "1" } }),
      redirect: (url) => Response.redirect(url, 307),
    } },
  } });
  return { request: (path) => mod.default({ url: `https://site.test${path}`, nextUrl: new URL(path, "https://site.test") }, {}), lookups: () => lookups };
}

test("proxy: signed-out visitors reach the three trial pages; everything else is as before", async () => {
  const out = await proxy(null);
  for (const path of ["/", "/pendulum", "/astro-dice"]) assert.equal((await out.request(path)).headers.get("x-middleware-next"), "1", path);
  for (const path of ["/healing-room", "/astrology-exploration", "/pendulum/extra", "/tarot-readings"]) {
    const response = await out.request(path);
    assert.equal(new URL(response.headers.get("location")).pathname, "/sign-in", path);
  }
  for (const path of ["/api/journal", "/api/practice", "/api/membership/admin/x"]) assert.equal((await out.request(path)).status, 401, path);
  assert.equal(out.lookups(), 0);
  // Signed in but not active: unchanged, the homepage still sends her to /account.
  const pending = await proxy("user_1");
  const response = await pending.request("/");
  assert.equal(new URL(response.headers.get("location")).pathname, "/account");
  assert.equal(pending.lookups(), 1);
});

const gateMocks = (pathname, auth) => ({
  "react/jsx-runtime": jsx,
  "react": { useState: React.useState, useEffect: React.useEffect },
  "@clerk/nextjs": { SignInButton: ({ children }) => children, useAuth: () => auth },
  "next/navigation": { usePathname: () => pathname },
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "./styles/pearl-page.css": {},
  "./visitor-trial": { VisitorTrialProvider: ({ children }) => React.createElement("div", { "data-trial": "visitor" }, children) },
});

test("page gate: signed out on a trial page opens it in trial mode; elsewhere the sign-in screen stays", async () => {
  for (const [pathname, auth, trialMode] of [
    ["/", { isLoaded: true, isSignedIn: false }, true],
    ["/pendulum", { isLoaded: true, isSignedIn: false }, true],
    ["/astro-dice", { isLoaded: true, isSignedIn: false }, true],
    ["/healing-room", { isLoaded: true, isSignedIn: false }, false],
    ["/astrology-exploration", { isLoaded: true, isSignedIn: false }, false],
    ["/", { isLoaded: false, isSignedIn: false }, false],
  ]) {
    const { default: Gate } = await loadTypescript("app/membership-gate.tsx", { mocks: gateMocks(pathname, auth) });
    const html = renderToStaticMarkup(React.createElement(Gate, null, "PAGE_SENTINEL"));
    assert.equal(html.includes('data-trial="visitor"'), trialMode, `${pathname} ${JSON.stringify(auth)}`);
    assert.equal(html.includes("PAGE_SENTINEL"), trialMode, pathname);
  }
  // Signed in: still waits for the member check, never trial mode.
  const { default: Gate } = await loadTypescript("app/membership-gate.tsx", { mocks: gateMocks("/", { isLoaded: true, isSignedIn: true }) });
  const html = renderToStaticMarkup(React.createElement(Gate, null, "PAGE_SENTINEL"));
  assert.doesNotMatch(html, /data-trial|PAGE_SENTINEL/);
  assert.match(html, /正在確認使用權限/);
});

const componentMocks = {
  "react/jsx-runtime": jsx,
  "react": React,
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "./styles/visitor-trial.css": {},
};

test("members see nothing of the trial; a visitor sees the meter, and 申請成為會員 opens LINE with the keyword", async () => {
  const ui = await loadTypescript("app/visitor-trial.tsx", { mocks: componentMocks });
  const bare = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(ui.TrialMeter), React.createElement(ui.TrialLimitCard)));
  assert.equal(bare, "", "no provider = member");
  const visitor = renderToStaticMarkup(React.createElement(ui.VisitorTrialProvider, null, React.createElement(ui.TrialMeter)));
  assert.match(visitor, /免費體驗還剩 <b>3<\/b> 次/);
  assert.equal((visitor.match(/class="left"/g) || []).length, 3);
  assert.equal(ui.membershipApplyUrl, `https://line.me/R/oaMessage/${encodeURIComponent("@903ijdgr")}/?${encodeURIComponent("申請會員")}`);
  const source = await read("app/visitor-trial.tsx");
  assert.match(source, /<h3 id="trial-limit-title">三次免費體驗用完了<\/h3>/);
  assert.match(source, /<a className="trial-apply" href=\{membershipApplyUrl\} target="_blank" rel="noreferrer">申請成為會員<\/a>/);
  assert.match(source, /送出「\{MEMBERSHIP_KEYWORD\}」就會收到申請方式/);
  assert.match(source, /href="\/sign-in">已經是會員？登入/);
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

  const dice = await read("app/astro-dice/page.tsx");
  assert.match(dice, /if\(!question\.trim\(\)\|\|busyRef\.current\|\|!trial\.canPlay\)return;/);
  assert.match(dice, /navigator\.vibrate\?\.\(18\);if\(trial\.visitor\)trial\.spend\("astro-dice"\);/);
  assert.match(dice, /\{trial\.canPlay\|\|busy\?<button type="button" className="ad2-cast"[^]*?:<TrialLimitCard\/>\}/);

  for (const [name, source] of [["home", home], ["pendulum", pendulum], ["dice", dice]]) {
    assert.doesNotMatch(source, /fetch\(\s*["'`]\/api\/(?!membership\/me)/, `${name}: the trial adds no API call`);
  }
});

test("development preview can show visitor mode; production never takes that branch", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /allowsMembershipPreview\(process\.env\) \? \(\n\s+\/\/[^\n]*\n\s+process\.env\.MEMBERSHIP_PREVIEW_AS === "visitor" \? <VisitorTrialProvider>/);
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
