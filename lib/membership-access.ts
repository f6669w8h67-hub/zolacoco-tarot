// Shared by the server boundary and the client gate. All other routes are VIP-only.
// /awareness (Zolacoco 覺察卡) is open to everyone; writing and saving answers stays member-only
// on the page itself, and every data API is still checked on the server.
export function isPublicMembershipPage(pathname: string) {
  return ["/account", "/sign-in", "/sign-up", "/awareness"].some(
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

// 學員練習室 (/practice and its APIs). Students are chosen by Zola and practise whether or not they
// hold VIP months, so these routes skip the VIP check in proxy.ts once signed in; every practice API
// then checks the student itself on the server (requireStudent / requireAdmin). The page gets its
// questions only from those APIs.
export function isStudentRoute(pathname: string) {
  return ["/practice", "/api/practice"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** The 學員練習室 page itself is open to everyone: signed out or not a student, it shows a short note
 * and loads nothing private. Its APIs (/api/practice…) are not open: they need a signed-in student. */
export function isStudentPage(pathname: string) {
  return pathname === "/practice" || pathname === "/practice/";
}

/** Admin always; a member Zola marked as her student, unless suspended. Independent of VIP months. */
export function hasStudentAccess(member: {
  role?: string;
  status?: string;
  is_student?: boolean | null;
} | undefined) {
  return member?.role === "admin" || Boolean(member?.is_student === true && member.status !== "suspended");
}

// 七日塔羅筆記 × 陪跑. Zola marks a member as 陪跑中 (is_coaching), separately from VIP months and from
// being her student. Like the practice routes, the coaching APIs skip the VIP lookup in proxy.ts once
// signed in and check the person themselves on the server (requireCoaching / requireAdmin / the owner).
export function isCoachingRoute(pathname: string) {
  return pathname === "/api/coaching" || pathname.startsWith("/api/coaching/");
}

/** Admin always; a member Zola marked as 陪跑中, unless suspended. Independent of VIP months. */
export function hasCoachingAccess(member: {
  role?: string;
  status?: string;
  is_coaching?: boolean | null;
} | undefined) {
  return member?.role === "admin" || Boolean(member?.is_coaching === true && member.status !== "suspended");
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
