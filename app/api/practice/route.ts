// 學員練習室: a student's questions and own answers (GET), and saving one answer (POST).
// Who: Zola, or a member she marked as her student (requireStudent), never by VIP months alone.
import { membershipErrorResponse, requireStudent } from "@/lib/membership";
import { judgeChoice, practiceCatalog, visibleQuestion } from "@/lib/practice-bank";
import { parseAnswerBody, publicAnswer } from "@/lib/practice-input";
import { ensurePracticeSchema, listAnswers, saveAnswer } from "@/lib/practice-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const member = await requireStudent();
    const admin = member.role === "admin";
    await ensurePracticeSchema();
    const answers = await listAnswers(member.id);
    return Response.json({ access: admin ? "admin" : "student", units: practiceCatalog(admin), answers: answers.map(publicAnswer) }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await requireStudent();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "資料格式不正確，請重新整理後再試一次。" }, { status: 400, headers: noStore });
    }
    const checked = parseAnswerBody(body);
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400, headers: noStore });
    const input = checked.value;
    const question = visibleQuestion(input.questionId, member.role === "admin");
    if (!question) return Response.json({ error: "這一題目前沒有開放。" }, { status: 404, headers: noStore });
    // The server decides whether the choice is right; the page's opinion is never stored.
    const judged = judgeChoice(question, input.choice);
    if (!judged) return Response.json({ error: "請從三個解讀中選一個。" }, { status: 400, headers: noStore });

    await ensurePracticeSchema();
    const saved = await saveAnswer(member.id, {
      unit: question.unit,
      questionId: question.id,
      questionVersion: question.version,
      observation: input.observation,
      reading: input.reading,
      choice: input.choice,
      correct: judged.correct,
      revisedReading: input.revisedReading,
    }, input.expectedRevision);
    if (!saved.ok) {
      return Response.json({
        error: "這一題在另一個視窗已經更新過，已載入最新的內容，請確認後再儲存。",
        answer: saved.current ? publicAnswer(saved.current) : null,
      }, { status: 409, headers: noStore });
    }
    return Response.json({ answer: publicAnswer(saved.answer) }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
