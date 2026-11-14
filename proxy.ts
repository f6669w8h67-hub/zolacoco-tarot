import { neon } from "@neondatabase/serverless";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import {
  allowsMembershipPreview,
  hasMemberAccess,
  isClerkConfigured,
  isMembershipServiceRoute,
  isPublicMembershipPage,
} from "./lib/membership-access";

const configured = isClerkConfigured(process.env);

function unavailable(request: NextRequest, error: string) {
  const headers = { "Cache-Control": "no-store" };
  return /^\/(api|trpc)(\/|$)/.test(request.nextUrl.pathname)
    ? Response.json({ error }, { status: 503, headers })
    : new Response("會員服務暫時無法使用，請稍後再試或聯絡 Zola。", { status: 503, headers });
}

const handler = configured ? clerkMiddleware(async (clerkAuth, request) => {
  if (isPublicMembershipPage(request.nextUrl.pathname) || isMembershipServiceRoute(request.nextUrl.pathname)) return NextResponse.next();

  const session = await clerkAuth();
  if (!session.userId) {
    if (/^\/(api|trpc)(\/|$)/.test(request.nextUrl.pathname)) {
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    return session.redirectToSignIn({ returnBackUrl: request.url });
  }
  if (!process.env.DATABASE_URL) return unavailable(request, "MEMBERSHIP_NOT_CONFIGURED");

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
    return unavailable(request, "MEMBERSHIP_SERVICE_ERROR");
  }
  const member = rows[0] as { role?: string; status?: string; access_expires_at?: string | null } | undefined;
  const allowed = hasMemberAccess(member);
  if (allowed) return NextResponse.next();

  if (/^\/(api|trpc)(\/|$)/.test(request.nextUrl.pathname)) {
    return Response.json({ error: member?.status === "active" ? "MEMBERSHIP_EXPIRED" : member?.status?.toUpperCase() ?? "MEMBERSHIP_REQUIRED" }, { status: 403 });
  }
  return NextResponse.redirect(new URL("/account", request.url));
}, {
  // Signed-out visitors go to the site's own pearl /sign-in (with Clerk's redirect_url back to where they
  // were going), never Clerk's hosted Account Portal. Who may enter is decided above, unchanged.
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
}) : null;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!handler) {
    if (isPublicMembershipPage(request.nextUrl.pathname)) return NextResponse.next();
    if (allowsMembershipPreview(process.env) && !isMembershipServiceRoute(request.nextUrl.pathname)) {
      return NextResponse.next();
    }
    return unavailable(request, "MEMBERSHIP_NOT_CONFIGURED");
  }
  return handler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
