// 陪跑筆記 (Zola only): 陪跑 members and their progress (GET), one member's shared rounds (GET ?memberId=),
// and Zola's reply to one day's note (POST). Rounds a member did not share, or took back, never appear.
import { adminEntry, isUuid, parseCoachingFeedbackBody, publicCycle } from "@/lib/coaching-input";
import { ensureCoachingSchema, listCoachingMembers, listSharedJournal, saveEntryFeedback } from "@/lib/coaching-store";
import { membershipErrorResponse, requireAdmin } from "@/lib/membership";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    await requireAdmin();
    await ensureCoachingSchema();
    const memberId = new URL(request.url).searchParams.get("memberId");
    if (memberId !== null) {
      if (!isUuid(memberId)) return Response.json({ error: "找不到這位會員。" }, { status: 400, headers: noStore });
      const journal = await listSharedJournal(memberId);
      return Response.json({ cycles: journal.cycles.map(publicCycle), entries: journal.entries.map(adminEntry) }, { headers: noStore });
    }
    return Response.json({ members: await listCoachingMembers() }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "資料格式不正確，請重新整理後再試一次。" }, { status: 400, headers: noStore });
    }
    const checked = parseCoachingFeedbackBody(body);
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400, headers: noStore });
    await ensureCoachingSchema();
    const saved = await saveEntryFeedback(checked.value.entryId, checked.value.feedback, checked.value.expectedRevision);
    if (!saved.ok) {
      if (!saved.current) return Response.json({ error: "找不到這一天的筆記，對方可能已停止同步。" }, { status: 404, headers: noStore });
      return Response.json({ error: "對方剛修改了這一天的筆記，已載入最新的內容，請看過後再回覆。", entry: adminEntry(saved.current) }, { status: 409, headers: noStore });
    }
    return Response.json({ entry: adminEntry(saved.entry) }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
