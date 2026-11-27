import { getSql, membershipErrorResponse, requireAdmin } from "@/lib/membership";
import { notifyMemberAccess } from "@/lib/member-emails";

/** Zola's private note: up to this many characters, line breaks kept, other control characters removed. */
export const ADMIN_NOTE_LIMIT = 500;

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
    // Zola's note, the latest email to the member and how often she uses the site (會員使用次數, the last
    // 30 days counted in Taipei days, today included) come along for the admin list only.
    const members = await sql`
      SELECT m.*,
        CASE
          WHEN m.role = 'admin' THEN 'active'
          WHEN m.status = 'active' AND m.access_expires_at <= now() THEN 'expired'
          ELSE m.status
        END AS effective_status,
        n.note AS admin_note,
        e.kind AS last_email_kind, e.status AS last_email_status, COALESCE(e.finished_at, e.attempted_at) AS last_email_at,
        u.usage_total, u.usage_30d, u.usage_days_30d, u.usage_last_at, uf.usage_by_feature
      FROM members m
      LEFT JOIN member_admin_notes n ON n.member_id = m.id
      LEFT JOIN LATERAL (
        SELECT kind, status, finished_at, attempted_at FROM member_email_log
        WHERE member_id = m.id ORDER BY attempted_at DESC LIMIT 1
      ) e ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(sum(n), 0)::int AS usage_total,
          COALESCE(sum(n) FILTER (WHERE day > (now() AT TIME ZONE 'Asia/Taipei')::date - 30), 0)::int AS usage_30d,
          (count(DISTINCT day) FILTER (WHERE day > (now() AT TIME ZONE 'Asia/Taipei')::date - 30))::int AS usage_days_30d,
          max(last_at) AS usage_last_at
        FROM member_usage WHERE member_id = m.id
      ) u ON true
      LEFT JOIN LATERAL (
        SELECT json_object_agg(feature, total) AS usage_by_feature
        FROM (SELECT feature, sum(n)::int AS total FROM member_usage WHERE member_id = m.id GROUP BY feature) f
      ) uf ON true
      ORDER BY CASE m.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END,
        m.created_at DESC
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
      action?: "activate" | "suspend" | "restore" | "student" | "coaching" | "note";
      months?: number;
      note?: unknown;
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

    if (action === "note") {
      if (typeof body.note !== "string") return Response.json({ error: "備註格式不正確。" }, { status: 400 });
      const note = body.note.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim();
      if (note.length > ADMIN_NOTE_LIMIT) return Response.json({ error: `備註最多 ${ADMIN_NOTE_LIMIT} 字。` }, { status: 400 });
      const saved = await sql`
        INSERT INTO member_admin_notes (member_id, note, updated_by) VALUES (${memberId}, ${note}, ${admin.email})
        ON CONFLICT (member_id) DO UPDATE SET note = EXCLUDED.note, updated_by = EXCLUDED.updated_by, updated_at = now()
        RETURNING note
      `;
      return Response.json({ note: saved[0]?.note ?? note });
    }

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
    // The membership is already changed; the email is a courtesy and never fails the action.
    const email = await notifyMemberAccess(sql, memberId, auditAction === "extended" ? "extended" : "activated");
    return Response.json({ member: updated[0][0], email });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
