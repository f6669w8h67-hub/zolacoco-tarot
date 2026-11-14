// 學員練習室 step 3: is this choice the one with the clearest basis in the picture? Nothing is saved;
// the answer is judged again on the server when the student saves.
import { membershipErrorResponse, requireStudent } from "@/lib/membership";
import { judgeChoice, visibleQuestion } from "@/lib/practice-bank";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  try {
    const member = await requireStudent();
    let body: { questionId?: unknown; choice?: unknown };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "資料格式不正確，請重新整理後再試一次。" }, { status: 400, headers: noStore });
    }
    const question = typeof body?.questionId === "string" ? visibleQuestion(body.questionId, member.role === "admin") : null;
    if (!question) return Response.json({ error: "這一題目前沒有開放。" }, { status: 404, headers: noStore });
    const judged = typeof body.choice === "string" ? judgeChoice(question, body.choice) : null;
    if (!judged) return Response.json({ error: "請從三個解讀中選一個。" }, { status: 400, headers: noStore });
    return Response.json(judged, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
