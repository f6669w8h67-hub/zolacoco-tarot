import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_activity_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS activity_user_created_idx ON user_activity_entries (user_email, created_at)").run();
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ saved: false }, { status: 401 });
  const body = await request.json() as { type?: string; title?: string; summary?: string; details?: unknown };
  const type = String(body.type ?? "").trim().slice(0, 50);
  const title = String(body.title ?? "").trim().slice(0, 120);
  const summary = String(body.summary ?? "").trim().slice(0, 1200);
  if (!type || !title) return Response.json({ error: "紀錄不完整" }, { status: 400 });
  let details = "{}";
  try { details = JSON.stringify(body.details ?? {}).slice(0, 16000); } catch { /* keep empty object */ }
  await ensureSchema();
  const { env } = await import("cloudflare:workers");
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO user_activity_entries (user_email,user_name,activity_type,title,summary,details,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(user.email, user.fullName ?? user.displayName, type, title, summary, details, now).run();
  return Response.json({ saved: true, createdAt: now });
}
