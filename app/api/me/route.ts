import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ user: null });
  return Response.json({ user: { ...user, isAdmin: user.email.toLowerCase() === (process.env.ADMIN_EMAIL ?? "").toLowerCase() } });
}
