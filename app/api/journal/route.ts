import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    day INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    card_id TEXT NOT NULL,
    card_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS journal_user_day_idx ON journal_entries (user_email, day)").run();
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  await ensureSchema();
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare("SELECT day, prompt, card_id AS cardId, card_name AS cardName, content, updated_at AS updatedAt FROM journal_entries WHERE user_email = ? ORDER BY day").bind(user.email).all();
  return Response.json({ entries: result.results });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json() as { day?: number; prompt?: string; cardId?: string; cardName?: string; content?: string };
  const day = Number(body.day);
  const content = String(body.content ?? "").trim();
  if (!Number.isInteger(day) || day < 1 || day > 7 || !content || content.length > 8000) return Response.json({ error: "筆記內容不完整" }, { status: 400 });
  await ensureSchema();
  const { env } = await import("cloudflare:workers");
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO journal_entries (user_email, user_name, day, prompt, card_id, card_name, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_email, day) DO UPDATE SET prompt=excluded.prompt, card_id=excluded.card_id, card_name=excluded.card_name, content=excluded.content, user_name=excluded.user_name, updated_at=excluded.updated_at`)
    .bind(user.email, user.fullName ?? user.displayName, day, String(body.prompt ?? ""), String(body.cardId ?? ""), String(body.cardName ?? ""), content, now, now).run();
  return Response.json({ saved: true, updatedAt: now });
}
