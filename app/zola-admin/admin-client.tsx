"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { runMemberAction, type MemberEmailOutcome } from "@/lib/member-client";
import { memberUsage } from "@/lib/member-usage";
import "../styles/pearl-page.css";
import "./zola-admin-pearl.css";
import QuizStatsCard from "./quiz-stats-card";

type Member = {
  id: string;
  email: string;
  full_name: string | null;
  line_id: string | null;
  birthday: string | null;
  role: "admin" | "member";
  effective_status: "pending" | "active" | "suspended" | "expired";
  access_expires_at: string | null;
  created_at: string;
  /** Zola's student (學員練習室), separate from VIP months. */
  is_student?: boolean;
  /** 陪跑中 (七日塔羅筆記 × 陪跑), separate from VIP months. */
  is_coaching?: boolean;
  /** 免費體驗 uses spent before activation (lib/visitor-trial.ts). */
  trial_used?: number;
  /** Zola's private note (member_admin_notes); only this admin list carries it. */
  admin_note?: string | null;
  /** The latest email to the member (member_email_log). */
  last_email_kind?: "activated" | "extended" | "expiry_reminder" | null;
  last_email_status?: "sending" | "sent" | "failed" | null;
  last_email_at?: string | null;
  /** 會員使用次數 (lib/member-usage.ts): uses in all, in the last 30 days and on how many days, the latest, by tool. */
  usage_total?: number;
  usage_30d?: number;
  usage_days_30d?: number;
  usage_last_at?: string | null;
  usage_by_feature?: Record<string, number> | null;
};

const ADMIN_NOTE_LIMIT = 500;
const emailKinds = { activated: "開通信", extended: "延長信", expiry_reminder: "到期提醒" } as const;
const emailStatuses = { sending: "寄送中", sent: "已寄出", failed: "沒有寄出" } as const;
/** A send still marked 'sending' after this long was cut off part-way: it may or may not have arrived. */
const EMAIL_UNKNOWN_AFTER_MS = 10 * 60 * 1000;

function emailStatusLabel(status: keyof typeof emailStatuses, at: string | null | undefined) {
  if (status === "sending" && at && Date.now() - new Date(at).getTime() > EMAIL_UNKNOWN_AFTER_MS) return "狀態不明，請用 LINE 確認";
  return emailStatuses[status];
}
type SortKey = "status" | "expiry" | "created" | "recent" | "usage";

/** Search over name, Email, LINE ID and Zola's note; case and spaces do not matter. */
function matches(member: Member, query: string) {
  const needle = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!needle) return true;
  return [member.full_name, member.email, member.line_id, member.admin_note].some((value) => (value ?? "").toLowerCase().replace(/\s+/g, "").includes(needle));
}

function sortMembers(list: Member[], key: SortKey) {
  if (key === "status") return list;
  const time = (value: string | null | undefined, missing: number) => (value ? new Date(value).getTime() : missing);
  // 會員使用次數: the most recent use first, or the most used in the last 30 days first (then in all)
  if (key === "recent") return [...list].sort((a, b) => time(b.usage_last_at, 0) - time(a.usage_last_at, 0));
  if (key === "usage") return [...list].sort((a, b) => (b.usage_30d ?? 0) - (a.usage_30d ?? 0) || (b.usage_total ?? 0) - (a.usage_total ?? 0));
  return [...list].sort((a, b) => key === "expiry"
    ? time(a.access_expires_at, Number.POSITIVE_INFINITY) - time(b.access_expires_at, Number.POSITIVE_INFINITY)
    : time(b.created_at, 0) - time(a.created_at, 0));
}

function emailLine(outcome: MemberEmailOutcome | undefined) {
  if (outcome === "sent") return "已寄 Email 通知對方。";
  if (outcome === "failed") return "Email 通知沒有寄出，請用 LINE 告訴對方。";
  if (outcome === "disabled") return "（Email 通知還沒設定，這次沒有寄信。）";
  return "";
}

const statusLabels = { pending: "等待開通", active: "使用中", suspended: "已暫停", expired: "已到期" };

function formatUse(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** 會員使用次數: the latest use, the last 30 days (uses and days), all uses, and the three most used tools. */
function MemberUsageBlock({ member }: { member: Member }) {
  const usage = memberUsage(member);
  return <div className="member-admin-usage">
    <small>使用紀錄</small>
    {usage.total === 0 || !usage.lastAt ? <span className="member-admin-usage-none">還沒有使用紀錄</span> : <>
      <span>最近 {formatUse(usage.lastAt)}</span>
      <span>近 30 天 <b>{usage.last30}</b> 次（{usage.days30} 天）</span>
      <span>總共 <b>{usage.total}</b> 次</span>
      <span className="member-admin-usage-tools">{usage.byFeature.slice(0, 3).map((tool) => <span key={tool.id}>{tool.label} {tool.n}</span>)}</span>
    </>}
  </div>;
}

export default function AdminClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [months, setMonths] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("正在讀取會員…");
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/membership/admin", { cache: "no-store" });
      if (!response.ok) { setNotice(response.status === 403 ? "此帳號沒有管理員權限。" : "無法讀取會員資料。"); return; }
      const data = await response.json();
      // Reloaded after an action: keep the action's message (it used to be cleared here at once).
      setMembers(data.members);
    } catch {
      setNotice("無法讀取會員資料，請稍後重新整理。");
    }
  }, []);
  useEffect(() => {
    fetch("/api/membership/admin", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? "forbidden" : "load-failed");
        return response.json();
      })
      .then((data) => { setMembers(data.members); setNotice(""); })
      .catch((error) => setNotice(error instanceof Error && error.message === "forbidden" ? "此帳號沒有管理員權限。" : "無法讀取會員資料。"));
  }, []);

  const visible = useMemo(() => sortMembers(members.filter((member) => member.role === "member" && (filter === "all" || member.effective_status === filter) && matches(member, query)), sortKey), [filter, members, query, sortKey]);
  const counts = useMemo(() => members.filter((member) => member.role === "member").reduce((result, member) => ({ ...result, [member.effective_status]: (result[member.effective_status] ?? 0) + 1 }), {} as Record<string, number>), [members]);

  async function toggleStudent(member: Member) {
    const student = !member.is_student;
    setBusy(`${member.id}-student`); setNotice("");
    const result = await runMemberAction({ memberId: member.id, action: "student", student });
    setBusy(null);
    if (!result.ok) { setNotice(result.message); return; }
    setNotice(student ? `已將 ${member.full_name ?? member.email} 設為學員，可以使用學員練習室。` : `已取消 ${member.full_name ?? member.email} 的學員身分，作答紀錄仍保留。`);
    await load();
  }

  async function toggleCoaching(member: Member) {
    const coaching = !member.is_coaching;
    setBusy(`${member.id}-coaching`); setNotice("");
    const result = await runMemberAction({ memberId: member.id, action: "coaching", coaching });
    setBusy(null);
    if (!result.ok) { setNotice(result.message); return; }
    setNotice(coaching ? `已將 ${member.full_name ?? member.email} 設為陪跑中。對方在七日筆記勾選「同步給 Zola」後，筆記才會出現在陪跑筆記。` : `已結束 ${member.full_name ?? member.email} 的陪跑，已同步的筆記與妳的回覆仍保留。`);
    await load();
  }

  async function operate(member: Member, action: "activate" | "suspend" | "restore") {
    setBusy(`${member.id}-${action}`); setNotice("");
    // runMemberAction never throws, so the busy state is always released below.
    const result = await runMemberAction({ memberId: member.id, action, months: months[member.id] ?? 1 });
    setBusy(null);
    if (!result.ok) { setNotice(result.message); return; }
    setNotice(action === "activate" ? `已為 ${member.full_name ?? member.email} 增加 ${months[member.id] ?? 1} 個月。${emailLine(result.email)}` : action === "suspend" ? "已手動停權。" : "已恢復原有期限。");
    await load();
  }

  async function saveNote(member: Member) {
    const note = noteDrafts[member.id] ?? "";
    setBusy(`${member.id}-note`); setNotice("");
    const result = await runMemberAction({ memberId: member.id, action: "note", note });
    setBusy(null);
    if (!result.ok) { setNotice(result.message); return; }
    setMembers((list) => list.map((item) => item.id === member.id ? { ...item, admin_note: result.note ?? note.trim() } : item));
    setNoteDrafts((drafts) => { const next = { ...drafts }; delete next[member.id]; return next; });
    setNotice(`已儲存 ${member.full_name ?? member.email} 的備註。`);
  }

  return <main className="zola-admin-page pearl-page">
    <header><div><p className="eyebrow">Zolacoco Private Admin</p><h1>VIP 會員權限後台</h1><p>選擇月份後開通；到期會自動停權，也可以隨時手動暫停或恢復。</p></div><nav className="zola-admin-links"><Link href="/zola-admin/quizzes">心理測驗上傳 →</Link><Link href="/zola-admin/practice">學員練習 →</Link><Link href="/zola-admin/coaching">陪跑筆記 →</Link><Link href="/account">返回會員中心</Link></nav></header>
    <section className="admin-stat-grid">
      <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><small>全部會員</small><strong>{members.filter((item) => item.role === "member").length}</strong></button>
      {(["pending", "active", "suspended", "expired"] as const).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}><small>{statusLabels[status]}</small><strong>{counts[status] ?? 0}</strong></button>)}
    </section>
    <QuizStatsCard />
    <section className="admin-tools" aria-label="搜尋與排序">
      <label>搜尋會員<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="姓名、Email、LINE ID 或備註" /></label>
      <label>排序<select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}><option value="status">依狀態（等待開通在前）</option><option value="expiry">依到期日（最近的在前）</option><option value="created">依申請時間（最新的在前）</option><option value="recent">依最近使用（最近的在前）</option><option value="usage">依使用次數（近 30 天多的在前）</option></select></label>
    </section>
    <p className="admin-usage-note">使用紀錄：同一個功能隔 10 分鐘以上才算下一次，是大約的使用頻率；從這次更新上線後開始記，妳自己用的不算。</p>
    <p className="admin-notice" aria-live="polite">{notice}</p>
    <section className="member-admin-list">
      {visible.map((member) => <article key={member.id}>
        <div className="member-admin-identity"><span className={`member-status status-${member.effective_status}`}>{statusLabels[member.effective_status]}</span>{member.is_student ? <span className="member-status member-student">學員</span> : null}{member.is_coaching ? <span className="member-status member-coaching">陪跑中</span> : null}<h2>{member.full_name || "尚未填寫姓名"}</h2><p>{member.email}</p><small>LINE：{member.line_id || "尚未填寫"}　生日：{member.birthday?.slice(0, 10) || "尚未填寫"}</small>
          {member.effective_status === "pending" ? <small className="member-admin-trial">免費體驗：已用 {Math.min(3, member.trial_used ?? 0)}／3 次</small> : null}
          {noteDrafts[member.id] !== undefined
            ? <div className="member-admin-note is-editing">
                <label>備註（只有妳看得到）<textarea value={noteDrafts[member.id]} maxLength={ADMIN_NOTE_LIMIT} rows={3} onChange={(event) => setNoteDrafts((drafts) => ({ ...drafts, [member.id]: event.target.value }))} /></label>
                <small>{noteDrafts[member.id].length}／{ADMIN_NOTE_LIMIT}</small>
                <div><button type="button" disabled={Boolean(busy)} onClick={() => void saveNote(member)}>{busy === `${member.id}-note` ? "儲存中…" : "儲存備註"}</button><button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => setNoteDrafts((drafts) => { const next = { ...drafts }; delete next[member.id]; return next; })}>取消</button></div>
              </div>
            : <div className="member-admin-note"><p>{member.admin_note ? member.admin_note : <span>尚未加備註</span>}</p><button type="button" className="secondary" onClick={() => setNoteDrafts((drafts) => ({ ...drafts, [member.id]: member.admin_note ?? "" }))}>{member.admin_note ? "編輯備註" : "加備註"}</button></div>}
        </div>
        <div className="member-admin-expiry"><small>目前期限</small><strong>{member.access_expires_at ? new Date(member.access_expires_at).toLocaleDateString("zh-TW") : "尚未開通"}</strong><span>{new Date(member.created_at).toLocaleDateString("zh-TW")} 申請</span>{member.last_email_kind && member.last_email_status ? <span className="member-admin-email">{emailKinds[member.last_email_kind]}{emailStatusLabel(member.last_email_status, member.last_email_at)}{member.last_email_at ? `（${new Date(member.last_email_at).toLocaleDateString("zh-TW")}）` : ""}</span> : null}<MemberUsageBlock member={member} /></div>
        <div className="member-admin-actions">
          <label>增加月份<select value={months[member.id] ?? 1} onChange={(event) => setMonths((value) => ({ ...value, [member.id]: Number(event.target.value) }))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value} 個月</option>)}</select></label>
          <button disabled={Boolean(busy)} onClick={() => operate(member, "activate")}>{member.effective_status === "active" ? "增加月份" : "立即開通"}</button>
          <button className="secondary member-student-toggle" disabled={Boolean(busy)} aria-pressed={Boolean(member.is_student)} onClick={() => toggleStudent(member)}>{member.is_student ? "取消學員" : "設為學員"}</button>
          <button className="secondary member-coaching-toggle" disabled={Boolean(busy)} aria-pressed={Boolean(member.is_coaching)} onClick={() => toggleCoaching(member)}>{member.is_coaching ? "結束陪跑" : "設為陪跑中"}</button>
          {member.effective_status === "suspended" ? <button className="secondary" disabled={Boolean(busy)} onClick={() => operate(member, "restore")}>恢復原期限</button> : <button className="danger" disabled={Boolean(busy)} onClick={() => operate(member, "suspend")}>手動停權</button>}
        </div>
      </article>)}
      {!notice && visible.length === 0 ? <div className="admin-list-empty">目前沒有符合條件的會員。</div> : null}
    </section>
  </main>;
}
