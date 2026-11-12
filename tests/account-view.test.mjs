import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// Render the real account screens with only next/link replaced by a plain anchor.
const view = await loadTypescript("app/account/account-view.tsx", {
  mocks: {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "next/link": { default: ({ href, children, ...rest }) => jsxRuntime.jsx("a", { href, ...rest, children }) },
  },
});

const now = Date.parse("2026-11-12T10:00:00+08:00");
const day = 86_400_000;
const base = {
  email: "member@example.com", full_name: "林小晴", line_id: "xiaoqing", birthday: "1994-04-09",
  role: "member", effective_status: "pending", access_expires_at: null,
};
const save = async () => ({ ok: true });
const signOut = jsxRuntime.jsx("button", { children: "登出帳號" });

function renderMember(overrides) {
  return renderToStaticMarkup(jsxRuntime.jsx(view.MemberAccountView, { member: { ...base, ...overrides }, now, onSave: save, signOut }));
}

test("incomplete pending member is sent to the profile form, with no LINE request yet", () => {
  const html = renderMember({ line_id: null });
  assert.match(html, /補齊你的會員資料/);
  assert.match(html, /href="#member-profile"/);
  assert.match(html, /<form/);
  assert.equal(html.includes("oaMessage"), false);
  assert.match(html, /開通後開放/);
});

test("complete pending member gets a prefilled LINE request and the profile is read-only", () => {
  const html = renderMember({});
  assert.match(html, /等待 Zola 開通/);
  assert.match(html, /line\.me\/R\/oaMessage/);
  assert.match(html, /複製訊息/);
  assert.equal(html.includes("<form"), false);
  assert.match(html, /編輯資料/);
});

test("active member sees expiry, days left and unlocked spaces", () => {
  const html = renderMember({ effective_status: "active", access_expires_at: new Date(now + 30 * day).toISOString() });
  assert.match(html, /歡迎回來/);
  assert.match(html, /還有 30 天/);
  assert.match(html, /href="\/pendulum"/);
  assert.equal(html.includes("開通後開放"), false);
  assert.equal(html.includes("oaMessage"), false);
});

test("member close to expiry is offered renewal", () => {
  const html = renderMember({ effective_status: "active", access_expires_at: new Date(now + 3 * day).toISOString() });
  assert.match(html, /即將到期/);
  assert.match(html, /聯絡 Zola 續約/);
});

test("expired and suspended members keep their data and get the agreed copy", () => {
  const expired = renderMember({ effective_status: "expired", access_expires_at: new Date(now - 2 * day).toISOString() });
  assert.match(expired, /使用期限已於 2026年11月10日 結束/);
  assert.match(expired, /聯絡 Zola 續約/);
  assert.equal(expired.includes('href="/pendulum"'), false);

  const suspended = renderMember({ effective_status: "suspended", access_expires_at: new Date(now + 9 * day).toISOString() });
  assert.match(suspended, /會員使用權限<br\/>目前已暫停/);
  assert.match(suspended, /你的會員資料仍會保留，目前暫時無法使用會員專屬功能/);
  assert.match(suspended, /查看會員資料/);
});

test("admin goes to the admin console without expiry", () => {
  const html = renderMember({ role: "admin", effective_status: "active" });
  assert.match(html, /href="\/zola-admin"/);
  assert.match(html, /管理員不受期限限制/);
});

test("account problems are explained, never shown as 'not activated'", () => {
  const render = (failure) => renderToStaticMarkup(jsxRuntime.jsx(view.AccountErrorView, { failure, onRetry() {}, signOut, onManageAccount() {} }));
  assert.match(render("EMAIL_NOT_VERIFIED"), /管理登入帳號/);
  assert.match(render("EMAIL_ALREADY_LINKED"), /oaMessage/);
  for (const failure of ["UNAVAILABLE", "UNAUTHENTICATED"]) {
    const html = render(failure);
    assert.match(html, /這不代表尚未開通/);
    assert.match(html, /重新讀取/);
  }
});

test("signed-out visitors see how activation works and which spaces open", () => {
  const html = renderToStaticMarkup(jsxRuntime.jsx(view.SignedOutView, { signIn: jsxRuntime.jsx("button", { children: "Email 登入" }) }));
  assert.match(html, /開通只要四步/);
  assert.match(html, /href="\/sign-up"/);
  assert.match(html, /開通後開放/);
});
