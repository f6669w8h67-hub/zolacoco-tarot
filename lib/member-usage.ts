// 會員使用次數 (Zola 2026-11-27: 會員的使用頻率，就是會員使用的次數，我在後台也要看得到). Each signed-in
// account's uses of the site's tools, counted on the account: a completed draw, pendulum answer, dice roll,
// awareness card, intuition answer, saved journal note, worked-out chart, a visit to 療癒小房間, an opened
// quiz reading. The same tool within USAGE_WINDOW_MINUTES counts once (several draws in a row are one visit
// to the tarot). Only the tool and the time are kept, never what was asked or drawn. Zola's own use is not
// counted. Shared by the pages, the API and the 會員後台.

export const USAGE_FEATURES = [
  { id: "tarot", label: "塔羅" },
  { id: "pendulum", label: "靈擺" },
  { id: "astro-dice", label: "星骰" },
  { id: "awareness", label: "覺察卡" },
  { id: "intuition", label: "直覺練習" },
  { id: "journal", label: "塔羅筆記" },
  { id: "astrology", label: "星盤" },
  { id: "healing", label: "療癒小房間" },
  { id: "quizzes", label: "心理測驗" },
] as const;

export type UsageFeature = (typeof USAGE_FEATURES)[number]["id"];

/** One visit to a tool: uses of the same tool closer together than this count once. */
export const USAGE_WINDOW_MINUTES = 10;

export function isUsageFeature(value: unknown): value is UsageFeature {
  return USAGE_FEATURES.some((feature) => feature.id === value);
}

export function usageLabel(id: string) {
  return USAGE_FEATURES.find((feature) => feature.id === id)?.label ?? id;
}

/** A member's numbers as the 會員後台 shows them. */
export type MemberUsage = { total: number; last30: number; days30: number; lastAt: string | null; byFeature: { id: string; label: string; n: number }[] };

/** From the admin list's columns (anything missing or odd counts as none), most used tools first. */
export function memberUsage(row: { usage_total?: unknown; usage_30d?: unknown; usage_days_30d?: unknown; usage_last_at?: unknown; usage_by_feature?: unknown }): MemberUsage {
  const count = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const lastAt = typeof row.usage_last_at === "string" || row.usage_last_at instanceof Date ? new Date(row.usage_last_at as string).toISOString() : null;
  const byFeature = row.usage_by_feature && typeof row.usage_by_feature === "object"
    ? Object.entries(row.usage_by_feature as Record<string, unknown>).map(([id, n]) => ({ id, label: usageLabel(id), n: count(n) })).filter((item) => item.n > 0)
      .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    : [];
  return { total: count(row.usage_total), last30: count(row.usage_30d), days30: count(row.usage_days_30d), lastAt, byFeature };
}
