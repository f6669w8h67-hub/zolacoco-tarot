// 免費體驗 for visitors who are not signed in (Zola 2026-11-19): the homepage's 塔羅抽牌, 靈擺 and 星骰
// open without an account, three completed uses in all, counted on the visitor's own device. After the
// third, the page asks them to apply for membership through Zola's LINE with the keyword below, which
// her Official Account answers automatically. Everything else stays member-only, and no API opens.

/** Completed uses a visitor gets across all three features together. */
export const TRIAL_LIMIT = 3;

/** Where the count lives in the visitor's browser. Clearing site data starts over; that is accepted. */
export const TRIAL_STORAGE_KEY = "zolacoco-visitor-trial-v1";

/** The message a visitor sends to Zola's LINE to apply; her auto-reply is set on this exact keyword. */
export const MEMBERSHIP_KEYWORD = "申請會員";

export type TrialFeature = "tarot" | "pendulum" | "astro-dice";

export const TRIAL_FEATURES: readonly { id: TrialFeature; href: string; title: string; desc: string }[] = [
  { id: "tarot", href: "/#draw", title: "塔羅抽牌", desc: "選一個主題，親手從 78 張萊恩貓咪塔羅裡抽牌。" },
  { id: "pendulum", href: "/pendulum", title: "靈擺問答", desc: "把問題整理成是非題，看靈擺停在哪裡。" },
  { id: "astro-dice", href: "/astro-dice", title: "星骰指引", desc: "擲出行星、星座與宮位，看此刻的能量。" },
];

/** Pages a signed-out visitor may open to use the trial. Exact paths only; every API stays closed. */
export function isVisitorTrialPage(pathname: string) {
  return ["/", "/pendulum", "/astro-dice"].some((path) => pathname === path || (path !== "/" && pathname === `${path}/`));
}

type TrialStore = { used: number; last: string | null };

/** Reads the stored count; anything unreadable counts as a fresh start, never as more than the limit. */
export function parseTrial(raw: string | null | undefined): TrialStore {
  try {
    const value = JSON.parse(raw ?? "null") as { used?: unknown; last?: unknown } | null;
    const used = typeof value?.used === "number" && Number.isFinite(value.used) ? Math.floor(value.used) : 0;
    return { used: Math.min(TRIAL_LIMIT, Math.max(0, used)), last: typeof value?.last === "string" ? value.last : null };
  } catch {
    return { used: 0, last: null };
  }
}

export function trialRemaining(used: number) {
  return Math.max(0, TRIAL_LIMIT - used);
}

/** The stored value after one more completed use (never past the limit). */
export function spendTrial(raw: string | null | undefined, feature: TrialFeature, now = new Date()) {
  const current = parseTrial(raw);
  const used = Math.min(TRIAL_LIMIT, current.used + 1);
  return { used, value: JSON.stringify({ used, last: `${feature}@${now.toISOString()}` }) };
}
