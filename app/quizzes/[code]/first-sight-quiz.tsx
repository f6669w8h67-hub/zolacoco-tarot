"use client";

// 第一眼測驗: look at the painting first; then tap the thing she saw first, on the painting or in the four
// round close-ups. The close-up opens like a magnifying glass, with its line and the full reading. Every
// quiz keeps its own look: its painting blurred behind the page, and its paper (信紙拼貼／淺色／深色).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FIRST_SIGHT_THEMES, type FirstSightObject, type FirstSightQuiz, lens, quizLineLink, quizMessage, siteWording } from "@/lib/quiz";
import { countOnce } from "./quiz-count";
import QuizLineCta from "./quiz-line-cta";

/** "🌙 這代表\n本文\n\n📌 12 月的提醒\n本文" → titled parts; a part without a short first line stays plain. */
function sections(text: string) {
  return siteWording(text).split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean).map((part) => {
    const [first, ...rest] = part.split("\n");
    return rest.length && first.length <= 16 ? { heading: first.trim(), body: rest.join("\n").trim() } : { heading: "", body: part };
  });
}

function Lens({ quiz, object, className = "" }: { quiz: FirstSightQuiz; object: FirstSightObject; className?: string }) {
  return <span className={`fs-lens ${className}`} aria-hidden="true" style={{ backgroundImage: `url("${quiz.data.painting}")`, ...lens(object, quiz.data.ratio) }} />;
}

export default function FirstSightView({ quiz }: { quiz: FirstSightQuiz }) {
  const [stage, setStage] = useState<"look" | "choose">("look");
  const [picked, setPicked] = useState<number | null>(null);
  const result = useRef<HTMLElement>(null);
  const theme = FIRST_SIGHT_THEMES[quiz.tone];
  const objects = quiz.data.objects;

  // a few seconds to simply look; then the four things are marked (she can tap the painting any time)
  useEffect(() => {
    if (stage !== "look") return;
    const timer = setTimeout(() => setStage("choose"), 4500);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    const saw = new URLSearchParams(location.search).get("saw");
    const index = objects.findIndex((object) => object.name === saw);
    if (index >= 0) {
      const frame = requestAnimationFrame(() => { setStage("choose"); setPicked(index); });
      return () => cancelAnimationFrame(frame);
    }
  }, [objects]);

  function choose(index: number) {
    setStage("choose");
    setPicked(index);
    countOnce(quiz.code, "read", objects[index].name);
    const url = new URL(location.href);
    url.searchParams.set("saw", objects[index].name);
    history.replaceState(null, "", url);
    requestAnimationFrame(() => result.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }

  const chosen = picked === null ? null : objects[picked];
  const message = chosen ? quizMessage(quiz, chosen.name) : "";

  return <main className={`quiz-page quiz-one qz-fs fs-${quiz.tone}`} style={{ "--fs-accent": theme.accent, "--fs-paper": quiz.data.paper ? `url("${quiz.data.paper}")` : "none" } as React.CSSProperties}>
    <div className="fs-backdrop" aria-hidden="true" style={{ backgroundImage: `url("${quiz.data.blur ?? quiz.data.painting}")` }} />
    <nav className="qz-crumbs"><Link href="/quizzes">← 所有測驗</Link><span className="qz-chip">第一眼測驗</span></nav>

    <header className="fs-head fs-paper">
      <p className="fs-eng">FIRST SIGHT TEST</p>
      <h1>{quiz.title}</h1>
      {quiz.data.subtitle ? <p className="fs-sub">{quiz.data.subtitle}</p> : null}
    </header>

    <section className={`fs-stage ${stage}`} aria-label="畫作">
      <div className="fs-painting" style={{ aspectRatio: `1 / ${quiz.data.ratio}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={quiz.data.painting} alt={`一幅畫，裡面藏著${objects.map((o) => o.name).join("、")}`} width={1080} height={Math.round(1080 * quiz.data.ratio)} />
        {objects.map((object, i) => <button type="button" key={object.name} className={`fs-spot${picked === i ? " on" : ""}`} aria-label={`我第一眼看到${object.name}`}
          style={{ left: `${object.x}%`, top: `${object.y}%`, width: `${object.s}%` }} onClick={() => choose(i)}>
          <span className="fs-spot-num" aria-hidden="true">{i + 1}</span>
        </button>)}
      </div>
      <p className="fs-prompt">{stage === "look" ? "先別多想，看著這幅畫……" : "妳第一眼看到的是哪一個？點畫上的位置，或下面的圓圈。"}</p>
      {stage === "look" ? <button type="button" className="fs-ready" onClick={() => setStage("choose")}>我看好了</button> : null}
    </section>

    <section className={`fs-choices${stage === "choose" ? " shown" : ""}`} aria-label="四樣東西" inert={stage !== "choose"}>
      {objects.map((object, i) => <button type="button" key={object.name} className={`fs-choice${picked === i ? " on" : ""}${picked !== null && picked !== i ? " dim" : ""}`} onClick={() => choose(i)}>
        <Lens quiz={quiz} object={object} />
        <span className="fs-choice-name"><b>{i + 1}</b>{object.name}</span>
      </button>)}
    </section>

    {chosen ? <section className="fs-result" ref={result} aria-labelledby="fs-result-title" key={chosen.name}>
      <div className="fs-result-top">
        <Lens quiz={quiz} object={chosen} className="big" />
        <p className="fs-kicker">妳第一眼看到的是</p>
        <h2 id="fs-result-title">{chosen.name}</h2>
        {chosen.line ? <p className="fs-line">「{chosen.line}」</p> : null}
      </div>
      <article className="fs-reading fs-paper">
        {chosen.hint ? <p className="fs-hint">{chosen.hint}</p> : null}
        {sections(chosen.text).map((part, i) => <div className="fs-part" key={i}>
          {part.heading ? <h3>{part.heading}</h3> : null}
          <p>{part.body}</p>
        </div>)}
      </article>
      <div className="qz-others fs-others">
        <h3>也看看另外三樣東西</h3>
        {objects.map((object, i) => i === picked ? null : <details key={object.name}>
          <summary><Lens quiz={quiz} object={object} className="small" />{object.name}<small>{object.hint}</small></summary>
          <div className="qz-others-body">{sections(object.text).map((part, j) => <div className="fs-part" key={j}>{part.heading ? <h4>{part.heading}</h4> : null}<p>{part.body}</p></div>)}</div>
        </details>)}
      </div>
      <QuizLineCta hook={quiz.data.hook} link={quizLineLink(quiz.data.lineUrl, message)} message={message} code={quiz.code} choice={chosen.name} />
    </section> : null}

    <p className="qz-back"><Link href="/quizzes">看更多心理測驗</Link></p>
  </main>;
}
