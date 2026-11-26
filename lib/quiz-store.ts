// 心理測驗 in the database (Neon). A quiz is public only when it is scheduled and its time has come: every
// public read below checks that on the server, so a quiz never shows early (Zola: 跟 IG 發文同一時間).
import { readFileSync } from "node:fs";
import { getSql } from "./membership";
import { type Quiz, type QuizCount, type QuizStats, type QuizSummary, isPublished, quizSummary, tallyQuizCounts } from "./quiz";

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
    // 心理測驗統計 (Zola 2026-11-26): how many, by quiz, kind of count and pick; never who. A quiz's counts go
    // with it when it is deleted.
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_counts (
        code text NOT NULL REFERENCES quizzes (code) ON DELETE CASCADE,
        event text NOT NULL CHECK (event IN ('read', 'line')),
        choice text NOT NULL CHECK (char_length(choice) BETWEEN 1 AND 40),
        n integer NOT NULL DEFAULT 0 CHECK (n >= 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (code, event, choice)
      )
    `;
    // each count's random id, so a page that retries after a lost answer is counted once
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_count_receipts (
        id uuid PRIMARY KEY,
        code text NOT NULL REFERENCES quizzes (code) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    // anyone can send a count, so each sender (the address hashed with a salt kept for one day, the hash kept
    // for two hours) gets QUIZ_COUNTS_PER_HOUR an hour: a script cannot run the numbers up
    await sql`CREATE TABLE IF NOT EXISTS quiz_count_salts (day date PRIMARY KEY, salt text NOT NULL DEFAULT gen_random_uuid()::text)`;
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_count_limits (
        who text NOT NULL,
        hour timestamptz NOT NULL,
        n integer NOT NULL DEFAULT 0,
        PRIMARY KEY (who, hour)
      )
    `;
    await forgetOldCountKeys(sql);
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

/** Counts one sender may add in an hour: a visitor reading and messaging about every quiz of a week stays far below. */
export const QUIZ_COUNTS_PER_HOUR = 40;

/** The hourly allowance is only needed for the current hour; a day's salt only for that day. */
async function forgetOldCountKeys(sql: ReturnType<typeof getSql>) {
  await sql`DELETE FROM quiz_count_limits WHERE hour < now() - interval '2 hours'`;
  await sql`DELETE FROM quiz_count_salts WHERE day < current_date - 1`;
  await sql`DELETE FROM quiz_count_receipts WHERE created_at < now() - interval '30 days'`;
}

export type QuizCountResult = "counted" | "already" | "limited";

/** 心理測驗統計: one more 看完解析 or 按私訊 for a quiz, by what was picked — once per count id, and only within
 *  the sender's hourly allowance. One statement, so two requests at once cannot both slip through. Callers
 *  check the quiz first. `sender` is the request's address; only its salted hash is kept, for two hours. */
export async function countQuizEvent({ code, event, choice, id }: QuizCount, sender: string): Promise<QuizCountResult> {
  if (previewQuizzes()) return "counted";
  await ensureQuizSchema();
  const sql = getSql();
  const rows = await sql`
    WITH salt AS (
      INSERT INTO quiz_count_salts (day) VALUES (current_date)
      ON CONFLICT (day) DO UPDATE SET day = EXCLUDED.day
      RETURNING salt
    ), slot AS (
      INSERT INTO quiz_count_limits (who, hour, n)
      SELECT encode(sha256(convert_to(${sender} || salt, 'UTF8')), 'hex'), date_trunc('hour', now()), 1 FROM salt
      ON CONFLICT (who, hour) DO UPDATE SET n = quiz_count_limits.n + 1
      RETURNING n
    ), receipt AS (
      INSERT INTO quiz_count_receipts (id, code)
      SELECT ${id}::uuid, ${code} FROM slot WHERE slot.n <= ${QUIZ_COUNTS_PER_HOUR}
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ), counted AS (
      INSERT INTO quiz_counts (code, event, choice, n)
      SELECT ${code}, ${event}, ${choice}, 1 FROM receipt
      ON CONFLICT (code, event, choice) DO UPDATE SET n = quiz_counts.n + 1, updated_at = now()
      RETURNING 1
    )
    SELECT (SELECT n FROM slot) AS used, (SELECT count(*) FROM counted)::int AS counted` as { used: number; counted: number }[];
  const row = rows[0];
  if (row && Number(row.counted) > 0) return "counted";
  return row && Number(row.used) > QUIZ_COUNTS_PER_HOUR ? "limited" : "already";
}

/** Zola's numbers: every quiz's totals, and the day of the earliest count still kept. */
export async function quizStats(): Promise<QuizStats> {
  if (previewQuizzes()) return { since: null, quizzes: {} };
  await ensureQuizSchema();
  const sql = getSql();
  await forgetOldCountKeys(sql);
  const rows = await sql`SELECT code, event, choice, n, created_at FROM quiz_counts` as { code: string; event: string; choice: string; n: number; created_at: string }[];
  return tallyQuizCounts(rows);
}
