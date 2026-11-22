import Link from "next/link";
import { type QuizSummary, isFreeQuiz } from "@/lib/quiz";
import { listPublishedQuizzes } from "@/lib/quiz-store";
import { isSignedIn } from "./quiz-access";
import QuizWall, { QuizTile } from "./quiz-wall";

// 心理測驗牆: today's three on top, then every quiz so far, newest first (ChatGPT design v1.0, 2026-11-22).
export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  let quizzes: QuizSummary[] = [], more = false, failed = false;
  try {
    ({ quizzes, more } = await listPublishedQuizzes(null));
  } catch (error) {
    console.error("quiz_wall_failed", error);
    failed = true;
  }
  // today's free ones (each quiz is open to all for its first 24 hours); older ones need a free account
  const signedIn = await isSignedIn();
  const todays = quizzes.filter((quiz) => isFreeQuiz(quiz.publishAt));
  const featured = todays.length ? todays.slice(0, 4) : quizzes.slice(0, 3);

  return <main className="quiz-page quiz-wall-page">
    <header className="qz-head">
      <p className="qz-kicker">ZOLACOCO TAROT</p>
      <h1>心理測驗</h1>
      <p className="qz-lead">翻閱此刻與妳有共鳴的題目</p>
    </header>

    {failed ? <p className="qz-empty">測驗暫時讀不到，請稍後再試。</p> : quizzes.length === 0 ? <p className="qz-empty">第一篇心理測驗很快就會出現在這裡。</p> : <>
      <section className="qz-today" aria-labelledby="qz-today-title">
        <header><h2 id="qz-today-title">{todays.length === 3 ? "今天的三篇" : todays.length ? "今天的測驗" : "最新的測驗"}</h2><span>{todays.length ? "免費玩・24 小時內" : formatDay(featured[0].publishAt)}</span></header>
        <div className="qz-grid qz-grid-today">{featured.map((quiz) => <QuizTile key={quiz.code} quiz={quiz} priority locked={!signedIn && !isFreeQuiz(quiz.publishAt)} />)}</div>
      </section>
      <section className="qz-archive" aria-labelledby="qz-archive-title">
        <header><h2 id="qz-archive-title">所有測驗</h2><span>最新發布優先</span></header>
        <QuizWall initial={quizzes} more={more} signedIn={signedIn} />
      </section>
    </>}

    <p className="qz-back"><Link href="/">回到首頁</Link></p>
  </main>;
}

function formatDay(at: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "long", day: "numeric" }).format(new Date(at));
}
