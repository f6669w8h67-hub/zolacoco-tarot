"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { runMemberAction } from "@/lib/member-client";
import "../styles/pearl-page.css";
import "./zola-admin-pearl.css";

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
};

const statusLabels = { pending: "等待開通", active: "使用中", suspended: "已暫停", expired: "已到期" };

export default function AdminClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [months, setMonths] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("正在讀取會員…");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/membership/admin", { cache: "no-store" });
      if (!response.ok) { setNotice(response.status === 403 ? "此帳號沒有管理員權限。" : "無法讀取會員資料。"); return; }
      const data = await response.json();
      setMembers(data.members);
      setNotice("");
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

  const visible = useMemo(() => members.filter((member) => member.role === "member" && (filter === "all" || member.effective_status === filter)), [filter, members]);
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

  async function operate(member: Member, action: "activate" | "suspend" | "restore") {
    setBusy(`${member.id}-${action}`); setNotice("");
    // runMemberAction never throws, so the busy state is always released below.
    const result = await runMemberAction({ memberId: member.id, action, months: months[member.id] ?? 1 });
    setBusy(null);
    if (!result.ok) { setNotice(result.message); return; }
    setNotice(action === "activate" ? `已為 ${member.full_name ?? member.email} 增加 ${months[member.id] ?? 1} 個月。` : action === "suspend" ? "已手動停權。" : "已恢復原有期限。");
    await load();
  }

  return <main className="zola-admin-page pearl-page">
    <header><div><p className="eyebrow">Zolacoco Private Admin</p><h1>VIP 會員權限後台</h1><p>選擇月份後開通；到期會自動停權，也可以隨時手動暫停或恢復。</p></div><nav className="zola-admin-links"><Link href="/zola-admin/practice">學員練習 →</Link><Link href="/account">返回會員中心</Link></nav></header>
    <section className="admin-stat-grid">
      <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}><small>全部會員</small><strong>{members.filter((item) => item.role === "member").length}</strong></button>
      {(["pending", "active", "suspended", "expired"] as const).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}><small>{statusLabels[status]}</small><strong>{counts[status] ?? 0}</strong></button>)}
    </section>
    <p className="admin-notice" aria-live="polite">{notice}</p>
    <section className="member-admin-list">
      {visible.map((member) => <article key={member.id}>
        <div className="member-admin-identity"><span className={`member-status status-${member.effective_status}`}>{statusLabels[member.effective_status]}</span>{member.is_student ? <span className="member-status member-student">學員</span> : null}<h2>{member.full_name || "尚未填寫姓名"}</h2><p>{member.email}</p><small>LINE：{member.line_id || "尚未填寫"}　生日：{member.birthday?.slice(0, 10) || "尚未填寫"}</small></div>
        <div className="member-admin-expiry"><small>目前期限</small><strong>{member.access_expires_at ? new Date(member.access_expires_at).toLocaleDateString("zh-TW") : "尚未開通"}</strong><span>{new Date(member.created_at).toLocaleDateString("zh-TW")} 申請</span></div>
        <div className="member-admin-actions">
          <label>增加月份<select value={months[member.id] ?? 1} onChange={(event) => setMonths((value) => ({ ...value, [member.id]: Number(event.target.value) }))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value} 個月</option>)}</select></label>
          <button disabled={Boolean(busy)} onClick={() => operate(member, "activate")}>{member.effective_status === "active" ? "增加月份" : "立即開通"}</button>
          <button className="secondary member-student-toggle" disabled={Boolean(busy)} aria-pressed={Boolean(member.is_student)} onClick={() => toggleStudent(member)}>{member.is_student ? "取消學員" : "設為學員"}</button>
          {member.effective_status === "suspended" ? <button className="secondary" disabled={Boolean(busy)} onClick={() => operate(member, "restore")}>恢復原期限</button> : <button className="danger" disabled={Boolean(busy)} onClick={() => operate(member, "suspend")}>手動停權</button>}
        </div>
      </article>)}
      {!notice && visible.length === 0 ? <div className="admin-list-empty">目前沒有符合條件的會員。</div> : null}
    </section>
  </main>;
}
