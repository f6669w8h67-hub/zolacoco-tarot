import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { membershipErrorResponse, requireActiveMember } from "@/lib/membership";
import { isClerkConfigured } from "@/lib/membership-access";

export type MemberDataAccess =
  | { ok: true; user: ChatGPTUser }
  | { ok: false; response: Response };

const noStore = { "Cache-Control": "no-store" };

// Journal, pendulum, astro-dice and activity records are keyed by the email in
// `oai-authenticated-user-email`. That header is not proof of identity on every
// runtime, so a caller may use these records only when it is a verified, active
// Clerk member and that member's email matches the header.
export async function authorizeMemberData(): Promise<MemberDataAccess> {
  if (!isClerkConfigured(process.env)) {
    return { ok: false, response: Response.json({ error: "MEMBERSHIP_NOT_CONFIGURED" }, { status: 503, headers: noStore }) };
  }

  const headerUser = await getChatGPTUser();
  if (!headerUser) {
    return { ok: false, response: Response.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: noStore }) };
  }

  try {
    const member = await requireActiveMember();
    if (member.email.trim().toLowerCase() !== headerUser.email.trim().toLowerCase()) {
      return { ok: false, response: Response.json({ error: "EMAIL_MISMATCH" }, { status: 403, headers: noStore }) };
    }
    return { ok: true, user: headerUser };
  } catch (error) {
    return { ok: false, response: membershipErrorResponse(error) };
  }
}
