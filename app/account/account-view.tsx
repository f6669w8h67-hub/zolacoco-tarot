"use client";

// Presentational screens for /account. They take data and callbacks as props and
// never import Clerk or fetch, so every member state can be reviewed and tested
// without signing in. Data loading and Clerk wiring live in account-client.tsx.

import Link from "next/link";
import { type FormEvent, Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import {
  type AccountStage,
  type ProfileInput,
  LINKED_EMAIL_HELP_MESSAGE,
  PROFILE_LIMITS,
  accountStage,
  activationRequestMessage,
  formatTaipeiDate,
  isProfileComplete,
  remainingLabel,
  renewalRequestMessage,
  supportRequestMessage,
  taipeiDate,
  validateProfileInput,
} from "@/lib/account-state";
import { ZOLA_LINE_URL, lineMessageUrl } from "@/lib/contact";
import type { ClientMember, MemberLoadFailure } from "@/lib/member-client";

export type SaveProfile = (input: ProfileInput) => Promise<{ ok: true } | { ok: false; message: string }>;

const memberSpaces = [
  { href: "/#draw", title: "塔羅抽牌", note: "單張與三張牌陣" },
  { href: "/pendulum", title: "靈擺占卜", note: "直覺問答與生活指引" },
  { href: "/astro-dice", title: "星骰指引", note: "行星 × 星座 × 宮位" },
  { href: "/?tool=archetype#explore", title: "內在探索", note: "內在原型、直覺練習與七日筆記" },
  { href: "/healing-room", title: "療癒小房間", note: "情緒、關係與睡前練習" },
  { href: "/astrology-exploration", title: "探索你的星盤", note: "理解內在需求與人生課題" },
];

const statusLabels: Record<AccountStage, string> = {
  admin: "管理員",
  "pending-incomplete": "等待 Zola 開通",
  "pending-ready": "等待 Zola 開通",
  active: "使用中",
  expiring: "即將到期",
  expired: "已到期",
  suspended: "已暫停",
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function Title({ text }: { text: string }) {
  const parts = text.split("\n");
  return <h1>{parts.map((part, index) => <Fragment key={index}>{index > 0 ? <br /> : null}{part}</Fragment>)}</h1>;
}

function Hero({ status, statusClass, title, children }: { status: string; statusClass: string; title: string; children: ReactNode }) {
  return <section className="account-hero">
    <p className="eyebrow">ZOLACOCO MEMBER</p>
    <span className={`account-status ${statusClass}`}><i aria-hidden="true" />{status}</span>
    <Title text={title} />
    {children}
  </section>;
}

/** Opens LINE with the message typed in; the member still presses send. Copy is the fallback. */
function LineRequest({ label, message, primaryRef }: { label: string; message: string; primaryRef?: React.Ref<HTMLAnchorElement> }) {
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  }
  return <>
    <div className="account-actions">
      <a ref={primaryRef} className="account-primary" href={lineMessageUrl(message)} target="_blank" rel="noreferrer">{label}</a>
      <button className="account-secondary" type="button" onClick={() => void copyMessage()}>{copy === "done" ? "已複製訊息" : "複製訊息"}</button>
    </div>
    <p className="account-line-hint" aria-live="polite">
      {copy === "failed"
        ? "這個瀏覽器無法自動複製，請展開下方訊息後手動選取。"
        : <>會開啟 LINE 並帶入訊息，確認內容後再按送出。電腦沒有 LINE 時，可先複製訊息，再到 <a href={ZOLA_LINE_URL} target="_blank" rel="noreferrer">Zola 的官方 LINE</a> 貼上。</>}
    </p>
    <details className="account-message-preview" open={copy === "failed" || undefined}>
      <summary>查看要傳給 Zola 的訊息</summary>
      <pre>{message}</pre>
    </details>
  </>;
}

function JourneySteps({ profileDone, signedIn }: { profileDone: boolean; signedIn: boolean }) {
  const steps = [
    { title: "建立帳號", note: "用 Email 註冊並完成驗證", done: signedIn },
    { title: "補齊會員資料", note: "姓名、LINE 名稱與生日", done: signedIn && profileDone },
    { title: "傳 LINE 通知 Zola", note: "訊息會自動帶入", done: false },
    { title: "Zola 開通期限", note: "開通期間全站開放", done: false },
  ];
  const current = signedIn ? steps.findIndex((step) => !step.done) : -1;
  return <ol className="account-steps" aria-label="開通流程">
    {steps.map((step, index) => <li key={step.title} className={step.done ? "done" : index === current ? "current" : undefined} aria-current={index === current ? "step" : undefined}>
      <span className="account-step-mark" aria-hidden="true">{step.done ? "✓" : index + 1}</span>
      <b>{step.title}</b>
      <small>{step.done ? "已完成" : step.note}</small>
    </li>)}
  </ol>;
}

function MemberSpaces({ locked }: { locked: boolean }) {
  return <section className="account-spaces" aria-labelledby="account-spaces-title">
    <header>
      <p className="eyebrow">MEMBER SPACES</p>
      <h2 id="account-spaces-title">{locked ? "開通後，這些空間會全部開放" : "今天，想從哪裡開始？"}</h2>
    </header>
    <div className="account-space-grid">
      {memberSpaces.map((space) => locked
        ? <div className="account-space is-locked" key={space.title}><b>{space.title}</b><small>{space.note}</small><span>開通後開放</span></div>
        : <Link className="account-space" href={space.href} key={space.title}><b>{space.title}</b><small>{space.note}</small><span aria-hidden="true">→</span></Link>)}
    </div>
    {locked ? null : <p className="account-archive-link"><Link href="/admin">查看這台裝置上的占卜存檔 →</Link></p>}
  </section>;
}

export function AccountLoadingView() {
  return <main className="account-page" aria-busy="true"><section className="account-hero">
    <p className="eyebrow">ZOLACOCO MEMBER</p>
    <h1>正在讀取會員資料…</h1>
  </section></main>;
}

export function SignedOutView({ signIn }: { signIn: ReactNode }) {
  return <main className="account-page">
    <Hero status="尚未登入" statusClass="" title={"一個帳號，\n開啟完整探索空間"}>
      <p className="account-lead">第一次註冊後會先等待 Zola 開通；開通期間內，塔羅、靈擺、星骰、療癒小房間與星盤探索會全部開放。</p>
      <div className="account-actions">{signIn}<Link className="account-secondary" href="/sign-up">建立新帳號</Link></div>
    </Hero>
    <section className="account-journey" aria-labelledby="account-journey-title">
      <h2 id="account-journey-title">開通只要四步</h2>
      <JourneySteps profileDone={false} signedIn={false} />
    </section>
    <MemberSpaces locked />
  </main>;
}

const failureCopy: Record<MemberLoadFailure, { status: string; title: string; body: string }> = {
  EMAIL_NOT_VERIFIED: {
    status: "需要驗證 Email",
    title: "請先完成\nEmail 驗證",
    body: "為了保護你的會員資料，登入 Email 需要先完成驗證，才能開啟會員中心。請到「管理登入帳號」完成驗證，再重新讀取這一頁。",
  },
  EMAIL_ALREADY_LINKED: {
    status: "需要 Zola 協助",
    title: "這個 Email\n已連結其他帳號",
    body: "為了保護會員資料，系統不會自動把資料轉到新的登入帳號。請傳 LINE 給 Zola，確認是本人後會協助處理。",
  },
  MEMBERSHIP_NOT_CONFIGURED: {
    status: "會員服務設定中",
    title: "會員服務設定中",
    body: "目前無法確認會員權限，請稍後再試；若持續出現，請聯絡 Zola。",
  },
  UNAUTHENTICATED: {
    status: "暫時無法讀取",
    title: "登入狀態需要重新確認",
    body: "這不代表尚未開通。請重新讀取；若持續出現，請先登出再重新登入。",
  },
  UNAVAILABLE: {
    status: "暫時無法讀取",
    title: "會員資料暫時讀不到",
    body: "這不代表尚未開通。請稍後再試；若持續出現，請聯絡 Zola 協助確認。",
  },
};

export function AccountErrorView({ failure, onRetry, signOut, onManageAccount }: {
  failure: MemberLoadFailure;
  onRetry: () => void;
  signOut: ReactNode;
  onManageAccount?: () => void;
}) {
  const copy = failureCopy[failure];
  return <main className="account-page">
    <Hero status={copy.status} statusClass="status-error" title={copy.title}>
      <p className="account-lead" role="alert">{copy.body}</p>
      {failure === "EMAIL_ALREADY_LINKED"
        ? <LineRequest label="傳 LINE 給 Zola" message={LINKED_EMAIL_HELP_MESSAGE} />
        : <div className="account-actions">
          {failure === "EMAIL_NOT_VERIFIED" && onManageAccount
            ? <button className="account-primary" type="button" onClick={onManageAccount}>管理登入帳號</button>
            : null}
          <button className={failure === "EMAIL_NOT_VERIFIED" ? "account-secondary" : "account-primary"} type="button" onClick={onRetry}>重新讀取</button>
        </div>}
      <div className="account-quiet-actions">{signOut}</div>
    </Hero>
  </main>;
}

function expiryText(member: ClientMember, stage: AccountStage, now: number) {
  const until = formatTaipeiDate(member.access_expires_at);
  switch (stage) {
    case "admin": return "管理員不受期限限制";
    case "active":
    case "expiring": return `${until} 到期（${remainingLabel(member.access_expires_at, now)}）`;
    case "expired": return until ? `已於 ${until} 結束` : "目前沒有有效期限";
    case "suspended": return until ? `暫停中（原期限 ${until}）` : "暫停中";
    default: return "尚未開通";
  }
}

function ProfileCard({ member, stage, now, onSave, onSaved, signOut }: {
  member: ClientMember;
  stage: AccountStage;
  now: number;
  onSave: SaveProfile;
  onSaved: () => void;
  signOut: ReactNode;
}) {
  const complete = isProfileComplete(member);
  const [editing, setEditing] = useState(!complete);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && complete) firstField.current?.focus();
  }, [editing, complete]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checked = validateProfileInput({
      fullName: form.get("fullName"),
      lineId: form.get("lineId"),
      birthday: form.get("birthday"),
    }, Date.now());
    if (!checked.ok) { setNotice({ tone: "error", text: checked.error }); return; }
    setSaving(true);
    setNotice(null);
    const result = await onSave(checked.value);
    setSaving(false);
    if (!result.ok) { setNotice({ tone: "error", text: result.message }); return; }
    setEditing(false);
    setNotice({ tone: "ok", text: stage.startsWith("pending") ? "會員資料已儲存。下一步，請傳 LINE 通知 Zola 開通。" : "會員資料已儲存。" });
    onSaved();
  }

  return <section className="member-profile-card" id="member-profile" aria-labelledby="member-profile-title">
    <header className="member-profile-head">
      <h2 id="member-profile-title">會員資料</h2>
      {!editing ? <button className="member-profile-edit" type="button" onClick={() => { setEditing(true); setNotice(null); }}>編輯資料</button> : null}
    </header>
    <dl className="member-profile-rows">
      <div><dt>登入 Email</dt><dd>{member.email}</dd></div>
      <div><dt>使用期限</dt><dd>{expiryText(member, stage, now)}</dd></div>
      {!editing ? <>
        <div><dt>真實姓名</dt><dd>{member.full_name || "尚未填寫"}</dd></div>
        <div><dt>LINE 名稱／ID</dt><dd>{member.line_id || "尚未填寫"}</dd></div>
        <div><dt>生日</dt><dd>{member.birthday ? formatTaipeiDate(`${member.birthday.slice(0, 10)}T12:00:00+08:00`) : "尚未填寫"}</dd></div>
      </> : null}
    </dl>
    {editing ? <form className="member-profile-form" onSubmit={(event) => void submit(event)} noValidate>
      <label>真實姓名<input ref={firstField} name="fullName" defaultValue={member.full_name ?? ""} autoComplete="name" maxLength={PROFILE_LIMITS.fullName} required /></label>
      <label>LINE 名稱／ID<input name="lineId" defaultValue={member.line_id ?? ""} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={PROFILE_LIMITS.lineId} required /></label>
      <label>生日<input name="birthday" type="date" defaultValue={member.birthday?.slice(0, 10) ?? ""} autoComplete="bday" min="1900-01-01" max={taipeiDate(now)} required /></label>
      <div className="member-profile-form-actions">
        <button type="submit" disabled={saving}>{saving ? "儲存中…" : "儲存會員資料"}</button>
        {complete ? <button className="member-profile-cancel" type="button" disabled={saving} onClick={() => { setEditing(false); setNotice(null); }}>取消</button> : null}
      </div>
    </form> : null}
    <p className={notice?.tone === "error" ? "member-profile-notice is-error" : "member-profile-notice"} role={notice?.tone === "error" ? "alert" : "status"}>{notice?.text}</p>
    <p className="member-privacy-note">這些資料只用於確認會員身分、聯絡你與管理會員服務，不會公開顯示在網站上。如需查詢、更正或刪除資料，請傳 LINE 給 Zola，確認是本人後會協助處理。</p>
    <footer className="member-profile-foot">{signOut}</footer>
  </section>;
}

export function MemberAccountView({ member, now, onSave, signOut }: {
  member: ClientMember;
  now: number;
  onSave: SaveProfile;
  signOut: ReactNode;
}) {
  const stage = accountStage(member, now);
  const until = formatTaipeiDate(member.access_expires_at);
  const remaining = remainingLabel(member.access_expires_at, now);
  const name = member.full_name?.trim();
  const lineCta = useRef<HTMLAnchorElement>(null);
  const hero = useRef<HTMLDivElement>(null);

  // After a pending member saves, bring the next step (the LINE button) into view.
  function focusNextStep() {
    if (!stage.startsWith("pending")) return;
    requestAnimationFrame(() => {
      hero.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      lineCta.current?.focus({ preventScroll: true });
    });
  }

  const statusClass = stage === "expiring" ? "status-expiring" : stage === "admin" ? "status-active" : `status-${member.effective_status}`;
  const welcome = name ? `${name}，\n歡迎回來` : "你的會員中心";

  let heroBody: ReactNode;
  let title: string;
  switch (stage) {
    case "admin":
      title = "管理員帳號";
      heroBody = <>
        <p className="account-lead">管理員不受使用期限限制，網站完整功能都可以使用。</p>
        <div className="account-actions"><Link className="account-primary" href="/zola-admin">進入 Zola 會員後台</Link><Link className="account-secondary" href="/admin">查看我的存檔</Link></div>
      </>;
      break;
    case "pending-incomplete":
      title = "還差一步，\n補齊你的會員資料";
      heroBody = <>
        <p className="account-lead">填好姓名、LINE 名稱與生日，再傳 LINE 通知 Zola，就能為你開通使用期限。</p>
        <div className="account-actions"><a className="account-primary" href="#member-profile">填寫會員資料</a></div>
        <JourneySteps profileDone={false} signedIn />
      </>;
      break;
    case "pending-ready":
      title = "資料已備齊，\n等待 Zola 開通";
      heroBody = <>
        <p className="account-lead">傳一則 LINE 給 Zola，確認後會為你開通使用期限。開通完成後重新整理這一頁，就能看到期限。</p>
        <LineRequest label="傳 LINE 通知 Zola" message={activationRequestMessage(member)} primaryRef={lineCta} />
        <JourneySteps profileDone signedIn />
      </>;
      break;
    case "active":
      title = welcome;
      heroBody = <>
        <p className="account-lead">權限已開通，網站完整功能都可以使用。</p>
        <p className="account-meta"><span>使用期限至 {until}</span>・<span>{remaining}</span></p>
        <div className="account-actions"><Link className="account-primary" href="/#draw">開始今天的抽牌</Link><Link className="account-secondary" href="/admin">查看我的存檔</Link></div>
      </>;
      break;
    case "expiring":
      title = welcome;
      heroBody = <>
        <p className="account-lead">你的會員使用期限將於 {until} 結束，需要延長可以聯絡 Zola。</p>
        <p className="account-meta account-meta-warning">{remaining}</p>
        <LineRequest label="聯絡 Zola 續約" message={renewalRequestMessage(member)} />
      </>;
      break;
    case "expired":
      title = "這次的使用期限\n已經結束";
      heroBody = <>
        <p className="account-lead">{until ? `使用期限已於 ${until} 結束。` : "目前沒有有效的使用期限。"}你的會員資料都還保留著，續約後 Zola 可以從後台立即恢復。</p>
        <LineRequest label="聯絡 Zola 續約" message={renewalRequestMessage(member)} />
      </>;
      break;
    case "suspended":
      title = "會員使用權限\n目前已暫停";
      heroBody = <>
        <p className="account-lead">你的會員資料仍會保留，目前暫時無法使用會員專屬功能。如需了解原因或申請恢復，請聯絡 Zola 協助確認。</p>
        <LineRequest label="聯絡 Zola" message={supportRequestMessage(member)} />
        <p className="account-quiet-actions"><a href="#member-profile">查看會員資料</a></p>
      </>;
      break;
  }

  const hasAccess = stage === "admin" || stage === "active" || stage === "expiring";
  return <main className="account-page">
    <div ref={hero} className="account-hero-anchor">
      <Hero status={statusLabels[stage]} statusClass={statusClass} title={title}>{heroBody}</Hero>
    </div>
    {hasAccess ? <MemberSpaces locked={false} /> : null}
    <ProfileCard member={member} stage={stage} now={now} onSave={onSave} onSaved={focusNextStep} signOut={signOut} />
    {hasAccess ? null : <MemberSpaces locked />}
  </main>;
}
