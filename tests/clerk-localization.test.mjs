import test from "node:test";
import assert from "node:assert/strict";
import { enUS } from "@clerk/localizations";
import { clerkLocalization, SITE_NAME } from "../lib/clerk-localization.ts";

const flat = (node, prefix = "") => Object.entries(node || {}).flatMap(([key, value]) =>
  value && typeof value === "object" ? flat(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]);
const strings = Object.fromEntries(flat(clerkLocalization));
const english = Object.fromEntries(flat(enUS));
const chinese = /[一-鿿]/;

test("Clerk screens use the site's voice and name", () => {
  assert.equal(clerkLocalization.locale, "zh-TW");
  for (const [key, value] of Object.entries(strings)) {
    if (typeof value !== "string") continue;
    assert.doesNotMatch(value, /您|帳戶|登錄|applicationName|clerk-crimson-curtain/, key);
  }
  assert.match(strings["signIn.password.subtitle"], new RegExp(SITE_NAME));
});

test("every string on the sign-in and sign-up screens is Chinese", () => {
  const onScreen = [
    "signIn.start.title", "signIn.start.subtitle", "signIn.start.actionText", "signIn.start.actionLink",
    "signIn.password.title", "signIn.password.actionLink", "signIn.emailCode.title", "signIn.emailCode.formTitle",
    "signIn.emailCode.resendButton", "signIn.forgotPassword.title", "signIn.resetPassword.title",
    "signIn.alternativeMethods.title", "signUp.start.title", "signUp.start.actionText", "signUp.start.actionLink",
    "signUp.emailCode.title", "signUp.emailCode.formSubtitle", "signUp.continue.title",
    "formButtonPrimary", "dividerText", "socialButtonsBlockButton", "backButton",
    "formFieldLabel__emailAddress_username", "formFieldLabel__password", "formFieldInputPlaceholder__emailAddress",
    "formFieldInputPlaceholder__password", "formFieldInputPlaceholder__signUpPassword",
    "formFieldAction__forgotPassword", "identityPreviewEditButton__emailAddress",
  ];
  for (const key of onScreen) assert.match(strings[key] ?? "", chinese, key);
  // The main screens read exactly as written, with no English mixed in.
  const exact = {
    "signIn.start.title": "登入",
    "signIn.start.subtitle": "歡迎回到 Zolacoco Tarot",
    "signIn.start.actionText": "還沒有帳號嗎？",
    "signIn.start.actionLink": "註冊",
    "signIn.password.title": "輸入妳的密碼",
    "signIn.emailCode.title": "檢查妳的電子郵件",
    "signIn.emailCode.resendButton": "重新傳送驗證碼",
    "signIn.forgotPassword.title": "重設密碼",
    "signUp.start.title": "建立會員帳號",
    "signUp.start.subtitle": "加入 Zolacoco Tarot",
    "signUp.start.actionText": "已經有帳號了嗎？",
    "signUp.start.actionLink": "登入",
    "signUp.emailCode.title": "驗證妳的電子郵件",
    formButtonPrimary: "繼續",
    dividerText: "或者",
    socialButtonsBlockButton: "以 {{provider|titleize}} 帳號登入",
    formFieldLabel__emailAddress: "Email",
    formFieldLabel__password: "密碼",
    formFieldInputPlaceholder__emailAddress: "輸入妳的 Email",
    formFieldInputPlaceholder__password: "輸入妳的密碼",
    formFieldAction__forgotPassword: "忘記密碼？",
    "unstable__errors.form_code_incorrect": "驗證碼不正確，請再確認一次。",
    "unstable__errors.form_password_incorrect": "密碼不正確，請再試一次，或改用 Email 驗證碼登入。",
    "unstable__errors.form_identifier_exists__email_address": "這個 Email 已經註冊過了，請直接登入。",
    "unstable__errors.form_identifier_not_found": "我們無法找到具有這些資訊的帳號。",
    "unstable__errors.form_param_nil": "這一欄還沒有填寫。",
    "unstable__errors.not_allowed_access": "目前無法使用這個帳號登入，如有疑問請聯絡 Zola。",
  };
  for (const [key, value] of Object.entries(exact)) assert.equal(strings[key], value, key);
});

test("sign-in errors never fall back to Clerk's English text", () => {
  const notUsed = /^unstable__errors\.(organization_|api_key_|insufficient_seats_|sso_|protect_check_(aborted|already_resolved))/;
  const errors = Object.keys(english).filter((key) => key.startsWith("unstable__errors.") && !notUsed.test(key));
  assert.ok(errors.length > 40);
  for (const key of errors) assert.match(strings[key] ?? "", chinese, key);
});
