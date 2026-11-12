import { membershipErrorResponse, syncCurrentMember } from "@/lib/membership";
import { validateProfileInput } from "@/lib/account-state";

import { notifyPendingMember } from "@/lib/member-activation-email";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const member = await syncCurrentMember();
    return Response.json({ member });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const member = await syncCurrentMember();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "資料格式不正確，請重新整理後再試一次。" }, { status: 400 });
    }
    // Same rules as the form: lengths, no control characters, and a real past date
    // (e.g. 2026-02-31 used to pass the regex and fail later in Postgres as a 500).
    const checked = validateProfileInput(body, Date.now());
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 });
    const { fullName, lineId, birthday } = checked.value;

    const { getSql } = await import("@/lib/membership");
    const sql = getSql();
    const rows = await sql`
      UPDATE members
      SET full_name = ${fullName}, line_id = ${lineId}, birthday = ${birthday}::date
      WHERE id = ${member.id}
      RETURNING *,
        CASE
          WHEN role = 'admin' THEN 'active'
          WHEN status = 'active' AND access_expires_at <= now() THEN 'expired'
          ELSE status
        END AS effective_status
    `;
    if (rows[0]?.role === "member" && rows[0].status === "pending") {
      await notifyPendingMember(sql, member.id);
    }
    return Response.json({ member: rows[0] });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
