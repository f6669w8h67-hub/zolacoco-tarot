// 會員使用次數 (lib/member-usage.ts): the pages call recordUse() when a tool has done its thing. The site
// decides what counts (the same tool within USAGE_WINDOW_MINUTES once, across midnight too); this phone only
// saves itself the trip, and keeps that memory per account, so two accounts on one phone never share it
// (ChatGPT review on #65). Who is signed in comes from ClerkIdentityProvider (app/auth-identity.tsx); nobody
// signed in: nothing is sent. A use is never in the way of the page: every failure is quiet.
import { USAGE_WINDOW_MINUTES, type UsageFeature } from "@/lib/member-usage";

type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
type Answer = { ok: boolean; status: number; json(): Promise<unknown> };
export type UsageDeps = { storage: Storage | undefined; send: (body: string) => Promise<Answer>; now: () => number };

/** null while sign-in loads, "signed-out", "unknown" (no sign-in on this site), or the account's Clerk id. */
let identity: string | null = null;

export function setUsageIdentity(key: string | null) {
  identity = key;
}

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

/** A short tag for the account, so the phone's memory is kept apart per account without keeping its id. */
function accountTag(id: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}

const inFlight = new Set<string>();

export function recordUse(feature: UsageFeature, deps: UsageDeps = browserDeps(), who: string | null = identity) {
  if (who === "signed-out" || who === "unknown") return; // visitors are not counted
  // while sign-in is still loading nobody's memory applies: send, and let the site decide
  const key = who ? `zu:${accountTag(who)}:${feature}` : null;
  const flight = key ?? `zu:?:${feature}`;
  if (inFlight.has(flight)) return;
  const now = deps.now();
  if (key) {
    try {
      const last = Number(deps.storage?.getItem(key) ?? 0);
      if (last && now - last < USAGE_WINDOW_MINUTES * 60_000) return;
    } catch {
      // blocked: the site's own window still keeps it to once
    }
  }
  inFlight.add(flight);
  let sent: Promise<Answer>;
  try {
    sent = deps.send(JSON.stringify({ feature }));
  } catch {
    inFlight.delete(flight);
    return;
  }
  sent.then(async (response) => {
    if (!response.ok || !key) return; // busy or refused: the next use tries again
    const body = (await response.json().catch(() => null)) as { counted?: boolean; reason?: string } | null;
    // remembered only when this account's use is counted, or was within the window already
    if (body?.counted !== true && body?.reason !== "recent") return;
    try {
      deps.storage?.setItem(key, String(now));
    } catch {
      // full or blocked: the site's window still applies
    }
  }).catch(() => {}).finally(() => inFlight.delete(flight));
}
