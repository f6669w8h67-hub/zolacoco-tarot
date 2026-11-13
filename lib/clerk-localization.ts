// Traditional Chinese for every Clerk screen: the sign-in and sign-up pages, the
// "Email 登入" pop-up and the account window opened from /account.
//
// Clerk's own zh-TW pack is the base. Three things are adjusted so it reads like
// the rest of the site:
//   - the site's voice: 妳 instead of 您, Taiwan wording (帳號, 登入, 裝置);
//   - the site's name instead of the Clerk app id (shown as "clerk-crimson-curtain");
//   - errors the pack leaves untranslated would otherwise show Clerk's English text.
import { zhTW } from "@clerk/localizations/zh-TW";

export const SITE_NAME = "Zolacoco Tarot";

type Strings = { [key: string]: string | Strings | undefined };

const wording: Array<[RegExp, string]> = [
  [/\{\{\s*applicationName\s*\}\}/g, SITE_NAME],
  [/您/g, "妳"],
  [/帳戶/g, "帳號"],
  [/登錄/g, "登入"],
  [/設備/g, "裝置"],
  [/用戶/g, "使用者"],
];

function reword(node: Strings): Strings {
  const out: Strings = {};
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === "string") out[key] = wording.reduce((text, [from, to]) => text.replace(from, to), value);
    else if (value && typeof value === "object") out[key] = reword(value);
    else out[key] = value;
  }
  return out;
}

function merge(base: Strings, extra: Strings): Strings {
  const out: Strings = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    out[key] = value && typeof value === "object" && current && typeof current === "object"
      ? merge(current, value)
      : value;
  }
  return out;
}

const siteWording: Strings = {
  formFieldLabel__emailAddress: "Email",
  formFieldLabel__emailAddress_username: "Email 或使用者名稱",
  formFieldInputPlaceholder__emailAddress: "輸入妳的 Email",
  formFieldInputPlaceholder__emailAddress_username: "輸入 Email 或使用者名稱",
  formFieldInputPlaceholder__signUpPassword: "設定一組密碼",
  formFieldInputPlaceholder__username: "輸入使用者名稱",
  identityPreviewEditButton__emailAddress: "修改 Email",
  identityPreviewEditButton__identifier: "修改",
  identityPreviewEditButton__phoneNumber: "修改電話號碼",
  socialButtonsBlockButtonManyInView: "{{provider|titleize}}",
  badge__banned: "已停用",
  signIn: {
    start: {
      title: "登入",
      subtitle: `歡迎回到 ${SITE_NAME}`,
      titleCombined: `登入 ${SITE_NAME}`,
      subtitleCombined: `歡迎回到 ${SITE_NAME}`,
    },
    emailLink: { verifiedTransferable: { title: "Email 已驗證", subtitle: "請回到原本的分頁繼續" } },
  },
  signUp: {
    start: {
      title: "建立會員帳號",
      titleCombined: "建立會員帳號",
      subtitle: `加入 ${SITE_NAME}`,
      subtitleCombined: `加入 ${SITE_NAME}`,
    },
  },
  unstable__errors: {
    form_code_incorrect: "驗證碼不正確，請再確認一次。",
    form_password_incorrect: "密碼不正確，請再試一次，或改用 Email 驗證碼登入。",
    form_identifier_exists__email_address: "這個 Email 已經註冊過了，請直接登入。",
    form_identifier_exists__phone_number: "這個電話號碼已經註冊過了，請直接登入。",
    form_identifier_exists__username: "這個使用者名稱已經有人使用了。",
    form_param_format_invalid: "格式不正確，請再確認一次。",
    form_param_nil: "這一欄還沒有填寫。",
    form_param_type_invalid: "格式不正確，請再確認一次。",
    form_param_type_invalid__email_address: "請輸入有效的 Email。",
    form_param_type_invalid__phone_number: "請輸入有效的電話號碼。",
    form_param_value_invalid: "這一欄的內容不正確，請再確認一次。",
    form_password_compromised__sign_in: "這組密碼可能已經外洩。為了妳的帳號安全，請改用 Email 驗證碼登入，再重設密碼。",
    form_password_matches_identifier: "密碼不能和 Email、電話號碼或使用者名稱相同，請換一組密碼。",
    form_email_address_blocked: "這個 Email 目前無法使用，請換一個 Email。",
    form_username_invalid_character: "使用者名稱含有不能使用的字元。",
    not_allowed_access: "目前無法使用這個帳號登入，如有疑問請聯絡 Zola。",
    external_account_not_found: "找不到這個帳號，請先註冊，或改用其他帳號登入。",
    oauth_access_denied: "妳沒有同意授權，所以還沒有登入，可以再試一次。",
    action_blocked: "目前無法完成這個動作，請稍後再試；如果一直發生，請聯絡 Zola。",
    too_many_requests: "嘗試次數太多了，請稍等一下再試。",
    signup_rate_limit_exceeded: "嘗試次數太多了，請稍等一下再試。",
    ticket_expired_code: "這個連結已經過期，請重新開始或索取新的連結。",
    ticket_invalid_code: "這個連結已經失效或使用過了，請重新開始或索取新的連結。",
    protect_check_execution_failed: "驗證沒有完成，請再試一次。",
    protect_check_timed_out: "驗證逾時，請再試一次。",
    protect_check_invalid_script: "無法載入驗證，請稍後再試；如果一直發生，請聯絡 Zola。",
    protect_check_script_load_failed: "無法載入驗證，請檢查網路後再試一次。",
    protect_check_invalid_sdk_url: "驗證無法開始，請聯絡 Zola。",
    protect_check_required: "這次登入需要額外驗證，請再試一次，或改用其他登入方式。",
    protect_check_unsupported_environment: "這裡無法完成驗證，請改用 Safari 或 Chrome 開啟網站。",
    too_many_unverified_identifications: "還有太多項目在等待驗證，請刪除不需要的未驗證 Email，或稍等幾分鐘再試。",
  },
};

export const clerkLocalization = merge(reword(zhTW as unknown as Strings), siteWording) as unknown as typeof zhTW;
