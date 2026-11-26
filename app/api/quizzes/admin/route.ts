// 心理測驗 (Zola only): every quiz with drafts and its numbers (GET), save one (POST), take one down for good
// (DELETE ?code=).
import { del } from "@vercel/blob";
import { isQuizCode, parseQuizInput } from "@/lib/quiz";
import { deleteQuiz, listAllQuizzes, quizImages, quizStats, saveQuiz } from "@/lib/quiz-store";
import { membershipErrorResponse, requireAdmin } from "@/lib/membership";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await requireAdmin();
    const [quizzes, stats] = await Promise.all([listAllQuizzes(), quizStats()]);
    return Response.json({ quizzes, stats }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    let body: unknown;
    try { body = await request.json(); } catch { return Response.json({ error: "資料格式不正確，請重新整理後再試一次。" }, { status: 400, headers: noStore }); }
    const checked = parseQuizInput(body);
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400, headers: noStore });
    return Response.json({ quiz: await saveQuiz(checked.quiz) }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const code = new URL(request.url).searchParams.get("code") ?? "";
    if (!isQuizCode(code)) return Response.json({ error: "找不到這篇測驗。" }, { status: 400, headers: noStore });
    const removed = await deleteQuiz(code);
    if (!removed) return Response.json({ error: "找不到這篇測驗。" }, { status: 404, headers: noStore });
    // its pictures go too; if that fails the quiz is still gone and the files are only unseen leftovers
    const images = quizImages(removed);
    if (images.length && process.env.BLOB_READ_WRITE_TOKEN) await del(images).catch((error) => console.error("quiz_image_delete_failed", error));
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
