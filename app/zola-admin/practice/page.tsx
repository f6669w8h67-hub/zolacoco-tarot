"use client";

// 學員練習 (Zola only): every student's progress, their answers question by question, and Zola's reply.
// Data from /api/practice/admin (requireAdmin) and the question texts from /api/practice (admin sees drafts).
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { tarotCards } from "@/app/tarot-data";
import type { PublicAnswer } from "@/lib/practice-input";
import "../../styles/pearl-page.css";
import "../../practice/practice.css";

type Student = { id: string; email: string; full_name: string | null; status: string; is_student: boolean; answers: number; waiting: number; changed: number; last_answer_at: string | null };
type AdminAnswer = PublicAnswer & { waiting: boolean; changedAfterFeedback: boolean; questionUpdated: boolean };
type Question = { id: string; version: number; unit: string; cardId: string; reversed: boolean; scenario: string | null; choose: string; options: { id: string; text: string }[]; draft: boolean };
type Unit = { id: string; title: string; questions: Question[] };
type Filter = "all" | "waiting" | "changed";

const cardById = new Map(tarotCards.map((card) => [card.id, card]));

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

export default function PracticeAdminPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [notice, setNotice] = useState("正在讀取學員練習…");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Student | null>(null);
  const [answers, setAnswers] = useState<AdminAnswer[] | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/practice/admin", { cache: "no-store" }), fetch("/api/practice", { cache: "no-store" })])
      .then(async ([studentResponse, catalogResponse]) => {
        if (!active) return;
        if (studentResponse.status === 403) { setNotice("此帳號沒有管理員權限。"); return; }
        if (!studentResponse.ok || !catalogResponse.ok) { setNotice("暫時無法讀取學員練習，請稍後重新整理。"); return; }
        const studentData = await studentResponse.json();
        const catalog = await catalogResponse.json();
        if (!active) return;
        setStudents(studentData.students);
        setUnits(catalog.units);
        setNotice("");
      })
      .catch(() => { if (active) setNotice("暫時無法讀取學員練習，請稍後重新整理。"); });
    return () => { active = false; };
  }, []);

  const questions = useMemo(() => new Map(units.flatMap((unit) => unit.questions.map((question) => [question.id, { question, unit }] as const))), [units]);

  async function open(student: Student) {
    setSelected(student);
    setAnswers(null);
    try {
      const response = await fetch(`/api/practice/admin?memberId=${encodeURIComponent(student.id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("load");
      setAnswers((await response.json()).answers);
    } catch {
      setNotice("暫時無法讀取這位學員的作答，請再試一次。");
      setAnswers([]);
    }
  }

  function replaceAnswer(answer: AdminAnswer) {
    setAnswers((current) => current?.map((item) => item.id === answer.id ? answer : item) ?? current);
  }

  const visibleStudents = (students ?? []).filter((student) => filter === "all" || (filter === "waiting" ? student.waiting > 0 : student.changed > 0));
  const visibleAnswers = (answers ?? []).filter((answer) => filter === "all" || (filter === "waiting" ? answer.waiting : answer.changedAfterFeedback));

  return <main className="practice-page pearl-page practice-admin">
    <header className="pr-hero">
      <p className="pr-kicker">Zolacoco Private Admin</p>
      <h1>學員練習</h1>
      <p className="pr-lead">學員的身分在 <Link href="/zola-admin">會員後台</Link> 開關。題庫在妳確認前都是草稿，學員看不到；可以到 <Link href="/practice">學員練習室</Link> 預覽。</p>
    </header>
    <div className="pa-filters" role="group" aria-label="篩選">
      {([["all", "全部"], ["waiting", "還沒回覆"], ["changed", "回饋後已修改"]] as const).map(([value, label]) => <button type="button" key={value} className={filter === value ? "is-active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    {notice ? <p className="pr-notice" aria-live="polite">{notice}</p> : null}

    {selected ? <section className="pa-student">
      <button type="button" className="pr-back" onClick={() => { setSelected(null); setAnswers(null); }}>← 全部學員</button>
      <h2>{selected.full_name || selected.email}</h2>
      <p>{selected.email}{selected.is_student ? "" : "・已取消學員身分（作答仍保留）"}</p>
      {answers === null ? <p className="pr-notice">正在讀取作答…</p> : visibleAnswers.length === 0 ? <p className="pr-empty">{answers.length === 0 ? "還沒有作答。" : "沒有符合篩選的作答。"}</p> : <ul className="pa-answers">
        {visibleAnswers.map((answer) => <AnswerReview key={answer.id} answer={answer} found={questions.get(answer.questionId)} onSaved={replaceAnswer} />)}
      </ul>}
    </section> : students && visibleStudents.length === 0 ? <p className="pr-empty">{students.length === 0 ? "還沒有學員。到會員後台按「設為學員」就會出現在這裡。" : "沒有符合篩選的學員。"}</p> : <ul className="pa-students">
      {visibleStudents.map((student) => <li key={student.id}><button type="button" onClick={() => void open(student)}>
        <span><b>{student.full_name || "尚未填寫姓名"}</b><small>{student.email}</small></span>
        <span className="pa-counts">
          {student.is_student ? <i className="pr-badge is-done">學員</i> : <i className="pr-badge is-draft">已取消</i>}
          <small>作答 {student.answers}・還沒回覆 {student.waiting}{student.changed ? `・回饋後已修改 ${student.changed}` : ""}</small>
          <small>最近：{formatDate(student.last_answer_at)}</small>
        </span>
      </button></li>)}
    </ul>}
  </main>;
}

function AnswerReview({ answer, found, onSaved }: { answer: AdminAnswer; found: { question: Question; unit: Unit } | undefined; onSaved: (answer: AdminAnswer) => void }) {
  const [text, setText] = useState(answer.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const card = found ? cardById.get(found.question.cardId) : undefined;
  const chosen = found?.question.options.find((option) => option.id === answer.choice)?.text;

  async function save() {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/practice/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answerId: answer.id, feedback: text, expectedRevision: answer.revision }) });
      const data = await response.json().catch(() => null);
      if (response.status === 409 && data?.answer) { onSaved(data.answer); setNotice({ tone: "error", text: data.error }); return; }
      if (!response.ok || !data?.answer) { setNotice({ tone: "error", text: typeof data?.error === "string" && /[^\x00-\x7f]/.test(data.error) ? data.error : "回覆還沒有存好，請再試一次。" }); return; }
      onSaved(data.answer);
      setNotice({ tone: "ok", text: text.trim() ? "已回覆，學員會在練習紀錄看到「新回覆」。" : "已移除這則回覆。" });
    } catch {
      setNotice({ tone: "error", text: "網路不穩，回覆還沒有確認存好，請重新整理後確認。" });
    } finally {
      setBusy(false);
    }
  }

  return <li className="pa-answer">
    <header>
      <span><b>{card?.name ?? answer.questionId}{found?.question.reversed ? "（逆位）" : ""}</b><small>{found?.unit.title ?? "已下架的題目"}・{formatDate(answer.updatedAt)}</small></span>
      <span className="pa-badges">
        {answer.waiting ? <i className="pr-badge is-new">還沒回覆</i> : null}
        {answer.changedAfterFeedback ? <i className="pr-badge is-new">回饋後已修改</i> : null}
        {answer.questionUpdated ? <i className="pr-badge is-draft">題目已更新</i> : null}
        {answer.feedback && answer.feedbackUnread ? <i className="pr-badge is-done">學員未讀</i> : null}
      </span>
    </header>
    {found?.question.scenario ? <p className="pa-scenario">問題：{found.question.scenario}</p> : null}
    <dl className="pr-answer">
      {answer.observation ? <><dt>看見的畫面</dt><dd>{answer.observation}</dd></> : null}
      <dt>學員的解讀</dt><dd>{answer.reading}</dd>
      {chosen ? <><dt>第一次選的解讀{answer.correct ? "（有依據）" : "（陷阱選項）"}</dt><dd>{chosen}</dd></> : null}
      {answer.revisedReading && answer.revisedReading !== answer.reading ? <><dt>修正後的解讀</dt><dd>{answer.revisedReading}</dd></> : null}
    </dl>
    <label className="pr-field"><span>給學員的回覆</span>
      <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={4} />
    </label>
    {notice ? <p className={`pr-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
    <div className="pr-actions"><button type="button" className="pr-primary" disabled={busy || (text.trim() === (answer.feedback ?? "") && !answer.changedAfterFeedback)} onClick={() => void save()}>{busy ? "儲存中…" : answer.feedback ? "更新回覆" : "送出回覆"}</button></div>
  </li>;
}
