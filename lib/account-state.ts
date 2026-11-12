// Pure helpers for the member account page. No React, no fetch, no Clerk, so the
// same rules run in the browser, in the API route and in node:test.
import type { ClientMember } from "./member-client";

const TAIPEI = "Asia/Taipei";
const DAY_MS = 86_400_000;

/** Members see a renewal prompt when this many calendar days (Taipei) or fewer remain. */
export const EXPIRY_WARNING_DAYS = 7;

export const PROFILE_LIMITS = { fullName: 40, lineId: 50 } as const;

export type AccountStage =
  | "admin"
  | "pending-incomplete"
  | "pending-ready"
  | "active"
  | "expiring"
  | "expired"
  | "suspended";

type ProfileFields = Pick<ClientMember, "full_name" | "line_id" | "birthday">;
type AccessFields = Pick<ClientMember, "role" | "effective_status" | "access_expires_at"> & ProfileFields;

export function isProfileComplete(member: ProfileFields) {
  return Boolean(member.full_name?.trim() && member.line_id?.trim() && member.birthday);
}

/** YYYY-MM-DD for the given instant in Taipei. */
export function taipeiDate(at: number | Date) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TAIPEI, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

function dayNumber(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** "2026年12月12日" in Taipei time, or null when there is no valid date. */
export function formatTaipeiDate(value: string | null | undefined) {
  const time = parseTime(value);
  if (time === null) return null;
  return new Intl.DateTimeFormat("zh-TW", { timeZone: TAIPEI, year: "numeric", month: "long", day: "numeric" }).format(time);
}

/** Calendar days left in Taipei: 0 means it ends today. Null when there is no future expiry. */
export function daysLeft(expiresAt: string | null | undefined, now: number) {
  const end = parseTime(expiresAt);
  if (end === null || end <= now) return null;
  return dayNumber(taipeiDate(end)) - dayNumber(taipeiDate(now));
}

/**
 * Which screen a signed-in member should see. Mirrors the server rule
 * (`hasMemberAccess`): "active" only counts while the expiry is in the future,
 * so the page never promises access the server would refuse.
 */
export function accountStage(member: AccessFields, now: number): AccountStage {
  if (member.role === "admin") return "admin";
  switch (member.effective_status) {
    case "suspended":
      return "suspended";
    case "expired":
      return "expired";
    case "active": {
      const left = daysLeft(member.access_expires_at, now);
      if (left === null) return "expired";
      return left <= EXPIRY_WARNING_DAYS ? "expiring" : "active";
    }
    default:
      return isProfileComplete(member) ? "pending-ready" : "pending-incomplete";
  }
}

export function remainingLabel(expiresAt: string | null | undefined, now: number) {
  const left = daysLeft(expiresAt, now);
  if (left === null) return null;
  return left === 0 ? "今天到期" : `還有 ${left} 天`;
}

function lines(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join("\n");
}

// Messages the member sends to Zola on LINE. They include only what Zola needs to
// find the account (never the birthday), and the member reviews them before sending.
export function activationRequestMessage(member: ClientMember) {
  return lines(
    "Zola 好，我已經在 Zolacoco Tarot 註冊會員，想申請開通使用期限。",
    member.full_name?.trim() && `姓名：${member.full_name.trim()}`,
    member.line_id?.trim() && `LINE：${member.line_id.trim()}`,
    `註冊 Email：${member.email}`,
  );
}

export function renewalRequestMessage(member: ClientMember) {
  const until = formatTaipeiDate(member.access_expires_at);
  return lines(
    "Zola 好，我想延長 Zolacoco Tarot 的會員使用期限。",
    member.full_name?.trim() && `姓名：${member.full_name.trim()}`,
    `註冊 Email：${member.email}`,
    until && `目前期限：${until}`,
  );
}

export function supportRequestMessage(member: ClientMember) {
  return lines(
    "Zola 好，我的 Zolacoco Tarot 會員權限目前顯示暫停，想請 Zola 協助確認。",
    member.full_name?.trim() && `姓名：${member.full_name.trim()}`,
    `註冊 Email：${member.email}`,
  );
}

export const LINKED_EMAIL_HELP_MESSAGE =
  "Zola 好，我登入 Zolacoco Tarot 會員中心時，畫面顯示「這個 Email 已連結其他帳號」，想請 Zola 協助確認。";

export type ProfileInput = { fullName: string; lineId: string; birthday: string };

export const PROFILE_REQUIRED_MESSAGE = "請完整填寫真實姓名、LINE 名稱／ID 與生日。";

/** A real calendar date between 1900-01-01 and today (Taipei). */
export function isValidBirthday(value: string, now: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real && year >= 1900 && value <= taipeiDate(now);
}

/**
 * Shared by the form (instant feedback) and PATCH /api/membership/me (the real check).
 * Accepts unknown input so a malformed request body becomes a 400, not a 500.
 */
export function validateProfileInput(raw: unknown, now: number):
  | { ok: true; value: ProfileInput }
  | { ok: false; error: string } {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (value: unknown) => (typeof value === "string" ? value.normalize("NFC").trim() : "");
  const fullName = text(body.fullName);
  const lineId = text(body.lineId);
  const birthday = text(body.birthday);

  if (!fullName || !lineId || !birthday) return { ok: false, error: PROFILE_REQUIRED_MESSAGE };
  if (/[\u0000-\u001f\u007f]/.test(fullName + lineId)) {
    return { ok: false, error: "姓名與 LINE 名稱請不要包含換行或特殊符號。" };
  }
  if ([...fullName].length > PROFILE_LIMITS.fullName) {
    return { ok: false, error: `真實姓名請在 ${PROFILE_LIMITS.fullName} 個字以內。` };
  }
  if ([...lineId].length > PROFILE_LIMITS.lineId) {
    return { ok: false, error: `LINE 名稱／ID 請在 ${PROFILE_LIMITS.lineId} 個字以內。` };
  }
  if (!isValidBirthday(birthday, now)) return { ok: false, error: "請選擇正確的生日日期。" };
  return { ok: true, value: { fullName, lineId, birthday } };
}
