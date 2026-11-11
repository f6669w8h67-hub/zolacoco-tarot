import { authorizeMemberData } from "@/lib/member-data-auth";
import { isAdminEmail } from "@/lib/membership";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await authorizeMemberData();
  if (!access.ok) return access.response;
  return Response.json({ user: { ...access.user, isAdmin: isAdminEmail(access.user.email) } });
}
