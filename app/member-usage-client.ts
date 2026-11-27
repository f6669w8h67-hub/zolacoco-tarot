// 會員使用次數 (lib/member-usage.ts): the pages call recordUse() when a tool has done its thing. This phone
// sends the same tool at most once per USAGE_WINDOW_MINUTES; the site keeps the same window itself, so a lost
// answer or a second tab never counts twice. A use is never in the way of the page: every failure is quiet.
import { USAGE_WINDOW_MINUTES, type UsageFeature } from "@/lib/member-usage";

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type Answer = { ok: boolean; status: number; json(): Promise<unknown> };
export type UsageDeps = { storage: Storage | undefined; send: (body: string) => Promise<Answer>; now: () => number };

function browserDeps(): UsageDeps {
  let storage: Storage | undefined;
  try {
    storage = globalThis.localStorage; // reading it can throw where storage is blocked
  } catch {
    storage = undefined;
  }
  return {
    storage,
    send: (body) => fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }),
    now: () => Date.now(),
  };
}

const inFlight = new Set<string>();
let signedOut = false; // this page load: the site said nobody is signed in, so stop asking

export function recordUse(feature: UsageFeature, deps: UsageDeps = browserDeps()) {
  if (signedOut) return;
  const key = `zu:${feature}`;
  if (inFlight.has(key)) return;
  const now = deps.now();
  try {
    const last = Number(deps.storage?.getItem(key) ?? 0);
    if (last && now - last < USAGE_WINDOW_MINUTES * 60_000) return;
  } catch {
    // blocked: the site's own window still keeps it to once
  }
  inFlight.add(key);
  let sent: Promise<Answer>;
  try {
    sent = deps.send(JSON.stringify({ feature }));
  } catch {
    inFlight.delete(key);
    return;
  }
  sent.then(async (response) => {
    if (!response.ok) return; // busy or refused: the next use tries again
    const body = (await response.json().catch(() => null)) as { reason?: string } | null;
    if (body?.reason === "signed-out") { signedOut = true; return; }
    try {
      deps.storage?.setItem(key, String(now));
    } catch {
      // full or blocked: the site's window still applies
    }
  }).catch(() => {}).finally(() => inFlight.delete(key));
}
