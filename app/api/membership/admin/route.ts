import { getSql, membershipErrorResponse, requireAdmin } from "@/lib/membership";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const sql = getSql();
    await sql`
      UPDATE members
      SET status = 'expired'
      WHERE role = 'member' AND status = 'active' AND access_expires_at <= now()
    `;
    const members = await sql`
      SELECT *,
        CASE
          WHEN role = 'admin' THEN 'active'
          WHEN status = 'active' AND access_expires_at <= now() THEN 'expired'
          ELSE status
        END AS effective_status
      FROM members
      ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END,
        created_at DESC
    `;
    return Response.json({ members });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as {
      memberId?: string;
      action?: "activate" | "suspend" | "restore" | "student" | "coaching";
      months?: number;
      student?: boolean;
      coaching?: boolean;
    };
    const memberId = body.memberId?.trim();
    const action = body.action;
    if (!memberId || !action) return Response.json({ error: "操作資料不完整。" }, { status: 400 });
    if (memberId === admin.id) return Response.json({ error: "管理員帳號不能在此停權。" }, { status: 400 });

    const sql = getSql();
    const currentRows = await sql`SELECT * FROM members WHERE id = ${memberId} AND role = 'member'`;
    const current = currentRows[0] as Record<string, unknown> | undefined;
    if (!current) return Response.json({ error: "找不到這位會員。" }, { status: 404 });

    // 學員練習室: Zola marks or unmarks her student. Separate from VIP months; logged with the value
    // before and after, in the same statement as the change; sending the current value changes nothing.
    if (action === "student") {
      if (typeof body.student !== "boolean") return Response.json({ error: "學員設定不正確。" }, { status: 400 });
      const student = body.student;
      if (Boolean(current.is_student) === student) return Response.json({ member: current, unchanged: true });
      await sql`
        WITH updated AS (
          UPDATE members SET is_student = ${student}
          WHERE id = ${memberId} AND role = 'member' AND is_student IS DISTINCT FROM ${student}
          RETURNING id, status, access_expires_at
        )
        INSERT INTO member_access_audit (member_id, admin_email, action, previous_status, new_status, previous_expires_at, new_expires_at, previous_student, new_student, note)
        SELECT id, ${admin.email}, 'updated', status, status, access_expires_at, access_expires_at, ${!student}, ${student}, 'student'
        FROM updated
      `;
      const rows = await sql`SELECT * FROM members WHERE id = ${memberId}`;
      return Response.json({ member: rows[0] });
    }

    // 七日塔羅筆記 × 陪跑: Zola marks or ends 陪跑中. Same rules as the student switch: separate from VIP
    // months, audited before/after in the same statement, the current value again changes nothing.
    // Ending 陪跑 keeps the member's notes and Zola's replies.
    if (action === "coaching") {
      if (typeof body.coaching !== "boolean") return Response.json({ error: "陪跑設定不正確。" }, { status: 400 });
      const coaching = body.coaching;
      if (Boolean(current.is_coaching) === coaching) return Response.json({ member: current, unchanged: true });
      await sql`
        WITH updated AS (
          UPDATE members SET is_coaching = ${coaching}
          WHERE id = ${memberId} AND role = 'member' AND is_coaching IS DISTINCT FROM ${coaching}
          RETURNING id, status, access_expires_at
        )
        INSERT INTO member_access_audit (member_id, admin_email, action, previous_status, new_status, previous_expires_at, new_expires_at, previous_coaching, new_coaching, note)
        SELECT id, ${admin.email}, 'updated', status, status, access_expires_at, access_expires_at, ${!coaching}, ${coaching}, 'coaching'
        FROM updated
      `;
      const rows = await sql`SELECT * FROM members WHERE id = ${memberId}`;
      return Response.json({ member: rows[0] });
    }

    if (action === "suspend") {
      const updated = await sql.transaction((tx) => [
        tx`UPDATE members SET status = 'suspended', suspended_at = now() WHERE id = ${memberId} RETURNING *`,
        tx`INSERT INTO member_access_audit (member_id, admin_email, action, previous_status, new_status, previous_expires_at, new_expires_at)
           VALUES (${memberId}, ${admin.email}, 'suspended', ${String(current.status)}, 'suspended', ${current.access_expires_at as string | null}, ${current.access_expires_at as string | null})`,
      ]);
      return Response.json({ member: updated[0][0] });
    }

    if (action === "restore") {
      const nextStatus = current.access_expires_at && new Date(String(current.access_expires_at)) > new Date() ? "active" : "expired";
      const updated = await sql.transaction((tx) => [
        tx`UPDATE members SET status = ${nextStatus}, suspended_at = NULL WHERE id = ${memberId} RETURNING *`,
        tx`INSERT INTO member_access_audit (member_id, admin_email, action, previous_status, new_status, previous_expires_at, new_expires_at)
           VALUES (${memberId}, ${admin.email}, 'restored', ${String(current.status)}, ${nextStatus}, ${current.access_expires_at as string | null}, ${current.access_expires_at as string | null})`,
      ]);
      return Response.json({ member: updated[0][0] });
    }

    const months = Number(body.months);
    if (!Number.isInteger(months) || months < 1 || months > 12) {
      return Response.json({ error: "請選擇 1～12 個月。" }, { status: 400 });
    }
    const auditAction = current.status === "active" && current.access_expires_at && new Date(String(current.access_expires_at)) > new Date() ? "extended" : "activated";
    const updated = await sql.transaction((tx) => [
      tx`UPDATE members
         SET status = 'active',
             access_starts_at = CASE WHEN status = 'active' AND access_expires_at > now() THEN COALESCE(access_starts_at, now()) ELSE now() END,
             access_expires_at = (CASE WHEN status = 'active' AND access_expires_at > now() THEN access_expires_at ELSE now() END) + (${months} * interval '1 month'),
             suspended_at = NULL
         WHERE id = ${memberId}
         RETURNING *`,
      tx`INSERT INTO member_access_audit (member_id, admin_email, action, months_delta, previous_status, new_status, previous_expires_at, new_expires_at)
         SELECT ${memberId}, ${admin.email}, ${auditAction}, ${months}, ${String(current.status)}, 'active', ${current.access_expires_at as string | null}, access_expires_at
         FROM members WHERE id = ${memberId}`,
    ]);
    return Response.json({ member: updated[0][0] });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
