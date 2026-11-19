"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

import { lineMessageUrl } from "@/lib/contact";
import {
  MEMBERSHIP_KEYWORD, TRIAL_LIMIT, TRIAL_STORAGE_KEY, parseTrial, spendTrial, trialRemaining, type TrialFeature,
} from "@/lib/visitor-trial";
import "./styles/visitor-trial.css";

// 免費體驗 (lib/visitor-trial.ts). Members never see any of this: without a VisitorTrialProvider above
// it, useTrial() answers "member" and every component here renders nothing.
export type Trial = {
  visitor: boolean;
  used: number;
  remaining: number;
  canPlay: boolean;
  /** Counts one completed use (a reading revealed, a pendulum answer, a dice result). */
  spend: (feature: TrialFeature) => void;
};

const MEMBER: Trial = { visitor: false, used: 0, remaining: Number.POSITIVE_INFINITY, canPlay: true, spend: () => {} };
const TrialContext = createContext<Trial>(MEMBER);

export function useTrial() {
  return useContext(TrialContext);
}

/** Opens Zola's LINE with the keyword typed in; her auto-reply explains how to apply. */
export const membershipApplyUrl = lineMessageUrl(MEMBERSHIP_KEYWORD);

function readStored() {
  try { return window.localStorage.getItem(TRIAL_STORAGE_KEY); } catch { return null; }
}

// The count lives in the browser, outside React: read it with useSyncExternalStore, so every part of
// the page (and another open tab, through the storage event) shows the same number.
const listeners = new Set<() => void>();
// When the browser refuses storage (some private modes), the count still holds for this visit.
let memory: string | null = null;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => { if (event.key === TRIAL_STORAGE_KEY) onChange(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(onChange); window.removeEventListener("storage", onStorage); };
}

function usedNow() {
  return Math.max(parseTrial(readStored()).used, parseTrial(memory).used);
}

export function VisitorTrialProvider({ children }: { children: React.ReactNode }) {
  const used = useSyncExternalStore(subscribe, usedNow, () => 0);

  const spend = useCallback((feature: TrialFeature) => {
    // Counted from the stored value at the moment of use, so another open tab's uses are not lost.
    const next = spendTrial(JSON.stringify({ used: usedNow() }), feature);
    memory = next.value;
    try { window.localStorage.setItem(TRIAL_STORAGE_KEY, next.value); } catch { /* kept in memory above */ }
    listeners.forEach((onChange) => onChange());
  }, []);

  const remaining = trialRemaining(used);
  return <TrialContext.Provider value={{ visitor: true, used, remaining, canPlay: remaining > 0, spend }}>{children}</TrialContext.Provider>;
}

/** 「免費體驗還剩 N 次」 with one pearl per use left. Visitors only. */
export function TrialMeter({ className = "" }: { className?: string }) {
  const trial = useTrial();
  // Once nothing is left, the limit card says so; the meter steps aside.
  if (!trial.visitor || !trial.canPlay) return null;
  return <p className={`trial-meter ${className}`} role="status">
    <span aria-hidden="true">{Array.from({ length: TRIAL_LIMIT }, (_, index) => <i key={index} className={index < trial.remaining ? "left" : "used"} />)}</span>
    免費體驗還剩 <b>{trial.remaining}</b> 次
  </p>;
}

/** Shown in place of the next draw, swing or roll once the three uses are spent. Visitors only. */
export function TrialLimitCard({ className = "" }: { className?: string }) {
  const trial = useTrial();
  if (!trial.visitor) return null;
  return <section className={`trial-limit ${className}`} aria-labelledby="trial-limit-title">
    <span className="trial-limit-mark" aria-hidden="true">✦</span>
    <p className="eyebrow">FREE TRIAL</p>
    <h3 id="trial-limit-title">三次免費體驗用完了</h3>
    <p>喜歡這樣的陪伴，就申請成為 Zolacoco 會員：抽牌、靈擺、星骰和全站功能都能無限使用，也能保存每一次的紀錄。</p>
    <a className="trial-apply" href={membershipApplyUrl} target="_blank" rel="noreferrer">申請成為會員</a>
    <small>會打開 Zola 的官方 LINE，送出「{MEMBERSHIP_KEYWORD}」就會收到申請方式。</small>
    <Link className="trial-sign-in" href="/sign-in">已經是會員？登入</Link>
  </section>;
}
