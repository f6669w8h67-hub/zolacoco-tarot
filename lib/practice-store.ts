// 學員練習室 answers and Zola's feedback, in Neon next to the members table.
//
// - One row per student and question (UNIQUE member_id, question_id). Doing a question again
//   overwrites the student's own fields and keeps Zola's feedback.
// - `revision` goes up by one on every save. A save names the revision it started from, so a second
//   tab can never silently overwrite newer work (no row updated → conflict, the page reloads).
// - Zola's feedback records `reviewed_revision`, the answer she was looking at. When the student
//   changes the answer afterwards (revision > reviewed_revision) the admin page shows 回饋後已修改.
// - Students never write correct / feedback / member_id: the routes pass only checked values here.
// - Taking away someone's student mark does not delete their answers.
import { getSql } from "@/lib/membership";

export type PracticeAnswerRow = {
  id: string;
  member_id: string;
  unit: string;
  question_id: string;
  question_version: number;
  observation: string;
  reading: string;
  choice: string;
  correct: boolean;
  revised_reading: string;
  revision: number;
  answered_at: string;
  updated_at: string;
  feedback: string | null;
  feedback_at: string | null;
  reviewed_revision: number | null;
  feedback_seen_at: string | null;
};

export type AnswerInput = {
  unit: string;
  questionId: string;
  questionVersion: number;
  observation: string;
  reading: string;
  choice: string;
  correct: boolean;
  revisedReading: string;
};

let practiceSchemaPromise: Promise<void> | null = null;

export async function ensurePracticeSchema() {
  const sql = getSql();
  practiceSchemaPromise ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS practice_answers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        unit text NOT NULL,
        question_id text NOT NULL,
        question_version integer NOT NULL,
        observation text NOT NULL DEFAULT '',
        reading text NOT NULL,
        choice text NOT NULL,
        correct boolean NOT NULL,
        revised_reading text NOT NULL DEFAULT '',
        revision integer NOT NULL DEFAULT 1,
        answered_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        feedback text,
        feedback_at timestamptz,
        reviewed_revision integer,
        feedback_seen_at timestamptz,
        CONSTRAINT practice_answers_member_question UNIQUE (member_id, question_id)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS practice_answers_member_updated_idx ON practice_answers (member_id, updated_at DESC)`;
  })().catch((error) => {
    practiceSchemaPromise = null;
    throw error;
  });
  await practiceSchemaPromise;
}

export async function listAnswers(memberId: string) {
  const sql = getSql();
  return (await sql`
    SELECT * FROM practice_answers WHERE member_id = ${memberId} ORDER BY updated_at DESC
  `) as PracticeAnswerRow[];
}

/**
 * First save: expectedRevision is null and the row must not exist yet. Later saves: the row must
 * still be at expectedRevision. Anything else is a conflict and returns the row as it stands.
 */
export async function saveAnswer(memberId: string, input: AnswerInput, expectedRevision: number | null) {
  const sql = getSql();
  const rows = expectedRevision === null
    ? await sql`
        INSERT INTO practice_answers (member_id, unit, question_id, question_version, observation, reading, choice, correct, revised_reading)
        VALUES (${memberId}, ${input.unit}, ${input.questionId}, ${input.questionVersion}, ${input.observation}, ${input.reading}, ${input.choice}, ${input.correct}, ${input.revisedReading})
        ON CONFLICT ON CONSTRAINT practice_answers_member_question DO NOTHING
        RETURNING *
      `
    : await sql`
        UPDATE practice_answers
        SET unit = ${input.unit}, question_version = ${input.questionVersion}, observation = ${input.observation},
            reading = ${input.reading}, choice = ${input.choice}, correct = ${input.correct},
            revised_reading = ${input.revisedReading}, revision = revision + 1, updated_at = now()
        WHERE member_id = ${memberId} AND question_id = ${input.questionId} AND revision = ${expectedRevision}
        RETURNING *
      `;
  if (rows[0]) return { ok: true as const, answer: rows[0] as PracticeAnswerRow };
  const current = await sql`SELECT * FROM practice_answers WHERE member_id = ${memberId} AND question_id = ${input.questionId}`;
  return { ok: false as const, current: (current[0] as PracticeAnswerRow | undefined) ?? null };
}

/** Only the owner, and only an answer that has feedback. */
export async function markFeedbackSeen(memberId: string, answerId: string) {
  const sql = getSql();
  const rows = await sql`
    UPDATE practice_answers SET feedback_seen_at = now()
    WHERE id = ${answerId} AND member_id = ${memberId} AND feedback_at IS NOT NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export type PracticeStudentRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  is_student: boolean;
  answers: number;
  waiting: number;
  changed: number;
  last_answer_at: string | null;
};

/** Students, and former students who still have answers. waiting = never replied; changed = edited after a reply. */
export async function listStudents() {
  const sql = getSql();
  return (await sql`
    SELECT m.id, m.email, m.full_name, m.status, m.is_student,
      count(a.id)::int AS answers,
      (count(a.id) FILTER (WHERE a.feedback_at IS NULL))::int AS waiting,
      (count(a.id) FILTER (WHERE a.feedback_at IS NOT NULL AND a.revision > a.reviewed_revision))::int AS changed,
      max(a.updated_at) AS last_answer_at
    FROM members m
    LEFT JOIN practice_answers a ON a.member_id = m.id
    WHERE m.role = 'member' AND (m.is_student OR a.id IS NOT NULL)
    GROUP BY m.id
    ORDER BY max(a.updated_at) DESC NULLS LAST, m.created_at DESC
  `) as PracticeStudentRow[];
}

export async function listMemberAnswers(memberId: string) {
  const sql = getSql();
  return (await sql`
    SELECT * FROM practice_answers WHERE member_id = ${memberId} ORDER BY updated_at DESC LIMIT 300
  `) as PracticeAnswerRow[];
}

/**
 * Zola's reply to the answer she is looking at (expectedRevision). If the student changed it in the
 * meantime nothing is written and the current answer comes back, so she replies to what is there now.
 * An empty reply removes the feedback.
 */
export async function saveFeedback(answerId: string, feedback: string, expectedRevision: number) {
  const sql = getSql();
  const rows = feedback
    ? await sql`
        UPDATE practice_answers
        SET feedback = ${feedback}, feedback_at = now(), reviewed_revision = revision, feedback_seen_at = NULL
        WHERE id = ${answerId} AND revision = ${expectedRevision}
        RETURNING *
      `
    : await sql`
        UPDATE practice_answers
        SET feedback = NULL, feedback_at = NULL, reviewed_revision = NULL, feedback_seen_at = NULL
        WHERE id = ${answerId} AND revision = ${expectedRevision}
        RETURNING *
      `;
  if (rows[0]) return { ok: true as const, answer: rows[0] as PracticeAnswerRow };
  const current = await sql`SELECT * FROM practice_answers WHERE id = ${answerId}`;
  return { ok: false as const, current: (current[0] as PracticeAnswerRow | undefined) ?? null };
}
