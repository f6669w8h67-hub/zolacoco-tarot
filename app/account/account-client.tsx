"use client";

import { SignInButton, SignOutButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadMemberProfile, saveMemberProfile } from "@/lib/member-client";

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

  const [loadFailed, setLoadFailed] = useState(false);

  const applyLoad = useCallback((result: Awaited<ReturnType<typeof loadMemberProfile>>) => {
    if (result.ok) { setMember(result.member); setLoadFailed(false); }
    else setLoadFailed(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    void loadMemberProfile().then((result) => { if (active) applyLoad(result); });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, applyLoad]);

  async function saveProfile(formData: FormData) {
    setMessage("儲存中…");
    const result = await saveMemberProfile({
      fullName: String(formData.get("fullName") ?? ""),
      lineId: String(formData.get("lineId") ?? ""),
      birthday: String(formData.get("birthday") ?? ""),
    });
    if (!result.ok) { setMessage(result.message); return; }
    setMember(result.member);
    setMessage("會員資料已儲存。");
  }

  if (!isLoaded) return <main className="account-page"><section className="account-hero"><h1>正在讀取會員資料…</h1></section></main>;
  // A failed request is shown as a retryable error, never as "not yet activated".
  if (isSignedIn && !member && loadFailed) return <main className="account-page"><section className="account-hero">
    <p className="eyebrow">ZOLACOCO MEMBER</p><span className="account-status"><i aria-hidden="true" />暫時無法讀取</span>
    <h1>會員資料暫時讀不到</h1>
    <p role="alert">這不代表尚未開通。請稍後再試；若持續出現，請聯絡 Zola 協助確認。</p>
    <div className="account-actions"><button className="account-primary" type="button" onClick={() => void loadMemberProfile().then(applyLoad)}>重新讀取</button></div>
  </section></main>;
  if (isSignedIn && !member) return <main className="account-page"><section className="account-hero"><h1>正在讀取會員資料…</h1></section></main>;
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
