// Pure checks for 陪跑筆記 requests (no database), shared by the routes and the tests.
import type { JournalCycleRow, JournalEntryRow } from "@/lib/coaching-store";

export const JOURNAL_NOTE_LIMIT = 4000;
export const COACHING_FEEDBACK_LIMIT = 2000;

type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function text(value: unknown, field: string, limit: number, required: boolean): Checked<string> {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") return { ok: false, error: `${field}格式不正確。` };
  const clean = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  if (required && !clean) return { ok: false, error: `請先寫下${field}。` };
  if (clean.length > limit) return { ok: false, error: `${field}請在 ${limit} 字以內。` };
  return { ok: true, value: clean };
}

function revisionOf(value: unknown, allowNull: boolean): Checked<number | null> {
  if (value === null || value === undefined) return allowNull ? { ok: true, value: null } : { ok: false, error: "資料版本不正確，請重新整理後再試一次。" };
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value < 1_000_000) return { ok: true, value };
  return { ok: false, error: "資料版本不正確，請重新整理後再試一次。" };
}

export type JournalBody =
  | { action: "start" }
  | { action: "save"; cycleId: string; day: number; content: string; expectedRevision: number | null }
  | { action: "stop"; cycleId: string };

/**
 * What a member may ask for. Starting a shared round needs consent: true, sent only when the member
 * ticked 「同步給 Zola」 themselves. Anything else in the body (member_id, feedback, prompt_version…)
 * is ignored.
 */
export function parseJournalBody(body: unknown): Checked<JournalBody> {
  if (!body || typeof body !== "object") return { ok: false, error: "資料格式不正確，請重新整理後再試一次。" };
  const input = body as Record<string, unknown>;
  if (input.action === "start") {
    if (input.consent !== true) return { ok: false, error: "請先勾選同意把這一輪筆記同步給 Zola。" };
    return { ok: true, value: { action: "start" } };
  }
  if (input.action === "stop") {
    if (!isUuid(input.cycleId)) return { ok: false, error: "找不到這一輪筆記。" };
    return { ok: true, value: { action: "stop", cycleId: input.cycleId } };
  }
  if (input.action === "save") {
    if (!isUuid(input.cycleId)) return { ok: false, error: "找不到這一輪筆記。" };
    if (typeof input.day !== "number" || !Number.isInteger(input.day) || input.day < 1 || input.day > 7) return { ok: false, error: "請選擇第 1 到第 7 天。" };
    const content = text(input.content, "今天的筆記", JOURNAL_NOTE_LIMIT, true);
    if (!content.ok) return content;
    const expected = revisionOf(input.expectedRevision, true);
    if (!expected.ok) return expected;
    return { ok: true, value: { action: "save", cycleId: input.cycleId, day: input.day, content: content.value, expectedRevision: expected.value } };
  }
  return { ok: false, error: "資料格式不正確，請重新整理後再試一次。" };
}

export type CoachingFeedbackBody = { entryId: string; feedback: string; expectedRevision: number };

export function parseCoachingFeedbackBody(body: unknown): Checked<CoachingFeedbackBody> {
  if (!body || typeof body !== "object") return { ok: false, error: "資料格式不正確，請重新整理後再試一次。" };
  const input = body as Record<string, unknown>;
  if (!isUuid(input.entryId)) return { ok: false, error: "找不到這一天的筆記。" };
  const feedback = text(input.feedback, "回覆", COACHING_FEEDBACK_LIMIT, false);
  if (!feedback.ok) return feedback;
  const expected = revisionOf(input.expectedRevision, false);
  if (!expected.ok) return expected;
  return { ok: true, value: { entryId: input.entryId, feedback: feedback.value, expectedRevision: expected.value as number } };
}

export function publicCycle(row: JournalCycleRow) {
  return {
    id: row.id,
    number: row.cycle_number,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    shared: row.share_with_zola,
    sharedAt: row.shared_at,
  };
}

/** What the member's page may know about one day's note. */
export function publicEntry(row: JournalEntryRow) {
  const feedbackAt = row.feedback_at ? new Date(row.feedback_at).getTime() : null;
  const seenAt = row.feedback_seen_at ? new Date(row.feedback_seen_at).getTime() : null;
  return {
    id: row.id,
    cycleId: row.cycle_id,
    day: row.day,
    promptVersion: row.prompt_version,
    content: row.content,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    feedback: row.feedback,
    feedbackAt: row.feedback_at,
    /** The reply was written for an earlier version of this note. */
    feedbackOutdated: row.feedback !== null && row.reviewed_revision !== null && row.revision > row.reviewed_revision,
    feedbackUnread: feedbackAt !== null && (seenAt === null || seenAt < feedbackAt),
  };
}

/** Zola's view adds what needs her attention. */
export function adminEntry(row: JournalEntryRow) {
  return {
    ...publicEntry(row),
    /** never replied */
    waiting: row.feedback_at === null,
    /** the member changed the note after Zola replied */
    changedAfterFeedback: row.feedback_at !== null && row.reviewed_revision !== null && row.revision > row.reviewed_revision,
  };
}

export type PublicCycle = ReturnType<typeof publicCycle>;
export type PublicEntry = ReturnType<typeof publicEntry>;
export type AdminEntry = ReturnType<typeof adminEntry>;
