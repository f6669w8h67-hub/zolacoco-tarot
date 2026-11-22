// 心理測驗 wall, more of it (GET ?before=<publishAt>&code=<code>): public, and only quizzes whose time has come.
import { isQuizCode } from "@/lib/quiz";
import { listPublishedQuizzes } from "@/lib/quiz-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const before = params.get("before"), code = params.get("code");
  const cursor = before && code && Number.isFinite(Date.parse(before)) && isQuizCode(code) ? { publishAt: new Date(before).toISOString(), code } : null;
  try {
    const page = await listPublishedQuizzes(cursor);
    return Response.json(page, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error("quiz_list_failed", error);
    return Response.json({ error: "測驗暫時讀不到，請稍後再試。" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
