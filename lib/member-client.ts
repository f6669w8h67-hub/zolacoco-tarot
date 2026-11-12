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

export async function loadMemberProfile(
  fetchImpl: Fetch = fetch,
): Promise<{ ok: true; member: ClientMember } | { ok: false }> {
  try {
    const response = await fetchImpl("/api/membership/me", { cache: "no-store" });
    if (!response.ok) return { ok: false };
    const data = await readJson(response);
    if (!data?.member || typeof data.member !== "object") return { ok: false };
    return { ok: true, member: data.member as ClientMember };
  } catch {
    return { ok: false };
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
  body: { memberId: string; action: "activate" | "suspend" | "restore"; months: number },
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
