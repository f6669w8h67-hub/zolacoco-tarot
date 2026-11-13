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
  assert.equal(strings.formFieldLabel__emailAddress, "Email");
});

test("sign-in errors never fall back to Clerk's English text", () => {
  const notUsed = /^unstable__errors\.(organization_|api_key_|insufficient_seats_|sso_|protect_check_(aborted|already_resolved))/;
  const errors = Object.keys(english).filter((key) => key.startsWith("unstable__errors.") && !notUsed.test(key));
  assert.ok(errors.length > 40);
  for (const key of errors) assert.match(strings[key] ?? "", chinese, key);
});
