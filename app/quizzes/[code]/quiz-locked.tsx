import Link from "next/link";
import { type QuizSummary, toneColor } from "@/lib/quiz";

// An older quiz for someone signed out: its cover, its title, and the way in (a free account).
export default function QuizLocked({ quiz }: { quiz: QuizSummary }) {
  const back = encodeURIComponent(`/quizzes/${quiz.code}`);
  return <main className="quiz-page quiz-one qz-locked" style={{ "--qz-tone": toneColor(quiz.kind, quiz.tone) } as React.CSSProperties}>
    <nav className="qz-crumbs"><Link href="/quizzes">← 所有測驗</Link><span className="qz-chip">{quiz.kind === "first-sight" ? "第一眼測驗" : quiz.code}</span></nav>
    <figure className="qz-locked-art">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={quiz.cover} alt={quiz.title} width={1080} height={1350} />
    </figure>
    <section className="qz-locked-note" aria-labelledby="qz-locked-title">
      <p className="qz-kicker-sm">以前的測驗</p>
      <h1 id="qz-locked-title">{quiz.title}</h1>
      <p>每篇測驗公開後的 24 小時內，大家都能免費玩。這一篇已經過了那一天，<b>免費註冊</b>或登入後就能看完整解析，以前的測驗也都能翻。</p>
      <div className="qz-locked-actions">
        <Link className="qz-reveal" href={`/sign-up?redirect_url=${back}`}>免費註冊，看這篇解析</Link>
        <Link className="qz-locked-login" href={`/sign-in?redirect_url=${back}`}>已經有帳號？登入</Link>
      </div>
      <p className="qz-locked-free"><Link href="/quizzes">先去玩今天的三篇（免費）→</Link></p>
    </section>
  </main>;
}
