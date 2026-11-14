"use client";

// 學員練習室 (/practice). Zola's students practise reading a card in four steps and keep their answers;
// Zola replies from /zola-admin/practice. Questions and answers come only from /api/practice, which
// checks the student on the server; this file never imports the question bank, so draft questions and
// right answers are not in the page's code.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useIdentityKey } from "@/app/auth-identity";
import { TarotCardFace } from "@/app/tarot-card";
import { tarotCards, type TarotCard } from "@/app/tarot-data";
import type { ShownAnswer } from "@/lib/practice-input";
import "../styles/pearl-page.css";
import "./practice.css";

type Option = { id: string; text: string };
type Question = {
  id: string; version: number; unit: string; cardId: string; reversed: boolean; scenario: string | null;
  observe: string; read: string; choose: string; options: Option[]; draft: boolean;
};
type Unit = { id: string; level: "基礎" | "進階"; title: string; focus: string; questions: Question[] };
type Catalog = { access: "student" | "admin"; units: Unit[]; answers: ShownAnswer[] };
type Judged = { correct: boolean; note: string; rightNote: string; sample: string | null };

type Load =
  | { state: "loading" }
  | { state: "signed-out" }
  | { state: "not-student" }
  | { state: "error" }
  | { state: "ready"; data: Catalog };

type View = { kind: "home" } | { kind: "unit"; unitId: string } | { kind: "question"; questionId: string };

const cardById = new Map(tarotCards.map((card) => [card.id, card]));

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  let data: Record<string, unknown> | null = null;
  try { data = await response.json(); } catch { data = null; }
  return { status: response.status, ok: response.ok, data };
}

function message(data: Record<string, unknown> | null, fallback: string) {
  return typeof data?.error === "string" && /[^\x00-\x7f]/.test(data.error) ? data.error : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export default function PracticePage() {
  // A different account gets a fresh room: nothing from the previous person stays on screen.
  const identityKey = useIdentityKey();
  return <PracticeRoom key={identityKey ?? "loading"} waiting={identityKey === null} />;
}

function PracticeRoom({ waiting }: { waiting: boolean }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [view, setView] = useState<View>({ kind: "home" });

  useEffect(() => {
    if (waiting) return;
    let active = true;
    fetch("/api/practice", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) { setLoad({ state: "signed-out" }); return; }
        if (response.status === 403) { setLoad({ state: "not-student" }); return; }
        if (!response.ok) { setLoad({ state: "error" }); return; }
        setLoad({ state: "ready", data: await response.json() as Catalog });
      })
      .catch(() => { if (active) setLoad({ state: "error" }); });
    return () => { active = false; };
  }, [waiting]);

  const updateAnswer = useCallback((answer: ShownAnswer) => {
    setLoad((current) => current.state !== "ready" ? current : { state: "ready", data: { ...current.data, answers: [answer, ...current.data.answers.filter((item) => item.questionId !== answer.questionId)] } });
  }, []);

  function go(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (load.state !== "ready") {
    const copy = {
      loading: ["正在打開學員練習室…", "請稍候。"],
      "signed-out": ["這裡是學員練習室", "由 Zola 開通學員身分後才能使用。已經是學員的話，請先登入。"],
      "not-student": ["這裡是學員練習室", "由 Zola 開通學員身分後才能使用。"],
      error: ["暫時打不開練習室", "可能是網路不穩，請稍後重新整理。"],
    }[load.state];
    return <main className="practice-page pearl-page" aria-busy={load.state === "loading" || undefined}>
      <section className="pr-state">
        <p className="pr-kicker">Zolacoco Student Room</p>
        <h1>{copy[0]}</h1>
        <p>{copy[1]}</p>
        {load.state === "signed-out" ? <Link className="pr-primary" href="/sign-in?redirect_url=%2Fpractice">登入</Link> : null}
        {load.state === "not-student" || load.state === "error" ? <Link className="pr-secondary" href="/account">回到會員中心</Link> : null}
      </section>
    </main>;
  }

  const { data } = load;
  const answersByQuestion = new Map(data.answers.map((answer) => [answer.questionId, answer]));
  const unit = view.kind === "unit" ? data.units.find((item) => item.id === view.unitId) : undefined;
  const questionUnit = view.kind === "question" ? data.units.find((item) => item.questions.some((question) => question.id === view.questionId)) : undefined;
  const question = view.kind === "question" ? questionUnit?.questions.find((item) => item.id === view.questionId) : undefined;

  return <main className="practice-page pearl-page">
    {view.kind === "question" && question && questionUnit
      ? <QuestionFlow key={question.id} question={question} unit={questionUnit} answer={answersByQuestion.get(question.id) ?? null} onSaved={updateAnswer} onBack={() => go({ kind: "unit", unitId: questionUnit.id })} onNext={() => {
          const index = questionUnit.questions.findIndex((item) => item.id === question.id);
          const next = questionUnit.questions[index + 1];
          go(next ? { kind: "question", questionId: next.id } : { kind: "unit", unitId: questionUnit.id });
        }} />
      : view.kind === "unit" && unit
        ? <UnitView unit={unit} answers={answersByQuestion} onBack={() => go({ kind: "home" })} onOpen={(id) => go({ kind: "question", questionId: id })} />
        : <Home data={data} answers={answersByQuestion} onOpenUnit={(id) => go({ kind: "unit", unitId: id })} onSeen={updateAnswer} />}
  </main>;
}

function Home({ data, answers, onOpenUnit, onSeen }: { data: Catalog; answers: Map<string, ShownAnswer>; onOpenUnit: (id: string) => void; onSeen: (answer: ShownAnswer) => void }) {
  const unread = data.answers.filter((answer) => answer.feedbackUnread).length;
  return <>
    <header className="pr-hero">
      <p className="pr-kicker">Zolacoco Student Room</p>
      <h1>學員練習室</h1>
      <p className="pr-lead">每一題先看畫面、寫下自己的解讀，再對照。妳寫下的內容 Zola 都看得到，也會在這裡回覆妳。</p>
      {data.access === "admin" ? <p className="pr-admin-note">妳正在用 Zola 的帳號預覽：草稿題也會顯示，學員看不到草稿。<Link href="/zola-admin/practice">學員練習後台 →</Link></p> : null}
      {unread > 0 ? <a className="pr-unread" href="#practice-records">有 {unread} 則 Zola 的新回覆 →</a> : null}
    </header>

    {(["基礎", "進階"] as const).map((level) => <section className="pr-units" key={level} aria-labelledby={`level-${level}`}>
      <h2 id={`level-${level}`}>{level}</h2>
      <div className="pr-unit-grid">
        {data.units.filter((item) => item.level === level).map((item) => {
          const done = item.questions.filter((question) => answers.has(question.id)).length;
          if (item.questions.length === 0) {
            return <div className="pr-unit is-soon" key={item.id}><b>{item.title}</b><small>準備中</small></div>;
          }
          return <button type="button" className="pr-unit" key={item.id} onClick={() => onOpenUnit(item.id)}>
            <b>{item.title}</b>
            <small>{item.focus}</small>
            <span className="pr-progress"><span style={{ width: `${Math.round((done / item.questions.length) * 100)}%` }} /></span>
            <em>已完成 {done} / {item.questions.length}</em>
          </button>;
        })}
      </div>
    </section>)}

    <Records data={data} onSeen={onSeen} />
  </>;
}

function UnitView({ unit, answers, onBack, onOpen }: { unit: Unit; answers: Map<string, ShownAnswer>; onBack: () => void; onOpen: (id: string) => void }) {
  return <section className="pr-unit-view">
    <button type="button" className="pr-back" onClick={onBack}>← 全部單元</button>
    <p className="pr-kicker">{unit.level}</p>
    <h1>{unit.title}</h1>
    <p className="pr-lead">{unit.focus}</p>
    <ol className="pr-question-list">
      {unit.questions.map((question, index) => {
        const card = cardById.get(question.cardId);
        const answer = answers.get(question.id);
        return <li key={question.id}><button type="button" onClick={() => onOpen(question.id)}>
          <span className="pr-q-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="pr-q-title"><b>{card?.name ?? question.cardId}{question.reversed ? "（逆位）" : ""}</b>{question.scenario ? <small>{question.scenario}</small> : null}</span>
          <span className="pr-q-state">
            {question.draft ? <i className="pr-badge is-draft">草稿</i> : null}
            {answer?.feedbackUnread ? <i className="pr-badge is-new">新回覆</i> : answer ? <i className="pr-badge is-done">已完成</i> : null}
          </span>
        </button></li>;
      })}
    </ol>
  </section>;
}

function PracticeCard({ card, reversed }: { card: TarotCard | undefined; reversed: boolean }) {
  if (!card) return null;
  return <div className={`pr-card${reversed ? " is-reversed" : ""}`}>
    <TarotCardFace card={card} />
    {reversed ? <span className="pr-reversed-chip">逆位</span> : null}
  </div>;
}

function QuestionFlow({ question, unit, answer, onSaved, onBack, onNext }: { question: Question; unit: Unit; answer: ShownAnswer | null; onSaved: (answer: ShownAnswer) => void; onBack: () => void; onNext: () => void }) {
  const card = cardById.get(question.cardId);
  const [redo, setRedo] = useState(answer === null);
  const [step, setStep] = useState(1);
  const [observation, setObservation] = useState("");
  const [reading, setReading] = useState("");
  const [firstChoice, setFirstChoice] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [judged, setJudged] = useState<Judged | null>(null);
  const [revised, setRevised] = useState("");
  const [expectedRevision, setExpectedRevision] = useState<number | null>(answer?.revision ?? null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [saved, setSaved] = useState(false);

  async function pick(optionId: string) {
    if (busy) return;
    setBusy(true); setNotice(null);
    const result = await postJson("/api/practice/check", { questionId: question.id, choice: optionId }).catch(() => null);
    setBusy(false);
    if (!result?.ok || !result.data) { setNotice({ tone: "error", text: message(result?.data ?? null, "暫時無法對照，請再試一次。") }); return; }
    setChoice(optionId);
    if (firstChoice === null) setFirstChoice(optionId);
    setJudged(result.data as unknown as Judged);
  }

  async function save() {
    if (busy || firstChoice === null) return;
    setBusy(true); setNotice(null);
    const result = await postJson("/api/practice", {
      questionId: question.id, observation, reading, choice: firstChoice, revisedReading: revised, expectedRevision,
    }).catch(() => null);
    setBusy(false);
    if (!result) { setNotice({ tone: "error", text: "網路不穩，這一題還沒有存好，請再按一次儲存。" }); return; }
    const returned = result.data?.answer as ShownAnswer | undefined;
    if (result.status === 409 && returned) {
      onSaved(returned);
      setExpectedRevision(returned.revision);
      setNotice({ tone: "error", text: message(result.data, "這一題在另一個視窗已經更新過。") + "妳現在寫的內容還在，確認後可以再按一次儲存。" });
      return;
    }
    if (!result.ok || !returned) { setNotice({ tone: "error", text: message(result.data, "這一題還沒有存好，請再試一次。") }); return; }
    onSaved(returned);
    setExpectedRevision(returned.revision);
    setSaved(true);
    setNotice({ tone: "ok", text: "已存進妳的練習紀錄，Zola 看得到。" });
  }

  const optionText = (id: string | null) => question.options.find((option) => option.id === id)?.text ?? "";

  return <section className="pr-flow" aria-labelledby="pr-flow-title">
    <button type="button" className="pr-back" onClick={onBack}>← {unit.title}</button>
    <p className="pr-kicker">{unit.level}・{unit.title}{question.draft ? "・草稿" : ""}</p>
    <h1 id="pr-flow-title">{card?.name ?? question.cardId}{question.reversed ? "（逆位）" : ""}</h1>
    {question.scenario ? <p className="pr-scenario"><b>問事者的問題</b>{question.scenario}</p> : null}
    <PracticeCard card={card} reversed={question.reversed} />

    {!redo && answer ? <div className="pr-previous">
      <h2>妳上次的作答</h2>
      <AnswerDetail answer={answer} />
      <button type="button" className="pr-primary" onClick={() => { setRedo(true); setReading(answer.reading); setObservation(answer.observation); }}>重新練習這一題</button>
    </div> : <>
      <ol className="pr-steps" aria-label="練習步驟">
        {["看見畫面", "我的解讀", "對照", "修正與儲存"].map((label, index) => <li key={label} className={index + 1 === step ? "is-current" : index + 1 < step ? "is-done" : ""}><span>{index + 1}</span>{label}</li>)}
      </ol>

      {step === 1 ? <div className="pr-step">
        <h2>看見畫面</h2>
        <p>{question.observe}</p>
        <textarea value={observation} onChange={(event) => setObservation(event.target.value)} maxLength={2000} rows={4} aria-label="我看見的畫面" placeholder="例如：牠站在高處、手上提著燈……" />
        <div className="pr-actions"><button type="button" className="pr-primary" onClick={() => setStep(2)}>下一步</button></div>
      </div> : null}

      {step === 2 ? <div className="pr-step">
        <h2>我的解讀</h2>
        <p>{question.read}</p>
        <textarea value={reading} onChange={(event) => setReading(event.target.value)} maxLength={2000} rows={5} aria-label="我的解讀" />
        <div className="pr-actions">
          <button type="button" className="pr-secondary" onClick={() => setStep(1)}>上一步</button>
          <button type="button" className="pr-primary" disabled={!reading.trim()} onClick={() => setStep(3)}>{reading.trim() ? "寫好了，去對照" : "先寫下自己的解讀"}</button>
        </div>
      </div> : null}

      {step === 3 ? <div className="pr-step">
        <h2>{question.choose}</h2>
        <div className="pr-options">
          {question.options.map((option, index) => <button type="button" key={option.id} className={choice === option.id ? (judged?.correct ? "is-right" : "is-trap") : ""} disabled={busy} onClick={() => void pick(option.id)}>
            <span>{String.fromCharCode(65 + index)}</span>{option.text}
          </button>)}
        </div>
        {judged ? <div className={`pr-judged ${judged.correct ? "is-right" : "is-trap"}`} role="status"><b>{judged.correct ? "這個解讀有畫面依據" : "這是一個常見的解牌陷阱"}</b><p>{judged.note}</p>{judged.correct ? null : <small>再選一次看看。</small>}</div> : null}
        <div className="pr-actions">
          <button type="button" className="pr-secondary" onClick={() => setStep(2)}>上一步</button>
          <button type="button" className="pr-primary" disabled={!judged?.correct} onClick={() => { setRevised(reading); setStep(4); }}>下一步</button>
        </div>
      </div> : null}

      {step === 4 && judged ? <div className="pr-step">
        <h2>對照與修正</h2>
        <div className="pr-compare">
          <section><h3>有依據的解讀</h3><p>{optionText(choice)}</p><small>{judged.rightNote}</small></section>
          <section><h3>Zola 示範解讀</h3><p>{judged.sample ?? "Zola 示範解讀準備中。"}</p></section>
          {card ? <section className="pr-reference"><h3>網站牌義參考</h3><p>{card.truth}</p><p><b>容易掉進的盲點：</b>{card.blindSpot}</p></section> : null}
        </div>
        <label className="pr-field"><span>看完之後，修正妳的解讀（原本寫的也會保留）</span>
          <textarea value={revised} onChange={(event) => setRevised(event.target.value)} maxLength={2000} rows={5} />
        </label>
        {notice ? <p className={`pr-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
        <div className="pr-actions">
          {saved ? <>
            <button type="button" className="pr-secondary" onClick={onBack}>回到單元</button>
            <button type="button" className="pr-primary" onClick={onNext}>下一題</button>
          </> : <button type="button" className="pr-primary" disabled={busy} onClick={() => void save()}>{busy ? "儲存中…" : "儲存這一題"}</button>}
        </div>
      </div> : null}
      {notice && step !== 4 ? <p className={`pr-notice is-${notice.tone}`} role="alert">{notice.text}</p> : null}
    </>}
  </section>;
}

function AnswerDetail({ answer }: { answer: ShownAnswer }) {
  // choiceText is the option chosen in the version this answer was written for, never the new options.
  const verdict = answer.correct ? "（第一次就選到有依據的解讀）" : "（之後再選到有依據的解讀）";
  return <dl className="pr-answer">
    {answer.questionUpdated ? <><dt>題目已更新</dt><dd>這是題目更新前寫的作答，重新練習會用新的題目。</dd></> : null}
    {answer.questionUpdated && answer.scenarioAsked ? <><dt>當時的問題</dt><dd>{answer.scenarioAsked}</dd></> : null}
    {answer.observation ? <><dt>看見的畫面</dt><dd>{answer.observation}</dd></> : null}
    <dt>我的解讀</dt><dd>{answer.reading}</dd>
    {answer.choiceText ? <><dt>第一次選的解讀</dt><dd>{answer.choiceText}<small>{verdict}</small></dd></>
      : answer.questionUpdated ? <><dt>第一次選的解讀</dt><dd>舊版題目的選項沒有保留下來。<small>{verdict}</small></dd></> : null}
    {answer.revisedReading && answer.revisedReading !== answer.reading ? <><dt>修正後的解讀</dt><dd>{answer.revisedReading}</dd></> : null}
    {answer.feedback ? <><dt>Zola 的回覆<small>{formatDate(answer.feedbackAt)}</small></dt><dd className="pr-feedback">{answer.feedback}{answer.feedbackOutdated ? <small>這則回覆是針對妳修改前的作答。</small> : null}</dd></> : null}
  </dl>;
}

function Records({ data, onSeen }: { data: Catalog; onSeen: (answer: ShownAnswer) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const questions = useMemo(() => new Map(data.units.flatMap((unit) => unit.questions.map((question) => [question.id, { question, unit }] as const))), [data.units]);

  async function toggle(answer: ShownAnswer) {
    const next = open === answer.id ? null : answer.id;
    setOpen(next);
    if (next && answer.feedbackUnread) {
      const result = await postJson("/api/practice/seen", { answerId: answer.id }).catch(() => null);
      if (result?.ok) onSeen({ ...answer, feedbackUnread: false });
    }
  }

  return <section className="pr-records" id="practice-records" aria-labelledby="pr-records-title">
    <h2 id="pr-records-title">我的練習紀錄</h2>
    {data.answers.length === 0 ? <p className="pr-empty">還沒有紀錄。從上面選一個單元開始第一題。</p> : <ul>
      {data.answers.map((answer) => {
        const found = questions.get(answer.questionId);
        const card = found ? cardById.get(found.question.cardId) : undefined;
        return <li key={answer.id} className={open === answer.id ? "is-open" : ""}>
          <button type="button" aria-expanded={open === answer.id} onClick={() => void toggle(answer)}>
            <span><b>{card?.name ?? "練習題"}{found?.question.reversed ? "（逆位）" : ""}</b><small>{found?.unit.title ?? "已下架的題目"}・{formatDate(answer.updatedAt)}</small></span>
            {answer.feedbackUnread ? <i className="pr-badge is-new">新回覆</i> : answer.feedback ? <i className="pr-badge is-done">Zola 回覆了</i> : null}
          </button>
          {open === answer.id ? <AnswerDetail answer={answer} /> : null}
        </li>;
      })}
    </ul>}
  </section>;
}
