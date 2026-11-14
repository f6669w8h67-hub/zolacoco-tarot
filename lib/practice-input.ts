// Pure checks for 學員練習室 requests (no database), shared by the routes and the tests.
import type { PracticeAnswerRow } from "@/lib/practice-store";

export const PRACTICE_TEXT_LIMIT = 2000;

type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

function text(value: unknown, field: string, required: boolean): Checked<string> {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") return { ok: false, error: `${field}格式不正確。` };
  const clean = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (required && !clean) return { ok: false, error: `請先寫下${field}。` };
  if (clean.length > PRACTICE_TEXT_LIMIT) return { ok: false, error: `${field}請在 ${PRACTICE_TEXT_LIMIT} 字以內。` };
  return { ok: true, value: clean };
}

function revisionOf(value: unknown, allowNull: boolean): Checked<number | null> {
  if (value === null || value === undefined) return allowNull ? { ok: true, value: null } : { ok: false, error: "資料版本不正確，請重新整理後再試一次。" };
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value < 1_000_000) return { ok: true, value };
  return { ok: false, error: "資料版本不正確，請重新整理後再試一次。" };
}

export type AnswerBody = {
  questionId: string;
  observation: string;
  reading: string;
  choice: string;
  revisedReading: string;
  expectedRevision: number | null;
};

/** The student's own fields only. Anything else in the body (correct, feedback, member_id…) is ignored. */
export function parseAnswerBody(body: unknown): Checked<AnswerBody> {
  if (!body || typeof body !== "object") return { ok: false, error: "資料格式不正確，請重新整理後再試一次。" };
  const input = body as Record<string, unknown>;
  if (typeof input.questionId !== "string" || !input.questionId) return { ok: false, error: "找不到這一題。" };
  if (typeof input.choice !== "string" || !input.choice) return { ok: false, error: "請先選一個解讀。" };
  const observation = text(input.observation, "看見的畫面", false);
  if (!observation.ok) return observation;
  const reading = text(input.reading, "自己的解讀", true);
  if (!reading.ok) return reading;
  const revised = text(input.revisedReading, "修正後的解讀", false);
  if (!revised.ok) return revised;
  const expected = revisionOf(input.expectedRevision, true);
  if (!expected.ok) return expected;
  return { ok: true, value: { questionId: input.questionId, observation: observation.value, reading: reading.value, choice: input.choice, revisedReading: revised.value, expectedRevision: expected.value } };
}

export type FeedbackBody = { answerId: string; feedback: string; expectedRevision: number };

export function parseFeedbackBody(body: unknown): Checked<FeedbackBody> {
  if (!body || typeof body !== "object") return { ok: false, error: "資料格式不正確，請重新整理後再試一次。" };
  const input = body as Record<string, unknown>;
  if (typeof input.answerId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.answerId)) return { ok: false, error: "找不到這一題的作答。" };
  const feedback = text(input.feedback, "回饋", false);
  if (!feedback.ok) return feedback;
  const expected = revisionOf(input.expectedRevision, false);
  if (!expected.ok) return expected;
  return { ok: true, value: { answerId: input.answerId, feedback: feedback.value, expectedRevision: expected.value as number } };
}

/** What a student's page may know about an answer. */
export function publicAnswer(row: PracticeAnswerRow) {
  const feedbackAt = row.feedback_at ? new Date(row.feedback_at).getTime() : null;
  const seenAt = row.feedback_seen_at ? new Date(row.feedback_seen_at).getTime() : null;
  return {
    id: row.id,
    questionId: row.question_id,
    unit: row.unit,
    questionVersion: row.question_version,
    observation: row.observation,
    reading: row.reading,
    choice: row.choice,
    correct: row.correct,
    revisedReading: row.revised_reading,
    revision: row.revision,
    answeredAt: row.answered_at,
    updatedAt: row.updated_at,
    feedback: row.feedback,
    feedbackAt: row.feedback_at,
    /** The reply was written for an earlier version of this answer. */
    feedbackOutdated: row.feedback !== null && row.reviewed_revision !== null && row.revision > row.reviewed_revision,
    feedbackUnread: feedbackAt !== null && (seenAt === null || seenAt < feedbackAt),
  };
}

export type PublicAnswer = ReturnType<typeof publicAnswer>;

/** Added by the bank (answerContext): what the answered version of the question said. */
export type AnswerContext = {
  /** The option text this answer chose, from the version it answered; null when that version was not kept. */
  choiceText: string | null;
  /** The 問事者的問題 the answer was written for; null when there was none or the version was not kept. */
  scenarioAsked: string | null;
  /** The question has a newer version than the one this answer was written for. */
  questionUpdated: boolean;
};

/** An answer as the pages receive it. */
export type ShownAnswer = PublicAnswer & AnswerContext;
