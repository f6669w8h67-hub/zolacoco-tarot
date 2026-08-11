"use client";

import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

type Member = {
  email: string;
  full_name: string | null;
  line_id: string | null;
  birthday: string | null;
  role: "admin" | "member";
  effective_status: "pending" | "active" | "suspended" | "expired";
  access_expires_at: string | null;
};

export default function AccountClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/membership/me", { cache: "no-store" })
      .then((response) => response.json())
      .then(({ member: value }) => setMember(value));
  }, [isLoaded, isSignedIn]);

  async function saveProfile(formData: FormData) {
    setMessage("儲存中…");
    const response = await fetch("/api/membership/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        lineId: formData.get("lineId"),
        birthday: formData.get("birthday"),
      }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "儲存失敗，請稍後再試。"); return; }
    setMember(result.member);
    setMessage("會員資料已儲存。");
  }

  if (!isLoaded || (isSignedIn && !member)) return <main className="account-page"><section className="account-hero"><h1>正在讀取會員資料…</h1></section></main>;
  if (!isSignedIn) return <main className="account-page"><section className="account-hero">
    <p className="eyebrow">ZOLACOCO MEMBER</p><span className="account-status"><i aria-hidden="true" />尚未登入</span>
    <h1>一個帳號，<br />開啟完整探索空間</h1>
    <p>第一次註冊後會先等待 Zola 開通；開通期間內，塔羅、靈擺、星骰、療癒小房間與星盤探索會全部開放。</p>
    <div className="account-actions"><SignInButton mode="modal"><button className="account-primary" type="button">Email 登入</button></SignInButton><Link className="account-secondary" href="/sign-up">建立新帳號</Link></div>
  </section></main>;

  const status = member?.role === "admin" ? "管理員" : ({ pending: "等待 Zola 開通", active: "使用中", suspended: "已暫停", expired: "已到期" }[member?.effective_status ?? "pending"]);
  return <main className="account-page">
    <section className="account-hero">
      <p className="eyebrow">ZOLACOCO MEMBER</p><span className={`account-status status-${member?.effective_status ?? "pending"}`}><i aria-hidden="true" />{status}</span>
      <h1>你的會員中心</h1>
      <p>{member?.effective_status === "active" || member?.role === "admin" ? "權限已開通，網站完整功能都可以使用。" : "請完成下方資料，並通知 Zola 為你開通使用月份。"}</p>
      <div className="account-actions">{member?.role === "admin" ? <Link className="account-primary" href="/zola-admin">進入 Zola 會員後台</Link> : <a className="account-primary" href="https://lin.ee/XIi2Nam" target="_blank" rel="noreferrer">通知 Zola 開通</a>}<SignOutButton><button className="account-secondary" type="button">登出帳號</button></SignOutButton></div>
    </section>
    <section className="member-profile-card">
      <div><small>登入 Email</small><strong>{member?.email}</strong></div>
      <div><small>使用期限</small><strong>{member?.role === "admin" ? "管理員不受期限限制" : member?.access_expires_at ? `${new Date(member.access_expires_at).toLocaleDateString("zh-TW")} 到期` : "尚未開通"}</strong></div>
      <form action={saveProfile}>
        <label>真實姓名<input name="fullName" defaultValue={member?.full_name ?? ""} required /></label>
        <label>LINE 名稱／ID<input name="lineId" defaultValue={member?.line_id ?? ""} required /></label>
        <label>生日<input name="birthday" type="date" defaultValue={member?.birthday?.slice(0, 10) ?? ""} required /></label>
        <button type="submit">儲存會員資料</button><p aria-live="polite">{message}</p>
      </form>
    </section>
  </main>;
}
