"use client";

import Link from "next/link";
import { useState } from "react";
import { type QuizSummary, isFreeQuiz, toneColor } from "@/lib/quiz";

export function QuizTile({ quiz, label, priority = false, locked = false }: { quiz: QuizSummary; label?: string; priority?: boolean; locked?: boolean }) {
  const name = `${quiz.kind === "first-sight" ? "第一眼測驗" : "心理測驗"}：${quiz.title}${locked ? "（免費註冊後看）" : ""}`;
  return <Link className="qz-tile" href={`/quizzes/${quiz.code}`} aria-label={name} style={{ "--qz-tone": toneColor(quiz.kind, quiz.tone) } as React.CSSProperties}>
    <span className="qz-tile-art">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={quiz.cover} alt="" width={540} height={675} loading={priority ? "eager" : "lazy"} decoding="async"
        ref={(img) => { if (img?.complete) img.classList.add("in"); }} onLoad={(event) => event.currentTarget.classList.add("in")} />
      {quiz.kind === "first-sight" ? <span className="qz-tile-tag" aria-hidden="true">第一眼</span> : null}
      {locked ? <span className="qz-tile-lock" aria-hidden="true">註冊後看</span> : null}
    </span>
    <span className="qz-tile-code" aria-hidden="true">{label ?? quiz.code.replace(/^F/, "")}</span>
  </Link>;
}

/** The archive: the first page comes with the page; 「載入更多測驗」 fetches the next 18. */
export default function QuizWall({ initial, more: initialMore, signedIn }: { initial: QuizSummary[]; more: boolean; signedIn: boolean }) {
  const [quizzes, setQuizzes] = useState(initial);
  const [more, setMore] = useState(initialMore);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function loadMore() {
    const last = quizzes[quizzes.length - 1];
    if (!last || state === "loading") return;
    setState("loading");
    try {
      const response = await fetch(`/api/quizzes?before=${encodeURIComponent(last.publishAt)}&code=${encodeURIComponent(last.code)}`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.quizzes)) throw new Error("load-failed");
      setQuizzes((current) => [...current, ...data.quizzes.filter((quiz: QuizSummary) => !current.some((seen) => seen.code === quiz.code))]);
      setMore(Boolean(data.more));
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return <>
    <div className="qz-grid">{quizzes.map((quiz) => <QuizTile key={quiz.code} quiz={quiz} locked={!signedIn && !isFreeQuiz(quiz.publishAt)} />)}</div>
    {more ? <button type="button" className="qz-more" onClick={() => void loadMore()} disabled={state === "loading"}>{state === "loading" ? "載入中…" : state === "error" ? "沒有載入成功，再試一次" : "載入更多測驗"}</button> : null}
  </>;
}
