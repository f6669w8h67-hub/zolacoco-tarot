// Shared by the server boundary and the client gate. All other routes are VIP-only.
export function isPublicMembershipPage(pathname: string) {
  return ["/account", "/sign-in", "/sign-up"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// These endpoints perform their own identity/admin checks, without requiring an
// active subscription (pending/expired members must still reach their account).
export function isMembershipServiceRoute(pathname: string) {
  return ["/api/membership/me", "/api/membership/admin"].some(
    (path) => pathname === path || pathname === `${path}/`,
  );
}

export function isClerkConfigured(env: Record<string, string | undefined>) {
  return Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && env.CLERK_SECRET_KEY?.trim());
}

export function allowsMembershipPreview(env: {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  MEMBERSHIP_PREVIEW?: string;
}) {
  // Never infer preview from a hostname, request header, or absent configuration.
  if (env.VERCEL_ENV === "production") return false;
  return env.NODE_ENV === "development" || env.NODE_ENV === "test" ||
    (env.VERCEL_ENV === "preview" && env.MEMBERSHIP_PREVIEW === "true");
}

export function hasMemberAccess(member: {
  role?: string;
  status?: string;
  access_expires_at?: string | null;
} | undefined, now = Date.now()) {
  return member?.role === "admin" || Boolean(
    member?.status === "active" && member.access_expires_at &&
    new Date(member.access_expires_at).getTime() > now,
  );
}
