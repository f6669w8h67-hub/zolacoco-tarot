import { redirect } from "next/navigation";
import Link from "next/link";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

type Entry = { id: number; user_email: string; user_name: string | null; day: number; prompt: string; card_name: string; content: string; updated_at: string };
type PendulumEntry = { id: number; user_email: string; user_name: string | null; question: string; result_label: string; category: string; note: string; created_at: string };
type AstroDiceEntry = { id:number; user_email:string; user_name:string|null; question:string; category:string; planet_name:string; sign_name:string; house_name:string; note:string; created_at:string };
type ActivityEntry = { id:number; user_email:string; user_name:string|null; activity_type:string; title:string; summary:string; details:string; created_at:string };
type SiteUser = { user_email:string; user_name:string|null; first_seen_at:string; last_seen_at:string };

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
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS astro_dice_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL, user_name TEXT,
    question TEXT NOT NULL, category TEXT NOT NULL, planet_name TEXT NOT NULL,
    sign_name TEXT NOT NULL, house_name TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
  )`).run();
  const astroDiceResult = await env.DB.prepare("SELECT id,user_email,user_name,question,category,planet_name,sign_name,house_name,note,created_at FROM astro_dice_entries ORDER BY created_at DESC").all<AstroDiceEntry>();
  const astroDiceEntries = astroDiceResult.results ?? [];
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_activity_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_email TEXT NOT NULL, user_name TEXT,
    activity_type TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
  )`).run();
  const activityResult = await env.DB.prepare("SELECT id,user_email,user_name,activity_type,title,summary,details,created_at FROM user_activity_entries ORDER BY created_at DESC").all<ActivityEntry>();
  const activityEntries = activityResult.results ?? [];
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_users (user_email TEXT PRIMARY KEY, user_name TEXT, first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)`).run();
  const userResult = await env.DB.prepare("SELECT user_email,user_name,first_seen_at,last_seen_at FROM site_users ORDER BY last_seen_at DESC").all<SiteUser>();
  const siteUsers = userResult.results ?? [];
  const people = new Map<string,{name:string;last:string;count:number}>();
  const touch = (email:string,name:string|null,date:string) => { const old=people.get(email); people.set(email,{name:name||old?.name||"未提供名稱",last:old && old.last > date ? old.last : date,count:(old?.count??0)+1}); };
  entries.forEach(x=>touch(x.user_email,x.user_name,x.updated_at)); pendulumEntries.forEach(x=>touch(x.user_email,x.user_name,x.created_at)); astroDiceEntries.forEach(x=>touch(x.user_email,x.user_name,x.created_at)); activityEntries.forEach(x=>touch(x.user_email,x.user_name,x.created_at));
  siteUsers.forEach(x=>{const old=people.get(x.user_email);people.set(x.user_email,{name:x.user_name||old?.name||"未提供名稱",last:old&&old.last>x.last_seen_at?old.last:x.last_seen_at,count:old?.count??0})});
  return <main className="admin-page"><div className="admin-top"><div><p className="eyebrow">ZOLACOCO TAROT · ADMIN</p><h1>會員探索紀錄後台</h1></div><div><Link href="/">返回網站</Link>　<a href="/signout-with-chatgpt?return_to=/">登出</a></div></div>
    <section className="admin-section"><h2>會員總覽</h2><p className="admin-summary">目前共有 {people.size} 位留下紀錄的會員。以下整合全站資料，僅限 Zola 管理員查看。</p>{people.size===0?<div className="admin-empty">目前尚無會員紀錄。</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>會員</th><th>累計紀錄</th><th>最近活動</th></tr></thead><tbody>{[...people.entries()].sort((a,b)=>b[1].last.localeCompare(a[1].last)).map(([email,p])=><tr key={email}><td><b>{p.name}</b><br/><small>{email}</small></td><td>{p.count} 筆</td><td>{new Date(p.last).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}</td></tr>)}</tbody></table></div>}</section>
    <section className="admin-section"><h2>全站活動紀錄</h2><p className="admin-summary">包含塔羅抽牌、內在原型、牌面直覺、療癒小房間與元辰宮，共 {activityEntries.length} 筆。</p>{activityEntries.length===0?<div className="admin-empty">新版上線後，會員完成操作時會開始顯示。</div>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>使用者</th><th>功能</th><th>結果摘要</th><th>完整內容</th><th>時間</th></tr></thead><tbody>{activityEntries.map(entry=><tr key={entry.id}><td>{entry.user_name||"未提供名稱"}<br/><small>{entry.user_email}</small></td><td><b>{entry.title}</b><br/><small>{entry.activity_type}</small></td><td className="note-cell">{entry.summary||"—"}</td><td className="note-cell"><details><summary>查看完整資料</summary><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{(()=>{try{return JSON.stringify(JSON.parse(entry.details),null,2)}catch{return entry.details}})()}</pre></details></td><td>{new Date(entry.created_at).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}</td></tr>)}</tbody></table></div>}</section>
    <section className="admin-section"><h2>七日內在筆記</h2><p className="admin-summary">目前共收到 {entries.length} 篇筆記。這裡只供 Zola 查看，請妥善保護使用者的內在探索內容。</p>{entries.length === 0 ? <div className="admin-empty">目前還沒有使用者提交筆記。</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>使用者</th><th>天數／牌面</th><th>內在提問</th><th>筆記內容</th><th>更新時間</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td>{entry.user_name ?? "未提供名稱"}<br /><small>{entry.user_email}</small></td><td>DAY {entry.day}<br />{entry.card_name}</td><td>{entry.prompt}</td><td className="note-cell">{entry.content}</td><td>{new Date(entry.updated_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>)}</tbody></table></div>}</section>
    <section className="admin-section"><h2>靈擺問答紀錄</h2><p className="admin-summary">目前共收到 {pendulumEntries.length} 次已登入會員的靈擺提問。</p>{pendulumEntries.length === 0 ? <div className="admin-empty">目前還沒有會員儲存靈擺問答。</div> : <div className="admin-table-wrap"><table className="admin-table pendulum-admin-table"><thead><tr><th>使用者</th><th>分類／提問</th><th>靈擺結果</th><th>使用者感受</th><th>詢問時間</th></tr></thead><tbody>{pendulumEntries.map((entry) => <tr key={entry.id}><td>{entry.user_name ?? "未提供名稱"}<br /><small>{entry.user_email}</small></td><td className="note-cell"><small>{entry.category}</small><br />{entry.question}</td><td><b>{entry.result_label}</b></td><td className="note-cell">{entry.note || "—"}</td><td>{new Date(entry.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>)}</tbody></table></div>}</section>
    <section className="admin-section"><h2>星骰探索紀錄</h2><p className="admin-summary">目前共收到 {astroDiceEntries.length} 次已登入會員的星骰探索。</p>{astroDiceEntries.length === 0 ? <div className="admin-empty">目前還沒有會員儲存星骰紀錄。</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>使用者</th><th>分類／提問</th><th>星骰組合</th><th>內在筆記</th><th>擲骰時間</th></tr></thead><tbody>{astroDiceEntries.map(entry=><tr key={entry.id}><td>{entry.user_name??"未提供名稱"}<br/><small>{entry.user_email}</small></td><td className="note-cell"><small>{entry.category}</small><br/>{entry.question}</td><td><b>{entry.planet_name}</b><br/>{entry.sign_name} × {entry.house_name}</td><td className="note-cell">{entry.note||"—"}</td><td>{new Date(entry.created_at).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})}</td></tr>)}</tbody></table></div>}</section>
  </main>;
}
