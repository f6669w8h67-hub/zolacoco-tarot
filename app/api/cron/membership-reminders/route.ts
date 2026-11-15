import { ensureMembershipSchema, getSql } from "@/lib/membership";
import { sendExpiryReminders } from "@/lib/member-emails";

// Daily (vercel.json crons): members whose membership ends within 7 days get one reminder.
// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"; without that secret this route refuses.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Compares in time that does not depend on where the strings differ. */
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && sameText(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  try {
    await ensureMembershipSchema();
    const result = await sendExpiryReminders(getSql() as never);
    return Response.json(result, { headers });
  } catch (error) {
    console.error("membership_reminders_failed", { reason: error instanceof Error ? error.message.slice(0, 80) : "unknown" });
    return Response.json({ error: "failed" }, { status: 500, headers });
  }
}
