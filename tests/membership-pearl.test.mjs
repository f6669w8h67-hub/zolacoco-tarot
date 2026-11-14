import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTypescript } from "./helpers/load-typescript.mjs";
import { clerkPearlAppearance, clerkPearlPageAppearance } from "../lib/clerk-pearl-appearance.ts";

// Step 5 (ChatGPT spec, PR #30): /account, /sign-in, /sign-up and the member gate in 珍珠粉藍洛可可.
// Visuals only: who may enter, the stages and the Clerk flow are covered by the account and membership suites.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const css = await read("app/rococo-membership.css");
const globals = await read("app/globals.css");
const gate = await read("app/membership-gate.tsx");
const layout = await read("app/layout.tsx");
const signIn = await read("app/sign-in/[[...sign-in]]/page.tsx");
const signUp = await read("app/sign-up/[[...sign-up]]/page.tsx");
const accountPage = await read("app/account/page.tsx");

const view = await loadTypescript("app/account/account-view.tsx", {
  mocks: {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: ({ href, children, ...rest }) => jsxRuntime.jsx("a", { href, ...rest, children }) },
  },
});
const now = Date.parse("2026-11-14T10:00:00+08:00");
const day = 86_400_000;
const base = { email: "member@example.com", full_name: "林小晴", line_id: "xiaoqing", birthday: "1994-04-09", role: "member", effective_status: "pending", access_expires_at: null };
const signOut = jsxRuntime.jsx("button", { children: "登出帳號" });
const member = (overrides) => renderToStaticMarkup(jsxRuntime.jsx(view.MemberAccountView, { member: { ...base, ...overrides }, now, onSave: async () => ({ ok: true }), signOut }));
const iso = (t) => new Date(t).toISOString();

test("every /account screen is a pearl page with a worded status chip of its own", () => {
  const screens = {
    "status-pending-incomplete": [member({ line_id: null }), "尚未開通"],
    "status-pending-ready": [member({}), "待通知 Zola"],
    "status-active": [member({ effective_status: "active", access_expires_at: iso(now + 30 * day) }), "使用中"],
    "status-expiring": [member({ effective_status: "active", access_expires_at: iso(now + 3 * day) }), "即將到期"],
    "status-expired": [member({ effective_status: "expired", access_expires_at: iso(now - 4 * day) }), "已到期"],
    "status-suspended": [member({ effective_status: "suspended", access_expires_at: iso(now + 9 * day) }), "已暫停"],
    "status-admin": [member({ role: "admin", effective_status: "active" }), "管理員"],
    "status-signed-out": [renderToStaticMarkup(jsxRuntime.jsx(view.SignedOutView, { signIn: jsxRuntime.jsx("button", { children: "Email 登入" }) })), "尚未登入"],
    "status-error": [renderToStaticMarkup(jsxRuntime.jsx(view.AccountErrorView, { failure: "UNAVAILABLE", onRetry() {}, signOut })), "暫時無法讀取"],
    "status-loading": [renderToStaticMarkup(jsxRuntime.jsx(view.AccountLoadingView, {})), "正在讀取"],
  };
  for (const [chip, [html, label]] of Object.entries(screens)) {
    assert.match(html, /<main class="account-page pearl-page"/, chip);
    assert.match(html, new RegExp(`class="account-status ${chip}"><i aria-hidden="true"></i>${label}<`), chip);
    assert.ok(css.includes(chip.replace("status-", ".status-")) || /pending|signed-out|loading/.test(chip), `${chip} has its own colours`); // loading keeps the plain pearl chip
  }
  assert.match(screens["status-loading"][0], /aria-busy="true"/);
  assert.match(screens["status-loading"][0], /class="pearl-loading"/);
  assert.match(accountPage, /<main className="account-page pearl-page">/, "not-configured screen too");
});

test("the two pending stages read differently, and neither says she is already waiting", () => {
  const incomplete = member({ line_id: null });
  const ready = member({});
  assert.match(incomplete, /填寫會員資料/);
  assert.match(ready, /傳 LINE 通知 Zola/);
  for (const html of [incomplete, ready]) {
    assert.equal(html.includes("等待 Zola 開通"), false);
    assert.equal(html.includes("已取得使用權限"), false);
  }
});

test("six member spaces with gold line icons; locked ones keep words and a lock, open ones an arrow", () => {
  const locked = member({});
  const open = member({ effective_status: "active", access_expires_at: iso(now + 30 * day) });
  assert.equal((locked.match(/class="account-space-icon"/g) || []).length, 6);
  assert.equal((locked.match(/class="account-space-lock"><svg/g) || []).length, 6);
  assert.equal((open.match(/class="account-space-arrow" aria-hidden="true">→/g) || []).length, 6);
  for (const href of ["/#draw", "/pendulum", "/astro-dice", "/astrology-exploration", "/#explore", "/healing-room"]) assert.ok(open.includes(`href="${href}"`), href);
  assert.equal(locked.includes('href="/pendulum"'), false, "locked cards are not links");
  assert.match(css, /\.account-space-grid \{ display: grid; grid-template-columns: repeat\(3, 1fr\)/);
  assert.match(css, /@media \(max-width: 780px\) \{[\s\S]*?\.account-space-grid \{ grid-template-columns: 1fr 1fr;/);
  assert.match(css, /@media \(max-width: 359px\) \{\s*\.account-space-grid \{ grid-template-columns: 1fr; \}/);
});

test("the LINE request sits in its own card and still offers copy and the written-out message", () => {
  const html = member({});
  assert.match(html, /<div class="account-line-request"><div class="account-actions"><a [^>]*class="account-primary" href="https:\/\/line\.me\/R\/oaMessage/);
  assert.match(html, /複製訊息/);
  assert.match(html, /<details class="account-message-preview"/);
});

test("the gate is a pearl card in 妳, and who may pass is decided exactly as before", () => {
  assert.match(gate, /<main className=\{`membership-gate pearl-page gate-\$\{tone\}`\}/);
  assert.match(gate, /import "\.\/styles\/pearl-page\.css";/);
  assert.equal(gate.includes("你"), false);
  for (const line of ["登入後，走進妳的占卜空間", "請稍候，正在讀取妳的會員狀態。", "妳的會員資料仍會保留", "替妳增加月份"]) assert.ok(gate.includes(line), line);
  assert.match(gate, /const status = member\.role === "admin" \|\| member\.effective_status === "active"\s*\? "allowed"\s*: member\.effective_status;/);
  assert.match(gate, /if \(isOpenPath\) return children;/);
  assert.match(gate, /if \(access\.status === "allowed"\) return children;/);
  assert.match(gate, /<SignInButton mode="modal"><button className="gate-primary" type="button">Email 登入<\/button><\/SignInButton>/);
});

test("sign-in and sign-up: pearl arch, gold shell, one shared Clerk look that also reaches the modals", () => {
  for (const page of [signIn, signUp]) {
    assert.match(page, /<main className="auth-page pearl-page"><section className="rococo-shell">/);
    assert.match(page, /<main className="auth-page pearl-page"><section className="auth-setup">/);
    assert.match(page, /appearance=\{clerkPearlPageAppearance\} \/>/);
    assert.equal(page.includes("☾"), false);
  }
  assert.match(layout, /<ClerkProvider localization=\{clerkLocalization\} appearance=\{clerkPearlAppearance\}>/);
  const { variables, elements } = clerkPearlAppearance;
  assert.equal(variables.colorPrimary, "#843450");
  assert.equal(variables.colorForeground, "#263449");
  assert.equal(elements.formFieldInput.fontSize, "16px", "iPhone does not zoom into the field");
  assert.equal(elements.formButtonPrimary.minHeight, "48px");
  assert.match(elements.formButtonPrimary.background, /#fff2f8, #f4dfe9/);
  assert.equal(elements.socialButtonsBlockButton.minHeight, "48px");
  // Clerk paints outlines with box-shadow in [data-variant] rules; ours must sit on the same selectors to show.
  assert.equal(elements.formFieldInput['&[data-variant="default"], &[data-variant="default"]:hover'].boxShadow, "0 0 0 1px #c5a46f");
  assert.match(elements.formFieldInput['&[data-variant="default"][data-feedback="error"], &[data-variant="default"][data-feedback="error"]:hover'].boxShadow, /#a3324f/, "errors stay red");
  assert.match(elements.formButtonPrimary['&[data-variant="solid"][data-color="primary"]'].boxShadow, /^0 0 0 1px #c5a46f/);
  assert.equal(elements.formButtonPrimary['&[data-variant="solid"]::after'].display, "none");
  assert.equal(clerkPearlPageAppearance.options.elevation, "flush");
  assert.equal("header" in clerkPearlPageAppearance.elements, false, "later steps keep Clerk's instructions");
  assert.match(css, /\.rococo-shell :is\(\.cl-signIn-start, \.cl-signUp-start\) \.cl-header \{ display: none; \}/);
});

test("old parchment and night styles are gone; pearl palette only", () => {
  assert.doesNotMatch(globals, /\.(account-page|account-hero|membership-gate|auth-page|auth-setup|member-profile-card)(?![\w-])/);
  assert.doesNotMatch(css, /❦|#fffaf2|#21182d|#744750|#a57561/);
  const hsl = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  for (const hex of (css.match(/#[0-9a-fA-F]{6}\b/g) || []).map((value) => value.toLowerCase())) {
    if (["#c5a46f", "#263449", "#33445f"].includes(hex)) continue; // gold line work and the ink used for text
    const [h, s, l] = hsl(hex);
    assert.ok(!(h >= 15 && h <= 55 && s >= .12 && (l < .55 || (s < .45 && l < .9))), `earthy ${hex}`);
    assert.ok(!(h >= 200 && h <= 335 && s >= .12 && l <= .3), `night navy or purple ${hex}`);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.pearl-loading i \{ animation: none;/);
  assert.match(css, /\.member-profile-form input \{[^}]*font: 16px/);
});

test("the gate card renders as a pearl arch with a shell, title, words and two clear buttons", async () => {
  const mod = await loadTypescript("app/membership-gate.tsx", { mocks: {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "@clerk/nextjs": { SignInButton: ({ children }) => children, useAuth: () => ({ isLoaded: true, isSignedIn: false }) },
    "next/navigation": { usePathname: () => "/healing-room" },
    "next/link": { default: ({ href, children, ...rest }) => jsxRuntime.jsx("a", { href, ...rest, children }) },
    "./styles/pearl-page.css": {},
  } });
  const html = renderToStaticMarkup(jsxRuntime.jsx(mod.default, { children: "VIP_SENTINEL" }));
  assert.equal(html.includes("VIP_SENTINEL"), false, "signed out: the room stays closed");
  assert.match(html, /<main class="membership-gate pearl-page gate-signed-out"><section><span class="membership-gate-mark" aria-hidden="true"><svg/);
  assert.match(html, /<h1>登入後，走進妳的占卜空間<\/h1>/);
  assert.match(html, /class="gate-primary" type="button">Email 登入</);
  assert.match(html, /href="\/sign-up" class="gate-secondary">第一次使用，建立帳號</);
  const loading = renderToStaticMarkup(jsxRuntime.jsx(mod.AccessScreen, { tone: "loading", eyebrow: "member access", title: "正在確認使用權限…", message: "請稍候，正在讀取妳的會員狀態。" }));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /class="pearl-loading"/);
});
