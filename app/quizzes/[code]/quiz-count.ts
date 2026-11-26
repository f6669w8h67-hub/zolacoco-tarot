// 心理測驗統計 (Zola 2026-11-26): tell the site that a reading was opened or 「私訊 Zola」 was tapped — once per
// phone per quiz, so opening the same reading again, or a refresh, does not count twice. Nothing about the
// visitor is sent, only the quiz, the kind of count, what she picked and a random id for this one count.
// A count is marked done only once the site has answered; until then it stays waiting and is sent again (with
// the same id, so the site counts it once) the next time this quiz is opened (ChatGPT review on #63).
import { QUIZ_COUNT_EVENTS, type QuizCountEvent } from "@/lib/quiz";

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type Answer = { ok: boolean; status: number };
export type CountDeps = { storage: Storage | undefined; send: (body: string) => Promise<Answer>; newId: () => string };
type Entry = { id: string; choice: string; done?: true };

function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function browserDeps(): CountDeps {
  let storage: Storage | undefined;
  try {
    storage = globalThis.localStorage; // reading it can throw where storage is blocked
  } catch {
    storage = undefined;
  }
  return {
    storage,
    // keepalive: 「私訊 Zola」 leaves for LINE right away, and the count must still get there
    send: (body) => fetch("/api/quizzes/count", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }),
    newId: randomId,
  };
}

// where storage is blocked, this visit still counts once
const memory = new Map<string, string>();
const inFlight = new Set<string>();

function load(deps: CountDeps, key: string): Entry | null {
  let raw: string | null = memory.get(key) ?? null;
  try {
    raw = deps.storage?.getItem(key) ?? raw;
  } catch {
    // blocked: what this visit remembers is all there is
  }
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as Entry;
    return typeof entry?.id === "string" && typeof entry.choice === "string" ? entry : null;
  } catch {
    return null;
  }
}

function keep(deps: CountDeps, key: string, entry: Entry) {
  const raw = JSON.stringify(entry);
  memory.set(key, raw);
  try {
    deps.storage?.setItem(key, raw);
  } catch {
    // full or blocked: kept for this visit only
  }
}

function send(code: string, event: QuizCountEvent, key: string, entry: Entry, deps: CountDeps) {
  if (inFlight.has(key)) return;
  inFlight.add(key);
  let answer: Promise<Answer>;
  try {
    answer = deps.send(JSON.stringify({ code, event, choice: entry.choice, id: entry.id }));
  } catch {
    inFlight.delete(key);
    return; // never let a count get in the way of the reading or of LINE
  }
  answer.then((response) => {
    // counted (or not counted on purpose: Zola herself, a quiz she could not open): done. Busy, limited,
    // offline: it waits and is sent again later with the same id.
    if (response.ok || response.status === 400 || response.status === 403 || response.status === 404) keep(deps, key, { ...entry, done: true });
  }).catch(() => {}).finally(() => inFlight.delete(key));
}

export function countOnce(code: string, event: QuizCountEvent, choice: string, deps: CountDeps = browserDeps()) {
  const key = `zq-count:${code}:${event}`;
  let entry = load(deps, key);
  if (entry?.done) return;
  if (!entry) {
    entry = { id: deps.newId(), choice };
    keep(deps, key, entry);
  }
  send(code, event, key, entry, deps);
}

/** On opening a quiz: send again whatever of it did not get through last time. */
export function retryWaiting(code: string, deps: CountDeps = browserDeps()) {
  for (const event of QUIZ_COUNT_EVENTS) {
    const key = `zq-count:${code}:${event}`;
    const entry = load(deps, key);
    if (entry && !entry.done) send(code, event, key, entry, deps);
  }
}
