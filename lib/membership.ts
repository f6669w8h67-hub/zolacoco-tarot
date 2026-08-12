import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { auth, currentUser } from "@clerk/nextjs/server";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "lococo0409@gmail.com").trim().toLowerCase();

export type MembershipStatus = "pending" | "active" | "suspended" | "expired";

export type Membership = {
  id: string;
  clerk_user_id: string | null;
  email: string;
  full_name: string | null;
  line_id: string | null;
  birthday: string | null;
  role: "admin" | "member";
  status: MembershipStatus;
  effective_status: MembershipStatus;
  access_starts_at: string | null;
  access_expires_at: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
};

let sqlClient: NeonQueryFunction<false, false> | null = null;
let membershipSchemaPromise: Promise<void> | null = null;

export function isMembershipConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
}

export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  sqlClient ??= neon(process.env.DATABASE_URL);
  return sqlClient;
}

export async function ensureMembershipSchema() {
  const sql = getSql();

  membershipSchemaPromise ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_user_id text UNIQUE,
        email text NOT NULL,
        full_name text,
        line_id text,
        birthday date,
        role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
        status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'expired')),
        access_starts_at timestamptz,
        access_expires_at timestamptz,
        suspended_at timestamptz,
        last_login_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT members_access_window_valid CHECK (
          access_expires_at IS NULL OR access_starts_at IS NULL OR access_expires_at > access_starts_at
        )
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS members_email_lower_idx ON members (lower(email))`;
    await sql`CREATE INDEX IF NOT EXISTS members_status_expiry_idx ON members (status, access_expires_at)`;
    await sql`
      CREATE TABLE IF NOT EXISTS member_access_audit (
        id bigserial PRIMARY KEY,
        member_id uuid REFERENCES members(id) ON DELETE SET NULL,
        admin_email text NOT NULL,
        action text NOT NULL CHECK (action IN ('created', 'activated', 'extended', 'suspended', 'restored', 'expired', 'updated', 'deleted')),
        months_delta integer,
        previous_status text,
        new_status text,
        previous_expires_at timestamptz,
        new_expires_at timestamptz,
        note text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS member_access_audit_member_created_idx
      ON member_access_audit (member_id, created_at DESC)
    `;
  })().catch((error) => {
    membershipSchemaPromise = null;
    throw error;
  });

  await membershipSchemaPromise;
}

export function isAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function getIdentity() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const primary = user?.emailAddresses.find((item) => item.id === user.primaryEmailAddressId);
  const email = (primary?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? "").trim().toLowerCase();
  if (!email) return null;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || null;
  return { userId, email, fullName };
}

export async function requireIdentity() {
  const identity = await getIdentity();
  if (!identity) throw new MembershipError("UNAUTHENTICATED", 401);
  return identity;
}

export async function syncCurrentMember(): Promise<Membership> {
  const identity = await requireIdentity();
  await ensureMembershipSchema();
  const sql = getSql();
  const admin = isAdminEmail(identity.email);

  const rows = await sql`
    INSERT INTO members (clerk_user_id, email, full_name, role, status, last_login_at)
    VALUES (
      ${identity.userId},
      ${identity.email},
      ${identity.fullName},
      ${admin ? "admin" : "member"},
      ${admin ? "active" : "pending"},
      now()
    )
    ON CONFLICT ((lower(email))) DO UPDATE SET
      clerk_user_id = EXCLUDED.clerk_user_id,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), members.full_name),
      role = CASE WHEN lower(EXCLUDED.email) = ${ADMIN_EMAIL} THEN 'admin' ELSE members.role END,
      status = CASE WHEN lower(EXCLUDED.email) = ${ADMIN_EMAIL} THEN 'active' ELSE members.status END,
      last_login_at = now()
    RETURNING *,
      CASE
        WHEN role = 'admin' THEN 'active'
        WHEN status = 'active' AND access_expires_at <= now() THEN 'expired'
        ELSE status
      END AS effective_status
  `;

  const member = rows[0] as Membership;
  if (member.role !== "admin" && member.status === "active" && member.effective_status === "expired") {
    const expired = await sql`
      UPDATE members SET status = 'expired'
      WHERE id = ${member.id} AND status = 'active' AND access_expires_at <= now()
      RETURNING *, 'expired'::text AS effective_status
    `;
    if (expired[0]) {
      await sql`
        INSERT INTO member_access_audit (member_id, admin_email, action, previous_status, new_status, previous_expires_at, new_expires_at, note)
        SELECT ${member.id}, ${ADMIN_EMAIL}, 'expired', 'active', 'expired', access_expires_at, access_expires_at, 'Automatically expired at access check'
        FROM members
        WHERE id = ${member.id}
          AND NOT EXISTS (
            SELECT 1 FROM member_access_audit
            WHERE member_id = ${member.id} AND action = 'expired' AND new_expires_at = members.access_expires_at
          )
      `;
      return expired[0] as Membership;
    }
  }
  return member;
}

export async function requireAdmin() {
  const member = await syncCurrentMember();
  if (member.role !== "admin" || !isAdminEmail(member.email)) {
    throw new MembershipError("FORBIDDEN", 403);
  }
  return member;
}

export async function requireActiveMember() {
  const member = await syncCurrentMember();
  if (member.role === "admin") return member;
  if (member.effective_status !== "active") {
    throw new MembershipError(member.effective_status.toUpperCase(), 403);
  }
  return member;
}

export class MembershipError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export function membershipErrorResponse(error: unknown) {
  if (error instanceof MembershipError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("membership_error", error);
  return Response.json({ error: "MEMBERSHIP_SERVICE_ERROR" }, { status: 500 });
}
