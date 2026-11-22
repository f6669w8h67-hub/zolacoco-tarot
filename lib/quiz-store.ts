// 心理測驗 in the database (Neon). A quiz is public only when it is scheduled and its time has come: every
// public read below checks that on the server, so a quiz never shows early (Zola: 跟 IG 發文同一時間).
import { readFileSync } from "node:fs";
import { getSql } from "./membership";
import { type Quiz, type QuizSummary, isPublished, quizSummary } from "./quiz";

/** Local preview only (never in production): quizzes from a JSON file, so the pages can be looked at
 *  without the database. */
function previewQuizzes(): Quiz[] | null {
  const file = process.env.QUIZ_PREVIEW_FILE;
  if (process.env.NODE_ENV !== "development" || !file) return null;
  return (JSON.parse(readFileSync(file, "utf8")) as Quiz[]).sort((a, b) => b.publishAt.localeCompare(a.publishAt) || b.code.localeCompare(a.code));
}

let schemaPromise: Promise<void> | null = null;

export async function ensureQuizSchema() {
  const sql = getSql();
  schemaPromise ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS quizzes (
        code text PRIMARY KEY CHECK (code ~ '^F?[0-9]{10}$'),
        kind text NOT NULL CHECK (kind IN ('abc', 'first-sight')),
        title text NOT NULL,
        tone text NOT NULL,
        publish_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled')),
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS quizzes_public_idx ON quizzes (publish_at DESC, code DESC) WHERE status = 'scheduled'`;
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

type Row = { code: string; kind: Quiz["kind"]; title: string; tone: string; publish_at: string | Date; status: Quiz["status"]; data: unknown };

function fromRow(row: Row): Quiz {
  return { code: row.code, kind: row.kind, title: row.title, tone: row.tone, publishAt: new Date(row.publish_at).toISOString(), status: row.status, data: row.data } as Quiz;
}

export const QUIZ_PAGE_SIZE = 18;

/** Public quizzes, newest first, `limit` at a time; `before` is the last one already shown. */
export async function listPublishedQuizzes(before: { publishAt: string; code: string } | null, limit = QUIZ_PAGE_SIZE) {
  const preview = previewQuizzes();
  if (preview) {
    const open = preview.filter((quiz) => isPublished(quiz) && (!before || quiz.publishAt < before.publishAt || (quiz.publishAt === before.publishAt && quiz.code < before.code)));
    return { quizzes: open.slice(0, limit).map(quizSummary), more: open.length > limit };
  }
  await ensureQuizSchema();
  const sql = getSql();
  const rows = (before
    ? await sql`
        SELECT code, kind, title, tone, publish_at, status, data FROM quizzes
        WHERE status = 'scheduled' AND publish_at <= now()
          AND (publish_at, code) < (${before.publishAt}::timestamptz, ${before.code})
        ORDER BY publish_at DESC, code DESC LIMIT ${limit + 1}`
    : await sql`
        SELECT code, kind, title, tone, publish_at, status, data FROM quizzes
        WHERE status = 'scheduled' AND publish_at <= now()
        ORDER BY publish_at DESC, code DESC LIMIT ${limit + 1}`) as Row[];
  const quizzes: QuizSummary[] = rows.slice(0, limit).map((row) => quizSummary(fromRow(row)));
  return { quizzes, more: rows.length > limit };
}

export async function getPublishedQuiz(code: string) {
  const preview = previewQuizzes();
  if (preview) return preview.find((quiz) => quiz.code === code && isPublished(quiz)) ?? null;
  await ensureQuizSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT code, kind, title, tone, publish_at, status, data FROM quizzes
    WHERE code = ${code} AND status = 'scheduled' AND publish_at <= now() LIMIT 1` as Row[];
  return rows[0] ? fromRow(rows[0]) : null;
}

/** Zola's list: everything, drafts and scheduled ones too, newest first. */
export async function listAllQuizzes() {
  await ensureQuizSchema();
  const sql = getSql();
  const rows = await sql`SELECT code, kind, title, tone, publish_at, status, data FROM quizzes ORDER BY publish_at DESC, code DESC LIMIT 500` as Row[];
  return rows.map(fromRow);
}

export async function saveQuiz(quiz: Quiz) {
  await ensureQuizSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO quizzes (code, kind, title, tone, publish_at, status, data)
    VALUES (${quiz.code}, ${quiz.kind}, ${quiz.title}, ${quiz.tone}, ${quiz.publishAt}, ${quiz.status}, ${JSON.stringify(quiz.data)}::jsonb)
    ON CONFLICT (code) DO UPDATE SET
      kind = EXCLUDED.kind, title = EXCLUDED.title, tone = EXCLUDED.tone, publish_at = EXCLUDED.publish_at,
      status = EXCLUDED.status, data = EXCLUDED.data, updated_at = now()
    RETURNING code, kind, title, tone, publish_at, status, data` as Row[];
  return fromRow(rows[0]);
}

export async function deleteQuiz(code: string) {
  await ensureQuizSchema();
  const sql = getSql();
  const rows = await sql`DELETE FROM quizzes WHERE code = ${code} RETURNING code, kind, title, tone, publish_at, status, data` as Row[];
  return rows[0] ? fromRow(rows[0]) : null;
}

/** Every image a quiz points at, so they can go when the quiz does. */
export function quizImages(quiz: Quiz) {
  const urls = quiz.kind === "abc"
    ? [...quiz.data.cards, ...quiz.data.choices]
    : [quiz.data.painting, quiz.data.blur, quiz.data.paper];
  return urls.filter((url): url is string => typeof url === "string" && url.includes(".blob.vercel-storage.com/"));
}
