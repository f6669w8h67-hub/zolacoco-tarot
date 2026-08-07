import { redirect } from "next/navigation";
import Link from "next/link";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

type Entry = { id: number; user_email: string; user_name: string | null; day: number; prompt: string; card_name: string; content: string; updated_at: string };
type PendulumEntry = { id: number; user_email: string; user_name: string | null; question: string; result_label: string; category: string; note: string; created_at: string };

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  if (user.email.toLowerCase() !== (process.env.ADMIN_EMAIL ?? "").toLowerCase()) redirect("/");
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL, user_name TEXT, day INTEGER NOT NULL,
    prompt TEXT NOT NULL, card_id TEXT NOT NULL, card_name TEXT NOT NULL, content TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  const result = await env.DB.prepare("SELECT id, user_email, user_name, day, prompt, card_name, content, updated_at FROM journal_entries ORDER BY updated_at DESC").all<Entry>();
  const entries = result.results ?? [];
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pendulum_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL, user_name TEXT,
    question TEXT NOT NULL, result TEXT NOT NULL, result_label TEXT NOT NULL, created_at TEXT NOT NULL
  )`).run();
  const pendulumResult = await env.DB.prepare("SELECT id, user_email, user_name, question, result_label, category, note, created_at FROM pendulum_entries ORDER BY created_at DESC").all<PendulumEntry>();
  const pendulumEntries = pendulumResult.results ?? [];
  return <main className="admin-page"><div className="admin-top"><div><p className="eyebrow">ZOLACOCO TAROT · ADMIN</p><h1>會員探索紀錄後台</h1></div><div><Link href="/">返回網站</Link>　<a href="/signout-with-chatgpt?return_to=/">登出</a></div></div>
    <section className="admin-section"><h2>七日內在筆記</h2><p className="admin-summary">目前共收到 {entries.length} 篇筆記。這裡只供 Zola 查看，請妥善保護使用者的內在探索內容。</p>{entries.length === 0 ? <div className="admin-empty">目前還沒有使用者提交筆記。</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>使用者</th><th>天數／牌面</th><th>內在提問</th><th>筆記內容</th><th>更新時間</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{entry.user_name ?? "未提供名稱"}<br /><small>{entry.user_email}</small></td><td>DAY {entry.day}<br />{entry.card_name}</td><td>{entry.prompt}</td><td className="note-cell">{entry.content}</td><td>{new Date(entry.updated_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>)}</tbody></table></div>}</section>
    <section className="admin-section"><h2>靈擺問答紀錄</h2><p className="admin-summary">目前共收到 {pendulumEntries.length} 次已登入會員的靈擺提問。</p>{pendulumEntries.length === 0 ? <div className="admin-empty">目前還沒有會員儲存靈擺問答。</div> : <div className="admin-table-wrap"><table className="admin-table pendulum-admin-table"><thead><tr><th>使用者</th><th>分類／提問</th><th>靈擺結果</th><th>使用者感受</th><th>詢問時間</th></tr></thead><tbody>{pendulumEntries.map((entry) => <tr key={entry.id}><td>{entry.user_name ?? "未提供名稱"}<br /><small>{entry.user_email}</small></td><td className="note-cell"><small>{entry.category}</small><br />{entry.question}</td><td><b>{entry.result_label}</b></td><td className="note-cell">{entry.note || "—"}</td><td>{new Date(entry.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>)}</tbody></table></div>}</section>
  </main>;
}
