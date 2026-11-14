// Client-side helpers for the membership screens. They separate "the server said no"
// from "we could not reach the server", so a failed request is never shown as
// "not yet activated". Each helper returns a result instead of throwing.

export type ClientMember = {
  id?: string;
  email: string;
  full_name: string | null;
  line_id: string | null;
  birthday: string | null;
  role: "admin" | "member";
  effective_status: "pending" | "active" | "suspended" | "expired";
  /** Zola's student (學員練習室); older responses may not have it yet. */
  is_student?: boolean;
  /** 陪跑中 (七日塔羅筆記 × 陪跑); older responses may not have it yet. */
  is_coaching?: boolean;
  access_expires_at: string | null;
  created_at?: string;
};

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

// Server error codes such as "MEMBERSHIP_SERVICE_ERROR" are for logs, not people.
// Show a message only when it is Chinese text written for the member.
function humanMessage(text: unknown, fallback: string) {
  return typeof text === "string" && /[^\x00-\x7f]/.test(text) ? text : fallback;
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value = await response.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Why the account could not be loaded. Only a few server answers need their own
 * screen; everything else (network, 500, HTML from a proxy) is "UNAVAILABLE".
 */
export type MemberLoadFailure =
  | "EMAIL_NOT_VERIFIED"
  | "EMAIL_ALREADY_LINKED"
  | "MEMBERSHIP_NOT_CONFIGURED"
  | "UNAUTHENTICATED"
  | "UNAVAILABLE";

const knownFailures: Record<number, MemberLoadFailure | undefined> = {
  401: "UNAUTHENTICATED",
  403: "EMAIL_NOT_VERIFIED",
  409: "EMAIL_ALREADY_LINKED",
  503: "MEMBERSHIP_NOT_CONFIGURED",
};

export async function loadMemberProfile(
  fetchImpl: Fetch = fetch,
): Promise<{ ok: true; member: ClientMember } | { ok: false; failure: MemberLoadFailure }> {
  try {
    const response = await fetchImpl("/api/membership/me", { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) {
      // Trust the status only together with the matching code, so an unrelated 403/409/503
      // (e.g. from a proxy) is still shown as a temporary problem.
      const failure = knownFailures[response.status];
      const matches = failure === "UNAUTHENTICATED" || (failure && data?.error === failure);
      return { ok: false, failure: matches ? failure : "UNAVAILABLE" };
    }
    if (!data?.member || typeof data.member !== "object") return { ok: false, failure: "UNAVAILABLE" };
    return { ok: true, member: data.member as ClientMember };
  } catch {
    return { ok: false, failure: "UNAVAILABLE" };
  }
}

export async function saveMemberProfile(
  body: { fullName: string; lineId: string; birthday: string },
  fetchImpl: Fetch = fetch,
): Promise<{ ok: true; member: ClientMember } | { ok: false; message: string }> {
  const fallback = "儲存失敗，請稍後再試。";
  try {
    const response = await fetchImpl("/api/membership/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readJson(response);
    if (!response.ok) {
      return { ok: false, message: response.status >= 500 ? fallback : humanMessage(data?.error, fallback) };
    }
    if (!data?.member || typeof data.member !== "object") {
      return { ok: false, message: "無法確認資料是否已儲存，請重新整理後再確認。" };
    }
    return { ok: true, member: data.member as ClientMember };
  } catch {
    return { ok: false, message: "網路連線不穩，資料尚未確認儲存。請稍後再試。" };
  }
}

export async function runMemberAction(
  body: { memberId: string; action: "activate" | "suspend" | "restore"; months: number } | { memberId: string; action: "student"; student: boolean } | { memberId: string; action: "coaching"; coaching: boolean },
  fetchImpl: Fetch = fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fallback = "操作失敗，請稍後再試。";
  try {
    const response = await fetchImpl("/api/membership/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readJson(response);
    if (!response.ok) {
      return { ok: false, message: response.status >= 500 ? fallback : humanMessage(data?.error, fallback) };
    }
    return { ok: true };
  } catch {
    // The request may have reached the server before the connection failed.
    return { ok: false, message: "網路連線不穩，操作尚未確認完成。請重新整理後確認會員狀態。" };
  }
}
