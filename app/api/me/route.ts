import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ user: null });
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_users (
    user_email TEXT PRIMARY KEY, user_name TEXT, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL
  )`).run();
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO site_users (user_email,user_name,first_seen_at,last_seen_at) VALUES (?,?,?,?)
    ON CONFLICT(user_email) DO UPDATE SET user_name=excluded.user_name,last_seen_at=excluded.last_seen_at`)
    .bind(user.email, user.fullName ?? user.displayName, now, now).run();
  return Response.json({ user: { ...user, isAdmin: user.email.toLowerCase() === (process.env.ADMIN_EMAIL ?? "").toLowerCase() } });
}
