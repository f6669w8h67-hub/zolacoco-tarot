"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";

import { lineMessageUrl } from "@/lib/contact";
import { MEMBERSHIP_KEYWORD, TRIAL_LIMIT, type TrialFeature } from "@/lib/visitor-trial";
import "./styles/visitor-trial.css";

// 免費體驗 (lib/visitor-trial.ts). Members never see any of this: without a TrialProvider above it,
// useTrial() answers "member" and every component here renders nothing.
//   signed-out  looking only; the cards invite them to register (free) first
//   account     registered, not yet activated: three uses, counted on the account by /api/trial
export type TrialMode = "member" | "signed-out" | "account";
export type Trial = {
  mode: TrialMode;
  /** Not a member: the page shows the trial screens instead of its member ones. */
  visitor: boolean;
  /** The account's count has been read (always true when signed out). */
  ready: boolean;
  failed: boolean;
  used: number;
  remaining: number;
  canPlay: boolean;
  /** Counts one completed use (a reading revealed, a pendulum answer, a dice result). */
  spend: (feature: TrialFeature) => void;
};

const MEMBER: Trial = { mode: "member", visitor: false, ready: true, failed: false, used: 0, remaining: Number.POSITIVE_INFINITY, canPlay: true, spend: () => {} };
const SIGNED_OUT: Trial = { mode: "signed-out", visitor: true, ready: true, failed: false, used: 0, remaining: TRIAL_LIMIT, canPlay: false, spend: () => {} };
const TrialContext = createContext<Trial>(MEMBER);

export function useTrial() {
  return useContext(TrialContext);
}

/** Opens Zola's LINE with the keyword typed in; her auto-reply explains how to apply. */
export const membershipApplyUrl = lineMessageUrl(MEMBERSHIP_KEYWORD);

type TrialResponse = { mode?: unknown; remaining?: unknown };

/** Uses left according to /api/trial: unlimited once activated; anything unexpected counts as none. */
export function remainingFrom(data: TrialResponse) {
  if (data.mode === "member") return Number.POSITIVE_INFINITY;
  if (data.mode !== "trial" || typeof data.remaining !== "number" || !Number.isFinite(data.remaining)) return 0;
  return Math.min(TRIAL_LIMIT, Math.max(0, Math.floor(data.remaining)));
}

/**
 * What a spend (POST /api/trial) means for the page: the uses left, or "failed" when the answer is not
 * a clear one (refused, server error, unreadable). Then the trial stops until the page is reloaded; the
 * count shown is not restored, because the server may already have taken the use.
 */
export function spendOutcome(status: number, data: unknown): number | "failed" {
  const body = (data ?? {}) as TrialResponse;
  if (status !== 200 && status !== 409) return "failed";
  if (body.mode === "member") return Number.POSITIVE_INFINITY;
  if (body.mode !== "trial" || typeof body.remaining !== "number" || !Number.isFinite(body.remaining)) return "failed";
  return remainingFrom(body);
}

function AccountTrial({ children }: { children: React.ReactNode }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/trial", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("trial-status");
        return response.json() as Promise<TrialResponse>;
      })
      .then((data) => { if (active) setRemaining(remainingFrom(data)); })
      .catch(() => { if (active) { setFailed(true); setRemaining(0); } });
    return () => { active = false; };
  }, []);

  const spend = useCallback((feature: TrialFeature) => {
    // The result is already on screen: show the new count at once, then take the server's word for it.
    setRemaining((current) => current === null ? current : Math.max(0, current - 1));
    fetch("/api/trial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ feature }) })
      .then(async (response) => {
        let data: unknown = null;
        try { data = await response.json(); } catch { /* unreadable: spendOutcome says failed */ }
        const outcome = spendOutcome(response.status, data);
        if (outcome === "failed") setFailed(true); else setRemaining(outcome);
      })
      .catch(() => { setFailed(true); });
  }, []);

  const ready = remaining !== null;
  const left = remaining ?? 0;
  const value: Trial = left === Number.POSITIVE_INFINITY
    ? MEMBER
    : { mode: "account", visitor: true, ready, failed, used: TRIAL_LIMIT - left, remaining: left, canPlay: ready && !failed && left > 0, spend };
  return <TrialContext.Provider value={value}>{children}</TrialContext.Provider>;
}

export function TrialProvider({ mode, children }: { mode: "signed-out" | "account"; children: React.ReactNode }) {
  return mode === "signed-out"
    ? <TrialContext.Provider value={SIGNED_OUT}>{children}</TrialContext.Provider>
    : <AccountTrial>{children}</AccountTrial>;
}

/** 「免費體驗還剩 N 次」 with one pearl per use left. Registered, unactivated accounts only. */
export function TrialMeter({ className = "" }: { className?: string }) {
  const trial = useTrial();
  // Signed out, still loading or nothing left: the card beside it says what there is to say.
  if (trial.mode !== "account" || !trial.canPlay) return null;
  return <p className={`trial-meter ${className}`} role="status">
    <span aria-hidden="true">{Array.from({ length: TRIAL_LIMIT }, (_, index) => <i key={index} className={index < trial.remaining ? "left" : "used"} />)}</span>
    免費體驗還剩 <b>{trial.remaining}</b> 次
  </p>;
}

/**
 * Shown in place of a draw, swing or roll that cannot start: signed out, it invites them to register
 * (free) for three uses; once the three are spent, it asks them to apply for membership.
 */
export function TrialLimitCard({ className = "" }: { className?: string }) {
  const trial = useTrial();
  // The homepage can show this card twice (我想玩玩看 and the draw), so each gets its own title id.
  const titleId = useId();
  if (!trial.visitor) return null;
  if (!trial.ready) return <p className={`trial-meter trial-loading ${className}`} role="status">正在確認妳的體驗次數…</p>;
  if (trial.mode === "signed-out") {
    return <section className={`trial-limit ${className}`} aria-labelledby={titleId}>
      <span className="trial-limit-mark" aria-hidden="true">✦</span>
      <p className="eyebrow">FREE TRIAL</p>
      <h3 id={titleId}>免費註冊，就能體驗 {TRIAL_LIMIT} 次</h3>
      <p>用 Email 建立帳號（免費），註冊完馬上就能玩，不用等開通：塔羅抽牌、靈擺、星骰合計 {TRIAL_LIMIT} 次。</p>
      <Link className="trial-apply" href="/sign-up">免費註冊</Link>
      <Link className="trial-sign-in" href="/sign-in">已經有帳號？登入</Link>
    </section>;
  }
  return <section className={`trial-limit ${className}`} aria-labelledby={titleId}>
    <span className="trial-limit-mark" aria-hidden="true">✦</span>
    <p className="eyebrow">FREE TRIAL</p>
    <h3 id={titleId}>{trial.failed ? "暫時無法確認體驗次數" : "三次免費體驗用完了"}</h3>
    <p>{trial.failed
      ? "請重新整理頁面再試一次；如果一直出現，可以到 LINE 告訴 Zola。"
      : "喜歡這樣的陪伴，就申請成為 Zolacoco 會員：抽牌、靈擺、星骰不再限制次數，也能保存紀錄；還有星盤探索、療癒室、直覺練習和七日內在筆記。"}</p>
    <a className="trial-apply" href={membershipApplyUrl} target="_blank" rel="noreferrer">申請成為會員</a>
    <small>會打開 Zola 的官方 LINE，送出「{MEMBERSHIP_KEYWORD}」就會收到申請方式。</small>
    <Link className="trial-sign-in" href="/account">查看我的會員資料</Link>
  </section>;
}
