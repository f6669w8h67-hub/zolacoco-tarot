// 學員練習室 question bank. Server-only data: the /practice page never imports this file, it gets
// published questions (without answers) from /api/practice, so drafts never reach a student's browser.
//
// Rules (ChatGPT spec review, step 8):
// - A question is shown to students only when status is "published"; Zola confirms each one first.
//   Admin (Zola) sees drafts too, marked 草稿, to preview them.
// - A question id is never reused. When a question's meaning changes, bump `version`; saved answers
//   keep the version they answered, so an old answer never looks like an answer to the new question.
//   Copy the old scenario and option texts into practice-history.ts first: answerContext() shows an
//   old answer with the option it chose then, never with whatever now sits under the same letter.
// - Every scene detail comes from the card's `scene` in tarot-data.ts (the site's 萊恩 and 蝦蝦 deck),
//   so a question never mentions something that is not in the picture.
// - `sample` is Zola's own demonstration reading. Until she writes it, it stays null and the page says
//   「Zola 示範解讀準備中」; the site's card meaning is shown separately as 網站牌義參考.

import { PRACTICE_HISTORY } from "@/lib/practice-history";
import { publicAnswer, type AnswerContext, type ShownAnswer } from "@/lib/practice-input";
import type { PracticeAnswerRow } from "@/lib/practice-store";
import { PRACTICE_QUESTIONS } from "@/lib/practice-questions";

// The questions themselves live in practice-questions.ts (Zola confirmed all 136 for students on 2026-11-14).
export { PRACTICE_QUESTIONS };

export type PracticeLevel = "基礎" | "進階";
export type PracticeStatus = "draft" | "published";

export type PracticeUnit = {
  id: string;
  level: PracticeLevel;
  title: string;
  focus: string;
};

export type PracticeOption = { id: "a" | "b" | "c"; text: string; correct: boolean; note: string };

export type PracticeQuestion = {
  id: string;
  version: number;
  status: PracticeStatus;
  unit: string;
  cardId: string;
  reversed?: boolean;
  /** A client question (實戰). */
  scenario?: string;
  observe: string;
  read: string;
  choose: string;
  options: PracticeOption[];
  sample: string | null;
};

export const PRACTICE_UNITS: PracticeUnit[] = [
  { id: "major", level: "基礎", title: "大阿爾克納", focus: "從畫面讀出大牌的核心課題" },
  { id: "minor", level: "基礎", title: "小阿爾克納", focus: "四元素、數字 1～10 的階段與畫面動作" },
  { id: "court", level: "基礎", title: "宮廷牌", focus: "宮廷牌代表一個人，或一種人格狀態" },
  { id: "practice", level: "基礎", title: "實戰練習", focus: "一個問題、一張牌，說出對方聽得懂的解讀" },
  { id: "gateway", level: "進階", title: "門戶牌", focus: "任何一張牌都可能是門戶：依問題與牌位找出關鍵轉折" },
  { id: "body", level: "進階", title: "塔羅中的肢體語言", focus: "姿勢、視線、手勢與人物距離" },
  { id: "spread", level: "進階", title: "牌陣", focus: "切牌與指示牌、位置的意思與解讀順序" },
  { id: "reversed", level: "進階", title: "逆位深度解讀", focus: "逆位不一定不好：卡住、過頭或內化，依問事情境判斷" },
];

const questionById = new Map(PRACTICE_QUESTIONS.map((question) => [question.id, question]));

/** A question this person may see: students only published ones, admin everything. */
export function visibleQuestion(id: string, admin: boolean): PracticeQuestion | null {
  const question = questionById.get(id);
  if (!question) return null;
  return admin || question.status === "published" ? question : null;
}

/** What the page receives: the question without which option is right or why. */
export function publicQuestion(question: PracticeQuestion) {
  return {
    id: question.id,
    version: question.version,
    unit: question.unit,
    cardId: question.cardId,
    reversed: question.reversed === true,
    scenario: question.scenario ?? null,
    observe: question.observe,
    read: question.read,
    choose: question.choose,
    options: question.options.map(({ id, text }) => ({ id, text })),
    draft: question.status !== "published",
  };
}

export function practiceCatalog(admin: boolean) {
  return PRACTICE_UNITS.map((unit) => ({
    ...unit,
    questions: PRACTICE_QUESTIONS.filter((question) => question.unit === unit.id && (admin || question.status === "published")).map(publicQuestion),
  }));
}

/** The server decides whether a choice is right; the page only shows what this returns. */
export function judgeChoice(question: PracticeQuestion, choice: string) {
  const option = question.options.find((item) => item.id === choice);
  if (!option) return null;
  const right = question.options.find((item) => item.correct);
  return { correct: option.correct, note: option.note, rightNote: right?.note ?? "", sample: question.sample };
}

/** The scenario and option texts of one version of a question: the current one, a kept older one, or null. */
function versionSeen(questionId: string, version: number) {
  const current = questionById.get(questionId);
  if (current && current.version === version) return { scenario: current.scenario ?? null, options: current.options };
  return PRACTICE_HISTORY[questionId]?.[version] ?? null;
}

/**
 * What a saved answer is shown with: the text of the option it chose in the version it answered,
 * and the question it was asked then. Unknown versions give null, and the pages say the question
 * was updated instead of borrowing text from the new options.
 */
export function answerContext(answer: { questionId: string; questionVersion: number; choice: string }): AnswerContext {
  const current = questionById.get(answer.questionId);
  const seen = versionSeen(answer.questionId, answer.questionVersion);
  return {
    choiceText: seen?.options.find((option) => option.id === answer.choice)?.text ?? null,
    scenarioAsked: seen?.scenario ?? null,
    questionUpdated: current !== undefined && current.version > answer.questionVersion,
  };
}

/** A saved answer as the pages receive it. */
export function shownAnswer(row: PracticeAnswerRow): ShownAnswer {
  const answer = publicAnswer(row);
  return { ...answer, ...answerContext(answer) };
}
