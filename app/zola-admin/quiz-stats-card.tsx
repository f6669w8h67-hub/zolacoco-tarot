"use client";

// 心理測驗統計 on the 會員後台 front page (Zola 2026-11-26: 會員後台也是): the totals and the latest three public
// quizzes, with a link to every quiz's numbers on 心理測驗上傳. If the numbers cannot be read, the member list
// below is not affected.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuizStats, QuizSummary } from "@/lib/quiz";

type Data = { stats: QuizStats; latest: QuizSummary[] };

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" }).format(new Date(iso));
}

export default function QuizStatsCard() {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/quizzes/admin?view=stats", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load-failed");
        return response.json() as Promise<Data>;
      })
      .then((next) => { if (live) setData(next); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const tallies = data ? Object.values(data.stats.quizzes) : [];
  const read = tallies.reduce((sum, tally) => sum + tally.read, 0);
  const line = tallies.reduce((sum, tally) => sum + tally.line, 0);

  return <section className="admin-quiz-stats" aria-labelledby="admin-quiz-stats-title">
    <header>
      <h2 id="admin-quiz-stats-title">心理測驗</h2>
      <Link href="/zola-admin/quizzes">每一篇的數字 →</Link>
    </header>
    {failed ? <p className="admin-quiz-note">心理測驗的數字暫時讀不到，請稍後重新整理。</p>
      : !data ? <p className="admin-quiz-note">讀取中…</p>
      : <>
        <p className="admin-quiz-total">看完解析 <strong>{read}</strong> 人次・按私訊 <strong>{line}</strong> 人次</p>
        {data.latest.length ? <ul>
          {data.latest.map((quiz) => {
            const tally = data.stats.quizzes[quiz.code];
            return <li key={quiz.code}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={quiz.cover} alt="" loading="lazy" width={36} height={45} />
              <span className="admin-quiz-title">{quiz.title}</span>
              <span className="admin-quiz-nums"><span>看完 <b>{tally?.read ?? 0}</b> 人</span><span>按私訊 <b>{tally?.line ?? 0}</b> 人</span></span>
            </li>;
          })}
        </ul> : null}
        <p className="admin-quiz-note">{data.stats.since ? `最早的紀錄從 ${formatDay(data.stats.since)} 開始。` : "還沒有人看完解析，有人看就會開始記。"}同一支手機看同一篇只算一次，所以是大約的人數；妳自己登入時看的不算。</p>
      </>}
  </section>;
}
