// Zola's yearly membership prices (Zola, 2026-11-22). They are public, but how many places are left is not
// shown (「公開價格，不顯示名額」): 早鳥 NT$1,800 a year for the first 20 members, then NT$2,800 for the next 25,
// then NT$3,820. Every tier comes with one question read by Zola herself, used within 14 days of activation
// (「送一題占卜 找zola」「14天內用掉」). Shown by app/member-prices.tsx.

export type MembershipTier = { name: string; price: number; limit: number | null };

export const MEMBERSHIP_TIERS: readonly MembershipTier[] = [
  { name: "早鳥價", price: 1800, limit: 20 },
  { name: "第二波", price: 2800, limit: 25 },
  { name: "正式價", price: 3820, limit: null },
];

export const MEMBERSHIP_GIFT_DAYS = 14;

/** 1800 → "NT$1,800", the same on the server and in every browser. */
export function formatTwd(price: number) {
  return `NT$${String(Math.round(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
