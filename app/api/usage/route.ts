// 會員使用次數 (lib/member-usage.ts): a signed-in account finished using one of the tools. Counted on the
// account, once per tool within USAGE_WINDOW_MINUTES, across midnight too: the database decides, in one
// statement, against the tool's latest counted use (member_usage_last), so two tabs, a quick second draw or
// 23:58 and 00:02 are one use (ChatGPT review on #65). Nothing about what was asked or drawn arrives here.
// Zola's own use and anyone not signed in are not counted. proxy.ts lets every signed-in account reach this
// route (also those not yet activated, who use the free trial); it decides itself.
import { auth } from "@clerk/nextjs/server";
import { ensureMembershipSchema, getSql } from "@/lib/membership";
import { isClerkConfigured } from "@/lib/membership-access";
import { isUsageFeature } from "@/lib/member-usage";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const answer = (body: { counted: boolean; reason?: string }, status = 200) => Response.json(body, { status, headers: noStore });

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (!text || text.length > 200) return answer({ counted: false }, 400);
  let feature: unknown;
  try {
    feature = (JSON.parse(text) as { feature?: unknown } | null)?.feature;
  } catch {
    return answer({ counted: false }, 400);
  }
  if (!isUsageFeature(feature)) return answer({ counted: false }, 400);
  if (!isClerkConfigured(process.env)) return answer({ counted: false, reason: "signed-out" });
  try {
    const { userId } = await auth();
    if (!userId) return answer({ counted: false, reason: "signed-out" });
    await ensureMembershipSchema();
    const sql = getSql();
    const members = await sql`SELECT id, role FROM members WHERE clerk_user_id = ${userId} LIMIT 1` as { id: string; role: string }[];
    const member = members[0];
    // not synced yet (it will be on the next member page), or Zola herself: not counted
    if (!member || member.role !== "member") return answer({ counted: false, reason: "not-member" });
    // the gate row (member, tool) is taken first: a use within 10 minutes of the last counted one, on any day,
    // finds it closed; requests at the same moment wait on that row, and only the first gets through
    const rows = await sql`
      WITH gate AS (
        INSERT INTO member_usage_last (member_id, feature, last_at) VALUES (${member.id}, ${feature}, now())
        ON CONFLICT (member_id, feature) DO UPDATE SET last_at = now()
          WHERE member_usage_last.last_at < now() - interval '10 minutes'
        RETURNING 1
      )
      INSERT INTO member_usage (member_id, feature, day, n, last_at)
      SELECT ${member.id}, ${feature}, (now() AT TIME ZONE 'Asia/Taipei')::date, 1, now() FROM gate
      ON CONFLICT (member_id, feature, day) DO UPDATE SET n = member_usage.n + 1, last_at = now()
      RETURNING n` as { n: number }[];
    return answer(rows.length > 0 ? { counted: true } : { counted: false, reason: "recent" });
  } catch (error) {
    console.error("member_usage_failed", error);
    return answer({ counted: false }, 503);
  }
}
