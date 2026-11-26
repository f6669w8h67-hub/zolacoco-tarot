// 心理測驗統計 (Zola 2026-11-26: 有多少人做完測驗，後台也要顯示): a visitor who opens the reading of what she
// picked, or taps 「私訊 Zola」, adds one. Only how many is kept, never who. The page sends each once per phone
// per quiz, with a random id so a retry is counted once; Zola's own visits are not counted, nor is a reading
// the visitor could not have opened (an older quiz while signed out); and each sender has an hourly allowance,
// so a script cannot run the numbers up (ChatGPT review on #63).
import { auth } from "@clerk/nextjs/server";
import { isFreeQuiz, parseQuizCount, quizChoiceKeys } from "@/lib/quiz";
import { countQuizEvent, getPublishedQuiz } from "@/lib/quiz-store";
import { getSql } from "@/lib/membership";
import { isClerkConfigured } from "@/lib/membership-access";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const refuse = (status: number) => Response.json({ counted: false }, { status, headers: noStore });

/** Who is looking: Zola herself, someone signed in, or a visitor. If someone is signed in but the database
 *  cannot say who, this throws: it might be Zola, so nothing is counted (the page tries again later). */
async function viewer(): Promise<"zola" | "signed-in" | "visitor"> {
  if (!isClerkConfigured(process.env)) return "visitor";
  let userId: string | null = null;
  try {
    userId = (await auth()).userId;
  } catch {
    return "visitor";
  }
  if (!userId) return "visitor";
  const rows = await getSql()`SELECT role FROM members WHERE clerk_user_id = ${userId} LIMIT 1` as { role: string }[];
  return rows[0]?.role === "admin" ? "zola" : "signed-in";
}

/** The sender's address as Vercel gives it (it sets these itself); only its salted hash is kept, for two hours. */
function sender(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (request.headers.get("x-real-ip")?.trim() || forwarded || "unknown").slice(0, 64);
}

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (!text || text.length > 600) return refuse(400);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return refuse(400);
  }
  const count = parseQuizCount(body);
  if (!count) return refuse(400);
  try {
    const quiz = await getPublishedQuiz(count.code);
    if (!quiz) return refuse(404);
    if (!quizChoiceKeys(quiz).includes(count.choice)) return refuse(400);
    const who = await viewer();
    if (who === "zola") return Response.json({ counted: false }, { headers: noStore });
    if (who === "visitor" && !isFreeQuiz(quiz.publishAt)) return refuse(403);
    const result = await countQuizEvent(count, sender(request));
    if (result === "limited") return refuse(429);
    // "already": this count id was counted before, and the page only missed the answer
    return Response.json({ counted: true }, { headers: noStore });
  } catch (error) {
    console.error("quiz_count_failed", error);
    return refuse(503);
  }
}
