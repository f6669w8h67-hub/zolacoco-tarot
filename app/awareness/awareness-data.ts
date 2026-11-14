import deck from "./awareness-cards.json";

// Zolacoco 覺察卡: 50 original cards inspired by ACT (content confirmed by Zola, 2026-11-14).
// Card art: 蝦蝦 illustrations in /public/awareness/NN.webp; the shared back is /public/awareness/back.webp.

export type AwarenessTheme = "acceptance" | "defusion" | "present" | "self" | "values" | "action" | "pearl";
export type AwarenessCard = {
  id: string;
  number: string;
  theme: AwarenessTheme;
  name: string;
  line: string;
  reading: string;
  question: string;
  practice: string;
};

export const AWARENESS_CARDS = deck.cards as AwarenessCard[];
export const AWARENESS_THEMES = deck.themes as { key: AwarenessTheme; label: string; act: string; count: number }[];
export const AWARENESS_BACK = "/awareness/back.webp";

export const cardArt = (card: Pick<AwarenessCard, "number">) => `/awareness/${card.number}.webp`;
export const themeLabel = (theme: AwarenessTheme | string) => AWARENESS_THEMES.find((item) => item.key === theme)?.label ?? "";

/** A random card, never the one just drawn (so 「再抽一張」 always changes the card). */
export function drawCard(previousId?: string | null, random = Math.random) {
  const pool = previousId ? AWARENESS_CARDS.filter((card) => card.id !== previousId) : AWARENESS_CARDS;
  return pool[Math.floor(random() * pool.length)] ?? AWARENESS_CARDS[0];
}

export { breakLines, phrases } from "@/lib/awareness-lines";
