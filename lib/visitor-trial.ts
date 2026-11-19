// 免費體驗 (Zola 2026-11-19). The homepage's 塔羅抽牌, 靈擺 and 星骰 give an account that is registered but
// not yet activated (status pending) three completed uses in all, counted on that account in Neon
// (members.trial_used), so clearing the browser or changing phones does not start over. Signed-out
// visitors can look at these pages and are asked to register first. After the third use, the page asks
// them to apply for membership through Zola's LINE with the keyword below, which her Official Account
// answers automatically. Everything else stays member-only.

/** Completed uses an unactivated account gets across all three features together. */
export const TRIAL_LIMIT = 3;

/** The message sent to Zola's LINE to apply; her auto-reply is set on this exact keyword. */
export const MEMBERSHIP_KEYWORD = "申請會員";

export type TrialFeature = "tarot" | "pendulum" | "astro-dice";

export const TRIAL_FEATURES: readonly { id: TrialFeature; href: string; title: string; desc: string }[] = [
  { id: "tarot", href: "/#draw", title: "塔羅抽牌", desc: "選一個主題，親手從 78 張萊恩貓咪塔羅裡抽牌。" },
  { id: "pendulum", href: "/pendulum", title: "靈擺問答", desc: "把問題整理成是非題，看靈擺停在哪裡。" },
  { id: "astro-dice", href: "/astro-dice", title: "星骰指引", desc: "擲出行星、星座與宮位，看此刻的能量。" },
];

export function isTrialFeature(value: unknown): value is TrialFeature {
  return TRIAL_FEATURES.some((feature) => feature.id === value);
}

/** Pages that open for the trial (and, signed out, show the invitation to register). Exact paths only. */
export function isVisitorTrialPage(pathname: string) {
  return ["/", "/pendulum", "/astro-dice"].some((path) => pathname === path || (path !== "/" && pathname === `${path}/`));
}

/** Who gets the three uses: a registered member Zola has not activated yet. Never expired or suspended. */
export function hasTrialAccess(member: { role?: string; status?: string } | undefined | null) {
  return member?.role === "member" && member.status === "pending";
}

/** Uses left, from the stored count (anything odd counts as used up rather than as more). */
export function trialRemaining(used: unknown) {
  const count = typeof used === "number" && Number.isFinite(used) ? Math.floor(used) : TRIAL_LIMIT;
  return Math.max(0, TRIAL_LIMIT - Math.max(0, count));
}
