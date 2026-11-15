// Emails to the member herself (Zola 2026-11-15): when Zola activates or extends her membership, and
// REMINDER_DAYS before it ends. Sent from Zola's Gmail (lib/mailer.ts), and only when
// MEMBERSHIP_EMAIL_ENABLED=true, the Gmail settings and MEMBERSHIP_ADMIN_ORIGIN (the site's https origin)
// are all set. Each email is claimed in member_email_log first (one row per member, kind and membership
// period), so a retry, a double click or a second daily run never sends the same notice twice.
import { ZOLA_LINE_URL } from "./contact";
import { gmailConfig, type GmailConfig } from "./mail-config";
import type { MailMessage, MailResult } from "./mailer";

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;
type Env = Record<string, string | undefined>;
type Send = (config: GmailConfig, message: MailMessage) => Promise<MailResult>;

/** The mail library is loaded only when an email is actually sent. */
const gmailSend: Send = async (config, message) => (await import("./mailer")).sendGmail(config, message);

export type MemberEmailKind = "activated" | "extended" | "expiry_reminder";
export type MemberEmailOutcome = MailResult | "disabled" | "skipped";
export const REMINDER_DAYS = 7;
/** At most this many reminders per daily run (each takes a few seconds). */
export const REMINDER_BATCH = 20;
/**
 * A run starts no new email after this long. One Gmail send gives up within about 18 seconds
 * (lib/mailer.ts timeouts), so the run ends well inside the route's 60-second limit.
 */
export const REMINDER_TIME_BUDGET_MS = 35_000;

/** A safe label for the logs: an error code or name, never the message (it can hold an address). */
export function errorCode(error: unknown) {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && /^[A-Za-z0-9_]{1,40}$/.test(code)) return code;
  const name = (error as { name?: unknown })?.name;
  return typeof name === "string" && /^[A-Za-z]{1,40}$/.test(name) ? name : "unknown";
}

/** The site's https origin, or null when it is missing or not a bare https origin. */
export function siteOrigin(env: Env = process.env) {
  const raw = env.MEMBERSHIP_ADMIN_ORIGIN?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && url.href === `${url.origin}/` ? url.origin : null;
  } catch {
    return null;
  }
}

export function memberEmailSettings(env: Env = process.env) {
  if (env.MEMBERSHIP_EMAIL_ENABLED !== "true") return null;
  const gmail = gmailConfig(env);
  const origin = siteOrigin(env);
  return gmail && origin ? { gmail, origin } : null;
}

/** 2026年12月15日 (Taiwan time). */
export function taipeiDate(value: string | Date) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function memberEmail(kind: MemberEmailKind, member: Record<string, unknown>, origin: string) {
  const name = typeof member.full_name === "string" && member.full_name.trim() ? `${member.full_name.trim()} ` : "";
  const date = taipeiDate(String(member.access_expires_at));
  const links = `回到網站：${origin}/\n會員中心（查看期限）：${origin}/account`;
  const sign = `有任何問題，歡迎到 LINE 官方帳號找我：${ZOLA_LINE_URL}\n\nZola`;
  if (kind === "expiry_reminder") {
    return {
      subject: `Zolacoco Tarot｜會員將在 ${date} 到期`,
      text: `${name}妳好：\n\n妳的 Zolacoco Tarot 會員將在 ${date} 到期。到期後，會員功能會先暫停；妳存下的紀錄不會因為到期而刪除。\n\n想繼續使用，可以到 LINE 官方帳號跟我說，我幫妳延長：${ZOLA_LINE_URL}\n\n${links}\n\nZola`,
    };
  }
  const extended = kind === "extended";
  return {
    subject: extended ? "Zolacoco Tarot｜妳的會員已延長" : "Zolacoco Tarot｜妳的會員已開通",
    text: `${name}妳好：\n\n妳的 Zolacoco Tarot 會員已經${extended ? "延長" : "開通"}，${extended ? "現在" : ""}可以使用到 ${date}。\n\n${links}\n\n${sign}`,
  };
}

async function finish(sql: Sql, memberId: string, kind: MemberEmailKind, periodKey: string, result: MailResult) {
  await sql`UPDATE member_email_log SET status = ${result}, finished_at = now() WHERE member_id = ${memberId} AND kind = ${kind} AND period_key = ${periodKey}`;
}

/** Right after Zola activates or extends a member. Never throws: the admin action has already succeeded. */
export async function notifyMemberAccess(sql: Sql, memberId: string, kind: "activated" | "extended", env: Env = process.env, send: Send = gmailSend): Promise<MemberEmailOutcome> {
  const settings = memberEmailSettings(env);
  if (!settings) return "disabled";
  try {
    const [member] = await sql`
      WITH current_member AS (
        SELECT id, email, full_name, access_expires_at, extract(epoch FROM access_expires_at)::bigint::text AS period_key
        FROM members
        WHERE id = ${memberId} AND role = 'member' AND status = 'active' AND access_expires_at > now()
      ), claimed AS (
        INSERT INTO member_email_log (member_id, kind, period_key, status)
        SELECT id, ${kind}, period_key, 'sending' FROM current_member
        ON CONFLICT (member_id, kind, period_key) DO NOTHING
        RETURNING member_id
      )
      SELECT current_member.* FROM current_member JOIN claimed ON claimed.member_id = current_member.id
    `;
    if (!member) return "skipped";
    const result = await send(settings.gmail, { to: String(member.email), ...memberEmail(kind, member, settings.origin) });
    await finish(sql, memberId, kind, String(member.period_key), result);
    return result;
  } catch (error) {
    console.error("member_email_failed", { kind, code: errorCode(error) });
    return "failed";
  }
}

/**
 * The daily run: members whose membership ends within REMINDER_DAYS get one reminder per period.
 * One member at a time (claim, send, record), so a run stopped part-way leaves at most the one email it
 * was sending as 'sending'; that row is never re-sent automatically (it may have gone out) and the admin
 * shows it as 狀態不明. Members already claimed for this period are skipped before the LIMIT, so the next
 * run always moves on to the members still waiting.
 */
export async function sendExpiryReminders(sql: Sql, env: Env = process.env, send: Send = gmailSend, now: () => number = Date.now) {
  const settings = memberEmailSettings(env);
  if (!settings) return { status: "disabled" as const, sent: 0, failed: 0 };
  const started = now();
  let sent = 0;
  let failed = 0;
  while (sent + failed < REMINDER_BATCH && now() - started < REMINDER_TIME_BUDGET_MS) {
    const [member] = await sql`
      WITH due AS (
        SELECT m.id, m.email, m.full_name, m.access_expires_at, extract(epoch FROM m.access_expires_at)::bigint::text AS period_key
        FROM members m
        WHERE m.role = 'member' AND m.status = 'active'
          AND m.access_expires_at > now() AND m.access_expires_at <= now() + make_interval(days => ${REMINDER_DAYS})
          AND NOT EXISTS (
            SELECT 1 FROM member_email_log l
            WHERE l.member_id = m.id AND l.kind = 'expiry_reminder'
              AND l.period_key = extract(epoch FROM m.access_expires_at)::bigint::text
          )
        ORDER BY m.access_expires_at, m.id
        LIMIT 1
      ), claimed AS (
        INSERT INTO member_email_log (member_id, kind, period_key, status)
        SELECT id, 'expiry_reminder', period_key, 'sending' FROM due
        ON CONFLICT (member_id, kind, period_key) DO NOTHING
        RETURNING member_id
      )
      SELECT due.* FROM due JOIN claimed ON claimed.member_id = due.id
    `;
    if (!member) break;
    const result = await send(settings.gmail, { to: String(member.email), ...memberEmail("expiry_reminder", member, settings.origin) });
    await finish(sql, String(member.id), "expiry_reminder", String(member.period_key), result);
    if (result === "sent") sent += 1; else failed += 1;
  }
  return { status: "done" as const, sent, failed };
}
