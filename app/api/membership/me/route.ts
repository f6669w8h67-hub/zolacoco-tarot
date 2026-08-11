import { membershipErrorResponse, syncCurrentMember } from "@/lib/membership";

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
    const body = (await request.json()) as { fullName?: string; lineId?: string; birthday?: string };
    const fullName = body.fullName?.trim() ?? "";
    const lineId = body.lineId?.trim() ?? "";
    const birthday = body.birthday?.trim() ?? "";

    if (!fullName || !lineId || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return Response.json({ error: "請完整填寫真實姓名、LINE 名稱／ID 與生日。" }, { status: 400 });
    }

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
    return Response.json({ member: rows[0] });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
