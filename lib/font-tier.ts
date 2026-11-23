// The site's reading size (小／中／大). Saved per browser; a blocked or full storage never breaks the page,
// and nothing is written until she picks a size herself, so a saved 小 or 大 is never overwritten by the default.
export type FontTier = "small" | "medium" | "large";
export const FONT_TIER_KEY = "zolacoco-font-tier";
type Store = Pick<Storage, "getItem" | "setItem">;

/** window.localStorage, or null where reading it throws (blocked cookies, some private modes). */
export function browserStore(): Store | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

export function readFontTier(store: Store | null): FontTier {
  try {
    const saved = store?.getItem(FONT_TIER_KEY);
    return saved === "small" || saved === "large" ? saved : "medium";
  } catch {
    return "medium";
  }
}

/** True when the choice was kept; false when storage refused it (the size still applies for this visit). */
export function writeFontTier(store: Store | null, tier: FontTier): boolean {
  try {
    if (!store) return false;
    store.setItem(FONT_TIER_KEY, tier);
    return true;
  } catch {
    return false;
  }
}
