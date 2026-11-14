"use client";

// 陪跑筆記 (Zola only): 陪跑 members, the seven-day rounds they chose to share, day by day, and Zola's
// reply to each day. Data from /api/coaching/admin (requireAdmin). Rounds a member did not share never
// reach this page.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { AdminEntry, PublicCycle } from "@/lib/coaching-input";
import { COACHING_FEEDBACK_LIMIT } from "@/lib/coaching-input";
import { JOURNAL_DAYS, journalPromptFor } from "@/lib/journal-prompts";
import { latestRequest } from "@/lib/latest-request";
import "../../styles/pearl-page.css";
import "../../practice/practice.css";
import "./coaching-admin.css";

type CoachingMember = {
  id: string; email: string; full_name: string | null; status: string; is_coaching: boolean;
  cycle_number: number | null; days: number | null; completed_at: string | null;
  entries: number; waiting: number; changed: number; unseen: number; last_entry_at: string | null;
};
type Filter = "all" | "waiting" | "changed" | "unseen";

const FILTERS: readonly (readonly [Filter, string])[] = [["all", "全部"], ["waiting", "尚未回覆"], ["changed", "回覆後已修改"], ["unseen", "對方未讀"]];

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function memberMatches(member: CoachingMember, filter: Filter) {
  if (filter === "waiting") return member.waiting > 0;
  if (filter === "changed") return member.changed > 0;
  if (filter === "unseen") return member.unseen > 0;
  return true;
}

function entryMatches(entry: AdminEntry, filter: Filter) {
  if (filter === "waiting") return entry.waiting;
  if (filter === "changed") return entry.changedAfterFeedback;
  if (filter === "unseen") return Boolean(entry.feedback) && entry.feedbackUnread;
  return true;
}

function progress(member: CoachingMember) {
  if (member.cycle_number === null) return "還沒有同步的筆記";
  return `第 ${member.cycle_number} 輪・${member.completed_at ? "已完成七天" : `已寫 ${member.days ?? 0}／${JOURNAL_DAYS} 天`}`;
}

export default function CoachingAdminPage() {
  const [members, setMembers] = useState<CoachingMember[] | null>(null);
  const [notice, setNotice] = useState("正在讀取陪跑筆記…");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<CoachingMember | null>(null);
  const [cycles, setCycles] = useState<PublicCycle[] | null>(null);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  // One member's notes at a time: switching members, going back or leaving the page makes any earlier
  // request harmless, so a slow reply for A never shows under B's name (review #33 B1).
  const memberRequest = useRef(latestRequest());
  useEffect(() => {
    const requests = memberRequest.current;
    return () => requests.cancel();
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/coaching/admin", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 403) { setNotice("此帳號沒有管理員權限。"); return; }
        if (!response.ok) { setNotice("暫時無法讀取陪跑筆記，請稍後重新整理。"); return; }
        const data = await response.json();
        if (!active) return;
        setMembers(data.members);
        setNotice("");
      })
      .catch(() => { if (active) setNotice("暫時無法讀取陪跑筆記，請稍後重新整理。"); });
    return () => { active = false; };
  }, []);

  async function open(member: CoachingMember) {
    const request = memberRequest.current.start();
    setSelected(member);
    setCycles(null);
    setEntries([]);
    setNotice("");
    try {
      const response = await fetch(`/api/coaching/admin?memberId=${encodeURIComponent(member.id)}`, { cache: "no-store", signal: request.signal });
      if (!response.ok) throw new Error("load");
      const data = await response.json();
      if (!request.isCurrent()) return;
      setCycles(data.cycles);
      setEntries(data.entries);
    } catch {
      if (!request.isCurrent()) return;
      setNotice("暫時無法讀取這位會員的筆記，請再試一次。");
      setCycles([]);
    }
  }

  function closeMember() {
    memberRequest.current.cancel();
    setSelected(null);
    setCycles(null);
    setEntries([]);
  }

  function replaceEntry(entry: AdminEntry) {
    setEntries((current) => current.map((item) => item.id === entry.id ? entry : item));
  }

  const visibleMembers = (members ?? []).filter((member) => memberMatches(member, filter));

  return <main className="practice-page pearl-page practice-admin coaching-admin">
    <header className="pr-hero">
      <p className="pr-kicker">Zolacoco Private Admin</p>
      <h1>陪跑筆記</h1>
      <p className="pr-lead">在 <Link href="/zola-admin">會員後台</Link> 按「設為陪跑中」開通。對方在七日筆記勾選「同步給 Zola」之後，那一輪的筆記才會出現在這裡；對方停止同步的那一輪也不會再顯示。</p>
    </header>
    <div className="pa-filters" role="group" aria-label="篩選">
      {FILTERS.map(([value, label]) => <button type="button" key={value} className={filter === value ? "is-active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    {notice ? <p className="pr-notice" aria-live="polite">{notice}</p> : null}

    {selected ? <section className="pa-student">
      <button type="button" className="pr-back" onClick={closeMember}>← 全部陪跑會員</button>
      <h2>{selected.full_name || selected.email}</h2>
      <p>{selected.email}{selected.is_coaching ? "" : "・已結束陪跑（筆記與回覆仍保留）"}</p>
      {cycles === null ? <p className="pr-notice">正在讀取筆記…</p> : cycles.length === 0 ? <p className="pr-empty">還沒有同步給妳的筆記。</p> : cycles.map((cycle) => {
        const days = entries.filter((entry) => entry.cycleId === cycle.id);
        const shown = days.filter((entry) => entryMatches(entry, filter));
        return <section className="ca-round" key={cycle.id} aria-label={`第 ${cycle.number} 輪`}>
          <h3>第 {cycle.number} 輪<small>{formatDate(cycle.startedAt)} 開始・{cycle.completedAt ? `${formatDate(cycle.completedAt)} 完成七天` : `已寫 ${days.length}／${JOURNAL_DAYS} 天`}</small></h3>
          {shown.length === 0 ? <p className="pr-empty">{days.length === 0 ? "這一輪還沒有寫下筆記。" : "這一輪沒有符合篩選的筆記。"}</p> : <ul className="pa-answers">
            {shown.map((entry) => <EntryReview key={entry.id} entry={entry} onSaved={replaceEntry} />)}
          </ul>}
        </section>;
      })}
    </section> : members && visibleMembers.length === 0 ? <p className="pr-empty">{members.length === 0 ? "還沒有陪跑中的會員。到會員後台按「設為陪跑中」就會出現在這裡。" : "沒有符合篩選的會員。"}</p> : <ul className="pa-students">
      {visibleMembers.map((member) => <li key={member.id}><button type="button" onClick={() => void open(member)}>
        <span><b>{member.full_name || "尚未填寫姓名"}</b><small>{member.email}</small><small>{progress(member)}</small></span>
        <span className="pa-counts">
          {member.is_coaching ? <i className="pr-badge is-done">陪跑中</i> : <i className="pr-badge is-draft">已結束陪跑</i>}
          <small>尚未回覆 {member.waiting}{member.changed ? `・回覆後已修改 ${member.changed}` : ""}{member.unseen ? `・對方未讀 ${member.unseen}` : ""}</small>
          <small>最近：{formatDate(member.last_entry_at)}</small>
        </span>
      </button></li>)}
    </ul>}
  </main>;
}

function EntryReview({ entry, onSaved }: { entry: AdminEntry; onSaved: (entry: AdminEntry) => void }) {
  const [text, setText] = useState(entry.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function save() {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/coaching/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entryId: entry.id, feedback: text, expectedRevision: entry.revision }) });
      const data = await response.json().catch(() => null);
      if (response.status === 409 && data?.entry) { onSaved(data.entry); setNotice({ tone: "error", text: data.error }); return; }
      if (!response.ok || !data?.entry) { setNotice({ tone: "error", text: typeof data?.error === "string" && /[^\x00-\x7f]/.test(data.error) ? data.error : "回覆還沒有存好，請再試一次。" }); return; }
      onSaved(data.entry);
      setNotice({ tone: "ok", text: text.trim() ? "已回覆，對方回到七日筆記會看到「新回覆」。" : "已移除這則回覆。" });
    } catch {
      setNotice({ tone: "error", text: "網路不穩，回覆還沒有確認存好，請重新整理後確認。" });
    } finally {
      setBusy(false);
    }
  }

  return <li className="pa-answer">
    <header>
      <span><b>第 {entry.day} 天</b><small>{journalPromptFor(entry.promptVersion, entry.day)}</small><small>最後修改 {formatDate(entry.updatedAt)}</small></span>
      <span className="pa-badges">
        {entry.waiting ? <i className="pr-badge is-new">尚未回覆</i> : null}
        {entry.changedAfterFeedback ? <i className="pr-badge is-new">回覆後已修改</i> : null}
        {entry.feedback && entry.feedbackUnread ? <i className="pr-badge is-done">對方未讀</i> : null}
      </span>
    </header>
    <dl className="pr-answer"><dt>對方的筆記</dt><dd>{entry.content}</dd></dl>
    <label className="pr-field"><span>給對方的回覆</span>
      <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={COACHING_FEEDBACK_LIMIT} rows={4} />
    </label>
    {notice ? <p className={`pr-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
    <div className="pr-actions"><button type="button" className="pr-primary" disabled={busy || (text.trim() === (entry.feedback ?? "") && !entry.changedAfterFeedback)} onClick={() => void save()}>{busy ? "儲存中…" : entry.feedback ? "更新回覆" : "送出回覆"}</button></div>
  </li>;
}
