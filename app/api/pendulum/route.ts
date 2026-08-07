import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pendulum_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    question TEXT NOT NULL,
    result TEXT NOT NULL,
    result_label TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json() as { question?: string; result?: string; resultLabel?: string; category?: string; note?: string };
  const question = String(body.question ?? "").trim();
  const result = String(body.result ?? "").trim().slice(0, 40);
  const legacyLabels: Record<string, string> = { yes: "是", no: "否", unclear: "目前不明確" };
  const resultLabel = String(body.resultLabel ?? legacyLabels[result] ?? "").trim().slice(0, 80);
  if (!question || question.length > 180 || !result || !resultLabel) return Response.json({ error: "問題或結果不完整" }, { status: 400 });
  await ensureSchema();
  const { env } = await import("cloudflare:workers");
  const now = new Date().toISOString();
  const category = String(body.category ?? "內在指引").slice(0, 24);
  const note = String(body.note ?? "").trim().slice(0, 500);
  await env.DB.prepare(`INSERT INTO pendulum_entries (user_email, user_name, question, result, result_label, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(user.email, user.fullName ?? user.displayName, question, result, resultLabel, category, note, now).run();
  return Response.json({ saved: true, createdAt: now });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });
  await ensureSchema();
  const { env } = await import("cloudflare:workers");
  const result = await env.DB.prepare(`SELECT id, question, result, result_label, category, note, created_at FROM pendulum_entries WHERE user_email = ? ORDER BY created_at DESC LIMIT 20`).bind(user.email).all();
  return Response.json({ entries: result.results ?? [] });
}
