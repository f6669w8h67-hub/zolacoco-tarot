import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

async function ensureSchema(){
  const { env } = await import("cloudflare:workers");
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS astro_dice_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    planet_name TEXT NOT NULL,
    sign_name TEXT NOT NULL,
    house_name TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS astro_dice_user_created_idx ON astro_dice_entries (user_email, created_at)").run();
}

export async function POST(request:Request){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:"請先登入"},{status:401});
  const body=await request.json() as Record<string,unknown>;
  const question=String(body.question??"").trim().slice(0,180);
  const category=String(body.category??"").trim().slice(0,24);
  const planet=String(body.planet??"").trim().slice(0,24);
  const sign=String(body.sign??"").trim().slice(0,24);
  const house=String(body.house??"").trim().slice(0,24);
  const note=String(body.note??"").trim().slice(0,600);
  if(!question||!category||!planet||!sign||!house)return Response.json({error:"星骰紀錄不完整"},{status:400});
  await ensureSchema(); const { env }=await import("cloudflare:workers"); const now=new Date().toISOString();
  await env.DB.prepare("INSERT INTO astro_dice_entries (user_email,user_name,question,category,planet_name,sign_name,house_name,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(user.email,user.fullName??user.displayName,question,category,planet,sign,house,note,now).run();
  return Response.json({saved:true,createdAt:now});
}

export async function GET(){
  const user=await getChatGPTUser();
  if(!user)return Response.json({error:"請先登入"},{status:401});
  await ensureSchema(); const { env }=await import("cloudflare:workers");
  const result=await env.DB.prepare("SELECT id,question,category,planet_name,sign_name,house_name,note,created_at FROM astro_dice_entries WHERE user_email=? ORDER BY created_at DESC LIMIT 30").bind(user.email).all();
  return Response.json({entries:result.results??[]});
}
