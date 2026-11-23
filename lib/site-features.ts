// The site's features, shared by the bottom dock and its 全部功能 tray (Zola picked the G layout, 2026-11-22):
// the nine she kept, plus 心理測驗 (2026-11-23), first in 內在探索 as it is in the old menu.
// Icons are single stroke paths on a 24×24 grid, drawn in currentColor.

export type FeatureId =
  | "tarot" | "pendulum" | "dice"
  | "quizzes" | "aware" | "intuition" | "journal"
  | "healing" | "chart" | "zola";

export type Feature = { id: FeatureId; href: string; title: string; note: string; icon: string };
export type FeatureGroup = { key: "draw" | "inner" | "heal"; label: string; icon: string; items: Feature[] };

export const FEATURE_ICONS = {
  cards: "M7 4.5h8a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5Z M16.5 7.4l2.2.6a1.5 1.5 0 0 1 1 1.8l-2.4 9 M11 9.2l1.8 2.8L11 14.8 9.2 12Z",
  pendulum: "M10 3.5h4 M12 3.5V12 M9 12h6l-3 8.5Z",
  dice: "M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7Z M4.5 7.7l7.5 4.3 7.5-4.3 M12 12v8.5",
  eye: "M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6Z M12 9.3a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z",
  spark: "M11 3.5c.6 4.3 2.2 6 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.5 5.9-2.2 6.5-6.5Z M18 15c.3 1.7.9 2.3 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.2 2.2-.8 2.5-2.5Z",
  book: "M5.5 5.5A2 2 0 0 1 7.5 3.5h11v14h-11a2 2 0 0 0-2 2Z M5.5 19.5a2 2 0 0 0 2 2h11v-4 M9.5 8h5",
  moon: "M19 14.6A7.6 7.6 0 0 1 9.4 5a7.6 7.6 0 1 0 9.6 9.6Z",
  wheel: "M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z M12 8.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z M12 3.5v5.1 M12 15.4v5.1 M3.5 12h5.1 M15.4 12h5.1",
  quiz: "M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z M9.8 9.4a2.2 2.2 0 1 1 3.1 2c-.6.3-.9.8-.9 1.5v.4 M12 16.2h.01",
  chat: "M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 1-1.5 1.5h-7l-4.2 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V6.5A1.5 1.5 0 0 1 5 5Z M8 10.5h.01 M12 10.5h.01 M16 10.5h.01",
  plus: "M12 5v14 M5 12h14",
} as const;

export const FEATURE_GROUPS: FeatureGroup[] = [
  { key: "draw", label: "占卜工具", icon: FEATURE_ICONS.cards, items: [
    { id: "tarot", href: "/#draw", title: "塔羅抽牌", note: "單張與三張牌陣", icon: FEATURE_ICONS.cards },
    { id: "pendulum", href: "/pendulum", title: "靈擺占卜", note: "直覺問答與生活指引", icon: FEATURE_ICONS.pendulum },
    { id: "dice", href: "/astro-dice", title: "星骰指引", note: "行星 × 星座 × 宮位", icon: FEATURE_ICONS.dice },
  ] },
  { key: "inner", label: "內在探索", icon: FEATURE_ICONS.eye, items: [
    { id: "quizzes", href: "/quizzes", title: "心理測驗", note: "新測驗限時 24 小時免費", icon: FEATURE_ICONS.quiz },
    { id: "aware", href: "/awareness", title: "Zolacoco 覺察卡", note: "抽一張此刻的覺察卡", icon: FEATURE_ICONS.eye },
    { id: "intuition", href: "/?tool=intuition#explore", title: "直覺練習", note: "從牌面練習解讀", icon: FEATURE_ICONS.spark },
    { id: "journal", href: "/?tool=journal#explore", title: "七日塔羅筆記", note: "每天整理一個內在提問", icon: FEATURE_ICONS.book },
  ] },
  { key: "heal", label: "療癒空間", icon: FEATURE_ICONS.moon, items: [
    { id: "healing", href: "/healing-room", title: "療癒小房間", note: "情緒、關係與睡前練習", icon: FEATURE_ICONS.moon },
    { id: "chart", href: "/astrology-exploration", title: "探索妳的星盤", note: "理解內在需求與人生課題", icon: FEATURE_ICONS.wheel },
    { id: "zola", href: "/#consult", title: "問問 Zola", note: "一對一整理完整脈絡", icon: FEATURE_ICONS.chat },
  ] },
];

// the four kept in the dock itself (Zola, 2026-11-22: 抽牌・靈擺・星骰・問 Zola); the rest wait behind ＋
export const DOCK_FEATURES: FeatureId[] = ["tarot", "pendulum", "dice", "zola"];

export function findFeature(id: FeatureId): Feature {
  for (const group of FEATURE_GROUPS) for (const item of group.items) if (item.id === id) return item;
  throw new Error(`unknown feature ${id}`);
}

// a feature is "here" when the page is its own page; the ones that live on the home page are never marked
export function isCurrentFeature(item: Feature, pathname: string) {
  const path = item.href.split(/[?#]/)[0];
  return path !== "/" && (pathname === path || pathname.startsWith(`${path}/`));
}

export function groupIndexFor(pathname: string) {
  const index = FEATURE_GROUPS.findIndex((group) => group.items.some((item) => isCurrentFeature(item, pathname)));
  return index < 0 ? 0 : index;
}

// the dock grows under the pointer like a desk dock: full size within 0px, back to normal 130px away
export function dockSizes(count: number, pointer: number | null, { base = 50, step = 60, amount = 0.55, reach = 130 } = {}) {
  const center = (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => {
    if (pointer === null) return base;
    const f = Math.max(0, 1 - Math.abs(pointer - (i - center) * step) / reach);
    return Math.round(base * (1 + amount * f * f * (3 - 2 * f)));
  });
}
