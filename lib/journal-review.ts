// 七日回顧 (after seven days of 七日塔羅筆記) → LINE. Pure helpers shared by the journal and the tests.
// The LINE message carries only the wish to book by default. Her notes go in only when she ticks
// 「附上我的筆記重點」, and then only the short summary she has read and can edit — never the seven
// answers themselves (ChatGPT spec v1 §6: no long URLs, nothing private handed on without her seeing it).
import { JOURNAL_DAYS } from "@/lib/journal-prompts";

export const REVIEW_TEXT_LIMIT = 600;
export const JOURNAL_REVIEW_KEY = "zolacoco-journal-review-v1";

export type ReviewNotes = { noticed: string; direction: string };

/** Seven different days with words in them, in any order and on any dates. */
export function isSevenDaysWritten(days: readonly (string | null | undefined)[]) {
  return days.length >= JOURNAL_DAYS && days.slice(0, JOURNAL_DAYS).every((text) => Boolean(text?.trim()));
}

/** The summary offered when she ticks 附上: only what she wrote in the two review boxes. */
export function defaultHighlights({ noticed, direction }: ReviewNotes) {
  const parts: string[] = [];
  if (noticed.trim()) parts.push(`我最常注意到的事情：${noticed.trim()}`);
  if (direction.trim()) parts.push(`我想繼續探索的方向：${direction.trim()}`);
  return parts.join("\n");
}

/**
 * The text put in the LINE input box (she still presses send). `coaching`: she is already in a 陪跑
 * round with Zola, so the message asks for the next session instead of how 陪跑 works.
 */
export function reviewMessage({ coaching, attach, highlights }: { coaching: boolean; attach: boolean; highlights: string }) {
  const lines = ["Zola 妳好 ✨"];
  lines.push(coaching
    ? "我完成了這一輪的七日陪跑筆記，想和妳約下一次的陪跑時間。"
    : "我剛剛完成了 Zolacoco Tarot 的七日內在筆記，想了解正式陪跑的內容與安排方式。");
  const summary = highlights.trim().slice(0, REVIEW_TEXT_LIMIT);
  if (attach && summary) lines.push("", "我的筆記重點：", summary);
  lines.push("", coaching ? "謝謝妳。" : "想請問目前有哪些陪跑方案，以及適合怎麼開始，謝謝妳。");
  return lines.join("\n");
}
