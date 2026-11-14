// 陪跑筆記: the member has read Zola's reply. Only the owner can mark their own note.
import { isUuid } from "@/lib/coaching-input";
import { ensureCoachingSchema, markEntryFeedbackSeen } from "@/lib/coaching-store";
import { membershipErrorResponse, syncCurrentMember } from "@/lib/membership";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const member = await syncCurrentMember();
    let body: { entryId?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "資料格式不正確。" }, { status: 400, headers: noStore });
    }
    if (!isUuid(body?.entryId)) return Response.json({ error: "找不到這一天的筆記。" }, { status: 400, headers: noStore });
    await ensureCoachingSchema();
    const marked = await markEntryFeedbackSeen(member.id, body.entryId);
    return marked ? Response.json({ ok: true }, { headers: noStore }) : Response.json({ error: "找不到這一則回覆。" }, { status: 404, headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
