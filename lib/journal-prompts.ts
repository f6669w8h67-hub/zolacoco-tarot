// 七日塔羅筆記: the seven daily questions and their cards. Shared by the home page (local notes),
// the coaching API (which records the prompt version a note was written for) and Zola's admin page.
// Changing a question's meaning means a new version: add it to JOURNAL_PROMPT_SETS and bump
// JOURNAL_PROMPT_VERSION, so notes written for an older question still show the question they answered.

export const JOURNAL_PROMPT_VERSION = 1;

export const JOURNAL_PROMPT_SETS: Record<number, readonly string[]> = {
  1: [
    "我現在真正的情緒是什麼？",
    "我正在逃避或延後面對什麼？",
    "我內在最需要哪一種支持？",
    "我在人際關係中反覆出現什麼習慣？",
    "金錢與安全感對我代表什麼？",
    "如果不必迎合任何人，我想成為怎樣的人？",
    "這一週，我最想帶走的核心提醒是什麼？",
  ],
};

export const journalPrompts = JOURNAL_PROMPT_SETS[JOURNAL_PROMPT_VERSION];

export const journalCardIds = ["cups-13", "swords-08", "major-08", "cups-06", "pentacles-04", "major-17", "major-21"];

export const JOURNAL_DAYS = 7;

/** The question a note was written for. day is 1–7. */
export function journalPromptFor(version: number, day: number) {
  return (JOURNAL_PROMPT_SETS[version] ?? journalPrompts)[day - 1] ?? "";
}
