import { createHash, timingSafeEqual } from "node:crypto";
import { ensureMembershipSchema, getSql } from "@/lib/membership";
import { errorCode, sendExpiryReminders } from "@/lib/member-emails";

// Daily (vercel.json crons): members whose membership ends within 7 days get one reminder.
// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"; without that secret this route refuses.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Compares fixed-length digests, so the time taken says nothing about the secret or its length. */
function sameText(a: string, b: string) {
  const digest = (text: string) => createHash("sha256").update(text, "utf8").digest();
  return timingSafeEqual(digest(a), digest(b));
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
    console.error("membership_reminders_failed", { code: errorCode(error) });
    return Response.json({ error: "failed" }, { status: 500, headers });
  }
}
