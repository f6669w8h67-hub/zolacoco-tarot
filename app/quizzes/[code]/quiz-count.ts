// 心理測驗統計 (Zola 2026-11-26): tell the site that a reading was opened or 「私訊 Zola」 was tapped — once per
// phone per quiz, so opening the same reading again, or a refresh, does not count twice. Nothing about the
// visitor is sent, only the quiz, the kind of count and what she picked.
import type { QuizCountEvent } from "@/lib/quiz";

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type CountDeps = { storage: Storage | undefined; send: (body: string) => Promise<unknown> };

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
  };
}

const sentThisVisit = new Set<string>();

export function countOnce(code: string, event: QuizCountEvent, choice: string, deps: CountDeps = browserDeps()) {
  const key = `zq-count:${code}:${event}`;
  if (sentThisVisit.has(key)) return;
  sentThisVisit.add(key);
  try {
    if (deps.storage?.getItem(key)) return;
    deps.storage?.setItem(key, choice);
  } catch {
    // storage full or blocked (some private modes): this visit is still counted once
  }
  try {
    deps.send(JSON.stringify({ code, event, choice })).catch(() => {});
  } catch {
    // never let a count get in the way of the reading or of LINE
  }
}
