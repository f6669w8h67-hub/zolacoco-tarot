// Zolacoco 覺察卡: who may write answers, and the records saved on this device.
// Drawing a card, the reading, the question and the practice are open to everyone; only
// members with access (Active, Expiring, Admin) can write an answer and keep it.
// Records stay in this browser, one list per member id, so another member signing in on
// the same phone never sees them. The key holds only the member's id, never a name or email.

export const AWARENESS_RECORDS_PREFIX = "zolacoco-awareness-records-v1";
export const AWARENESS_RECORDS_LIMIT = 200;

export type AwarenessRecord = {
  id: string;
  createdAt: string;
  deck: "zolacoco-awareness";
  cardId: string;
  cardNumber: string;
  theme: string;
  name: string;
  line: string;
  question: string;
  answer: string;
  practice: string;
  completed: boolean;
};

export type AwarenessMember = {
  id?: string | null;
  role?: string | null;
  effective_status?: string | null;
  access_expires_at?: string | null;
};

/** What the page shows below a card: the form, or which note. */
export type AwarenessAccess = "loading" | "member" | "pending" | "expired" | "guest" | "unavailable";

/** What one signed-in person may do here, and their records. `key` is who it belongs to. */
export type AwarenessSession = { key: string; access: AwarenessAccess; memberId: string | null; records: AwarenessRecord[] };

export function recordsKey(memberId: string) {
  return `${AWARENESS_RECORDS_PREFIX}:${memberId}`;
}

/** Same rule as the server (lib/membership-access hasMemberAccess): admin, or active with time left. */
export function awarenessAccess(member: AwarenessMember | null | undefined, now = Date.now()): Exclude<AwarenessAccess, "loading"> {
  if (!member) return "guest";
  if (member.role === "admin") return "member";
  if (member.effective_status === "pending") return "pending";
  if (member.effective_status === "active") {
    const expires = member.access_expires_at ? new Date(member.access_expires_at).getTime() : NaN;
    return Number.isFinite(expires) && expires > now ? "member" : "expired";
  }
  return "expired";
}

/**
 * What the page may show right now. A session only counts for the person it was loaded for:
 * after a sign-out or an account switch the old member's access and records are gone at once,
 * before anything new has loaded.
 */
export function currentSession(identityKey: string | null, session: AwarenessSession | null) {
  if (identityKey === null) return { access: "loading" as const, memberId: null, records: [] as AwarenessRecord[] };
  if (identityKey === "signed-out") return { access: "guest" as const, memberId: null, records: [] as AwarenessRecord[] };
  if (!session || session.key !== identityKey) return { access: "loading" as const, memberId: null, records: [] as AwarenessRecord[] };
  return { access: session.access, memberId: session.memberId, records: session.access === "member" ? session.records : [] };
}

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/** Writes the list; false when the browser refuses (full, private mode). Nothing is shown as saved unless this is true. */
export function writeRecords(storage: Storage, memberId: string, list: AwarenessRecord[]) {
  try {
    storage.setItem(recordsKey(memberId), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function readRecords(storage: Storage, memberId: string) {
  try {
    return parseRecords(storage.getItem(recordsKey(memberId)));
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is AwarenessRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.cardId === "string" && typeof row.createdAt === "string";
}

/** Reads a stored list; anything unreadable becomes an empty list instead of an error. */
export function parseRecords(raw: string | null | undefined): AwarenessRecord[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isRecord) : [];
  } catch {
    return [];
  }
}

/** Saving the same draw again replaces its record, so editing an answer never makes a duplicate. */
export function upsertRecord(list: AwarenessRecord[], record: AwarenessRecord) {
  return [record, ...list.filter((item) => item.id !== record.id)].slice(0, AWARENESS_RECORDS_LIMIT);
}

export function removeRecord(list: AwarenessRecord[], id: string) {
  return list.filter((item) => item.id !== id);
}

/** 2026-11-14 in Taiwan time, for file names and the share card. */
export function taipeiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return parts;
}

export function shareFileName(cardNumber: string, date = new Date()) {
  return `zolacoco-awareness-${cardNumber}-${taipeiDate(date)}.png`;
}
