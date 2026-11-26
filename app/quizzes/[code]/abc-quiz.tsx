"use client";

// 三選一圖卡: the five IG cards side by side (swipe or arrows), pick A／B／C, read that analysis, then the hook
// and 「私訊 Zola」 (ChatGPT design v1.0, 2026-11-22).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type AbcQuiz, CHOICES, type Choice, QUIZ_COLORS, quizLineLink, quizMessage, siteWording } from "@/lib/quiz";
import { countOnce, retryWaiting } from "./quiz-count";
import QuizLineCta from "./quiz-line-cta";

const CARD_NAMES = ["封面", "共鳴", "共鳴", "選一張牌", "留言"];

function paragraphs(text: string) {
  return siteWording(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export default function AbcQuizView({ quiz }: { quiz: AbcQuiz }) {
  const track = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [revealed, setRevealed] = useState<Choice | null>(null);
  const tone = QUIZ_COLORS[quiz.tone];

  // 心理測驗統計: a count that did not get through last time is sent again (same id, counted once)
  useEffect(() => retryWaiting(quiz.code), [quiz.code]);

  // coming back to a shared result (?choice=B) opens it again
  useEffect(() => {
    const picked = new URLSearchParams(location.search).get("choice");
    if (picked === "A" || picked === "B" || picked === "C") {
      const frame = requestAnimationFrame(() => { setChoice(picked); setRevealed(picked); });
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  function go(next: number) {
    const el = track.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(quiz.data.cards.length - 1, next));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: clamped * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  function onScroll() {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function pick(letter: Choice) {
    setChoice(letter);
    if (index !== 3) go(3);
  }

  function reveal() {
    if (!choice) return;
    setRevealed(choice);
    countOnce(quiz.code, "read", choice);
    const url = new URL(location.href);
    url.searchParams.set("choice", choice);
    history.replaceState(null, "", url);
    requestAnimationFrame(() => result.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }

  const message = revealed ? quizMessage(quiz, revealed) : "";

  return <main className="quiz-page quiz-one qz-abc" style={{ "--qz-tone": tone.ink, "--qz-tint": tone.tint } as React.CSSProperties}>
    <nav className="qz-crumbs"><Link href="/quizzes">← 所有測驗</Link><span className="qz-chip">{quiz.code}</span></nav>
    <h1 className="qz-title">{quiz.title}</h1>

    <section className="qz-deck" aria-roledescription="輪播" aria-label="測驗圖卡，左右滑動翻閱">
      <div className="qz-track" ref={track} onScroll={onScroll} tabIndex={0} onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1); }
      }}>
        {quiz.data.cards.map((src, i) => <figure className="qz-card" key={src} aria-label={`第 ${i + 1} 張，共 ${quiz.data.cards.length} 張：${CARD_NAMES[i] ?? ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={i === 0 ? quiz.title : ""} width={1080} height={1350} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
        </figure>)}
      </div>
      <div className="qz-deck-ctl">
        <button type="button" className="qz-arrow" aria-label="上一張" disabled={index === 0} onClick={() => go(index - 1)}>‹</button>
        <div className="qz-dots">{quiz.data.cards.map((_, i) => <button type="button" key={i} aria-label={`第 ${i + 1} 張，共 ${quiz.data.cards.length} 張`} aria-current={i === index ? "true" : undefined} onClick={() => go(i)} />)}</div>
        <button type="button" className="qz-arrow" aria-label="下一張" disabled={index === quiz.data.cards.length - 1} onClick={() => go(index + 1)}>›</button>
      </div>
    </section>

    <section className="qz-pick" aria-labelledby="qz-pick-title">
      <h2 id="qz-pick-title">選一張最有感覺的牌</h2>
      <p className="qz-hint">{index === 3 ? "憑直覺，點妳第一個想選的那張。" : "翻到第 4 張看看三張牌，或直接在這裡選。"}</p>
      <div className="qz-options" role="radiogroup" aria-label="A、B、C 三個選項">
        {CHOICES.map((letter, i) => {
          const art = quiz.data.choices[i];
          return <button type="button" role="radio" aria-checked={choice === letter} key={letter} className={`qz-option${choice === letter ? " on" : ""}${choice && choice !== letter ? " dim" : ""}`} onClick={() => pick(letter)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {art ? <img src={art} alt="" width={270} height={390} loading="lazy" /> : <span className="qz-option-plain" aria-hidden="true">{letter}</span>}
            {art ? <b>{letter}</b> : null}
          </button>;
        })}
      </div>
      <button type="button" className="qz-reveal" disabled={!choice} onClick={reveal}>{choice ? `揭曉 ${choice} 的解析` : "先選一張牌"}</button>
    </section>

    {revealed ? <section className="qz-result" ref={result} aria-labelledby="qz-result-title" key={revealed}>
      <header className="qz-result-head">
        <span className="qz-result-letter" aria-hidden="true">{revealed}</span>
        <div><p className="qz-kicker-sm">妳選的解析</p><h2 id="qz-result-title">妳選的是 {revealed}</h2></div>
      </header>
      <article className="qz-reading">{paragraphs(quiz.data.analysis[revealed]).map((p, i) => <p key={i}>{p}</p>)}</article>
      <div className="qz-others">
        <h3>也看看另外兩個答案</h3>
        {CHOICES.filter((letter) => letter !== revealed).map((letter) => <details key={letter}>
          <summary><span aria-hidden="true">{letter}</span>{letter} 的解析</summary>
          <div className="qz-others-body">{paragraphs(quiz.data.analysis[letter]).map((p, i) => <p key={i}>{p}</p>)}</div>
        </details>)}
      </div>
      <QuizLineCta hook={quiz.data.hook} link={quizLineLink(quiz.data.lineUrl, message)} message={message} code={quiz.code} choice={revealed} />
    </section> : null}

    <p className="qz-back"><Link href="/quizzes">看更多心理測驗</Link></p>
  </main>;
}
