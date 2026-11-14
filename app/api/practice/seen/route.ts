// 學員練習室: the student has read Zola's reply. Only the owner can mark their own answer.
import { membershipErrorResponse, requireStudent } from "@/lib/membership";
import { ensurePracticeSchema, markFeedbackSeen } from "@/lib/practice-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const member = await requireStudent();
    let body: { answerId?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "資料格式不正確。" }, { status: 400, headers: noStore });
    }
    if (typeof body?.answerId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.answerId)) {
      return Response.json({ error: "找不到這一題的作答。" }, { status: 400, headers: noStore });
    }
    await ensurePracticeSchema();
    const marked = await markFeedbackSeen(member.id, body.answerId);
    return marked ? Response.json({ ok: true }, { headers: noStore }) : Response.json({ error: "找不到這一則回覆。" }, { status: 404, headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
