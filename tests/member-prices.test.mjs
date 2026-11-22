import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 會員年費 (Zola, 2026-11-22): 早鳥 NT$1,800 a year for 20, then NT$2,800 for 25, then NT$3,820; prices public,
// places left never shown; every tier comes with one question read by Zola, used within 14 days of activation.
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));
const prices = await loadTypescript("lib/membership-prices.ts");

test("the three yearly prices in order, with how many each is for", () => {
  assert.deepEqual(plain(prices.MEMBERSHIP_TIERS), [
    { name: "早鳥價", price: 1800, limit: 20 },
    { name: "第二波", price: 2800, limit: 25 },
    { name: "正式價", price: 3820, limit: null },
  ]);
  assert.equal(prices.MEMBERSHIP_GIFT_DAYS, 14);
  assert.equal(prices.formatTwd(1800), "NT$1,800");
  assert.equal(prices.formatTwd(3820), "NT$3,820");
  assert.equal(prices.formatTwd(12500), "NT$12,500");
});

test("the price list shows every price, the gift and its 14 days, and never a places-left count", async () => {
  const { default: MemberPrices } = await loadTypescript("app/member-prices.tsx", { mocks: {
    react: React, "react/jsx-runtime": jsx, "./styles/member-prices.css": {},
  } });
  const html = renderToStaticMarkup(React.createElement(MemberPrices));
  for (const text of ["會員年費", "早鳥價", "NT$1,800", "限量 20 名", "第二波", "NT$2,800", "限量 25 名", "正式價", "NT$3,820", "／年",
    "三種方案都送<wbr/>一題\u00a0Zola\u00a0親自占卜", "開通後\u00a014\u00a0天內，<wbr/>私訊\u00a0Zola\u00a0使用"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.indexOf("NT$1,800") < html.indexOf("NT$2,800") && html.indexOf("NT$2,800") < html.indexOf("NT$3,820"), "cheapest first");
  assert.doesNotMatch(html, /剩|還有\s*\d+\s*名|已售|售完/, "how many places are left is not shown");
  assert.ok(html.includes("實際價格以\u00a0Zola\u00a0確認為準"), "which tier applies is confirmed by Zola (ChatGPT review of #57)");
  assert.match(html, /role="group" aria-labelledby="([^"]+)"[\s\S]*id="\1"/, "the list is named by its title");
  assert.equal((html.match(/<li>/g) ?? []).length, 3);
});

test("it sits beside every 申請成為會員: trial used up, the waiting screen, 會員中心 while waiting", async () => {
  const trial = await read("app/visitor-trial.tsx");
  const card = trial.slice(trial.indexOf("export function TrialLimitCard"));
  assert.match(card, /\{trial\.failed \? null : <MemberPrices \/>\}\s*<a className="trial-apply"/, "before the apply button, not when the count failed");

  const gate = await read("app/membership-gate.tsx");
  assert.match(gate, /tone="pending"[^>]*details=\{<MemberPrices \/>\}/);
  assert.match(gate, /<h1>\{title\}<\/h1><p>\{message\}<\/p>\s*\{details\}/, "under the words, above the buttons");

  const account = await read("app/account/account-view.tsx");
  for (const stage of ["pending-incomplete", "pending-ready"]) {
    const block = account.slice(account.indexOf(`case "${stage}":`), account.indexOf("break;", account.indexOf(`case "${stage}":`)));
    assert.match(block, /<TrialInvite member=\{member\} \/>\s*<MemberPrices \/>/, stage);
  }
  assert.equal(account.match(/<MemberPrices \/>/g).length, 2, "an active member is not shown prices");
});

test("the list keeps its own look inside each host's p and small rules", async () => {
  const css = await read("app/styles/member-prices.css");
  assert.match(css, /html body \.member-prices p\.member-prices-title \{[^}]*!important/);
  assert.match(css, /html body \.member-prices \.member-prices-price small \{[^}]*font-size: [^;]*!important/, "beats .trial-limit small");
  assert.doesNotMatch(css, /font-size: \d+px !important|font: /, "p and li keep following the site's 閱讀字級 setting");
  assert.match(css, /\.member-prices-tiers li \{[^}]*flex-wrap: wrap/, "the price drops under the name when large text meets a small phone");
  assert.match(css, /word-break: keep-all/, "Chinese lines break between phrases, not inside them");
  assert.doesNotMatch(css, /#[0-9a-f]{3,6}\b(?<!#843450|#263449|#4a5873|#b4405f|#c5a46f|#e6d8bb|#fceaf3|#ffffff|#fff8fb|#f0d6e2)/i, "pearl palette only");
});
