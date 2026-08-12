import { neon } from "@neondatabase/serverless";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const configured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);
const isOpenRoute = createRouteMatcher([
  "/account(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/membership/me(.*)",
  "/api/membership/admin(.*)",
]);

const handler = configured ? clerkMiddleware(async (clerkAuth, request) => {
  if (isOpenRoute(request)) return NextResponse.next();

  const session = await clerkAuth();
  if (!session.userId) return session.redirectToSignIn({ returnBackUrl: request.url });
  if (!process.env.DATABASE_URL) return NextResponse.redirect(new URL("/account?setup=database", request.url));

  let rows;
  try {
    const sql = neon(process.env.DATABASE_URL);
    rows = await sql`
      SELECT role, status, access_expires_at
      FROM members
      WHERE clerk_user_id = ${session.userId}
      LIMIT 1
    `;
  } catch (error) {
    console.error("[membership-proxy] member lookup failed", {
      pathname: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(new URL("/account?setup=membership", request.url));
  }
  const member = rows[0] as { role?: string; status?: string; access_expires_at?: string | null } | undefined;
  const allowed = member?.role === "admin" || (
    member?.status === "active" &&
    member.access_expires_at &&
    new Date(member.access_expires_at) > new Date()
  );
  if (allowed) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: member?.status?.toUpperCase() ?? "MEMBERSHIP_REQUIRED" }, { status: 403 });
  }
  return NextResponse.redirect(new URL("/account", request.url));
}) : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!handler) return NextResponse.next();
  return handler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
