// 學員練習 (Zola only): students and their progress (GET), one student's answers (GET ?memberId=),
// and Zola's reply to one answer (POST).
import { membershipErrorResponse, requireAdmin } from "@/lib/membership";
import { PRACTICE_QUESTIONS } from "@/lib/practice-bank";
import { parseFeedbackBody, publicAnswer } from "@/lib/practice-input";
import { ensurePracticeSchema, listMemberAnswers, listStudents, saveFeedback, type PracticeAnswerRow } from "@/lib/practice-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const versions = new Map(PRACTICE_QUESTIONS.map((question) => [question.id, question.version]));

function adminAnswer(row: PracticeAnswerRow) {
  return {
    ...publicAnswer(row),
    /** never replied */
    waiting: row.feedback_at === null,
    /** the student changed the answer after Zola replied */
    changedAfterFeedback: row.feedback_at !== null && row.reviewed_revision !== null && row.revision > row.reviewed_revision,
    /** the question has a newer version than the one this answer was written for */
    questionUpdated: (versions.get(row.question_id) ?? row.question_version) > row.question_version,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    await ensurePracticeSchema();
    const memberId = new URL(request.url).searchParams.get("memberId");
    if (memberId) {
      if (!/^[0-9a-f-]{36}$/i.test(memberId)) return Response.json({ error: "找不到這位學員。" }, { status: 400, headers: noStore });
      const answers = await listMemberAnswers(memberId);
      return Response.json({ answers: answers.map(adminAnswer) }, { headers: noStore });
    }
    return Response.json({ students: await listStudents() }, { headers: noStore });
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
    const checked = parseFeedbackBody(body);
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400, headers: noStore });
    await ensurePracticeSchema();
    const saved = await saveFeedback(checked.value.answerId, checked.value.feedback, checked.value.expectedRevision);
    if (!saved.ok) {
      if (!saved.current) return Response.json({ error: "找不到這一題的作答。" }, { status: 404, headers: noStore });
      return Response.json({ error: "學員剛修改了這一題，已載入最新的作答，請看過後再回覆。", answer: adminAnswer(saved.current) }, { status: 409, headers: noStore });
    }
    return Response.json({ answer: adminAnswer(saved.answer) }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
