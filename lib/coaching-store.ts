// 七日塔羅筆記 × 陪跑: notes a 陪跑中 member chose to share with Zola, and Zola's replies, in Neon.
//
// - journal_cycles: one row per seven-day round. A round exists only after the member ticked
//   「同步給 Zola」(share_with_zola, shared_at): nothing is uploaded without that, and old notes kept
//   on the device are never sent by this code. The member can stop sharing a round at any time;
//   Zola then no longer sees it (the member still does).
// - journal_entries: at most one row per round and day (UNIQUE cycle_id, day). Editing a day updates
//   that row; `revision` goes up by one on every save, and a save names the revision it started from,
//   so a second tab can never silently overwrite newer words (no row updated → conflict).
// - Zola's reply records `reviewed_revision`, the note she was reading. A later edit by the member
//   keeps the reply and shows 回覆後已修改 to Zola and 「回覆寫於修改前」 to the member.
// - A round is complete (completed_at) once all seven days have a note, in any order and on any dates.
// - Members never write feedback / member_id / prompt_version: the routes pass only checked values.
// - Ending someone's 陪跑 does not delete anything.
import { getSql } from "@/lib/membership";

export type JournalCycleRow = {
  id: string;
  member_id: string;
  cycle_number: number;
  started_at: string;
  completed_at: string | null;
  share_with_zola: boolean;
  shared_at: string | null;
  created_at: string;
};

export type JournalEntryRow = {
  id: string;
  cycle_id: string;
  member_id: string;
  day: number;
  prompt_version: number;
  content: string;
  revision: number;
  feedback: string | null;
  feedback_at: string | null;
  reviewed_revision: number | null;
  feedback_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

let coachingSchemaPromise: Promise<void> | null = null;

export async function ensureCoachingSchema() {
  const sql = getSql();
  coachingSchemaPromise ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS journal_cycles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        cycle_number integer NOT NULL CHECK (cycle_number >= 1),
        started_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        share_with_zola boolean NOT NULL DEFAULT false,
        shared_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT journal_cycles_member_number UNIQUE (member_id, cycle_number)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cycle_id uuid NOT NULL REFERENCES journal_cycles(id) ON DELETE CASCADE,
        member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        day smallint NOT NULL CHECK (day BETWEEN 1 AND 7),
        prompt_version integer NOT NULL,
        content text NOT NULL,
        revision integer NOT NULL DEFAULT 1,
        feedback text,
        feedback_at timestamptz,
        reviewed_revision integer,
        feedback_seen_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT journal_entries_cycle_day UNIQUE (cycle_id, day)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS journal_entries_member_updated_idx ON journal_entries (member_id, updated_at DESC)`;
  })().catch((error) => {
    coachingSchemaPromise = null;
    throw error;
  });
  await coachingSchemaPromise;
}

const ROUND_LIMIT = 20;

/** The member's own rounds (newest first, shared or not) and every note in them. */
export async function listOwnJournal(memberId: string) {
  const sql = getSql();
  const cycles = (await sql`
    SELECT * FROM journal_cycles WHERE member_id = ${memberId} ORDER BY cycle_number DESC LIMIT ${ROUND_LIMIT}
  `) as JournalCycleRow[];
  const entries = cycles.length ? (await sql`
    SELECT * FROM journal_entries WHERE member_id = ${memberId} AND cycle_id = ANY(${cycles.map((cycle) => cycle.id)}::uuid[])
    ORDER BY day
  `) as JournalEntryRow[] : [];
  return { cycles, entries };
}

/**
 * Starts sharing a new round, with the member's consent. If a shared round is still open (not all
 * seven days written) that round comes back instead, so a double tap never opens two rounds.
 */
export async function startSharedCycle(memberId: string) {
  const sql = getSql();
  const open = async () => ((await sql`
    SELECT * FROM journal_cycles
    WHERE member_id = ${memberId} AND share_with_zola AND completed_at IS NULL
    ORDER BY cycle_number DESC LIMIT 1
  `)[0] as JournalCycleRow | undefined) ?? null;
  const existing = await open();
  if (existing) return { cycle: existing, created: false };
  const rows = await sql`
    INSERT INTO journal_cycles (member_id, cycle_number, share_with_zola, shared_at)
    SELECT ${memberId}::uuid, COALESCE(max(cycle_number), 0) + 1, true, now()
    FROM journal_cycles WHERE member_id = ${memberId}
    ON CONFLICT ON CONSTRAINT journal_cycles_member_number DO NOTHING
    RETURNING *
  `;
  if (rows[0]) return { cycle: rows[0] as JournalCycleRow, created: true };
  // Another tab started one at the same moment.
  const raced = await open();
  return raced ? { cycle: raced, created: false } : null;
}

/** The member takes a round back: Zola no longer sees it. Their notes and earlier replies stay. */
export async function stopSharingCycle(memberId: string, cycleId: string) {
  const sql = getSql();
  const rows = await sql`
    UPDATE journal_cycles SET share_with_zola = false
    WHERE id = ${cycleId} AND member_id = ${memberId}
    RETURNING *
  `;
  return (rows[0] as JournalCycleRow | undefined) ?? null;
}

export type EntryInput = { cycleId: string; day: number; content: string; promptVersion: number };

export type SaveEntryResult =
  | { ok: true; entry: JournalEntryRow; cycle: JournalCycleRow }
  | { ok: false; reason: "cycle" }
  | { ok: false; reason: "conflict"; current: JournalEntryRow | null };

/**
 * First save of a day: expectedRevision is null and the row must not exist yet. Later saves: the row
 * must still be at expectedRevision. Only the owner's own round, and only while it is shared.
 */
export async function saveEntry(memberId: string, input: EntryInput, expectedRevision: number | null): Promise<SaveEntryResult> {
  const sql = getSql();
  // Untyped parameters in an INSERT … SELECT list would be read as text, hence the casts.
  const rows = expectedRevision === null
    ? await sql`
        INSERT INTO journal_entries (cycle_id, member_id, day, prompt_version, content)
        SELECT c.id, c.member_id, ${input.day}::smallint, ${input.promptVersion}::integer, ${input.content}::text
        FROM journal_cycles c
        WHERE c.id = ${input.cycleId} AND c.member_id = ${memberId} AND c.share_with_zola
        ON CONFLICT ON CONSTRAINT journal_entries_cycle_day DO NOTHING
        RETURNING *
      `
    : await sql`
        UPDATE journal_entries e
        SET content = ${input.content}, prompt_version = ${input.promptVersion}, revision = e.revision + 1, updated_at = now()
        FROM journal_cycles c
        WHERE e.cycle_id = c.id AND c.share_with_zola AND c.member_id = ${memberId}
          AND e.cycle_id = ${input.cycleId} AND e.member_id = ${memberId} AND e.day = ${input.day} AND e.revision = ${expectedRevision}
        RETURNING e.*
      `;
  if (rows[0]) {
    // Complete once all seven days have a note. Saving again later changes nothing here.
    await sql`
      UPDATE journal_cycles SET completed_at = now()
      WHERE id = ${input.cycleId} AND completed_at IS NULL
        AND (SELECT count(*) FROM journal_entries WHERE cycle_id = ${input.cycleId} AND content <> '') = 7
    `;
    const cycle = await sql`SELECT * FROM journal_cycles WHERE id = ${input.cycleId}`;
    return { ok: true, entry: rows[0] as JournalEntryRow, cycle: cycle[0] as JournalCycleRow };
  }
  const cycle = await sql`SELECT id FROM journal_cycles WHERE id = ${input.cycleId} AND member_id = ${memberId} AND share_with_zola`;
  if (!cycle[0]) return { ok: false, reason: "cycle" };
  const current = await sql`SELECT * FROM journal_entries WHERE cycle_id = ${input.cycleId} AND member_id = ${memberId} AND day = ${input.day}`;
  return { ok: false, reason: "conflict", current: (current[0] as JournalEntryRow | undefined) ?? null };
}

/** Only the owner, and only a note that has a reply. */
export async function markEntryFeedbackSeen(memberId: string, entryId: string) {
  const sql = getSql();
  const rows = await sql`
    UPDATE journal_entries SET feedback_seen_at = now()
    WHERE id = ${entryId} AND member_id = ${memberId} AND feedback_at IS NOT NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export type CoachingMemberRow = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  is_coaching: boolean;
  cycle_number: number | null;
  days: number | null;
  completed_at: string | null;
  entries: number;
  waiting: number;
  changed: number;
  unseen: number;
  last_entry_at: string | null;
};

/**
 * 陪跑中 members, and former ones who still share notes. Counts cover shared rounds only:
 * waiting = never replied; changed = edited after a reply; unseen = a reply the member has not read.
 * cycle_number / days describe the newest shared round.
 */
export async function listCoachingMembers() {
  const sql = getSql();
  return (await sql`
    SELECT m.id, m.email, m.full_name, m.status, m.is_coaching,
      latest.cycle_number, latest.days, latest.completed_at,
      count(e.id)::int AS entries,
      (count(e.id) FILTER (WHERE e.feedback_at IS NULL))::int AS waiting,
      (count(e.id) FILTER (WHERE e.feedback_at IS NOT NULL AND e.revision > e.reviewed_revision))::int AS changed,
      (count(e.id) FILTER (WHERE e.feedback_at IS NOT NULL AND e.feedback_seen_at IS NULL))::int AS unseen,
      max(e.updated_at) AS last_entry_at
    FROM members m
    LEFT JOIN journal_cycles c ON c.member_id = m.id AND c.share_with_zola
    LEFT JOIN journal_entries e ON e.cycle_id = c.id
    LEFT JOIN LATERAL (
      SELECT lc.cycle_number, lc.completed_at,
        (SELECT count(*)::int FROM journal_entries le WHERE le.cycle_id = lc.id) AS days
      FROM journal_cycles lc
      WHERE lc.member_id = m.id AND lc.share_with_zola
      ORDER BY lc.cycle_number DESC LIMIT 1
    ) latest ON true
    WHERE m.role = 'member' AND (m.is_coaching OR c.id IS NOT NULL)
    GROUP BY m.id, latest.cycle_number, latest.days, latest.completed_at
    ORDER BY max(e.updated_at) DESC NULLS LAST, m.created_at DESC
  `) as CoachingMemberRow[];
}

/** One member's shared rounds and their notes. Rounds the member did not share never leave Neon. */
export async function listSharedJournal(memberId: string) {
  const sql = getSql();
  const cycles = (await sql`
    SELECT * FROM journal_cycles WHERE member_id = ${memberId} AND share_with_zola
    ORDER BY cycle_number DESC LIMIT ${ROUND_LIMIT}
  `) as JournalCycleRow[];
  const entries = cycles.length ? (await sql`
    SELECT * FROM journal_entries WHERE cycle_id = ANY(${cycles.map((cycle) => cycle.id)}::uuid[])
    ORDER BY day
  `) as JournalEntryRow[] : [];
  return { cycles, entries };
}

/**
 * Zola's reply to the note she is reading (expectedRevision), on shared rounds only. If the member
 * changed it in the meantime nothing is written and the current note comes back. An empty reply
 * removes the reply.
 */
export async function saveEntryFeedback(entryId: string, feedback: string, expectedRevision: number) {
  const sql = getSql();
  const rows = feedback
    ? await sql`
        UPDATE journal_entries e
        SET feedback = ${feedback}, feedback_at = now(), reviewed_revision = e.revision, feedback_seen_at = NULL
        FROM journal_cycles c
        WHERE e.id = ${entryId} AND e.cycle_id = c.id AND c.share_with_zola AND e.revision = ${expectedRevision}
        RETURNING e.*
      `
    : await sql`
        UPDATE journal_entries e
        SET feedback = NULL, feedback_at = NULL, reviewed_revision = NULL, feedback_seen_at = NULL
        FROM journal_cycles c
        WHERE e.id = ${entryId} AND e.cycle_id = c.id AND c.share_with_zola AND e.revision = ${expectedRevision}
        RETURNING e.*
      `;
  if (rows[0]) return { ok: true as const, entry: rows[0] as JournalEntryRow };
  const current = await sql`
    SELECT e.* FROM journal_entries e JOIN journal_cycles c ON c.id = e.cycle_id
    WHERE e.id = ${entryId} AND c.share_with_zola
  `;
  return { ok: false as const, current: (current[0] as JournalEntryRow | undefined) ?? null };
}
